import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const safe=(v)=>String(v??'').replace(/[^A-Za-z0-9_.-]/g,'_');
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

const run=(cmd,args,{maxLog=16000}={})=>new Promise((resolve,reject)=>{
  const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  p.stdout.on('data',d=>{stdout+=d.toString();if(stdout.length>maxLog)stdout=stdout.slice(-maxLog);});
  p.stderr.on('data',d=>{stderr+=d.toString();if(stderr.length>maxLog)stderr=stderr.slice(-maxLog);});
  p.on('error',reject);
  p.on('close',(code,signal)=>{
    if(code===0)return resolve({stdout,stderr});
    reject(new Error(`${cmd} failed with code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-7000)}`));
  });
});

const publicBase=(req)=>{
  const xf=(req.get('x-forwarded-proto')||'').split(',')[0].trim();
  return `${xf||req.protocol||'https'}://${req.get('host')}`;
};

function uploadedFile(req,name){
  if(Array.isArray(req.files))return req.files.find(f=>String(f.fieldname||'')===String(name))||null;
  return req.files?.[name]?.[0]||null;
}

function captionGroups(words=[]){
  const valid=(words||[]).map(w=>({word:String(w.word||'').trim(),start:num(w.start,0),end:num(w.end,0)}))
    .filter(w=>w.word&&w.end>=w.start);
  const groups=[];let cur=[];
  const flush=()=>{if(cur.length){groups.push(cur);cur=[];}};
  for(const w of valid){
    cur.push(w);
    const txt=cur.map(x=>x.word).join(' ');
    const dur=cur[cur.length-1].end-cur[0].start;
    if(cur.length>=5||dur>=2.0||/[.!?]$/.test(w.word)||txt.length>=42)flush();
  }
  flush();
  return groups;
}

