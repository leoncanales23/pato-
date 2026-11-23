import { createContext, useContext, useEffect, useState } from 'react';
import { repo } from './data/store.js';
import { firebaseConfigurado, firebaseRepo } from './data/firebaseRepo.js';
import Login from './views/Login.jsx';
import Inicio from './views/Inicio.jsx';
import Editor from './views/Editor.jsx';
import Documento from './views/Documento.jsx';
import Historial from './views/Historial.jsx';
import SensorBridge from './views/SensorBridge.jsx';
import Usuarios from './views/Usuarios.jsx';
import { puede } from './auth/permissions.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [ruta, id] = h.split('/');
  return { ruta: ruta || 'inicio', id: id || null };
}
export const ir = (ruta, id) => { window.location.hash = '/' + ruta + (id ? '/' + id : ''); };

export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [loc, setLoc] = useState(parseHash());
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const f = () => setLoc(parseHash());
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('hashchange', f);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('hashchange', f); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (firebaseConfigurado) return firebaseRepo.onAuth(setUsuario);
    repo.getSesion().then((u) => setUsuario(u || null));
  }, []);

  const salir = async () => {
    if (firebaseConfigurado) await firebaseRepo.logout(); else await repo.setSesion(null);
    setUsuario(null);
  };

  if (usuario === undefined) return <div className="cargando">Cargando…</div>;
  if (!usuario || !usuario.rol) return <Login onLogin={setUsuario} sinRol={usuario && !usuario.rol} />;

  let vista;
  switch (loc.ruta) {
    case 'control': vista = <Editor key={loc.id} id={loc.id} />; break;
    case 'hoja': vista = <Documento key={loc.id} id={loc.id} />; break;
    case 'historial': vista = <Historial />; break;
    case 'sensores': vista = <SensorBridge />; break;
    case 'usuarios': vista = puede(usuario, 'gestionarUsuarios') ? <Usuarios /> : <Inicio />; break;
    default: vista = <Inicio />;
  }

  return (
    <Ctx.Provider value={{ usuario, online, salir }}>
      <div className="app no-print">
        <header className="topbar">
          <a className="brand" href="#/inicio">
            <span className="brand-mark" aria-hidden>▲</span>
            <span className="brand-txt"><b>VIBRAALTO</b><small>COLDCHAIN OPERATIONS</small></span>
          </a>
          <nav className="topnav">
            <a href="#/inicio" className={loc.ruta === 'inicio' ? 'on' : ''}>Inicio</a>
            <a href="#/historial" className={loc.ruta === 'historial' ? 'on' : ''}>Historial</a>
            <a href="#/sensores" className={loc.ruta === 'sensores' ? 'on' : ''}>Sensor Bridge <em>β</em></a>
            {puede(usuario, 'gestionarUsuarios') && <a href="#/usuarios" className={loc.ruta === 'usuarios' ? 'on' : ''}>Usuarios</a>}
          </nav>
          <div className="who">
            <span className={'net ' + (online ? 'ok' : 'off')} title={online ? 'Con conexión' : 'Sin conexión: los datos se guardan en el equipo'}>{online ? '●' : '○'}</span>
            <span className="who-n">{usuario.nombre}<small>{usuario.rol}</small></span>
            <button className="btn-link" onClick={salir}>Salir</button>
          </div>
        </header>
        {!firebaseConfigurado && (
          <div className="modo-local">MODO LOCAL · datos guardados solo en este equipo · sin autenticación ni sincronización (configure Firebase para operación multiusuario)</div>
        )}
        <main className="main">{vista}</main>
      </div>
    </Ctx.Provider>
  );
}
