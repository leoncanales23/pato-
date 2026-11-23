# Despliegue y configuración

## 1. Proyecto Firebase
1. Crear proyecto en Firebase (región sugerida `southamerica-east1`, São Paulo).
2. Activar **Authentication → Correo/Contraseña**, **Firestore**, **Storage**, y plan Blaze (requerido para Cloud Functions).
3. Registrar una app web y copiar su configuración a `.env.local` (ver `.env.example`).
4. `npm run build && firebase deploy --only hosting,firestore:rules,storage`

## 2. Usuarios y roles
Crear cada usuario en Authentication y luego el documento `usuarios/<uid>`:
```json
{ "nombre": "Nombre Apellido", "rol": "ENCARGADO", "activo": true }
```
Roles: `ADMINISTRADOR`, `ENCARGADO`, `OPERADOR`, `VISUALIZADOR`. El primer ADMINISTRADOR se crea a mano desde la consola.

## 3. Correo con PDF adjunto (Cloud Function)
```bash
cd functions && npm install
firebase functions:secrets:set SMTP_HOST   # ej. smtp.gmail.com / smtp.office365.com
firebase functions:secrets:set SMTP_PORT   # 465 o 587
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS   # contraseña de aplicación, nunca la personal
firebase functions:secrets:set SMTP_FROM   # "Coldchain <prefrios@dominio.cl>"
firebase deploy --only functions
```
Hasta que esto esté desplegado, la app **no** simula envíos: ofrece compartir el PDF con la app de correo del teléfono o abrir el cliente de correo para adjuntarlo manualmente.

## 4. Logo de la exportadora
Colocar el archivo autorizado en `public/logo-exportadora.png`. Si no existe, la hoja muestra el nombre en texto.

## 5. Sin conexión
- Modo local: todo queda en el dispositivo.
- Modo Firebase: Firestore con caché persistente; además cada cambio no guardado se respalda en el dispositivo y se ofrece recuperarlo al reabrir el registro.
