// Cloud Function: envío real del PDF por correo (SMTP).
// ESTADO: escrita, PENDIENTE de despliegue y prueba con las credenciales SMTP del cliente.
// Secretos requeridos (firebase functions:secrets:set ...): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

initializeApp();
const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_FROM = defineSecret('SMTP_FROM');

const ROLES_COMPARTIR = ['ADMINISTRADOR', 'ENCARGADO'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const enviarControlPorCorreo = onCall(
  { region: 'southamerica-east1', secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM], memory: '512MiB' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
    const db = getFirestore();
    const perfil = (await db.doc(`usuarios/${req.auth.uid}`).get()).data();
    if (!perfil || perfil.activo === false || !ROLES_COMPARTIR.includes(perfil.rol)) throw new HttpsError('permission-denied', 'Sin permiso para compartir.');

    const { controlId, destinatario, nombreArchivo, pdfBase64, numero, fecha } = req.data || {};
    if (!EMAIL_RE.test(destinatario || '')) throw new HttpsError('invalid-argument', 'Correo de destino no válido.');
    if (!pdfBase64 || pdfBase64.length > 14_000_000) throw new HttpsError('invalid-argument', 'PDF ausente o demasiado grande.');
    const ctrl = await db.doc(`controles/${controlId}`).get();
    if (!ctrl.exists) throw new HttpsError('not-found', 'Registro no encontrado.');

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(), port: Number(SMTP_PORT.value()), secure: Number(SMTP_PORT.value()) === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });
    const info = await transporter.sendMail({
      from: SMTP_FROM.value(),
      to: destinatario,
      subject: `Control Pre Fríos N° ${numero} — ${fecha}`,
      text: `Se adjunta el documento CONTROL PRE FRÍOS N° ${numero} (${fecha}).\nEnviado por ${perfil.nombre} desde VIBRAALTO COLDCHAIN OPERATIONS.`,
      attachments: [{ filename: String(nombreArchivo || 'control.pdf').replace(/[^\w.\-]/g, '_'), content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }],
    });
    return { ok: true, messageId: info.messageId };
  },
);
