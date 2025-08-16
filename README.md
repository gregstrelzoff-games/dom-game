# Player Admin Prototype v1.0.0

Ready-to-deploy user system with:
- Guided signup + email verification
- Set/reset password (SMTP or dev outbox)
- Login tracking (last login, events)
- Admin users list + reset link
- Themed player UI with drop-in game CSS
- Home page linking to Play vs AI, Play vs Player, Records, Achievements

## Quick start (local)
```bash
npm install
npm run seed   # optional demo data
# for email links to be correct locally:
export APP_ORIGIN=http://localhost:4001
npm start
```

Open:
- Home:        http://localhost:4001/
- Signup:      http://localhost:4001/signup
- Login:       http://localhost:4001/login
- Forgot:      http://localhost:4001/forgot
- Admin:       http://localhost:4001/admin  (admin token: devadmin by default)

## Real emails (SMTP)
Set env vars (see .env.example). If not set, emails go to a dev Outbox in the Admin page.

## Docker
```bash
docker build -t player-admin:1.0.0 .
docker run -p 4001:4001 -e APP_ORIGIN=http://localhost:4001 player-admin:1.0.0
```
