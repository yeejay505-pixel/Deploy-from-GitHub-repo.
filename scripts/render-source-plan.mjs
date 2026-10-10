// Trusted local CLI only. Not exposed as an arbitrary-file-reading server route.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCanvas,GlobalFonts,loadImage} from '@napi-rs/canvas';
import {compileSourceRender} from '../src/semantic/source-render-binding.mjs';
import {drawSourceRender} from '../src/semantic/source-renderer.mjs';
import {soundWave} from '../semantic-preview.mjs';
const [bundleArg,outputArg]=process.argv.slice(2);if(!bundleArg||!outputArg)throw Error('Usage: node scripts/render-source-plan.mjs LOCAL_BUNDLE OUTPUT_MP4');
const bundle=await fs.realpath(bundleArg),output=path.resolve(outputArg),read=async name=>JSON.parse(await fs.readFile(path.join(bundle,name),'utf8'));
const manifest=compileSourceRender(await read('job.json'),await read('plan.json'),await read('timing.json'),await read('design.json'));
async function asset(a){if(path.isAbsolute(a.path)||a.path.includes('://'))throw Error('bundle_relative_assets_required');const file=await fs.realpath(path.resolve(bundle,a.path));if(!file.startsWith(bundle+path.sep))throw Error('asset_outside_bundle');const bytes=await fs.readFile(file);if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw Error('asset_checksum_mismatch');return file;}
const voice=await asset(manifest.audio);for(const f of manifest.fonts){const file=await asset(f);GlobalFonts.registerFromPath(file,'DejaVu Sans');if(!GlobalFonts.registerFromPath(file,'Explainer'))throw Error('font_registration_failed');}
const assets={presenter:await loadImage(await asset(manifest.presenter.asset))};
const run=(args)=>new Promise((resolve,reject)=>{const p=spawn(args[0],args.slice(1));let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',n=>n?reject(Error(err)):resolve(out));});
const probe=JSON.parse(await run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',voice]));if(!probe.streams.some(s=>s.codec_type==='audio')||Math.abs(Number(probe.format.duration)-manifest.render.duration)>.04)throw Error('measured_audio_duration_mismatch');
await fs.mkdir(path.dirname(output),{recursive:true});const sfx=output+'.sfx.wav',canvas=createCanvas(1080,1920),c=canvas.getContext('2d');
await fs.writeFile(output+'.manifest.json',JSON.stringify(manifest,null,2)+'\n');
// Preflight all frames for readability and geometry before starting the encode.
const frames=Math.ceil(manifest.render.duration*30);for(let f=0;f<frames;f++)drawSourceRender(c,manifest,f/30,assets);
for(const [i,s] of manifest.sentences.entries()){drawSourceRender(c,manifest,Math.min(s.end-1/30,s.speech_end-.05),assets);await fs.writeFile(output+`.scene-${i+1}.png`,canvas.toBuffer('image/png'));}
await fs.writeFile(sfx,soundWave({duration:manifest.render.duration,cues:manifest.cues.map(c=>({...c,type:c.type==='lock'?'click':c.type}))}));
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-i',voice,'-i',sfx,'-filter_complex','[1:a]aformat=channel_layouts=stereo,highpass=f=85[v];[2:a]volume=0.65[s];[v][s]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.2:LRA=9[a]','-map','0:v:0','-map','[a]','-t',String(frames/30),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',output],{stdio:['pipe','ignore','pipe']});
let error='';ff.stderr.on('data',d=>error=(error+d).slice(-3000));const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',n=>n?reject(Error(error)):resolve());});done.catch(()=>{});
try{for(let f=0;f<frames;f++){drawSourceRender(c,manifest,f/30,assets);if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');if(f%150===0)console.log(`Rendered ${f}/${frames}`);}ff.stdin.end();await done;}catch(e){ff.stdin.destroy();ff.kill();await fs.rm(output,{force:true});throw e;}finally{await fs.rm(sfx,{force:true});}
const technical=JSON.parse(await run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',output])),v=technical.streams.find(x=>x.codec_type==='video'),a=technical.streams.find(x=>x.codec_type==='audio');
if(v?.codec_name!=='h264'||v.width!==1080||v.height!==1920||v.r_frame_rate!=='30/1'||a?.codec_name!=='aac'||Math.abs(Number(technical.format.duration)-frames/30)>.08)throw Error('output_technical_qc_failed');
const result={output,duration:Number(technical.format.duration),width:v.width,height:v.height,fps:30,frames,objects:manifest.objects.length,actions:manifest.actions.length,sfx_events:manifest.cues.length,technical_qc:'pass',readability_preflight:'all_frames_pass',voice_status:manifest.audio.voice_status,facts_verified:false,creative_approval:'pending',live_workflow:false,release_eligible:false};await fs.writeFile(output+'.qc.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
