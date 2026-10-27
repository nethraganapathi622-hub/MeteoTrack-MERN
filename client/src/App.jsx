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
import Alerts from './pages/Alerts/Alerts';
import MapView from './pages/Map/Map';
import Analytics from './pages/Analytics/Analytics';
import Maintenance from './pages/Maintenance/Maintenance';
import Settings from './pages/Settings/Settings';

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
              <Route path="map" element={<MapView />} />
              <Route path="sensors" element={<Sensors />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="maintenance" element={<Maintenance />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
