// Acciones documentales: GUARDAR · IMPRIMIR · DESCARGAR PDF · COMPARTIR (WhatsApp / Correo).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SheetA4 from '../doc/SheetA4.jsx';
import { generarPdf, descargarBlob, nombreArchivo } from '../doc/pdf.js';
import { compartirConSistema, correoManual, puedeCompartirArchivo, whatsappManual, blobABase64 } from '../share/share.js';
import { registrarCompartido, repo } from '../data/store.js';
import { firebaseConfigurado } from '../data/firebaseRepo.js';
import { puede } from '../auth/permissions.js';
import { estaCerrado } from '../model/control.js';
import { Modal } from './ui.jsx';

export default function DocActions({ c, usuario, sucio, guardando, onGuardar, onActualizado, aviso, puedeGuardar = true }) {
  const [busy, setBusy] = useState('');
  const [compartir, setCompartir] = useState(false);

  const imprimir = () => {
    if (sucio) aviso('Imprimiendo cambios aún no guardados. Recuerde GUARDAR.', 'warn');
    window.print();
  };

  const pdf = async () => {
    setBusy('pdf');
    try { descargarBlob(await generarPdf(c), nombreArchivo(c)); }
    catch (e) { aviso('Error al generar PDF: ' + e.message, 'err'); }
    finally { setBusy(''); }
  };

  return (
    <>
      <div className="actionbar">
        {puedeGuardar && (
          <button className={'btn primary' + (sucio ? ' pulse' : '')} onClick={onGuardar} disabled={guardando || !sucio}>
            {guardando ? 'Guardando…' : sucio ? 'GUARDAR' : 'Guardado ✓'}
          </button>
        )}
        <button className="btn" onClick={imprimir}>IMPRIMIR</button>
        <button className="btn" onClick={pdf} disabled={busy === 'pdf'}>{busy === 'pdf' ? 'Generando…' : 'PDF'}</button>
        {puede(usuario, 'compartir') && <button className="btn" onClick={() => setCompartir(true)}>COMPARTIR</button>}
      </div>
      {createPortal(<div className="print-only"><SheetA4 c={c} /></div>, document.body)}
      {compartir && (
        <PanelCompartir c={c} usuario={usuario} sucio={sucio} onClose={() => setCompartir(false)} onActualizado={onActualizado} aviso={aviso} />
      )}
    </>
  );
}

