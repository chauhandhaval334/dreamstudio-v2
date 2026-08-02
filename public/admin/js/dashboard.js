document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();

  const refreshBtn = document.getElementById('refreshStatsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.querySelector('i').classList.add('fa-spin');
      loadDashboardData().finally(() => {
        setTimeout(() => refreshBtn.querySelector('i').classList.remove('fa-spin'), 600);
      });
    });
  }
});

async function loadDashboardData() {
  try {
    const [allImagesRes, approvedRes, usersRes] = await Promise.all([
      fetch('/list-images?itemsPerPage=10&page=1').then(r => r.json()),
      fetch('/list-approved-images?itemsPerPage=10&page=1').then(r => r.json()),
      fetch('/list-subscribed-users').then(r => r.json())
    ]);

    // Approved images count & calculations
    const approvedCount = approvedRes.totalCount || 0;
    const recentImages = allImagesRes.listImages || [];
    
    // Calculate total images estimation (or from listing)
    const estimatedTotalImages = Math.max(approvedCount, recentImages.length);

    document.getElementById('statApprovedImages').textContent = approvedCount.toLocaleString();
    document.getElementById('statTotalImages').textContent = estimatedTotalImages.toLocaleString();
    
    const pendingCount = Math.max(0, estimatedTotalImages - approvedCount);
    document.getElementById('statPendingImages').textContent = pendingCount.toLocaleString();

    // Subscribed users stats
    const subscribedUsers = usersRes.subscribedUsers || [];
    const totalUsersCount = usersRes.count || subscribedUsers.length;
    const blockedCount = subscribedUsers.filter(u => u.isBlocked === 1 || u.isBlocked === true).length;
    const totalTokensVolume = subscribedUsers.reduce((sum, u) => sum + (Number(u.totalToken) || 0), 0);

    document.getElementById('statTotalUsers').textContent = totalUsersCount.toLocaleString();
    document.getElementById('statBlockedUsers').textContent = blockedCount.toLocaleString();
    document.getElementById('statTotalTokens').textContent = totalTokensVolume.toLocaleString();

    // Render Recent Images Preview
    renderRecentImages(recentImages);

    // Render Recent Subscriptions Preview
    renderRecentSubscriptions(subscribedUsers.slice(0, 5));

  } catch (err) {
    console.error('Failed to load dashboard statistics:', err);
  }
}

function renderRecentImages(images) {
  const tbody = document.getElementById('recentImagesTbody');
  if (!tbody) return;

  if (images.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No recent images found</td></tr>`;
    return;
  }

  tbody.innerHTML = images.slice(0, 5).map(img => {
    const isApproved = img.approved === 1 || img.approved === true;
    const displayThumb = img.thumbPath || img.image || '/admin/img/placeholder.png';
    const statusBadge = isApproved
      ? `<span class="badge-glass badge-approved"><i class="fa-solid fa-check"></i> Approved</span>`
      : `<span class="badge-glass badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`;

    return `
      <tr>
        <td style="width: 60px;">
          <img src="${displayThumb}" alt="thumb" style="width: 44px; height: 44px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-glass);">
        </td>
        <td>
          <div class="fw-semibold text-truncate" style="max-width: 220px;" title="${escapeHtml(img.prompt)}">${escapeHtml(img.prompt)}</div>
          <div class="text-muted fs-7">${img.deviceId ? escapeHtml(img.deviceId.substring(0, 14)) + '...' : 'No Device'}</div>
        </td>
        <td>
          <div class="fw-medium fs-7">${escapeHtml(img.modelName || 'Default')}</div>
          <div class="text-muted fs-7"><i class="fa-solid fa-location-dot me-1"></i>${escapeHtml(img.country || 'Unknown')}</div>
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

function renderRecentSubscriptions(users) {
  const tbody = document.getElementById('recentSubscriptionsTbody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No recent subscriptions found</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isBlocked = u.isBlocked === 1 || u.isBlocked === true;
    const statusBadge = isBlocked
      ? `<span class="badge-glass badge-blocked"><i class="fa-solid fa-ban"></i> Blocked</span>`
      : `<span class="badge-glass badge-active"><i class="fa-solid fa-circle-check"></i> Active</span>`;

    return `
      <tr>
        <td>
          <span class="badge bg-purple-subtle text-purple fw-bold px-2 py-1" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">${escapeHtml(u.sku)}</span>
        </td>
        <td>
          <div class="fw-semibold text-truncate fs-7" style="max-width: 140px;" title="${escapeHtml(u.orderId)}">${escapeHtml(u.orderId)}</div>
          <div class="text-muted fs-7">${u.deviceId ? escapeHtml(u.deviceId.substring(0, 10)) + '...' : 'N/A'}</div>
        </td>
        <td>
          <div class="fw-bold text-success fs-7">${u.availableToken !== null ? u.availableToken.toLocaleString() : 0}</div>
          <div class="text-muted fs-7">of ${u.totalToken !== null ? u.totalToken.toLocaleString() : 0}</div>
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
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
