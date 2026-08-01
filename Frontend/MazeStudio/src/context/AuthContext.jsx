import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    try {
      const data = await apiRequest("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function login(email, password, stayLogged = false, invitationToken = null) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, stayLogged, invitationToken }),
  });

  localStorage.setItem("token", data.token);
  setUser(data.user);

  return data.user;
}

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(loadUser, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
