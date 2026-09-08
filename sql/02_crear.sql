-- AVJ QR Studio · ejecutar completo en Supabase > SQL Editor.
-- Primera instalación: no necesita el script de limpieza.
-- La tabla es nueva; si ya existe, la transacción se detiene sin borrarla.
BEGIN;
CREATE TABLE public.qr_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (token ~ '^[a-f0-9]{32}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  destination text NOT NULL CHECK (length(destination) <= 2048 AND destination ~* '^https?://[^[:space:]]+$'),
  public_url text NOT NULL UNIQUE CHECK (length(public_url) <= 2048 AND public_url ~ '^https://[^[:space:]]+$' AND right(public_url,35) = '?q=' || token),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 240),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_no_self_redirect CHECK (destination <> public_url)
);
CREATE INDEX qr_links_owner_created_idx ON public.qr_links(owner_id, created_at DESC);
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.qr_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.qr_links TO authenticated;
GRANT INSERT (owner_id,token,name,destination,public_url,note,is_active) ON public.qr_links TO authenticated;
GRANT UPDATE (name,destination,note,is_active) ON public.qr_links TO authenticated;
-- Sin permiso DELETE: pausar permite recuperar el QR sin perder su identidad.
CREATE POLICY qr_select_own ON public.qr_links FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = owner_id);
CREATE POLICY qr_insert_own ON public.qr_links FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY qr_update_own ON public.qr_links FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE FUNCTION public.qr_links_protect_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.token IS DISTINCT FROM OLD.token OR NEW.public_url IS DISTINCT FROM OLD.public_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'La identidad y la dirección permanente de un QR no se pueden cambiar';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.qr_links_protect_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER qr_links_identity BEFORE UPDATE ON public.qr_links
FOR EACH ROW EXECUTE FUNCTION public.qr_links_protect_identity();

-- Lectura pública mínima. No permite listar códigos ni ver propietarios/notas.
-- El token aleatorio del QR permite obtener su destino; no es un enlace privado.
CREATE FUNCTION public.resolve_qr(p_token text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT destination FROM public.qr_links
  WHERE token = p_token AND is_active = true
    AND p_token ~ '^[a-f0-9]{32}$'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_qr(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_qr(text) TO anon, authenticated;
COMMENT ON TABLE public.qr_links IS 'QR dinámicos de AVJ: destino editable e identidad permanente';
NOTIFY pgrst, 'reload schema';
COMMIT;
