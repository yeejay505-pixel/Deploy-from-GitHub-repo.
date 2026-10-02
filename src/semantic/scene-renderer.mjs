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
    const value=metric.max<10&&!Number.isInteger(metric.max)?metric.value.toFixed(1):Math.round(metric.value).toLocaleString('en-US');
    text(ctx,o.label,0,25,19,C.muted,500);
    const s=`${metric.prefix}${value}${metric.suffix}`;let size=72;ctx.font=`700 ${size}px "DejaVu Sans"`;while(ctx.measureText(s).width>w&&size>30){size-=2;ctx.font=`700 ${size}px "DejaVu Sans"`;}
    text(ctx,s,0,100,size,c,700);
  }else if(o.type==='bar'){
    rr(ctx,0,0,w,h,8,'#16232b',C.line,1.5);
    const bh=(h-18)*metric.value/metric.max;
    if(bh>0)rr(ctx,9,h-9-bh,w-18,bh,5,c,null);
    text(ctx,'ILLUSTRATIVE',w/2,h+32,14,C.muted,400,'center');
  }else if(o.type==='connector'){
    ctx.setLineDash([7,10]);line(ctx,0,0,w*o.progress,h*o.progress,c,3);ctx.setLineDash([]);
    if(o.progress>.05)for(let i=0;i<3;i++){const p=(t*.28+i/3)%1;if(p<o.progress){ctx.beginPath();ctx.arc(w*p,h*p,5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}}
  }else if(o.type==='card'){
    rr(ctx,0,0,w,h,14,'#1b2429',c,2);const ls=wrap(ctx,o.label,w-48,26,500);ls.forEach((s,i)=>text(ctx,s,24,43+i*35,26,c,500));
    line(ctx,24,h-22,w-24,h-22,C.line,3);if(o.progress>0)line(ctx,24,h-22,24+(w-48)*o.progress,h-22,c,3);
  }else if(o.type==='building'){
    const bh=(h-45)*o.progress;rr(ctx,8,h-30-bh,w-16,bh,5,'#202e33',c,2.5);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){const yy=h-30-bh+22+row*24;if(yy<h-42)rr(ctx,25+col*(w-54)/3,yy,14,10,1,c,null);}
    line(ctx,0,h-28,w,h-28,c,2);text(ctx,o.label,w/2,h+8,20,c,500,'center');
  }else if(o.type==='landscape'){
    line(ctx,w/2,h-40,w/2,h-100,c,3);for(const [dx,dy,r] of [[-20,-110,30],[20,-110,30],[0,-140,35]]){ctx.beginPath();ctx.arc(w/2+dx,h+dy,r*o.progress,0,Math.PI*2);ctx.fillStyle='#233e32';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();}
    line(ctx,12,h-35,w-12,h-35,c,2);text(ctx,o.label,w/2,h+8,20,c,500,'center');
  }else if(o.type==='ring'){
    const r=Math.min(w,h)/2-18,cx=w/2,cy=h/2;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=C.line;ctx.lineWidth=12;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*metric.value/metric.max);ctx.strokeStyle=c;ctx.stroke();
    text(ctx,`${metric.prefix}${Math.round(metric.value)}${metric.suffix}`,cx,cy+16,52,c,700,'center');text(ctx,o.label,cx,h+30,20,C.muted,500,'center');
  }else if(o.type==='document'){
    rr(ctx,0,0,w,h,4,'#e6e3d5',null);for(let i=0;i<5;i++)line(ctx,20,40+i*25,w-20,40+i*25,'#a9aeab',4);text(ctx,o.label,20,h-22,17,'#263c49',700);
  }else if(o.type==='label'){
    const lines=wrap(ctx,o.label,w,26);lines.forEach((s,i)=>text(ctx,s,0,30+i*35,26,c,500));
  }else throw new Error(`Unsupported renderer object ${o.type}`);
  ctx.restore();
}
export function drawSemanticScene(ctx,compiled,time,{width=1080,height=1920,presentation={},drawPlate,captionWords}={}){
  const sampled=sampleScene(compiled,time),{scene}=compiled;ctx.save();ctx.scale(width/1080,height/1920);
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,1080,1920);ctx.lineCap='round';ctx.lineJoin='round';
  text(ctx,presentation.brand||'YEEJAY / ANIMATED EXPLAINER',80,123,18,C.muted,500);text(ctx,presentation.chapter||'',1000,123,16,'#9DDDAC',400,'right');line(ctx,80,163,1000,163,C.line,1);
  if(presentation.kicker)text(ctx,presentation.kicker,80,211,20,'#9DDDAC',500);
  let headlineSize=70,lines=wrap(ctx,sampled.beat.headline,920,headlineSize,700);
  while(lines.length>2&&headlineSize>44){headlineSize-=2;lines=wrap(ctx,sampled.beat.headline,920,headlineSize,700);}
  if(lines.length>2)throw new Error('Headline does not fit: reduce text density.');
  const headAlpha=Math.min(1,(time-sampled.beat.start)/.2);ctx.save();ctx.globalAlpha=headAlpha;lines.forEach((s,i)=>text(ctx,s,80,292+i*85+(1-headAlpha)*12,headlineSize,i?'#9DDDAC':C.ink,700));ctx.restore();
  ctx.fillStyle=C.line;ctx.globalAlpha=.27;for(let x=80;x<1010;x+=40)for(let y=480;y<1480;y+=40)ctx.fillRect(x,y,1.5,1.5);ctx.globalAlpha=1;
  if(drawPlate)drawPlate(ctx,time);
  for(const o of sampled.objects.values())drawObject(ctx,o,o.metric?sampled.metrics.get(o.metric):null,time);
  const caption=captionWords?captionWords.filter(w=>time>=w.groupStart&&time<w.groupEnd).map(w=>w.word).join(' '):sampled.beat.narration;
  const caps=wrap(ctx,caption,860,captionWords?38:32);caps.slice(0,3).forEach((s,i)=>text(ctx,s,540,1570+i*46,captionWords?38:32,C.ink,500,'center'));
  line(ctx,80,1734,1000,1734,C.line,1);const disclaimer=wrap(ctx,presentation.disclaimer||scene.disclaimer||'DRAFT TIMING / VOICE ALIGNMENT PENDING',920,18);disclaimer.slice(0,2).forEach((s,i)=>text(ctx,s,80,1780+i*28,18,C.muted,400));
  ctx.restore();return sampled;
}
