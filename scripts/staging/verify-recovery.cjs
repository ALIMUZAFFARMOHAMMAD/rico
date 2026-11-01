// Stops only this compose project's local REST service; always starts it again.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const compose=['compose','-f',path.join(__dirname,'compose.yaml')];
function run(args){const r=spawnSync('docker',[...compose,...args],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr+'\n'+r.stdout);return r.stdout;}
async function main(){
 let outage;
 try{run(['stop','rest']);outage=JSON.parse(run(['exec','-T','app','node','/app/scripts/staging/fault-client.cjs','outage']));}
 finally{run(['up','-d','rest']);}
 // Allow the deliberate five-second circuit cooldown and REST startup to finish.
 await new Promise(resolve=>setTimeout(resolve,7000));
 const recovered=JSON.parse(run(['exec','-T','app','node','/app/scripts/staging/fault-client.cjs','recovered']));
 fs.writeFileSync(path.join(__dirname,'results/recovery.json'),JSON.stringify({outage,recovered,appRestarted:false},null,2));
 console.log(JSON.stringify({outage,recovered,appRestarted:false}));
}
main().catch(e=>{console.error(e);process.exit(1);});
