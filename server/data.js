const types=new Set(['clients','quotes','drafts','preferences']);
export const tableFor = type => types.has(type)?type:null;
const text=(value,max=2000)=>typeof value==='string'&&value.length<=max;
export function validRecord(type,data,id){
  if(!data||typeof data!=='object'||Array.isArray(data)||JSON.stringify(data).length>180000)return false;
  if(type==='clients')return data.id===id&&text(data.name,160)&&!!data.name.trim()&&['phone','email','address','notes','updatedAt'].every(k=>text(data[k],2000))&&(data.archived===undefined||typeof data.archived==='boolean');
  if(type==='preferences')return id==='company'&&text(data.company,160)&&text(data.companyPhone,100);
  if(type==='drafts'&&id!=='current')return false;
  return (type==='quotes'||type==='drafts')&&text(data.id,100)&&data.fields&&typeof data.fields==='object'&&!Array.isArray(data.fields)&&Object.keys(data.fields).length<=30&&Object.values(data.fields).every(v=>text(v,10000))&&Array.isArray(data.items)&&data.items.length<=500&&(type==='drafts'||data.id===id)&&data.items.every(i=>i&&text(i.description,2000)&&Number.isFinite(i.qty)&&i.qty>0&&i.qty<=1000000&&Number.isFinite(i.price)&&i.price>=0&&i.price<=100000000&&(i.image===undefined||(text(i.image,300)&&/^\/products\/[a-zA-Z0-9._-]+$/.test(i.image))));
}
