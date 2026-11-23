// FASE 5 — Réplica digital de la hoja física "CONTROL PRE FRIOS" (Greenvic).
// Distribución calibrada sobre la fotografía del formulario original (A4 vertical).
// Página 1 = hoja original (26 casillas de pallets). Páginas siguientes = continuación
// con el mismo formato cuando hay más pallets, filas de seteo u observaciones.
import { useState } from 'react';
import {
  BOLSAS, CHECK_ITEMS, ENVASES, ESTADOS, FILAS_SETEO_HOJA, PALLETS_POR_COLUMNA, PALLETS_POR_HOJA,
  formatoFecha, formatoFechaHora, estaCerrado,
} from '../model/control.js';
import './sheet.css';

const PALLETS_POR_COLUMNA_CONT = 19;
const PALLETS_POR_HOJA_CONT = PALLETS_POR_COLUMNA_CONT * 2;
const OBS_LINEAS_HOJA = 4;

function Logo() {
  const [ok, setOk] = useState(true);
  return (
    <div className="s-logo">
      {ok ? <img src="/logo-exportadora.png" alt="" onError={() => setOk(false)} /> : <span className="s-logo-txt">greenvic</span>}
    </div>
  );
}

const V = ({ children, className = '' }) => <span className={'s-val ' + className}>{children}</span>;

function Opcion({ label, marcada }) {
  return <div className={'s-opt' + (marcada ? ' s-opt-on' : '')}><span>{label}</span></div>;
}

function TablaSeteo({ titulo, filas }) {
  const rows = [...filas];
  while (rows.length < FILAS_SETEO_HOJA) rows.push({});
  return (
    <table className="s-tbl s-seteo">
      <colgroup><col style={{ width: '22%' }} /><col style={{ width: '28%' }} /><col style={{ width: '26%' }} /><col style={{ width: '24%' }} /></colgroup>
      <thead>
        <tr><th colSpan={2} className="s-th-titulo">{titulo}</th><th colSpan={2} rowSpan={1} className="s-th-emisor">EMISOR</th></tr>
        <tr><th className="s-th-sm">SETEO</th><th className="s-th-sm">HORA</th><th className="s-th-xs">SADEMA</th><th className="s-th-xs">TEMP.</th></tr>
      </thead>
      <tbody>
        {rows.slice(0, FILAS_SETEO_HOJA).map((f, i) => (
          <tr key={i}><td><V>{f.seteo}</V></td><td><V>{f.hora}</V></td><td><V>{f.sadema}</V></td><td><V>{f.temp}</V></td></tr>
        ))}
      </tbody>
    </table>
  );
}

function CasillaPallet({ p, prev }) {
  const l = p?.lecturas;
  const esp = p?.especie && prev?.especie && p.especie.trim().toLowerCase() === prev.especie.trim().toLowerCase() ? '/' : p?.especie;
  return (
    <div className="s-pal">
      <div className="s-pal-cod"><V className="s-pal-cod-v">{p?.codigo}</V></div>
      <div className="s-pal-esp">
        <div className="s-pal-h">ESPECIE</div>
        <div className="s-pal-espv"><V>{esp}</V></div>
      </div>
      <div className="s-pal-temp">
        <div className="s-pal-h s-pal-h-temp">TEMPERATURA</div>
        <div className="s-pal-sub"><span>INICIO</span><span>VOLTEO</span><span>SALIDA</span></div>
        <div className="s-pal-vals">
          <span><V>{l?.inicio.valor}</V></span><span><V>{l?.volteo.valor}</V></span><span><V>{l?.salida.valor}</V></span>
        </div>
      </div>
    </div>
  );
}

