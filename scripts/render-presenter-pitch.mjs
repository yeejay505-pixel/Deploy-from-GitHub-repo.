import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createCanvas,GlobalFonts,loadImage} from '@napi-rs/canvas';
import {fileURLToPath} from 'node:url';
import {drawPresenterPitch} from '../src/semantic/presenter-pitch.mjs';
const [mode,inputPath,outputPath,extra]=process.argv.slice(2);
// The delivered reproduction bundle includes these exact open font files.
// Repository previews fall back to the same installed font families.
for(const [file,family] of [['P052-Roman.otf','P052'],['DejaVuSans.ttf','DejaVu Sans'],['DejaVuSans-Bold.ttf','DejaVu Sans']]){
  const font=fileURLToPath(new URL(`../fonts/${file}`,import.meta.url));
  try{await fs.access(font);GlobalFonts.registerFromPath(font,family);}catch{}
}
if(!['stills','render'].includes(mode)||!inputPath||!outputPath)throw Error('Usage: render-presenter-pitch.mjs stills|render PLAN OUTPUT [STILL_TIMES]');
let plan=JSON.parse(await fs.readFile(inputPath,'utf8'));

const assetBase=path.dirname(inputPath);const assets={poses:await loadImage(path.join(assetBase,plan.assets.presenterPoses)),hero:plan.assets.hero?await loadImage(path.join(assetBase,plan.assets.hero)):undefined};
const transitionCanvas=createCanvas(1080,1920),transitionContext=transitionCanvas.getContext('2d');
const draw=(c,plan,t)=>{
 const state=drawPresenterPitch(c,plan,t,assets);
 const transition=plan.transitions?.find(x=>t>=x.at&&t<x.at+x.duration);
 if(transition){drawPresenterPitch(transitionContext,plan,transition.at-1/30,assets);let p=(t-transition.at)/transition.duration;p=p*p*(3-2*p);c.save();c.globalAlpha=1-p;c.drawImage(transitionCanvas,0,0);c.restore();}
 return state;
};
const width=plan.render.width,height=plan.render.height,fps=plan.render.fps;
if(width!==1080||height!==1920||fps!==30)throw Error('Review renderer expects 1080x1920 at 30fps');
const canvas=createCanvas(width,height),c=canvas.getContext('2d');await fs.mkdir(path.dirname(outputPath),{recursive:true});
if(mode==='stills'){for(const t of extra.split(',').map(Number)){draw(c,plan,t);await fs.writeFile(`${outputPath}.${t}s.png`,canvas.toBuffer('image/png'));console.log(`Still ${t}s`);}process.exit(0);}
// Audio is produced independently from the exact same event/time plan. Existing stems are required.
const base=path.dirname(inputPath),voice=path.join(base,'guide-narration.wav'),music=path.join(base,'music.wav'),sfx=path.join(base,'sfx.wav');
for(const f of [voice,music,sfx])await fs.access(f);
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',voice,'-i',music,'-i',sfx,'-filter_complex','[1:a]aformat=channel_layouts=stereo,highpass=f=85,lowpass=f=10500,volume=1.35,asplit=2[v][sc];[2:a]volume=0.50[m];[m][sc]sidechaincompress=threshold=0.018:ratio=4:attack=12:release=280:makeup=1[duck];[3:a]volume=0.85[s];[v][duck][s]amix=inputs=3:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.2:LRA=9[a]','-map','0:v:0','-map','[a]','-t',String(plan.duration),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',outputPath],{stdio:['pipe','ignore','pipe']});
let err='';ff.stderr.on('data',d=>err=(err+d).slice(-3000));const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(Error(err)));});done.catch(()=>{});
try{for(let f=0;f<Math.ceil(plan.duration*fps);f++){draw(c,plan,f/fps);if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');if(f%450===0)console.log(`Rendered ${f}/${Math.ceil(plan.duration*fps)}`);}ff.stdin.end();await done;}catch(e){ff.stdin.destroy();ff.kill();await fs.rm(outputPath,{force:true});throw e;}
console.log(JSON.stringify({outputPath,duration:plan.duration,width,height,fps,voice:'temporary_guide',music:'original_procedural',sfxEvents:plan.soundEvents.length,releaseEligible:false}));
