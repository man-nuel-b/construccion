# INGEBAM Muebles360 V3.5 — Configurador paramétrico y gestión de cortes

**Prototipo técnico comercial independiente.** No pertenece oficialmente a Muebles Lasch, no ha sido encargado ni validado por esa empresa y los precios son ficticios.

## Inicio rápido (sin instalar nada)

1. Extrae todo el ZIP a una carpeta, sin mover los archivos JS fuera de ella.
2. Abre `index.html` en Chrome o Edge. **El visor ligero, el editor, las planchas y los cálculos funcionan sin internet.**
3. Elige *cocina*, *clóset* o *vanitorio*. Ingresa dimensiones reales en milímetros.
4. Selecciona un número de módulo (01, 02, 03…). Ajusta ancho útil, frente, número de cajones y repisas. También puedes seleccionar piezas desde el visor.
5. Revisa la estimación de costos, el despiece y la distribución de cortes. Expande **Editar precios de materiales y mano de obra** para introducir tus valores.
6. Usa **Guardar proyecto** para descargar el JSON. Usa **Abrir proyecto** para recuperarlo; el último proyecto también queda guardado localmente en el navegador cuando este permite almacenamiento.
7. Exporta CSV, alzado SVG y planchas SVG como documentos de estudio. No se generan archivos CNC.

## Vista 3D avanzada

La opción **3D avanzado ↗** utiliza Three.js desde CDN y requiere una conexión activa a internet, un navegador que permita WebGL y acceso a un CDN externo. **No se incluyó el paquete Three.js en el ZIP**. Si no puede cargarse, el programa conserva automáticamente el visor local interactivo. El visor avanzado no fue validado con un navegador en línea en este entorno; debe probarse en el equipo de destino.

Para un despliegue web, alojar los archivos en HTTPS (GitHub Pages o servidor propio). No publicar el backend con una clave de API dentro de HTML o JavaScript.

## Foto a configuración

La foto puede cargarse en el navegador como referencia. El botón *Sugerir divisiones desde foto* solamente usa contraste y **no reconoce semánticamente el mueble**. No calcula medidas reales. Al usar *Analizar con IA real*, la imagen se envía deliberadamente a un servidor local opcional (`server.js`) y de allí a Gemini, sujeto a API KEY, costos y condiciones del proveedor.

Para iniciar el backend local (Node.js 18 o superior):

```sh
# PowerShell de Windows
$env:GEMINI_API_KEY="TU_CLAVE_PRIVADA"; node server.js
# Linux/macOS
GEMINI_API_KEY=TU_CLAVE_PRIVADA node server.js
```

Luego abrir `http://127.0.0.1:8765/`. El servidor permanece local, no aloja públicamente la aplicación. **No escribas la clave en HTML ni la compartas.** La API de Gemini no pudo verificarse en línea desde este entorno, por lo que requiere pruebas con una clave propia y autorización del usuario para procesar fotos.

## Arquitectura de proyecto

- `furnitureCore.js`: normalización paramétrica con medidas enteras, módulos de anchura variable, piezas, herrajes, costos y distribución preliminar de cortes mediante MaxRects.
- `viewer.js`: visor offline de prismas con rotación, zoom, selección y apertura simulada de frentes.
- `renderer3d.js`: visor progresivo WebGL/Three.js, materiales y sombras, control orbital y selección por raycaster.
- `vision.js`: detección heurística local de bordes de contraste en imágenes.
- `app.js`: controles, estados, autosalvado, importación y exportadores.
- `server.js`: servidor local opcional y endpoint para análisis multimodal.
- `tests.js`: pruebas unitarias del motor; ejecutar con `node tests.js`.

## Restricciones técnicas importantes

