// INGEBAM: GitHub proxy protegido por autenticación Supabase y lista de administradores.
// Nunca insertar tokens de GitHub en el navegador o en el repositorio público.
// Desplegar en un proyecto Supabase EXCLUSIVO para INGEBAM.
const ORIGIN = "https://man-nuel-b.github.io";
const OWNER = "man-nuel-b";
const REPO = "construccion";
const GH_API = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/";
const allowOrigin = (req: Request) => req.headers.get("origin") === ORIGIN;

const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "300",
  "Vary": "Origin",
  "Cache-Control": "no-store",
};

function response(code: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status: code, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPublishableKey() {
  const env = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
  const parsed = JSON.parse(env) as Record<string, string>;
  if (!parsed.default || !parsed.default.startsWith("sb_publishable_")) {
    throw Error("La clave pública de Supabase no está configurada");
  }
  return parsed.default;
}

function validatePath(raw: string, method: string) {
  let path: string;
  try { path = decodeURIComponent(raw); }
  catch { return null; }
  if (path.includes("%") || path.includes("\\") || path.includes("..") ||
      path.includes("?") || path.startsWith("/") || path.includes("//")) return null;
  if ((path === "data/modelos.json" || path === "config.js") && (method === "GET" || method === "PUT")) return path;
  if (method === "PUT" && /^media\/[a-z0-9-]{1,55}\/(?:portada|galeria|360)-[a-z0-9-]{8,40}\.(?:jpg|png|webp)$/.test(path)) return path;
  return null;
}

Deno.serve(async (req: Request) => {
  if (!allowOrigin(req)) return response(403, "Origen no autorizado");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "PUT") return response(405, "Método no admitido");

  const url = new URL(req.url);
  const marker = "/ingebam-admin/contents/";
  const start = url.pathname.indexOf(marker);
  if (start < 0) return response(404, "Ruta no disponible");
  const pathname = url.pathname.slice(start + marker.length);
  const path = validatePath(pathname, req.method);
  if (!path) return response(403, "Ruta de archivo no admitida");
  if (req.method === "GET" && url.searchParams.get("ref") !== "main") return response(400, "Solo rama main");

  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return response(401, "Se requiere iniciar sesión");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const githubToken = Deno.env.get("INGEBAM_GITHUB_TOKEN");
  const admins = (Deno.env.get("INGEBAM_ADMIN_USER_IDS") || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!supabaseUrl || !githubToken || !admins.length) return response(503, "Servicio de administración sin configurar");

  try {
    // Verifica el token de sesión directamente con Auth. Nunca confía en metadatos del navegador.
    const auth = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: getPublishableKey(), authorization: "Bearer " + bearer },
    });
    if (!auth.ok) return response(401, "Sesión inválida o vencida");
    const user = await auth.json();
    if (!user.id || !admins.includes(user.id) || !user.email_confirmed_at) return response(403, "El usuario no está autorizado para administrar INGEBAM");

    let body: string | undefined;
    if (req.method === "PUT") {
      const len = Number(req.headers.get("content-length") || "0");
      if (len > 12_000_000) return response(413, "Archivo demasiado grande");
      body = await req.text();
      if (body.length > 12_000_000) return response(413, "Archivo demasiado grande");
      let json: Record<string, unknown>;
      try { json = JSON.parse(body); } catch { return response(400, "Contenido JSON inválido"); }
      if (json.branch !== "main" || typeof json.content !== "string" ||
          typeof json.message !== "string" || json.message.length > 150 ||
          json.message.length < 1 || json.content.length > 11_300_000 ||
          !/^[A-Za-z0-9+/=\r\n]+$/.test(json.content) ||
          (json.sha !== undefined && !/^[0-9a-f]{40}$/.test(String(json.sha)))) {
        return response(400, "Solicitud de escritura inválida");
      }
      if (path.startsWith("media/") && json.sha !== undefined) return response(403, "No se permite sobrescribir archivos de imágenes");
      if (!path.startsWith("media/") && !json.sha) return response(400, "Falta la versión de archivo a editar");
      if (!path.startsWith("media/") && json.content.length > 250000) return response(413, "Catálogo o configuración demasiado grande");
      // Solo se permite modificar valores esperados en config.js, nunca ejecutar contenido arbitrario.
      if (path === "config.js") {
        const decoded = atob(json.content.replace(/\s/g, ""));
        if (!/^\/\* INGEBAM — completar con el WhatsApp Business verificado, formato 569XXXXXXXX\. \*\/\nwindow\.INGEBAM_CONFIG = Object\.freeze\(\{\n  whatsappNumber: "(?:|569\d{8})",\n  analyticsMeasurementId: "",\n  businessName: "INGEBAM"\n\}\);\n$/.test(decoded)) {
          return response(400, "Formato de configuración no permitido");
        }
      }
      if (path === "data/modelos.json") {
        let catalog: unknown;
        try {
          const buf = Uint8Array.from(atob(json.content.replace(/\s/g, "")), c => c.charCodeAt(0));
          catalog = JSON.parse(new TextDecoder().decode(buf));
        } catch { return response(400, "Catálogo no válido"); }
        if (!Array.isArray(catalog) || catalog.length > 120) return response(400, "Exceso de modelos o formato incorrecto");
        for (const m of catalog) {
          if (!m || typeof m !== "object" || !["tiny", "oficina", "banos", "comercial"].includes(m.tipo) ||
              typeof m.nombre !== "string" || m.nombre.length > 110 ||
              typeof m.descripcion !== "string" || m.descripcion.length > 900 ||
              typeof m.imagen !== "string" ||
              !Array.isArray(m.galeria) || m.galeria.length > 12 ||
              !m.galeria.every((x: unknown) => typeof x === "string") ||
              typeof m.panorama !== "string" || typeof m.publicado !== "boolean") {
            return response(400, "Ficha con datos no permitidos");
          }
        }
      }
    }

    const target = GH_API + path.split("/").map(encodeURIComponent).join("/") +
      (req.method === "GET" ? "?ref=main" : "");
    const ghRes = await fetch(target, {
      method: req.method,
      headers: {
        "Authorization": "Bearer " + githubToken,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });
    const result = await ghRes.text();
    return new Response(result, {
      status: ghRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Administración INGEBAM:", err instanceof Error ? err.message : "Error inesperado");
    return response(500, "Error interno del servicio");
  }
});
