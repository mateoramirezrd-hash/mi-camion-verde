const DB = 'mcv-outbox';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('quejas', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarQuejaOffline(payload) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('quejas', 'readwrite');
    tx.objectStore('quejas').put({ id: crypto.randomUUID(), creado: Date.now(), ...payload });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function pendientesOffline() {
  const db = await openDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction('quejas', 'readonly');
    const req = tx.objectStore('quejas').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

export async function sincronizarQuejas(token) {
  const items = await pendientesOffline();
  const enviados = [];
  for (const item of items) {
    const form = new FormData();
    form.set('tipo', item.tipo);
    form.set('descripcion', item.descripcion);
    if (item.referencia) form.set('referencia', item.referencia);
    if (item.latitud) form.set('latitud', item.latitud);
    if (item.longitud) form.set('longitud', item.longitud);
    if (item.foto) form.set('fotos', item.foto, item.fotoName || 'reporte.jpg');
    const res = await fetch('/api/cliente/quejas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) continue;
    enviados.push(item.id);
  }
  if (enviados.length) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('quejas', 'readwrite');
      const store = tx.objectStore('quejas');
      enviados.forEach((id) => store.delete(id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }
  return enviados.length;
}
