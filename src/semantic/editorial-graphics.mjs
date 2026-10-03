// Reusable vector artwork for the light review style. State/timing stays in the scene plan.
export const LIGHT_PALETTE={bg:'#FFFFFF',ink:'#25332D',muted:'#748078',line:'#E0E7E0',green:'#315E4C',soft:'#EAF1EB',stone:'#F5F1E8',sand:'#9C7847'};
const P=LIGHT_PALETTE;
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
function path(c,points,fill,stroke){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function ln(c,x,y,x2,y2,color=P.green,width=2.5){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2.5;c.stroke();}}
function tx(c,s,x,y,size=25,color=P.ink,weight=500,align='left'){c.font=`${weight} ${size}px "DejaVu Sans"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(s,x,y);}
function lines(c,s,w,size=25){c.font=`500 ${size}px "DejaVu Sans"`;let out=[],line='';for(const word of s.split(' ')){const n=line?line+' '+word:word;if(c.measureText(n).width>w&&line){out.push(line);line=word;}else line=n;}if(line)out.push(line);return out;}
function shadow(c){c.shadowColor='rgba(38,62,48,0.075)';c.shadowBlur=24;c.shadowOffsetY=8;}
function icon(c,key,x,y,size,color=P.green){
 c.save();c.translate(x,y);c.scale(size/80,size/80);c.lineCap='round';c.lineJoin='round';
 if(key==='price'){
  path(c,[[12,22],[46,10],[70,34],[44,64],[12,48]],'#FFFFFF',color);circle(c,28,30,5,null,color);ln(c,43,35,57,47,color);ln(c,39,42,50,53,color);
 }else if(key==='people'){
  for(const [x,y,r] of [[20,30,8],[59,30,8],[40,23,10]])circle(c,x,y,r,'#FFFFFF',color);
  box(c,8,42,25,20,9,'#D8E5DA',color);box(c,47,42,25,20,9,'#D8E5DA',color);box(c,25,39,31,30,11,'#FFFFFF',color);
 }else if(key==='legal'){
  path(c,[[40,8],[68,20],[65,47],[55,63],[40,73],[25,63],[15,47],[12,20]],'#FFFFFF',color);
  box(c,29,26,23,29,3,'#EAF1EB',color);ln(c,35,35,46,35,color,2);ln(c,35,42,46,42,color,2);ln(c,35,49,43,49,color,2);
 }else if(key==='delivery'){
  ln(c,19,13,19,65,color,4);ln(c,19,17,67,17,color,4);ln(c,20,13,42,17,color,2);ln(c,61,18,61,38,color,2);box(c,48,38,24,18,3,'#FFFFFF',color);box(c,25,44,17,22,2,'#D8E5DA',color);ln(c,8,68,72,68,color,3);
 }else if(key==='compare'){
  box(c,10,12,47,51,5,'#FFFFFF',color);box(c,19,44,7,11,1,'#AAC5AF');box(c,31,35,7,20,1,'#709880');box(c,43,26,7,29,1,color);circle(c,56,49,13,'#FFFFFF',color);ln(c,66,59,74,69,color,4);
 }else if(key==='footfall'){
  c.save();c.translate(26,42);c.rotate(-.35);box(c,-9,-14,18,36,9,'#FFFFFF',color);circle(c,0,-22,7,'#FFFFFF',color);c.restore();c.save();c.translate(55,31);c.rotate(.25);box(c,-9,-14,18,36,9,'#D8E5DA',color);circle(c,0,-22,7,'#D8E5DA',color);c.restore();
 }else if(key==='access'){
  path(c,[[17,66],[26,14],[54,14],[65,66]],'#FFFFFF',color);ln(c,40,23,40,34,color,3);ln(c,40,45,40,58,color,3);
 }else if(key==='parking'){
  box(c,17,11,46,56,11,'#FFFFFF',color);tx(c,'P',40,52,37,color,700,'center');
 }else if(key==='lifestyle'){
  circle(c,40,24,11,'#FFFFFF',color);path(c,[[12,48],[29,43],[40,52],[51,43],[68,48],[58,65],[40,67],[22,65]],'#FFFFFF',color);ln(c,40,36,40,53,color,3);
 }else if(key==='location'){
  c.beginPath();c.moveTo(40,72);c.bezierCurveTo(15,44,12,28,24,16);c.bezierCurveTo(36,4,60,11,64,27);c.bezierCurveTo(68,44,50,63,40,72);c.fillStyle='#FFFFFF';c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();circle(c,40,29,9,null,color);
 }else if(key==='flow'){
  for(const [x,y] of [[13,27],[47,27],[47,56]])box(c,x,y,21,15,4,'#FFFFFF',color);ln(c,35,34,46,34,color);ln(c,58,43,58,54,color);ln(c,16,60,37,60,color);
 }else if(key==='scope'){
  circle(c,40,40,28,'#FFFFFF',color);c.beginPath();c.ellipse(40,40,13,28,0,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=2;c.stroke();ln(c,14,31,66,31,color,2);ln(c,14,49,66,49,color,2);
 }else{
  box(c,18,14,44,52,6,'#FFFFFF',color);box(c,27,26,10,13,2,'#D8E5DA',color);box(c,43,26,10,13,2,'#D8E5DA',color);box(c,27,45,10,13,2,'#D8E5DA',color);box(c,43,45,10,13,2,'#D8E5DA',color);
 }
 c.restore();
}
export function drawEditorialObject(c,o,m,t,style={}){
 const {w,h}=o;const tone=o.color.toLowerCase()==='#d8b685'?P.sand:P.green;
 c.save();c.globalAlpha=o.opacity;c.translate(o.x+w/2,o.y+h/2);c.rotate(o.rotation*Math.PI/180);c.translate(-w/2,-h/2);
 if(o.type==='card'){
  const pending=/PENDING/.test(o.label),compact=h<130,label=o.label.replace(/\s*\/\s*PENDING/,'').replace(/DOCUMENTATION PENDING/,'DOCUMENTATION');
  c.save();shadow(c);box(c,0,0,w,h,22,'#FFFFFF',P.line);c.restore();
  const size=compact?56:76,ix=24,iy=(h-size)/2;box(c,ix,iy,size,size,18,pending?P.stone:P.soft);icon(c,style.icons?.[o.id]||'work',ix+8,iy+8,size-16,tone);
  let font=compact?23:25,ls=lines(c,label,w-size-76,font);while(ls.length>2&&font>18){font-=1;ls=lines(c,label,w-size-76,font);}
  const yy=pending?48:(h-(ls.length-1)*(font+8))/2+font*.32;
  ls.forEach((s,i)=>tx(c,s,size+48,yy+i*(font+8),font,P.ink,500));
  if(pending){const py=h-44;box(c,size+48,py,106,26,13,P.stone);tx(c,'PENDING',size+101,py+18,14,P.sand,700,'center');}
 }else if(o.type==='counter'){
  c.save();shadow(c);box(c,0,0,w,h,22,'#FFFFFF',P.line);c.restore();
  const value=m.max<10&&!Number.isInteger(m.max)?m.value.toFixed(1):Math.round(m.value).toLocaleString('en-US'),str=m.prefix+value+m.suffix;
  tx(c,o.label,26,36,18,P.muted,500);let size=h>160?88:66;c.font=`700 ${size}px "DejaVu Sans"`;while(c.measureText(str).width>w-52&&size>30){size-=2;c.font=`700 ${size}px "DejaVu Sans"`;}
  tx(c,str,26,h-32,size,P.green,700);
 }else if(o.type==='building'){
  const bh=(h-50)*o.progress,top=h-36-bh,left=w*.09,front=w*.72,right=w*.94,depth=w*.12;
  c.save();c.globalAlpha*=.6;c.beginPath();c.ellipse(w/2,h-27,w*.46,10,0,0,Math.PI*2);c.fillStyle='#D9E3DA';c.fill();c.restore();
  if(bh>4){path(c,[[left,top],[front,top],[front,h-36],[left,h-36]],'#D5E3D6',P.green);path(c,[[front,top],[right,top-depth],[right,h-36-depth],[front,h-36]],'#9DB9A4',P.green);path(c,[[left,top],[left+depth,top-depth],[right,top-depth],[front,top]],'#F2F5EC',P.green);
   for(let row=0;row<4;row++)for(let col=0;col<3;col++){const yy=top+20+row*Math.max(19,(bh-45)/4),xx=left+12+col*(front-left-24)/3;if(yy+10<h-44)box(c,xx,yy,Math.max(6,(front-left-44)/4),11,2,'#7C9F89');}
   box(c,w*.32,h-63,Math.max(10,w*.13),27,2,'#507A63');}
  tx(c,o.label,w/2,h+12,20,P.green,500,'center');
 }else if(o.type==='landscape'){
  c.beginPath();c.ellipse(w/2,h-40,w*.45,24,0,0,Math.PI*2);c.fillStyle='#DDE9D6';c.fill();ln(c,w/2,h-40,w/2,h-135,'#997C58',8);
  for(const [dx,dy,r,color] of [[-23,-119,36,'#8CAC81'],[24,-122,40,'#678F6C'],[0,-151,43,'#3F7357']])circle(c,w/2+dx,h+dy,r*o.progress,color);
  ln(c,w*.17,h-32,w*.78,h-26,'#C5BBA0',7);tx(c,o.label,w/2,h+12,20,P.green,500,'center');
 }else if(o.type==='shop'){
  c.save();shadow(c);box(c,8,62,w-16,h-85,9,'#F2F2E8',P.line);c.restore();
  path(c,[[0,63],[27,17],[w-27,17],[w,63]],'#89A78D',P.green);for(let i=0;i<5;i++)ln(c,27+i*(w-54)/4,18,10+i*(w-20)/4,62,'#F8FBF5',4);
  box(c,25,83,w*.42,h-123,4,'#B8CBBB',P.green);box(c,w*.64,83,w*.22,h-107,4,'#DCE5DA',P.green);ln(c,w*.79,133,w*.81,133,P.green,3);tx(c,o.label,w/2,h+20,22,P.green,500,'center');
 }else if(o.type==='connector'){
  c.setLineDash([5,10]);ln(c,0,0,w*o.progress,h*o.progress,'#94AD98',3);c.setLineDash([]);for(let i=0;i<3;i++){const p=(t*.28+i/3)%1;if(p<o.progress)circle(c,w*p,h*p,5,P.green);}
 }else if(o.type==='ring'){
  const r=Math.min(w,h)/2-24,cx=w/2,cy=h/2;c.save();shadow(c);circle(c,cx,cy,r+15,'#FFFFFF');c.restore();
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.strokeStyle='#E5EDE4';c.lineWidth=18;c.stroke();c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*m.value/m.max);c.strokeStyle=P.green;c.stroke();
  tx(c,`${m.prefix}${Math.round(m.value)}${m.suffix}`,cx,cy+20,60,P.ink,700,'center');tx(c,o.label,cx,h+35,21,P.muted,500,'center');
 }else if(o.type==='label'){
  lines(c,o.label,w,26).forEach((s,i)=>tx(c,s,0,30+i*35,26,P.ink,500));
 }else if(o.type==='document'){
  c.save();shadow(c);box(c,0,0,w,h,12,'#FFFFFF',P.line);c.restore();icon(c,'legal',20,20,60);for(let i=0;i<3;i++)ln(c,22,100+i*22,w-22,100+i*22,P.line,4);tx(c,o.label,20,h-20,18,P.green,500);
 }else if(o.type==='bar'){
  box(c,0,0,w,h,12,P.soft,P.line);const bh=(h-16)*m.value/m.max;box(c,8,h-8-bh,w-16,bh,7,P.green);tx(c,'ILLUSTRATIVE',w/2,h+30,14,P.muted,500,'center');
 }else if(o.type==='person'){
  circle(c,w/2,h*.24,Math.min(w,h)*.2,P.green);box(c,w*.15,h*.45,w*.7,h*.4,w*.2,P.green);
 }else if(o.type==='platform'){
  box(c,0,0,w,h,18,'#FFFFFF',P.line);tx(c,o.label,24,38,23,P.green,700);for(let i=0;i<3;i++)box(c,24,66+i*38,w-48,25,6,P.soft);tx(c,o.progress>.5?'SUPPORT ON':'SUPPORT OFF',24,h-20,16,P.muted,500);
 }else if(o.type==='cart'){
  path(c,[[14,30],[w-16,30],[w-36,h-32],[35,h-32]],P.soft,P.green);ln(c,0,15,15,30,P.green,3);circle(c,50,h-12,10,null,P.green);circle(c,w-50,h-12,10,null,P.green);for(let i=0;i<Math.round(m.value);i++)circle(c,43+i%6*(w-86)/5,55+Math.floor(i/6)*30,6,P.green);tx(c,o.label,w/2,-15,22,P.green,500,'center');
 }else throw new Error('Unsupported editorial graphic');
 c.restore();
}
