import express from 'express';
import multer from 'multer';
import {timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {IntakeStore,GatewayError,MAX_SOURCE_BYTES} from './gateway-store.mjs';
import {extractRetainedSource} from './source-extractor.mjs';

export function createIntakeRoutes({app,directory,token,profile,allowedChatIds,bindings={},durableStorageConfirmed=false,forbiddenDirectories=[]}){
  if(!directory||!token||!durableStorageConfirmed)throw new GatewayError('intake_storage_and_auth_configuration_required',503);
  if(!path.isAbsolute(directory))throw new GatewayError('absolute_store_directory_required',503);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const actual=fs.realpathSync(directory);
  for(const root of forbiddenDirectories){const relative=path.relative(fs.realpathSync(root),actual);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new GatewayError('private_store_directory_required',503);}
  const store=new IntakeStore({directory,profile,allowedChatIds,bindings});
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
  router.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    const known=error instanceof GatewayError,isUpload=error instanceof multer.MulterError;
    res.status(known?error.status:isUpload?400:500).json({ok:false,error:known?error.code:isUpload?'source_upload_limit_or_field_invalid':'intake_internal_error',release_eligible:false});
  });
  app.use('/intake',router);
  return {store,close:()=>store.close()};
}
