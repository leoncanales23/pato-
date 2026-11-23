import { useEffect, useState } from 'react';
import { repo } from '../data/store.js';
import { firebaseConfigurado, firebaseRepo } from '../data/firebaseRepo.js';
import { ROLES } from '../auth/permissions.js';
import { uid } from '../model/control.js';

export default function Login({ onLogin, sinRol }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark big">▲</span>
          <h1>VIBRAALTO</h1>
          <p>COLDCHAIN OPERATIONS</p>
          <small>Control de prefríos · trazabilidad · cadena de frío</small>
        </div>
        {firebaseConfigurado ? <LoginFirebase sinRol={sinRol} /> : <LoginLocal onLogin={onLogin} />}
      </div>
    </div>
  );
}

function LoginFirebase({ sinRol }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (sinRol) {
    return (
      <div className="aviso err">
        Su cuenta no tiene un rol asignado. Solicite al ADMINISTRADOR que lo habilite.
        <button className="btn" onClick={() => firebaseRepo.logout()}>Salir</button>
      </div>
    );
  }
  const enviar = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await firebaseRepo.login(email.trim(), pass); } catch { setErr('Correo o contraseña incorrectos, o sin conexión.'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={enviar} className="form">
      <label>Correo<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Contraseña<input type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} required /></label>
      {err && <div className="aviso err">{err}</div>}
      <button className="btn primary big" disabled={busy}>{busy ? 'Ingresando…' : 'INGRESAR'}</button>
    </form>
  );
}

function LoginLocal({ onLogin }) {
  const [usuarios, setUsuarios] = useState(null);
  const [nombre, setNombre] = useState('');
  useEffect(() => { repo.listUsuarios().then(setUsuarios); }, []);
  if (!usuarios) return null;
  const activos = usuarios.filter((u) => u.activo !== false);
  const entrar = async (u) => { await repo.setSesion(u); onLogin(u); };
  const crearAdmin = async (e) => {
    e.preventDefault();
    const u = { id: uid(), nombre: nombre.trim(), rol: ROLES.ADMINISTRADOR, activo: true };
    await repo.putUsuarios([u]);
    entrar(u);
  };
  return (
    <div className="form">
      <div className="aviso">MODO LOCAL: sin contraseña. Para operación real multiusuario se debe configurar Firebase Authentication.</div>
      {activos.length === 0 ? (
        <form onSubmit={crearAdmin} className="form">
          <p>Primer uso en este equipo. Cree el usuario ADMINISTRADOR:</p>
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Nombre y apellido" /></label>
          <button className="btn primary big">CREAR Y ENTRAR</button>
        </form>
      ) : (
        <>
          <p>Seleccione su usuario:</p>
          <div className="lista-usuarios">
            {activos.map((u) => (
              <button key={u.id} className="btn user" onClick={() => entrar(u)}>
                <b>{u.nombre}</b><small>{u.rol}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
