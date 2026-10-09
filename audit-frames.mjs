import path from 'node:path';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';

function safePart(v){
  return String(v??'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,180);
}

function publicBase(req){
  const xf=(req.get('x-forwarded-proto')||'').split(',')[0].trim();
  return `${xf||req.protocol||'https'}://${req.get('host')}`;
}

function compactError(e){
  const raw=String(e?.message||e||'Unknown error');
  const lines=raw.split('\n').map(s=>s.trim()).filter(Boolean);
  return lines.slice(-20).join(' | ').slice(-3500);
}

async function run(cmd,args,{capture=true}={}){
  return await new Promise((resolve,reject)=>{
    const p=spawn(cmd,args,{stdio:['ignore',capture?'pipe':'ignore','pipe']});
    let stdout='',stderr='';
    if(capture) p.stdout.on('data',d=>{stdout+=d.toString(); if(stdout.length>20000)stdout=stdout.slice(-20000);});
    p.stderr.on('data',d=>{stderr+=d.toString(); if(stderr.length>40000)stderr=stderr.slice(-40000);});
    p.on('error',reject);
    p.on('close',(code,signal)=>{
      if(code===0)return resolve({stdout,stderr});
      reject(new Error(`${cmd} failed code ${code}${signal?` (${signal})`:''}: ${stderr.slice(-6000)}`));
    });
  });
}

function parseBlackFreeze(stderr=''){
  const black=[];
  const freeze=[];
  const blackRe=/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g;
  let m;
  while((m=blackRe.exec(stderr))){
    black.push({start:Number(m[1]),end:Number(m[2]),duration:Number(m[3])});
  }

  const starts=[];
  const lines=String(stderr).split('\n');
  for(const line of lines){
    const sm=line.match(/freeze_start:\s*([0-9.]+)/);
    if(sm) starts.push(Number(sm[1]));
    const em=line.match(/freeze_end:\s*([0-9.]+)\s*\|\s*freeze_duration:\s*([0-9.]+)/);
    if(em){
      const start=starts.length?starts.shift():Math.max(0,Number(em[1])-Number(em[2]));
      freeze.push({start,end:Number(em[1]),duration:Number(em[2])});
    }
  }
  return {black,freeze};
}

export function createAuditFramesHandler({outputs}){
  return async function auditFrames(req,res){
    const body=req.body||{};
    const projectId=safePart(body.projectId||body.project_id||'project');
    const videoUrl=String(body.videoUrl||body.video_url||'').trim();
    const requestedCount=Math.max(6,Math.min(20,Number(body.sampleCount||body.sample_count||14)));
    const requestedTs=Array.isArray(body.timestamps)?body.timestamps.map(Number).filter(Number.isFinite):[];

    if(!videoUrl) return res.status(400).json({ok:false,error:'Missing videoUrl'});

    const auditId=safePart(body.auditId||`audit-${Date.now()}`);
    const dir=path.join(outputs,`${projectId}_${auditId}_frames`);
    await fs.rm(dir,{recursive:true,force:true}).catch(()=>{});
    await fs.mkdir(dir,{recursive:true});

    const sourcePath=path.join(dir,'source.mp4');

    try{
      const response=await fetch(videoUrl,{redirect:'follow'});
      if(!response.ok||!response.body) throw new Error(`Video download failed: HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body),createWriteStream(sourcePath));

      const probe=await run('ffprobe',[
        '-v','error','-show_entries','format=duration',
        '-of','default=noprint_wrappers=1:nokey=1',sourcePath
      ]);
      const duration=Number(String(probe.stdout).trim());
      if(!(duration>0)) throw new Error('Could not determine source video duration');

      let timestamps=requestedTs.filter(t=>t>=0&&t<duration);
      if(!timestamps.length){
        const anchors=[0.5,Math.min(2.5,Math.max(0.5,duration*0.04))];
        const remaining=Math.max(0,requestedCount-anchors.length);
        const generated=[];
        for(let i=0;i<remaining;i++){
          const frac=(i+1)/(remaining+1);
          generated.push(Math.max(0.15,Math.min(duration-0.15,duration*frac)));
        }
        timestamps=[...anchors,...generated];
      }
      timestamps=[...new Set(timestamps.map(t=>Number(t.toFixed(3))))].sort((a,b)=>a-b).slice(0,20);

      const frames=[];
      const hashes=[];
      for(let i=0;i<timestamps.length;i++){
        const ts=timestamps[i];
        const fileName=`frame_${String(i+1).padStart(2,'0')}_${String(ts.toFixed(3)).replace('.','_')}s.jpg`;
        const outPath=path.join(dir,fileName);
        await run('ffmpeg',[
          '-y','-ss',String(ts),'-i',sourcePath,
          '-frames:v','1','-q:v','3','-vf','scale=540:-2',outPath
        ]);
        const buf=await fs.readFile(outPath);
        const hash=crypto.createHash('sha256').update(buf).digest('hex');
        hashes.push(hash);
        frames.push({
          index:i,
          timestamp_seconds:ts,
          file_name:fileName,
          url:`${publicBase(req)}/outputs/${encodeURIComponent(path.basename(dir))}/${encodeURIComponent(fileName)}`,
          sha256:hash
        });
      }

      let analysis={stderr:''};
      try{
        analysis=await run('ffmpeg',[
          '-hide_banner','-i',sourcePath,
          '-vf','blackdetect=d=0.30:pic_th=0.98,freezedetect=n=-50dB:d=1.0',
          '-an','-f','null','-'
        ]);
      }catch(e){
        analysis={stderr:String(e?.message||e)};
      }

      const parsed=parseBlackFreeze(analysis.stderr);
      const totalBlack=parsed.black.reduce((s,x)=>s+(Number(x.duration)||0),0);
      const totalFreeze=parsed.freeze.reduce((s,x)=>s+(Number(x.duration)||0),0);
      const uniqueHashes=new Set(hashes).size;
      const exactDuplicateRatio=hashes.length?1-(uniqueHashes/hashes.length):0;

      await fs.rm(sourcePath,{force:true}).catch(()=>{});

      res.json({
        ok:true,
        schema_version:'visual-audit-frames.v1',
        project_id:projectId,
        audit_id:auditId,
        source_video_url:videoUrl,
        duration_seconds:Number(duration.toFixed(3)),
        sample_count:frames.length,
        frames,
        machine_checks:{
          black_segments:parsed.black,
          freeze_segments:parsed.freeze,
          total_black_seconds:Number(totalBlack.toFixed(3)),
          total_freeze_seconds:Number(totalFreeze.toFixed(3)),
          exact_duplicate_frame_ratio:Number(exactDuplicateRatio.toFixed(4))
        }
      });
    }catch(e){
      await fs.rm(sourcePath,{force:true}).catch(()=>{});
      res.status(500).json({ok:false,error:compactError(e)});
    }
  };
}
