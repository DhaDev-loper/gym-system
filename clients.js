// ── CONFIG ──────────────────────────────────────────────
const DAILY_RATE    = 140;
const MONTHLY_RATE  = 1400;
const LIFETIME_FEE  = 1000;
const LIFETIME_DISC = 0.10; // 10% discount on plans for lifetime members

const DISCOUNT_RATES = {
  none:    0,
  student: 0.1432857, // ~14.3% to make it exactly ₱120 for daily and ₱1200 for monthly
  senior:  0.20,
  pwd:     0.20,
};

// ── STORAGE ─────────────────────────────────────────────
let clients = JSON.parse(localStorage.getItem('gym-clients')) || [];

function saveClients() {
  localStorage.setItem('gym-clients', JSON.stringify(clients));
}

// ── HELPERS ─────────────────────────────────────────────
function getExpiryDate(type, startDate) {
  if (type === 'daily') return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function getStatus(type, expiry) {
  if (type === 'daily') return 'active';
  if (!expiry) return 'active';
  const today = new Date();
  const exp   = new Date(expiry);
  const days  = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (days < 0)  return 'expired';
  if (days <= 7) return 'expiring';
  return 'active';
}

function calcTotal(type, isLifetime, discountKey, includeLifetimeFee) {
  const base     = type === 'daily' ? DAILY_RATE : MONTHLY_RATE;
  const lifDisc  = isLifetime ? base * LIFETIME_DISC : 0;
  const addDisc  = base * (DISCOUNT_RATES[discountKey] || 0);
  const planCost = base - lifDisc - addDisc;
  const total    = planCost + (includeLifetimeFee ? LIFETIME_FEE : 0);
  return { base, lifDisc, addDisc, planCost, total };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── BADGES ──────────────────────────────────────────────
function planBadge(type) {
  return type === 'daily'
    ? '<span class="badge badge-daily">Daily Pass</span>'
    : '<span class="badge badge-monthly">Monthly Subscription</span>';
}

function statusBadge(status) {
  const map = {
    active:   '<span class="badge badge-active">Active</span>',
    expiring: '<span class="badge badge-expiring">Expiring</span>',
    expired:  '<span class="badge badge-expired">Expired</span>',
  };
  return map[status];
}

// ── RENDER ───────────────────────────────────────────────
function renderTable(list) {
  const tbody = document.getElementById('client-tbody');
  document.getElementById('count-note').textContent =
    `Showing ${list.length} client${list.length !== 1 ? 's' : ''}`;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#aaa;padding:20px;">No clients found.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(c => {
    const status = getStatus(c.type, c.expiry);
    return `
      <tr>
        <td>
          <div class="name-cell">
            <div class="avatar">${c.fname[0]}${c.lname[0]}</div>
            ${c.fname} ${c.lname}
          </div>
        </td>
        <td>${planBadge(c.type)}</td>
        <td style="text-align:center;">
          ${c.isLifetime ? '<span class="badge badge-lifetime">✓ Lifetime</span>' : '—'}
        </td>
        <td style="font-weight:600; color:#1e8a4a;">₱${c.amountPaid.toLocaleString()}</td>
        <td>${statusBadge(status)}</td>
        <td>${formatDate(c.joined)}</td>
        <td>${formatDate(c.expiry)}</td>
        <td>
          <button class="action-btn" onclick="deleteClient(${c.id})">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

// ── FILTER ───────────────────────────────────────────────
function filterClients() {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const type   = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  const filtered = clients.filter(c => {
    const fullName = `${c.fname} ${c.lname}`.toLowerCase();
    const cStatus  = getStatus(c.type, c.expiry);
    return (
      fullName.includes(q) &&
      (type   === 'all' || c.type  === type) &&
      (status === 'all' || cStatus === status)
    );
  });

  renderTable(filtered);
}

// ── MODAL ────────────────────────────────────────────────
function openModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('date-joined').valueAsDate = new Date();
  updatePreview();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  clearForm();
}

function clearForm() {
  document.getElementById('fname').value          = '';
  document.getElementById('lname').value          = '';
  document.getElementById('contact').value        = '';
  document.getElementById('mem-type').value       = 'daily';
  document.getElementById('discount').value       = 'none';
  document.getElementById('lifetime-check').checked = false;
}

// ── PREVIEW ──────────────────────────────────────────────
function updatePreview() {
  const type        = document.getElementById('mem-type').value;
  const isLifetime  = document.getElementById('lifetime-check').checked;
  const discountKey = document.getElementById('discount').value;
  const startDate   = document.getElementById('date-joined').value;

  // Check if this client already has lifetime (new reg = always false)
  const includeLifetimeFee = isLifetime;

  const { base, lifDisc, addDisc, total } = calcTotal(type, isLifetime, discountKey, includeLifetimeFee);

  // Plan label
  document.getElementById('prev-plan').textContent =
    type === 'daily' ? 'Daily Pass' : 'Monthly Subscription';

  // Base
  document.getElementById('prev-base').textContent = `₱${base}`;

  // Lifetime fee row
  const lifFeeRow = document.getElementById('prev-lifetime-row');
  lifFeeRow.style.display = isLifetime ? 'flex' : 'none';

  // Lifetime discount row
  const lifDiscRow = document.getElementById('prev-discount-row');
  if (isLifetime && lifDisc > 0) {
    lifDiscRow.style.display = 'flex';
    document.getElementById('prev-discount').textContent = `-₱${lifDisc}`;
  } else {
    lifDiscRow.style.display = 'none';
  }

  // Additional discount row
  const extraRow = document.getElementById('prev-extra-discount-row');
  if (discountKey !== 'none' && addDisc > 0) {
    extraRow.style.display = 'flex';
    document.getElementById('prev-extra-discount').textContent = `-₱${addDisc}`;
  } else {
    extraRow.style.display = 'none';
  }

  // Total
  document.getElementById('prev-total').textContent = `₱${total.toLocaleString()}`;

  // Expiry preview
  const expiryRow = document.getElementById('prev-expiry-row');
  if (type === 'monthly' && startDate) {
    const expiry = getExpiryDate('monthly', startDate);
    expiryRow.style.display = 'flex';
    document.getElementById('prev-expiry').textContent = formatDate(expiry);
  } else {
    expiryRow.style.display = 'none';
  }

  // Lifetime fee note
  document.getElementById('lifetime-fee-row').style.display = isLifetime ? 'block' : 'none';
}

// ── ADD CLIENT ───────────────────────────────────────────
function addClient() {
  const fname       = document.getElementById('fname').value.trim();
  const lname       = document.getElementById('lname').value.trim();
  const contact     = document.getElementById('contact').value.trim();
  const type        = document.getElementById('mem-type').value;
  const joined      = document.getElementById('date-joined').value;
  const isLifetime  = document.getElementById('lifetime-check').checked;
  const discountKey = document.getElementById('discount').value;

  if (!fname || !lname || !joined) {
    alert('Please fill in all required fields.');
    return;
  }

  const expiry = getExpiryDate(type, joined);
  const { total } = calcTotal(type, isLifetime, discountKey, isLifetime);

  const newClient = {
    id:          Date.now(),
    fname,
    lname,
    contact,
    type,
    joined,
    expiry,
    isLifetime,
    discount:    discountKey,
    amountPaid:  total,
  };

  clients.push(newClient);
  saveClients();
  closeModal();
  renderTable(clients);
}

// ── DELETE ───────────────────────────────────────────────
function deleteClient(id) {
  if (!confirm('Are you sure you want to delete this client?')) return;
  clients = clients.filter(c => c.id !== id);
  saveClients();
  filterClients();
}

// ── INIT ─────────────────────────────────────────────────
renderTable(clients);