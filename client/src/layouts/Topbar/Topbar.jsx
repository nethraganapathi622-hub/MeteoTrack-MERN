import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import socketService from '../../services/socketService';
import styles from './Topbar.module.css';

const Topbar = ({ toggleSidebar, isMobile }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!user) return;
    
    const fetchAlertSummary = async () => {
      try {
        const res = await api.get('/alerts/summary');
        if (res.data.success && res.data.data && isMounted) {
          const { active, acknowledged } = res.data.data;
          setAlertCount(active + acknowledged);
        }
      } catch (err) {
        console.error('Failed to fetch alert summary', err);
      }
    };
    
    fetchAlertSummary();
    
    socketService.connect();
    socketService.joinGlobal();
    
    socketService.subscribeToAlertNew(fetchAlertSummary);
    socketService.subscribeToAlertUpdate(fetchAlertSummary);

    return () => {
      isMounted = false;
      socketService.unsubscribeFromAlertNew(fetchAlertSummary);
      socketService.unsubscribeFromAlertUpdate(fetchAlertSummary);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {isMobile && (
          <button className={styles.iconBtn} onClick={toggleSidebar}>
            <Menu size={20} />
          </button>
        )}
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search stations, sensors..." 
            className={styles.searchInput}
          />
        </div>
      </div>
      
      <div className={styles.right}>
        <div className={styles.liveIndicator}>
          <span className={styles.pulse}></span>
          <span className={styles.liveText}>LIVE</span>
        </div>
        
        <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <button className={styles.iconBtn} onClick={() => navigate('/alerts')} title="Notifications">
          <Bell size={20} />
          {alertCount > 0 && <span className={styles.badge}>{alertCount > 99 ? '99+' : alertCount}</span>}
        </button>
        
        <div className={styles.divider}></div>
        
        <div className={styles.profileBtn}>
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <span className={styles.profileName}>{user ? user.name : 'Guest'}</span>
        </div>
        
        <button className={styles.iconBtn} onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
