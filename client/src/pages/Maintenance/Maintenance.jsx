import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card/Card';
import { getStations } from '../../services/stationService';
import { getSensorsByStation } from '../../services/sensorService';
import { getMaintenanceRecords, getMaintenanceSummary, createMaintenanceRecord, updateMaintenanceRecord } from '../../services/maintenanceService';
import { useAuth } from '../../context/AuthContext';
import styles from './Maintenance.module.css';
import { format } from 'date-fns';
import { Plus, Edit2 } from 'lucide-react';

const Maintenance = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stations, setStations] = useState([]);
  const [sensors, setSensors] = useState([]); // for modal
  
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    station: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    station: '',
    sensor: '',
    type: 'INSPECTION',
    description: '',
    priority: 'MEDIUM',
    status: 'SCHEDULED',
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: ''
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchSummary = async () => {
    try {
      const res = await getMaintenanceSummary();
      if (res.success) setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMaintenanceRecords(filters);
      if (res.success) setRecords(res.data);
    } catch (err) {
      setError('Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const stRes = await getStations();
        if (stRes.success) setStations(stRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitial();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  useEffect(() => {
    if (formData.station) {
      getSensorsByStation(formData.station).then(res => {
        if (res.success) setSensors(res.data);
      });
    } else {
      setSensors([]);
    }
  }, [formData.station]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        station: record.station?._id || '',
        sensor: record.sensor?._id || '',
        type: record.type,
        description: record.description,
        priority: record.priority,
        status: record.status,
        scheduledDate: record.scheduledDate ? format(new Date(record.scheduledDate), "yyyy-MM-dd'T'HH:mm") : '',
        notes: record.notes || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({
        station: '',
        sensor: '',
        type: 'INSPECTION',
        description: '',
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        scheduledDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: ''
      });
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    
    try {
      // Remove empty sensor ID to avoid cast to ObjectId errors
      const payload = { ...formData };
      if (!payload.sensor) delete payload.sensor;

      if (editingRecord) {
        if (payload.status === 'COMPLETED' && editingRecord.status !== 'COMPLETED') {
          payload.completionDate = new Date();
        }
        await updateMaintenanceRecord(editingRecord._id, payload);
      } else {
        await createMaintenanceRecord(payload);
      }
      
      closeModal();
      fetchRecords();
      fetchSummary();
    } catch (err) {
      setModalError(err.message || 'Failed to save maintenance record.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Maintenance Tracking</h1>
          <p className={styles.subtitle}>Schedule and track equipment maintenance</p>
        </div>
        {canEdit && (
          <button className={styles.button} onClick={() => openModal()}>
            <Plus size={18} /> New Record
          </button>
        )}
      </div>

      {summary && (
        <div className={styles.summaryGrid}>
          <Card>
            <CardContent style={{ padding: '1.25rem' }}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Records</span>
                <span className={styles.summaryValue}>{summary.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: '1.25rem' }}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Scheduled</span>
                <span className={styles.summaryValue} style={{color: '#3b82f6'}}>{summary.scheduled}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: '1.25rem' }}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>In Progress</span>
                <span className={styles.summaryValue} style={{color: '#f59e0b'}}>{summary.inProgress}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={styles.filtersCard}>
        <div className={styles.filterGroup}>
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className={styles.select}>
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Priority</label>
          <select name="priority" value={filters.priority} onChange={handleFilterChange} className={styles.select}>
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Station</label>
          <select name="station" value={filters.station} onChange={handleFilterChange} className={styles.select}>
            <option value="">All Stations</option>
            {stations.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader title="Maintenance Records" />
        <CardContent className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>Loading records...</div>
          ) : error ? (
            <div className={styles.emptyState} style={{ color: 'var(--danger-color)' }}>{error}</div>
          ) : records.length === 0 ? (
            <div className={styles.emptyState}>No maintenance records found.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Equipment</th>
                  <th>Scheduled</th>
                  <th>Priority</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{record.type}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{record.description.substring(0, 40)}{record.description.length > 40 ? '...' : ''}</div>
                    </td>
                    <td>
                      <div>{record.station?.name || 'Unknown Station'}</div>
                      {record.sensor && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{record.sensor.type} ({record.sensor.sensorId})</div>}
                    </td>
                    <td>{format(new Date(record.scheduledDate), 'MMM dd, yyyy')}</td>
                    <td className={styles['priority' + record.priority]}>{record.priority}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles['status' + record.status]}`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button className={styles.actionBtn} onClick={() => openModal(record)} title="Edit Record">
                          <Edit2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingRecord ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h2>
              <button className={styles.closeBtn} onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {modalError && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.9rem' }}>{modalError}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Station *</label>
                    <select name="station" value={formData.station} onChange={handleInputChange} className={styles.select} required>
                      <option value="">Select Station...</option>
                      {stations.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Sensor (Optional)</label>
                    <select name="sensor" value={formData.sensor} onChange={handleInputChange} className={styles.select} disabled={!formData.station}>
                      <option value="">Station-wide / Not Applicable</option>
                      {sensors.map(s => <option key={s._id} value={s._id}>{s.name} ({s.sensorId})</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Maintenance Type *</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} className={styles.select} required>
                      <option value="CALIBRATION">Calibration</option>
                      <option value="REPAIR">Repair</option>
                      <option value="INSPECTION">Inspection</option>
                      <option value="REPLACEMENT">Replacement</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Scheduled Date *</label>
                    <input type="datetime-local" name="scheduledDate" value={formData.scheduledDate} onChange={handleInputChange} className={styles.input} required />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description *</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} className={styles.input} required placeholder="Describe the maintenance task..."></textarea>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Priority *</label>
                    <select name="priority" value={formData.priority} onChange={handleInputChange} className={styles.select} required>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Status *</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className={styles.select} required>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Resolution / Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} className={styles.input} placeholder="Results, parts replaced, etc."></textarea>
                </div>

              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal} disabled={modalLoading}>Cancel</button>
                <button type="submit" className={styles.button} disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
