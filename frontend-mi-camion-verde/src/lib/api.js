const CACHE_KEY = 'mcv-cache';

export function getToken() {
  return localStorage.getItem('mcv-token') || '';
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  try {
    const res = await fetch(path, { method, headers, body: payload });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No pudimos completar la acción');
    if (method === 'GET') {
      const bag = readCache();
      bag[path] = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(bag));
    }
    return data;
  } catch (err) {
    if (method === 'GET') {
      const cached = readCache()[path];
      if (cached) return { ...cached, desdeCache: true };
    }
    if (err instanceof TypeError) throw new Error('Sin conexión con el servidor');
    throw err;
  }
}

export function homeFor(rol) {
  if (rol === 'administrador_socio') return '/operacion';
  if (rol === 'gerente_general') return '/gerencia';
  if (rol === 'directora_admin_comercial') return '/comercial';
  return '/';
}
