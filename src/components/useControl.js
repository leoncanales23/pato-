// Estado de trabajo de un control: copia editable + borrador de recuperación
// (se guarda en el dispositivo a cada cambio para no perder datos si se corta la conexión
// o se cierra la app) + guardado formal con historial.
import { useCallback, useEffect, useRef, useState } from 'react';
import { repo, guardarControl } from '../data/store.js';
import { estadoDerivado } from '../model/control.js';

export function useControl(id, usuario) {
  const [guardado, setGuardado] = useState(null);
  const [c, setC] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const timer = useRef();

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const g = await repo.getControl(id);
        if (!vivo) return;
        if (!g) { setError('Registro no encontrado.'); return; }
        setGuardado(g); setC(g);
        const d = await repo.getDraft(id);
        if (d && JSON.stringify(d.data) !== JSON.stringify(g) && d.data.actualizadoEn === g.actualizadoEn) setDraft(d);
        else if (d) await repo.delDraft(id);
      } catch (e) { setError('No se pudo cargar: ' + e.message); }
    })();
    return () => { vivo = false; };
  }, [id]);

  const sucio = !!(c && guardado && JSON.stringify(c) !== JSON.stringify(guardado));

  useEffect(() => {
    if (!c || !sucio) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => repo.putDraft(c.id, c), 400);
    return () => clearTimeout(timer.current);
  }, [c, sucio]);

  useEffect(() => {
    const h = (e) => { if (sucio) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sucio]);

  const actualizar = useCallback((fn) => setC((prev) => {
    const next = typeof fn === 'function' ? fn(structuredClone(prev)) : fn;
    return { ...next, estado: estadoDerivado(next) };
  }), []);

  const guardar = useCallback(async (accion) => {
    setGuardando(true);
    try {
      const next = await guardarControl(guardado, c, usuario, accion);
      setGuardado(next); setC(next);
      return next;
    } finally { setGuardando(false); }
  }, [guardado, c, usuario]);

  const recuperarDraft = () => { setC(draft.data); setDraft(null); };
  const descartarDraft = async () => { await repo.delDraft(id); setDraft(null); };
  const reemplazar = (next) => { setGuardado(next); setC(next); };

  return { c, guardado, sucio, error, guardando, draft, actualizar, guardar, recuperarDraft, descartarDraft, reemplazar };
}
