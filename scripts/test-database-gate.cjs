const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../lib/database-gate.js'),'utf8').replace(/export /g,'');
const factory=()=>vm.runInNewContext(code+';createDatabaseGate',{setTimeout,clearTimeout,Date,Error});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('database concurrency and pending queue are bounded; freed slots are reused',async()=>{
 const gate=factory()({concurrency:2,queueLimit:2}),holds=Array.from({length:4},deferred);let started=0;
 const jobs=holds.map(h=>gate(()=>{started++;return h.promise;}));await tick();assert.equal(started,2);
 await assert.rejects(gate(()=>assert.fail('overflow ran')),/temporarily unavailable/);
 holds[0].resolve();await tick();assert.equal(started,3);holds[1].resolve();await tick();assert.equal(started,4);
 holds[2].resolve();holds[3].resolve();await Promise.all(jobs);assert.equal(await gate(()=>42),42);
});
test('expired queued work never executes later',async()=>{
 const gate=factory()({concurrency:1,queueMs:10}),hold=deferred();const running=gate(()=>hold.promise);
 await assert.rejects(gate(()=>assert.fail('expired write ran')),/temporarily unavailable/);
 hold.resolve();await running;assert.equal(await gate(()=>7),7);
});
test('transport failures open circuit; only one probe runs and recovery closes it',async()=>{
 let now=100,calls=0;const gate=factory()({failureLimit:2,cooldownMs:50,now:()=>now});
 const fail=()=>{calls++;throw Error('connection lost');};
 for(let i=0;i<2;i++)await assert.rejects(gate(fail),/connection lost/);
 await assert.rejects(gate(fail),/temporarily unavailable/);assert.equal(calls,2);
 now=151;const hold=deferred();const probe=gate(()=>hold.promise);await tick();
 await assert.rejects(gate(fail),/temporarily unavailable/);
 hold.resolve('recovered');assert.equal(await probe,'recovered');assert.equal(await gate(()=>9),9);
});
test('a failed probe renews the cooldown without replaying a write',async()=>{
 let now=1,calls=0;const gate=factory()({failureLimit:1,cooldownMs:10,now:()=>now});
 const fail=()=>{calls++;throw Error('timeout after possible commit');};
 await assert.rejects(gate(fail));now=12;await assert.rejects(gate(fail));
 now=20;await assert.rejects(gate(fail),/temporarily unavailable/);assert.equal(calls,2);
 now=23;assert.equal(await gate(()=>true),true);
});
test('late successful requests cannot close a newer open circuit',async()=>{
 let now=1;const gate=factory()({failureLimit:1,now:()=>now}),hold=deferred();const stale=gate(()=>hold.promise);
 await assert.rejects(gate(()=>{throw Error('offline');}));hold.resolve();await stale;
 await assert.rejects(gate(()=>assert.fail('circuit bypass')),/temporarily unavailable/);
});
test('valid client errors prove reachability and do not trip the circuit',async()=>{
 const gate=factory()({failureLimit:1});let calls=0;
 for(let i=0;i<7;i++)await assert.rejects(gate(()=>{calls++;const e=Error('conflict');e.databaseReachable=true;throw e;}),/conflict/);
 assert.equal(calls,7);assert.equal(await gate(()=>true),true);
});
test('opening the circuit rejects queued work without executing it',async()=>{
 const gate=factory()({concurrency:1,failureLimit:1}),hold=deferred();const first=gate(()=>hold.promise);
 const queued=gate(()=>assert.fail('queued work ran'));const rejected=assert.rejects(queued,/temporarily unavailable/);
 hold.reject(Error('offline'));await assert.rejects(first,/offline/);await rejected;
});
