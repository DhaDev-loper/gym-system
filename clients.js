// ── CONFIG ──────────────────────────────────────────────

const RATES = {
  daily:   140,
  monthly: 1400,
};

const LIFETIME_FEE       = 1000;
const LIFETIME_PLAN_DISC = {
  daily:   20,
  monthly: 200,
};

const DISCOUNTS = {
  daily: {
    none:    0,
    student: 20,
    senior:  0,
    pwd:     0,
  },
  monthly: {
    none:    0,
    student: 200,
    senior:  300,
    pwd:     300,
  },
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

function calcTotal(type, isLifetime, discountKey) {
  const base         = RATES[type];
  const lifetimeDisc = isLifetime ? LIFETIME_PLAN_DISC[type] : 0;
  const extraDisc    = DISCOUNTS[type][discountKey] || 0;
  const planCost     = base - lifetimeDisc - extraDisc;
  const lifetimeFee  = isLifetime ? LIFETIME_FEE : 0;
  const total        = planCost + lifetimeFee;

  return { base, lifetimeDisc, extraDisc, planCost, lifetimeFee, total };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#aaa;padding:20px;">No clients found.</td></tr>`;
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
        <td style="font-weight:600;color:#1e8a4a;">₱${c.amountPaid.toLocaleString()}</td>
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

// ── FORM OPEN / CLOSE ────────────────────────────────────
function openModal() {
  const form = document.getElementById('add-client-form');
  form.style.display = 'block';
  document.getElementById('date-joined').valueAsDate = new Date();
  updatePreview();
  form.scrollIntoView({ behavior: 'smooth' });
}

function closeForm() {
  document.getElementById('add-client-form').style.display = 'none';
  clearForm();
}

function clearForm() {
  document.getElementById('fname').value             = '';
  document.getElementById('lname').value             = '';
  document.getElementById('contact').value           = '';
  document.getElementById('mem-type').value          = 'daily';
  document.getElementById('discount').value          = 'none';
  document.getElementById('lifetime-check').checked  = false;
}

// ── PREVIEW ──────────────────────────────────────────────
function updatePreview() {
  const type        = document.getElementById('mem-type').value;
  const isLifetime  = document.getElementById('lifetime-check').checked;
  const discountKey = document.getElementById('discount').value;
  const startDate   = document.getElementById('date-joined').value;

  const { base, lifetimeDisc, extraDisc, lifetimeFee, total } =
    calcTotal(type, isLifetime, discountKey);

  document.getElementById('prev-plan').textContent =
    type === 'daily' ? 'Daily Pass' : 'Monthly Subscription';

  document.getElementById('prev-base').textContent = `₱${base.toLocaleString()}`;

  // Lifetime fee row
  document.getElementById('prev-lifetime-fee-row').style.display =
    isLifetime ? 'flex' : 'none';

  // Lifetime discount row
  const lifDiscRow = document.getElementById('prev-lifetime-disc-row');
  if (isLifetime && lifetimeDisc > 0) {
    lifDiscRow.style.display = 'flex';
    document.getElementById('prev-lifetime-disc').textContent = `-₱${lifetimeDisc}`;
  } else {
    lifDiscRow.style.display = 'none';
  }

  // Extra discount row — use per-plan discount amount
  const extraRow    = document.getElementById('prev-extra-disc-row');
  const extraAmount = DISCOUNTS[type][discountKey] || 0;
  if (discountKey !== 'none' && extraAmount > 0) {
    extraRow.style.display = 'flex';
    document.getElementById('prev-extra-disc').textContent = `-₱${extraAmount}`;
  } else {
    extraRow.style.display = 'none';
  }

  // Total
  document.getElementById('prev-total').textContent = `₱${total.toLocaleString()}`;

  // Expiry preview (monthly only)
  const expiryRow = document.getElementById('prev-expiry-row');
  if (type === 'monthly' && startDate) {
    expiryRow.style.display = 'flex';
    document.getElementById('prev-expiry').textContent =
      formatDate(getExpiryDate('monthly', startDate));
  } else {
    expiryRow.style.display = 'none';
  }
}

  // Extra discount row
  const extraRow = document.getElementById('prev-extra-disc-row');
  if (discountKey !== 'none' && extraDisc > 0) {
    extraRow.style.display = 'flex';
    document.getElementById('prev-extra-disc').textContent = `-₱${extraDisc}`;
  } else {
    extraRow.style.display = 'none';
  }

  // Total
  document.getElementById('prev-total').textContent = `₱${total.toLocaleString()}`;

  // Expiry preview (monthly only)
  const expiryRow = document.getElementById('prev-expiry-row');
  if (type === 'monthly' && startDate) {
    expiryRow.style.display = 'flex';
    document.getElementById('prev-expiry').textContent =
      formatDate(getExpiryDate('monthly', startDate));
  } else {
    expiryRow.style.display = 'none';
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

  const expiry       = getExpiryDate(type, joined);
  const { total }    = calcTotal(type, isLifetime, discountKey);

  clients.push({
    id:         Date.now(),
    fname,
    lname,
    contact,
    type,
    joined,
    expiry,
    isLifetime,
    discount:   discountKey,
    amountPaid: total,
  });

  saveClients();
  closeForm();
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