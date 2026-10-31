const {spawnSync}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const compose=['compose','-f',path.join(__dirname,'compose.yaml')];
function run(args){const r=spawnSync('docker',[...compose,...args],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr.slice(0,1500));return r.stdout.trim();}
const restored='rico_restore_'+Date.now();
const sql="SELECT count(*)::text || ':' || sum(hashtextextended(row_to_json(c)::text,0)::numeric)::text FROM public.conversations c";
const fingerprint=db=>run(['exec','-T','db','psql','-U','staging_admin','-d',db,'-Atc',sql]);
const before=fingerprint('rico_staging');
run(['exec','-T','db','pg_dump','-U','staging_admin','-d','rico_staging','-Fc','-Z','2','-f','/tmp/rico-staging.dump']);
run(['cp','db:/tmp/rico-staging.dump',path.join(__dirname,'results','synthetic-staging.dump')]);
run(['exec','-T','db','createdb','-U','staging_admin',restored]);
run(['exec','-T','db','pg_restore','-U','staging_admin','-d',restored,'--exit-on-error','--no-owner','/tmp/rico-staging.dump']);
const after=fingerprint(restored);
if(before!==after)throw Error('Restore verification failed; retained local fixture database '+restored);
const rpcCount=run(['exec','-T','db','psql','-U','staging_admin','-d',restored,'-Atc',"SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'rico_%'"]);
if(Number(rpcCount)!==16)throw Error('Restored functions differ');
const result={passed:true,rows:Number(before.split(':')[0]),fingerprintMatched:true,restoredFunctions:Number(rpcCount),backupBytes:fs.statSync(path.join(__dirname,'results','synthetic-staging.dump')).size,scope:'Synthetic local database only; no production offsite backup created'};
fs.writeFileSync(path.join(__dirname,'results','restore.json'),JSON.stringify(result,null,2));
// Only the disposable synthetic database created above is removed.
run(['exec','-T','db','dropdb','-U','staging_admin',restored]);
console.log(JSON.stringify(result));
