import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { getStations } from '../../services/stationService';
import { getSensors } from '../../services/sensorService';
import styles from './Map.module.css';
import { AlertTriangle } from 'lucide-react';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});



const MapView = () => {
  const [stations, setStations] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      let loadedStations = [];
      let loadedSensors = [];

      try {
        const stationsRes = await getStations();
        if (stationsRes.success) {
          loadedStations = stationsRes.data;
          setStations(loadedStations);
        } else {
          setError(`Station API returned false success: ${JSON.stringify(stationsRes)}`);
        }
      } catch (err) {
        setError(`Error fetching stations: ${err.message || err.toString()}`);
        console.error('getStations err:', err);
        setLoading(false);
        return;
      }

      try {
        const sensorsRes = await getSensors();
        if (sensorsRes.success) {
          loadedSensors = sensorsRes.data;
          setSensors(loadedSensors);
        } else {
          setError(`Sensor API returned false success: ${JSON.stringify(sensorsRes)}`);
        }
      } catch (err) {
        setError(`Error fetching sensors: ${err.message || err.toString()}`);
        console.error('getSensors err:', err);
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const getStationSensors = (stationId) => {
    return sensors.filter(s => s.station === stationId || (s.station && s.station._id === stationId));
  };

  const validStations = stations.filter(s => {
    if (!s.location) return false;
    const lat = parseFloat(s.location.latitude);
    const lng = parseFloat(s.location.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });

  const defaultCenter = [13.0827, 80.2707]; // Chennai, India
  const center = defaultCenter;
  const initialZoom = 10;

  // Prevent rendering map simultaneously with error state if we want to ensure clean DOM
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Interactive Map</h1>
            <p className={styles.subtitle}>Geographic distribution of monitoring stations</p>
          </div>
        </div>
        <div className={styles.emptyState} style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ color: '#ef4444', textAlign: 'center' }}>{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Interactive Map</h1>
          <p className={styles.subtitle}>Geographic distribution of monitoring stations. (Default view: Chennai, India)</p>
          {validStations.length > 0 && (
            <p className={styles.subtitle} style={{ color: 'var(--info)', marginTop: '0.25rem', fontSize: '0.8rem' }}>
              Note: The markers on this map represent the exact coordinates currently stored in the database for each station.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading map data...</div>
      ) : validStations.length === 0 ? (
        <div className={styles.emptyState}>
          No stations with valid coordinates found. Please update station locations in the Stations module.
        </div>
      ) : (
        <div className={styles.mapWrapper} style={{ position: 'relative' }}>
          {tileError && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(243, 244, 246, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              color: '#374151',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Map Tiles Failed to Load</h3>
              <p>The map imagery could not be retrieved from OpenStreetMap. This might be due to network issues, a firewall, or an ad blocker.</p>
            </div>
          )}
          <MapContainer 
            center={center} 
            zoom={initialZoom} 
            style={{ height: '100%', minHeight: '500px', width: '100%', display: 'block' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setTileError(true)
              }}
            />
            <ZoomControl position="bottomright" />
            
            {validStations.map(station => {
              const stationSensors = getStationSensors(station._id);
              const onlineSensors = stationSensors.filter(s => s.status === 'ONLINE').length;
              const lat = parseFloat(station.location.latitude);
              const lng = parseFloat(station.location.longitude);
              
              return (
                <Marker 
                  key={station._id} 
                  position={[lat, lng]}
                >
                  <Popup>
                    <div className={styles.popupContent}>
                      <h3 className={styles.popupTitle}>{station.name}</h3>
                      <p className={styles.popupSubtitle}>{station.stationId} • {station.region}</p>
                      
                      <div className={styles.popupStats}>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Status</span>
                          <span className={styles.statValue} style={{ 
                            color: station.status === 'ONLINE' ? '#10b981' : 
                                   station.status === 'OFFLINE' ? '#ef4444' : '#f59e0b'
                          }}>
                            {station.status}
                          </span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Sensors</span>
                          <span className={styles.statValue}>{onlineSensors} / {stationSensors.length} Online</span>
                        </div>
                      </div>
                      
                      <Link to={`/live?station=${station._id}`} className={styles.popupButton}>
                        View Live Data
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default MapView;
