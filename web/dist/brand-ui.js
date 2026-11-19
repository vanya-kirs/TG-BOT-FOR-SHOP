import {brandLetter,matchesBrand,findBrand} from './brands.js?v=partners-3';
const alphabet=['Все','#',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
export function brandPicker(brands,selected,esc){
 return `<fieldset class="brand-picker"><legend>Бренды <span>Можно выбрать несколько</span></legend><label class="brand-search-label"><span class="sr-only">Найти бренд</span><input class="brand-query" type="search" placeholder="Бренд: Chanel, Hermès, Gucci…" autocomplete="off"></label><div class="brand-alphabet" aria-label="Бренды по алфавиту">${alphabet.map(letter=>`<button type="button" data-letter="${letter}" aria-pressed="${letter==='Все'}">${letter}</button>`).join('')}</div><div class="brand-selected"></div><div class="brand-results"></div><p class="brand-count small muted" role="status"></p><div class="brand-values">${selected.map(id=>`<input type="hidden" name="brands" value="${esc(id)}">`).join('')}</div></fieldset>`;
}
export function bindBrandPicker(root,brands,esc){
 const picker=root.querySelector('.brand-picker');if(!picker)return;
 const selected=new Set([...picker.querySelectorAll('[name=brands]')].map(e=>e.value));
 let letter='Все';const input=picker.querySelector('.brand-query');
 const draw=()=>{
  const matches=brands.filter(b=>matchesBrand(b,input.value)&&(letter==='Все'||brandLetter(b)===letter));
  picker.querySelector('.brand-results').innerHTML=matches.length?matches.map(b=>`<label><input type="checkbox" data-brand-id="${esc(b.id)}" ${selected.has(b.id)?'checked':''}><span>${esc(b.name)}</span></label>`).join(''):'<p class="small muted">Бренд не найден. Попробуйте другое написание.</p>';
  picker.querySelector('.brand-count').textContent=`Найдено: ${matches.length} · выбрано: ${selected.size}`;
  picker.querySelector('.brand-selected').innerHTML=[...selected].map(id=>{const b=findBrand(brands,id);return b?`<button type="button" data-remove-brand="${esc(id)}" aria-label="Убрать ${esc(b.name)}">${esc(b.name)} <span aria-hidden="true">×</span></button>`:'';}).join('');
  picker.querySelector('.brand-values').innerHTML=[...selected].map(id=>`<input type="hidden" name="brands" value="${esc(id)}">`).join('');
 };
 input.addEventListener('input',draw);
 picker.addEventListener('click',event=>{const letterButton=event.target.closest('[data-letter]'),remove=event.target.closest('[data-remove-brand]');if(letterButton){letter=letterButton.dataset.letter;picker.querySelectorAll('[data-letter]').forEach(b=>b.setAttribute('aria-pressed',b===letterButton));draw();}if(remove){selected.delete(remove.dataset.removeBrand);draw();}});
 picker.addEventListener('change',event=>{if(event.target.matches('[data-brand-id]')){if(event.target.checked)selected.add(event.target.dataset.brandId);else selected.delete(event.target.dataset.brandId);draw();}});
 draw();
}
export function productBrandInput(brands,id,esc){return `<label>Бренд<input name="brand" list="product-brands" required autocomplete="off" placeholder="Начните вводить название" value="${esc(findBrand(brands,id)?.name||'')}"><datalist id="product-brands">${brands.flatMap(b=>[b.name,...b.aliases].map(name=>`<option value="${esc(name)}" label="${esc(b.name)}"></option>`)).join('')}</datalist></label>`;}
export function brandAdminView(brands,esc){return `<div class="section-head"><div><p class="eyebrow">ЕДИНЫЙ СПРАВОЧНИК · ${brands.length} БРЕНДОВ</p><h1>Бренды</h1></div><button class="btn" data-action="new-brand">+ Добавить бренд</button></div><label>Поиск по названию<input id="admin-brand-search" type="search" placeholder="Название или другое написание"></label><div id="admin-brand-results"></div>`;}
export function bindBrandAdmin(root,brands,esc){const input=root.querySelector('#admin-brand-search');if(!input)return;const draw=()=>{const matches=brands.filter(b=>matchesBrand(b,input.value));root.querySelector('#admin-brand-results').innerHTML=`<p class="small muted">Найдено: ${matches.length}</p><div class="brand-admin-list">${matches.map(b=>`<article><div><strong>${esc(b.name)}</strong><small>${b.aliases.map(esc).join(' · ')}</small></div><button data-action="edit-brand" data-id="${esc(b.id)}" aria-label="Редактировать ${esc(b.name)}">Изменить</button><button data-action="delete-brand" data-id="${esc(b.id)}" aria-label="Удалить ${esc(b.name)}">Удалить</button></article>`).join('')}</div>`;};input.addEventListener('input',draw);draw();}
export function searchSuggestions(root,brands,esc){
 const input=root.querySelector('#search-form input');if(!input)return;
 const list=document.createElement('div');list.className='search-suggestions';list.hidden=true;list.id='brand-suggestions';list.setAttribute('role','listbox');input.parentElement.append(list);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
 let matches=[],active=-1;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const draw=()=>{matches=input.value.trim()?brands.filter(b=>matchesBrand(b,input.value)).slice(0,8):[];active=-1;list.innerHTML=matches.map((b,i)=>`<button type="button" role="option" id="brand-suggestion-${i}" data-index="${i}" aria-selected="false">${esc(b.name)}</button>`).join('');list.hidden=!matches.length;input.setAttribute('aria-expanded',!!matches.length);input.removeAttribute('aria-activedescendant');};
 const select=i=>{input.value=matches[i].name;close();input.focus();};
 list.addEventListener('pointerdown',event=>{if(event.target.closest('[data-index]'))event.preventDefault();});
 input.addEventListener('input',draw);list.addEventListener('click',event=>{const button=event.target.closest('[data-index]');if(button)select(Number(button.dataset.index));});
 input.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(!matches.length||list.hidden)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;list.querySelectorAll('[role=option]').forEach((e,i)=>e.setAttribute('aria-selected',i===active));input.setAttribute('aria-activedescendant','brand-suggestion-'+active);}if(event.key==='Enter'&&active>=0){event.preventDefault();select(active);}});
 input.parentElement.addEventListener('focusout',event=>{if(!input.parentElement.contains(event.relatedTarget))close();});
}
