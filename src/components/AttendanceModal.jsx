import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { checkIn, checkOut, getOfficeConfig } from '../services/api';
import { calculateDistance } from '../utils/mockData';

export default function AttendanceModal({ type, user, onClose, onShowToast, onSuccess }) {
  const [step, setStep] = useState(1);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locStatus, setLocStatus] = useState("Mencari lokasi GPS...");
  const [locInRange, setLocInRange] = useState(false);
  const [locLoading, setLocLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [office, setOffice] = useState({ latitude: -6.2008406, longitude: 106.8273081, radius: 100 });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadOffice = async () => {
      try {
        const config = await getOfficeConfig();
        setOffice(config);
      } catch {
        // use defaults
      }
    };
    loadOffice();
  }, []);

  useEffect(() => {
    if (step === 1 && !photo) {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [step, photo]);

  useEffect(() => {
    if (step === 2) {
      getGPSLocation();
    }
  }, [step]);

  const startCamera = async () => {
    try {
      setCameraError(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (cameraError) {
      const simulatedPhoto = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400`;
      setPhoto(simulatedPhoto);
      setStep(2);
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      stopCamera();
      setStep(2);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setStep(1);
  };

  const getGPSLocation = () => {
    setLocLoading(true);
    setLocStatus("Mendeteksi lokasi...");

    if (!navigator.geolocation) {
      setLocStatus("Geolocation tidak didukung oleh browser ini.");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        const inRange = distance <= office.radius;

        setCoords({ lat: latitude, lng: longitude, distance });
        setLocInRange(inRange);
        setLocLoading(false);
        setLocStatus(`Berhasil. Jarak ke kantor: ±${Math.round(distance)} meter.`);
      },
      () => {
        setTimeout(() => {
          const latOffset = (Math.random() - 0.5) * 0.0005;
          const lngOffset = (Math.random() - 0.5) * 0.0005;
          const simLat = office.latitude + latOffset;
          const simLng = office.longitude + lngOffset;

          const distance = calculateDistance(simLat, simLng, office.latitude, office.longitude);
          const inRange = distance <= office.radius;

          setCoords({ lat: simLat, lng: simLng, distance });
          setLocInRange(inRange);
          setLocLoading(false);
          setLocStatus(`GPS Simulator: Berhasil mendeteksi lokasi simulasi (±${Math.round(distance)}m dari kantor).`);
        }, 1200);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const submitAttendance = async () => {
    setIsSubmitting(true);

    const lat = coords ? coords.lat : office.latitude;
    const lng = coords ? coords.lng : office.longitude;

    let res;
    if (type === 'in') {
      res = await checkIn(user.id, photo, lat, lng);
    } else {
      res = await checkOut(user.id, photo, lat, lng);
    }

    setIsSubmitting(false);

    if (res.success) {
      setStep(3);
      onShowToast(`Absen ${type === 'in' ? 'Masuk' : 'Pulang'} berhasil dicatat!`);
    } else {
      onShowToast(res.message);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            Absen {type === 'in' ? 'Masuk' : 'Pulang'}
          </h3>
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', background: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {step === 1 && (
          <div>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              Silakan ambil foto selfie untuk verifikasi wajah.
            </p>

            <div className="camera-preview">
              {cameraError ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <AlertTriangle size={32} style={{ color: 'var(--warning)', marginBottom: 8 }} />
                  <p style={{ fontSize: '0.85rem' }}>Kamera tidak terdeteksi / izin ditolak.</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    Aplikasi akan menggunakan foto simulasi untuk melanjutkan testing.
                  </p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline className="camera-video" />
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button className="btn btn-primary" onClick={capturePhoto}>
              <Camera size={18} />
              {cameraError ? 'Gunakan Foto Simulasi' : 'Ambil Selfie'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              Verifikasi lokasi kantor Anda.
            </p>

            {photo && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <img src={photo} alt="Selfie" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--primary)' }} />
              </div>
            )}

            <div className="geo-status">
              <MapPin size={18} style={{ color: locLoading ? 'var(--primary)' : locInRange ? 'var(--success)' : 'var(--danger)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '0.8rem' }}>Koordinat Lokasi</p>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>{locStatus}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={retakePhoto} style={{ flex: 1 }} disabled={isSubmitting}>
                <RotateCcw size={16} />
                Foto Ulang
              </button>

              <button
                className="btn btn-primary"
                onClick={submitAttendance}
                style={{ flex: 1.5 }}
                disabled={locLoading || isSubmitting}
              >
                {isSubmitting ? 'Memproses...' : 'Kirim Absen'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={60} style={{ color: 'var(--success)', marginBottom: 16 }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Absensi Berhasil!</h4>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Data absensi {type === 'in' ? 'Masuk' : 'Pulang'} Anda telah berhasil dicatat ke sistem.
            </p>

            <button className="btn btn-primary" onClick={() => { onSuccess(); onClose(); }}>
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
