import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Settings, 
  Calendar, 
  Clock, 
  Check, 
  Camera, 
  Search, 
  Navigation,
  Save,
  AlertCircle
} from 'lucide-react';
import { getAdminStats, getOfficeConfig, updateOfficeConfig } from '../utils/mockData';

export default function AdminPanel({ onShowToast }) {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'settings'
  const [stats, setStats] = useState(null);
  
  // Office settings state
  const [officeName, setOfficeName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  
  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  const refreshData = () => {
    const adminStats = getAdminStats();
    setStats(adminStats);
    
    const config = getOfficeConfig();
    setOfficeName(config.name);
    setLatitude(config.latitude.toString());
    setLongitude(config.longitude.toString());
    setRadius(config.radius.toString());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const radNum = parseInt(radius);
    
    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radNum)) {
      onShowToast("Format input koordinat / radius salah!");
      return;
    }
    
    updateOfficeConfig({
      name: officeName,
      latitude: latNum,
      longitude: lngNum,
      radius: radNum
    });
    
    onShowToast("Konfigurasi kantor berhasil diperbarui!");
    refreshData();
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      onShowToast("Geolocation tidak didukung browser ini.");
      return;
    }
    
    onShowToast("Mendeteksi lokasi Anda...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        onShowToast("Koordinat berhasil disesuaikan dengan GPS Anda!");
      },
      (err) => {
        onShowToast("Gagal mengambil lokasi GPS. Masukkan manual.");
      },
      { enableHighAccuracy: true }
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
  };

  if (!stats) return <p className="text-muted">Loading...</p>;

  // Filter logs by search term
  const filteredLogs = stats.logs.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-view">
      <div className="section-title">Panel Admin</div>

      {/* Tabs */}
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <Calendar size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Laporan
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Pengaturan
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div>
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card stat-card-blue">
              <div>
                <div className="stat-value">{stats.totalEmployees}</div>
                <div className="stat-label">Total Karyawan</div>
              </div>
            </div>
            
            <div className="stat-card stat-card-green">
              <div>
                <div className="stat-value">{stats.checkedInToday}</div>
                <div className="stat-label">Hadir Hari Ini</div>
              </div>
            </div>

            <div className="stat-card stat-card-orange">
              <div>
                <div className="stat-value">{stats.lateToday}</div>
                <div className="stat-label">Terlambat</div>
              </div>
            </div>

            <div className="stat-card stat-card-red">
              <div>
                <div className="stat-value">{stats.absentToday}</div>
                <div className="stat-label">Absen/Tidak Hadir</div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <div className="input-wrapper">
              <Search className="input-icon" size={16} />
              <input 
                type="text" 
                placeholder="Cari karyawan atau status..." 
                className="form-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Logs List */}
          <div className="section-title" style={{ fontSize: '0.95rem' }}>
            <span>Log Kehadiran Semua</span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{filteredLogs.length} Entri</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="card text-muted" style={{ textAlign: 'center', padding: '30px 10px' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <p>Tidak ditemukan data absensi.</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="admin-log-item">
                <div className="admin-log-user">
                  <img src={log.userAvatar} alt={log.userName} className="avatar" style={{ width: 36, height: 36 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{log.userName}</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{log.userPosition}</p>
                  </div>
                  <span className={`badge ${log.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}`}>
                    {log.status}
                  </span>
                </div>

                <div className="admin-log-details">
                  <div>
                    <span className="text-muted">Tanggal: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{formatDate(log.date)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Jarak Check-in: </span>
                    <strong style={{ color: log.isOutOfRangeCheckIn ? 'var(--danger)' : 'var(--success)' }}>
                      {log.distanceCheckIn}m
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted">Check-in: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{log.checkInTime}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Check-out: </span>
                    <strong style={{ color: 'var(--text-main)' }}>{log.checkOutTime || '--:--'}</strong>
                  </div>
                </div>

                {/* Selfie Previews */}
                <div style={{ display: 'flex', gap: 10, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {log.checkInPhoto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img 
                        src={log.checkInPhoto} 
                        alt="Check In" 
                        className="admin-log-photo"
                        onClick={() => setActivePhoto(log.checkInPhoto)}
                      />
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Selfie Masuk</span>
                    </div>
                  )}
                  {log.checkOutPhoto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img 
                        src={log.checkOutPhoto} 
                        alt="Check Out" 
                        className="admin-log-photo"
                        onClick={() => setActivePhoto(log.checkOutPhoto)}
                      />
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>Selfie Pulang</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Settings Tab */
        <div className="card">
          <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Koordinat Radius Kantor</h4>
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Nama Lokasi Kantor</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: 14 }}
                value={officeName} 
                onChange={(e) => setOfficeName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: 14 }}
                value={latitude} 
                onChange={(e) => setLatitude(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: 14 }}
                value={longitude} 
                onChange={(e) => setLongitude(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Radius Kehadiran (meter)</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ paddingLeft: 14 }}
                value={radius} 
                onChange={(e) => setRadius(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={useCurrentLocation}>
                <Navigation size={16} />
                Gunakan Lokasi Saya Saat Ini
              </button>
              
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {activePhoto && (
        <div className="photo-viewer-modal" onClick={() => setActivePhoto(null)}>
          <img src={activePhoto} alt="Absensi Selfie" className="photo-viewer-img" />
          <button className="photo-viewer-close">Tutup</button>
        </div>
      )}
    </div>
  );
}
