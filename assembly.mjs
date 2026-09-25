import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const safe = (v) => String(v ?? '').replace(/[^A-Za-z0-9_.-]/g,'_');
const num = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

const run = (cmd,args,{maxLog=12000}={}) => new Promise((resolve,reject)=>{
  const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  p.stdout.on('data',d=>{stdout+=d.toString(); if(stdout.length>maxLog) stdout=stdout.slice(-maxLog);});
  p.stderr.on('data',d=>{stderr+=d.toString(); if(stderr.length>maxLog) stderr=stderr.slice(-maxLog);});
  p.on('error',reject);
  p.on('close',(code,signal)=>{
    if(code===0) return resolve({stdout,stderr});
    reject(new Error(`${cmd} failed with code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-6000)}`));
  });
});

const publicBase = (req) => {
  const xf=(req.get('x-forwarded-proto')||'').split(',')[0].trim();
  const proto=xf||req.protocol||'https';
  return `${proto}://${req.get('host')}`;
};

const normalizeUrl = (u) => {
  let s=String(u||'');
  if(s.startsWith('http://') && s.includes('.up.railway.app')) s='https://'+s.slice(7);
  return s;
};

async function download(url,dest){
  const r=await fetch(normalizeUrl(url),{redirect:'follow'});
  if(!r.ok) throw new Error(`Failed to download ${url}: HTTP ${r.status}`);
  const ab=await r.arrayBuffer();
  await fs.writeFile(dest,Buffer.from(ab));
}

function cueSpec(cue=''){
  const s=String(cue).toLowerCase();
  if(/whoosh|passing|sweep/.test(s)) return {kind:'noise',dur:.28,vol:.20,filter:'highpass=f=350,lowpass=f=4800'};
  if(/impact|drop|stamp|shutter|weight/.test(s)) return {kind:'tone',freq:95,dur:.18,vol:.35,filter:'lowpass=f=700'};
  if(/click|lock/.test(s)) return {kind:'tone',freq:1350,dur:.055,vol:.22,filter:'highpass=f=600'};
  if(/chime|resolve|confirmation|tone/.test(s)) return {kind:'tone',freq:660,dur:.32,vol:.18,filter:'lowpass=f=2600'};
  if(/water|drain|pipe/.test(s)) return {kind:'noise',dur:.48,vol:.14,filter:'lowpass=f=1600'};
  if(/chain|creak|metal/.test(s)) return {kind:'noise',dur:.24,vol:.20,filter:'bandpass=f=900:w=700'};
  if(/paper|flutter/.test(s)) return {kind:'noise',dur:.22,vol:.12,filter:'highpass=f=900,lowpass=f=5200'};
  if(/electrical/.test(s)) return {kind:'tone',freq:980,dur:.07,vol:.18,filter:'highpass=f=450'};
  return {kind:'tone',freq:440,dur:.12,vol:.12,filter:'lowpass=f=2200'};
}