1. El diseño de la estructura es un **esquema preliminar**: hay que verificar uniones, refuerzos, cargas, sistemas constructivos y tolerancias.
2. La lista de piezas no incorpora taladrados, herrajes específicos por fabricante, perforaciones de cubierta, ubicación de bisagras, sustracciones por ductos ni posiciones CNC.
3. Las planchas se distribuyen con heurística MaxRects, con márgenes y corte configurables. **No garantiza aprovechamiento óptimo** ni continuidad de veta y necesita revisión de operarios de taller. Al activar rotación, revisar dirección de veta.
4. Las piezas demasiado grandes se notifican como **sin ubicar** y el presupuesto puede resultar insuficiente. No cortar ni cobrar basándose en esa estimación.
5. Las fotografías **no permiten obtener medidas absolutas** sin referencias métricas confiables. La propuesta IA nunca debe autorizar automáticamente una fabricación.
6. Los precios en CLP son de ejemplo. La configuración de impuestos, mano de obra, traslado, instalación y proveedores debe validarse para cada proyecto y situación tributaria.
7. El proyecto no almacena clientes en un servidor. El navegador puede persistir el último diseño sin foto; utilizar proyectos JSON para respaldos.

## Pruebas realizadas

- 20 pruebas del motor y cotización paramétrico y de corte, desde Node.js.
- Pruebas de interacción de navegador mediante documento inyectado (la navegación automática a localhost y file:// estaba bloqueada por política del entorno): edición de módulo, cambio de cotización, guardar/reabrir JSON, exportar CSV y SVG, detección de piezas sin cabida, vista móvil sin desplazamiento horizontal.
- El modo Three.js en línea y el endpoint de Gemini deben verificarse en un navegador conectado con las credenciales correspondientes.


## Mejoras de V3 (noviembre 2026)
- Ficha comercial de cliente, contacto, referencia, etapa del proyecto y observaciones. Se guarda solo en el navegador o en el JSON descargado; no existe CRM remoto ni envíos automáticos.
- Presupuesto HTML imprimible, con despiece y advertencias; abrir el archivo descargado y usar **Imprimir / Guardar PDF**. No es una factura ni un plano aprobado.
- Deshacer/rehacer hasta 50 estados registrados tras cambios de controles; cambiar la fotografía no forma parte del historial.
- Reordenar los módulos conservando anchos, frentes y números de cajones/repisas.
- Costos adicionales editables: horas de instalación, despacho y contingencia.
- Permite una cajonera de un solo cajón, y advierte cuando las puertas/cajoneras son demasiado anchas.
- Compatibilidad con proyectos JSON V2; nuevo formato V3 incluye los datos comerciales.

## Seguridad y privacidad
Los campos de clientes se guardan en el navegador local. En equipos compartidos, eliminar el almacenamiento del sitio después de trabajar y evitar subir información personal de clientes a servicios públicos. El código de GitHub Pages no incorpora una base de datos privada.

## Comparar fotografía y diseño
En **Foto de referencia**, selecciona una imagen JPG/PNG/WebP. Pulsa *Sugerir divisiones desde foto* para obtener una sugerencia heurística por contrastes y *Comparar foto y diseño* para visualizar lado a lado la fotografía original y el alzado técnico parametrizado. La fotografía permanece en el dispositivo y no se guarda en GitHub ni en los archivos JSON. El dibujo no representa la imagen exactamente: por ahora se basa en la configuración del mueble y en medidas introducidas por el usuario.


## Actualización V3.1 — estabilidad e importación

- Configuración centralizada en `window.Muebles360Config`: `aiEndpoint` permanece vacío en GitHub Pages.
- Validación de valores vacíos y fuera de rango en campos numéricos antes del procesamiento del modelo.
- Comprobación síncrona de extensión y tamaño de JSON; la validación de estructura y errores de lectura sigue siendo responsabilidad de `app.js`.
- Mensajes de accesibilidad con `aria-live=polite` y avisos de conexión del visor Three.js.
- `app.js` utiliza el endpoint opcional configurado en vez de una ruta fija.
- **Seguridad:** no se incluyen credenciales; las fotografías se mantienen locales salvo que el usuario active explícitamente la integración IA.

La cubicación y el despiece son preliminares y necesitan revisión de taller antes de producción.

## Actualización V3.2 — fotografía → propuesta editable

- Al subir una fotografía JPG/PNG/WebP, pulsa **Reconocer divisiones y frentes (experimental)**. El algoritmo ejecuta análisis de píxeles en tu navegador: detecta candidatos a separaciones verticales, líneas horizontales y propone `puerta`, `cajones`, `abierto` o `mixto`.
- **No se modifica el modelo automáticamente.** El panel de revisión enseña la foto con separaciones y permite editar la clasificación, número de cajones, repisas y porcentaje de cuerpo mixto; solo **Aplicar diseño revisado** genera los nuevos módulos. **Descartar** mantiene el diseño anterior.
- Si la foto incluye fondo o muebles contiguos, en **Ajustar región de análisis** modifica los porcentajes que delimitan el área observada. El análisis no rectifica perspectiva ni recupera medidas del mundo real.
- El tipo **Mixto** incorpora repisas superiores, un entrepaño separador y cajones inferiores al despiece aproximado. Cada módulo conserva su ancho editable y una proporción inferior de cajones (25 a 75%).
- La detección local **no es una IA semántica entrenada**; puede equivocarse por texturas, marcos o reflejos. Las confianzas son heurísticas, no probabilidades calibradas.
- La función de IA multimodal con Gemini existe como **integración opcional de servidor** (`server.js`). Debes disponer de `GEMINI_API_KEY` en una variable de entorno del servidor. Al iniciar `PORT=8765 GEMINI_API_KEY=... node server.js` sobre tu equipo, la interfaz servida en `http://127.0.0.1:8765/` habilita el botón de IA remota. No introduzcas API keys en la web ni subas secretos al repositorio. La página pública de GitHub Pages solo ejecuta el análisis local.
- Las respuestas de IA se someten a normalización y revisión humana; ninguna dimensión se infiere de la foto. Las piezas ocultas, vetas, correderas, holguras y refuerzos deben validarse con un profesional antes de fabricar.
- Pruebas: `node tests.js` (20 pruebas heredadas) y `node tests-vision.js` (5 pruebas V3.2). El navegador automatizado del entorno de construcción no pudo abrir páginas locales por `ERR_BLOCKED_BY_ADMINISTRATOR`; es necesario validar visualmente en Chrome/Edge real.

### Alcance de despliegue
Solo se actualizan archivos de la carpeta `muebles360/`; el resto de los proyectos y la portada `index.html` de INGEBAM permanecen iguales. La fotografía de prueba no se envía a GitHub ni a servidores al ejecutar el reconocimiento local.


## Actualización V3.3 — aislar un mueble y conservar sus proporciones

1. Sube una fotografía y elige **Delimitar mueble · 4 esquinas** para separar el mueble de otros elementos de la escena. Marca las cuatro esquinas en orden: superior izquierda, superior derecha, inferior derecha e inferior izquierda. Se permite quitar la última esquina o limpiar la selección.
2. Al pulsar **Reconocer divisiones y frentes**, el navegador genera una vista frontal aproximada mediante transformación proyectiva y analiza bordes dentro de esa zona. La foto original y las esquinas se mantienen en memoria del navegador; no se publican ni transfieren a GitHub.
3. En la revisión se muestra la zona rectificada con posibles divisiones y puedes editar el **ancho relativo visual (peso)** de cada cuerpo, además del tipo de frente, cajones y repisas. El ancho físico total sigue siendo el valor que ingresaste manualmente; no se deducen milímetros de una imagen.
4. Después de revisar, pulsa **Aplicar diseño revisado**. El motor reequilibra los anchos según sus mínimos constructivos (260 mm), por lo que puede modificar las proporciones cuando el espacio no alcanza. Comprueba todas las medidas y cantidades antes de fabricar o cotizar.
5. Este procedimiento no es segmentación semántica por IA y no garantiza reconocer piezas ocultas. Si aparecen múltiples muebles o una perspectiva extrema, la selección manual ayuda, pero no reproduce automáticamente geometrías complejas.
6. El botón de Gemini sigue siendo una integración opcional local: analiza la foto original si se activa con el servidor privado. La corrección de cuatro esquinas se aplica únicamente al detector geométrico local.

Pruebas: `node tests.js` y `node tests-vision.js` (incluye rectificación, rechazo de cuadriláteros inválidos y opciones de revisión).


## V3.5 — Conexión multimodal verificable y análisis de área seleccionada

- El análisis con IA real **no está habilitado en GitHub Pages**: Pages aloja solo archivos estáticos. El botón permanece deshabilitado y el modo local sigue funcionando sin internet.
- Para activar el análisis con IA en una instalación **local**, configura la variable de entorno `GEMINI_API_KEY` y ejecuta `node server.js` desde la carpeta del proyecto. Abre `http://127.0.0.1:8765/`; el navegador consulta `/api/capabilities` y habilita el botón únicamente si el servidor confirma la disponibilidad de la clave.
- Al pulsar **Analizar zona seleccionada con IA real**, el navegador prepara un JPEG de la zona elegida por el usuario (ROI rectangular o cuatro esquinas rectificadas) y solo en ese momento envía esa zona al servidor. El servidor reenvía la imagen al proveedor Gemini. La clave **nunca** se incluye en HTML, repositorios ni peticiones del navegador.
- El servidor solicita frentes visibles (puertas, cajones, repisas, mixtos), número de módulos y sus proporciones `x0`/`x1`, nivel de confianza e incertidumbres. Las respuestas se validan, acotan y pasan al panel de revisión **antes** de modificar el diseño.
- Los anchos propuestos por IA son relativos al recorte y **no equivalen a medidas reales**. El ancho total debe introducirse manualmente; cualquier despiece y cotización siguen siendo preliminares.
- Se verificó el flujo local con la fotografía de prueba del clóset (detección de cinco zonas y aplicación editable) usando la interfaz de navegador. Se ejecutaron 20 pruebas del núcleo, 9 pruebas de visión y 6 pruebas nuevas de integración simulada; **no se probó una llamada real a Gemini por falta de una clave API privada**.
- El servidor opcional escucha solamente `127.0.0.1`, valida formato y tamaño de imagen (PNG/JPEG/WebP hasta 12 MB), y expone una ruta de capacidades sin devolver secretos. No se recomienda publicarlo en internet tal cual; para una futura versión pública hay que agregar autenticación, autorización, rate limit, controles de costos, registros seguros y política de privacidad.
- `tests-ai.js` incluye pruebas de proporciones, sanitización de resultados, validación de MIME, ausencia de clave y un proveedor multimodal simulado. Ejecuta `node tests-ai.js`.

**No es software oficial de Muebles Lasch.** La IA no mide con precisión desde una foto, no certifica piezas, soportes, juntas ni planos CNC; requiere revisión de fabricante.


## V3.5 — guías directas y revisión fotográfica

- Se pueden **arrastrar las divisiones amarillas** en la vista de revisión para alinear anchos proporcionales con la fotografía. Las proporciones se reflejan en los campos numéricos.
- Si se marca un cuadrilátero para rectificar, el detector toma la imagen ya corregida como región completa (no aplica otra vez el ROI previo).
- Se comprueba la disponibilidad de IA en el origen configurado; GitHub Pages sigue funcionando solo en modo local y no contiene claves.
- El croquis es orientativo: por una foto aislada no se conocen dimensiones ocultas, herrajes reales ni escala de fabricación.
- Enlace de versión para evitar caché: `https://man-nuel-b.github.io/construccion/muebles360/?v=3.5`

- V3.5 agrega estilo de puerta liso o con marco decorativo en ambos visores. El marco simulado no está incluido en el despiece, costos o procesos CNC.
