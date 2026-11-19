export function yandexProfile(user){
 return {id:String(user.id),email:user.default_email,emailVerified:false,name:user.first_name||user.login};
}

export function removeRetiredProfileData(db){
 const fields=['phone','birthday','gender'];
 const columns=db.prepare("PRAGMA table_info('user')").all().map(c=>c.name);
 db.exec('PRAGMA secure_delete=ON; BEGIN IMMEDIATE');
 try{
  for(const field of fields)if(columns.includes(field))db.exec(`ALTER TABLE user DROP COLUMN ${field}`);
  if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_store'").get()){
   for(const row of db.prepare('SELECT userId,data FROM customer_store').all()){
    const data=JSON.parse(row.data);
    if(data.customer&&fields.some(field=>Object.hasOwn(data.customer,field))){
     for(const field of fields)delete data.customer[field];
     db.prepare('UPDATE customer_store SET data=? WHERE userId=?').run(JSON.stringify(data),row.userId);
    }
   }
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
}
