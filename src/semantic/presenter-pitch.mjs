// Presenter-led review composition. All numbers and event timing come from the local JSON plan.
import {pitchState,pitchPrimitives,clamp} from './investor-pitch.mjs';
import {drawUploadedScriptScene} from './uploaded-script-scenes.mjs';
const G=pitchPrimitives;
const C={white:'#FFFFFF',ink:'#173A32',green:'#286650',mint:'#DCEDE2',teal:'#319A9D',pale:'#EDF6F4',copper:'#B37B45',sand:'#F2E8D6',line:'#CDDCD4',muted:'#687C72',red:'#AA6557'};
const mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>{p=clamp(p);return p*p*(3-2*p);};
function a(c,p,fn){if(p<=0)return;c.save();c.globalAlpha*=clamp(p);fn();c.restore();}
function box(c,x,y,w,h,r,fill,stroke,width=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function circle(c,x,y,r,fill,stroke,w=2){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,x,y,xx,yy,color=C.line,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function arrow(c,x,y,xx,yy,p=1,color=C.green,width=4){p=clamp(p);const xe=mix(x,xx,p),ye=mix(y,yy,p);line(c,x,y,xe,ye,color,width);if(p>.03){const ang=Math.atan2(yy-y,xx-x);line(c,xe,ye,xe-13*Math.cos(ang-.6),ye-13*Math.sin(ang-.6),color,width);line(c,xe,ye,xe-13*Math.cos(ang+.6),ye-13*Math.sin(ang+.6),color,width);}}
function tx(c,str,x,y,size=28,color=C.ink,weight=500,align='left'){c.font=`${weight} ${size}px "DejaVu Sans"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(String(str),x,y);}
const cash=n=>Math.round(n).toLocaleString('en-US');
function badge(c,label,x,y,w,color=C.green){box(c,x,y,w,40,20,color===C.copper?C.sand:C.mint);tx(c,label,x+w/2,y+27,19,color,700,'center');}
function check(c,x,y,p=1,color=C.green){line(c,x-10,y,x-2,y+8*p,color,3);line(c,x-2,y+8*p,x+14*p,y-12*p,color,3);}
function doc(c,x,y,scale=1,reveal=1){a(c,reveal,()=>{c.save();c.translate(x,y);c.scale(scale,scale);box(c,-40,-54,80,106,6,C.white,C.line,2);box(c,-27,-39,24,9,2,C.mint);for(let i=0;i<4;i++)line(c,-27,-16+i*15,26,-16+i*15,C.line,3);check(c,15,29,1,C.teal);c.restore();});}
function briefcase(c,x,y,scale=1,color=C.green){c.save();c.translate(x,y);c.scale(scale,scale);box(c,-19,-43,38,16,5,null,color,4);box(c,-43,-28,86,61,10,C.mint,color,3);line(c,-42,-4,43,-4,color,3);box(c,-7,-9,14,15,3,C.white,color,2);c.restore();}
function office(c,x,y,scale=1,lit=1){c.save();c.translate(x,y);c.scale(scale,scale);box(c,-60,-82,120,122,6,C.pale,C.green,3);for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(c,-42+col*30,-63+row*27,20,17,2,row*3+col<lit*9?C.teal:C.mint);box(c,-16,6,32,34,3,C.green);line(c,-75,44,74,44,C.line,3);c.restore();}
function shop(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);box(c,-58,-43,116,89,5,C.pale,C.green,3);box(c,-65,-56,130,27,4,C.sand,C.copper);for(let i=0;i<5;i++)box(c,-64+i*26,-55,13,27,2,C.copper);box(c,-44,-15,52,42,3,C.mint,C.green);box(c,21,-14,24,59,2,C.white,C.green);c.restore();}
function clock(c,x,y,r,p){circle(c,x,y,r,C.white,C.copper,4);for(let i=0;i<12;i++){const ang=i*Math.PI/6;line(c,x+Math.sin(ang)*(r-9),y-Math.cos(ang)*(r-9),x+Math.sin(ang)*(r-4),y-Math.cos(ang)*(r-4),C.line,2);}const ang=p*1.7*Math.PI;line(c,x,y,x+Math.sin(ang)*r*.7,y-Math.cos(ang)*r*.7,C.copper,4);line(c,x,y,x+r*.35,y+r*.1,C.ink,4);circle(c,x,y,5,C.ink);}
function icon(c,type,x,y,scale=1,color=C.green){c.save();c.translate(x,y);c.scale(scale,scale);if(type==='access'){circle(c,0,-8,16,null,color,3);line(c,-12,5,0,24,color,3);line(c,12,5,0,24,color,3);circle(c,0,-8,5,color);}else if(type==='services'){box(c,-24,-24,48,48,8,null,color,3);line(c,-13,-9,13,-9,color,3);line(c,-13,2,13,2,color,3);line(c,-13,13,13,13,color,3);}else if(type==='fitout'){line(c,-18,-18,18,18,color,7);line(c,-21,15,14,-20,color,6);circle(c,14,-20,10,null,color,4);}else if(type==='vacancy'){box(c,-22,-28,44,56,3,null,color,3);circle(c,9,0,3,color);}else if(type==='financing'){for(let i=0;i<3;i++)box(c,-24+i*17,14-i*13,12,14+i*13,2,color);}else if(type==='tax'){tx(c,'%',0,16,42,color,700,'center');}else if(type==='service'){circle(c,0,0,21,null,color,4);line(c,-12,0,12,0,color,4);line(c,0,-12,0,12,color,4);}c.restore();}
function ribbon(c,label,x,y,w,p,color=C.green){a(c,p,()=>{box(c,x,y,w,60,8,color===C.green?C.mint:C.sand);tx(c,label,x+20,y+39,24,color,700);});}
export function presenterFrame(plan,t){const events=plan.presenterPoseEvents;let index=0;for(let i=0;i<events.length;i++)if(t>=events[i].at)index=i;const event=events[index],prev=events[Math.max(0,index-1)];return {pose:event.pose,previous:prev.pose,blend:ease((t-event.at)/.16)};}
function presenter(c,plan,t,assets){const o=pitchState(plan,t).objects.get('presenter-main'),f=presenterFrame(plan,t);const speaking=plan.sentences.some(s=>t>=s.speechStart&&t<s.speechEnd);const nod=speaking?Math.sin(t*3.3)*.7:0;const h=o.height+nod;const foot=o.y; // feet remain planted; the tiny nod does not move the floor contact.
 c.save();c.fillStyle='rgba(23,58,50,.08)';c.beginPath();c.ellipse(o.x,foot+3,76,12,0,0,Math.PI*2);c.fill();c.restore();
 const draw=(id,p)=>{const pose=plan.assets.poses.find(x=>x.id===id),[sx,sy,w,sh]=pose.crop,scale=h/sh;a(c,p,()=>c.drawImage(assets.poses,sx,sy,w,sh,o.x-pose.anchorX*scale,foot-h,w*scale,h));};
 if(f.pose===f.previous)draw(f.pose,1);else{draw(f.previous,1-f.blend);draw(f.pose,f.blend);}return {left:o.x-140,right:o.x+145,top:foot-h,bottom:foot};
}
function caption(c,plan,t){const cap=plan.captions.find(x=>t>=x.start&&t<x.end);if(!cap)return;const words=cap.text.split(' '),lines=[];let cur='';c.font='500 36px "DejaVu Sans"';for(const w of words){let n=cur?cur+' '+w:w;if(cur&&c.measureText(n).width>900){lines.push(cur);cur=w;}else cur=n;}if(cur)lines.push(cur);lines.forEach((s,i)=>tx(c,s,540,1700+i*44,36,C.ink,500,'center'));}
export function drawPresenterPitch(c,plan,t,assets,{width=1080,height=1920}={}){
 const state=pitchState(plan,t),s=state.scene,id=s.id,M=state.metrics,O=state.objects;const p=key=>O.get(key)?.progress??0;const intro=ease((t-s.start)/.45);
 c.save();c.scale(width/1080,height/1920);c.fillStyle=C.white;c.fillRect(0,0,1080,1920);c.lineCap='round';c.lineJoin='round';
 // Soft edge texture and a consistent three-part chapter rail make the argument navigable.
 const bg=c.createRadialGradient(480,920,40,480,920,740);bg.addColorStop(0,'#F4F8F3');bg.addColorStop(1,C.white);c.fillStyle=bg;c.fillRect(0,430,1080,1220);
 tx(c,'YEEJAY',76,104,25,C.green,700);tx(c,'THE INVESTOR CASE',1002,104,19,C.muted,500,'right');
 const phase=plan.narrativePhases?.find(x=>t>=x.start&&t<x.end)?.index??(t<31.77?0:t<53.83?1:2);
 for(let i=0;i<3;i++){line(c,76+i*313,149,349+i*313,149,i<=phase?C.green:C.line,5);tx(c,['01  PROBLEM','02  MECHANISM','03  CONSEQUENCE'][i],76+i*313,188,17,i===phase?C.green:C.muted,i===phase?700:500);}
 const heads={opening:['Business grows.','Space takes time.'],business:['Growth needs','somewhere to work.'],evidence:['Demand has','measurable momentum.'],constraint:['Demand moves fast.','Supply takes years.'],entry:['Position during','the build.'],quality:['Make the space','work for businesses.'],lease:['From workspace','to contracted income.'],costs:['What comes in','isn’t what remains.'],capital:['Count all the','capital you commit.'],yield:['Make the net','numbers work.'],risk:['Three gates','before the return.'],close:['The opportunity','is the mechanism.']};
 a(c,intro,()=>(plan.sceneHeadings?.[id]??heads[id]).forEach((h,i)=>{let size=70;c.font=`700 ${size}px "DejaVu Sans"`;while(c.measureText(h).width>932&&size>42){size-=2;c.font=`700 ${size}px "DejaVu Sans"`;}tx(c,h,76,295+i*83+8*(1-intro),size,i?C.green:C.ink,700);}));
 // Asset geometry and occupants reuse the same persistent identities throughout the film.
 c.save();c.translate(0,-120);
 const custom=plan.variant==='uploaded-script-v4'&&drawUploadedScriptScene(c,plan,t,state,{C,G,mix,ease,a,box,circle,line,arrow,tx,badge,check,doc,briefcase,office,shop,icon,ribbon},assets);
 if(custom){}else if(id==='opening'){
  const demand=p('demand-growth');G.building(c,735,1160,.73,1,.63,0);badge(c,'SUITABLE SPACE',610,1230,277);tx(c,'BUSINESS DEMAND',105,635,25,C.green,700);
  briefcase(c,165,790,.85);arrow(c,220,790,460,790,demand,C.teal,5);
  // Growing queue, then bottleneck: no numerical market claim is encoded by these tokens.
  for(let i=0;i<8;i++){let q=clamp(demand*9-i);const x=mix(65,380-(i%4)*65,ease(q)),y=980+Math.floor(i/4)*100;a(c,q,()=>G.person(c,x,y,.87,i<4?C.green:C.copper));}
  arrow(c,435,1015,560,1015,demand,C.copper,5);line(c,505,967,505,1065,C.copper,5);line(c,540,983,540,1049,C.copper,5);
  ribbon(c,'Demand can outrun delivery.',76,1430,615,demand);
 }else if(id==='business'){
  const firm=p('firm-expansion'),team=p('team-growth'),space=p('space-needed');
  for(let i=0;i<3;i++)a(c,clamp(firm*3-i),()=>{office(c,195+i*325,650,.6);badge(c,'BUSINESS',118+i*325,701,155);});
  arrow(c,520,771,520,850,team,C.teal,5);for(let i=0;i<10;i++)a(c,clamp(team*11-i),()=>G.person(c,190+i*74,928,.8,i%3?C.green:C.teal));
  tx(c,'GROWING TEAMS',520,1010,26,C.green,700,'center');arrow(c,520,1050,520,1125,space,C.green,5);
  a(c,space,()=>{office(c,260,1240,.75);shop(c,600,1240,.8);line(c,310,1205,547,1205,C.line,3);tx(c,'OFFICES',260,1360,25,C.green,700,'center');tx(c,'SHOPS',600,1360,25,C.green,700,'center');});ribbon(c,'Space is an operating necessity.',76,1450,622,space);
 }else if(id==='evidence'){
  const docs=p('contract-documents');for(let i=0;i<3;i++){a(c,clamp(docs*4-i),()=>doc(c,130+i*58,589-i*10,.66));}
  tx(c,'OFFICE RENTAL CONTRACT REGISTRATIONS',320,583,24,C.green,700);tx(c,'Not a rent-growth figure',320,627,23,C.muted);
  const x1=290,x2=740,base=1195,sc=3.23,max=140;
  for(let tick=0;tick<=max;tick+=20){const y=base-tick*sc;line(c,155,y,948,y,C.line,1);tx(c,tick,130,y+8,20,C.muted,500,'right');}
  box(c,x1-88,base-100*sc,176,100*sc,5,'#C3DACD');box(c,x2-88,base-M.contractIndex*sc,176,M.contractIndex*sc,5,C.green);
  tx(c,'100',x1,base-100*sc-22,37,C.muted,700,'center');tx(c,M.contractIndex.toFixed(1),x2,base-M.contractIndex*sc-22,40,C.green,700,'center');
  tx(c,'Q2 2025',x1,1244,25,C.muted,700,'center');tx(c,'Q2 2026',x2,1244,25,C.green,700,'center');
  a(c,p('period-marker'),()=>{line(c,202,1280,828,1280,C.copper,3);tx(c,'SAME QUARTER · YEAR ON YEAR',520,1320,20,C.copper,700,'center');});
  tx(c,'+'+M.contractGrowth.toFixed(1)+'%',76,1470,94,C.copper,700);tx(c,'Registrations grew',80,1526,29,C.green,700);tx(c,'Q2 2025 index = 100',80,1572,22,C.muted);
 }else if(id==='constraint'){
  const asset=O.get('asset-main');G.building(c,asset.x,asset.y,asset.scale,asset.build,.12,0);c.save();c.translate(238,1130);c.scale(.77,.77);G.crane(c,0,0,t,asset.build);c.restore();
  clock(c,205,649,55,p('supply-clock'));tx(c,'DELIVERY TAKES TIME',290,660,26,C.copper,700);
  for(let i=0;i<8;i++)a(c,clamp(p('competition-pressure')*9-i),()=>G.person(c,150+i*77,1242,.7,i%2?C.copper:C.green));
  const cp=p('competition-pressure');for(let i=0;i<3;i++)a(c,clamp(cp*3-i),()=>{const labels=['SCARCITY','COMPETITION','CAN SUPPORT RENTS'];tx(c,labels[i],105+i*305,1290,19,i===2?C.copper:C.green,700);if(i<2)arrow(c,268+i*305,1283,362+i*305,1283,1,C.copper,3);});
  ribbon(c,'A timing mismatch creates attention.',76,1460,635,cp);
 }else if(id==='entry'){
  const asset=O.get('asset-main');G.building(c,asset.x,asset.y,asset.scale,asset.build,.4,0);
  badge(c,'OFF-PLAN',83,602,174,C.copper);briefcase(c,164,778,1.2,C.copper);arrow(c,239,778,427,778,p('capital-entry'),C.copper,5);
  for(let i=0;i<4;i++){const u=clamp(p('capital-entry')*1.4-i*.12);if(u>0&&u<1)G.coin(c,mix(230,425,u),778,.8);}
  const start=95,end=980,y=1225;line(c,start,y,end,y,C.line,5);const phase=p('rent-gate');arrow(c,start,y,mix(650,end,phase),y,1,C.green,5);
  ['CAPITAL','BUILD','HANDOVER','LEASE','RENT'].forEach((label,i)=>{const x=95+i*218;circle(c,x,y,10,C.white,i<3||phase>(i-2)/3?C.green:C.line,3);tx(c,label,x,1280,18,i<3||phase>(i-2)/3?C.green:C.muted,700,'center');});
  a(c,phase,()=>{doc(c,756,1105,.63);G.coin(c,972,1105,.8);});ribbon(c,'Capital first. Rental income later.',76,1450,615,p('capital-entry'));
 }else if(id==='quality'){
  const asset=O.get('asset-main'),f=O.get('floor-main');G.building(c,asset.x,asset.y,asset.scale,1,.8,1-f.open);
  a(c,f.opacity,()=>G.floor(c,mix(asset.x,515,f.open),mix(asset.y-270*asset.scale,995,f.open),mix(asset.scale,1.05,f.open),f.open,f.occupied));
  const spec=p('grade-specifications');a(c,spec,()=>{icon(c,'access',530,637,.95);tx(c,'ACCESS',530,695,22,C.green,700,'center');icon(c,'services',825,637,.95);tx(c,'SERVICES',825,695,22,C.green,700,'center');arrow(c,530,725,530,777,1,C.teal,3);arrow(c,825,725,780,777,1,C.teal,3);badge(c,plan.variant==='uploaded-script-v4'?'USABLE SPACE':'GRADE A',335,1285,plan.variant==='uploaded-script-v4'?218:177);});
  ribbon(c,'Usability wins the tenant.',76,1450,611,Math.max(f.open,spec));
 }else if(id==='lease'){
  const asset=O.get('asset-main'),lease=O.get('lease-main');G.building(c,asset.x,asset.y,asset.scale,1,.87,0);G.lease(c,735,761,.82,lease.opacity);
  const period=p('lease-periods');for(let i=0;i<4;i++){const q=clamp(period*4-i);a(c,q,()=>{const x=108+i*212;box(c,x,1180,170,80,8,C.white,C.line,2);box(c,x,1180,170,19,8,C.mint);line(c,x+40,1171,x+40,1192,C.green,4);line(c,x+130,1171,x+130,1192,C.green,4);check(c,x+85,1228,1,C.green);if(i<3)line(c,x+170,1220,x+210,1220,C.teal,3);});}
  a(c,lease.opacity,()=>{arrow(c,488,950,708,950,1,C.green,5);for(let i=0;i<5;i++){const u=(t*.36+i/5)%1;G.coin(c,mix(508,704,u),950,.65);}});
  tx(c,'CONTRACTED LEASE PERIODS',505,1330,25,C.green,700,'center');a(c,p('resale-option'),()=>{c.setLineDash([7,10]);arrow(c,483,1040,610,1088,1,C.copper,3);c.setLineDash([]);tx(c,'Potential resale',651,1100,22,C.copper);});ribbon(c,'A business lease activates income.',76,1450,627,lease.opacity);
 }else if(id==='costs'){
  const reveal=p('yield-headline');tx(c,'RENT RECEIVED',275,596,28,C.green,700,'center');arrow(c,275,635,275,758,reveal,C.green,6);a(c,reveal,()=>{for(let i=0;i<5;i++)G.coin(c,200+i*39,708,.7);});
  const defs=[['cost-fitout','fitout','Fit-out'],['cost-service','service','Service charges'],['cost-vacancy','vacancy','Vacancy'],['cost-financing','financing','Financing'],['cost-tax','tax','Tax']];
  line(c,275,789,275,1305,C.green,6);
  defs.forEach(([key,kind,label],i)=>{const y=790+i*104,pp=p(key);a(c,pp,()=>{arrow(c,275,y,545,y,1,C.copper,3);G.coin(c,mix(305,545,pp),y,.7,C.copper);circle(c,597,y,34,C.sand);icon(c,kind,597,y,.75,C.copper);tx(c,label,655,y+9,25,C.copper,700);});});
  const net=p('net-filter');a(c,net,()=>{box(c,130,1330,320,74,10,C.mint,C.green,2);G.coin(c,210,1367,.75,C.green);G.coin(c,275,1367,.75,C.green);G.coin(c,340,1367,.75,C.green);tx(c,'NET INCOME',292,1459,31,C.green,700,'center');});
  tx(c,'Costs change what remains.',76,1550,30,C.green,700);
 }else if(id==='capital'){
  badge(c,'ILLUSTRATIVE EXAMPLE',76,535,294,C.copper);const asset=O.get('asset-main');G.building(c,asset.x,asset.y,asset.scale,1,.8,0);
  tx(c,'PURCHASE',80,653,23,C.green,700);tx(c,'AED '+cash(M.purchase),80,724,64,C.green,700);
  tx(c,'+',80,846,66,C.copper,700);icon(c,'fitout',200,816,.9,C.copper);tx(c,'FIT-OUT',252,792,23,C.copper,700);tx(c,'AED '+cash(M.fitout),252,864,56,C.copper,700);
  const total=plan.metricDefinitions.purchase+plan.metricDefinitions.fitout,w=900,xx=80,y=1033,ph=w*M.purchase/total,fh=w*M.fitout/total;box(c,xx,y,ph,96,3,C.green);if(fh>0)box(c,xx+ph,y,fh,96,3,C.copper);
  tx(c,'AED '+cash(M.purchase),xx,1174,23,C.green,700);tx(c,'AED '+cash(M.fitout),980,1174,23,C.copper,700,'right'); // component labels clarify the final illustrative scale.
  tx(c,'SIMPLIFIED INVESTED CAPITAL',80,1345,23,C.muted,700);tx(c,'AED '+cash(M.invested),76,1455,82,C.green,700);a(c,p('capital-explained'),()=>check(c,630,1530,1,C.green));
 }else if(id==='yield'){
  badge(c,plan.metricDefinitions.assumedNetYield+'% ILLUSTRATIVE TARGET',76,535,353,C.copper);
  tx(c,'ANNUAL NET INCOME REQUIRED',80,674,24,C.green,700);tx(c,'AED '+cash(M.netIncome),76,780,88,C.green,700);
  line(c,80,844,654,844,C.green,4);tx(c,'AED '+cash(M.invested),80,953,69,C.ink,700);tx(c,'SIMPLIFIED INVESTED CAPITAL',80,1010,23,C.muted,700);
  const yieldP=p('yield-formula');a(c,yieldP,()=>{tx(c,'=',80,1271,76,C.muted,500);tx(c,M.netYield.toFixed(1)+'%',207,1295,117,C.green,700);tx(c,'NET YIELD',216,1350,25,C.green,700);});
  const cx=582,cy=1272,r=82;circle(c,cx,cy,r,null,C.line,12);c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*M.netYield/100);c.strokeStyle=C.copper;c.lineWidth=12;c.stroke();
  tx(c,'Income ÷ capital',80,1510,33,C.green,700);
 }else if(id==='risk'){
  const asset=O.get('asset-main');G.building(c,asset.x,asset.y,asset.scale,1,.7,0);const g=p('risk-gates');
  a(c,g,()=>{clock(c,880,637,47,g);tx(c,'TIMING + LEASING',540,618,25,C.copper,700);c.setLineDash([6,9]);line(c,540,663,816,663,C.copper,3);c.setLineDash([]);});
  const gates=[['risk-completion','COMPLETION'],['risk-tenant','TENANT'],['risk-costs','COSTS']];for(let i=0;i<3;i++){const [key,label]=gates[i],x=100+i*295,pp=p(key);a(c,g,()=>{box(c,x,1210,234,104,8,C.white,pp>.5?C.green:C.copper,2);tx(c,label,x+117,1245,21,pp>.5?C.green:C.copper,700,'center');if(pp>0)check(c,x+117,1282,pp,C.green);else circle(c,x+117,1282,8,null,C.copper,2);if(i<2)arrow(c,x+236,1262,x+290,1262,1,C.line,3);});}
  ribbon(c,'Returns depend on the whole chain.',76,1450,638,g);
 }else if(id==='close'){
  const cards=[['recap-entry','POSITION EARLY','Business demand',briefcase],['recap-space','USABLE SPACE','Tenant utility',office],['recap-net','NET ECONOMICS','Income after costs',null]];
  cards.forEach(([key,label,sub,fn],i)=>{const pp=p(key),x=225+i*310;a(c,pp,()=>{circle(c,x,763,87,i===2?C.sand:C.mint);if(fn)fn(c,x,770,.78);else{G.coin(c,x-18,770,.9);G.coin(c,x+20,752,.9);}tx(c,label,x,909,21,i===2?C.copper:C.green,700,'center');tx(c,sub,x,953,21,C.muted,500,'center');check(c,x,1023,pp,C.green);if(i<2)arrow(c,x+100,765,x+209,765,1,C.teal,4);});});
  const asset=O.get('asset-main');G.building(c,475,1298,.43,1,.9,.85);a(c,p('recap-net'),()=>{G.lease(c,615,1246,.36,1);arrow(c,612,1360,679,1360,1,C.green,3);G.coin(c,696,1360,.65);});
  tx(c,'COMMERCIAL OFF-PLAN',76,1509,29,C.green,700);tx(c,'An opportunity to evaluate.',76,1562,28,C.muted,500);
 }
 c.restore();
 const presenterBounds=presenter(c,plan,t,assets);caption(c,plan,t);
 line(c,76,1783,1002,1783,C.line,1);
 const foot=plan.sceneFootnotes?.[id]??plan.defaultFootnote??(id==='evidence'?'JLL · Q2 2026 · Registrations, not rent growth':id==='capital'||id==='yield'?'ILLUSTRATIVE · Excludes fees, VAT funding and debt':id==='costs'?'Conceptual flow · No cost proportions implied':'Supplied slides 4–14 · Conceptual graphics');
 tx(c,foot,76,1824,20,C.muted,500);tx(c,'GUIDE VOICE · CREATIVE REVIEW',76,1865,16,C.muted,500);
 c.restore();return {...state,presenterBounds,presenter:presenterFrame(plan,t)};
}
