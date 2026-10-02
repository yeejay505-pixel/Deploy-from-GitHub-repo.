import {createCanvas} from '@napi-rs/canvas';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {compileSceneSpec,validateSceneSpec} from './src/semantic/scene-contract.mjs';
import {SCENE_SCHEMA,OBJECT_TYPES,ACTION_PROPERTIES,CUE_TYPES} from './src/semantic/scene-schema.mjs';
import {drawSemanticScene} from './src/semantic/scene-renderer.mjs';

export function semanticCapabilities(){return {version:'semantic-scene-1',schema:SCENE_SCHEMA,objectTypes:OBJECT_TYPES,properties:ACTION_PROPERTIES,cueTypes:CUE_TYPES,maxDuration:60,previewOnly:true,voiceIncluded:false};}
function soundWave(spec){
  const rate=48000,samples=new Float32Array(Math.ceil(spec.duration*rate));
  for(const cue of spec.cues){
    const length=cue.type==='resolve'?.6:cue.type==='whoosh'?.4:.08;
    const level=cue.type==='arrival'?.035:.055;
    for(let i=0;i<length*rate;i++){
      const at=Math.floor(cue.time*rate)+i;if(at>=samples.length)break;
      const t=i/rate,p=t/length;let v;
      if(cue.type==='resolve')v=(Math.sin(2*Math.PI*523.25*t)+.5*Math.sin(2*Math.PI*783.99*t))*Math.exp(-7*t)*Math.min(1,t/.01);
      else if(cue.type==='whoosh')v=(Math.sin(2*Math.PI*(190*t+750*t*t))+.3*Math.sin(2*Math.PI*830*t))*Math.sin(Math.PI*p)**2*.35;
      else v=Math.sin(2*Math.PI*420*t)*Math.exp(-65*t)*Math.min(1,t/.002);
      samples[at]+=v*level;
    }
  }
  const buffer=Buffer.alloc(44+samples.length*2);buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
  for(let i=0;i<samples.length;i++)buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);
  return buffer;
}
export async function renderSemanticPreview({spec,outputPath,width=1080,onProgress=()=>{}}){
  const compiled=compileSceneSpec(spec);
  if(![540,1080].includes(width))throw new Error('Preview width must be 540 or 1080');
  const height=width*16/9,fps=30,frames=Math.ceil(spec.duration*fps);
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
  await fs.mkdir(path.dirname(outputPath),{recursive:true});const wav=`${outputPath}.sfx.wav`;
  await fs.writeFile(wav,soundWave(spec));
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',wav,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',outputPath],{stdio:['pipe','ignore','pipe']});
  let stderr='';ff.stderr.on('data',d=>stderr=(stderr+d.toString()).slice(-3000));
  const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(`FFmpeg ${code}: ${stderr}`)));});
  done.catch(()=>{});
  try{
    for(let frame=0;frame<frames;frame++){
      drawSemanticScene(ctx,compiled,frame/fps,{width,height});
      if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');
      if(frame%150===0)onProgress(frame,frames);
    }
    ff.stdin.end();await done;
  }catch(e){ff.stdin.destroy();ff.kill();await fs.rm(outputPath,{force:true});throw e;}
  finally{await fs.rm(wav,{force:true});}
  return {width,height,fps,durationSeconds:frames/fps,audio:'sfx_only',voicePending:true,timingBasis:spec.timingBasis,creativeApproval:'pending',previewOnly:true,releaseEligible:false};
}
export function createSemanticRoutes({app,outputs,token,enqueue,baseUrl}){
  const auth=(req,res,next)=>{if(!token)return res.status(503).json({ok:false,error:'Configure RENDER_TOKEN for semantic preview endpoints.'});if(req.get('authorization')!==`Bearer ${token}`)return res.status(401).json({ok:false,error:'Unauthorized'});next();};
  app.get('/semantic-capabilities',auth,(req,res)=>res.json(semanticCapabilities()));
  app.post('/validate-semantic-scene',auth,(req,res)=>{
    const result=validateSceneSpec(req.body?.spec);res.status(result.ok?200:422).json({...result,previewOnly:true,releaseEligible:false});
  });
  app.post('/render-semantic-preview',auth,(req,res)=>{
    const result=validateSceneSpec(req.body?.spec);
    if(!result.ok)return res.status(422).json(result);
    const spec=req.body.spec;
    if(req.body.width!==undefined&&![540,1080].includes(req.body.width))return res.status(422).json({ok:false,error:'Width must be 540 or 1080'});
    const digest=createHash('sha256').update(JSON.stringify(spec)).digest('hex');
    const renderId=`semantic-${spec.sceneId}-${digest.slice(0,12)}-${Date.now()}`;
    const outputFileName=`${renderId}.mp4`,outputPath=path.join(outputs,outputFileName);
    enqueue(async()=>{
      const metadata=await renderSemanticPreview({spec,outputPath,width:req.body.width??1080});
      const manifestDir=path.join(path.dirname(outputs),'semantic-manifests');
      await fs.mkdir(manifestDir,{recursive:true});
      await fs.writeFile(path.join(manifestDir,`${renderId}.json`),JSON.stringify(spec,null,2));
      return {ok:true,renderId,specSha256:digest,outputFileName,outputUrl:`${baseUrl(req)}/outputs/${outputFileName}`,...metadata};
    }).then(data=>res.json(data)).catch(e=>res.status(500).json({ok:false,error:String(e.message).slice(0,2000)}));
  });
  app.get('/semantic-manifest/:renderId',auth,async(req,res)=>{
    const id=req.params.renderId;
    if(!/^semantic-[A-Za-z0-9_-]{1,150}$/.test(id))return res.status(400).json({ok:false,error:'Invalid renderId'});
    try{res.json(JSON.parse(await fs.readFile(path.join(path.dirname(outputs),'semantic-manifests',`${id}.json`),'utf8')));}
    catch{res.status(404).json({ok:false,error:'Manifest not found'});}
  });
}
