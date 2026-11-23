import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nuevoControl, nuevoPallet, validarCierre, estadoDerivado, diffResumen, ESTADOS, CHECK_ITEMS } from '../src/model/control.js';

const u = { nombre: 'Tester', rol: 'ENCARGADO' };

test('control nuevo: BORRADOR, 3 filas de seteo, sin pallets ni temperaturas inventadas', () => {
  const c = nuevoControl({ numero: '2', usuario: u });
  assert.equal(c.estado, ESTADOS.BORRADOR);
  assert.equal(c.inicio.length, 3);
  assert.equal(c.pallets.length, 0);
  const p = nuevoPallet('2693');
  assert.deepEqual([p.lecturas.inicio.valor, p.lecturas.volteo.valor, p.lecturas.salida.valor], ['', '', '']);
});

test('pallet solo con temperatura inicial => EN PROCESO, resto pendiente', () => {
  const c = nuevoControl({ numero: '2', usuario: u });
  const p = nuevoPallet('2693'); p.lecturas.inicio.valor = '8.3'; c.pallets.push(p);
  assert.equal(estadoDerivado(c), ESTADOS.EN_PROCESO);
  const v = validarCierre(c);
  assert.ok(v.pendientes.some((x) => x.includes('2693') && x.includes('VOLTEO') && x.includes('SALIDA')));
});

test('no se puede finalizar con checklist incompleto o sin V°B°', () => {
  const c = nuevoControl({ numero: '2', usuario: u });
  Object.assign(c, { especie: 'Nectarín' }); c.envase.CTN = true; c.bolsa.ATM = true; c.salida.hora = '18:00';
  c.pallets.push(nuevoPallet('1'));
  let v = validarCierre(c);
  assert.equal(v.ok, false);
  for (const it of CHECK_ITEMS) for (const f of ['inicio', 'volteo']) c.checklist[it][f].valor = 'SI';
  v = validarCierre(c);
  assert.equal(v.ok, false, 'falta V°B°');
  for (const it of CHECK_ITEMS) for (const f of ['inicio', 'volteo']) c.checklist[it][f].vb = 'Tester';
  v = validarCierre(c);
  assert.equal(v.ok, true, v.bloqueos.join('\n'));
});

test('códigos de pallet duplicados bloquean el cierre', () => {
  const c = nuevoControl({ numero: '2', usuario: u });
  c.pallets.push(nuevoPallet('10'), nuevoPallet('10'));
  assert.ok(validarCierre(c).bloqueos.some((b) => b.includes('duplicados')));
});

test('diffResumen registra cambios de temperatura por pallet', () => {
  const a = nuevoControl({ numero: '2', usuario: u });
  a.pallets.push(nuevoPallet('2510'));
  const b = structuredClone(a); b.pallets[0].lecturas.volteo.valor = '4.1';
  const d = diffResumen(a, b);
  assert.ok(d.some((x) => x.includes('2510') && x.includes('VOLTEO') && x.includes('4.1')));
});
