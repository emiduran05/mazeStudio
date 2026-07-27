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

  async function login(email, password, stayLogged = false) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, stayLogged }),
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
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}