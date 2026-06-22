const API = '/api';
let token = localStorage.getItem('mabsensi_admin_token');

if (!token) { window.location.href = 'index.html'; }

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function api(url, opts = {}) {
  const res = await fetch(API + url, { ...opts, headers: { ...headers(), ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    loadPage(item.dataset.page);
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('mabsensi_admin_token');
  window.location.href = 'index.html';
});

async function loadPage(page) {
  const el = document.getElementById('pageContent');
  el.innerHTML = '<p style="padding:20px;color:var(--text-muted)">Memuat...</p>';
  try {
    if (page === 'dashboard') await renderDashboard(el);
    else if (page === 'employees') await renderEmployees(el);
    else if (page === 'attendance') await renderAttendance(el);
    else if (page === 'settings') await renderSettings(el);
  } catch (err) {
    el.innerHTML = `<p style="color:var(--danger)">Error: ${err.message}</p>`;
  }
}

// ============ DASHBOARD ============
async function renderDashboard(el) {
  const stats = await api('/attendance/stats');
  const office = await api('/office');
  el.innerHTML = `
    <div class="page-header"><h2>Dashboard</h2></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${stats.stats.totalEmployees}</div><div class="stat-label">Total Karyawan</div></div>
      <div class="stat-card green"><div class="stat-value">${stats.stats.checkedInToday}</div><div class="stat-label">Hadir Hari Ini</div></div>
      <div class="stat-card orange"><div class="stat-value">${stats.stats.lateToday}</div><div class="stat-label">Terlambat</div></div>
      <div class="stat-card red"><div class="stat-value">${stats.stats.absentToday}</div><div class="stat-label">Absen/Tidak Hadir</div></div>
    </div>
    <div class="card">
      <div class="card-title">Konfigurasi Kantor</div>
      <p><strong>Nama:</strong> ${office.config.name}</p>
      <p><strong>Lokasi:</strong> ${office.config.latitude}, ${office.config.longitude}</p>
      <p><strong>Radius:</strong> ${office.config.radius} meter</p>
    </div>
    <div class="card">
      <div class="card-title">Log Absensi Terbaru</div>
      ${stats.stats.logs.length === 0
        ? '<div class="empty-state"><p>Belum ada data absensi.</p></div>'
        : `<div class="table-wrapper"><table>
            <tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr>
            ${stats.stats.logs.slice(0, 10).map(l => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px"><img src="${l.userAvatar || ''}" class="avatar-sm" onerror="this.style.display='none'">${l.userName}</div></td>
                <td>${l.dateStr || new Date(l.date).toLocaleDateString('id-ID')}</td>
                <td>${l.checkInTime || l.check_in_time || '--:--'}</td>
                <td>${l.checkOutTime || l.check_out_time || '--:--'}</td>
                <td><span class="badge ${(l.status === 'Tepat Waktu') ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
              </tr>`).join('')}
          </table></div>`}
    </div>`;
}

// ============ EMPLOYEES ============
let employeesCache = [];

async function renderEmployees(el) {
  const users = await api('/users');
  employeesCache = users.users.filter(u => u.role !== 'admin');
  el.innerHTML = `
    <div class="page-header">
      <h2>Manajemen Karyawan</h2>
      <button class="btn btn-primary" onclick="showAddEmployee()">+ Tambah Karyawan</button>
    </div>
    <div class="search-bar"><input type="text" id="empSearch" placeholder="Cari nama atau username..." oninput="filterEmployees()"></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th></th><th>Username</th><th>Nama</th><th>Posisi</th><th>Aksi</th></tr>
      <tbody id="empTableBody"></tbody>
    </table></div></div>`;
  filterEmployees();
}

function filterEmployees() {
  const q = (document.getElementById('empSearch')?.value || '').toLowerCase();
  const filtered = employeesCache.filter(e => e.name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));
  const tbody = document.getElementById('empTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Tidak ada karyawan.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td><img src="${u.avatar || ''}" class="avatar-sm" onerror="this.style.display='none'"></td>
      <td>${u.username}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.position}</td>
      <td class="actions">
        <button class="edit" onclick="showEditEmployee(${u.id})">Edit</button>
        <button class="delete" onclick="deleteEmployee(${u.id})">Hapus</button>
      </td>
    </tr>`).join('');
}

function showAddEmployee() {
  openModal('Tambah Karyawan', `
    <form id="empForm">
      <div class="form-group"><label>Username</label><input type="text" id="fUsername" required></div>
      <div class="form-group"><label>Nama Lengkap</label><input type="text" id="fName" required></div>
      <div class="form-group"><label>Password</label><input type="password" id="fPassword" required></div>
      <div class="form-group"><label>Posisi / Jabatan</label><input type="text" id="fPosition" placeholder="Staff" value="Staff"></div>
      <div class="form-group"><label>Avatar URL</label><input type="url" id="fAvatar" placeholder="https://..."></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-success">Simpan</button>
      </div>
    </form>`);
  document.getElementById('empForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('fUsername').value,
          name: document.getElementById('fName').value,
          password: document.getElementById('fPassword').value,
          position: document.getElementById('fPosition').value,
          avatar: document.getElementById('fAvatar').value || undefined
        })
      });
      showToast('Karyawan berhasil ditambahkan!');
      closeModal();
      const page = document.querySelector('.nav-item.active');
      if (page) loadPage(page.dataset.page);
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditEmployee(id) {
  const u = employeesCache.find(e => e.id === id);
  if (!u) return;
  openModal('Edit Karyawan', `
    <form id="empForm">
      <div class="form-group"><label>Username</label><input type="text" id="fUsername" value="${u.username}" required></div>
      <div class="form-group"><label>Nama Lengkap</label><input type="text" id="fName" value="${u.name}" required></div>
      <div class="form-group"><label>Password Baru (biarkan kosong jika tidak diubah)</label><input type="password" id="fPassword" placeholder="Biarkan kosong"></div>
      <div class="form-group"><label>Posisi / Jabatan</label><input type="text" id="fPosition" value="${u.position}"></div>
      <div class="form-group"><label>Avatar URL</label><input type="url" id="fAvatar" value="${u.avatar || ''}"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  document.getElementById('empForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const body = {
        name: document.getElementById('fName').value,
        username: document.getElementById('fUsername').value,
        position: document.getElementById('fPosition').value || 'Staff',
        avatar: document.getElementById('fAvatar').value || ''
      };
      const pw = document.getElementById('fPassword').value;
      if (pw) body.password = pw;
      await api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Karyawan berhasil diupdate!');
      closeModal();
      const page = document.querySelector('.nav-item.active');
      if (page) loadPage(page.dataset.page);
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteEmployee(id) {
  const u = employeesCache.find(e => e.id === id);
  if (!u) return;
  if (!confirm(`Hapus karyawan "${u.name}"? Data absensi juga akan terhapus.`)) return;
  try {
    await api(`/users/${id}`, { method: 'DELETE' });
    showToast('Karyawan berhasil dihapus!');
    const page = document.querySelector('.nav-item.active');
    if (page) loadPage(page.dataset.page);
  } catch (err) { showToast(err.message); }
}

// ============ ATTENDANCE LOGS ============
async function renderAttendance(el) {
  const data = await api('/attendance/stats');
  const logs = data.stats.logs;
  el.innerHTML = `
    <div class="page-header"><h2>Log Absensi</h2></div>
    <div class="search-bar"><input type="text" id="attSearch" placeholder="Cari karyawan..." oninput="filterAttendance()"></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Jarak</th><th>Status</th><th>Foto</th></tr>
      <tbody id="attTableBody"></tbody>
    </table></div></div>`;
  window._attLogs = logs;
  filterAttendance();
}

function filterAttendance() {
  const q = (document.getElementById('attSearch')?.value || '').toLowerCase();
  const logs = (window._attLogs || []).filter(l => {
    const name = l.userName || l.name || '';
    const pos = l.userPosition || l.position || '';
    const status = l.status || '';
    return name.toLowerCase().includes(q) || pos.toLowerCase().includes(q) || status.toLowerCase().includes(q);
  });
  const tbody = document.getElementById('attTableBody');
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>Tidak ada data absensi.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px"><img src="${l.userAvatar || ''}" class="avatar-sm" onerror="this.style.display='none'"><strong>${l.userName}</strong></div></td>
      <td>${l.dateStr || new Date(l.date).toLocaleDateString('id-ID')}</td>
      <td>${l.checkInTime || l.check_in_time || '--:--'}</td>
      <td>${l.checkOutTime || l.check_out_time || '--:--'}</td>
      <td>${l.distanceCheckIn || l.distance_check_in || '-'}m</td>
      <td><span class="badge ${l.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
      <td>
        ${l.checkInPhoto || l.check_in_photo
          ? `<img src="${l.checkInPhoto || l.check_in_photo}" class="photo-thumb" onclick="showPhoto(this.src)">`
          : '-'}
      </td>
    </tr>`).join('');
}