function PanelCompartir({ c, usuario, sucio, onClose, onActualizado, aviso }) {
  const [blob, setBlob] = useState(null);
  const [err, setErr] = useState('');
  const [canal, setCanal] = useState(null);
  const [dest, setDest] = useState(() => { try { return localStorage.getItem('va-ultimo-correo') || ''; } catch { return ''; } });
  const [enviando, setEnviando] = useState(false);
  const nombre = nombreArchivo(c);

  // El PDF se genera al abrir el panel: así el botón "Compartir" llama a Web Share
  // directamente dentro del gesto del usuario (requisito del navegador).
  useEffect(() => { generarPdf(c).then(setBlob).catch((e) => setErr(e.message)); }, [c]);

  const nativo = blob && puedeCompartirArchivo(blob, nombre);

  const registrar = async (canalTxt, destinatario) => {
    try { onActualizado(await registrarCompartido(c, usuario, canalTxt, destinatario)); }
    catch (e) { aviso('No se pudo registrar en el historial: ' + e.message, 'err'); }
  };

  const viaSistema = async (canalTxt) => {
    try {
      const r = await compartirConSistema(blob, nombre, c);
      if (r.resultado === 'compartido') { await registrar(`${canalTxt} (menú Compartir del dispositivo)`); aviso('Documento entregado al menú Compartir. Confirme el envío en la aplicación elegida.'); onClose(); }
    } catch (e) { setErr('El dispositivo no permitió compartir: ' + e.message); }
  };

  const linkFirebase = async () => (firebaseConfigurado ? repo.uploadPdf(c.id, c.version, blob) : '');

  const waManual = async () => {
    let enlace = '';
    try { enlace = await linkFirebase(); } catch { /* sin enlace: se adjunta manual */ }
    const r = whatsappManual(blob, nombre, c, enlace);
    await registrar('WhatsApp (' + r.detalle + ')');
    onClose();
  };

  const correoServidor = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) { setErr('Correo de destino no válido.'); return; }
    setEnviando(true); setErr('');
    try {
      const r = await repo.enviarCorreo({ controlId: c.id, destinatario: dest, nombreArchivo: nombre, pdfBase64: await blobABase64(blob), numero: c.numero, fecha: c.fecha });
      if (!r?.ok) throw new Error(r?.error || 'El servidor no confirmó el envío');
      try { localStorage.setItem('va-ultimo-correo', dest); } catch { /* opcional */ }
      await registrar('Correo (enviado por servidor, id ' + (r.messageId || '—') + ')', dest);
      aviso('Correo enviado a ' + dest);
      onClose();
    } catch (e) { setErr('No se envió el correo: ' + e.message); }
    finally { setEnviando(false); }
  };

  const correoCliente = async () => {
    if (!dest) { setErr('Ingrese el correo de destino.'); return; }
    try { localStorage.setItem('va-ultimo-correo', dest); } catch { /* opcional */ }
    let enlace = '';
    try { enlace = await linkFirebase(); } catch { /* sin enlace */ }
    const r = correoManual(blob, nombre, c, dest, enlace);
    await registrar('Correo (' + r.detalle + ')', dest);
    onClose();
  };

  return (
    <Modal titulo="COMPARTIR DOCUMENTO" onClose={onClose}>
      {!estaCerrado(c) && <div className="aviso warn">El registro no está FINALIZADO. El documento saldrá marcado como “{c.estado} · NO FINALIZADO”.</div>}
      {sucio && <div className="aviso warn">Hay cambios sin guardar. Se compartirá lo que ve en pantalla; guarde para dejarlo en el historial.</div>}
      {!blob && !err && <p className="muted">Preparando PDF…</p>}
      {err && <div className="aviso err">{err}</div>}
      {blob && !canal && (
        <div className="share-opts">
          <button className="btn share wa" onClick={() => setCanal('wa')}>WhatsApp</button>
          <button className="btn share mail" onClick={() => setCanal('mail')}>Correo electrónico</button>
        </div>
      )}
      {blob && canal === 'wa' && (
        <div className="form">
          {nativo ? (
            <>
              <p>Se abrirá el menú Compartir del teléfono con el PDF adjunto. Elija <b>WhatsApp</b> y el contacto o grupo.</p>
              <button className="btn primary big" onClick={() => viaSistema('WhatsApp')}>Compartir PDF</button>
            </>
          ) : (
            <p className="muted">Este equipo no permite compartir archivos directamente.</p>
          )}
          <button className="btn" onClick={waManual}>
            {firebaseConfigurado ? 'Abrir WhatsApp con enlace al documento' : 'Descargar PDF y abrir WhatsApp (adjuntar manualmente)'}
          </button>
          <button className="btn-link" onClick={() => setCanal(null)}>← volver</button>
        </div>
      )}
      {blob && canal === 'mail' && (
        <div className="form">
          <label>Correo de destino<input type="email" inputMode="email" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="destinatario@empresa.cl" /></label>
          {firebaseConfigurado ? (
            <button className="btn primary big" onClick={correoServidor} disabled={enviando}>{enviando ? 'Enviando…' : 'ENVIAR CON PDF ADJUNTO'}</button>
          ) : (
            <div className="aviso">El envío automático por servidor requiere configurar Firebase + Cloud Function de correo (docs/DESPLIEGUE.md). Mientras tanto, use una de estas opciones reales:</div>
          )}
          {nativo && <button className="btn" onClick={() => viaSistema('Correo')}>Compartir PDF con app de correo del teléfono</button>}
          <button className="btn" onClick={correoCliente}>Descargar PDF y abrir cliente de correo (adjuntar manualmente)</button>
          <button className="btn-link" onClick={() => setCanal(null)}>← volver</button>
        </div>
      )}
    </Modal>
  );
}
