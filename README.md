# WBS React + Node + SQLite + Login PWA

## What is included

- React.js frontend
- LocalStorage fallback cache
- Node.js + Express backend
- SQLite database
- User login system with JWT
- Default admin account
- Working sidebar modules
- Billing notice generator / print as PDF

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend runs at:

```text
http://localhost:4000
```

## Default login

```text
Username: admin
Password: admin123
```

Change this after first run.

## Database

SQLite file auto-created here:

```text
server/data/wbs.sqlite
```

## Upgrade to PostgreSQL later

Replace `server/db.js` with a PostgreSQL connection using `pg`, then convert the SQL schema in `server/schema.sql`.
