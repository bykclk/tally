# Changelog

All notable changes to Tally are recorded here. The format loosely follows
[Keep a Changelog](https://keepachangelog.com); version numbers map to git tags.

When a feature ships, move it from **Unreleased** into a version section and
tag the release.

> Before publishing a version: set `app.json` → `version`, run `eas build` and
> `eas submit`, then tag the release commit (`git tag vX.Y.Z`).

---

## [Unreleased]

### Added
- **Swipe between months on the home screen** — swipe left for the next month,
  right for the previous one (the ‹ › buttons stay for discoverability and
  accessibility). A horizontal pan that cancels an in-progress row tap, so
  dragging across a list row no longer accidentally opens it.
- **Animated headline figures** — the confirmed/estimated remaining numbers
  count up or down to their new value (on month change, confirmation, etc.)
  instead of snapping.
- **Pull-to-refresh** on the home screen.
- **Undo toast on bill confirmation** — saving a bill (new or edited) shows a
  brief toast with a one-tap "Undo" that restores the month's previous state
  (or clears it if there was none), backed by a small global toast + refresh
  signal reused elsewhere.

### Changed
- **Faster bill confirmation** — the confirm sheet now has a large, thumb-reach
  primary "Save as paid" button just above the keyboard. Combined with the
  amount already arriving pre-filled (the variable-bill estimate) and the number
  pad auto-opening, confirming a bill is usually a single tap. (Removed the small
  top-right Save in favour of the one clear button.)

## [1.1.1] — 2026-06-08

### Fixed
- **Installment loan "remaining" no longer corrupts on edit.** Editing an
  installment loan after recording some payments used to reset its remaining
  balance to the full total (wiping the recorded payments); the remaining is now
  derived as `(installments − payments made) × amount`. Also removed the
  "paid installments" quick-setup field that was feeding the bug.

### Infrastructure
- Aligned Expo SDK 56 patch versions (expo-doctor green).

## [1.1.0] — 2026-06-02

### Changed
- **Polish pass** — empty states (home, loans, forecast) now show an icon;
  tapping a list row (home entries, loan rows) gives light haptic feedback for
  consistency with the rest of the app; and an accessibility sweep adds
  `accessibilityRole="button"` to tappable rows/cards, segmented-control
  options (with selected state), modal Save/Cancel and body links, while the
  loan extra-payment slider is now VoiceOver-adjustable (role, value, and
  increment/decrement actions).

### Added
- **Due / overdue flags on the home screen** — pending items whose date has
  arrived show a "Due today" badge (accent) and those whose date has passed
  show an "Overdue" badge (red) with a red day chip; the "Pending" section
  header shows how many are overdue. Purely visual — figures are unchanged and
  tapping a row still opens the confirm flow. (Notifications stay separate.)
- **Forecast tab** — projects the end-of-month remaining balance forward as a
  smoothed balance-trajectory area/line chart: gradient fill, the sub-zero
  region of the fill and line turn red with a dashed zero reference line, and
  the lowest month is emphasised. Includes a hero summary (projected end month
  + lowest month), a 3/6/12-month horizon selector, a warning banner when a
  month dips into the red (tap to jump there), and a month-by-month list where
  each row shows its net change and ending balance. Tapping a point on the chart
  shows a floating tooltip with that month's income/expense/projected breakdown.
  Each month's projected remaining rolls into the next month's starting balance;
  tapping a month jumps to it on the home tab.
- One-time income/expense entries (doctor visit, gift, unexpected purchase) so
  the "remaining at month end" figure stays correct.
- Settings → "Reset all data".
- Locale-aware money **input** (TR `1.250,50` / EN `1,250.50`), consistent with
  how amounts are displayed.
- Confirm modal now has a **Pending / Paid** status toggle.

### Changed
- A pending payment's expected amount and day can now be edited while keeping it
  pending — previously editing forced the payment to "paid". Choosing "Paid"
  still confirms it as before.
- Renamed the old "Undo confirmation" action to "Reset this month" (clears the
  month's value and falls back to the template estimate).
- UI polish across the Home, Loans and Settings tabs.

### Infrastructure
- Info.plist encryption exemption (`ITSAppUsesNonExemptEncryption: false`).
- App Store support page (GitHub Pages).

---

## [1.0.0] — first App Store release

- Monthly view: confirmed/estimated remaining, confirmed/pending sections,
  month switcher.
- Fixed/variable income and expense; variable bills estimated from the last 3
  confirmed months.
- Bill entry flow (pending → confirmed) with undo.
- Loans: open loan + early-payoff simulator; installment loan + payment
  tracking.
- Monthly starting balance with automatic rollover, so remaining figures are
  absolute.
- Local payment-reminder notifications.
- Multi-month trend chart and category breakdown.
- Onboarding, About screen, error boundary.
- Language (TR/EN), theme (light/dark/system), currency (₺/$/€/£),
  locale-aware money formatting.
- Branding: app icon + splash (light/dark), iPhone-only, EAS build config.

---

## Backlog (candidates, not committed)

- **Credit-card breakdown** — a "credit card" container that holds its
  individual purchases, so a high balance becomes legible ("what did I buy?").
  Each purchase is either an *installment* (reuses the existing installment-loan
  engine) or a *one-off* charge; the card's balance rolls up from the remaining
  purchase amounts and its monthly total feeds the month view. The reporting
  user's debt is mostly installments **plus a lot of one-off charges**, so both
  purchase kinds are required. Keep it math-only — no spend categories/analytics
  and no bank sync — so it stays a cash-flow aid, not a budgeting/expense
  tracker (which CLAUDE.md rules out). Likely a new `credit_cards` table + a
  `card_id` on purchase rows, a card detail screen listing purchases, and a
  rollup into the loans/month views. Sizeable: data model + migration + screens.
- **iCloud sync** — multi-device (iPhone + iPad). Architectural work; doesn't
  break the "no own server" principle (uses Apple iCloud).
- **Home-screen widget** — "remaining this month" at a glance (WidgetKit).
- **Siri / Shortcuts** — "how much is left this month?"
- **Savings goals** — "save X by this date" + simulation (extends the planning
  identity).
- **Multi-month category trend** — how the breakdown moves over months.

## Out of scope

- **Bank integration** — ❌ NEVER (CLAUDE.md). Off the table for
  security/privacy reasons.
- **In-app backup / restore** — iOS already includes app data in the device
  iCloud backup (the op-sqlite DB lives under Documents), so data survives a
  device migration/restore. A separate export/restore is a power-user /
  portability nicety, not essential. May be revisited for users who disable
  device backups.
- **Budget goals / spending limits** — turns the app into a budgeting tool;
  needs careful thought.
- **Multi-currency *math*** (FX conversion) — requires an online rate source,
  breaks offline-first. (Today only the display symbol changes; no conversion.)
- **Data export (CSV/analysis)** — distinct from backup; "reporting" is a
  separate decision.
