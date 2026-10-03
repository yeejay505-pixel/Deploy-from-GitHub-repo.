import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'explainer-worker-test-'));
const serverPath=new URL('../server.mjs',import.meta.url).pathname;
const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
async function start(enabled){
 const port=await freePort(),env={...process.env,PORT:String(port),RENDER_TOKEN:'fixture-render-token'};
 for(const key of ['INTAKE_STORE_DIR','INTAKE_TOKEN','INTAKE_BINDINGS_FILE','INTAKE_ALLOWED_CHAT_IDS','INTAKE_DURABLE_STORAGE_CONFIRMED'])delete env[key];
 if(enabled)Object.assign(env,{INTAKE_STORE_DIR:root,INTAKE_TOKEN:'fixture-intake-token',INTAKE_DURABLE_STORAGE_CONFIRMED:'1'});
 const child=spawn(process.execPath,[serverPath],{env,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('worker_start_timeout'));},10000);const fail=()=>{clearTimeout(timer);reject(Error('worker_start_failed'));};child.once('error',fail);child.once('exit',fail);child.stdout.on('data',d=>{if(d.toString().includes('render-worker listening')){clearTimeout(timer);child.removeListener('exit',fail);resolve();}});});
 const stop=()=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();const timer=setTimeout(()=>child.kill('SIGKILL'),1500);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');});
 return {base:'http://127.0.0.1:'+port,stop};
}
try{
 let server=await start(false);
 try{assert.equal((await fetch(server.base+'/health')).status,200);assert.equal((await fetch(server.base+'/intake/jobs/nonexistent',{headers:{Authorization:'Bearer fixture-render-token'}})).status,404);}finally{await server.stop();}
 console.log('PASS existing worker starts with intake disabled; health remains available.');
 server=await start(true);
 try{const update={message:{message_id:900,date:1791043200,chat:{id:8580375575},text:'Fixture topic, no paid calls.'}};const body=JSON.stringify({telegram_update:update});assert.equal((await fetch(server.base+'/intake/requests',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-render-token'},body})).status,401);const res=await fetch(server.base+'/intake/requests',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-intake-token'},body});assert.equal(res.status,201);assert.equal((await res.json()).job.status,'binding_pending');}finally{await server.stop();}
 console.log('PASS enabled intake uses its own token and retains a topic in the actual worker.');
 server=await start(true);
 try{const res=await fetch(server.base+'/intake/jobs/TG-8580375575-900',{headers:{Authorization:'Bearer fixture-intake-token'}});assert.equal(res.status,200);assert.equal((await res.json()).job.intake.raw_input,'Fixture topic, no paid calls.');}finally{await server.stop();}
 console.log('PASS retained job survives actual worker termination and restart.');
}finally{await fs.rm(root,{recursive:true,force:true});}
