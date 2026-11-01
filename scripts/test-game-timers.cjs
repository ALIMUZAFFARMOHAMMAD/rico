const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/game-timers.js'),'utf8').replace('export ','')+'\nmodule.exports={createGameTimers};',context);
function fixture(){const jobs=new Map(),cancelled=[];let next=0;const timers=context.module.exports.createGameTimers(fn=>{jobs.set(++next,fn);return next;},id=>cancelled.push(id));return {timers,jobs,cancelled};}
test('reset suppresses an old opponent move even if its callback was already queued',()=>{const f=fixture();let moves=0;f.timers.schedule(()=>moves++,600);const stale=f.jobs.get(1);f.timers.cancel();stale();assert.equal(moves,0);assert.deepEqual(f.cancelled,[1]);});
test('new round can schedule opponent moves after a reset',()=>{const f=fixture();let moves=0;f.timers.schedule(()=>moves+=100,600);f.timers.cancel();f.timers.schedule(()=>moves++,600);f.jobs.get(1)();f.jobs.get(2)();assert.equal(moves,1);});
test('closing a game cancels chained opponent turns',()=>{const f=fixture();let moves=0;f.timers.schedule(()=>{moves++;f.timers.schedule(()=>moves++,500);},600);f.jobs.get(1)();f.timers.cancel();f.jobs.get(2)();assert.equal(moves,1);assert.deepEqual(f.cancelled,[2]);});
test('completed timers are released and repeated cleanup is harmless',()=>{const f=fixture();f.timers.schedule(()=>{},600);f.jobs.get(1)();f.timers.cancel();f.timers.cancel();assert.deepEqual(f.cancelled,[]);});
