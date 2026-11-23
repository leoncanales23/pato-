// Capa de negocio sobre el repositorio: guardado con historial de cambios,
// cierre con versión inmutable, reapertura trazable. Nunca sobrescribe en silencio.
import { localRepo } from './localRepo.js';
import { firebaseRepo, firebaseConfigurado } from './firebaseRepo.js';
import { diffResumen, estadoDerivado, ESTADOS, nowISO, uid, validarCierre } from '../model/control.js';

export const repo = firebaseConfigurado ? firebaseRepo : localRepo;

function entrada(usuario, accion, detalle) {
  return { id: uid(), fecha: nowISO(), usuario: usuario?.nombre || '', rol: usuario?.rol || '', accion, detalle };
}

export async function guardarControl(anterior, actual, usuario, accion = 'GUARDADO') {
  const cambios = anterior ? diffResumen(anterior, actual) : [];
  const nuevos = [];
  if (cambios.length || accion !== 'GUARDADO') {
    nuevos.push(entrada(usuario, accion, cambios.length ? cambios.join(' · ') : accion));
  }
  const next = {
    ...actual,
    estado: estadoDerivado(actual),
    actualizadoEn: nowISO(),
    actualizadoPor: usuario?.nombre || '',
    historial: [...(actual.historial || []), ...nuevos],
  };
  await repo.putControl(next, { nuevosHistorial: nuevos });
  await repo.delDraft(next.id);
  return next;
}

export async function finalizarControl(control, usuario, pendientesAceptados) {
  const v = validarCierre(control);
  if (!v.ok) throw new Error('No se puede finalizar:\n' + v.bloqueos.join('\n'));
  const numVersion = (control.versiones?.length || 0) + 1;
  const ahora = nowISO();
  const base = { ...control, estado: ESTADOS.FINALIZADO, pendienteCierreSolicitado: false, finalizadoEn: ahora, finalizadoPor: usuario.nombre };
  const snapshot = { version: numVersion, fecha: ahora, usuario: usuario.nombre, pendientesAceptados, datos: stripSnapshot(base) };
  const h = entrada(usuario, 'FINALIZADO', `Versión v${numVersion} cerrada.` + (pendientesAceptados.length ? ` Pendientes aceptados: ${pendientesAceptados.join(' | ')}` : ''));
  const next = { ...base, version: numVersion, versiones: [...(control.versiones || []), snapshot], historial: [...(control.historial || []), h], actualizadoEn: ahora, actualizadoPor: usuario.nombre };
  await repo.putControl(next, { nuevosHistorial: [h], nuevaVersion: snapshot });
  await repo.delDraft(next.id);
  return next;
}

export async function reabrirControl(control, usuario, motivo) {
  const h = entrada(usuario, 'REABIERTO', `Reabierto desde v${control.version}. Motivo: ${motivo}`);
  const next = { ...control, estado: ESTADOS.EN_PROCESO, historial: [...control.historial, h], actualizadoEn: nowISO(), actualizadoPor: usuario.nombre };
  await repo.putControl(next, { nuevosHistorial: [h] });
  return next;
}

export async function registrarCompartido(control, usuario, canal, destinatario = '') {
  const h = entrada(usuario, 'COMPARTIDO', `${canal}${destinatario ? ' → ' + destinatario : ''}`);
  const cerrado = control.estado === ESTADOS.FINALIZADO || control.estado === ESTADOS.COMPARTIDO;
  const next = {
    ...control,
    estado: cerrado ? ESTADOS.COMPARTIDO : control.estado,
    compartidos: [...(control.compartidos || []), { fecha: nowISO(), canal, usuario: usuario.nombre, destinatario }],
    historial: [...control.historial, h],
  };
  await repo.putControl(next, { nuevosHistorial: [h] });
  return next;
}

function stripSnapshot(c) {
  const { historial, versiones, ...rest } = c;
  return JSON.parse(JSON.stringify(rest));
}
