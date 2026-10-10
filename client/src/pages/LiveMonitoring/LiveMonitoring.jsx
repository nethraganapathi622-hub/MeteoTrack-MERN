import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getStations } from '../../services/stationService';
import { getSensorsByStation } from '../../services/sensorService';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { Card, CardHeader, CardContent } from '../../components/ui/Card/Card';
import styles from './LiveMonitoring.module.css';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const LiveMonitoring = () => {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  
  const [sensors, setSensors] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [recentReadings, setRecentReadings] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load stations on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await getStations();
        if (res.success && res.data) {
          setStations(res.data);
          if (res.data.length > 0) {
            setSelectedStationId(res.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load stations', err);
        setError('Failed to load stations');
      }
    };
    fetchStations();
  }, []);

  // Manage socket connection lifecycle
  useEffect(() => {
    const socket = socketService.connect();
    
    if (socket) {
      if (socket.connected) {
        setConnectionStatus('LIVE');
      } else {
        setConnectionStatus('CONNECTING');
      }

      const onConnect = () => setConnectionStatus('LIVE');
      const onDisconnect = () => setConnectionStatus('DISCONNECTED');
      const onError = () => setConnectionStatus('RECONNECTING');

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onError);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onError);
      };
    }
  }, []);

  // Handle station selection, load initial data, setup socket room
  useEffect(() => {
    if (!selectedStationId) return;

    let isMounted = true;

    const loadStationData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sensorsRes, latestRes, historyRes] = await Promise.all([
          getSensorsByStation(selectedStationId),
          api.get(`/readings/latest?station=${selectedStationId}`),
          api.get(`/readings?station=${selectedStationId}&limit=50`)
        ]);

        if (!isMounted) return;

        const sensorsData = sensorsRes.success ? sensorsRes.data : [];
        setSensors(sensorsData);

        const latestMap = {};
        if (latestRes.data && latestRes.data.data) {
          latestRes.data.data.forEach(r => {
            latestMap[r.sensor] = r;
          });
        }
        setLatestReadings(latestMap);

        if (historyRes.data && historyRes.data.data) {
          setRecentReadings(historyRes.data.data);
        } else {
          setRecentReadings([]);
        }

      } catch (err) {
        if (isMounted) {
          console.error('Error loading station data:', err);
          setError('Failed to load station data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStationData();

    // Join new station room
    socketService.joinStation(selectedStationId);

    // Socket reading handler
    const handleNewReading = (reading) => {
      // reading has sensorDbId which corresponds to the sensor's _id
      const sensorId = reading.sensorDbId;
      
      setLatestReadings(prev => ({
        ...prev,
        [sensorId]: {
          sensor: sensorId,
          value: reading.value,
          unit: reading.unit,
          timestamp: reading.timestamp,
          quality: reading.quality
        }
      }));

      setRecentReadings(prev => {
        const newRecord = {
          _id: Math.random().toString(36).substr(2, 9), // temp id for key
          sensor: sensorId,
          value: reading.value,
          unit: reading.unit,
          timestamp: reading.timestamp,
          quality: reading.quality
        };
        const newHistory = [newRecord, ...prev];
        if (newHistory.length > 50) newHistory.pop();
        return newHistory;
      });
    };

    socketService.subscribeToReadings(handleNewReading);

    return () => {
      isMounted = false;
      socketService.leaveStation(selectedStationId);
      socketService.unsubscribeFromReadings(handleNewReading);
    };
  }, [selectedStationId]);

  // Derived state for the Chart
  const chartData = useMemo(() => {
    const grouped = {};
    recentReadings.forEach(r => {
      const timeStr = format(new Date(r.timestamp), 'HH:mm:ss');
      if (!grouped[timeStr]) {
        grouped[timeStr] = { time: timeStr };
      }
      const sensor = sensors.find(s => s._id === r.sensor);
      if (sensor) {
        grouped[timeStr][sensor.type] = r.value;
      }
    });
    // recentReadings is descending (newest first). Recharts needs ascending.
    return Object.values(grouped).reverse();
  }, [recentReadings, sensors]);

  // Derived Summary
  const summary = useMemo(() => {
    let online = 0;
    let warning = 0;
    let offline = 0;
    
    const now = new Date().getTime();
    
    sensors.forEach(s => {
      const reading = latestReadings[s._id];
      if (!reading) {
        offline++;
      } else {
        const diffMins = (now - new Date(reading.timestamp).getTime()) / 60000;
        if (diffMins > 10) {
          offline++;
        } else if (reading.quality === 'SUSPECT' || reading.quality === 'FAULT') {
          warning++;
        } else {
          online++;
        }
      }
    });
    
    return {
      total: sensors.length,
      online,
      warning,
      offline
    };
  }, [sensors, latestReadings]);

  const getStatusColor = (quality, timestamp) => {
    const diffMins = (new Date().getTime() - new Date(timestamp).getTime()) / 60000;
    if (diffMins > 10) return styles.dotOffline;
    if (quality === 'SUSPECT' || quality === 'FAULT' || quality === 'WARNING') return styles.dotWarning;
    return styles.dotOnline;
  };

  const getStatusText = (quality, timestamp) => {
    const diffMins = (new Date().getTime() - new Date(timestamp).getTime()) / 60000;
    if (diffMins > 10) return 'Offline (Stale)';
    if (quality === 'SUSPECT' || quality === 'FAULT' || quality === 'WARNING') return 'Warning';
    return 'Online';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Live Monitoring</h1>
        <div className={styles.controls}>
          <div className={`${styles.statusBadge} ${styles['status' + connectionStatus]}`}>
            <div className={styles.statusIndicator}></div>
            {connectionStatus}
          </div>
          <select 
            className={styles.select}
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(e.target.value)}
            disabled={stations.length === 0}
          >
            {stations.length === 0 ? (
              <option value="">No stations available</option>
            ) : (
              stations.map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.stationId})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && <div className={styles.emptyState}>{error}</div>}
      
      {loading ? (
        <div className={styles.emptyState}>Loading station data...</div>
      ) : !selectedStationId ? (
        <div className={styles.emptyState}>Please select a station to view live metrics.</div>
      ) : (
        <>
          {/* Summary */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Sensors</span>
              <span className={styles.summaryValue}>{summary.total}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Online</span>
              <span className={styles.summaryValue} style={{color: 'var(--success-color)'}}>{summary.online}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Warning</span>
              <span className={styles.summaryValue} style={{color: 'var(--warning-color)'}}>{summary.warning}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Offline</span>
              <span className={styles.summaryValue} style={{color: 'var(--danger-color)'}}>{summary.offline}</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className={styles.metricsGrid}>
            {sensors.length === 0 && (
              <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                No sensors found for this station.
              </div>
            )}
            {sensors.map(sensor => {
              const reading = latestReadings[sensor._id];
              const value = reading ? Number(reading.value).toFixed(2) : '--';
              const unit = reading ? reading.unit : sensor.unit;
              const time = reading ? format(new Date(reading.timestamp), 'HH:mm:ss') : 'Never';
              const statusColor = reading ? getStatusColor(reading.quality, reading.timestamp) : styles.dotOffline;
              const statusText = reading ? getStatusText(reading.quality, reading.timestamp) : 'Offline';

              return (
                <Card key={sensor._id} className={styles.metricCard}>
                  <CardHeader title={sensor.type} subtitle={sensor.sensorId} />
                  <CardContent>
                    <div className={styles.metricValue}>
                      {value} <span className={styles.metricUnit}>{unit}</span>
                    </div>
                    <div className={styles.metricFooter}>
                      <span>
                        <span className={`${styles.statusDot} ${statusColor}`}></span>
                        {statusText}
                      </span>
                      <span>{time}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Live Chart */}
          {sensors.length > 0 && chartData.length > 0 && (
            <div className={styles.chartSection}>
              <div className={styles.chartHeader}>
                <Activity size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                Real-time Telemetry
              </div>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickMargin={10} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(val) => val} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    {sensors.map((sensor, index) => (
                      <Line 
                        key={sensor._id}
                        type="monotone"
                        dataKey={sensor.type}
                        name={`${sensor.type} (${sensor.unit})`}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false} // Disable animation for better performance on live updates
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Readings Table */}
          <Card>
            <CardHeader title="Recent Readings" />
            <CardContent className={styles.tableContainer}>
              {recentReadings.length === 0 ? (
                <div className={styles.emptyState}>No recent readings available.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Sensor Type</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReadings.map((reading, idx) => {
                      const sensor = sensors.find(s => s._id === reading.sensor);
                      const type = sensor ? sensor.type : 'Unknown';
                      
                      return (
                        <tr key={reading._id || idx}>
                          <td>{format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                          <td>{type}</td>
                          <td style={{ fontWeight: 500 }}>{Number(reading.value).toFixed(2)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{reading.unit}</td>
                          <td>
                            <span className={`${styles.qualityBadge} ${styles['quality' + reading.quality]}`}>
                              {reading.quality}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LiveMonitoring;
