# Quickstart

Step-by-step guide from zero to working email-to-Telegram forwarding.

## Prerequisites

- **Node.js >= 20** — [download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A domain with DNS managed by Cloudflare** (see step 0 below)

## 0) Set up your domain on Cloudflare

Cloudflare Email Routing only works when Cloudflare manages your domain's DNS. If your domain is already on Cloudflare and shows **"Active"** — skip to step 1.

Otherwise:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) → **"Add a domain"**.
2. Enter your domain (e.g. `example.com`), pick the **Free** plan.
3. Cloudflare will assign you **two nameservers** (e.g. `emma.ns.cloudflare.com`, `rob.ns.cloudflare.com`).
4. Log in to your **domain registrar** (GoDaddy, Namecheap, Porkbun, etc.):
   - Find **DNS / Nameservers** settings for your domain.
   - **Replace** the existing nameservers with the two from Cloudflare.
   - Save changes.
5. Go back to Cloudflare and click **"Check nameservers"**. Propagation takes 5-30 minutes (up to 24h in rare cases). Cloudflare will email you when the domain is active.

Official guide: [Change your nameservers (Cloudflare docs)](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

> **Warning about existing email**: If you already receive email on this domain (Google Workspace, Zoho, etc.), `mail2tg apply` will create MX records that route mail through Cloudflare. You can configure Cloudflare Email Routing to forward to your existing mailboxes alongside the Telegram worker. See [Cloudflare Email Routing docs](https://developers.cloudflare.com/email-routing/).

## 1) Create a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`, follow the prompts, and copy the **bot token** (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).
3. Open a chat with your new bot and send `/start` — this creates a chat entry so the CLI can auto-discover the `chat_id`.

> If you want to forward emails to a group or channel instead, add the bot to that group/channel, then send any message there.

## 2) Create a Cloudflare API token

Official documentation: [Create an API token (Cloudflare docs)](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

1. Go to **[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)**.
2. Click **"Create Token"**.
3. Scroll down and click **"Create Custom Token"** (do **not** use the pre-built templates — they don't have the right scopes).
4. Fill in:
   - **Token name**: `mail2tg` (or anything descriptive)
   - **Permissions** — add 4 rows:

     | Resource | Permission |
     |----------|------------|
     | Zone | Read |
     | DNS | Edit |
     | Worker Scripts | Edit |
     | Email Routing Rules | Edit |

   - **Zone Resources**: Select **"Include" → "Specific zone"** → pick the domain you want email for.

5. Click **"Continue to summary"** → **"Create Token"**.
6. **Copy the token immediately** — you cannot view it again.

## 3) Install

```bash
npm install -g mail2tg
```

Or use `npx` to run without installing:

```bash
npx mail2tg init
```

## 4) Initialize config

Interactive mode (will ask questions):

```bash
mail2tg init
```

Non-interactive mode (all values from env):

```bash
MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
MAIL2TG_WORKER_NAME=mail2tg-worker \
mail2tg init --non-interactive
```

This creates `mail2tg.config.yaml` in the current directory.

## 5) Export secrets

Secrets are passed via environment variables and never written to config files.

macOS / Linux:

```bash
export CLOUDFLARE_API_TOKEN="your-cloudflare-token"
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

Windows (cmd):

```cmd
set CLOUDFLARE_API_TOKEN=your-cloudflare-token
set TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

Windows (PowerShell):

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-cloudflare-token"
$env:TELEGRAM_BOT_TOKEN = "your-telegram-bot-token"
```

## 6) Plan, Apply, Verify

```bash
mail2tg plan     # dry-run — shows what will be created/changed
mail2tg apply    # deploys Worker + DNS + routing rule + secrets
mail2tg doctor   # verifies everything + sends a test message to Telegram
```

After `apply`:
- 3 MX records point your domain to Cloudflare's mail servers.
- An SPF TXT record authorizes Cloudflare to handle mail.
- A Cloudflare Worker parses incoming emails and sends them to Telegram.
- An Email Routing rule connects your mailbox address to the Worker.

After `doctor`:
- You should see a test message in Telegram confirming delivery works.

## What happens next

Nothing to maintain locally. Cloudflare Workers run on Cloudflare's edge network. When someone sends an email to your configured address, it arrives in your Telegram chat within seconds — including all attachments up to 50 MB.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Config file not found` | No `mail2tg.config.yaml` | Run `mail2tg init` first |
| `Missing required environment variables` | Tokens not exported | `export CLOUDFLARE_API_TOKEN=...` and `export TELEGRAM_BOT_TOKEN=...` |
| `Telegram chat_id not found` | Bot has no recent `/start` message | Send `/start` to the bot, then re-run |
| `Worker deployment failed` | `wrangler` issue | Ensure internet access; try `npx wrangler whoami` to debug |
| `Cloudflare zone not found` | Wrong domain or token scope | Verify domain is on Cloudflare and token has Zone Read for that zone |
| `Doctor checks failed` | Partial setup | Run `mail2tg apply` again; check which check failed in the output |
