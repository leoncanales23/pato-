// Vista DOCUMENTO ORIGINAL: la hoja A4 tal como se imprime, escalada al ancho de pantalla.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { useControl } from '../components/useControl.js';
import DocActions from '../components/DocActions.jsx';
import SheetA4 from '../doc/SheetA4.jsx';
import { Estado, Toast } from '../components/ui.jsx';
import { estaCerrado, formatoFechaHora } from '../model/control.js';
import { generarPdf, descargarBlob, nombreArchivo } from '../doc/pdf.js';

export default function Documento({ id }) {
  const { usuario } = useApp();
  const st = useControl(id, usuario);
  const [toast, setToast] = useState(null);
  const [ver, setVer] = useState('actual');
  const aviso = useCallback((msg, tipo = 'ok') => setToast({ msg, tipo }), []);
  const wrap = useRef();
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const calc = () => {
      if (!wrap.current) return;
      const mm = 3.7795; // px por mm a 96dpi
      setEscala(Math.min(1, (wrap.current.clientWidth - 8) / (210 * mm)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [st.c]);

  if (st.error) return <div className="page"><div className="aviso err">{st.error}</div></div>;
  if (!st.c) return <div className="page muted">Cargando documento…</div>;
  const c = st.c;
  const snapshot = ver === 'actual' ? null : c.versiones.find((v) => String(v.version) === ver);
  const doc = snapshot ? { ...snapshot.datos, versiones: c.versiones, historial: [] } : c;

  return (
    <div className="page doc-view">
      <div className="ed-head">
        <div>
          <div className="ed-t">HOJA · N° <b>{c.numero}</b></div>
          <div className="ed-sub"><Estado e={doc.estado} /> {c.pallets.length} pallets</div>
        </div>
        {!estaCerrado(c) && <a className="btn" href={`#/control/${c.id}`}>EDITAR</a>}
      </div>
      {c.versiones.length > 0 && (
        <div className="versiones">
          <label>Versión:
            <select value={ver} onChange={(e) => setVer(e.target.value)}>
              <option value="actual">Actual ({c.estado})</option>
              {c.versiones.map((v) => <option key={v.version} value={String(v.version)}>v{v.version} · finalizada {formatoFechaHora(v.fecha)} · {v.usuario}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="doc-wrap" ref={wrap}>
        <div className="doc-scale" style={{ zoom: escala }}>
          <SheetA4 c={doc} />
        </div>
      </div>
      {snapshot ? (
        <div className="actionbar">
          <button className="btn primary" onClick={async () => descargarBlob(await generarPdf(doc), nombreArchivo(doc))}>PDF v{snapshot.version}</button>
          <button className="btn" onClick={() => setVer('actual')}>Volver a actual</button>
        </div>
      ) : (
        <DocActions c={c} usuario={usuario} sucio={st.sucio} guardando={st.guardando} onGuardar={() => st.guardar()} onActualizado={st.reemplazar} aviso={aviso} puedeGuardar={false} />
      )}
      <Toast msg={toast?.msg} tipo={toast?.tipo} onDone={() => setToast(null)} />
    </div>
  );
}
