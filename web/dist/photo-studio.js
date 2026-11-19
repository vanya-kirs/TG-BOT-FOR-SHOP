import {createPhotoProgress} from './photo-progress.js?v=photo-studio-2';
const labels={cover:'Товар · фон обработан',front:'ИИ-визуализация · спереди',back:'ИИ-визуализация · сзади'};
export function studioGallery(originals,generated,detail=''){
 const frames=['cover','front','back'].filter(k=>generated[k]).map(k=>({src:generated[k],label:labels[k]}));
 for(const src of [detail,...originals].filter(Boolean))if(!frames.some(f=>f.src===src))frames.push({src,label:'Фото товара'});
 if(frames.length>8)throw Error('В комплекте больше 8 фото. Уберите лишние исходники перед обработкой.');
 return frames;
}
async function request(path,body){
 let r;try{r=await fetch('/api/photos'+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(35000),headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 catch{throw Error(body?'Соединение прервалось при запуске. Запрос мог быть принят — проверьте кабинет FASHN перед повторным запуском.':'Не удалось проверить обработку из-за соединения. Нажмите «Проверить текущую обработку».');}
 const data=await r.json().catch(()=>null);
 if(!data)throw Error('Сервер вернул неожиданный ответ. Обновите страницу после сохранения исходных фото.');
 if(!r.ok)throw Error(data.message||'Не удалось обработать фото.');return data;
}
async function prepareResult(src){
 const img=new Image();img.src=src;await img.decode();
 const c=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.width,img.height));
 c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
 const ctx=c.getContext('2d');ctx.fillStyle='#f3eee6';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
 for(const quality of [.88,.75,.6,.45]){const value=c.toDataURL('image/jpeg',quality);if(value.length<450000)return value;}
 throw Error('Результат слишком объёмный. Попробуйте исходное фото меньшего размера.');
}
export async function bindPhotoStudio(form,product,esc){
 const area=form.querySelector('[name=photos]'),host=document.createElement('details');host.className='photo-studio';host.innerHTML='<summary>Подготовить фото с ИИ</summary><p class="small">Загрузите выше фото товара спереди, сзади и детали. Выберите нужные исходники ниже. Каждый запуск расходует кредиты; результат проверяется перед сохранением.</p><p data-status role="status">Проверяем настройки…</p>';
 form.querySelector('.photo-editor').append(host);
 form.photoStudio=product?.photoStudio||{originals:[],frames:[]};
 const status=host.querySelector('[data-status]');
 let config;try{config=await request('/config');}catch{status.textContent='ИИ-обработка доступна после входа в рабочий кабинет на сервере магазина.';return;}
 if(!form.isConnected)return;
 if(!config.enabled){status.textContent='ИИ-обработка ещё не настроена. Администратору нужно подключить ключ сервиса и референсы модели.';return;}
 status.textContent='Обложка → модель спереди → модель сзади → детали. Референсы модели фиксированы для магазина.';
 host.insertAdjacentHTML('beforeend',`<div class="form-grid">${[['front','Фото товара спереди'],['back','Фото товара сзади (необязательно)'],['detail','Бирка или детали (необязательно)']].map(([k,title])=>`<label>${title}<select data-source="${k}"></select></label>`).join('')}</div><div class="studio-actions">${[['cover','Создать обложку'],['front','На модели спереди'],['back','На модели сзади']].map(([k,title])=>`<button type="button" data-generate="${k}" ${k!=='cover'&&!config[k]?'disabled':''}>${title}</button>`).join('')}</div><p class="small">${!config.front||!config.back?'Для некоторых ракурсов ещё не настроены референсы модели.':''}</p><div data-progress-host></div><div data-results class="photo-preview"></div><button type="button" data-apply hidden>Использовать проверенные кадры</button><button type="button" data-resume hidden>Проверить текущую обработку</button>`);
 const progress=createPhotoProgress(host.querySelector('[data-progress-host]'));
 let originals=[],generated=Object.fromEntries(Object.entries(labels).flatMap(([kind,label])=>{const f=form.photoStudio.frames.find(f=>f.label===label);return f?[[kind,f.src]]:[];})),job=null,busy=false;
 const refresh=()=>{const current=area.value.split('\n').map(x=>x.trim()).filter(Boolean);originals=[...new Set([...(form.photoStudio.originals||[]),...current.filter(src=>!(form.photoStudio.frames||[]).some(f=>f.src===src))])];for(const select of host.querySelectorAll('[data-source]')){const old=select.value;select.innerHTML='<option value="">Не выбрано</option>'+originals.map((src,i)=>`<option value="${i}">Исходное фото ${i+1}</option>`).join('');if([...select.options].some(o=>o.value===old))select.value=old;}};
 refresh();area.addEventListener('input',refresh);
 const source=kind=>{const value=host.querySelector(`[data-source="${kind}"]`).value;return value===''?'':originals[Number(value)];};
 function lock(value){busy=value;if(value)form.dataset.photoBusy="1";else delete form.dataset.photoBusy;host.querySelectorAll('select').forEach(s=>s.disabled=value);form.querySelector('button[type=submit]').disabled=value;host.querySelectorAll('[data-generate]').forEach(b=>b.disabled=value||(b.dataset.generate!=='cover'&&!config[b.dataset.generate]));host.querySelector('[data-apply]').disabled=value;form.querySelector('[name=uploads]').disabled=value;form.querySelectorAll('.photo-preview [data-photo-cover],.photo-preview [data-photo-remove]').forEach(b=>b.disabled=value||(b.hasAttribute('data-photo-cover')&&b.dataset.photoCover==='0'));area.readOnly=value;}
 async function poll(){
  lock(true);host.querySelector('[data-resume]').hidden=true;
  try{for(let i=0;i<120;i++){
   if(!form.isConnected){progress.stop();return;}
   const result=await request('/'+job.id);
   if(result.status==='failed'){job=null;throw Error(result.message||'Обработка завершилась с ошибкой. Можно выбрать другой исходник и запустить снова.');}
   if(result.status==='completed'){
    progress.update('finishing');generated[job.kind]=await prepareResult(result.image);
    host.querySelector('[data-results]').innerHTML=Object.entries(generated).map(([kind,src])=>`<div class="photo-tile"><img src="${esc(src)}" alt="${labels[kind]}"><span>${labels[kind]}</span></div>`).join('');
    host.querySelector('[data-apply]').hidden=false;status.textContent='Проверьте цвет, логотипы, крой и состояние вещи. Кадры пока не применены.';job=null;progress.update('completed');return;
   }
   progress.update(result.stage||'processing');
   await new Promise(r=>setTimeout(r,2500));
  }throw Error('Обработка продолжается. Нажмите «Проверить текущую обработку».');
  }catch(e){status.textContent=e.message;progress.update(job?'paused':'failed',e.message);host.querySelector('[data-resume]').hidden=!job;}finally{lock(false);}
 }
 host.addEventListener('click',async event=>{
  const button=event.target.closest('[data-generate]');
  if(button&&!busy&&!form.dataset.photoBusy){try{
   if(job)throw Error('Сначала проверьте текущую обработку.');
   const kind=button.dataset.generate,image=source(kind==='cover'?'front':kind);
   if(!image?.startsWith('data:image/'))throw Error('Выберите загруженное исходное фото. Для фото по ссылке сначала загрузите файл.');
   if(originals.length>5)throw Error('Оставьте до 5 исходных фото, чтобы комплект поместился в галерею.');
   lock(true);host.open=true;progress.start(image);status.textContent='Обрабатываем фото… Не закрывайте форму.';
   job={...await request('',{kind,image}),kind};await poll();
  }catch(e){status.textContent=e.message;progress.update('failed',e.message);}finally{lock(false);}}
  if(event.target.closest('[data-resume]')&&!busy&&job){progress.start(source(job.kind==='cover'?'front':job.kind));await poll();}
  if(event.target.closest('[data-apply]')&&!busy){try{
   const frames=studioGallery(originals,generated,source('detail'));
   form.photoStudio={originals:[...originals],frames:frames.filter(f=>f.label!=='Фото товара')};area.value=frames.map(f=>f.src).join('\n');area.dispatchEvent(new Event('input'));
   status.textContent='Кадры добавлены в форму. Исходники сохранены. Проверьте порядок и сохраните товар.';
  }catch(e){status.textContent=e.message;}}
 });
}
