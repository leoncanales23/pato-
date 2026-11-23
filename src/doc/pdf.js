// FASE 6 — Generación de PDF A4 a partir de la MISMA plantilla de la hoja (no un PDF genérico).
// Se monta la hoja fuera de pantalla a tamaño real (210x297mm) y se captura página por página.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import SheetA4 from './SheetA4.jsx';
import { estaCerrado } from '../model/control.js';

export function nombreArchivo(c) {
  const f = (c.fecha || '').replaceAll('-', '');
  return `CONTROL-PREFRIOS-N${c.numero || 'SN'}-${f}${estaCerrado(c) ? '-v' + c.version : '-BORRADOR'}.pdf`;
}

export async function generarPdf(control) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-30000px;top:0;width:210mm;background:#fff;z-index:-1;';
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(createElement(SheetA4, { c: control }));
    await new Promise((r) => setTimeout(r, 80));
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...host.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    const pages = [...host.querySelectorAll('.s-page')];
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      pg.style.boxShadow = 'none';
      pg.style.margin = '0';
      const canvas = await html2canvas(pg, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    pdf.setProperties({ title: `CONTROL PRE FRIOS N° ${control.numero}`, creator: 'VIBRAALTO COLDCHAIN OPERATIONS', subject: control.exportadora });
    return pdf.output('blob');
  } finally {
    root.unmount();
    host.remove();
  }
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
