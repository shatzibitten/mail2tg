# Agent Usage (Cursor / Claude / automation)

`mail2tg` supports machine-readable workflows.

## Non-interactive mode

```bash
MAIL2TG_DOMAIN=example.com \
MAIL2TG_MAILBOX=info@example.com \
mail2tg init --non-interactive --json
```

## JSON output

```bash
mail2tg plan --json
mail2tg apply --json
mail2tg doctor --json
```

## Exit codes

- `0` success
- `2` validation/config error
- `3` external API error
- `4` partial/failed checks

## Recommended agent flow

1. Run `init --non-interactive`.
2. Run `plan --json` and inspect pending actions.
3. Run `apply --json`.
4. Run `doctor --json` and assert all checks are true.
