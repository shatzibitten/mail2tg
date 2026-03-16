# mail2tg

`mail2tg` is a local-first CLI that configures Email -> Telegram routing with Cloudflare Email Routing and Workers.

## Why

- 5-minute setup for `info@yourdomain.com` -> Telegram.
- No long-running local service.
- Built-in `plan`, `apply`, and `doctor` commands.
- Agent-friendly (`--json`, `--non-interactive`, stable exit codes).

## Install

```bash
npm install -g mail2tg
```

or run via npx:

```bash
npx mail2tg init
```

## Quick Start

```bash
mail2tg init
export CLOUDFLARE_API_TOKEN="..."
export TELEGRAM_BOT_TOKEN="..."
mail2tg plan
mail2tg apply
mail2tg doctor
```

## Commands

- `mail2tg init` - create config file.
- `mail2tg plan` - dry-run execution plan.
- `mail2tg apply` - apply Cloudflare + Worker settings.
- `mail2tg doctor` - verify DNS/routing/bot and send test message.

## Required Cloudflare token scopes

- `Zone: Read`
- `DNS: Edit`
- `Workers Scripts: Edit`
- `Email Routing Rules: Edit`

## Agent Usage

Use machine-readable output:

```bash
mail2tg plan --json --non-interactive
```

Read full guides:

- [Quickstart](docs/quickstart.md)
- [Agent usage](docs/agent-usage.md)
- [Security policy](SECURITY.md)

## Known Limits

- Email providers can still block some attachment types before delivery.
- DNS propagation may take several minutes.
- Telegram Bot API enforces limits for message/file throughput.

## License

MIT
