import {brandSeed} from './brand-data.js';
export const normalizeBrand=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]/gu,'');
export const brandKeys=brand=>[brand.name,...(brand.aliases||[])].map(normalizeBrand);
const romanLetters={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
export const searchKey=value=>normalizeBrand(value).replace(/[а-яё]/g,c=>romanLetters[c]);
export const matchesBrand=(brand,query)=>!query||brandKeys(brand).some(key=>searchKey(key).includes(searchKey(query)));
export const brandLetter=brand=>{const letter=brand.name.replace(/^[^\p{L}\p{N}]+/u,'')[0]?.toUpperCase();return /[A-Z]/.test(letter)?letter:'#';};
export function findBrand(brands,value){const key=normalizeBrand(value);const exact=brands.find(b=>b.id===value||brandKeys(b).includes(key));if(exact)return exact;const matches=brands.filter(b=>brandKeys(b).some(k=>searchKey(k)===searchKey(value)));return matches.length===1?matches[0]:undefined;}
export function validateBrand(brands,input,id){
 const name=String(input.name||'').trim();
 if(!name||name.length>100)throw Error('Название бренда: от 1 до 100 символов.');
 const aliases=[...new Set((Array.isArray(input.aliases)?input.aliases:String(input.aliases||'').split(',')).map(s=>String(s).trim()).filter(Boolean))];
 if(aliases.length>30||aliases.some(s=>s.length>100))throw Error('Слишком много вариантов написания или слишком длинное значение.');
 const categories=Array.isArray(input.categories)?[...new Set(input.categories)]:[];
 const result={id:id||'brand-'+crypto.randomUUID(),name,aliases,categories};
 const keys=brandKeys(result);
 if(brands.some(b=>b.id!==id&&brandKeys(b).some(k=>keys.includes(k))))throw Error('Этот бренд или вариант написания уже есть в справочнике.');
 return result;
}
export const sortBrands=brands=>[...brands].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
export function initialBrands(){return structuredClone(brandSeed);}

// In preview only, the same catalog is shared by all demo roles in this browser.
export async function loadBrands(server,storage=localStorage){
 if(server){const response=await fetch('/api/brands');if(!response.ok)throw Error('Не удалось загрузить справочник брендов.');return await response.json();}
 try{const saved=JSON.parse(storage.getItem('vera-brands-v1'));if(Array.isArray(saved)&&saved.every(b=>b.id&&b.name&&Array.isArray(b.aliases)))return saved;}catch{}
 return initialBrands();
}
export async function writeBrand(brands,values,id,server,storage=localStorage){
 const brand=validateBrand(brands,values,id);
 if(server){const response=await fetch('/api/brands'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(brand)});const body=await response.json();if(!response.ok)throw Error(body.message||'Не удалось сохранить бренд.');Object.assign(brand,body);}
 const next=sortBrands([...brands.filter(b=>b.id!==id),brand]);
 if(!server)storage.setItem('vera-brands-v1',JSON.stringify(next));
 return next;
}
export async function deleteBrand(brands,id,products,server,storage=localStorage){
 if(products.some(p=>p.brandId===id))throw Error('Бренд используется в товарах. Сначала измените бренд у этих товаров.');
 if(server){const response=await fetch('/api/brands/'+encodeURIComponent(id),{method:'DELETE'});if(!response.ok)throw Error('Не удалось удалить бренд.');}
 const next=brands.filter(b=>b.id!==id);if(!server)storage.setItem('vera-brands-v1',JSON.stringify(next));return next;
}
