// Every readable datum and continuity-critical state is native Canvas.
// Generated architecture is used only in explicitly atmospheric inserts.
export function drawSupplyGapScene(c,plan,t,state,H,assets){
 const {C,G,mix,ease,a,box,circle,line,arrow,tx,badge,check,doc,briefcase,office,icon,ribbon}=H;
 const {scene:s,metrics:M,objects:O}=state,f=s.family,p=key=>O.get(key)?.progress??0,b=id=>p('beat-'+id),cl=v=>Math.max(0,Math.min(1,v));
 const ring=(x,y,r,progress,color,width=8)=>{circle(c,x,y,r,null,C.line,width);if(progress>0){c.beginPath();c.arc(x,y,r,-Math.PI/2,-Math.PI/2+2*Math.PI*cl(progress));c.strokeStyle=color;c.lineWidth=width;c.stroke();}};
 const dotFlow=(x,y,xx,yy,progress,count=5,color=C.teal)=>{arrow(c,x,y,xx,yy,progress,color,3);if(progress>.1)for(let i=0;i<count;i++){const q=(t*.34+i/count)%1;circle(c,mix(x,xx,q)*1,mix(y,yy,q),4,color);}};
 const sub=(label,x,y,w=230,color=C.green)=>{box(c,x,y,w,52,8,color===C.green?C.mint:C.sand);tx(c,label,x+w/2,y+34,20,color,700,'center');};
 const priceTag=(x,y,label,locked,scale=1)=>{c.save();c.translate(x,y);c.scale(scale,scale);box(c,-113,-40,226,80,9,C.white,C.copper,2);circle(c,-93,-19,4,null,C.copper,2);tx(c,label,0,9,19,C.copper,700,'center');if(locked>0){a(c,locked,()=>{box(c,90,13,38,34,5,C.green);c.beginPath();c.arc(109,13,12,Math.PI,0);c.strokeStyle=C.green;c.lineWidth=5;c.stroke();circle(c,109,30,3,C.white);});}c.restore();};
 // Fine, stable architectural-paper texture. Exact seeded dot coordinates are local code.
 c.save();c.fillStyle='rgba(31,68,49,.023)';for(let i=0;i<460;i++){const x=76+(i*137.618)%930,y=540+(i*83.113)%850;c.fillRect(x,y,1.4,1.4);}c.restore();
 if(f==='hook'){
  const focus=cl(b('office')*.85+b('opportunity')*.15),district=b('opportunity');
  a(c,1-district*.82,()=>{
   sub('RESIDENTIAL',136,607,265);sub('CORPORATE',635,607,265,C.copper);
   const res=O.get('asset-residential'),ready=O.get('asset-ready');G.building(c,res.x,res.y,res.scale,1,.85,0);G.building(c,ready.x,ready.y,ready.scale,1,.62,focus);
   for(let i=0;i<7;i++){const q=cl(b('residential')*8-i);a(c,q,()=>{G.person(c,110+i*66,1310,.64,C.green);if(i<4)G.coin(c,155+i*55,1195,.6);});}
   a(c,b('competition'),()=>{for(let i=0;i<5;i++){const ang=i*Math.PI*.4;const xx=770+Math.cos(ang)*175,yy=865+Math.sin(ang)*140;briefcase(c,xx,yy,.45,C.copper);dotFlow(xx,yy,750,1010,cl(b('competition')*6-i),3,C.copper);}tx(c,'BUSINESS OCCUPIERS',765,1252,22,C.copper,700,'center');});
   a(c,b('office'),()=>{ring(760,947,183,b('office'),C.copper,5);sub('OFFICE SPACE',430,1320,265,C.copper);});
  });
  a(c,district,()=>{const im=assets.hero,w=955,h=im.height/im.width*w;c.drawImage(im,63,675+(1-district)*50,w,h);sub('FOLLOW BUSINESS DEMAND',76,610,421,C.copper);dotFlow(154,1340,651,1340,district,6,C.green);});
  ribbon(c,'The business-user opportunity.',76,1450,634,Math.max(b('office'),district));return true;
 }
 if(f==='business'){
  const setup=b('setup'),grow=b('business');
  ring(520,1005,175,setup,C.teal,3);circle(c,520,1005,169,C.pale,C.teal,2);
  for(let i=0;i<5;i++){c.save();c.translate(520,1005);c.scale(.25+i*.17,1);circle(c,0,0,165,null,C.line,1);c.restore();}for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(520,1005+i*52,Math.sqrt(175**2-(i*52)**2),20,0,0,Math.PI*2);c.strokeStyle=C.line;c.lineWidth=1.4;c.stroke();}
  // Stylized land paths, purely atmospheric; no exact geographic geometry or national origin statistic.
  c.save();c.fillStyle='#C8DFD4';c.beginPath();c.moveTo(412,899);for(const [x,y] of [[464,875],[506,900],[499,942],[530,971],[516,1009],[470,994],[451,949],[418,930]])c.lineTo(x,y);c.closePath();c.fill();c.beginPath();c.moveTo(552,930);for(const [x,y] of [[627,912],[662,953],[629,993],[587,1020],[560,995]])c.lineTo(x,y);c.closePath();c.fill();c.restore();
  const sectors=[['FINANCE',242,785,'sector-finance'],['AI',779,760,'sector-ai'],['TECHNOLOGY',846,1040,'sector-tech'],['LOGISTICS',749,1215,'sector-logistics'],['MEDIA',226,1230,'sector-media']];
  sectors.forEach(([label,x,y,key],i)=>a(c,p(key),()=>{dotFlow(x,y,520,1005,p(key),3,C.copper);circle(c,x,y,43,i%2?C.sand:C.mint);if(i===0)G.coin(c,x,y,.84);else if(i===1){tx(c,'AI',x,y+10,31,C.green,700,'center');}else if(i===2){box(c,x-23,y-17,46,33,5,null,C.green,3);for(let j=0;j<3;j++)line(c,x-10+j*10,y-5,x-10+j*10,y+5,C.green,2);}else if(i===3)briefcase(c,x,y,.6);else{circle(c,x,y,18,null,C.green,3);circle(c,x,y,6,C.green);}tx(c,label,x,y+77,20,C.green,700,'center');}));
  a(c,grow,()=>{tx(c,Math.round(M.memberCompanies).toLocaleString('en-US'),76,670,91,C.green,700);tx(c,'NEW CHAMBER MEMBERS · 2025',80,721,23,C.green,700);for(let i=0;i<6;i++){const q=(t*.15+i/6)%1;a(c,cl(grow*7-i),()=>doc(c,520+Math.sin(q*Math.PI*2)*95,1005+Math.cos(q*Math.PI*2)*65,.38));}});
  ribbon(c,'Business activity creates physical needs.',76,1450,647,grow);return true;
 }
 if(f==='team'){
  const room=O.get('floor-main'),po=b('operate'),team=b('employees'),desks=b('desks');
  briefcase(c,174,658,.92);sub('BUSINESS',105,731,175);dotFlow(272,658,465,658,po,4,C.teal);
  for(let i=0;i<6;i++)a(c,cl(team*7-i),()=>G.person(c,490+i*67,691,.55,i%3?C.green:C.copper));a(c,team,()=>tx(c,'GROWING TEAM',680,768,23,C.green,700,'center'));
  G.floor(c,room.x,room.y,room.scale,room.open,room.occupied,room.fitout);
  dotFlow(527,792,527,855,desks,3,C.copper);a(c,desks,()=>{sub('SUITABLE WORKSPACE',166,1345,465);for(let i=0;i<3;i++){ring(744+i*60,890,16,cl(desks*3-i),C.copper,3);}});
  ribbon(c,'Growing teams need workable offices.',76,1450,647,Math.max(po,team,desks));return true;
 }
 if(f==='bottleneck'){
  const asset=O.get('asset-main'),queue=cl(b('problem')*.25+b('gap')*.75);G.building(c,asset.x,asset.y,asset.scale,asset.build,.1,0);c.save();c.translate(333,1145);c.scale(.8,.8);G.crane(c,0,0,t,asset.build);c.restore();
  ring(858,650,43,b('gap'),C.copper,4);line(c,858,650,858+Math.sin(t*.9)*27,650-Math.cos(t*.9)*27,C.copper,3);tx(c,'DELIVERY TIME',787,744,22,C.copper,700,'center');
  for(let i=0;i<12;i++)a(c,cl(queue*13-i),()=>G.person(c,108+(i%6)*85,1294+Math.floor(i/6)*99,.6,i%3?C.green:C.copper));
  const gate=cl(b('gap'));line(c,548,1215,548,1420,C.copper,6);line(c,580,1242,580,1395,C.copper,6);dotFlow(315,1190,557,1190,gate,4,C.copper);
  sub('OCCUPIER NEEDS',85,609,319);ribbon(c,'Demand arrives before suitable delivery.',76,1490,647,queue);return true;
 }
 if(f==='forecast'){
  badge(c,'SUPPLIED ESTIMATES · UNVERIFIED',76,588,519,C.copper);
  tx(c,'DEMAND GROWTH',82,699,26,C.green,700);tx(c,'Cumulative to 2028',82,744,23,C.muted);
  const bx=193,by=1185,scale=8.2;for(let v=0;v<=50;v+=10){line(c,118,by-v*scale,454,by-v*scale,C.line,1);tx(c,v+'%',105,by-v*scale+7,18,C.muted,500,'right');}
  box(c,bx,by-M.demandIncrease*scale,193,M.demandIncrease*scale,4,C.green);tx(c,Math.round(M.demandIncrease)+'%',bx+96,by-M.demandIncrease*scale-23,57,C.green,700,'center');
  tx(c,'Baseline not supplied',82,1261,22,C.copper,700);tx(c,'Forecast author not supplied',82,1300,19,C.muted);
  line(c,512,688,512,1295,C.line,2);tx(c,'SUPPLY ADDITIONS',566,699,26,C.copper,700);tx(c,'Annual % of inventory',566,744,22,C.muted);
  a(c,b('supply'),()=>{const yy=1055,xx=580,ww=372;for(let v=0;v<=3;v++){const x=xx+v/3*ww;line(c,x,yy-12,x,yy+12,C.copper,2);tx(c,v+'%',x,yy+51,20,C.muted,500,'center');}line(c,xx,yy,xx+ww,yy,C.line,6);line(c,xx,yy,xx+ww*cl(p('supply-limit')),yy,C.copper,6);circle(c,xx+ww,yy,8,C.white,C.copper,3);tx(c,'<'+Math.round(M.annualSupplyCeiling)+'%',752,943,89,C.copper,700,'center');tx(c,'Less than threshold',566,1195,22,C.copper,700);tx(c,'Inventory scope unspecified',566,1239,19,C.muted);});
  ribbon(c,'Different periods. Separate measures.',76,1450,647,Math.max(b('forecast'),b('supply')),C.copper);return true;
 }
 if(f==='availability'){
  badge(c,'SOURCE RANGES · SCOPE / DATE UNSUPPLIED',76,585,627,C.copper);
  const pp=b('availability'),cells=Math.round(M.gradeAHigh),x=85,y=882,w=46,gap=12;
  tx(c,'GRADE-A OCCUPANCY',80,730,27,C.green,700);tx(c,Math.round(M.gradeALow)+'–'+Math.round(M.gradeAHigh)+'%+',80,822,74,C.green,700);
  for(let i=0;i<100;i++){const xx=x+i%10*(w+gap),yy=y+Math.floor(i/10)*40,lit=i<cells;box(c,xx,yy,w,26,4,lit?C.green:C.white,lit?C.green:C.copper,1.4);if(lit){line(c,xx+12,yy+8,xx+33,yy+8,'#7EB597',2);line(c,xx+19,yy+19,xx+26,yy+19,'#7EB597',2);}}
  tx(c,'100 CELLS = 100 PERCENTAGE POINTS',81,1341,18,C.muted,700);
  a(c,pp,()=>{tx(c,'VACANCY',739,740,24,C.copper,700);tx(c,Math.round(M.vacancyLow)+'–'+Math.round(M.vacancyHigh)+'%',727,829,78,C.copper,700);ring(830,971,79,p('vacancy-range'),C.copper,7);icon(c,'vacancy',830,971,1.45,C.copper);tx(c,'Separate district',707,1125,22,C.muted);tx(c,'sample / definition',707,1166,22,C.muted);});
  a(c,b('verify'),()=>{circle(c,430,1088,93,C.white,C.copper,7);line(c,495,1157,555,1217,C.copper,13);tx(c,'VERIFY',430,1100,30,C.copper,700,'center');sub('DATE + SCOPE + SOURCE',77,1381,612,C.copper);});
  ribbon(c,'Different subsets. Do not sum the ranges.',76,1490,647,Math.max(pp,b('verify')),C.copper);return true;
 }
 if(f==='pressure'){
  const think=b('think'),co=b('companies'),ten=b('tenants'),space=b('space');
  circle(c,216,732,75,C.mint);briefcase(c,216,732,.85);dotFlow(216,840,216,916,co,4,C.teal);
  for(let i=0;i<8;i++)a(c,cl(co*9-i),()=>doc(c,102+i%4*79,1015+Math.floor(i/4)*95,.49));a(c,Math.max(think,co),()=>tx(c,'COMPANIES',216,846,23,C.green,700,'center'));
  dotFlow(375,1065,494,1065,ten,4,C.teal);for(let i=0;i<10;i++)a(c,cl(ten*11-i),()=>G.person(c,504+i%3*69,998+Math.floor(i/3)*90,.59,i%2?C.green:C.copper));a(c,ten,()=>tx(c,'OCCUPIER TEAMS',578,867,23,C.green,700,'center'));
  a(c,Math.max(think,space),()=>{G.building(c,850,1176,.44,1,.91,0);tx(c,'SUITABLE SPACE',813,1323,23,C.green,700,'center');});
  a(c,space,()=>{const opening=mix(115,29,space);line(c,728,1000,728,1068-opening/2,C.copper,7);line(c,728,1068+opening/2,728,1175,C.copper,7);line(c,756,1005,756,1068-opening/2,C.copper,7);line(c,756,1068+opening/2,756,1168,C.copper,7);arrow(c,648,1068,786,1068,space,C.copper,4);});
  ribbon(c,'Occupier demand meets a physical limit.',76,1450,647,Math.max(think,co,ten,space));return true;
 }
 if(f==='pricing'){
  const power=b('power'),rent=b('rent'),value=b('value'),angle=mix(0,-.13,power);
  G.building(c,775,1100,.48,1,.9,0);
  tx(c,'NEGOTIATING POWER',83,644,26,C.green,700);line(c,333,1040,333,1240,C.green,6);box(c,225,1233,216,22,9,C.mint,C.green,2);circle(c,333,1038,14,C.green);
  c.save();c.translate(333,1038);c.rotate(angle);line(c,-186,0,186,0,C.copper,7);for(const xx of [-168,168]){line(c,xx,0,xx-62,158,C.copper,2);line(c,xx,0,xx+62,158,C.copper,2);c.beginPath();c.ellipse(xx,158,67,13,0,0,Math.PI);c.strokeStyle=C.copper;c.lineWidth=4;c.stroke();}for(let i=0;i<6;i++)a(c,cl(power*7-i),()=>briefcase(c,-168+(i%3-1)*38,136-Math.floor(i/3)*55,.39,C.copper));office(c,168,107,.42,.3);c.restore();
  tx(c,'OCCUPIER DEMAND',89,1328,20,C.copper,700);tx(c,'SPACE AVAILABLE',381,1328,20,C.green,700);
  a(c,rent,()=>{arrow(c,872,1255,872,1150,rent,C.copper,5);for(let i=0;i<4;i++)G.coin(c,692+i*41,1233-i*rent*13,.67);tx(c,'RENTS CAN RISE',638,1329,22,C.copper,700);});
  a(c,value,()=>{priceTag(792,775-value*88,'POTENTIAL VALUE',0,.95);arrow(c,975,925,975,808,value,C.teal,4);});
  ribbon(c,'A possible repricing. No guaranteed return.',76,1450,647,Math.max(power,rent,value));return true;
 }
 if(f==='entry'){
  const entry=b('offplan'),compare=b('completed'),asset=O.get('asset-main'),lock=O.get('capital-main').locked;
  sub('DURING THE BUILD',77,591,379,C.copper);sub('COMPLETED OFFICE',588,591,379);
  G.building(c,295,1148,.63,asset.build,.25,0);c.save();c.translate(117,1148);c.scale(.46,.46);G.crane(c,0,0,t,asset.build);c.restore();G.building(c,775,1148,.53,1,.92,0);
  priceTag(261,751,'AGREED PURCHASE PRICE',lock,.99);a(c,compare,()=>priceTag(777,760,'MARKET PRICE LATER',0,1));
  for(let i=0;i<4;i++){const q=(t*.3+i/4)%1;a(c,entry*(1-lock*.25),()=>G.coin(c,mix(100,300,q),1202,.65,C.copper));}
  a(c,compare,()=>{line(c,480,719,480,1273,C.line,2);tx(c,'FUTURE VALUE',586,1260,23,C.green,700);tx(c,'REMAINS UNCERTAIN',586,1306,21,C.muted);});
  const labels=['COMMIT','BUILD','HANDOVER','LEASE'];line(c,100,1363,700,1363,C.line,3);labels.forEach((label,i)=>{const x=100+i*195;circle(c,x,1363,9,entry?C.copper:C.white,C.copper,2);tx(c,label,x,1400,16,C.copper,700,'center');});
  ribbon(c,'Purchase price ≠ future value or all-in cost.',76,1500,647,Math.max(entry,compare));return true;
 }
 if(f==='lease'){
  const signed=O.get('lease-main').signed,cal=p('lease-calendar');G.building(c,272,1100,.58,1,.9,0);G.lease(c,757,850,.87,signed);
  a(c,cal,()=>{tx(c,Math.round(M.leaseLow)+'–'+Math.round(M.leaseHigh)+' YEARS',85,666,56,C.copper,700);tx(c,'POSSIBLE CONTRACT TERM',85,718,23,C.copper,700);const xx=85,yy=1244;for(let i=0;i<5;i++){box(c,xx+i*164,yy,145,78,7,i>=2?C.mint:C.pale,C.line,2);tx(c,'YEAR '+(i+1),xx+i*164+72,yy+50,18,C.green,700,'center');}tx(c,'Contract-specific. Review breaks and renewals.',85,1393,23,C.muted);});
  a(c,signed,()=>{dotFlow(460,1077,895,1077,signed,5,C.green);for(let i=0;i<5;i++){const q=(t*.3+i/5)%1;G.coin(c,mix(460,895,q),1077,.73);}});
  ribbon(c,'Usable space + tenant + contract → income.',76,1500,647,signed);return true;
 }
 if(f==='yield'){
  const yr=p('yield-range'),costs=p('yield-costs');badge(c,'SOURCE ESTIMATE · NOT A RETURN PROMISE',76,588,627,C.copper);
  tx(c,Math.round(M.yieldLow)+'–'+Math.round(M.yieldHigh)+'%',80,757,107,C.green,700);tx(c,'ESTIMATED ANNUAL NET YIELD',83,815,25,C.green,700);
  const xx=83,yy=897,ww=583;line(c,xx,yy,xx+ww,yy,C.line,6);for(let v=0;v<=15;v+=5){const x=xx+v/15*ww;line(c,x,yy-9,x,yy+9,C.line,2);tx(c,v+'%',x,yy+43,18,C.muted,500,'center');}a(c,yr,()=>{line(c,xx+M.yieldLow/15*ww,yy,xx+M.yieldHigh/15*ww,yy,C.green,12);for(const v of [M.yieldLow,M.yieldHigh])circle(c,xx+v/15*ww,yy,7,C.white,C.green,3);});
  const names=[['Fit-out','fitout'],['Charges','service'],['Vacancy','vacancy'],['Finance','financing'],['Tax','tax']];names.forEach(([name,kind],i)=>a(c,cl(costs*6-i*.65),()=>{const x=120+i*180;circle(c,x,1065,37,C.sand);icon(c,kind,x,1065,.86,C.copper);tx(c,name,x,1143,21,C.copper,700,'center');arrow(c,x,1190,480,1269,1,C.line,2);}));
  a(c,costs,()=>{box(c,79,1272,592,120,9,C.mint,C.green,2);tx(c,'CASH RETAINED',375,1318,27,C.green,700,'center');line(c,112,1334,640,1334,C.green,2);tx(c,'ALL CAPITAL COMMITTED',375,1373,23,C.green,700,'center');});
  ribbon(c,'Actual returns depend on asset and costs.',76,1500,647,Math.max(yr,costs));return true;
 }
 if(f==='close'){
  const generic=b('closebuy'),mechanism=b('gapentry'),watch=b('watch');
  a(c,1-watch*.88,()=>{G.building(c,363,1156,.66,1,.82,mechanism);priceTag(742,802,'BUY ANY OFFICE?',0,1.02);a(c,generic,()=>{line(c,620,750,860,852,C.red,5);});
   const labels=['DEMAND','DELIVERY','ENTRY TIMING'];labels.forEach((v,i)=>a(c,cl(mechanism*3-i),()=>{const x=215+i*302;circle(c,x,1235,45,i===1?C.sand:C.mint);if(i===0)briefcase(c,x,1235,.65);else if(i===1)icon(c,'services',x,1235,.9,C.copper);else check(c,x,1235,1,C.green);tx(c,v,x,1320,20,C.green,700,'center');if(i<2)arrow(c,x+55,1235,x+244,1235,1,C.teal,3);}));});
  a(c,watch,()=>{const im=assets.interior,w=940,h=im.height/im.width*w;c.drawImage(im,69,654+(1-watch)*40,w,h);sub('OCCUPIER QUALITY + ECONOMICS',76,591,599);['Demand','Delivery','Usability','Net economics'].forEach((v,i)=>{const y=1202+i*56;check(c,105,y,cl(watch*4-i),C.green);tx(c,v,139,y+8,25,C.green,700);});});
  ribbon(c,'A thesis to screen. An asset to underwrite.',76,1500,647,Math.max(generic,mechanism,watch));return true;
 }
 if(f==='cta'){
  const pp=b('cta'),msg=p('cta-message');
  const im=assets.hero,w=520,h=im.height/im.width*w;c.drawImage(im,60,714,w,h);
  a(c,pp,()=>{box(c,631,646,328,453,12,C.white,C.line,2);box(c,650,667,290,54,8,C.mint);tx(c,'PROJECT SHORTLIST',795,702,19,C.green,700,'center');['Business demand','Delivery timing','Tenant usability','Net economics'].forEach((v,i)=>{const y=785+i*77;check(c,661,y,cl(pp*5-i),C.green);tx(c,v,693,y+7,20,C.green,700);});dotFlow(412,1123,680,1123,pp,4,C.teal);});
  a(c,msg,()=>{box(c,77,1230,632,161,18,C.green);tx(c,'MESSAGE ME',113,1278,24,C.mint,700);const word='COMMERCIAL',shown=Math.min(word.length,Math.ceil(msg*word.length));tx(c,word.slice(0,shown),112,1355,64,C.white,700);if(shown<word.length){c.font='700 64px "DejaVu Sans"';const x=112+c.measureText(word.slice(0,shown)).width;line(c,x+4,1297,x+4,1358,C.white,3);}});
  a(c,msg,()=>tx(c,'Projects that fit this thesis.',78,1505,32,C.green,700));return true;
 }
 return false;
}