function showPhoto(src) {
  const div = document.createElement('div');
  div.className = 'photo-viewer-modal';
  div.innerHTML = `<img src="${src}">`;
  div.onclick = () => div.remove();
  document.body.appendChild(div);
}

// ============ SETTINGS ============
async function renderSettings(el) {
  const office = await api('/office');
  el.innerHTML = `
    <div class="page-header"><h2>Pengaturan Kantor</h2></div>
    <div class="card">
      <form id="settingsForm">
        <div class="form-group"><label>Nama Lokasi Kantor</label><input type="text" id="sName" value="${office.config.name}" required></div>
        <div class="form-group"><label>Latitude</label><input type="text" id="sLat" value="${office.config.latitude}" required></div>
        <div class="form-group"><label>Longitude</label><input type="text" id="sLng" value="${office.config.longitude}" required></div>
        <div class="form-group"><label>Radius (meter)</label><input type="number" id="sRadius" value="${office.config.radius}" required></div>
        <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
      </form>
    </div>`;
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/office', {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('sName').value,
          latitude: parseFloat(document.getElementById('sLat').value),
          longitude: parseFloat(document.getElementById('sLng').value),
          radius: parseInt(document.getElementById('sRadius').value)
        })
      });
      showToast('Pengaturan berhasil disimpan!');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan Perubahan';
  });
}

// Load default page
loadPage('dashboard');
