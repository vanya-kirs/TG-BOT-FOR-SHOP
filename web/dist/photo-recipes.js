import {parentCategory,allCategories} from './categories.js';
export const recipeNames={clothing:'Одежда',sets:'Комплекты и костюмы',bags:'Сумки',shoes:'Обувь',perfume:'Парфюмерия',headwear:'Головные уборы',glasses:'Очки',jewelry:'Украшения',watches:'Часы',belts:'Ремни',scarves:'Шарфы и платки',intimates:'Бельё и купальники',accessories:'Другие аксессуары',kids:'Детские вещи'};
export function recipeFor(category,audience,settings={}){
 if(audience==='kids')return 'kids';const parent=parentCategory(category)?.name;
 if(parent==='Винтаж')return recipeNames[settings.itemType]&&settings.itemType!=='kids'?settings.itemType:'clothing';
 if(['Костюмы','Спортивные костюмы'].includes(category))return 'sets';
 if(parent==='Сумки')return 'bags';if(parent==='Обувь')return 'shoes';if(parent==='Парфюмерия')return 'perfume';
 if(['Головные уборы','Кепки','Панамы','Шапки','Ободки','Заколки'].includes(category))return 'headwear';
 if(category==='Очки')return 'glasses';if(category==='Часы')return 'watches';if(parent==='Украшения')return 'jewelry';if(category==='Ремни')return 'belts';
 if(['Платки','Шарфы','Палантины'].includes(category))return 'scarves';
 if(['Нижнее бельё','Боди','Нижнее бельё и домашняя одежда','Купальники','Плавки','Пляжная одежда'].includes(category))return 'intimates';
 if(parent==='Аксессуары')return 'accessories';return 'clothing';
}
export const shotChoices={bags:{backpack:'На спине',shoulder:'На плече',crossbody:'Через плечо',hand:'В руке',product:'Без человека'},shoes:{feet:'На ногах · спереди',feetSide:'На ногах · сбоку',product:'Без человека'},headwear:{head:'На голове · спереди',headSide:'На голове · сбоку',product:'Без человека'},glasses:{face:'На лице',product:'Без человека'},jewelry:{neck:'На шее',ear:'На ухе',finger:'На пальце',wrist:'На запястье',lapel:'На лацкане',product:'Без человека'},watches:{wrist:'На запястье',product:'Без человека'},belts:{waist:'На талии',product:'Без человека'},scarves:{neck:'На шее',shoulders:'На плечах',product:'Без человека'},intimates:{product:'Без человека',adult:'На взрослой модели'}};
export function childTryonAllowed(category){return ['Одежда','Верхняя одежда'].includes(parentCategory(category)?.name)&&category!=='Боди';}
export function photoPlan(category,audience,settings={}){
 if(!allCategories.includes(category))throw Error('Выберите категорию товара.');
 const recipe=recipeFor(category,audience,settings),choices=shotChoices[recipe];let defaultShot=choices?Object.keys(choices)[0]:null;
 if(recipe==='bags')defaultShot=category==='Рюкзаки'?'backpack':category==='Клатчи'?'hand':category==='Косметички'?'product':'shoulder';
 if(recipe==='jewelry')defaultShot=category==='Кольца'?'finger':category==='Серьги'?'ear':category==='Браслеты'?'wrist':['Броши','Запонки'].includes(category)?'lapel':'neck';
 let shot=choices&&Object.hasOwn(choices,settings.shot)?settings.shot:defaultShot;
 if(recipe==='kids')shot=childTryonAllowed(category)&&settings.shot==='child'?'child':null;
 const extras=Number(settings.extraCount??0);if(!Number.isInteger(extras)||extras<0||extras>5)throw Error('Можно добавить от 0 до 5 дополнительных фото.');
 const material=['normal','delicate','shiny','fur'].includes(settings.material)?settings.material:'normal';
 const base={recipe,shot,material,preserveCondition:true,extraCount:extras,itemType:settings.itemType};
 if(recipe==='kids'){base.childAge=['7-9','12-14'].includes(settings.childAge)?settings.childAge:'';base.childGender=['girl','boy'].includes(settings.childGender)?settings.childGender:'';}
 let slots;
 const slot=(key,label,source,upload,mode,view)=>({key,label,source,upload,mode,view:view||key});
 if(recipe==='kids'&&shot==='child'||['clothing','sets'].includes(recipe)||recipe==='intimates'&&shot==='adult'){
 const group=recipe==='sets'?'Весь комплект: все предметы рядом, ничего не обрезано.':'Вещь целиком, расправленная; принт и края хорошо видны.';
 slots=[slot('cover','Вещь без модели','front','Фото спереди. '+group,'edit'),slot('front','На модели спереди','front','Фото спереди. '+group,'tryon'),slot('back','На модели сзади','back','Фото сзади. '+group,'tryon')];
 }else if(['perfume','kids','intimates','accessories'].includes(recipe)){
 const captions=recipe==='perfume'?['Флакон и упаковка целиком; этикетка читается.','Реальный другой ракурс флакона; покажите уровень жидкости, если виден.','Крупно этикетка, объём, дно или маркировка.']:recipe==='kids'?['Детская вещь или комплект целиком спереди, без ребёнка.','Реальное фото вещи сзади, без ребёнка.','Размер, застёжки или особенности состояния крупно.']:recipe==='intimates'?['Изделие целиком спереди на плоскости, без человека.','Реальное фото изделия сзади на плоскости.','Материал, швы или маркировка крупно.']:['Предмет целиком спереди.','Другой реальный ракурс предмета.','Фурнитура, маркировка или состояние крупно.'];
 slots=['cover','front','back'].map((k,i)=>slot(k,['Предмет целиком','Другой ракурс','Детали и маркировка'][i],['front','alternate','detail'][i],captions[i],'original'));
 }else{
 const instructions={bags:['Сумка целиком спереди, ручки и ремень расправлены.','Внутренность сумки, фурнитура или состояние крупно.'],shoes:['Оба ботинка/туфли вместе в ракурсе ¾; носки и пятки не обрезаны.','Реальное фото подошвы, каблука или следов износа.'],headwear:['Головной убор целиком спереди; форма и декор видны.','Реальное фото сбоку или сзади, застёжка или детали.'],glasses:['Очки целиком спереди или в ракурсе ¾, дужки раскрыты.','Дужки, шарниры и маркировка крупно.'],jewelry:['Украшение целиком, без перекрытия деталей.','Реальное фото клейма, застёжки или деталей крупно.'],watches:['Циферблат и ремешок целиком, без бликов на надписях.','Реальное фото задней крышки, застёжки или механизма.'],belts:['Ремень с пряжкой целиком, покажите длину и форму.','Пряжка, отверстия, маркировка или износ крупно.'],scarves:['Платок или шарф разложен целиком; рисунок и края видны.','Реальное фото фактуры, рисунка или состояния крупно.']};
 const [front,detail]=instructions[recipe];slots=[slot('cover','Предмет на чистом фоне','front',front,'background'),slot('front',shot==='product'?'Другой ракурс':choices[shot],shot==='product'?'alternate':'front',shot==='product'?'Другой реальный ракурс предмета, целиком.':front,shot==='product'?'original':'wear',shot),slot('back','Детали · оригинал','detail',detail,'original')];
 }
 for(let i=1;i<=extras;i++)slots.push(slot('extra'+i,'Дополнительное фото '+i,'extra'+i,'Реальный снимок деталей, маркировки или дефектов. Сохранится без обработки.','original'));
 const signature=JSON.stringify({recipe,shot,material,preserveCondition:base.preserveCondition,...(recipe==='kids'&&shot==='child'?{childAge:base.childAge,childGender:base.childGender}:{})});
 return {name:recipeNames[recipe],settings:base,slots,signature,needsModel:slots.some(s=>['tryon','wear'].includes(s.mode)),inputs:[...new Map(slots.map(s=>[s.source,{key:s.source,label:s.upload,original:slots.some(x=>x.source===s.source&&x.mode==='original')}])).values()]};
}
