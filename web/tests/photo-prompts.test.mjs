import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPrompt} from '../server/photo-prompts.mjs';
test('cover prompt requests upright product-only composition and careful wrinkle correction',()=>{
 const prompt=photoPrompt('cover','Keep sleeve print');assert.match(prompt,/without a person/);assert.match(prompt,/neckline or waistband at the top/);assert.match(prompt,/storage creases/);assert.match(prompt,/actual wear or damage/);assert.match(prompt,/Keep sleeve print/);
});
test('both model views receive wrinkle correction without losing designed fabric details',()=>{for(const k of ['front','back']){const p=photoPrompt(k);assert.match(p,/storage creases/);assert.match(p,/intentional pleats/);assert.match(p,/logos/);assert.match(p,k==='front'?/Front view/:/Back view/);}});
test('print placement is anchored to garment landmarks without centering deliberately offset logos',()=>{
 for(const kind of ['cover','front','back']){const prompt=photoPrompt(kind);assert.match(prompt,/not to the image canvas/);assert.match(prompt,/relative distances to the neckline/);assert.match(prompt,/Do not move a central chest print/);assert.match(prompt,/intentionally off-center, keep it off-center/);}
});
test('centering correction preserves text and height and targets garment panel, not model or canvas',()=>{
 const prompt=photoPrompt('front','Надпись ровно по центру');assert.match(prompt,/garment vertical centerline/);assert.match(prompt,/original vertical height and size/);assert.match(prompt,/same complete text and logo/);assert.match(prompt,/Надпись ровно по центру/);assert.match(prompt,/no torso twist/);
});
test('cover background is a fixed sRGB color and remains the last instruction after corrections',()=>{
 const prompt=photoPrompt('cover','Make background blue');assert.match(prompt,/#F3EEE6, RGB\(243,238,230\)/);assert.match(prompt,/No gradient, vignette/);assert.ok(prompt.indexOf('Make background blue')<prompt.indexOf('Background specification'));assert.match(prompt,/must not be changed by a correction request\.$/);
});
