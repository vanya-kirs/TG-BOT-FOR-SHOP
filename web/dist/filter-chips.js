export function filterChips(filters,parent,brands){return [
 ['audience',filters.audience,({men:'Мужское',women:'Женское',kids:'Детское',unisex:'Унисекс'})[filters.audience]],
 ['category',parent,parent],...(filters.categories||[]).map(v=>['categories',v,v]),
 ['condition',filters.condition,({new:'Новое с биркой',used:'Б/у'})[filters.condition]],
 ...(filters.brands||[]).map(v=>['brands',v,brands.find(b=>b.id===v)?.name||v]),
 ...(filters.sizes||[]).map(v=>['sizes',v,v]),['min',filters.min,filters.min?`от ${filters.min} ₽`:''],['max',filters.max,filters.max?`до ${filters.max} ₽`:''],['sale',true,filters.sale?'Со скидкой':'']
 ].filter(([, ,label])=>label);}
export function removeFilter(filters,key,value){const next={...filters};if(['categories','brands','sizes'].includes(key))next[key]=(next[key]||[]).filter(v=>v!==value);else if(key==='category'){next.category='';next.categories=[];}else next[key]=key==='sale'?false:key==='condition'?'all':'';return next;}
