// Offline review composition. Inputs are trusted local files; no remote fetch or generated code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {compileSceneSpec} from '../src/semantic/scene-contract.mjs';
import {drawSemanticScene} from '../src/semantic/scene-renderer.mjs';
import {soundWave} from '../semantic-preview.mjs';
const [configPath,outputPath,stillsArg]=process.argv.slice(2);
if(!configPath||!outputPath)throw new Error('Usage: node scripts/render-semantic-film.mjs LOCAL_CONFIG OUTPUT_MP4 [STILL_TIMES]');
const config=JSON.parse(await fs.readFile(configPath,'utf8'));
const width=config.width??1080,height=width*16/9,fps=30;
if(![540,1080].includes(width)||!Number.isFinite(config.duration)||config.duration<2||config.duration>180)throw new Error('Invalid film dimensions/duration');
let covered=0;
for(const s of config.scenes){
  if(Math.abs(s.start-covered)>1e-6||s.end<=s.start||Math.abs(s.spec.duration-(s.end-s.start))>1e-6)throw new Error('Scene schedule must be contiguous and match specs');
  s.compiled=compileSceneSpec(s.spec);covered=s.end;
}
if(Math.abs(covered-config.duration)>1e-6)throw new Error('Scene schedule must cover the film');
const words=config.wordTimestamps;let prior=0;
for(const w of words){if(!w.word||w.start<prior||w.end<w.start||w.end>config.duration)throw new Error('Invalid word timing');prior=w.end;}
// Five-word phrase captions use the original speech timestamps. Never reveal the whole paragraph.
const captions=[];
for(let i=0;i<words.length;){let end=i+1;while(end<words.length&&end-i<5&&!/[,.?!:;]$/.test(words[end-1].word))end++;
  const groupStart=words[i].start,groupEnd=Math.min(config.duration,words[end]?.start??config.duration,words[end-1].end+.16);
  captions.push(...words.slice(i,end).map(w=>({...w,groupStart,groupEnd})));i=end;
}
const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),cache=new Map();
async function drawAt(time){
  const s=config.scenes.find(x=>time>=x.start&&time<x.end)||config.scenes.at(-1),local=time-s.start;
  const plates=[];
  for(const p of s.plates??[]){
    if(local<p.start||local>=p.end)continue;
    const index=Math.min(p.frameCount-1,Math.floor((p.sourceOffset+local-p.start)*p.fps));
    const filename=path.join(p.framesDirectory,`${String(index+1).padStart(5,'0')}.jpg`);
    let item=cache.get(p.framesDirectory);if(item?.filename!==filename){item={filename,image:await loadImage(filename)};cache.set(p.framesDirectory,item);}
    plates.push({p,image:item.image});
  }
  drawSemanticScene(ctx,s.compiled,local,{width,height,presentation:s.presentation,captionWords:captions.map(w=>({...w,groupStart:w.groupStart-s.start,groupEnd:w.groupEnd-s.start})),drawPlate:(c)=>{
    for(const {p,image} of plates){const alpha=Math.min(1,(local-p.start)/.2,(p.end-local)/.2)*p.opacity;
      c.save();c.globalAlpha=Math.max(0,alpha);c.beginPath();c.roundRect(p.x,p.y,p.w,p.h,20);c.clip();
      const zoom=1+.035*(local-p.start)/(p.end-p.start),scale=Math.max(p.w/image.width,p.h/image.height)*zoom;
      const dw=image.width*scale,dh=image.height*scale;c.drawImage(image,p.x+(p.w-dw)/2,p.y+(p.h-dh)/2,dw,dh);c.restore();
      c.save();c.strokeStyle=s.presentation?.theme==='dark'?'#344552':'#DCE6DC';c.lineWidth=2;c.beginPath();c.roundRect(p.x,p.y,p.w,p.h,20);c.stroke();c.restore();
    }
  }});
}
await fs.mkdir(path.dirname(outputPath),{recursive:true});
if(stillsArg){for(const time of stillsArg.split(',').map(Number)){await drawAt(time);const file=`${outputPath}.${time}s.png`;await fs.writeFile(file,canvas.toBuffer('image/png'));console.log(file);}process.exit(0);}
const wav=`${outputPath}.sfx.wav`;await fs.writeFile(wav,soundWave({duration:config.duration,cues:config.scenes.flatMap(s=>s.spec.cues.map(c=>({...c,time:c.time+s.start})))}));
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-i',config.voicePath,'-i',wav,'-filter_complex','[1:a]volume=1[v];[2:a]volume=0.65[s];[v][s]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.2:LRA=11[a]','-map','0:v','-map','[a]','-t',String(config.duration),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',outputPath],{stdio:['pipe','ignore','pipe']});
let stderr='';ff.stderr.on('data',d=>stderr=(stderr+d).slice(-3000));const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(stderr)));});done.catch(()=>{});
try{for(let f=0;f<Math.ceil(config.duration*fps);f++){await drawAt(f/fps);if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');if(f%300===0)console.log(`Rendered ${f}/${Math.ceil(config.duration*fps)} frames`);}ff.stdin.end();await done;}
catch(e){ff.stdin.destroy();ff.kill();await fs.rm(outputPath,{force:true});throw e;}
finally{await fs.rm(wav,{force:true});}
console.log(JSON.stringify({outputPath,width,height,fps,duration:config.duration,voice:'existing_source',timing:'original_word_timestamps',previewOnly:true,creativeApproval:'pending'}));
