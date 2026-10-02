// Deterministic editorial motion for the existing engine's commercial-investor review.
// All market values and speech timing are supplied by the external, reviewed plan.
export const PITCH_PALETTE={paper:'#FFFFFF',ink:'#18342D',muted:'#64716B',green:'#315D4D',sage:'#DCE8DF',glass:'#D4E4E0',line:'#C5D4CA',stone:'#F1EEE7',copper:'#A46F43',cream:'#F7F6F1'};
const P=PITCH_PALETTE;
export const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const lerp=(a,b,p)=>a+(b-a)*p;
const STEP=(t,a,b)=>smooth((t-a)/(b-a));
function text(c,s,x,y,size=28,color=P.ink,weight=400,align='left',serif=false){c.font=`${weight} ${size}px "${serif?'P052':'DejaVu Sans'}"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(s,x,y);}
function line(c,x,y,x2,y2,color=P.line,width=2){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function poly(c,pts,fill,stroke=P.line,width=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function rect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.6;c.stroke();}}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function alpha(c,a,fn){if(a<=0)return;c.save();c.globalAlpha*=clamp(a);fn();c.restore();}
function shadow(c){c.shadowColor='rgba(33,66,48,.11)';c.shadowBlur=22;c.shadowOffsetY=12;}
function lines(c,s,w,size,weight=400,serif=false){c.font=`${weight} ${size}px "${serif?'P052':'DejaVu Sans'}"`;let out=[],cur='';for(const word of s.split(' ')){let n=cur?cur+' '+word:word;if(cur&&c.measureText(n).width>w){out.push(cur);cur=word;}else cur=n;}if(cur)out.push(cur);return out;}
function arrow(c,x,y,x2,y2,p=1,color=P.green,width=3){let xx=lerp(x,x2,p),yy=lerp(y,y2,p);line(c,x,y,xx,yy,color,width);if(p>.96){const a=Math.atan2(y2-y,x2-x);poly(c,[[xx,yy],[xx-12*Math.cos(a-.5),yy-12*Math.sin(a-.5)],[xx-12*Math.cos(a+.5),yy-12*Math.sin(a+.5)]],color,null);}}
function person(c,x,y,scale=1,color=P.green){c.save();c.translate(x,y);c.scale(scale,scale);circle(c,0,-20,8,color);rect(c,-12,-5,24,27,10,color);line(c,-6,20,-8,39,color,6);line(c,6,20,8,39,color,6);c.restore();}
function tree(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);line(c,0,0,0,-62,P.copper,6);circle(c,-15,-67,23,'#A8C4A9');circle(c,17,-72,25,'#789E80');circle(c,0,-88,28,'#4B7A5D');c.restore();}
function coin(c,x,y,scale=1,color=P.copper){c.save();c.translate(x,y);c.scale(scale,scale);circle(c,0,0,18,P.paper,color);circle(c,0,0,12,null,color);line(c,-4,-5,4,-5,color,2);line(c,-4,0,4,0,color,2);line(c,-4,5,4,5,color,2);c.restore();}
function building(c,x,y,scale,build=1,occupied=.65,selected=0){
 c.save();c.translate(x,y);c.scale(scale,scale);const w=280,dep=110,H=520,base=0,top=-H*build;
 c.save();shadow(c);poly(c,[[-195,46],[180,98],[340,-10],[-32,-64]],P.stone,null);c.restore();
 // Wireframe above the physical build records where the same future asset will complete.
 if(build<.998){c.save();c.setLineDash([7,10]);poly(c,[[-140,-H],[140,-H],[140,0],[-140,0]],null,P.line,2);poly(c,[[140,-H],[250,-H-75],[250,-75],[140,0]],null,P.line,2);c.restore();}
 if(build>.01){poly(c,[[-140,top],[140,top],[140,0],[-140,0]],'#E0E8E1',P.green,2);poly(c,[[140,top],[250,top-75],[250,-75],[140,0]],'#A8C0B0',P.green,2);poly(c,[[-140,top],[-30,top-75],[250,top-75],[140,top]],'#F5F7EF',P.green,2);
  const rows=8;for(let row=0;row<rows;row++){let yy=-H+38+row*55;if(yy<top+20)continue;line(c,-140,yy+37,140,yy+37,'#B0C5B6',2);for(let col=0;col<5;col++){let lit=(row*5+col)/40<occupied;rect(c,-120+col*51,yy,31,26,1,lit?'#7DA48A':'#C9D9CD',null);line(c,-118+col*51,yy+2,-97+col*51,yy+2,'#E8F0EA',1);}for(let col=0;col<2;col++)poly(c,[[160+col*40,yy-14-col*25],[186+col*40,yy-31-col*25],[186+col*40,yy-9-col*25],[160+col*40,yy+8-col*25]],'#6F957E',null);}
  rect(c,-62,-69,124,69,3,'#5A7E6B',P.green);line(c,0,-65,0,-1,'#DCE7DC',2);
  if(selected>0)alpha(c,selected,()=>{poly(c,[[-142,-294],[142,-294],[252,-369],[252,-316],[142,-242],[-142,-242]],'#B48B5D',P.copper,3);for(let j=0;j<5;j++)rect(c,-119+j*51,-278,31,25,1,'#F8ECDB');});
 }
 tree(c,-178,31,.7);tree(c,300,-3,.55);for(let i=0;i<3;i++)rect(c,-113+i*82,25,50,8,2,'#E7DFCC');
 c.restore();
}
function desk(c,x,y){rect(c,x-27,y-18,54,36,4,'#F2EEE5',P.copper);rect(c,x-13,y-11,26,16,2,'#739086');line(c,x-5,y+8,x+5,y+8,P.green,2);rect(c,x-13,y+26,26,15,6,'#B8CBBB',P.green);}
export function tenantRoute(index){const x=-319+index%4*110,y=index<4?-104:79;return index<4?[[-218,188],[-218,115],[-172,115],[-172,-88],[x,y]]:[[-218,188],[-218,115],[x,115],[x,y]];}
export function sampleTenantRoute(index,progress){const points=tenantRoute(index),lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let d=clamp(progress)*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const p=clamp(d/lengths[i]);return {x:lerp(points[i][0],points[i+1][0],p),y:lerp(points[i][1],points[i+1][1],p),settled:progress>=1};}d-=lengths[i];}}
function floor(c,x,y,scale,open,occupied=0){
 c.save();c.translate(x,y);c.scale(scale,scale);const cornersA=[[-200,-70],[200,-70],[200,-20],[-200,-20]],cornersB=[[-400,-245],[400,-245],[400,230],[-400,230]],pts=cornersA.map((p,i)=>p.map((v,j)=>lerp(v,cornersB[i][j],open)));
 c.save();shadow(c);poly(c,pts,'#F4F6F1',P.green,3);c.restore();
 alpha(c,STEP(open,.65,1),()=>{
  // Walls, corridor, desks and occupants all use one plan coordinate system.
  rect(c,-398,140,796,88,0,'#E8EEE6');line(c,-397,138,-245,138,P.green,5);line(c,-191,138,126,138,P.green,5);line(c,181,138,398,138,P.green,5);
  line(c,100,-243,100,139,P.green,5);line(c,-398,-68,-194,-68,P.green,5);line(c,-148,-68,99,-68,P.green,5);line(c,-194,-68,-194,-98,P.copper,3);rect(c,116,-226,264,210,4,'#EBF0E8');
  rect(c,155,-169,190,64,22,'#D9D1BF',P.copper);for(let i=0;i<4;i++){rect(c,170+i*42,-192,26,15,5,P.sage,P.green);rect(c,170+i*42,-94,26,15,5,P.sage,P.green);}
  text(c,'MEETING',250,-40,19,P.muted,500,'center');
  for(let i=0;i<8;i++){const xx=-319+i%4*110,yy=i<4?-146:37;desk(c,xx,yy);const progress=clamp(occupied*8-i);if(progress>0){const pos=sampleTenantRoute(i,progress);alpha(c,clamp(progress*8),()=>person(c,pos.x,pos.y,.45));}}
  rect(c,132,32,240,62,8,'#D9E5DB',P.green);text(c,'RECEPTION',250,72,18,P.green,500,'center');text(c,'ACCESS',0,195,20,P.muted,500,'center');
  tree(c,363,119,.25);tree(c,-353,113,.25);
  // A clear doorway remains between the access corridor and each occupied room.
  line(c,-245,138,-245,98,P.copper,3);line(c,126,138,126,98,P.copper,3);
 });c.restore();
}
function crane(c,x,y,t,build){c.save();c.translate(x,y);line(c,0,0,0,-590,P.copper,7);for(let i=0;i<9;i++){line(c,-16,-i*64,16,-(i+1)*64,P.copper,2);line(c,16,-i*64,-16,-(i+1)*64,P.copper,2);}line(c,-70,-575,280,-575,P.copper,7);line(c,0,-640,-60,-575,P.copper,2);line(c,0,-640,260,-575,P.copper,2);const hook=145+Math.sin(t*1.5)*50;line(c,190,-571,190,-571+hook,P.copper,2);poly(c,[[150,-556+hook],[213,-556+hook],[232,-540+hook],[169,-540+hook]],'#CFDBCF',P.green,2);rect(c,-34,-548,67,45,2,P.stone,P.copper);c.restore();}
function lease(c,x,y,scale,reveal){c.save();c.translate(x,y);c.scale(scale,scale);alpha(c,reveal,()=>{c.save();shadow(c);poly(c,[[-140,-170],[110,-170],[140,-140],[140,190],[-140,190]],P.paper,P.line,2);c.restore();poly(c,[[110,-170],[110,-140],[140,-140]],P.stone,P.line);text(c,'LEASE',-108,-108,33,P.green,700);for(let i=0;i<5;i++)line(c,-107,-66+i*35,106,-66+i*35,P.line,3);c.beginPath();c.moveTo(-80,139);c.bezierCurveTo(-50,90,-35,181,20,120);c.bezierCurveTo(32,170,74,142,104,132);c.strokeStyle=P.copper;c.lineWidth=3;c.stroke();});c.restore();}
// Reuse exact office/floor geometry in the presenter composition without duplicating financial state.
export const pitchPrimitives={building,floor,lease,coin,person,tree,crane};
export function wordTime(s,word,fallback=.4){const w=s.wordTimestamps.find(x=>x.word.toLowerCase()===word.toLowerCase());return w?.start??lerp(s.speechStart,s.speechEnd,fallback);}
function wordEnd(s,word){return s.wordTimestamps.find(x=>x.word.toLowerCase()===word.toLowerCase())?.end??s.speechEnd;}
export function createPitchStoryboard(plan){
 const s=Object.fromEntries(plan.sentences.map(x=>[x.id,x]));const actions=[];const add=(id,target,property,start,end,from,to)=>actions.push({id,target,property,start,end,from,to,easing:'smooth'});
 const move=(id,x,y,scale)=>{
  const start=s[id].start;for(const [prop,val] of Object.entries({x,y,scale})){let previous=plan.initialObjects['asset-main'][prop];const before=actions.filter(a=>a.target==='asset-main'&&a.property===prop);if(before.length)previous=before.at(-1).to;add(`asset-${id}-${prop}`,'asset-main',prop,start,start+.8,previous,val);}
 };
 plan.initialObjects={'asset-market':{x:660,y:1260,scale:1,build:1,opacity:1},'asset-main':{x:570,y:1310,scale:.86,build:.12,opacity:0},'floor-main':{x:540,y:960,scale:1,opacity:0,open:0,occupied:0},'lease-main':{x:660,y:965,scale:1,opacity:0}};
 plan.initialMetrics={contractIndex:plan.metricDefinitions.contractIndex.baseline,purchase:plan.metricDefinitions.purchase,fitout:0,netIncome:0};
 add('market-demand','asset-market','opacity',s.evidence.start,s.evidence.start+.7,1,0);
 add('contract-growth','contractIndex','value',wordTime(s.evidence,'rose'),wordTime(s.evidence,'percent')+.35,plan.metricDefinitions.contractIndex.baseline,plan.metricDefinitions.contractIndex.target);
 add('planned-reveal','asset-main','opacity',s.constraint.start,s.constraint.start+.6,0,1);
 add('first-construction','asset-main','build',s.constraint.start+1,s.constraint.end-.8,.12,.56);
 add('finish-construction','asset-main','build',wordTime(s.entry,'construction'),wordTime(s.entry,'completed')+.5,.56,1);
 move('quality',260,875,.43);move('lease',245,1350,.73);move('costs',200,1365,.62);move('capital',815,1020,.40);move('yield',815,1020,.40);move('risk',430,1320,.85);move('close',440,1270,.92);
 add('floor-reveal','floor-main','opacity',s.quality.start+.2,s.quality.start+.8,0,1);
 add('floor-unfold','floor-main','open',wordTime(s.quality,'asset'),wordTime(s.quality,'use'),0,1);
 add('occupiers-in','floor-main','occupied',wordTime(s.quality,'businesses'),s.quality.end-.7,0,1);
 add('floor-collapse','floor-main','opacity',s.lease.start,s.lease.start+.65,1,0);
 add('lease-in','lease-main','opacity',wordTime(s.lease,'lease'),wordTime(s.lease,'income'),0,1);
 add('fitout-added','fitout','value',wordTime(s.capital,'three'),wordEnd(s.capital,'thousand'),0,plan.metricDefinitions.fitout);
 add('required-income','netIncome','value',wordTime(s.yield,'hundred'),wordEnd(s.yield,'thousand'),0,(plan.metricDefinitions.purchase+plan.metricDefinitions.fitout)*plan.metricDefinitions.assumedNetYield/100);
 plan.actions=actions;
 // Readable captions follow measured synthesizer word boundaries, never estimated word count durations.
 plan.captions=[];for(const sen of plan.sentences){const words=sen.wordTimestamps;for(let i=0;i<words.length;i+=5){const group=words.slice(i,i+5);plan.captions.push({start:group[0].start,end:Math.min(sen.speechEnd,words[i+5]?.start??group.at(-1).end+.1),text:group.map(w=>w.word).join(' ')});}}
 const cue=(id,at,type,target,pan=0)=>({id,at,type,target,pan});
 plan.soundEvents=[cue('opening-breath',.6,'sweep','asset-market',.25),cue('demand-arrival',wordTime(s.business,'teams'),'steps','tenant-0',-.35),cue('evidence-grow',wordTime(s.evidence,'rose'),'riser','chart-contracts',0),cue('evidence-lock',wordTime(s.evidence,'percent')+.35,'lock','chart-contracts',0),cue('construction-start',s.constraint.start+.9,'build','crane-main',.25),cue('capital-entry',wordTime(s.entry,'capital'),'coins','capital-main',-.2),cue('handover',wordTime(s.entry,'completed')+.5,'settle','asset-main',.2),cue('plan-open',wordTime(s.quality,'asset'),'unfold','floor-main',0),cue('tenant-entry',wordTime(s.quality,'businesses'),'steps','tenant-1',.15),cue('lease-paper',wordTime(s.lease,'lease'),'paper','lease-main',.35),cue('cost-separate',wordTime(s.costs,'fit'),'sweep','capital-main',-.25),cue('fitout-lock',wordTime(s.capital,'three'),'lock','capital-main',.2),cue('income-resolve',wordTime(s.yield,'income'),'resolve','capital-main',0),cue('risk-pause',s.risk.start+.5,'soft','asset-main',-.25),cue('close-resolve',s.close.start+1,'resolve','asset-main',0)];
 return plan;
}
export function pitchState(plan,time){
 const objects=new Map(Object.entries(plan.initialObjects).map(([id,v])=>[id,{...v}]));const metrics={...plan.initialMetrics};
 for(const a of plan.actions){if(time<a.start)continue;const p=smooth((time-a.start)/(a.end-a.start)),value=lerp(a.from,a.to,p);if(objects.has(a.target))objects.get(a.target)[a.property]=value;else metrics[a.target]=value;}
 metrics.invested=metrics.purchase+metrics.fitout;metrics.netYield=metrics.invested?metrics.netIncome/metrics.invested*100:0;metrics.contractGrowth=metrics.contractIndex-100;
 return {objects,metrics,scene:plan.sentences.find(s=>time>=s.start&&time<s.end)||plan.sentences.at(-1)};
}
const money=n=>Math.round(n).toLocaleString('en-US');
export function drawInvestorPitch(c,plan,t,{width=1080,height=1920,onText}={}){
 const state=pitchState(plan,t),s=state.scene,M=state.metrics,q=clamp((t-s.start)/(s.end-s.start)),id=s.id;
 c.save();c.scale(width/1080,height/1920);c.fillStyle=P.paper;c.fillRect(0,0,1080,1920);c.lineCap='round';c.lineJoin='round';
 text(c,'YEEJAY',76,112,23,P.green,700);text(c,'COMMERCIAL OFF-PLAN',1002,112,17,P.muted,500,'right');line(c,76,151,1002,151,P.line,1);
 const headings={opening:['Business grows.','Space takes time.'],business:['Business activity','becomes space demand.'],evidence:['The demand','has momentum.'],constraint:['New space takes','time to arrive.'],entry:['Enter during','the build.'],quality:['Own space','businesses can use.'],lease:['The lease turns','space into income.'],costs:['Headline yield','is only the start.'],capital:['Fit-out belongs','in the calculation.'],yield:['The net numbers','have to work.'],risk:['Delivery and leasing','still matter.'],close:['Early entry.','Sound economics.']};
 const titleAlpha=STEP(t,s.start,s.start+.25);alpha(c,titleAlpha,()=>headings[id].forEach((v,i)=>{let size=76;c.font=`400 ${size}px "P052"`;while(c.measureText(v).width>930&&size>58){size-=2;c.font=`400 ${size}px "P052"`;}onText?.({text:v,x:76,y:272+i*88,width:c.measureText(v).width,size,kind:'headline'});text(c,v,76,272+i*88+12*(1-titleAlpha),size,i?P.green:P.ink,400,'left',true);}));
 // Open composition: no dashboard panels. A restrained ground plane anchors the architecture.
 const grad=c.createRadialGradient(555,1075,50,555,1075,620);grad.addColorStop(0,'#F2F5EC');grad.addColorStop(1,'#FFFFFF');c.fillStyle=grad;c.fillRect(40,475,1000,1030);
 if(id==='opening'){
  const grow=STEP(t,s.start+1,s.end-1);const market=state.objects.get('asset-market');building(c,market.x,market.y,market.scale,1,.72,0);
  text(c,'SUITABLE SPACE',635,1430,23,P.green,500,'center');
  for(let i=0;i<8;i++){let p=STEP(t,s.start+.8+i*.35,s.start+1.5+i*.35);alpha(c,p,()=>person(c,130+i%2*62,920+Math.floor(i/2)*115,.88,i<4?P.green:P.copper));}
  text(c,'BUSINESS DEMAND',100,735,24,P.green,500);arrow(c,185,790,185,840,grow,P.copper);
  arrow(c,290,1110,455,1110,STEP(t,s.start+2,s.start+3),P.copper,4);line(c,355,1068,355,1152,P.green,6);line(c,393,1081,393,1139,P.green,6);
  text(c,'Limited suitable space',420,1508,25,P.muted,400,'center');
 }else if(id==='business'){
  const base=STEP(t,s.start+.1,s.start+.9);alpha(c,base,()=>{
   for(let i=0;i<3;i++)building(c,230+i*290,775,.28,1,.65,0);
   text(c,'NEW FIRMS',540,840,21,P.muted,500,'center');});
  arrow(c,540,880,540,960,STEP(t,s.start+1.5,s.start+2.2));
  for(let i=0;i<8;i++)alpha(c,STEP(t,wordTime(s,'teams')+i*.07,wordTime(s,'teams')+.35+i*.07),()=>person(c,220+i*90,1040,.9));
  text(c,'GROWING TEAMS',540,1130,21,P.green,500,'center');
  arrow(c,540,1170,540,1230,STEP(t,s.start+3.2,s.start+3.8));
  alpha(c,STEP(t,s.start+3.7,s.start+4.4),()=>{floor(c,540,1390,.69,1,STEP(t,s.start+4,s.end-.5));});
 }else if(id==='evidence'){
  const pct=M.contractGrowth.toFixed(1);text(c,`+${pct}%`,80,610,127,P.copper,700);text(c,'OFFICE RENTAL CONTRACT',84,662,23,P.ink,500);text(c,'REGISTRATIONS',84,701,23,P.ink,500);
  const y=1320,x1=275,x2=725,max=140,scale=520/max;for(let tick=0;tick<=140;tick+=20){const yy=y-tick*scale;line(c,160,yy,915,yy,P.line,1);text(c,String(tick),125,yy+7,18,P.muted,400,'right');}
  rect(c,x1-95,y-100*scale,190,100*scale,3,'#C8D9CE');rect(c,x2-95,y-M.contractIndex*scale,190,M.contractIndex*scale,3,P.green);
  text(c,'100',x1,y-100*scale-24,32,P.ink,500,'center');text(c,M.contractIndex.toFixed(1),x2,y-M.contractIndex*scale-24,32,P.green,700,'center');
  text(c,'Q2 2025',x1,1370,25,P.muted,500,'center');text(c,'Q2 2026',x2,1370,25,P.green,500,'center');text(c,'INDEXED TO Q2 2025 = 100',540,1450,20,P.muted,400,'center');
 }else if(id==='constraint'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,a.build,.15,0);crane(c,244,1320,t,a.build);
  for(let i=0;i<7;i++){let p=STEP(t,s.start+1+i*.3,s.start+1.8+i*.3);alpha(c,p,()=>person(c,105+i*60,1460,.65,P.copper));}
  text(c,'DEMAND ARRIVES',120,1550,23,P.copper,500);text(c,'SPACE TAKES TIME',965,1370,23,P.green,500,'right');
 }else if(id==='entry'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,a.build,.35,0);
  const x=[180,540,900],y=1440;line(c,x[0],y,x[2],y,P.line,3);const phase=STEP(t,s.start+.6,s.end-.8);arrow(c,x[0],y,x[0]+(x[2]-x[0])*phase,y,1,P.copper,4);
  for(let i=0;i<3;i++){circle(c,x[i],y,10,P.paper,P.green);text(c,['CAPITAL','CONSTRUCTION','HANDOVER'][i],x[i],1495,18,P.green,500,'center');}
  for(let i=0;i<4;i++){const p=clamp((phase*1.5-i*.15));if(p>0&&p<1)coin(c,lerp(180,900,p),1378,1);}
  text(c,a.build>.999?'Rent requires completion and a lease':'Capital committed before rental income',540,1580,25,P.muted,400,'center');
 }else if(id==='quality'){
  const a=state.objects.get('asset-main'),f=state.objects.get('floor-main');alpha(c,1-STEP(t,s.start+1,s.start+2.5)*.35,()=>building(c,a.x,a.y,a.scale,a.build,.8,.8*(1-f.open)));
  alpha(c,f.opacity,()=>floor(c,lerp(a.x,540,f.open),lerp(a.y-270*a.scale,1090,f.open),lerp(a.scale,.99,f.open),f.open,f.occupied));
  alpha(c,STEP(t,s.start+2,s.start+3),()=>{line(c,720,745,790,842,P.copper,2);text(c,'GRADE A',650,678,28,P.green,700);text(c,'Modern specifications',650,718,21,P.muted);});
  alpha(c,STEP(t,s.start+4,s.start+4.7),()=>{text(c,'WORKSPACE',350,1490,25,P.green,500,'center');text(c,'ACCESS',765,1490,25,P.green,500,'center');});
 }else if(id==='lease'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,1,.88,0);lease(c,710,820,.8,state.objects.get('lease-main').opacity);
  const p=STEP(t,wordTime(s,'income'),s.end-.4);line(c,505,1290,955,1290,P.line,3);for(let i=0;i<6;i++){const u=(p*2+i/6)%1;if(p>.03)coin(c,lerp(505,955,u),1290,.86);}
  for(let i=0;i<4;i++){const xx=495+i*117;rect(c,xx,1010,85,60,3,i<p*4?P.sage:P.cream,P.line);line(c,xx+13,1031,xx+72,1031,P.green,2);}
  text(c,'LEASE PERIODS',722,1115,22,P.muted,500,'center');text(c,'CONTRACTED INCOME',750,1370,24,P.green,500,'center');
  alpha(c,STEP(t,wordTime(s,'resale'),s.end-.2),()=>{c.setLineDash([7,9]);arrow(c,850,1420,960,1480,1,P.copper,2);c.setLineDash([]);text(c,'Potential resale',955,1550,23,P.copper,400,'right');});
 }else if(id==='costs'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,1,.8,0);
  text(c,'RENT RECEIVED',615,600,28,P.green,500,'center');arrow(c,615,635,615,765,STEP(t,s.start+.3,s.start+1.3),P.green,4);
  const labels=['Fit-out','Service charges','Vacancy','Financing','Tax'];for(let i=0;i<5;i++){const reveal=STEP(t,s.start+1.6+i*.55,s.start+2.1+i*.55);alpha(c,reveal,()=>{const yy=835+i*115;line(c,615,yy,865,yy,P.copper,2);coin(c,857,yy,.7,P.copper);text(c,labels[i],950,yy+42,21,P.copper,400,'right');});}
  arrow(c,615,790,615,1455,STEP(t,s.start+1,s.end-.4),P.green,5);for(let i=0;i<5;i++)coin(c,615,820+((t*82+i*127)%590),.75,P.green);
  text(c,'NET INCOME',590,1540,31,P.green,700);text(c,'Costs change what remains',590,1580,21,P.muted);
 }else if(id==='capital'||id==='yield'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,1,.8,0);
  if(id==='capital'){
   text(c,'AED',84,630,26,P.muted,500);text(c,money(M.invested),84,730,100,P.green,700);text(c,'SIMPLIFIED INVESTED CAPITAL',84,795,23,P.muted,500);
   const totalMax=plan.metricDefinitions.purchase+plan.metricDefinitions.fitout,w=870,y=1150,purchaseW=w*M.purchase/totalMax,fitoutW=w*M.fitout/totalMax;
   rect(c,105,y,purchaseW,110,0,P.green);if(fitoutW>0)rect(c,105+purchaseW,y,fitoutW,110,0,P.copper);
   text(c,'Purchase',105,1330,27,P.green,500);text(c,'AED '+money(M.purchase),105,1375,30,P.green,700);
   text(c,'Fit-out',975,1330,27,P.copper,500,'right');text(c,'AED '+money(M.fitout),975,1375,30,P.copper,700,'right');
   text(c,'Same asset. More capital committed.',105,1500,26,P.muted);
  }else{
   text(c,`${plan.metricDefinitions.assumedNetYield}% ILLUSTRATIVE TARGET`,84,602,24,P.copper,500);
   text(c,'AED '+money(M.netIncome),84,750,72,P.green,700);text(c,'REQUIRED ANNUAL NET INCOME',84,812,23,P.muted,500);
   line(c,84,865,650,865,P.line,2);text(c,'AED '+money(M.invested),84,990,67,P.ink,500);text(c,'SIMPLIFIED INVESTED CAPITAL',84,1040,22,P.muted,500);
   text(c,'=',140,1280,68,P.muted,400);text(c,M.netYield.toFixed(1)+'%',245,1300,115,P.green,700);text(c,'NET YIELD',255,1370,23,P.green,500);
   const r=125,cx=815,cy=1310;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle=P.line;c.lineWidth=13;c.stroke();c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*M.netYield/100);c.strokeStyle=P.copper;c.lineWidth=13;c.stroke();
   text(c,'Income ÷ capital',105,1510,28,P.muted);
  }
 }else if(id==='risk'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,a.build,.8,0);
  c.setLineDash([6,10]);line(c,660,758,960,758,P.copper,3);c.setLineDash([]);circle(c,825,758,30,P.paper,P.copper);line(c,825,741,825,759,P.copper,3);line(c,825,759,835,767,P.copper,3);
  text(c,'DELIVERY TIMING',963,836,22,P.copper,500,'right');
  person(c,810,1180,1.3,P.copper);arrow(c,753,1210,600,1210,STEP(t,s.start+2,s.start+3),P.copper,3);text(c,'TENANT & LEASE',945,1305,24,P.copper,500,'right');
  text(c,'Completion enables leasing.',95,1480,29,P.green);text(c,'A tenant enables rent.',95,1530,29,P.green);
 }else if(id==='close'){
  const a=state.objects.get('asset-main');building(c,a.x,a.y,a.scale,1,.9,.9);lease(c,875,1185,.47,STEP(t,s.start+.8,s.start+1.4));
  for(let i=0;i<6;i++)person(c,160+i*75,1430,.62,P.green);
  alpha(c,STEP(t,s.start+1.8,s.start+2.4),()=>{arrow(c,660,1335,905,1335,1,P.green,3);for(let i=0;i<3;i++)coin(c,lerp(675,905,(t*.25+i/3)%1),1335,.65,P.green);});
  text(c,'BUSINESS DEMAND',100,1530,24,P.green,500);text(c,'USABLE SPACE',1002,1530,24,P.green,500,'right');text(c,'The net economics must work.',540,1590,28,P.ink,500,'center');
 }
 // Phrase captions stay below the illustration and above the footnote, within phone-safe margins.
 const caption=plan.captions.find(x=>t>=x.start&&t<x.end);if(caption){let ls=lines(c,caption.text,900,35,500);ls.forEach((v,i)=>{text(c,v,540,1660+i*43,35,P.ink,500,'center');onText?.({text:v,x:540,y:1660+i*43,width:c.measureText(v).width,size:35,kind:'caption',centered:true});});}
 line(c,76,1770,1002,1770,P.line,1);
 const foot=id==='evidence'?'JLL, Q2 2026 • Registrations, not rent growth':id==='capital'||id==='yield'?'ILLUSTRATIVE • Excludes fees, VAT funding and debt':id==='costs'?'Conceptual cash flow • No cost proportions implied':'Based on supplied slides 4–14 • Conceptual graphics';
 text(c,foot,76,1810,19,P.muted,400);text(c,'GUIDE VOICE / REVIEW COPY',76,1854,15,P.muted,500);
 c.restore();return state;
}
