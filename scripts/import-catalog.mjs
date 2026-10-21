import fs from 'node:fs/promises';

const fetchedAt = new Date().toISOString();
const products = [];
const raw = [];
for(let start=0;start<1000;start+=50){
  const response=await fetch(`https://loja.intelbras.com.br/api/catalog_system/pub/products/search?_from=${start}&_to=${start+49}`);
  if(!response.ok)throw Error(`Catálogo indisponível: HTTP ${response.status}`);
  const batch=await response.json();raw.push(...batch);if(batch.length<50)break;
}
const classify = (name, cats = '') => {
  const text = `${name} ${cats}`;
  if (/cerca|eletrificador|haste|arame/i.test(text)) return 'Cercas elétricas';
  if (/alarme|sensor|sirene|detector|segurança smart/i.test(text)) return 'Alarmes e sensores';
  if (/gravador|\bdvr\b|\bnvr\b/i.test(text)) return 'Gravadores';
  if (/câmera|camera/i.test(text)) return 'Câmeras';
  if (/fechadura/i.test(text)) return 'Fechaduras';
  if (/interfone|porteiro|videoporteiro/i.test(text)) return 'Interfones e videoporteiros';
  if (/nobreak|fontes de alimentação/i.test(text)) return 'Energia e nobreaks';
  if (/switch|poe|rack|cabos para rede/i.test(text)) return 'Redes e infraestrutura';
  if (/armazenamento|cartão|microsd|disco|ssd/i.test(text)) return 'Armazenamento';
  if (/portão|automatizador/i.test(text)) return 'Automatizadores de portão';
  if (/emergência/i.test(text)) return 'Sinalização de emergência';
  return 'Acessórios e automação';
};
for (const p of raw) {
  const categories = p.categories || [];
  if (!categories.some(c => /^\/(Segurança eletrônica|Controle de Acesso)\//.test(c) || /Nobreaks|Fontes de Alimentação|Switches|Injetores PoE|Cabos para rede|Racks/.test(c))) continue;
  const sku = p.items.find(i => i.images?.length && i.sellers.some(s => s.commertialOffer?.Price > 0 && s.commertialOffer.IsAvailable));
  if (!sku) continue;
  const seller = sku.sellers.find(s => s.commertialOffer?.Price > 0 && s.commertialOffer.IsAvailable);
  products.push({ id: `intelbras-${p.productId}`, name: p.productName, brand: 'Intelbras', category: classify(p.productName, categories.join(' ')), price: seller.commertialOffer.Price, priceBasis: 'Preço anunciado', source: p.link, sourceName: 'Loja Intelbras', seller: seller.sellerName, imageSource: sku.images[0].imageUrl, fetchedAt });
}

const shop = 'https://intelbras-eletro.lojaintegrada.com.br';
const pages = ['/dvr', '/central-de-alarme', '/sensores-intelbras', '/sirene-16975670'];
const links = new Set([`${shop}/vhl-1120-b`, `${shop}/vhl-1120-d`]);
for (const page of pages) {
  const response = await fetch(shop + page);
  if (!response.ok) continue;
  const html = await response.text();
  for (const match of html.matchAll(/<a\s+href="([^"]+)"\s+class="nome-produto\b/g)) links.add(match[1]);
}
for (const url of links) {
  const response = await fetch(url);
  if (!response.ok) continue;
  const html = await response.text();
  const name = html.match(/property="og:title" content="([^"]+)"/)?.[1];
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const price = Number(html.match(/itemprop="price" content="([\d.]+)"/)?.[1]);
  if (!name || !image || !price) continue;
  products.push({ id: `eletro-${products.length}`, name, brand: 'Intelbras', category: classify(name), price, priceBasis: 'À vista / Pix', source: url, sourceName: 'Intelbras Eletro (revenda)', seller: 'Intelbras Eletro', imageSource: image, fetchedAt });
}

// Complemento: centrais de cerca e acessórios com preço e fotografia na página.
const fenceShop = 'https://detecta-company.lojaintegrada.com.br/';
const fenceHtml = await (await fetch(fenceShop)).text();
const fenceLinks = [...fenceHtml.matchAll(/<a\s+href="([^"]+)"\s+class="nome-produto\b[^>]*>([\s\S]*?)<\/a>/g)].filter(m => /cerca|haste|arame/i.test(m[2]));
for (const match of [...new Map(fenceLinks.map(m=>[m[1],m])).values()]) {
  const url = match[1];
  const response = await fetch(url);
  if (!response.ok) continue;
  const html = await response.text();
  const name = html.match(/property="og:title" content="([^"]+)"/)?.[1];
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const price = Number(html.match(/itemprop="price" content="([\d.]+)"/)?.[1]);
  if (name && image && price) products.push({id:`detecta-${products.length}`,name,brand:/intelbras/i.test(name)?'Intelbras':'Conforme fornecedor',category:'Cercas elétricas',price,priceBasis:'Preço à vista anunciado',source:url,sourceName:'Detecta Company',seller:'Detecta Company',imageSource:image,fetchedAt});
}

await fs.mkdir('public/products', {recursive:true});
const failures = [];
// Four image downloads at a time; only verified product photographs are kept.
for(let start=0;start<products.length;start+=4) {
  await Promise.all(products.slice(start,start+4).map(async p=>{
    try {
      const response = await fetch(p.imageSource);
      const contentType = response.headers.get('content-type') || '';
      if(!response.ok || !contentType.startsWith('image/')) throw Error('Imagem indisponível');
      const ext = contentType.includes('png')?'png':contentType.includes('webp')?'webp':'jpg';
      p.image = `/products/${p.id}.${ext}`;
      await fs.writeFile(`public${p.image}`, Buffer.from(await response.arrayBuffer()));
    } catch { failures.push(p.id); }
  }));
}
const verified = products.filter(p=>!failures.includes(p.id)).sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
await fs.writeFile('src/data/products.json',JSON.stringify({fetchedAt,products:verified},null,2)+'\n');
console.log(JSON.stringify({count:verified.length,failedImages:failures,categories:Object.fromEntries([...new Set(verified.map(p=>p.category))].map(c=>[c,verified.filter(p=>p.category===c).length]))},null,2));
