import {categoryFields} from './product-fields.js?v=auth-layout-1';
import {findBrand,matchesBrand,normalizeBrand} from './brands.js?v=partners-3';
import {brandPicker} from './brand-ui.js?v=partners-3';
import {categoryMatches,categoryOptions,canonicalCategory} from './categories.js?v=partners-3';
import {money} from './store.js?v=partners-3';

export const socials = [
  {name:'Telegram-канал',note:'Новости и новые коллекции',url:'https://t.me/example_shop'},
  {name:'Telegram-бот',note:'Покупки в привычном формате',url:'https://t.me/example_shop'},
  {name:'WhatsApp',note:'Связь с консультантом',url:null},
  {name:'Авито',note:'Наш ассортимент на площадке',url:'https://example.com/marketplace'},
  {name:'OSKELLY',note:'Наш бутик на площадке',url:'https://example.com/resale'},
];
const socialIcons=[
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2AABEE"/><path d="m7 15 18-7-4 17-6-5-3 3 1-6 9-7-11 6z" fill="white"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#2AABEE"/><rect x="7" y="10" width="18" height="14" rx="5" fill="white"/><path d="M16 10V6" stroke="white" stroke-width="2"/><circle cx="12" cy="16" r="2" fill="#2AABEE"/><circle cx="20" cy="16" r="2" fill="#2AABEE"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#25D366"/><path d="M8 25l1-5a10 10 0 1 1 4 4z" fill="none" stroke="white" stroke-width="1.6"/><path d="M12 10c-4 3 4 12 8 10l1-3-4-1-1 2-3-4 1-1z" fill="white"/></svg>',
'<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#00aaff"/><circle cx="24" cy="8" r="5" fill="#a169f7"/><circle cx="8" cy="24" r="5" fill="#97cf26"/><circle cx="23" cy="23" r="7" fill="#ff6163"/></svg>',
'<span class="oskelly-mark" aria-hidden="true">O</span>'
];
export function socialView(){return `<section class="social-section social-compact" aria-label="Наши площадки"><p class="eyebrow">НА СВЯЗИ И НА ЛЮБИМЫХ ПЛОЩАДКАХ</p><div class="social-grid">${socials.map((s,i)=>{const content=`<span class="social-avatar">${socialIcons[i]}</span><span class="social-copy"><strong>${s.name}</strong><small>${s.url?s.note:'Скоро появится'}</small></span>`;return s.url?`<a class="social-card" href="${s.url}" target="_blank" rel="noopener noreferrer">${content}</a>`:`<div class="social-card social-unavailable" aria-disabled="true">${content}</div>`;}).join('')}</div></section>`;}


export function priceMarkup(p){return `${p.originalPrice>p.price?`<del>${money(p.originalPrice)}</del> `:''}<span>${money(p.price)}</span>${p.originalPrice>p.price?` <small class="discount-tag">−${Math.round((1-p.price/p.originalPrice)*100)}%</small>`:''}`;}
export function setDiscount(state,id,percent,supplier=null){
  const p=state.products.find(p=>p.id===id);
  if(!p || (supplier&&p.supplier!==supplier))throw Error('Товар недоступен в этом кабинете.');
  if(!Number.isInteger(percent)||percent<0||percent>90)throw Error('Скидка должна быть целым числом от 0 до 90%.');
  const base=p.originalPrice||p.price;
  if(percent===0){p.price=base;delete p.originalPrice;delete p.discount;}
  else{p.originalPrice=base;p.price=Math.round(base*(100-percent)/100);p.discount=percent;}
}
export function filterProducts(products,filters={}){
  return products.filter(p=>p.stock>0&&p.approval!=='pending'&&p.approval!=='archived'&&!p.archivedAt&&(!filters.category||categoryMatches(p.category,filters.category))
    &&(!filters.audience||p.audience===filters.audience||p.audience==='unisex'&&['women','men'].includes(filters.audience))
    &&(!filters.categories?.length||filters.categories.some(c=>categoryMatches(p.category,c)))
    &&(!filters.search||(normalizeBrand(`${p.name} ${p.category} ${p.color} ${p.brandName||''}`).includes(normalizeBrand(canonicalCategory(filters.search)))||((findBrand(filters.brandCatalog||[],p.brandId))&&matchesBrand(findBrand(filters.brandCatalog||[],p.brandId),filters.search))))
    &&(!filters.newWithTags||p.newWithTags===true)
    &&(filters.condition!=='new'||p.newWithTags===true)
    &&(filters.condition!=='used'||p.newWithTags!==true)
    &&(!filters.brands?.length||filters.brands.includes(p.brandId))
    &&(filters.min===''||filters.min==null||p.price>=Number(filters.min)*100)
    &&(filters.max===''||filters.max==null||p.price<=Number(filters.max)*100)
    &&(!filters.size||p.sizes.includes(filters.size))&&(!filters.sizes?.length||filters.sizes.some(size=>p.sizes.includes(size)))
    &&(!filters.sale||p.originalPrice>p.price));
}
export function filterView(products,f,esc,brands=[]){const sizeOrder=['XXS','XS','S','M','L','XL','XXL','XXXL'];const sizes=[...new Set([...products.filter(p=>p.stock>0&&(!f.category||categoryMatches(p.category,f.category))).flatMap(p=>p.sizes),...(f.sizes||[])])].sort((a,b)=>sizeOrder.includes(a)&&sizeOrder.includes(b)?sizeOrder.indexOf(a)-sizeOrder.indexOf(b):a.localeCompare(b,'ru',{numeric:true}));return `<details class="filter-disclosure"><summary><svg class="filter-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></svg>Фильтры <span>Уточнить выбор</span></summary><form id="catalog-filters" class="catalog-filters"><fieldset class="size-filter"><legend>Размеры</legend><p class="small muted">Можно выбрать несколько</p><div class="size-filter-options">${sizes.map(size=>`<label class="size-filter-option"><input type="checkbox" name="sizes" value="${esc(size)}" ${(f.sizes||[]).includes(size)?'checked':''}><span>${esc(size)}</span></label>`).join('')||'<span class="small muted">В этой категории пока нет доступных размеров.</span>'}</div></fieldset>${brandPicker(brands,f.brands||[],esc)}<input type="hidden" name="category" value="${esc(f.category||'')}"><fieldset><legend>Цена, ₽</legend><div class="price-range"><input name="min" type="number" min="0" max="10000000" step="0.01" value="${esc(f.min||'')}" placeholder="От" aria-label="Цена от"><span>—</span><input name="max" type="number" min="0" max="10000000" step="0.01" value="${esc(f.max||'')}" placeholder="До" aria-label="Цена до"></div></fieldset><label class="check-label"><input name="sale" type="checkbox" ${f.sale?'checked':''}> Только со скидкой</label><button class="btn" type="submit">Применить</button><button class="text-link" type="button" data-action="reset-filters">Сбросить</button><p class="form-error" role="alert"></p></form></details>`;}

