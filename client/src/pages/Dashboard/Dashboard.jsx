import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card/Card';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import { Radio, AlertTriangle, Activity, ThermometerSun, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import styles from './Dashboard.module.css';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { Link } from 'react-router-dom';

const MetricCard = ({ title, value, icon: Icon, trend, trendValue, status }) => (
  <Card className={styles.metricCard}>
    <div className={styles.metricHeader}>
      <span className={styles.metricTitle}>{title}</span>
      <div className={`${styles.iconWrapper} ${styles[status]}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className={styles.metricBody}>
      <h3 className={styles.metricValue}>{value}</h3>
      <div className={styles.metricTrend}>
        {trendValue && <span className={styles[trend === 'up' ? 'trendUp' : 'trendDown']}>{trendValue}</span>}
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState({ totalStations: 0, onlineStations: 0, activeAlerts: 0, sensorHealth: '100%' });
  const [alertsList, setAlertsList] = useState([]);
  const [trendData, setTrendData] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [stationsRes, alertsSummaryRes, alertsRes, readingsRes] = await Promise.all([
          api.get('/stations'),
          api.get('/alerts/summary'),
          api.get('/alerts?status=ACTIVE&limit=5'),
          api.get('/readings?limit=50')
        ]);

        let total = 0, online = 0;
        if (stationsRes.data.success) {
          total = stationsRes.data.data.length;
          online = stationsRes.data.data.filter(s => s.status === 'ONLINE').length;
        }

        let activeAlerts = 0;
        if (alertsSummaryRes.data.success) {
          activeAlerts = alertsSummaryRes.data.data.active;
        }
        
        // Network Health calculation: Percentage of stations currently ONLINE
        setStats({
          totalStations: total,
          onlineStations: online,
          activeAlerts,
          sensorHealth: total > 0 ? ((online / total) * 100).toFixed(1) + '%' : 'N/A'
        });

        if (alertsRes.data.success) {
          setAlertsList(alertsRes.data.data);
        }

        if (readingsRes.data.success) {
          // Sort readings chronologically (oldest first)
          const raw = readingsRes.data.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          const grouped = {};
          
          raw.forEach(r => {
            if (!r.timestamp) return;
            const t = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!grouped[t]) grouped[t] = { time: t };
            
            // Map based on the unit field
            if (r.unit === 'C' || r.unit === 'F') {
               grouped[t].temp = r.value;
            } else if (r.unit === '%') {
               grouped[t].humidity = r.value;
            }
          });
          
          setTrendData(Object.values(grouped));
        }

      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    };
    fetchDashboardData();
  }, []);

  const chartColors = {
    temp: theme === 'dark' ? '#f59e0b' : '#d97706',
    humidity: theme === 'dark' ? '#60a5fa' : '#2563eb',
    grid: theme === 'dark' ? '#334155' : '#e5e7eb',
    text: theme === 'dark' ? '#94a3b8' : '#6b7280'
  };

  const hasTempData = trendData.some(d => d.temp !== undefined);
  const hasHumidityData = trendData.some(d => d.humidity !== undefined);

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <h1 className="h2">Overview</h1>
        <p className="text-secondary">Real-time system status and network health.</p>
      </div>

      <div className={styles.grid}>
        <MetricCard 
          title="Total Stations" 
          value={stats.totalStations} 
          icon={Radio} 
          status="primary" 
        />
        <MetricCard 
          title="Online Stations" 
          value={stats.onlineStations} 
          icon={Activity} 
          status="success" 
        />
        <MetricCard 
          title="Active Alerts" 
          value={stats.activeAlerts} 
          icon={AlertTriangle} 
          status={stats.activeAlerts > 0 ? "warning" : "success"} 
        />
        <MetricCard 
          title="Network Health" 
          value={stats.sensorHealth} 
          icon={ThermometerSun} 
          status="info" 
        />
      </div>

      <div className={styles.bentoGrid}>
        <Card className={styles.chartCard}>
          <CardHeader title="Recent Temperature Trend (°C)" />
          <CardContent>
            <div className={styles.chartContainer}>
              {hasTempData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.temp} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartColors.temp} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Area type="monotone" dataKey="temp" stroke={chartColors.temp} strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No recent temperature data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader title="Recent Humidity Trend (%)" />
          <CardContent>
            <div className={styles.chartContainer}>
              {hasHumidityData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="humidity" stroke={chartColors.humidity} strokeWidth={2} dot={false} activeDot={{r: 5}} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No recent humidity data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={styles.mapCard}>
          <CardHeader title="Network Maps" />
          <CardContent className={styles.mapContent}>
            <div className={styles.mapPlaceholder} style={{ textAlign: 'center', padding: '2rem' }}>
              <MapPin size={48} className={styles.mapIcon} style={{ margin: '0 auto 1rem auto' }} />
              <p className={styles.mapText}>View geographic distribution</p>
              <Link to="/map" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--primary-color)', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
                Open Interactive Map
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.alertsCard}>
          <CardHeader title="Recent Active Alerts" />
          <CardContent className={styles.alertsList}>
            {alertsList.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active alerts</div>
            ) : (
              alertsList.map(alert => (
                <div key={alert._id} className={styles.alertItem}>
                  <div className={styles.alertMeta}>
                    <StatusBadge status={alert.severity} />
                    <span className={styles.alertStation}>{alert.station?.name || 'Unknown Station'}</span>
                  </div>
                  <div className={styles.alertDetails}>
                    <span className={styles.alertType}>{alert.type}</span>
                    <span className={styles.alertTime}>{new Date(alert.triggeredAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
            <div className={styles.viewAll}>
              <Link to="/alerts">View all alerts &rarr;</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
