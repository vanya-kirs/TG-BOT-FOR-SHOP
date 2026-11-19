import {categoryTree,parentCategory} from './categories.js?v=partners-3';
import {matchesBrand} from './brands.js?v=partners-3';
export function categoryFields(value,esc,required=false){
 const parent=parentCategory(value);
 return `<div class="category-fields full"><label>Раздел<select data-category-parent ${required?'required':''}><option value="">${required?'Выберите раздел':'Все разделы'}</option>${categoryTree.map(c=>`<option ${c.name===parent?.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Подкатегория<select data-category-child><option value="">Все вещи раздела</option></select></label><input type="hidden" name="category" value="${esc(value||'')}"></div>`;
}
export function bindCategoryFields(root){
 root.querySelectorAll('.category-fields').forEach(group=>{
  const parent=group.querySelector('[data-category-parent]'),child=group.querySelector('[data-category-child]'),value=group.querySelector('[name=category]');
  const draw=()=>{child.replaceChildren(new Option('Все вещи раздела',''),...(categoryTree.find(c=>c.name===parent.value)?.children||[]).map(c=>new Option(c,c)));child.disabled=!parent.value;child.value=[...child.options].some(o=>o.value===value.value)?value.value:'';};
  draw();parent.addEventListener('change',()=>{value.value=parent.value;draw();});child.addEventListener('change',()=>{value.value=child.value||parent.value;});
 });
}
export function sizeFields(selected,esc){
 const sizes=[...new Set(['XXS','XS','S','M','L','XL','XXL','XXXL',...Array.from({length:29},(_,i)=>String(28+i)),'ONE SIZE',...selected])];
 return `<fieldset class="full product-sizes"><legend>Размеры *</legend><div class="product-size-options">${sizes.map(s=>`<label class="check-label"><input type="checkbox" name="sizes" value="${esc(s)}" ${selected.includes(s)?'checked':''}>${esc(s)}</label>`).join('')}</div><input class="size-required-proxy" type="text" tabindex="-1" aria-label="Выберите хотя бы один размер" required value="${selected.length?'selected':''}"></fieldset>`;
}
export function bindProductFields(root,brands,esc){
 bindCategoryFields(root);
 const sizes=root.querySelector('.product-sizes');
 if(sizes)sizes.addEventListener('change',()=>{sizes.querySelector('.size-required-proxy').value=sizes.querySelector('input:checked')?'selected':'';sizes.classList.remove('field-invalid');});
 const input=root.querySelector('[name=brand]');if(!input)return;
 input.removeAttribute('list');root.querySelector('#product-brands')?.remove();
 const results=document.createElement('div');results.className='product-brand-results';input.parentElement.append(results);
 const draw=()=>{results.innerHTML=input.value.trim()?brands.filter(b=>matchesBrand(b,input.value)).slice(0,12).map(b=>`<button type="button" data-brand-value="${esc(b.name)}">${esc(b.name)}</button>`).join(''):'';};
 input.addEventListener('input',draw);
 results.addEventListener('pointerdown',e=>{if(e.target.closest('[data-brand-value]'))e.preventDefault();});
 results.addEventListener('click',e=>{const button=e.target.closest('[data-brand-value]');if(button){input.value=button.dataset.brandValue;results.replaceChildren();input.classList.remove('field-invalid');}});
 input.parentElement.addEventListener('focusout',e=>{if(!input.parentElement.contains(e.relatedTarget))results.replaceChildren();});
}
export function markRequired(root){
 root.querySelectorAll('[required]').forEach(field=>{
  const label=field.closest('label');if(!label||label.querySelector('.field-caption'))return;
  const caption=document.createElement('span');caption.className='field-caption';
  for(const node of [...label.childNodes]){if(node===field)break;caption.append(node);}
  if(!caption.querySelector('.required-mark')){const mark=document.createElement('span');mark.className='required-mark';mark.textContent=' *';mark.setAttribute('aria-hidden','true');caption.append(mark);}
  label.insertBefore(caption,field);
 });
}
if(typeof document!=='undefined'){
 document.addEventListener('invalid',event=>{event.target.classList.add('field-invalid');event.target.closest('.product-sizes')?.classList.add('field-invalid');},true);
 document.addEventListener('input',event=>{if(event.target.validity?.valid)event.target.classList.remove('field-invalid');});
}
