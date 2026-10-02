import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {drawOfficeDemand,OFFICE_DURATION,OFFICE_FPS} from '../src/semantic/office-demand.mjs';

// Offline rendering of the exact Canvas scene used by Remotion. No network or browser needed.
const require=createRequire(import.meta.url);
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
let Canvas;
try{Canvas=require('@napi-rs/canvas');}catch{
  if(!runtime)throw new Error('Install @napi-rs/canvas or set CODEX_PRIMARY_RUNTIME_NODE_MODULES.');
  Canvas=require(path.join(runtime,'@napi-rs/canvas'));
}
Canvas.GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','DejaVu Sans');
Canvas.GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','DejaVu Sans');
const args=process.argv.slice(2);
const output=path.resolve(args[0]||'outputs/office-benchmark-v01.mp4');
const width=Number(args[1]||1080),height=Math.round(width*16/9);
await fs.mkdir(path.dirname(output),{recursive:true});
const canvas=Canvas.createCanvas(width,height),ctx=canvas.getContext('2d');
if(args.includes('--stills')){
  for(const t of [0.8,3,5.2,7.8,10.6,12.6,15.5,19.5]){
    drawOfficeDemand(ctx,t,{width,height});
    await fs.writeFile(path.join(path.dirname(output),`office-${String(t).replace('.','_')}s.png`),canvas.toBuffer('image/png'));
  }
  console.log('Saved benchmark inspection frames');
}else{
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(OFFICE_FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
  const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}`)));});
  for(let frame=0;frame<OFFICE_DURATION*OFFICE_FPS;frame++){
    drawOfficeDemand(ctx,frame/OFFICE_FPS,{width,height});
    if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');
    if(frame%150===0)console.log(`Rendered ${frame}/${OFFICE_DURATION*OFFICE_FPS} frames`);
  }
  ff.stdin.end();await done;console.log(`Saved ${output}`);
}
