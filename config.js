// La clave publishable es pública. La protección real está en Auth y RLS.
// Nunca coloques una clave service_role o secreta en el navegador.
window.QR_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://ktmolgqoktuulvdwuoum.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_7Iak8ieWaPh6GC0rXL2PRQ_LI-PSeqp',
  // URL HTTPS pública que sirve index.html. Ej.: https://qr.tumarca.com/
  // No uses una dirección privada de ChatGPT ni la URL de Supabase.
  PUBLIC_BASE_URL: ''
});
