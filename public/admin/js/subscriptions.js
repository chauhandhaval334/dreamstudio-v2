let rawSubscriptions = [];
let filteredSubscriptions = [];
let refreshTimer = null;
let countdownSeconds = 300; // 5 minutes

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSubscriptions();
  startAutoRefreshTimer();
});

function setupEventListeners() {
  document.getElementById('subSearchInput').addEventListener('input', applySubscriptionFilters);
  document.getElementById('subStatusFilter').addEventListener('change', applySubscriptionFilters);

  document.getElementById('manualRefreshBtn').addEventListener('click', () => {
    const icon = document.getElementById('manualRefreshBtn').querySelector('i');
    icon.classList.add('fa-spin');
    loadSubscriptions().finally(() => {
      setTimeout(() => icon.classList.remove('fa-spin'), 600);
      resetCountdown();
    });
  });
}

async function loadSubscriptions() {
  const tbody = document.getElementById('subscriptionsTbody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Loading subscriptions...</td></tr>`;

  try {
    const res = await fetch('/list-subscribed-users');
    const data = await res.json();

    rawSubscriptions = data.subscribedUsers || [];

    updateSummaryCards(rawSubscriptions);
    applySubscriptionFilters();

  } catch (err) {
    console.error('Failed to load subscriptions:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Failed to load subscriptions. Please check server logs.</td></tr>`;
  }
}

function updateSummaryCards(users) {
  const totalCount = users.length;
  const blockedCount = users.filter(u => u.isBlocked === 1 || u.isBlocked === true).length;
  const activeCount = totalCount - blockedCount;
  const availableTokensSum = users.reduce((sum, u) => sum + (Number(u.availableToken) || 0), 0);

  document.getElementById('subStatTotal').textContent = totalCount.toLocaleString();
  document.getElementById('subStatActive').textContent = activeCount.toLocaleString();
  document.getElementById('subStatBlocked').textContent = blockedCount.toLocaleString();
  document.getElementById('subStatTokens').textContent = availableTokensSum.toLocaleString();
}

function applySubscriptionFilters() {
  const searchTerm = (document.getElementById('subSearchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('subStatusFilter').value;

  filteredSubscriptions = rawSubscriptions.filter(u => {
    const isBlocked = u.isBlocked === 1 || u.isBlocked === true;

    if (statusFilter === 'active' && isBlocked) return false;
    if (statusFilter === 'blocked' && !isBlocked) return false;

    if (searchTerm) {
      const matchDevice = (u.deviceId || '').toLowerCase().includes(searchTerm);
      const matchOrder = (u.orderId || '').toLowerCase().includes(searchTerm);
      const matchSku = (u.sku || '').toLowerCase().includes(searchTerm);
      const matchPackage = (u.packageName || '').toLowerCase().includes(searchTerm);

      return matchDevice || matchOrder || matchSku || matchPackage;
    }

    return true;
  });

  document.getElementById('subDisplayedCount').textContent = filteredSubscriptions.length;
  renderSubscriptionsTable();
}

function renderSubscriptionsTable() {
  const tbody = document.getElementById('subscriptionsTbody');

  if (filteredSubscriptions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No matching subscription records found</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredSubscriptions.map(u => {
    const isBlocked = u.isBlocked === 1 || u.isBlocked === true;
    const statusBadge = isBlocked
      ? `<span class="badge-glass badge-blocked"><i class="fa-solid fa-ban"></i> Blocked</span>`
      : `<span class="badge-glass badge-active"><i class="fa-solid fa-circle-check"></i> Active</span>`;

    const purchaseDateStr = u.time ? formatDate(u.time) : 'N/A';
    const lastUsedStr = u.lastUsed ? formatDate(u.lastUsed) : 'Never';

    const deviceIdDisplay = u.deviceId
      ? `<span class="font-monospace text-info">${escapeHtml(u.deviceId)}</span>`
      : `<span class="text-muted italic">No Device ID</span>`;

    return `
      <tr>
        <td>
          <div class="fw-bold text-white">${escapeHtml(u.sku)}</div>
          <div class="text-muted fs-7">${escapeHtml(u.packageName || 'N/A')}</div>
        </td>
        <td>
          <div class="fw-semibold text-truncate" style="max-width: 220px;" title="${escapeHtml(u.orderId)}">${escapeHtml(u.orderId)}</div>
          <div class="fs-7">${deviceIdDisplay}</div>
        </td>
        <td>
          <span class="fw-bold fs-6 ${isBlocked ? 'text-muted' : 'text-success'}">${u.availableToken !== null ? u.availableToken.toLocaleString() : 0}</span>
        </td>
        <td>
          <span class="fw-medium text-white">${u.totalToken !== null ? u.totalToken.toLocaleString() : 0}</span>
        </td>
        <td class="fs-7 text-muted">${purchaseDateStr}</td>
        <td class="fs-7 text-muted">${lastUsedStr}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          ${u.deviceId ? `
            <button class="btn btn-sm ${isBlocked ? 'btn-glass-success' : 'btn-glass-danger'} py-1 px-3 fs-7" onclick="toggleUserBlock('${escapeHtml(u.deviceId)}', ${isBlocked ? 0 : 1})">
              <i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'} me-1"></i> ${isBlocked ? 'Unblock' : 'Block'}
            </button>
          ` : `<span class="text-muted fs-7">N/A</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleUserBlock(deviceId, newBlockedState) {
  const actionText = newBlockedState === 1 ? 'block' : 'unblock';
  const confirmMsg = newBlockedState === 1
    ? `Are you sure you want to BLOCK device '${deviceId}'? This will zero out its available tokens.`
    : `Are you sure you want to UNBLOCK device '${deviceId}'?`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch('/toggle-block-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: deviceId,
        isBlocked: newBlockedState
      })
    });

    const result = await res.json();
    if (res.ok) {
      loadSubscriptions();
    } else {
      alert(result.message || `Failed to ${actionText} user`);
    }
  } catch (err) {
    console.error(`Error toggling block status:`, err);
    alert(`Failed to ${actionText} user due to network error.`);
  }
}

function startAutoRefreshTimer() {
  resetCountdown();
  if (refreshTimer) clearInterval(refreshTimer);

  refreshTimer = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      loadSubscriptions();
      resetCountdown();
    }
    updateCountdownDisplay();
  }, 1000);
}

function resetCountdown() {
  countdownSeconds = 300; // Reset to 5 minutes
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const el = document.getElementById('refreshCountdown');
  if (!el) return;

  const mins = Math.floor(countdownSeconds / 60);
  const secs = countdownSeconds % 60;
  el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDate(timestampOrStr) {
  if (!timestampOrStr) return 'N/A';
  const num = Number(timestampOrStr);
  const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(timestampOrStr);
  if (isNaN(date.getTime())) return String(timestampOrStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
