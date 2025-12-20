import { createContext, useContext, useState, useEffect } from "react";
import { verifyToken, getUserProfile, loadAuthToken, setAuthToken } from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = loadAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        let userData = await verifyToken();
        if (!userData?.email) {
          userData = await getUserProfile();
        }
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Token verification failed:", err);
        setAuthToken(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Login: token & userData
  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Logout
  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);