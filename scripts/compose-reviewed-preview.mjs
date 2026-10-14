// Trusted local, human-reviewed layout. Not an API acceptance path.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {GlobalFonts} from '@napi-rs/canvas';
import {layouts} from '../src/semantic/composition-templates.mjs';
import {compileSourceRender} from '../src/semantic/source-render-binding.mjs';
import {checkCompositionLayout} from '../src/semantic/scene-composer.mjs';
import {composeSceneDesign} from '../src/semantic/scene-composer.mjs';
const directory=await fs.realpath(process.argv[2]);
const read=async n=>JSON.parse(await fs.readFile(path.join(directory,n+'.json'),'utf8'));
const [job,plan,timing,assets]=await Promise.all(['job','plan','timing','asset-catalog'].map(read));
for(const a of [...assets.fonts,assets.presenter.asset]){
 const file=await fs.realpath(path.resolve(directory,a.path));
 if(path.isAbsolute(a.path)||!file.startsWith(directory+path.sep))throw Error('relative_bundle_asset_required');
 if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==a.sha256)throw Error('asset_checksum_mismatch');
 if(a.role)GlobalFonts.registerFromPath(file,'Explainer');
}
// Same asset remains in a stable lower slot, separate from exact-range context.
layouts.office_lifecycle={x:465,y:1220,scale:.55};
const r=composeSceneDesign(job,plan,timing,assets);
r.report.human_reviewed_layout={office_lifecycle:{...layouts.office_lifecycle},purpose:'Separate exact source range labels from the persistent office asset'};
await fs.writeFile(path.join(directory,'composition-review.json'),JSON.stringify(r.report,null,2)+'\n');
if(!r.report.ready){console.log(JSON.stringify(r.report));process.exitCode=2;}
else{
 const headings={s4:['Rental growth.','Keep its context.'],s5:['Potential appreciation.','A separate projection.'],s6:['Rental yield.','A different measure.'],s13:['Assess delivery.','Then costs and leasing.']};
 for(const sentence of r.design.sentences)if(headings[sentence.id])sentence.headline=headings[sentence.id];
 r.manifest=compileSourceRender(job,plan,timing,r.design);
 if(checkCompositionLayout(r.manifest).length)throw Error('reviewed_layout_collision');
 r.report.hashes.design=createHash('sha256').update(JSON.stringify(r.design)).digest('hex');
 r.report.human_reviewed_headlines=headings;
 await fs.writeFile(path.join(directory,'composition-review.json'),JSON.stringify(r.report,null,2)+'\n');
 await fs.writeFile(path.join(directory,'design.json'),JSON.stringify(r.design,null,2)+'\n');
 await fs.writeFile(path.join(directory,'composed-manifest.json'),JSON.stringify(r.manifest,null,2)+'\n');
 console.log(JSON.stringify({ready:true,sentences:r.design.sentences.length,objects:r.design.objects.length,tracks:r.manifest.actions.length,live_workflow:false,release_eligible:false}));
}
