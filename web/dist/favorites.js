export const HEART_FLIGHT_MS=1450;

// Update only the affected controls. Never replace the gallery or scroll container.
export function updateFavoriteControls(root,id,ids){
  const active=ids.includes(id);
  for(const button of root.querySelectorAll('[data-action="favorite"]')){
    if(button.dataset.id!==id)continue;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?'Убрать из избранного':'В избранное');
  }
  const destination=root.querySelector('.favorites-destination');
  if(destination){
    let badge=destination.querySelector('.count');
    if(ids.length){if(!badge){badge=document.createElement('span');badge.className='count';destination.append(badge);}badge.textContent=String(ids.length);}
    else badge?.remove();
  }
}
