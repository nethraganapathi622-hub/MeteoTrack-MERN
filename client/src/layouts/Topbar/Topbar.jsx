import React from 'react';
import { Menu, Bell, Search, Sun, Moon, User, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Topbar.module.css';

const Topbar = ({ toggleSidebar, isMobile }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        
        <button className={styles.iconBtn} title="Notifications">
          <Bell size={20} />
          <span className={styles.badge}>3</span>
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
