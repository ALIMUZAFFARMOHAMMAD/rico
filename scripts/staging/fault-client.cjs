const assert=require('node:assert/strict');
if(process.env.RICO_ISOLATED_STAGING!=='synthetic-only')throw Error('Local staging only');
const phase=process.argv[2];
if(!['outage','recovered'].includes(phase))throw Error('Explicit phase required');
async function main(){
 const handshake=await fetch('http://127.0.0.1:3380/__staging').then(r=>r.json());
 assert.equal(handshake.isolated,true);assert.equal(handshake.providersDisabled,true);
 // A half-open worker deliberately admits one probe and rejects concurrent
 // callers until that probe succeeds. Observe this recovery wave separately.
 let probeStatuses=[];
 if(phase==='recovered'){
  probeStatuses=await Promise.all(Array.from({length:20},async(_,i)=>{
   const user='fixture-user-'+(960000+i);
   const r=await fetch('http://127.0.0.1:3380/api/social?userId='+user+'&filter=saved',{headers:{Cookie:'staging_user='+user},signal:AbortSignal.timeout(20000)});
   await r.text();assert.ok([200,429,503].includes(r.status));return r.status;
  }));
  assert.ok(probeStatuses.includes(200),'At least one recovery probe must succeed');
 }
 const started=performance.now();
 async function batch(count){return Promise.all(Array.from({length:count},async(_,i)=>{
  const user='fixture-user-'+(950000+i);
  const r=await fetch('http://127.0.0.1:3380/api/social?userId='+user+'&filter=saved',{headers:{Cookie:'staging_user='+user},signal:AbortSignal.timeout(20000)});
  const body=await r.json();
  if(phase==='outage'){assert.ok([429,503].includes(r.status));assert.equal(body.posts,undefined);}
  else {assert.equal(r.status,200);assert.ok(Array.isArray(body.posts));}
  return r.status;
 }));}
 const results=await batch(phase==='outage'?100:20);
 const elapsedMs=performance.now()-started;
 assert.ok(elapsedMs<20000);
 let circuitRejectionMs=null;
 if(phase==='outage'){const circuitStart=performance.now();await batch(20);circuitRejectionMs=performance.now()-circuitStart;assert.ok(circuitRejectionMs<3000);}
 console.log(JSON.stringify({phase,requests:results.length,elapsedMs,circuitRejectionMs,probeStatuses,statuses:results.reduce((counts,s)=>(counts[s]=(counts[s]||0)+1,counts),{}),passed:true,paidCalls:0}));
}
main().catch(e=>{console.error(e);process.exit(1);});
