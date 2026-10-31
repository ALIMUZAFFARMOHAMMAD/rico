// Standalone integration harness, never imported by Next.js or deployed as a route.
// Runs actual API/lib modules with local-only HTTP and synthetic Clerk identity.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const vm=require('node:vm'),crypto=require('node:crypto'),cluster=require('node:cluster');
if(process.env.RICO_ISOLATED_STAGING!=='synthetic-only')throw Error('Use the isolated staging compose project');
const root=path.resolve(__dirname,'../..');
const secret='local-staging-fixtures-only-never-production-2026';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const head=encode({alg:'HS256',typ:'JWT'}),payload=encode({role:'service_role',exp:Math.floor(Date.now()/1000)+86400});
const token=head+'.'+payload+'.'+crypto.createHmac('sha256',secret).update(head+'.'+payload).digest('base64url');
const env={NEXT_PUBLIC_SUPABASE_URL:'http://rest:3000',SUPABASE_SERVICE_ROLE_KEY:token,SCALE_STORAGE_ENABLED:'true',AI_GENERATION_DISABLED:'true',AI_DAILY_REQUEST_LIMIT:'0',AI_MAX_CONCURRENT:'0'};
let requests=0,errors=0,blockedExternal=0;
async function localFetch(input,options) {
  const u=new URL(input);
  if(u.origin!=='http://rest:3000'||!u.pathname.startsWith('/rest/v1/')){blockedExternal++;throw Error('Staging network denied');}
  u.pathname=u.pathname.slice('/rest/v1'.length);
  return fetch(u,options);
}
function getAuth(req) {
  const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)staging_user=(fixture-user-\d+)(?:;|$)/);
  return {userId:cookie?.[1]||null};
}
const ctx=vm.createContext({console,Buffer,URL,AbortSignal,Response,Request,Headers,ReadableStream,Blob,TextEncoder,TextDecoder,setTimeout,clearTimeout,process:{env},fetch:localFetch});
const cache=new Map();
const linking=new Map();
function synthetic(key,values) {if(!cache.has(key))cache.set(key,new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context:ctx}));return cache.get(key);}
async function moduleFor(file) {
  if(cache.has(file)){if(linking.has(file))await linking.get(file);return cache.get(file);}
  if(!file.startsWith(root+path.sep)||!file.endsWith('.js'))throw Error('Unexpected source import');
  const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context:ctx});cache.set(file,m);
  const ready=m.link(async(spec,from)=>{
    if(spec==='crypto')return synthetic('crypto',crypto);
    if(spec==='@clerk/nextjs/server')return synthetic('clerk',{getAuth});
    if(spec==='@supabase/supabase-js')return synthetic('storage',{createClient:()=>{throw Error('External object storage is disabled in local load tests');}});
    if(!spec.startsWith('.'))throw Error('Unexpected external import '+spec);
    let target=path.resolve(path.dirname(from.identifier),spec);if(!target.endsWith('.js'))target+='.js';
    return moduleFor(target);
  });linking.set(file,ready);await ready;return m;
}
async function serve() {
  const handlers={};
  for(const [route,file] of Object.entries({'/api/social':'social','/api/conversation':'conversation','/api/health':'health'})){
    const m=await moduleFor(path.join(root,'pages/api',file+'.js'));await m.evaluate();handlers[route]=m.namespace.default;
  }
  const server=http.createServer(async(req,res)=>{
    requests++;const start=performance.now();
    const u=new URL(req.url,'http://app:3380');
    res.setHeader('X-Ricomates-Staging','synthetic-only');
    res.setHeader('Cache-Control','no-store');
    if(u.pathname==='/__staging'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({isolated:true,auth:'synthetic Clerk adapter',providersDisabled:env.AI_GENERATION_DISABLED==='true',requests,errors,blockedExternal,worker:process.pid}));}
    if(!handlers[u.pathname]){res.statusCode=404;return res.end();}
    req.query=Object.fromEntries(u.searchParams);
    res.status=code=>{res.statusCode=code;return res;};
    res.json=data=>{res.setHeader('Content-Type','application/json');res.setHeader('Server-Timing',`app;dur=${(performance.now()-start).toFixed(2)}`);res.end(JSON.stringify(data));return res;};
    res.send=body=>{res.end(body);return res;};
    try {
      let bytes=0,parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>460800){res.statusCode=413;return res.end();}parts.push(chunk);}
      req.body=bytes?JSON.parse(Buffer.concat(parts).toString('utf8')):{};
      await handlers[u.pathname](req,res);
    }catch(error){errors++;console.error('staging handler error',error.message);if(!res.headersSent)res.statusCode=500;if(!res.writableEnded)res.end(JSON.stringify({error:'Staging operation failed'}));}
  });
  server.requestTimeout=20000;server.headersTimeout=10000;
  server.listen(3380,'0.0.0.0',()=>console.log('Isolated staging worker ready'));
}
if(cluster.isPrimary){for(let i=0;i<Math.min(4,Math.max(1,Number(process.env.STAGING_WORKERS)||2));i++)cluster.fork();cluster.on('exit',()=>{console.error('Staging worker stopped');process.exitCode=1;});}
else serve().catch(e=>{console.error(e);process.exit(1);});
