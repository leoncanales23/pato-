// FASE 1 — Modelo de datos del formulario CONTROL PRE FRÍOS.
// Refleja la hoja física de Comercial Greenvic S.A. (Planta Maipo Fruta Fresca).
// Regla: nunca se inventan ni autocompletan temperaturas. Campo vacío = pendiente.

export const ENVASES = ['CTN', 'PLA', 'MAD', 'BINS'];
export const BOLSAS = [
  { id: 'CONV', label: 'CONV' },
  { id: 'ATM', label: 'ATM' },
  { id: 'ATM_AB', label: 'ATM AB.' },
  { id: 'SB', label: 'S/B' },
];
export const CHECK_ITEMS = ['CARPA', 'ALETAS', 'BUFANDAS', 'PUERTAS', 'ESPONJAS', 'SELLADO'];
export const ETAPAS = [
  { id: 'inicio', label: 'INICIO' },
  { id: 'volteo', label: 'VOLTEO' },
  { id: 'salida', label: 'SALIDA' },
];

export const ESTADOS = {
  BORRADOR: 'BORRADOR',
  EN_PROCESO: 'EN PROCESO',
  PENDIENTE_CIERRE: 'PENDIENTE DE CIERRE',
  FINALIZADO: 'FINALIZADO',
  COMPARTIDO: 'COMPARTIDO',
};

// Filas por defecto de la hoja física (3 filas en HORA INICIO / HORA VOLTEO).
export const FILAS_SETEO_HOJA = 3;
// Casillas de pallets por hoja física: 2 columnas x 13.
export const PALLETS_POR_COLUMNA = 13;
export const PALLETS_POR_HOJA = PALLETS_POR_COLUMNA * 2;

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const nowISO = () => new Date().toISOString();

export function hoyLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function horaLocal() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function nuevaFilaSeteo(usuario) {
  return { id: uid(), seteo: '', hora: '', sadema: '', temp: '', registradoPor: usuario?.nombre || '', registradoEn: nowISO() };
}

export function nuevaLectura() {
  return { valor: '', fechaHora: '', responsable: '' };
}

export function nuevoPallet(codigo = '', especie = '') {
  return {
    id: uid(),
    codigo,
    especie,
    lecturas: { inicio: nuevaLectura(), volteo: nuevaLectura(), salida: nuevaLectura() },
    observaciones: '',
    confirmado: false,
    creadoEn: nowISO(),
  };
}

export function nuevoChecklist() {
  const fase = () => ({ valor: null, vb: '' }); // valor: 'SI' | 'NO' | null
  return Object.fromEntries(CHECK_ITEMS.map((k) => [k, { inicio: fase(), volteo: fase() }]));
}

export function nuevoControl({ numero, usuario }) {
  const ahora = nowISO();
  return {
    id: uid(),
    numero: numero ?? '',
    fecha: hoyLocal(),
    exportadora: 'Greenvic',
    especie: '',
    envase: Object.fromEntries(ENVASES.map((e) => [e, false])),
    bolsa: Object.fromEntries(BOLSAS.map((b) => [b.id, false])),
    inicio: Array.from({ length: FILAS_SETEO_HOJA }, () => nuevaFilaSeteo(usuario)),
    volteo: Array.from({ length: FILAS_SETEO_HOJA }, () => nuevaFilaSeteo(usuario)),
    salida: { hora: '', sadema: '', temp: '', registradoPor: '', registradoEn: '' },
    estadistica: { fecha: '', emisor: '' },
    pallets: [],
    checklist: nuevoChecklist(),
    deshielo: { hora: '' },
    observaciones: [], // [{id, texto, responsable, fechaHora}]
    estado: ESTADOS.BORRADOR,
    pendienteCierreSolicitado: false,
    responsable: usuario?.nombre || '',
    creadoPor: usuario?.nombre || '',
    creadoEn: ahora,
    actualizadoEn: ahora,
    actualizadoPor: usuario?.nombre || '',
    version: 1,
    historial: [{ id: uid(), fecha: ahora, usuario: usuario?.nombre || '', accion: 'CREADO', detalle: 'Registro creado' }],
    versiones: [], // snapshots de documentos finalizados
    compartidos: [], // [{fecha, canal, usuario, destinatario?}]
  };
}

const vacio = (v) => v === undefined || v === null || String(v).trim() === '';

export function tieneDatosOperativos(c) {
  const filas = [...c.inicio, ...c.volteo].some((f) => !vacio(f.hora) || !vacio(f.sadema) || !vacio(f.temp));
  const pallets = c.pallets.some((p) => ETAPAS.some((e) => !vacio(p.lecturas[e.id].valor)));
  return filas || pallets || !vacio(c.salida.hora);
}

// Estado derivado mientras el registro está abierto.
export function estadoDerivado(c) {
  if (c.estado === ESTADOS.FINALIZADO || c.estado === ESTADOS.COMPARTIDO) return c.estado;
  if (c.pendienteCierreSolicitado) return ESTADOS.PENDIENTE_CIERRE;
  return tieneDatosOperativos(c) ? ESTADOS.EN_PROCESO : ESTADOS.BORRADOR;
}

export const estaCerrado = (c) => c.estado === ESTADOS.FINALIZADO || c.estado === ESTADOS.COMPARTIDO;

