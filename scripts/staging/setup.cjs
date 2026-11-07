const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),compose=['compose','-f',path.join(__dirname,'compose.yaml')];
function run(args,input){const r=spawnSync('docker',[...compose,...args],{cwd:root,input,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);if(r.status!==0)throw Error('Staging command failed: '+args.slice(0,3).join(' '));}
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
run(['up','-d','--wait','db']);
run(['exec','-T','db','psql','-v','ON_ERROR_STOP=1','-U','staging_admin','-d','rico_staging'],fs.readFileSync(path.join(root,'migrations/20261031_scale.sql'),'utf8'));
for(const file of ['20261031_private_tables.sql','20261031_social_lookup.sql'])run(['exec','-T','db','psql','-v','ON_ERROR_STOP=1','-U','staging_admin','-d','rico_staging'],fs.readFileSync(path.join(root,'migrations',file),'utf8'));
run(['exec','-T','db','psql','-v','ON_ERROR_STOP=1','-U','staging_admin','-d','rico_staging'],fs.readFileSync(path.join(__dirname,'seed.sql'),'utf8'));
run(['up','-d','rest','app']);
console.log('Local staging started; production data and AI providers are not connected.');
