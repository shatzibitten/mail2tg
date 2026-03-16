# mail2tg — Email to Telegram via Cloudflare

## What it does

`mail2tg` is an npm CLI that configures `address@yourdomain.com` → Telegram forwarding in one shot. It deploys a Cloudflare Worker, creates DNS records, and sets up Email Routing. After `apply`, nothing runs locally.

```
Email → Cloudflare MX → Email Routing → Worker (parses MIME) → Telegram Bot API → Chat
```

## Prerequisites

1. **Domain DNS managed by Cloudflare** (nameservers point to Cloudflare, status "Active").
2. **Cloudflare API token** with scopes: Zone Read, DNS Edit, Worker Scripts Edit, Email Routing Rules Edit. Create at dash.cloudflare.com/profile/api-tokens → "Create Custom Token".
3. **Telegram bot** created via @BotFather. User has sent `/start` to the bot.
4. **Node.js >= 20**.

## Install

No install needed — `npx` downloads on the fly:

```bash
npx mail2tg init
```

Or global: `npm install -g mail2tg`

## Agent workflow

```bash
export CLOUDFLARE_API_TOKEN="<token>"
export TELEGRAM_BOT_TOKEN="<bot-token>"

MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
npx mail2tg init --non-interactive --json

npx mail2tg plan --json --non-interactive
npx mail2tg apply --json --non-interactive
npx mail2tg doctor --json --non-interactive
```

## JSON output

All commands with `--json` return one JSON object to stdout (success) or stderr (error):

```json
{"ok": true, "message": "Apply completed", "data": {"summary": [...]}}
{"ok": false, "message": "error description", "code": 2}
```

## Exit codes

- `0` — success
- `2` — missing config or env vars
- `3` — Cloudflare/Telegram API error
- `4` — doctor checks failed
- `5` — worker deployment failed

## Common issues

- **"Telegram chat_id not found"** — send `/start` to the bot, re-run.
- **"Cloudflare zone not found"** — domain not on Cloudflare or token lacks Zone Read.
- **"Worker deployment failed"** — check internet; `npx wrangler whoami` to debug.

## Key facts

- Free (Cloudflare Free plan + Workers free tier + Telegram Bot API).
- No running service after `apply`.
- Attachments up to 50 MB, including password-protected archives.
- Idempotent — `apply` is safe to run multiple times.
- Full docs: see README.md and docs/ folder.
