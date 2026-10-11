import path from 'node:path';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const safe=s=>String(s??'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,120);

async function run(cmd,args){
  return await new Promise((resolve,reject)=>{
    const p=spawn(cmd,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='';
    p.stdout.on('data',d=>out+=d.toString());
    p.stderr.on('data',d=>err+=d.toString());
    p.on('error',reject);
    p.on('close',code=>code===0?resolve({out,err}):reject(new Error(`${cmd} failed: ${err.slice(-2000)}`)));
  });
}

export async function deriveVisualPreviews({sourcePath,fileName,projectId,assetId,publicAssetDirectory,publicBase}){
  const ext=path.extname(fileName||sourcePath).toLowerCase();
  const prefix=`${safe(projectId)}_${safe(assetId)}_preview`;
  const previews=[];
  try{
    if(ext==='.pdf'){
      const stem=path.join(publicAssetDirectory,prefix);
      await run('pdftoppm',['-jpeg','-f','1','-l','12','-scale-to','720','-jpegopt','quality=82',sourcePath,stem]);
      const files=(await fs.readdir(publicAssetDirectory))
        .filter(n=>n.startsWith(prefix+'-')&&n.endsWith('.jpg'))
        .sort().slice(0,12);
      for(let i=0;i<files.length;i++) previews.push({kind:'pdf_page',index:i+1,file_name:files[i],url:`${publicBase}/render-assets/${encodeURIComponent(files[i])}`});
    }else if(['.jpg','.jpeg','.png','.webp'].includes(ext)){
      previews.push({kind:'image',index:1,file_name:path.basename(sourcePath),url:`${publicBase}/render-assets/${encodeURIComponent(path.basename(sourcePath))}`});
    }else if(['.mp4','.mov','.m4v','.webm'].includes(ext)){
      const probe=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',sourcePath]);
      const duration=Number(probe.out.trim());
      if(duration>0){
        const points=[0.12,0.5,0.88].map(x=>Math.max(0.2,Math.min(duration-0.2,duration*x)));
        for(let i=0;i<points.length;i++){
          const name=`${prefix}_video_${i+1}.jpg`;
          const out=path.join(publicAssetDirectory,name);
          await run('ffmpeg',['-y','-ss',String(points[i]),'-i',sourcePath,'-frames:v','1','-q:v','3','-vf','scale=720:-2',out]);
          previews.push({kind:'video_frame',index:i+1,timestamp_seconds:+points[i].toFixed(3),file_name:name,url:`${publicBase}/render-assets/${encodeURIComponent(name)}`});
        }
      }
    }
  }catch(e){
    return {previews:[],warning:`visual_preview_failed: ${String(e?.message||e).slice(0,500)}`};
  }
  return {previews};
}
