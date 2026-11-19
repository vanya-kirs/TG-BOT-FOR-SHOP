const labels={new:'Новые поступления',asc:'Сначала дешевле',desc:'Сначала дороже'};
export function sortView(value='new'){
 return `<details class="sort-menu"><summary aria-label="Сортировка: ${labels[value]}"><span class="sort-caption">Сортировать</span><span>${labels[value]}</span><i class="chevron" aria-hidden="true"></i></summary><div class="sort-options" aria-label="Порядок товаров">${Object.entries(labels).map(([key,label])=>`<button type="button" data-sort="${key}" aria-pressed="${key===value}">${label}<span aria-hidden="true">${key===value?'✓':''}</span></button>`).join('')}</div></details>`;
}
export function bindCatalogControls(root,onSort){
 const sort=root.querySelector('.sort-menu');
 if(sort){
   sort.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>onSort(button.dataset.sort)));
   sort.addEventListener('keydown',event=>{if(event.key==='Escape'){sort.open=false;sort.querySelector('summary').focus();}});
   sort.addEventListener('focusout',event=>{if(!sort.contains(event.relatedTarget))sort.open=false;});
 }
 const details=root.querySelector('.filter-disclosure');
 if(!details)return;
 const summary=details.querySelector('summary');
 let animation=null,wantsOpen=false;
 summary.addEventListener('click',event=>{
   event.preventDefault();
   wantsOpen=animation?!wantsOpen:!details.open;
   const from=details.getBoundingClientRect().height;
   animation?.cancel();
   details.open=true;
   details.classList.toggle('is-expanded',wantsOpen);
   const closed=summary.getBoundingClientRect().height+2;
   const to=wantsOpen?details.getBoundingClientRect().height:closed;
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){details.open=wantsOpen;return;}
   details.style.overflow='hidden';
   animation=details.animate([{height:from+'px'},{height:to+'px'}],{duration:340,easing:'cubic-bezier(.22,1,.36,1)'});
   animation.onfinish=()=>{details.open=wantsOpen;details.style.overflow='';animation=null;};
 });
}
document.addEventListener('click',event=>{document.querySelectorAll('.sort-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
