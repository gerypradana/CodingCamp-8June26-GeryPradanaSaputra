# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side, single-page Expense & Budget Visualizer using HTML, CSS, and vanilla JavaScript. The app records spending transactions, displays a running Rupiah total, shows a sortable/deletable transaction history, and renders a Chart.js 4.4.0 doughnut chart — all persisted in `localStorage`. The existing files (`index.html`, `Css/style.css`, `js/app.js`) already contain a working baseline; these tasks harden, complete, and verify every requirement.

---

## Tasks

- [x] 1. Utility functions — `formatRp` and `escapeHtml`
  - [x] 1.1 Implement `formatRp(amount)` in `js/app.js`
    - Apply `Math.floor` to truncate fractional amounts
    - Return `'Rp 0'` for negative, `NaN`, `Infinity`, or `-Infinity` inputs
    - Format the floored integer with `Number.toLocaleString('id-ID')` (period as thousands separator, no decimal places)
    - _Requirements: 6.1_

  - [ ]* 1.2 Write property tests for `formatRp`
    - Install `fast-check` as a dev dependency (e.g. `npm install --save-dev fast-check`) and set up a test runner (e.g. `jest` or `vitest`) capable of running `*.test.js` files
    - **Property 1: `formatRp` always returns a valid Rp string** — `∀ n ∈ [0, 999_999_999_999]` the result starts with `'Rp '`
    - **Property 2: `formatRp` truncates (floors) fractional amounts** — `formatRp(n) === formatRp(Math.floor(n))` for all finite `n ≥ 0`
    - **Property 3: `formatRp` returns `'Rp 0'` for non-positive or non-finite inputs** — covers `n < 0`, `NaN`, `±Infinity`
    - **Validates: Requirements 6.1**

  - [x] 1.3 Implement `escapeHtml(str)` in `js/app.js`
    - Replace `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#039;` (in that order)
    - Return the input unchanged for characters outside the five special characters
    - Return `''` for an empty-string input
    - _Requirements: 6.2_

  - [ ]* 1.4 Write property tests for `escapeHtml`
    - **Property 4: output contains no raw dangerous characters** — for any string input the output must not contain `&`, `<`, `>`, `"`, or `'` as raw characters
    - **Property 5: identity on safe strings** — strings that contain none of the five special characters are returned unchanged
    - **Property 6: empty-string identity** — `escapeHtml('') === ''`
    - **Validates: Requirements 6.2**

- [x] 2. Data persistence — `loadTransactions` and `saveTransactions`
  - [x] 2.1 Implement `loadTransactions()` and `saveTransactions()` in `js/app.js`
    - `loadTransactions`: reads `localStorage.getItem('budget_transactions')`, parses JSON, returns the array; returns `[]` for `null`, malformed JSON, or a non-array value
    - `saveTransactions`: calls `localStorage.setItem('budget_transactions', JSON.stringify(transactions))`; catches `QuotaExceededError` and any other `setItem` exception, retains the transaction in memory, and displays a visible save-error indication to the user
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write unit tests for `loadTransactions` and `saveTransactions`
    - Mock `localStorage` to simulate: `null` response, valid JSON array, malformed JSON string, valid JSON that is not an array
    - Mock `setItem` to throw a `QuotaExceededError` and assert the transaction stays in memory and an error indication appears
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 3. In-memory state and sort logic
  - [x] 3.1 Implement `getSortedTransactions()` in `js/app.js`
    - `'newest'`: return a shallow copy preserving insertion order (index 0 = most recent via `unshift`)
    - `'amount'`: sort descending by `tx.amount` (`b.amount - a.amount`)
    - `'category'`: sort by `a.category.localeCompare(b.category)`, then by `a.name.localeCompare(b.name)` within the same category
    - Must never mutate the source `transactions` array
    - _Requirements: 2.5, 2.6, 2.7_

  - [ ]* 3.2 Write property tests for `getSortedTransactions`
    - **Property 7: sort `amount` produces a non-increasing sequence** — `sorted[i].amount ≥ sorted[i+1].amount` for all adjacent pairs
    - **Property 8: sort `category` produces lexicographic order then name order within category**
    - **Property 9: any sort mode preserves all transactions (no loss, no duplication)** — `sorted.length === transactions.length` and every element appears exactly once
    - **Validates: Requirements 2.5, 2.6, 2.7**

- [x] 4. Checkpoint — utility and state core complete
  - Ensure all tests written so far pass. Ask the user if any questions arise before continuing.

