// FASES 3 y 4 — Vista operativa (mobile first) del formulario CONTROL PRE FRÍOS
// y módulo dinámico de pallets. Mismo orden de secciones que la hoja física.
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../App.jsx';
import { useControl } from '../components/useControl.js';
import DocActions from '../components/DocActions.jsx';
import { Estado, Modal, Toast } from '../components/ui.jsx';
import { finalizarControl, reabrirControl } from '../data/store.js';
import { puede } from '../auth/permissions.js';
import {
  BOLSAS, CHECK_ITEMS, ENVASES, ETAPAS, PALLETS_POR_HOJA, estaCerrado, formatoFechaHora, horaLocal, hoyLocal,
  nowISO, nuevaFilaSeteo, nuevoPallet, uid, validarCierre,
} from '../model/control.js';

const SECCIONES = [
  ['sec-datos', 'Datos'], ['sec-inicio', 'Inicio'], ['sec-volteo', 'Volteo'], ['sec-salida', 'Salida'],
  ['sec-pallets', 'Pallets'], ['sec-check', 'Checklist'], ['sec-obs', 'Observ.'], ['sec-cierre', 'Cierre'],
];

export default function Editor({ id }) {
  const { usuario } = useApp();
  const st = useControl(id, usuario);
  const [toast, setToast] = useState(null);
  const aviso = useCallback((msg, tipo = 'ok') => setToast({ msg, tipo }), []);

  if (st.error) return <div className="page"><div className="aviso err">{st.error}</div><a className="btn" href="#/inicio">Volver</a></div>;
  if (!st.c) return <div className="page muted">Cargando registro…</div>;

  const { c, actualizar } = st;
  const cerrado = estaCerrado(c);
  const can = (a) => !cerrado && puede(usuario, a);

  const guardar = async () => {
    try { await st.guardar(); aviso('Registro guardado'); } catch (e) { aviso('No se pudo guardar: ' + e.message, 'err'); }
  };

  return (
    <div className="page editor">
      <div className="ed-head">
        <div>
          <div className="ed-t">CONTROL PRE FRÍOS <b>N° {c.numero}</b></div>
          <div className="ed-sub"><Estado e={c.estado} /> {c.pallets.length} pallets · {st.sucio ? <span className="sucio">cambios sin guardar (respaldados en el equipo)</span> : 'sin cambios pendientes'}</div>
        </div>
        <a className="btn" href={`#/hoja/${c.id}`}>VER HOJA</a>
      </div>

      {st.draft && (
        <div className="aviso warn">
          Hay cambios no guardados del {formatoFechaHora(st.draft.guardadoEn)} recuperados en este equipo.
          <div className="row-btns"><button className="btn primary sm" onClick={st.recuperarDraft}>Recuperar</button><button className="btn sm" onClick={st.descartarDraft}>Descartar</button></div>
        </div>
      )}
      {cerrado && <div className="aviso">Registro {c.estado} (v{c.version}). Solo lectura. {puede(usuario, 'reabrir') ? 'Puede reabrirlo en la sección Cierre.' : ''}</div>}

      <nav className="secnav">{SECCIONES.map(([a, l]) => <a key={a} href={'#/control/' + c.id} onClick={(e) => { e.preventDefault(); document.getElementById(a)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{l}</a>)}</nav>

      <DatosGenerales c={c} actualizar={actualizar} editable={can('editarEncabezado')} />
      <SeccionSeteo id="sec-inicio" titulo="HORA INICIO" campo="inicio" c={c} actualizar={actualizar} editable={can('registrarTemperaturas')} usuario={usuario} />
      <SeccionSeteo id="sec-volteo" titulo="HORA VOLTEO" campo="volteo" c={c} actualizar={actualizar} editable={can('registrarTemperaturas')} usuario={usuario} />
      <SeccionSalida c={c} actualizar={actualizar} editable={can('registrarTemperaturas')} usuario={usuario} />
      <Pallets c={c} actualizar={actualizar} usuario={usuario} editTemp={can('registrarTemperaturas')} adminPal={can('administrarPallets')} aviso={aviso} />
      <Checklist c={c} actualizar={actualizar} editable={can('completarChecklist')} usuario={usuario} />
      <Observaciones c={c} actualizar={actualizar} editable={can('registrarObservaciones')} usuario={usuario} />
      <Cierre st={st} usuario={usuario} aviso={aviso} />

      <DocActions c={c} usuario={usuario} sucio={st.sucio} guardando={st.guardando} onGuardar={guardar} onActualizado={st.reemplazar} aviso={aviso} puedeGuardar={!cerrado} />
      <Toast msg={toast?.msg} tipo={toast?.tipo} onDone={() => setToast(null)} />
    </div>
  );
}

function Sec({ id, titulo, children, extra }) {
  return (
    <section id={id} className="sec">
      <div className="sec-h"><h2>{titulo}</h2>{extra}</div>
      {children}
    </section>
  );
}

function Campo({ label, children, className = '' }) {
  return <label className={'campo ' + className}><span>{label}</span>{children}</label>;
}

function Toggle({ on, label, onClick, disabled }) {
  return <button type="button" className={'tog' + (on ? ' on' : '')} aria-pressed={on} onClick={onClick} disabled={disabled}>{label}</button>;
}

function DatosGenerales({ c, actualizar, editable }) {
  const set = (k, v) => actualizar((x) => { x[k] = v; return x; });
  return (
    <Sec id="sec-datos" titulo="DATOS GENERALES">
      <div className="grid2">
        <Campo label="N° REGISTRO"><input value={c.numero} onChange={(e) => set('numero', e.target.value)} disabled={!editable} inputMode="numeric" /></Campo>
        <Campo label="FECHA"><input type="date" value={c.fecha} onChange={(e) => set('fecha', e.target.value)} disabled={!editable} /></Campo>
        <Campo label="EXPORTADORA"><input value={c.exportadora} onChange={(e) => set('exportadora', e.target.value)} disabled={!editable} /></Campo>
        <Campo label="ESPECIE"><input value={c.especie} onChange={(e) => set('especie', e.target.value)} disabled={!editable} placeholder="Ej: nectarín" list="especies" /></Campo>
      </div>
      <datalist id="especies">{['Nectarín', 'Durazno', 'Ciruela', 'Cereza', 'Uva', 'Manzana', 'Pera', 'Kiwi', 'Damasco'].map((e) => <option key={e} value={e} />)}</datalist>
      <div className="grupo-tog">
        <span className="grupo-l">ENVASE</span>
        <div className="togs">{ENVASES.map((e) => <Toggle key={e} label={e} on={c.envase[e]} disabled={!editable} onClick={() => actualizar((x) => { x.envase[e] = !x.envase[e]; return x; })} />)}</div>
      </div>
      <div className="grupo-tog">
        <span className="grupo-l">BOLSA</span>
        <div className="togs">{BOLSAS.map((b) => <Toggle key={b.id} label={b.label} on={c.bolsa[b.id]} disabled={!editable} onClick={() => actualizar((x) => { x.bolsa[b.id] = !x.bolsa[b.id]; return x; })} />)}</div>
      </div>
    </Sec>
  );
}

function BtnAhora({ onClick, disabled }) {
  return <button type="button" className="btn sm ahora" onClick={onClick} disabled={disabled} title="Hora actual">ahora</button>;
}

function SeccionSeteo({ id, titulo, campo, c, actualizar, editable, usuario }) {
  const filas = c[campo];
  const set = (i, k, v) => actualizar((x) => {
    const f = x[campo][i];
    f[k] = v; f.registradoPor = usuario.nombre; f.registradoEn = nowISO();
    return x;
  });
  const vacia = (f) => !f.seteo && !f.hora && !f.sadema && !f.temp;
  return (
    <Sec id={id} titulo={titulo} extra={<span className="muted sm">SETEO · HORA · EMISOR (SADEMA / TEMP.)</span>}>
      <div className="seteo-head"><span>SETEO</span><span>HORA</span><span>SADEMA</span><span>TEMP.</span><span></span></div>
      {filas.map((f, i) => (
        <div className="seteo-row" key={f.id}>
          <input aria-label="Seteo" value={f.seteo} onChange={(e) => set(i, 'seteo', e.target.value)} disabled={!editable} inputMode="decimal" />
          <div className="hora-in">
            <input aria-label="Hora" type="time" value={f.hora} onChange={(e) => set(i, 'hora', e.target.value)} disabled={!editable} />
            {editable && !f.hora && <BtnAhora onClick={() => set(i, 'hora', horaLocal())} />}
          </div>
          <input aria-label="SADEMA" value={f.sadema} onChange={(e) => set(i, 'sadema', e.target.value)} disabled={!editable} />
          <input aria-label="Temp." value={f.temp} onChange={(e) => set(i, 'temp', e.target.value)} disabled={!editable} />
          <div>
            {editable && vacia(f) && filas.length > 1 && (
              <button className="btn-x sm" aria-label="Quitar fila" onClick={() => actualizar((x) => { x[campo].splice(i, 1); return x; })}>×</button>
            )}
          </div>
          {f.hora && f.registradoPor && <small className="meta">{f.registradoPor} · {formatoFechaHora(f.registradoEn)}</small>}
        </div>
      ))}
      {editable && <button className="btn sm" onClick={() => actualizar((x) => { x[campo].push(nuevaFilaSeteo(usuario)); return x; })}>+ Agregar seteo</button>}
      {filas.length > 3 && <p className="muted sm">La hoja física tiene 3 filas; las adicionales se imprimen en la hoja ANEXO.</p>}
    </Sec>
  );
}

function SeccionSalida({ c, actualizar, editable, usuario }) {
  const set = (k, v) => actualizar((x) => { x.salida[k] = v; x.salida.registradoPor = usuario.nombre; x.salida.registradoEn = nowISO(); return x; });
  const setE = (k, v) => actualizar((x) => { x.estadistica[k] = v; return x; });
  return (
    <>
      <Sec id="sec-salida" titulo="HORA SALIDA">
        <div className="grid3">
          <Campo label="HORA SALIDA">
            <div className="hora-in">
              <input type="time" value={c.salida.hora} onChange={(e) => set('hora', e.target.value)} disabled={!editable} />
              {editable && !c.salida.hora && <BtnAhora onClick={() => set('hora', horaLocal())} />}
            </div>
          </Campo>
          <Campo label="EMISOR · SADEMA"><input value={c.salida.sadema} onChange={(e) => set('sadema', e.target.value)} disabled={!editable} /></Campo>
          <Campo label="EMISOR · TEMP."><input value={c.salida.temp} onChange={(e) => set('temp', e.target.value)} disabled={!editable} /></Campo>
        </div>
        {c.salida.registradoPor && <small className="meta">{c.salida.registradoPor} · {formatoFechaHora(c.salida.registradoEn)}</small>}
      </Sec>
      <Sec id="sec-est" titulo="ESTADÍSTICA">
        <div className="grid2">
          <Campo label="FECHA">
            <div className="hora-in">
              <input type="date" value={c.estadistica.fecha} onChange={(e) => setE('fecha', e.target.value)} disabled={!editable} />
              {editable && !c.estadistica.fecha && <button type="button" className="btn sm ahora" onClick={() => setE('fecha', hoyLocal())}>hoy</button>}
            </div>
          </Campo>
          <Campo label="EMISOR"><input value={c.estadistica.emisor} onChange={(e) => setE('emisor', e.target.value)} disabled={!editable} /></Campo>
        </div>
      </Sec>
    </>
  );
}

// ======================= FASE 4: MÓDULO DINÁMICO DE PALLETS =======================
function Pallets({ c, actualizar, usuario, editTemp, adminPal, aviso }) {
  const [etapa, setEtapa] = useState('inicio');
  const [buscar, setBuscar] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [masivo, setMasivo] = useState(false);
  const [abierto, setAbierto] = useState(null);

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return c.pallets.map((p, idx) => ({ p, idx })).filter(({ p }) => !q || String(p.codigo).toLowerCase().includes(q));
  }, [c.pallets, buscar]);

  const existe = (cod) => c.pallets.some((p) => String(p.codigo).trim() === cod);

  const agregar = (codigos) => {
    const limpios = codigos.map((s) => s.trim()).filter(Boolean);
    const dup = limpios.filter((x, i) => existe(x) || limpios.indexOf(x) !== i);
    const ok = limpios.filter((x, i) => !existe(x) && limpios.indexOf(x) === i);
    if (ok.length) actualizar((x) => { ok.forEach((cod) => x.pallets.push(nuevoPallet(cod, x.especie || ''))); return x; });
    if (dup.length) aviso(`Códigos ya existentes omitidos: ${dup.join(', ')}`, 'warn');
    else if (ok.length) aviso(`${ok.length} pallet(s) agregado(s)`);
  };

  const setTemp = (idx, et, valor) => actualizar((x) => {
    const l = x.pallets[idx].lecturas[et];
    l.valor = valor;
    // Solo se registran fecha/hora y responsable de la lectura; el valor nunca se inventa.
    if (valor === '') { l.fechaHora = ''; l.responsable = ''; }
    else { l.fechaHora = nowISO(); l.responsable = usuario.nombre; }
    return x;
  });

  const cuenta = (et) => c.pallets.filter((p) => p.lecturas[et].valor !== '').length;

  return (
    <Sec id="sec-pallets" titulo={`PALLETS (${c.pallets.length})`}>
      <div className="etapas" role="tablist">
        {ETAPAS.map((e) => (
          <button key={e.id} role="tab" aria-selected={etapa === e.id} className={'etapa' + (etapa === e.id ? ' on' : '')} onClick={() => setEtapa(e.id)}>
            {e.label}<small>{cuenta(e.id)}/{c.pallets.length}</small>
          </button>
        ))}
      </div>

      {adminPal && (
        <form className="add-pal" onSubmit={(e) => { e.preventDefault(); agregar([nuevo]); setNuevo(''); }}>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Código de pallet" inputMode="numeric" aria-label="Código de pallet nuevo" />
          <button className="btn primary" disabled={!nuevo.trim()}>+ Pallet</button>
          <button type="button" className="btn" onClick={() => setMasivo(true)}>Varios</button>
        </form>
      )}
      {c.pallets.length > 6 && <input className="buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar pallet…" aria-label="Buscar pallet" />}

      {c.pallets.length === 0 && <p className="muted vacio">Sin pallets. Agregue los pallets que ingresaron al prefrío.</p>}

      <div className="pal-list">
        {lista.map(({ p, idx }) => (
          <div className={'pal-row' + (p.confirmado ? ' conf' : '')} key={p.id}>
            <button className="pal-cod" onClick={() => setAbierto(p.id)} aria-label={`Detalle pallet ${p.codigo}`}>
              <span className="pal-n">{idx + 1}</span>
              <b>{p.codigo || '(sin código)'}</b>
              <small>{p.especie || '—'}</small>
            </button>
            <div className="pal-mini">
              {ETAPAS.map((e) => (
                <span key={e.id} className={e.id === etapa ? 'cur' : ''} title={e.label}>{e.label[0]}<b>{p.lecturas[e.id].valor || '·'}</b></span>
              ))}
            </div>
            <input
              className="pal-temp"
              aria-label={`Temperatura ${etapa} pallet ${p.codigo}`}
              inputMode="decimal"
              placeholder={'T° ' + etapa}
              value={p.lecturas[etapa].valor}
              disabled={!editTemp}
              onChange={(e) => setTemp(idx, etapa, e.target.value.replace(',', '.').replace(/[^0-9.\-]/g, ''))}
            />
          </div>
        ))}
      </div>
      {c.pallets.length > PALLETS_POR_HOJA && <p className="muted sm">La hoja física tiene {PALLETS_POR_HOJA} casillas; los pallets adicionales se imprimen en hojas de continuación con el mismo formato.</p>}

      {masivo && <AgregarMasivo onClose={() => setMasivo(false)} onAgregar={(l) => { agregar(l); setMasivo(false); }} />}
      {abierto && (
        <DetallePallet
          c={c} pid={abierto} usuario={usuario} editTemp={editTemp} adminPal={adminPal}
          actualizar={actualizar} onClose={() => setAbierto(null)}
        />
      )}
    </Sec>
  );
}

