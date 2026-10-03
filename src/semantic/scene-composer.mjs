// Deterministic automatic composition for explicitly supported semantic templates.
// Unknown metaphors/states return an atomic review result, never a generic fallback.
import {vocab,headings,layouts,labels} from './composition-templates.mjs';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {INTELLIGENCE_SCHEMA,validateIntelligencePlan} from '../../intelligence/plan-contract.mjs';
import {compileSourceRender,validateMeasuredTiming,COMPONENTS,sampleSourceRender} from './source-render-binding.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const normal=s=>String(s).toLowerCase().replace(/[_-]/g,' ').replace(/[^\p{L}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim();
export function compositionCapabilities(){return {schema_version:'composition-capabilities.v1',version:'composer-1',profile_id:'commercial-explainer-v05',components:Object.keys(vocab).map(id=>({id,kind:COMPONENTS[id]?.kind,operations:COMPONENTS[id]?.operations,states:vocab[id].map(s=>s.name)})),transitions:['carry','dissolve'],quantities:'exact source metrics or explicitly conceptual geometry',layout:'persistent template slots with conservative collision checks',autonomous_creative_approval:false};}
function choose(o,actions,metrics){
 const ops=new Set(actions.map(a=>a.operation)),role=normal(o.role);
 if(o.metric_ids.length){if(o.metric_ids.length!==1)throw Error('multi_metric_component_required');const m=metrics.get(o.metric_ids[0]);if(!['chart','counter'].includes(o.kind))throw Error('metric_object_kind_unavailable');if(o.kind==='chart'&&m.values.length!==1)throw Error('range_chart_component_required');if(o.kind==='chart'&&/[<>≤≥~+]|\b(?:less than|more than|at least|at most|under|over|roughly|around|approximately|up to)\b/i.test(m.display_text))throw Error('qualified_metric_chart_component_required');return o.kind==='chart'?'metric_bar':'metric_range';}
 if(ops.has('reveal')&&/criteria|checklist|assessment/.test(role)&&o.kind==='diagram')return 'checklist';
 if(o.kind!=='diagram')throw Error('asset_or_label_design_required');
 if(ops.has('build')&&(ops.has('unfold')||ops.has('fitout'))&&/office|floor|workspace|building/.test(role))return 'office_lifecycle';
 if((ops.has('unfold')||ops.has('fitout')||ops.has('occupy'))&&/floor|workspace|office/.test(role)&&!ops.has('build'))return 'workspace';
 if(ops.has('build')&&/office|building|construction|space|asset/.test(role))return 'building';
 if((ops.has('queue')||ops.has('grow'))&&/queue|occupier|tenant|people|employees|customers/.test(role))return 'queue';
 if(ops.has('lock')&&/price|purchase/.test(role))return 'price_lock';
 if(ops.has('sign')&&/lease|contract/.test(role))return 'lease';
 throw Error('semantic_component_unavailable');
}
const cueWords={build:['build','built','construction','deliver','delivery'],unfold:['unfold','open','floor','operate','workspace'],fitout:['fitout','fit','design','desks','furniture','fitted'],occupy:['employees','occupiers','occupant','occupants','teams','team','people','tenant','tenants'],queue:['demand','companies','tenants','employees','space','queue'],lock:['locking','lock','agree','agreed','purchase','price'],sign:['lease','contract','sign','signed','income'],reveal:['source','range','estimate','estimates','review']};
function wordsForNumber(value){const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];if(Number.isInteger(value)&&value>=0&&value<20)return [String(value),small[value]];if(Number.isInteger(value)&&value<100&&value>=20){const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];return [String(value),tens[Math.floor(value/10)]+(value%10?' '+small[value%10]:'')];}return [String(value)];}
function anchorAction(a,o,t,metric){
 const words=t.words.map(w=>normal(w.word)),found=[];let basis='measured_sentence_window';
 if(metric){
  const hits=[];for(const value of metric.values){let hit=-1,length=1;for(const form of wordsForNumber(value)){const parts=form.split(' ');for(let i=0;i<=words.length-parts.length;i++){if(parts.every((p,j)=>words[i+j]===p)){hit=i;length=parts.length;break;}}if(hit>=0)break;}if(hit<0)throw Error('spoken_quantity_anchor_required');hits.push({start:hit,end:hit+length-1});}
  found.push(...hits.flatMap(x=>[x.start,x.end]));const last=Math.max(...found);if(['percent','years','year'].includes(words[last+1]))found.push(last+1);basis='measured_source_quantity_words';
 }else{
  const keys=cueWords[a.operation]??[];words.forEach((w,i)=>{if(keys.includes(w))found.push(i);});if(found.length)basis='measured_operation_words';
 }
 let start=found.length?Math.min(...found):0,end=found.length?Math.max(...found):words.length-1;
 const before=o.states.find(s=>s.name===a.from_state)?.parameters,after=o.states.find(s=>s.name===a.to_state)?.parameters;
 if(before?.opacity>0&&after?.opacity===0){start=0;end=Math.min(1,words.length-1);basis='measured_context_retirement';}
 if(t.words[end].end-t.words[start].start<.2){end=Math.min(words.length-1,end+1);if(t.words[end].end-t.words[start].start<1/30)throw Error('measured_anchor_interval_too_short');}
 return {binding:{object_id:a.object_id,start:{word_index:start,edge:'start'},end:{word_index:end,edge:'end'}},basis};
}
function rect(x,y,w,h,id){return {x,y,w,h,id};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
export function objectBounds(o,metric,context){
 const {x,y,scale:s}=o.layout,type=o.component;let b;
 if(type==='building')b=rect(x-232*s,y-595*s,572*s,640*s,o.id);
 else if(type==='workspace')b=rect(x-400*s,y-245*s,800*s,475*s,o.id);
 else if(type==='office_lifecycle')b=o.parameters?.open>=.99?rect(x-400*s,y-515*s,800*s,475*s,o.id):rect(x-400*s,y-595*s,800*s,640*s,o.id);
 else if(type==='checklist')b=rect(x-320,y-96,640,192,o.id);
 else if(type==='queue')b=rect(x-232*s,y-52*s,290*s,190*s,o.id);
 else if(type==='price_lock')b=rect(x-155*s,y-74*s,310*s,148*s,o.id);
 else if(type==='lease')b=rect(x-140*s,y-170*s,280*s,360*s,o.id);
 else if(type==='metric_range')b=rect(x-292*s,y-99*s,584*s,215*s,o.id);
 else b=rect(x-125*s,y-374*s,250*s,410*s,o.id);
 const parts=[b];if(o.label){context.font='700 23px "Explainer"';const width=context.measureText(o.label).width,xx=type==='building'?x-70:x,yy=y+(type==='queue'?160:type==='workspace'?260:100)*s;parts.push(rect(xx-width/2,yy-25,width,29,o.id));}
 if(metric){let yy=y+148*s;context.font='500 20px "Explainer"';for(const label of [metric.display_text,metric.measure,metric.period,metric.denominator]){let cur='',lines=[];for(const word of label.split(/\s+/)){let next=cur?cur+' '+word:word;if(cur&&context.measureText(next).width>590){lines.push(cur);cur=word;}else cur=next;}if(cur)lines.push(cur);if(lines.length>2)throw Error('metric_scope_too_dense');for(const line of lines){const w=context.measureText(line).width;parts.push(rect(x-w/2,yy-21,w,25,o.id));yy+=27;}}}
 return parts;
}
export function checkCompositionLayout(manifest){
 const c=createCanvas(1080,1920).getContext('2d'),issues=[],times=new Set([0,manifest.render.duration]);
 for(const s of manifest.sentences){times.add(s.speech_start);times.add(s.speech_end);}
 for(const a of manifest.actions){times.add(a.start);times.add(a.end);times.add((a.start+a.end)/2);}
 const reserve=rect(786,1252,248,375,'presenter');
 for(const time of [...times].sort((a,b)=>a-b)){
  const sample=sampleSourceRender(manifest,time),bounds=[];
  for(const o of sample.objects.values()){
   if(o.parameters.opacity<.05)continue;
   const list=objectBounds(o,sample.metrics.get(o.metric_id),c);
   for(const b of list){if(b.x<55||b.x+b.w>1025||b.y<460||b.y+b.h>1650)issues.push({code:'safe_area_collision',object_id:o.id,time});if(overlap(b,reserve))issues.push({code:'presenter_collision',object_id:o.id,time});}
   for(const b of list)for(const prior of bounds)if(overlap(b,prior))issues.push({code:'object_collision',object_id:o.id,other_id:prior.id,time});bounds.push(...list);
  }
 }
 return [...new Map(issues.map(i=>[i.code+':'+i.object_id+':'+(i.other_id??''),i])).values()];
}
export function composeSceneDesign(job,rawPlan,timing,assetCatalog){
 const report={schema_version:'composition-review.v1',composer_version:'composer-1',event_id:job.event_id,ready:false,issues:[],decisions:[],release_eligible:false};
 try{
  const source=Object.fromEntries(Object.keys(INTELLIGENCE_SCHEMA.properties).map(k=>[k,rawPlan[k]])),plan=validateIntelligencePlan(source,job);validateMeasuredTiming(plan,timing);
  if(plan.profile_id!=='commercial-explainer-v05'||assetCatalog.profile_id!==plan.profile_id||assetCatalog.benchmark_sha256!==plan.benchmark_sha256)throw Error('composer_profile_mismatch');
  if(!assetCatalog.presenter?.poses?.length||!assetCatalog.fonts?.length)throw Error('approved_asset_catalog_required');
  const metrics=new Map(plan.metrics.map(m=>[m.id,m])),objects=[];
  for(const o of plan.objects){
   const actions=plan.sentences.flatMap(s=>s.visual_argument.visible_action.filter(a=>a.object_id===o.id));let component;
   try{component=choose(o,actions,metrics);}catch(error){report.issues.push({code:error.message,object_id:o.id});continue;}
   if(actions.some(a=>!COMPONENTS[component].operations.includes(a.operation))){report.issues.push({code:'component_operation_unavailable',object_id:o.id});continue;}
   const names=new Set([o.initial_state,...plan.sentences.flatMap(s=>[...s.visual_argument.state_before,...s.visual_argument.state_after].filter(x=>x.object_id===o.id).map(x=>x.state))]),states=[];
   for(const name of names){const match=vocab[component].find(s=>normal(s.name)===normal(name));if(!match){report.issues.push({code:'state_template_unavailable',object_id:o.id,state:name});continue;}states.push({name,parameters:{...match.parameters}});}
   const metric=o.metric_ids.length?metrics.get(o.metric_ids[0]):null;
   if(metric?.values.some(v=>v<0)){report.issues.push({code:'negative_metric_component_required',object_id:o.id});continue;}
   const scaleMax=metric?Math.max(...metric.values,1):0;
   objects.push({id:o.id,component,layout:{...layouts[component]},label:labels[component],metric_id:metric?.id??'',value_index:0,scale_max:scaleMax,states});
   report.decisions.push({object_id:o.id,component,basis:'role_operations_and_exact_state_templates',conceptual_parameters:!metric,metric_id:metric?.id??null});
  }
  if(report.issues.length)return {design:null,manifest:null,report};
  const objectMap=new Map(objects.map(o=>[o.id,o])),events=[],sentences=[];
  for(let i=0;i<plan.sentences.length;i++){
   const s=plan.sentences[i],v=s.visual_argument,t=timing.sentences[i],action_anchors=[];
   for(const a of v.visible_action){const o=objectMap.get(a.object_id),metric=o.metric_id?metrics.get(o.metric_id):null;const anchored=anchorAction(a,o,t,metric);action_anchors.push(anchored.binding);report.decisions.push({sentence_id:s.id,object_id:a.object_id,anchor_basis:anchored.basis});}
   const retiring=action_anchors.filter(a=>{const o=objectMap.get(a.object_id),semantic=v.visible_action.find(x=>x.object_id===o.id),from=o.states.find(x=>x.name===semantic.from_state).parameters,to=o.states.find(x=>x.name===semantic.to_state).parameters;return from.opacity>0&&to.opacity===0;});
   if(retiring.length){const retirementEnd=Math.max(...retiring.map(a=>t.words[a.end.word_index].end));for(const b of action_anchors){if(retiring.includes(b))continue;const o=objectMap.get(b.object_id),semantic=v.visible_action.find(x=>x.object_id===o.id),from=o.states.find(x=>x.name===semantic.from_state).parameters,to=o.states.find(x=>x.name===semantic.to_state).parameters;if(from.opacity===0&&to.opacity>0&&t.words[b.start.word_index].start<retirementEnd){const next=t.words.findIndex(w=>w.start>=retirementEnd);if(next<0||next>b.end.word_index)throw Error('measured_handoff_window_required');b.start.word_index=next;}}}
   const focus=[...v.visible_action].sort((a,b)=>Number(objectMap.get(b.object_id).states.find(s=>s.name===b.to_state).parameters.opacity>0)-Number(objectMap.get(a.object_id).states.find(s=>s.name===a.to_state).parameters.opacity>0)||Number(Boolean(objectMap.get(b.object_id).metric_id))-Number(Boolean(objectMap.get(a.object_id).metric_id)))[0],component=objectMap.get(focus.object_id).component,heading=headings[component]??headings[focus.operation];
   if(!heading)throw Error('headline_template_required');sentences.push({id:s.id,headline:[...heading],action_anchors,transition_duration:Math.min(.28,t.end-t.start)});
   const pose=(component.startsWith('metric')||s.phase==='problem')?'think':focus.operation==='lock'||s.phase==='consequence'?'point':'explain';if(!assetCatalog.presenter.poses.some(p=>p.id===pose))throw Error('presenter_pose_unavailable');events.push({sentence_id:s.id,pose});
  }
  const design={schema_version:'source-render-design.v1',profile_id:plan.profile_id,benchmark_sha256:plan.benchmark_sha256,objects,sentences,presenter:{...assetCatalog.presenter,events},fonts:assetCatalog.fonts,texture:{type:'procedural_paper',seed:37}};
  const manifest=compileSourceRender(job,plan,timing,design),collisions=checkCompositionLayout(manifest);
  if(collisions.length){report.issues.push(...collisions);return {design:null,manifest:null,report};}
  report.ready=true;report.hashes={plan:hash(source),timing:hash(timing),asset_catalog:hash(assetCatalog),design:hash(design)};report.review={semantic_template_interpretation:'human_review_required',visual_quality:'human_review_required',facts_verified:false,voice_approved:timing.audio.voice_status==='approved'};return {design,manifest,report};
 }catch(error){report.issues.push({code:error.message});return {design:null,manifest:null,report};}
}
