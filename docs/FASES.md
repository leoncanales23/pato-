# Informe por fases — v0.1.0

Referencia: fotografía de la hoja física CONTROL PRE FRIOS N° 2 (21/11/26) entregada por el cliente.

## FASE 1 · Análisis de la hoja y modelo de datos — ✅
**Archivos:** `src/model/control.js`, `src/auth/permissions.js`
**Estructura relevada de la hoja:** logo + título + N° + FECHA · EXPORTADORA · ESPECIE · ENVASE (CTN/PLA/MAD/BINS) · BOLSA (CONV/ATM/ATM AB./S/B), marcadas tachando ·
HORA INICIO y HORA VOLTEO (SETEO, HORA, EMISOR → SADEMA/TEMP., 3 filas) · HORA SALIDA (EMISOR → SADEMA/TEMP.) · ESTADÍSTICA (FECHA, EMISOR) ·
26 casillas de pallets en 2 columnas (código, ESPECIE, TEMPERATURA INICIO/VOLTEO/SALIDA) · SADEMA CHECK-LIST (CARPA…SELLADO; INICIO y VOLTEO con SI/NO/V°B°) · DESHIELO HORA · OBSERVACION · pie Greenvic.
**Decisiones:** SADEMA/TEMP. son texto libre (en la hoja aparecen "5G", "PR"); las temperaturas de pallet son numéricas y nunca se autocompletan; campo vacío = pendiente.
**Pruebas:** `tests/model.test.js` (5/5).

## FASE 2 · Landing y navegación — ✅
Login (local o Firebase), Inicio con controles abiertos/finalizados, navegación Inicio · Historial · Sensor Bridge β · Usuarios (admin). Indicador de conexión.

## FASE 3 · Formulario digital (vista operativa) — ✅
`src/views/Editor.jsx`. Secciones en el mismo orden de la hoja con barra de atajos; botones "ahora"/"hoy" para hora y fecha; responsable y fecha/hora de cada lectura automáticos.
Borrador de recuperación en el dispositivo a cada cambio + aviso al salir con cambios sin guardar.

## FASE 4 · Pallets dinámicos — ✅
Sin límite. Agregar uno, pegar lista o generar secuencia; duplicados rechazados; búsqueda; carga rápida por etapa; detalle por pallet (código, especie, 3 lecturas con responsable y hora, observaciones); confirmar pallet (ya no se puede eliminar ni cambiar su código).

## FASE 5 · Hoja A4 original — ✅
`src/doc/SheetA4.jsx`, `sheet.css`. Réplica en mm. Datos en azul tinta; opciones tachadas como en papel; especie repetida se imprime "/"; V°B° en iniciales.
Más de 26 pallets → hojas de CONTINUACIÓN con el mismo formato (38 por hoja). Filas extra de seteo, observaciones largas y observaciones por pallet → hoja ANEXO.
Documento no finalizado lleva marca de agua "… · NO FINALIZADO".

## FASE 6 · PDF, impresión, distribución — ✅ (correo servidor ⚠️ pendiente de desplegar)
PDF generado desde la misma plantilla (A4, multipágina). Impresión con `@media print` (solo la hoja).
WhatsApp: Web Share API con el PDF adjunto; alternativa: descarga + wa.me (o enlace de Storage en modo Firebase).
Correo: Cloud Function `enviarControlPorCorreo` (SMTP, adjunto real) — **escrita, no desplegada ni probada** (requiere credenciales). Alternativas reales mientras tanto: compartir con app de correo / mailto + adjunto manual. Ningún envío se reporta como exitoso sin confirmación.

## FASE 7 · Historial y trazabilidad — ✅
Búsqueda por fecha, N°, exportadora, código de pallet y estado. Historial de cambios con usuario, rol, fecha y detalle de cada campo. Finalizar crea versión inmutable (v1, v2…); reabrir exige ADMIN + motivo y conserva versiones anteriores, descargables en PDF.

## FASE 8 · Sensor Bridge BETA — ✅
Banner permanente "BETA: INTEGRACIÓN PENDIENTE DE VALIDACIÓN OPERATIVA". Fabricante/modelo/dispositivos, estado SIN CONEXIÓN, asociación sensor ↔ pallet por código real, tabla futura de lecturas. Vista de demostración marcada SIMULACIÓN, no se guarda ni toca los pallets. Sin credenciales, endpoints ni alertas.

## Pruebas realizadas
- Unitarias: 5/5.
- E2E Chromium emulando Pixel 7: crear admin y control → encabezado → 3 seteos → 32 pallets (15 de la hoja fotografiada + 17 en secuencia; duplicado omitido) → temperaturas de inicio y una de volteo → guardar, recargar y verificar → corte sin guardar y recuperación del borrador → hoja (2 páginas) → PDF A4 de 2 páginas → FINALIZAR bloqueado hasta completar checklist y V°B° → finalizar → historial buscando pallet 2620 → Sensor Bridge → impresión oculta la app. 0 errores JS.

## Problemas detectados / pendientes
1. **Firebase sin probar** contra un proyecto real (falta configuración del cliente). Reglas y Function escritas, sin desplegar.
2. **Correo por servidor** requiere SMTP del cliente (criterio de aceptación pendiente).
3. Web Share con archivos: no lo soportan Firefox de escritorio ni algunos navegadores; se usa la alternativa manual. Probar en los teléfonos reales del frigorífico.
4. Logo oficial de la exportadora: falta archivo autorizado (`public/logo-exportadora.png`).
5. Bundle de 1,2 MB (Firebase + PDF); optimizar con carga diferida.
6. Por confirmar con operación: significado exacto de EMISOR/SADEMA/TEMP. y si ESTADÍSTICA lleva más campos.

## Próximo paso
FASE 9: prueba operativa con datos reales autorizados en los teléfonos del frigorífico + configuración del proyecto Firebase. FASE 10: despliegue en Firebase Hosting y capacitación.
