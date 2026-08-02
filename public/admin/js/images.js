let currentPage = 1;
let itemsPerPage = 50;
let totalPages = 1;
let currentRawImages = [];
let filteredImages = [];
let currentViewMode = 'grid'; // 'grid' or 'table'
let imageModal = null;
let activeModalImage = null;

document.addEventListener('DOMContentLoaded', () => {
  imageModal = new bootstrap.Modal(document.getElementById('imageDetailsModal'));

  setupEventListeners();
  loadImages();
});

function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('statusFilter').addEventListener('change', () => {
    currentPage = 1;
    loadImages();
  });

  document.getElementById('itemsPerPageSelect').addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value) || 50;
    currentPage = 1;
    loadImages();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('itemsPerPageSelect').value = '50';
    itemsPerPage = 50;
    currentPage = 1;
    loadImages();
  });

  document.getElementById('viewGridBtn').addEventListener('click', () => {
    currentViewMode = 'grid';
    document.getElementById('viewGridBtn').classList.add('active');
    document.getElementById('viewTableBtn').classList.remove('active');
    document.getElementById('imagesGridContainer').classList.remove('d-none');
    document.getElementById('imagesTableContainer').classList.add('d-none');
  });

  document.getElementById('viewTableBtn').addEventListener('click', () => {
    currentViewMode = 'table';
    document.getElementById('viewTableBtn').classList.add('active');
    document.getElementById('viewGridBtn').classList.remove('active');
    document.getElementById('imagesTableContainer').classList.remove('d-none');
    document.getElementById('imagesGridContainer').classList.add('d-none');
  });

  document.getElementById('compressAllBtn').addEventListener('click', handleBatchCompress);

  document.getElementById('modalApproveBtn').addEventListener('click', async () => {
    if (!activeModalImage) return;
    const isApproved = activeModalImage.approved === 1 || activeModalImage.approved === true;
    await toggleApprovalStatus(activeModalImage.id, isApproved ? 0 : 1);
    imageModal.hide();
  });

  document.getElementById('modalDeleteBtn').addEventListener('click', async () => {
    if (!activeModalImage) return;
    if (confirm(`Are you sure you want to permanently delete image ID #${activeModalImage.id}?`)) {
      await deleteImage(activeModalImage.id);
      imageModal.hide();
    }
  });
}