// Validación de cierre. "bloqueos" impiden finalizar; "pendientes" se informan
// y el usuario debe confirmarlos explícitamente (quedan registrados en el historial).
export function validarCierre(c) {
  const bloqueos = [];
  const pendientes = [];
  if (vacio(c.numero)) bloqueos.push('Falta el N° de registro.');
  if (vacio(c.fecha)) bloqueos.push('Falta la fecha.');
  if (vacio(c.exportadora)) bloqueos.push('Falta la exportadora.');
  if (vacio(c.especie)) bloqueos.push('Falta la especie.');
  if (!Object.values(c.envase).some(Boolean)) bloqueos.push('No se ha marcado el envase.');
  if (!Object.values(c.bolsa).some(Boolean)) bloqueos.push('No se ha marcado la bolsa.');
  if (c.pallets.length === 0) bloqueos.push('No hay pallets registrados.');
  if (vacio(c.salida.hora)) bloqueos.push('Falta la hora de salida.');
  for (const item of CHECK_ITEMS) {
    for (const fase of ['inicio', 'volteo']) {
      const f = c.checklist[item][fase];
      if (!f.valor) bloqueos.push(`Checklist ${item} (${fase.toUpperCase()}): falta SI/NO.`);
      else if (vacio(f.vb)) bloqueos.push(`Checklist ${item} (${fase.toUpperCase()}): falta V°B°.`);
    }
  }
  c.pallets.forEach((p, i) => {
    const nombre = vacio(p.codigo) ? `Pallet #${i + 1} (sin código)` : `Pallet ${p.codigo}`;
    if (vacio(p.codigo)) bloqueos.push(`${nombre}: falta código.`);
    const faltan = ETAPAS.filter((e) => vacio(p.lecturas[e.id].valor)).map((e) => e.label);
    if (faltan.length) pendientes.push(`${nombre}: sin temperatura de ${faltan.join(', ')}.`);
  });
  const codigos = c.pallets.map((p) => String(p.codigo).trim()).filter(Boolean);
  const dup = codigos.filter((x, i) => codigos.indexOf(x) !== i);
  if (dup.length) bloqueos.push(`Códigos de pallet duplicados: ${[...new Set(dup)].join(', ')}.`);
  return { bloqueos, pendientes, ok: bloqueos.length === 0 };
}

// Diferencias legibles entre dos versiones (para el historial de cambios).
export function diffResumen(antes, despues) {
  const cambios = [];
  const campos = ['numero', 'fecha', 'exportadora', 'especie'];
  for (const k of campos) if (antes[k] !== despues[k]) cambios.push(`${k}: "${antes[k] ?? ''}" → "${despues[k] ?? ''}"`);
  for (const g of ['envase', 'bolsa', 'salida', 'estadistica', 'deshielo']) {
    for (const k of Object.keys(despues[g] || {})) {
      if (['registradoPor', 'registradoEn'].includes(k)) continue;
      if ((antes[g] || {})[k] !== despues[g][k]) cambios.push(`${g}.${k}: "${(antes[g] || {})[k] ?? ''}" → "${despues[g][k] ?? ''}"`);
    }
  }
  for (const g of ['inicio', 'volteo']) {
    if (JSON.stringify(stripMeta(antes[g])) !== JSON.stringify(stripMeta(despues[g]))) cambios.push(`hora ${g} modificada`);
  }
  const mapA = new Map(antes.pallets.map((p) => [p.id, p]));
  const mapD = new Map(despues.pallets.map((p) => [p.id, p]));
  for (const [id, p] of mapD) {
    const a = mapA.get(id);
    if (!a) { cambios.push(`pallet agregado ${p.codigo || '(sin código)'}`); continue; }
    if (a.codigo !== p.codigo) cambios.push(`pallet código "${a.codigo}" → "${p.codigo}"`);
    if (a.especie !== p.especie) cambios.push(`pallet ${p.codigo} especie "${a.especie}" → "${p.especie}"`);
    for (const e of ETAPAS) {
      const va = a.lecturas[e.id].valor, vd = p.lecturas[e.id].valor;
      if (va !== vd) cambios.push(`pallet ${p.codigo} T° ${e.label}: "${va}" → "${vd}"`);
    }
    if (a.observaciones !== p.observaciones) cambios.push(`pallet ${p.codigo} observaciones`);
    if (a.confirmado !== p.confirmado) cambios.push(`pallet ${p.codigo} ${p.confirmado ? 'confirmado' : 'desconfirmado'}`);
  }
  for (const [id, p] of mapA) if (!mapD.has(id)) cambios.push(`pallet eliminado ${p.codigo || '(sin código)'}`);
  for (const item of CHECK_ITEMS) {
    for (const f of ['inicio', 'volteo']) {
      const a = antes.checklist[item][f], d = despues.checklist[item][f];
      if (a.valor !== d.valor || a.vb !== d.vb) cambios.push(`checklist ${item} ${f}: ${d.valor || '—'} V°B° ${d.vb || '—'}`);
    }
  }
  if (antes.observaciones.length !== despues.observaciones.length) cambios.push('observación agregada');
  return cambios;
}

function stripMeta(rows) {
  return (rows || []).map(({ seteo, hora, sadema, temp }) => ({ seteo, hora, sadema, temp }));
}

export function formatoFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export function formatoFechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}
