import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getSensors, createSensor, updateSensor, deleteSensor } from '../../services/sensorService';
import { getStations } from '../../services/stationService';
import { Edit2, Trash2, Eye, Plus, X, Search } from 'lucide-react';
import styles from './Sensors.module.css';

const Sensors = () => {
  const { user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, create, edit
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [formData, setFormData] = useState({
    sensorId: '',
    name: '',
    type: 'TEMPERATURE',
    unit: '',
    status: 'OFFLINE',
    station: '',
    minThreshold: '',
    maxThreshold: ''
  });
  const [formError, setFormError] = useState(null);

  const canCreate = ['ADMIN', 'TECHNICIAN'].includes(user?.role);
  const canUpdate = ['ADMIN', 'TECHNICIAN'].includes(user?.role);
  const canDelete = ['ADMIN'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sensorsRes, stationsRes] = await Promise.all([
        getSensors(),
        getStations()
      ]);
      setSensors(sensorsRes.data);
      setStations(stationsRes.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSensors = sensors.filter(sensor => {
    const matchesSearch = 
      sensor.sensorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sensor.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sensor.station?.name && sensor.station.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = statusFilter === 'ALL' || sensor.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const kpis = {
    total: sensors.length,
    active: sensors.filter(s => s.status === 'ONLINE').length,
    warning: sensors.filter(s => ['WARNING', 'FAULT', 'MAINTENANCE'].includes(s.status)).length,
    offline: sensors.filter(s => s.status === 'OFFLINE').length
  };

  const handleOpenModal = (mode, sensor = null) => {
    setModalMode(mode);
    setSelectedSensor(sensor);
    setFormError(null);
    
    if (mode === 'create') {
      setFormData({
        sensorId: '',
        name: '',
        type: 'TEMPERATURE',
        unit: '',
        status: 'OFFLINE',
        station: stations.length > 0 ? stations[0]._id : '',
        minThreshold: '',
        maxThreshold: ''
      });
    } else if (sensor) {
      setFormData({
        sensorId: sensor.sensorId,
        name: sensor.name,
        type: sensor.type,
        unit: sensor.unit || '',
        status: sensor.status,
        station: sensor.station?._id || sensor.station || '',
        minThreshold: sensor.minThreshold !== undefined && sensor.minThreshold !== null ? sensor.minThreshold : '',
        maxThreshold: sensor.maxThreshold !== undefined && sensor.maxThreshold !== null ? sensor.maxThreshold : ''
      });
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSensor(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.station) {
      setFormError('Please select a valid station.');
      return;
    }

    const min = formData.minThreshold === '' ? null : Number(formData.minThreshold);
    const max = formData.maxThreshold === '' ? null : Number(formData.maxThreshold);

    if (min !== null && max !== null && min > max) {
      setFormError('Maximum threshold must be greater than or equal to minimum threshold.');
      return;
    }

    const finalPayload = { ...formData, minThreshold: min, maxThreshold: max };

    try {
      if (modalMode === 'create') {
        await createSensor(finalPayload);
      } else if (modalMode === 'edit') {
        await updateSensor(selectedSensor._id, finalPayload);
      }
      fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sensor? Historical readings will be preserved.')) {
      return;
    }
    
    try {
      await deleteSensor(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete sensor');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className="h2">Sensors</h1>
          <p className="text-secondary">Manage and diagnose meteorological sensors.</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => handleOpenModal('create')}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Add Sensor
          </Button>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Sensors</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{kpis.total}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Sensors</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--success)' }}>{kpis.active}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Warning / Fault</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--warning)' }}>{kpis.warning}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Offline Sensors</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>{kpis.offline}</div>
        </Card>
      </div>

      <div className={styles.controls}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by ID, name, type, or station..." 
            className={styles.searchInput}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="ONLINE">Online</option>
          <option value="WARNING">Warning</option>
          <option value="FAULT">Fault</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading sensors...</div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
            <Button variant="outline" onClick={fetchData} style={{ marginTop: '1rem' }}>Retry</Button>
          </div>
        ) : filteredSensors.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No sensors found matching your criteria.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sensor ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Unit</th>
                <th>Station</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.map(sensor => (
                <tr key={sensor._id}>
                  <td style={{ fontWeight: 500 }}>{sensor.sensorId}</td>
                  <td>{sensor.name}</td>
                  <td style={{ fontSize: '0.875rem' }}>{sensor.type}</td>
                  <td style={{ fontSize: '0.875rem' }}>{sensor.unit || '-'}</td>
                  <td>{sensor.station?.name || '-'}</td>
                  <td><StatusBadge status={sensor.status} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => handleOpenModal('view', sensor)} title="View">
                        <Eye size={18} />
                      </button>
                      {canUpdate && (
                        <button className={styles.actionBtn} onClick={() => handleOpenModal('edit', sensor)} title="Edit">
                          <Edit2 size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(sensor._id)} title="Delete">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className="h3">
                {modalMode === 'create' ? 'Add New Sensor' : modalMode === 'edit' ? 'Edit Sensor' : 'Sensor Details'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}><X size={24} /></button>
            </div>
            
            {formError && <div className={styles.errorMsg}>{formError}</div>}
            
            {modalMode === 'view' && selectedSensor ? (
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sensor ID</span>
                  <span className={styles.detailValue}>{selectedSensor.sensorId}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Name</span>
                  <span className={styles.detailValue}>{selectedSensor.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue}><StatusBadge status={selectedSensor.status} /></span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>{selectedSensor.type}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Station</span>
                  <span className={styles.detailValue}>{selectedSensor.station?.name || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Unit</span>
                  <span className={styles.detailValue}>{selectedSensor.unit || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Last Reading</span>
                  <span className={styles.detailValue}>{selectedSensor.lastReading ? `${selectedSensor.lastReading} ${selectedSensor.unit || ''}` : 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Min Threshold</span>
                  <span className={styles.detailValue}>{selectedSensor.minThreshold !== undefined && selectedSensor.minThreshold !== null ? selectedSensor.minThreshold : 'Not Set'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Max Threshold</span>
                  <span className={styles.detailValue}>{selectedSensor.maxThreshold !== undefined && selectedSensor.maxThreshold !== null ? selectedSensor.maxThreshold : 'Not Set'}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>Sensor ID *</label>
                  <input type="text" name="sensorId" value={formData.sensorId} onChange={handleInputChange} required placeholder="e.g. SEN-T-001" />
                </div>
                <div className={styles.formGroup}>
                  <label>Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Main Temp" />
                </div>
                <div className={styles.formGroup}>
                  <label>Station *</label>
                  <select name="station" value={formData.station} onChange={handleInputChange} required>
                    <option value="" disabled>Select a Station</option>
                    {stations.map(st => (
                      <option key={st._id} value={st._id}>{st.name} ({st.stationId})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Type *</label>
                    <select name="type" value={formData.type} onChange={handleInputChange} required>
                      <option value="TEMPERATURE">Temperature</option>
                      <option value="HUMIDITY">Humidity</option>
                      <option value="PRESSURE">Pressure</option>
                      <option value="WIND_SPEED">Wind Speed</option>
                      <option value="WIND_DIRECTION">Wind Direction</option>
                      <option value="RAINFALL">Rainfall</option>
                      <option value="SOLAR_RADIATION">Solar Radiation</option>
                      <option value="UV_INDEX">UV Index</option>
                      <option value="VISIBILITY">Visibility</option>
                      <option value="DEW_POINT">Dew Point</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Unit</label>
                    <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="e.g. C, %, hPa" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Min Threshold</label>
                    <input type="number" step="any" name="minThreshold" value={formData.minThreshold} onChange={handleInputChange} placeholder="Optional" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Max Threshold</label>
                    <input type="number" step="any" name="maxThreshold" value={formData.maxThreshold} onChange={handleInputChange} placeholder="Optional" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="ONLINE">Online</option>
                    <option value="WARNING">Warning</option>
                    <option value="FAULT">Fault</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
                <div className={styles.formActions}>
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary">
                    {modalMode === 'create' ? 'Create Sensor' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sensors;
