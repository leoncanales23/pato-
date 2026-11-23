// FASE 7 — HISTORIAL DE OPERACIONES y trazabilidad.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App.jsx';
import { repo } from '../data/store.js';
import { Estado, Modal } from '../components/ui.jsx';
import { ESTADOS, formatoFecha, formatoFechaHora } from '../model/control.js';
import { puede } from '../auth/permissions.js';
import { generarPdf, descargarBlob, nombreArchivo } from '../doc/pdf.js';

export default function Historial() {
  const { usuario } = useApp();
  const [lista, setLista] = useState(null);
  const [f, setF] = useState({ desde: '', hasta: '', numero: '', exportadora: '', pallet: '', estado: '' });
  const [cambios, setCambios] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => { repo.listControles().then((l) => setLista(l.sort((a, b) => (b.fecha + b.numero).localeCompare(a.fecha + a.numero)))); }, []);

  const filtrados = useMemo(() => (lista || []).filter((c) => {
    if (f.desde && c.fecha < f.desde) return false;
    if (f.hasta && c.fecha > f.hasta) return false;
    if (f.numero && !String(c.numero).includes(f.numero.trim())) return false;
    if (f.exportadora && !c.exportadora.toLowerCase().includes(f.exportadora.trim().toLowerCase())) return false;
    if (f.estado && c.estado !== f.estado) return false;
    if (f.pallet && !c.pallets.some((p) => String(p.codigo).includes(f.pallet.trim()))) return false;
    return true;
  }), [lista, f]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pdf = async (c) => {
    setBusy(c.id);
    try { const full = await repo.getControl(c.id); descargarBlob(await generarPdf(full), nombreArchivo(full)); } finally { setBusy(''); }
  };

  const verCambios = async (c) => setCambios(await repo.getControl(c.id));

  return (
    <div className="page">
      <h1 className="page-t">HISTORIAL DE OPERACIONES</h1>
      <div className="filtros">
        <label>Desde<input type="date" value={f.desde} onChange={set('desde')} /></label>
        <label>Hasta<input type="date" value={f.hasta} onChange={set('hasta')} /></label>
        <label>N° registro<input value={f.numero} onChange={set('numero')} inputMode="numeric" /></label>
        <label>Exportadora<input value={f.exportadora} onChange={set('exportadora')} /></label>
        <label>Código pallet<input value={f.pallet} onChange={set('pallet')} inputMode="numeric" /></label>
        <label>Estado<select value={f.estado} onChange={set('estado')}><option value="">Todos</option>{Object.values(ESTADOS).map((e) => <option key={e}>{e}</option>)}</select></label>
      </div>
      {lista === null ? <p className="muted">Cargando…</p> : (
        <>
          <p className="muted sm">{filtrados.length} de {lista.length} registros</p>
          <div className="tabla-wrap">
            <table className="tabla hist">
              <thead><tr><th>N°</th><th>Fecha</th><th>Exportadora</th><th>Especie</th><th>Pallets</th><th>Responsable</th><th>Estado</th><th>Creado</th><th>Modificado</th><th></th></tr></thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.numero}</b></td>
                    <td>{formatoFecha(c.fecha)}</td>
                    <td>{c.exportadora}</td>
                    <td>{c.especie}</td>
                    <td>{c.pallets.length}{f.pallet && <small className="match"> ✓ {c.pallets.filter((p) => String(p.codigo).includes(f.pallet.trim())).map((p) => p.codigo).join(', ')}</small>}</td>
                    <td>{c.responsable}</td>
                    <td><Estado e={c.estado} />{c.version > 1 || c.versiones?.length ? <small> v{c.version}</small> : null}</td>
                    <td className="sm">{formatoFechaHora(c.creadoEn)}</td>
                    <td className="sm">{formatoFechaHora(c.actualizadoEn)}<br />{c.actualizadoPor}</td>
                    <td className="acciones">
                      <a className="btn sm" href={`#/hoja/${c.id}`}>Hoja</a>
                      <button className="btn sm" onClick={() => pdf(c)} disabled={busy === c.id}>{busy === c.id ? '…' : 'PDF'}</button>
                      {puede(usuario, 'verHistorialCambios') && <button className="btn sm" onClick={() => verCambios(c)}>Cambios</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {cambios && (
        <Modal titulo={`Historial de cambios · N° ${cambios.numero}`} onClose={() => setCambios(null)} ancho="760px">
          {cambios.versiones?.length > 0 && (
            <p className="sm"><b>Versiones finalizadas:</b> {cambios.versiones.map((v) => `v${v.version} (${formatoFechaHora(v.fecha)}, ${v.usuario})`).join(' · ')}</p>
          )}
          <ol className="audit">
            {[...cambios.historial].reverse().map((h) => (
              <li key={h.id}>
                <div><b>{h.accion}</b> · {formatoFechaHora(h.fecha)} · {h.usuario} <small>{h.rol}</small></div>
                <div className="sm muted">{h.detalle}</div>
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </div>
  );
}
