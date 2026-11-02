import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import { Activity, Lock, Mail, Compass, Check, Copy, UserCheck } from 'lucide-react';
import styles from './Login.module.css';

const DEMO_EMAIL = 'demo@meteotrack.com';
const DEMO_PASSWORD = 'DemoViewer2025!';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate(from, { replace: true });
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setGuestLoading(false);
    }
  };

  const handleCopy = async (text, field) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.brandContainer}>
        <Activity size={48} className={styles.logo} />
        <h1>MeteoTrack</h1>
        <p className="text-secondary">Operations Monitoring Platform</p>
      </div>

      <Card className={styles.loginCard}>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formHeader}>
              <h2>Sign In</h2>
              <p className="text-muted">Enter your credentials to access the platform</p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@meteotrack.com"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className={styles.submitBtn} disabled={loading || guestLoading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <div className={styles.exploreSection}>
              <div className={styles.exploreDivider}>
                <span>or</span>
              </div>

              <div className={styles.exploreCard}>
                <div className={styles.exploreHeader}>
                  <Compass size={18} className={styles.exploreIcon} />
                  <h3 className={styles.exploreTitle}>Explore MeteoTrack</h3>
                </div>

                <p className={styles.exploreNote}>
                  Use the demo credentials to explore the platform.
                </p>

                <div className={styles.credentialsContainer}>
                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>Email:</span>
                    <span className={styles.credentialValue}>{DEMO_EMAIL}</span>
                  </div>
                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>Password:</span>
                    <span className={styles.credentialValue}>{DEMO_PASSWORD}</span>
                  </div>
                </div>

                <div className={styles.copyActions}>
                  <button
                    type="button"
                    onClick={() => handleCopy(DEMO_EMAIL, 'email')}
                    className={styles.copyBtn}
                  >
                    {copiedField === 'email' ? <Check size={14} className={styles.copySuccessIcon} /> : <Copy size={14} />}
                    <span>{copiedField === 'email' ? 'Copied Email' : 'Copy Demo Email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(DEMO_PASSWORD, 'password')}
                    className={styles.copyBtn}
                  >
                    {copiedField === 'password' ? <Check size={14} className={styles.copySuccessIcon} /> : <Copy size={14} />}
                    <span>{copiedField === 'password' ? 'Copied Password' : 'Copy Demo Password'}</span>
                  </button>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className={styles.guestBtn}
                  onClick={handleGuestLogin}
                  disabled={loading || guestLoading}
                  icon={UserCheck}
                >
                  {guestLoading ? 'Logging in as Guest...' : 'Login as Guest'}
                </Button>
              </div>
            </div>
            
            <div className={styles.seedInfo}>
              <p className="text-xs text-muted">Dev Hint: Check SEED_PASSWORD in server/.env for admin password</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
