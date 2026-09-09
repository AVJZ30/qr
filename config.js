// La clave publishable es pública. La protección real está en Auth y RLS.
// Nunca coloques una clave service_role o secreta en el navegador.
window.QR_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://ktmolgqoktuulvdwuoum.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_7Iak8ieWaPh6GC0rXL2PRQ_LI-PSeqp',
  // Dirección común: el panel no permite cambiarla.
  // Supabase fija también esta dirección mediante sql/03_actualizar.sql.
  PUBLIC_BASE_URL: 'https://qravj.netlify.app/'
});
