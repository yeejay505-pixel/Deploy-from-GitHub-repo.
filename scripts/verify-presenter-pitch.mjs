import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {drawPresenterPitch,presenterFrame} from '../src/semantic/presenter-pitch.mjs';
import {pitchState} from '../src/semantic/investor-pitch.mjs';
const [planPath,outPath]=process.argv.slice(2),plan=JSON.parse(await fs.readFile(planPath,'utf8'));
const assets={poses:await loadImage(path.join(path.dirname(planPath),plan.assets.presenterPoses)),hero:plan.assets.hero?await loadImage(path.join(path.dirname(planPath),plan.assets.hero)):undefined};
const canvas=createCanvas(1080,1920),ctx=canvas.getContext('2d'),errors=[],textWarnings=[],collisions=[],visualChanges=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg);};
const fields=['visualMetaphor','persistentObjects','stateBefore','visibleAction','stateAfter','quantityTreatment','textRole','soundCue','transition'];
for(const b of plan.sentenceBeats){for(const field of fields)check(typeof b[field]==='string'&&b[field].length>5,`Missing ${field}: ${b.id}`);check(b.actionIds.length>0,`No visible action: ${b.id}`);check(b.end>b.start,'Invalid sentence beat');}
check(plan.assets.poses.length===6,'Presenter requires six stable poses');
const poses=new Set(plan.assets.poses.map(p=>p.id));for(const p of plan.assets.poses){const [x,y,w,h]=p.crop;check(x>=0&&y>=0&&x+w<=assets.poses.width&&y+h<=assets.poses.height,`Pose crop out of asset: ${p.id}`);check(p.anchorY===h,'Feet are not anchored');}
for(const e of plan.presenterPoseEvents)check(poses.has(e.pose)&&e.at>=0&&e.at<plan.duration,'Invalid presenter pose event');
// Changed diagram pixels exclude headlines, captions, and the presenter. A pose swap alone cannot satisfy a sentence.
function pixels(t){drawPresenterPitch(ctx,plan,t,assets);return ctx.getImageData(0,0,1080,1920).data;}
for(const b of plan.sentenceBeats){const before=pixels(b.start),after=pixels(b.end-.001);let changed=0,total=0,delta=0;for(let y=425;y<1470;y+=2)for(let x=76;x<1004;x+=2){if(x>750&&y>1200)continue;const i=(y*1080+x)*4,d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);total++;delta+=d;if(d>30)changed++;}const change=changed/total;visualChanges.push({id:b.id,changedDiagramFraction:change,meanRGBDelta:delta/(total*3)});check(change>.0002,`No meaningful diagram change: ${b.id}`);}
// Text is checked after actual Canvas transforms, including the reserved presenter area.
const original=ctx.fillText.bind(ctx);let checks=0,activeBounds;
ctx.fillText=function(str,x,y,...rest){const m=ctx.getTransform(),measure=ctx.measureText(str),align=ctx.textAlign;const offset=align==='center'?-measure.width/2:align==='right'?-measure.width:0;const ascent=measure.actualBoundingBoxAscent||24,descent=measure.actualBoundingBoxDescent||5;const left=m.a*(x+offset)+m.e,right=left+measure.width*m.a,top=m.d*(y-ascent)+m.f,bottom=m.d*(y+descent)+m.f;checks++;if(left<45||right>1035||top<55||bottom>1880)textWarnings.push({text:String(str),left,right,top,bottom});if(activeBounds&&right>activeBounds.left&&left<activeBounds.right&&bottom>activeBounds.top&&top<activeBounds.bottom)collisions.push({text:String(str),left,right,top,bottom});return original(str,x,y,...rest);};
for(let t=0;t<plan.duration;t+=.2){activeBounds={left:755,right:1045,top:1219,bottom:1640};drawPresenterPitch(ctx,plan,t,assets);const frame=presenterFrame(plan,t);check(poses.has(frame.pose)&&poses.has(frame.previous),'Unknown interpolated pose');const o=pitchState(plan,t).objects.get('presenter-main');check(o.y===1630,'Presenter feet drift');}
check(textWarnings.length===0,'Text outside phone safe margins');check(collisions.length===0,'Presenter overlaps text');
const report={automatedPass:errors.length===0,errors,textWarnings,collisions,sentenceBeats:plan.sentenceBeats.length,diagramChanges:visualChanges,textChecks:checks,presenterPoseChanges:plan.presenterPoseEvents.length,stableFeetAnchor:true,humanCreativeApproval:'pending',voiceApproval:'pending',releaseEligible:false,limits:['Pixel change verifies diagram activity, not artistic quality.','Six pose animation uses short eased dissolves; it is not phoneme lip sync.']};
await fs.writeFile(outPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(errors.length,0,errors.join('; '));
