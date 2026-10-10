import {sampleSourceRender} from './source-render-binding.mjs';
import {pitchPrimitives as G,clamp} from './investor-pitch.mjs';
const C={white:'#FFFFFF',ink:'#173A32',green:'#286650',sage:'#DCEDE2',teal:'#319A9D',copper:'#B37B45',sand:'#F2E8D6',line:'#CDDCD4',muted:'#687C72'};
function tx(c,s,x,y,size=25,color=C.ink,weight=500,align='left',max=932){c.font=`${weight} ${size}px "Explainer"`;if(c.measureText(String(s)).width>max)throw Error('readability_text_overflow: '+s);c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(String(s),x,y);}
function line(c,x,y,xx,yy,color=C.line,w=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=w;c.stroke();}
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function wrap(c,text,width,size=24){c.font=`500 ${size}px "Explainer"`;const lines=[];let cur='';for(const word of text.split(/\s+/)){const next=cur?cur+' '+word:word;if(c.measureText(word).width>width)throw Error('readability_unbreakable_text');if(cur&&c.measureText(next).width>width){lines.push(cur);cur=word;}else cur=next;}if(cur)lines.push(cur);return lines;}
function format(v){return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(v);}
export function drawSourceObject(c,o,m,time){
 const {x,y,scale}=o.layout,p=o.parameters;c.save();c.globalAlpha=p.opacity;
 if(o.component==='checklist'){box(c,x-320,y-96,640,192,20,C.sage);tx(c,'ASSESS THE ASSET',x,y-53,23,C.green,700,'center',600);for(const [i,label] of ['DELIVERY','USABILITY','LEASING'].entries()){const xx=x-211+i*210,q=clamp(p.progress*3-i);box(c,xx-72,y-20,144,74,10,C.white,C.line);tx(c,label,xx,y+12,19,C.green,700,'center',140);if(q>0){line(c,xx-9,y+34,xx-2,y+41*q,C.copper,3);line(c,xx-2,y+41*q,xx+12*q,y+27*q,C.copper,3);}}}
 else if(o.component==='office_lifecycle'){c.save();c.globalAlpha*=1-p.open;G.building(c,x,y,scale,p.build,0,p.open);c.restore();if(p.open>0){G.floor(c,x,y-270*scale,scale,p.open,p.occupied,p.fitout);}}
 else if(o.component==='building'){G.building(c,x,y,scale,p.build,p.occupied,p.selected);if(p.build<.995){c.save();c.translate(x-185*scale,y);c.scale(scale*.64,scale*.64);G.crane(c,0,0,time,p.build);c.restore();}}
 else if(o.component==='workspace')G.floor(c,x,y,scale,p.open,p.occupied,p.fitout);
 else if(o.component==='queue'){for(let i=0;i<8;i++){const progress=clamp(p.progress*8-i);if(progress<=0)continue;c.save();c.globalAlpha*=clamp(progress*4);G.person(c,x-(i%4)*65*scale-30*(1-progress),y+Math.floor(i/4)*80*scale,.82*scale,i%2?C.green:C.copper);c.restore();}line(c,x+58*scale,y-52*scale,x+58*scale,y+127*scale,C.copper,5);}
 else if(o.component==='price_lock'){const q=p.progress;c.save();c.translate(x,y);c.scale(scale,scale);box(c,-155,-74,310,148,15,C.sand,C.copper);c.beginPath();c.arc(0,-26,24,Math.PI,0);c.strokeStyle=C.copper;c.lineWidth=6;c.stroke();box(c,-29,-27+16*(1-q),58,43,7,C.copper);tx(c,q>.98?'PRICE AGREED':'DURING THE BUILD',0,53,21,C.ink,700,'center',310);c.restore();}
 else if(o.component==='lease')G.lease(c,x,y,scale,p.progress);
 else if(o.component==='metric_range'){
  // Animation never presents intermediate fabricated yields as actual source values.
  c.save();c.translate(x,y);c.scale(scale,scale);box(c,-292,-99,584,215,20,C.sage);const values=m.display_text;tx(c,values,0,-9,85,C.green,700,'center',560);tx(c,m.values.length>1?'SOURCE RANGE':'SOURCE VALUE',0,38,21,C.muted,700,'center',560);line(c,-235,77,235,77,C.line,8);line(c,-235,77,-235+470*p.progress,77,C.copper,8);c.restore();
 }else if(o.component==='metric_bar'){
  const h=330*scale,value=m.values[o.value_index],top=y-h,base=y;line(c,x-125*scale,base,x+125*scale,base,C.line,2);box(c,x-75*scale,top,150*scale,h,8,C.sage);const bh=h*value/o.scale_max*p.progress;if(bh>0)box(c,x-75*scale,base-bh,150*scale,bh,8,C.green);tx(c,format(value),x,top-24,44*scale,C.green,700,'center',250);tx(c,'0 → '+format(o.scale_max),x,base+36,20,C.muted,500,'center',300);
 }else throw Error('component_unavailable');
 if(o.label)tx(c,o.label,o.component==='building'?x-70:x,y+(o.component==='queue'?160:o.component==='workspace'?260:100)*scale,23,C.green,700,'center',600);
 if(m){const labels=[m.display_text,m.measure,m.period,m.denominator];let yy=y+148*scale;for(const label of labels){const ls=wrap(c,label,590,20);if(ls.length>2)throw Error('metric_scope_text_too_dense');for(const l of ls){tx(c,l,x,yy,20,C.muted,500,'center',590);yy+=27;}}}
 c.restore();
}
function presenter(c,manifest,t,assets){
 const events=manifest.presenter.events,event=events.findLast(x=>t>=x.time)??events[0],index=events.indexOf(event),previous=events[Math.max(0,index-1)],image=assets.presenter;
 const height=360,foot=1617,x=905;
 c.fillStyle='rgba(23,58,50,.06)';c.beginPath();c.ellipse(x,foot+2,57,9,0,0,Math.PI*2);c.fill();
 const draw=(id,alpha)=>{const pose=manifest.presenter.poses.find(x=>x.id===id),[sx,sy,w,h]=pose.crop;if(sx+w>image.width||sy+h>image.height)throw Error('presenter_crop_outside_asset');const scale=height/h;c.save();c.globalAlpha*=alpha;c.drawImage(image,sx,sy,w,h,x-pose.anchorX*scale,foot-height,w*scale,height);c.restore();};
 let blend=clamp((t-event.time)/.16);blend=blend*blend*(3-2*blend);if(event.pose===previous.pose)draw(event.pose,1);else{draw(previous.pose,1-blend);draw(event.pose,blend);}
}
export function drawSourceRender(c,manifest,time,assets){
 const sample=sampleSourceRender(manifest,time),s=sample.sentence;
 c.save();c.fillStyle=C.white;c.fillRect(0,0,1080,1920);c.lineCap='round';c.lineJoin='round';
 const grad=c.createRadialGradient(430,950,80,430,950,820);grad.addColorStop(0,'#F2F7F1');grad.addColorStop(1,C.white);c.fillStyle=grad;c.fillRect(0,450,1080,1130);
 // Deterministic paper texture, independent of scene time; no atmospheric asset owns numbers.
 let seed=manifest.texture.seed>>>0;c.fillStyle='rgba(38,82,59,.025)';for(let i=0;i<600;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%1080;seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillRect(x,440+seed%1120,1,1);}
 tx(c,'YEEJAY',76,104,25,C.green,700);tx(c,'COMMERCIAL OFFICE REVIEW',1002,104,18,C.muted,500,'right');
 const phase=['problem','mechanism','consequence'].indexOf(s.phase);
 for(let i=0;i<3;i++){line(c,76+i*313,149,349+i*313,149,i<=phase?C.green:C.line,5);tx(c,['01  PROBLEM','02  MECHANISM','03  CONSEQUENCE'][i],76+i*313,188,17,i===phase?C.green:C.muted,i===phase?700:500);}
 const intro=s.transition_duration?clamp((time-s.start)/s.transition_duration):1;c.save();c.globalAlpha=intro;s.headline.forEach((h,i)=>tx(c,h,76,295+i*83+8*(1-intro),65,i?C.green:C.ink,700));c.restore();
 for(const o of sample.objects.values())drawSourceObject(c,o,sample.metrics.get(o.metric_id),time);
 presenter(c,manifest,time,assets);
 const wordIndex=s.words.findIndex(w=>time>=w.start&&time<w.end);
 if(wordIndex>=0){let start=Math.floor(wordIndex/5)*5;const cap=s.words.slice(start,start+5).map(w=>w.word.replace(/^_/,'')).join(' '),ls=wrap(c,cap,900,36);if(ls.length>2)throw Error('caption_density_invalid');ls.forEach((l,i)=>tx(c,l,540,1700+i*44,36,C.ink,500,'center',900));}
 line(c,76,1783,1002,1783,C.line,1);tx(c,'Conceptual graphics · Source assertions unverified',76,1824,20,C.muted);tx(c,manifest.audio.voice_status==='guide'?'GUIDE VOICE · CREATIVE REVIEW':'CREATIVE REVIEW · SOURCE VERIFICATION PENDING',76,1865,16,C.muted);
 c.restore();return sample;
}
