# AVJ QR Studio

Panel de QR dinámicos en HTML, CSS y JavaScript, conectado a tu proyecto Supabase.

## Qué incluye

- Acceso con correo y contraseña mediante Supabase Auth.
- Crear varios QR, con nombre, destino y nota independiente.
- Editar destinos sin cambiar el código ni su dirección permanente.
- Pausar y reactivar. No hay eliminación desde el panel para evitar romper impresiones por accidente.
- Buscar y filtrar códigos; resumen de activos y pausados.
- Descargar PNG de al menos 1200 píxeles, con módulos enteros, o SVG vectorial.
- Redirección pública sin iniciar sesión: `https://TU-DOMINIO/?q=TOKEN`.
- Diseño responsive morado y blanco; QR negro sobre blanco para facilitar su lectura.
- Dependencias JavaScript incluidas en `vendor/`; no necesitas Node ni compilar.

## Archivos

| Archivo | Uso |
|---|---|
| `index.html` | Pantalla de acceso, panel, formularios y redirección |
| `styles.css` | Diseño y adaptación al celular |
| `config.js` | URL y clave pública de Supabase, dominio público de los QR |
| `app.js` | Inicio de sesión, gestión, redirección y descarga |
| `vendor/` | Bibliotecas de Supabase y generación QR con sus licencias |
| `sql/01_limpiar_opcional.sql` | Limpieza destructiva SOLO de los objetos QR de esta aplicación |
| `sql/02_crear.sql` | Tabla, permisos, políticas, trigger y función de redirección |

## 1. Preparar Supabase

La URL y la clave publishable que proporcionaste ya están en `config.js`.

1. Abre tu proyecto en el panel de Supabase y entra al SQL Editor.
2. Para la primera instalación, pega TODO `sql/02_crear.sql` y ejecuta Run.
3. Verifica que terminó correctamente. Se crea `public.qr_links`.

NO hace falta limpiar la base para instalar la aplicación. El archivo `01_limpiar_opcional.sql` es únicamente para reiniciar ESTA aplicación si ya la instalaste. Borra todos sus QR y hace que los códigos emitidos dejen de funcionar; no se recuperan ejecutando de nuevo el script de creación. Conserva una copia de la base si necesitas restaurarlos. No toca otras tablas, cuentas de Auth ni archivos de Storage. Si tiene dependencias adicionales no previstas, se detiene en vez de usar CASCADE.

No ejecuté ninguno de los scripts en tu base de datos.

## 2. Crear tu usuario administrador

En Supabase, entra a **Authentication → Users → Add user → Create new user** y crea una cuenta con tu correo y una contraseña propia. Si el formulario ofrece **Auto Confirm User**, actívalo para una cuenta que tú controlas. Luego entra al panel con esa cuenta.

La web no incluye registro abierto. Si el proyecto se dedica solo a este panel, deshabilita nuevos registros públicos en la configuración de Auth. Si el proyecto es compartido con otra app, revisa cómo afecta esto antes de cambiarlo.

Cada cuenta autenticada gestiona únicamente sus propios códigos. Una cuenta nueva no recibe acceso a los códigos de otra. Si borras un usuario de Supabase, sus QR también se eliminan por la relación con Auth.

## 3. Publicar los archivos

Descomprime el ZIP y sube `index.html`, `styles.css`, `config.js`, `app.js` y la carpeta `vendor` a un hosting estático con HTTPS. Conserva sus nombres y rutas. No es necesario subir `sql/` ni esta guía. La página no necesita reglas especiales para rutas `/q/`: usa el parámetro `?q=` sobre el propio index.

Abre la web desde el hosting; no mediante doble clic como `file://`. Para desarrollo local puedes usar un servidor local, pero el QR de un cliente debe apuntar a un dominio público accesible desde su teléfono.

La versión privada de ChatGPT permite revisar la aplicación, pero no sustituye el hosting público para tus clientes: los visitantes no deben necesitar acceso a tu cuenta de ChatGPT.

## 4. Fijar la dirección permanente

Antes de crear el primer QR, coloca la URL pública definitiva en `config.js`:

```js
PUBLIC_BASE_URL: 'https://qr.tumarca.com/'
```

