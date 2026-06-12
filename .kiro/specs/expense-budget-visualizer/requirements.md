# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly web application that helps users track their daily spending. It displays a running total of all spending, a chronological history of individual transactions, and a doughnut chart that breaks spending down by category. The app is built as a single-page HTML/CSS/JavaScript web page that requires no server, no build step, and no external frameworks. All data is stored in the browser's Local Storage so transactions persist across page reloads.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single spending record consisting of an item name, a positive monetary amount, and a category.
- **Category**: One of three fixed spending categories: `Food`, `Transport`, or `Fun`.
- **Transaction List**: The on-screen scrollable list that displays all stored transactions.
- **Balance Display**: The "Total Spent" figure shown in the page header, equal to the sum of all transaction amounts.
- **Chart**: The Chart.js doughnut chart that shows the monetary distribution of spending across categories.
- **Local Storage**: The browser's `localStorage` API used as the sole persistence layer.
- **Sort Mode**: The currently active ordering rule applied to the Transaction List — one of `Newest`, `Amount`, or `Category`.
- **Validator**: The client-side form validation logic that checks all fields before a transaction is created.
- **Formatter**: The utility that converts a numeric amount into an Indonesian Rupiah string (e.g., `Rp 20.000`).
- **Sanitizer**: The utility that escapes HTML special characters before injecting user-supplied text into the DOM.
- **Monthly Summary**: An aggregated view of all Transaction amounts grouped and totalled by calendar month (year + month pair), displayed in reverse-chronological order.
- **Theme**: The active colour scheme applied to the App's UI — either `light` or `dark`.
- **Theme Toggle**: The UI control that switches the active Theme between `light` and `dark`.

---

## Requirements

### Requirement 1: Input Form

**User Story:** As a user, I want to fill in an item name, amount, and category so that I can record a new spending transaction.

#### Acceptance Criteria

1. THE App SHALL render a form containing a text input for item name, a number input for amount, and a dropdown select for category.
2. THE App SHALL present exactly three category options in the dropdown: `Food`, `Transport`, and `Fun`, preceded by a non-selectable placeholder option.
3. WHEN the form is submitted, THE Validator SHALL check that the item name field contains at least one non-whitespace character.
4. WHEN the form is submitted, THE Validator SHALL check that the amount field contains a finite number greater than zero.
5. WHEN the form is submitted, THE Validator SHALL check that a category option other than the placeholder has been selected.
6. IF any validation check fails, THEN THE Validator SHALL add the `invalid` CSS class to the corresponding input element and set the `visible` CSS class on the inline error message element immediately below that field; no Transaction shall be created.
7. IF all validation checks pass, THEN THE App SHALL create a new Transaction object with a unique numeric `id` (timestamp), the trimmed item name string, the parsed float amount, and the selected category string, and SHALL prepend it to the in-memory transaction array.
8. WHEN a Transaction is successfully added, THE App SHALL call `form.reset()` to clear all form fields to their default empty state and SHALL remove the `invalid` and `visible` CSS classes from all fields and error elements.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render the Transaction List inside a container with `overflow-y: auto` and a fixed `max-height` of `320px`, so that a scrollbar appears when the total height of list items exceeds `320px`.
2. WHEN the Transaction List is rendered, THE App SHALL display each Transaction as a list item showing: the sanitised item name, a category badge with the category name as both its CSS class and visible text, the amount formatted by the Formatter, and a Delete button with a `data-id` attribute equal to the Transaction's `id`.
3. WHEN the Transaction List is empty, THE App SHALL show the empty-state paragraph element and hide all transaction item elements.
4. WHEN the user clicks the Delete button on a list item, THE App SHALL remove the Transaction whose `id` matches the button's `data-id` from the in-memory array, persist the updated array to Local Storage, and synchronously re-render the Transaction List, Balance Display, and Chart.
5. WHEN the user clicks the "Newest" sort button, THE App SHALL re-render the Transaction List in the original insertion order (index 0 = most recently added), because new transactions are prepended via `unshift`.
6. WHEN the user clicks the "Amount" sort button, THE App SHALL re-render the Transaction List sorted by `amount` descending (highest first); transactions with equal amounts may appear in any order relative to each other.
7. WHEN the user clicks the "Category" sort button, THE App SHALL re-render the Transaction List sorted first by `category` ascending (A–Z) and then, within the same category, by `name` ascending (A–Z, case-sensitive Unicode order).
8. THE App SHALL add the `active` CSS class to the Sort button whose `data-sort` value matches the current Sort Mode, and SHALL remove the `active` CSS class from all other Sort buttons.
9. WHEN the App initialises, THE default Sort Mode SHALL be `newest` and the "Newest" sort button SHALL carry the `active` CSS class.

