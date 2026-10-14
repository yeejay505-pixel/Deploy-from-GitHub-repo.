import fs from 'node:fs/promises';
import {routeIntake, DEFAULT_ROUTER_CONFIG} from '../intake/universal-router.mjs';
const profile=JSON.parse(await fs.readFile(new URL('../quality/approved-visual-reference.json',import.meta.url),'utf8'));
const node=(name,type,parameters,x,y,typeVersion=1)=>({id:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,type,typeVersion,position:[x,y],parameters});
const nodes=[
 node('Manual Dry Run','n8n-nodes-base.manualTrigger',{},0,0),
 node('Example Topic','n8n-nodes-base.code',{jsCode:`return [{json:{update_id:10001,message:{message_id:10001,date:1791043200,chat:{id:8580375575},from:{id:8580375575},text:'Explain why growing companies need suitable offices. Use the approved visual benchmark.'}}}];`},240,0,2),
 node('When Executed By Intake Adapter','n8n-nodes-base.executeWorkflowTrigger',{inputSource:'passthrough'},240,240,1.1),
 node('Configure Router','n8n-nodes-base.code',{jsCode:`// Operator config only. Keep dispatch disabled until the durable gateway is tested.\nconst config=${JSON.stringify(DEFAULT_ROUTER_CONFIG,null,2)};\nreturn $input.all().map(item=>({json:{envelope:item.json,router_config:config},...(item.binary?{binary:item.binary}:{})}));`},480,120,2),
 node('Normalize And Route','n8n-nodes-base.code',{jsCode:`const profile=${JSON.stringify(profile)};\nconst routeIntake=${routeIntake.toString()};\nreturn $input.all().map(item=>routeIntake({json:item.json.envelope,binary:item.binary},item.json.router_config,profile));`},720,120,2),
 node('Dispatch Ready','n8n-nodes-base.if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:'dispatch-ready',leftValue:'={{ $json.dispatch_ready }}',rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},960,120,2.2),
 node('Execute Durable Intake Gateway','n8n-nodes-base.executeWorkflow',{workflowId:{__rl:true,value:'={{ $json.gateway_workflow_id }}',mode:'id'},mode:'each',options:{waitForSubWorkflow:true}},1200,0,1.2),
 node('Return Routing Preview','n8n-nodes-base.code',{jsCode:'return $input.all();'},1200,240,2),
 node('Setup Note','n8n-nodes-base.stickyNote',{height:380,width:850,content:'## Workflow 00 — Universal Intake + Router — DRAFT\nInactive. Default manual run makes NO external calls, writes or messages.\n\nRoutes existing /reprelaunch, /recreative, /assetmode, /assetdone, /voice and /final commands, topics, source files, voice briefs and revisions. Carries the exact approved v05 visual profile.\n\nThe durable storage API and inactive Workflow 00G gateway are implemented locally, not deployed or bound here. Import and test 00G, then set its actual workflow ID. Project/session wrappers, production voice/final gates and approved-quality renderer binding remain pending.\n\nNo Telegram trigger is included: add this sub-workflow after the existing single Telegram ingress or migrate to one trigger after gateway validation. Do not activate competing triggers on the same bot. No delivery permissions are added.'},300,-430),
];
const connections={};
const connect=(a,b,index=0)=>{const main=connections[a]?.main??[];main[index]=[{node:b,type:'main',index:0}];connections[a]={main};};
connect('Manual Dry Run','Example Topic');connect('Example Topic','Configure Router');connect('When Executed By Intake Adapter','Configure Router');connect('Configure Router','Normalize And Route');connect('Normalize And Route','Dispatch Ready');connect('Dispatch Ready','Execute Durable Intake Gateway',0);connect('Dispatch Ready','Return Routing Preview',1);
const workflow={name:'Explainer Engine — 00 Universal Intake + Router — DRAFT',active:false,nodes,connections,settings:{executionOrder:'v1'},pinData:{},meta:{templateCredsSetupCompleted:false}};
await fs.writeFile(new URL('../workflows/Explainer_Engine_00_Universal_Intake_Router_DRAFT.json',import.meta.url),JSON.stringify(workflow,null,2)+'\n');
console.log('Saved inactive universal intake router. Default execution is local dry-run only.');
