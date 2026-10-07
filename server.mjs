import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderFrames,selectComposition} from '@remotion/renderer';
import {spawn} from 'node:child_process';
import multer from 'multer';
import {createAssemblyHandler} from './assembly.mjs';
import {createPremiumAssemblyHandler} from './premium-assembly.mjs';
import {createSemanticRoutes} from './semantic-preview.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const outputs=path.join(here,'outputs');
const uploads=path.join(here,'uploads');
const frameRoot=path.join(here,'frame-cache');
const stagedRoot=path.join(here,'staged-media');
await fs.mkdir(outputs,{recursive:true});
await fs.mkdir(uploads,{recursive:true});
await fs.mkdir(frameRoot,{recursive:true});
await fs.mkdir(stagedRoot,{recursive:true});

const app=express();
app.set('trust proxy',1);
const PORT=Number(process.env.PORT||8080);
const TOKEN=process.env.RENDER_TOKEN||'';
let bundlePromise=null;
let queue=Promise.resolve();
const upload=multer({dest:uploads});

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

app.use(express.json({limit:'12mb'}));
// Opt-in intake API, registered before renderer authentication so it can use
// its own credential. Existing renderer routes and startup remain unchanged.
if(process.env.INTAKE_STORE_DIR){
  const {createIntakeRoutes}=await import('./intake/gateway-routes.mjs');
  const profile=JSON.parse(await fs.readFile(path.join(here,'quality/approved-visual-reference.json'),'utf8'));
  const bindings=process.env.INTAKE_BINDINGS_FILE?JSON.parse(await fs.readFile(process.env.INTAKE_BINDINGS_FILE,'utf8')):{};
  const intake=createIntakeRoutes({app,directory:process.env.INTAKE_STORE_DIR,token:process.env.INTAKE_TOKEN,
    profile,bindings,allowedChatIds:JSON.parse(process.env.INTAKE_ALLOWED_CHAT_IDS||'["8580375575"]'),
    durableStorageConfirmed:process.env.INTAKE_DURABLE_STORAGE_CONFIRMED==='1',forbiddenDirectories:[here],
    reviewedPlans:{enabled:process.env.INTAKE_REVIEWED_PLAN_ENABLED==='1'},
    reviewRead:{token:process.env.INTAKE_REVIEW_READ_TOKEN||'',eventId:process.env.INTAKE_REVIEW_READ_EVENT_ID||'',expiresAt:Number(process.env.INTAKE_REVIEW_READ_EXPIRES_AT||0)},
    intelligence:{model:process.env.INTAKE_INTELLIGENCE_MODEL||'',paidCallsEnabled:process.env.INTAKE_INTELLIGENCE_PAID_ENABLED==='1'},
    render:{workerEventId:process.env.INTAKE_RENDER_WORKER_EVENT_ID||'',pinnedReview:process.env.INTAKE_RENDER_PINNED_REVIEW?JSON.parse(process.env.INTAKE_RENDER_PINNED_REVIEW):null,assetDirectory:process.env.INTAKE_RENDER_ASSET_DIR||'',guideEnabled:process.env.INTAKE_RENDER_GUIDE_ENABLED==='1',workerEnabled:process.env.INTAKE_RENDER_WORKER_ENABLED==='1'}});
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{Promise.resolve(intake.close()).then(()=>process.exit(0));});
}
app.use('/outputs',express.static(outputs));
app.use('/render-assets',express.static(stagedRoot));

app.use((req,res,next)=>{
  if(!TOKEN||req.path==='/health')return next();
  if((req.get('authorization')||'')!==`Bearer ${TOKEN}`) return res.status(401).json({ok:false,error:'Unauthorized'});
  next();
});

createSemanticRoutes({
  app,outputs,token:TOKEN,baseUrl:publicBase,
  enqueue:job=>{const p=queue.then(job,job);queue=p.catch(()=>{});return p;}
});

