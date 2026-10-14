// One deterministic drawing implementation for Remotion and offline previews.
// Geometry is illustrative. No building specifications or market values are implied.
export const OFFICE_DURATION = 20;
export const OFFICE_FPS = 30;
export const OFFICE_PALETTE = {
  bg:'#101317', ink:'#f4f3ed', muted:'#85919b', line:'#34434c',
  cyan:'#85d8e2', green:'#9dddac', amber:'#ecc28d', panel:'#182128',
};
export const OFFICE_NARRATION = [
  {start:0,end:4,text:'An office building gives you space.'},
  {start:4,end:7,text:'But different teams need different layouts.'},
  {start:7,end:11,text:'So the floor has to adapt.'},
  {start:11,end:15,text:'Then businesses have to move in.'},
  {start:15,end:20,text:'Space. The right fit. People who use it.'},
];
export const OFFICE_EVENTS = [
  {at:0.45,type:'trace',object:'building'},
  {at:4.20,type:'unfold',object:'selected-floor'},
  {at:7.20,type:'lock',object:'partition'},
  {at:9.60,type:'shift',object:'partition'},
  ...Array.from({length:12},(_,i)=>({at:11.55+i*.28,type:'arrival',object:`person-${i}`})),
  {at:16.10,type:'resolve',object:'workplace'},
];
const clamp = x=>Math.max(0,Math.min(1,x));
const smooth = x=>{x=clamp(x);return x*x*(3-2*x);};
const ease = x=>1-(1-clamp(x))**3;
const step = (t,a,b)=>smooth((t-a)/(b-a));
const mix = (a,b,p)=>a+(b-a)*p;
const C=OFFICE_PALETTE;
function alpha(ctx,a,fn){ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore();}
function line(ctx,x1,y1,x2,y2,c=C.line,w=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();}
function rr(ctx,x,y,w,h,r,fill,stroke,sw=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
function txt(ctx,s,x,y,size=30,c=C.ink,weight=400,align='left',mono=false){ctx.font=`${weight} ${size}px ${mono?'"DejaVu Sans Mono",monospace':'"DejaVu Sans",Arial,sans-serif'}`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=c;ctx.fillText(s,x,y);}
function spaced(ctx,s,x,y,size=18,c=C.muted,gap=4){ctx.font=`500 ${size}px "DejaVu Sans Mono",monospace`;ctx.textAlign='left';ctx.fillStyle=c;for(const ch of s){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+gap;}}
function polygon(ctx,pts,fill,stroke,width=3){ctx.beginPath();ctx.moveTo(...pts[0]);pts.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function drawPerson(ctx,x,y,c=C.green,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-10,7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-10,1,20,13,6);ctx.fill();ctx.restore();}
function desk(ctx,x,y,c,occupied=0){
  rr(ctx,x-28,y-18,56,36,6,'#1b2930',c,1.6);
  rr(ctx,x-11,y-11,22,14,2,'#34444c',null);
  line(ctx,x-5,y+7,x+5,y+7,c,1.3);
  rr(ctx,x-12,y+28,24,13,5,'#26363e',C.line,1);
  if(occupied)alpha(ctx,occupied,()=>drawPerson(ctx,x,y+39,c,.68));
}
function caption(ctx,t){
  const p=OFFICE_NARRATION.find(s=>t>=s.start&&t<s.end);if(!p)return;
  const a=step(t,p.start+.06,p.start+.28);
  alpha(ctx,a,()=>{
    const words=p.text.split(' ');const lines=[];let current='';
    ctx.font='400 32px "DejaVu Sans",Arial';
    for(const w of words){let s=current?`${current} ${w}`:w;if(ctx.measureText(s).width>770){lines.push(current);current=w;}else current=s;}lines.push(current);
    lines.forEach((s,i)=>txt(ctx,s,540,1593+i*45,32,C.ink,400,'center'));
  });
}
export function officeState(t){
  const arrivals=Array.from({length:12},(_,i)=>step(t,11.55+i*.28,12.5+i*.28));
  return {time:t,floorOpened:step(t,4.15,6.2),partitionBuilt:step(t,7,8),partitionShift:step(t,9.6,10.8),arrivals,occupied:arrivals.filter(x=>x>=.999).length,completed:t>=16.1};
}
export function drawOfficeDemand(ctx,t,{width=1080,height=1920,showCaptions=true}={}){
  const S=officeState(t);ctx.save();ctx.scale(width/1080,height/1920);
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,1080,1920);
  ctx.lineCap='round';ctx.lineJoin='round';
  alpha(ctx,.26,()=>{for(let x=80;x<1000;x+=40)for(let y=480;y<1430;y+=40){ctx.fillStyle=C.line;ctx.fillRect(x,y,1.6,1.6);}});
  spaced(ctx,'YEEJAY / EXPLAINER LAB',82,126,18,C.muted,2);
  txt(ctx,'01',995,126,18,C.cyan,500,'right',true);
  line(ctx,82,160,998,160,C.line,1);
  // The headline develops with the argument; graphic objects carry the explanation.
  const titles=[{a:0,b:4,one:'SPACE IS ONLY',two:'THE START.',color:C.cyan},{a:4,b:11,one:'MAKE SPACE',two:'FIT THE TEAM.',color:C.cyan},{a:11,b:20,one:'NOW MAKE IT',two:'A WORKPLACE.',color:C.green}];
  titles.forEach(h=>alpha(ctx,(h.a===0?1:step(t,h.a,h.a+.45))*(h.b===20?1:1-step(t,h.b-.35,h.b)),()=>{
    const dy=20*(1-ease((t-h.a)/.45));
    txt(ctx,h.one,82,295+dy,74,C.ink,700);txt(ctx,h.two,82,379+dy,74,h.color,700);
  }));
  // Building facade: the highlighted floor is the SAME polygon that opens into the plan.
  const buildingAlpha=1-step(t,4.45,5.55);
  alpha(ctx,buildingAlpha,()=>{
    const p=ease(t/1.4);ctx.save();ctx.translate(0,22*(1-p));
    ctx.setLineDash([1200]);ctx.lineDashOffset=1200*(1-p);
    rr(ctx,320,570,390,650,5,'#151e25',C.cyan,3);ctx.setLineDash([]);
    polygon(ctx,[[710,570],[790,612],[790,1258],[710,1220]],'#111b21',C.line,2);
    polygon(ctx,[[320,570],[710,570],[790,612],[400,612]],'#213039',C.cyan,2);
    alpha(ctx,step(t,.5,1.4),()=>{
      for(let floor=0;floor<6;floor++){
        const y=660+floor*88;
        for(let col=0;col<5;col++)rr(ctx,351+col*67,y,42,48,2,'#263d47',C.line,1);
        line(ctx,322,y+67,708,y+67,C.line,1);
      }
      rr(ctx,475,1130,90,90,2,'#20353d',C.cyan,2);line(ctx,520,1130,520,1220,C.cyan,1.5);
      line(ctx,250,1224,850,1267,C.line,2);
    });ctx.restore();
    alpha(ctx,step(t,2,2.5),()=>{line(ctx,718,822,850,822,C.cyan,2);txt(ctx,'ONE FLOOR',855,807,21,C.cyan,500);txt(ctx,'Many possibilities',855,839,18,C.muted,400);});
  });
  const floorStart=[[319,811],[711,811],[711,882],[319,882]];
  const floorEnd=[[140,686],[940,686],[940,1286],[140,1286]];
  const fp=floorStart.map((p,i)=>p.map((v,k)=>mix(v,floorEnd[i][k],S.floorOpened)));
  alpha(ctx,step(t,1.7,2.2),()=>{
    polygon(ctx,fp,'#1a2c34',C.cyan,3);
    alpha(ctx,1-S.floorOpened,()=>{for(let i=0;i<5;i++)rr(ctx,350+i*67,826,43,37,3,'#426975',C.cyan,1);});
  });
  alpha(ctx,step(t,5.3,6.3),()=>{
    // Fixed room coordinates make all movement and furniture placement consistent.
    rr(ctx,140,686,800,600,4,'#17232b',C.cyan,3);
    txt(ctx,'ACCESS / SHARED CORRIDOR',540,1247,18,C.muted,400,'center',true);
    const wall=mix(540,665,S.partitionShift);
    const wallLength=470*S.partitionBuilt;
    alpha(ctx,S.partitionBuilt,()=>{
      ctx.fillStyle='#20373f';ctx.fillRect(142,688,wall-142,467);
      ctx.fillStyle='#252c25';ctx.fillRect(wall+3,688,937-wall,467);
      line(ctx,wall,687,wall,687+wallLength,C.cyan,3);
      line(ctx,wall-15,687,wall+15,687,C.cyan,3);
    });
    // Furniture slides with the resizing tenant space, instead of floating unrelated cards.
    for(let i=0;i<12;i++){
      const left=i<8;const j=left?i:i-8;const cols=left?4:2;
      const lx=mix(193,203,S.partitionShift), span=mix(290,400,S.partitionShift);
      const rx=mix(619,729,S.partitionShift), rspan=120;
      const x=left?lx+(j%cols)*span/3:rx+(j%cols)*rspan;
      const y=left?865+Math.floor(j/cols)*150:865+Math.floor(j/cols)*150;
      const a=step(t,6.6+i*.06,7.1+i*.06);
      alpha(ctx,a,()=>desk(ctx,x,y,left?C.cyan:C.amber,smooth((S.arrivals[i]-.9)/.1)));
    }
    alpha(ctx,step(t,7.7,8.2),()=>{
      txt(ctx,S.partitionShift>.5?'GROWING TEAM':'TEAM A',mix(338,403,S.partitionShift),751,24,C.cyan,500,'center');
      txt(ctx,S.partitionShift>.5?'SMALL TEAM':'TEAM B',mix(741,803,S.partitionShift),751,24,C.amber,500,'center');
    });
    // Sliding door tracks visibly connect arriving people to the floor, with two entrances.
    const doorOpen=step(t,11.2,11.7);
    line(ctx,142,1157,318,1157,C.cyan,3);line(ctx,375,1157,wall,1157,C.cyan,3);
    line(ctx,wall,1157,766,1157,C.amber,3);line(ctx,823,1157,938,1157,C.amber,3);
    line(ctx,318,1157,375-57*doorOpen,1157,C.cyan,3);line(ctx,766,1157,823-57*doorOpen,1157,C.amber,3);
    for(let i=0;i<12;i++){
      const p=S.arrivals[i];if(p<=0||p>=1)continue;
      const left=i<8,j=left?i:i-8;
      const targetX=left?203+(j%4)*400/3:729+(j%2)*120;
      const targetY=865+Math.floor(j/(left?4:2))*150+39;
      const entranceX=left?347:794;
      let x,y;
      if(p<.42){x=mix(80,entranceX,ease(p/.42));y=1200;}
      else if(p<.62){x=entranceX;y=mix(1200,1107,smooth((p-.42)/.20));}
      else{x=mix(entranceX,targetX,smooth((p-.62)/.38));y=mix(1107,targetY,smooth((p-.62)/.38));}
      alpha(ctx,Math.min(p*6,(1-p)*6),()=>drawPerson(ctx,x,y,left?C.cyan:C.amber,.85));
    }
  });
  // Small state indicator reflects actual settled people, never an invented market statistic.
  alpha(ctx,step(t,11,11.5),()=>{
    txt(ctx,'DESKS IN USE',150,1382,20,C.muted,400);
    txt(ctx,`${S.occupied} / 12`,927,1382,27,C.green,500,'right',true);
    rr(ctx,150,1407,777,8,4,C.line,null);
    if(S.occupied>0)rr(ctx,150,1407,777*S.occupied/12,8,4,C.green,null);
  });
  alpha(ctx,step(t,16.1,16.65),()=>{
    rr(ctx,735,559,202,55,27,'#233b2c',C.green,1.4);
    txt(ctx,'●  IN USE',836,595,23,C.green,500,'center');
    txt(ctx,'SPACE  →  FIT  →  PEOPLE',540,1494,27,C.ink,500,'center',true);
  });
  if(showCaptions)caption(ctx,t);
  line(ctx,82,1732,998,1732,C.line,1);
  spaced(ctx,'ILLUSTRATIVE SCHEMATIC / NOT PROJECT DATA',82,1775,14,C.muted,1);
  // Hold the resolved composition through the final frame. Never fade the whole frame to blank.
  ctx.restore();
}
