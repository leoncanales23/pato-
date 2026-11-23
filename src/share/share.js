// Distribución del documento. Regla: nunca reportar un envío como exitoso
// si no existe una integración real que lo confirme.
import { descargarBlob } from '../doc/pdf.js';

export function puedeCompartirArchivo(blob, nombre) {
  try {
    const f = new File([blob], nombre, { type: 'application/pdf' });
    return !!(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch { return false; }
}

export function textoResumen(c) {
  return `CONTROL PRE FRÍOS N° ${c.numero} · ${c.fecha} · ${c.exportadora} · ${c.especie} · ${c.pallets.length} pallets · Estado: ${c.estado}`;
}

// Devuelve { resultado: 'compartido' | 'cancelado' | 'manual', detalle }
export async function compartirConSistema(blob, nombre, c) {
  const file = new File([blob], nombre, { type: 'application/pdf' });
  try {
    await navigator.share({ files: [file], title: `Control Pre Fríos N° ${c.numero}`, text: textoResumen(c) });
    // El sistema no informa qué app se eligió ni si el mensaje se envió: solo que se abrió el menú.
    return { resultado: 'compartido', detalle: 'Entregado al menú Compartir del dispositivo' };
  } catch (e) {
    if (e?.name === 'AbortError') return { resultado: 'cancelado', detalle: 'Cancelado por el usuario' };
    throw e;
  }
}

// Alternativa para equipos sin Web Share con archivos (ej. computador):
// descarga el PDF y abre WhatsApp con el texto (y el enlace, si existe) para adjuntarlo manualmente.
export function whatsappManual(blob, nombre, c, enlace = '') {
  descargarBlob(blob, nombre);
  const txt = textoResumen(c) + (enlace ? `\nDocumento: ${enlace}` : '\n(Adjunte el PDF descargado)');
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  return { resultado: 'manual', detalle: enlace ? 'WhatsApp abierto con enlace' : 'PDF descargado; adjuntar manualmente en WhatsApp' };
}

export function correoManual(blob, nombre, c, destinatario, enlace = '') {
  descargarBlob(blob, nombre);
  const asunto = `Control Pre Fríos N° ${c.numero} — ${c.fecha}`;
  const cuerpo = textoResumen(c) + (enlace ? `\n\nDocumento: ${enlace}` : '\n\nSe adjunta el PDF descargado (adjuntar manualmente).');
  window.location.href = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  return { resultado: 'manual', detalle: 'Cliente de correo abierto; PDF debe adjuntarse manualmente' };
}

export async function blobABase64(blob) {
  const buf = await blob.arrayBuffer();
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
