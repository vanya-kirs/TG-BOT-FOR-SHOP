import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../dist/store.js';
import {addDemoProduct,demoProductId} from '../dist/demo.js';
import {gallery} from '../dist/merchandising.js';
import {updateFavoriteControls,HEART_FLIGHT_MS} from '../dist/favorites.js';
test('test listing is added once to existing data with three views',()=>{const s=seed(),old=s.products.length;addDemoProduct(s);addDemoProduct(s);assert.equal(s.products.length,old+1);const p=s.products.find(p=>p.id===demoProductId);assert.equal(p.images.length,3);assert.deepEqual(p.photoLabels,['Вид спереди','Вид сзади','Ткань и детали']);});
test('gallery has no more details overlay',()=>{const s=addDemoProduct(seed());assert.ok(!gallery(s.products[0],x=>x).includes('quick-details'));});
test('favorite update leaves existing nodes untouched',()=>{let attrs={};const button={dataset:{id:'p1'},classList:{toggle:(key,value)=>attrs[key]=value},setAttribute:(key,value)=>attrs[key]=value};let replaced=false;const root={querySelectorAll:()=>[button],querySelector:()=>null,set innerHTML(v){replaced=true;}};updateFavoriteControls(root,'p1',['p1']);assert.equal(attrs['aria-pressed'],'true');assert.equal(replaced,false);assert.ok(HEART_FLIGHT_MS>=1400);});
