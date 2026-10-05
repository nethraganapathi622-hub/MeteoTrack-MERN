import React from 'react';
import styles from './Card.module.css';

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`${styles.header} ${className}`}>
      <div>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`${styles.content} ${className}`}>
      {children}
    </div>
  );
};
