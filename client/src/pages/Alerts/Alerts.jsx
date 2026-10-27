import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import styles from './Alerts.module.css';

const STATUS_PRIORITY = { 'ACTIVE': 1, 'ACKNOWLEDGED': 2, 'RESOLVED': 3 };

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    severity: ''
  });

  const canAction = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN' || user?.role === 'OPERATOR';

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/alerts/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch alert summary', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/alerts?page=${page}&limit=10`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.severity) url += `&severity=${filters.severity}`;
      
      const res = await api.get(url);
      if (res.data.success) {
        setAlerts(prev => {
          const incoming = res.data.data;
          const merged = incoming.map(inc => {
            const existing = prev.find(p => p._id === inc._id);
            if (existing) {
              const existingPriority = STATUS_PRIORITY[existing.status] || 0;
              const incomingPriority = STATUS_PRIORITY[inc.status] || 0;
              if (existingPriority > incomingPriority) {
                return {
                  ...inc,
                  status: existing.status,
                  acknowledgedAt: existing.acknowledgedAt,
                  resolvedAt: existing.resolvedAt
                };
              }
            }
            return inc;
          });

          // Preserve any newly arrived ACTIVE alerts from alert:new if on page 1
          if (page === 1 && (!filters.status || filters.status === 'ACTIVE')) {
            const incomingIds = new Set(incoming.map(i => i._id));
            const newLocal = prev.filter(p => !incomingIds.has(p._id) && p.status === 'ACTIVE');
            return [...newLocal, ...merged];
          }

          return merged;
        });
        setTotalPages(res.data.pages || 1);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchSummary();
    fetchAlerts();
  }, [fetchSummary, fetchAlerts]);

  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    socketService.connect();
    socketService.joinGlobal();

    const handleAlertNew = (newAlert) => {
      if (!newAlert || !newAlert._id) return;

      const formattedAlert = {
        ...newAlert,
        station: newAlert.station || { _id: newAlert.stationId, name: newAlert.stationName },
        sensor: newAlert.sensor || { _id: newAlert.sensorId, name: newAlert.sensorName, type: newAlert.type }
      };

      setAlerts(prev => {
        const exists = prev.some(a => a._id === formattedAlert._id);
        if (exists) {
          return prev.map(a => a._id === formattedAlert._id ? { ...a, ...formattedAlert } : a);
        }
        return [formattedAlert, ...prev];
      });

      fetchSummary();
    };

    const handleAlertUpdate = (updatedAlert) => {
      if (!updatedAlert || !updatedAlert._id) return;

      const formattedAlert = {
        ...updatedAlert,
        station: updatedAlert.station || (updatedAlert.stationId ? { _id: updatedAlert.stationId, name: updatedAlert.stationName } : undefined),
        sensor: updatedAlert.sensor || (updatedAlert.sensorId ? { _id: updatedAlert.sensorId, name: updatedAlert.sensorName, type: updatedAlert.type } : undefined)
      };

      setAlerts(prev => prev.map(a => {
        if (a._id === formattedAlert._id) {
          const currentPriority = STATUS_PRIORITY[a.status] || 0;
          const newPriority = STATUS_PRIORITY[formattedAlert.status] || 0;
          if (newPriority >= currentPriority) {
            return {
              ...a,
              ...formattedAlert,
              station: formattedAlert.station || a.station,
              sensor: formattedAlert.sensor || a.sensor
            };
          }
          return a;
        }
        return a;
      }));

      fetchSummary();
    };

    socketService.subscribeToAlertNew(handleAlertNew);
    socketService.subscribeToAlertUpdate(handleAlertUpdate);

    return () => {
      socketService.unsubscribeFromAlertNew(handleAlertNew);
      socketService.unsubscribeFromAlertUpdate(handleAlertUpdate);
    };
  }, [fetchSummary]);

  const handleAcknowledge = async (id) => {
    setActionError(null);
    try {
      const res = await api.patch(`/alerts/${id}/acknowledge`);
      if (res.data.success) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'ACKNOWLEDGED', acknowledgedAt: res.data.data?.acknowledgedAt || new Date().toISOString() } : a));
        await Promise.all([fetchSummary(), fetchAlerts()]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Acknowledge failed';
      setActionError(msg);
      await Promise.all([fetchSummary(), fetchAlerts()]);
    }
  };

  const handleResolve = async (id) => {
    setActionError(null);
    try {
      const res = await api.patch(`/alerts/${id}/resolve`);
      if (res.data.success) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'RESOLVED', resolvedAt: res.data.data?.resolvedAt || new Date().toISOString() } : a));
        await Promise.all([fetchSummary(), fetchAlerts()]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Resolve failed';
      setActionError(msg);
      await Promise.all([fetchSummary(), fetchAlerts()]);
    }
  };

  return (
    <div className={styles.alertsContainer}>
      <div className={styles.header}>
        <h1>Alert Management</h1>
      </div>

      {actionError && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionError}</span>
          <button 
            type="button"
            onClick={() => setActionError(null)} 
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1' }}
          >
            ×
          </button>
        </div>
      )}

      {summary && (
        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Total Active</span>
            <span className={`${styles.cardValue} ${styles.danger}`}>{summary.active}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Acknowledged</span>
            <span className={`${styles.cardValue} ${styles.warning}`}>{summary.acknowledged}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Critical Breaches</span>
            <span className={`${styles.cardValue} ${styles.danger}`}>{summary.critical}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Resolved (Total)</span>
            <span className={`${styles.cardValue} ${styles.resolved}`}>{summary.resolved}</span>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select 
            className={styles.select}
            value={filters.status} 
            onChange={(e) => { setFilters({...filters, status: e.target.value}); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Severity</label>
          <select 
            className={styles.select}
            value={filters.severity} 
            onChange={(e) => { setFilters({...filters, severity: e.target.value}); setPage(1); }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading && alerts.length === 0 ? (
          <div className={styles.loading}>Loading alerts...</div>
        ) : error ? (
          <div className={styles.emptyState}>{error}</div>
        ) : alerts.length === 0 ? (
          <div className={styles.emptyState}>No alerts found matching your criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Station / Sensor</th>
                  <th>Message</th>
                  <th>Severity</th>
                  <th>Status</th>
                  {canAction && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert._id}>
                    <td>
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </td>
                    <td>
                      <div><strong>{alert.station?.name || 'Unknown'}</strong></div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {alert.sensor?.name || alert.sensor?.type || 'Unknown'}
                      </div>
                    </td>
                    <td>{alert.message}</td>
                    <td>
                      <span className={`${styles.badge} ${styles['severity' + alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles['status' + alert.status]}`}>
                        {alert.status}
                      </span>
                    </td>
                    {canAction && (
                      <td>
                        <div className={styles.actions}>
                          <button 
                            className={`${styles.actionBtn} ${styles.ackBtn}`}
                            disabled={alert.status !== 'ACTIVE'}
                            onClick={() => handleAcknowledge(alert._id)}
                            title="Acknowledge"
                          >
                            Ack
                          </button>
                          <button 
                            className={`${styles.actionBtn} ${styles.resBtn}`}
                            disabled={alert.status === 'RESOLVED'}
                            onClick={() => handleResolve(alert._id)}
                            title="Resolve"
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              className={styles.pageBtn} 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button 
              className={styles.pageBtn} 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
