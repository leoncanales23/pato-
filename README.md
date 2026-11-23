# VIBRAALTO · COLDCHAIN OPERATIONS

Digitalización de la hoja física **CONTROL PRE FRÍOS** (Comercial Greenvic S.A., Planta Maipo Fruta Fresca, Quinta de Maipo Norte, Buin).
La hoja original sigue siendo el corazón del sistema: la vista documento replica su distribución en A4.

## Uso rápido

```bash
npm install
npm run dev        # desarrollo
npm test           # pruebas del modelo
npm run build      # compilación a dist/
```

Sin configuración, la app funciona en **MODO LOCAL** (IndexedDB del dispositivo, sin conexión, sin autenticación).
Con `.env.local` (ver `.env.example`) se activa **Firebase** (Auth + Firestore offline + Storage + Function de correo).

- `docs/FASES.md` — informe por fase: archivos, funcionalidades, pruebas, problemas, próximo paso.
- `docs/DESPLIEGUE.md` — configuración Firebase, roles, correo SMTP, logo de la exportadora.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/model/control.js` | Modelo de datos, estados, validación de cierre, diff para historial |
| `src/doc/SheetA4.jsx`, `sheet.css` | Réplica A4 de la hoja física (impresión y PDF) |
| `src/doc/pdf.js` | PDF desde la misma plantilla |
| `src/share/share.js` | WhatsApp / correo (Web Share API y alternativas manuales) |
| `src/views/*` | Inicio, Editor operativo, Hoja, Historial, Sensor Bridge β, Usuarios |
| `src/data/*` | Repositorio local (IndexedDB) y Firebase; guardado con historial |
| `firestore.rules`, `storage.rules`, `functions/` | Seguridad por rol y envío de correo |
