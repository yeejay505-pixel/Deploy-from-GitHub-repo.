import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {compileSceneSpec} from '../src/semantic/scene-contract.mjs';
import {drawSemanticScene} from '../src/semantic/scene-renderer.mjs';
const require=createRequire(import.meta.url);let Canvas;
try{Canvas=require('@napi-rs/canvas');}catch{Canvas=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'));}
const [input,outputPath,widthArg='1080',mode]=process.argv.slice(2);
if(!input||!outputPath)throw new Error('Usage: render-semantic-preview.mjs SPEC.json OUTPUT.mp4 [1080] [--stills]');
const compiled=compileSceneSpec(JSON.parse(await fs.readFile(input,'utf8')));
const width=Number(widthArg),height=Math.round(width*16/9);if(![540,1080].includes(width))throw new Error('Use width 540 or 1080.');
const output=path.resolve(outputPath);await fs.mkdir(path.dirname(output),{recursive:true});
const canvas=Canvas.createCanvas(width,height),ctx=canvas.getContext('2d'),fps=30;
if(mode==='--stills'){
  for(const time of [0,2,5,9,12,15,19.9].filter(t=>t<compiled.scene.duration)){
    drawSemanticScene(ctx,compiled,time,{width,height});
    await fs.writeFile(path.join(path.dirname(output),`semantic-${String(time).replace('.','_')}s.png`),canvas.toBuffer('image/png'));
  }
  console.log('Saved inspection frames');
}else{
  const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
  const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',c=>c===0?resolve():reject(new Error(`FFmpeg exited ${c}`)));});
  const frames=Math.ceil(compiled.scene.duration*fps);
  for(let frame=0;frame<frames;frame++){
    drawSemanticScene(ctx,compiled,frame/fps,{width,height});
    if(!ff.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(ff.stdin,'drain');
    if(frame%150===0)console.log(`Rendered ${frame}/${frames}`);
  }
  ff.stdin.end();await done;
  console.log(`Saved ${output}; timing=${compiled.scene.timingBasis}; narration not generated`);
}
