# Saji — Personal WhatsApp Reminder App

A personal reminder app with two interfaces: a WhatsApp bot that understands English and Thanglish, and a web dashboard to manage everything visually.

## Features

- **WhatsApp Bot** — send a message, the bot asks for time and recurrence, then fires reminders at the right moment
- **Web Dashboard** — view, add, edit, snooze, and delete reminders grouped by Today / Tomorrow / Upcoming
- **History page** — log of completed reminders
- **Natural language parsing** — understands "tomorrow 3pm", "monthly 5th", "every 3 days", Thanglish shorthands like "kal" (tomorrow), "subah" (morning)
- **Categories** — 💼 Professional, 👤 Personal, 💰 Finance, ❤️ Health, 📋 Other
- **Recurrence** — daily, weekly, monthly, custom (e.g. every 3 days)
- **DONE / SNOOZE replies** — reply to a reminder message to mark done or snooze
- **Single-user, private** — only your WhatsApp number and Google account can access it

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Date parsing | chrono-node |
| Database | Supabase (Postgres) |
| WhatsApp | Meta WhatsApp Business API |
| Auth | NextAuth.js + Google OAuth |
| Hosting | Vercel |
| Cron | cron-job.org (free, every minute) |

## Project Structure

```
├── app/
│   ├── dashboard/page.tsx          — main reminders view
│   ├── dashboard/history/page.tsx  — completed reminders log
│   └── api/
│       ├── webhook/route.ts        — WhatsApp incoming messages + state machine
│       ├── cron/route.ts           — fires due reminders (called by cron-job.org)
│       ├── reminders/route.ts      — CRUD API for dashboard
│       └── auth/[...nextauth]/     — Google OAuth
├── lib/
│   ├── ai.ts                       — natural language parser (chrono-node + keywords)
│   ├── whatsapp.ts                 — Meta Graph API client
│   ├── scheduler.ts                — reminder fire logic + recurrence
│   ├── auth.ts                     — NextAuth config
│   └── supabase.ts                 — Supabase client
├── components/
│   ├── ReminderCard.tsx
│   ├── CategoryFilter.tsx
│   └── AddReminderForm.tsx
└── __tests__/                      — Jest tests (26 tests)
```

## WhatsApp Bot Commands

| Command | Action |
|---|---|
| Any message | Start setting a new reminder |
| `LIST` | Show today's reminders |
| `ALL` | Show next 10 upcoming reminders |
| `DONE` | Mark the active reminder as complete |
| `SNOOZE` | Snooze the active reminder |
| `DELETE` | Delete a reminder |
| `HELP` | Show all commands |

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/grofastai/Grofast-personal-App-Reminder-.git
cd Grofast-personal-App-Reminder-
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Fill in your credentials in .env.local

# 3. Run tests
npm test

# 4. Start dev server
npm run dev
# App at http://localhost:3000
```

For WhatsApp webhook testing locally, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the ngrok HTTPS URL as your webhook callback in Meta Dev Console
```

## Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `WHATSAPP_ACCESS_TOKEN` | Meta Developers → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developers → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Any random string you choose |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta Developers → WhatsApp → API Setup |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) / your Vercel URL (prod) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials |
| `USER_WHATSAPP_NUMBER` | Your number in E.164 format e.g. `+919876543210` |
| `USER_EMAIL` | Your Google email (only this account can log in) |
| `CRON_SECRET` | Any random string (used to protect `/api/cron`) |

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full step-by-step deployment guide covering:
- Supabase schema setup
- Meta WhatsApp Business API configuration
- Google OAuth setup
- Vercel deployment
- cron-job.org setup (replaces Vercel cron — free, runs every minute)
- WhatsApp webhook configuration

## Database Schema

Three tables in Supabase — see `supabase/schema.sql`:

- **`reminders`** — title, category, due_at, recurrence, status, whatsapp_number
- **`conversations`** — per-user bot state machine (idle → waiting_time → waiting_recurrence → ...)
- **`reminder_logs`** — history of sent / done / snoozed / missed actions

## How the Bot Works

```
User: "Remind me to pay EB bill"
Bot:  Ok! "Pay EB bill" remind panren 💡
      Eppo remind pannanum? (date and time sollu)

User: "tomorrow 10am"
Bot:  4 Jun 2026, 10:00 am — correct ah?
      Repeat aaganum-a? (daily/weekly/monthly/custom/no)

User: "no"
Bot:  ✅ Done! 4 Jun 2026, 10:00 am ku "Pay EB bill" — remind panren! 🎯
      Repeat: one time only

--- at 10:00am the next day ---

Bot:  ⏰ REMINDER — Pay EB bill
      Category: 💰 finance
      ...
      Reply: ✅ DONE  😴 SNOOZE
```
