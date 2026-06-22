const API_BASE = '/api';

let token = localStorage.getItem('mabsensi_token');

export const setToken = (t) => {
  token = t;
  if (t) {
    localStorage.setItem('mabsensi_token', t);
  } else {
    localStorage.removeItem('mabsensi_token');
  }
};

const request = async (endpoint, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

export const loginUser = async (username, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  return { success: true, user: data.user };
};

export const registerUser = async (userData) => {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  return { success: true, user: data.user };
};

export const logoutUser = () => {
  setToken(null);
};

export const getSession = async () => {
  if (!token) return null;
  try {
    const data = await request('/auth/session');
    return data.user;
  } catch {
    setToken(null);
    return null;
  }
};

export const checkIn = async (userId, photo, lat, lng) => {
  try {
    const data = await request('/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify({ photo, lat, lng })
    });
    return { success: true, log: data.log };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const checkOut = async (userId, photo, lat, lng) => {
  try {
    const data = await request('/attendance/checkout', {
      method: 'POST',
      body: JSON.stringify({ photo, lat, lng })
    });
    return { success: true, log: data.log };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const getTodayStatus = async (userId) => {
  try {
    const data = await request('/attendance/today');
    return data.log;
  } catch {
    return null;
  }
};

export const getEmployeeAttendance = async (userId) => {
  const data = await request('/attendance');
  return data.logs;
};

export const getAdminStats = async () => {
  const data = await request('/attendance/stats');
  return data.stats;
};

export const getOfficeConfig = async () => {
  const data = await request('/office');
  return data.config;
};

export const updateOfficeConfig = async (config) => {
  const data = await request('/office', {
    method: 'PUT',
    body: JSON.stringify(config)
  });
  return data.config;
};
