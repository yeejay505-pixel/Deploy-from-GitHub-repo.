import {SCENE_SCHEMA} from './scene-schema.mjs';

export class SceneSpecError extends Error{
  constructor(errors){super(errors.join('; '));this.name='SceneSpecError';this.errors=errors;}
}
const finite=Number.isFinite;
// Validate the same small JSON-schema subset sent to the planner. No arbitrary code,
// assets, URLs or unknown renderer behaviour can be introduced by a generated spec.
function shape(v,s,p,e){
  if(s.type==='object'){
    if(!v||typeof v!=='object'||Array.isArray(v)){e.push(`${p}: expected object`);return;}
    for(const k of s.required)if(!(k in v))e.push(`${p}.${k}: missing`);
    for(const k of Object.keys(v))if(!(k in s.properties))e.push(`${p}.${k}: unsupported field`);
    for(const [k,child] of Object.entries(s.properties))if(k in v)shape(v[k],child,`${p}.${k}`,e);
  }else if(s.type==='array'){
    if(!Array.isArray(v)){e.push(`${p}: expected array`);return;}
    v.forEach((x,i)=>shape(x,s.items,`${p}[${i}]`,e));
  }else if(s.type==='number'){
    if(!finite(v))e.push(`${p}: expected finite number`);
  }else if(typeof v!=='string')e.push(`${p}: expected string`);
  if(s.enum&&!s.enum.includes(v))e.push(`${p}: unsupported value ${String(v)}`);
}
export function validateSceneSpec(spec){
  const errors=[];shape(spec,SCENE_SCHEMA,'scene',errors);
  if(errors.length)return {ok:false,errors};
  const fail=s=>errors.push(s);
  if(!/^[A-Za-z0-9_-]{1,90}$/.test(spec.sceneId))fail('Invalid sceneId');
  if(spec.duration<2||spec.duration>60)fail('Preview duration must be 2–60 seconds');
  if(spec.objects.length<1||spec.objects.length>60||spec.metrics.length>20||spec.actions.length>180||spec.beats.length>20||spec.cues.length>60||spec.claims.length>60)fail('Scene exceeds preview resource limits');
  const ids=new Set();
  for(const x of [...spec.objects,...spec.metrics]){if(!/^[A-Za-z0-9_-]{1,80}$/.test(x.id)||ids.has(x.id))fail(`Invalid or duplicate object/metric id ${x.id}`);ids.add(x.id);}
  const objectMap=new Map(spec.objects.map(x=>[x.id,x])),metricMap=new Map(spec.metrics.map(x=>[x.id,x]));
  for(const m of spec.metrics)if(m.max<=0||m.initial<0||m.initial>m.max)fail(`Metric ${m.id} initial/max out of range`);
  for(const o of spec.objects){
    const minimum={platform:[220,200],shop:[240,200],cart:[220,150],person:[20,40],counter:[140,100],bar:[60,100],connector:[1,0],document:[100,170],label:[80,35]}[o.type];
    if(o.w<minimum[0]||o.h<minimum[1])fail(`Object ${o.id} is too small for ${o.type}`);
    if(!/^#[a-fA-F0-9]{6}$/.test(o.color))fail(`Object ${o.id} requires a hex colour`);
    if(o.opacity<0||o.opacity>1||o.progress<0||o.progress>1)fail(`Object ${o.id} visibility/progress out of range`);
    if(o.x<40||o.x+o.w>1040||o.y<475||o.y+o.h>1475||o.w<=0||o.h<0)fail(`Object ${o.id} is outside the illustration safe area`);
    if(o.label.length>38)fail(`Object ${o.id} label too long`);
    if(o.metric&&!metricMap.has(o.metric))fail(`Object ${o.id} references missing metric ${o.metric}`);
    if(['cart','counter','bar'].includes(o.type)&&!o.metric)fail(`Object ${o.id} requires a shared metric`);
    if(o.type==='cart'&&metricMap.get(o.metric)?.max>24)fail('Cart supports at most 24 illustrative people');
  }
  const claimMap=new Map();
  for(const c of spec.claims){
    if(!c.id||claimMap.has(c.id))fail(`Duplicate/missing claim ${c.id}`);claimMap.set(c.id,c);
    if(c.status==='sourced'&&!c.source.trim())fail(`Claim ${c.id} has no source`);
    if(c.status==='unsupported')fail(`Unsupported claim ${c.id}: needs review before rendering`);
  }
  if(spec.claims.some(c=>c.status==='illustrative')&&!spec.disclaimer.trim())fail('Illustrative claims require a visible disclaimer');
  const actions=new Map(),actionIds=new Set();
  for(const a of spec.actions){
    if(actionIds.has(a.id)||!a.id)fail(`Duplicate/missing action ${a.id}`);actionIds.add(a.id);
    const o=objectMap.get(a.target),m=metricMap.get(a.target);
    if(!o&&!m)fail(`Action ${a.id} references missing target ${a.target}`);
    if(a.start<0||a.end<=a.start||a.end>spec.duration)fail(`Action ${a.id} has invalid timing`);
    if(m&&a.property!=='value'||o&&a.property==='value')fail(`Action ${a.id} uses incompatible property`);
    if(['opacity','progress'].includes(a.property)&&(Math.min(a.from,a.to)<0||Math.max(a.from,a.to)>1))fail(`Action ${a.id} value outside 0–1`);
    if(m&&(Math.min(a.from,a.to)<0||Math.max(a.from,a.to)>m.max))fail(`Action ${a.id} exceeds metric bounds`);
    if(o&&a.property==='x'&&(Math.min(a.from,a.to)<40||Math.max(a.from,a.to)+o.w>1040))fail(`Action ${a.id} moves outside horizontal safe area`);
    if(o&&a.property==='y'&&(Math.min(a.from,a.to)<475||Math.max(a.from,a.to)+o.h>1475))fail(`Action ${a.id} moves outside vertical safe area`);
    const key=`${a.target}:${a.property}`;if(!actions.has(key))actions.set(key,[]);actions.get(key).push(a);
  }
  for(const list of actions.values()){
    list.sort((a,b)=>a.start-b.start);
    const first=list[0],o=objectMap.get(first.target),m=metricMap.get(first.target);
    let value=m?.initial??o?.[first.property],end=0;
    for(const a of list){if(a.start<end-1e-8)fail(`Overlapping actions on ${a.target}.${a.property}`);if(finite(value)&&Math.abs(a.from-value)>1e-6)fail(`Discontinuous state for action ${a.id}`);value=a.to;end=a.end;}
  }
  let beatEnd=0;const beatIds=new Set();
  for(const b of spec.beats){
    if(!b.id||beatIds.has(b.id))fail(`Duplicate/missing beat ${b.id}`);beatIds.add(b.id);
    if(Math.abs(b.start-beatEnd)>1e-6||b.end<=b.start||b.end>spec.duration)fail(`Beat ${b.id} leaves a gap or overlap`);beatEnd=b.end;
    if(!objectMap.has(b.focus))fail(`Beat ${b.id} has no visible focus object`);
    if(b.headline.length>55||b.narration.length>220||!b.narration.trim()||!b.cause.trim()||!b.action.trim()||!b.consequence.trim())fail(`Beat ${b.id} is incomplete or too dense`);
    if(!b.claimIds.length)fail(`Beat ${b.id} requires claim provenance or an illustrative claim`);
    for(const id of b.claimIds)if(!claimMap.has(id))fail(`Beat ${b.id} references missing claim ${id}`);
    if(b.mode==='change'&&!spec.actions.some(a=>a.start<b.end&&a.end>b.start&&a.from!==a.to))fail(`Beat ${b.id} has no meaningful animation`);
  }
  if(Math.abs(beatEnd-spec.duration)>1e-6||!spec.beats.length)fail('Beat map does not cover the full scene');
  for(const c of spec.cues)if(!ids.has(c.target)||c.time<0||c.time>=spec.duration)fail('Invalid sound cue');
  return {ok:errors.length===0,errors};
}
export function compileSceneSpec(spec){
  const result=validateSceneSpec(spec);if(!result.ok)throw new SceneSpecError(result.errors);
  const scene=JSON.parse(JSON.stringify(spec));
  const tracks=new Map();for(const a of scene.actions){const k=`${a.target}:${a.property}`;if(!tracks.has(k))tracks.set(k,[]);tracks.get(k).push(a);}
  for(const t of tracks.values())t.sort((a,b)=>a.start-b.start);
  return {scene,tracks};
}
function ease(p,mode){p=Math.max(0,Math.min(1,p));return mode==='linear'?p:mode==='ease_out'?1-(1-p)**3:p*p*(3-2*p);}
export function sampleScene(compiled,time){
  const {scene,tracks}=compiled;
  const objects=new Map(scene.objects.map(x=>[x.id,{...x}]));
  const metrics=new Map(scene.metrics.map(x=>[x.id,{...x,value:x.initial}]));
  for(const track of tracks.values()){
    for(const a of track){if(time<a.start)break;const target=objects.get(a.target)||metrics.get(a.target);const p=ease((time-a.start)/(a.end-a.start),a.easing);target[a.property]=a.from+(a.to-a.from)*p;}
  }
  return {time,objects,metrics,beat:scene.beats.find(b=>time>=b.start&&time<b.end)||scene.beats.at(-1)};
}