- [x] 5. Input form — validation and transaction creation
  - [x] 5.1 Implement form validation (`validate`, `showError`, `clearErrors`) in `js/app.js`
    - `clearErrors` removes `invalid` from all three inputs and `visible` from all three error `<span>` elements at the top of each submit attempt
    - `validate` checks: name is non-empty after `.trim()`; amount parses to a finite number > 0; category is one of `Food`/`Transport`/`Fun`
    - `showError(input, msgEl)` adds `invalid` to the input and `visible` to the error element
    - Returns `false` (no transaction created) on any failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 5.2 Wire up the form submit handler in `js/app.js`
    - On valid submission: build `{ id: Date.now(), name: trim, amount: parseFloat, category }`, `unshift` into `transactions`, call `saveTransactions()`, call `render()`, then `form.reset()` and `clearErrors()`
    - _Requirements: 1.7, 1.8_

  - [ ]* 5.3 Write unit tests for the validator
    - Test each of the three validation failure paths (empty name, zero/negative/NaN amount, no category selected)
    - Test that a fully valid submission calls `unshift`, `saveTransactions`, and `render` and then resets the form
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 6. Rendering pipeline — balance, list, and sort controls
  - [x] 6.1 Implement `renderBalance()` in `js/app.js`
    - Sum all `tx.amount` values with `Array.reduce`
    - Write `formatRp(total)` into `totalBalance.textContent`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 6.2 Write property test for `renderBalance`
    - **Property 10: balance equals the sum of all transaction amounts** — for any `transactions[]`, `totalBalance.textContent === formatRp(transactions.reduce((s, tx) => s + tx.amount, 0))`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 6.3 Implement `renderList()` in `js/app.js`
    - Remove all existing `.transaction-item` elements from `listEl` before each re-render
    - Show `listEmpty` and return early when `transactions.length === 0`
    - Otherwise hide `listEmpty`, iterate `getSortedTransactions()`, and append one `div.transaction-item` per transaction using the HTML structure from the design (with `escapeHtml` on `tx.name` and `formatRp` on `tx.amount`)
    - Set `data-id` on both the item wrapper and the delete button
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [x] 6.4 Wire sort buttons and delete event delegation in `js/app.js`
    - For each `.sort-btn`: on click, set `currentSort = btn.dataset.sort`, toggle `active` class among all sort buttons, call `renderList()`
    - Event-delegate delete clicks on `listEl`: on click of `.btn-delete`, filter `transactions` by id, call `saveTransactions()`, call `render()`
    - Initialise with `currentSort = 'newest'` and `active` class on the Newest button
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 7. Chart integration
  - [x] 7.1 Implement `initChart()` in `js/app.js`
    - Create a Chart.js `'doughnut'` instance on `#spendingChart` with the configuration specified in the design: `cutout: '60%'`, `borderWidth: 0`, `hoverOffset: 8`, legend at `'bottom'`, custom tooltip callback using `formatRp`
    - Assign to the module-level `chart` variable
    - Call `initChart()` once on page load before `render()`
    - _Requirements: 4.1, 4.2, 4.6, 4.7_

  - [x] 7.2 Implement `renderChart()` in `js/app.js`
    - Compute per-category totals for `Food`, `Transport`, `Fun`
    - Filter to `activeCategories` where total > 0
    - When no active categories: zero out `chart.data.labels` and `chart.data.datasets[0].data`, call `chart.update()`, show `chartEmpty`
    - Otherwise: set parallel `labels`, `data`, `backgroundColor` arrays from `CATEGORY_CONFIG`, call `chart.update()`, hide `chartEmpty`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.3 Write property tests for `renderChart`
    - **Property 11: chart arrays are parallel and contain only non-zero categories** — after `renderChart()`, `labels.length === data.length === backgroundColor.length` and all data values are `> 0`
    - **Property 12: chart omits categories whose total is zero** — for each category with a zero sum, its label must not appear in `chart.data.labels`
    - **Validates: Requirements 4.1, 4.3, 4.4**

  - [ ]* 7.4 Write unit tests for `renderChart` empty-state handling
    - When `transactions` is empty: assert `chart.data.labels` is `[]`, `chart.data.datasets[0].data` is `[]`, `chartEmpty` is visible
    - When transactions exist for only one category: assert the other two categories are absent from labels
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 8. Page initialisation and full render wiring
  - [x] 8.1 Wire the startup sequence in `js/app.js`
    - On script load: call `loadTransactions()` to populate `transactions`, call `initChart()`, call `render()`
    - Ensure `render()` calls `renderBalance()`, `renderList()`, and `renderChart()` unconditionally in that sequence
    - _Requirements: 3.5, 5.3_

  - [ ]* 8.2 Write integration tests for the full add → render → delete cycle
    - Add a transaction and assert balance, list item count, and chart labels all update in the same `render()` call
    - Delete the last transaction and assert all three empty states (balance `Rp 0`, list empty message, chart empty message) appear simultaneously
    - Change sort mode and assert the list reorders without affecting balance or chart
    - Seed `localStorage` with a JSON array, reload state via `loadTransactions()`, and assert correct initial render of all three components
    - _Requirements: 2.4, 3.2, 3.3, 4.3, 4.4, 5.3_

