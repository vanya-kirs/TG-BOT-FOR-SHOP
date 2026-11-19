import {consentCheckbox,consentFields} from './legal-content.js?v=legal-1';
export const identity={ready:false,server:false,email:false,providers:{},user:null};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function loadIdentity(){
  try{
    const response=await fetch('/api/shop-auth',{cache:'no-store'});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json')){identity.server=['shop.example.com','www.shop.example.com'].includes(location.hostname);return;}
    Object.assign(identity,await response.json());
    const me=await fetch('/api/me',{cache:'no-store'});
    identity.user=me.ok?(await me.json()).user:null;
  }catch{identity.server=location.hostname==='shop.example.com'||location.hostname==='www.shop.example.com';}finally{identity.ready=true;}
}
export function accountStorage(){
  const suffix=identity.server?(identity.user?.id||'guest'):'preview';
  return {getItem:key=>localStorage.getItem(suffix==='preview'?key:`${key}:${suffix}`),setItem:(key,value)=>localStorage.setItem(suffix==='preview'?key:`${key}:${suffix}`,value)};
}
const errorText=code=>({CONSENT_REQUIRED:'Подтвердите отдельное согласие на обработку данных.',INVALID_BIRTHDAY:'Укажите корректную дату рождения.',SESSION_NOT_FRESH:'Войдите в аккаунт заново, чтобы выполнить это действие.',UNAUTHORIZED:'Войдите в аккаунт заново.',INVALID_OTP:'Неверный код. Попробуйте ещё раз.',OTP_EXPIRED:'Код истёк. Запросите новый.',TOO_MANY_ATTEMPTS:'Слишком много попыток. Запросите новый код.',INVALID_EMAIL_OR_PASSWORD:'Неверный email или пароль.',EMAIL_NOT_VERIFIED:'Подтвердите email: письмо отправлено на вашу почту.',PASSWORD_TOO_SHORT:'Пароль должен содержать минимум 8 символов.',PASSWORD_TOO_LONG:'Пароль не должен превышать 128 символов.',INVALID_TOKEN:'Ссылка недействительна или устарела. Запросите новую.',USER_ALREADY_EXISTS:'Не удалось зарегистрироваться. Попробуйте войти или восстановить пароль.',INVALID_PASSWORD:'Текущий пароль неверен.',TOO_MANY_REQUESTS:'Слишком много попыток. Подождите минуту.'}[code]||'Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз.');
async function request(path,body){
  const response=await fetch('/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=Error(response.status===429?errorText('TOO_MANY_REQUESTS'):errorText(data.code));error.code=data.code;error.retryAfter=Number(response.headers.get('Retry-After')||60);throw error;}
  return data;
}
let otpTimer,resetTimer,emailTimer;
let passwordResetComplete=false;
function oauthFailure(){
 const params=new URLSearchParams(location.search),code=params.getAll('error').filter(x=>x!=='oauth').at(-1)||params.get('error');
 if(!code)return '';
 return ({account_not_linked:'Сначала подтвердите почту существующего аккаунта: войдите по email и паролю и введите код из письма. После этого вход через Google или Яндекс будет работать автоматически.',email_does_not_match:'Выберите Google-аккаунт с той же почтой, что указана в профиле магазина.',account_already_linked_to_different_user:'Этот Google-аккаунт уже подключён к другому аккаунту магазина.',access_denied:'Подключение отменено. Вы можете попробовать снова.',state_mismatch:'Попытка входа устарела. Начните заново.',unable_to_link_account:'Не удалось подключить Google. Войдите в магазин заново и повторите.'})[code]||'Войти не удалось. Попробуйте снова.';
}
const pending=()=>{try{return JSON.parse(sessionStorage.getItem('vera-verification')||'{}');}catch{return {};}};
const savePending=data=>sessionStorage.setItem('vera-verification',JSON.stringify(data));
async function sendCode(email){
  email=email.trim().toLowerCase();
  try{await request('email-otp/send-verification-otp',{email,type:'email-verification'});savePending({email,nextAt:Date.now()+60000,expiresAt:Date.now()+300000});}
  catch(e){if(e.code==='OTP_RESEND_TOO_SOON'){savePending({...pending(),email,nextAt:Date.now()+e.retryAfter*1000});}else throw e;}
}
export function authView(mode='login'){
  if(mode==='email')return `<section class="auth-page wrap"><div class="auth-card"><p class="eyebrow">VERA PRIVÉ</p><h1>Изменить почту</h1><p class="small muted">Пришлём код на новый адрес. До подтверждения ваша текущая почта останется прежней. Код действует 5 минут.</p><form id="email-change-form"><label>Новая почта<input name="newEmail" type="email" autocomplete="email" required></label><button type="button" class="btn light wide" data-email-code>Получить код</button><label>Код из письма<input name="otp" class="otp-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><p class="form-error" role="alert"></p><p class="auth-feedback" role="status"></p><button class="btn wide">Подтвердить новую почту</button></form><div class="auth-links"><a href="#/account/profile">Вернуться в профиль</a></div></div></section>`;
  if(mode==='verify')return `<section class="auth-page wrap"><div class="auth-card"><p class="eyebrow">VERA PRIVÉ</p><h1>Проверьте почту</h1><p class="small muted">Введите шестизначный код из письма для ${escape(pending().email||'вашего email')}. Код действует 5 минут.</p><form id="auth-form" data-mode="verify"><label>Код подтверждения<input class="otp-input" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required autofocus></label><p class="form-error" role="alert"></p><p class="auth-feedback" role="status"></p><button class="btn wide">Подтвердить почту</button></form><button class="btn light wide" data-resend-code>Отправить код повторно</button><p class="small muted" data-code-expiry role="status"></p><div class="auth-links"><a href="#/auth/login">Другой email / вернуться ко входу</a></div></div></section>`;

  const register=mode==='register',forgot=mode==='forgot',reset=mode==='reset',change=mode==='change';
  const title=register?'Добро пожаловать':forgot?'Забыли пароль?':reset?'Новый пароль':change?'Изменить пароль':'С возвращением';
  const canSubmit=identity.server&&(identity.email||change);
  const authError=new URLSearchParams(location.search).has('error')||location.hash.includes('error=');
  return `<section class="auth-page wrap"><div class="auth-card"><p class="eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО VERA PRIVÉ</p><h1>${title}</h1><p class="small muted">${register?'Создайте аккаунт для ваших покупок.':forgot?'Пришлём ссылку для восстановления на вашу почту.':'Ваши любимые вещи — ближе.'}</p>${!identity.server?'<div class="notice">Регистрация появится после подключения сервера магазина. В этом предпросмотре аккаунты не создаются.</div>':!identity.email?'<div class="notice">Вход по email станет доступен после подключения почты магазина.</div>':''}${mode==='login'&&new URLSearchParams(location.search).has('invited')?'<div class="notice" role="status">Приглашение принято. Войдите заново — откроется кабинет поставщика.</div>':''}${mode==='login'&&passwordResetComplete?'<div class="notice" role="status">Пароль успешно изменён. Войдите с новым паролем.</div>':''}${authError?'<p class="form-error" role="alert">'+escape(oauthFailure())+'</p>':''}<form id="auth-form" data-mode="${escape(mode)}">${register?'<label>Имя<input name="name" autocomplete="name" maxlength="80" required></label>':''}${!reset&&!change?'<label>Email<input name="email" type="email" autocomplete="email" maxlength="150" required></label>':''}${change?'<label>Текущий пароль<input name="currentPassword" type="password" autocomplete="current-password" required></label>':''}${!forgot?`<label>${reset||change?'Новый пароль':'Пароль'}<input name="password" type="password" minlength="${register||reset||change?8:1}" maxlength="128" autocomplete="${register||reset||change?'new-password':'current-password'}" required></label>${register||reset||change?'<p class="small muted">Не менее 8 символов.</p><label>Повторите пароль<input name="passwordConfirmation" type="password" autocomplete="new-password" maxlength="128" aria-describedby="auth-error" required></label>':''}`:''}${register?consentCheckbox():''}<p id="auth-error" class="form-error" role="alert"></p><p class="auth-feedback" role="status"></p><button class="btn wide" ${canSubmit?'':'disabled'}>${register?'Создать аккаунт':forgot?'Отправить ссылку':reset||change?'Сохранить пароль':'Войти'}</button></form>${!forgot&&!reset&&!change?`<div class="auth-or">или продолжить через</div>${!register?consentCheckbox('social-data-consent'):''}<div class="auth-providers">${[['yandex','Яндекс'],['google','Google']].map(([id,name])=>`<button class="btn light" data-provider="${id}" ${identity.providers[id]?'':'disabled'}>${name}${identity.providers[id]?'':' · скоро'}</button>`).join('')}</div>`:''}<div class="auth-links">${register?'<a href="#/auth/login">Уже есть аккаунт? Войти</a>':!forgot&&!reset&&!change?'<a href="#/auth/register">Создать аккаунт</a><a href="#/auth/forgot">Забыли пароль?</a>':'<a href="#/auth/login">Вернуться ко входу</a>'}</div></div></section>`;
}
export function authGate(section){
  if(section==='auth')return null;
  if(section==='account'&&!identity.user)return authView();
  if(identity.server&&['admin','supplier'].includes(section)){
    if(!identity.user)return authView();
    if(identity.user.role!==section)return '<div class="wrap"><div class="empty"><h1>Нет доступа</h1><p>Этот кабинет доступен только сотруднику магазина с соответствующими правами.</p><a class="btn" href="#/account">Мой аккаунт</a></div></div>';
  }
  return null;
}
export function sessionView(){return identity.user?`<div class="session-strip"><span>Вы вошли как ${escape(identity.user.name)}</span><a href="#/auth/change">Изменить пароль</a><a href="#/auth/email">Изменить почту</a><button data-auth-logout>Выйти</button><p class="form-error" data-link-error role="alert">${escape(oauthFailure())}</p></div>`:'';}
export async function saveAuthProfile(values){
  if(!identity.user)return;
  const name=String(values.name||'').trim();
  if(!name||name.length>80)throw Error('Укажите имя длиной до 80 символов.');
  await request('update-user',{name});
  identity.user.name=name;
}
export function bindIdentity(){
  clearInterval(emailTimer);
  const emailForm=document.querySelector('#email-change-form');
  if(emailForm){
    const send=emailForm.querySelector('[data-email-code]'),field=emailForm.querySelector('[name=newEmail]'),error=emailForm.querySelector('.form-error'),feedback=emailForm.querySelector('.auth-feedback');
    const key='vera-email-change:'+identity.user?.id;let sending=false;
    const tick=()=>{const left=Math.max(0,Math.ceil((Number(sessionStorage.getItem(key)||0)-Date.now())/1000));send.disabled=sending||left>0||!identity.user||!identity.email;send.textContent=left?`Повторно через ${left} с`:'Получить код';};tick();emailTimer=setInterval(tick,1000);
    send.addEventListener('click',async()=>{if(!field.reportValidity())return;sending=true;tick();error.textContent='';try{await request('email-otp/request-email-change',{newEmail:field.value.trim().toLowerCase()});sessionStorage.setItem(key,String(Date.now()+60000));feedback.textContent='Если адрес доступен для смены, на него отправлен код. Введите его ниже.';}catch(e){if(e.code==='OTP_RESEND_TOO_SOON')sessionStorage.setItem(key,String(Date.now()+e.retryAfter*1000));error.textContent=e.message;}finally{sending=false;tick();}});
    emailForm.addEventListener('submit',async event=>{event.preventDefault();event.stopImmediatePropagation();if(emailForm.dataset.busy)return;emailForm.dataset.busy='1';error.textContent='';try{await request('email-otp/change-email',{newEmail:field.value.trim().toLowerCase(),otp:emailForm.querySelector('[name=otp]').value});location.replace('/#/account/profile');location.reload();}catch(e){error.textContent=e.message;}finally{delete emailForm.dataset.busy;}});
  }
  clearInterval(otpTimer);clearInterval(resetTimer);
  const resetForm=document.querySelector('#auth-form[data-mode="forgot"]');
  const resetKey=email=>'vera-reset:'+email.trim().toLowerCase();
  const tickReset=()=>{
    if(!resetForm)return;
    const email=resetForm.querySelector('[name=email]').value;
    const left=Math.max(0,Math.ceil((Number(sessionStorage.getItem(resetKey(email))||0)-Date.now())/1000));
    const button=resetForm.querySelector('button');
    button.disabled=resetForm.dataset.busy==='true'||left>0||!identity.email||!identity.server;
    button.textContent=left?`Отправить повторно через ${left} с`:'Отправить ссылку';
  };
  if(resetForm){resetForm.querySelector('[name=email]').addEventListener('input',tickReset);tickReset();resetTimer=setInterval(tickReset,1000);}

  const resend=document.querySelector('[data-resend-code]');
  if(resend){
    const tick=()=>{const data=pending(),seconds=Math.max(0,Math.ceil(((data.nextAt||0)-Date.now())/1000));resend.disabled=seconds>0;resend.textContent=seconds?`Отправить повторно через ${seconds} с`:'Отправить код повторно';const expiry=document.querySelector('[data-code-expiry]');if(expiry)expiry.textContent=data.expiresAt&&Date.now()>=data.expiresAt?'Код истёк. Запросите новый.':'';};
    tick();otpTimer=setInterval(tick,1000);
    resend.addEventListener('click',async()=>{resend.disabled=true;try{await sendCode(pending().email||'');document.querySelector('.auth-feedback').textContent='Если аккаунт существует, код отправлен. Проверьте также папку «Спам».';}catch(e){document.querySelector('.form-error').textContent=e.message;}finally{tick();}});
  }

  const emailField=document.querySelector('#profile-form input[name=email]');
  if(emailField&&identity.user){emailField.readOnly=true;emailField.title='Для изменения подтвердите новый адрес.';emailField.insertAdjacentHTML('afterend','<a href="#/auth/email" class="small">Изменить почту</a>');}
  document.querySelector('#auth-form')?.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.currentTarget,button=form.querySelector('button'),error=form.querySelector('.form-error'),feedback=form.querySelector('.auth-feedback');
    if(form.dataset.busy==='true'||(form.dataset.mode==='forgot'&&button.disabled))return;
    form.dataset.busy='true';
    error.textContent='';feedback.textContent='';button.disabled=true;
    try{
      const values=Object.fromEntries(new FormData(form)),mode=form.dataset.mode;
      if(['register','reset','change'].includes(mode)&&(!values.passwordConfirmation||values.password!==values.passwordConfirmation)){
        const confirmation=form.querySelector('[name=passwordConfirmation]');
        confirmation?.setAttribute('aria-invalid','true');confirmation?.focus();
        throw Error('Пароли не совпадают. Повторите пароль ещё раз.');
      }
      form.querySelector('[name=passwordConfirmation]')?.removeAttribute('aria-invalid');
      if(mode==='register'){
        if(values.personalDataConsent!=='on')throw Error('Подтвердите отдельное согласие на обработку данных.');
        await request('sign-up/email',{...consentFields(),name:values.name,email:values.email,password:values.password,callbackURL:location.origin+'/#/welcome'});
        await sendCode(values.email);location.hash='/auth/verify';
      }else if(mode==='verify'){
        await request('email-otp/verify-email',{email:pending().email,otp:values.otp});sessionStorage.removeItem('vera-verification');location.replace('/?signed-in='+Date.now()+'#/welcome');
      }else if(mode==='forgot'){
        await request('request-password-reset',{email:values.email,redirectTo:location.origin+'/?auth=reset'});
        sessionStorage.setItem(resetKey(values.email),String(Date.now()+60000));
        feedback.textContent='Если аккаунт с такой почтой существует, вы получите письмо со ссылкой.';
      }else if(mode==='reset'){
        const token=new URLSearchParams(location.search).get('token');
        if(!token)throw Error('Ссылка восстановления недействительна. Запросите новую.');
        await request('reset-password',{token,newPassword:values.password});
        passwordResetComplete=true;
        form.reset();
        history.replaceState(null,'','/#/auth/login');
        window.dispatchEvent(new Event('hashchange'));
      }else if(mode==='change'){
        await request('change-password',{currentPassword:values.currentPassword,newPassword:values.password,revokeOtherSessions:true});
        form.reset();feedback.textContent='Пароль изменён. Другие сеансы завершены.';
      }else{
        try{await request('sign-in/email',{email:values.email,password:values.password});}catch(e){if(e.code==='EMAIL_NOT_VERIFIED'){await sendCode(values.email);location.hash='/auth/verify';return;}throw e;}
        location.replace('/?signed-in='+Date.now()+'#/welcome');
      }
    }catch(e){error.textContent=e.message||'Проверьте соединение и попробуйте снова.';}finally{form.dataset.busy='false';button.disabled=false;tickReset();}
  });
  document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',async()=>{
    button.disabled=true;
    try{if(!document.querySelector('[name=personalDataConsent]')?.checked)throw Error('Подтвердите отдельное согласие перед входом через сервис.');const data=await request('sign-in/social',{...consentFields(),provider:button.dataset.provider,callbackURL:location.origin+'/#/welcome',errorCallbackURL:location.origin+'/#/auth/login'});if(!data.url)throw Error('Вход временно недоступен.');location.assign(data.url);}catch(e){document.querySelector('#auth-form .form-error').textContent=e.message;button.disabled=false;}
  }));
  document.querySelector('[data-auth-logout]')?.addEventListener('click',async()=>{try{await request('sign-out',{});location.replace('/#/auth/login');location.reload();}catch{alert('Не удалось выйти. Проверьте соединение и повторите.');}});
}

export async function verifyCurrentEmail(){if(!identity.user?.email)throw Error('Войдите в аккаунт.');await sendCode(identity.user.email);location.hash='/auth/verify';}
