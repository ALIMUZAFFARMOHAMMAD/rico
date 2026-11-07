const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('replacement linter rejects broken hooks, duplicate JSX props and unsafe eval',()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'rico-lint-'));
 try{
  const file=path.join(dir,'fixture.jsx');
  fs.writeFileSync(file,"import {useState} from 'react'; export default function Fixture({yes}) { if (yes) useState(0); eval('unsafe'); return <button title='one' title='two'>Test</button>; }");
  const r=spawnSync(process.execPath,[path.join(root,'node_modules/oxlint/bin/oxlint'),'--config',path.join(root,'.oxlintrc.json'),file],{encoding:'utf8',windowsHide:true});
  assert.notEqual(r.status,0);const text=r.stdout+r.stderr;
  for(const rule of ['rules-of-hooks','jsx-no-duplicate-props','no-eval'])assert.ok(text.includes(rule),'Missing rule '+rule);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
