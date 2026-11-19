export function photoModelGender(audience,choice,settings={}){
 if(audience==='men')return 'male';
 if(audience==='women')return 'female';
 if(audience==='unisex'&&['male','female'].includes(choice))return choice;
 if(audience==='kids'){if(['7-9','12-14'].includes(settings.childAge)&&['girl','boy'].includes(settings.childGender))return settings.childGender==='girl'?'female':'male';throw Error('Для детских вещей выберите возраст и модель: мальчик или девочка.');}
 throw Error(audience==='unisex'?'Выберите модель для унисекс: мужчину или женщину.':'Сначала выберите раздел: мужское или женское.');
}

export function childReferencePath(settings,view){
 if(!['7-9','12-14'].includes(settings?.childAge)||!['girl','boy'].includes(settings?.childGender)||!['front','back'].includes(view))throw Error('Выберите возраст и модель: мальчик или девочка.');
 return `/assets/model-references/child-${settings.childGender}-${settings.childAge}-${view}-v1.png`;
}