- [x] 9. HTML structure validation
  - [x] 9.1 Verify `index.html` matches the design specification
    - Confirm the Chart.js CDN script tag uses exactly `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
    - Confirm `<link rel="stylesheet" href="Css/style.css">` is the only stylesheet reference and there are no inline `<style>` blocks
    - Confirm `<script src="js/app.js">` is the only application script tag
    - Confirm all required DOM IDs are present: `totalBalance`, `transactionForm`, `itemName`, `itemAmount`, `itemCategory`, `nameError`, `amountError`, `categoryError`, `spendingChart`, `chartEmpty`, `transactionList`, `listEmpty`, and the three sort buttons with correct `data-sort` values
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 10. CSS and responsive layout validation
  - [x] 10.1 Verify `Css/style.css` satisfies responsive and visual design requirements
    - Confirm `.app-main` has `max-width: 480px` and `margin: 0 auto`
    - Confirm `.balance-card` has `backdrop-filter: blur(...)`, `border-radius` ≥ 12 px, and a semi-transparent white background
    - Confirm `.list-wrapper` has `max-height: 320px` and `overflow-y: auto`
    - Confirm `@keyframes slideIn` animation is defined and applied to `.transaction-item`
    - Confirm category badge colour rules for `.badge.Food`, `.badge.Transport`, and `.badge.Fun` are present
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 11. Final checkpoint — all requirements covered
  - Ensure all non-optional tests pass. Review each requirement section (1–8) against the implemented code. Ask the user if any questions arise.

- [ ] 12. Monthly Summary View
  - [~] 12.1 Implement `getMonthlyTotals()` in `js/app.js`
    - Iterate `transactions`, derive `YYYY-MM` key from `new Date(tx.id)` using `getFullYear()` and `String(getMonth()+1).padStart(2,'0')`
    - Accumulate `tx.amount` into a map keyed by `YYYY-MM`; if the key is new, initialise with `{ key, label, total: 0 }` where `label` uses `new Date(year, monthIndex).toLocaleString('en-US', { month: 'long', year: 'numeric' })`
    - Return `Object.values(map).sort((a, b) => b.key.localeCompare(a.key))` (reverse-chronological)
    - Months whose last transaction has been deleted are automatically absent — no explicit filtering needed
    - _Requirements: 9.1, 9.2, 9.5, 9.6, 9.7_

  - [ ]* 12.2 Write property tests for `getMonthlyTotals`
    - **Property 13: monthly totals equal sum of transaction amounts per month** — for every `m` in `getMonthlyTotals()`, `m.total === sum of tx.amount for all tx where monthKey(tx.id) === m.key`
    - **Validates: Requirements 9.1, 9.5**

  - [ ]* 12.3 Write property tests for monthly sort order and absence of empty months
    - **Property 14: monthly summary is in reverse-chronological order** — for all adjacent pairs `months[i].key ≥ months[i+1].key` (lexicographic YYYY-MM comparison)
    - **Property 15: months with no transactions are absent from the summary** — every `m` in result has `m.total > 0`, and no key absent from `transactions` appears in the result
    - **Validates: Requirements 9.2, 9.4, 9.6**

  - [~] 12.4 Implement `renderMonthlySummary()` in `js/app.js`
    - Remove all existing `.summary-month-row` elements from `#monthlySummaryList`
    - Call `getMonthlyTotals()`; if the result is empty, show `#summaryEmpty` and return
    - Otherwise hide `#summaryEmpty`; for each `{ label, total }` append a `div.summary-month-row` containing `<span class="summary-month-label">[label]</span><span class="summary-month-total">[formatRp(total)]</span>` to `#monthlySummaryList`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [~] 12.5 Wire `renderMonthlySummary()` into `render()` in `js/app.js`
    - Add `renderMonthlySummary()` as the 4th unconditional call inside `render()`, after `renderBalance()`, `renderList()`, and `renderChart()`
    - _Requirements: 9.3_

  - [~] 12.6 Add Monthly Summary HTML to `index.html`
    - Add `<section class="card summary-card">` containing `<div id="monthlySummaryList"></div>` and `<p id="summaryEmpty">...</p>` to the main content area
    - _Requirements: 9.1, 9.4_

  - [~] 12.7 Add Monthly Summary styles to `Css/style.css`
    - Add rules for `.summary-card`, `.summary-month-row`, `.summary-month-label`, and `.summary-month-total`
    - _Requirements: 9.1_

