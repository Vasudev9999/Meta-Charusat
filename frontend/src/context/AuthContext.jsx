import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // On every app load, clear any persisted session.
  useEffect(() => {
    localStorage.removeItem("user");
  }, []);

  const [user, setUser] = useState(null);

  const login = (userData) => {
    // We store the user temporarily (and clear it on reload)
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};