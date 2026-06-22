// Mock Database with LocalStorage Support

const DEFAULT_OFFICE = {
  name: "Kantor Pusat Jakarta",
  latitude: -6.2008406, // Example: Jakarta Central
  longitude: 106.8273081,
  radius: 100 // in meters
};

const DEFAULT_USERS = [
  {
    id: "U001",
    username: "karyawan",
    name: "Ahmad Fauzi",
    role: "employee",
    position: "Software Engineer",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
  },
  {
    id: "U002",
    username: "admin",
    name: "Siti Rahma",
    role: "admin",
    position: "HR Manager",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  }
];

// Initialize LocalStorage Databases if not exists
const initDb = () => {
  if (!localStorage.getItem("mabsensi_users")) {
    // passwords are simulated as username for simplicity or standard "password123"
    const usersWithPassword = DEFAULT_USERS.map(u => ({ ...u, password: "password" }));
    localStorage.setItem("mabsensi_users", JSON.stringify(usersWithPassword));
  }
  if (!localStorage.getItem("mabsensi_attendance")) {
    localStorage.setItem("mabsensi_attendance", JSON.stringify([]));
  }
  if (!localStorage.getItem("mabsensi_office")) {
    localStorage.setItem("mabsensi_office", JSON.stringify(DEFAULT_OFFICE));
  }
};

initDb();

// Haversine formula to calculate distance between two coordinates in meters
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

export const getOfficeConfig = () => {
  return JSON.parse(localStorage.getItem("mabsensi_office")) || DEFAULT_OFFICE;
};

export const updateOfficeConfig = (config) => {
  localStorage.setItem("mabsensi_office", JSON.stringify(config));
  return config;
};

// Users management
export const getUsers = () => {
  return JSON.parse(localStorage.getItem("mabsensi_users")) || [];
};

export const loginUser = (username, password) => {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (user) {
    const session = { ...user };
    delete session.password; // remove password from session
    localStorage.setItem("mabsensi_session", JSON.stringify(session));
    return { success: true, user: session };
  }
  return { success: false, message: "Username atau password salah!" };
};

export const registerUser = (userData) => {
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
    return { success: false, message: "Username sudah terdaftar!" };
  }
  
  const newUser = {
    id: "U" + String(users.length + 1).padStart(3, "0"),
    ...userData,
    role: "employee", // default role is employee
    avatar: userData.avatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=150`
  };
  
  users.push(newUser);
  localStorage.setItem("mabsensi_users", JSON.stringify(users));
  return { success: true, user: newUser };
};

export const logoutUser = () => {
  localStorage.removeItem("mabsensi_session");
};

export const getSession = () => {
  const sessionStr = localStorage.getItem("mabsensi_session");
  return sessionStr ? JSON.parse(sessionStr) : null;
};

// Attendance Management
export const getAttendanceLogs = () => {
  return JSON.parse(localStorage.getItem("mabsensi_attendance")) || [];
};

export const getEmployeeAttendance = (userId) => {
  const logs = getAttendanceLogs();
  return logs.filter(log => log.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getTodayStatus = (userId) => {
  const logs = getAttendanceLogs();
  const todayStr = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const todayLog = logs.find(
    log => log.userId === userId && log.dateStr === todayStr
  );
  
  return todayLog || null;
};

export const checkIn = (userId, photo, lat, lng) => {
  const logs = getAttendanceLogs();
  const now = new Date();
  
  const dateStr = now.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  // Check if already checked in today
  if (logs.some(log => log.userId === userId && log.dateStr === dateStr)) {
    return { success: false, message: "Anda sudah melakukan Check-in hari ini!" };
  }
  
  // Calculate distance
  const office = getOfficeConfig();
  const distance = calculateDistance(lat, lng, office.latitude, office.longitude);
  const isOutOfRange = distance > office.radius;
  
  // Check if late (e.g. past 08:30)
  const limitTime = new Date();
  limitTime.setHours(8, 30, 0); // 08:30 AM
  const isLate = now > limitTime;
  
  const newLog = {
    id: "A" + String(logs.length + 1).padStart(5, "0"),
    userId,
    date: now.toISOString(),
    dateStr,
    checkInTime: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    checkOutTime: null,
    checkInPhoto: photo,
    checkOutPhoto: null,
    checkInLoc: { lat, lng },
    checkOutLoc: null,
    distanceCheckIn: Math.round(distance),
    distanceCheckOut: null,
    isOutOfRangeCheckIn: isOutOfRange,
    isOutOfRangeCheckOut: null,
    status: isLate ? "Terlambat" : "Tepat Waktu",
    notes: isOutOfRange ? "Absen di luar radius kantor" : ""
  };
  
  logs.push(newLog);
  localStorage.setItem("mabsensi_attendance", JSON.stringify(logs));
  return { success: true, log: newLog };
};

export const checkOut = (userId, photo, lat, lng) => {
  const logs = getAttendanceLogs();
  const now = new Date();
  
  const dateStr = now.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const logIndex = logs.findIndex(
    log => log.userId === userId && log.dateStr === dateStr
  );
  
  if (logIndex === -1) {
    return { success: false, message: "Anda belum melakukan Check-in hari ini!" };
  }
  
  if (logs[logIndex].checkOutTime) {
    return { success: false, message: "Anda sudah melakukan Check-out hari ini!" };
  }
  
  // Calculate distance
  const office = getOfficeConfig();
  const distance = calculateDistance(lat, lng, office.latitude, office.longitude);
  const isOutOfRange = distance > office.radius;
  
  logs[logIndex].checkOutTime = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  logs[logIndex].checkOutPhoto = photo;
  logs[logIndex].checkOutLoc = { lat, lng };
  logs[logIndex].distanceCheckOut = Math.round(distance);
  logs[logIndex].isOutOfRangeCheckOut = isOutOfRange;
  
  if (isOutOfRange) {
    logs[logIndex].notes += (logs[logIndex].notes ? "; " : "") + "Check-out di luar radius kantor";
  }
  
  localStorage.setItem("mabsensi_attendance", JSON.stringify(logs));
  return { success: true, log: logs[logIndex] };
};

export const getAdminStats = () => {
  const logs = getAttendanceLogs();
  const users = getUsers().filter(u => u.role !== "admin");
  const todayStr = new Date().toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const todayLogs = logs.filter(log => log.dateStr === todayStr);
  const totalEmployees = users.length;
  const checkedInToday = todayLogs.length;
  const lateToday = todayLogs.filter(log => log.status === "Terlambat").length;
  const absentToday = Math.max(0, totalEmployees - checkedInToday);
  
  return {
    totalEmployees,
    checkedInToday,
    lateToday,
    absentToday,
    logs: logs.map(log => {
      const user = getUsers().find(u => u.id === log.userId);
      return {
        ...log,
        userName: user ? user.name : "Unknown",
        userPosition: user ? user.position : "Unknown",
        userAvatar: user ? user.avatar : ""
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  };
};
