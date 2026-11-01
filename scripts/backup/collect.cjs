// Run only through run-encrypted.ps1: successful stdout contains private data.
// Credentials stay in memory. Only two named Vercel env values are retrieved.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MAX_BYTES=64*1024*1024;
let stage='configuration';
async function boundedJson(response){
 if(!response.ok){await response.body?.cancel();const error=Error('Backup source unavailable');error.httpStatus=response.status;throw error;}
 const reader=response.body.getReader(),parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw Error('Backup exceeds the configured 64 MiB limit');}parts.push(Buffer.from(value));}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
async function credentials(config){
 if(process.env.RICO_BACKUP_SERVICE_KEY)return {NEXT_PUBLIC_SUPABASE_URL:config.supabaseOrigin,SUPABASE_SERVICE_ROLE_KEY:process.env.RICO_BACKUP_SERVICE_KEY};
 stage='desktop login';
 const auth=JSON.parse(fs.readFileSync(config.vercelAuthPath,'utf8'));
 if(!auth.token)throw Error('Vercel desktop login must be refreshed');
 const base='https://api.vercel.com',team='?teamId='+encodeURIComponent(config.teamId);
 const api=route=>fetch(base+route,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(30000)}).then(boundedJson);
 stage='environment metadata';
 const listing=await api('/v10/projects/'+encodeURIComponent(config.projectId)+'/env'+team+'&decrypt=false');
 const values={};
 for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']){
  stage='requested '+key;
  const matches=listing.envs.filter(e=>e.key===key&&e.target?.includes('production')&&!e.gitBranch);
  if(matches.length!==1)throw Error('Expected one production '+key+' configuration');
  const item=await api('/v1/projects/'+encodeURIComponent(config.projectId)+'/env/'+encodeURIComponent(matches[0].id)+team);
  if(typeof item.value!=='string'||!item.value)throw Error('Requested backup credential is unavailable');values[key]=item.value;
 }
 stage='project origin check';
 if(new URL(values.NEXT_PUBLIC_SUPABASE_URL).origin!==config.supabaseOrigin)throw Error('Backup project origin mismatch');
 return values;
}
async function collect(config){
 const creds=await credentials(config),origin=config.supabaseOrigin;
 const headers={apikey:creds.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+creds.SUPABASE_SERVICE_ROLE_KEY};
 stage='private snapshot';
 const snap=await fetch(origin+'/rest/v1/rpc/rico_backup_snapshot',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(60000)}).then(boundedJson);
 if(snap.format!=='ricomates-application-data-v2'||!Array.isArray(snap.tables?.conversations))throw Error('Unexpected snapshot format');
 snap.files=[];let total=Buffer.byteLength(JSON.stringify(snap));
 for(const object of snap.storageObjects){
  stage='private photo download';
  if(object.bucket!=='rico-social-photos'||! /^[a-f0-9]{64}\/[a-f0-9]{64}-[a-f0-9]{64}\.jpg$/.test(object.name))throw Error('Unexpected private photo path');
  const r=await fetch(origin+'/storage/v1/object/'+object.bucket+'/'+object.name,{headers,signal:AbortSignal.timeout(30000)});
  if(!r.ok){await r.body?.cancel();throw Error('A snapshot photo became unavailable; previous backups retained');}
  const reader=r.body.getReader(),parts=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();throw Error('Photo size exceeds application limit');}parts.push(Buffer.from(value));}
  const bytes=Buffer.concat(parts);total+=Math.ceil(bytes.length*4/3);if(total>MAX_BYTES)throw Error('Backup exceeds the configured 64 MiB limit');
  snap.files.push({bucket:object.bucket,name:object.name,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')});
 }
 // Capture schema source with the records; never package env/config/credentials.
 snap.migrations=fs.readdirSync(path.join(__dirname,'../../migrations')).filter(f=>f.endsWith('.sql')).map(name=>({name,sql:fs.readFileSync(path.join(__dirname,'../../migrations',name),'utf8')}));
 return snap;
}
module.exports={boundedJson,collect};
if(require.main===module){
 if(process.env.RICO_ENCRYPTED_BACKUP_WRAPPER!=='1')throw Error('Use run-encrypted.ps1 so private data is never printed');
 collect(JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''))).then(s=>process.stdout.write(JSON.stringify(s))).catch(error=>{console.error('Backup collection failed at '+stage+(Number.isInteger(error.httpStatus)?' (HTTP '+error.httpStatus+')':error.message==='Requested backup credential is unavailable'?' (value not retrievable)':error.message?.startsWith('Expected one production')?' (missing or ambiguous variable)':'')+'. No secrets or records were logged.');process.exitCode=1;});
}
