import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {get,decodeHtml} from './catalog-utils.mjs';

const sources=[
  {url:'https://www.segcftv.com.br/cabo-alta-isolacao-7mm-50-metros',store:'SEGCFTV',brand:'Conforme fornecedor',basis:'Boleto à vista · Rolo de 50 m',mode:'meta'},
  {url:'https://www.futuraseg.net.br/alarme-e-cerca-eletrica-6705776f87b15/acessorios/cabo-alta-isolacao-5mm-rolo-50mts-pr',store:'FuturaSeg',brand:'Bufallo',basis:'Preço anunciado · Rolo de 50 m',mode:'meta'},
  {url:'https://www.zaloninfo.com.br/seguranca/cerca-eletrica/cabo-alta-isolacao-5mm-flex-pr-50m-telecam-cabos',store:'Zalon',brand:'Telecam',basis:'À vista no Pix · Rolo de 50 m',mode:'offer'}
];
const catalog=JSON.parse(await fs.readFile('src/data/products.json','utf8'));
const fetchedAt=new Date().toISOString();
const products=[];
for(const source of sources){
  const response=await get(source.url);
  const data=await response.arrayBuffer();
  const charset=/charset=(?:iso-8859-1|windows-1252)/i.test(response.headers.get('content-type')||'')?'windows-1252':'utf-8';
  const html=new TextDecoder(charset).decode(data);
  const name=decodeHtml((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/property="og:title" content="([^"]+)"/)?.[1]||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim());
  const imageSource=decodeHtml(html.match(/property="og:image" content="([^"]+)"/)?.[1]||'');
  const price=Number(source.mode==='meta'?html.match(/itemprop="price" content="([\d.]+)"/)?.[1]:html.match(/"offers"\s*:\s*\{[\s\S]*?"price"\s*:\s*"([\d.]+)"/)?.[1]);
  if(!name||!imageSource||!Number.isFinite(price)||price<=0)throw Error(`Dados incompletos: ${source.url}`);
  const imageResponse=await get(imageSource);
  const type=imageResponse.headers.get('content-type')||'';
  if(!type.startsWith('image/'))throw Error(`Foto indisponível: ${source.url}`);
  const id='cabo-cerca-'+createHash('sha256').update(source.url).digest('hex').slice(0,12);
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
  const image=`/products/${id}.${ext}`;
  await fs.writeFile(`public${image}`,Buffer.from(await imageResponse.arrayBuffer()));
  products.push({id,name,brand:source.brand,category:'Cabos para cerca elétrica',price,priceBasis:source.basis,source:source.url,sourceName:source.store,seller:source.store,imageSource,image,fetchedAt});
}
const refreshed=new Set(products.map(p=>p.source));
catalog.products=catalog.products.filter(p=>!refreshed.has(p.source));
catalog.products.push(...products);
catalog.products.sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
catalog.fetchedAt=fetchedAt;
await fs.writeFile('src/data/products.json',JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({total:catalog.products.length,added:products.map(p=>({name:p.name,price:p.price,basis:p.priceBasis}))},null,2));
