# Quickstart

## 1) Create Telegram bot

1. Open `@BotFather`.
2. Create a bot and copy `TELEGRAM_BOT_TOKEN`.
3. Send `/start` to your bot from the destination chat.

## 2) Prepare Cloudflare token

Create API token with scopes:

- `Zone: Read`
- `DNS: Edit`
- `Workers Scripts: Edit`
- `Email Routing Rules: Edit`

## 3) Initialize config

```bash
mail2tg init
```

Or non-interactive:

```bash
MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
MAIL2TG_WORKER_NAME=mail2tg-worker \
mail2tg init --non-interactive
```

## 4) Export secrets

```bash
export CLOUDFLARE_API_TOKEN="..."
export TELEGRAM_BOT_TOKEN="..."
```

## 5) Apply

```bash
mail2tg plan
mail2tg apply
mail2tg doctor
```

`doctor` sends a test message to verify Telegram delivery.
