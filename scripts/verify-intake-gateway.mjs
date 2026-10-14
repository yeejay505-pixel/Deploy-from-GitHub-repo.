import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import express from 'express';
import {IntakeStore} from '../intake/gateway-store.mjs';
import {createIntakeRoutes} from '../intake/gateway-routes.mjs';
import {extractRetainedSource,extractSource,applySourceScope} from '../intake/source-extractor.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-gateway-test-'));
const profile=JSON.parse(await fs.readFile(new URL('../quality/approved-visual-reference.json',import.meta.url),'utf8'));
const bindings={research_story:{workflow_id:'fixtureIntelligence',stage:'intelligence',profile_id:profile.profile_id,benchmark_sha256:profile.reference.sha256,contract:'intake-handoff.v1'}};
const config={directory:path.join(root,'store'),profile,allowedChatIds:['8580375575'],bindings};
let now=1000000,store=new IntakeStore({...config,now:()=>now}),checks=0;
const test=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};
const update=(id,text='Explain the office supply gap.',extra={})=>({update_id:id,message:{date:1791043200,message_id:id,chat:{id:8580375575},from:{id:8580375575},text,...extra}});
const event=id=>'TG-8580375575-'+id;
const digest=b=>createHash('sha256').update(b).digest('hex');
const text=Buffer.from('Office demand is projected to grow 41% by 2028.\nCosts may affect net yield.\n');
const sourceUpdate=id=>update(id,undefined,{text:undefined,caption:'Use the supplied source.',document:{file_id:'f'+id,file_unique_id:'u'+id,file_name:'source.txt',mime_type:'text/plain',file_size:text.length}});