function AgregarMasivo({ onClose, onAgregar }) {
  const [txt, setTxt] = useState('');
  const [desde, setDesde] = useState('');
  const [cant, setCant] = useState('');
  const codigos = txt.split(/[\s,;]+/).filter(Boolean);
  return (
    <Modal titulo="AGREGAR VARIOS PALLETS" onClose={onClose}>
      <div className="form">
        <label>Pegue o escriba los códigos (uno por línea, o separados por espacio/coma)
          <textarea rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={'2693\n2510\n2696'} />
        </label>
        <p className="muted sm">o genere una secuencia correlativa:</p>
        <div className="grid2">
          <label>Desde código<input inputMode="numeric" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label>Cantidad<input inputMode="numeric" value={cant} onChange={(e) => setCant(e.target.value)} /></label>
        </div>
        <button className="btn" type="button" disabled={!/^\d+$/.test(desde) || !(+cant > 0)} onClick={() => {
          const n = Math.min(+cant, 500);
          const w = desde.length;
          setTxt(Array.from({ length: n }, (_, i) => String(BigInt(desde) + BigInt(i)).padStart(w, '0')).join('\n'));
        }}>Generar secuencia</button>
        <button className="btn primary big" disabled={!codigos.length} onClick={() => onAgregar(codigos)}>Agregar {codigos.length} pallet(s)</button>
      </div>
    </Modal>
  );
}

