// State is kept in one place. The DOM is a projection of this state, while the
// storage adapter is deliberately unaware of how the state is displayed.
const state = {
  transactions: storage.loadTransactions(),
  realBalance: storage.loadRealBalance(),
  currentType: 'expense',
  chart: null
};

const elements = {
  form: document.querySelector('#transactionForm'),
  date: document.querySelector('#date'),
  amount: document.querySelector('#amount'),
  category: document.querySelector('#category'),
  creditFields: document.querySelector('#creditFields'),
  creditDirection: document.querySelector('#creditDirection'),
  person: document.querySelector('#person'),
  note: document.querySelector('#note'),
  realBalance: document.querySelector('#realBalance'),
  appBalance: document.querySelector('#appBalanceText'),
  incomeTotal: document.querySelector('#incomeTotal'),
  expenseTotal: document.querySelector('#expenseTotal'),
  borrowedTotal: document.querySelector('#borrowedTotal'),
  lentTotal: document.querySelector('#lentTotal'),
  status: document.querySelector('#statusBox'),
  list: document.querySelector('#transactionList'),
  listEmpty: document.querySelector('#listEmpty'),
  count: document.querySelector('#transactionCount'),
  submit: document.querySelector('#submitBtn'),
  modeLabel: document.querySelector('#formModeLabel'),
  chart: document.querySelector('#spendingChart'),
  chartEmpty: document.querySelector('#chartEmpty'),
  importFile: document.querySelector('#importFile')
};

const currency = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 });
const chartColors = ['#5cecff', '#ff5f7e', '#6dffad', '#ffc857', '#b388ff', '#ff9364', '#79a7ff', '#d6f36b', '#e2e8f0'];

function money(value) {
  return currency.format(Number(value) || 0).replace('LKR', 'LKR');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

// Derived values are calculated from transactions every render, preventing stale totals.
function getSummary() {
  return state.transactions.reduce((summary, transaction) => {
    const amount = Number(transaction.amount) || 0;
    if (transaction.kind === 'credit' && transaction.direction === 'borrowed') summary.borrowed += amount;
    else if (transaction.kind === 'credit' && transaction.direction === 'lent') summary.lent += amount;
    else if (transaction.kind === 'credit' && transaction.direction === 'borrowed-repayment') summary.borrowed -= amount;
    else if (transaction.kind === 'credit' && transaction.direction === 'lent-repayment') summary.lent -= amount;
    else if (transaction.type === 'income') summary.income += amount;
    else summary.expenses += amount;
    return summary;
  }, { income: 0, expenses: 0, borrowed: 0, lent: 0 });
}

function reconcile(appBalance, realBalance) {
  if (realBalance === '') return { className: 'status-empty', message: 'Enter your real balance to compare' };
  const difference = Number(realBalance) - appBalance;
  if (Math.abs(difference) < 0.1) return { className: 'status-match', message: 'Perfect match. Every rupee is tracked.' };
  if (difference > 0) return { className: 'status-over', message: `Extra ${money(difference)} found. Did you miss an income?` };
  return { className: 'status-short', message: `Missing ${money(Math.abs(difference))}. Did you miss an expense?` };
}

function renderSummary() {
  const summary = getSummary();
  const appBalance = summary.income + summary.borrowed - summary.expenses - summary.lent;
  elements.appBalance.textContent = money(appBalance);
  elements.incomeTotal.textContent = money(summary.income);
  elements.expenseTotal.textContent = money(summary.expenses);
  elements.borrowedTotal.textContent = money(summary.borrowed);
  elements.lentTotal.textContent = money(summary.lent);
  const status = reconcile(appBalance, state.realBalance);
  elements.status.className = `match-status ${status.className}`;
  elements.status.textContent = status.message;
}

function renderTransactions() {
  elements.count.textContent = `${state.transactions.length} ${state.transactions.length === 1 ? 'ITEM' : 'ITEMS'}`;
  elements.listEmpty.hidden = state.transactions.length > 0;
  elements.list.innerHTML = state.transactions.map((transaction, index) => {
    const isIncome = transaction.type === 'income';
    const isCredit = transaction.kind === 'credit';
    const label = isCredit
      ? ({ borrowed: 'Borrowed', lent: 'Lent', 'lent-repayment': 'Repayment received', 'borrowed-repayment': 'Repayment made' }[transaction.direction] || 'Credit')
      : (isIncome ? 'Income' : 'Expense');
    const itemClass = isCredit ? 'item-credit' : (isIncome ? 'item-income' : 'item-expense');
    const sign = isCredit
      ? (transaction.direction === 'lent' || transaction.direction === 'borrowed-repayment' ? '-' : '+')
      : (!isIncome ? '-' : '+');
    const person = isCredit && transaction.person ? ` / ${escapeHtml(transaction.person)}` : '';
    return `<li class="transaction-item ${itemClass}">
      <div class="transaction-main"><div class="transaction-note">${escapeHtml(transaction.note || label)}</div>
      <div class="transaction-meta">${escapeHtml(transaction.date)} / ${escapeHtml(transaction.category)}${person}</div></div>
      <div class="transaction-amount">${sign} ${money(transaction.amount)}
      <button class="delete-btn" type="button" data-delete="${index}" aria-label="Delete transaction">×</button></div>
    </li>`;
  }).join('');
}

function currentMonthExpenses() {
  const monthKey = new Date().toISOString().slice(0, 7);
  return state.transactions.filter(transaction => transaction.type === 'expense' && transaction.kind !== 'credit' && transaction.date.startsWith(monthKey));
}

function renderChart() {
  const grouped = currentMonthExpenses().reduce((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] || 0) + Number(transaction.amount);
    return totals;
  }, {});
  const labels = Object.keys(grouped);
  elements.chartEmpty.hidden = labels.length > 0;
  if (state.chart) state.chart.destroy();
  if (!labels.length || typeof Chart === 'undefined') return;
  state.chart = new Chart(elements.chart, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: Object.values(grouped), backgroundColor: labels.map((_, index) => chartColors[index % chartColors.length]), borderColor: '#0d1923', borderWidth: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: '#d9e8ed', padding: 14, boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: context => ` ${money(context.raw)}` } } } }
  });
}

