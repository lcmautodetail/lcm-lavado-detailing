# LCM Lavado & Detailing — versión online

## Estado actual
Código listo para **conectar**, no publicado ni configurado en una base de datos real. Hasta completar los pasos, `reservar.html` seguirá ofreciendo solicitud por WhatsApp, como antes. `admin.html` indicará que falta configuración.

## 1. Crear proyecto Supabase
- Crear cuenta/proyecto en https://supabase.com (elige región de la UE si está disponible).
- En **SQL Editor**, pegar y ejecutar `supabase-setup.sql`.
- En **Authentication > Users**, crear un usuario con tu correo y contraseña fuerte. No habilitar registro público innecesario.
- Copiar el UUID del usuario y ejecutar en SQL Editor:
  `insert into public.admins(user_id) values ('UUID_REAL_DEL_USUARIO');`
- En **Project Settings > API**, copiar URL del proyecto y clave **anon/publishable** a `config.js`. **Nunca** poner una `service_role`/`secret` en un archivo web.
- Revisar en Supabase Auth las URL permitidas y las opciones de seguridad.

## 2. Revisar antes de publicar
- Entra a `admin.html` y ajusta **todos los precios y duraciones provisionales**.
- Revisa horarios: por defecto 09:00–20:00, bloques de 30 min, domingos cerrados. Se ajustan en `supabase-setup.sql` función `available_slots` antes de ejecutar; no son editables desde el panel todavía.
- Completa la información legal en `privacidad.html` y revisa con asesoría RGPD y tratamiento de datos.
- Activa protección anti-spam/CAPTCHA y limitación de solicitudes antes de promocionar el formulario. La limitación incluida por teléfono no es suficiente contra bots.
- No difundas la dirección `admin.html` como sustituto de la seguridad: la protección real está en Auth y RLS.

## 3. Publicar en GitHub Pages
- Sube **los archivos y carpetas contenidos en este ZIP** a la raíz del repositorio `lcm-lavado-detailing`.
- Configura GitHub Pages desde la rama principal y raíz del repositorio.
- Prueba `https://lcmautodetail.github.io/lcm-lavado-detailing/reservar.html` y `.../admin.html`.
- Abre la web desde otro navegador/dispositivo y comprueba que la reserva aparece en la agenda.

## 4. Qué funciona tras conectar
- Solicitudes online persistentes y sincronizadas, sin mostrar datos de otros clientes.
- Bloqueo de solapamientos de citas, incluso si dos clientes reservan a la vez.
- Login privado, listado y edición de citas, clientes, estados y precios, bloqueos de días, exportación CSV, enlaces WhatsApp.
- La confirmación es manual. No hay SMS/WhatsApp automáticos ni pagos integrados.

## 5. Limitaciones actuales
- La agenda está organizada como lista con filtro por fecha, no como calendario gráfico avanzado.
- Horarios fijos en SQL; no hay distintos turnos por día ni vacaciones por rango salvo bloquear fechas una a una.
- Los precios son orientativos, no hay catálogo completo de marcas/modelos para presupuesto automático.
- No incluye backups automáticos propios, CAPTCHA ni envío de emails.
- Supabase tiene límites gratuitos y posibles pausas por inactividad según plan vigente.

**Importante:** no se han solicitado ni usado contraseñas privadas en este proyecto. Si necesitas ayuda con la configuración, comparte capturas sin mostrar claves privadas.
