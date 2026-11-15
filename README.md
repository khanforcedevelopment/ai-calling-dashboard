# AI Calling Dashboard

A simple dashboard on top of Vapi for AI outbound calls.

- **Quick call:** call one number right away (for tests and demos)
- **Campaigns:** upload a CSV, then call now or schedule
- **Scripts:** write and save first message + system prompt, pick one per campaign
- **Call logs:** status, recording, transcript, summary for every call
- **Leads:** buyers and sellers captured by the AI, with CSV export
- **Do not call:** numbers that are always skipped (people who ask the AI not to call are added automatically)
- **Calling rules:** calls only go out 9am–6pm UAE time by default, spread out at a set number per minute

Built with Next.js, Supabase (database) and the Vapi API. The Vapi key stays on the server.

---

## Setup (one time)

### 1. Supabase: create the tables
1. Open your Supabase project → **SQL Editor** → **New query**.
2. Copy everything from `supabase/schema.sql`, paste it, click **Run**.
3. Go to **Project Settings → API** and keep the **Project URL** and **service_role** key handy.

### 2. Vercel: deploy
1. Go to vercel.com → **Add New… → Project** → import `ai-calling-dashboard` from GitHub.
2. Before clicking Deploy, open **Environment Variables** and add these (values from `.env.example`):

| Name | Where to find it |
|---|---|
| `VAPI_API_KEY` | Vapi → API Keys → **Private** key |
| `VAPI_ASSISTANT_ID` | Vapi → Assistants → open the assistant → ID |
| `VAPI_PHONE_NUMBER_ID` | Vapi → Phone Numbers → open the Twilio number → ID |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `DASHBOARD_PASSWORD` | Choose a login password |
| `AUTH_SECRET` | Any long random text (40+ characters) |

Optional: `CALLS_PER_MINUTE` (default 5), `BUSINESS_HOURS_START` (9), `BUSINESS_HOURS_END` (18), `BUSINESS_HOURS_ENFORCED` (true).

3. Click **Deploy**. Open the URL Vercel gives you and log in with username `admin` and your DASHBOARD_PASSWORD. Create more logins on the **Users** page.

If you change an environment variable later: Vercel → project → **Deployments** → latest → **⋯ → Redeploy**.

### 3. First test
1. **Scripts → New script:** paste your first message and system prompt, save.
2. **Dashboard → Quick call:** your own number, pick the script, **Call now**.
3. After the call, open it (Dashboard → Recent campaigns) to see the recording and transcript.

> Testing at night? Calls are held until 9am by default. For testing on your own number only, set `BUSINESS_HOURS_ENFORCED=false` and redeploy, then set it back to `true`.

---

## Using it

- **CSV format:** first row is headers. Example:
  ```
  name,phone
  Ahmed Khan,0501234567
  Sara Ali,+971521234567
  ```
  Numbers like `05…` are treated as UAE (+971). Duplicates and invalid numbers are skipped.
- **Keep the campaign page open** until the "Sending calls to Vapi" badge disappears. Calls are handed to Vapi in small batches with their start times; after that Vapi runs them even if you close the page.
- **Results** (status, recording, transcript, lead details) refresh every 15–20 seconds while a dashboard page is open, or when you click **Refresh**.
- **Lead details** come from the AI's call analysis. If the Leads page stays empty after real calls, set up a Structured Output in Vapi for the assistant with the same field names listed in `lib/vapi.js` (`STRUCTURED_SCHEMA`).

## Compliance reminders (UAE)
For marketing calls: TDRA telemarketing permit, a UAE-registered number, calls only 9am–6pm, no calls to DNCR numbers, no repeat call the same day after a refusal, record calls and say so, and say the caller is an AI. Upload the DNCR list on the **Do not call** page before every campaign.

## Local development (optional)
```
cp .env.example .env.local   # fill in the values
npm install
npm run dev                   # http://localhost:3000
```
