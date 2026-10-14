import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./extract-source.py',import.meta.url));
export function extractSource(bytes,fileName,{python=process.env.INTAKE_PYTHON||'python3'}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(python,[script,'--name',fileName],{stdio:['pipe','pipe','pipe']});
    let output='',errors='',done=false;
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('source_extraction_timeout'));},30000);
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);};
    child.stdout.on('data',d=>{output+=d.toString();if(output.length>8*1024*1024){child.kill('SIGKILL');finish(new Error('source_extraction_output_limit'));}});
    child.stderr.on('data',d=>{errors=(errors+d.toString()).slice(-1000);});
    child.on('error',finish);child.stdin.on('error',e=>{if(e.code!=='EPIPE')finish(e);});
    child.on('close',code=>{if(code!==0)return finish(new Error('source_extraction_process_failed'));try{finish(null,JSON.parse(output));}catch{finish(new Error('invalid_source_extraction_output'));}});
    child.stdin.end(bytes);
  });
}
export function applySourceScope(extraction,brief){
  const match=String(brief).match(/\b(slides?|pages?)\s+(?:from\s+)?(\d+)\s*(?:[-–—]|to)\s*(\d+)\b/i);
  if(!match||extraction.status!=='extracted')return extraction;
  const kind=match[1].toLowerCase().startsWith('slide')?'slide':'page',low=Number(match[2]),high=Number(match[3]);
  const selected=extraction.units.filter(u=>u.unit_kind===kind&&u.unit_number>=low&&u.unit_number<=high);
  if(low<1||high<low||selected.length!==high-low+1)return {...extraction,status:'failed',claims:[],warnings:[...extraction.warnings,'Requested source range is not present; review required.']};
  return {...extraction,selection:{unit_kind:kind,from:low,to:high,original_brief:String(brief)},units:selected,claims:extraction.claims.filter(c=>c.source_locations.every(r=>r.unit_kind===kind&&r.unit_number>=low&&r.unit_number<=high)),warnings:[...extraction.warnings,'Only the explicitly selected source range enters the claim candidates. The complete original file is retained.']};
}
export async function extractRetainedSource(store,id){
  const job=store.get(id);
  if(!job.sources.length)return job;
  if(job.extraction)return job;
  const source=job.sources[0];let result;
  try{result=applySourceScope(await extractSource(store.sourceBytes(id),source.file_name),job.intake.original_brief);}
  catch{result={schema_version:'source-extract.v1',status:'failed',sources:[{source_id:source.source_id,sha256:source.sha256}],units:[],claims:[],warnings:['Extraction service unavailable; source retained for review.'],release_eligible:false};}
  return store.recordExtraction(id,result);
}
