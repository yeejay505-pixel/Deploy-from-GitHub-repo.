import {sampleScene} from './scene-contract.mjs';
const C={bg:'#10151b',ink:'#f3f2eb',muted:'#8c99a6',line:'#344552'};
function rr(ctx,x,y,w,h,r,fill,stroke,width=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(ctx,s,x,y,size=28,color=C.ink,weight=400,align='left'){ctx.font=`${weight} ${size}px "DejaVu Sans",Arial,sans-serif`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText(s,x,y);}
function line(ctx,x,y,x2,y2,color,w=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.stroke();}
function person(ctx,x,y,color,size=1){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-10,8,0,Math.PI*2);ctx.fill();rr(ctx,-12,3,24,17,7,color,null);ctx.restore();}
function wrap(ctx,s,width,size,weight=400){ctx.font=`${weight} ${size}px "DejaVu Sans"`;const result=[];let l='';for(const word of s.split(' ')){const n=l?`${l} ${word}`:word;if(ctx.measureText(n).width>width&&l){result.push(l);l=word;}else l=n;}if(l)result.push(l);return result;}
function drawObject(ctx,o,metric,t){
  const {w,h,color:c}=o;ctx.save();ctx.globalAlpha=o.opacity;ctx.translate(o.x+w/2,o.y+h/2);ctx.rotate(o.rotation*Math.PI/180);ctx.translate(-w/2,-h/2);
  if(o.type==='platform'){
    rr(ctx,0,0,w,h,14,'#162936',c,2.5);
    text(ctx,o.label,24,43,23,c,700);
    for(let i=0;i<3;i++){rr(ctx,24,76+i*41,w-48,24,5,'#243c4a',C.line,1);for(let j=0;j<5;j++)rr(ctx,35+j*40,85+i*41,17,6,2,c,null);}
    ctx.save();ctx.globalAlpha*=o.progress;ctx.fillStyle=c;ctx.beginPath();ctx.arc(w-30,h-27,7,0,Math.PI*2);ctx.fill();ctx.restore();
    text(ctx,o.progress>.5?'SUPPORT ON':'SUPPORT OFF',24,h-20,16,o.progress>.5?c:'#ee8886',500);
  }else if(o.type==='shop'){
    const roof=55;rr(ctx,0,roof,w,h-roof,4,'#1b2630',c,2.5);
    ctx.beginPath();ctx.moveTo(-10,roof);ctx.lineTo(25,6);ctx.lineTo(w-25,6);ctx.lineTo(w+10,roof);ctx.closePath();ctx.fillStyle='#253c48';ctx.fill();ctx.strokeStyle=c;ctx.stroke();
    for(let i=0;i<6;i++){line(ctx,26+i*(w-52)/5,7,10+i*(w-20)/5,roof,c,1.3);}
    rr(ctx,25,85,w*.38,h-110,3,'#28404b',C.line,1.5);rr(ctx,w*.64,85,w*.26,h-85,3,'#192c36',c,1.6);
    line(ctx,w*.81,150,w*.83,150,c,2);text(ctx,o.label,w/2,h+41,23,c,500,'center');
  }else if(o.type==='cart'){
    const qty=Math.round(metric.value),top=30;
    ctx.beginPath();ctx.moveTo(15,top);ctx.lineTo(w-15,top);ctx.lineTo(w-38,h-31);ctx.lineTo(38,h-31);ctx.closePath();ctx.fillStyle='#182c36';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();
    line(ctx,0,top-13,16,top,c,3);
    for(const x of [60,w-60]){ctx.beginPath();ctx.arc(x,h-10,11,0,Math.PI*2);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();}
    const cols=6;for(let i=0;i<qty;i++)person(ctx,46+i%cols*(w-92)/5,top+30+Math.floor(i/cols)*39,c,.62);
    text(ctx,o.label,w/2,-22,22,c,500,'center');
  }else if(o.type==='person')person(ctx,w/2,h/2,c,Math.min(w/35,h/40));
  else if(o.type==='counter'){
    const value=Math.round(metric.value);
    text(ctx,o.label,0,25,19,C.muted,500);
    text(ctx,`${metric.prefix}${value}${metric.suffix}`,0,92,60,c,700);
  }else if(o.type==='bar'){
    rr(ctx,0,0,w,h,8,'#16232b',C.line,1.5);
    const bh=(h-18)*metric.value/metric.max;
    if(bh>0)rr(ctx,9,h-9-bh,w-18,bh,5,c,null);
    text(ctx,'ILLUSTRATIVE',w/2,h+32,14,C.muted,400,'center');
  }else if(o.type==='connector'){
    ctx.setLineDash([7,10]);line(ctx,0,0,w*o.progress,h*o.progress,c,3);ctx.setLineDash([]);
    if(o.progress>.05)for(let i=0;i<3;i++){const p=(t*.28+i/3)%1;if(p<o.progress){ctx.beginPath();ctx.arc(w*p,h*p,5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}}
  }else if(o.type==='document'){
    rr(ctx,0,0,w,h,4,'#e6e3d5',null);for(let i=0;i<5;i++)line(ctx,20,40+i*25,w-20,40+i*25,'#a9aeab',4);text(ctx,o.label,20,h-22,17,'#263c49',700);
  }else if(o.type==='label'){
    const lines=wrap(ctx,o.label,w,26);lines.forEach((s,i)=>text(ctx,s,0,30+i*35,26,c,500));
  }else throw new Error(`Unsupported renderer object ${o.type}`);
  ctx.restore();
}
export function drawSemanticScene(ctx,compiled,time,{width=1080,height=1920}={}){
  const sampled=sampleScene(compiled,time),{scene}=compiled;ctx.save();ctx.scale(width/1080,height/1920);
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,1080,1920);ctx.lineCap='round';ctx.lineJoin='round';
  text(ctx,'YEEJAY / ANIMATED ARGUMENT',80,123,18,C.muted,500);text(ctx,'SPEC → RENDER',1000,123,16,'#88d9e4',400,'right');line(ctx,80,163,1000,163,C.line,1);
  let headlineSize=70,lines=wrap(ctx,sampled.beat.headline,920,headlineSize,700);
  while(lines.length>2&&headlineSize>44){headlineSize-=2;lines=wrap(ctx,sampled.beat.headline,920,headlineSize,700);}
  if(lines.length>2)throw new Error('Headline does not fit: reduce text density.');
  lines.forEach((s,i)=>text(ctx,s,80,292+i*85,headlineSize,i?'#88d9e4':C.ink,700));
  ctx.fillStyle=C.line;ctx.globalAlpha=.27;for(let x=80;x<1010;x+=40)for(let y=480;y<1480;y+=40)ctx.fillRect(x,y,1.5,1.5);ctx.globalAlpha=1;
  for(const o of sampled.objects.values())drawObject(ctx,o,o.metric?sampled.metrics.get(o.metric):null,time);
  const caps=wrap(ctx,sampled.beat.narration,860,32);caps.slice(0,3).forEach((s,i)=>text(ctx,s,540,1570+i*46,32,C.ink,400,'center'));
  line(ctx,80,1734,1000,1734,C.line,1);text(ctx,scene.disclaimer||'DRAFT TIMING / VOICE ALIGNMENT PENDING',80,1780,16,C.muted,400);
  ctx.restore();return sampled;
}
