---
name: mail2tg
description: >-
  Set up email-to-Telegram forwarding via Cloudflare Workers using the mail2tg
  CLI. Use when the user wants to receive emails in Telegram, route domain
  email to a Telegram chat, configure Cloudflare Email Routing, or mentions
  'mail2tg', 'email to telegram', 'почта в телеграм', 'получать письма в
  телеграм', 'настрой email forwarding'.
---

# mail2tg — Email to Telegram via Cloudflare

## What it does

`mail2tg` is an npm CLI that configures `address@yourdomain.com` → Telegram forwarding in one shot. It deploys a Cloudflare Worker, creates DNS records, and sets up Email Routing. After `apply`, nothing runs locally.

```
Email → Cloudflare MX → Email Routing → Worker (parses MIME) → Telegram Bot API → Chat
```

## Prerequisites checklist

Before running commands, verify:

1. **Domain DNS is managed by Cloudflare** (nameservers point to Cloudflare, status "Active" in dashboard).
2. **Cloudflare API token** exists with scopes: Zone Read, DNS Edit, Worker Scripts Edit, Email Routing Rules Edit. Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → "Create Custom Token".
3. **Telegram bot** created via @BotFather, token copied. User has sent `/start` to the bot.
4. **Node.js >= 20** available.

## Install

Published on npm. No install needed — `npx` downloads on the fly:

```bash
npx mail2tg init
```

Or install globally for repeated use:

```bash
npm install -g mail2tg
mail2tg init
```

## Agent workflow

### Non-interactive (recommended for agents)

```bash
# 1. Set secrets
export CLOUDFLARE_API_TOKEN="<token>"
export TELEGRAM_BOT_TOKEN="<bot-token>"

# 2. Create config
MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
npx mail2tg init --non-interactive --json

# 3. Dry-run
npx mail2tg plan --json --non-interactive

# 4. Apply
npx mail2tg apply --json --non-interactive

# 5. Verify
npx mail2tg doctor --json --non-interactive
```

### Interactive (when user is present)

```bash
npx mail2tg init    # prompts for domain, mailbox, worker name
npx mail2tg plan    # shows what will change
npx mail2tg apply   # deploys everything
npx mail2tg doctor  # sends test message to Telegram
```

## JSON output

All commands with `--json` return a single JSON object:

```json
{"ok": true, "message": "Apply completed", "data": {"summary": [...]}}
```

Errors go to stderr:

```json
{"ok": false, "message": "Missing required environment variables: CLOUDFLARE_API_TOKEN", "code": 2}
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | Missing config or env vars |
| 3 | Cloudflare/Telegram API error |
| 4 | Doctor health checks failed |
| 5 | Worker deployment failed |

## Common issues

| Symptom | Fix |
|---------|-----|
| "Telegram chat_id not found" | User must send `/start` to the bot, then re-run |
| "Cloudflare zone not found" | Domain not on Cloudflare or token lacks Zone Read scope |
| "Worker deployment failed" | Check internet; run `npx wrangler whoami` to debug auth |
| DNS not propagated after apply | Wait 5-30 min; verify with `dig MX example.com` |

## Key facts

- **Free**: Cloudflare Free plan + Workers free tier (100K req/day) + Telegram Bot API.
- **No running service**: After `apply`, the CLI is no longer needed.
- **Attachments**: Forwarded up to 50 MB, including password-protected archives.
- **Idempotent**: Running `apply` multiple times is safe.
- **Source**: [github.com/shatzibitten/mail2tg](https://github.com/shatzibitten/mail2tg)

## Full documentation

For detailed setup (domain registration, token creation step-by-step, Windows instructions), see the [README](https://github.com/shatzibitten/mail2tg/blob/main/README.md) and [Quickstart](https://github.com/shatzibitten/mail2tg/blob/main/docs/quickstart.md).
