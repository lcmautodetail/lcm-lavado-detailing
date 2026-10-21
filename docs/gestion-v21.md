# LCM Gestión 2.1

## Cambios

Inicio con acceso directo a la próxima cita activa, hasta tres solicitudes pendientes y cobros/resultado del mes. Las citas finalizadas o canceladas quedan fuera de próximas citas. La agenda abre en el día actual y permite filtrar las finalizadas. Los estados llevan texto y color: confirmada verde, pendiente amarillo, cancelada rojo y finalizada gris.

Economía muestra cobros, gastos, resultado provisional, cobro medio por movimiento e ingreso por hora anotada. La evolución de seis meses sigue el mes seleccionado e incluye meses sin movimientos. Las consultas están paginadas y las respuestas antiguas no pisan una selección más reciente. Las reservas no se suman como ingresos. Los formularios de ingreso y gasto se despliegan al utilizarlos.

Se conserva la conexión, la autenticación, el cronómetro, la galería, los presupuestos y los avisos. No se crean ni modifican tablas, reservas ni movimientos para esta actualización. El panel previo carga el módulo de cálculo compartido para mantener compatibilidad con economía.

## Validación

- Pruebas de estados y exclusión de finalizadas/canceladas de próximas citas.
- Cálculos en céntimos, medias, meses vacíos y cambio de año.
- Arranque con el SDK real, conexión de formulario de acceso y mensajes de error.
- Integración de módulos, presupuesto, cronómetro compartido y arranque sin escrituras.
- Controles de suscripción push, prueba y desactivación con servidor simulado.
- Sintaxis de módulos, IDs únicos, ocho formularios y estructura de secciones conservados.

La vista autenticada debe verificarse en los teléfonos del propietario. Las pruebas automatizadas no acreditan la entrega push en un dispositivo real.

## Pendientes fuera del alcance visual

El calendario por suscripción sigue sin desplegar: la revisión automática ha vuelto a rechazar la publicación por autorización de compartir datos de clientes. No se ha eludido el bloqueo ni habilitado el enlace. La entrega de avisos requiere permiso y prueba en cada dispositivo. No se han retirado aplicaciones de los teléfonos ni se han eliminado otros accesos.
