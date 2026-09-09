/* AVJ QR Studio · JavaScript sin framework. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const config = window.QR_CONFIG || {};
let db, user = null, rows = [], filter = 'all', editing = null, selected = null;
let toastTimer, loadVersion = 0;
let registering = false;
let authBusy = false;
const isRedirect = new URLSearchParams(location.search).has('q');
function message(error) {
 const m = error?.message || String(error);
 if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
 if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de entrar. Revisa también la carpeta de spam.';
 if (/signup_disabled|signups not allowed|signup is disabled/i.test(m + (error?.code || ''))) return 'El registro no está disponible en este momento. Contacta al administrador.';
 if (/user_already_exists|already registered/i.test(m + (error?.code || ''))) return 'Ya existe una cuenta con este correo. Pulsa Iniciar sesión.';
 if (/weak_password|password.*(least|short|weak)/i.test(m + (error?.code || ''))) return 'La contraseña no cumple los requisitos. Usa una más larga y combina letras, números y símbolos.';
 if (/over_.*rate_limit|rate limit|too many requests/i.test(m + (error?.code || ''))) return 'Se hicieron demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
 if (/email_address_not_authorized|sending confirmation email/i.test(m + (error?.code || ''))) return 'No se pudo enviar el correo de confirmación. Contacta al administrador para revisar el servicio de correo.';
 if (error?.code === '23502') return 'No se pudo crear el QR. El administrador debe completar la actualización de la aplicación.';
 if (/fetch|network|timeout/i.test(m)) return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
 if (/schema cache|does not exist|PGRST202|PGRST205/i.test(m + (error?.code || ''))) return 'Falta preparar la base de datos. Ejecuta sql/02_crear.sql en Supabase y actualiza esta página.';
 if (/row-level security|permission denied/i.test(m)) return 'Tu cuenta no tiene permiso para esta acción. Revisa la sesión y los permisos del SQL.';
 if (/invalid api key|invalid.*key/i.test(m)) return 'Revisa la URL y la clave pública en config.js.';
 return m;
}
function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function validURL(value) {
 const u = new URL(value.trim());
 if (!['http:', 'https:'].includes(u.protocol) || !u.hostname || u.username || u.password) throw new Error('Usa un enlace completo http:// o https://, sin credenciales.');
 if (u.href.length > 2048) throw new Error('El enlace es demasiado largo (máximo 2048 caracteres).');
 return u.href;
}
function qrFor(text) { const q = window.qrcode(0, 'M'); q.addData(text, 'Byte'); q.make(); return q; }
function qrSVG(text) { return qrFor(text).createSvgTag({cellSize: 6, margin:24, scalable:true}); }
function putQR(el, value) { el.innerHTML = qrSVG(value); const svg=el.querySelector('svg'); svg.setAttribute('role','img'); svg.setAttribute('aria-label','Código QR'); }
function download(blob, name) { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000); }
function fileName() { return (selected.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60) || 'codigo')+'-qr'; }
async function pngDownload() {
 if(!selected) return;
 try { const q=qrFor(selected.public_url), n=q.getModuleCount(), scale=Math.max(8,Math.ceil(1200/(n+8))), size=(n+8)*scale;
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=size; const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size); ctx.fillStyle='#000';
 for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(q.isDark(y,x)) ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);
 const name=fileName()+'.png'; canvas.toBlob(blob=>{if(blob) download(blob,name);else toast('No se pudo crear la imagen.');},'image/png');
 } catch(e) {toast(message(e));}
}
function createButton(text, cls, handler) {const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',handler);return b;}
function render() {
 $('stat-total').textContent=rows.length; $('nav-count').textContent=rows.length;
 $('stat-active').textContent=rows.filter(r=>r.is_active).length; $('stat-paused').textContent=rows.filter(r=>!r.is_active).length;
 const term=$('search').value.trim().toLocaleLowerCase('es');
 const visible=rows.filter(r=>(filter==='all'||(filter==='active'?r.is_active:!r.is_active)) && [r.name,r.destination,r.note||''].some(v=>v.toLocaleLowerCase('es').includes(term)));
 $('qr-grid').replaceChildren();
 visible.forEach(r=>{
 const card=document.createElement('article');card.className='qr-card';
 // Solo estructura fija; todos los datos de usuario se insertan con textContent.
 card.innerHTML='<div class="card-top"><span class="card-type">ENLACE DINÁMICO</span><span class="badge"></span></div><div class="card-visual"></div><h3></h3><a class="destination" target="_blank" rel="noopener noreferrer"></a><p class="card-note"></p><span class="card-date"></span><div class="card-actions"></div>';
 const badge=card.querySelector('.badge'); badge.textContent=r.is_active?'Activo':'En pausa';badge.classList.toggle('paused',!r.is_active);
 putQR(card.querySelector('.card-visual'),r.public_url);card.querySelector('h3').textContent=r.name;
 const link=card.querySelector('.destination');link.textContent=r.destination;link.href=validURL(r.destination);link.title=r.destination;
 card.querySelector('.card-note').textContent=r.note||'';card.querySelector('.card-note').hidden=!r.note;
 card.querySelector('.card-date').textContent='Creado el '+new Intl.DateTimeFormat('es-EC',{day:'numeric',month:'short',year:'numeric'}).format(new Date(r.created_at));
 card.querySelector('.card-actions').append(createButton('Editar','secondary',()=>openEditor(r)),createButton('↓ QR','secondary',()=>openDetail(r)),createButton(r.is_active?'Pausar':'Activar','secondary',ev=>toggle(r,ev.currentTarget)));
 $('qr-grid').append(card);
 });
 $('empty-state').hidden=visible.length>0;
 $('empty-state').querySelector('h2').textContent=rows.length?'No encontramos códigos':'Tu próximo destino empieza aquí';
 $('empty-state').querySelector('p').textContent=rows.length?'Prueba con otra búsqueda o cambia el filtro.':'Crea tu primer QR y conecta a tus clientes con lo que quieras compartir.';
 $('empty-create').hidden=rows.length>0;
}
async function loadRows() {
 if(!user) return; const version=++loadVersion; $('connection').textContent='Actualizando…';$('refresh').disabled=true;
 $('list-message').hidden=true; $('empty-state').hidden=true;
 try {let all=[];let page=0;const batch=500;
 while(true){const {data,error}=await db.from('qr_links').select('*').order('created_at',{ascending:false}).order('id').range(page*batch,(page+1)*batch-1);if(error)throw error;all.push(...data);if(data.length<batch)break;page++;}
 if(version!==loadVersion||!user)return;rows=all;render();$('connection').textContent='Conectado';
 }catch(e){if(version!==loadVersion)return;$('list-message').textContent=message(e);$('list-message').hidden=false;$('connection').textContent='Sin conexión';}
 finally{if(version===loadVersion)$('refresh').disabled=false;}
}
function openEditor(row=null) {
 editing=row;$('qr-form').reset();$('editor-title').textContent=row?'Editar código QR':'Crear código QR';$('save-qr').textContent=row?'Guardar cambios':'Crear QR';
 $('qr-name').value=row?.name||'';$('qr-destination').value=row?.destination||'';$('qr-note').value=row?.note||'';$('qr-active').checked=row?.is_active??true;$('editor-error').textContent='';$('editor').showModal();
}
function openDetail(row){selected=row;$('detail-title').textContent=row.name;putQR($('detail-qr'),row.public_url);$('permanent-link').value=row.public_url;$('detail').showModal();}
async function toggle(row, button){button.disabled=true;try{const{data,error}=await db.from('qr_links').update({is_active:!row.is_active}).eq('id',row.id).select().single();if(error)throw error;rows=rows.map(r=>r.id===row.id?data:r);render();toast(data.is_active?'Código activado.':'Código en pausa. Puedes reactivarlo cuando quieras.');}catch(e){toast(message(e));button.disabled=false;}}
async function redirect(){
 $('redirect-screen').hidden=false;$('redirect-title').textContent='Abriendo tu enlace…';$('redirect-message').textContent='Un momento, estamos consultando el destino actual.';$('retry-redirect').hidden=true;document.querySelector('.spinner').hidden=false;
 try{const token=new URLSearchParams(location.search).get('q');if(!/^[a-f0-9]{32}$/.test(token||''))throw new Error('Este código QR no es válido.');
 // Función pública de lectura: solo devuelve el destino de un código activo.
 const{data,error}=await db.rpc('resolve_qr',{p_token:token});if(error)throw error;
 if(!data){$('redirect-title').textContent='Este código no está disponible';$('redirect-message').textContent='Puede estar en pausa o haber sido retirado. Contacta a quien te lo compartió.';return;}
 const dest=validURL(data);if(dest===location.href)throw new Error('El destino apunta a este mismo QR. Pide al administrador que lo corrija.');location.replace(dest);
 }catch(e){$('redirect-title').textContent='No pudimos abrir el enlace';$('redirect-message').textContent=message(e);$('retry-redirect').hidden=false;}
 finally{document.querySelector('.spinner').hidden=true;}
}
function authMessage(text, success=false) {
 $('auth-message').textContent=text; $('auth-message').classList.toggle('success',success);
}
function setAuthBusy(busy, label='Entrando a tu panel…') {
 authBusy=busy;
 $('auth-loading').hidden=!busy; $('loading-title').textContent=label;
 for(const id of ['auth-screen','dashboard']) {$(id).inert=busy;$(id).setAttribute('aria-busy',String(busy));}
 for(const button of document.querySelectorAll('#login-form button, #signup-form button, #switch-auth'))button.disabled=busy;
}
async function checkInstantSignup() {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try {
  const response=await fetch(config.SUPABASE_URL+'/auth/v1/settings', {
   headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY},cache:'no-store',signal:controller.signal
  });
  if(!response.ok)throw new Error('No pudimos comprobar la disponibilidad del registro. Inténtalo de nuevo.');
  const settings=await response.json();
  if(settings.disable_signup)throw new Error('El registro no está disponible en este momento. Contacta al administrador.');
  if(settings.mailer_autoconfirm!==true)throw new Error('El registro inmediato todavía no está habilitado. Contacta al administrador.');
 } catch(error) {
  if(error.name==='AbortError')throw new Error('La conexión está tardando demasiado. Inténtalo de nuevo.');
  throw error;
 } finally {clearTimeout(timer);}
}
function setAuthMode(signup) {
 registering=signup; $('login-form').hidden=signup; $('signup-form').hidden=!signup;
 $('auth-title').innerHTML=signup?'Crea tu cuenta<span class="purple">.</span>':'Bienvenido a<br>QR Studio<span class="purple">.</span>';
 $('auth-subtitle').textContent=signup?'Regístrate y empieza a crear tus códigos QR.':'Inicia sesión para administrar tus códigos.';
 $('auth-switch-label').textContent=signup?'¿Ya tienes una cuenta?':'¿No tienes una cuenta?';
 $('switch-auth').textContent=signup?'Iniciar sesión':'Regístrate';
 $('password').value=''; $('signup-password').value=''; $('signup-confirm').value='';authMessage('');
 $(signup?'signup-email':'email').focus();
}
async function showSession(session){
 const nextUser=session?.user||null;
 if(user?.id!==nextUser?.id){rows=[];$('qr-grid').replaceChildren();for(const id of ['stat-total','stat-active','stat-paused','nav-count'])$(id).textContent='—';}
 user=nextUser;$('auth-screen').hidden=!!user;$('dashboard').hidden=!user;
 if(user){$('account-email').textContent=user.email||'';$('avatar').textContent=(user.email||'A')[0].toUpperCase();await loadRows();}
 else{loadVersion++;rows=[];for(const d of document.querySelectorAll('dialog[open]'))d.close();}
}
async function init(){
 if(!window.supabase||!window.qrcode){const el=isRedirect?$('redirect-screen'):$('auth-screen');el.hidden=false;const text='No se pudieron cargar las dependencias. Revisa tu conexión y recarga la página.';if(isRedirect){$('redirect-title').textContent='No se pudo iniciar';$('redirect-message').textContent=text;}else{$('auth-message').textContent=text;for(const button of document.querySelectorAll('#login-form button, #signup-form button, #switch-auth'))button.disabled=true;}return;}
 db=window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:!isRedirect,autoRefreshToken:!isRedirect,detectSessionInUrl:!isRedirect},global:{fetch:(url,options)=>fetch(url,{...options,cache:'no-store'})}});
 if(isRedirect){$('retry-redirect').onclick=redirect;await redirect();return;}
 putQR($('brand-qr'),'AVJ QR Studio');$('auth-screen').hidden=false;
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
 $('switch-auth').onclick=()=>{if(!authBusy)setAuthMode(!registering);};
 $('login-form').addEventListener('submit', async e => {
  e.preventDefault(); if(authBusy) return; setAuthBusy(true); authMessage('');
  try {
   const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
   if(error)throw error; $('password').value=''; await showSession(data.session);
  } catch(err) {authMessage(message(err));} finally {setAuthBusy(false);}
 });
 $('signup-form').addEventListener('submit', async e => {
  e.preventDefault(); if(authBusy) return; authMessage('');
  const email=$('signup-email').value.trim(), password=$('signup-password').value;
  if(password.length<8){authMessage('La contraseña debe tener al menos 8 caracteres.');return;}
  if(password!==$('signup-confirm').value){authMessage('Las contraseñas no coinciden.');$('signup-confirm').focus();return;}
  setAuthBusy(true,'Creando tu cuenta…');
  try {
   await checkInstantSignup();
   const {data,error}=await db.auth.signUp({email,password});
   if(error)throw error;
   $('signup-password').value=''; $('signup-confirm').value=''; $('email').value=email;
   let session=data.session;
   if(!session){
    const login=await db.auth.signInWithPassword({email,password});
    if(login.error)throw login.error;
    session=login.data.session;
   }
   if(!session)throw new Error('No pudimos iniciar la sesión. Intenta entrar con tu correo y contraseña.');
   $('loading-title').textContent='Entrando a tu panel…';
   await showSession(session);toast('Tu cuenta está lista. Bienvenido a QR Studio.');
  } catch(err) {authMessage(message(err));} finally {setAuthBusy(false);}
 });
 $('logout').onclick=async()=>{const{error}=await db.auth.signOut({scope:'local'});if(error)toast(message(error));else {setAuthMode(false);await showSession(null);}};
 $('new-qr').onclick=()=>openEditor();$('empty-create').onclick=()=>openEditor();$('refresh').onclick=loadRows;
 $('nav-all').onclick=()=>{$('search').value='';document.querySelector('[data-filter="all"]').click();};
 $('search').addEventListener('input',render);document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});render();});
 $('qr-form').onsubmit=async e=>{e.preventDefault();$('save-qr').disabled=true;$('editor-error').textContent='';try{
 const name=$('qr-name').value.trim();if(!name)throw new Error('Escribe un nombre para tu código.');
 const destination=validURL($('qr-destination').value);const payload={name,destination,note:$('qr-note').value.trim(),is_active:$('qr-active').checked};
 if(editing&&destination===editing.public_url)throw new Error('El destino no puede ser el enlace del propio QR.');
 let result;
 if(editing){result=await db.from('qr_links').update(payload).eq('id',editing.id).select().single();}
 // La identidad y la URL permanente las asigna Supabase, no el navegador.
 else{result=await db.from('qr_links').insert({...payload,owner_id:user.id}).select().single();}
 if(result.error)throw result.error;const created=!editing;rows=created?[result.data,...rows]:rows.map(r=>r.id===result.data.id?result.data:r);render();$('editor').close();toast(created?'Tu código QR está listo.':'Destino actualizado. Tu QR sigue siendo el mismo.');if(created)openDetail(result.data);
 }catch(err){$('editor-error').textContent=message(err);}finally{$('save-qr').disabled=false;}};
 $('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText($('permanent-link').value);toast('Enlace copiado.');}catch{$('permanent-link').select();toast('Seleccionamos el enlace para que puedas copiarlo.');}};
 $('download-svg').onclick=()=>{if(selected)download(new Blob([qrSVG(selected.public_url)],{type:'image/svg+xml'}),fileName()+'.svg');};$('download-png').onclick=pngDownload;
 // No hacemos consultas Supabase dentro del callback: evitamos bloquear Auth.
 db.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>{
   if(authBusy || (event==='SIGNED_IN'&&user?.id===session?.user?.id))return;
   showSession(session).catch(error=>authMessage(message(error)));
  },0);
 });
 const callbackError=new URLSearchParams(location.hash.slice(1)).get('error_description');
 setAuthBusy(true,'Preparando tu espacio…');
 try {
  const{data,error}=await db.auth.getSession();if(error)throw error;
  await showSession(data.session);
  if(callbackError&&!data?.session)authMessage('Este enlace de acceso no es válido. Inicia sesión con tu correo y contraseña.');
 } catch(error){authMessage(message(error));} finally{setAuthBusy(false);}
}
init().catch(e=>{if(isRedirect){$('redirect-screen').hidden=false;$('redirect-title').textContent='No se pudo iniciar';$('redirect-message').textContent=message(e);}else{$('auth-screen').hidden=false;$('auth-message').textContent=message(e);}});
})();
