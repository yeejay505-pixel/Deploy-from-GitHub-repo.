// Selective new scenes for the uploaded-script pitch. Helpers are injected by the established composition.
// Generated art supplies only the atmospheric opening; every label, counter and mechanism is native Canvas.
export function drawUploadedScriptScene(c,plan,t,state,H,assets){
 const {C,G,mix,ease,a,box,circle,line,arrow,tx,badge,check,doc,briefcase,office,shop,icon,ribbon}=H;
 const {scene:s,metrics:M,objects:O}=state,id=s.id,p=key=>O.get(key)?.progress??0;
 if(id==='opening'){
  const reveal=O.get('hero-main').reveal,link=p('hook-links');
  a(c,reveal,()=>{const im=assets.hero,scale=.61*(1+reveal*.018),w=im.width*scale,h=im.height*scale;c.drawImage(im,540-w/2,566+(1-reveal)*35,w,h);});
  const labels=[['OFFICES',158,730,360,896],['RETAIL',112,1195,345,1110],['LOGISTICS',877,1240,786,1088]];
  labels.forEach(([label,x,y,xx,yy],i)=>a(c,Math.min(1,Math.max(0,link*3-i)),()=>{badge(c,label,x-69,y-20,138,i===2?C.copper:C.green);arrow(c,x,y+(i===0?25:-25),xx,yy,1,i===2?C.copper:C.green,3);}));
  ribbon(c,'Follow the businesses. Assess the space.',76,1450,639,link);
  return true;
 }
 if(id==='business'){
  badge(c,'CALENDAR 2025',76,586,217,C.copper);tx(c,Math.round(M.memberCompanies).toLocaleString('en-US'),80,827,151,C.green,700);tx(c,'NEW MEMBER COMPANIES',84,898,32,C.green,700);tx(c,'Dubai Chamber of Commerce',84,951,28,C.muted,500);
  const join=p('membership-join');circle(c,555,1170,69,C.mint,C.green,3);tx(c,'CHAMBER',555,1166,19,C.green,700,'center');tx(c,'MEMBERS',555,1197,19,C.green,700,'center');
  for(let i=0;i<8;i++){const ang=-Math.PI*.5+i*Math.PI/4,xx=555+Math.cos(ang)*242,yy=1170+Math.sin(ang)*140,progress=Math.min(1,Math.max(0,join*9-i));a(c,progress,()=>{doc(c,xx,yy,.50);arrow(c,xx+(555-xx)*.15,yy+(1170-yy)*.15,555+(xx-555)*.35,1170+(yy-1170)*.35,progress,C.teal,2);});}
  ribbon(c,'Business activity. Physical opportunity.',76,1450,644,join);return true;
 }
 if(id==='evidence'){
  const firm=p('firm-expansion'),space=p('space-needed');a(c,firm,()=>{briefcase(c,520,642,1.0);tx(c,'GROWING BUSINESSES',520,733,28,C.green,700,'center');});
  arrow(c,520,771,520,880,space,C.teal,5);for(let i=0;i<7;i++)a(c,Math.min(1,Math.max(0,space*8-i)),()=>G.person(c,260+i*87,956,.8,i%3?C.green:C.copper));
  const uses=[['OFFICES',222,office],['RETAIL',526,shop],['WAREHOUSES',831,null]];
  uses.forEach(([label,x,fn],i)=>{const reveal=Math.min(1,Math.max(0,space*3-i));a(c,reveal,()=>{arrow(c,520,1017,x,1131,1,C.teal,3);if(fn)fn(c,x,1235,.8);else{box(c,x-78,1177,156,102,5,C.pale,C.green,3);line(c,x-87,1177,x,1124,C.green,3);line(c,x,1124,x+87,1177,C.green,3);box(c,x-47,1218,47,61,2,C.mint,C.green,2);box(c,x+11,1218,47,61,2,C.mint,C.green,2);for(let j=0;j<3;j++)line(c,x-41,1230+j*13,x-6,1230+j*13,C.line,2);}tx(c,label,x,1300,24,C.green,700,'center');});});
  ribbon(c,'Businesses need somewhere to operate.',76,1450,646,space);return true;
 }
 if(id==='shell'){
  const asset=O.get('asset-main'),floor=O.get('floor-main');G.building(c,asset.x,asset.y,asset.scale,asset.build,.4,1-floor.open);
  a(c,floor.opacity,()=>G.floor(c,mix(asset.x,floor.x,floor.open),mix(asset.y-270*asset.scale,floor.y,floor.open),mix(asset.scale,floor.scale,floor.open),floor.open,0,floor.fitout));
  badge(c,floor.fitout>.1?'OCCUPIER FIT-OUT':'SHELL + CORE',79,596,262,C.copper);a(c,floor.fitout,()=>{icon(c,'fitout',798,644,.9,C.copper);tx(c,'Designed around',845,665,23,C.copper,700,'center');tx(c,'the business',845,700,23,C.copper,700,'center');arrow(c,800,732,710,824,1,C.copper,3);});
  ribbon(c,'A flexible space becomes a workplace.',76,1450,633,Math.max(floor.open,floor.fitout));return true;
 }
 if(id==='returns'){
  const progress=p('net-return-model');badge(c,'UNDERWRITE THE ASSET',76,586,324,C.copper);tx(c,'HEADLINE YIELD',80,760,39,C.copper,700);
  a(c,progress,()=>{line(c,78,717,614,776,C.red,5);tx(c,'≠',648,762,74,C.red,700);});
  a(c,progress,()=>{tx(c,'CASH RETAINED',90,965,29,C.green,700);box(c,90,996,520,120,8,C.mint,C.green,2);for(let i=0;i<5;i++)G.coin(c,170+i*87,1056,.84,C.green);tx(c,'CAPITAL COMMITTED',90,1210,28,C.green,700);const labels=['Purchase','Fit-out','Fees'];for(let i=0;i<3;i++){box(c,90+i*176,1240,164,77,6,i===1?C.sand:C.pale,C.line);tx(c,labels[i],172+i*176,1290,22,i===1?C.copper:C.green,700,'center');}arrow(c,656,1060,656,1280,1,C.teal,4);tx(c,'MODEL',689,1195,24,C.green,700);tx(c,'THE NET',689,1237,24,C.green,700);});
  ribbon(c,'Your return depends on the full model.',76,1450,647,progress);return true;
 }
 if(id==='close'){
  const criteria=[['recap-entry','POSITION EARLY','Business demand',briefcase],['recap-space','USABLE SPACE','Tenant utility',office],['recap-net','NET ECONOMICS','Income after costs',null]];
  criteria.forEach(([key,label,sub,fn],i)=>{const pp=p(key),x=225+i*310;a(c,pp,()=>{circle(c,x,720,80,i===2?C.sand:C.mint);if(fn)fn(c,x,727,.7);else{G.coin(c,x-16,725,.9);G.coin(c,x+22,703,.9);}tx(c,label,x,856,21,i===2?C.copper:C.green,700,'center');tx(c,sub,x,900,21,C.muted,500,'center');check(c,x,952,pp,C.green);if(i<2)arrow(c,x+96,720,x+215,720,1,C.teal,4);});});
  const asset=O.get('asset-main');G.building(c,asset.x,asset.y,asset.scale,asset.build,.8,.8);
  const shortlist=p('shortlist-reveal');a(c,shortlist,()=>{arrow(c,526,1136,640,1136,1,C.teal,3);box(c,671,1034,285,300,9,C.white,C.line,2);box(c,689,1055,247,43,6,C.mint);tx(c,'INVESTOR SHORTLIST',812,1084,17,C.green,700,'center');['Demand','Usability','Net economics'].forEach((v,i)=>{tx(c,v,710,1153+i*67,22,C.green,700);check(c,910,1146+i*67,Math.min(1,Math.max(0,shortlist*3-i)),C.green);});});
  ribbon(c,'A case for disciplined early positioning.',76,1450,644,Math.max(p('recap-net'),shortlist));
  a(c,shortlist,()=>tx(c,'Assess the asset. Price the risks.',76,1570,29,C.green,700));return true;
 }
 return false;
}