export function productImages(p){return p.images?.length?p.images:[p.image];}
export function validateImages(list){
  const photos=[...new Set(list.map(s=>s.trim()).filter(Boolean))];
  if(photos.length<2||photos.length>8)throw Error('Добавьте от 2 до 8 фотографий товара: спереди, сзади и детали.');
  if(photos.some(s=>!/^https:\/\//i.test(s)&&!/^data:image\/(jpeg|png|webp);base64,/.test(s)&&!/^\/assets\/[a-z0-9_-]+\.(png|jpg|webp)(#[a-z]+)?$/i.test(s)))throw Error('Фотографии: только HTTPS-ссылки или загруженные JPEG, PNG, WebP.');
  return photos;
}
export function gallery(p,esc,detail=false){
  const photos=productImages(p);
  return `<div class="gallery ${detail?'detail-gallery':''}"><div class="gallery-track" tabindex="0" role="region" aria-label="Фотографии: ${esc(p.name)}">${photos.map((src,i)=>`<div class="gallery-slide"><img ${src.startsWith('/assets/test-coat.png#')?'class="photo-panel" style="transform:translateX(-'+Math.max(0,['front','back','detail'].indexOf(src.split('#')[1]))*100/3+'%)"':''} src="${esc(src)}" alt="${esc(p.name)}, ${esc(p.photoLabels?.[i]||'фото '+(i+1))}" loading="lazy" draggable="false">${p.photoLabels?.[i]?.startsWith('ИИ-')?'<span class="ai-photo-label">ИИ-визуализация</span>':''}</div>`).join('')}</div>${photos.length>1?`<button class="gallery-arrow prev" data-action="gallery-prev" aria-label="Предыдущее фото">‹</button><button class="gallery-arrow next" data-action="gallery-next" aria-label="Следующее фото">›</button><span class="gallery-count" aria-live="polite">1 / ${photos.length}</span><div class="gallery-dots" aria-hidden="true">${photos.map((_,i)=>'<i class="'+(i===0?'current':'')+'"></i>').join('')}</div>`:''}</div>`;
}
export function bindGalleries(root){
  for(const track of root.querySelectorAll('.gallery-track')){
    let pending=false,drag=null,origin=null;
    const fitFrame=()=>{
      const index=Math.max(0,Math.min(track.children.length-1,Math.round(track.scrollLeft/(track.clientWidth||1))));
      const image=track.children[index]?.querySelector('img');
      if(!image?.naturalWidth||!image.naturalHeight)return;
      if(track.closest('.product-image'))return;
      const frame=track.parentElement;
      const width=image.naturalWidth/(image.classList.contains('photo-panel')?3:1);
      frame.style.aspectRatio=width+' / '+image.naturalHeight;
    };
    track.querySelectorAll('img').forEach(image=>image.addEventListener('load',fitFrame));
    fitFrame();
    track.addEventListener('pointerdown',event=>{origin={x:event.clientX,y:event.clientY};track.dataset.dragged='';});
    track.addEventListener('pointermove',event=>{if(origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>6)track.dataset.dragged='true';});
    track.addEventListener('pointerup',()=>{origin=null;});
    track.addEventListener('scroll',()=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{
        const index=Math.max(0,Math.min(track.children.length-1,Math.round(track.scrollLeft/track.clientWidth)));
        const counter=track.parentElement.querySelector('.gallery-count');
        if(counter)counter.textContent=(index+1)+' / '+track.children.length;
        track.parentElement.querySelectorAll('.gallery-dots i').forEach((dot,i)=>dot.classList.toggle('current',i===index));
        fitFrame();
        pending=false;
      });
    },{passive:true});
    track.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();moveGallery(track,e.key==='ArrowRight'?1:-1);});
    track.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='mouse'||e.button!==0||track.children.length<2)return;
      drag={x:e.clientX,scroll:track.scrollLeft,index:Math.round(track.scrollLeft/track.clientWidth),moved:false};
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove',e=>{
      if(!drag)return;
      const delta=e.clientX-drag.x;
      if(Math.abs(delta)>5){drag.moved=true;track.classList.add('dragging');}
      if(drag.moved){e.preventDefault();track.scrollLeft=drag.scroll-delta;}
    });
    const finish=e=>{
      if(!drag)return;
      const previous=drag;drag=null;
      if(track.hasPointerCapture(e.pointerId))track.releasePointerCapture(e.pointerId);
      track.classList.remove('dragging');
      if(previous.moved){
        const distance=previous.x-e.clientX;
        const destination=Math.abs(distance)>track.clientWidth*.12?previous.index+Math.sign(distance):previous.index;
        track.scrollTo({left:Math.max(0,Math.min(track.children.length-1,destination))*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      }
    };
    track.addEventListener('pointerup',finish);
    track.addEventListener('pointercancel',finish);
  }
}
export function moveGallery(track,direction){const width=track.clientWidth,current=Math.round(track.scrollLeft/width);const target=Math.max(0,Math.min(track.children.length-1,current+direction));track.scrollTo({left:target*width,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}

const monthKey=date=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit'}).formatToParts(new Date(date));return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}`;};
export function monthlySales(state,supplier=null,count=6,now=new Date()){
  const [year,month]=monthKey(now).split('-').map(Number);
  const rows=Array.from({length:count},(_,i)=>{const date=new Date(Date.UTC(year,month-count+i,15));const key=date.toISOString().slice(0,7);return {key,label:date.toLocaleDateString('ru-RU',{timeZone:'UTC',month:'short',year:'2-digit'}),revenue:0,due:0,paid:0};});
  for(const o of state.orders.filter(o=>o.status==='sold')){const row=rows.find(r=>r.key===monthKey(o.confirmedAt||o.date));if(row)for(const item of o.items.filter(i=>!supplier||i.supplier===supplier)){row.revenue+=item.price*item.quantity;row.due+=item.due??item.price*item.quantity-item.commission;}}
  for(const p of state.payouts.filter(p=>!supplier||p.supplier===supplier)){const row=rows.find(r=>r.key===monthKey(p.date));if(row)row.paid+=p.amount;}
  return rows;
}
export function salesChart(state,supplier,count=6){const rows=monthlySales(state,supplier,count),max=Math.max(...rows.flatMap(r=>[r.revenue,r.due,r.paid]),100);const total=rows.reduce((s,r)=>s+r.revenue+r.paid,0);return `<section class="sales-chart"><div class="section-head"><div><p class="eyebrow">ДИНАМИКА В РУБЛЯХ</p><h3>Продажи и выплаты</h3></div><label>Период<select id="chart-period">${[3,6,12].map(n=>`<option value="${n}" ${n===count?'selected':''}>${n} мес.</option>`).join('')}</select></label></div><div class="chart-legend"><span><i class="revenue"></i>Продажи</span><span><i class="due"></i>Начислено поставщику</span><span><i class="paid"></i>Выплачено</span></div>${total?`<div class="chart-scroll"><div class="chart-bars" style="--months:${count}">${rows.map(r=>`<div class="chart-month"><div class="bar-group">${['revenue','due','paid'].map(k=>`<div class="chart-bar ${k}" style="height:${r[k]/max*100}%" title="${r.label}: ${money(r[k])}"><span>${money(r[k])}</span></div>`).join('')}</div><small>${r.label}</small></div>`).join('')}</div></div>`:'<div class="chart-empty">За этот период продаж и выплат пока нет.<br>График появится после подтверждения демо-продажи.</div>'}<details class="chart-table"><summary>Точные значения по месяцам</summary><div class="table-wrap"><table><caption>Продажи, начисления и выплаты в рублях</caption><thead><tr><th>Месяц</th><th>Продажи</th><th>Начислено</th><th>Выплачено</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.label}</td><td>${money(r.revenue)}</td><td>${money(r.due)}</td><td>${money(r.paid)}</td></tr>`).join('')}</tbody></table></div></details><p class="small muted">Данные демо-кабинета · месяцы по Москве. Продажи — по дате подтверждения; для старых заказов — по дате создания. Выплаты — по дате записи.</p></section>`;}
