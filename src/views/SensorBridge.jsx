// FASE 8 — VIBRAALTO SENSOR BRIDGE (BETA).
// Solo estructura preparatoria. NO existe conexión real: no se inventan protocolos,
// fabricantes, endpoints ni formatos. No se solicitan ni almacenan credenciales.
// Las lecturas de demostración se marcan SIMULACIÓN y nunca se escriben en los pallets.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App.jsx';
import { repo } from '../data/store.js';
import { puede } from '../auth/permissions.js';
import { estaCerrado, formatoFecha, formatoFechaHora, nowISO, uid } from '../model/control.js';

const CONFIG_VACIA = { fabricante: '', modelo: '', dispositivos: [], notas: '' };

export default function SensorBridge() {
  const { usuario } = useApp();
  const admin = puede(usuario, 'sensores');
  const [cfg, setCfg] = useState(CONFIG_VACIA);
  const [asoc, setAsoc] = useState([]);
  const [controles, setControles] = useState([]);
  const [sel, setSel] = useState({ controlId: '', palletCodigo: '', sensorId: '' });
  const [nuevoDisp, setNuevoDisp] = useState('');
  const [demo, setDemo] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    repo.getSensorConfig().then((c) => c && setCfg({ ...CONFIG_VACIA, ...c }));
    repo.listAsociaciones().then(setAsoc);
    repo.listControles().then((l) => setControles(l.filter((c) => !estaCerrado(c)).sort((a, b) => b.fecha.localeCompare(a.fecha))));
  }, []);

  const control = controles.find((c) => c.id === sel.controlId);
  const guardarCfg = async (next) => { setCfg(next); await repo.putSensorConfig(next); };

  const asociar = async () => {
    const a = { id: uid(), controlId: control.id, controlNumero: control.numero, palletId: control.pallets.find((p) => p.codigo === sel.palletCodigo)?.id || '', palletCodigo: sel.palletCodigo, sensorId: sel.sensorId, creadoPor: usuario.nombre, creadoEn: nowISO(), activo: true };
    const next = [...asoc, a];
    setAsoc(next); await repo.putAsociaciones(next);
    setMsg(`Sensor ${a.sensorId} asociado al pallet ${a.palletCodigo} (registro N° ${a.controlNumero}).`);
    setSel({ ...sel, palletCodigo: '', sensorId: '' });
  };

  const desasociar = async (id) => {
    const next = asoc.map((a) => (a.id === id ? { ...a, activo: false, desactivadoPor: usuario.nombre, desactivadoEn: nowISO() } : a));
    setAsoc(next); await repo.putAsociaciones(next);
  };

  const activas = asoc.filter((a) => a.activo);
  const demoLecturas = useMemo(() => (demo ? activas.slice(0, 5).map((a, i) => ({ ...a, temp: (8 - i * 0.7).toFixed(1), t: new Date(Date.now() - i * 60000).toISOString() })) : []), [demo, activas]);

  return (
    <div className="page sensor">
      <div className="beta-banner" role="status">BETA: INTEGRACIÓN PENDIENTE DE VALIDACIÓN OPERATIVA</div>
      <h1 className="page-t">VIBRAALTO SENSOR BRIDGE <span className="beta-tag">BETA / EN DESARROLLO</span></h1>
      <p className="muted">Módulo preparatorio para la futura integración con sondas digitales de temperatura de pulpa. No hay sensores conectados ni datos reales en esta etapa. Sin alertas automáticas ni decisiones de enfriamiento hasta que operador y fabricante definan los criterios.</p>

      <section className="sec">
        <div className="sec-h"><h2>A · CONEXIÓN API</h2></div>
        <div className="grid2">
          <label className="campo"><span>Fabricante del sensor</span><input value={cfg.fabricante} disabled={!admin} onChange={(e) => setCfg({ ...cfg, fabricante: e.target.value })} onBlur={() => guardarCfg(cfg)} placeholder="Por definir" /></label>
          <label className="campo"><span>Modelo</span><input value={cfg.modelo} disabled={!admin} onChange={(e) => setCfg({ ...cfg, modelo: e.target.value })} onBlur={() => guardarCfg(cfg)} placeholder="Por definir" /></label>
        </div>
        <div className="kv">
          <div><span>Estado de conexión</span><b className="st-off">SIN CONEXIÓN · integración no definida</b></div>
          <div><span>Disponibilidad</span><b>No disponible</b></div>
          <div><span>Última sincronización</span><b>Nunca</b></div>
          <div><span>Endpoint / API</span><b>Pendiente de definición con el fabricante</b></div>
        </div>
        <p className="muted sm">Por seguridad, este módulo no solicita ni almacena credenciales hasta que exista una integración validada.</p>

        <h3>Dispositivos registrados</h3>
        {cfg.dispositivos.length === 0 && <p className="muted">Ninguno.</p>}
        <ul className="chips">{cfg.dispositivos.map((d) => <li key={d}>{d} <small>· sin conexión</small>{admin && <button className="btn-x sm" aria-label={`Quitar ${d}`} onClick={() => guardarCfg({ ...cfg, dispositivos: cfg.dispositivos.filter((x) => x !== d) })}>×</button>}</li>)}</ul>
        {admin && (
          <form className="fila-form" onSubmit={(e) => { e.preventDefault(); const d = nuevoDisp.trim(); if (d && !cfg.dispositivos.includes(d)) guardarCfg({ ...cfg, dispositivos: [...cfg.dispositivos, d] }); setNuevoDisp(''); }}>
            <input value={nuevoDisp} onChange={(e) => setNuevoDisp(e.target.value)} placeholder="Identificador del dispositivo (serie)" />
            <button className="btn">Registrar</button>
          </form>
        )}
      </section>

      <section className="sec">
        <div className="sec-h"><h2>B · ASOCIACIÓN CON PALLETS</h2></div>
        <p className="muted sm">La asociación usa el código real del pallet, no su posición en la hoja.</p>
        {admin ? (
          <div className="form">
            <label>Registro de prefrío
              <select value={sel.controlId} onChange={(e) => setSel({ controlId: e.target.value, palletCodigo: '', sensorId: sel.sensorId })}>
                <option value="">— seleccionar —</option>
                {controles.map((c) => <option key={c.id} value={c.id}>N° {c.numero} · {formatoFecha(c.fecha)} · {c.especie} · {c.pallets.length} pallets</option>)}
              </select>
            </label>
            <label>Pallet
              <select value={sel.palletCodigo} disabled={!control} onChange={(e) => setSel({ ...sel, palletCodigo: e.target.value })}>
                <option value="">— seleccionar —</option>
                {control?.pallets.filter((p) => p.codigo).map((p) => <option key={p.id}>{p.codigo}</option>)}
              </select>
            </label>
            <label>Sensor
              <select value={sel.sensorId} onChange={(e) => setSel({ ...sel, sensorId: e.target.value })}>
                <option value="">— seleccionar —</option>
                {cfg.dispositivos.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <button className="btn primary" disabled={!control || !sel.palletCodigo || !sel.sensorId} onClick={asociar}>Asociar sensor al pallet</button>
            {msg && <div className="aviso ok">{msg}</div>}
          </div>
        ) : <p className="muted">Solo el ADMINISTRADOR puede asociar sensores.</p>}

        <h3>Asociaciones activas</h3>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Sensor</th><th>Pallet</th><th>Registro</th><th>Asociado</th><th></th></tr></thead>
            <tbody>
              {activas.length === 0 && <tr><td colSpan={5} className="muted">Sin asociaciones.</td></tr>}
              {activas.map((a) => <tr key={a.id}><td>{a.sensorId}</td><td>{a.palletCodigo}</td><td>N° {a.controlNumero}</td><td className="sm">{a.creadoPor} · {formatoFechaHora(a.creadoEn)}</td><td>{admin && <button className="btn sm" onClick={() => desasociar(a.id)}>Desasociar</button>}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>C · REGISTRO DE TEMPERATURAS (FUTURO)</h2></div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>T° pulpa</th><th>T° registrada</th><th>Fecha y hora</th><th>Sensor</th><th>Pallet</th><th>Origen</th></tr></thead>
            <tbody>
              {!demo && <tr><td colSpan={6} className="muted">Sin lecturas. No existe integración activa con sensores.</td></tr>}
              {demoLecturas.map((l) => (
                <tr key={l.id} className="sim"><td>{l.temp}</td><td>—</td><td>{formatoFechaHora(l.t)}</td><td>{l.sensorId}</td><td>{l.palletCodigo}</td><td><b className="sim-tag">SIMULACIÓN</b></td></tr>
              ))}
              {demo && demoLecturas.length === 0 && <tr className="sim"><td colSpan={6}>SIMULACIÓN: asocie al menos un sensor para ver la vista de demostración.</td></tr>}
            </tbody>
          </table>
        </div>
        <label className="demo-tog"><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Mostrar vista de demostración (<b>SIMULACIÓN</b>: valores ficticios, no se guardan ni se copian a pallets)</label>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>D · ESTADO EXPERIMENTAL</h2></div>
        <ul className="sm">
          <li>Protocolo, formato de datos y fabricante: <b>pendientes de definir</b>.</li>
          <li>Datos simulados separados de datos reales: los pallets solo reciben temperaturas ingresadas por operadores.</li>
          <li>Sin alertas automáticas ni criterios de calidad hasta validación operador + fabricante.</li>
        </ul>
      </section>
    </div>
  );
}
