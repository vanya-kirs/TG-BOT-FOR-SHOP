import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {CONSENT_TEXT,CONSENT_VERSION} from '../dist/legal-content.js';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function render(md){let out='',table=false,list=false;for(const line of md.split('\n')){
 if(line.startsWith('|')){if(!table){out+='<div class="table-scroll"><table>';table=true;}if(/^\|[\s:|\-]+$/.test(line))continue;out+='<tr>'+line.split('|').slice(1,-1).map(x=>'<td>'+esc(x.trim())+'</td>').join('')+'</tr>';continue;}
 if(table){out+='</table></div>';table=false;}
 if(line.startsWith('- ')){if(!list){out+='<ul>';list=true;}out+='<li>'+esc(line.slice(2))+'</li>';continue;}if(list){out+='</ul>';list=false;}
 if(!line.trim())continue;const h=/^(#{1,3}) (.*)$/.exec(line);out+=h?`<h${h[1].length}>${esc(h[2])}</h${h[1].length}>`:'<p>'+esc(line)+'</p>';
 }return out+(table?'</table></div>':'')+(list?'</ul>':'');}
const dir=new URL('../dist/legal/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const [name,title,text] of [
 ['privacy','Политика конфиденциальности и обработки персональных данных',readFileSync(new URL('../docs/legal/privacy-policy-draft.md',import.meta.url),'utf8')],
 ['consent','Согласие на обработку персональных данных','# Согласие на обработку персональных данных\n\nВерсия '+CONSENT_VERSION+'\n\n'+CONSENT_TEXT.split('\n').slice(1).join('\n\n')],
 ['cookies','Cookie и данные браузера',readFileSync(new URL('../docs/legal/cookie-policy.md',import.meta.url),'utf8')]
])writeFileSync(new URL(name+'.html',dir),`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} — Vera Privé</title><link rel="stylesheet" href="/style.css?v=legal-1"></head><body><main class="legal-document"><a href="/#/">← В магазин</a>${render(text)}<p><a href="/legal/privacy.html">Политика</a> · <a href="/legal/consent.html">Согласие</a> · <a href="/legal/cookies.html">Cookie</a></p><p>Обращения: <a href="mailto:info@shop.example.com">info@shop.example.com</a></p></main></body></html>`);
