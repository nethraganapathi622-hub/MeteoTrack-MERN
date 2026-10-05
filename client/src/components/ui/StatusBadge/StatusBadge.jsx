import React from 'react';
import styles from './StatusBadge.module.css';
import { Activity, AlertTriangle, XCircle, Wrench, HelpCircle } from 'lucide-react';

const StatusBadge = ({ status, text, className = '' }) => {
  // Map statuses to variants and icons
  const statusConfig = {
    ONLINE: { variant: 'success', icon: Activity },
    WARNING: { variant: 'warning', icon: AlertTriangle },
    CRITICAL: { variant: 'danger', icon: XCircle },
    OFFLINE: { variant: 'offline', icon: XCircle },
    MAINTENANCE: { variant: 'info', icon: Wrench },
    UNKNOWN: { variant: 'offline', icon: HelpCircle },
  };

  const config = statusConfig[status] || statusConfig.UNKNOWN;
  const Icon = config.icon;

  return (
    <span className={`${styles.badge} ${styles[config.variant]} ${className}`}>
      <Icon size={14} className={styles.icon} />
      {text || status}
    </span>
  );
};

export default StatusBadge;
