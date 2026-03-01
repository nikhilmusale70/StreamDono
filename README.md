# StreamDonations

Razorpay to Streamlabs integration for Indian streamers. Accept INR donations and display real-time alerts on stream.

## Features

- **Single Razorpay Account**: Platform uses one Razorpay account; donors enter any amount
- **Streamlabs Alerts**: Real-time donation alerts on OBS/Streamlabs
- **Analytics Dashboard**: Total raised, donation count, top donors, charts
- **Google OAuth & Email/Password**: Flexible authentication
- **Secure**: Webhook signature verification, encrypted tokens

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://..."  # Railway adds this automatically
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"  # Your deploy URL in production
GOOGLE_CLIENT_ID="..."  # From Google Cloud Console
GOOGLE_CLIENT_SECRET="..."
RAZORPAY_KEY_ID=""      # From Razorpay Dashboard
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""  # After adding webhook in Razorpay
ENCRYPTION_KEY="32-character-key-for-token-encryption"
```

### 3. Set up database

```bash
npx prisma db push
```

### 4. Run locally

```bash
npm run dev
```

Visit http://localhost:3000

## Railway Deployment

1. **Create a Railway project** at [railway.app](https://railway.app)
2. **Add PostgreSQL** from the Railway template
3. **Deploy from GitHub** or connect your repo
4. **Set environment variables**:
   - `DATABASE_URL` - Auto-filled when you add PostgreSQL
   - `NEXTAUTH_SECRET` - Generate: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your Railway app URL (e.g. `https://your-app.railway.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` - From Razorpay after adding webhook
   - `ENCRYPTION_KEY` - 32+ character string

5. **Deploy** - Railway will build and deploy automatically

## Platform Setup (One-time)

1. Add **webhook** in [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks
2. URL: `https://your-app-url/api/webhook`
3. Select `payment.captured` event
4. Copy the webhook secret → Set as `RAZORPAY_WEBHOOK_SECRET` in env

## Streamer Setup

1. Sign up and go to **Dashboard → Config**
2. **Donate URL**: Choose a unique slug (e.g. `nikhil`) → Share `yoursite.com/donate/nikhil`
3. **Streamlabs**: Get Socket API Token from [Streamlabs Dashboard](https://streamlabs.com) → API Settings
4. **Test**: Click "Send Test Alert" to verify Streamlabs

Donors visit your link, enter any amount, and pay via Razorpay. All funds go to your platform's Razorpay account.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth.js
- Tailwind CSS
- Recharts

## License

MIT
