import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";

const AuthContext = createContext();

const DEMO_USERS = {
  builder: {
    _id: "b70da6c21a0d436aabc",
    id: "b70da6c21a0d436aabc",
    name: "Arpit Sachdeva (Builder)",
    email: "arpitsa@gmail.com",
    role: "builder",
    phone: "+91 9876543210"
  },
  supervisor: {
    _id: "330a949d1a0d435a9fe",
    id: "330a949d1a0d435a9fe",
    name: "Ramesh Munshi (Supervisor)",
    email: "wsd@gmail.com",
    role: "supervisor",
    phone: "+91 9812345678"
  },
  labour: {
    _id: "7e867de51a0d416ef82",
    id: "7e867de51a0d416ef82",
    name: "Arpit Sachdeva (Worker)",
    email: "arpitsachdeva9999@gmail.com",
    role: "labour",
    skill: "Mason",
    phone: "+918572092552"
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("buildtrack_user") || localStorage.getItem("road_ai_user");
    return saved ? JSON.parse(saved) : DEMO_USERS.builder;
  });
  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const userData = res.data;
      const token = userData.token;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("road_ai_token", token);
      }
      localStorage.setItem("buildtrack_user", JSON.stringify(userData));
      localStorage.setItem("road_ai_user", JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      // Check if matches demo credentials
      if (email === "builder@buildtrack.com" || email === "arpitsa@gmail.com") {
        return switchDemoRole("builder");
      }
      if (email === "supervisor@buildtrack.com" || email === "wsd@gmail.com") {
        return switchDemoRole("supervisor");
      }
      if (email === "labour@buildtrack.com" || email === "arpitsachdeva9999@gmail.com") {
        return switchDemoRole("labour");
      }
      throw err;
    }
  };

  const register = async (formData) => {
    const res = await api.post("/auth/register", formData);
    const userData = res.data;
    const token = userData.token;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("road_ai_token", token);
    }
    localStorage.setItem("buildtrack_user", JSON.stringify(userData));
    localStorage.setItem("road_ai_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const switchDemoRole = async (targetRole) => {
    try {
      const res = await api.post("/auth/demo", { role: targetRole });
      const userData = res.data;
      if (userData.token) {
        localStorage.setItem("token", userData.token);
        localStorage.setItem("road_ai_token", userData.token);
      }
      localStorage.setItem("buildtrack_user", JSON.stringify(userData));
      localStorage.setItem("road_ai_user", JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (e) {
      console.warn("Demo API fallback:", e);
      const targetUser = DEMO_USERS[targetRole] || DEMO_USERS.builder;
      localStorage.setItem("buildtrack_user", JSON.stringify(targetUser));
      localStorage.setItem("road_ai_user", JSON.stringify(targetUser));
      setUser(targetUser);
      return targetUser;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("road_ai_token");
    localStorage.removeItem("buildtrack_user");
    localStorage.removeItem("road_ai_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        login,
        register,
        logout,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
