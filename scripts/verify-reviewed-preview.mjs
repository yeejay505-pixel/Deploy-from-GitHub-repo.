import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {compileSourceRender,sampleSourceRender} from '../src/semantic/source-render-binding.mjs';
import {composeSceneDesign,checkCompositionLayout} from '../src/semantic/scene-composer.mjs';
import {drawSourceObject} from '../src/semantic/source-renderer.mjs';
const root=process.argv[2],read=async n=>JSON.parse(await fs.readFile(path.join(root,n+'.json'),'utf8'));
const [job,plan,timing,design]=await Promise.all(['job','plan','timing','design'].map(read));
for(const f of design.fonts)GlobalFonts.registerFromPath(path.join(root,f.path),'Explainer');
const automatic=composeSceneDesign(job,plan,timing,JSON.parse(await fs.readFile(path.join(root,'asset-catalog.json'),'utf8')));
assert.equal(automatic.report.ready,true,JSON.stringify(automatic.report.issues));
assert.deepEqual(automatic.design.sentences.slice(3,6).map(x=>x.headline[0]),['Rental growth.','Potential appreciation.','Rental yield.']);
assert.equal(automatic.design.objects.find(x=>x.id==='office-main').layout.scale,.55);
const m=compileSourceRender(job,plan,timing,design);
assert.equal(m.release_eligible,false);assert.equal(checkCompositionLayout(m).length,0);
assert.deepEqual(m.metrics.map(x=>x.values),[[15,20],[5,12],[7,12]]);
assert.equal(m.objects.filter(x=>x.id==='office-main').length,1);
for(const s of design.sentences){
 const t=timing.sentences.find(x=>x.id===s.id);
 for(const a of s.action_anchors){
  const semantic=plan.sentences.find(x=>x.id===s.id).visual_argument.visible_action.find(x=>x.object_id===a.object_id);
  const o=design.objects.find(x=>x.id===a.object_id),after=o.states.find(x=>x.name===semantic.to_state);
  if(o.metric_id&&after.parameters.opacity===0){assert.equal(a.start.word_index,0);assert.ok(a.end.word_index<=2);}
  if(o.metric_id&&after.parameters.opacity>0){assert.ok(['fifteen','five','seven'].includes(t.words[a.start.word_index].word));assert.equal(t.words[a.end.word_index].word,'percent, '.trim().replace(',',''));}
 }
}
const canvas=createCanvas(1080,1920),c=canvas.getContext('2d'),changes=[];
for(const s of m.sentences){let largest=0;
 for(const a of m.actions.filter(x=>x.sentence_id===s.id&&!['opacity','selected'].includes(x.property))){
  const capture=time=>{const sample=sampleSourceRender(m,time),o=sample.objects.get(a.target);c.fillStyle='#fff';c.fillRect(0,0,1080,1920);drawSourceObject(c,o,sample.metrics.get(o.metric_id),time);return c.getImageData(55,460,970,1190).data;};
  const before=capture(a.start),after=capture(a.end);let pixels=0;
  for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>30)pixels++;
  largest=Math.max(largest,pixels);
 }
 assert.ok(largest>120,`${s.id}: meaningful motion missing`);changes.push({sentence_id:s.id,changed_pixels:largest});
}
const end=sampleSourceRender(m,m.render.duration).objects.get('office-main').parameters;
for(const k of ['build','open','fitout','occupied'])assert.equal(end[k],1);
const report={status:'pass',source_ranges:[[15,20],[5,12],[7,12]],metric_reveal_anchors:'measured_spoken_numbers',metric_retirement:'measured_context_handoff_without_repeating_prior_numbers',persistent_office:'construction_to_occupied_floor',layout_collisions:0,meaningful_pixel_changes:changes,paid_calls:0,live_job_modified:false,release_eligible:false};
await fs.writeFile(path.join(root,'reviewed-preview-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
