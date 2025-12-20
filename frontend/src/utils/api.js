import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, 
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("authToken", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("authToken");
  }
};

export const loadAuthToken = () => {
  const token = localStorage.getItem("authToken");
  if (token) setAuthToken(token);
  return token;
};

api.interceptors.request.use(
  (config) => {
    const token = authToken || localStorage.getItem("authToken");
    if (token && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";
    const isLoginRequest = url.includes("/login") || url.includes("/auth/login");
    const isHealthCheck = url.includes("/health");

    if ((status === 401 || status === 403) && !isHealthCheck && !isLoginRequest) {
      setAuthToken(null);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export const signup = async (email, password, name, currentRole, targetRole, location) => {
  const res = await api.post("/api/auth/signup", {
    email,
    password,
    name,
    current_role: currentRole,
    target_role: targetRole,
    location: location,
  });
  return res.data;
};

export async function loginPassword(email, password) {
  const payload = { email, password };
  const res = await api.post("/api/auth/login_password", payload);
  return res.data;
}

export async function loginOtp(temp_token, otp) {
  const payload = { temp_token, otp };
  const res = await api.post("/api/auth/login_otp", payload);
  return res.data;
}

export async function resendOtp(email) {
  const payload = { email };
  const res = await api.post("/api/auth/resend-otp", payload);
  return res.data;
}

export async function forgotPassword(email) {
  const payload = { email };
  const res = await api.post("/api/auth/forgot-password", payload);
  return res.data;
}

export async function resetPassword(email, temp_token, otp, new_password) {
  const payload = { email, temp_token, otp, new_password };
  const res = await api.post("/api/auth/reset-password", payload);
  return res.data;
}

export const verifyToken = async () => {
  const res = await api.get("/api/auth/verify");
  return res.data;
};

export const getUserProfile = async () => {
  const res = await api.get("/api/user/profile");
  return res.data;
};

export const updateUserProfile = async (data) => {
  const res = await api.put("/api/user/profile", data);
  return res.data;
};


export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);             
  const res = await api.post('/api/user/upload/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }, 
  });
  return res.data;
};

export const importLinkedInData = async (data) => {
  const res = await api.post('/api/user/upload/linkedin', { text: data });
  return res.data;
};

export const getSkills = async () => {
  const res = await api.get('/api/skills/list');
  return res.data;
};

export const getMentors = async () => {
  const res = await api.get('/api/mentor/match');
  return res.data;
};

export const checkSystemHealth = async () => {
  try {
    await api.get('/api/health', { timeout: 5000 }); 
    return true;
  } catch (e) {
    return false;
  }
};

export const getHealth = async () => {
  const res = await api.get('/api/health');
  return res.data;
};

export const getSkillsDashboard = async (targetRole) => {
  const res = await api.get(`/api/skills/dashboard?target_role=${targetRole}`);
  return res.data;
};

export const getParsedResume = async (userId) => {
  try {
    const res = await api.get(`/api/resume/parsed/${userId}`);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch parsed resume:", err);
    return null;
  }
};

export const getLearningResources = async () => {
  const res = await fetch("http:/127.0.0.1:8000/api/learning/resources");
  if (!res.ok) throw new Error("Failed to fetch roadmap");
  return res.json();
};

export const getResumeRoadmap = async () => {
  try {
    const res = await api.get("/api/roadmap/resume/roadmap");
    return res.data;
  } catch (err) {
    console.warn("⚠️ No saved roadmap found in resume table:", err);
    return null;
  }
};

export const generateRoadmap = async (targetRole, timelineMonths = 6, careerLevel = "Entry-level", location = null, resumeId = null) => {
  const res = await api.post("/api/roadmap/generate", {
    target_role: targetRole,
    timeline_months: timelineMonths,
    career_level: careerLevel,
    location: location,
    resume_id: resumeId ? parseInt(resumeId) : null 
  });
  return res.data;
};

export const getRoadmaps = async () => {
  const res = await api.get("/api/roadmap/list");
  return res.data;
};

export const getRoadmapDetail = async (id) => {
  const res = await api.get(`/api/roadmap/${id}`);
  return res.data;
};

export const updateProgress = async (roadmap_id, percent) => {
  const res = await api.put(`/api/roadmap/progress/${roadmap_id}/${percent}`);
  return res.data;
};

export const deleteRoadmap = async (roadmap_id) => {
  const res = await api.delete(`/api/roadmap/${roadmap_id}`);
  return res.data;
};

export const deleteResumeById = async (resume_id) => {
  const res = await api.delete(`/api/user/resume/delete/${resume_id}`);
  return res.data;
};

export const getResumeHistory = async () => {
  const res = await api.get("/api/user/resume/history");
  return res.data;
};

export const loadResumeById = async (resume_id) => {
  const res = await api.get(`/api/user/resume/load/${resume_id}`);
  if (res.data?.parsed_json && typeof res.data.parsed_json === "string") {
    try {
      res.data.parsed_json = JSON.parse(res.data.parsed_json);
    } catch {
      res.data.parsed_json = {};
    }
  }
  return res.data;
};

export const updateRoadmapContent = async (roadmap_id, fullJson, percent) => {
  const res = await api.put(`/api/roadmap/${roadmap_id}/update_content`, {
    roadmap_json: fullJson,
    completion_percentage: percent
  });
  return res.data;
};

export async function getMockReport(sessionId) {
  const res = await api.get(`/api/mock-interview/${sessionId}/report`);
  return res.data;
}

export async function getMockHistory() {
  const res = await api.get("/api/mock-interview/history");
  return res.data;
}

export async function deleteMockSession(sessionId) {
  const res = await api.delete(`/api/mock-interview/${sessionId}`);
  return res.data;
}


export async function startMockInterview(payload) {
  const res = await api.post("/api/mock-interview/start", payload);
  return res.data;
}


export async function sendMockAnswer(sessionId, answerText, options = {}) {
  const payload = {
    answer: answerText,
    interviewer_name: "Interviewer",
    elapsed_seconds: options.elapsed_seconds || 0,
    skipped: options.skipped || false,
    penalty_seconds: options.penalty_seconds || 0,
  };

  const res = await api.post(`/api/mock-interview/${sessionId}/answer`, payload);
  return res.data;
}


export async function transcribeMockAudio(formData) {
  const res = await api.post(
    "/api/mock-interview/transcribe-audio",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}