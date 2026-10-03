// Private durable queue; callers select an event and optionally an immutable reviewed revision.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GatewayError} from './gateway-store.mjs';
import {ReviewedPlanAdapter} from '../intelligence/reviewed-plan-store.mjs';
import {INTELLIGENCE_SCHEMA,validateIntelligencePlan} from '../intelligence/plan-contract.mjs';

export const RENDER_LEASE_MS=45000,MAX_RENDER_ATTEMPTS=3;
const digest=b=>createHash('sha256').update(b).digest('hex');
const jsonHash=o=>digest(JSON.stringify(o));
const root=fileURLToPath(new URL('../',import.meta.url));
const pipelineFiles=['package-lock.json','intake/render-adapter.mjs','intake/render-worker.mjs','scripts/build-measured-guide.py','scripts/compose-source-plan.mjs','scripts/render-source-plan.mjs','src/semantic/scene-composer.mjs','src/semantic/composition-templates.mjs','src/semantic/source-render-binding.mjs','src/semantic/source-renderer.mjs','semantic-preview.mjs','intelligence/plan-contract.mjs'];
// Include every local import dependency; queued inputs cannot silently use a new renderer.
export function renderRuntimeHash(){
 const visited=new Set(),records=[];
 function visit(file){if(visited.has(file))return;visited.add(file);const bytes=fs.readFileSync(path.join(root,file));records.push([file,digest(bytes)]);if(!/\.[mc]?js$/.test(file))return;for(const match of bytes.toString().matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const relative=path.relative(root,path.resolve(root,path.dirname(file),match[1]));if(relative.startsWith('..'))throw Error('pipeline_dependency_outside_repository');visit(relative);}}
 for(const file of pipelineFiles.filter(f=>fs.existsSync(path.join(root,f))))visit(file);
 return jsonHash({files:records.sort((a,b)=>a[0].localeCompare(b[0])),node:process.version,platform:process.platform,arch:process.arch,pipeline:'guide-compose-render-1'});
}
const safeAsset=p=>typeof p==='string'&&/^(assets|fonts)\/[A-Za-z0-9_.\/-]+$/.test(p)&&p.split('/').every(s=>s&&s!=='.'&&s!=='..');
const contained=(rootPath,file)=>file.startsWith(rootPath+path.sep);

