import fs from 'node:fs/promises';
import {buildPlanRequest,parsePlanResponse,PLANNER_INSTRUCTIONS} from '../planner/plan-request.mjs';
const spec=JSON.parse(await fs.readFile(new URL('../examples/platform-dependency.json',import.meta.url),'utf8'));
const node=(name,type,parameters,x,y)=>({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,type,typeVersion:type==='n8n-nodes-base.httpRequest'?4.2:type==='n8n-nodes-base.code'?2:1,position:[x,y],parameters});
const configCode=`// Select your existing model and renderer host. No API keys belong in this node.\nreturn [{json:${JSON.stringify({model:'REPLACE_WITH_YOUR_MODEL_ID',renderer_base_url:'https://REPLACE_WITH_RENDERER_HOST',script:spec.beats.map(b=>b.narration).join(' '),claims:spec.claims,duration:20,width:1080},null,2)}}];`;
const configGuard="const c=$input.first().json;if(!c.model||c.model.includes('REPLACE')||!c.renderer_base_url.startsWith('https://')||c.renderer_base_url.includes('REPLACE'))throw new Error('Configure the existing OpenAI model ID and HTTPS renderer host first.');return [{json:c}];";
const requestCode=`const c=$items('Configure Preview')[0].json;const caps=$input.first().json;if(caps.version!=='semantic-scene-1')throw new Error('Renderer capability version mismatch.');const SCENE_SCHEMA=caps.schema;const PLANNER_INSTRUCTIONS=${JSON.stringify(PLANNER_INSTRUCTIONS)};const buildPlanRequest=${buildPlanRequest.toString()};return [{json:{request:buildPlanRequest(c)}}];`;
const parseCode=`const c=$items('Configure Preview')[0].json;const parsePlanResponse=${parsePlanResponse.toString()};const spec=parsePlanResponse($input.first().json,c.script,c.claims);return [{json:{spec,width:c.width}}];`;
const http=(method,url,auth,extra={})=>({method,url,...auth,options:{timeout:180000},...extra});
const renderAuth={authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth'};
const nodes=[
  node('Manual Test','n8n-nodes-base.manualTrigger',{},0,0),
  node('Configure Preview','n8n-nodes-base.code',{jsCode:configCode},240,0),
  node('Check Configuration','n8n-nodes-base.code',{jsCode:configGuard},480,0),
  node('Get Renderer Capabilities','n8n-nodes-base.httpRequest',http('GET',"={{ $json.renderer_base_url + '/semantic-capabilities' }}",renderAuth),720,0),
  node('Build Structured Plan Request','n8n-nodes-base.code',{jsCode:requestCode},960,0),
  node('OpenAI Plan Scene','n8n-nodes-base.httpRequest',http('POST','https://api.openai.com/v1/responses',{authentication:'predefinedCredentialType',nodeCredentialType:'openAiApi'},{sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.request) }}'}),1200,0),
  node('Preserve Script And Claims','n8n-nodes-base.code',{jsCode:parseCode},1440,0),
  node('Validate Scene Specification','n8n-nodes-base.httpRequest',http('POST',"={{ $items('Configure Preview')[0].json.renderer_base_url + '/validate-semantic-scene' }}",renderAuth,{sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify({spec:$json.spec}) }}'}),1680,0),
  node('Render Semantic Preview','n8n-nodes-base.httpRequest',http('POST',"={{ $items('Configure Preview')[0].json.renderer_base_url + '/render-semantic-preview' }}",renderAuth,{sendBody:true,specifyBody:'json',jsonBody:"={{ JSON.stringify($items('Preserve Script And Claims')[0].json) }}"}),1920,0),
  node('Preview Review Required','n8n-nodes-base.code',{jsCode:"const r=$input.first().json;if(r.ok!==true||r.previewOnly!==true||r.voicePending!==true)throw new Error('Unexpected preview result');return [{json:{...r,status:'preview_ready_voice_and_human_review_pending',next:'Review the motion, add approved voice and align timestamps before full production.'}}];"},2160,0),
  {id:'setup-notes',name:'Setup Notes',type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[380,-400],parameters:{height:310,width:1000,content:'## Draft: existing engine semantic preview\nImport as a new, inactive workflow. This does not edit existing workflows or the separate V2.0 project.\n\n1. Deploy the reviewed draft preview backend first.\n2. Set renderer_base_url and your existing OpenAI model ID in Configure Preview.\n3. Choose your existing OpenAI credential on OpenAI Plan Scene.\n4. Choose an HTTP Header Auth credential on the three renderer HTTP nodes: Authorization = Bearer <RENDER_TOKEN>. Keep the secret in credentials.\n5. Run manually. Validation errors stop the workflow before rendering.\n\nVoice generation, word alignment, creative approval, Drive/Sheets logging and automatic intake are pending. No messages are sent.'}},
];
const chain=nodes.slice(0,10);const connections={};for(let i=0;i<chain.length-1;i++)connections[chain[i].name]={main:[[{node:chain[i+1].name,type:'main',index:0}]]};
const workflow={name:'Explainer — Semantic Plan To Preview — DRAFT',active:false,nodes,connections,settings:{executionOrder:'v1'},pinData:{}};
const output=new URL('../workflows/Semantic_Plan_To_Preview_DRAFT.json',import.meta.url);await fs.writeFile(output,JSON.stringify(workflow,null,2)+'\n');
console.log('Saved inactive n8n workflow: 10 connected nodes; credentials intentionally unbound.');
