export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function passwordHash(password,salt,iterations=100000){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations,hash:'SHA-256'},key,256);
  return Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
export function sameOrigin(request){return request.headers.get('Origin')===new URL(request.url).origin&&request.headers.get('Content-Type')?.startsWith('application/json');}
export async function body(request,max=262144){
  const reader=request.body?.getReader();if(!reader)throw Error('empty');let size=0;const chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('size');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function account(request,db){
  const value=(request.headers.get('Cookie')||'').match(/(?:^|;\s*)orcaseg_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!value)return null;
  return db.prepare('SELECT a.id,a.username,s.token_hash FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(value),Date.now()).first();
}
export function cookie(request,value,age=604800){return `orcaseg_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function rateLimit(request,db,action){
  const key=await digest(action+':'+(request.headers.get('CF-Connecting-IP')||'local'));
  const now=Date.now();
  const row=await db.prepare('INSERT INTO rate_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires_at<? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(key,now+900000,now,now).first();
  await db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now).run();
  return row.attempts<=10;
}
