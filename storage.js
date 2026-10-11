// The storage adapter is the only part of the app that knows how data is persisted.
const STORAGE_KEYS = {
  transactions: 'smartTransactions',
  realBalance: 'savedRealBalance'
};

function parseTransactions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const storage = {
  loadTransactions() {
    return parseTransactions(localStorage.getItem(STORAGE_KEYS.transactions));
  },

  saveTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  },

  loadRealBalance() {
    return localStorage.getItem(STORAGE_KEYS.realBalance) || '';
  },

  saveRealBalance(value) {
    localStorage.setItem(STORAGE_KEYS.realBalance, value);
  },

  replaceTransactions(transactions) {
    this.saveTransactions(transactions);
  }
};

window.storage = storage;
