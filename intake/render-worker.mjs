import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const scripts=fileURLToPath(new URL('../scripts/',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const aborted=()=>Object.assign(Error('render_worker_stopped'),{code:'ABORT_ERR'});

// Isolated process group includes FFmpeg. Bounded logs and wall time; no shell.
export function runRenderProcess(command,args,{signal,onOutput=()=>{},timeout=15*60*1000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(aborted());
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});let stdout='',stderr='',stopping=false,killer;
  const kill=sig=>{try{if(process.platform==='win32')child.kill(sig);else process.kill(-child.pid,sig);}catch{}};
  const stop=()=>{stopping=true;kill('SIGTERM');killer=setTimeout(()=>kill('SIGKILL'),2000);killer.unref();};
  const timer=setTimeout(stop,timeout);timer.unref();signal?.addEventListener('abort',stop,{once:true});
  child.stdout.on('data',d=>{stdout=(stdout+d).slice(-12000);try{onOutput(d.toString());}catch{stop();}});child.stderr.on('data',d=>stderr=(stderr+d).slice(-12000));
  const cleanup=()=>{clearTimeout(timer);clearTimeout(killer);signal?.removeEventListener('abort',stop);};
  child.on('error',e=>{cleanup();reject(e);});child.on('close',code=>{cleanup();if(signal?.aborted)return reject(aborted());if(code||stopping)return reject(Object.assign(Error(stopping?'render_process_timeout':'render_process_failed'),{stderr,stdout}));resolve({stdout,stderr});});
 });
}
async function read(directory,name){return JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));}
async function recordFile(directory,file,mime_type){
 const bytes=await fs.readFile(path.join(directory,file));const handle=await fs.open(path.join(directory,file),'r');try{await handle.sync();}finally{await handle.close();}
 return {file,sha256:hash(bytes),size_bytes:bytes.length,mime_type};
}
export async function runSourceRenderPipeline(directory,{signal,progress=()=>{}}={}){
 progress('measuring_guide');await runRenderProcess('python3',[path.join(scripts,'build-measured-guide.py'),directory],{signal,timeout:120000});
 progress('composing');try{await runRenderProcess(process.execPath,[path.join(scripts,'compose-source-plan.mjs'),directory],{signal,timeout:120000});}catch(e){if(e.code==='ABORT_ERR')throw e;const report=await read(directory,'composition-review.json').catch(()=>null);if(report?.ready===false)return {report:{code:'composition_review_required',composition:report}};throw e;}
 progress('rendering');let buffer='';await runRenderProcess(process.execPath,[path.join(scripts,'render-source-plan.mjs'),directory,path.join(directory,'review.mp4')],{signal,onOutput:text=>{
  buffer=(buffer+text).slice(-12000);const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){const match=/^Rendered (\d+)\/(\d+)$/.exec(line);if(match)progress('rendering',{frames_rendered:Number(match[1]),frames_total:Number(match[2])});}
 }});
 progress('technical_qc');const [qc,composition,manifest]=await Promise.all(['review.mp4.qc.json','composition-review.json','review.mp4.manifest.json'].map(n=>read(directory,n)));
 const probe=await runRenderProcess('ffprobe',['-v','error','-show_format','-show_streams','-of','json',path.join(directory,'review.mp4')],{signal,timeout:30000});const technical=JSON.parse(probe.stdout),v=technical.streams.find(s=>s.codec_type==='video'),a=technical.streams.find(s=>s.codec_type==='audio');
 if(qc.technical_qc!=='pass'||qc.readability_preflight!=='all_frames_pass'||manifest.release_eligible!==false||qc.release_eligible!==false||qc.voice_status!=='guide'||composition.ready!==true||v?.codec_name!=='h264'||v.width!==1080||v.height!==1920||v.r_frame_rate!=='30/1'||a?.codec_name!=='aac'||Math.abs(Number(technical.format.duration)-qc.duration)>.04)throw Error('render_technical_qc_failed');
 const entries={video:['review.mp4','video/mp4'],qc:['review.mp4.qc.json','application/json'],manifest:['review.mp4.manifest.json','application/json'],composition:['composition-review.json','application/json'],timing:['timing.json','application/json'],voice_provenance:['audio-provenance.json','application/json']};
 for(let i=1;i<=manifest.sentences.length;i++)entries['scene-'+i]=['review.mp4.scene-'+i+'.png','image/png'];
 const artifacts={};for(const [key,[file,mime]] of Object.entries(entries))artifacts[key]=await recordFile(directory,file,mime);
 const dh=await fs.open(directory,'r');try{await dh.sync();}finally{await dh.close();}
 // Local output path is private and is not exposed in the status/report.
 const {output,...publicQC}=qc;return {report:{code:'render_ready_for_review',qc:publicQC,composition},artifacts};
}

export class DurableRenderWorker {
 constructor(adapter,{pipeline=runSourceRenderPipeline,pollMs=1000,eventId=''}={}){this.adapter=adapter;this.eventId=eventId;this.pipeline=pipeline;this.pollMs=pollMs;this.active=null;this.stopped=false;this.controller=null;this.timer=null;}
 async runOnce(){
  if(this.active||this.stopped)return null;
  const claim=this.adapter.claim(this.eventId);if(!claim)return null;
  this.controller=new AbortController();const signal=this.controller.signal;let stage='materializing',progress=null;
  const heartbeat=setInterval(()=>{try{this.adapter.heartbeat(claim.id,claim.token,stage,progress);}catch{this.controller?.abort();}},5000);heartbeat.unref();
  const execute=async()=>{
   try{
    const directory=this.adapter.materialize(claim);
    const result=await this.pipeline(directory,{signal,progress:(next,p=null)=>{stage=next;progress=p;this.adapter.heartbeat(claim.id,claim.token,stage,progress);}});
    if(signal.aborted)throw aborted();return this.adapter.finish(claim,result);
   }catch(e){
    // Shutdown/lost lease leaves deterministic work recoverable after expiration.
    if(signal.aborted||e.code==='ABORT_ERR'||e.code==='render_lease_lost')return null;
    const known=['render_input_integrity_failed','render_asset_path_invalid','render_technical_qc_failed','private_render_directory_required'];
    try{return this.adapter.finish(claim,{report:{code:known.includes(e.message)?e.message:stage+'_failed',stage}});}catch{return null;}
   }finally{clearInterval(heartbeat);}
  };
  this.active=execute();try{return await this.active;}finally{this.active=null;this.controller=null;}
 }
 start(){if(this.timer||this.stopped)return;const tick=()=>this.runOnce().catch(e=>console.error('Source render queue error:',e.code??'worker_error'));this.timer=setInterval(tick,this.pollMs);this.timer.unref();tick();}
 async stop(){this.stopped=true;clearInterval(this.timer);this.timer=null;this.controller?.abort();if(this.active)await this.active;}
}
