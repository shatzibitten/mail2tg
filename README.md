# mail2tg

[![npm version](https://img.shields.io/npm/v/mail2tg)](https://www.npmjs.com/package/mail2tg)
[![license](https://img.shields.io/npm/l/mail2tg)](LICENSE)
[![node](https://img.shields.io/node/v/mail2tg)](https://nodejs.org/)
[![CI](https://github.com/shatzibitten/mail2tg/actions/workflows/ci.yml/badge.svg)](https://github.com/shatzibitten/mail2tg/actions)

`mail2tg` is a local-first CLI that configures **Email -> Telegram** routing using Cloudflare Email Routing and Workers. You run it once on your machine — it sets up everything in Cloudflare and there is nothing to host or keep running.

## How It Works

```
Incoming email → Cloudflare MX → Email Routing → Cloudflare Worker → Telegram Bot API → Your chat
```

The CLI automates:
1. Deploying a Cloudflare Worker that parses emails (headers, body, attachments) and forwards them to Telegram.
2. Creating MX + SPF DNS records so Cloudflare receives mail for your domain.
3. Creating an Email Routing rule that sends matching addresses to the Worker.
4. Setting Worker secrets (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).

After `apply`, there are no local processes — Cloudflare handles everything.

## Why

- 5-minute setup for `info@yourdomain.com` -> Telegram.
- Attachments up to 50 MB forwarded as Telegram documents (including password-protected archives).
- No long-running local service — fully serverless.
- Built-in `plan`, `apply`, and `doctor` commands (Terraform-style workflow).
- Agent-friendly (`--json`, `--non-interactive`, stable exit codes).
- Works on macOS, Linux, and Windows.

## FAQ

**Do I need to keep a server or process running?**
No. The CLI runs once on your machine to configure everything. After that, the Cloudflare Worker runs on Cloudflare's edge network — no VPS, no Docker, no cron jobs, nothing on your computer. You can close the terminal and uninstall the CLI; emails will keep arriving in Telegram.

**Will this cost me money?**
No. Everything used is within free tiers:
- **Cloudflare Email Routing** — free on all plans, including Free.
- **Cloudflare Workers** — free tier includes 100,000 requests/day (that's 100K emails/day).
- **Telegram Bot API** — free, no limits for personal use.
- **Cloudflare DNS** — free.

You will not be charged unless you exceed 100,000 emails per day, which is unlikely for personal or small business use.

**Can Cloudflare or anyone else read my emails?**
The email passes through Cloudflare's infrastructure (just like it passes through any email relay). Your Cloudflare Worker code is **yours** — it is deployed to your own Cloudflare account. Cloudflare does not inspect Worker content. The full source code of the Worker is [open and auditable](src/worker-template/index.ts). No data is sent anywhere except to the Telegram Bot API (your bot, your chat). No analytics, no third-party services, no logging beyond what you configure yourself.

## Prerequisites

- **Node.js >= 20** — [download](https://nodejs.org/)
- **A domain with DNS on Cloudflare** — see [Domain setup](#domain-setup) below
- **A Cloudflare API token** — see [Creating a Cloudflare API Token](#creating-a-cloudflare-api-token) below
- **A Telegram bot** — create one via [@BotFather](https://t.me/BotFather) and copy the token

> `wrangler` (Cloudflare's deploy tool) is downloaded automatically via `npx` during `apply`. No separate install needed.

## Domain Setup

Cloudflare Email Routing requires your domain's DNS to be **fully managed by Cloudflare**. This means the domain's nameservers at your registrar must point to Cloudflare.

If your domain is **not yet on Cloudflare**:

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/) and click **"Add a domain"**.
2. Enter your domain (e.g. `example.com`) and select the Free plan.
3. Cloudflare will show you **two nameservers** (e.g. `emma.ns.cloudflare.com`, `rob.ns.cloudflare.com`).
4. Go to your **domain registrar** (GoDaddy, Namecheap, Porkbun, etc.) and **replace the existing nameservers** with the two Cloudflare gave you.
5. Wait for propagation (usually 5-30 minutes, can take up to 24 hours). Cloudflare will email you when the domain is active.

Official guide: [Change your nameservers (Cloudflare docs)](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

If your domain is **already on Cloudflare**, verify it shows **"Active"** status in the dashboard. No extra domain setup is needed.

> **Important**: If you already use email on this domain (e.g. Google Workspace, Zoho), be aware that `mail2tg apply` creates new MX records pointing to Cloudflare's mail servers. This will **redirect all incoming email** through Cloudflare Email Routing. You can set up forwarding rules in Cloudflare to keep your existing mailboxes working alongside `mail2tg`. See [Cloudflare Email Routing docs](https://developers.cloudflare.com/email-routing/) for details.

## Install

```bash
npm install -g mail2tg
```

or run via npx without installing:

```bash
npx mail2tg init
```

## Quick Start

```bash
# 1. Create config file (interactive prompts)
mail2tg init

# 2. Export secrets as environment variables
export CLOUDFLARE_API_TOKEN="your-cloudflare-token"
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# 3. Preview what will be changed (dry-run)
mail2tg plan

# 4. Apply all changes to Cloudflare
mail2tg apply

# 5. Verify everything works + send test message to Telegram
mail2tg doctor
```

On Windows use `set` (cmd) or `$env:` (PowerShell):

```cmd
set CLOUDFLARE_API_TOKEN=your-cloudflare-token
set TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## Commands

| Command | Description |
|---------|-------------|
| `mail2tg init` | Create `mail2tg.config.yaml` interactively or from env vars |
| `mail2tg plan` | Dry-run: show what `apply` will change without touching anything |
| `mail2tg apply` | Deploy Worker, configure DNS, routing, and secrets |
| `mail2tg doctor` | Verify DNS/routing/bot health and send a test Telegram message |

## Creating a Cloudflare API Token

Official guide: [Create an API token (Cloudflare docs)](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

Step-by-step:

1. Go to **[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)**.
2. Click **"Create Token"**.
3. Click **"Create Custom Token"** (at the bottom, not a template).
4. Give it a name, e.g. `mail2tg`.
5. Add these **permissions**:

   | Resource | Permission |
   |----------|------------|
   | Zone | Read |
   | DNS | Edit |
   | Worker Scripts | Edit |
   | Email Routing Rules | Edit |

6. Under **Zone Resources**, select **"Include" → "Specific zone"** → pick your domain.
7. Click **"Continue to summary"** → **"Create Token"**.
8. Copy the token. You will not see it again.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes | Cloudflare API token (also accepts `CF_API_TOKEN`) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `MAIL2TG_DOMAIN` | Only for `init --non-interactive` | Domain name |
| `MAIL2TG_MAILBOX` | Only for `init --non-interactive` | Email address to route |
| `MAIL2TG_WORKER_NAME` | Optional | Worker name (default: `mail2tg-worker`) |
| `MAIL2TG_PROJECT_NAME` | Optional | Project name (default: `mail2tg-project`) |
| `MAIL2TG_CHAT_ID` | Optional | Telegram chat ID (auto-resolved if omitted) |

## Config File

`mail2tg init` creates `mail2tg.config.yaml`:

```yaml
projectName: mail2tg-project
domain: example.com
mailbox: info@example.com
workerName: mail2tg-worker
# telegramChatId: "123456789"  # optional, auto-resolved via getUpdates
```

Secrets are **never** stored in the config file — only in environment variables.

## Agent Usage

This repo includes built-in instructions for AI coding agents. Clone or open the repo and your agent will know how to set everything up:

- **Cursor** — [`.cursor/skills/mail2tg/SKILL.md`](.cursor/skills/mail2tg/SKILL.md) is loaded automatically when you open the project.
- **Claude Code** — [`CLAUDE.md`](CLAUDE.md) is read automatically when working in this directory.
- **Any agent with shell access** — use `--json` and `--non-interactive` flags:

```bash
mail2tg plan --json --non-interactive
mail2tg apply --json --non-interactive
```

See [docs/agent-usage.md](docs/agent-usage.md) for the full guide including expected JSON output format and exit codes.

## More Docs

- [Quickstart](docs/quickstart.md) — step-by-step from zero
- [Agent usage](docs/agent-usage.md) — JSON output, exit codes, automation flow
- [Security policy](SECURITY.md) — how secrets are handled

## Known Limits

- Email providers can still block some attachment types *before* delivery reaches Cloudflare.
- DNS propagation may take several minutes after `apply`.
- Telegram Bot API enforces a 50 MB file size limit per document.
- `resolveChatId` scans only the last 20 bot updates — send `/start` to the bot shortly before running `plan`/`apply`.

## License

MIT