function DetallePallet({ c, pid, usuario, editTemp, adminPal, actualizar, onClose }) {
  const idx = c.pallets.findIndex((p) => p.id === pid);
  const p = c.pallets[idx];
  if (!p) return null;
  const set = (fn) => actualizar((x) => { fn(x.pallets[idx]); return x; });
  const dup = p.codigo && c.pallets.some((o) => o.id !== p.id && String(o.codigo).trim() === String(p.codigo).trim());
  return (
    <Modal titulo={`PALLET ${p.codigo || '(sin código)'}`} onClose={onClose}>
      <div className="form">
        <div className="grid2">
          <label>Código / N° pallet<input value={p.codigo} disabled={!adminPal || p.confirmado} onChange={(e) => set((q) => { q.codigo = e.target.value; })} /></label>
          <label>Especie
            <div className="hora-in">
              <input value={p.especie} disabled={!editTemp} onChange={(e) => set((q) => { q.especie = e.target.value; })} list="especies" />
              {editTemp && c.especie && p.especie !== c.especie && <button type="button" className="btn sm ahora" onClick={() => set((q) => { q.especie = c.especie; })}>= {c.especie}</button>}
            </div>
          </label>
        </div>
        {dup && <div className="aviso err">Código duplicado en este control.</div>}
        {ETAPAS.map((e) => {
          const l = p.lecturas[e.id];
          return (
            <div className="lectura" key={e.id}>
              <b>T° {e.label}</b>
              <input inputMode="decimal" value={l.valor} disabled={!editTemp} placeholder="pendiente"
                onChange={(ev) => {
                  const v = ev.target.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
                  set((q) => { q.lecturas[e.id] = v === '' ? { valor: '', fechaHora: '', responsable: '' } : { valor: v, fechaHora: nowISO(), responsable: usuario.nombre }; });
                }} />
              <small className="meta">{l.valor !== '' ? `${l.responsable} · ${formatoFechaHora(l.fechaHora)}` : 'Pendiente'}</small>
            </div>
          );
        })}
        <label>Observaciones<textarea rows={2} value={p.observaciones} disabled={!editTemp} onChange={(e) => set((q) => { q.observaciones = e.target.value; })} /></label>
        <div className="row-btns">
          {adminPal && (
            <button className="btn" onClick={() => set((q) => { q.confirmado = !q.confirmado; })}>{p.confirmado ? 'Quitar confirmación' : 'Confirmar pallet'}</button>
          )}
          {adminPal && !p.confirmado && (
            <button className="btn danger" onClick={() => { if (confirm(`¿Eliminar pallet ${p.codigo || '(sin código)'}?`)) { actualizar((x) => { x.pallets.splice(idx, 1); return x; }); onClose(); } }}>Eliminar</button>
          )}
          <button className="btn primary" onClick={onClose}>Listo</button>
        </div>
        {p.confirmado && <small className="muted">Pallet confirmado: no se puede eliminar ni cambiar su código.</small>}
      </div>
    </Modal>
  );
}