app.get('/health',async(req,res)=>{
  let memoryMax=null;
  try{memoryMax=(await fs.readFile('/sys/fs/cgroup/memory.max','utf8')).trim();}catch{}
  res.json({
    ok:true,
    service:'explainer-render-worker',
    version:'0.15.0',
    renderProfile:'universal-media-aware-1080x1920+preview+final-assembly',
    strategy:'staged-media+renderFrames-system-ffmpeg+sequential-scene-rendering',
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

    const pattern=path.join(frameDir,'element-%03d.jpeg');
    await new Promise((resolve,reject)=>{
      const args=[
        '-y',
        '-framerate',String(composition.fps),
        '-i',pattern,
        '-c:v','libx264',
        '-preset','superfast',
        '-crf','24',
        '-pix_fmt','yuv420p',
        '-movflags','+faststart',
        outputLocation
      ];
      const ff=spawn('ffmpeg',args,{stdio:['ignore','pipe','pipe']});
      let stderr='';
      ff.stderr.on('data',d=>{stderr+=d.toString(); if(stderr.length>12000) stderr=stderr.slice(-12000);});
      ff.on('error',reject);
      ff.on('close',(code,signal)=>{
        if(code===0)return resolve();
        reject(new Error(`System FFmpeg failed with code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-5000)}`));
      });
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
    strategy:'renderFrames-then-system-ffmpeg'
  };
}


async function renderProductionOne(body,req){
  const started=Date.now();
  const {
    projectId,
    qualityVersion,
    productionBuildVersion,
    renderTestId='premium-test',
    renderProfile='preview',
    sceneManifest={},
    recipes=[],
    assetTasks=[]
  }=body||{};

  if(!String(sceneManifest.scene_id||'').trim()){
    throw new Error('Missing sceneManifest.scene_id');
  }

  const serveUrl=await getBundle();
  const inputProps={package:{sceneManifest,recipes,assetTasks,qualityVersion,productionBuildVersion}};
  const composition=await selectComposition({serveUrl,id:'ProductionScene',inputProps});

  const safeProject=String(projectId||'project').replace(/[^A-Za-z0-9_-]/g,'_');
  const safeBuild=String(productionBuildVersion||'prod').replace(/[^A-Za-z0-9_-]/g,'_');
  const safeTest=String(renderTestId||'test').replace(/[^A-Za-z0-9_-]/g,'_');
  const fileName=`${safeProject}_${safeBuild}_${sceneManifest.scene_id}_${safeTest}.mp4`;
  const outputLocation=path.join(outputs,fileName);
  const frameDir=path.join(frameRoot,`${safeProject}_${safeBuild}_${sceneManifest.scene_id}_${safeTest}`);

  const normalizedProfile=String(renderProfile||'preview').toLowerCase();
  const scale=(normalizedProfile==='master1080'||normalizedProfile==='native'||normalizedProfile==='full')?1:0.5;
  const width=Math.round(composition.width*scale);
  const height=Math.round(composition.height*scale);

  await fs.rm(frameDir,{recursive:true,force:true});
  await fs.mkdir(frameDir,{recursive:true});

  try{
    const renderAttempt=()=>renderFrames({
      composition,
      serveUrl,
      outputDir:frameDir,
      inputProps,
      imageFormat:'jpeg',
      jpegQuality:scale===1?82:74,
      scale,
      concurrency:1,
      muted:true,
      logLevel:'warn',
      browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE||undefined,
      chromiumOptions:{enableMultiProcessOnLinux:false}
    });

    await renderAttempt();
    await new Promise(r=>setTimeout(r,500));

    let frames=(await fs.readdir(frameDir).catch(()=>[])).filter(x=>/^element-\d+\.jpeg$/i.test(x));
    if(!frames.length){
      console.warn('No frames after first universal render attempt; retrying scene',sceneManifest.scene_id);
      await fs.rm(frameDir,{recursive:true,force:true}).catch(()=>{});
      await fs.mkdir(frameDir,{recursive:true});
      await renderAttempt();
      await new Promise(r=>setTimeout(r,750));
      frames=(await fs.readdir(frameDir).catch(()=>[])).filter(x=>/^element-\d+\.jpeg$/i.test(x));
    }
    if(!frames.length){
      throw new Error(`Universal renderer produced zero JPEG frames for ${sceneManifest.scene_id}`);
    }

    const pattern=path.join(frameDir,'element-%03d.jpeg');
    await new Promise((resolve,reject)=>{
      const args=[
        '-y',
        '-framerate',String(composition.fps),
        '-i',pattern,
        '-c:v','libx264',
        '-preset','superfast',
        '-crf',scale===1?'18':'21',
        '-pix_fmt','yuv420p',
        '-movflags','+faststart',
        outputLocation
      ];
      const ff=spawn('ffmpeg',args,{stdio:['ignore','pipe','pipe']});
      let stderr='';
      ff.stderr.on('data',d=>{stderr+=d.toString(); if(stderr.length>12000) stderr=stderr.slice(-12000);});
      ff.on('error',reject);
      ff.on('close',(code,signal)=>{
        if(code===0)return resolve();
        reject(new Error(`Production FFmpeg failed with code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-5000)}`));
      });
    });
  }finally{
    await fs.rm(frameDir,{recursive:true,force:true}).catch(()=>{});
  }

  const xf=(req.get('x-forwarded-proto')||'').split(',')[0].trim();
  const base=`${xf||req.protocol||'https'}://${req.get('host')}`;

  return {
    ok:true,
    projectId,
    qualityVersion,
    productionBuildVersion,
    renderTestId,
    sceneId:sceneManifest.scene_id,
    outputFileName:fileName,
    outputUrl:`${base}/outputs/${encodeURIComponent(fileName)}`,
    renderMs:Date.now()-started,
    width,
    height,
    fps:composition.fps,
    durationSeconds:composition.durationInFrames/composition.fps,
    strategy:scale===1?'production-native-1080x1920-remotion-2.5d-full-film':'production-preview-remotion-2.5d-full-film',
    renderProfile:normalizedProfile,
    rendererVersion:'0.15.0'
  };
}

function compactError(e){
  const raw=String(e?.message||e||'Unknown error');
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
  const tail=lines.slice(-18).join(' | ');
  return tail.slice(-3000);
}

function publicBase(req){
  const xf=(req.get('x-forwarded-proto')||'').split(',')[0].trim();
  return `${xf||req.protocol||'https'}://${req.get('host')}`;
}

function safePart(v){
  return String(v??'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,180);
}

function taskDriveId(task={}){
  if(task.drive_file_id) return String(task.drive_file_id);
  const spec=task.build_spec||{};
  const params=Array.isArray(spec.parameters)?spec.parameters:[];
  return String(params.find(x=>x?.name==='drive_file_id')?.value||'');
}

function enrichStagedAssets(assetTasks=[],stagedMedia=[]){
  const byDrive=new Map((stagedMedia||[]).map(x=>[String(x.drive_file_id||''),String(x.staged_local_url||x.staged_url||'')]));
  return (assetTasks||[]).map(task=>{
    const id=taskDriveId(task);
    const staged=byDrive.get(id)||String(task.staged_url||'');
    return {...task,staged_url:staged};
  });
}

async function renderUniversalOne(body,req){
  const started=Date.now();
  const {
    projectId,
    qualityVersion,
    productionBuildVersion,
    renderBatchId='universal-render',
    renderProfile='native',
    sceneManifest={},
    recipes=[],
    assetTasks=[],
    stagedMedia=[]
  }=body||{};

  if(!String(sceneManifest.scene_id||'').trim()) throw new Error('Missing sceneManifest.scene_id');

  const enrichedTasks=enrichStagedAssets(assetTasks,stagedMedia);
  const missing=enrichedTasks.filter(x=>String(x.source_mode||'')==='google_drive_source_media'&&!String(x.staged_url||'').trim());
  if(missing.length){
    throw new Error('Missing staged media for '+missing.map(x=>x.asset_id||taskDriveId(x)).join(', '));
  }

  const serveUrl=await getBundle();
  const inputProps={package:{sceneManifest,recipes,assetTasks:enrichedTasks,qualityVersion,productionBuildVersion}};
  const composition=await selectComposition({serveUrl,id:'ProductionScene',inputProps});

  const safeProject=safePart(projectId||'project');
  const safeBuild=safePart(productionBuildVersion||'prod');
  const safeBatch=safePart(renderBatchId||'batch');
  const sceneId=safePart(sceneManifest.scene_id);
  const fileName=`${safeProject}_${safeBuild}_${sceneId}_${safeBatch}.mp4`;
  const outputLocation=path.join(outputs,fileName);
  const frameDir=path.join(frameRoot,`${safeProject}_${safeBuild}_${sceneId}_${safeBatch}`);

  const normalizedProfile=String(renderProfile||'native').toLowerCase();
  const scale=(normalizedProfile==='preview'||normalizedProfile==='540'||normalizedProfile==='half')?0.5:1;
  const width=Math.round(composition.width*scale);
  const height=Math.round(composition.height*scale);

  await fs.rm(frameDir,{recursive:true,force:true});
  await fs.mkdir(frameDir,{recursive:true});

  try{
    const expectedFrames=Math.max(1,Number(composition.durationInFrames||0));
    const shortScene=(expectedFrames/Number(composition.fps||30))<=5;
    const maxAttempts=shortScene?3:2;

    const renderAttempt=async(attempt)=>{
      await fs.rm(frameDir,{recursive:true,force:true}).catch(()=>{});
      await fs.mkdir(frameDir,{recursive:true});

      await renderFrames({
        composition,
        serveUrl,
        outputDir:frameDir,
        inputProps,
        imageFormat:'jpeg',
        jpegQuality:scale===1?82:74,
        scale,
        concurrency:1,
        muted:true,
        logLevel:'warn',
        browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE||undefined,
        chromiumOptions:{enableMultiProcessOnLinux:false}
      });

      await new Promise(r=>setTimeout(r,shortScene?900:600));

      const frames=(await fs.readdir(frameDir).catch(()=>[]))
        .filter(x=>/^element-\d+\.jpeg$/i.test(x))
        .sort((a,b)=>{
          const ai=Number((a.match(/(\d+)/)||[])[1]||0);
          const bi=Number((b.match(/(\d+)/)||[])[1]||0);
          return ai-bi;
        });

      const indexes=frames.map(x=>Number((x.match(/(\d+)/)||[])[1]||-1));
      const unique=new Set(indexes);
      const first=indexes.length?Math.min(...indexes):-1;
      const last=indexes.length?Math.max(...indexes):-1;
      const contiguous=indexes.length===unique.size &&
        first===0 &&
        last===expectedFrames-1 &&
        indexes.length===expectedFrames;

      console.log('universal frame validation',{
        sceneId:sceneManifest.scene_id,
        attempt,
        shortScene,
        expectedFrames,
        actualFrames:frames.length,
        firstFrame:first,
        lastFrame:last,
        contiguous
      });

      return {frames,indexes,contiguous,first,last};
    };

    let validation=null;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      validation=await renderAttempt(attempt);
      if(validation.contiguous) break;
      if(attempt<maxAttempts){
        console.warn(
          'Universal frame validation failed; retrying scene',
          sceneManifest.scene_id,
          `attempt ${attempt}/${maxAttempts}`,
          `expected ${expectedFrames}, got ${validation.frames.length}`
        );
        await new Promise(r=>setTimeout(r,shortScene?1000:700));
      }
    }

    if(!validation?.contiguous){
      throw new Error(
        `Universal renderer frame validation failed for ${sceneManifest.scene_id}: expected ${expectedFrames} contiguous JPEG frames (0-${expectedFrames-1}), got ${validation?.frames?.length||0}; first=${validation?.first??-1}, last=${validation?.last??-1}`
      );
    }

    const pattern=path.join(frameDir,'element-%03d.jpeg');
    await new Promise((resolve,reject)=>{
      const args=[
        '-y','-framerate',String(composition.fps),'-i',pattern,
        '-c:v','libx264','-preset','superfast','-crf',scale===1?'18':'21',
        '-pix_fmt','yuv420p','-movflags','+faststart',outputLocation
      ];
      const ff=spawn('ffmpeg',args,{stdio:['ignore','pipe','pipe']});
      let stderr='';
      ff.stderr.on('data',d=>{stderr+=d.toString();if(stderr.length>12000)stderr=stderr.slice(-12000);});
      ff.on('error',reject);
      ff.on('close',(code,signal)=>{
        if(code===0)return resolve();
        reject(new Error(`Universal FFmpeg failed with code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-5000)}`));
      });
    });
  }finally{
    await fs.rm(frameDir,{recursive:true,force:true}).catch(()=>{});
  }

  return {
    ok:true,
    projectId,
    qualityVersion,
    productionBuildVersion,
    renderBatchId,
    sceneId:sceneManifest.scene_id,
    outputFileName:fileName,
    outputUrl:`${publicBase(req)}/outputs/${encodeURIComponent(fileName)}`,
    renderMs:Date.now()-started,
    width,height,fps:composition.fps,
    durationSeconds:composition.durationInFrames/composition.fps,
    strategy:scale===1?'universal-native-1080x1920-media-aware':'universal-preview-540x960-media-aware',
    renderProfile:normalizedProfile,
    rendererVersion:'0.15.0'
  };
}

app.post('/stage-media',upload.single('media'),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ok:false,error:'Missing multipart media file'});
    const projectId=safePart(req.body?.projectId||'project');
    const build=safePart(req.body?.productionBuildVersion||'build');
    const driveFileId=safePart(req.body?.driveFileId||req.body?.assetKey||req.file.originalname||Date.now());
    const ext=path.extname(req.file.originalname||'')||'.mp4';
    const dir=path.join(stagedRoot,projectId,build);
    await fs.mkdir(dir,{recursive:true});
    const target=path.join(dir,driveFileId+ext);
    await fs.copyFile(req.file.path,target);
    await fs.rm(req.file.path,{force:true}).catch(()=>{});
    const rel=[projectId,build,path.basename(target)].map(encodeURIComponent).join('/');
    res.json({
      ok:true,
      drive_file_id:req.body?.driveFileId||'',
      staged_file_name:path.basename(target),
      staged_url:`${publicBase(req)}/render-assets/${rel}`,
      staged_local_url:`http://127.0.0.1:${PORT}/render-assets/${rel}`
    });
  }catch(e){
    res.status(500).json({ok:false,error:compactError(e)});
  }
});

