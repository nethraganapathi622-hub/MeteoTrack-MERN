import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card/Card';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import { Radio, AlertTriangle, Activity, ThermometerSun, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import styles from './Dashboard.module.css';
import { useTheme } from '../../context/ThemeContext';

// MOCK DATA
const trendData = [
  { time: '00:00', temp: 22.4, humidity: 45 },
  { time: '04:00', temp: 21.2, humidity: 48 },
  { time: '08:00', temp: 24.5, humidity: 42 },
  { time: '12:00', temp: 28.1, humidity: 35 },
  { time: '16:00', temp: 29.3, humidity: 32 },
  { time: '20:00', temp: 25.6, humidity: 40 },
  { time: '23:59', temp: 23.1, humidity: 44 },
];

const stationAlerts = [
  { id: 1, station: 'ST-Alpha-01', type: 'Temperature Spike', severity: 'WARNING', time: '10 mins ago' },
  { id: 2, station: 'ST-Beta-04', type: 'Connection Lost', severity: 'CRITICAL', time: '1 hour ago' },
  { id: 3, station: 'ST-Gamma-02', type: 'Sensor Drift', severity: 'MAINTENANCE', time: '2 hours ago' },
];

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
        <span className={styles[trend === 'up' ? 'trendUp' : 'trendDown']}>{trendValue}</span>
        <span className={styles.trendLabel}>vs last 24h</span>
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { theme } = useTheme();
  const chartColors = {
    temp: theme === 'dark' ? '#f59e0b' : '#d97706',
    humidity: theme === 'dark' ? '#60a5fa' : '#2563eb',
    grid: theme === 'dark' ? '#334155' : '#e5e7eb',
    text: theme === 'dark' ? '#94a3b8' : '#6b7280'
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <h1 className="h2">Overview</h1>
        <p className="text-secondary">Real-time system status and network health.</p>
      </div>

      <div className={styles.grid}>
        <MetricCard 
          title="Total Stations" 
          value="124" 
          icon={Radio} 
          trend="up" 
          trendValue="+3" 
          status="primary" 
        />
        <MetricCard 
          title="Online Stations" 
          value="118" 
          icon={Activity} 
          trend="up" 
          trendValue="95.1%" 
          status="success" 
        />
        <MetricCard 
          title="Active Alerts" 
          value="12" 
          icon={AlertTriangle} 
          trend="up" 
          trendValue="+2" 
          status="warning" 
        />
        <MetricCard 
          title="Sensor Health" 
          value="98.2%" 
          icon={ThermometerSun} 
          trend="down" 
          trendValue="-0.4%" 
          status="info" 
        />
      </div>

      <div className={styles.bentoGrid}>
        <Card className={styles.chartCard}>
          <CardHeader title="Network Temperature Trend (°C)" />
          <CardContent>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.temp} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.temp} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Area type="monotone" dataKey="temp" stroke={chartColors.temp} strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.chartCard}>
          <CardHeader title="Network Humidity Trend (%)" />
          <CardContent>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: chartColors.text, fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="humidity" stroke={chartColors.humidity} strokeWidth={2} dot={{r: 3, fill: chartColors.humidity}} activeDot={{r: 5}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.mapCard}>
          <CardHeader title="Live Station Map" action={<StatusBadge status="ONLINE" text="LIVE" />} />
          <CardContent className={styles.mapContent}>
            <div className={styles.mapPlaceholder}>
              <MapPin size={48} className={styles.mapIcon} />
              <p className={styles.mapText}>Interactive Map Visualization Container</p>
              <p className="text-xs text-muted">Ready for Mapbox/Leaflet integration in Phase 3</p>
              
              {/* Mock markers */}
              <div className={styles.mockMarker} style={{ top: '30%', left: '40%' }}>
                <span className={`${styles.markerDot} ${styles.bgSuccess}`}></span>
              </div>
              <div className={styles.mockMarker} style={{ top: '60%', left: '70%' }}>
                <span className={`${styles.markerDot} ${styles.bgWarning}`}></span>
              </div>
              <div className={styles.mockMarker} style={{ top: '50%', left: '20%' }}>
                <span className={`${styles.markerDot} ${styles.bgDanger}`}></span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.alertsCard}>
          <CardHeader title="Recent Alerts" />
          <CardContent className={styles.alertsList}>
            {stationAlerts.map(alert => (
              <div key={alert.id} className={styles.alertItem}>
                <div className={styles.alertMeta}>
                  <StatusBadge status={alert.severity} />
                  <span className={styles.alertStation}>{alert.station}</span>
                </div>
                <div className={styles.alertDetails}>
                  <span className={styles.alertType}>{alert.type}</span>
                  <span className={styles.alertTime}>{alert.time}</span>
                </div>
              </div>
            ))}
            <div className={styles.viewAll}>
              <a href="#alerts">View all alerts &rarr;</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
