# Gladiatus-style browser game

## Setup
1. In pgAdmin create an empty database named `gladiatus`.
2. `copy server\.env.example server\.env` and fill in your Postgres password and a JWT secret.
3. `npm install`
4. `npm run migrate -w server` then `npm run seed -w server` (run the seed before registering, so new accounts get the starter sword; re-run both after pulling updates)
5. `npm run dev` and open http://localhost:5173

## Production
`npm run build`, then set `NODE_ENV=production` and a real `JWT_SECRET` (the server refuses to start without one) and run `npm start -w server`; the API then also serves the built client on its port. Login and register are rate limited (50 requests / 15 min per IP).

## Optional Claude Code tooling (not installed by default)
- **claude-mem**: installed as a Claude Code plugin.
- **task-observer**: vendored in `.claude/skills/task-observer/` (source: github.com/rebelytics/one-skill-to-rule-them-all).
- **Headroom** (context-compression proxy) and **OmniRoute** (multi-provider gateway, `npm i -g omniroute`, dashboard on :20128) both work by redirecting `ANTHROPIC_BASE_URL`, so they must be chained rather than used side by side. OmniRoute also holds provider credentials and sees your traffic. Verify each project's own install docs before enabling.