---

### Requirement 3: Balance Display

**User Story:** As a user, I want to see my total spending at a glance so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance Display SHALL show the result of passing the sum of all Transaction `amount` values through THE Formatter, producing a string of the form `Rp <number>` with the `id-ID` locale thousands separator.
2. WHEN a Transaction is added, THE Balance Display SHALL synchronously update its text content to reflect the new total, without a page reload.
3. WHEN a Transaction is deleted, THE Balance Display SHALL synchronously update its text content to reflect the new total, without a page reload.
4. WHEN no Transactions exist, THE Balance Display SHALL show `Rp 0` as produced by THE Formatter.
5. WHEN the App initialises and Local Storage contains previously saved transactions, THE Balance Display SHALL immediately render the correct total of those restored transactions before any user interaction.

---

### Requirement 4: Visual Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a doughnut Chart using the Chart.js library loaded from a CDN, with one segment per Category whose summed Transaction amounts are greater than zero; categories with a total of zero SHALL be omitted from the Chart.
2. THE Chart SHALL assign a fixed, distinct colour to each category: `#f49a13ff` for Food, `#1d6ff2` for Transport, and `#0bfe13ff` for Fun.
3. WHEN a Transaction is added or deleted, THE Chart SHALL call `chart.update()` after setting its `data.labels`, `data.datasets[0].data`, and `data.datasets[0].backgroundColor` arrays to reflect only the categories with a total amount greater than zero at that moment; categories whose total has dropped to zero SHALL be removed from all three arrays.
4. WHEN all Transactions are deleted, THE Chart SHALL set its data arrays to empty, call `chart.update()`, and display the empty-state message element while the canvas remains in the DOM.
5. WHEN at least one Transaction exists, THE Chart canvas SHALL be visible and the empty-state message SHALL be hidden.
6. THE Chart SHALL display a legend positioned below the doughnut that labels each currently visible (non-zero) category segment.
7. WHEN the user hovers over a Chart segment, THE Chart SHALL display a tooltip showing the total amount for that category as `Rp <number>` with a period as the thousands separator and no decimal places (e.g., `Rp 20.000`).

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved automatically so that my data is still available after I close or refresh the browser tab.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL call `localStorage.setItem('budget_transactions', JSON.stringify(transactions))` to persist the full updated array.
2. WHEN a Transaction is deleted, THE App SHALL call `localStorage.setItem('budget_transactions', JSON.stringify(transactions))` to persist the full updated array.
3. WHEN the App initialises, THE App SHALL read `localStorage.getItem('budget_transactions')`, parse the result as JSON, and use the resulting array to populate the in-memory transaction list and re-render the Transaction List, Balance Display, and Chart.
4. IF the value returned by `localStorage.getItem('budget_transactions')` cannot be parsed as a valid JSON array (including `null`, malformed JSON, or valid JSON that is not an array), THEN THE App SHALL silently initialise with an empty transaction array instead of throwing an error.
5. IF a call to `localStorage.setItem` throws an exception (e.g. storage quota exceeded), THEN THE App SHALL retain the transaction in the in-memory array and display a visible error indication to the user informing them that the save failed.

---

### Requirement 6: Output Formatting and Security

**User Story:** As a user, I want amounts displayed in a readable local currency format and my data handled safely so that the app is easy to read and free from injection issues.

#### Acceptance Criteria

1. THE Formatter SHALL accept a numeric amount in the range 0–999,999,999,999, truncate any fractional part by applying `Math.floor`, and return a string of the form `Rp <integer>` where `<integer>` is formatted using `Number.toLocaleString('id-ID')` (period as thousands separator, no decimal places); if the input is negative or non-finite, THE Formatter SHALL return `Rp 0`.
2. THE Sanitizer SHALL replace every occurrence of `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;`, and `'` with `&#039;` in the input string; characters outside this set SHALL be passed through unchanged; an empty string input SHALL return an empty string.

---

### Requirement 7: Technical Constraints