Usa el dominio real donde estén estos archivos, no la URL del proyecto Supabase. Si instalas en una subcarpeta, incluye la ruta completa, por ejemplo `https://tumarca.com/qr/`.

También puedes guardar esa dirección en **Configuración** dentro del panel. Este ajuste se guarda solo en ese navegador y tiene prioridad sobre `config.js`. Para usar el mismo dominio en varios equipos, configura `config.js` y guarda el mismo valor en los navegadores que tengan un ajuste anterior.

La aplicación te pedirá esta dirección antes de crear códigos. No adivina tu dominio ni genera QR de demostración como si fueran reales.

## 5. Crear y administrar

1. Inicia sesión.
2. Pulsa **Crear código QR**.
3. Escribe nombre y enlace de destino completo: `https://...`.
4. Guarda y descarga PNG o SVG.
5. Escanea desde otro dispositivo SIN iniciar sesión y comprueba el destino.
6. Edita ese destino desde el panel y vuelve a escanear la misma imagen: abrirá el nuevo enlace.
7. Pausa el código si necesitas detenerlo; vuelve a activarlo para recuperarlo.

La función pública devuelve únicamente el destino de un código activo. Si no existe o está pausado, muestra un aviso. El visitante necesita conexión a Internet. Un QR que abre contenido reservado no protege por sí mismo el destino: el sitio de destino debe aplicar su propio acceso.

No cambies el dominio ni retires estos archivos después de imprimir. El enlace permanente completo se guarda en cada registro y NO se reescribe al editar el destino o cambiar la configuración. Cambiar la dirección de la web afecta solo a los códigos nuevos. Mantén el dominio anterior disponible para los antiguos.

## Datos y permisos

`qr_links` guarda `id`, `owner_id`, `token`, `name`, `destination`, `public_url`, `note`, `is_active`, `created_at` y `updated_at`. No almacena imágenes: el QR se genera a partir de la URL permanente. No requiere buckets de Storage. No guarda IP, ubicación ni estadísticas de escaneos.

Los permisos limitan las lecturas y escrituras al propietario, y prohíben modificar la identidad del QR. La función `resolve_qr` permite consultar un destino por token sin exponer la lista completa ni las notas. No uses una clave `service_role` o secreta en el navegador; la clave publishable está pensada para el cliente y debe acompañarse de permisos correctos.

Referencias oficiales: [RLS y permisos](https://supabase.com/docs/guides/database/postgres/row-level-security), [inicio de sesión](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [funciones de base de datos](https://supabase.com/docs/guides/database/functions).

## Si algo falla

- **Falta preparar la base de datos:** ejecuta `02_crear.sql` completo y actualiza el panel.
- **Correo o contraseña incorrectos:** revisa que la cuenta exista en el proyecto indicado y usa su contraseña de Auth (no la de tu cuenta del panel Supabase).
- **No conecta:** revisa conexión, configuración y que el proyecto Supabase esté activo.
- **El QR pide acceso a ChatGPT:** su dominio no es público. Antes de imprimir, hospeda los archivos en tu dominio y crea los códigos con esa dirección.
- **El QR abre una página inexistente:** comprueba que su `public_url` carga `index.html` y que se conserva `?q=...`.
- **El enlace no está disponible:** comprueba que el QR siga activo y que el registro y su propietario existan.

Las fuentes web son opcionales; si Google Fonts no carga, se usan las fuentes de respaldo. Las dos bibliotecas JavaScript se entregan localmente y deben subirse junto a los demás archivos.

## Validación realizada

Se comprobaron la sintaxis JavaScript y las rutas de los archivos. Se probaron creación, edición, pausa, rechazo de enlaces no permitidos y redirección mediante pruebas de DOM con respuestas simuladas. El SQL se ejecutó en PostgreSQL local (PGlite), comprobando aislamiento entre usuarios, lectura pública limitada, identidad inmutable, pausa y limpieza limitada a esta aplicación. No se ejecutó SQL ni se crearon cuentas en tu proyecto; la verificación completa con tu sesión y dominio debe hacerse después de instalarlo. No se realizó prueba visual en navegador.
