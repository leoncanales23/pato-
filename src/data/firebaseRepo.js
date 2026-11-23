// Repositorio Firebase (Auth + Firestore con caché offline persistente).
// Se activa automáticamente si existen las variables VITE_FIREBASE_*.
// ESTADO: escrito según la API oficial de Firebase v12, PENDIENTE de prueba
// contra un proyecto real (requiere credenciales del cliente).
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, addDoc, runTransaction, query, orderBy,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { localRepo } from './localRepo.js';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigurado = !!(cfg.apiKey && cfg.projectId);

let app, auth, db, storage, functions;
function init() {
  if (app) return;
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  storage = getStorage(app);
  functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'southamerica-east1');
}

// Historial y versiones van en subcolecciones de solo-agregar (ver firestore.rules).
const SEPARADOS = ['historial', 'versiones'];

export const firebaseRepo = {
  modo: 'firebase',
  init,
  onAuth(cb) {
    init();
    return onAuthStateChanged(auth, async (fu) => {
      if (!fu) return cb(null);
      const snap = await getDoc(doc(db, 'usuarios', fu.uid));
      const perfil = snap.exists() ? snap.data() : null;
      cb(perfil && perfil.activo !== false
        ? { id: fu.uid, email: fu.email, nombre: perfil.nombre || fu.email, rol: perfil.rol }
        : { id: fu.uid, email: fu.email, nombre: fu.email, rol: null });
    });
  },
  login: (email, pass) => { init(); return signInWithEmailAndPassword(auth, email, pass); },
  logout: () => signOut(auth),

  async listControles() {
    init();
    const snap = await getDocs(query(collection(db, 'controles'), orderBy('actualizadoEn', 'desc')));
    return snap.docs.map((d) => ({ ...d.data(), historial: [], versiones: [] }));
  },
  async getControl(id) {
    init();
    const s = await getDoc(doc(db, 'controles', id));
    if (!s.exists()) return null;
    const [h, v] = await Promise.all([
      getDocs(query(collection(db, 'controles', id, 'historial'), orderBy('fecha'))),
      getDocs(query(collection(db, 'controles', id, 'versiones'), orderBy('version'))),
    ]);
    return { ...s.data(), historial: h.docs.map((d) => d.data()), versiones: v.docs.map((d) => d.data()) };
  },
  async putControl(control, { nuevosHistorial = [], nuevaVersion = null } = {}) {
    init();
    const base = Object.fromEntries(Object.entries(control).filter(([k]) => !SEPARADOS.includes(k)));
    await setDoc(doc(db, 'controles', control.id), base);
    for (const h of nuevosHistorial) await addDoc(collection(db, 'controles', control.id, 'historial'), h);
    if (nuevaVersion) await setDoc(doc(db, 'controles', control.id, 'versiones', 'v' + nuevaVersion.version), nuevaVersion);
    return control;
  },
  async nextNumero() {
    init();
    const r = doc(db, 'meta', 'contadores');
    return runTransaction(db, async (tx) => {
      const s = await tx.get(r);
      const n = ((s.exists() && s.data().ultimoNumero) || 0) + 1;
      tx.set(r, { ultimoNumero: n }, { merge: true });
      return n;
    });
  },
  async peekNumero() {
    init();
    const s = await getDoc(doc(db, 'meta', 'contadores'));
    return ((s.exists() && s.data().ultimoNumero) || 0) + 1;
  },

  // Borradores: siempre en el dispositivo (protección sin conexión).
  putDraft: localRepo.putDraft,
  getDraft: localRepo.getDraft,
  delDraft: localRepo.delDraft,

  async uploadPdf(controlId, version, blob) {
    init();
    const r = ref(storage, `controles/${controlId}/CONTROL-PREFRIOS-v${version}-${Date.now()}.pdf`);
    await uploadBytes(r, blob, { contentType: 'application/pdf' });
    return getDownloadURL(r);
  },
  async enviarCorreo(payload) {
    init();
    const fn = httpsCallable(functions, 'enviarControlPorCorreo');
    return (await fn(payload)).data;
  },

  async getSensorConfig() { init(); const s = await getDoc(doc(db, 'sensorBridge', 'config')); return s.exists() ? s.data() : null; },
  async putSensorConfig(c) { init(); await setDoc(doc(db, 'sensorBridge', 'config'), c); },
  async listAsociaciones() { init(); const s = await getDocs(collection(db, 'sensorAsociaciones')); return s.docs.map((d) => d.data()); },
  async putAsociaciones(list) { init(); for (const a of list) await setDoc(doc(db, 'sensorAsociaciones', a.id), a); },
};