**User Story:** As a developer, I want the app to meet the defined technical constraints so that it remains simple, portable, and maintainable.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and vanilla JavaScript with no front-end frameworks, transpilers, or build tools.
2. THE App SHALL load Chart.js exclusively from the CDN URL `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`; no other Chart.js script tag or local copy shall be present.
3. THE App SHALL store all application state client-side using the browser `localStorage` API; no XHR, Fetch, or WebSocket calls to any backend server shall be made.
4. THE App SHALL render its UI and respond correctly to add and delete interactions in Chrome ≥ 109, Firefox ≥ 109, Edge ≥ 109, and Safari ≥ 16, meaning no JavaScript runtime error is thrown and the DOM updates as specified in Requirements 1–5.
5. THE App SHALL load all styles from exactly one CSS file located at `Css/style.css`; no inline `<style>` blocks or additional external stylesheets shall be present.
6. THE App SHALL load all application JavaScript logic from exactly one file located at `js/app.js`; the Chart.js CDN `<script>` tag is exempt from this constraint.

---

### Requirement 8: Responsive and Visual Design

**User Story:** As a mobile user, I want the app to look and work well on my phone so that I can track spending on the go.

#### Acceptance Criteria

1. THE App SHALL apply `max-width: 480px` and `margin: 0 auto` to the main content container so that it is centred horizontally and never wider than 480 px on any viewport.
2. ON viewports with a width of 480 px or less, THE App SHALL stack the header, form card, chart card, and transaction list card in a single column with no horizontal side-by-side layout.
3. THE Balance Display card SHALL be rendered inside the page header with a background that differs visually from the header gradient (semi-transparent white overlay), border-radius of at least 12 px, and a backdrop-filter blur effect, so that it reads as a distinct floating card.
4. WHILE the Transaction List container holds items whose combined height exceeds its `max-height` of `320px`, the container SHALL scroll internally via `overflow-y: auto` so that the page itself does not scroll to reveal those items.

---

### Requirement 9: Monthly Summary View

**User Story:** As a user, I want to see my spending grouped and summarised by calendar month so that I can review my historical spending trends over time.

#### Acceptance Criteria

1. THE App SHALL render a Monthly Summary section that groups all Transactions by their calendar month (year and month derived from the Transaction `id` timestamp) and displays the total amount spent in each month, formatted by the Formatter.
2. THE Monthly Summary SHALL list each month's entry in reverse-chronological order (most recent month first).
3. WHEN a Transaction is added or deleted, THE Monthly Summary SHALL synchronously re-render to reflect the updated per-month totals, without a page reload.
4. WHEN no Transactions exist, THE Monthly Summary SHALL display an empty-state message and SHALL NOT render any month rows.
5. WHEN a month has exactly one Transaction, THE Monthly Summary SHALL display that month's total as the amount of that single Transaction formatted by the Formatter.
6. WHEN all Transactions belonging to a particular month are deleted, THE Monthly Summary SHALL remove that month's row from the display so that only months with at least one Transaction remain visible.
7. THE Monthly Summary SHALL display each month label in a human-readable format showing the full month name and four-digit year (e.g., `January 2025`), derived from the Transaction `id` timestamp using the browser's `Date` API with the `en-US` locale.

---

### Requirement 10: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and light colour theme so that I can use the app comfortably in different lighting conditions, and I want my chosen theme to persist across page reloads.

#### Acceptance Criteria

1. THE App SHALL render a Theme Toggle control (a button or checkbox) that is always visible in the page header, allowing the user to switch between `light` and `dark` Themes at any time.
2. WHEN the user activates the Theme Toggle, THE App SHALL switch the active Theme to the opposite value: from `light` to `dark`, or from `dark` to `light`.
3. WHEN the active Theme is `dark`, THE App SHALL add the `dark-mode` CSS class to the `<body>` element; WHEN the active Theme is `light`, THE App SHALL remove the `dark-mode` CSS class from the `<body>` element.
4. WHEN the user activates the Theme Toggle, THE App SHALL call `localStorage.setItem('theme', <value>)` where `<value>` is either `'dark'` or `'light'`, to persist the chosen Theme.
5. WHEN the App initialises, THE App SHALL read `localStorage.getItem('theme')` and apply the stored Theme immediately before the first render; IF the stored value is absent or is neither `'dark'` nor `'light'`, THE App SHALL default to the `light` Theme.
6. THE App SHALL update the visible label or icon of the Theme Toggle to reflect the currently active Theme (e.g., showing a moon icon or "Dark Mode" label when `light` is active, and a sun icon or "Light Mode" label when `dark` is active).
7. THE `dark-mode` CSS class SHALL redefine colour custom properties (CSS variables) for background, surface, text, and border colours so that all cards, the header, the Transaction List, and the form render legibly in the dark colour scheme without any inline style overrides in JavaScript.
