# Tally

A simple, fully offline personal finance app for tracking monthly cash flow
and planning early loan payoff. It answers one question well: **how much will
be left in your pocket at the end of the month?** — and replaces a messy
spreadsheet.

Built with React Native (Expo). Turkish-first, with full English support.

[![CI](https://github.com/bykclk/tally/actions/workflows/ci.yml/badge.svg)](https://github.com/bykclk/tally/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Features

- **Monthly view** — confirmed vs. estimated remaining, shown live as you
  enter and confirm income and expenses.
- **Fixed & variable entries** — utility bills (electricity, water, gas) whose
  amount and due day change each month are estimated from the average of the
  last three confirmed months.
- **One-time entries** — a doctor visit, a gift, an unexpected purchase that
  belongs only to the month it happens, so month-end remaining stays accurate.
- **Loans** — both open-ended loans (with an early-payoff simulator showing
  interest and time saved) and fixed-installment loans (with payment
  tracking).
- **Payment reminders** — local notifications a few days before each due date.
- **Insights** — multi-month trend per entry and a by-category spending
  breakdown.
- **Starting balance** — per-month, with automatic rollover, so the remaining
  figures are absolute amounts, not deltas.
- Light/dark theme, TR/EN language, ₺/$/€/£ currency.

## Privacy

All data is stored **only on the device** in a local SQLite database. There is
no server, no account, no tracking, and no bank connection. See the
[privacy policy](https://bykclk.github.io/tally/privacy)
([source](./docs/privacy.md)).

> Tally gives no financial advice. It only does math on the numbers you enter.
> Interest and early-payoff figures are estimates.

## Tech stack

- React Native + Expo (managed workflow, new architecture)
- Expo Router (file-based routing, typed routes)
- TypeScript (strict)
- Local SQLite via `@op-engineering/op-sqlite` (source of truth, offline-first)
- Zustand for state, `react-native-svg` for charts, `date-fns` for dates

## Getting started

```bash
npm install

# op-sqlite is a native module — a development build is required (not Expo Go).
npx expo run:ios     # or: npx expo run:android
```

## Contributing

Contributions are welcome — especially bug fixes, polish, accessibility, and
translations. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first; it covers
the dev setup and the scope rules that keep Tally small and focused. For security
issues, see [`SECURITY.md`](./SECURITY.md).

## Project docs

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — dev setup, conventions, scope rules
- [`SECURITY.md`](./SECURITY.md) — how to report a vulnerability
- [`PUBLISHING.md`](./PUBLISHING.md) — App Store release checklist
- [`CHANGELOG.md`](./CHANGELOG.md) — version history, backlog and out-of-scope notes
- [`docs/privacy.md`](./docs/privacy.md) — privacy policy (also at the URL above)

## License

[MIT](./LICENSE) © 2026 Ömer Büyükçelik
