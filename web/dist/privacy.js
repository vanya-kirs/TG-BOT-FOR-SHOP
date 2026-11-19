const noticeKey='vera-cookie-notice-v1';
let dismissed=false;
export function mountCookieNotice(){
 if(document.getElementById('cookie-notice')||dismissed)return;
 try{if(localStorage.getItem(noticeKey)==='seen')return;}catch{}
 const notice=document.createElement('aside');
 notice.id='cookie-notice';notice.className='cookie-notice';notice.setAttribute('aria-label','Cookie и данные браузера');
 notice.innerHTML='<div><strong>Cookie для работы сайта</strong><p>Используем служебные cookie для входа в аккаунт и хранилище браузера для работы интерфейса. <a href="#/cookies">Подробнее</a></p></div><button type="button" class="btn">Понятно</button>';
 document.body.append(notice);
 const reserveSpace=()=>document.body.style.setProperty('--cookie-notice-height',`${notice.getBoundingClientRect().height}px`);
 const observer=new ResizeObserver(reserveSpace);observer.observe(notice);reserveSpace();
 notice.querySelector('button').addEventListener('click',()=>{
  dismissed=true;
  try{localStorage.setItem(noticeKey,'seen');}catch{}
  observer.disconnect();notice.remove();document.body.style.removeProperty('--cookie-notice-height');
 });
}
export function cookieInformation(){return `<section class="wrap cookie-information"><div class="page-head"><p class="eyebrow">VERA PRIVÉ</p><h1>Cookie и данные браузера</h1></div>
<h2>Для чего они нужны</h2><p>Служебные cookie помогают сохранять вход в аккаунт и обеспечивать работу авторизации. Сеанс рассчитан на 7 дней и может обновляться при активности. При удалении cookie может потребоваться повторный вход.</p>
<h2>Что ещё сохраняется в браузере</h2><p>Для состояния интерфейса, подтверждения почты и приглашений используются localStorage и sessionStorage. Это отдельные технологии хранения, а не cookie. Данные localStorage сохраняются до удаления сайтом, вами или браузером. Временное хранилище sessionStorage обычно очищается после завершения сеанса вкладки; поведение зависит от восстановления вкладок браузером.</p>
<h2>Аналитика и реклама</h2><p>В этой версии сайта не подключены рекламные пиксели и сторонние счётчики посещений. Если такие инструменты появятся, мы обновим описание и предусмотрим необходимый выбор пользователя.</p>
<h2>Как управлять данными</h2><p>Вы можете удалить данные сайта или ограничить cookie в настройках браузера. Это может повлиять на вход и сохранённые действия. Очистка браузера не удаляет аккаунт и историю заказов на сервере.</p><p>Кнопка «Понятно» только закрывает уведомление. Мы сохраняем отметку об ознакомлении в этом браузере, чтобы не показывать его повторно. Она не является согласием на рекламу или любую обработку персональных данных.</p>
<p>Вопросы о данных: <a href="mailto:info@shop.example.com">info@shop.example.com</a>. Оператор — ИП Примерова Мария Ивановна, ИНН 000000000000, ОГРНИП 000000000000000.</p><a class="text-link" href="#/">Вернуться в магазин</a></section>`;}