function ColumnasPallets({ pallets, porColumna }) {
  const izq = Array.from({ length: porColumna }, (_, i) => i);
  const der = Array.from({ length: porColumna }, (_, i) => porColumna + i);
  // La especie se abrevia con "/" cuando repite la casilla anterior de la misma columna, igual que en papel.
  const casilla = (i, inicioCol) => <CasillaPallet key={i} p={pallets[i]} prev={i > inicioCol ? pallets[i - 1] : null} />;
  return (
    <div className="s-pallets">
      <div className="s-pal-col">{izq.map((i) => casilla(i, 0))}</div>
      <div className="s-pal-col">{der.map((i) => casilla(i, porColumna))}</div>
    </div>
  );
}

function Pie({ c, hoja, total }) {
  return (
    <div className="s-pie">
      <div className="s-pie-sys">
        VIBRAALTO COLDCHAIN OPERATIONS · Reg. N° {c.numero} · {c.estado}{estaCerrado(c) ? ` · v${c.version}` : ''} · Hoja {hoja}/{total}
        <br />Emitido {formatoFechaHora(new Date().toISOString())}{c.finalizadoPor ? ` · Cerrado por ${c.finalizadoPor}` : ''}
      </div>
      <div className="s-pie-emp">
        Comercial Greenvic S.A., Planta Maipo Fruta Fresca
        <br />Quinta de Maipo Norte S/N, Comuna de Buin, Chile
      </div>
    </div>
  );
}

function MarcaAgua({ c }) {
  if (estaCerrado(c)) return null;
  return <div className="s-agua">{c.estado === ESTADOS.BORRADOR ? 'BORRADOR' : c.estado} · NO FINALIZADO</div>;
}

function EncabezadoCont({ c, titulo }) {
  return (
    <div className="s-cont-head">
      <Logo />
      <div className="s-titulo">CONTROL PRE FRIOS<small>{titulo}</small></div>
      <div className="s-box s-num"><span className="s-lbl-in">Nº</span><V className="s-num-v">{c.numero}</V></div>
      <div className="s-box s-fecha"><span className="s-lbl-tl">FECHA</span><V className="s-fecha-v">{formatoFecha(c.fecha)}</V></div>
      <div className="s-cont-meta">EXPORTADORA: <V>{c.exportadora}</V> &nbsp; ESPECIE: <V>{c.especie}</V></div>
    </div>
  );
}

function lineasObs(c) {
  return (c.observaciones || []).map((o) => `${o.texto} — ${o.responsable} ${formatoFechaHora(o.fechaHora)}`);
}

export function paginar(c) {
  const resto = c.pallets.slice(PALLETS_POR_HOJA);
  const chunks = [];
  for (let i = 0; i < resto.length; i += PALLETS_POR_HOJA_CONT) chunks.push(resto.slice(i, i + PALLETS_POR_HOJA_CONT));
  const extraInicio = c.inicio.slice(FILAS_SETEO_HOJA);
  const extraVolteo = c.volteo.slice(FILAS_SETEO_HOJA);
  const obs = lineasObs(c);
  const extraObs = obs.slice(OBS_LINEAS_HOJA);
  const palletObs = c.pallets.filter((p) => p.observaciones?.trim());
  const anexo = extraInicio.length || extraVolteo.length || extraObs.length || palletObs.length;
  return { chunks, extraInicio, extraVolteo, obs, extraObs, palletObs, total: 1 + chunks.length + (anexo ? 1 : 0), anexo };
}

