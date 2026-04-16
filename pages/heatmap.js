import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { MAP_CONFIG, worldToMap } from '../lib/mapConfig';

const REFRESH_INTERVAL = 300000; // 5 minutes

export default function HeatmapPage() {
  const mapRef  = useRef(null);
  const leafRef = useRef(null);
  const [count, setCount] = useState(null);

  const fetchData = async () => {
    try {
      const r = await fetch('/api/heatmap');
      const d = await r.json();
      setCount(d.count);
      if (!leafRef.current) return;
      const { L, map } = leafRef.current;
      const points = d.points.map(p => [...worldToMap(p.x, p.z), 1.0]);
      if (leafRef.current.heat) {
        leafRef.current.heat.setLatLngs(points);
      } else {
        leafRef.current.heat = L.heatLayer(points, {
          radius: 25, blur: 20, maxZoom: 17,
          gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' },
        }).addTo(map);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || leafRef.current) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const s1 = document.createElement('script');
    s1.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      s2.onload = () => {
        const L = window.L;
        const bounds = [[0, 0], [MAP_CONFIG.imageHeight, MAP_CONFIG.imageWidth]];
        const map = L.map(mapRef.current, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 2 });
        L.imageOverlay('/map.jpg', bounds).addTo(map);
        map.fitBounds(bounds);
        leafRef.current = { L, map };
        fetchData();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }, []);

  useEffect(() => {
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Head><title>Heatmap</title></Head>
      <div style={{ width: '100vw', height: '100vh', background: '#0d1117', position: 'relative' }}>
        {count !== null && (
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(13,17,23,0.88)', color: '#e6edf3', padding: '10px 16px', borderRadius: 8, zIndex: 999, fontSize: 13, border: '1px solid #30363d' }}>
            🔥 {count} positions tracked (last 24h) · Auto-refresh every 5min
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}