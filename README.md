# MeetScribe — AI Meeting Recorder & Transcription SaaS

Full-stack SaaS that records meetings, transcribes them, generates AI summaries/action items, connects to Zoom / Google Meet / Teams, and bills via **Paddle** at **$4.99** (Starter) and **$9.99** (Pro).

## Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | Vite + React 18 + TypeScript + Tailwind + Framer Motion + Three.js (@react-three/fiber) |
| Backend   | Node.js + Express (ESM)                   |
| Database  | MongoDB (Mongoose)                        |
| Payments  | Paddle Billing (checkout + webhooks)      |
| Auth      | JWT + bcrypt                              |

## Project structure

```
artifacts/
├── meetscribe/                 # Frontend (Vite React)
│   ├── src/
│   │   ├── components/         # Layout, Scene3D
│   │   ├── pages/              # Landing, Login, Register, Dashboard, MeetingDetail, Pricing, Settings
│   │   ├── lib/                # api.ts, AuthContext
│   │   └── ...
│   └── package.json
└── meetscribe-backend/         # Backend (Express)
    ├── src/
    │   ├── models/             # User, Meeting
    │   ├── routes/             # auth, meetings, paddle, integrations
    │   ├── middleware/         # JWT protect
    │   ├── config/             # db.js
    │   └── server.js
    └── package.json
```

## Quick start

### 1. MongoDB
Make sure MongoDB is running locally (or use Atlas and update `MONGODB_URI`).

```bash
# example local
mongod
```

### 2. Backend

```bash
cd meetscribe-backend
cp .env.example .env
# edit .env with your secrets
npm install
npm run dev
# → http://localhost:5000
```

### 3. Frontend

```bash
cd meetscribe
npm install
npm run dev
# → http://localhost:5173
```

The Vite proxy forwards `/api` → `http://localhost:5000`.

## Features implemented

- **Auth** — Register / Login / JWT protected routes
- **Meetings** — Create (simulates recording → processing → completed), list, detail, delete
- **AI mock** — Speaker-labelled transcript, overview, key points, action items, decisions
- **Integrations** — Connect / disconnect Zoom, Google Meet, Teams (mock OAuth)
- **Pricing** — $4.99 Starter (30 meetings) / $9.99 Pro (unlimited)
- **Paddle** — Checkout session endpoint + webhook handler for subscription lifecycle
- **UI** — Dark glassmorphism, animated 3D hero (Three.js), Framer Motion, gradient accents

## Paddle setup (production)

1. Create products & prices in Paddle Dashboard:
   - Starter → $4.99/mo recurring → copy Price ID → `PADDLE_STARTER_PRICE_ID`
   - Pro → $9.99/mo recurring → `PADDLE_PRO_PRICE_ID`
2. Add Client-side token to frontend (`Pricing.tsx` → `Paddle.Initialize({ token: '...' })`)
3. Set webhook URL to `https://your-api.com/api/paddle/webhook`
4. Fill `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_VENDOR_ID` in `.env`

## Real integrations (next steps)

- **Zoom** — OAuth 2.0 + Meeting SDK / webhooks for recording
- **Google Meet** — Google Calendar API + Meet REST
- **Teams** — Microsoft Graph onlineMeetings
- **Transcription** — OpenAI Whisper / Deepgram / AssemblyAI
- **Summaries** — GPT-4o / Claude for structured notes

## License

MIT — build something great.

---

## Paddle Subscription (enhanced)

| Endpoint | Description |
|----------|-------------|
| `GET /api/paddle/plans` | List plans ($4.99 / $9.99) |
| `POST /api/paddle/create-checkout` | Create checkout session for Paddle.js |
| `GET /api/paddle/subscription` | Current user subscription status |
| `POST /api/paddle/cancel` | Schedule cancellation |
| `POST /api/paddle/resume` | Resume canceled sub |
| `GET /api/paddle/portal` | Customer billing portal URL |
| `POST /api/paddle/webhook` | Paddle Billing webhooks |
| `POST /api/paddle/demo-activate` | Instant plan activation (no real charge) |

**Frontend:** Pricing page shows current plan, billing portal button, cancel, and demo-activates when Paddle client token is not set.

Set `VITE_PADDLE_CLIENT_TOKEN` in frontend `.env` for live overlay checkout.

---

## Zoom Recording (enhanced)

| Endpoint | Description |
|----------|-------------|
| `GET /api/integrations/zoom/auth` | Start OAuth (returns auth URL) |
| `POST /api/integrations/zoom/callback` | Exchange code for tokens |
| `POST /api/integrations/zoom/connect-demo` | Instant connect without OAuth |
| `DELETE /api/integrations/zoom/disconnect` | Disconnect |
| `GET /api/integrations/zoom/meetings` | List upcoming Zoom meetings |
| `POST /api/integrations/zoom/import` | Import a Zoom meeting into MeetScribe |
| `POST /api/integrations/zoom/record/start` | Start cloud recording |
| `POST /api/integrations/zoom/record/stop` | Stop recording → auto-transcribe + summarize |
| `GET /api/integrations/zoom/recordings/:id` | Get recording files |

**UI (Settings → Zoom):**
1. Connect Zoom (demo or real OAuth)
2. Refresh upcoming meetings
3. Import any meeting
4. Start / Stop cloud recording
5. On stop → status becomes `processing` → `completed` with transcript & summary

Cloud recording requires **Starter or Pro** plan.

For live Zoom: create an app at https://marketplace.zoom.us/ and set `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` in backend `.env`.