async function synthSfx(events,dir,targetDuration){
  const usable=(events||[])
    .map((e,i)=>({...e,timeSec:num(e.timeSec,0),cue:String(e.cue||''),i}))
    .filter(e=>e.timeSec>=0 && e.timeSec<=targetDuration)
    .slice(0,24);

  if(!usable.length){
    const silence=path.join(dir,'sfx.wav');
    await run('ffmpeg',['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=stereo:d=${targetDuration}`,'-c:a','pcm_s16le',silence]);
    return {path:silence,count:0};
  }

  const files=[];
  for(const e of usable){
    const spec=cueSpec(e.cue);
    const out=path.join(dir,`sfx_${String(e.i).padStart(2,'0')}.wav`);
    let source;
    if(spec.kind==='noise'){
      source=`anoisesrc=color=pink:amplitude=0.45:duration=${spec.dur}:sample_rate=48000`;
    } else {
      source=`sine=frequency=${spec.freq}:duration=${spec.dur}:sample_rate=48000`;
    }
    const af=`${spec.filter},afade=t=out:st=${Math.max(0,spec.dur-.06)}:d=.06,volume=${spec.vol}`;
    await run('ffmpeg',['-y','-f','lavfi','-i',source,'-af',af,'-ar','48000','-ac','2','-c:a','pcm_s16le',out]);
    files.push({path:out,timeSec:e.timeSec});
  }

  const out=path.join(dir,'sfx.wav');
  const args=['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=stereo:d=${targetDuration}`];
  for(const f of files) args.push('-i',f.path);

  const parts=['[0:a]asetpts=PTS-STARTPTS[base]'];
  const labels=['[base]'];
  files.forEach((f,idx)=>{
    const ms=Math.max(0,Math.round(f.timeSec*1000));
    parts.push(`[${idx+1}:a]adelay=${ms}|${ms}[s${idx}]`);
    labels.push(`[s${idx}]`);
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${targetDuration},alimiter=limit=.85[sfx]`);
  args.push('-filter_complex',parts.join(';'),'-map','[sfx]','-ar','48000','-ac','2','-c:a','pcm_s16le',out);
  await run('ffmpeg',args);
  return {path:out,count:files.length};
}

function makeCaptions(words=[]){
  const valid=(words||[]).map(w=>({word:String(w.word||'').trim(),start:num(w.start,0),end:num(w.end,0)})).filter(w=>w.word && w.end>=w.start);
  const groups=[]; let cur=[];
  const flush=()=>{if(cur.length){groups.push(cur);cur=[];}};
  for(const w of valid){
    cur.push(w);
    const txt=cur.map(x=>x.word).join(' ');
    const dur=cur[cur.length-1].end-cur[0].start;
    if(cur.length>=5 || dur>=2.1 || /[.!?]$/.test(w.word) || txt.length>=46) flush();
  }
  flush();
  return groups;
}

function ts(sec){
  const ms=Math.max(0,Math.round(sec*1000));
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000),x=ms%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;
}

async function probe(file){
  const {stdout}=await run('ffprobe',['-v','error','-show_entries','format=duration,size','-show_entries','stream=index,codec_type,codec_name,width,height','-of','json',file],{maxLog:30000});
  return JSON.parse(stdout);
}

export function createAssemblyHandler({here,outputs}){
  return async function assembleFinal(req,res){
    const started=Date.now();
    let workDir=null;
    try{
      if(!req.file) throw new Error('Missing multipart voice file field named "voice".');
      const manifest=JSON.parse(String(req.body?.manifest||'{}'));
      const projectId=String(manifest.projectId||'');
      const renderBatchId=String(manifest.renderBatchId||'');
      const assemblyVersion=String(manifest.assemblyVersion||'final-v1');
      const targetDuration=num(manifest.targetDuration,0);
      const scenes=[...(manifest.scenes||[])].sort((a,b)=>num(a.startSec)-num(b.startSec));

      if(!projectId) throw new Error('Missing projectId');
      if(!renderBatchId) throw new Error('Missing renderBatchId');
      if(targetDuration<=0) throw new Error('Invalid targetDuration');
      if(scenes.length!==8) throw new Error(`Expected 8 rendered scenes, got ${scenes.length}`);

      workDir=path.join(here,'assembly-cache',`${safe(projectId)}_${safe(renderBatchId)}_${Date.now()}`);
      await fs.mkdir(workDir,{recursive:true});
      const voicePath=path.join(workDir,'voice.mp3');
      await fs.copyFile(req.file.path,voicePath);

      const localScenes=[];
      for(let i=0;i<scenes.length;i++){
        const s=scenes[i];
        const src=path.join(workDir,`${safe(s.sceneId||`S${i+1}`)}_src.mp4`);
        await download(s.url,src);

        const start=num(s.startSec,0),end=num(s.endSec,start+num(s.durationSec,0));
        const pre=i===0?Math.max(0,start):0;
        const nextStart=i<scenes.length-1?num(scenes[i+1].startSec,end):targetDuration;
        const post=Math.max(0,nextStart-end);

        const padded=path.join(workDir,`${safe(s.sceneId||`S${i+1}`)}_pad.mp4`);
        const vf=`scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,tpad=start_mode=clone:start_duration=${pre.toFixed(3)}:stop_mode=clone:stop_duration=${post.toFixed(3)}`;
        await run('ffmpeg',['-y','-i',src,'-vf',vf,'-an','-c:v','libx264','-preset','superfast','-crf','24','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',padded]);
        localScenes.push(padded);
      }

      const concatList=path.join(workDir,'concat.txt');
      const quote=(p)=>`file '${String(p).replace(/'/g,"'\\''")}'`;
      await fs.writeFile(concatList,localScenes.map(quote).join('\n')+'\n');
      const visualPath=path.join(workDir,'visual.mp4');
      await run('ffmpeg',['-y','-f','concat','-safe','0','-i',concatList,'-c','copy',visualPath]);

      const sfx=await synthSfx(manifest.sfxEvents||[],workDir,targetDuration);

      const finalFileName=`${safe(projectId)}_${safe(assemblyVersion)}.mp4`;
      const finalPath=path.join(outputs,finalFileName);
      await run('ffmpeg',[
        '-y','-i',visualPath,'-i',voicePath,'-i',sfx.path,
        '-filter_complex','[1:a]aresample=48000,volume=1.0[voice];[2:a]volume=.32[sfx];[voice][sfx]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=.95[a]',
        '-map','0:v:0','-map','[a]',
        '-c:v','copy','-c:a','aac','-b:a','192k',
        '-t',String(targetDuration),
        '-movflags','+faststart',
        finalPath
      ]);

      const captionGroups=makeCaptions(manifest.wordTimestamps||[]);
      const srtFileName=`${safe(projectId)}_${safe(assemblyVersion)}.srt`;
      const srtPath=path.join(outputs,srtFileName);
      const srt=captionGroups.map((g,i)=>`${i+1}\n${ts(g[0].start)} --> ${ts(g[g.length-1].end)}\n${g.map(x=>x.word).join(' ')}\n`).join('\n');
      await fs.writeFile(srtPath,srt,'utf8');

      const info=await probe(finalPath);
      const video=(info.streams||[]).find(s=>s.codec_type==='video');
      const audio=(info.streams||[]).find(s=>s.codec_type==='audio');
      const duration=num(info.format?.duration,0);
      const durationDelta=Math.abs(duration-targetDuration);
      const size=num(info.format?.size,0);

      const qa=[
        {checkName:'scene_count',result:scenes.length===8?'pass':'fail',measuredValue:String(scenes.length),targetValue:'8',tolerance:'0',notes:'All expected scene outputs must be present.'},
        {checkName:'duration',result:durationDelta<=0.35?'pass':'fail',measuredValue:duration.toFixed(3),targetValue:targetDuration.toFixed(3),tolerance:'±0.35s',notes:`Absolute delta ${durationDelta.toFixed(3)}s`},
        {checkName:'video_stream',result:video?'pass':'fail',measuredValue:video?.codec_name||'missing',targetValue:'h264',tolerance:'present',notes:'Final MP4 must contain a video stream.'},
        {checkName:'audio_stream',result:audio?'pass':'fail',measuredValue:audio?.codec_name||'missing',targetValue:'aac',tolerance:'present',notes:'Final MP4 must contain narration/audio.'},
        {checkName:'frame_size',result:(video?.width===540&&video?.height===960)?'pass':'fail',measuredValue:`${video?.width||0}x${video?.height||0}`,targetValue:'540x960',tolerance:'exact test profile',notes:'Current Railway low-memory test profile.'},
        {checkName:'file_size',result:size>100000?'pass':'fail',measuredValue:String(size),targetValue:'>100000',tolerance:'bytes',notes:'Sanity check for non-empty output.'},
        {checkName:'sfx_events',result:sfx.count>0?'pass':'warn',measuredValue:String(sfx.count),targetValue:'>0',tolerance:'informational',notes:'Procedural SFX events mixed under narration.'},
        {checkName:'captions',result:captionGroups.length>0?'pass':'warn',measuredValue:String(captionGroups.length),targetValue:'>0',tolerance:'informational',notes:'SRT sidecar generated from word timestamps.'}
      ];
      const qaStatus=qa.some(q=>q.result==='fail')?'fail':'pass';

      const base=publicBase(req);
      res.json({
        ok:true,
        projectId,
        renderBatchId,
        assemblyVersion,
        finalFileName,
        finalOutputUrl:`${base}/outputs/${encodeURIComponent(finalFileName)}`,
        captionsFileName:srtFileName,
        captionsUrl:`${base}/outputs/${encodeURIComponent(srtFileName)}`,
        durationSeconds:duration,
        width:video?.width||0,
        height:video?.height||0,
        sceneCount:scenes.length,
        sfxCount:sfx.count,
        captionCount:captionGroups.length,
        qaStatus,
        qa,
        assemblyMs:Date.now()-started
      });
    }catch(e){
      const raw=String(e?.message||e||'Unknown assembly error');
      console.error('assemble-final failed',raw,e?.stack||'');
      res.status(500).json({ok:false,error:raw.slice(-5000)});
    }finally{
      if(req.file?.path) await fs.rm(req.file.path,{force:true}).catch(()=>{});
      if(workDir) await fs.rm(workDir,{recursive:true,force:true}).catch(()=>{});
    }
  };
}
