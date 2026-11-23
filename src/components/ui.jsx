import { useEffect } from 'react';
import { ESTADOS } from '../model/control.js';

const CLASE = {
  [ESTADOS.BORRADOR]: 'st-borrador',
  [ESTADOS.EN_PROCESO]: 'st-proceso',
  [ESTADOS.PENDIENTE_CIERRE]: 'st-pendiente',
  [ESTADOS.FINALIZADO]: 'st-final',
  [ESTADOS.COMPARTIDO]: 'st-compartido',
};

export const Estado = ({ e }) => <span className={'estado ' + (CLASE[e] || '')}>{e}</span>;

export function Modal({ titulo, onClose, children, ancho }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : null} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="modal-h"><b>{titulo}</b><button className="btn-x" onClick={onClose} aria-label="Cerrar">×</button></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ msg, tipo = 'ok', onDone }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [msg, onDone]);
  if (!msg) return null;
  return <div className={'toast ' + tipo} role="status">{msg}</div>;
}
