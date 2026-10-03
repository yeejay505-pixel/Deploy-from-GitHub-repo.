import {createHash,randomUUID} from 'node:crypto';
import {GatewayError} from '../intake/gateway-store.mjs';
import {buildIntelligenceRequest,parseIntelligenceResponse,sourceContext} from './plan-contract.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class IntelligenceAdapter {
 constructor(store,{model='',paidCallsEnabled=false}={}){
  this.store=store;this.model=model;this.paidCallsEnabled=paidCallsEnabled;
  store.db.exec(`CREATE TABLE IF NOT EXISTS intelligence_runs (
   event_id TEXT PRIMARY KEY REFERENCES jobs(event_id),input_hash TEXT NOT NULL,request TEXT NOT NULL,
   status TEXT NOT NULL,call_token TEXT,plan TEXT,receipt TEXT,usage TEXT,response_id TEXT,error TEXT,
   created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS intelligence_retry_history (
   event_id TEXT PRIMARY KEY REFERENCES jobs(event_id),review_hash TEXT NOT NULL,
   prior_run TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL);`);
 }
 get(id){
  const r=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
  if(!r)return {event_id:id,status:'not_prepared',receipt:null,plan:null,release_eligible:false};
  return {event_id:id,status:r.status,review_hash:r.status==='review_required'?hash(r):null,retry_used:Boolean(this.store.db.prepare('SELECT event_id FROM intelligence_retry_history WHERE event_id=?').get(id)),plan:r.plan?JSON.parse(r.plan):null,receipt:r.receipt?JSON.parse(r.receipt):null,usage:r.usage?JSON.parse(r.usage):null,response_id:r.response_id,error:r.error,release_eligible:false};
 }
 prepare(id){
  const job=this.store.get(id);let request;
  try{request=buildIntelligenceRequest(job,this.model);}catch(e){return {event_id:id,ready:false,status:e.message,release_eligible:false};}
  if(job.intake.quality_profile.reference.sha256!==this.store.profile.reference.sha256)return {event_id:id,ready:false,status:'stored_quality_profile_changed',release_eligible:false};
  const inputHash=hash(sourceContext(job));
  return this.store.transaction(()=>{
   const prior=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
   if(prior){if(prior.input_hash!==inputHash)throw new GatewayError('intelligence_input_conflict');return {ready:prior.status==='prepared',duplicate:true,...this.get(id)};}
   const now=this.store.now();this.store.db.prepare("INSERT INTO intelligence_runs(event_id,input_hash,request,status,created_at,updated_at) VALUES(?,?,?,'prepared',?,?)").run(id,inputHash,JSON.stringify(request),now,now);this.store.log(id,'intelligence_prepared',{model:this.model});
   return {ready:true,duplicate:false,...this.get(id)};
  });
 }
 retry(id,input={}){
  // Explicit operator action; never invoked by prepare/call or an automatic retry.
  if(input?.acknowledge_paid_call!==true||typeof input.reason!=='string'||input.reason.trim().length<12||input.reason.length>1000||typeof input.expected_review_hash!=='string')throw new GatewayError('explicit_retry_review_required',400);
  return this.store.transaction(()=>{
   const r=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
   if(!r||r.status!=='review_required'||!r.response_id)throw new GatewayError('completed_review_failure_required');
   if(this.store.db.prepare('SELECT event_id FROM intelligence_retry_history WHERE event_id=?').get(id))throw new GatewayError('retry_budget_exhausted');
   if(hash(r)!==input.expected_review_hash)throw new GatewayError('retry_review_conflict');
   const job=this.store.get(id);
   if(hash(sourceContext(job))!==r.input_hash)throw new GatewayError('intelligence_input_conflict');
   if(job.intake.quality_profile.reference.sha256!==this.store.profile.reference.sha256)throw new GatewayError('stored_quality_profile_changed');
   const request=buildIntelligenceRequest(job,this.model),now=this.store.now();
   this.store.db.prepare('INSERT INTO intelligence_retry_history(event_id,review_hash,prior_run,reason,created_at) VALUES(?,?,?,?,?)').run(id,hash(r),JSON.stringify(r),input.reason.trim(),now);
   this.store.db.prepare("UPDATE intelligence_runs SET request=?,status='prepared',call_token=NULL,plan=NULL,receipt=NULL,usage=NULL,response_id=NULL,error=NULL,updated_at=? WHERE event_id=?").run(JSON.stringify(request),now,id);
   this.store.log(id,'intelligence_operator_retry_prepared',{prior_response_id:r.response_id,prior_error:r.error,reason:input.reason.trim(),review_hash:hash(r)});
   return {ready:true,...this.get(id)};
  });
 }
 authorizeCall(id){
  if(!this.paidCallsEnabled)return {event_id:id,permitted:false,reason:'paid_intelligence_disabled',...this.get(id)};
  return this.store.transaction(()=>{
   const r=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
   if(!r)throw new GatewayError('intelligence_not_prepared');
   if(r.status!=='prepared')return {permitted:false,reason:r.status==='validated_draft'?'cached_draft':'reconciliation_required',...this.get(id)};
   if(JSON.parse(r.request).model!==this.model)return {permitted:false,reason:'prepared_model_configuration_changed',...this.get(id)};
   const token=randomUUID();this.store.db.prepare("UPDATE intelligence_runs SET status='calling',call_token=?,updated_at=? WHERE event_id=?").run(token,this.store.now(),id);this.store.log(id,'intelligence_call_reserved');
   return {event_id:id,permitted:true,call_token:token,request:JSON.parse(r.request),release_eligible:false};
  });
 }
 recordResult(id,token,response){
  return this.store.transaction(()=>{
   const r=this.store.db.prepare('SELECT * FROM intelligence_runs WHERE event_id=?').get(id);
   if(!r||!token||r.call_token!==token)throw new GatewayError('intelligence_call_token_mismatch');
   if(r.status==='validated_draft')return this.get(id);
   if(r.status!=='calling')return this.get(id);
   const job=this.store.get(id);let plan,error=null;
   try{plan=parseIntelligenceResponse(response,job);}catch(e){error=e.message;}
   const status=plan?'validated_draft':response?.status==='completed'?'review_required':'call_uncertain';
   const receipt=plan?{schema_version:'intake-receipt.v1',idempotency_key:id,accepted:true,receipt_id:'INTEL-'+hash({id,input:r.input_hash}).slice(0,24),benchmark_sha256:this.store.profile.reference.sha256,stage:'intelligence_draft',release_eligible:false}:null;
   const usage=response?.usage&&typeof response.usage==='object'?{input_tokens:response.usage.input_tokens??null,output_tokens:response.usage.output_tokens??null,total_tokens:response.usage.total_tokens??null}:null;
   this.store.db.prepare('UPDATE intelligence_runs SET status=?,plan=?,receipt=?,usage=?,response_id=?,error=?,updated_at=? WHERE event_id=?').run(status,plan?JSON.stringify(plan):null,receipt?JSON.stringify(receipt):null,usage?JSON.stringify(usage):null,typeof response?.id==='string'?response.id:null,error,this.store.now(),id);
   this.store.log(id,'intelligence_'+status,{error});return this.get(id);
  });
 }
}
