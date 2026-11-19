import sharp from 'sharp';
export const PHOTO_WIDTH=1200,PHOTO_HEIGHT=1600,PHOTO_BACKGROUND='#F3EEE6';
const decode=value=>Buffer.isBuffer(value)?value:Buffer.from(value.split(',')[1],'base64');
export const photoData=buffer=>'data:image/jpeg;base64,'+buffer.toString('base64');
// This padded input is a composition guide, never a publishable result.
export async function generationCanvas(value){return photoData(await sharp(decode(value),{limitInputPixels:40000000}).rotate().resize(PHOTO_WIDTH,PHOTO_HEIGHT,{fit:'contain',background:PHOTO_BACKGROUND}).flatten({background:PHOTO_BACKGROUND}).jpeg({quality:94}).toBuffer());}
export async function catalogPhoto(value,{cutout=false}={}){
 const input=decode(value),source=sharp(input,{limitInputPixels:40000000}).rotate();
 if(cutout){
  const {data,info}=await source.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1,transparent=false;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha<16)transparent=true;if(alpha>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  if(!transparent||right<left)throw Error('Ожидался товар с прозрачным фоном.');
  const item=await sharp(data,{raw:info}).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(1056,1408,{fit:'inside'}).png().toBuffer();
  return sharp({create:{width:PHOTO_WIDTH,height:PHOTO_HEIGHT,channels:3,background:PHOTO_BACKGROUND}}).composite([{input:item,gravity:'centre'}]).jpeg({quality:94}).toBuffer();
 }
 const meta=await source.metadata(),w=meta.autoOrient?.width||meta.width,h=meta.autoOrient?.height||meta.height;
 // Only rounding differences are accepted. Never silently crop a landscape image.
 if(Math.abs(w/h-3/4)>0.015)throw Error('Результат не соответствует формату 3:4. Выберите другой вариант или переделайте этот кадр.');
 return source.resize(PHOTO_WIDTH,PHOTO_HEIGHT,{fit:'fill'}).flatten({background:PHOTO_BACKGROUND}).jpeg({quality:94}).toBuffer();
}