app.post('/cleanup-staged-media',async(req,res)=>{
  const projectId=safePart(req.body?.projectId||'');
  const build=safePart(req.body?.productionBuildVersion||'');
  if(!projectId||!build) return res.status(400).json({ok:false,error:'Missing project/build'});
  await fs.rm(path.join(stagedRoot,projectId,build),{recursive:true,force:true}).catch(()=>{});
  res.json({ok:true,projectId,productionBuildVersion:build});
});

app.post('/render-universal-scene',(req,res)=>{
  const job=()=>renderUniversalOne(req.body,req);
  const p=queue.then(job,job);
  queue=p.catch(()=>{});
  p.then(x=>res.json(x)).catch((e)=>{
    const error=compactError(e);
    console.error('render-universal-scene failed',error);
    res.status(500).json({ok:false,error});
  });
});

app.post('/render-universal-batch',async(req,res)=>{
  const body=req.body||{};
  const packages=Array.isArray(body.packages)?body.packages:[];
  if(!packages.length) return res.status(400).json({ok:false,error:'Missing packages array'});
  const results=[];
  for(const item of packages){
    try{
      results.push(await renderUniversalOne(item,req));
    }catch(e){
      results.push({
        ok:false,
        sceneId:item?.sceneManifest?.scene_id||'',
        projectId:item?.projectId||'',
        productionBuildVersion:item?.productionBuildVersion||'',
        error:compactError(e)
      });
    }
    await new Promise(r=>setTimeout(r,350));
  }
  const failed=results.filter(x=>x.ok!==true).length;
  res.status(failed?207:200).json({
    ok:failed===0,
    total:results.length,
    rendered:results.length-failed,
    failed,
    results,
    rendererVersion:'0.15.0',
    strategy:'universal-sequential-media-aware'
  });
});

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

