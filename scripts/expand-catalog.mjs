import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {classifyProduct,decodeHtml,get,inBatches,normalize} from './catalog-utils.mjs';

const catalog = JSON.parse(await fs.readFile('src/data/products.json','utf8'));
const fetchedAt = new Date().toISOString();
const additions=[];
const skipped=[];
const host='https://totalseg.lojaintegrada.com.br';
const categories={
  'alarmes':'Centrais de alarme','sensores':'Sensores de presença','sirenes':'Sirenes e sinalizadores',
  'cercas-eletricas':'Cercas elétricas','concertinas':'Concertinas e proteção perimetral','rede-laminada-':'Concertinas e proteção perimetral',
  'baterias':'Baterias e pilhas','fontes':'Fontes de alimentação','cabos':'Cabos','acessorios-cftv':'Conectores e acessórios CFTV',
  'dvrs':'Gravadores','cameras':'Câmeras','cameras-wi-fi':'Câmeras','cameras-corporais':'Câmeras','kit-cameras':'Kits de câmeras',
  'controles':'Controles e receptores','receptores-22541038':'Controles e receptores','botao-de-emergencia':'Alarme e emergência',
  'buzzer':'Sirenes e sinalizadores','gerador-de-neblina':'Alarme e emergência','controle-de-acesso-17238821':'Controle de acesso e catracas',
  'catracas':'Controle de acesso e catracas','cancelas-18624708':'Automatizadores e acessórios','motores':'Automatizadores e acessórios',
  'motores-acessorios':'Automatizadores e acessórios','centrais-motores-23395825':'Automatizadores e acessórios',
  'fechaduras':'Fechaduras','travas':'Fechaduras','interfones':'Interfones e videoporteiros','video-porteiros':'Interfones e videoporteiros',
  'no-breaks':'Energia e nobreaks','racks':'Redes e infraestrutura','protecoes':'Energia e nobreaks',
  'cartao-memoria-18032730':'Armazenamento','portaria-remota':'Controle de acesso e catracas'
};
const links=new Map();
await inBatches(Object.entries(categories),4,async([path,category])=>{
  const seenPages=new Set();
  const queue=[`${host}/${path}`];
  while(queue.length){
    const url=queue.shift();if(seenPages.has(url))continue;seenPages.add(url);
    try{
      const html=await(await get(url)).text();
      for(const match of html.matchAll(/<a\s+href="([^"]+)"\s+class="nome-produto\b/g))if(match[1].startsWith(host+'/'))links.set(decodeHtml(match[1]),category);
      for(const match of html.matchAll(/href="([^"]+)"/g)){
        const href=decodeHtml(match[1]);const next=new URL(href,url);
        if(next.origin===host && next.pathname===new URL(url).pathname && /(?:pagina|page)=\d+/.test(next.search)&&!seenPages.has(next.href))queue.push(next.href);
      }
    }catch(error){skipped.push({url,reason:error.message});}
  }
});
console.log(`Páginas de produtos encontradas: ${links.size}`);
await inBatches([...links],4,async([url,fallback])=>{
  try{
    const html=await(await get(url)).text();
    const meta=key=>decodeHtml(html.match(new RegExp(`property="${key}" content="([^"]+)"`))?.[1]||'');
    const name=meta('og:title');const imageSource=meta('og:image');
    const price=Number(html.match(/itemprop="price" content="([\d.]+)"/)?.[1]);
    if(!name||!imageSource||!price){skipped.push({url,reason:'Sem preço público ou foto'});return;}
    const text=normalize(name);
    const brand=/intelbras|intelbras/.test(text)?'Intelbras':/hikvision/.test(text)?'Hikvision':/\bjfl\b/.test(text)?'JFL':/\bppa\b/.test(text)?'PPA':/garen/.test(text)?'Garen':/bycon/.test(text)?'Bycon':/seagate/.test(text)?'Seagate':/kingston/.test(text)?'Kingston':'Conforme fornecedor';
    const id='totalseg-'+createHash('sha256').update(url).digest('hex').slice(0,12);
    additions.push({id,name,brand,category:classifyProduct(name,fallback),price,priceBasis:'À vista (condições na fonte)',source:url,sourceName:'TotalSeg',seller:'TotalSeg',imageSource,fetchedAt});
  }catch(error){skipped.push({url,reason:error.message});}
});

