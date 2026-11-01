const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(extra={}){
 const rows=new Map(),removed=[],uploads=[];
 const bucket={upload:async(p,bytes,opts)=>{uploads.push({p,bytes,opts});return{};},createSignedUrl:async p=>({data:{signedUrl:'https://fixture.supabase.co/storage/v1/object/sign/'+p+'?token=fixture'}}),remove:async paths=>{removed.push(...paths);return{};},list:async()=>({data:[]})};
 const storage={getBucket:async()=>({data:{public:false}}),from:()=>bucket,...extra};
 const source=fs.readFileSync(path.join(__dirname,'../lib/social-media.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 const context={...crypto,URL,AbortSignal,Date,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'}},createClient:()=>({storage}),portraitBytes:()=>Buffer.from('fixture-jpeg'),getRow:async k=>rows.get(k),upsertRow:async(k,v)=>rows.set(k,v),deleteRow:async k=>rows.delete(k),sb:async()=>[]};
 const api=vm.runInNewContext(source+';({mediaPath,storeSocialImage,signedSocialImage,queueMediaCleanup,finishMediaCleanup,removeUserMedia})',context);
 return{...api,rows,removed,uploads,bucket};
}
test('photo paths are owner-scoped, immutable and contain no raw user ID',async()=>{
 const f=fixture();const a=await f.storeSocialImage('alice','post','photo'),again=await f.storeSocialImage('alice','post','photo'),b=await f.storeSocialImage('bob','post','photo');
 assert.equal(a,again);assert.notEqual(a,b);assert.ok(!a.includes('alice'));assert.equal(f.uploads[0].opts.upsert,false);assert.equal(f.mediaPath('rico-storage:v1:../../private'),null);
});
test('public or inaccessible buckets cannot accept private photos',async()=>{await assert.rejects(fixture({getBucket:async()=>({data:{public:true}})}).storeSocialImage('owner','post','photo'),/Private photo storage/);});
test('failed cleanup reservation prevents creating an orphan object',async()=>{const f=fixture();await assert.rejects(f.storeSocialImage('owner','post','photo',async()=>{throw Error('database unavailable');}),/database unavailable/);assert.equal(f.uploads.length,0);});
test('signed images are short-lived and restricted to configured storage origin',async()=>{
 const f=fixture(),ref=await f.storeSocialImage('a','p','photo');let ttl;f.bucket.createSignedUrl=async(p,t)=>{ttl=t;return{data:{signedUrl:'https://fixture.supabase.co/file?token=test'}};};
 assert.ok(await f.signedSocialImage(ref));assert.equal(ttl,60);
 f.bucket.createSignedUrl=async()=>({data:{signedUrl:'https://other.invalid/file'}});const another=await f.storeSocialImage('a','other-post','photo');await assert.rejects(f.signedSocialImage(another),/origin/);
});
test('cleanup preserves committed photos and retries unreferenced objects',async()=>{
 const f=fixture(),ref=await f.storeSocialImage('owner','post','photo');f.rows.set('post',{traits:{image:ref}});
 const uploadTask=await f.queueMediaCleanup(ref,'post'),deleteTask=await f.queueMediaCleanup(ref,'post');assert.notEqual(uploadTask,deleteTask);
 await f.finishMediaCleanup(uploadTask);assert.equal(f.removed.length,0);assert.ok(f.rows.has(deleteTask));
 f.rows.delete('post');await f.finishMediaCleanup(deleteTask);assert.equal(f.removed.length,1);assert.equal(f.rows.has(deleteTask),false);
});
test('account photo removal stays within the hashed owner folder',async()=>{
 const f=fixture(),ref=await f.storeSocialImage('owner','post','photo'),name=f.mediaPath(ref).split('/')[1];let called=0;
 f.bucket.list=async folder=>{assert.equal(folder,crypto.createHash('sha256').update('owner').digest('hex'));return{data:called++===0?[{name}]:[]};};
 await f.removeUserMedia('owner');assert.equal(f.removed[0],f.mediaPath(ref));
});
