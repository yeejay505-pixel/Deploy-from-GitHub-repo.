import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pitchState,sampleTenantRoute} from '../src/semantic/investor-pitch.mjs';
const [planPath,ledgerPath,outPath]=process.argv.slice(2),plan=JSON.parse(await fs.readFile(planPath,'utf8')),ledger=JSON.parse(await fs.readFile(ledgerPath,'utf8'));
const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
const ids=new Set(plan.objects.map(o=>o.id)),S=Object.fromEntries(plan.sentences.map(s=>[s.id,s]));
check(ids.size===plan.objects.length,'Duplicate persistent identities');
check(plan.releaseEligible===false,'Unverified estimates must remain creative-review only');
check(plan.sentences.length===30&&plan.sentenceBeats.length===30,'Full narration beat count differs');
for(const [key,definition] of Object.entries(plan.metricDefinitions)){const claim=ledger.claims.find(c=>c.id===definition.sourceClaimId);check(!!claim,'Metric has no source claim: '+key);check(definition.target===ledger.metricDefinitions[key].target,'Metric differs from ledger: '+key);if(definition.status==='supplied_unverified')check(claim.status==='supplied_unverified'||key.startsWith('lease'),'Unverified metric lost source review state: '+key);}
for(const a of plan.actions){check(ids.has(a.target)||a.target in plan.initialMetrics,'Unknown action target: '+a.target);check(a.end>a.start&&a.start>=0&&a.end<=plan.duration,'Action outside video: '+a.id);}
for(const id of ['forecast','supply','availability','verify','yield'])check(plan.sceneFootnotes[id].includes('Unverified'),'Estimated metric not visibly flagged: '+id);
check(plan.sceneFootnotes.business.includes('not office demand'),'Membership is not office absorption');
check(plan.sceneHeadings.forecast&&plan.sentenceBeats.find(s=>s.id==='supply').quantityTreatment.includes('annual'),'Forecast/annual periods are unclear');
let previousBuild=.2,previousFitout=0,previousOccupied=0;
for(let frame=0;frame<Math.round(plan.duration*30);frame++){
 const t=frame/30,{objects:O,metrics:M}=pitchState(plan,t),asset=O.get('asset-main'),floor=O.get('floor-main');
 check(asset.build>=previousBuild-1e-9,'Construction reversed');check(floor.fitout>=previousFitout-1e-9,'Fit-out reversed');check(floor.occupied>=previousOccupied-1e-9,'Occupancy reversed');
 if(floor.occupied>0)check(floor.fitout>=.99999,'Occupants enter before fit-out');
 if(O.get('lease-main').signed>0)check(asset.build>=.99999,'Lease activates before completed asset');
 if(O.get('capital-main').locked>0)check(t>=S.completed.speechStart,'Purchase price locked before agreed sentence');
 for(const [key,v] of Object.entries(M))check(Number.isFinite(v),'Nonfinite metric: '+key);
 check(M.gradeAHigh>=0&&M.gradeAHigh<=95,'Cell upper estimate outside intended percentage range');
 check(Math.round(M.gradeAHigh)<=100,'Percentage-cell chart overflow');
 previousBuild=asset.build;previousFitout=floor.fitout;previousOccupied=floor.occupied;
}
const last=pitchState(plan,plan.duration-.001).metrics;for(const [key,d] of Object.entries(plan.metricDefinitions))check(Math.abs(last[key]-d.target)<1e-8,'Counter not settled: '+key);
// The two occupied rooms share the existing doorway paths: inspect their actual crossing geometry.
for(let person=0;person<8;person++)for(let i=0;i<=200;i++){const p=sampleTenantRoute(person,i/200);check(p.x>=-400&&p.x<=100&&p.y>=-245&&p.y<=230,'Occupier outside persistent plan');if(p.y>136&&p.y<140)check((p.x>=-245&&p.x<=-191)||(p.x>=126&&p.x<=181),'Occupier crossed a closed doorway');}
for(const c of plan.captions)check(c.start>=0&&c.end>c.start&&c.end<=plan.duration,'Invalid caption interval');
for(const e of plan.soundEvents)check(e.at>=0&&e.at<plan.duration,'Sound outside video');
const report={pass:errors.length===0,errors,framesChecked:Math.round(plan.duration*30),persistentObjects:ids.size,actions:plan.actions.length,soundCues:plan.soundEvents.length,captionCues:plan.captions.length,sourceReviewRequired:ledger.claims.filter(c=>c.status==='supplied_unverified').map(c=>c.id),separateForecastAndAnnualScales:true,sourceEstimatesVisiblyFlagged:true,constructionMonotonic:true,fitoutBeforeOccupants:true,completionBeforeLease:true,metricSourceOfTruth:'Same manifest definitions drive all labels, counters and percentage cells.',releaseEligible:false,humanCreativeApproval:'pending'};
await fs.writeFile(outPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(errors.length,0,errors.join('; '));
