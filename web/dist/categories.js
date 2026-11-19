// Add future sections and subcategories here. Names are the persisted category keys.
export const categoryTree = [
  {name:'Одежда',children:['Платья','Юбки','Брюки','Джинсы','Шорты','Футболки','Майки','Топы','Боди','Рубашки','Блузки','Свитшоты','Худи','Зип-худи','Свитеры','Джемперы','Кардиганы','Водолазки','Жилеты','Пиджаки','Костюмы','Комбинезоны','Легинсы','Спортивные костюмы','Трикотаж']},
  {name:'Верхняя одежда',children:['Куртки','Парки','Шубы','Пальто','Тренчи','Плащи','Пуховики','Дублёнки','Бомберы','Ветровки']},
  {name:'Обувь',children:['Кеды','Кроссовки','Туфли','Лоферы','Балетки','Ботильоны','Ботинки','Сапоги','Босоножки','Сандалии','Мюли','Эспадрильи','Угги','Шлёпанцы']},
  {name:'Сумки',children:['Рюкзаки','Клатчи','Косметички']},
  {name:'Аксессуары',children:['Очки','Часы','Кошельки','Картхолдеры','Ремни','Платки','Шарфы','Палантины','Перчатки','Головные уборы','Кепки','Панамы','Шапки','Ободки','Заколки','Брелоки']},
  {name:'Украшения',children:['Кольца','Браслеты','Ожерелья','Серьги','Подвески','Броши','Цепочки','Чокеры','Запонки']},
  {name:'Парфюмерия',children:['Духи','Парфюмерная вода','Туалетная вода']},
  {name:'Нижнее бельё и домашняя одежда',children:['Нижнее бельё','Пижамы','Домашняя одежда','Носки','Колготки']},
  {name:'Пляжная одежда',children:['Купальники','Плавки']},
  {name:'Винтаж',children:['Винтажные вещи','Архивные вещи','Редкие вещи','Коллекционные вещи']},
];
export const mainCategories=categoryTree.map(c=>c.name);
export const allCategories=categoryTree.flatMap(c=>[c.name,...c.children]);
const normalize=s=>String(s||'').trim().toLowerCase().replaceAll('ё','е');
export function canonicalCategory(value){if(normalize(value)==='штаны')return 'Брюки';return allCategories.find(c=>normalize(c)===normalize(value))||value;}
export function parentCategory(value){const name=canonicalCategory(value);return categoryTree.find(c=>c.name===name||c.children.includes(name));}
export function categoryMatches(value,selected){if(!selected)return true;const name=canonicalCategory(value),target=canonicalCategory(selected);return name===target||!!categoryTree.find(c=>c.name===target)?.children.includes(name);}
export function categoryOptions(selected,esc){return categoryTree.map(c=>`<optgroup label="${esc(c.name)}">${[c.name,...c.children].map(name=>`<option value="${esc(name)}" ${name===canonicalCategory(selected)?'selected':''}>${name===c.name?'Весь раздел: ':''}${esc(name)}</option>`).join('')}</optgroup>`).join('');}

// Audience-specific navigation; persisted product categories remain unchanged.
const womenOnly=new Set(['Платья','Юбки','Топы','Боди','Блузки','Балетки','Ботильоны','Босоножки','Ободки','Заколки','Колготки','Купальники']);
const menOnly=new Set(['Запонки']);
export function categoryAllowed(category,audience){
 if(audience==='men')return !womenOnly.has(category);
 if(audience==='women')return !menOnly.has(category);
 if(audience==='unisex')return !womenOnly.has(category)&&!menOnly.has(category);
 return true;
}
export function categoriesForAudience(audience){return categoryTree.map(g=>({...g,children:g.children.filter(c=>categoryAllowed(c,audience))}));}
