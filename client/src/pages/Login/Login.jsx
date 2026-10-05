import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import { Activity, Lock, Mail } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

            <Button type="submit" variant="primary" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
            
            <div className={styles.seedInfo}>
              <p className="text-xs text-muted">Dev Hint: Use admin@meteotrack.com / password123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
