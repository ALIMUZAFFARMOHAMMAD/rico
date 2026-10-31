const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const cwd=path.join(__dirname,'..');
const tests=fs.readdirSync(__dirname).filter(f=>/^test-.*\.cjs$/.test(f)&&f!=='test-scale-sql.cjs').map(f=>'scripts/'+f);
const result=spawnSync(process.execPath,['--test',...tests],{cwd,stdio:'inherit',windowsHide:true});
process.exit(result.status ?? 1);
