import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getStations } from '../../services/stationService';
import { getSensorsByStation } from '../../services/sensorService';
import api from '../../services/api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card/Card';
import styles from './Analytics.module.css';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const Analytics = () => {
  const [stations, setStations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [readings, setReadings] = useState([]);
  
  const [filters, setFilters] = useState({
    station: '',
    sensor: '',
    startDate: format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await getStations();
        if (res.success && res.data.length > 0) {
          setStations(res.data);
          setFilters(prev => ({ ...prev, station: res.data[0]._id }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStations();
  }, []);

  // Load sensors when station changes
  useEffect(() => {
    if (!filters.station) return;
    const fetchSensors = async () => {
      try {
        const res = await getSensorsByStation(filters.station);
        if (res.success) {
          setSensors(res.data);
          if (res.data.length > 0) {
            setFilters(prev => ({ ...prev, sensor: res.data[0]._id }));
          } else {
            setFilters(prev => ({ ...prev, sensor: '' }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSensors();
  }, [filters.station]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const fetchAnalytics = async () => {
    if (!filters.station || !filters.sensor) return;
    
    setLoading(true);
    setError(null);
    try {
      // Use existing readings API with limit to prevent crashing browser
      const query = `?station=${filters.station}&sensor=${filters.sensor}&startDate=${new Date(filters.startDate).toISOString()}&endDate=${new Date(filters.endDate).toISOString()}&limit=1000`;
      const res = await api.get(`/readings${query}`);
      
      if (res.data && res.data.success) {
        // Readings come newest first from API, reverse them for chronological chart
        setReadings([...res.data.data].reverse());
      }
    } catch (err) {
      setError('Failed to load analytics data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.station && filters.sensor) {
      fetchAnalytics();
    }
  }, [filters.sensor]); // auto fetch on sensor change

  const selectedSensorObj = useMemo(() => {
    return sensors.find(s => s._id === filters.sensor);
  }, [sensors, filters.sensor]);

  const chartData = useMemo(() => {
    if (!readings || !Array.isArray(readings)) return [];
    return readings
      .map(r => ({
        time: r.timestamp ? new Date(r.timestamp).getTime() : NaN,
        value: r.value !== null && r.value !== undefined ? Number(r.value) : NaN
      }))
      .filter(d => !isNaN(d.time) && !isNaN(d.value));
  }, [readings]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return {
      count: chartData.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2)
    };
  }, [chartData]);

  const setPresetRange = (days) => {
    setFilters({
      ...filters,
      startDate: format(startOfDay(subDays(new Date(), days)), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm")
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Historical Analytics</h1>
          <p className={styles.subtitle}>Analyze past sensor data and trends</p>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.filterGroup}>
          <label>Station</label>
          <select name="station" value={filters.station} onChange={handleFilterChange} className={styles.select}>
            <option value="">Select Station...</option>
            {stations.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Sensor / Parameter</label>
          <select name="sensor" value={filters.sensor} onChange={handleFilterChange} className={styles.select} disabled={!filters.station}>
            <option value="">Select Sensor...</option>
            {sensors.map(s => <option key={s._id} value={s._id}>{s.type} ({s.sensorId})</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Start Date</label>
          <input type="datetime-local" name="startDate" value={filters.startDate} onChange={handleFilterChange} className={styles.input} />
        </div>
        <div className={styles.filterGroup}>
          <label>End Date</label>
          <input type="datetime-local" name="endDate" value={filters.endDate} onChange={handleFilterChange} className={styles.input} />
        </div>
        <button className={styles.button} onClick={fetchAnalytics} disabled={loading || !filters.sensor}>
          {loading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className={styles.button} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setPresetRange(1)}>Last 24h</button>
        <button className={styles.button} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setPresetRange(7)}>Last 7 Days</button>
        <button className={styles.button} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={() => setPresetRange(30)}>Last 30 Days</button>
      </div>

      {error && <div className={styles.emptyState}>{error}</div>}

      {stats ? (
        <>
          <div className={styles.statsGrid}>
            <Card>
              <CardContent style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Data Points</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)' }}>{stats.count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Minimum</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success-color)' }}>{stats.min} {selectedSensorObj?.unit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Average</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning-color)' }}>{stats.avg} {selectedSensorObj?.unit}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Maximum</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger-color)' }}>{stats.max} {selectedSensorObj?.unit}</div>
              </CardContent>
            </Card>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>{selectedSensorObj?.type || 'Sensor'} Trend</div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd HH:mm')}
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickMargin={10} 
                  minTickGap={30} 
                />
                <YAxis stroke="var(--text-secondary)" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  labelFormatter={(label) => format(new Date(label), 'MMM dd yyyy, HH:mm:ss')}
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={`${selectedSensorObj?.type || 'Value'} (${selectedSensorObj?.unit || ''})`} 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  dot={chartData.length < 10}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        !loading && <div className={styles.emptyState}>No data found for the selected range.</div>
      )}
    </div>
  );
};

export default Analytics;
