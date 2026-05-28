# Saji — Personal WhatsApp Reminder App: Design Spec

**Date:** 2026-05-28
**Status:** Approved

---

## Overview

Saji is a personal reminder app built exclusively for one user. It works through two interfaces:
1. **WhatsApp Bot** — conversational, AI-powered, speaks English and Thanglish
2. **Web Dashboard** — visual control center to view, add, edit, and delete reminders

The user sends a WhatsApp message to Saji, the bot holds a back-and-forth conversation to capture the task and timing, and then fires reminder messages at the right time. Reminders support DONE and SNOOZE replies. The web dashboard mirrors all this data with full CRUD controls.

---

## Architecture

```
User (WhatsApp) ◄──────────────────► Web Dashboard
        │                                    │
        ▼                                    ▼
   Meta Webhook                    Next.js App Router
        │                                    │
        └──────────────┬─────────────────────┘
                       ▼
            Next.js API Routes (Vercel)
            ├── /api/webhook     — incoming WhatsApp messages
            ├── /api/cron        — fires due reminders (every minute)
            ├── /api/reminders   — CRUD for dashboard
            └── /api/auth        — Google login (dashboard only)
                       │
                       ▼
               Supabase (Postgres)
               ├── reminders
               ├── conversations
               └── reminder_logs
```

**Key services:**
- **Vercel** — hosts the Next.js app, runs cron every minute
- **Supabase** — stores all data
- **Meta WhatsApp Business API** — sends and receives WhatsApp messages
- **Claude claude-sonnet-4-6** — parses Thanglish/English input, extracts task + datetime + recurrence
- **NextAuth.js + Google** — secures the web dashboard (single user only)

---

## WhatsApp Bot — Conversation Flow

The bot uses a state machine stored in the `conversations` table. States:

| State | Description |
|---|---|
| `idle` | No active conversation, waiting for new message |
| `waiting_time` | Got task title, waiting for datetime |
| `waiting_recurrence` | Got datetime, waiting for repeat preference |
| `waiting_snooze_time` | User replied SNOOZE, waiting for new time |
| `waiting_delete_confirm` | User sent DELETE, waiting for which one |

### New Reminder Flow
```
User:   "Remind me to pay EB bill"
Saji:   "Ok! EB bill pay panna remind panren 💡
         Eppo remind pannanum? (date and time sollu)"

User:   "June 5 morning 10"
Saji:   "June 5, 10:00am — correct ah?
         Repeat aaganum-a? (daily/weekly/monthly/custom/no)"

User:   "Monthly 5th"
Saji:   "✅ Done! Every month 5th 10:00am ku
         'Pay EB bill' — remind panren! 🎯"
```

### Reminder Fires
```
Saji:   "⏰ REMINDER — Pay EB bill
         Category: 💰 Finance
         Set on: May 28 | Due: Jun 5, 10:00am

         Reply:
         ✅ DONE — mark as complete
         😴 SNOOZE — remind later"
```

### DONE Reply
```
User:   "DONE"
Saji:   "✅ 'Pay EB bill' — completed! Great job da! 💪"
```

### SNOOZE Reply
```
User:   "SNOOZE"
Saji:   "Seri! Eppo remind pannanum?"

User:   "Tomorrow same time"
Saji:   "✅ June 6, 10:00am ku remind panren!"
```

### Quick Commands (anytime)
| Command | Action |
|---|---|
| `LIST` | Show today's reminders |
| `ALL` | Show all upcoming reminders |
| `DELETE` | Delete a reminder (bot asks which one) |
| `HELP` | Show all commands |

---

## Web Dashboard

URL: `yourapp.vercel.app/dashboard` (Google login required)

### Pages
1. **Main View** (`/dashboard`) — reminders grouped by Today / Tomorrow / Upcoming
2. **History** (`/dashboard/history`) — all completed and missed reminders

### Features
- Filter by category: All / Professional / Personal / Finance / Health / Other
- Add new reminder directly from dashboard (form with title, datetime, category, recurrence)
- Edit any reminder inline
- Delete any reminder
- Mark DONE or snooze from dashboard
- Visual badge/count per category

### UI Design
- Clean, minimal, mobile-friendly
- Tailwind CSS + shadcn/ui components
- Category color coding:
  - 💼 Professional — blue
  - 👤 Personal — purple
  - 💰 Finance — green
  - ❤️ Health — red
  - 📋 Other — gray

---

## Data Design (Supabase)

### `reminders`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `title` | text | e.g. "Pay EB bill" |
| `category` | enum | professional / personal / finance / health / other |
| `due_at` | timestamptz | Next scheduled reminder time |
| `recurrence` | enum | none / daily / weekly / monthly / custom |
| `recurrence_rule` | text | Human-readable rule, parsed by AI for next occurrence |
| `status` | enum | pending / done / snoozed |
| `whatsapp_number` | text | User's WhatsApp number |
| `created_at` | timestamptz | When reminder was created |

### `conversations`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `whatsapp_number` | text | User's number |
| `state` | text | Current conversation state |
| `context` | jsonb | Temp data during multi-turn conversation |
| `updated_at` | timestamptz | Last message time |

### `reminder_logs`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `reminder_id` | uuid | FK to reminders |
| `action` | enum | sent / done / snoozed / missed |
| `actioned_at` | timestamptz | When the action happened |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| AI | Claude claude-sonnet-4-6 (Anthropic SDK) |
| Database | Supabase (Postgres) |
| WhatsApp | Meta WhatsApp Business API |
| Auth | NextAuth.js + Google OAuth |
| Hosting | Vercel (free tier) |
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
│       ├── cron/route.ts         — fires due reminders
│       ├── reminders/route.ts    — CRUD for dashboard
│       └── auth/[...nextauth]/   — Google login
├── lib/
│   ├── whatsapp.ts               — send messages via Meta API
│   ├── ai.ts                     — Claude Thanglish parser
│   ├── supabase.ts               — database client
│   └── scheduler.ts              — reminder checking logic
├── components/
│   ├── ReminderCard.tsx
│   ├── CategoryFilter.tsx
│   ├── AddReminderForm.tsx
│   └── ReminderList.tsx
├── CLAUDE.md
└── vercel.json
```

---

## Reminder Categories

| Category | Emoji | Examples |
|---|---|---|
| Professional | 💼 | Meetings, deadlines, follow-ups, client calls |
| Personal | 👤 | Birthdays, anniversaries, important days |
| Finance | 💰 | Bill payments, EMIs, subscriptions |
| Health | ❤️ | Medicines, doctor appointments, workouts |
| Other | 📋 | Anything else |

---

## Recurrence Examples

| User says | Saji understands |
|---|---|
| "daily morning 8" | Every day at 08:00 |
| "every weekday" | Mon–Fri at specified time |
| "monthly 5th" | Every month on the 5th |
| "every 3 days" | Every 3 days from due_at |
| "every year June 5" | Annually on June 5 |
| "last day of month" | Last day of each month |
| "no" / "one time" | No recurrence |

---

## Language & Tone

- Bot speaks **English + Thanglish** (Tamil + English mix)
- Friendly, casual, encouraging tone
- Uses Tamil words naturally: "Seri!", "Eppo", "Correct ah?", "da"
- Emoji used contextually to make messages warm and readable
- Never overly formal

---

## Constraints & Scope

- **Single user only** — no multi-user, no team features
- **One WhatsApp number** — hardcoded in environment variables
- **No SMS fallback** — WhatsApp only
- **No voice messages** — text only
- **Dashboard requires Google login** — no public access
