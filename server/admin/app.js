const API = '/api';
let token = localStorage.getItem('mabsensi_admin_token');
if (!token) window.location.href = 'index.html';

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

async function api(url, opts = {}) {
  const res = await fetch(API + url, { ...opts, headers: { ...headers(), ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
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
  item.addEventListener('click', e => {
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
    else if (page === 'departments') await renderDepartments(el);
    else if (page === 'locations') await renderLocations(el);
    else if (page === 'shifts') await renderShifts(el);
    else if (page === 'roles') await renderRoles(el);
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
      <div class="card-title">Log Absensi Terbaru</div>
      ${stats.stats.logs.length === 0
        ? '<div class="empty-state"><p>Belum ada data absensi.</p></div>'
        : `<div class="table-wrapper"><table>
            <tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Lokasi</th><th>Status</th></tr>
            ${stats.stats.logs.slice(0, 10).map(l => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:8px"><img src="${l.userAvatar || ''}" class="avatar-sm" onerror="this.style.display='none'">${l.userName}</div></td>
                <td>${l.dateStr || new Date(l.date).toLocaleDateString('id-ID')}</td>
                <td>${l.check_in_time || '--:--'}</td>
                <td>${l.check_out_time || '--:--'}</td>
                <td>${l.location_name || '-'}</td>
                <td><span class="badge ${l.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
              </tr>`).join('')}
          </table></div>`}
    </div>`;
}

// ============ EMPLOYEES ============
let employeesCache = [];

async function renderEmployees(el) {
  const [users, depts, roles, shifts] = await Promise.all([
    api('/users'), api('/departments'), api('/roles'), api('/shifts')
  ]);
  employeesCache = users.users.filter(u => u.role !== 'admin' && u.username !== 'admin');
  const deptOpts = depts.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  const roleOpts = roles.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  const shiftOpts = shifts.shifts.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');

  el.innerHTML = `
    <div class="page-header">
      <h2>Manajemen Karyawan</h2>
      <button class="btn btn-primary" onclick="showAddEmployee()">+ Tambah Karyawan</button>
    </div>
    <div class="search-bar"><input type="text" id="empSearch" placeholder="Cari nama, NIK, atau username..." oninput="filterEmployees()"></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th></th><th>NIK</th><th>Nama</th><th>Username</th><th>Bagian</th><th>Shift</th><th>Posisi</th><th>Status</th><th>Aksi</th></tr>
      <tbody id="empTableBody"></tbody>
    </table></div></div>`;
  window._deptOpts = deptOpts; window._roleOpts = roleOpts; window._shiftOpts = shiftOpts;
  filterEmployees();
}

function filterEmployees() {
  const q = (document.getElementById('empSearch')?.value || '').toLowerCase();
  const filtered = employeesCache.filter(e =>
    (e.name || '').toLowerCase().includes(q) ||
    (e.nik || '').toLowerCase().includes(q) ||
    (e.username || '').toLowerCase().includes(q) ||
    (e.department_name || '').toLowerCase().includes(q));
  const tbody = document.getElementById('empTableBody');
  if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><p>Tidak ada karyawan.</p></div></td></tr>'; return; }
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td><img src="${u.avatar || ''}" class="avatar-sm" onerror="this.style.display='none'"></td>
      <td>${u.nik || '-'}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.username}</td>
      <td>${u.department_name || '-'}</td>
      <td>${u.shift_name || '-'}</td>
      <td>${u.position}</td>
      <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
      <td class="actions">
        <button class="edit" onclick="showEditEmployee(${u.id})">Edit</button>
        <button class="delete" onclick="deleteEmployee(${u.id})">Hapus</button>
      </td>
    </tr>`).join('');
}

function showAddEmployee() {
  openModal('Tambah Karyawan', `
    <form id="empForm">
      <div class="form-group"><label>NIK</label><input type="text" id="fNik" placeholder="NIK-XXX"></div>
      <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="fName" required></div>
      <div class="form-group"><label>Username *</label><input type="text" id="fUsername" required></div>
      <div class="form-group"><label>Password *</label><input type="password" id="fPassword" required></div>
      <div class="form-group"><label>Bagian</label><select id="fDept">${window._deptOpts || ''}</select></div>
      <div class="form-group"><label>Role</label><select id="fRole">${window._roleOpts || ''}</select></div>
      <div class="form-group"><label>Shift</label><select id="fShift">${window._shiftOpts || ''}</select></div>
      <div class="form-group"><label>Posisi / Jabatan</label><input type="text" id="fPosition" value="Staff"></div>
      <div class="form-group"><label>No. Telepon</label><input type="text" id="fPhone"></div>
      <div class="form-group"><label>Email</label><input type="email" id="fEmail"></div>
      <div class="form-group"><label>Alamat</label><textarea id="fAddress" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem"></textarea></div>
      <div class="form-group"><label>Tanggal Masuk</label><input type="date" id="fJoinDate"></div>
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
          nik: document.getElementById('fNik').value || undefined,
          position: document.getElementById('fPosition').value,
          department_id: document.getElementById('fDept').value || null,
          role_id: document.getElementById('fRole').value || null,
          shift_id: document.getElementById('fShift').value || null,
          phone: document.getElementById('fPhone').value || undefined,
          email: document.getElementById('fEmail').value || undefined,
          address: document.getElementById('fAddress').value || undefined,
          avatar: document.getElementById('fAvatar').value || undefined
        })
      });
      showToast('Karyawan berhasil ditambahkan!');
      closeModal(); loadPage('employees');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditEmployee(id) {
  const u = employeesCache.find(e => e.id === id);
  if (!u) return;
  openModal('Edit Karyawan', `
    <form id="empForm">
      <div class="form-group"><label>NIK</label><input type="text" id="fNik" value="${u.nik || ''}"></div>
      <div class="form-group"><label>Nama Lengkap *</label><input type="text" id="fName" value="${u.name}" required></div>
      <div class="form-group"><label>Username *</label><input type="text" id="fUsername" value="${u.username}" required></div>
      <div class="form-group"><label>Password Baru (biarkan kosong)</label><input type="password" id="fPassword" placeholder="Kosongkan jika tidak diubah"></div>
      <div class="form-group"><label>Bagian</label><select id="fDept">${(window._deptOpts || '').replace(`value="${u.department_id}"`, `value="${u.department_id}" selected`)}</select></div>
      <div class="form-group"><label>Role</label><select id="fRole">${(window._roleOpts || '').replace(`value="${u.role_id}"`, `value="${u.role_id}" selected`)}</select></div>
      <div class="form-group"><label>Shift</label><select id="fShift">${(window._shiftOpts || '').replace(`value="${u.shift_id}"`, `value="${u.shift_id}" selected`)}</select></div>
      <div class="form-group"><label>Posisi / Jabatan</label><input type="text" id="fPosition" value="${u.position}"></div>
      <div class="form-group"><label>No. Telepon</label><input type="text" id="fPhone" value="${u.phone || ''}"></div>
      <div class="form-group"><label>Email</label><input type="email" id="fEmail" value="${u.email || ''}"></div>
      <div class="form-group"><label>Alamat</label><textarea id="fAddress" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem">${u.address || ''}</textarea></div>
      <div class="form-group"><label>Tanggal Masuk</label><input type="date" id="fJoinDate" value="${u.join_date || ''}"></div>
      <div class="form-group"><label>Avatar URL</label><input type="url" id="fAvatar" value="${u.avatar || ''}"></div>
      <div class="form-group"><label>Status</label><select id="fActive"><option value="1" ${u.is_active ? 'selected' : ''}>Aktif</option><option value="0" ${!u.is_active ? 'selected' : ''}>Nonaktif</option></select></div>
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
        nik: document.getElementById('fNik').value || undefined,
        position: document.getElementById('fPosition').value || 'Staff',
        department_id: document.getElementById('fDept').value || null,
        role_id: document.getElementById('fRole').value || null,
        shift_id: document.getElementById('fShift').value || null,
        phone: document.getElementById('fPhone').value || undefined,
        email: document.getElementById('fEmail').value || undefined,
        address: document.getElementById('fAddress').value || undefined,
        avatar: document.getElementById('fAvatar').value || undefined,
        is_active: parseInt(document.getElementById('fActive').value)
      };
      const pw = document.getElementById('fPassword').value;
      if (pw) body.password = pw;
      await api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Karyawan berhasil diupdate!');
      closeModal(); loadPage('employees');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteEmployee(id) {
  const u = employeesCache.find(e => e.id === id);
  if (!u || !confirm(`Hapus karyawan "${u.name}"?`)) return;
  try { await api(`/users/${id}`, { method: 'DELETE' }); showToast('Karyawan dihapus!'); loadPage('employees'); }
  catch (err) { showToast(err.message); }
}

// ============ DEPARTMENTS ============
async function renderDepartments(el) {
  const depts = await api('/departments');
  el.innerHTML = `
    <div class="page-header"><h2>Master Bagian</h2><button class="btn btn-primary" onclick="showAddDept()">+ Tambah Bagian</button></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Kode</th><th>Nama Bagian</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr>
      <tbody>${depts.departments.map(d => `
        <tr>
          <td><strong>${d.code}</strong></td>
          <td>${d.name}</td>
          <td class="text-muted">${d.description || '-'}</td>
          <td><span class="badge ${d.is_active ? 'badge-success' : 'badge-danger'}">${d.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="actions">
            <button class="edit" onclick="showEditDept(${d.id},'${d.name}','${d.code}','${d.description || ''}',${d.is_active})">Edit</button>
            <button class="delete" onclick="deleteDept(${d.id})">Hapus</button>
          </td>
        </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function showAddDept() {
  openModal('Tambah Bagian', `
    <form id="deptForm">
      <div class="form-group"><label>Kode Bagian *</label><input type="text" id="fCode" placeholder="IT-02" required></div>
      <div class="form-group"><label>Nama Bagian *</label><input type="text" id="fName" placeholder="Divisi" required></div>
      <div class="form-group"><label>Deskripsi</label><textarea id="fDesc" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem"></textarea></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-success">Simpan</button>
      </div>
    </form>`);
  document.getElementById('deptForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/departments', { method: 'POST', body: JSON.stringify({ code: document.getElementById('fCode').value, name: document.getElementById('fName').value, description: document.getElementById('fDesc').value }) });
      showToast('Bagian ditambahkan!'); closeModal(); loadPage('departments');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditDept(id, name, code, desc, active) {
  openModal('Edit Bagian', `
    <form id="deptForm">
      <div class="form-group"><label>Kode Bagian</label><input type="text" id="fCode" value="${code}" required></div>
      <div class="form-group"><label>Nama Bagian</label><input type="text" id="fName" value="${name}" required></div>
      <div class="form-group"><label>Deskripsi</label><textarea id="fDesc" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem">${desc}</textarea></div>
      <div class="form-group"><label>Status</label><select id="fActive"><option value="1" ${active ? 'selected' : ''}>Aktif</option><option value="0" ${!active ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  document.getElementById('deptForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api(`/departments/${id}`, { method: 'PUT', body: JSON.stringify({ code: document.getElementById('fCode').value, name: document.getElementById('fName').value, description: document.getElementById('fDesc').value, is_active: parseInt(document.getElementById('fActive').value) }) });
      showToast('Bagian diupdate!'); closeModal(); loadPage('departments');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteDept(id) {
  if (!confirm('Hapus bagian ini?')) return;
  try { await api(`/departments/${id}`, { method: 'DELETE' }); showToast('Bagian dihapus!'); loadPage('departments'); }
  catch (err) { showToast(err.message); }
}

// ============ LOCATIONS ============
async function renderLocations(el) {
  const locs = await api('/locations');
  el.innerHTML = `
    <div class="page-header"><h2>Lokasi Absensi</h2><button class="btn btn-primary" onclick="showAddLoc()">+ Tambah Lokasi</button></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Nama Lokasi</th><th>Alamat</th><th>Latitude</th><th>Longitude</th><th>Radius</th><th>Status</th><th>Aksi</th></tr>
      <tbody>${locs.locations.map(l => `
        <tr>
          <td><strong>${l.name}</strong></td>
          <td class="text-muted">${l.address || '-'}</td>
          <td>${l.latitude}</td>
          <td>${l.longitude}</td>
          <td>${l.radius}m</td>
          <td><span class="badge ${l.is_active ? 'badge-success' : 'badge-danger'}">${l.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="actions">
            <button class="edit" onclick="showEditLoc(${l.id})">Edit</button>
            <button class="delete" onclick="deleteLoc(${l.id})">Hapus</button>
          </td>
        </tr>`).join('')}</tbody>
    </table></div></div>`;
  window._locs = locs.locations;
}

function showAddLoc() {
  openModal('Tambah Lokasi', `
    <form id="locForm">
      <div class="form-group"><label>Nama Lokasi *</label><input type="text" id="fName" required></div>
      <div class="form-group"><label>Alamat</label><textarea id="fAddr" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem"></textarea></div>
      <div class="form-group"><label>Latitude *</label><input type="text" id="fLat" placeholder="-6.2008406" required></div>
      <div class="form-group"><label>Longitude *</label><input type="text" id="fLng" placeholder="106.8273081" required></div>
      <div class="form-group"><label>Radius (meter)</label><input type="number" id="fRadius" value="100"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-success">Simpan</button>
      </div>
    </form>`);
  document.getElementById('locForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/locations', { method: 'POST', body: JSON.stringify({ name: document.getElementById('fName').value, address: document.getElementById('fAddr').value, latitude: parseFloat(document.getElementById('fLat').value), longitude: parseFloat(document.getElementById('fLng').value), radius: parseInt(document.getElementById('fRadius').value) }) });
      showToast('Lokasi ditambahkan!'); closeModal(); loadPage('locations');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditLoc(id) {
  const l = window._locs.find(x => x.id === id);
  if (!l) return;
  openModal('Edit Lokasi', `
    <form id="locForm">
      <div class="form-group"><label>Nama Lokasi</label><input type="text" id="fName" value="${l.name}" required></div>
      <div class="form-group"><label>Alamat</label><textarea id="fAddr" rows="2" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem">${l.address || ''}</textarea></div>
      <div class="form-group"><label>Latitude</label><input type="text" id="fLat" value="${l.latitude}" required></div>
      <div class="form-group"><label>Longitude</label><input type="text" id="fLng" value="${l.longitude}" required></div>
      <div class="form-group"><label>Radius (meter)</label><input type="number" id="fRadius" value="${l.radius}"></div>
      <div class="form-group"><label>Status</label><select id="fActive"><option value="1" ${l.is_active ? 'selected' : ''}>Aktif</option><option value="0" ${!l.is_active ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  document.getElementById('locForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api(`/locations/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('fName').value, address: document.getElementById('fAddr').value, latitude: parseFloat(document.getElementById('fLat').value), longitude: parseFloat(document.getElementById('fLng').value), radius: parseInt(document.getElementById('fRadius').value), is_active: parseInt(document.getElementById('fActive').value) }) });
      showToast('Lokasi diupdate!'); closeModal(); loadPage('locations');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteLoc(id) {
  if (!confirm('Hapus lokasi ini?')) return;
  try { await api(`/locations/${id}`, { method: 'DELETE' }); showToast('Lokasi dihapus!'); loadPage('locations'); }
  catch (err) { showToast(err.message); }
}

// ============ SHIFTS ============
async function renderShifts(el) {
  const shifts = await api('/shifts');
  el.innerHTML = `
    <div class="page-header"><h2>Shift Kerja</h2><button class="btn btn-primary" onclick="showAddShift()">+ Tambah Shift</button></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Kode</th><th>Nama</th><th>Check-in Start</th><th>Check-in End</th><th>Check-out Start</th><th>Check-out End</th><th>Jam Kerja</th><th>Status</th><th>Aksi</th></tr>
      <tbody>${shifts.shifts.map(s => `
        <tr>
          <td><strong>${s.code}</strong></td>
          <td>${s.name}</td>
          <td>${s.check_in_start}</td>
          <td>${s.check_in_end}</td>
          <td>${s.check_out_start}</td>
          <td>${s.check_out_end}</td>
          <td>${s.work_hours} jam</td>
          <td><span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">${s.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="actions">
            <button class="edit" onclick="showEditShift(${s.id})">Edit</button>
            <button class="delete" onclick="deleteShift(${s.id})">Hapus</button>
          </td>
        </tr>`).join('')}</tbody>
    </table></div></div>`;
  window._shifts = shifts.shifts;
}

function showAddShift() {
  openModal('Tambah Shift', `
    <form id="shiftForm">
      <div class="form-group"><label>Kode Shift *</label><input type="text" id="fCode" placeholder="PGI" required></div>
      <div class="form-group"><label>Nama Shift *</label><input type="text" id="fName" placeholder="Pagi" required></div>
      <div class="form-group"><label>Check-in Start *</label><input type="time" id="fCiStart" value="06:00" required></div>
      <div class="form-group"><label>Check-in End (batas tepat waktu) *</label><input type="time" id="fCiEnd" value="08:30" required></div>
      <div class="form-group"><label>Check-out Start *</label><input type="time" id="fCoStart" value="16:00" required></div>
      <div class="form-group"><label>Check-out End *</label><input type="time" id="fCoEnd" value="18:00" required></div>
      <div class="form-group"><label>Jam Kerja</label><input type="number" id="fHours" value="8" step="0.5"></div>
      <div class="form-group"><label>Toleransi (menit)</label><input type="number" id="fTol" value="0"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-success">Simpan</button>
      </div>
    </form>`);
  document.getElementById('shiftForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/shifts', { method: 'POST', body: JSON.stringify({
        code: document.getElementById('fCode').value, name: document.getElementById('fName').value,
        check_in_start: document.getElementById('fCiStart').value, check_in_end: document.getElementById('fCiEnd').value,
        check_out_start: document.getElementById('fCoStart').value, check_out_end: document.getElementById('fCoEnd').value,
        work_hours: parseFloat(document.getElementById('fHours').value), tolerance_min: parseInt(document.getElementById('fTol').value)
      }) });
      showToast('Shift ditambahkan!'); closeModal(); loadPage('shifts');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditShift(id) {
  const s = window._shifts.find(x => x.id === id);
  if (!s) return;
  openModal('Edit Shift', `
    <form id="shiftForm">
      <div class="form-group"><label>Kode Shift</label><input type="text" id="fCode" value="${s.code}" required></div>
      <div class="form-group"><label>Nama Shift</label><input type="text" id="fName" value="${s.name}" required></div>
      <div class="form-group"><label>Check-in Start</label><input type="time" id="fCiStart" value="${s.check_in_start}" required></div>
      <div class="form-group"><label>Check-in End</label><input type="time" id="fCiEnd" value="${s.check_in_end}" required></div>
      <div class="form-group"><label>Check-out Start</label><input type="time" id="fCoStart" value="${s.check_out_start}" required></div>
      <div class="form-group"><label>Check-out End</label><input type="time" id="fCoEnd" value="${s.check_out_end}" required></div>
      <div class="form-group"><label>Jam Kerja</label><input type="number" id="fHours" value="${s.work_hours}" step="0.5"></div>
      <div class="form-group"><label>Toleransi (menit)</label><input type="number" id="fTol" value="${s.tolerance_min}"></div>
      <div class="form-group"><label>Status</label><select id="fActive"><option value="1" ${s.is_active ? 'selected' : ''}>Aktif</option><option value="0" ${!s.is_active ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  document.getElementById('shiftForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify({
        code: document.getElementById('fCode').value, name: document.getElementById('fName').value,
        check_in_start: document.getElementById('fCiStart').value, check_in_end: document.getElementById('fCiEnd').value,
        check_out_start: document.getElementById('fCoStart').value, check_out_end: document.getElementById('fCoEnd').value,
        work_hours: parseFloat(document.getElementById('fHours').value), tolerance_min: parseInt(document.getElementById('fTol').value),
        is_active: parseInt(document.getElementById('fActive').value)
      }) });
      showToast('Shift diupdate!'); closeModal(); loadPage('shifts');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteShift(id) {
  if (!confirm('Hapus shift ini?')) return;
  try { await api(`/shifts/${id}`, { method: 'DELETE' }); showToast('Shift dihapus!'); loadPage('shifts'); }
  catch (err) { showToast(err.message); }
}

// ============ ROLES ============
async function renderRoles(el) {
  const roles = await api('/roles');
  el.innerHTML = `
    <div class="page-header"><h2>Master Role</h2><button class="btn btn-primary" onclick="showAddRole()">+ Tambah Role</button></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Nama Role</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr>
      <tbody>${roles.roles.map(r => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td class="text-muted">${r.description || '-'}</td>
          <td><span class="badge ${r.is_active ? 'badge-success' : 'badge-danger'}">${r.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
          <td class="actions">
            <button class="edit" onclick="showEditRole(${r.id},'${r.name}','${r.description || ''}',${r.is_active})">Edit</button>
            <button class="delete" onclick="deleteRole(${r.id})">Hapus</button>
          </td>
        </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function showAddRole() {
  openModal('Tambah Role', `
    <form id="roleForm">
      <div class="form-group"><label>Nama Role *</label><input type="text" id="fName" placeholder="manager" required></div>
      <div class="form-group"><label>Deskripsi</label><input type="text" id="fDesc"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-success">Simpan</button>
      </div>
    </form>`);
  document.getElementById('roleForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api('/roles', { method: 'POST', body: JSON.stringify({ name: document.getElementById('fName').value, description: document.getElementById('fDesc').value }) });
      showToast('Role ditambahkan!'); closeModal(); loadPage('roles');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan';
  });
}

function showEditRole(id, name, desc, active) {
  openModal('Edit Role', `
    <form id="roleForm">
      <div class="form-group"><label>Nama Role</label><input type="text" id="fName" value="${name}" required></div>
      <div class="form-group"><label>Deskripsi</label><input type="text" id="fDesc" value="${desc}"></div>
      <div class="form-group"><label>Status</label><select id="fActive"><option value="1" ${active ? 'selected' : ''}>Aktif</option><option value="0" ${!active ? 'selected' : ''}>Nonaktif</option></select></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  document.getElementById('roleForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      await api(`/roles/${id}`, { method: 'PUT', body: JSON.stringify({ name: document.getElementById('fName').value, description: document.getElementById('fDesc').value, is_active: parseInt(document.getElementById('fActive').value) }) });
      showToast('Role diupdate!'); closeModal(); loadPage('roles');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Update';
  });
}

async function deleteRole(id) {
  if (!confirm('Hapus role ini?')) return;
  try { await api(`/roles/${id}`, { method: 'DELETE' }); showToast('Role dihapus!'); loadPage('roles'); }
  catch (err) { showToast(err.message); }
}

// ============ ATTENDANCE LOGS ============
async function renderAttendance(el) {
  const data = await api('/attendance/stats');
  const logs = data.stats.logs;
  el.innerHTML = `
    <div class="page-header"><h2>Log Absensi</h2></div>
    <div class="search-bar"><input type="text" id="attSearch" placeholder="Cari karyawan..." oninput="filterAttendance()"></div>
    <div class="card"><div class="table-wrapper"><table>
      <tr><th>Karyawan</th><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Lokasi</th><th>Jarak</th><th>Status</th><th>Foto</th></tr>
      <tbody id="attTableBody"></tbody>
    </table></div></div>`;
  window._attLogs = logs;
  filterAttendance();
}

function filterAttendance() {
  const q = (document.getElementById('attSearch')?.value || '').toLowerCase();
  const logs = (window._attLogs || []).filter(l =>
    (l.userName || l.name || '').toLowerCase().includes(q) ||
    (l.userPosition || l.position || '').toLowerCase().includes(q) ||
    (l.status || '').toLowerCase().includes(q));
  const tbody = document.getElementById('attTableBody');
  if (!logs.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Tidak ada data absensi.</p></div></td></tr>'; return; }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px"><img src="${l.userAvatar || ''}" class="avatar-sm" onerror="this.style.display='none'"><strong>${l.userName}</strong></div></td>
      <td>${l.dateStr || new Date(l.date).toLocaleDateString('id-ID')}</td>
      <td>${l.check_in_time || '--:--'}</td>
      <td>${l.check_out_time || '--:--'}</td>
      <td>${l.location_name || '-'}</td>
      <td>${l.distance_check_in || '-'}m</td>
      <td><span class="badge ${l.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}">${l.status}</span></td>
      <td>${l.check_in_photo ? `<img src="${l.check_in_photo}" class="photo-thumb" onclick="showPhoto(this.src)">` : '-'}</td>
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
    <div class="page-header"><h2>Pengaturan Kantor (Legacy)</h2></div>
    <div class="card">
      <p class="text-muted" style="margin-bottom:16px">Pengaturan ini hanya untuk backward compatibility. Gunakan menu <strong>Lokasi</strong> untuk manajemen lokasi absensi.</p>
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
      await api('/office', { method: 'PUT', body: JSON.stringify({ name: document.getElementById('sName').value, latitude: parseFloat(document.getElementById('sLat').value), longitude: parseFloat(document.getElementById('sLng').value), radius: parseInt(document.getElementById('sRadius').value) }) });
      showToast('Pengaturan disimpan!');
    } catch (err) { showToast(err.message); }
    btn.disabled = false; btn.textContent = 'Simpan Perubahan';
  });
}

// Load default page
loadPage('dashboard');
