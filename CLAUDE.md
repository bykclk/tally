# Project Context for Claude Code

## What this app is

A personal finance app for tracking monthly cash flow and planning early loan
payoff. Built by a solo developer in Turkey, primarily for personal use, with
the possibility of publishing later.

The developer currently does all this in a messy Excel sheet. The app replaces
that Excel sheet. The two real problems it solves:

1. **End-of-month projection** — "after all my payments, how much will I have
   left?" Excel shows a static number; this app calculates it live as payments
   are added/confirmed.
2. **Early loan payoff simulation** — "if I pay extra each month, how much
   interest and time do I save?" Excel cannot do this at all.

This is NOT a budgeting app, NOT a bank-connected app, NOT a financial advisor.
It does calculations on data the user enters manually. No financial advice is
ever given — only math on user-provided numbers.

## Market / language

- Turkish market, Turkish language, Turkish Lira (₺)
- Turkish reality: utility bills (electricity, water, gas, internet, telecom)
  are NOT fixed — amount and due date change every month based on usage. This
  is a core design constraint, not an edge case.

## Stack (do not deviate without asking)

- React Native with Expo SDK 54 (managed workflow, new architecture enabled)
- Expo Router 4 (file-based routing, typed routes)
- TypeScript with strict mode
- Local SQLite via @op-engineering/op-sqlite (offline-first, source of truth)
- Zustand for state, TanStack Query if async needed
- StyleSheet API for styling — NOT Tailwind, NOT NativeWind
- Chart.js equivalent for RN: use react-native-svg + custom charts, or
  victory-native. Ask before adding a charting library.
- date-fns for dates

## Architecture principles (non-negotiable)

1. **Local-first, fully offline.** SQLite is the source of truth. No backend,
   no cloud, no bank integration in MVP.
2. **No financial advice.** The app computes outcomes from user input. It never
   recommends ("pay off this loan"); it only shows math ("if you pay X extra,
   you save Y").
3. **Interest math is an estimate.** Show a small disclaimer that real bank
   figures may differ slightly.
4. **Turkish-first.** All UI text in Turkish, ₺ currency formatting, Turkish
   date format (DD/MM/YYYY).

## Core data model

Everything is a "kayit" (entry/record) with two flags that create 4 combinations:

- **direction**: 'income' | 'expense'
- **kind**: 'fixed' | 'variable'

The 4 combinations:
- fixed + income → salary (same amount, same date each month)
- variable + income → side income, bonus (amount/date varies)
- fixed + expense → rent, dues (aidat) (same amount, same date)
- variable + expense → utility bills (electricity, water, gas, internet) —
  amount and date vary monthly

Plus a separate concept:
- **loan** (kredi): remaining balance, interest rate, monthly payment →
  feeds the payoff simulator. Not a monthly "entry" — a standalone object.

### Template vs instance pattern (important)

A recurring entry has two layers:
- **template**: the definition ("Electricity bill, ~monthly, around day 18,
  estimated ~480₺"). Created once.
- **monthly instance**: the actual realization for a given month
  ("June electricity = 445₺, due 18 June, confirmed"). Filled each month,
  either by user input (real/confirmed) or by estimate (until user enters real).

For fixed entries, estimate = actual (always same). For variable entries,
estimate = average of last 3 confirmed months (if <3 months data, user enters
estimate manually or it stays blank).

### Estimate calculation

Variable entry estimate = average of the last 3 confirmed monthly instances.
If fewer than 3 confirmed months exist, prompt user to enter an estimate
manually, or leave blank.

## MVP scope — BUILD THESE

1. **Entry types**: create/edit fixed income, variable income, fixed expense,
   variable expense. Fields: name, amount, date (day of month), direction,
   kind, optional category.
2. **Loan type**: create/edit a loan with remaining balance, monthly interest
   rate, monthly payment.
3. **Monthly view (home screen)**:
   - Two figures side by side: "kesin kalan" (confirmed remaining = income −
     confirmed expenses) and "tahmini kalan" (estimated remaining = income −
     confirmed − estimated pending). Confirmed figure bold, estimate muted.
   - Payment list sorted by date, split into two sections:
     "Kesinleşti" (confirmed) and "Bekleniyor (tahmini)" (pending estimates,
     shown muted/faded).
   - Income entries shown too (positive).
   - Add entry button.
   - Month switcher (previous/next month).
4. **Bill entry flow**: tap a pending (estimated) bill → enter real amount +
   date → it becomes confirmed (moves to top section). Estimate auto-calculated
   from last 3 months average.
5. **Loan payoff simulator (separate screen)**:
   - Tap a loan → show balance, interest, monthly payment.
   - "Aylık ek ödeme" (monthly extra payment) slider.
   - Live recalculation: months to payoff, months saved vs no extra payment,
     total interest saved, comparison chart (normal vs with-extra payoff curve).
6. **Local SQLite, offline. Turkish UI, ₺ formatting.**

## MVP scope — DO NOT BUILD (later versions)

- Reminder notifications (bill due alerts)
- Multi-month trend charts (consumption history over time)
- Spouse sharing / cloud sync
- Budget goals / spending limits
- Category-based analytics
- Bank integration (NEVER)
- Multi-currency
- Data export

## Coding conventions

- TypeScript everywhere, strict mode, no `any` without a comment why
- Function components only, no class components
- Named exports except screens (Expo Router needs default export)
- StyleSheet.create(), no inline styles for reusable things
- All displayed numbers formatted as Turkish Lira: use Intl.NumberFormat
  ('tr-TR', { style: 'currency', currency: 'TRY' }) or similar. Always round.
- Dates: DD/MM/YYYY format, date-fns with Turkish locale
- One component per file
- Folder structure: app/ for routes, src/db, src/ui, src/stores, src/lib, src/types

## Things to confirm before doing

- Adding any new dependency (state the size + purpose)
- Changing stack decisions (no Tailwind, no different DB)
- Adding features from the "DO NOT BUILD" list
- Any feature that implies financial advice

## Things to just do

- Build screens matching the MVP scope
- Add DB queries, components, types
- Fix bugs, type errors, typos
- Add JSDoc comments

## Notes on the developer

- Solo, ~1-2 hours/day, intermittent
- Strong on backend/data/security, newer to mobile
- Has built a React Native app before (knows Expo + SQLite basics)
- Prefers Turkish for high-level explanation, English for code/comments
- Tendency to expand scope — HELP KEEP SCOPE SMALL. If asked to add something
  outside MVP, gently note it could be a later version and confirm before building.
- Wants to FINISH and use this app, not perfect it. Shipping beats polishing.
