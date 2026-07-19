# ISL Global Education — CRM Backend (Unified Inbox)

This is the piece the frontend CRM prototype can't do by itself: a small
server that Meta (Facebook/WhatsApp/Instagram) can actually talk to,
so every message lands in one place.

It is **not deployed anywhere yet** — no sandbox or chat tool can host a
live, publicly-reachable server for you. You deploy this yourself
(15–20 minutes, no coding needed beyond copy/paste) using the steps below.

## What this does
- Receives WhatsApp Cloud API messages → stores them
- Receives Facebook Page + Instagram DMs/comments → stores them
- Exposes `GET /api/messages` so the CRM frontend (or any app) can read
  the unified inbox
- Exposes `POST /webhook/whatsapp/send` and `POST /webhook/facebook/send`
  so the CRM can reply from the same place

## 1. Deploy the server (pick one, both have free tiers)

**Render.com**
1. Create a free account at render.com
2. New → Web Service → "Upload from computer" or connect a GitHub repo
   containing this `crm-backend` folder
3. Build command: `npm install` · Start command: `node server.js`
4. Add the environment variables from `.env.example` under Settings → Environment
5. Deploy — Render gives you a URL like `https://isl-crm-backend.onrender.com`

**Railway.app** works the same way (New Project → Deploy from folder/GitHub → add env vars).

## 2. Create a Meta App
1. Go to developers.facebook.com → My Apps → Create App → type "Business"
2. Add the **WhatsApp** product and the **Messenger** product to the app

## 3. Connect WhatsApp Cloud API
1. In the app dashboard → WhatsApp → API Setup, copy:
   - **Phone Number ID** → put in `.env` as `WHATSAPP_PHONE_NUMBER_ID`
   - **Temporary access token** (generate a **permanent** one under
     System Users for production) → `WHATSAPP_ACCESS_TOKEN`
2. WhatsApp → Configuration → Webhook:
   - Callback URL: `https://YOUR-DEPLOYED-URL/webhook/whatsapp`
   - Verify token: same string you put in `.env` as `WEBHOOK_VERIFY_TOKEN`
   - Subscribe to the `messages` field

## 4. Connect Facebook Page + Instagram
1. Messenger → Settings → connect your Facebook Page, copy the
   **Page Access Token** → `.env` as `FACEBOOK_PAGE_ACCESS_TOKEN`
2. Webhooks → Callback URL: `https://YOUR-DEPLOYED-URL/webhook/facebook`,
   same verify token, subscribe to `messages` and `feed` (for comments)
3. If your Instagram account is linked to the Page, Instagram DMs arrive
   on the same webhook automatically once you subscribe to `instagram`
   under Instagram → Configuration.

## 5. Point the CRM frontend at it
The CRM prototype (`isl-crm-prototype.html`) currently runs on in-browser
demo data with no network calls. To make its WhatsApp/Social inbox show
real messages, replace the demo `WA_THREADS`/`SOCIAL_MSGS` arrays with a
`fetch('https://YOUR-DEPLOYED-URL/api/messages', {headers:{'x-api-key':'...'}})`
call and group the results by contact. Ask for this next and it can be wired in.

## Local test (optional, before deploying)
```
npm install
cp .env.example .env   # fill in real values
node server.js
```
Meta cannot reach `localhost`, so local testing only confirms the server
boots without errors — use a deployed URL for the real webhook.

## Notes on scale
Messages are stored in a flat JSON file (`data/messages.json`) which is
fine for a first live version. Once you're past a few thousand messages,
swap `store.js` for a real database (Postgres via Supabase/Neon works
well and both have free tiers).
