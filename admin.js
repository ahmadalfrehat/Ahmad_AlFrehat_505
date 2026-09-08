const SUPABASE_URL = "https://dxzprpbpneeosimpnobz.supabase.co";
const SUPABASE_KEY = "sb_publishable_y_XCOzunbj26QVgJuG8DmQ_K7OABDrp";
const ADMIN_EMAIL = "ahmadalfrehat505@gmail.com";

const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const authMessage = document.getElementById('authMessage');
const dashboardMessage = document.getElementById('dashboardMessage');
const body = document.getElementById('bookingsBody');

let accessToken = sessionStorage.getItem('admin_access_token') || '';
let currentUser = null;

function message(el, text, ok=false){
  el.style.display='block';
  el.textContent=text;
  el.style.background=ok?'rgba(72,200,130,.12)':'rgba(230,80,80,.12)';
  el.style.color=ok?'#b9f1d1':'#ffc0c0';
}

function headers(extra={}){
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + (accessToken || SUPABASE_KEY),
    'Content-Type': 'application/json',
    ...extra
  };
}

async function api(path, options={}){
  const res = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: headers(options.headers || {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if(!res.ok){
    const err = new Error(data?.msg || data?.message || data?.error_description || data?.error || text || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function showAuth(){
  authSection.style.display='block';
  dashboardSection.style.display='none';
}

function showDashboard(){
  authSection.style.display='none';
  dashboardSection.style.display='block';
}

async function loadBookings(){
  try {
    const data = await api('/rest/v1/bookings?select=*&order=booking_date.asc,booking_time.asc');
    body.innerHTML='';
    if(!Array.isArray(data) || !data.length){
      body.innerHTML='<tr><td colspan="7" class="empty">لا توجد حجوزات حالياً.</td></tr>';
      return;
    }
    data.forEach(b=>{
      const tr=document.createElement('tr');
      const status=b.status || 'pending';
      tr.innerHTML=`<td>${esc(b.name)}</td><td>${esc(b.phone)}</td><td>${esc(b.email)}</td><td>${esc(b.booking_date)}</td><td>${esc(b.booking_time)}</td><td><span class="badge ${status}">${label(status)}</span></td><td><div class="actions">${status!=='approved'?`<button class="admin-button" data-id="${esc(b.id)}" data-status="approved">موافقة</button>`:''}${status!=='cancelled'?`<button class="admin-button danger" data-id="${esc(b.id)}" data-status="cancelled">إلغاء</button>`:''}</div></td>`;
      body.appendChild(tr);
    });
  } catch(error){
    if(error.status===401 || error.status===403){
      accessToken=''; sessionStorage.removeItem('admin_access_token'); currentUser=null; showAuth();
      message(authMessage,'انتهت جلسة الدخول أو لا تملك صلاحية الإدارة. سجّل الدخول مرة أخرى.');
    } else {
      message(dashboardMessage,'تم تسجيل الدخول، لكن تعذر تحميل الحجوزات: '+error.message);
    }
  }
}

function label(s){return s==='approved'?'مقبول':s==='cancelled'?'ملغى':'قيد الانتظار';}
function esc(t){const d=document.createElement('div');d.textContent=t??'';return d.innerHTML;}

body.addEventListener('click', async e=>{
  const btn=e.target.closest('button[data-id]');
  if(!btn) return;
  btn.disabled=true;
  try{
    await api('/rest/v1/bookings?id=eq.'+encodeURIComponent(btn.dataset.id), {
      method:'PATCH',
      headers:{'Prefer':'return=minimal'},
      body:JSON.stringify({status:btn.dataset.status})
    });
    message(dashboardMessage,'تم تحديث حالة الحجز بنجاح.',true);
    await loadBookings();
  }catch(error){
    message(dashboardMessage,'تعذر تحديث الحجز: '+error.message);
    btn.disabled=false;
  }
});

document.getElementById('loginBtn').onclick=async()=>{
  const btn=document.getElementById('loginBtn');
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  authMessage.style.display='none';
  if(!email || !password){ message(authMessage,'أدخل البريد الإلكتروني وكلمة المرور.'); return; }
  btn.disabled=true; btn.textContent='جاري الدخول...';
  try{
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok){
      const raw=(data.error_description || data.msg || data.message || data.error || '').toString().toLowerCase();
      if(raw.includes('invalid login credentials')) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      if(raw.includes('email not confirmed')) throw new Error('يجب تأكيد البريد الإلكتروني أولاً من Supabase.');
      throw new Error(data.error_description || data.msg || data.message || 'فشل تسجيل الدخول.');
    }
    if(!data.access_token || !data.user) throw new Error('تم تسجيل الدخول لكن لم تصل جلسة الدخول من Supabase.');
    currentUser=data.user;
    if((currentUser.email||'').toLowerCase() !== ADMIN_EMAIL.toLowerCase()){
      accessToken=''; currentUser=null;
      throw new Error('هذا الحساب ليس حساب الإدارة المسموح له بالدخول.');
    }
    accessToken=data.access_token;
    sessionStorage.setItem('admin_access_token',accessToken);
    showDashboard();
    message(dashboardMessage,'تم تسجيل الدخول بنجاح.',true);
    await loadBookings();
  }catch(error){
    message(authMessage,error.message || 'تعذر تسجيل الدخول.');
  }finally{
    btn.disabled=false; btn.textContent='دخول';
  }
};

document.getElementById('signupBtn').onclick=async()=>{
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  if(!email || !password){message(authMessage,'أدخل البريد الإلكتروني وكلمة المرور.');return;}
  if(password.length<6){message(authMessage,'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');return;}
  try{
    const res=await fetch(SUPABASE_URL+'/auth/v1/signup',{
      method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.msg||data.message||data.error_description||'تعذر إنشاء الحساب.');
    message(authMessage,'تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً، أكّد البريد ثم سجّل الدخول.',true);
  }catch(error){message(authMessage,error.message);}
};

document.getElementById('logoutBtn').onclick=()=>{
  accessToken=''; currentUser=null; sessionStorage.removeItem('admin_access_token'); showAuth();
};

if(accessToken){
  showDashboard();
  loadBookings();
}else{
  showAuth();
}
