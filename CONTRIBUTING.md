# Contributing to Tally

Thanks for your interest! Tally is a small, deliberately-focused personal
finance app. Before opening a PR, please read the scope rules below — they're
what keep the app simple.

## What Tally is (and isn't)

Tally solves two problems well:

1. **End-of-month projection** — "after all my payments, how much is left?"
2. **Early loan-payoff simulation** — "if I pay extra, how much interest/time do
   I save?"

It is **not** a budgeting app, **not** bank-connected, and **never** a financial
advisor. It only does math on numbers the user types in.

Please keep these principles in any contribution:

- **Local-first, fully offline.** SQLite is the source of truth. No backend, no
  cloud, no bank integration, no tracking.
- **No financial advice.** Show outcomes ("if you pay X you save Y"), never
  recommendations ("pay off this loan"). Interest figures are estimates.
- **Turkish-first.** All UI strings live in `src/locales/{tr,en}.ts`; ₺ currency
  and `DD/MM/YYYY` dates. Turkish utility bills vary in amount and due date every
  month — that's a core design constraint, not an edge case.
- **Small scope.** New top-level features are likely out of scope — please open
  an issue to discuss before building one. Bug fixes, polish, accessibility, and
  translations are always welcome.

## Development setup

```bash
npm install

# @op-engineering/op-sqlite is a native module, so a development build is
# required — Expo Go will not work.
npx expo run:ios      # or: npx expo run:android
```

## Before you push

```bash
npm run typecheck     # tsc --noEmit, must be clean
npm run lint          # expo lint
```

Both run in CI on every pull request.

## Conventions

- **TypeScript, strict mode.** No `any` without a comment explaining why.
- **Function components only.** One component per file.
- **Named exports**, except screens (Expo Router needs a default export).
- **`StyleSheet.create()`** — no inline styles for anything reusable.
- **Money** is always formatted via the shared helpers (`Intl.NumberFormat`
  under the hood) and rounded — never hand-format currency.
- **Strings** never hardcoded in components; add a key to both `tr.ts` and
  `en.ts`.
- **Folder layout:** `app/` routes, `src/db`, `src/ui`, `src/stores`, `src/lib`,
  `src/types`.

## Commits & PRs

- Keep commits focused; write a clear imperative subject line.
- Describe what changed and why in the PR; note anything user-facing so it can
  be added to `CHANGELOG.md` under **[Unreleased]**.
- Make sure `typecheck` and `lint` pass.

## Reporting bugs / ideas

Open an issue. For security-sensitive reports, see [`SECURITY.md`](./SECURITY.md)
instead of a public issue.
