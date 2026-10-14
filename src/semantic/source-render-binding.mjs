// Reviewed local design bindings turn prose states into supported deterministic components.
// The planner never supplies executable code, asset paths, timing guesses or approvals.
import {createHash} from 'node:crypto';
import {validateIntelligencePlan,INTELLIGENCE_SCHEMA} from '../../intelligence/plan-contract.mjs';
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const fail=message=>{throw Error(message);};
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v,keys,label)=>{if(!plain(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))fail(label+'_fields_invalid');};
export const COMPONENTS={
 checklist:{kind:'diagram',parameters:['progress','opacity'],operations:['reveal','grow','transform']},
 office_lifecycle:{kind:'diagram',parameters:['build','open','fitout','occupied','opacity'],operations:['build','unfold','fitout','occupy','reveal','transform']},
 building:{kind:'diagram',parameters:['build','occupied','selected','opacity'],operations:['build','occupy','reveal','transform']},
 workspace:{kind:'diagram',parameters:['open','fitout','occupied','opacity'],operations:['unfold','fitout','occupy','reveal','transform']},
 queue:{kind:'diagram',parameters:['progress','opacity'],operations:['queue','grow','reveal','move']},
 price_lock:{kind:'diagram',parameters:['progress','opacity'],operations:['lock','reveal','transform']},
 lease:{kind:'diagram',parameters:['progress','opacity'],operations:['sign','reveal']},
 metric_range:{kind:'counter',parameters:['progress','opacity'],operations:['grow','reveal','transform']},
 metric_bar:{kind:'chart',parameters:['progress','opacity'],operations:['grow','reveal','transform']}
};
const conceptTypes=new Set(['checklist','office_lifecycle','building','workspace','queue','price_lock','lease']);
const norm=s=>s.toLowerCase().replace(/^_/,'').replace(/[^\p{L}\p{N}]/gu,'');
export function validateMeasuredTiming(plan,timing){
 fields(timing,['schema_version','audio','sentences'],'timing');
 if(timing.schema_version!=='measured-narration.v1')fail('timing_schema_invalid');
 fields(timing.audio,['path','sha256','duration','voice_status','alignment_method'],'audio');
 const a=timing.audio;
 if(!a.path||!/^[a-f0-9]{64}$/.test(a.sha256)||!Number.isFinite(a.duration)||a.duration<=0||a.duration>180||!['guide','approved'].includes(a.voice_status)||!['measured_word_timestamps','forced_alignment'].includes(a.alignment_method))fail('measured_audio_required');
 if(timing.sentences.length!==plan.sentences.length)fail('timing_sentence_coverage_invalid');
 let prior=0;
 for(let i=0;i<plan.sentences.length;i++){
  const t=timing.sentences[i],s=plan.sentences[i];fields(t,['id','narration','start','end','words'],'sentence_timing');
  if(t.id!==s.id||t.narration!==s.narration||!Number.isFinite(t.start)||!Number.isFinite(t.end)||t.start<prior||t.end<=t.start||t.end>a.duration||t.end-t.start<.2)fail('timing_identity_or_order_invalid');
  const expected=s.narration.split(/\s+/).map(norm).filter(Boolean),actual=[];let wordEnd=t.start;
  for(const w of t.words){fields(w,['word','start','end'],'word');if(!norm(w.word)||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<wordEnd-1e-6||w.end<=w.start||w.end>t.end+1e-6)fail('word_timing_invalid');actual.push(norm(w.word));wordEnd=w.end;}
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('word_transcript_mismatch');
  if(t.words[0].start<t.start||t.words.at(-1).end>t.end+1e-6)fail('word_outside_sentence');prior=t.end;
 }
 return timing;
}
function anchor(t,a){
 fields(a,['word_index','edge'],'action_anchor');
 if(!Number.isInteger(a.word_index)||a.word_index<0||a.word_index>=t.words.length||!['start','end'].includes(a.edge))fail('action_anchor_invalid');
 return t.words[a.word_index][a.edge];
}
function parameters(value,component){
 fields(value,component.parameters,'component_state');for(const p of component.parameters)if(!Number.isFinite(value[p])||value[p]<0||value[p]>1)fail('component_parameter_out_of_range');
}
export function compileSourceRender(job,rawPlan,timing,design){
 const sourcePlan=Object.fromEntries(Object.keys(INTELLIGENCE_SCHEMA.properties).map(k=>[k,rawPlan[k]]));
 const plan=validateIntelligencePlan(sourcePlan,job);validateMeasuredTiming(plan,timing);
 fields(design,['schema_version','profile_id','benchmark_sha256','objects','sentences','presenter','fonts','texture'],'design');
 if(design.schema_version!=='source-render-design.v1'||design.profile_id!==plan.profile_id||design.benchmark_sha256!==plan.benchmark_sha256||plan.profile_id!=='commercial-explainer-v05')fail('render_profile_mismatch');
 if(design.objects.length!==plan.objects.length||design.sentences.length!==plan.sentences.length)fail('design_coverage_required');
 const assets=[timing.audio,...design.fonts,design.presenter.asset];
 for(const asset of assets)if(!plain(asset)||!asset.path||!/^[a-f0-9]{64}$/.test(asset.sha256))fail('local_asset_hash_required');
 if(design.fonts.length!==2||design.fonts.some((f,i)=>f.role!==['regular','bold'][i]))fail('local_fonts_required');
 fields(design.texture,['type','seed'],'texture');if(design.texture.type!=='procedural_paper'||!Number.isInteger(design.texture.seed))fail('texture_not_supported');
 fields(design.presenter,['asset','poses','events'],'presenter');
 const poses=new Map();for(const p of design.presenter.poses){fields(p,['id','crop','anchorX'],'pose');if(poses.has(p.id)||!Array.isArray(p.crop)||p.crop.length!==4||p.crop.some(x=>!Number.isFinite(x)||x<0)||p.crop[2]<1||p.crop[3]<1||p.anchorX<0||p.anchorX>p.crop[2])fail('presenter_pose_invalid');poses.set(p.id,p);}
 if(!poses.size||design.presenter.events.length!==plan.sentences.length)fail('presenter_events_required');
 const objects=new Map(),metrics=new Map(plan.metrics.map(m=>[m.id,m]));
 for(const o of design.objects){
  fields(o,['id','component','layout','label','metric_id','value_index','scale_max','states'],'design_object');
  const source=plan.objects.find(x=>x.id===o.id),component=COMPONENTS[o.component];
  if(!source||objects.has(o.id)||!component||source.kind!==component.kind)fail('unavailable_component_or_object');
  fields(o.layout,['x','y','scale'],'layout');const {x,y,scale}=o.layout;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(scale)||x<100||x>870||y<640||y>1370||scale<.25||scale>1)fail('layout_out_of_safe_area');
  if(typeof o.label!=='string'||o.label.length>45||/\d/.test(o.label))fail('design_label_invalid');
  if(conceptTypes.has(o.component)){if(o.metric_id!==''||source.metric_ids.length||o.value_index!==0||o.scale_max!==0)fail('conceptual_component_metric_invalid');}
  else{const m=metrics.get(o.metric_id);if(!m||source.metric_ids.length!==1||source.metric_ids[0]!==m.id||!Number.isInteger(o.value_index)||o.value_index<0||o.value_index>=m.values.length||!Number.isFinite(o.scale_max)||o.scale_max<=0||o.scale_max<Math.max(...m.values)||m.values.some(v=>v<0))fail('shared_metric_binding_invalid');if(o.component==='metric_bar'&&m.values.length!==1)fail('range_cannot_be_silently_rendered_as_single_bar');if(o.component==='metric_bar'&&/[<>≤≥~+]|\b(?:less than|more than|at least|at most|under|over|roughly|around|approximately|up to)\b/i.test(m.display_text))fail('qualified_value_cannot_be_an_exact_bar');}
  if(!Array.isArray(o.states)||!o.states.length)fail('state_bindings_required');
  const states=new Map();for(const s of o.states){fields(s,['name','parameters'],'state');if(typeof s.name!=='string'||!s.name.trim()||states.has(s.name))fail('state_binding_invalid');parameters(s.parameters,component);states.set(s.name,s.parameters);}
  if(!states.has(source.initial_state))fail('initial_state_binding_required');
  objects.set(o.id,{...o,initial:states.get(source.initial_state),stateMap:states});
 }
 const actions=[],sentences=[],cues=[],poseEvents=[];
 for(let i=0;i<plan.sentences.length;i++){
  const s=plan.sentences[i],v=s.visual_argument,d=design.sentences[i],t=timing.sentences[i];
  fields(d,['id','headline','action_anchors','transition_duration'],'sentence_design');
  if(d.id!==s.id||!Array.isArray(d.headline)||d.headline.length!==2||d.headline.some(x=>typeof x!=='string'||!x.trim()||x.length>45||/\d/.test(x))||d.action_anchors.length!==v.visible_action.length)fail('sentence_design_invalid');
  // Carry preserves object tracks. Dissolve affects the headline only; unsupported full-field cuts/morphs stop.
  if(!['carry','dissolve'].includes(v.transition))fail('transition_component_unavailable');
  if(!Number.isFinite(d.transition_duration)||d.transition_duration<0||d.transition_duration>.5||d.transition_duration>t.end-t.start)fail('transition_duration_invalid');
  for(const b of [...v.state_before,...v.state_after])if(!objects.get(b.object_id)?.stateMap.has(b.state))fail('prose_state_has_no_numeric_binding');
  let meaningful=false;
  for(let j=0;j<v.visible_action.length;j++){
   const a=v.visible_action[j],o=objects.get(a.object_id),component=COMPONENTS[o.component],w=d.action_anchors[j];
   fields(w,['object_id','start','end'],'anchored_action');if(w.object_id!==a.object_id||!component.operations.includes(a.operation))fail('operation_component_unavailable');
   const start=anchor(t,w.start),end=anchor(t,w.end);if(end-start<1/30)fail('action_timing_too_short');
   const from=o.stateMap.get(a.from_state),to=o.stateMap.get(a.to_state),changed=component.parameters.filter(k=>Math.abs(to[k]-from[k])>.001);
   if(!changed.length)fail('prose_change_has_no_visible_parameter_change');
   // Opacity or selected highlight alone cannot stand in for the semantic mechanism.
   const sem=changed.filter(k=>!['opacity','selected'].includes(k));
   if(sem.some(k=>Math.abs(to[k]-from[k])>=.05)&&Math.max(from.opacity,to.opacity)>.2)meaningful=true;
   for(const property of changed)actions.push({sentence_id:s.id,target:o.id,property,start,end,from:from[property],to:to[property],operation:a.operation});
  }
  if(!meaningful)fail('render_has_no_meaningful_mechanism_change');
  const cue=v.sound_cue;if(cue.type!=='none'){const action=actions.findLast(a=>a.sentence_id===s.id&&a.target===cue.object_id);cues.push({target:cue.object_id,type:cue.type,time:cue.trigger==='action_start'?action.start:Math.min(action.end,t.end-1/30),sentence_id:s.id});}
  const event=design.presenter.events[i];fields(event,['sentence_id','pose'],'presenter_event');if(event.sentence_id!==s.id||!poses.has(event.pose))fail('presenter_event_invalid');poseEvents.push({time:t.start,pose:event.pose});
  sentences.push({...s,start:i?timing.sentences[i-1].end:0,end:i===plan.sentences.length-1?timing.audio.duration:t.end,speech_start:t.start,speech_end:t.end,words:t.words,headline:d.headline,transition_duration:d.transition_duration});
 }
 const publicObjects=[...objects.values()].map(({stateMap,...o})=>o);
 return {schema_version:'source-render-manifest.v1',event_id:plan.event_id,profile_id:plan.profile_id,benchmark_sha256:plan.benchmark_sha256,
  hashes:{source_plan:hash(sourcePlan),timing:hash(timing),design:hash(design)},render:{width:1080,height:1920,fps:30,duration:timing.audio.duration},
  audio:timing.audio,fonts:design.fonts,presenter:{...design.presenter,events:poseEvents},texture:design.texture,objects:publicObjects,metrics:plan.metrics,actions,sentences,cues,
  canonical_claim_ledger:plan.canonical_claim_ledger,uncertainties:plan.uncertainties,unsupported_for_review:plan.unsupported_for_review,
  review:{...plan.review,measured_audio:timing.audio.voice_status==='guide'?'measured_guide':'measured',renderer_binding:'compiled_local_review',facts_verified:false,visual_sample_approved:false},release_eligible:false};
}
export function sampleSourceRender(manifest,time){
 if(!Number.isFinite(time)||time<0||time>manifest.render.duration)fail('sample_time_invalid');
 const objects=new Map(manifest.objects.map(o=>[o.id,{...o,parameters:{...o.initial}}]));
 for(const a of manifest.actions){if(time<a.start)continue;let p=Math.min(1,(time-a.start)/(a.end-a.start));p=p*p*(3-2*p);objects.get(a.target).parameters[a.property]=a.from+(a.to-a.from)*p;}
 const sentence=manifest.sentences.find(s=>time>=s.start&&time<s.end)??manifest.sentences.at(-1);
 const metrics=new Map(manifest.metrics.map(m=>[m.id,m]));
 return {objects,metrics,sentence,time};
}
