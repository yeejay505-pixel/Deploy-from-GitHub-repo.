// Bookkeeping only: source values, prose claims, actions and states stay intact.
// Unresolved visual design is reported, never invented to force acceptance.
export function prepareDeterministicPlan(raw,context){
 const plan=structuredClone(raw),repairs=[],issues=[];
 const issue=(code,path,detail)=>issues.push({code,path,detail});
 const ledger=new Map(context.claims.map(c=>[c.claim_id,c]));
 const declared=new Map((plan.claims??[]).map(c=>[c.claim_id,c]));
 const reference=(id,path)=>{
  if(!ledger.has(id)){issue('unknown_source_claim',path,id);return;}
  if(!declared.has(id)){const c={claim_id:id,verbatim_quote:ledger.get(id).text};plan.claims.push(c);declared.set(id,c);repairs.push({code:'restore_cited_source_claim',path,claim_id:id});}
 };
 function visit(value,path='plan'){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach((v,i)=>visit(v,path+'['+i+']'));return;}
  for(const [key,v] of Object.entries(value)){
   if(key==='claim_ids'&&Array.isArray(v))v.forEach(id=>reference(id,path+'.claim_ids'));
   if(key==='claim_id'&&path.startsWith('plan.metrics'))reference(v,path+'.claim_id');
   visit(v,path+'.'+key);
  }
 }
 if(!Array.isArray(plan.claims)||!Array.isArray(plan.sentences)||!Array.isArray(plan.objects)||!Array.isArray(plan.metrics))return {plan,report:{ready:false,repairs,issues:[{code:'builder_shape_invalid'}],release_eligible:false}};
 visit(plan);
 const objects=new Map(plan.objects.map(o=>[o.id,o])),metrics=new Map(plan.metrics.map(m=>[m.id,m]));
 const current=new Map(plan.objects.map(o=>[o.id,o.initial_state]));
 for(const s of plan.sentences){
  const path='sentences.'+s.id,v=s.visual_argument;if(!v){issue('missing_visual_argument',path,'');continue;}
  // Only citation tokens already supported by this sentence may leave spoken text.
  if(typeof s.narration==='string')s.narration=s.narration.replace(/\s*\[(C-[A-Za-z0-9_-]+)\]/g,(token,id)=>{
   if(ledger.has(id)&&s.claim_ids?.includes(id)){repairs.push({code:'move_citation_out_of_narration',path,claim_id:id});return '';}
   issue('inline_citation_not_bound',path,id);return token;
  }).trim();
  const before=v.state_before??[],after=v.state_after??[],actions=v.visible_action??[],ids=v.persistent_objects??[];
  const bs=new Set(before.map(x=>x.object_id)),as=new Set(after.map(x=>x.object_id));
  if(bs.size===before.length&&as.size===after.length&&bs.size===as.size&&[...bs].every(id=>as.has(id)&&objects.has(id))&&ids.every(id=>bs.has(id))){
   const missing=[...bs].filter(id=>!ids.includes(id));
   if(missing.length){v.persistent_objects=[...ids,...missing];repairs.push({code:'restore_persistent_object_membership',path,object_ids:missing});}
  }else issue('object_membership_requires_review',path,'Before/after objects must match without dropping or inventing state.');
  for(const b of before)if(current.get(b.object_id)!==b.state)issue('object_state_discontinuity',path,b.object_id);
  for(const a of actions){
   if(a.from_state===a.to_state)issue('unchanged_action',path,a.object_id);
   const o=objects.get(a.object_id);if(!o)issue('unknown_action_object',path,a.object_id);
   else if(['chart','counter'].includes(o.kind)&&!o.metric_ids?.length)issue('unbound_numeric_object',path,o.id);
  }
  if(!actions.some(a=>['diagram','chart','counter'].includes(objects.get(a.object_id)?.kind)&&a.from_state!==a.to_state))issue('meaningful_diagram_change_required',path,'A presenter or label change cannot replace explanatory motion.');
  const q=v.quantity_treatment;
  if(q?.mode==='source_bound'&&!q.metric_ids?.length)issue('source_bound_metric_missing',path,'Select a source metric or redesign as qualitative; no automatic conversion.');
  for(const id of q?.metric_ids??[]){const m=metrics.get(id);if(!m||!s.claim_ids.includes(m.claim_id))issue('metric_citation_mismatch',path,id);if(!actions.some(a=>objects.get(a.object_id)?.metric_ids?.includes(id)))issue('metric_not_visibly_bound',path,id);}
  for(const o of plan.objects)if(o.kind==='chart'&&o.metric_ids?.some(id=>(metrics.get(id)?.values?.length??0)>1))issue('range_needs_range_component',path,o.id);
  for(const a of after)current.set(a.object_id,a.state);
 }
 return {plan,report:{schema_version:'deterministic-plan-preparation.v1',ready:issues.length===0,repairs,issues,release_eligible:false}};
}
