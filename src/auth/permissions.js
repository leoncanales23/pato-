// Roles y permisos (sección 14 del prompt maestro).
export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ENCARGADO: 'ENCARGADO',
  OPERADOR: 'OPERADOR',
  VISUALIZADOR: 'VISUALIZADOR',
};

const P = {
  crearRegistro: ['ADMINISTRADOR', 'ENCARGADO'],
  editarEncabezado: ['ADMINISTRADOR', 'ENCARGADO'],
  administrarPallets: ['ADMINISTRADOR', 'ENCARGADO'],
  registrarTemperaturas: ['ADMINISTRADOR', 'ENCARGADO', 'OPERADOR'],
  completarChecklist: ['ADMINISTRADOR', 'ENCARGADO', 'OPERADOR'],
  registrarObservaciones: ['ADMINISTRADOR', 'ENCARGADO', 'OPERADOR'],
  finalizar: ['ADMINISTRADOR', 'ENCARGADO'],
  reabrir: ['ADMINISTRADOR'],
  compartir: ['ADMINISTRADOR', 'ENCARGADO'],
  descargar: ['ADMINISTRADOR', 'ENCARGADO', 'OPERADOR', 'VISUALIZADOR'],
  gestionarUsuarios: ['ADMINISTRADOR'],
  sensores: ['ADMINISTRADOR'],
  verHistorialCambios: ['ADMINISTRADOR', 'ENCARGADO'],
};

export const puede = (usuario, accion) => !!usuario && (P[accion] || []).includes(usuario.rol);

export const esEditor = (u) => ['ADMINISTRADOR', 'ENCARGADO', 'OPERADOR'].some((r) => r === u?.rol);
