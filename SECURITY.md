# Security Policy

## Supported Versions

Only the latest tagged release is supported.

## Reporting a Vulnerability

Please open a private security report via GitHub Security Advisories.

Do not include live tokens in reports.

## Secrets Handling

- `mail2tg` does not store API tokens in config or state files.
- Use environment variables:
  - `CLOUDFLARE_API_TOKEN`
  - `TELEGRAM_BOT_TOKEN`
- Rotate tokens if exposed.
