export type Versioned = {_version?:number};
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch('/api/'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});
  const result=await response.json().catch(()=>({error:'O servidor está indisponível. Tente novamente.'}));
  if(response.status===401&&!path.startsWith('auth')){location.assign('/entrar/?voltar='+encodeURIComponent(location.pathname));throw Error('Entre novamente. O rascunho foi preservado neste navegador.');}
  if(!response.ok)throw new ApiError(result.error||'Não foi possível salvar no banco. Tente novamente.',response.status);
  return result;
}
export const listRecords=async<T>(type:string):Promise<(T&Versioned)[]> => (await api<{records:(T&Versioned)[]}>('data/'+type)).records;
export const getRecord=async<T>(type:string,id:string):Promise<(T&Versioned)|null> => (await api<{record:(T&Versioned)|null}>('data/'+type+'/'+encodeURIComponent(id))).record;
export async function putRecord<T extends Versioned>(type:string,id:string,data:T):Promise<T&Versioned>{
  const result=await api<{version:number}>('data/'+type+'/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({data,version:data._version||0})});
  return {...data,_version:result.version};
}
export const removeRecord=(type:string,id:string,version:number)=>api('data/'+type+'/'+encodeURIComponent(id),{method:'DELETE',body:JSON.stringify({version})});
let initialization:Promise<void>|undefined;
export function initCloud(){return initialization??=initialize();}
async function initialize(){
  const status=await api<{authenticated:boolean}>('auth');
  if(!status.authenticated){location.replace('/entrar/?voltar='+encodeURIComponent(location.pathname));throw Error('Entre para acessar seus dados.');}
  // Each old record is inserted only if its id does not exist, including tombstones.
  // Repeating an interrupted import cannot replace a newer online edit.
  if(!localStorage.getItem('orcaseg-d1-import-v1')){
    let count=0;
    for(const [type,key] of [['clients','orcaseg-clients-v1'],['quotes','orcaseg-quotes-v1']]){
      const values=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(values))throw Error('Há dados antigos inválidos no navegador. Eles foram preservados; contate o suporte para importá-los.');
      for(let i=0;i<values.length;i+=10){const batch=values.slice(i,i+10).map(data=>({id:data.id,data}));const result=await api<{imported:number}>('import',{method:'POST',body:JSON.stringify({type,records:batch})});count+=result.imported;}
    }
    localStorage.setItem('orcaseg-d1-import-v1','done');
    if(count)sessionStorage.setItem('orcaseg-import-message',count+' registro(s) antigo(s) importado(s) para o banco.');
  }
}
export function showCloudError(error:unknown){
  document.body.dataset.ready='true';
  const notice=document.createElement('div');notice.className='cloud-notice';notice.setAttribute('role','alert');
  notice.append(document.createTextNode(error instanceof Error?error.message:'Não foi possível carregar o banco de dados.'));
  const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();notice.append(retry);
  document.querySelector('main')?.prepend(notice);
  document.querySelectorAll<HTMLButtonElement>('form button').forEach(button=>button.disabled=true);
}
