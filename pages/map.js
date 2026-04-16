import { useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import { MAP_CONFIG, worldToMap } from '../lib/mapConfig';

const REFRESH_INTERVAL = 5000; // 5 seconds

export default function MapPage() {
  const { data: session, status } = useSession();
  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const leafRef   = useRef(null);
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);

  // Initialize Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || leafRef.current) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const L = window.L;
      const bounds = [[0, 0], [MAP_CONFIG.imageHeight, MAP_CONFIG.imageWidth]];
      const map = L.map(mapRef.current, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 2 });
      L.imageOverlay('/map.jpg', bounds).addTo(map);
      map.fitBounds(bounds);
      leafRef.current = { L, map };
    };
    document.head.appendChild(script);
  }, []);

  // Fetch position
  const fetchLocation = async () => {
    try {
      const r = await fetch('/api/location');
      const d = await r.json();
      setData(d);
      setError(null);

      if (d.linked && d.online && leafRef.current) {
        const { L, map } = leafRef.current;
        const pos = worldToMap(d.pos_x, d.pos_z);
        if (markerRef.current) {
          markerRef.current.setLatLng(pos);
        } else {
          markerRef.current = L.circleMarker(pos, {
            radius: 10, color: '#c8b89a', fillColor: '#e05555', fillOpacity: 0.9, weight: 2,
          }).addTo(map).bindPopup('Your position');
          map.setView(pos, 0);
        }
      }
    } catch (e) {
      setError('Failed to load location');
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchLocation();
    const id = setInterval(fetchLocation, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [status]);

  return (
    <>
      <Head><title>Live Map</title></Head>
      <div style={{ width: '100vw', height: '100vh', background: '#0d1117', position: 'relative' }}>
        {status === 'unauthenticated' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, flexDirection: 'column', gap: 16, color: '#e6edf3', fontFamily: 'system-ui' }}>
            <p>Sign in with Discord to view your map position.</p>
            <button onClick={() => signIn('discord')} style={{ padding: '10px 24px', background: '#5865F2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15 }}>
              Login with Discord
            </button>
          </div>
        )}
        {data && !data.linked && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#21262d', color: '#f0883e', padding: '8px 16px', borderRadius: 6, zIndex: 999, border: '1px solid #f0883e' }}>
            ⚠️ Your Steam account is not linked in PrimalCore (idsync table).
          </div>
        )}
        {data?.linked && data?.online && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(13,17,23,0.88)', color: '#e6edf3', padding: '12px 16px', borderRadius: 8, zIndex: 999, fontSize: 13, border: '1px solid #30363d', lineHeight: 1.7 }}>
            <div>❤️ HP: {Math.round(data.hp)}%</div>
            <div>🍖 Hunger: {Math.round(data.hunger)}%</div>
            <div>💧 Thirst: {Math.round(data.thirst)}%</div>
            <div>🌱 Growth: {Math.round(data.growth * 100)}%</div>
            <div style={{ color: '#8b949e', fontSize: 11, marginTop: 6 }}>Auto-refresh every 5s</div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}