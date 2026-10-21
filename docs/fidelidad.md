# Tarjeta de mantenimiento · 21/10/2026

En Clientes → ficha del cliente se muestran diez sellos: 5 mantenimientos generan el objetivo del 10 % y 10 el del 25 %, para el siguiente mantenimiento. El undécimo mantenimiento abre una nueva tarjeta; se conserva el total de objetivos alcanzados. El resumen no contabiliza premios canjeados ni modifica precios o ingresos automáticamente.

El cálculo usa registros del servidor: mantenimientos finalizados no internos de Trabajos, historial importado elegible y reservas completadas sin trabajo vinculado. Cada identificador cuenta una sola vez. Un trabajo vinculado tiene prioridad sobre su reserva, incluso si es interno o se cancela. Las reservas sin trabajo se asocian solo cuando el teléfono normalizado identifica un único cliente; en los casos ambiguos se debe registrar el trabajo y elegir el cliente explícitamente.

Editar y volver a guardar un trabajo finalizado no añade sellos. Corregir estado, cliente o tipo de servicio corrige la tarjeta. No se introducen caducidades ni reinicios por inactividad. Los registros se leen con paginación y las tarjetas se recargan al entrar en Clientes, guardar trabajos, recargar datos o recuperar el foco. No se guardan sellos en el teléfono ni se modifican datos de negocio al abrir la tarjeta.

Validación: `node tests/fidelidad.cjs`, `node tests/fidelidad-integration.cjs`, `node tests/mobile-smoke.cjs` y `node tests/access-startup.cjs`. Las pruebas cubren hitos 5/10/15/20, deduplicación de reserva/trabajo, cancelados/internos, identidad, errores de red, escape de HTML y paginación de 1005 trabajos. La comprobación visual de navegador local no pudo ejecutarse porque no hay Chromium instalado y su descarga está bloqueada por la red.
