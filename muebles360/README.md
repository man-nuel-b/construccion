# INGEBAM Muebles360 V3.8 — Herrajes, puertas y lista de compras

Versión comercial y técnica de **demostración**, basada en V3.7; no es software aprobado por una mueblería ni plano CNC.

## Novedades

- Sentido de apertura de puerta **por módulo** (bisagras izquierda/derecha), reflejado en la visualización de apertura.
- Perfil de herrajes **estándar / cierre suave**, con precios unitarios diferenciados de bisagras y correderas.
- Costos actualizados automáticamente usando el mismo conteo de herrajes del motor paramétrico.
- Lista de compras preliminar: planchas por espesor, MDF, metros de tapacanto, bisagras, correderas, tiradores, patas y cubiertas; exportación CSV.
- Ficha técnica imprimible ampliada con el perfil de herrajes y lista de insumos para revisión.
- Inspector de piezas: identificador y material al seleccionar una pieza en el visor.
- El proyecto JSON conserva el sentido de apertura de puertas y el perfil/precios de herrajes; compatible con proyectos anteriores mediante valores por defecto.

## Limitaciones importantes

La lista de compras NO es una orden de compra ni un despiece certificado. No considera tornillería, sellantes, mecanizados, herrajes con códigos específicos, orientación de veta validada, ni accesorios particulares. Los precios son ficticios/editables. Las puertas grandes requieren comprobación de peso, bisagras y despejes. Cambiar el perfil de herrajes NO modifica la geometría de los cajones: confirma dimensiones, recorridos y cargas del modelo real con el proveedor.

La IA con Gemini requiere backend privado y clave en el servidor. GitHub Pages solo ofrece el análisis geométrico local.

## Ejecutar

Abrir `index.html` en Chrome/Edge para funcionamiento local. Ejecutar pruebas `node tests.js`, `node tests-manufacturing.js`, `node tests-v38.js` en la carpeta del proyecto.

No se modifican otros proyectos de INGEBAM.