function persistAndRender() {
  storage.saveTransactions(state.transactions);
  renderSummary();
  renderTransactions();
  renderChart();
}

function setType(type) {
  state.currentType = type;
  document.querySelectorAll('.type-btn').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  elements.submit.innerHTML = `Log ${type} <span>↗</span>`;
  const color = type === 'income' ? 'var(--green)' : type === 'credit' ? 'var(--cyan)' : 'var(--red)';
  elements.submit.style.color = color;
  elements.submit.style.borderColor = color;
  elements.modeLabel.textContent = type === 'income' ? 'INFLOW' : type === 'credit' ? 'FRIEND CREDIT' : 'OUTFLOW';
  elements.modeLabel.className = `card-index ${type === 'income' ? 'income-text' : type === 'credit' ? 'credit-text' : 'expense-text'}`;
  elements.creditFields.hidden = type !== 'credit';
  elements.person.required = type === 'credit';
  elements.category.value = type === 'credit' ? 'Transfers / Repayments' : elements.category.value;
}

function downloadFile(content, filename, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportJson() {
  downloadFile(JSON.stringify({ transactions: state.transactions, realBalance: state.realBalance }, null, 2), 'smart-balance-backup.json', 'application/json');
}

function exportCsv() {
  const header = ['type', 'kind', 'direction', 'person', 'date', 'amount', 'category', 'note'];
  const rows = state.transactions.map(transaction => header.map(key => `"${String(transaction[key] ?? '').replaceAll('"', '""')}"`).join(','));
  downloadFile([header.join(','), ...rows].join('\n'), 'smart-balance-transactions.csv', 'text/csv');
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(value => value.replaceAll('"', '').trim());
  return lines.map(line => {
    const values = [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)/g)].map(match => match[0]).filter((_, index, values) => index < values.length - 1).map(value => value.replace(/^"|"$/g, '').replaceAll('""', '"'));
    return headers.reduce((transaction, header, index) => ({ ...transaction, [header]: values[index] || '' }), {});
  });
}

async function importData(file) {
  const text = await file.text();
  const data = file.name.toLowerCase().endsWith('.csv') ? { transactions: parseCsv(text) } : JSON.parse(text);
  if (!Array.isArray(data.transactions)) throw new Error('The backup does not contain a transaction list.');
  state.transactions = data.transactions.filter(transaction => {
    const validType = ['income', 'expense'].includes(transaction.type);
    const validCredit = transaction.kind === 'credit' && ['borrowed', 'lent', 'lent-repayment', 'borrowed-repayment'].includes(transaction.direction);
    return (validType || validCredit) && Number(transaction.amount) >= 0;
  }).map(transaction => ({ ...transaction, amount: Number(transaction.amount) }));
  if (typeof data.realBalance === 'string' || typeof data.realBalance === 'number') state.realBalance = String(data.realBalance);
  storage.saveRealBalance(state.realBalance);
  persistAndRender();
}

// Event handlers are the only place user actions mutate state.
elements.form.addEventListener('submit', event => {
  event.preventDefault();
  const isCredit = state.currentType === 'credit';
  state.transactions.unshift({
    type: isCredit && ['borrowed', 'lent-repayment'].includes(elements.creditDirection.value) ? 'income' : isCredit ? 'expense' : state.currentType,
    ...(isCredit ? { kind: 'credit', direction: elements.creditDirection.value, person: elements.person.value.trim() } : {}),
    date: elements.date.value,
    amount: Number(elements.amount.value),
    category: elements.category.value,
    note: elements.note.value.trim()
  });
  persistAndRender();
  elements.amount.value = '';
  elements.note.value = '';
  elements.person.value = '';
  elements.amount.focus();
});
elements.realBalance.addEventListener('input', event => { state.realBalance = event.target.value; storage.saveRealBalance(state.realBalance); renderSummary(); });
document.querySelectorAll('.type-btn').forEach(button => button.addEventListener('click', () => setType(button.dataset.type)));
elements.list.addEventListener('click', event => { const index = event.target.dataset.delete; if (index !== undefined) { state.transactions.splice(Number(index), 1); persistAndRender(); } });
document.querySelector('#exportJsonBtn').addEventListener('click', exportJson);
document.querySelector('#exportCsvBtn').addEventListener('click', exportCsv);
document.querySelector('#importBtn').addEventListener('click', () => elements.importFile.click());
elements.importFile.addEventListener('change', async event => { try { await importData(event.target.files[0]); } catch (error) { window.alert(`Import failed: ${error.message}`); } event.target.value = ''; });

elements.date.valueAsDate = new Date();
elements.realBalance.value = state.realBalance;
setType(state.currentType);
persistAndRender();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
