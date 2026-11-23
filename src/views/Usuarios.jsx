import { useEffect, useState } from 'react';
import { repo } from '../data/store.js';
import { firebaseConfigurado } from '../data/firebaseRepo.js';
import { ROLES } from '../auth/permissions.js';
import { uid } from '../model/control.js';

const DESC = {
  ADMINISTRADOR: 'Configuración, usuarios, todos los registros, sensores, historial.',
  ENCARGADO: 'Crear registros, administrar pallets, completar, finalizar y compartir.',
  OPERADOR: 'Registrar temperaturas, checklist y observaciones.',
  VISUALIZADOR: 'Consultar y descargar documentos.',
};

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState(ROLES.OPERADOR);

  useEffect(() => { if (!firebaseConfigurado) repo.listUsuarios().then(setLista); }, []);

  if (firebaseConfigurado) {
    return (
      <div className="page">
        <h1 className="page-t">Usuarios y permisos</h1>
        <div className="aviso">
          En modo Firebase los usuarios se crean en Firebase Authentication y su rol se asigna en el documento
          <code> usuarios/&lt;uid&gt; </code> (campos <code>nombre</code>, <code>rol</code>, <code>activo</code>). Ver docs/DESPLIEGUE.md.
        </div>
        <TablaRoles />
      </div>
    );
  }

  const guardar = async (l) => { setLista(l); await repo.putUsuarios(l); };
  const agregar = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    guardar([...lista, { id: uid(), nombre: nombre.trim(), rol, activo: true }]);
    setNombre('');
  };

  return (
    <div className="page">
      <h1 className="page-t">Usuarios del equipo</h1>
      <form onSubmit={agregar} className="fila-form">
        <input placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <select value={rol} onChange={(e) => setRol(e.target.value)}>
          {Object.values(ROLES).map((r) => <option key={r}>{r}</option>)}
        </select>
        <button className="btn primary">Agregar</button>
      </form>
      <table className="tabla">
        <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {lista.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>
                <select value={u.rol} onChange={(e) => guardar(lista.map((x) => (x.id === u.id ? { ...x, rol: e.target.value } : x)))}>
                  {Object.values(ROLES).map((r) => <option key={r}>{r}</option>)}
                </select>
              </td>
              <td>{u.activo === false ? 'Inactivo' : 'Activo'}</td>
              <td><button className="btn sm" onClick={() => guardar(lista.map((x) => (x.id === u.id ? { ...x, activo: x.activo === false } : x)))}>{u.activo === false ? 'Activar' : 'Desactivar'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablaRoles />
    </div>
  );
}

function TablaRoles() {
  return (
    <>
      <h2 className="sec-t">Roles</h2>
      <table className="tabla">
        <tbody>{Object.entries(DESC).map(([r, d]) => <tr key={r}><th>{r}</th><td>{d}</td></tr>)}</tbody>
      </table>
    </>
  );
}
