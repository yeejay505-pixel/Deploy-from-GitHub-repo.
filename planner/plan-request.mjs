import {SCENE_SCHEMA} from '../src/semantic/scene-schema.mjs';
export const PLANNER_INSTRUCTIONS=`You are a visual argument planner for a deterministic animation renderer.
Return only a semantic-scene-1 specification matching the supplied JSON schema.
Preserve the user's approved script exactly across beat narration fields, in the same order.
Do not invent research, sources, numeric facts, assets or unsupported renderer functions.
Use only the supplied claims. Mark all hypothetical quantities illustrative with a visible disclaimer.
Each beat declares cause, visible action and consequence. Use stable object IDs throughout.
Place objects within x=40..1040 and y=475..1475, allowing room for labels.
Available objects: platform, shop, cart, person, counter, bar, connector, document, label.
Metric consumers cart/counter/bar reference one metric ID; do not animate separate inconsistent values.
Available animated properties: x, y, opacity, progress, rotation on objects; value on metrics.
All fields are required; use an empty string for unused metric and empty arrays when appropriate.
Keep colour values as six-digit hex codes, opacity/progress in 0..1, and metric values within 0..max.
Action intervals for one target/property never overlap. Each action starts from its preceding state.
Beats cover time 0 through duration without gaps or overlap. Intentional final holds use mode=hold.
TimingBasis must be draft until measured narration timestamps are supplied. Keep duration 2..60 seconds.
Do not include executable code or URLs. Unsupported visual ideas require a simpler valid explanation;
never invent a new object type. Leave the final meaningful composition visible.`;
export function buildPlanRequest({script,claims,duration,model}){
  if(!model||/REPLACE|SET_YOUR/.test(model))throw new Error('Choose the existing OpenAI model ID before running.');
  if(typeof script!=='string'||!script.trim()||script.length>12000)throw new Error('Supply an approved script (1–12,000 characters).');
  if(!Array.isArray(claims)||!claims.length)throw new Error('Supply the upstream claims ledger or an explicitly illustrative claim.');
  const ids=new Set();for(const c of claims){if(!c.id||ids.has(c.id)||!c.text||!['sourced','illustrative'].includes(c.status)||typeof c.source!=='string'||c.status==='sourced'&&!c.source.trim())throw new Error('Resolve incomplete or unsupported claims before planning.');ids.add(c.id);}
  if(!Number.isFinite(duration)||duration<2||duration>60)throw new Error('Duration must be 2–60 seconds.');
  return {model,store:false,input:[{role:'system',content:PLANNER_INSTRUCTIONS},{role:'user',content:JSON.stringify({script,claims,duration})}],text:{format:{type:'json_schema',name:'semantic_scene',strict:true,schema:SCENE_SCHEMA}}};
}
export function parsePlanResponse(response,originalScript,originalClaims){
  if(response?.status!=='completed')throw new Error(`Planner response incomplete: ${response?.status??'missing status'}`);
  const parts=(response.output||[]).flatMap(x=>x.content||[]);
  if(parts.some(x=>x.type==='refusal'))throw new Error('Planner declined the request.');
  const raw=parts.filter(x=>x.type==='output_text').map(x=>x.text).join('');
  if(!raw)throw new Error('Planner response has no specification.');
  const spec=JSON.parse(raw),normalize=s=>s.trim().replace(/\s+/g,' ');
  if(normalize(spec.beats.map(b=>b.narration).join(' '))!==normalize(originalScript))throw new Error('Planner changed the approved script.');
  if(!Array.isArray(originalClaims)||!originalClaims.length)throw new Error('Missing upstream claim ledger.');
  const ledger=new Map(originalClaims.map(c=>[c.id,c]));
  for(const claim of spec.claims){const source=ledger.get(claim.id);if(!source||['text','status','source'].some(k=>claim[k]!==source[k]))throw new Error(`Planner invented or changed claim ${claim.id}`);}
  return spec;
}