app.get('/test-production-s02',async(req,res)=>{
  try{
    const result=await renderProductionOne({
      projectId:'VID-20260923-860786371',
      qualityVersion:'quality-20260928113113',
      productionBuildVersion:'prod-20260928120447',
      renderTestId:'browser-premium',
      sceneManifest:{scene_id:'S02',start_sec:5.677,end_sec:15.209,duration_sec:9.532},
      recipes:[],
      assetTasks:[]
    },req);
    res.json(result);
  }catch(e){
    const error=compactError(e);
    console.error('test-production-s02 failed',error);
    res.status(500).json({ok:false,error});
  }
});

app.post('/render-production-batch',async(req,res)=>{
  const body=req.body||{};
  const packages=Array.isArray(body.packages)?body.packages:[];
  if(!packages.length) return res.status(400).json({ok:false,error:'Missing packages array'});
  const results=[];
  for(const item of packages){
    try{
      const result=await renderProductionOne(item,req);
      results.push(result);
    }catch(e){
      const error=compactError(e);
      console.error('render-production-batch item failed',item?.sceneManifest?.scene_id||'',error);
      results.push({
        ok:false,
        sceneId:item?.sceneManifest?.scene_id||'',
        projectId:item?.projectId||'',
        productionBuildVersion:item?.productionBuildVersion||'',
        error
      });
    }
    await new Promise(r=>setTimeout(r,350));
  }
  const failed=results.filter(x=>x.ok!==true).length;
  res.status(failed?207:200).json({
    ok:failed===0,
    total:results.length,
    rendered:results.length-failed,
    failed,
    results,
    rendererVersion:'0.15.0'
  });
});