function Checklist({ c, actualizar, editable, usuario }) {
  const set = (item, fase, fn) => actualizar((x) => { fn(x.checklist[item][fase]); return x; });
  return (
    <Sec id="sec-check" titulo="SADEMA CHECK-LIST">
      <div className="check">
        <div className="check-h"><span></span><span>INICIO</span><span>VOLTEO</span></div>
        {CHECK_ITEMS.map((item) => (
          <div className="check-row" key={item}>
            <b>{item}</b>
            {['inicio', 'volteo'].map((fase) => {
              const f = c.checklist[item][fase];
              return (
                <div className="check-cell" key={fase}>
                  <div className="sino">
                    {['SI', 'NO'].map((v) => (
                      <button key={v} type="button" disabled={!editable} className={'tog sm' + (f.valor === v ? ' on' + (v === 'NO' ? ' no' : '') : '')}
                        aria-pressed={f.valor === v} aria-label={`${item} ${fase} ${v}`}
                        onClick={() => set(item, fase, (q) => { q.valor = q.valor === v ? null : v; if (!q.valor) q.vb = ''; })}>{v}</button>
                    ))}
                  </div>
                  {f.vb ? (
                    <button type="button" className="vb on" disabled={!editable} onClick={() => set(item, fase, (q) => { q.vb = ''; })} title="Quitar V°B°">V°B° {f.vb}</button>
                  ) : (
                    <button type="button" className="vb" disabled={!editable || !f.valor} onClick={() => set(item, fase, (q) => { q.vb = usuario.nombre; })}>V°B°</button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="grid2">
        <Campo label="DESHIELO · HORA">
          <div className="hora-in">
            <input type="time" value={c.deshielo.hora} disabled={!editable} onChange={(e) => actualizar((x) => { x.deshielo.hora = e.target.value; return x; })} />
            {editable && !c.deshielo.hora && <BtnAhora onClick={() => actualizar((x) => { x.deshielo.hora = horaLocal(); return x; })} />}
          </div>
        </Campo>
      </div>
    </Sec>
  );
}

function Observaciones({ c, actualizar, editable, usuario }) {
  const [txt, setTxt] = useState('');
  return (
    <Sec id="sec-obs" titulo="OBSERVACION">
      {c.observaciones.length === 0 && <p className="muted">Sin observaciones.</p>}
      <ul className="obs-list">
        {c.observaciones.map((o) => <li key={o.id}><p>{o.texto}</p><small className="meta">{o.responsable} · {formatoFechaHora(o.fechaHora)}</small></li>)}
      </ul>
      {editable && (
        <form className="form" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; actualizar((x) => { x.observaciones.push({ id: uid(), texto: txt.trim(), responsable: usuario.nombre, fechaHora: nowISO() }); return x; }); setTxt(''); }}>
          <textarea rows={2} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Registrar novedad…" aria-label="Nueva observación" />
          <button className="btn" disabled={!txt.trim()}>+ Agregar observación</button>
        </form>
      )}
    </Sec>
  );
}

function Cierre({ st, usuario, aviso }) {
  const { c } = st;
  const [confirmar, setConfirmar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const v = validarCierre(c);
  const cerrado = estaCerrado(c);

  const finalizar = async () => {
    try {
      let base = c;
      if (st.sucio) base = await st.guardar();
      const next = await finalizarControl(base, usuario, v.pendientes);
      st.reemplazar(next); setConfirmar(false);
      aviso(`Registro FINALIZADO (v${next.version})`);
    } catch (e) { aviso(e.message, 'err'); }
  };

  if (cerrado) {
    return (
      <Sec id="sec-cierre" titulo="CIERRE">
        <p>Finalizado por <b>{c.finalizadoPor}</b> el {formatoFechaHora(c.finalizadoEn)} · versión v{c.version}.</p>
        {puede(usuario, 'reabrir') && (
          <div className="form">
            <label>Motivo de reapertura (obligatorio)<input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
            <button className="btn danger" disabled={!motivo.trim()} onClick={async () => { st.reemplazar(await reabrirControl(c, usuario, motivo.trim())); setMotivo(''); aviso('Registro reabierto. La versión finalizada anterior se conserva.'); }}>Reabrir registro</button>
          </div>
        )}
      </Sec>
    );
  }

  return (
    <Sec id="sec-cierre" titulo="CIERRE">
      {v.bloqueos.length > 0 ? (
        <div className="aviso err"><b>Para finalizar falta:</b><ul>{v.bloqueos.map((b) => <li key={b}>{b}</li>)}</ul></div>
      ) : <div className="aviso ok">Requisitos de cierre completos.</div>}
      {v.pendientes.length > 0 && (
        <div className="aviso warn"><b>Temperaturas pendientes ({v.pendientes.length}):</b><ul>{v.pendientes.slice(0, 8).map((b) => <li key={b}>{b}</li>)}{v.pendientes.length > 8 && <li>…y {v.pendientes.length - 8} más</li>}</ul></div>
      )}
      <div className="row-btns">
        {puede(usuario, 'finalizar') && (
          <button className="btn" onClick={() => st.actualizar((x) => { x.pendienteCierreSolicitado = !x.pendienteCierreSolicitado; return x; })}>
            {c.pendienteCierreSolicitado ? 'Quitar “pendiente de cierre”' : 'Marcar PENDIENTE DE CIERRE'}
          </button>
        )}
        {puede(usuario, 'finalizar') && <button className="btn primary" disabled={!v.ok} onClick={() => setConfirmar(true)}>FINALIZAR</button>}
      </div>
      {confirmar && (
        <Modal titulo="FINALIZAR REGISTRO" onClose={() => setConfirmar(false)}>
          <p>Se cerrará el registro N° {c.numero} y se conservará como versión identificable. No podrá editarse sin reapertura de un ADMINISTRADOR.</p>
          {v.pendientes.length > 0 && <div className="aviso warn">Se finalizará con {v.pendientes.length} temperatura(s) pendiente(s). Quedará registrado en el historial que usted lo aceptó.</div>}
          <div className="row-btns"><button className="btn" onClick={() => setConfirmar(false)}>Cancelar</button><button className="btn primary" onClick={finalizar}>Confirmar cierre</button></div>
        </Modal>
      )}
    </Sec>
  );
}

