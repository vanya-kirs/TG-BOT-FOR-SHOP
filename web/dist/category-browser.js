import {parentCategory,canonicalCategory} from './categories.js';
const clothingGroups=[
 ['Топы и футболки',['Футболки','Майки','Топы','Боди']],
 ['Рубашки и блузки',['Рубашки','Блузки']],
 ['Трикотаж',['Свитеры','Джемперы','Кардиганы','Водолазки','Жилеты','Трикотаж']],
 ['Брюки и джинсы',['Брюки','Джинсы','Шорты','Легинсы']],
 ['Платья и юбки',['Платья','Юбки']],
 ['Костюмы и пиджаки',['Костюмы','Пиджаки','Комбинезоны']],
 ['Худи и спортивная одежда',['Худи','Зип-худи','Свитшоты','Спортивные костюмы']],
];
const otherGroups={
 'Верхняя одежда':[['Пальто и плащи',['Пальто','Плащи','Тренчи']],['Куртки и лёгкая одежда',['Куртки','Парки','Бомберы','Ветровки']],['Тёплая одежда',['Пуховики','Шубы','Дублёнки']]],
 'Обувь':[['На каждый день',['Кеды','Кроссовки','Лоферы','Балетки']],['Туфли и открытая обувь',['Туфли','Босоножки','Сандалии','Мюли','Эспадрильи','Шлёпанцы']],['Ботинки и сапоги',['Ботильоны','Ботинки','Сапоги','Угги']]],
 'Сумки':[['Сумки и рюкзаки',['Сумки','Рюкзаки']],['Небольшие форматы',['Клатчи','Косметички']]],
 'Аксессуары':[['Очки и часы',['Очки','Часы']],['Кожгалантерея',['Кошельки','Картхолдеры','Ремни']],['Платки и тёплые аксессуары',['Платки','Шарфы','Палантины','Перчатки']],['Головные уборы',['Головные уборы','Кепки','Панамы','Шапки']],['Детали образа',['Ободки','Заколки','Брелоки']]],
 'Украшения':[['Для рук',['Кольца','Браслеты']],['На шею',['Ожерелья','Подвески','Цепочки','Чокеры']],['Акценты',['Серьги','Броши','Запонки']]],
 'Парфюмерия':[['Ароматы',['Духи','Парфюмерная вода','Туалетная вода']]],
 'Нижнее бельё и домашняя одежда':[['Бельё',['Нижнее бельё','Носки','Колготки']],['Для дома',['Пижамы','Домашняя одежда']]],
 'Пляжная одежда':[['Для пляжа',['Купальники','Плавки']]],
 'Винтаж':[['Винтаж и архив',['Винтажные вещи','Архивные вещи']],['Особые находки',['Редкие вещи','Коллекционные вещи']]],
};
const normalize=value=>String(value||'').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
const alphabet=items=>[...items].sort((a,b)=>a.localeCompare(b,'ru'));
export function categoryGroups(category){
 const parent=parentCategory(category);if(!parent)return [];
 const definitions=parent.name==='Одежда'?clothingGroups:(otherGroups[parent.name]||[[parent.name,parent.children]]);
 const groups=definitions.map(([name,children])=>({name,children:alphabet(children.filter(c=>parent.children.includes(c)||(parent.name==='Сумки'&&c==='Сумки')))}));
 const assigned=new Set(groups.flatMap(g=>g.children));
 const extra=parent.children.filter(c=>!assigned.has(c));
 if(extra.length)groups.push({name:'Другие вещи',children:alphabet(extra)});
 return groups.filter(g=>g.children.length);
}
export function matchingCategories(groups,query){
 const q=normalize(canonicalCategory(query));
 const hasChild=groups.some(g=>g.children.some(c=>normalize(c).includes(q)));
 return groups.map(g=>({...g,children:g.children.filter(c=>!q||normalize(c).includes(q)||(!hasChild&&normalize(g.name).includes(q)))})).filter(g=>g.children.length);
}
export function categoryBrowser(category,esc,selected=[]){
 const groups=categoryGroups(category);if(!groups.length)return '';
 const link=c=>`<button type="button" class="category-choice ${selected.includes(c)?'active':''}" aria-pressed="${selected.includes(c)}" data-action="subcategory" data-category="${esc(c)}">${esc(c)}</button>`;
 return `<section class="category-browser" aria-label="Группы категорий"><label class="category-find"><span>Найти категорию</span><input type="search" placeholder="Название категории" autocomplete="off" aria-controls="clothing-groups"></label><div class="clothing-groups" id="clothing-groups">${groups.map(g=>`<div class="clothing-group"><h3>${esc(g.name)}</h3><nav aria-label="${esc(g.name)}">${g.children.map(link).join('')}</nav></div>`).join('')}</div><p class="category-no-results" role="status" hidden>Категория не найдена. Попробуйте другое название.</p></section>`;
}
export function bindCategoryBrowser(root){
 const box=root.querySelector('.category-browser');if(!box)return;
 const input=box.querySelector('input'),groups=[...box.querySelectorAll('.clothing-group')];

 input.addEventListener('input',()=>{
  const q=normalize(canonicalCategory(input.value));

  let total=0;
  const hasChild=groups.some(g=>[...g.querySelectorAll('.category-choice')].some(a=>normalize(a.textContent).includes(q)));
  groups.forEach((g,index)=>{
   const groupMatch=!hasChild&&normalize(g.querySelector('h3').textContent).includes(q);
   const links=[...g.querySelectorAll('.category-choice')];let count=0;
   links.forEach(a=>{a.hidden=!!q&&!groupMatch&&!normalize(a.textContent).includes(q);if(!a.hidden)count++;});
   g.hidden=count===0;total+=count;

  });

  box.querySelector('.category-no-results').hidden=total>0;
 });
}
