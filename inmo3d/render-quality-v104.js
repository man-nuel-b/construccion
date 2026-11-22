/* INGEBAM Inmo3D V10.4 — progressive renderer quality layer.
   Scoped to /inmo3d/. Does not modify geometry, pricing, or other sites. */
(() => {
  'use strict';
  if (window.__inmo3dQualityV104) return;
  const quality = { version: '10.4', configuredRenderers: 0, configuredScenes: 0, lastError: null };
  Object.defineProperty(window, '__inmo3dQualityV104', { value: quality, configurable: false });

  // Apply before the 3D application's scripts create their WebGL contexts.
  const nativeGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes, ...rest) {
    if (type !== 'webgl' && type !== 'webgl2' && type !== 'experimental-webgl')
      return nativeGetContext.call(this, type, attributes, ...rest);
    const opts = Object.assign({}, attributes || {}, {
      antialias: true,
      alpha: attributes && 'alpha' in attributes ? attributes.alpha : false,
      powerPreference: 'high-performance'
    });
    return nativeGetContext.call(this, type, opts, ...rest);
  };

  const seenRenderers = new WeakSet();
  const seenScenes = new WeakSet();
  const maxRatio = matchMedia('(max-width: 700px)').matches ? 1.5 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxRatio);
  const THREE = () => window.THREE;

  function tuneRenderer(renderer) {
    if (!renderer || typeof renderer.render !== 'function' || seenRenderers.has(renderer)) return;
    seenRenderers.add(renderer);
    try {
      const lib = THREE();
      if (typeof renderer.setPixelRatio === 'function') renderer.setPixelRatio(dpr);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        if (lib && lib.PCFSoftShadowMap != null) renderer.shadowMap.type = lib.PCFSoftShadowMap;
      }
      if (lib && lib.SRGBColorSpace != null && 'outputColorSpace' in renderer)
        renderer.outputColorSpace = lib.SRGBColorSpace;
      if (lib && lib.ACESFilmicToneMapping != null && 'toneMapping' in renderer) {
        renderer.toneMapping = lib.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
      }
      quality.configuredRenderers++;
    } catch (e) { quality.lastError = String(e); }
  }

  function tuneScene(scene) {
    if (!scene || !scene.isScene || seenScenes.has(scene)) return;
    seenScenes.add(scene);
    try {
      scene.traverse(node => {
        if (node.isLight && node.castShadow && node.shadow && node.shadow.mapSize) {
          // Avoid allocating very large shadow atlases on mobile devices.
          const side = matchMedia('(max-width: 700px)').matches ? 1024 : 2048;
          node.shadow.mapSize.set(side, side);
          if ('bias' in node.shadow) node.shadow.bias = -0.00015;
          if ('normalBias' in node.shadow) node.shadow.normalBias = 0.015;
          if (node.shadow.map) { node.shadow.map.dispose(); node.shadow.map = null; }
          node.shadow.needsUpdate = true;
        }
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(mat => {
          if (!mat || !mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) return;
          // Preserve intentionally authored roughness and metalness.
          if (mat.envMap && typeof mat.envMapIntensity === 'number')
            mat.envMapIntensity = Math.max(0.65, Math.min(1.6, mat.envMapIntensity));
          if (mat.map && 'anisotropy' in mat.map) {
            const max = Math.min(8, (window.__inmo3dMaxAnisotropy || 8));
            mat.map.anisotropy = max;
            mat.map.needsUpdate = true;
          }
        });
      });
      quality.configuredScenes++;
    } catch (e) { quality.lastError = String(e); }
  }

  // Support both common global app integrations and the Three.js namespace.
  function probe() {
    try {
      const candidates = [window.renderer, window.webglRenderer, window.app?.renderer,
        window.viewer?.renderer, window.engine?.renderer, window.inmo3d?.renderer];
      candidates.forEach(tuneRenderer);
      const scenes = [window.scene, window.app?.scene, window.viewer?.scene,
        window.engine?.scene, window.inmo3d?.scene];
      scenes.forEach(tuneScene);
      // Existing app can explicitly expose private module-scoped instances:
      window.Inmo3DQuality = Object.freeze({
        apply: (renderer, scene) => { tuneRenderer(renderer); tuneScene(scene); },
        status: () => ({ ...quality })
      });
    } catch (e) { quality.lastError = String(e); }
  }
  probe();
  let probes = 0;
  const timer = setInterval(() => {
    probe();
    if (++probes >= 60) clearInterval(timer);
  }, 1000);
})();