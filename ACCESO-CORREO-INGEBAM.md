# INGEBAM — acceso con correo y contraseña (preparado, NO activado)

El panel de INGEBAM funcionará con **Supabase Auth** y un backend independiente. Las credenciales GitHub **NO se envían al navegador**. La base de datos no se usa para almacenar modelos, fotografías ni clientes: el catálogo sigue en GitHub Pages.

## Estado actual
- `admin.html`: panel anterior con token GitHub, mantenido hasta completar migración.
- `admin-email.html`: formulario de correo y contraseña, **NO funcional aún** por falta de proyecto dedicado.
- `admin-auth-config.js`: URL y clave **pública** de Supabase, vacías por defecto.
- `admin-email.js`: inicia sesión, actualiza JWT en memoria y usa un backend.
- `supabase/functions/ingebam-admin/index.ts`: Edge Function que verifica la identidad del usuario y comprueba su UUID en la lista de administradores antes de acceder a GitHub. Solo permite acceder a `data/modelos.json`, `config.js` y crear imágenes en `media/`.

## Pasos de activación — completar por el propietario

1. Crear un **proyecto Supabase nuevo para INGEBAM** bajo una organización autorizada. No reutilizar `TIMELESS` ni su clave, usuarios ni almacenamiento. Revisar cualquier costo antes de aceptarlo.
2. En el nuevo proyecto, habilitar Auth > Email y configurar la confirmación de correo. Deshabilitar registros públicos una vez creada la cuenta administradora, o utilizar invitaciones administradas.
3. Crear/invitar al usuario administrador mediante Supabase Auth (correo real del propietario; **no guardar contraseñas en GitHub**).
4. En la función Edge, guardar estos secretos en **Edge Functions > Secrets**:
   - `INGEBAM_GITHUB_TOKEN`: token fine-grained con `Contents: Read and write` únicamente en `man-nuel-b/construccion`. El token jamás se agrega a archivos públicos.
   - `INGEBAM_ADMIN_USER_IDS`: identificadores UUID del/de los usuarios de Supabase Auth autorizados, separados por coma. Los correos **por sí solos** no autorizan.
5. Desplegar la Edge Function `ingebam-admin` desde `supabase/functions/ingebam-admin/index.ts`, configurando `verify_jwt=false` de acuerdo con `supabase/config.toml`. El backend verifica el JWT y la lista de UUIDs antes de autorizar. Se debe publicar **solo** en el proyecto INGEBAM.
6. Completar `admin-auth-config.js` con `url` del nuevo proyecto y su **publishable key** (`sb_publishable_...`). Esa clave sí puede ser pública; nunca utilizar `service_role` ni `sb_secret_` en el navegador.
7. Probar en `admin-email.html` el inicio de sesión, contraseña incorrecta, usuario sin autorización, alta/edición/borrado de modelos, carga de imágenes pequeñas, WhatsApp, cierre de sesión y conflicto de ediciones. Confirmar cambios en el sitio público tras la publicación en GitHub Pages.
8. Solo después de pasar pruebas reales, cambiar `admin.html` para usar el acceso por correo y contraseña y retirar el acceso GitHub por token.

## Recomendaciones de seguridad
- Habilitar MFA en Supabase Auth para los administradores y exigirlo en el backend antes de pasar a producción. La versión preparada requiere cuenta autorizada y correo confirmado, pero **aún no hace cumplir MFA**.
- No reutilizar los secretos o datos de TIMELESS.
- El JWT de acceso y el refresh token se guardan solo en memoria: cerrar/recargar la página obliga a iniciar sesión.
- GitHub Pages es público. `noindex` no garantiza privacidad. La protección de operaciones administrativas siempre se hace en la Edge Function.
- Las imágenes que sube el panel quedan públicas en el repositorio; no subir documentos privados.
- Usar fotografías JPG/WebP comprimidas. Las cargas grandes podrían exceder los límites de la función y el repositorio; probarlas antes de producción.
