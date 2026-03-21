# Frontier Atlas

A spatial community platform for navigating a building with 17 themed floors. Members create profiles, discover people, and request introductions.

[![Demo Video](https://img.youtube.com/vi/6k0bFcmGBZE/maxresdefault.jpg)](https://youtu.be/6k0bFcmGBZE)

## Tech Stack

Next.js 16 (App Router) / React 19 / Prisma 7 / PostgreSQL / Auth.js v5 / Tailwind CSS v4 / shadcn/ui

## Prerequisites

- Node.js 22+
- PostgreSQL (local or hosted, e.g. [Neon](https://neon.tech))
- pnpm

## Setup

```bash
# Clone and install
git clone https://github.com/Wenjix/frontier-atlas.git
cd frontier-atlas
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and other values

# Set up database
npx prisma migrate dev
npx prisma generate
npx tsx prisma/seed.ts

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth secret (`openssl rand -base64 32`) |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `EMAIL_SERVER_*` | Prod only | SMTP config for magic links and onboarding emails |
| `TELEGRAM_BOT_TOKEN` | No | For Telegram Mini App integration |

## Dev Sign-In

In development, enter any email at `/auth/signin` to sign in instantly (no email sent). Use the same email you put in `ADMIN_EMAILS` to access `/admin`.

## Admin Panel

Navigate to `/admin` while signed in with an admin email. From there you can:

- Edit floor metadata (name, description, icon, type)
- Assign floor leads and stewards
- Send onboarding emails to floor members
- Manage invitations

## Project Structure

```
app/
  page.tsx              # Main tower view (lobby + floor bento)
  inbox/                # Intro request inbox
  admin/                # Admin panel (floors, leads, invitations, email)
  auth/                 # Sign-in and verify pages
  api/                  # API routes
    floors/             # Public floor list + floor-scoped endpoints
    admin/              # Admin-only endpoints
    me/                 # Current user profile, notifications, intro requests
    intro-requests/     # Create and respond to intro requests
components/
  tower-spine.tsx       # Left sidebar floor navigation
  floor-bento.tsx       # Floor detail bento layout
  lobby-view.tsx        # Home/lobby view
  onboarding-flow.tsx   # Profile setup wizard
  request-intro-flow.tsx # Intro request + response components
lib/
  services/             # Business logic (intro, email, directory, etc.)
  validations/          # Zod schemas
  floor-data.ts         # Static floor definitions (used for seeding)
prisma/
  schema.prisma         # Database schema
  seed.ts               # Floor seeding script
```

## Deployment

Deployed on [Vercel](https://vercel.com). Set all environment variables in Vercel project settings. The database should be accessible from Vercel's network (use `sslmode=verify-full` in the connection string).

## Community Wiki

[ft0.sh/wiki](https://ft0.sh/wiki)
