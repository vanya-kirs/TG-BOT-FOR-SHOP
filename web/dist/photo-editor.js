export async function preparePhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Выберите JPEG, PNG или WebP размером до 20 МБ.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;await img.decode();
  const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.65,.45]){const value=canvas.toDataURL('image/jpeg',quality);if(value.length<450000)return value;}
  throw Error('Фото слишком объёмное. Попробуйте изображение меньшего размера.');
 }finally{URL.revokeObjectURL(url);}
}
export function bindPhotoEditor(form,esc){
 const area=form.querySelector('[name=photos]'),upload=form.querySelector('[name=uploads]'),preview=form.querySelector('.photo-preview'),error=form.querySelector('.form-error'),submit=form.querySelector('button[type=submit]');
 const uploadStatus=document.createElement('div');uploadStatus.className='photo-upload-progress';uploadStatus.hidden=true;uploadStatus.innerHTML='<progress aria-label="Подготовка загруженных фото"></progress><span role="status"></span>';upload.after(uploadStatus);
 const values=()=>area.value.split('\n').map(v=>v.trim()).filter(Boolean);
 const draw=()=>{const photos=values();preview.innerHTML=photos.map((src,i)=>`<div class="photo-tile"><img src="${esc(src)}" alt="Фото ${i+1}"><span>${i===0?'Обложка':'Фото '+(i+1)}</span><div><button type="button" data-photo-cover="${i}" ${i===0?'disabled':''}>На обложку</button><button type="button" data-photo-remove="${i}" aria-label="Удалить фото ${i+1}">×</button></div></div>`).join('');form.querySelector('.photo-total').textContent=`${photos.length} из 8 фото · минимум 2`;};
 area.addEventListener('input',draw);
 preview.addEventListener('click',event=>{const cover=event.target.closest('[data-photo-cover]'),remove=event.target.closest('[data-photo-remove]');const photos=values();if(cover){const [photo]=photos.splice(Number(cover.dataset.photoCover),1);photos.unshift(photo);}if(remove)photos.splice(Number(remove.dataset.photoRemove),1);if(cover||remove){area.value=photos.join('\n');draw();area.dispatchEvent(new Event('input'));}});
 upload.addEventListener('change',async()=>{
  try{
   const files=[...upload.files],existing=values();
   if(files.length+existing.length>8)throw Error('Можно добавить максимум 8 фотографий.');
   submit.disabled=true;upload.disabled=true;form.dataset.photoBusy='1';uploadStatus.hidden=false;uploadStatus.querySelector('progress').max=files.length;uploadStatus.querySelector('progress').value=0;error.textContent='';
   const prepared=[];for(const [i,file] of files.entries()){uploadStatus.querySelector('span').textContent=`Подготавливаем фото ${i+1} из ${files.length}…`;prepared.push(await preparePhoto(file));uploadStatus.querySelector('progress').value=i+1;}
   area.value=[...existing,...prepared].join('\n');error.textContent='';draw();area.dispatchEvent(new Event('input'));
  }catch(e){error.textContent=e.message;}finally{delete form.dataset.photoBusy;uploadStatus.hidden=true;submit.disabled=false;upload.disabled=false;upload.value='';}
 });
 draw();
}
