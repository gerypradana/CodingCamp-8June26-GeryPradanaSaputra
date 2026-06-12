const STORAGE_KEY = 'budget_transactions';
const THEME_KEY   = 'budget_theme';

const CATEGORY_CONFIG = {
  Food:      { color: '#f49a13ff' },
  Transport: { color: '#1d6ff2' },
  Fun:       { color: '#0bfe13ff' },
};

// State  
let transactions = loadTransactions();
let chart = null;
let currentSort = 'newest'; // 'newest' | 'amount' | 'category'

// Monthly Summary state
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-indexed

// DOM refs 
const form          = document.getElementById('transactionForm');
const nameInput     = document.getElementById('itemName');
const amountInput   = document.getElementById('itemAmount');
const categoryInput = document.getElementById('itemCategory');
const nameError     = document.getElementById('nameError');
const amountError   = document.getElementById('amountError');
const categoryError = document.getElementById('categoryError');
const totalBalance  = document.getElementById('totalBalance');
const listEl        = document.getElementById('transactionList');
const listEmpty     = document.getElementById('listEmpty');
const chartEmpty    = document.getElementById('chartEmpty');

// Theme toggle DOM refs
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon      = themeToggleBtn.querySelector('.theme-icon');

// Monthly Summary DOM refs
const prevMonthBtn     = document.getElementById('prevMonth');
const nextMonthBtn     = document.getElementById('nextMonth');
const monthLabelEl     = document.getElementById('monthLabel');
const monthlyEmptyEl   = document.getElementById('monthlyEmpty');
const monthlyStatsEl   = document.getElementById('monthlyStats');
const monthlyTotalEl   = document.getElementById('monthlyTotal');
const monthlyBreakdownEl = document.getElementById('monthlyBreakdown');

// Sort buttons
const sortBtns = document.querySelectorAll('.sort-btn');
sortBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    sortBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  });
});

// Theme toggle
initTheme();
themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
});

// Month navigation
prevMonthBtn.addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderMonthlySummary();
});
nextMonthBtn.addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderMonthlySummary();
});

// Init 
initChart();
render();

// Form submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) return;

  const tx = {
    id:       Date.now(),
    name:     nameInput.value.trim(),
    amount:   parseFloat(amountInput.value),
    category: categoryInput.value,
  };

  transactions.unshift(tx);   
  saveTransactions();
  render();

  form.reset();
  clearErrors();
});

// Validasi
function validate() {
  let valid = true;

  clearErrors();

  // Req 1.3: name must contain at least one non-whitespace character
  if (!nameInput.value.trim()) {
    showError(nameInput, nameError);
    valid = false;
  }

  // Req 1.4: amount must parse to a finite number greater than zero
  const amt = parseFloat(amountInput.value);
  if (!Number.isFinite(amt) || amt <= 0) {
    showError(amountInput, amountError);
    valid = false;
  }

  // Req 1.5: category must be one of the three valid options
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!VALID_CATEGORIES.includes(categoryInput.value)) {
    showError(categoryInput, categoryError);
    valid = false;
  }

  return valid;
}

function showError(input, msgEl) {
  input.classList.add('invalid');
  msgEl.classList.add('visible');
}

function clearErrors() {
  [nameInput, amountInput, categoryInput].forEach(el => el.classList.remove('invalid'));
  [nameError, amountError, categoryError].forEach(el => el.classList.remove('visible'));
}

// Render fungsi
function render() {
  renderBalance();
  renderList();
  renderChart();
  renderMonthlySummary();
}

function renderBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  totalBalance.textContent = formatRp(total);
}

function getSortedTransactions() {
  const copy = [...transactions];
  if (currentSort === 'amount') {
    // highest amount first
    copy.sort((a, b) => b.amount - a.amount);
  } else if (currentSort === 'category') {
    // alphabetical by category, then by name within category
    copy.sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      return cat !== 0 ? cat : a.name.localeCompare(b.name);
    });
  }
  // 'newest' keeps insertion order (transactions are unshifted, so index 0 = newest)
  return copy;
}

