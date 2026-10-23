import {json} from '../../server/security.js';
export async function onRequest({request,env}){
  if(request.method!=='GET')return json({error:'Método não permitido.'},405);
  try{const result=await env.DB.prepare('SELECT data FROM products ORDER BY rowid').all();return json({products:result.results.map(row=>JSON.parse(row.data))});}
  catch{return json({error:'Não foi possível carregar o catálogo.'},503);}
}
