# INGEBAM Muebles360 V3.7 — Control técnico y documentación

Versión de trabajo de diseño paramétrico, comparación de fotos, costeo y despiece **preliminar**. Basado en V3.6.

## Mejoras V3.7

- Lista de seis verificaciones técnicas registradas por proyecto (medición, uniones, herrajes, tableros, precios y despiece).
- Las casillas se invalidan al modificar el diseño o los precios. Se incluyen en proyecto JSON y se recuperan al importar.
- Ficha técnica descargable en HTML para imprimir o guardar PDF: distribución modular, alzado, despiece por ID y módulo, estimación de tapacanto, costos y advertencias.
- Exportación CSV mejorada: ID de pieza, módulo y metros de tapacanto estimado por pieza.
- Advertencia explícita cuando se habilitan giros en el plan de corte, ya que pueden cambiar la orientación de veta.

## Probar

Abrir `index.html` con un servidor estático local o GitHub Pages. La vista local, el despiece y el panel de revisión no requieren conexión. `3D avanzado` sigue requiriendo Three.js por CDN. Ejecutar `node tests.js`, `node tests-vision.js`, `node tests-v35.js`, `node tests-v36.js`, `node tests-manufacturing.js` (y `node tests-ai.js` con servidor simulado, cuando esté disponible).

**Aviso:** Aunque estén marcadas todas las casillas, el documento no constituye aprobación técnica, plano CNC ni garantía de fabricabilidad. No incluye mecanizados, molduras, planificación CNC, tolerancias específicas de herrajes ni verificación física de cargas. Los precios son ficticios/estimados. Un profesional debe revisar mediciones y despiece antes de fabricar.