// Concertinas simples, duplas e kits do fabricante, pela API pública da loja.
try{
  const items=await(await get('https://kyotoconcertina.com.br/wp-json/wc/store/v1/products?search=concertina&per_page=100')).json();
  for(const p of items){
    if(!p.images?.[0]?.src||!p.prices?.price||p.prices.currency_code!=='BRL')continue;
    const price=Number(p.prices.price)/10**Number(p.prices.currency_minor_unit);
    if(!price)continue;
    additions.push({id:`kyoto-${p.id}`,name:decodeHtml(p.name.replace(/<[^>]*>/g,'')),brand:'Kyoto',category:'Concertinas e proteção perimetral',price,priceBasis:'Preço anunciado',source:p.permalink,sourceName:'Kyoto Concertina',seller:'Kyoto Concertina',imageSource:p.images[0].src,fetchedAt});
  }
}catch(error){skipped.push({url:'https://kyotoconcertina.com.br/loja/',reason:error.message});}

// Sensores de presença para iluminação, além dos sensores próprios de alarme.
try{
  const items=await(await get('https://loja.intelbras.com.br/api/catalog_system/pub/products/search?ft=sensor&_from=0&_to=49')).json();
  for(const p of items){
    if(!normalize(p.productName).includes('presenca'))continue;
    const sku=p.items.find(i=>i.images?.length&&i.sellers.some(s=>s.commertialOffer?.Price>0&&s.commertialOffer.IsAvailable));
    if(!sku)continue;
    const seller=sku.sellers.find(s=>s.commertialOffer?.Price>0&&s.commertialOffer.IsAvailable);
    additions.push({id:`intelbras-${p.productId}`,name:p.productName,brand:'Intelbras',category:'Sensores de presença para iluminação',price:seller.commertialOffer.Price,priceBasis:'Preço anunciado',source:p.link,sourceName:'Loja Intelbras',seller:seller.sellerName,imageSource:sku.images[0].imageUrl,fetchedAt});
  }
}catch(error){skipped.push({url:'https://loja.intelbras.com.br/',reason:error.message});}

const unique=[...new Map(additions.map(p=>[p.source,p])).values()];
console.log(`Novas ofertas com preço e foto: ${unique.length}`);
await inBatches(unique,4,async p=>{
  try{
    const response=await get(p.imageSource);const type=response.headers.get('content-type')||'';
    if(!type.startsWith('image/'))throw Error('Resposta não é uma imagem');
    const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
    const image=`/products/${p.id}.${ext}`;
    await fs.writeFile(`public${image}`,Buffer.from(await response.arrayBuffer()));
    p.image=image;
  }catch(error){skipped.push({url:p.imageSource,reason:error.message});}
});

const refreshed=unique.filter(p=>p.image);
const refreshedSources=new Set(refreshed.map(p=>p.source));
catalog.products=catalog.products.filter(p=>!refreshedSources.has(p.source)).map(p=>({...p,category:classifyProduct(p.name,p.category)}));
catalog.products.push(...refreshed);
catalog.products.sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
catalog.fetchedAt=fetchedAt;
await fs.writeFile('src/data/products.json',JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile('scripts/catalog-import-report.json',JSON.stringify({fetchedAt,total:catalog.products.length,added:unique.filter(p=>p.image).length,skipped},null,2)+'\n');
console.log(JSON.stringify({total:catalog.products.length,added:unique.filter(p=>p.image).length,skipped:skipped.length,categories:Object.fromEntries([...new Set(catalog.products.map(p=>p.category))].map(c=>[c,catalog.products.filter(p=>p.category===c).length]))},null,2));
