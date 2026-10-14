import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Operator-only startup provisioning. No requests, secrets or remote downloads.
const root=process.env.EXPLAINER_PRIVATE_VOLUME;
if(!root || !path.isAbsolute(root) || root==='/app' || root.startsWith('/app/')) throw new Error('private_volume_required');
const st=fs.lstatSync(root);
if(!st.isDirectory() || st.isSymbolicLink()) throw new Error('private_volume_invalid');
const source=fileURLToPath(new URL('../runtime-assets/commercial-v05/',import.meta.url));
const catalog=JSON.parse(fs.readFileSync(path.join(source,'asset-catalog.json'),'utf8'));
const assets=[catalog.presenter.asset,...catalog.fonts];
const destination=path.join(root,'approved-assets','commercial-v05');
for(const asset of assets){
  if(!/^(assets|fonts)\/[A-Za-z0-9._-]+$/.test(asset.path)) throw new Error('asset_path_invalid');
  const bytes=fs.readFileSync(path.join(source,asset.path));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw new Error('asset_checksum_invalid');
}
for(const relative of ['asset-catalog.json','fonts/DejaVu-LICENSE.txt',...assets.map(a=>a.path)]){
  const target=path.join(destination,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  // Refuse drift rather than replace a previously provisioned trusted asset.
  const bytes=fs.readFileSync(path.join(source,relative));
  try{fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});}
  catch(e){if(e.code!=='EEXIST')throw e;const s=fs.lstatSync(target);if(!s.isFile()||s.isSymbolicLink()||!fs.readFileSync(target).equals(bytes))throw new Error('provisioned_asset_drift');}
}
const marker=path.join(root,'explainer-persistence-marker.json');
try{fs.writeFileSync(marker,JSON.stringify({schema:'explainer-volume-probe.v1',id:crypto.randomUUID(),created_at:new Date().toISOString()},null,2)+'\n',{flag:'wx',mode:0o600});}
catch(e){if(e.code!=='EEXIST')throw e;const s=fs.lstatSync(marker);if(!s.isFile()||s.isSymbolicLink())throw new Error('persistence_marker_invalid');}
console.log('Approved explainer assets verified and provisioned; persistence marker retained.');
if(process.env.EXPLAINER_START_RENDERER==='1') await import('../server.mjs');
