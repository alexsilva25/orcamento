import {json,digest,token,passwordHash,equal,sameOrigin,body,account,cookie,rateLimit} from '../../server/security.js';
export async function onRequest({request,env}){
  try{
    if(!env.DB)return json({error:'Banco de dados indisponível.'},503);
    const user=await account(request,env.DB);
    if(request.method==='GET')return json({authenticated:!!user,username:user?.username,setupRequired:!(await env.DB.prepare('SELECT id FROM accounts WHERE id=1').first())});
    if(request.method!=='POST')return json({error:'Método não permitido.'},405);
    if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
    const data=await body(request,8192);
    if(data.action==='logout'){
      if(user)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.token_hash).run();
      return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
    }
    if(!['login','setup','password'].includes(data.action))return json({error:'Ação inválida.'},400);
    if(!await rateLimit(request,env.DB,data.action))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
    const username=typeof data.username==='string'?data.username.trim().toLowerCase():'';
    const password=data.password;
    if(typeof password!=='string'||password.length>256)return json({error:'Informe uma senha válida.'},400);
    let current=await env.DB.prepare('SELECT * FROM accounts WHERE id=1').first();
    if(data.action==='setup'){
      const setup=await env.DB.prepare('SELECT token_hash FROM setup WHERE id=1').first();
      if(current||!setup||typeof data.token!=='string'||!equal(await digest(data.token),setup.token_hash))return json({error:'Link de ativação inválido ou já utilizado.'},403);
      if(!/^[a-z0-9._-]{3,80}$/.test(username)||password.length<12)return json({error:'Use um usuário com 3 a 80 letras/números e senha com ao menos 12 caracteres.'},400);
      const salt=token(),hash=await passwordHash(password,salt);
      await env.DB.batch([env.DB.prepare('INSERT INTO accounts(id,username,password_hash,salt,iterations) VALUES(1,?,?,?,100000)').bind(username,hash,salt),env.DB.prepare('DELETE FROM setup WHERE id=1')]);
      current={id:1,username};
    }else if(data.action==='password'){
      if(!user)return json({error:'Entre para continuar.'},401);
      if(password.length<12||typeof data.currentPassword!=='string'||data.currentPassword.length>256)return json({error:'Informe a senha atual e uma nova senha com ao menos 12 caracteres.'},400);
      if(!equal(await passwordHash(data.currentPassword,current.salt,current.iterations),current.password_hash))return json({error:'Senha atual incorreta.'},403);
      const salt=token(),hash=await passwordHash(password,salt);
      await env.DB.batch([env.DB.prepare('UPDATE accounts SET password_hash=?,salt=?,iterations=100000 WHERE id=1').bind(hash,salt),env.DB.prepare('DELETE FROM sessions WHERE account_id=1')]);
    }else if(!current||username!==current.username||!equal(await passwordHash(password,current.salt,current.iterations),current.password_hash))return json({error:'Usuário ou senha incorretos.'},401);
    const session=token();
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),env.DB.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,1,?)').bind(await digest(session),Date.now()+604800000)]);
    return json({ok:true,username:current.username},200,{'Set-Cookie':cookie(request,session)});
  }catch{return json({error:'Não foi possível concluir o acesso. Tente novamente.'},500);}
}
