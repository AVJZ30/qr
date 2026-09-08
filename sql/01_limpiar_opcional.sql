-- AVJ QR Studio: LIMPIEZA OPCIONAL Y DESTRUCTIVA.
-- Solo elimina objetos de esta aplicación. No borra otras tablas, Auth ni Storage.
-- NO es necesario ejecutarlo en la primera instalación.
-- Ejecutarlo rompe TODOS los QR de esta app ya emitidos. Haz una copia antes.
-- No utilices DROP SCHEMA public CASCADE en un proyecto que tenga otros datos.
BEGIN;
DROP FUNCTION IF EXISTS public.resolve_qr(text);
DROP TABLE IF EXISTS public.qr_links;
DROP FUNCTION IF EXISTS public.qr_links_protect_identity();
COMMIT;
