import { useEffect, useState } from 'react';
import { useApp, ir } from '../App.jsx';
import { repo, guardarControl } from '../data/store.js';
import { nuevoControl, estaCerrado, formatoFecha, formatoFechaHora } from '../model/control.js';
import { puede } from '../auth/permissions.js';
import { Estado } from '../components/ui.jsx';

export default function Inicio() {
  const { usuario } = useApp();
  const [lista, setLista] = useState(null);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    repo.listControles().then((l) => setLista(l.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))));
  }, []);

  const crear = async () => {
    setCreando(true);
    try {
      const numero = await repo.nextNumero();
      const c = nuevoControl({ numero: String(numero), usuario });
      await guardarControl(null, c, usuario, 'CREADO');
      ir('control', c.id);
    } finally { setCreando(false); }
  };

  const abiertos = (lista || []).filter((c) => !estaCerrado(c));
  const recientes = (lista || []).filter(estaCerrado).slice(0, 5);

  return (
    <div className="page">
      <section className="hero">
        <div>
          <h1>CONTROL PRE FRÍOS</h1>
          <p>Planta Maipo Fruta Fresca · Quinta de Maipo Norte · Buin</p>
        </div>
        {puede(usuario, 'crearRegistro') && (
          <button className="btn primary big" onClick={crear} disabled={creando}>
            {creando ? 'Creando…' : '+ NUEVO CONTROL'}
          </button>
        )}
      </section>

      <h2 className="sec-t">Controles abiertos <span className="count">{abiertos.length}</span></h2>
      {lista === null ? <p className="muted">Cargando…</p> : abiertos.length === 0 ? (
        <p className="muted vacio">No hay controles abiertos.</p>
      ) : (
        <div className="cards">{abiertos.map((c) => <TarjetaControl key={c.id} c={c} />)}</div>
      )}

      {recientes.length > 0 && (
        <>
          <h2 className="sec-t">Finalizados recientes</h2>
          <div className="cards">{recientes.map((c) => <TarjetaControl key={c.id} c={c} />)}</div>
          <a className="btn" href="#/historial">Ver historial completo →</a>
        </>
      )}
    </div>
  );
}

export function TarjetaControl({ c }) {
  const conInicio = c.pallets.filter((p) => p.lecturas.inicio.valor !== '').length;
  const conVolteo = c.pallets.filter((p) => p.lecturas.volteo.valor !== '').length;
  const conSalida = c.pallets.filter((p) => p.lecturas.salida.valor !== '').length;
  return (
    <a className="card" href={estaCerrado(c) ? `#/hoja/${c.id}` : `#/control/${c.id}`}>
      <div className="card-h">
        <b>N° {c.numero}</b>
        <Estado e={c.estado} />
      </div>
      <div className="card-b">
        <span>{formatoFecha(c.fecha)}</span><span>{c.exportadora}</span><span>{c.especie || '—'}</span>
      </div>
      <div className="card-p">
        <span><b>{c.pallets.length}</b> pallets</span>
        <span>INI {conInicio}/{c.pallets.length}</span>
        <span>VOL {conVolteo}/{c.pallets.length}</span>
        <span>SAL {conSalida}/{c.pallets.length}</span>
      </div>
      <div className="card-f">Modificado {formatoFechaHora(c.actualizadoEn)} · {c.actualizadoPor}</div>
    </a>
  );
}