async function loadImages() {
  const gridContainer = document.getElementById('imagesGridContainer');
  const tbody = document.getElementById('imagesTbody');

  gridContainer.innerHTML = `
    <div class="col-12 spinner-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading images...</span>
      </div>
    </div>
  `;
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Loading images...</td></tr>`;

  const statusFilter = document.getElementById('statusFilter').value;
  let endpoint = `/list-images?itemsPerPage=${itemsPerPage}&page=${currentPage}`;
  if (statusFilter === 'approved') {
    endpoint = `/list-approved-images?itemsPerPage=${itemsPerPage}&page=${currentPage}`;
  }

  try {
    const res = await fetch(endpoint);
    const data = await res.json();

    currentRawImages = data.listImages || [];
    totalPages = data.totalPages || 1;

    applyFilters();
  } catch (err) {
    console.error('Failed to load images:', err);
    gridContainer.innerHTML = `<div class="col-12 text-center text-danger py-5">Failed to load images. Please try again.</div>`;
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter').value;

  filteredImages = currentRawImages.filter(img => {
    const isApproved = img.approved === 1 || img.approved === true;

    if (statusFilter === 'approved' && !isApproved) return false;
    if (statusFilter === 'pending' && isApproved) return false;

    if (searchTerm) {
      const matchPrompt = (img.prompt || '').toLowerCase().includes(searchTerm);
      const matchDevice = (img.deviceId || '').toLowerCase().includes(searchTerm);
      const matchCountry = (img.country || '').toLowerCase().includes(searchTerm);
      const matchModel = (img.modelName || '').toLowerCase().includes(searchTerm);
      const matchVersion = (img.versionCode || '').toLowerCase().includes(searchTerm);
      const matchId = String(img.id) === searchTerm;

      return matchPrompt || matchDevice || matchCountry || matchModel || matchVersion || matchId;
    }

    return true;
  });

  document.getElementById('displayedCountText').textContent = filteredImages.length;
  document.getElementById('pageInfoText').textContent = `Page ${currentPage} of ${totalPages}`;

  renderGrid();
  renderTable();
  renderPagination();
}

function renderGrid() {
  const gridContainer = document.getElementById('imagesGridContainer');

  if (filteredImages.length === 0) {
    gridContainer.innerHTML = `<div class="col-12 text-center py-5 text-muted fs-5"><i class="fa-solid fa-image-slash me-2"></i>No matching images found</div>`;
    return;
  }

  gridContainer.innerHTML = filteredImages.map(img => {
    const isApproved = img.approved === 1 || img.approved === true;
    const displayThumb = img.thumbPath || img.image || '/admin/img/placeholder.png';
    const badgeHtml = isApproved
      ? `<span class="badge-glass badge-approved"><i class="fa-solid fa-check"></i> Approved</span>`
      : `<span class="badge-glass badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`;

    return `
      <div class="col-12 col-sm-6 col-md-4 col-xl-3">
        <div class="glass-card image-card glass-card-interactive">
          <div class="image-card-img-wrapper">
            <img src="${displayThumb}" alt="Generated Image" class="image-card-img" loading="lazy" onclick="openDetailsModal(${img.id})">
            <div class="image-card-badge">${badgeHtml}</div>
          </div>
          <div class="image-card-body">
            <div class="image-card-prompt" title="${escapeHtml(img.prompt)}">${escapeHtml(img.prompt)}</div>
            <div class="image-card-meta">
              <span class="meta-pill"><i class="fa-solid fa-cube me-1"></i>${escapeHtml(img.modelName || 'Std')}</span>
              <span class="meta-pill"><i class="fa-solid fa-globe me-1"></i>${escapeHtml(img.country || 'N/A')}</span>
              <span class="meta-pill"><i class="fa-solid fa-heart text-danger me-1"></i>${img.likeCount || 0}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center gap-1 mt-2">
              <button class="btn btn-sm ${isApproved ? 'btn-outline-warning' : 'btn-glass-success'} rounded-3 py-1 px-2 fs-7" onclick="toggleApprovalStatus(${img.id}, ${isApproved ? 0 : 1})">
                <i class="fa-solid ${isApproved ? 'fa-xmark' : 'fa-check'}"></i> ${isApproved ? 'Unapprove' : 'Approve'}
              </button>
              <button class="btn btn-sm btn-outline-info rounded-3 py-1 px-2 fs-7" onclick="openDetailsModal(${img.id})">
                <i class="fa-solid fa-circle-info"></i>
              </button>
              <button class="btn btn-sm btn-glass-danger rounded-3 py-1 px-2 fs-7" onclick="deleteImage(${img.id})">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTable() {
  const tbody = document.getElementById('imagesTbody');

  if (filteredImages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No matching images found</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredImages.map(img => {
    const isApproved = img.approved === 1 || img.approved === true;
    const displayThumb = img.thumbPath || img.image || '/admin/img/placeholder.png';
    const statusBadge = isApproved
      ? `<span class="badge-glass badge-approved"><i class="fa-solid fa-check"></i> Approved</span>`
      : `<span class="badge-glass badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`;

    return `
      <tr>
        <td style="width: 70px;">
          <img src="${displayThumb}" alt="thumb" style="width: 52px; height: 52px; object-fit: cover; border-radius: 12px; cursor: pointer;" onclick="openDetailsModal(${img.id})">
        </td>
        <td>
          <div class="fw-semibold text-truncate" style="max-width: 280px;" title="${escapeHtml(img.prompt)}">${escapeHtml(img.prompt)}</div>
          <div class="text-muted fs-7">#${img.id} &bull; ${img.time ? new Date(img.time).toLocaleDateString() : ''}</div>
        </td>
        <td>
          <div class="fw-medium">${escapeHtml(img.modelName || 'Default')}</div>
          <div class="text-muted fs-7">${escapeHtml(img.stylePreset || 'N/A')} (${escapeHtml(img.aspectRatio || '1:1')})</div>
        </td>
        <td>
          <div class="fw-medium"><i class="fa-solid fa-location-dot text-primary me-1"></i>${escapeHtml(img.country || 'Unknown')}</div>
          <div class="text-muted fs-7 font-monospace">${img.deviceId ? escapeHtml(img.deviceId.substring(0, 14)) + '...' : 'No Device'}</div>
        </td>
        <td><i class="fa-solid fa-heart text-danger me-1"></i>${img.likeCount || 0}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <div class="btn-group">
            <button class="btn btn-sm ${isApproved ? 'btn-outline-warning' : 'btn-glass-success'} px-2 py-1" onclick="toggleApprovalStatus(${img.id}, ${isApproved ? 0 : 1})" title="${isApproved ? 'Unapprove' : 'Approve'}">
              <i class="fa-solid ${isApproved ? 'fa-xmark' : 'fa-check'}"></i>
            </button>
            <button class="btn btn-sm btn-outline-light px-2 py-1" onclick="openDetailsModal(${img.id})" title="Details">
              <i class="fa-solid fa-circle-info"></i>
            </button>
            <button class="btn btn-sm btn-glass-danger px-2 py-1" onclick="deleteImage(${img.id})" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPagination() {
  const ul = document.getElementById('paginationUl');
  if (!ul) return;

  if (totalPages <= 1) {
    ul.innerHTML = '';
    return;
  }

  let html = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">&laquo;</a>
    </li>
  `;

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">&raquo;</a>
    </li>
  `;

  ul.innerHTML = html;
}

function changePage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadImages();
}

async function toggleApprovalStatus(imageId, newApprovedValue) {
  try {
    const res = await fetch(`/toggle-approval/${imageId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: newApprovedValue })
    });
    const result = await res.json();
    if (res.ok) {
      loadImages();
    } else {
      alert(result.message || 'Failed to update approval status');
    }
  } catch (err) {
    console.error('Error toggling approval:', err);
  }
}

