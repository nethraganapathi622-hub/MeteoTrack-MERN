import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import Stations from './pages/Stations/Stations';
import Sensors from './pages/Sensors/Sensors';
import LiveMonitoring from './pages/LiveMonitoring/LiveMonitoring';

const PlaceholderPage = ({ title }) => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
    <h2>{title}</h2>
    <p>This module will be implemented in future phases.</p>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="stations" element={<Stations />} />
              <Route path="live" element={<LiveMonitoring />} />
              <Route path="map" element={<PlaceholderPage title="Interactive Map" />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="analytics" element={<PlaceholderPage title="Historical Analytics" />} />
              <Route path="alerts" element={<PlaceholderPage title="Alert Configuration" />} />
              <Route path="maintenance" element={<PlaceholderPage title="Maintenance Tracking" />} />
              <Route path="settings" element={<PlaceholderPage title="System Settings" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