app.post('/render-production-scene',(req,res)=>{
  const job=()=>renderProductionOne(req.body,req);
  const p=queue.then(job,job);
  queue=p.catch(()=>{});
  p.then(x=>res.json(x)).catch((e)=>{
    const error=compactError(e);
    const stack=String(e?.stack||'').split('\n').slice(0,8).join('\n');
    console.error('render-production-scene failed',error,stack);
    res.status(500).json({ok:false,error,details:stack});
  });
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

app.post('/refresh-scenes',async(req,res)=>{
  const body=req.body||{};
  const requests=Array.isArray(body.requests)?body.requests:[];
  if(!requests.length) return res.status(400).json({ok:false,error:'Missing requests array'});

  const results=[];
  for(const item of requests){
    try{
      const result=await renderOne(item,req);
      results.push(result);
    }catch(e){
      const error=compactError(e);
      console.error('refresh-scenes item failed',item?.scene?.scene_id||'',error);
      results.push({
        ok:false,
        sceneId:item?.scene?.scene_id||'',
        projectId:item?.projectId||'',
        renderBatchId:item?.renderBatchId||'',
        error
      });
    }
    await new Promise(r=>setTimeout(r,350));
  }

  const failed=results.filter(x=>x.ok!==true).length;
  res.status(failed?207:200).json({
    ok:failed===0,
    total:results.length,
    rendered:results.length-failed,
    failed,
    results
  });
});

app.post('/assemble-final',upload.single('voice'),createAssemblyHandler({here,outputs}));

app.post('/assemble-premium',upload.any(),createPremiumAssemblyHandler({here,outputs}));

app.listen(PORT,'0.0.0.0',()=>console.log(`render-worker listening on :${PORT}`));