export class RenderAdapter {
 constructor(store,{directory,assetDirectory='',guideEnabled=false}={}){
  this.store=store;this.directory=fs.realpathSync(directory);this.assetDirectory=assetDirectory;this.guideEnabled=guideEnabled;this.runtimeHash=renderRuntimeHash();
  this.renderRoot=path.join(this.directory,'source-renders');fs.mkdirSync(this.renderRoot,{recursive:true,mode:0o700});
  if(!contained(this.directory,fs.realpathSync(this.renderRoot)))throw new GatewayError('private_render_directory_required',503);
  store.db.exec(`CREATE TABLE IF NOT EXISTS render_runs (
   event_id TEXT PRIMARY KEY REFERENCES jobs(event_id),input_hash TEXT NOT NULL,input TEXT NOT NULL,status TEXT NOT NULL,
   attempts INTEGER NOT NULL DEFAULT 0,lease_token TEXT,lease_until INTEGER,stage TEXT NOT NULL,progress TEXT,
   error TEXT,report TEXT,artifacts TEXT,receipt TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);`);
 }
 row(id){return this.store.db.prepare('SELECT * FROM render_runs WHERE event_id=?').get(id);}
 get(id){
  this.store.get(id);const r=this.row(id);if(!r)return {event_id:id,status:'not_queued',receipt:null,release_eligible:false};
  const artifacts=r.artifacts?JSON.parse(r.artifacts):{};
  return {event_id:id,status:r.status,stage:r.stage,input_hash:r.input_hash,attempts:r.attempts,progress:r.progress?JSON.parse(r.progress):null,error:r.error,report:r.report?JSON.parse(r.report):null,receipt:r.receipt?JSON.parse(r.receipt):null,
   artifacts:Object.entries(artifacts).map(([key,a])=>({key,sha256:a.sha256,size_bytes:a.size_bytes,mime_type:a.mime_type,path:'/intake/jobs/'+encodeURIComponent(id)+'/render/artifacts/'+key})),
   plan_origin:JSON.parse(r.input).plan_origin??'validated_model_draft',review_revision_id:JSON.parse(r.input).review_revision_id??null,review:{facts_verified:false,voice_status:'guide',creative_approval:'pending',publication:'not_authorized'},release_eligible:false};
 }
 enqueue(id,{reviewRevisionId=''}={}){
  if(typeof reviewRevisionId!=='string')throw new GatewayError('review_revision_id_invalid',400);
  const job=this.store.get(id),prior=this.row(id);
  if(prior){if((JSON.parse(prior.input).review_revision_id??'')!==reviewRevisionId)throw new GatewayError('render_revision_conflict');return {duplicate:true,...this.get(id)};}
  if(!this.guideEnabled||!this.assetDirectory)return {status:'configuration_required',reason:'trusted_assets_and_local_guide_adapter_required',event_id:id,release_eligible:false};
  let intel;
  if(reviewRevisionId){const reviewed=new ReviewedPlanAdapter(this.store).loadForRender(id,reviewRevisionId);intel={status:'validated_draft',plan:JSON.stringify(reviewed.plan),receipt:JSON.stringify(reviewed.receipt)};}
  else intel=this.store.db.prepare('SELECT status,plan,receipt FROM intelligence_runs WHERE event_id=?').get(id);
  if(intel?.status!=='validated_draft')return {status:'intelligence_required',event_id:id,release_eligible:false};
  if(job.intake.reason||job.intake.re_project_key||!['source_brief_intelligence','asset_intelligence'].includes(job.route))return {status:'review_required',reason:'source_render_route_not_supported',event_id:id,release_eligible:false};
  if(job.intake.quality_profile.reference.sha256!==this.store.profile.reference.sha256)throw new GatewayError('stored_quality_profile_changed');
  const raw=JSON.parse(intel.plan),plan=Object.fromEntries(Object.keys(INTELLIGENCE_SCHEMA.properties).map(k=>[k,raw[k]]));validateIntelligencePlan(plan,job);
  // Verify retained source bytes before freezing a reproducible input snapshot.
  const sources=job.sources.map((s,i)=>({path:'assets/source-'+i+'.bin',sha256:s.sha256,bytes:this.store.sourceBytes(id,i)}));
  let catalog,files;
  try{
   const base=fs.realpathSync(this.assetDirectory),file=fs.realpathSync(path.join(base,'asset-catalog.json'));if(!contained(base,file))throw Error('asset_catalog_outside_trusted_directory');
   catalog=JSON.parse(fs.readFileSync(file,'utf8'));if(catalog.profile_id!==plan.profile_id||catalog.benchmark_sha256!==plan.benchmark_sha256)throw Error('asset_catalog_profile_mismatch');
   const seen=new Set();files=[...catalog.fonts,catalog.presenter.asset].map(a=>{
    if(!safeAsset(a.path)||seen.has(a.path)||a.path.startsWith('assets/source-'))throw Error('asset_path_invalid');seen.add(a.path);
    const file=fs.realpathSync(path.join(base,a.path));if(!contained(base,file))throw Error('asset_outside_trusted_directory');const size=fs.statSync(file).size;if(size<1||size>32*1024*1024)throw Error('asset_size_invalid');
    const bytes=fs.readFileSync(file);if(digest(bytes)!==a.sha256)throw Error('asset_checksum_mismatch');return {path:a.path,sha256:a.sha256,bytes};
   });
  }catch(e){throw new GatewayError(/^(asset_|relative_)/.test(e.message)?e.message:'trusted_asset_configuration_invalid',503);}
  files.push(...sources);
  const input={schema_version:'durable-source-render-input.v1',job,plan,catalog,files:files.map(({path,sha256})=>({path,sha256})),intelligence_receipt:JSON.parse(intel.receipt),review_revision_id:reviewRevisionId,plan_origin:reviewRevisionId?'operator_reviewed_revision':'validated_model_draft',runtime_hash:this.runtimeHash,voice_adapter:'local_flite_guide_unapproved'};
  const inputHash=jsonHash(input);
  return this.store.transaction(()=>{
   const concurrent=this.row(id);if(concurrent){if((JSON.parse(concurrent.input).review_revision_id??'')!==reviewRevisionId)throw new GatewayError('render_revision_conflict');return {duplicate:true,...this.get(id)};}
   if(reviewRevisionId)new ReviewedPlanAdapter(this.store).loadForRender(id,reviewRevisionId);
   for(const file of files){const existing=this.store.db.prepare('SELECT bytes FROM blobs WHERE sha256=?').get(file.sha256);if(existing&&digest(Buffer.from(existing.bytes))!==file.sha256)throw new GatewayError('render_input_integrity_failed');this.store.db.prepare('INSERT OR IGNORE INTO blobs(sha256,size_bytes,bytes) VALUES(?,?,?)').run(file.sha256,file.bytes.length,file.bytes);}
   const now=this.store.now();this.store.db.prepare("INSERT INTO render_runs(event_id,input_hash,input,status,stage,created_at,updated_at) VALUES(?,?,?,'queued','queued',?,?)").run(id,inputHash,JSON.stringify(input),now,now);this.store.log(id,'render_queued',{input_hash:inputHash,voice:'guide'});return {duplicate:false,...this.get(id)};
  });
 }
 claim(){
  if(!this.guideEnabled)return null;
  return this.store.transaction(()=>{
   const row=this.store.db.prepare("SELECT * FROM render_runs WHERE status='queued' OR (status='running' AND lease_until<=?) ORDER BY created_at,event_id LIMIT 1").get(this.store.now());if(!row)return null;
   const input=JSON.parse(row.input);
   if(jsonHash(input)!==row.input_hash||input.runtime_hash!==this.runtimeHash||row.attempts>=MAX_RENDER_ATTEMPTS){const error=row.attempts>=MAX_RENDER_ATTEMPTS?'render_attempt_limit_reached':input.runtime_hash!==this.runtimeHash?'render_runtime_changed':'render_input_integrity_failed';this.store.db.prepare("UPDATE render_runs SET status='review_required',stage='review',error=?,updated_at=? WHERE event_id=?").run(error,this.store.now(),row.event_id);this.store.log(row.event_id,'render_review_required',{error});return null;}
   const token=randomUUID(),now=this.store.now();this.store.db.prepare("UPDATE render_runs SET status='running',stage='materializing',lease_token=?,lease_until=?,attempts=attempts+1,progress=NULL,error=NULL,updated_at=? WHERE event_id=?").run(token,now+RENDER_LEASE_MS,now,row.event_id);this.store.log(row.event_id,'render_reserved',{attempt:row.attempts+1,recovered:row.status==='running'});return {id:row.event_id,token,input,inputHash:row.input_hash};
  });
 }
 owned(id,token){const r=this.row(id);if(!r||r.status!=='running'||r.lease_token!==token||r.lease_until<=this.store.now())throw new GatewayError('render_lease_lost');return r;}
 heartbeat(id,token,stage,progress=null){return this.store.transaction(()=>{this.owned(id,token);const now=this.store.now();this.store.db.prepare('UPDATE render_runs SET lease_until=?,stage=?,progress=?,updated_at=? WHERE event_id=?').run(now+RENDER_LEASE_MS,stage,progress?JSON.stringify(progress):null,now,id);});}
 attemptDirectory(id,token){if(!/^[a-f0-9-]{36}$/.test(token))throw new GatewayError('render_token_invalid');return path.join(this.renderRoot,digest(id),token);}
 materialize(claim){
  this.owned(claim.id,claim.token);const directory=this.attemptDirectory(claim.id,claim.token);fs.mkdirSync(directory,{recursive:true,mode:0o700});if(!contained(fs.realpathSync(this.renderRoot),fs.realpathSync(directory)))throw new GatewayError('private_render_directory_required');
  const input=claim.input;
  for(const f of input.files){if(!safeAsset(f.path))throw new GatewayError('render_asset_path_invalid');const b=this.store.db.prepare('SELECT bytes FROM blobs WHERE sha256=?').get(f.sha256);if(!b||digest(Buffer.from(b.bytes))!==f.sha256)throw new GatewayError('render_input_integrity_failed');const file=path.join(directory,f.path);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});if(!contained(fs.realpathSync(directory),fs.realpathSync(path.dirname(file))))throw new GatewayError('render_asset_path_invalid');fs.writeFileSync(file,Buffer.from(b.bytes),{flag:'wx',mode:0o600});}
  for(const [name,value] of Object.entries({'job.json':input.job,'plan.json':input.plan,'asset-catalog.json':input.catalog,'durable-input.json':input}))fs.writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return directory;
 }
 finish(claim,{report,artifacts=null}){
  return this.store.transaction(()=>{
   this.owned(claim.id,claim.token);const complete=artifacts!==null,status=complete?'completed_review':'review_required';
   const receipt=complete?{schema_version:'render-review-receipt.v1',event_id:claim.id,receipt_id:'RENDER-'+jsonHash({id:claim.id,input:claim.inputHash,video:artifacts.video.sha256}).slice(0,24),benchmark_sha256:claim.input.plan.benchmark_sha256,input_hash:claim.inputHash,stage:'render_review',technical_qc:'pass',voice_status:'guide',facts_verified:false,creative_approval:'pending',release_eligible:false}:null;
   this.store.db.prepare('UPDATE render_runs SET status=?,stage=?,lease_until=NULL,report=?,artifacts=?,receipt=?,error=?,updated_at=? WHERE event_id=?').run(status,complete?'review_ready':'review',JSON.stringify(report),artifacts?JSON.stringify(artifacts):null,receipt?JSON.stringify(receipt):null,complete?null:report.code??'composition_review_required',this.store.now(),claim.id);this.store.log(claim.id,'render_'+status,{receipt_id:receipt?.receipt_id??null});return this.get(claim.id);
  });
 }
 artifact(id,key){
  const r=this.row(id);if(!r||r.status!=='completed_review')throw new GatewayError('render_artifact_not_ready',404);
  const a=JSON.parse(r.artifacts)[key];if(!a)throw new GatewayError('render_artifact_not_found',404);
  const hold=code=>{this.store.transaction(()=>{this.store.db.prepare("UPDATE render_runs SET status='review_required',stage='review',receipt=NULL,artifacts=NULL,error=?,updated_at=? WHERE event_id=?").run(code,this.store.now(),id);this.store.log(id,'render_artifact_review_required',{code});});throw new GatewayError(code);};
  let base,file;try{base=fs.realpathSync(this.attemptDirectory(id,r.lease_token));}catch{return hold('render_artifact_missing');}
  if(!contained(fs.realpathSync(this.renderRoot),base))return hold('render_artifact_path_invalid');
  try{file=fs.realpathSync(path.join(base,a.file));}catch{return hold('render_artifact_missing');}
  if(!contained(base,file))return hold('render_artifact_path_invalid');const bytes=fs.readFileSync(file);if(bytes.length!==a.size_bytes||digest(bytes)!==a.sha256)return hold('render_artifact_integrity_failed');return {bytes,...a};
 }
}
