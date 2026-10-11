import express from 'express';
import multer from 'multer';
import {DatabaseSync} from 'node:sqlite';
import {createHash,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {extractSource} from './source-extractor.mjs';

const MAX_PACK_SOURCE_BYTES=256*1024*1024;
const sha256=b=>createHash('sha256').update(b).digest('hex');
const safe=s=>String(s??'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,160);

function authMiddleware(token){
  return (req,res,next)=>{
    const provided=Buffer.from(req.get('authorization')??'');
    const expected=Buffer.from('Bearer '+token);
    const ok=provided.length===expected.length&&timingSafeEqual(provided,expected);
    if(!ok)return res.status(401).json({ok:false,error:'Unauthorized'});
    next();
  };
}

function mediaFromMessage(m={}){
  const entries=[['voice',m.voice],['video',m.video],['image',Array.isArray(m.photo)?m.photo.at(-1):null],['document',m.document],['audio',m.audio],['animation',m.animation]];
  return entries.find(([,v])=>v)||[null,null];
}

function commandOf(raw=''){
  const m=String(raw).trim().match(/^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/i);
  return m?{name:m[1].toLowerCase(),arg:String(m[2]??'').trim()}:null;
}

export function createSourcePackRoutes({app,directory,token,allowedChatIds=[],publicAssetDirectory}){
  if(!directory||!token||!publicAssetDirectory)throw new Error('source_pack_configuration_required');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  fs.mkdirSync(publicAssetDirectory,{recursive:true});
  const db=new DatabaseSync(path.join(directory,'source-packs.sqlite'));
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS packs(
      project_id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, status TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, build_message_id INTEGER,
      brief_text TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}');
    CREATE UNIQUE INDEX IF NOT EXISTS idx_source_packs_active_chat ON packs(chat_id) WHERE status='collecting';
    CREATE TABLE IF NOT EXISTS pack_events(
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, telegram_message_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, text_value TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
      UNIQUE(project_id,telegram_message_id));
    CREATE TABLE IF NOT EXISTS pack_assets(
      asset_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, telegram_message_id INTEGER NOT NULL,
      asset_type TEXT NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, public_name TEXT NOT NULL,
      extraction TEXT, created_at INTEGER NOT NULL,
      UNIQUE(project_id,telegram_message_id));`);

  const router=express.Router();
  router.use(authMiddleware(token));
  router.use(express.json({limit:'2mb'}));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_PACK_SOURCE_BYTES,files:1,fields:2,fieldSize:2*1024*1024}});

  const activePack=chatId=>db.prepare("SELECT * FROM packs WHERE chat_id=? AND status='collecting' ORDER BY created_at DESC LIMIT 1").get(String(chatId));
  const counts=projectId=>{
    const e=db.prepare('SELECT COUNT(*) c FROM pack_events WHERE project_id=?').get(projectId)?.c??0;
    const rows=db.prepare('SELECT asset_type,COUNT(*) c FROM pack_assets WHERE project_id=? GROUP BY asset_type').all(projectId);
    const by={};for(const r of rows)by[r.asset_type]=r.c;
    const a=rows.reduce((n,r)=>n+r.c,0);
    return {messages:e,assets:a,total:e+a,by_type:by};
  };
  const packResponse=(pack,extra={})=>({ok:true,project_id:pack?.project_id??null,status:pack?.status??'none',counts:pack?counts(pack.project_id):{messages:0,assets:0,total:0,by_type:{}},...extra});
  const baseFor=req=>`${(req.get('x-forwarded-proto')||req.protocol||'https').split(',')[0].trim()}://${req.get('host')}`;

  router.post('/events',upload.single('source'),async(req,res,next)=>{
    try{
      let body=req.body;
      if(req.is('multipart/form-data')){
        try{body=JSON.parse(req.body.request);}catch{throw Object.assign(new Error('request_json_required'),{status:400});}
      }
      const update=body?.telegram_update??body;
      const m=update?.message??update?.edited_message;
      if(!m||m.chat?.id==null||!Number.isSafeInteger(m.message_id))throw Object.assign(new Error('invalid_telegram_envelope'),{status:400});
      const chatId=String(m.chat.id);
      if(!allowedChatIds.map(String).includes(chatId))throw Object.assign(new Error('chat_not_allowed'),{status:403});
      const raw=String(m.text??m.caption??'').trim();
      const cmd=commandOf(raw);
      const now=Date.now();

      if(cmd?.name==='newvideo'){
        if(req.file)throw Object.assign(new Error('newvideo_command_must_not_include_attachment'),{status:400});
        const prior=activePack(chatId);
        if(prior)return res.status(409).json(packResponse(prior,{ok:false,error:'source_pack_already_collecting',action:'collect'}));
        const date=new Date(Number(m.date||Math.floor(now/1000))*1000).toISOString().slice(0,10).replace(/-/g,'');
        const projectId=`VID-${date}-${chatId}-${m.message_id}`;
        db.prepare('INSERT INTO packs(project_id,chat_id,status,created_at,updated_at,brief_text,metadata) VALUES(?,?,?,?,?,?,?)')
          .run(projectId,chatId,'collecting',now,now,cmd.arg||'',JSON.stringify({start_message_id:m.message_id}));
        if(cmd.arg)db.prepare('INSERT OR IGNORE INTO pack_events(project_id,telegram_message_id,event_type,text_value,created_at) VALUES(?,?,?,?,?)').run(projectId,m.message_id,'brief',cmd.arg,now);
        const pack=activePack(chatId);
        return res.status(201).json(packResponse(pack,{action:'collect',reply_text:`📥 SOURCE PACK OPEN\n\nProject: ${projectId}\nSend your brief, PDFs, presentations, images, videos and links.\n\nWhen finished, send /build.`}));
      }

      const pack=activePack(chatId);
      if(!pack){
        return res.json({ok:true,action:'passthrough',status:'no_active_source_pack',telegram_update:update});
      }

      if(cmd?.name==='cancel'){
        db.prepare("UPDATE packs SET status='cancelled',updated_at=? WHERE project_id=?").run(now,pack.project_id);
        return res.json(packResponse({...pack,status:'cancelled'},{action:'stop',reply_text:`🛑 SOURCE PACK CANCELLED\n\nProject: ${pack.project_id}`}));
      }

      if(cmd?.name==='status'){
        const c=counts(pack.project_id);
        return res.json(packResponse(pack,{action:'stop',reply_text:`📦 SOURCE PACK STATUS\n\nProject: ${pack.project_id}\nText messages: ${c.messages}\nFiles/assets: ${c.assets}\nTotal sources: ${c.total}\n\nSend /build when ready.`}));
      }

      if(cmd?.name==='build'){
        if(req.file)throw Object.assign(new Error('build_command_must_not_include_attachment'),{status:400});
        const eventRows=db.prepare('SELECT text_value,event_type FROM pack_events WHERE project_id=? ORDER BY id').all(pack.project_id);
        const assetRows=db.prepare('SELECT * FROM pack_assets WHERE project_id=? ORDER BY created_at,asset_id').all(pack.project_id);
        if(eventRows.length===0&&assetRows.length===0)throw Object.assign(new Error('source_pack_empty'),{status:400});
        const briefParts=eventRows.map(r=>r.text_value).filter(Boolean);
        const extracts=[];
        const assets=assetRows.map(a=>{
          let ex=null;try{ex=a.extraction?JSON.parse(a.extraction):null;}catch{}
          if(ex?.status==='extracted'){
            const text=(ex.units??[]).flatMap(u=>(u.paragraphs??[]).map(p=>String(p))).join('\n').slice(0,120000);
            if(text)extracts.push(`SOURCE FILE: ${a.file_name}\n${text}`);
          }
          return {asset_id:a.asset_id,asset_type:a.asset_type,file_name:a.file_name,mime_type:a.mime_type,size_bytes:a.size_bytes,sha256:a.sha256,url:`${baseFor(req)}/render-assets/${encodeURIComponent(a.public_name)}`,extraction_status:ex?.status??'analysis_required'};
        });
        const assetCatalog=assets.length
          ? `SUPPLIED VISUAL/MEDIA ASSETS\n${assets.map(a=>`- [${a.asset_type}] ${a.file_name} | ${a.url}`).join('\n')}\n\nUse supplied images/videos in the visual plan when relevant. Preserve the exact asset URL for downstream scene/component binding.`
          : '';
        const fullBrief=[...briefParts,extracts.length?`\nSUPPLIED SOURCE EXTRACTS\n${extracts.join('\n\n')}`:'',assetCatalog]
          .filter(Boolean)
          .join('\n\n')
          .trim();
        const links=[...fullBrief.matchAll(/https?:\/\/[^\s<>()]+/g)].map(x=>x[0]).slice(0,50);
        const sourcePack={schema_version:'source-pack.v1',project_id:pack.project_id,source_count:eventRows.length+assetRows.length,brief_messages:briefParts,assets,links,locked_at:new Date(now).toISOString()};
        db.prepare("UPDATE packs SET status='locked',updated_at=?,build_message_id=?,brief_text=?,metadata=? WHERE project_id=?")
          .run(now,m.message_id,fullBrief,JSON.stringify(sourcePack),pack.project_id);
        const synthetic=structuredClone(update);
        synthetic.message={...m,text:fullBrief};
        delete synthetic.message.caption;
        synthetic._source_pack=sourcePack;
        synthetic._source_pack_project_id=pack.project_id;
        return res.json(packResponse({...pack,status:'locked'},{action:'build',synthetic_update:synthetic,source_pack:sourcePack,reply_text:`🔒 SOURCE PACK LOCKED\n\nProject: ${pack.project_id}\nSources: ${sourcePack.source_count}\nStarting video production.`}));
      }

      if(cmd)throw Object.assign(new Error('unsupported_command_while_collecting'),{status:400});

      const [assetType,media]=mediaFromMessage(m);
      if(req.file){
        if(!media?.file_id)throw Object.assign(new Error('media_metadata_missing'),{status:400});
        const bytes=req.file.buffer;
        const digest=sha256(bytes);
        const assetId='ASSET-'+sha256(Buffer.from(pack.project_id+'\n'+digest)).slice(0,20);
        const ext=path.extname(media.file_name||req.file.originalname||'')||({image:'.jpg',video:'.mp4',audio:'.mp3',voice:'.ogg',animation:'.mp4'}[assetType]||'.bin');
        const publicName=`${safe(pack.project_id)}_${assetId}${safe(ext)}`;
        const out=path.join(publicAssetDirectory,publicName);
        await fsp.writeFile(out,bytes,{mode:0o600});
        let extraction=null;
        try{
          extraction=await extractSource(bytes,media.file_name||req.file.originalname||(`source${ext}`));
        }catch(e){extraction={schema_version:'source-extract.v1',status:'failed',units:[],claims:[],warnings:[String(e?.message||e)]};}
        db.prepare('INSERT OR IGNORE INTO pack_assets(asset_id,project_id,telegram_message_id,asset_type,file_name,mime_type,size_bytes,sha256,public_name,extraction,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .run(assetId,pack.project_id,m.message_id,assetType||'document',media.file_name||req.file.originalname||publicName,media.mime_type||req.file.mimetype||'application/octet-stream',bytes.length,digest,publicName,JSON.stringify(extraction),now);
      }else if(assetType){
        throw Object.assign(new Error('source_binary_required'),{status:400});
      }

      if(raw){
        db.prepare('INSERT OR IGNORE INTO pack_events(project_id,telegram_message_id,event_type,text_value,created_at) VALUES(?,?,?,?,?)').run(pack.project_id,m.message_id,/^https?:\/\//i.test(raw)?'link':'brief',raw,now);
      }
      db.prepare('UPDATE packs SET updated_at=? WHERE project_id=?').run(now,pack.project_id);
      const updated=activePack(chatId);
      const c=counts(pack.project_id);
      return res.status(201).json(packResponse(updated,{action:'collect',reply_text:`✅ SOURCE ADDED\n\nProject: ${pack.project_id}\nCollected: ${c.total} source${c.total===1?'':'s'}\n\nKeep sending material, or send /build when finished.`}));
    }catch(e){next(e);}
  });

  router.use((err,req,res,next)=>{
    if(res.headersSent)return next(err);
    const status=err?.status||(err instanceof multer.MulterError?400:500);
    res.status(status).json({ok:false,error:err?.message||'source_pack_internal_error'});
  });
  app.use('/source-pack',router);
  return {close:()=>db.close()};
}
