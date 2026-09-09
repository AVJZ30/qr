/* Generador local: no crea cuentas ni consulta la base de datos. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 let current = null, generation = 0;
 const submit = $('guest-form').querySelector('button[type="submit"]');
 function busy(value) { $('guest-loading').hidden = !value; submit.disabled = value; $('guest-form').setAttribute('aria-busy', String(value)); submit.textContent = value ? 'Generando…' : 'Generar código QR'; }
 function save(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
 }
 function reset() { generation++; busy(false); current = null; $('guest-result').hidden = true; $('guest-qr').replaceChildren(); $('guest-error').textContent = ''; $('guest-status').textContent = ''; }
 $('guest-link').addEventListener('input', reset);
 $('guest-form').addEventListener('submit', async event => {
  event.preventDefault(); if (submit.disabled) return; reset();
  const attempt = generation;
  try {
   const url = new URL($('guest-link').value.trim());
   if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.href.length > 2048) throw new Error('Usa un enlace http:// o https:// válido, sin usuario ni contraseña.');
   if (!window.qrcode) throw new Error('No se pudo cargar el generador. Recarga la página e inténtalo de nuevo.');
   busy(true);
   await new Promise(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420));
   if (attempt !== generation) return;
   const qr = window.qrcode(0, 'M'); qr.addData(url.href, 'Byte'); qr.make();
   const svg = qr.createSvgTag({cellSize: 6, margin: 24, scalable: true});
   $('guest-qr').innerHTML = svg;
   $('guest-qr').querySelector('svg').setAttribute('aria-label', 'Código QR de tu enlace');
   $('guest-qr').querySelector('svg').setAttribute('role', 'img');
   current = {qr, svg}; $('guest-destination').textContent = url.href;
   $('guest-result').hidden = false; $('guest-status').textContent = 'Tu QR está listo para descargar.';
  } catch (error) { $('guest-error').textContent = error instanceof TypeError ? 'Escribe un enlace completo, por ejemplo https://tupagina.com.' : error.message; } finally { if (attempt === generation) busy(false); }
 });
 $('guest-svg').onclick = () => { if (current) save(new Blob([current.svg], {type: 'image/svg+xml'}), 'avj-qr.svg'); };
 $('guest-png').onclick = () => {
  if (!current) return;
  try {
   const qr = current.qr, n = qr.getModuleCount(), scale = Math.max(8, Math.ceil(1600 / (n + 8))), size = (n + 8) * scale;
   const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
   const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#000';
   for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale);
   canvas.toBlob(blob => { if (blob) save(blob, 'avj-qr.png'); else $('guest-error').textContent = 'No se pudo generar la imagen. Inténtalo de nuevo.'; }, 'image/png');
  } catch { $('guest-error').textContent = 'No se pudo generar la imagen. Inténtalo de nuevo.'; }
 };
})();
