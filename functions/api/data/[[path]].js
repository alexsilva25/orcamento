import {json,sameOrigin,body,account} from '../../../server/security.js';
import {tableFor,validRecord} from '../../../server/data.js';
export async function onRequest({request,env,params}){
  try{
    if(!env.DB)return json({error:'Banco de dados indisponível.'},503);
    if(!await account(request,env.DB))return json({error:'Entre na sua conta para continuar.'},401);
    const parts=Array.isArray(params.path)?params.path:[params.path];const table=tableFor(parts[0]);const id=parts[1];
    if(!table||parts.length>2)return json({error:'Recurso não encontrado.'},404);
    if(request.method==='GET'){
      if(id){const row=await env.DB.prepare(`SELECT data,version FROM ${table} WHERE id=? AND deleted=0`).bind(id).first();return json({record:row?{...JSON.parse(row.data),_version:row.version}:null});}
      const result=await env.DB.prepare(`SELECT data,version FROM ${table} WHERE deleted=0 ORDER BY updated_at DESC,id`).all();return json({records:result.results.map(row=>({...JSON.parse(row.data),_version:row.version}))});
    }
    if(!['PUT','DELETE'].includes(request.method))return json({error:'Método não permitido.'},405);
    if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
    if(!id||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return json({error:'Identificador inválido.'},400);
    const input=await body(request);const version=input.version;
    if(!Number.isInteger(version)||version<0)return json({error:'Versão inválida.'},400);
    let row;
    if(request.method==='DELETE'){
      if(table!=='quotes')return json({error:'Arquive o cadastro para mantê-lo recuperável.'},405);
      row=await env.DB.prepare(`UPDATE ${table} SET deleted=1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND deleted=0 RETURNING version`).bind(id,version).first();
    }else{
      const data=input.data;if(!validRecord(table,data,id))return json({error:'Dados inválidos. Confira os campos.'},400);
      const {_version,...clean}=data;
      if(version===0)row=await env.DB.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO NOTHING RETURNING version`).bind(id,JSON.stringify(clean)).first();
      else row=await env.DB.prepare(`UPDATE ${table} SET data=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND deleted=0 RETURNING version`).bind(JSON.stringify(clean),id,version).first();
    }
    if(!row)return json({error:'Este registro mudou em outro dispositivo. Atualize a página antes de salvar novamente.'},409);
    return json({version:row.version});
  }catch{return json({error:'Não foi possível acessar o banco. Seus dados em edição foram preservados.'},500);}
}
