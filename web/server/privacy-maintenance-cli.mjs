import {DatabaseSync} from 'node:sqlite';
import {dirname,join} from 'node:path';
import {existsSync,readdirSync,lstatSync} from 'node:fs';
import {runRetention,maintainBackups,eraseUnusedAccount} from './privacy-retention.mjs';
const path=process.env.DATABASE_PATH||'./data/accounts.sqlite';
if(!existsSync(path))throw Error('База не найдена.');
const db=new DatabaseSync(path),directory=join(dirname(path),'privacy-backups');
try{
 const action=process.argv[2];
 if(action==='cleanup'){runRetention(db);await maintainBackups(db,directory);console.log('Очистка и резервное копирование завершены.');}
 else if(action==='erase'){
  const id=process.argv[3];if(!id)throw Error('Нужен идентификатор аккаунта.');
  const user=db.prepare('SELECT id,role FROM user WHERE id=?').get(id);if(!user)throw Error('Аккаунт не найден.');
  if(!process.argv.includes('--apply')){console.log('Проверка: аккаунт найден, роль '+user.role+'. Изменений нет. После проверки запроса используйте --apply.');}
  else{
   if(user.role!=='customer')throw Error('Служебный аккаунт требует отдельной проверки.');
   const commerce=JSON.parse(db.prepare('SELECT data FROM commerce WHERE id=1').get()?.data||'{}');
   if(commerce.orders?.some(o=>o.userId===id))throw Error('Есть история заказов. Определите обязательный объём хранения прежде, чем удалять данные.');
   for(const name of existsSync(directory)?readdirSync(directory):[]){
    const file=join(directory,name);if(!/^accounts-\d{13}\.sqlite$/.test(name)||!lstatSync(file).isFile())continue;
    const copy=new DatabaseSync(file);try{eraseUnusedAccount(copy,id);}finally{copy.close();}
   }
   eraseUnusedAccount(db,id);db.exec('PRAGMA wal_checkpoint(TRUNCATE)');console.log('Неиспользуемый аккаунт удалён из действующей базы и управляемых копий. Внешние копии и почту проверить отдельно.');
  }
 }else throw Error('Команды: cleanup; erase ACCOUNT_ID [--apply]');
}finally{db.close();}
