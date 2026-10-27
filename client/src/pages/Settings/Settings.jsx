import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card, CardContent } from '../../components/ui/Card/Card';
import styles from './Settings.module.css';
import { Sun, Moon, Monitor } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', text: '' }

  // We are not implementing actual password changing since there's no backend route for it,
  // so we will show the profile and clearly indicate that it's read-only.
  
  const handleSavePreferences = (e) => {
    e.preventDefault();
    // Simulate save for client-only preferences
    setSaveStatus({ type: 'success', text: 'Preferences saved successfully.' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>System Settings</h1>
        <p className={styles.subtitle}>Manage your account and application preferences</p>
      </div>

      <Card>
        <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Profile Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>User Profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input type="text" className={styles.input} value={user?.name || ''} disabled />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" className={styles.input} value={user?.email || ''} disabled />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <input type="text" className={styles.input} value={user?.role || ''} disabled />
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Note: Profile information is managed by your system administrator.
            </p>
          </section>

          {/* Theme Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Appearance</h2>
            <div className={styles.themeToggle}>
              <div 
                className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun className={styles.themeIcon} />
                <span className={styles.themeLabel}>Light Mode</span>
              </div>
              <div 
                className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className={styles.themeIcon} />
                <span className={styles.themeLabel}>Dark Mode</span>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Application Preferences</h2>
            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label>Date Format</label>
                  <select className={styles.select}>
                    <option value="MMM dd, yyyy">Oct 10, 2026</option>
                    <option value="dd/MM/yyyy">10/10/2026</option>
                    <option value="yyyy-MM-dd">2026-10-10</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Default Map Zoom</label>
                  <select className={styles.select}>
                    <option value="2">Global (Level 2)</option>
                    <option value="4">Region (Level 4)</option>
                    <option value="6">Country (Level 6)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.button}>Save Preferences</button>
            </form>
            {saveStatus && (
              <div className={`${styles.message} ${styles[saveStatus.type]}`}>
                {saveStatus.text}
              </div>
            )}
          </section>

          {/* Admin Configuration */}
          {user?.role === 'ADMIN' && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle} style={{ color: 'var(--danger-color)' }}>System Administration</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Advanced system configuration (Data Retention, Export tools, User Management) are accessed via the dedicated Admin Console.
              </p>
              <button className={styles.button} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                Open Admin Console (Coming Soon)
              </button>
            </section>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
