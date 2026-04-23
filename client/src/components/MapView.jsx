import { useEffect, useRef, useCallback, useState } from 'react';
import {
  MapContainer, TileLayer, Rectangle, Polyline,
  CircleMarker, Tooltip, ZoomControl, useMap, useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

const DEFAULT_CENTER = [28.6139, 77.2090];
const DEFAULT_ZOOM   = 18;

function MapController({ center, follow }) {
  const map        = useMap();
  const prevCenter = useRef(null);
  useEffect(() => {
    if (!follow || !center) return;
    const p = prevCenter.current;
    if (!p || Math.abs(p.lat - center.lat) > 0.000010 || Math.abs(p.lng - center.lng) > 0.000010) {
      map.panTo([center.lat, center.lng], { animate: true, duration: 0.6 });
      prevCenter.current = center;
    }
  }, [center, follow, map]);
  return null;
}

function InitialPositionSetter({ position, triggered }) {
  const map  = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (triggered && position && !done.current) {
      map.setView([position.lat, position.lng], DEFAULT_ZOOM, { animate: true });
      done.current = true;
    }
  }, [triggered, position, map]);
  return null;
}

function RecenterControl({ position }) {
  const map      = useMap();
  const [spin, setSpin] = useState(false);

  const go = () => {
    if (!position) return;
    setSpin(true);
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), DEFAULT_ZOOM), {
      animate: true, duration: 0.8,
    });
    setTimeout(() => setSpin(false), 950);
  };

  return (
    <div className="leaflet-bottom leaflet-left" style={{ marginBottom: '90px', marginLeft: '12px' }}>
      <div className="leaflet-control">
        <button
          id="btn-recenter"
          className={`recenter-btn ${spin ? 'spinning' : ''} ${!position ? 'disabled' : ''}`}
          onClick={go}
          title={position ? 'Recenter on my location' : 'No GPS yet'}
          disabled={!position}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2"  x2="12" y2="6"  />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="6"  y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          Recenter
        </button>
      </div>
    </div>
  );
}

function ViewportLoader({ onViewport }) {
  useMapEvents({
    moveend: (e) => onViewport(e.target.getBounds()),
    zoomend: (e) => onViewport(e.target.getBounds()),
  });
  return null;
}

export default function MapView({
  position, tiles, path, nearbyUsers,
  isRunning, isPaused, follow, onTilesLoaded,
  showTiles = true, showUsers = true,
}) {
  const boundsRef = useRef(null);

  const handleViewport = useCallback(async (bounds) => {
    const c   = bounds.getCenter();
    const key = `${c.lat.toFixed(3)}_${c.lng.toFixed(3)}`;
    if (boundsRef.current === key) return;
    boundsRef.current = key;
    try {
      const { data } = await api.get('/tiles', { params: { lat: c.lat, lng: c.lng, radius: 800 } });
      onTilesLoaded?.(data.tiles);
    } catch { /* silent */ }
  }, [onTilesLoaded]);

  const tileList = Object.values(tiles);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      maxZoom={20}
      minZoom={14}
      zoomControl={false}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={20}
      />

      <ZoomControl position="bottomright" />
      <RecenterControl position={position} />
      <InitialPositionSetter position={position} triggered={isRunning} />
      <MapController center={position} follow={follow && isRunning && !isPaused} />
      <ViewportLoader onViewport={handleViewport} />

      {/* Territory tiles */}
      {showTiles && tileList.map((tile) => (
        <Rectangle
          key={tile.tileId}
          bounds={[[tile.bounds.sw.lat, tile.bounds.sw.lng], [tile.bounds.ne.lat, tile.bounds.ne.lng]]}
          pathOptions={{ color: tile.ownerColor, fillColor: tile.ownerColor, fillOpacity: 0.42, weight: 1.5, opacity: 0.72 }}
        >
          <Tooltip sticky direction="top">
            <strong>{tile.ownerUsername}</strong>
          </Tooltip>
        </Rectangle>
      ))}

      {/* Running path */}
      {path.length > 1 && (
        <Polyline
          positions={path.map(p => [p.lat, p.lng])}
          pathOptions={{ color: '#4ade80', weight: 4, opacity: isPaused ? 0.4 : 0.9, lineCap: 'round', lineJoin: 'round' }}
        />
      )}

      {/* User marker */}
      {position && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={isRunning ? 11 : 9}
          pathOptions={{
            color: '#ffffff',
            fillColor: isPaused ? '#f59e0b' : isRunning ? '#4ade80' : '#60a5fa',
            fillOpacity: 1, weight: 3,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -14]}>
            {isPaused ? '⏸ Paused' : 'You'}
          </Tooltip>
        </CircleMarker>
      )}

      {/* Nearby runners */}
      {showUsers && nearbyUsers.map((u) => (
        <CircleMarker
          key={u.userId}
          center={[u.lat, u.lng]}
          radius={9}
          pathOptions={{ color: '#ffffff', fillColor: u.color, fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <strong>{u.username}</strong><br/>{u.distance}m away
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
