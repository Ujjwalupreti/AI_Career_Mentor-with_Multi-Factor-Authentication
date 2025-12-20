import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { checkSystemHealth } from "./utils/api";
import { Loader2, ServerCrash, Power } from "lucide-react";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PathBuilderPage from "./pages/PathBuilderPage";
import LearningHubPage from "./pages/LearningHubPage";

const ServerBootup = ({ onReady }) => {
  const [status, setStatus] = useState("checking");
  const [retryCount, setRetryCount] = useState(0);

  React.useEffect(() => {
    let mounted = true;
    let timeoutId;
    const checkServer = async () => {
      const isUp = await checkSystemHealth();
      if (!mounted) return;
      if (isUp) {
        onReady();
      } else {
        const delay = retryCount > 5 ? 3000 : 1500;
        setStatus(retryCount > 58 ? "error" : "checking");
        setRetryCount((prev) => prev + 1);
        timeoutId = setTimeout(checkServer, delay);
      }
    };
    checkServer();
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [retryCount, onReady]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-6">
        <ServerCrash size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Server Unreachable</h2>
        <button onClick={() => setRetryCount(0)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto">
          <Power size={20} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-gray-800">Initializing AI Engine</h2>
      <p className="text-gray-500 mt-2 animate-pulse">Attempt {retryCount + 1}...</p>
    </div>
  );
};

const AppShell = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isPublicPage = location.pathname === "/" || location.pathname === "/login";

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 size={40} className="text-gray-400 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verifying session...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {!isPublicPage && <Navbar />}

      <main className={`min-h-screen transition-all duration-300 ${isPublicPage ? "w-full p-0" : "lg:ml-72 p-8 w-auto"}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/pathbuilder" element={isAuthenticated ? <PathBuilderPage /> : <Navigate to="/login" />} />
          <Route path="/learning" element={isAuthenticated ? <LearningHubPage /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  const [serverReady, setServerReady] = useState(false);
  if (!serverReady) return <ServerBootup onReady={() => setServerReady(true)} />;

  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}