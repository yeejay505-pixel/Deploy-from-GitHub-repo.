// Explicit operator revisions are separate from provider responses and paid reservations.
import {createHash} from 'node:crypto';
import {GatewayError} from '../intake/gateway-store.mjs';
import {sourceContext,validateIntelligencePlan} from './plan-contract.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export class ReviewedPlanAdapter {
 constructor(store,{enabled=false}={}){
  this.store=store;this.enabled=enabled;
  store.db.exec(`CREATE TABLE IF NOT EXISTS intelligence_review_revisions (
   revision_id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES jobs(event_id),ordinal INTEGER NOT NULL,
   parent_revision_id TEXT,base_review_hash TEXT NOT NULL,input_hash TEXT NOT NULL,request_hash TEXT NOT NULL,
   plan_hash TEXT NOT NULL,plan TEXT NOT NULL,receipt TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,
   UNIQUE(event_id,ordinal),UNIQUE(event_id,request_hash));`);
 }
 row(id,revision){return this.store.db.prepare('SELECT * FROM intelligence_review_revisions WHERE event_id=? AND revision_id=?').get(id,revision);}
 summary(r){return {revision_id:r.revision_id,ordinal:r.ordinal,parent_revision_id:r.parent_revision_id,base_review_hash:r.base_review_hash,input_hash:r.input_hash,plan_hash:r.plan_hash,reason:r.reason,created_at:r.created_at,origin:'operator_reviewed_revision',status:'validated_reviewed_draft',release_eligible:false};}
 list(id){this.store.get(id);return {event_id:id,revisions:this.store.db.prepare('SELECT * FROM intelligence_review_revisions WHERE event_id=? ORDER BY ordinal').all(id).map(r=>this.summary(r)),release_eligible:false};}
 get(id,revision){this.store.get(id);const r=this.row(id,revision);if(!r)throw new GatewayError('review_revision_not_found',404);const plan=JSON.parse(r.plan);if(hash(plan)!==r.plan_hash)throw new GatewayError('review_revision_integrity_failed');return {event_id:id,...this.summary(r),plan,receipt:JSON.parse(r.receipt),review:{facts_verified:false,voice_approved:false,creative_approval:'pending',publication:'not_authorized'},release_eligible:false};}
 loadForRender(id,revision){
  const result=this.get(id,revision),r=this.row(id,revision),job=this.store.get(id);
  const original=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
  if(!original||original.status!=='review_required'||hash(original)!==r.base_review_hash)throw new GatewayError('review_base_changed');
  if(hash(sourceContext(job))!==r.input_hash||original.input_hash!==r.input_hash)throw new GatewayError('review_source_changed');
  if(job.intake.quality_profile.reference.sha256!==this.store.profile.reference.sha256)throw new GatewayError('stored_quality_profile_changed');
  validateIntelligencePlan(result.plan,job);return result;
 }
 submit(id,input={}){
  if(!this.enabled)throw new GatewayError('reviewed_plan_submission_disabled',503);
  const keys=['expected_review_hash','expected_parent_revision_id','reason','acknowledge_source_assertions_unverified','plan'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(input,k))||input.acknowledge_source_assertions_unverified!==true||typeof input.expected_review_hash!=='string'||!/^[a-f0-9]{64}$/.test(input.expected_review_hash)||(input.expected_parent_revision_id!==null&&typeof input.expected_parent_revision_id!=='string')||typeof input.reason!=='string'||input.reason.trim().length<12||input.reason.length>1000)throw new GatewayError('explicit_review_revision_required',400);
  return this.store.transaction(()=>{
   const original=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
   if(!original||original.status!=='review_required'||!original.response_id)throw new GatewayError('completed_review_failure_required');
   if(hash(original)!==input.expected_review_hash)throw new GatewayError('review_base_conflict');
   const job=this.store.get(id),inputHash=hash(sourceContext(job));
   if(original.input_hash!==inputHash)throw new GatewayError('intelligence_input_conflict');
   if(job.intake.quality_profile.reference.sha256!==this.store.profile.reference.sha256)throw new GatewayError('stored_quality_profile_changed');
   // Retained bytes must still match; a valid claim ledger alone is insufficient.
   for(let i=0;i<job.sources.length;i++)this.store.sourceBytes(id,i);
   try{validateIntelligencePlan(input.plan,job);}catch(e){throw new GatewayError('review_plan_invalid:'+e.message,400);}
   const plan=structuredClone(input.plan),reason=input.reason.trim(),requestHash=hash({base:input.expected_review_hash,parent:input.expected_parent_revision_id,reason,plan});
   const duplicate=this.store.db.prepare('SELECT * FROM intelligence_review_revisions WHERE event_id=? AND request_hash=?').get(id,requestHash);
   if(duplicate)return {duplicate:true,...this.get(id,duplicate.revision_id)};
   const latest=this.store.db.prepare('SELECT revision_id,ordinal FROM intelligence_review_revisions WHERE event_id=? ORDER BY ordinal DESC LIMIT 1').get(id);
   if((latest?.revision_id??null)!==input.expected_parent_revision_id)throw new GatewayError('review_parent_conflict');
   const ordinal=(latest?.ordinal??0)+1,revision='REV-'+hash({id,requestHash}).slice(0,32),planHash=hash(plan),now=this.store.now();
   const receipt={schema_version:'intake-receipt.v1',idempotency_key:id,accepted:true,receipt_id:revision,benchmark_sha256:this.store.profile.reference.sha256,stage:'reviewed_intelligence_draft',origin:'operator_reviewed_revision',plan_hash:planHash,release_eligible:false};
   this.store.db.prepare('INSERT INTO intelligence_review_revisions(revision_id,event_id,ordinal,parent_revision_id,base_review_hash,input_hash,request_hash,plan_hash,plan,receipt,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(revision,id,ordinal,input.expected_parent_revision_id,input.expected_review_hash,inputHash,requestHash,planHash,JSON.stringify(plan),JSON.stringify(receipt),reason,now);
   this.store.log(id,'reviewed_intelligence_revision_stored',{revision_id:revision,parent_revision_id:input.expected_parent_revision_id,base_review_hash:input.expected_review_hash,plan_hash:planHash,reason,origin:'operator_reviewed_revision',paid_call:false,release_eligible:false});
   return {duplicate:false,...this.get(id,revision)};
  });
 }
}
