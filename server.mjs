import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderFrames,selectComposition,stitchFramesToVideo} from '@remotion/renderer';

const here=path.dirname(fileURLToPath(import.meta.url));
const outputs=path.join(here,'outputs');
const frameRoot=path.join(here,'frame-cache');
await fs.mkdir(outputs,{recursive:true});
await fs.mkdir(frameRoot,{recursive:true});

const app=express();
const PORT=Number(process.env.PORT||8080);
const TOKEN=process.env.RENDER_TOKEN||'';
let bundlePromise=null;
let queue=Promise.resolve();

const getBundle=()=>bundlePromise??=bundle({entryPoint:path.join(here,'src/index.jsx')});

function num(v,fallback=0){
  const n=Number(v);
  return Number.isFinite(n)?n:fallback;
}

function normalizeScene(raw={}){
  const timing=raw.timing||{};
  const start=num(raw.start_sec ?? timing.start_sec,0);
  const duration=num(raw.duration_sec ?? timing.duration_sec,1);
  const end=num(raw.end_sec ?? timing.end_sec,start+duration);

  const components=(raw.components||[]).map((c)=>{
    const p=c.parameter_plan||{};
    const cs=num(c.start_sec ?? p.start_sec,start);
    const cd=num(c.duration_sec ?? p.duration_sec,1);
    const ce=num(c.end_sec ?? p.end_sec,cs+cd);
    const text=c.on_screen_text ?? p.on_screen_text ?? [];
    let data=c.data ?? p.data ?? undefined;

    if(!data && c.component_id==='D3_BAR_REVEAL'){
      const joined=Array.isArray(text)?text.join(' '):String(text||'');
      const m=joined.match(/\$?([0-9]+(?:\.[0-9]+)?)B/i);
      const value=m?Number(m[1]):0;
      data={value};
      if(/2009/.test(joined)) data.previous=5.07;
    }

    return {
      ...c,
      start_sec:cs,
      end_sec:ce,
      duration_sec:cd,
      narration:c.narration ?? p.narration ?? '',
      visual_type:c.visual_type ?? p.visual_type ?? '',
      visual_concept:c.visual_concept ?? p.visual_concept ?? '',
      on_screen_text:text,
      emphasis_words:c.emphasis_words ?? p.emphasis_words ?? [],
      motion_notes:c.motion_notes ?? p.motion_notes ?? '',
      sfx_cues:c.sfx_cues ?? p.sfx_cues ?? [],
      data
    };
  });

  return {...raw,start_sec:start,end_sec:end,duration_sec:duration,components};
}

app.use(express.json({limit:'8mb'}));
app.use('/outputs',express.static(outputs));

app.use((req,res,next)=>{
  if(!TOKEN||req.path==='/health')return next();
  if((req.get('authorization')||'')!==`Bearer ${TOKEN}`) return res.status(401).json({ok:false,error:'Unauthorized'});
  next();
});

app.get('/health',async(req,res)=>{
  let memoryMax=null;
  try{memoryMax=(await fs.readFile('/sys/fs/cgroup/memory.max','utf8')).trim();}catch{}
  res.json({
    ok:true,
    service:'explainer-render-worker',
    version:'0.9.5',
    renderProfile:'two-stage-540x960',
    strategy:'renderFrames-then-stitch',
    memoryMax,
    heapMb:Math.round(process.memoryUsage().heapUsed/1024/1024)
  });
});

async function renderOne(body,req){
  const started=Date.now();
  const {projectId,buildVersion,renderBatchId}=body||{};
  const scene=normalizeScene(body?.scene||{});

  if(!scene.scene_id) throw new Error('Missing scene.scene_id');
  if(!scene.components.length) throw new Error(`Scene ${scene.scene_id} has no components`);

  const serveUrl=await getBundle();
  const inputProps={scene};
  const composition=await selectComposition({serveUrl,id:'Scene',inputProps});

  const safeProject=String(projectId||'project').replace(/[^A-Za-z0-9_-]/g,'_');
  const safeBatch=String(renderBatchId||'batch').replace(/[^A-Za-z0-9_-]/g,'_');
  const fileName=`${safeProject}_${safeBatch}_${scene.scene_id}.mp4`;
  const outputLocation=path.join(outputs,fileName);
  const frameDir=path.join(frameRoot,`${safeProject}_${safeBatch}_${scene.scene_id}`);
  const scale=0.5;
  const width=Math.round(composition.width*scale);
  const height=Math.round(composition.height*scale);

  await fs.rm(frameDir,{recursive:true,force:true});
  await fs.mkdir(frameDir,{recursive:true});

  try{
    const {assetsInfo}=await renderFrames({
      composition,
      serveUrl,
      outputDir:frameDir,
      inputProps,
      imageFormat:'jpeg',
      jpegQuality:68,
      scale,
      concurrency:1,
      muted:true,
      logLevel:'warn',
      browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE||undefined,
      chromiumOptions:{enableMultiProcessOnLinux:false}
    });

    await new Promise(r=>setTimeout(r,250));

    await stitchFramesToVideo({
      fps:composition.fps,
      width,
      height,
      assetsInfo,
      outputLocation,
      codec:'h264',
      pixelFormat:'yuv420p',
      crf:24,
      muted:true,
      x264Preset:'superfast',
      verbose:true
    });
  } finally {
    await fs.rm(frameDir,{recursive:true,force:true}).catch(()=>{});
  }

  const base=`${req.protocol}://${req.get('host')}`;
  return {
    ok:true,
    projectId,
    buildVersion,
    renderBatchId,
    sceneId:scene.scene_id,
    outputFileName:fileName,
    outputUrl:`${base}/outputs/${encodeURIComponent(fileName)}`,
    renderMs:Date.now()-started,
    width,
    height,
    strategy:'renderFrames-then-stitch'
  };
}

function compactError(e){
  const raw=String(e?.message||e||'Unknown error');
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
  const tail=lines.slice(-18).join(' | ');
  return tail.slice(-3000);
}

app.get('/test-s01',async(req,res)=>{
  try{
    const manifest=JSON.parse(await fs.readFile(path.join(here,'src','manifest.json'),'utf8'));
    const scene=manifest.scenes?.[0];
    const result=await renderOne({
      projectId:manifest.project_id,
      buildVersion:manifest.build_version,
      renderBatchId:'browser-test',
      scene
    },req);
    res.json(result);
  }catch(e){
    const error=compactError(e);
    console.error('test-s01 failed',error);
    res.status(500).json({ok:false,error});
  }
});

app.post('/render-scene',(req,res)=>{
  const job=()=>renderOne(req.body,req);
  const p=queue.then(job,job);
  queue=p.catch(()=>{});
  p.then(x=>res.json(x)).catch((e)=>{
    const error=compactError(e);
    const stack=String(e?.stack||'').split('\n').slice(0,8).join('\n');
    console.error('render-scene failed',error,stack);
    res.status(500).json({ok:false,error,details:stack});
  });
});

app.listen(PORT,'0.0.0.0',()=>console.log(`render-worker listening on :${PORT}`));
