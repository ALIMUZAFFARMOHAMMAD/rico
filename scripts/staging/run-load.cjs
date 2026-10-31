const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const compose=['compose','-f',path.join(__dirname,'compose.yaml')];
const levels=process.argv.slice(2).length?process.argv.slice(2).map(Number):[10,50,100];
if(levels.some(n=>!Number.isInteger(n)||n<1||n>100))throw Error('Local test is capped at 100 users');
for(const vus of levels){
 console.log('Starting isolated '+vus+'-user load test');
 const r=spawnSync('docker',[...compose,'run','--rm','-T','load'],{env:{...process.env,STAGING_VUS:String(vus),STAGING_DURATION:'90s'},encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(__dirname,'results','load-'+vus+'.log'),r.stdout+'\n'+r.stderr);
 console.log(r.stdout.slice(-600));
 if(r.status!==0){console.error(r.stderr.slice(-1200));process.exit(r.status||1);}
}
