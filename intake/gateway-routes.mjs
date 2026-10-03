import express from 'express';
import multer from 'multer';
import {timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {IntakeStore,GatewayError,MAX_SOURCE_BYTES} from './gateway-store.mjs';
import {extractRetainedSource} from './source-extractor.mjs';
import {IntelligenceAdapter} from '../intelligence/adapter-store.mjs';
import {ReviewedPlanAdapter} from '../intelligence/reviewed-plan-store.mjs';
import {RenderAdapter} from './render-adapter.mjs';
import {DurableRenderWorker} from './render-worker.mjs';

export function createIntakeRoutes({app,directory,token,profile,allowedChatIds,bindings={},durableStorageConfirmed=false,forbiddenDirectories=[],intelligence={},render={},reviewedPlans={}}){
  if(!directory||!token||!durableStorageConfirmed)throw new GatewayError('intake_storage_and_auth_configuration_required',503);
  if(!path.isAbsolute(directory))throw new GatewayError('absolute_store_directory_required',503);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const actual=fs.realpathSync(directory);
  for(const root of forbiddenDirectories){const relative=path.relative(fs.realpathSync(root),actual);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new GatewayError('private_store_directory_required',503);}
  const store=new IntakeStore({directory,profile,allowedChatIds,bindings});
  const adapter=new IntelligenceAdapter(store,intelligence);
  const reviewer=new ReviewedPlanAdapter(store,reviewedPlans);
  const renderer=new RenderAdapter(store,{directory,...render});
  const renderWorker=render.workerEnabled===true?new DurableRenderWorker(renderer):null;
  if(renderWorker&&!render.guideEnabled)throw new GatewayError('local_guide_adapter_must_be_configured',503);
  const router=express.Router();
  router.use((req,res,next)=>{
    const provided=Buffer.from(req.get('authorization')??''),expected=Buffer.from('Bearer '+token);
    if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return res.status(401).json({ok:false,error:'Unauthorized'});next();
  });
  router.use(express.json({limit:'1mb'}));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_SOURCE_BYTES,files:1,fields:2,fieldSize:1024*1024}});
  const perform=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  router.post('/requests',upload.single('source'),perform(async(req,res)=>{
    let input=req.body;
    if(req.is('multipart/form-data')){try{input=JSON.parse(req.body.request);}catch{throw new GatewayError('request_json_required',400);}}
    const telegramUpdate=input?.telegram_update;
    // Re-normalize the original envelope; ignore supplied approval / route flags.
    const result=store.retain({telegramUpdate,files:req.file?[{bytes:req.file.buffer,fileName:req.file.originalname,mimeType:req.file.mimetype}]:[]});
    const job=await extractRetainedSource(store,result.job.event_id);
    res.status(result.duplicate?200:201).json({ok:true,duplicate:result.duplicate,job,release_eligible:false});
  }));
  router.get('/jobs/:id',perform(async(req,res)=>res.json({ok:true,job:store.get(req.params.id)})));
  router.get('/jobs/:id/source',perform(async(req,res)=>{
    const source=store.get(req.params.id).sources[0];if(!source)throw new GatewayError('source_not_found',404);
    res.set('Content-Type','application/octet-stream');res.set('Content-Disposition','attachment; filename="source.bin"');res.set('X-Source-SHA256',source.sha256);res.set('Cache-Control','no-store');res.send(store.sourceBytes(req.params.id));
  }));
  router.post('/jobs/:id/claim',perform(async(req,res)=>res.json({ok:true,...store.claim(req.params.id)})));
  router.post('/jobs/:id/complete',perform(async(req,res)=>res.json({ok:true,job:store.complete(req.params.id,req.body?.lease_token,req.body?.receipt)})));
  router.get('/jobs/:id/intelligence',perform(async(req,res)=>{store.get(req.params.id);res.json({ok:true,...adapter.get(req.params.id)});}));
  router.post('/jobs/:id/intelligence/prepare',perform(async(req,res)=>res.json({ok:true,...adapter.prepare(req.params.id)})));
  router.post('/jobs/:id/intelligence/retry',perform(async(req,res)=>res.json({ok:true,...adapter.retry(req.params.id,req.body)})));
  router.get('/jobs/:id/intelligence/revisions',perform(async(req,res)=>res.json({ok:true,...reviewer.list(req.params.id)})));
  router.get('/jobs/:id/intelligence/revisions/:revision',perform(async(req,res)=>res.json({ok:true,...reviewer.get(req.params.id,req.params.revision)})));
  router.post('/jobs/:id/intelligence/revisions',perform(async(req,res)=>res.json({ok:true,...reviewer.submit(req.params.id,req.body)})));
  router.post('/jobs/:id/intelligence/call',perform(async(req,res)=>res.json({ok:true,...adapter.authorizeCall(req.params.id)})));
  router.post('/jobs/:id/intelligence/result',perform(async(req,res)=>res.json({ok:true,...adapter.recordResult(req.params.id,req.body?.call_token,req.body?.response)})));
  router.post('/jobs/:id/render/enqueue',perform(async(req,res)=>{
    // Ignore caller-supplied plans, timing, asset paths, QC and approval flags.
    const result=renderer.enqueue(req.params.id,{reviewRevisionId:req.body?.review_revision_id??''});res.status(result.status==='queued'?202:200).json({ok:true,...result});
  }));
  router.get('/jobs/:id/render',perform(async(req,res)=>res.json({ok:true,...renderer.get(req.params.id)})));
  router.get('/jobs/:id/render/artifacts/:key',perform(async(req,res)=>{
    const artifact=renderer.artifact(req.params.id,req.params.key);
    res.set('Content-Type',artifact.mime_type);res.set('Cache-Control','no-store');res.set('X-Artifact-SHA256',artifact.sha256);res.set('X-Content-Type-Options','nosniff');res.send(artifact.bytes);
  }));
  router.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    const known=error instanceof GatewayError,isUpload=error instanceof multer.MulterError;
    res.status(known?error.status:isUpload?400:500).json({ok:false,error:known?error.code:isUpload?'source_upload_limit_or_field_invalid':'intake_internal_error',release_eligible:false});
  });
  app.use('/intake',router);
  renderWorker?.start();
  return {store,adapter,reviewer,renderer,renderWorker,close:()=>renderWorker?renderWorker.stop().then(()=>store.close()):store.close()};
}