try{
 await test('durable reservation returns the original job on retry',()=>{const first=store.retain({telegramUpdate:update(1)});const retry=update(1);retry.update_id=999;const second=store.retain({telegramUpdate:retry});assert.equal(first.duplicate,false);assert.equal(second.duplicate,true);assert.equal(second.job.job_id,first.job.job_id);assert.equal(second.job.release_eligible,false);});
 await test('changed content under an existing event cannot overwrite a job',()=>{assert.throws(()=>store.retain({telegramUpdate:update(1,'Different topic')}),/event_content_conflict/);assert.equal(store.get(event(1)).intake.raw_input,'Explain the office supply gap.');});
 await test('request and original source bytes commit together with a checksum',()=>{const result=store.retain({telegramUpdate:sourceUpdate(2),files:[{bytes:text,fileName:'source.txt'}]});assert.equal(result.job.sources[0].sha256,digest(text));assert.deepEqual(store.sourceBytes(event(2)),text);assert.equal(result.job.status,'source_analysis_pending');});
 await test('corrupted source bytes cannot be read or extracted as valid evidence',()=>{const sha=digest(text);store.db.prepare('UPDATE blobs SET bytes=? WHERE sha256=?').run(Buffer.from('corrupt fixture'),sha);assert.throws(()=>store.sourceBytes(event(2)),/source_integrity_failed/);store.db.prepare('UPDATE blobs SET bytes=? WHERE sha256=?').run(text,sha);});
 await test('missing files, unexpected files and wrong source lengths fail before reservation',()=>{assert.throws(()=>store.retain({telegramUpdate:sourceUpdate(3)}),/source_bytes_required/);assert.throws(()=>store.get(event(3)),/job_not_found/);assert.throws(()=>store.retain({telegramUpdate:update(4),files:[{bytes:text}]}),/unexpected_source_bytes/);const u=sourceUpdate(5);u.message.document.file_size++;assert.throws(()=>store.retain({telegramUpdate:u,files:[{bytes:text}]}),/source_size_mismatch/);});
 await test('source extraction retains source references and unverified claim candidates',async()=>{const job=await extractRetainedSource(store,event(2));assert.equal(job.extraction.status,'extracted');assert.ok(job.extraction.claims.some(c=>c.numbers.some(n=>n.includes('41%'))));assert.ok(job.extraction.claims.every(c=>c.review_required&&c.status==='source_assertion_unverified'));assert.equal(job.extraction.claims[0].source_locations[0].unit_number,1);assert.equal(job.extraction.release_eligible,false);});
 await test('restart retains sources, original brief, extraction and event identity',()=>{store.close();store=new IntakeStore({...config,now:()=>now});assert.equal(store.get(event(2)).extraction.claims.length,2);assert.deepEqual(store.sourceBytes(event(2)),text);assert.equal(store.retain({telegramUpdate:update(1)}).duplicate,true);});
 await test('unbound and mismatched profiles cannot dispatch or downgrade',()=>{store.retain({telegramUpdate:update(6)});const previous=store.bindings;store.bindings={};assert.equal(store.claim(event(6)).reason,'workflow_binding_required');store.bindings={research_story:{...bindings.research_story,profile_id:'old-renderer'}};assert.equal(store.claim(event(6)).reason,'quality_profile_binding_mismatch');store.bindings=previous;});
 await test('production commands and unresolved projects remain behind a trusted adapter',()=>{for(const [id,command] of [[7,'/voice VID-TEST'],[8,'/final VID-TEST'],[9,'/reprelaunch YARDS'],[10,'/assetdone']]){store.retain({telegramUpdate:update(id,command)});assert.equal(store.claim(event(id)).reason,'verified_project_adapter_required');}});
 await test('one handoff lease only and byte-identical receipt retries',()=>{const claim=store.claim(event(1));assert.equal(claim.claimed,true);assert.equal(store.claim(event(1)).claimed,false);assert.equal(claim.handoff.quality_profile.reference.sha256,profile.reference.sha256);const receipt={schema_version:'intake-receipt.v1',idempotency_key:event(1),accepted:true,receipt_id:'fixture-receipt',benchmark_sha256:profile.reference.sha256};assert.throws(()=>store.complete(event(1),'wrong',receipt),/lease_token_mismatch/);assert.equal(store.complete(event(1),claim.lease_token,receipt).status,'handed_off');assert.equal(store.complete(event(1),claim.lease_token,receipt).status,'handed_off');assert.equal(store.claim(event(1)).reason,'already_handed_off');});
 await test('ambiguous downstream outcome blocks an automatic paid retry',()=>{store.retain({telegramUpdate:update(11)});const c=store.claim(event(11));assert.equal(store.complete(event(11),c.lease_token,{accepted:true}).status,'handoff_uncertain');assert.equal(store.claim(event(11)).reason,'reconciliation_required');});
 await test('expired leases after restart require reconciliation rather than a second job',()=>{store.retain({telegramUpdate:update(12)});store.claim(event(12));store.close();now+=300001;store=new IntakeStore({...config,now:()=>now});assert.equal(store.claim(event(12)).reason,'reconciliation_required');assert.equal(store.get(event(12)).attempts,1);});
 await test('known pre-dispatch retries are bounded to three reservations',()=>{store.retain({telegramUpdate:update(13)});for(let i=0;i<3;i++){const c=store.claim(event(13));assert.equal(c.claimed,true);store.releaseUnstarted(event(13),c.lease_token);}assert.equal(store.claim(event(13)).reason,'attempt_limit_reached');});
 await test('parallel processes reserve only one job and one handoff',async()=>{
   const moduleURL=new URL('../intake/gateway-store.mjs',import.meta.url).href;
   const worker=`import {IntakeStore} from ${JSON.stringify(moduleURL)};const s=new IntakeStore(${JSON.stringify(config)});const r=s.retain({telegramUpdate:${JSON.stringify(update(14))}});const c=s.claim(${JSON.stringify(event(14))});s.close();console.log(JSON.stringify({duplicate:r.duplicate,claimed:c.claimed}));`;
   const run=()=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--input-type=module','-e',worker],{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(JSON.parse(out)));});
   const output=await Promise.all(Array.from({length:6},run));assert.equal(output.filter(r=>!r.duplicate).length,1);assert.equal(output.filter(r=>r.claimed).length,1);
 });
 await test('unsupported media and invalid text remain retained for review',async()=>{const bytes=Buffer.from('fixture media');const u=update(15,undefined,{text:undefined,video:{file_id:'video',file_name:'clip.mp4'}});store.retain({telegramUpdate:u,files:[{bytes,fileName:'clip.mp4'}]});const job=await extractRetainedSource(store,event(15));assert.equal(job.extraction.status,'analysis_required');assert.equal(store.claim(event(15)).reason,'source_analysis_required');const bad=await extractSource(Buffer.from([0,1]),'source.txt');assert.equal(bad.status,'failed');});
 if(process.argv[2])await test('real commercial source keeps only slides 4–14 in the claim candidates',async()=>{const bytes=await fs.readFile(process.argv[2]);const all=await extractSource(bytes,path.basename(process.argv[2]));assert.equal(all.status,'extracted');const selected=applySourceScope(all,'Use slides from 4-14, no project pitch.');assert.equal(selected.status,'extracted');assert.equal(selected.units.length,11);assert.ok(selected.claims.length>0);assert.ok(selected.claims.every(c=>c.source_locations.every(r=>r.unit_number>=4&&r.unit_number<=14)));assert.equal(applySourceScope(all,'Use slides 999-1000').status,'failed');});
 await test('authenticated HTTP retention, multipart upload and private source retrieval',async()=>{
   const app=express(),api=createIntakeRoutes({app,directory:path.join(root,'api'),token:'fixture-only',profile,allowedChatIds:['8580375575'],bindings,durableStorageConfirmed:true});
   const listener=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base='http://127.0.0.1:'+listener.address().port+'/intake';
   try{
     const unauth=await fetch(base+'/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({telegram_update:update(20)})});assert.equal(unauth.status,401);
     const post=()=>fetch(base+'/requests',{method:'POST',headers:{Authorization:'Bearer fixture-only','Content-Type':'application/json'},body:JSON.stringify({telegram_update:update(20),release_eligible:true,route_next:'final_assembly'})});
     const first=await post();assert.equal(first.status,201);const j=await first.json();assert.equal(j.job.route,'research_story');assert.equal(j.release_eligible,false);assert.equal((await post()).status,200);
     const form=new FormData();form.append('request',JSON.stringify({telegram_update:sourceUpdate(21)}));form.append('source',new Blob([text],{type:'text/plain'}),'source.txt');const upload=await fetch(base+'/requests',{method:'POST',headers:{Authorization:'Bearer fixture-only'},body:form});assert.equal(upload.status,201);assert.equal((await upload.json()).job.extraction.status,'extracted');
     const source=await fetch(base+'/jobs/'+event(21)+'/source',{headers:{Authorization:'Bearer fixture-only'}});assert.equal(source.headers.get('x-source-sha256'),digest(text));assert.deepEqual(Buffer.from(await source.arrayBuffer()),text);
     const claim=await fetch(base+'/jobs/'+event(20)+'/claim',{method:'POST',headers:{Authorization:'Bearer fixture-only'}});assert.equal((await claim.json()).claimed,true);
   }finally{await new Promise(resolve=>listener.close(resolve));api.close();}
 });
 await test('gateway refuses startup without explicit storage and auth configuration',()=>{assert.throws(()=>createIntakeRoutes({app:express(),directory:path.join(root,'unsafe'),token:'',profile,durableStorageConfirmed:true}),/intake_storage_and_auth_configuration_required/);assert.throws(()=>createIntakeRoutes({app:express(),directory:path.join(root,'unsafe'),token:'fixture',profile}),/intake_storage_and_auth_configuration_required/);});
 await test('private store guard rejects directories inside a served/repository root',()=>{assert.throws(()=>createIntakeRoutes({app:express(),directory:path.join(root,'public','store'),token:'fixture',profile,durableStorageConfirmed:true,forbiddenDirectories:[root]}),/private_store_directory_required/);});
 console.log(`PASS: ${checks} durable gateway checks. Local fixtures; no live deployment, messages or paid generation.`);
}finally{store.close();await fs.rm(root,{recursive:true,force:true});}
