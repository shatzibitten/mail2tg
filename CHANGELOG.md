# Changelog

## 0.1.1 - 2026-03-16

- Fixed Worker secret API calls (added required `type: "secret_text"` field).
- Fixed worker template path resolution for global npm installs.
- Fixed `npx` invocation on Windows (`npx.cmd`).
- Improved error handling: corrupted state recovery, human-readable config/env errors.
- Merged rich email formatting from production worker (emoji headers, attachment sizes, body chunking).
- Comprehensive documentation: domain setup, Cloudflare token creation, FAQ, Windows support.

## 0.1.0 - 2026-03-10

- Initial public release.
- Added CLI commands: `init`, `plan`, `apply`, `doctor`.
- Added Cloudflare provider for DNS and Email Routing rules.
- Added Telegram provider for bot verification and chat resolution.
- Added Worker deployment flow and secret provisioning.
- Added JSON and non-interactive modes for agent environments.
