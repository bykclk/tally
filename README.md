# Tally

A simple, fully offline personal finance app for tracking monthly cash flow
and planning early loan payoff. It answers one question well: **how much will
be left in your pocket at the end of the month?** — and replaces a messy
spreadsheet.

Built with React Native (Expo). Turkish-first, with full English support.

## Features

- **Monthly view** — confirmed vs. estimated remaining, shown live as you
  enter and confirm income and expenses.
- **Fixed & variable entries** — utility bills (electricity, water, gas) whose
  amount and due day change each month are estimated from the average of the
  last three confirmed months.
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
no server, no account, no tracking, and no bank connection. See
[`PRIVACY.md`](./PRIVACY.md).

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

## Publishing

See [`PUBLISHING.md`](./PUBLISHING.md) for the App Store release checklist.
