import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getStations, createStation, updateStation, deleteStation } from '../../services/stationService';
import { getSensors } from '../../services/sensorService';
import { Edit2, Trash2, Eye, Plus, X, Search } from 'lucide-react';
import styles from './Stations.module.css';

const Stations = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, create, edit
  const [selectedStation, setSelectedStation] = useState(null);
  const [formData, setFormData] = useState({
    stationId: '',
    name: '',
    region: '',
    status: 'OFFLINE',
    latitude: '',
    longitude: ''
  });
  const [formError, setFormError] = useState(null);

  const canCreate = ['ADMIN', 'OPERATOR'].includes(user?.role);
  const canUpdate = ['ADMIN', 'OPERATOR', 'TECHNICIAN'].includes(user?.role);
  const canDelete = ['ADMIN'].includes(user?.role);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stationsRes, sensorsRes] = await Promise.all([
        getStations(),
        getSensors()
      ]);
      setStations(stationsRes.data);
      setSensors(sensorsRes.data);
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSensorCount = (stationId) => {
    return sensors.filter(s => s.station && (s.station._id === stationId || s.station === stationId)).length;
  };

  const filteredStations = stations.filter(station => {
    const matchesSearch = 
      station.stationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (station.region && station.region.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = statusFilter === 'ALL' || station.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const kpis = {
    total: stations.length,
    active: stations.filter(s => s.status === 'ONLINE').length,
    warning: stations.filter(s => ['WARNING', 'CRITICAL', 'MAINTENANCE'].includes(s.status)).length,
    offline: stations.filter(s => s.status === 'OFFLINE').length
  };

  const handleOpenModal = (mode, station = null) => {
    setModalMode(mode);
    setSelectedStation(station);
    setFormError(null);
    
    if (mode === 'create') {
      setFormData({
        stationId: '',
        name: '',
        region: '',
        status: 'OFFLINE',
        latitude: '',
        longitude: ''
      });
    } else if (station) {
      setFormData({
        stationId: station.stationId,
        name: station.name,
        region: station.region || '',
        status: station.status,
        latitude: station.location?.latitude || '',
        longitude: station.location?.longitude || ''
      });
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStation(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      stationId: formData.stationId,
      name: formData.name,
      region: formData.region,
      status: formData.status,
      location: {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      }
    };

    if (isNaN(payload.location.latitude) || payload.location.latitude < -90 || payload.location.latitude > 90) {
      setFormError('Latitude must be a number between -90 and 90');
      return;
    }
    if (isNaN(payload.location.longitude) || payload.location.longitude < -180 || payload.location.longitude > 180) {
      setFormError('Longitude must be a number between -180 and 180');
      return;
    }

    try {
      if (modalMode === 'create') {
        await createStation(payload);
      } else if (modalMode === 'edit') {
        await updateStation(selectedStation._id, payload);
      }
      fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this station? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteStation(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete station');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className="h2">Stations</h1>
          <p className="text-secondary">Manage meteorological monitoring stations across regions.</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => handleOpenModal('create')}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Add Station
          </Button>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Stations</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700 }}>{kpis.total}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Stations</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--success)' }}>{kpis.active}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Warning / Degraded</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--warning)' }}>{kpis.warning}</div>
        </Card>
        <Card className={styles.kpiCard} style={{ padding: '1.25rem' }}>
          <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Offline Stations</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>{kpis.offline}</div>
        </Card>
      </div>

      <div className={styles.controls}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by ID, name, or region..." 
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
          <option value="CRITICAL">Critical</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading stations...</div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
            <Button variant="outline" onClick={fetchData} style={{ marginTop: '1rem' }}>Retry</Button>
          </div>
        ) : filteredStations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No stations found matching your criteria.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Station ID</th>
                <th>Name</th>
                <th>Region</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Sensors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map(station => (
                <tr key={station._id}>
                  <td style={{ fontWeight: 500 }}>{station.stationId}</td>
                  <td>{station.name}</td>
                  <td>{station.region || '-'}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {station.location?.latitude.toFixed(4)}, {station.location?.longitude.toFixed(4)}
                  </td>
                  <td><StatusBadge status={station.status} /></td>
                  <td>{getSensorCount(station._id)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => handleOpenModal('view', station)} title="View">
                        <Eye size={18} />
                      </button>
                      {canUpdate && (
                        <button className={styles.actionBtn} onClick={() => handleOpenModal('edit', station)} title="Edit">
                          <Edit2 size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(station._id)} title="Delete">
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
                {modalMode === 'create' ? 'Add New Station' : modalMode === 'edit' ? 'Edit Station' : 'Station Details'}
              </h2>
              <button className={styles.closeBtn} onClick={closeModal}><X size={24} /></button>
            </div>
            
            {formError && <div className={styles.errorMsg}>{formError}</div>}
            
            {modalMode === 'view' && selectedStation ? (
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Station ID</span>
                  <span className={styles.detailValue}>{selectedStation.stationId}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Name</span>
                  <span className={styles.detailValue}>{selectedStation.name}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue}><StatusBadge status={selectedStation.status} /></span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Region</span>
                  <span className={styles.detailValue}>{selectedStation.region || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Latitude</span>
                  <span className={styles.detailValue}>{selectedStation.location?.latitude}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Longitude</span>
                  <span className={styles.detailValue}>{selectedStation.location?.longitude}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Health Score</span>
                  <span className={styles.detailValue}>{selectedStation.healthScore}%</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sensor Count</span>
                  <span className={styles.detailValue}>{getSensorCount(selectedStation._id)}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>Station ID *</label>
                  <input type="text" name="stationId" value={formData.stationId} onChange={handleInputChange} required placeholder="e.g. ST-ALPHA-01" />
                </div>
                <div className={styles.formGroup}>
                  <label>Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Alpha Prime" />
                </div>
                <div className={styles.formGroup}>
                  <label>Region</label>
                  <input type="text" name="region" value={formData.region} onChange={handleInputChange} placeholder="e.g. West" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label>Latitude *</label>
                    <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleInputChange} required placeholder="-90 to 90" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Longitude *</label>
                    <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleInputChange} required placeholder="-180 to 180" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="ONLINE">Online</option>
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
                <div className={styles.formActions}>
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" variant="primary">
                    {modalMode === 'create' ? 'Create Station' : 'Save Changes'}
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

export default Stations;
