import sharp from 'sharp';
export const image='data:image/png;base64,'+(await sharp({create:{width:120,height:160,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp({create:{width:80,height:100,channels:4,background:'#938573'}}).png().toBuffer()}]).png().toBuffer()).toString('base64');
