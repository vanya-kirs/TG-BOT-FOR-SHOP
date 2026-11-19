import {DatabaseSync} from 'node:sqlite';
const [email,role,supplierId]=process.argv.slice(2);
if(!email||!['customer','supplier','admin'].includes(role)||(role==='supplier'&&!supplierId))throw Error('Usage: node server/set-role.mjs email customer|supplier|admin [supplierId]');
const db=new DatabaseSync(process.env.DATABASE_PATH||'./data/accounts.sqlite');
const user=db.prepare('SELECT id,emailVerified FROM user WHERE email=?').get(email.trim().toLowerCase());
if(!user||!user.emailVerified)throw Error('A registered user with verified email is required.');
db.exec('BEGIN IMMEDIATE');
try{
 db.prepare('UPDATE user SET role=?, supplierId=? WHERE id=?').run(role,role==='supplier'?supplierId:null,user.id);
 db.prepare('DELETE FROM session WHERE userId=?').run(user.id);
 db.exec('COMMIT');
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
console.log('Role updated; previous sessions revoked.');
