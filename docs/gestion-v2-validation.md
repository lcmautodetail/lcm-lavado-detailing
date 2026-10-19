# LCM Gestión 2.0 · Validación

## Alcance de esta versión

- Agenda semanal y búsqueda por cliente, teléfono, matrícula, vehículo y servicio.
- Filtros de estado, cronología e históricos editables existentes.
- Presupuestador conectado a `lcm_quote`, con catálogo `vehicle_models` y aviso de revisión de tarifa.
- Mensajes de WhatsApp editables; el envío lo realiza el usuario en WhatsApp.
- Cronómetro compartido mediante `lcm_timer_action`, con revisión optimista para rechazar operaciones obsoletas entre teléfonos.
- Historial de tiempos en `lcm_service_times`. Los tiempos locales anteriores se conservan.
- Galería privada por cita o trabajo independiente. Imágenes reducidas a 1600 px, JPEG, URLs firmadas durante 15 minutos.
- Clientes, vehículos, trabajos y economía conservan los módulos operativos actuales.

## Comprobaciones realizadas

`node tests/mobile-smoke.cjs` verifica la carga de todos los módulos, los IDs de la interfaz, el arranque autenticado, consultas iniciales sin escritura, presupuestos, navegación de reserva, cronómetro compartido, recuperación de sesión ante error de red y almacenamiento local bloqueado. Comprueba además fechas alrededor del cambio de hora y año y normalización de teléfonos.

`node --check` para los módulos modificados y `git diff --check`.

En Supabase se probó en una transacción que se revirtió: asignar una cita ficticia, iniciar, pausar, finalizar y comprobar la fila del tiempo. No queda ningún registro de prueba. Una sesión autenticada sin administrador no puede leer el cronómetro ni las fotografías. Las nuevas tablas usan RLS y el bucket es privado. La función del cronómetro es SECURITY INVOKER.

## Instalación de backend aplicada

Migraciones de Supabase `lcm_shared_service_timer` y `lcm_private_work_photos` en el proyecto existente. No se han reimportado datos ni cambiado las tablas de reservas o contabilidad. No publicar estos módulos en otra base de datos sin instalar esas migraciones.

## Comprobaciones pendientes en dispositivos

- Inicio de sesión real en iPhone y Android.
- Inicio y pausa desde teléfonos distintos, y recuperación tras cerrar la app.
- Seleccionar fotos de la galería, subir una foto y abrir su versión ampliada; compatibilidad HEIC depende del navegador y se muestra error si no puede decodificarse.
- Notificaciones push: servidor lcm-push desplegado tras autorización expresa del usuario. Activar cada móvil y probar la recepción real; sin suscripción y permiso del teléfono no hay entrega. El calendario por suscripción se encuentra preparado en código, pero su despliegue quedó bloqueado por revisión de autorización de compartir datos con Google y Apple.
- El cronómetro no funciona sin red. No se reemplaza silenciosamente por otro local.

## Transición

Se mantiene `gestion.html` como acceso único para esta aplicación. No se retira aún el panel anterior: faltan las pruebas anteriores y la configuración push acordada. La web pública y la página de reservas se conservan sin cambios.