function renderList() {
  // hapus barang yang sebelumnya 
  listEl.querySelectorAll('.transaction-item').forEach(el => el.remove());

  if (transactions.length === 0) {
    listEmpty.style.display = 'block';
    return;
  }

  listEmpty.style.display = 'none';

  getSortedTransactions().forEach(tx => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.dataset.id = tx.id;
    item.innerHTML = `
      <div class="tx-info">
        <div class="tx-name">${escapeHtml(tx.name)}</div>
        <div class="tx-category">
          <span class="badge ${tx.category}">${tx.category}</span>
        </div>
      </div>
      <span class="tx-amount">${formatRp(tx.amount)}</span>
      <button class="btn-delete" aria-label="Delete transaction" data-id="${tx.id}">Delete</button>
    `;
    listEl.appendChild(item);
  });
}

// Delete 
listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  render();
});

// Chart
function initChart() {
  const ctx = document.getElementById('spendingChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: Object.values(CATEGORY_CONFIG).map(c => c.color),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13, family: "'Segoe UI', system-ui, sans-serif" },
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9aa3b5' : '#6b7280',
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatRp(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

function renderChart() {
  // menampilkan jumlah kategori
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(tx => { totals[tx.category] += tx.amount; });

  const activeCategories = Object.entries(totals).filter(([, v]) => v > 0);

  if (activeCategories.length === 0) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    chartEmpty.style.display = 'block';
    return;
  }

  chartEmpty.style.display = 'none';

  const labels = activeCategories.map(([k]) => k);
  const data   = activeCategories.map(([, v]) => v);
  const colors = activeCategories.map(([k]) => CATEGORY_CONFIG[k].color);

  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].backgroundColor = colors;
  chart.update();
}

// ── Theme ──────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(saved, true);
}

function setTheme(theme, silent = false) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (!silent) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }
  // Update chart text colors for dark/light
  if (chart) {
    const labelColor = theme === 'dark' ? '#9aa3b5' : '#6b7280';
    chart.options.plugins.legend.labels.color = labelColor;
    chart.update();
  }
}

// ── Monthly Summary ────────────────────────────────────
function renderMonthlySummary() {
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  monthLabelEl.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

  // Filter transactions for the selected month/year
  const monthly = transactions.filter(tx => {
    const d = new Date(tx.id); // id = Date.now() timestamp
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  if (monthly.length === 0) {
    monthlyEmptyEl.style.display = 'block';
    monthlyStatsEl.hidden = true;
    return;
  }

  monthlyEmptyEl.style.display = 'none';
  monthlyStatsEl.hidden = false;

  // Calculate totals
  const total = monthly.reduce((sum, tx) => sum + tx.amount, 0);
  monthlyTotalEl.textContent = formatRp(total);

  // Breakdown per category
  const catTotals = { Food: 0, Transport: 0, Fun: 0 };
  monthly.forEach(tx => { catTotals[tx.category] += tx.amount; });

  const barColors = {
    Food:      CATEGORY_CONFIG.Food.color,
    Transport: CATEGORY_CONFIG.Transport.color,
    Fun:       CATEGORY_CONFIG.Fun.color,
  };

  monthlyBreakdownEl.innerHTML = '';
  Object.entries(catTotals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, amt]) => {
      const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <span class="breakdown-category">${escapeHtml(cat)}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${pct}%; background:${barColors[cat]}"></div>
        </div>
        <span class="breakdown-amount">${formatRp(amt)}</span>
        <span class="breakdown-pct">${pct}%</span>
      `;
      monthlyBreakdownEl.appendChild(row);
    });
}

// LocalStorage  
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    // Hide any previous save-error once a write succeeds
    const saveErrorEl = document.getElementById('saveError');
    if (saveErrorEl) saveErrorEl.hidden = true;
  } catch (err) {
    // Retain transactions in memory — do not rethrow
    // Show a visible error indication to the user (Req 5.5)
    const saveErrorEl = document.getElementById('saveError');
    if (saveErrorEl) saveErrorEl.hidden = false;
    console.error('saveTransactions failed:', err);
  }
}

function formatRp(amount) {
  // Return 'Rp 0' for negative, NaN, Infinity, or -Infinity inputs
  if (typeof amount !== 'number' || !isFinite(amount) || amount < 0) {
    return 'Rp 0';
  }
  // Truncate fractional part and format with Indonesian locale (period as thousands separator)
  const floored = Math.floor(amount);
  return 'Rp ' + floored.toLocaleString('id-ID');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
