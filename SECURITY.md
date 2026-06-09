# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue.

- Preferred: open a [GitHub security advisory](https://github.com/bykclk/tally/security/advisories/new).
- Or email: **omerbuyukcelik@gmail.com**

Please include steps to reproduce and the affected version. You'll get an
acknowledgement as soon as possible, and a fix or mitigation will be coordinated
before any public disclosure.

## Scope & threat model

Tally is **fully offline and local-only**:

- All data lives in a local SQLite database on the device. There is **no
  server, no account, no network sync, and no bank connection** — so there is no
  remote attack surface or data-in-transit to compromise.
- The app does not collect analytics or telemetry.

Relevant areas for reports therefore include, for example:

- Local data exposure (e.g. data readable by other apps, insecure file
  permissions, leakage via backups/logs).
- Issues in third-party dependencies that affect the app.
- Anything that could corrupt or silently miscompute a user's financial figures.

## Supported versions

Only the **latest released version** on the App Store is supported with security
fixes.