async function deleteImage(imageId) {
  if (!confirm(`Are you sure you want to delete image ID #${imageId}?`)) return;

  try {
    const res = await fetch(`/delete-image/${imageId}`, { method: 'DELETE' });
    const result = await res.json();
    if (res.ok) {
      loadImages();
    } else {
      alert(result.message || 'Failed to delete image');
    }
  } catch (err) {
    console.error('Error deleting image:', err);
  }
}

async function handleBatchCompress() {
  const btn = document.getElementById('compressAllBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Processing...`;

  try {
    const res = await fetch('/compress-all-images', { method: 'POST' });
    const result = await res.json();
    alert(result.message || 'Batch compression finished');
    loadImages();
  } catch (err) {
    console.error('Batch compression error:', err);
    alert('Error running batch compression');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Batch Generate Thumbnails`;
  }
}

function openDetailsModal(imageId) {
  const img = currentRawImages.find(i => i.id === imageId);
  if (!img) return;

  activeModalImage = img;
  const isApproved = img.approved === 1 || img.approved === true;

  document.getElementById('modalId').textContent = '#' + img.id;
  document.getElementById('modalPrompt').textContent = img.prompt || 'No prompt provided';
  document.getElementById('modalModel').textContent = img.modelName || 'Default';
  document.getElementById('modalStyle').textContent = img.stylePreset || 'None';
  document.getElementById('modalAspect').textContent = img.aspectRatio || '1:1';
  document.getElementById('modalCountry').textContent = img.country || 'Unknown';
  document.getElementById('modalVersion').textContent = img.versionCode || 'N/A';
  document.getElementById('modalLikes').textContent = img.likeCount || 0;
  document.getElementById('modalDeviceId').textContent = img.deviceId || 'No Device ID';
  document.getElementById('modalFeedback').textContent = img.feedback || 'None';
  document.getElementById('modalTime').textContent = img.time ? new Date(img.time).toLocaleString() : 'N/A';

  const fullImgUrl = img.image || img.thumbPath || '';
  document.getElementById('modalImagePreview').src = fullImgUrl;
  document.getElementById('modalDownloadBtn').href = fullImgUrl;

  const modalStatus = document.getElementById('modalStatus');
  modalStatus.innerHTML = isApproved
    ? `<span class="badge-glass badge-approved"><i class="fa-solid fa-check"></i> Approved</span>`
    : `<span class="badge-glass badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`;

  const approveBtn = document.getElementById('modalApproveBtn');
  approveBtn.className = isApproved ? 'btn btn-glass btn-glass-warning me-auto' : 'btn btn-glass btn-glass-success me-auto';
  approveBtn.innerHTML = isApproved ? `<i class="fa-solid fa-xmark me-1"></i> Disapprove` : `<i class="fa-solid fa-check me-1"></i> Approve`;

  imageModal.show();
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
