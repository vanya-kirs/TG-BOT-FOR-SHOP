const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
let birthdayOutside;
const pad=n=>String(n).padStart(2,'0');
export function daysInMonth(year,month){return month?new Date(Number(year)||2000,Number(month),0).getDate():31;}
export function birthdayValue(year,month,day){
 if(!year||!month||!day||Number(day)>daysInMonth(year,month))return '';
 return `${year}-${pad(month)}-${pad(day)}`;
}
export function birthdayField(value=''){
 const parts=/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').map(Number):[];
 const [year,month,day]=parts;
 const current=new Date().getFullYear();
 const options=(values,selected)=>values.map(([v,label])=>`<option value="${v}" ${v===selected?'selected':''}>${label}</option>`).join('');
 return `<fieldset class="birthday-field" data-birthday><legend>Дата рождения <span>необязательно</span></legend><div class="birthday-parts"><label><span>День</span><select data-birthday-part="day" aria-label="День рождения"><option value="">День</option>${options(Array.from({length:daysInMonth(year,month)},(_,i)=>[i+1,pad(i+1)]),day)}</select></label><label><span>Месяц</span><select data-birthday-part="month" aria-label="Месяц рождения"><option value="">Месяц</option>${options(months.map((name,i)=>[i+1,name]),month)}</select></label><div class="birthday-year"><span class="birthday-part-caption">Год</span><select class="birthday-year-proxy" tabindex="-1" data-birthday-part="year" aria-label="Год рождения"><option value="">Год</option>${options(Array.from({length:current-1899},(_,i)=>[current-i,current-i]),year)}</select><details class="birthday-year-menu"><summary aria-label="Выбрать год рождения"><span data-year-value>${year||'Год'}</span><i class="chevron" aria-hidden="true"></i></summary><div class="birthday-year-popup"><button type="button" data-year-step="-1" aria-label="Прокрутить годы вверх">⌃</button><div class="birthday-year-list" aria-label="Годы рождения">${Array.from({length:current-1899},(_,i)=>`<button type="button" data-year="${current-i}" aria-pressed="${current-i===year}">${current-i}</button>`).join('')}</div><button type="button" data-year-step="1" aria-label="Прокрутить годы вниз">⌄</button></div></details></div></div><input type="hidden" name="birthday" value="${birthdayValue(year,month,day)}"><div class="birthday-footer"><span>Ваш особенный день</span><button type="button" data-birthday-clear>Очистить</button></div><p class="birthday-hint" role="status" aria-live="polite"></p></fieldset>`;
}
export function bindBirthday(root){
 birthdayOutside?.abort();birthdayOutside=new AbortController();
 document.addEventListener('click',event=>{root.querySelectorAll('.birthday-year-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});},{signal:birthdayOutside.signal});
 root.querySelectorAll('[data-birthday]').forEach(field=>{
 const part=name=>field.querySelector(`[data-birthday-part="${name}"]`);
 const day=part('day'),month=part('month'),year=part('year'),hidden=field.querySelector('[name=birthday]'),hint=field.querySelector('.birthday-hint');
 const menu=field.querySelector('.birthday-year-menu'),list=field.querySelector('.birthday-year-list'),summary=menu.querySelector('summary');
 const reveal=button=>{if(button.offsetTop<list.scrollTop)list.scrollTop=button.offsetTop;else if(button.offsetTop+button.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=button.offsetTop+button.offsetHeight-list.clientHeight;};
 menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open){const selected=list.querySelector(`[data-year="${year.value}"]`)||list.querySelector('[data-year]');list.scrollTop=Math.max(0,selected.offsetTop-4*28);}});
 list.querySelectorAll('[data-year]').forEach(button=>button.addEventListener('click',()=>{year.value=button.dataset.year;sync();menu.open=false;summary.focus({preventScroll:true});}));
 field.querySelectorAll('[data-year-step]').forEach(button=>button.addEventListener('click',()=>{list.scrollBy({top:Number(button.dataset.yearStep)*280,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
 menu.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();menu.open=false;summary.focus({preventScroll:true});return;}
   if(!['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(event.key))return;
   event.preventDefault();menu.open=true;
   const buttons=[...list.querySelectorAll('[data-year]')],current=buttons.indexOf(document.activeElement);
   let next=current<0?Math.max(0,buttons.findIndex(b=>b.dataset.year===year.value)):current;
   if(current>=0)next+=({ArrowDown:1,ArrowUp:-1,PageDown:10,PageUp:-10}[event.key]||0);
   if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
   const target=buttons[Math.max(0,Math.min(buttons.length-1,next))];target.focus({preventScroll:true});reveal(target);
 });
 // Safari may blur summary with relatedTarget=null before a year button receives click.
 // A real outside click is handled above; do not hide its target before selection.
 menu.addEventListener('focusout',event=>{if(event.relatedTarget&&!menu.contains(event.relatedTarget))menu.open=false;});
 year.addEventListener('invalid',event=>{event.preventDefault();hint.textContent=year.validationMessage;summary.focus({preventScroll:true});menu.open=true;});
 function sync(){
   const previous=day.value,max=daysInMonth(year.value,month.value);
   day.innerHTML='<option value="">День</option>'+Array.from({length:max},(_,i)=>`<option value="${i+1}">${pad(i+1)}</option>`).join('');
   day.value=Number(previous)<=max?previous:'';
   const any=!!(day.value||month.value||year.value);
   for(const input of [day,month,year]){input.required=any;input.setCustomValidity('');}
   const value=birthdayValue(year.value,month.value,day.value);
   const now=new Date(),today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
   const future=value&&value>today;
   year.setCustomValidity(future?'Дата рождения не может быть в будущем.':'');
   hidden.value=future?'':value;
   hint.textContent=future?'Выберите дату, которая уже наступила.':previous&&!day.value?'В этом месяце нет выбранного дня. Выберите другой.':any&&!value?'Выберите день, месяц и год.':'';
   field.querySelector('[data-birthday-clear]').hidden=!any;
   for(const input of [day,month,year])input.parentElement.classList.toggle('is-filled',!!input.value);
   field.querySelector('[data-year-value]').textContent=year.value||'Год';
   list.querySelectorAll('[data-year]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.year===year.value)));
 }
 for(const input of [day,month,year])input.addEventListener('change',sync);
 field.querySelector('[data-birthday-clear]').addEventListener('click',()=>{day.value=month.value=year.value='';menu.open=false;sync();day.focus();});
 sync();
 });
}