export default function SheetA4({ c }) {
  const pg = paginar(c);
  const filasCheck = CHECK_ITEMS;
  let hoja = 1;
  return (
    <div className="sheet-root">
      {/* ===================== HOJA 1: FORMULARIO ORIGINAL ===================== */}
      <section className="s-page" data-page="1">
        <MarcaAgua c={c} />
        <div className="s-row1">
          <Logo />
          <div className="s-titulo">CONTROL PRE FRIOS</div>
          <div className="s-box s-num"><span className="s-lbl-in">Nº</span><V className="s-num-v">{c.numero}</V></div>
          <div className="s-box s-fecha"><span className="s-lbl-tl">FECHA</span><V className="s-fecha-v">{formatoFecha(c.fecha)}</V></div>
        </div>

        <div className="s-row2">
          <div className="s-box s-exp">
            <div className="s-lbl-c">EXPORTADORA</div>
            <V className="s-exp-v">{c.exportadora}</V>
          </div>
          <div className="s-env">
            <div className="s-esp">
              <div className="s-lbl-c">ESPECIE</div>
              <V className="s-esp-v">{c.especie}</V>
            </div>
            <div className="s-grp">
              <div className="s-lbl-c s-grp-h">ENVASE</div>
              <div className="s-opts">{ENVASES.map((e) => <Opcion key={e} label={e} marcada={c.envase[e]} />)}</div>
            </div>
            <div className="s-grp">
              <div className="s-lbl-c s-grp-h">BOLSA</div>
              <div className="s-opts">{BOLSAS.map((b) => <Opcion key={b.id} label={b.label} marcada={c.bolsa[b.id]} />)}</div>
            </div>
          </div>
        </div>

        <div className="s-row3">
          <TablaSeteo titulo="HORA INICIO" filas={c.inicio} />
          <TablaSeteo titulo="HORA VOLTEO" filas={c.volteo} />
          <table className="s-tbl s-salida">
            <tbody>
              <tr><th colSpan={2} className="s-th-titulo">HORA SALIDA</th></tr>
              <tr><td colSpan={2} className="s-salida-hora"><V>{c.salida.hora}</V></td></tr>
              <tr><th colSpan={2} className="s-th-xs">EMISOR</th></tr>
              <tr><th className="s-th-xs">SADEMA</th><th className="s-th-xs">TEMP.</th></tr>
              <tr><td><V>{c.salida.sadema}</V></td><td><V>{c.salida.temp}</V></td></tr>
            </tbody>
          </table>
          <table className="s-tbl s-est">
            <tbody>
              <tr><th className="s-th-sm">ESTADISTICA</th></tr>
              <tr><th className="s-th-xs">FECHA</th></tr>
              <tr><td><V>{formatoFecha(c.estadistica.fecha)}</V></td></tr>
              <tr><th className="s-th-xs">EMISOR</th></tr>
              <tr><td><V>{c.estadistica.emisor}</V></td></tr>
            </tbody>
          </table>
        </div>

        <ColumnasPallets pallets={c.pallets.slice(0, PALLETS_POR_HOJA)} porColumna={PALLETS_POR_COLUMNA} />

        <div className="s-row5">
          <table className="s-tbl s-check">
            <colgroup>
              <col style={{ width: '25%' }} />
              {Array.from({ length: 6 }, (_, i) => <col key={i} style={{ width: '8.5%' }} />)}
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="s-th-inv">SADEMA</th>
                <th colSpan={3} className="s-th-inv">INICIO</th>
                <th colSpan={3} className="s-th-inv">VOLTEO</th>
                <th rowSpan={2} className="s-th-inv">DESHIELO<br />HORA</th>
              </tr>
              <tr>
                <th className="s-th-inv">CHECK-LIST</th>
                <th className="s-th-inv">SI</th><th className="s-th-inv">NO</th><th className="s-th-inv">V°B°</th>
                <th className="s-th-inv">SI</th><th className="s-th-inv">NO</th><th className="s-th-inv">V°B°</th>
              </tr>
            </thead>
            <tbody>
              {filasCheck.map((item, i) => {
                const it = c.checklist[item];
                return (
                  <tr key={item}>
                    <td className="s-check-item">{item}</td>
                    {['inicio', 'volteo'].map((f) => (
                      <FasesCheck key={f} f={it[f]} />
                    ))}
                    {i === 0 && <td rowSpan={filasCheck.length} className="s-deshielo"><V>{c.deshielo.hora}</V></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="s-obs">
            <div className="s-obs-l"><span className="s-obs-lbl">OBSERVACION:</span><span className="s-obs-line"><V>{pg.obs[0]}</V></span></div>
            {Array.from({ length: OBS_LINEAS_HOJA - 1 }, (_, i) => (
              <div key={i} className="s-obs-l"><span className="s-obs-line"><V>{pg.obs[i + 1]}</V></span></div>
            ))}
            {pg.extraObs.length > 0 && <div className="s-obs-more">(continúa en hoja {pg.total})</div>}
          </div>
        </div>
        <Pie c={c} hoja={hoja} total={pg.total} />
      </section>

      {/* ===================== HOJAS DE CONTINUACIÓN DE PALLETS ===================== */}
      {pg.chunks.map((chunk, i) => {
        hoja += 1;
        const desde = PALLETS_POR_HOJA + i * PALLETS_POR_HOJA_CONT + 1;
        return (
          <section className="s-page" data-page={hoja} key={'c' + i}>
            <MarcaAgua c={c} />
            <EncabezadoCont c={c} titulo={`CONTINUACIÓN PALLETS ${desde}–${desde + chunk.length - 1}`} />
            <ColumnasPallets pallets={chunk} porColumna={PALLETS_POR_COLUMNA_CONT} />
            <Pie c={c} hoja={hoja} total={pg.total} />
          </section>
        );
      })}

      {/* ===================== ANEXO ===================== */}
      {pg.anexo ? (
        <section className="s-page" data-page={pg.total}>
          <MarcaAgua c={c} />
          <EncabezadoCont c={c} titulo="ANEXO" />
          {(pg.extraInicio.length > 0 || pg.extraVolteo.length > 0) && (
            <div className="s-anexo-seteo">
              {pg.extraInicio.length > 0 && <TablaSeteoLibre titulo="HORA INICIO (cont.)" filas={pg.extraInicio} />}
              {pg.extraVolteo.length > 0 && <TablaSeteoLibre titulo="HORA VOLTEO (cont.)" filas={pg.extraVolteo} />}
            </div>
          )}
          {pg.palletObs.length > 0 && (
            <div className="s-anexo-blk">
              <div className="s-anexo-t">OBSERVACIONES POR PALLET</div>
              {pg.palletObs.map((p) => <div key={p.id} className="s-obs-l"><span className="s-obs-line"><b>{p.codigo}</b>: <V>{p.observaciones}</V></span></div>)}
            </div>
          )}
          {pg.extraObs.length > 0 && (
            <div className="s-anexo-blk">
              <div className="s-anexo-t">OBSERVACION (cont.)</div>
              {pg.extraObs.map((t, i) => <div key={i} className="s-obs-l"><span className="s-obs-line"><V>{t}</V></span></div>)}
            </div>
          )}
          <Pie c={c} hoja={pg.total} total={pg.total} />
        </section>
      ) : null}
    </div>
  );
}

function FasesCheck({ f }) {
  return (
    <>
      <td className="s-check-x"><V>{f.valor === 'SI' ? 'X' : ''}</V></td>
      <td className="s-check-x"><V>{f.valor === 'NO' ? 'X' : ''}</V></td>
      <td className="s-check-vb" title={f.vb}><V>{iniciales(f.vb)}</V></td>
    </>
  );
}

function TablaSeteoLibre({ titulo, filas }) {
  return (
    <table className="s-tbl s-seteo">
      <thead>
        <tr><th colSpan={2} className="s-th-titulo">{titulo}</th><th colSpan={2} className="s-th-emisor">EMISOR</th></tr>
        <tr><th className="s-th-sm">SETEO</th><th className="s-th-sm">HORA</th><th className="s-th-xs">SADEMA</th><th className="s-th-xs">TEMP.</th></tr>
      </thead>
      <tbody>{filas.map((f) => <tr key={f.id}><td><V>{f.seteo}</V></td><td><V>{f.hora}</V></td><td><V>{f.sadema}</V></td><td><V>{f.temp}</V></td></tr>)}</tbody>
    </table>
  );
}

export function iniciales(nombre = '') {
  return nombre.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, 3);
}
