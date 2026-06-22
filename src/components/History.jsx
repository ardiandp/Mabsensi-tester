import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Eye, Camera } from 'lucide-react';
import { getEmployeeAttendance } from '../utils/mockData';

export default function History({ user }) {
  const [logs, setLogs] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    setLogs(getEmployeeAttendance(user.id));
  }, [user]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { 
      weekday: "short", 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
  };

  return (
    <div className="history-view">
      <div className="section-title">Riwayat Kehadiran</div>
      
      {logs.length === 0 ? (
        <div className="card text-muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Calendar size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <p>Belum ada riwayat absensi.</p>
        </div>
      ) : (
        <div className="history-list">
          {logs.map((log) => (
            <div key={log.id} className="history-item">
              <div className="history-date-info">
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatDate(log.date)}</p>
                <div className="history-times">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    Masuk: <strong>{log.checkInTime}</strong>
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Pulang: <strong>{log.checkOutTime || '--:--'}</strong>
                  </span>
                </div>
                {log.notes && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 4, fontWeight: 500 }}>
                    * {log.notes}
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span className={`badge ${log.status === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}`}>
                  {log.status}
                </span>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  {log.checkInPhoto && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setActivePhoto(log.checkInPhoto)}
                      style={{ width: 28, height: 28, border: 'none', backgroundColor: 'var(--bg-app)' }}
                      title="Lihat Selfie Masuk"
                    >
                      <Camera size={12} />
                    </button>
                  )}
                  {log.checkOutPhoto && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setActivePhoto(log.checkOutPhoto)}
                      style={{ width: 28, height: 28, border: 'none', backgroundColor: 'var(--bg-app)' }}
                      title="Lihat Selfie Pulang"
                    >
                      <Camera size={12} style={{ color: 'var(--danger)' }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
