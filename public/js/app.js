const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function formatStatus(status) {
  const map = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    timeout: 'Timeout',
  };
  return map[status] || status;
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const protectedPages = ['/', '/dashboard', '/kits', '/orders'];
  const currentPath = window.location.pathname;

  if (protectedPages.includes(currentPath) && !isLoggedIn()) {
    window.location.href = '/login';
    return;
  }

  if (currentPath === '/login' && isLoggedIn()) {
    window.location.href = '/';
    return;
  }
});

window.api = {
  request: apiRequest,
  getToken,
  isLoggedIn,
  logout,
};

window.utils = {
  formatStatus,
  formatDate,
  showError,
  hideError,
};