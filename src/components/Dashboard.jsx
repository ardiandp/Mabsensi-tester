import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  UserCheck,
  LogOut,
  Camera,
  Calendar,
  Briefcase,
  Moon,
  Sun,
  Shield
} from 'lucide-react';
import { getOfficeConfig } from '../services/api';
import { calculateDistance } from '../utils/mockData';

export default function Dashboard({ user, onLogout, onOpenAttendance, todayStatus, refreshStatus, theme, toggleTheme }) {
  const [time, setTime] = useState(new Date());
  const [distanceInfo, setDistanceInfo] = useState({ distance: null, inRange: false });
  const [locLoading, setLocLoading] = useState(true);
  const [office, setOffice] = useState({ name: 'Memuat...', latitude: 0, longitude: 0, radius: 100 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadOffice = async () => {
      try {
        const config = await getOfficeConfig();
        setOffice(config);
      } catch {
        setOffice({ name: 'Kantor Pusat Jakarta', latitude: -6.2008406, longitude: 106.8273081, radius: 100 });
      }
    };
    loadOffice();
  }, [todayStatus]);

  useEffect(() => {
    if (!navigator.geolocation || office.latitude === 0) {
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        setDistanceInfo({
          distance: Math.round(dist),
          inRange: dist <= office.radius
        });
        setLocLoading(false);
      },
      (err) => {
        console.error("GPS Error", err);
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [todayStatus, office.latitude, office.longitude, office.radius]);

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div className="dashboard-view">
      <div className="user-profile card">
        <img
          src={user.avatar}
          alt={user.name}
          className="avatar"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" }}
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Briefcase size={12} className="text-muted" />
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{user.position}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {user.role === 'admin' && (
            <button className="icon-btn" title="Admin Panel" style={{ color: 'var(--primary)' }}>
              <Shield size={18} />
            </button>
          )}
          <button className="icon-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="icon-btn" onClick={onLogout} style={{ color: 'var(--danger)' }} title="Keluar">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="card clock-container" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
        <Clock size={28} style={{ color: 'var(--primary)', marginBottom: 8 }} />
        <div className="digital-clock">{formatTime(time)}</div>
        <div className="digital-date">{formatDate(time)}</div>
        <div style={{ marginTop: 12 }}>
          {todayStatus ? (
            <span className={`badge ${todayStatus.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}`}>
              Hari Ini: {todayStatus.status}
            </span>
          ) : (
            <span className="badge badge-danger">Belum Absen Hari Ini</span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">
          <span>Lokasi Anda</span>
          <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>GPS Aktif</span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            backgroundColor: distanceInfo.inRange ? 'var(--success-light)' : 'var(--danger-light)',
            color: distanceInfo.inRange ? 'var(--success)' : 'var(--danger)',
            padding: 10,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MapPin size={22} />
          </div>

          <div style={{ flex: 1, fontSize: '0.85rem' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{office.name}</p>
            <p className="text-muted" style={{ marginTop: 2 }}>
              Radius Kantor: <strong>{office.radius} meter</strong>
            </p>
            {locLoading ? (
              <p style={{ color: 'var(--primary)', fontWeight: 500, marginTop: 4 }}>Mengukur jarak...</p>
            ) : distanceInfo.distance !== null ? (
              <p style={{
                color: distanceInfo.inRange ? 'var(--success)' : 'var(--danger)',
                fontWeight: 600,
                marginTop: 4
              }}>
                Jarak Anda: ±{distanceInfo.distance} meter ({distanceInfo.inRange ? 'Dalam Radius' : 'Di Luar Radius'})
              </p>
            ) : (
              <p style={{ color: 'var(--danger)', fontWeight: 500, marginTop: 4 }}>Gagal mendeteksi lokasi</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Aksi Absensi</div>

        <div className="attendance-grid">
          <div className="attendance-card">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>CHECK-IN</span>
            {todayStatus ? (
              <>
                <span className="attendance-time">{todayStatus.check_in_time}</span>
                <span style={{ fontSize: '0.7rem', color: todayStatus.is_out_of_range_check_in ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {todayStatus.is_out_of_range_check_in ? 'Luar Kantor' : 'Dalam Kantor'}
                </span>
              </>
            ) : (
              <>
                <span className="attendance-time" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>-- : --</span>
                <span style={{ fontSize: '0.7rem' }} className="text-muted">Belum absen</span>
              </>
            )}
          </div>

          <div className="attendance-card">
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>CHECK-OUT</span>
            {todayStatus && todayStatus.check_out_time ? (
              <>
                <span className="attendance-time">{todayStatus.check_out_time}</span>
                <span style={{ fontSize: '0.7rem', color: todayStatus.is_out_of_range_check_out ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {todayStatus.is_out_of_range_check_out ? 'Luar Kantor' : 'Dalam Kantor'}
                </span>
              </>
            ) : (
              <>
                <span className="attendance-time" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>-- : --</span>
                <span style={{ fontSize: '0.7rem' }} className="text-muted">Belum pulang</span>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {!todayStatus ? (
            <button
              className="btn btn-primary"
              onClick={() => onOpenAttendance('in')}
              disabled={!distanceInfo.inRange && distanceInfo.distance !== null}
              style={{
                opacity: !distanceInfo.inRange && distanceInfo.distance !== null ? 0.6 : 1,
                cursor: !distanceInfo.inRange && distanceInfo.distance !== null ? 'not-allowed' : 'pointer'
              }}
            >
              <Camera size={18} />
              Check-in Sekarang
            </button>
          ) : !todayStatus.check_out_time ? (
            <button
              className="btn btn-danger"
              onClick={() => onOpenAttendance('out')}
              disabled={!distanceInfo.inRange && distanceInfo.distance !== null}
              style={{
                opacity: !distanceInfo.inRange && distanceInfo.distance !== null ? 0.6 : 1,
                cursor: !distanceInfo.inRange && distanceInfo.distance !== null ? 'not-allowed' : 'pointer'
              }}
            >
              <Camera size={18} />
              Check-out Sekarang
            </button>
          ) : (
            <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: 14, borderRadius: 'var(--radius-md)' }}>
              <UserCheck size={16} />
              Kehadiran Hari Ini Selesai
            </div>
          )}

          {!distanceInfo.inRange && distanceInfo.distance !== null && !todayStatus?.check_out_time && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', textAlign: 'center', marginTop: 8, fontWeight: 500 }}>
              *Anda berada di luar radius kantor ({distanceInfo.distance}m). Tombol dinonaktifkan untuk mencegah kecurangan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