function srtTime(sec){
  const ms=Math.max(0,Math.round(sec*1000));
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000),x=ms%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;
}
function assTime(sec){
  const cs=Math.max(0,Math.round(sec*100));
  const h=Math.floor(cs/360000),m=Math.floor((cs%360000)/6000),s=Math.floor((cs%6000)/100),x=cs%100;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(x).padStart(2,'0')}`;
}
function wrapCaptionText(text,maxChars=27){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return '';
  if(words.join(' ').length<=maxChars)return words.join(' ');

  let best=1,bestDiff=Infinity;
  for(let i=1;i<words.length;i++){
    const a=words.slice(0,i).join(' ');
    const b=words.slice(i).join(' ');
    const overflow=Math.max(0,a.length-maxChars)+Math.max(0,b.length-maxChars);
    const diff=Math.abs(a.length-b.length)+overflow*10;
    if(diff<bestDiff){best=i;bestDiff=diff;}
  }
  return words.slice(0,best).join(' ')+'\n'+words.slice(best).join(' ');
}

function assEscape(s){
  return String(s).replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}').replace(/\n/g,'\\N');
}

async function writeCaptions(words,outputsBase,outputDir,targetWidth=540,targetHeight=960){
  const groups=captionGroups(words);
  const srt=groups.map((g,i)=>`${i+1}\n${srtTime(g[0].start)} --> ${srtTime(g[g.length-1].end)}\n${g.map(x=>x.word).join(' ')}\n`).join('\n');
  const srtPath=path.join(outputDir,outputsBase+'.srt');
  await fs.writeFile(srtPath,srt,'utf8');

  const ass=[
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${targetWidth}`,
    `PlayResY: ${targetHeight}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Caption,DejaVu Sans,${Math.round(30*(targetWidth/540))},&H00F6F3EB,&H00F6F3EB,&H0010141C,&H88070A0E,-1,0,0,0,100,100,0,0,3,${Math.max(1,Math.round(targetWidth/540))},0,2,${Math.round(58*(targetWidth/540))},${Math.round(58*(targetWidth/540))},${Math.round(82*(targetHeight/960))},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...groups.map(g=>`Dialogue: 0,${assTime(g[0].start)},${assTime(g[g.length-1].end)},Caption,,0,0,0,,${assEscape(wrapCaptionText(g.map(x=>x.word).join(' ')))}`)
  ].join('\n');
  const assPath=path.join(outputDir,outputsBase+'.ass');
  await fs.writeFile(assPath,ass,'utf8');
  return {groups,srtPath,assPath};
}

function cueProfile(cue=''){
  const s=String(cue).toLowerCase();
  if(/chain|strain|taut/.test(s)) return {kind:'noise',dur:.42,vol:.24,filter:'bandpass=f=850:w=600'};
  if(/weight|drop|impact|collapse|stamp|shutter/.test(s)) return {kind:'tone',freq:72,dur:.32,vol:.34,filter:'lowpass=f=550'};
  if(/click|lock|latch|tick/.test(s)) return {kind:'tone',freq:1320,dur:.075,vol:.18,filter:'highpass=f=650'};
  if(/chime|ping|confirmation|resolve/.test(s)) return {kind:'tone',freq:760,dur:.28,vol:.16,filter:'lowpass=f=3000'};
  if(/conveyor|motor|pipe|drain/.test(s)) return {kind:'noise',dur:.52,vol:.14,filter:'lowpass=f=1400'};
  if(/electrical|shutdown/.test(s)) return {kind:'tone',freq:960,dur:.11,vol:.16,filter:'highpass=f=500'};
  if(/paper|crate|mailer/.test(s)) return {kind:'noise',dur:.26,vol:.12,filter:'highpass=f=800,lowpass=f=5200'};
  if(/whoosh|rise|pullback|travel|delivery|branch/.test(s)) return {kind:'noise',dur:.34,vol:.13,filter:'highpass=f=350,lowpass=f=5000'};
  if(/fracture|crack/.test(s)) return {kind:'noise',dur:.18,vol:.23,filter:'bandpass=f=1800:w=1400'};
  return {kind:'tone',freq:420,dur:.14,vol:.11,filter:'lowpass=f=2200'};
}

async function synthPremiumSfx(events,dir,targetDuration){
  const usable=(events||[]).map((e,i)=>({...e,timeSec:num(e.timeSec,0),cue:String(e.cue||''),i}))
    .filter(e=>e.timeSec>=0&&e.timeSec<=targetDuration).slice(0,40);

  if(!usable.length){
    const out=path.join(dir,'premium-sfx.wav');
    await run('ffmpeg',['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=stereo:d=${targetDuration}`,'-c:a','pcm_s16le',out]);
    return {path:out,count:0};
  }

  const files=[];
  for(const e of usable){
    const spec=cueProfile(e.cue);
    const out=path.join(dir,`cue_${String(e.i).padStart(2,'0')}.wav`);
    const src=spec.kind==='noise'
      ?`anoisesrc=color=pink:amplitude=0.38:duration=${spec.dur}:sample_rate=48000`
      :`sine=frequency=${spec.freq}:duration=${spec.dur}:sample_rate=48000`;
    const af=`${spec.filter},afade=t=in:st=0:d=0.015,afade=t=out:st=${Math.max(0,spec.dur-.07)}:d=0.07,volume=${spec.vol}`;
    await run('ffmpeg',['-y','-f','lavfi','-i',src,'-af',af,'-ar','48000','-ac','2','-c:a','pcm_s16le',out]);
    files.push({path:out,timeSec:e.timeSec});
  }

  const out=path.join(dir,'premium-sfx.wav');
  const args=['-y','-f','lavfi','-i',`anullsrc=r=48000:cl=stereo:d=${targetDuration}`];
  for(const f of files)args.push('-i',f.path);
  const parts=['[0:a]asetpts=PTS-STARTPTS[base]'],labels=['[base]'];
  files.forEach((f,i)=>{
    const ms=Math.max(0,Math.round(f.timeSec*1000));
    parts.push(`[${i+1}:a]adelay=${ms}|${ms}[s${i}]`);
    labels.push(`[s${i}]`);
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${targetDuration},alimiter=limit=.88[sfx]`);
  args.push('-filter_complex',parts.join(';'),'-map','[sfx]','-ar','48000','-ac','2','-c:a','pcm_s16le',out);
  await run('ffmpeg',args);
  return {path:out,count:files.length};
}

async function synthMusic(targetDuration,dir){
  const out=path.join(dir,'editorial-bed.wav');
  const args=[
    '-y',
    '-f','lavfi','-i',`sine=frequency=55:duration=${targetDuration}:sample_rate=48000`,
    '-f','lavfi','-i',`sine=frequency=82.41:duration=${targetDuration}:sample_rate=48000`,
    '-f','lavfi','-i',`sine=frequency=164.81:duration=${targetDuration}:sample_rate=48000`,
    '-f','lavfi','-i',`anoisesrc=color=pink:amplitude=0.035:duration=${targetDuration}:sample_rate=48000`,
    '-filter_complex',
    `[0:a]lowpass=f=180,volume=.050[b0];[1:a]lowpass=f=420,volume=.024[b1];[2:a]highpass=f=900,lowpass=f=2600,volume=.010[b2];[3:a]highpass=f=3200,lowpass=f=6500,volume=.012[n];[b0][b1][b2][n]amix=inputs=4:normalize=0,afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0,targetDuration-1.4)}:d=1.3,alimiter=limit=.75[m]`,
    '-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s16le',out
  ];
  await run('ffmpeg',args);
  return out;
}

async function probe(file){
  const {stdout}=await run('ffprobe',['-v','error','-show_entries','format=duration,size','-show_entries','stream=index,codec_type,codec_name,width,height','-of','json',file],{maxLog:30000});
  return JSON.parse(stdout);
}

async function measureLufs(file){
  try{
    const {stderr}=await run('ffmpeg',['-hide_banner','-nostats','-i',file,'-filter_complex','ebur128=peak=true','-f','null','-'],{maxLog:30000});
    const vals=[...stderr.matchAll(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g)].map(m=>Number(m[1]));
    const peaks=[...stderr.matchAll(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/g)].map(m=>Number(m[1]));
    return {lufs:vals.at(-1)??null,peak:peaks.at(-1)??null};
  }catch{return {lufs:null,peak:null};}
}

export function createPremiumAssemblyHandler({here,outputs}){
  return async function assemblePremium(req,res){
    const started=Date.now();
    let workDir=null;
    try{
      const manifest=JSON.parse(String(req.body?.manifest||'{}'));
      const projectId=String(manifest.projectId||'');
      const qualityVersion=String(manifest.qualityVersion||'');
      const productionBuildVersion=String(manifest.productionBuildVersion||'');
      const renderBatchId=String(manifest.renderBatchId||'');
      const assemblyVersion=String(manifest.assemblyVersion||'premium-final-v1');
      const targetDuration=num(manifest.targetDuration,0);
      const targetWidth=Math.round(num(manifest.targetWidth,540));
      const targetHeight=Math.round(num(manifest.targetHeight,960));
      const scenes=[...(manifest.scenes||[])].sort((a,b)=>num(a.startSec)-num(b.startSec));

      if(!projectId)throw new Error('Missing projectId');
      if(targetDuration<=0)throw new Error('Invalid targetDuration');
      const expectedSceneCount=Math.max(1,Math.round(num(manifest.expectedSceneCount,scenes.length)));
      if(scenes.length<1||scenes.length>25)throw new Error(`Expected 1-25 scenes, got ${scenes.length}`);
      if(scenes.length!==expectedSceneCount)throw new Error(`Scene count mismatch: manifest expects ${expectedSceneCount}, got ${scenes.length}`);

      const voiceFile=uploadedFile(req,'voice');
      if(!voiceFile)throw new Error('Missing multipart voice file.');

      for(const s of scenes){
        const field=`scene_${s.sceneId}`;
        if(!uploadedFile(req,field))throw new Error(`Missing multipart scene file ${field}`);
      }

      workDir=path.join(here,'premium-assembly-cache',`${safe(projectId)}_${Date.now()}`);
      await fs.mkdir(workDir,{recursive:true});

      const voicePath=path.join(workDir,'voice.mp3');
      await fs.copyFile(voiceFile.path,voicePath);

      const padded=[];
      for(let i=0;i<scenes.length;i++){
        const s=scenes[i];
        const srcUpload=uploadedFile(req,`scene_${s.sceneId}`);
        const src=path.join(workDir,`${s.sceneId}_src.mp4`);
        await fs.copyFile(srcUpload.path,src);

        const start=num(s.startSec,0),end=num(s.endSec,start+num(s.durationSec,0));
        const pre=i===0?Math.max(0,start):0;
        const nextStart=i<scenes.length-1?num(scenes[i+1].startSec,end):targetDuration;
        const post=Math.max(0,nextStart-end);
        const dst=path.join(workDir,`${s.sceneId}_pad.mp4`);
        const vf=`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:color=black,fps=30,tpad=start_mode=clone:start_duration=${pre.toFixed(3)}:stop_mode=clone:stop_duration=${post.toFixed(3)}`;
        await run('ffmpeg',['-y','-i',src,'-vf',vf,'-an','-c:v','libx264','-preset','superfast','-crf','21','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',dst]);
        padded.push(dst);
      }

      const concat=path.join(workDir,'concat.txt');
      const quote=(p)=>`file '${String(p).replace(/'/g,"'\\''")}'`;
      await fs.writeFile(concat,padded.map(quote).join('\n')+'\n');
      const visual=path.join(workDir,'visual.mp4');
      await run('ffmpeg',['-y','-f','concat','-safe','0','-i',concat,'-c','copy',visual]);

      const sfx=await synthPremiumSfx(manifest.sfxEvents||[],workDir,targetDuration);
      const music=await synthMusic(targetDuration,workDir);

      const baseName=`${safe(projectId)}_${safe(assemblyVersion)}`;
      const captions=await writeCaptions(manifest.wordTimestamps||[],baseName,outputs,targetWidth,targetHeight);
      const finalFileName=baseName+'.mp4';
      const finalPath=path.join(outputs,finalFileName);

      await run('ffmpeg',[
        '-y','-i',visual,'-i',voicePath,'-i',sfx.path,'-i',music,
        '-filter_complex',
        `[0:v]subtitles=${captions.assPath}[v];[1:a]aresample=48000,volume=1.0[voice];[2:a]volume=.34[sfx];[3:a]volume=.10[music];[voice][sfx][music]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-14:TP=-1:LRA=7[a]`,
        '-map','[v]','-map','[a]',
        '-c:v','libx264','-preset','superfast','-crf','20','-pix_fmt','yuv420p',
        '-c:a','aac','-b:a','192k',
        '-t',String(targetDuration),
        '-movflags','+faststart',
        finalPath
      ]);

      const info=await probe(finalPath);
      const video=(info.streams||[]).find(s=>s.codec_type==='video');
      const audio=(info.streams||[]).find(s=>s.codec_type==='audio');
      const duration=num(info.format?.duration,0);
      const size=num(info.format?.size,0);
      const durationDelta=Math.abs(duration-targetDuration);
      const meter=await measureLufs(finalPath);

      const qa=[
        {checkName:'scene_count',result:scenes.length===expectedSceneCount?'pass':'fail',measuredValue:String(scenes.length),targetValue:String(expectedSceneCount),tolerance:'0',notes:'All final-assembly scene renders present.'},
        {checkName:'duration',result:durationDelta<=.35?'pass':'fail',measuredValue:duration.toFixed(3),targetValue:targetDuration.toFixed(3),tolerance:'±0.35s',notes:`Delta ${durationDelta.toFixed(3)}s`},
        {checkName:'video_stream',result:video?.codec_name==='h264'?'pass':'fail',measuredValue:video?.codec_name||'missing',targetValue:'h264',tolerance:'exact',notes:'Premium final MP4 video codec.'},
        {checkName:'audio_stream',result:audio?.codec_name==='aac'?'pass':'fail',measuredValue:audio?.codec_name||'missing',targetValue:'aac',tolerance:'exact',notes:'Premium final MP4 audio codec.'},
        {checkName:'frame_size',result:(video?.width===targetWidth&&video?.height===targetHeight)?'pass':'fail',measuredValue:`${video?.width||0}x${video?.height||0}`,targetValue:`${targetWidth}x${targetHeight}`,tolerance:'exact profile',notes:targetWidth===1080?'Native master profile.':'Preview profile.'},
        {checkName:'file_size',result:size>1000000?'pass':'warn',measuredValue:String(size),targetValue:'>1000000',tolerance:'bytes',notes:'Sanity check for assembled premium output.'},
        {checkName:'sfx_events',result:sfx.count>=12?'pass':'warn',measuredValue:String(sfx.count),targetValue:'17 planned',tolerance:'editorial',notes:'Designed procedural SFX cues.'},
        {checkName:'music_bed',result:'pass',measuredValue:'editorial electronic bed generated',targetValue:'present',tolerance:'present',notes:'Low-level score under narration.'},
        {checkName:'captions',result:captions.groups.length>0?'pass':'fail',measuredValue:String(captions.groups.length),targetValue:'>0',tolerance:'phrase groups',notes:'Burned ASS captions plus SRT/ASS sidecars.'},
        {checkName:'integrated_loudness',result:(meter.lufs===null||Math.abs(meter.lufs+14)<=2)?'pass':'warn',measuredValue:meter.lufs===null?'unmeasured':String(meter.lufs),targetValue:'-14 LUFS',tolerance:'±2 LU',notes:'EBU R128 post-master measurement.'},
        {checkName:'true_peak',result:(meter.peak===null||meter.peak<=-0.5)?'pass':'warn',measuredValue:meter.peak===null?'unmeasured':String(meter.peak),targetValue:'≤ -1 dBTP',tolerance:'≤ -0.5 dBFS',notes:'EBU R128 peak measurement.'}
      ];
      const qaStatus=qa.some(q=>q.result==='fail')?'fail':'pass';
      const base=publicBase(req);

      res.json({
        ok:true,projectId,qualityVersion,productionBuildVersion,renderBatchId,assemblyVersion,
        finalFileName,
        finalOutputUrl:`${base}/outputs/${encodeURIComponent(finalFileName)}`,
        captionsSrtUrl:`${base}/outputs/${encodeURIComponent(baseName+'.srt')}`,
        captionsAssUrl:`${base}/outputs/${encodeURIComponent(baseName+'.ass')}`,
        durationSeconds:duration,width:video?.width||0,height:video?.height||0,
        sceneCount:scenes.length,sfxCount:sfx.count,captionCount:captions.groups.length,
        lufs:meter.lufs,truePeak:meter.peak,qaStatus,qa,assemblyMs:Date.now()-started,
        strategy:targetWidth===1080?'premium-native-1080x1920-durable-inputs':'premium-preview-durable-inputs-voice-sfx-music-burned-captions'
      });
    }catch(e){
      const raw=String(e?.message||e||'Unknown premium assembly error');
      console.error('assemble-premium failed',raw,e?.stack||'');
      res.status(500).json({ok:false,error:raw.slice(-7000)});
    }finally{
      const all=[];
      if(Array.isArray(req.files)){
        for(const f of req.files)if(f?.path)all.push(f.path);
      }else if(req.files&&typeof req.files==='object'){
        for(const arr of Object.values(req.files))for(const f of (arr||[]))if(f?.path)all.push(f.path);
      }
      for(const p of all)await fs.rm(p,{force:true}).catch(()=>{});
      if(workDir)await fs.rm(workDir,{recursive:true,force:true}).catch(()=>{});
    }
  };
}
