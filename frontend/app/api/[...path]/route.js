// Proxy hacia el backend: el navegador nunca ve la clave de administración.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

async function proxy(req, { params }) {
  const url = `${BACKEND}/api/${params.path.join('/')}${new URL(req.url).search}`;
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ADMIN_API_KEY) headers['x-api-key'] = process.env.ADMIN_API_KEY;

  const init = { method: req.method, headers, cache: 'no-store' };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = await req.text();

  try {
    const res = await fetch(url, init);
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return Response.json({ error: 'No se pudo conectar con el backend' }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH };
