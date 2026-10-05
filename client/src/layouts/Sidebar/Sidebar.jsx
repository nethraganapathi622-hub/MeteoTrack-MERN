import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Radio, 
  Activity, 
  Thermometer, 
  BarChart2, 
  BellRing, 
  Wrench, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'stations', label: 'Stations', icon: Radio, path: '/stations' },
  { id: 'live', label: 'Live Monitoring', icon: Activity, path: '/live' },
  { id: 'map', label: 'Map View', icon: MapIcon, path: '/map' },
  { id: 'sensors', label: 'Sensors', icon: Thermometer, path: '/sensors' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { id: 'alerts', label: 'Alerts', icon: BellRing, path: '/alerts' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/maintenance' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div className={styles.overlay} onClick={toggleSidebar} />
      )}
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed} ${isMobile ? styles.mobile : ''}`}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <div className={styles.logoIcon}><Activity size={20} /></div>
            {isOpen && <span className={styles.logoText}>MeteoTrack</span>}
          </div>
          {!isMobile && (
            <button className={styles.collapseBtn} onClick={toggleSidebar}>
              {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.id} className={styles.navItem}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                  title={!isOpen ? item.label : undefined}
                >
                  <item.icon size={20} className={styles.navIcon} />
                  {isOpen && <span className={styles.navLabel}>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className={styles.footer}>
          {isOpen ? (
            <div className={styles.versionInfo}>
              <span className={styles.version}>v1.0.0-beta</span>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
