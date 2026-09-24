import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia,selectComposition} from '@remotion/renderer';
const here=path.dirname(fileURLToPath(import.meta.url)), outputs=path.join(here,'outputs');
await fs.mkdir(outputs,{recursive:true});
const app=express(), PORT=Number(process.env.PORT||8787), TOKEN=process.env.RENDER_TOKEN||'';
let bundlePromise=null,queue=Promise.resolve();
const getBundle=()=>bundlePromise??=(bundle({entryPoint:path.join(here,'src/index.jsx')}));
app.use(express.json({limit:'8mb'})); app.use('/outputs',express.static(outputs));
app.use((req,res,next)=>{if(!TOKEN||req.path==='/health')return next();if((req.get('authorization')||'')!==`Bearer ${TOKEN}`)return res.status(401).json({ok:false,error:'Unauthorized'});next();});
app.get('/health',(req,res)=>res.json({ok:true,service:'explainer-render-worker',version:'0.9.0'}));
async function renderOne(body,req){const started=Date.now(),{projectId,buildVersion,renderBatchId,scene}=body||{};if(!scene?.scene_id)throw new Error('Missing scene');const serveUrl=await getBundle(),inputProps={scene};const composition=await selectComposition({serveUrl,id:'Scene',inputProps});const fileName=`${projectId}_${renderBatchId}_${scene.scene_id}.mp4`,outputLocation=path.join(outputs,fileName);await renderMedia({composition,serveUrl,codec:'h264',outputLocation,inputProps,crf:18,pixelFormat:'yuv420p',muted:true,browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE||undefined});const base=`${req.protocol}://${req.get('host')}`;return {ok:true,projectId,buildVersion,renderBatchId,sceneId:scene.scene_id,outputFileName:fileName,outputUrl:`${base}/outputs/${encodeURIComponent(fileName)}`,renderMs:Date.now()-started};}
app.post('/render-scene',(req,res)=>{const job=()=>renderOne(req.body,req);const p=queue.then(job,job);queue=p.catch(()=>{});p.then(x=>res.json(x)).catch(e=>res.status(500).json({ok:false,error:e?.message||String(e)}));});
app.listen(PORT,'0.0.0.0',()=>console.log(`render-worker listening on :${PORT}`));