- [ ] 13. Dark/Light Mode Toggle
  - [~] 13.1 Implement `applyTheme(theme)` in `js/app.js`
    - If `theme === 'dark'`: call `document.body.classList.add('dark-mode')`; else call `document.body.classList.remove('dark-mode')`
    - Set `themeToggleBtn.textContent` to `'☀️ Light Mode'` when dark, `'🌙 Dark Mode'` when light
    - Update `currentTheme = theme`
    - _Requirements: 10.2, 10.3, 10.6_

  - [~] 13.2 Implement `toggleTheme()` and init in `js/app.js`
    - `toggleTheme()`: compute `newTheme = currentTheme === 'dark' ? 'light' : 'dark'`, call `applyTheme(newTheme)`, then `localStorage.setItem('theme', newTheme)`
    - Init (inside `DOMContentLoaded`): read `localStorage.getItem('theme')`; if stored value is `'dark'` or `'light'` use it, otherwise default to `'light'`; call `applyTheme(theme)` before first `render()`; attach `toggleTheme` as click handler on `#themeToggle`
    - _Requirements: 10.2, 10.4, 10.5_

  - [ ]* 13.3 Write unit test for theme toggle involution
    - **Property 16: theme toggle is a strict involution (round-trip)** — `applyTheme(theme); toggleTheme()` → `currentTheme ≠ theme`; `applyTheme(theme); toggleTheme(); toggleTheme()` → `currentTheme === theme` and `body.classList.contains('dark-mode') === (theme === 'dark')`
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**

  - [~] 13.4 Add CSS custom properties for theming to `Css/style.css`
    - Declare on `:root`: `--color-bg: #f0f4ff`, `--color-surface: #ffffff`, `--color-text: #1e293b`, `--color-border: rgba(0,0,0,0.08)`, `--color-header-start: #1d6ff2`, `--color-header-end: #0ea5e9`
    - Override in `body.dark-mode`: `--color-bg: #0f1117`, `--color-surface: #1c1f2e`, `--color-text: #e2e8f0`, `--color-border: rgba(255,255,255,0.10)`, `--color-header-start: #0d1b3e`, `--color-header-end: #0d3060`
    - Update all card backgrounds, text colours, borders, and the header gradient to reference these variables (no inline JS style overrides)
    - _Requirements: 10.3, 10.7_

  - [~] 13.5 Add Theme Toggle button to `index.html`
    - Add `<button id="themeToggle" class="theme-toggle-btn">🌙 Dark Mode</button>` inside `<header class="app-header">`
    - _Requirements: 10.1, 10.6_

- [~] 14. Final checkpoint — Requirements 9 and 10 complete
  - Ensure all non-optional tests pass. Review Requirement 9 (Monthly Summary) and Requirement 10 (Dark/Light Mode) against the implemented code. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- All code is vanilla JavaScript — no transpiler, no framework, no build step
- Property-based tests use `fast-check`; the test runner (Jest or Vitest) must be installed as a dev dependency for test tasks to run
- Each task references specific requirements for full traceability
- Checkpoints (tasks 4, 11, 14) ensure incremental validation at natural breaks
- Properties 1–16 in the design's "Correctness Properties" section are each covered by a dedicated sub-task

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1", "7.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["5.3", "6.2", "6.3", "7.2"] },
    { "id": 5, "tasks": ["6.4", "7.3", "7.4"] },
    { "id": 6, "tasks": ["8.1"] },
    { "id": 7, "tasks": ["8.2", "12.1", "13.1", "13.4", "13.5"] },
    { "id": 8, "tasks": ["12.2", "12.3", "12.4", "13.2"] },
    { "id": 9, "tasks": ["12.5", "12.6", "12.7", "13.3"] }
  ]
}
```
