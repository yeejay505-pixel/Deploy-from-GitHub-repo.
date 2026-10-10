// Local automatic template composer. No network, model calls or approval elevation.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {GlobalFonts} from '@napi-rs/canvas';
import {composeSceneDesign,compositionCapabilities} from '../src/semantic/scene-composer.mjs';
const [directoryArg]=process.argv.slice(2);if(!directoryArg)throw Error('Usage: compose-source-plan.mjs LOCAL_BUNDLE');
const directory=await fs.realpath(directoryArg),read=async n=>JSON.parse(await fs.readFile(path.join(directory,n+'.json'),'utf8'));
// Clearing generated outputs happens before input/asset checks. A failed run
// cannot leave a prior design masquerading as success for the current inputs.
for(const name of ['design.json','composed-manifest.json'])await fs.rm(path.join(directory,name),{force:true});
let result;
try{
 const [job,plan,timing,assets]=await Promise.all(['job','plan','timing','asset-catalog'].map(read));
 for(const a of [...assets.fonts,assets.presenter.asset]){if(path.isAbsolute(a.path)||a.path.includes('://'))throw Error('relative_asset_required');const local=await fs.realpath(path.resolve(directory,a.path));if(!local.startsWith(directory+path.sep))throw Error('asset_outside_bundle');if(createHash('sha256').update(await fs.readFile(local)).digest('hex')!==a.sha256)throw Error('asset_checksum_mismatch');if(a.role)GlobalFonts.registerFromPath(local,'Explainer');}
 result=composeSceneDesign(job,plan,timing,assets);
}catch(error){result={design:null,manifest:null,report:{schema_version:'composition-review.v1',composer_version:'composer-1',ready:false,issues:[{code:error.message}],release_eligible:false}};}
await fs.writeFile(path.join(directory,'composition-review.json'),JSON.stringify(result.report,null,2)+'\n');await fs.writeFile(path.join(directory,'composition-capabilities.json'),JSON.stringify(compositionCapabilities(),null,2)+'\n');
if(!result.report.ready){console.log(JSON.stringify(result.report));process.exitCode=2;}else{await fs.writeFile(path.join(directory,'design.json'),JSON.stringify(result.design,null,2)+'\n');await fs.writeFile(path.join(directory,'composed-manifest.json'),JSON.stringify(result.manifest,null,2)+'\n');console.log(JSON.stringify({ready:true,composer:'composer-1',objects:result.design.objects.length,sentences:result.design.sentences.length,tracks:result.manifest.actions.length,release_eligible:false}));}
