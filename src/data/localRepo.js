// Repositorio local (IndexedDB). Funciona 100% sin conexión.
// Se usa cuando no hay configuración de Firebase (VITE_FIREBASE_*).
import { get, set, del, keys, createStore } from 'idb-keyval';

const store = createStore('vibraalto-coldchain', 'kv');

export const localRepo = {
  modo: 'local',

  async listControles() {
    const ks = (await keys(store)).filter((k) => String(k).startsWith('control:'));
    const items = await Promise.all(ks.map((k) => get(k, store)));
    return items.filter(Boolean);
  },
  async getControl(id) {
    return (await get('control:' + id, store)) || null;
  },
  async putControl(control) {
    await set('control:' + control.id, control, store);
    return control;
  },
  async nextNumero() {
    const n = ((await get('meta:ultimoNumero', store)) || 0) + 1;
    await set('meta:ultimoNumero', n, store);
    return n;
  },
  async peekNumero() {
    return ((await get('meta:ultimoNumero', store)) || 0) + 1;
  },

  // Borradores de recuperación (protección ante cortes / cierre de la app).
  async putDraft(id, data) { await set('draft:' + id, { data, guardadoEn: new Date().toISOString() }, store); },
  async getDraft(id) { return (await get('draft:' + id, store)) || null; },
  async delDraft(id) { await del('draft:' + id, store); },

  // Usuarios del dispositivo (modo local, sin autenticación real).
  async listUsuarios() { return (await get('usuarios', store)) || []; },
  async putUsuarios(list) { await set('usuarios', list, store); },
  async getSesion() { return (await get('sesion', store)) || null; },
  async setSesion(u) { u ? await set('sesion', u, store) : await del('sesion', store); },

  // Sensor Bridge (solo estructura; no almacena credenciales).
  async getSensorConfig() { return (await get('sensor:config', store)) || null; },
  async putSensorConfig(c) { await set('sensor:config', c, store); },
  async listAsociaciones() { return (await get('sensor:asociaciones', store)) || []; },
  async putAsociaciones(list) { await set('sensor:asociaciones', list, store); },
};
