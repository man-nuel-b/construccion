# INGEBAM Muebles360 V3 — Configurador paramétrico y gestión de cortes

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
