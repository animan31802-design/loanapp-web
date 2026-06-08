# LoanApp Web

Next.js 15 web version of the LoanApp mobile application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` from the example:
```bash
cp .env.local.example .env.local
```

3. Fill in your Firebase Web App config in `.env.local`:
   - Go to Firebase Console → Project Settings → Your apps → Add app → Web
   - Copy the config values into `.env.local`

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your `.env.local` values as Environment Variables in Vercel dashboard.

## Notes

- Same Firebase project as the mobile app — same data, same users
- Members can add to home screen on iPhone (Safari → Share → Add to Home Screen)
- Admin login: use the same email/password as the mobile app
