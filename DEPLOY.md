# Saji — Deployment Guide

## Prerequisites

Before deploying, you need:
- Supabase project (free tier works)
- Meta WhatsApp Business API credentials
- Google OAuth credentials (for dashboard login)
- Vercel account (free tier works)
- GitHub account

---

## Step 1: Apply Supabase Schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing)
3. Go to **SQL Editor**
4. Paste the contents of `supabase/schema.sql`
5. Click **Run**
6. Verify 3 tables appear in **Table Editor**: `reminders`, `conversations`, `reminder_logs`
7. Copy your project credentials from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key — keep secret!)

---

## Step 2: Get WhatsApp Business API Credentials

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app → **Business** type
3. Add **WhatsApp** product
4. Go to **WhatsApp → API Setup**
5. Copy:
   - `WHATSAPP_ACCESS_TOKEN` (Temporary token — replace with permanent later)
   - `WHATSAPP_PHONE_NUMBER_ID` (Phone number ID)
   - `WHATSAPP_BUSINESS_ACCOUNT_ID` (WhatsApp Business Account ID)
6. Set `WHATSAPP_VERIFY_TOKEN` to any random string (e.g. `saji-webhook-2026`)
7. Set `USER_WHATSAPP_NUMBER` to your WhatsApp number in E.164 format (e.g. `+919876543210`)

---

## Step 3: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`
   (Add `http://localhost:3000/api/auth/callback/google` for local dev)
6. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Step 4: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/saji.git
   git branch -M main
   git push -u origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **New Project** → Import your GitHub repository
4. Framework: **Next.js** (auto-detected)
5. Add all environment variables (from `.env.local.example`):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `WHATSAPP_ACCESS_TOKEN` | Meta access token |
   | `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
   | `WHATSAPP_VERIFY_TOKEN` | Your custom verify token |
   | `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business account ID |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `NEXTAUTH_SECRET` | Random 32-char string (run: `openssl rand -base64 32`) |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `USER_WHATSAPP_NUMBER` | Your WhatsApp number (e.g. `+919876543210`) |
   | `USER_EMAIL` | Your Google email (e.g. `you@gmail.com`) |
   | `CRON_SECRET` | Random string (e.g. `openssl rand -base64 32`) |

6. Click **Deploy**
7. Note your app URL: `https://saji-xxx.vercel.app`

---

## Step 5: Configure WhatsApp Webhook

1. Go to Meta Developers → your app → **WhatsApp → Configuration**
2. Under **Webhook**:
   - Callback URL: `https://your-app.vercel.app/api/webhook`
   - Verify Token: same value as `WHATSAPP_VERIFY_TOKEN` in your env
3. Click **Verify and Save**
4. Under **Webhook Fields**, subscribe to: `messages`

---

## Step 6: Update Google OAuth Redirect URI

1. Go back to Google Cloud Console → OAuth credentials
2. Add your production URL: `https://your-app.vercel.app/api/auth/callback/google`

---

## Step 7: Test End-to-End

1. Open your dashboard: `https://your-app.vercel.app`
2. Sign in with your Google account
3. Send a WhatsApp message to your business number: `"Remind me to pay EB bill"`
4. Bot should reply in Thanglish asking for the time
5. Continue the conversation to set the reminder
6. Check the reminder appears in your dashboard

---

## Vercel Cron Job

The cron job at `/api/cron` runs **every minute** automatically on Vercel (configured in `vercel.json`). It:
- Checks for due reminders
- Sends WhatsApp messages
- Updates reminder status

You can verify it's running in **Vercel Dashboard → your project → Cron Jobs**.

---

## Local Development

```bash
cp .env.local.example .env.local
# Fill in your credentials in .env.local

npm run dev
# App runs at http://localhost:3000
```

For WhatsApp webhook testing locally, use [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Use the ngrok URL as your webhook callback URL in Meta Dev Console
```
