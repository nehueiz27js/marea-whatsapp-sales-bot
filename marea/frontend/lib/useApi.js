'use client';
import { useCallback, useEffect, useState } from 'react';

// Consulta el backend (vía el proxy /api) y se refresca solo cada `intervalMs`.
export function useApi(path, intervalMs = 4000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const res = await fetch(`/api${path}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [path]);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  return { data, error, reload: load };
}

export async function send(path, method, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}
