import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {routeIntake} from './universal-router.mjs';

export const MAX_SOURCE_BYTES=32*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export class GatewayError extends Error {
  constructor(code,status=409){super(code);this.code=code;this.status=status;}
}
// One host / local mounted filesystem. No database or blobs in the web root.
export class IntakeStore {
  constructor({directory,profile,allowedChatIds,bindings={},now=()=>Date.now()}) {
    if(!path.isAbsolute(directory??''))throw new GatewayError('absolute_store_directory_required',503);
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    this.profile=structuredClone(profile);this.allowedChatIds=allowedChatIds;this.bindings=bindings;this.now=now;
    this.db=new DatabaseSync(path.join(directory,'intake.sqlite'));
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS jobs (
        event_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL,
        route TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        extraction TEXT, attempts INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until INTEGER,
        receipt TEXT, last_error TEXT);
      CREATE TABLE IF NOT EXISTS blobs (sha256 TEXT PRIMARY KEY, size_bytes INTEGER NOT NULL, bytes BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS sources (event_id TEXT NOT NULL REFERENCES jobs(event_id), ordinal INTEGER NOT NULL,
        sha256 TEXT NOT NULL REFERENCES blobs(sha256), metadata TEXT NOT NULL, PRIMARY KEY(event_id,ordinal));
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL REFERENCES jobs(event_id),
        kind TEXT NOT NULL, at INTEGER NOT NULL, details TEXT NOT NULL);`);
  }
  close(){this.db.close();}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  log(id,kind,details={}){this.db.prepare('INSERT INTO events(event_id,kind,at,details) VALUES(?,?,?,?)').run(id,kind,this.now(),JSON.stringify(details));}
  get(id){
    const row=this.db.prepare('SELECT * FROM jobs WHERE event_id=?').get(id);
    if(!row)throw new GatewayError('job_not_found',404);
    const sources=this.db.prepare('SELECT sha256,metadata FROM sources WHERE event_id=? ORDER BY ordinal').all(id).map(r=>({...JSON.parse(r.metadata),sha256:r.sha256}));
    return {event_id:id,job_id:JSON.parse(row.payload).intake_id,status:row.status,route:row.route,created_at:row.created_at,updated_at:row.updated_at,
      attempts:row.attempts,receipt:row.receipt?JSON.parse(row.receipt):null,last_error:row.last_error,
      intake:JSON.parse(row.payload),sources,extraction:row.extraction?JSON.parse(row.extraction):null,release_eligible:false};
  }
  sourceBytes(id,ordinal=0){
    const row=this.db.prepare('SELECT b.bytes,b.sha256 FROM sources s JOIN blobs b ON s.sha256=b.sha256 WHERE s.event_id=? AND s.ordinal=?').get(id,ordinal);
    if(!row)throw new GatewayError('source_not_found',404);
    const bytes=Buffer.from(row.bytes);if(hash(bytes)!==row.sha256)throw new GatewayError('source_integrity_failed');return bytes;
  }
  retain({telegramUpdate,files=[]}) {
    if(!Array.isArray(files)||files.length>1)throw new GatewayError('one_source_per_telegram_event_required',400);
    const binary=Object.fromEntries(files.map((f,i)=>['source'+i,{mimeType:f.mimeType??'application/octet-stream'}]));
    const normalized=routeIntake({json:telegramUpdate,binary},{allowed_chat_ids:this.allowedChatIds,dispatch_enabled:false,intake_gateway_workflow_id:''},this.profile).json;
    if(normalized.status==='blocked')throw new GatewayError(normalized.reason,normalized.reason==='chat_not_allowed'?403:400);
    if(normalized.source_asset&&!files.length)throw new GatewayError('source_bytes_required',400);
    if(!normalized.source_asset&&files.length)throw new GatewayError('unexpected_source_bytes',400);
    const sources=files.map(f=>{
      if(!Buffer.isBuffer(f.bytes)||f.bytes.length===0||f.bytes.length>MAX_SOURCE_BYTES)throw new GatewayError('source_size_invalid',400);
      const meta=normalized.source_asset;
      if(meta.file_size!=null&&Number(meta.file_size)!==f.bytes.length)throw new GatewayError('source_size_mismatch',400);
      return {sha256:hash(f.bytes),bytes:f.bytes,metadata:{source_id:'SRC-'+hash(f.bytes).slice(0,20),file_name:meta.file_name??f.fileName??'source',mime_type:meta.mime_type??f.mimeType??'application/octet-stream',size_bytes:f.bytes.length,telegram_file_id:meta.file_id,telegram_file_unique_id:meta.file_unique_id}};
    });
    // Ignore changing delivery update_id, but never overwrite changed content under the same event key.
    const fingerprint=hash(JSON.stringify({event:normalized.idempotency_key,raw:normalized.raw_input,type:normalized.input_type,route:normalized.route_next,project:normalized.project_id,re_project:normalized.re_project_key,reason:normalized.reason,profile:this.profile.reference.sha256,sources:sources.map(s=>({sha256:s.sha256,...s.metadata}))}));
    return this.transaction(()=>{
      const existing=this.db.prepare('SELECT fingerprint FROM jobs WHERE event_id=?').get(normalized.idempotency_key);
      if(existing){if(existing.fingerprint!==fingerprint)throw new GatewayError('event_content_conflict');return {duplicate:true,job:this.get(normalized.idempotency_key)};}
      const status=normalized.reason?'review_required':sources.length?'source_analysis_pending':'binding_pending';
      const now=this.now();this.db.prepare('INSERT INTO jobs(event_id,fingerprint,payload,route,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(normalized.idempotency_key,fingerprint,JSON.stringify(normalized),normalized.route_next,status,now,now);
      for(let i=0;i<sources.length;i++){const s=sources[i];this.db.prepare('INSERT OR IGNORE INTO blobs(sha256,size_bytes,bytes) VALUES(?,?,?)').run(s.sha256,s.bytes.length,s.bytes);this.db.prepare('INSERT INTO sources(event_id,ordinal,sha256,metadata) VALUES(?,?,?,?)').run(normalized.idempotency_key,i,s.sha256,JSON.stringify(s.metadata));}
      this.log(normalized.idempotency_key,'retained',{status,source_count:sources.length});
      return {duplicate:false,job:this.get(normalized.idempotency_key)};
    });
  }
  recordExtraction(id,extraction){
    return this.transaction(()=>{
      const job=this.get(id);
      if(!job.sources.length)throw new GatewayError('job_has_no_source',400);
      if(job.extraction)return job;
      if(!['source_analysis_pending','binding_pending','review_required'].includes(job.status))throw new GatewayError('extraction_state_conflict');
      const expected=new Set(job.sources.map(s=>s.source_id));
      if(!['extracted','analysis_required','failed'].includes(extraction?.status)||!Array.isArray(extraction.sources)||extraction.sources.some(s=>!expected.has(s.source_id)))throw new GatewayError('invalid_extraction_record',400);
      const status=job.intake.reason?'review_required':extraction.status==='extracted'?'binding_pending':'source_analysis_pending';
      this.db.prepare('UPDATE jobs SET extraction=?,status=?,updated_at=? WHERE event_id=?').run(JSON.stringify(extraction),status,this.now(),id);
      this.log(id,'source_extraction',{status:extraction.status,claim_candidates:extraction.claims?.length??0});return this.get(id);
    });
  }
  claim(id){
    return this.transaction(()=>{
      const job=this.get(id), row=this.db.prepare('SELECT lease_token,lease_until FROM jobs WHERE event_id=?').get(id);
      if(job.status==='handoff_reserved'){
        if(row.lease_until<=this.now()){this.db.prepare("UPDATE jobs SET status='handoff_uncertain',last_error='lease_expired_reconciliation_required',updated_at=? WHERE event_id=?").run(this.now(),id);this.log(id,'handoff_uncertain');return {claimed:false,reason:'reconciliation_required',job:this.get(id)};}
        return {claimed:false,reason:'handoff_already_reserved',job};
      }
      if(job.status==='handed_off'||job.status==='handoff_uncertain')return {claimed:false,reason:job.status==='handed_off'?'already_handed_off':'reconciliation_required',job};
      if(job.intake.reason)return {claimed:false,reason:job.intake.reason,job};
      if(job.intake.quality_profile.reference.sha256!==this.profile.reference.sha256)return {claimed:false,reason:'stored_quality_profile_changed',job};
      if(job.sources.length&&job.extraction?.status!=='extracted')return {claimed:false,reason:'source_analysis_required',job};
      // Project/session resolution and final approvals are not inferred from incoming commands.
      if(job.intake.re_project_key||['asset_session_close','voice_production','final_assembly','revision_router','project_query'].includes(job.route))return {claimed:false,reason:'verified_project_adapter_required',job};
      const binding=this.bindings[job.route];
      if(!binding?.workflow_id||!/^[A-Za-z0-9_-]+$/.test(binding.workflow_id)||/REPLACE|PLACEHOLDER|ACTUAL_TESTED_/i.test(binding.workflow_id))return {claimed:false,reason:'workflow_binding_required',job};
      if(binding.profile_id!==this.profile.profile_id||binding.benchmark_sha256!==this.profile.reference.sha256||binding.contract!=='intake-handoff.v1')return {claimed:false,reason:'quality_profile_binding_mismatch',job};
      if(binding.stage!=='intelligence')return {claimed:false,reason:'production_adapter_not_enabled',job};
      if(job.attempts>=3)return {claimed:false,reason:'attempt_limit_reached',job};
      const token=randomUUID();this.db.prepare("UPDATE jobs SET status='handoff_reserved',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE event_id=?").run(token,this.now()+300000,this.now(),id);this.log(id,'handoff_reserved',{workflow_id:binding.workflow_id});
      return {claimed:true,event_id:id,lease_token:token,workflow_id:binding.workflow_id,handoff:{schema_version:'intake-handoff.v1',idempotency_key:id,job_id:job.job_id,normalized_brief:job.intake,telegram_update:job.intake.telegram_update,sources:job.sources,claim_ledger:job.extraction,quality_profile:this.profile,release_eligible:false}};
    });
  }
  complete(id,token,receipt){
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM jobs WHERE event_id=?').get(id);if(!row)throw new GatewayError('job_not_found',404);
      if(!token||row.lease_token!==token)throw new GatewayError('lease_token_mismatch');
      const valid=receipt?.schema_version==='intake-receipt.v1'&&receipt.idempotency_key===id&&receipt.accepted===true&&typeof receipt.receipt_id==='string'&&receipt.receipt_id.length>0&&receipt.benchmark_sha256===this.profile.reference.sha256;
      if(row.status==='handed_off'){
        if(valid&&JSON.stringify(receipt)===row.receipt)return this.get(id);throw new GatewayError('receipt_conflict');
      }
      if(row.status!=='handoff_reserved')throw new GatewayError('handoff_state_conflict');
      const status=valid?'handed_off':'handoff_uncertain';
      this.db.prepare('UPDATE jobs SET status=?,receipt=?,last_error=?,updated_at=? WHERE event_id=?').run(status,valid?JSON.stringify(receipt):null,valid?null:'downstream_receipt_missing_or_invalid',this.now(),id);this.log(id,status);return this.get(id);
    });
  }
  releaseUnstarted(id,token){
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM jobs WHERE event_id=?').get(id);
      if(!row||row.status!=='handoff_reserved'||row.lease_token!==token)throw new GatewayError('handoff_state_conflict');
      this.db.prepare("UPDATE jobs SET status='binding_pending',lease_token=NULL,lease_until=NULL,last_error='released_before_dispatch',updated_at=? WHERE event_id=?").run(this.now(),id);this.log(id,'released_before_dispatch');return this.get(id);
    });
  }
}
