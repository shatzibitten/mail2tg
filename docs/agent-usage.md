# Agent Usage (Cursor / Claude / CI/CD / Automation)

This document describes how to use `mail2tg` programmatically from an AI agent (Cursor, Claude Code, Copilot Workspace), a CI/CD pipeline, or any non-interactive automation.

## What mail2tg does

`mail2tg` is a CLI that automates setting up **Email -> Telegram** forwarding via Cloudflare. It:

1. Deploys a Cloudflare Worker that parses incoming emails and forwards them (with attachments) to a Telegram chat via the Bot API.
2. Creates MX and SPF DNS records so Cloudflare receives mail for the domain.
3. Creates a Cloudflare Email Routing rule that directs a specific address to the Worker.
4. Sets Worker secrets (Telegram bot token and chat ID).

After running `apply`, there are no local processes — everything runs on Cloudflare's edge.

## Prerequisites for agents

Before running commands, ensure:

1. **Node.js >= 20** is available in PATH.
2. **Two environment variables** are set:
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API token with scopes: Zone Read, DNS Edit, Worker Scripts Edit, Email Routing Rules Edit. See [how to create one](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/).
   - `TELEGRAM_BOT_TOKEN` — Telegram bot token from [@BotFather](https://t.me/BotFather).
3. **The Telegram bot has received a `/start` message** from the target chat. Without this, `resolveChatId` will fail.
4. **The domain is already on Cloudflare** (DNS managed by Cloudflare).

> `wrangler` (Cloudflare Worker deploy tool) is auto-downloaded via `npx` during `apply`. No separate install is needed.

## Global flags

| Flag | Description |
|------|-------------|
| `--json` | All output as single-line JSON to stdout/stderr |
| `--non-interactive` | Never prompt for input; fail if required data is missing |
| `-c, --config <path>` | Path to config file (default: `./mail2tg.config.yaml`) |

## Full non-interactive flow

```bash
# Step 1: Set environment variables
export CLOUDFLARE_API_TOKEN="cf-token-here"
export TELEGRAM_BOT_TOKEN="bot-token-here"

# Step 2: Create config without prompts
MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
MAIL2TG_WORKER_NAME=mail2tg-worker \
mail2tg init --non-interactive --json

# Step 3: Dry-run to see planned changes
mail2tg plan --json --non-interactive

# Step 4: Apply all changes
mail2tg apply --json --non-interactive

# Step 5: Health check (also sends test Telegram message)
mail2tg doctor --json --non-interactive
```

## Environment variables reference

| Variable | Required | Used by | Description |
|----------|----------|---------|-------------|
| `CLOUDFLARE_API_TOKEN` | Yes | plan, apply, doctor | Cloudflare API token (also accepts `CF_API_TOKEN`) |
| `TELEGRAM_BOT_TOKEN` | Yes | plan, apply, doctor | Telegram bot token |
| `MAIL2TG_DOMAIN` | For `init --non-interactive` | init | Domain to configure |
| `MAIL2TG_MAILBOX` | For `init --non-interactive` | init | Email address to route |
| `MAIL2TG_WORKER_NAME` | Optional | init | Worker name (default: `mail2tg-worker`) |
| `MAIL2TG_PROJECT_NAME` | Optional | init | Project name (default: `mail2tg-project`) |
| `MAIL2TG_CHAT_ID` | Optional | init | Telegram chat ID (auto-resolved if omitted) |

## Exit codes

| Code | Meaning | When |
|------|---------|------|
| `0` | Success | Command completed without errors |
| `2` | Validation/config error | Missing env vars, invalid config, missing chat_id |
| `3` | External API error | Cloudflare or Telegram API call failed |
| `4` | Doctor checks failed | One or more health checks did not pass |
| `5` | Worker deployment failed | `wrangler deploy` failed |

## JSON output format

All commands with `--json` emit JSON objects to stdout (success) or stderr (error).

### Success envelope

```json
{
  "ok": true,
  "message": "Apply completed",
  "data": {
    "summary": [
      { "step": "deploy-worker", "status": "ok" },
      { "step": "dns-upsert", "status": "applied" },
      { "step": "routing-rule", "status": "apply" },
      { "step": "worker-secrets", "status": "ok" }
    ]
  }
}
```

### Error envelope

```json
{
  "ok": false,
  "message": "Missing required environment variables: CLOUDFLARE_API_TOKEN",
  "code": 2
}
```

### Plan output

```json
{
  "ok": true,
  "message": "Execution plan generated",
  "data": {
    "zone": { "id": "abc123", "name": "example.com", "account": { "id": "def456", "name": "My Account" } },
    "chatId": "190893755",
    "plan": {
      "generatedAt": "2026-03-10T12:00:00.000Z",
      "actions": [
        { "id": "preflight-cloudflare", "type": "preflight.cloudflare", "description": "Cloudflare token verified", "status": "noop" },
        { "id": "preflight-telegram", "type": "preflight.telegram", "description": "Telegram bot token verified", "status": "noop" },
        { "id": "resolve-chat-id", "type": "telegram.chat", "description": "Telegram chat_id resolved (190893755)", "status": "noop" },
        { "id": "deploy-worker", "type": "worker.deploy", "description": "Deploy or update worker mail2tg-worker", "status": "pending" },
        { "id": "dns-mx-amir.mx.cloudflare.net", "type": "dns.mx", "description": "MX amir.mx.cloudflare.net already configured", "status": "noop" },
        { "id": "dns-mx-isaac.mx.cloudflare.net", "type": "dns.mx", "description": "Create MX isaac.mx.cloudflare.net", "status": "pending" },
        { "id": "dns-mx-linda.mx.cloudflare.net", "type": "dns.mx", "description": "MX linda.mx.cloudflare.net already configured", "status": "noop" },
        { "id": "dns-spf", "type": "dns.txt", "description": "SPF already configured", "status": "noop" },
        { "id": "routing-rule", "type": "email.routing", "description": "Routing rule already configured for info@example.com", "status": "noop" },
        { "id": "worker-secret-token", "type": "worker.secret", "description": "Set TELEGRAM_BOT_TOKEN secret", "status": "pending" },
        { "id": "worker-secret-chat", "type": "worker.secret", "description": "Set TELEGRAM_CHAT_ID secret", "status": "pending" }
      ]
    }
  }
}
```

Actions with `"status": "pending"` will be applied by `apply`. Actions with `"status": "noop"` are already configured.

## Config file format

`mail2tg.config.yaml` (created by `init`):

```yaml
projectName: mail2tg-project
domain: example.com
mailbox: info@example.com
workerName: mail2tg-worker
# telegramChatId: "123456789"  # optional — auto-resolved from bot updates
```

## State file

`apply` creates `.mail2tg-state.json` in the working directory. It tracks deployed resource IDs for idempotency:

```json
{
  "version": 1,
  "updatedAt": "2026-03-10T12:00:00.000Z",
  "resources": {
    "zoneId": "abc123",
    "accountId": "def456",
    "workerName": "mail2tg-worker",
    "mailbox": "info@example.com"
  }
}
```

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  mail2tg    │───▷│  Cloudflare API  │    │  Telegram API    │
│  CLI        │    │  (REST)          │    │  (REST)          │
└─────────────┘    └──────────────────┘    └──────────────────┘
      │                    │                        ▲
      │ deploys            │ routes email           │ forwards
      ▼                    ▼                        │
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  wrangler   │───▷│  CF Worker       │───▷│  Telegram Bot    │
│  (via npx)  │    │  (email handler) │    │  (sendMessage/   │
└─────────────┘    │  parses MIME,    │    │   sendDocument)  │
                   │  extracts attach │    └──────────────────┘
                   └──────────────────┘
```

## Agent implementation notes

- **Idempotent**: Running `apply` multiple times is safe. It checks existing DNS/routing state before creating.
- **No interactive input needed**: Use `--non-interactive` to guarantee no stdin reads.
- **Parse JSON output**: With `--json`, each command emits exactly one JSON object. Parse it from stdout for success, stderr for errors.
- **Check exit codes**: Non-zero means failure. See table above.
- **chat_id timing**: The bot must have received a `/start` message recently (within the last 20 updates). If `plan` shows `chat_id` as unresolved, instruct the user to send `/start` to the bot.
- **Secrets never in config**: `CLOUDFLARE_API_TOKEN` and `TELEGRAM_BOT_TOKEN` are only read from environment variables, never written to disk.
