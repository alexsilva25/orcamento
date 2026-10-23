import {json,sameOrigin,body,account} from '../../server/security.js';
import {tableFor,validRecord} from '../../server/data.js';
export async function onRequest({request,env}){
  try{
    if(request.method!=='POST')return json({error:'Método não permitido.'},405);
    if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
    if(!await account(request,env.DB))return json({error:'Entre para importar os dados.'},401);
    const {type,records}=await body(request,1048576);const table=tableFor(type);
    if(!table||!Array.isArray(records)||records.length>25||!records.every(r=>r&&typeof r.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)&&validRecord(type,r.data,r.id)))return json({error:'Existem dados locais inválidos. Eles foram mantidos neste navegador.'},400);
    if(!records.length)return json({imported:0});
    const results=await env.DB.batch(records.map(r=>{const {_version,...data}=r.data;return env.DB.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO NOTHING`).bind(r.id,JSON.stringify(data));}));
    return json({imported:results.reduce((sum,r)=>sum+r.meta.changes,0)});
  }catch{return json({error:'Não foi possível importar. Os dados locais foram preservados.'},500);}
}
