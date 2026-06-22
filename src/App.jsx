import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Calendar,
  Shield,
  Clock,
  Smartphone,
  Sparkles,
  Briefcase
} from 'lucide-react';
import {
  loginUser,
  registerUser,
  logoutUser,
  getSession,
  getTodayStatus
} from './services/api';
import Dashboard from './components/Dashboard';
import History from './components/History';
import AdminPanel from './components/AdminPanel';
import AttendanceModal from './components/AttendanceModal';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [showAttendance, setShowAttendance] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [toast, setToast] = useState(null);

  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPosition, setRegPosition] = useState('Staff');

  useEffect(() => {
    const initApp = async () => {
      const savedTheme = localStorage.getItem('mabsensi_theme') || 'light';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      const session = await getSession();
      if (session) {
        setUser(session);
        const status = await getTodayStatus(session.id);
        setTodayStatus(status);
        if (session.role === 'admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('dashboard');
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => { setToast(null); }, 3000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await loginUser(username, password);
    if (res.success) {
      setUser(res.user);
      const status = await getTodayStatus(res.user.id);
      setTodayStatus(status);
      showToast(`Selamat datang kembali, ${res.user.name}!`);
      setUsername('');
      setPassword('');
      if (res.user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      showToast(res.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regUsername || !regPassword) {
      showToast("Semua field wajib diisi!");
      return;
    }

    const res = await registerUser({
      name: regName,
      username: regUsername,
      password: regPassword,
      position: regPosition
    });

    if (res.success) {
      showToast("Pendaftaran sukses! Silakan login.");
      setAuthMode('login');
      setUsername(regUsername);
      setPassword('');
      setRegName('');
      setRegUsername('');
      setRegPassword('');
      setRegPosition('Staff');
    } else {
      showToast(res.message);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setTodayStatus(null);
    showToast("Berhasil keluar dari akun.");
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('mabsensi_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const refreshStatus = async () => {
    if (user) {
      const status = await getTodayStatus(user.id);
      setTodayStatus(status);
    }
  };

  if (loading) {
    return (
      <div className="phone-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="app-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p className="text-muted">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="phone-wrapper" style={{ justifyContent: 'center' }}>
        {toast && <div className="toast">{toast}</div>}

        <div className="app-screen auth-container" style={{ paddingBottom: 24 }}>
          <div className="auth-header">
            <div className="brand-logo" style={{ margin: '0 auto 16px auto', width: 56, height: 56, borderRadius: 16 }}>
              <Smartphone size={28} />
            </div>
            <h1 className="auth-title">M-Absensi</h1>
            <p className="auth-subtitle">Sistem Absensi Karyawan Berbasis GPS</p>
          </div>

          <div className="card glass-card" style={{ width: '100%' }}>
            <div className="tab-container" style={{ marginBottom: 20 }}>
              <button
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <div className="input-wrapper">
                    <User className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="karyawan / admin"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      type="password"
                      placeholder="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  Masuk Ke Akun
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <div className="input-wrapper">
                    <Sparkles className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      className="form-input"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Username Baru</label>
                  <div className="input-wrapper">
                    <User className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="Username unik"
                      className="form-input"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Jabatan / Posisi</label>
                  <div className="input-wrapper">
                    <Briefcase className="input-icon" size={16} />
                    <input
                      type="text"
                      placeholder="Contoh: Staff, Manager"
                      className="form-input"
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      className="form-input"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  Daftarkan Akun
                </button>
              </form>
            )}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p>Akun Demo Default:</p>
            <p style={{ marginTop: 4 }}>Karyawan: <strong>karyawan</strong> / <strong>password</strong></p>
            <p>Admin: <strong>admin</strong> / <strong>password</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-wrapper">
      {toast && <div className="toast">{toast}</div>}

      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Smartphone size={20} />
          </div>
          <span className="brand-name">M-Absensi</span>
        </div>

        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
          {user.role === 'admin' ? 'Akses Admin' : 'Akses Karyawan'}
        </span>
      </header>

      <main className="app-screen">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onOpenAttendance={(type) => setShowAttendance(type)}
            todayStatus={todayStatus}
            refreshStatus={refreshStatus}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {activeTab === 'history' && (
          <History user={user} />
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPanel onShowToast={showToast} />
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Clock size={20} />
          <span>Absen</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Calendar size={20} />
          <span>Riwayat</span>
        </button>

        {user.role === 'admin' && (
          <button
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Shield size={20} />
            <span>Admin</span>
          </button>
        )}
      </nav>

      {showAttendance && (
        <AttendanceModal
          type={showAttendance}
          user={user}
          onClose={() => setShowAttendance(null)}
          onShowToast={showToast}
          onSuccess={refreshStatus}
        />
      )}
    </div>
  );
}
