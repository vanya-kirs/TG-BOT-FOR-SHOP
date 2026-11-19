import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {catalogPhoto,generationCanvas} from '../server/photo-format.mjs';
test('cutout uses a uniform 1200x1600 canvas and preserves the whole object',async()=>{
 const item=await sharp({create:{width:200,height:100,channels:4,background:'#f00'}}).png().toBuffer();
 const input=await sharp({create:{width:400,height:400,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:item}]).png().toBuffer();
 const output=await catalogPhoto(input,{cutout:true}),m=await sharp(output).metadata();assert.equal(m.width,1200);assert.equal(m.height,1600);
 const pixel=await sharp(output).extract({left:0,top:0,width:1,height:1}).raw().toBuffer();assert.ok(Math.abs(pixel[0]-243)<=2);assert.ok(Math.abs(pixel[1]-238)<=2);
});
test('wrong ratio cannot be silently cropped into a published result; input canvas is portrait',async()=>{
 const input=await sharp({create:{width:600,height:400,channels:3,background:'#eee'}}).png().toBuffer();await assert.rejects(()=>catalogPhoto(input),/3:4/);
 const data=await generationCanvas(input),meta=await sharp(Buffer.from(data.split(',')[1],'base64')).metadata();assert.equal(meta.width/meta.height,.75);
});
