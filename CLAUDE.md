# Saji — Personal WhatsApp Reminder App

## What This App Is

Saji is a personal reminder app built for a single user. It has two interfaces:
- **WhatsApp Bot** — the primary interface. User messages the bot in English or Thanglish (Tamil + English mix). The bot holds a conversational back-and-forth to capture task, time, and recurrence, then fires reminder messages at the right time.
- **Web Dashboard** — visual control center to view, add, edit, delete, and mark reminders done.

The full design spec is at `docs/superpowers/specs/2026-05-28-saji-reminder-app-design.md`. Read it before making any significant decisions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Claude claude-sonnet-4-6 via Anthropic SDK |
| Database | Supabase (Postgres) |
| WhatsApp | Meta WhatsApp Business API |
| Auth | NextAuth.js + Google OAuth (dashboard only) |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs (every minute) |

---

## Project Structure

```
saji/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              — main reminders view
│   │   └── history/page.tsx      — completed/missed log
│   └── api/
│       ├── webhook/route.ts      — WhatsApp incoming messages
│       ├── cron/route.ts         — fires due reminders every minute
│       ├── reminders/route.ts    — CRUD for dashboard
│       └── auth/[...nextauth]/   — Google login
├── lib/
│   ├── whatsapp.ts               — send messages via Meta API
│   ├── ai.ts                     — Claude Thanglish/English parser
│   ├── supabase.ts               — Supabase client
│   └── scheduler.ts              — reminder checking logic
├── components/
│   ├── ReminderCard.tsx
│   ├── CategoryFilter.tsx
│   ├── AddReminderForm.tsx
│   └── ReminderList.tsx
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-28-saji-reminder-app-design.md
├── CLAUDE.md
└── vercel.json
```

---

## Database Schema (Supabase)

### `reminders`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
title           text NOT NULL
category        text CHECK (category IN ('professional','personal','finance','health','other'))
due_at          timestamptz NOT NULL
recurrence      text CHECK (recurrence IN ('none','daily','weekly','monthly','custom')) DEFAULT 'none'
recurrence_rule text        -- human-readable rule e.g. "every month on 5th"
status          text CHECK (status IN ('pending','done','snoozed')) DEFAULT 'pending'
whatsapp_number text NOT NULL
created_at      timestamptz DEFAULT now()
```

### `conversations`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
whatsapp_number text NOT NULL UNIQUE
state           text NOT NULL DEFAULT 'idle'
context         jsonb DEFAULT '{}'
updated_at      timestamptz DEFAULT now()
```

### `reminder_logs`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
reminder_id uuid REFERENCES reminders(id) ON DELETE CASCADE
action      text CHECK (action IN ('sent','done','snoozed','missed'))
actioned_at timestamptz DEFAULT now()
```

---

## WhatsApp Bot — Conversation States

| State | Meaning |
|---|---|
| `idle` | No active conversation |
| `waiting_time` | Got task title, waiting for datetime |
| `waiting_recurrence` | Got datetime, waiting for repeat preference |
| `waiting_snooze_time` | User replied SNOOZE, waiting for new time |
| `waiting_delete_confirm` | User sent DELETE, waiting for which reminder |

---

## AI Usage (lib/ai.ts)

Use Claude claude-sonnet-4-6 for:
1. **Parsing task title** — extract clean task name from Thanglish/English message
2. **Parsing datetime** — convert "June 5 morning 10", "next Tuesday evening", "kal subah" to an exact `timestamptz`
3. **Parsing recurrence** — convert "monthly 5th", "every 3 days", "last day of month" to structured recurrence data
4. **Parsing snooze time** — convert "tomorrow same time", "1 mani", "after 2 hours" to new `due_at`

Always pass current datetime and user's timezone (IST — Asia/Kolkata) in the AI prompt.

---

## WhatsApp API (lib/whatsapp.ts)

- Incoming messages arrive at `POST /api/webhook`
- Verify webhook with `GET /api/webhook` using `WHATSAPP_VERIFY_TOKEN`
- Send messages using Meta Graph API: `POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`
- Auth: `WHATSAPP_ACCESS_TOKEN` (Bearer token)

---

## Cron Job (app/api/cron/route.ts)

- Runs every minute via Vercel Cron
- Queries `reminders` where `due_at <= now()` AND `status = 'pending'`
- Sends WhatsApp reminder message for each
- Logs each send to `reminder_logs`
- For recurring reminders: after sending, compute next `due_at` using AI or rule logic and update the record (keep status `pending`)
- For one-time reminders: set status to `snoozed` after sending (awaiting DONE/SNOOZE reply)
- Protect the route with `CRON_SECRET` header check

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=

# Auth (NextAuth + Google)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
USER_WHATSAPP_NUMBER=       # The single user's WhatsApp number (e.g. +919876543210)
USER_EMAIL=                 # Google email allowed to access dashboard
CRON_SECRET=                # Secret to protect /api/cron route
```

---

## Key Rules & Constraints

- **Single user only** — `USER_WHATSAPP_NUMBER` and `USER_EMAIL` are hardcoded in env. No multi-user logic.
- **WhatsApp only** — no SMS, no email notifications.
- **Text only** — no voice message handling.
- **IST timezone** — all times are Asia/Kolkata. Always convert to IST when displaying or parsing.
- **Dashboard requires Google login** — only `USER_EMAIL` can log in.
- **Language** — bot always responds in English + Thanglish mix. Never formal Tamil script. Use casual words: "Seri!", "Eppo", "Correct ah?", "da", "panna", "pannanum".
- **Tone** — friendly, warm, encouraging. Use emojis contextually (not excessively).

---

## Reminder Categories

| Category | Emoji | Color (Tailwind) |
|---|---|---|
| professional | 💼 | blue-500 |
| personal | 👤 | purple-500 |
| finance | 💰 | green-500 |
| health | ❤️ | red-500 |
| other | 📋 | gray-500 |

---

## Bot Message Templates

**Reminder fires:**
```
⏰ REMINDER — {title}
Category: {emoji} {category}
Set on: {created_at} | Due: {due_at}

Reply:
✅ DONE — mark as complete
😴 SNOOZE — remind later
```

**Reminder set confirmation:**
```
✅ Done! {due_at} ku "{title}" — remind panren! 🎯
```

**DONE acknowledgement:**
```
✅ "{title}" — completed! Great job da! 💪
```

**SNOOZE prompt:**
```
Seri! Eppo remind pannanum?
```

---

## vercel.json (Cron Config)

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## Getting Started (Setup Order)

1. Create Next.js project: `npx create-next-app@latest saji`
2. Install deps: `shadcn/ui`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `next-auth`, `axios`
3. Set up Supabase project and run schema SQL
4. Set up Meta WhatsApp Business API and get credentials
5. Set up Google OAuth credentials
6. Add all env vars to Vercel
7. Deploy to Vercel and configure WhatsApp webhook URL
8. Test with a WhatsApp message
