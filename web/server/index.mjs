import {startPrivacyMaintenance} from './privacy-retention.mjs';
import {dirname,join} from 'node:path';
import {createIdentity} from './auth.mjs';
import {createApp} from './app.mjs';
const identity=createIdentity();
startPrivacyMaintenance(identity.database,join(dirname(process.env.DATABASE_PATH||'./data/accounts.sqlite'),'privacy-backups'));
const port=Number(process.env.PORT||4173);
createApp(identity).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Vera Privé: ${identity.baseURL}`));
