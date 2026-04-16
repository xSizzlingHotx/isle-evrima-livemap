import { signIn } from 'next-auth/react';
export default function Login() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>🗺️ Isle Livemap</h1>
        <p style={{ color: '#8b949e', marginBottom: 32 }}>Sign in to view your real-time position</p>
        <button
          onClick={() => signIn('discord', { callbackUrl: '/map' })}
          style={{ padding: '12px 32px', background: '#5865F2', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
          Login with Discord
        </button>
      </div>
    </div>
  );
}