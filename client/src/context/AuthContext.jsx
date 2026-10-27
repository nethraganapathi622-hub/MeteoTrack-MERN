import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('meteotrack-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        try {
          const res = await api.get('/auth/me');
          setUser(prev => ({ ...prev, ...res.data.data }));
        } catch (err) {
          console.error("Token invalid or expired", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const userData = res.data.data;
      localStorage.setItem('meteotrack-user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      let msg = 'Login failed';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (typeof err.response?.data === 'string') {
        msg = err.response.data; // For express-rate-limit text responses
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('meteotrack-user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
