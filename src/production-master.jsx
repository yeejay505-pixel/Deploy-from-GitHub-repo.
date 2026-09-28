import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import {ProductionScene as ProductionS02} from './production-scene.jsx';

const C={blue:'#1676E8',blue2:'#0B4FA8',yellow:'#F4C542',cyan:'#45D8E8',red:'#E44E4E',cream:'#F4F1E9',gray:'#9AA5B1',deep:'#10233E',charcoal:'#11151C',ink:'#080C12',paper:'#EFE9DE'};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const e=(f,a,b)=>interpolate(f,[a,b],[0,1],clamp);
const lerp=(a,b,p)=>a+(b-a)*p;
const local=(sceneStart,sec,fps)=>Math.round((sec-sceneStart)*fps);

const BG=({children,light=false})=><AbsoluteFill style={{
  background:light?'linear-gradient(180deg,#f2ede3,#d8d1c4)':'radial-gradient(circle at 50% 10%,#173154 0%,#101923 38%,#080c12 100%)',
  color:light?C.ink:C.cream,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden'
}}>
  <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)',backgroundSize:'72px 72px',opacity:light?.18:.45}}/>
  {children}
  <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 45%,transparent 48%,rgba(0,0,0,.42) 100%)',pointerEvents:'none'}}/>
</AbsoluteFill>;

const Text=({children,x=96,y=180,w=888,size=60,color=C.cream,opacity=1,align='left'})=><div style={{
  position:'absolute',left:x,top:y,width:w,fontSize:size,fontWeight:900,lineHeight:1.01,
  letterSpacing:size>70?-1.5:.3,color,opacity,textAlign:align,textShadow:'0 9px 26px rgba(0,0,0,.24)'
}}>{children}</div>;

const Rule=({x=96,y=260,w=130,color=C.yellow,opacity=1})=><div style={{position:'absolute',left:x,top:y,width:w,height:8,borderRadius:8,background:color,opacity,boxShadow:`0 0 22px ${color}55`}}/>;

const Pill=({x,y,w=260,h=120,label,color=C.blue,opacity=1,scale=1})=><div style={{
  position:'absolute',left:x,top:y,width:w,height:h,borderRadius:28,background:color,opacity,
  transform:`scale(${scale})`,display:'grid',placeItems:'center',padding:'0 18px',
  boxShadow:'0 24px 54px rgba(0,0,0,.32), inset 0 0 0 2px rgba(255,255,255,.08)',
  fontSize:36,fontWeight:900,textAlign:'center'
}}>{label}</div>;

const Disc=({x,y,r=70,opacity=1})=><div style={{position:'absolute',left:x-r,top:y-r,width:r*2,height:r*2,borderRadius:'50%',background:'radial-gradient(circle at 35% 25%,#e46b75,#9d2d38 48%,#651821)',boxShadow:'0 24px 54px rgba(0,0,0,.34)',opacity}}>
  <div style={{position:'absolute',left:'39%',top:'39%',width:'22%',height:'22%',borderRadius:'50%',background:C.cream}}/>
</div>;

const Storefront=({x,y,w=620,h=450,progress=1,closed=0})=><div style={{
  position:'absolute',left:x,top:y,width:w,height:h,borderRadius:28,
  background:'linear-gradient(180deg,#17477a,#0d1f35)',border:'7px solid '+C.blue,
  boxShadow:'0 36px 80px rgba(0,0,0,.38)',transform:`perspective(1000px) scale(${.88+.12*progress}) rotateY(${lerp(-7,0,progress)}deg)`,overflow:'hidden'
}}>
  <div style={{position:'absolute',left:0,right:0,top:0,height:110,background:C.blue}}>
    <div style={{position:'absolute',left:42,top:44,width:250,height:20,borderRadius:10,background:C.yellow}}/>
  </div>
  <div style={{position:'absolute',left:50,right:50,top:150,bottom:45,display:'grid',gridTemplateColumns:'1fr 1fr',gap:26}}>
    <div style={{borderRadius:18,background:'linear-gradient(180deg,#1b3553,#0d1725)',border:'2px solid rgba(255,255,255,.11)'}}/>
    <div style={{borderRadius:18,background:'linear-gradient(180deg,#1b3553,#0d1725)',border:'2px solid rgba(255,255,255,.11)'}}/>
  </div>
  <div style={{position:'absolute',left:0,right:0,top:110,bottom:0,background:'linear-gradient(180deg,rgba(4,7,12,.15),rgba(4,7,12,.96))',transform:`translateY(${(1-closed)*100}%)`,opacity:closed}}/>
</div>;

const Arrow=({x,y,len=360,progress=1,color=C.blue,rotation=0})=><div style={{position:'absolute',left:x,top:y,width:len*progress,height:22,borderRadius:22,background:color,transform:`rotate(${rotation}deg)`,transformOrigin:'0 50%',boxShadow:`0 0 26px ${color}55`}}>
  <div style={{position:'absolute',right:-22,top:-20,width:0,height:0,borderTop:'31px solid transparent',borderBottom:'31px solid transparent',borderLeft:`42px solid ${color}`}}/>
</div>;

const S01=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b1a=local(start,0.058,fps),b1b=local(start,3.669,fps),b2a=local(start,3.866,fps),b2b=local(start,5.457,fps);
  const p1=e(f,b1a,b1b),p2=e(f,b2a,b2b),collapse=e(f,b1a+58,b1b-4);
  const facadeOpacity=1-e(f,b2a-8,b2a+3);
  const screenScale=lerp(1,.62,collapse);
  return <BG>
    <div style={{opacity:facadeOpacity}}>
      <Text y={180} size={48} color={C.gray}>THE OBVIOUS EXPLANATION ISN'T THE WHOLE STORY</Text>
      <Rule y={250} opacity={e(f,b1a+8,b1a+22)}/>
      <Storefront x={210} y={515} w={660} h={510} progress={e(f,b1a,b1a+25)}/>
      <div style={{position:'absolute',left:260,top:590,width:560,height:315,borderRadius:28,border:'8px solid '+C.cyan,background:'rgba(4,10,18,.82)',transform:`scale(${screenScale}) rotateZ(${lerp(0,-2,collapse)}deg)`,opacity:e(f,b1a+20,b1a+48)}}>
        <div style={{position:'absolute',left:'44%',top:'34%',width:0,height:0,borderTop:'50px solid transparent',borderBottom:'50px solid transparent',borderLeft:'78px solid '+C.cyan}}/>
      </div>
      <Text y={1130} size={84} align="center" opacity={e(f,b1a+12,b1a+38)}>IT TRIED STREAMING.</Text>
      <Text y={1250} size={70} color={C.yellow} align="center" opacity={e(f,b1a+60,b1a+82)}>WHY DID IT COLLAPSE?</Text>
    </div>
    <div style={{opacity:p2}}>
      <Disc x={540} y={740} r={115} opacity={1-p2*.3}/>
      {[
        ['PRICE',170,430,C.yellow],['MAIL',690,440,C.blue],['KIOSK',135,900,'#536176'],
        ['DIGITAL',690,910,C.cyan],['DEBT',160,1270,C.red],['STORES',685,1280,C.blue]
      ].map(([t,x,y,c],i)=><Pill key={t} x={x} y={y} w={250} h={115} label={t} color={c} opacity={e(f,b2a+i*3,b2a+18+i*3)} scale={lerp(.82,1,e(f,b2a+i*3,b2a+18+i*3))}/>)}
      <Text y={1550} size={62} align="center">NETFLIX ≠ THE WHOLE STORY</Text>
    </div>
  </BG>;
};

const S03=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b6a=local(start,15.685,fps),b6b=local(start,18.634,fps),b7a=local(start,18.692,fps),b7b=local(start,22.5,fps),b8a=local(start,22.906,fps),b8b=local(start,26.064,fps);
  const p6=e(f,b6a,b6b),p7=e(f,b7a,b7b),p8=e(f,b8a,b8b);
  const hide6=e(f,b7a-5,b7a+4),hide7=e(f,b8a-5,b8a+4);
  const water=lerp(420,155,p8);
  return <BG>
    <div style={{opacity:1-hide6}}>
      <Text y={170} size={45} color={C.gray}>THE CUSTOMER JOURNEY GETS EASIER</Text><Rule y={238}/>
      <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
        <path d="M 175 1310 C 120 1100,220 920,140 760 C 80 650,180 500,340 440" fill="none" stroke="rgba(244,197,66,.18)" strokeWidth="20"/>
        <path d="M 175 1310 C 120 1100,220 920,140 760 C 80 650,180 500,340 440" fill="none" stroke={C.yellow} strokeWidth="13" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p6} strokeLinecap="round"/>
        <path d="M 230 1310 C 510 1120,710 820,830 500" fill="none" stroke="rgba(69,216,232,.18)" strokeWidth="20"/>
        <path d="M 230 1310 C 510 1120,710 820,830 500" fill="none" stroke={C.cyan} strokeWidth="13" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p6} strokeLinecap="round"/>
      </svg>
      <Pill x={80} y={530} w={290} label="STORE TRIP" color="#3b485b" opacity={e(f,b6a+15,b6a+35)}/>
      <Pill x={665} y={500} w={300} label="DVD BY MAIL" color={C.cyan} opacity={e(f,b6a+35,b6a+60)}/>
      <div style={{position:'absolute',left:120,top:1280,width:120,height:120,borderRadius:'50%',background:C.cream,boxShadow:'0 20px 44px rgba(0,0,0,.32)'}}/>
    </div>
    <div style={{opacity:p7*(1-hide7)}}>
      <Text y={170} size={46} color={C.gray}>CHOICE FANS OUT</Text><Rule y={238}/>
      <div style={{position:'absolute',left:430,top:880,width:220,height:220,borderRadius:'50%',background:C.cream,boxShadow:'0 26px 60px rgba(0,0,0,.36)'}}/>
      {[
        ['MAIL',120,480,C.blue],['CHEAP KIOSK',690,480,'#5a6677'],['BUY DVD',100,1240,C.yellow],['ON DEMAND',685,1240,C.cyan]
      ].map(([t,x,y,c],i)=><React.Fragment key={t}><Pill x={x} y={y} w={290} h={125} label={t} color={c} opacity={e(f,b7a+8+i*8,b7a+35+i*8)}/><Arrow x={540} y={980} len={300} rotation={[-130,-50,135,45][i]} progress={e(f,b7a+5+i*5,b7a+32+i*5)} color={i===3?C.cyan:C.yellow}/></React.Fragment>)}
    </div>
    <div style={{opacity:p8}}>
      <Text y={165} size={43} color={C.gray}>NEW SERVICES STILL DEPENDED ON THE OLD MACHINE</Text><Rule y={235}/>
      <div style={{position:'absolute',left:120,top:540,width:650,height:770,border:'10px solid '+C.cream,borderRadius:40,overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,.36)'}}>
        <div style={{position:'absolute',left:0,right:0,bottom:0,height:water,background:'linear-gradient(180deg,'+C.blue+','+C.blue2+')',transition:'none'}}/>
        <div style={{position:'absolute',left:250,top:590,width:12,height:170,background:C.red,transform:`rotate(${lerp(-18,12,p8)}deg)`,boxShadow:'0 0 20px rgba(228,78,78,.4)'}}/>
      </div>
      {['MAIL','KIOSK','DIGITAL'].map((t,i)=><Pill key={t} x={805} y={610+i*220} w={220} h={105} label={t} color={i===2?C.cyan:C.blue} opacity={e(f,b8a+10+i*6,b8a+28+i*6)}/>)}
      {Array.from({length:12}).map((_,i)=><div key={i} style={{position:'absolute',left:740+((i%3)*55),top:760+Math.floor(i/3)*78,width:24,height:24,borderRadius:'50%',background:C.yellow,opacity:e(f,b8a+20+i*2,b8a+35+i*2)}}/>)}
      <Text y={1435} size={54} color={C.red} align="center">STORE BUSINESS SHRINKS</Text>
    </div>
  </BG>;
};

const S04=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b9a=local(start,26.819,fps),b9b=local(start,30.186,fps),b10a=local(start,30.383,fps),b10b=local(start,33.158,fps);
  const p9=e(f,b9a,b9b),p10=e(f,b10a,b10b),max=5.5;
  const h08=900*(5.07/max),h09=900*(4.06/max);
  const activeH=lerp(h08,h09,p10);
  return <BG>
    <Text y={165} size={44} color={C.gray}>REVENUE</Text><Rule y={235}/>
    <div style={{position:'absolute',left:120,right:120,bottom:335,height:5,background:'rgba(255,255,255,.32)'}}/>
    <div style={{position:'absolute',left:220,bottom:340,width:280,height:h08*p9,borderRadius:'26px 26px 0 0',background:'rgba(22,118,232,.22)',border:'3px solid rgba(22,118,232,.38)'}}/>
    <div style={{position:'absolute',left:580,bottom:340,width:280,height:activeH*p9,borderRadius:'26px 26px 0 0',background:`linear-gradient(180deg,${p10>.02?C.yellow:C.blue},${p10>.02?'#a47d18':C.blue2})`,boxShadow:'0 24px 55px rgba(0,0,0,.33)'}}/>
    <Text x={575} y={450} w={300} size={88} align="center" opacity={1-p10}>$5.07B</Text>
    <Text x={575} y={450} w={300} size={88} align="center" color={C.yellow} opacity={p10}>$4.06B</Text>
    <Text x={220} y={1510} w={280} size={48} align="center" color={C.gray}>2008</Text>
    <Text x={580} y={1510} w={280} size={48} align="center" color={p10?C.yellow:C.gray}>{p10>.5?'2009':'2008'}</Text>
    <div style={{position:'absolute',left:885,top:690,width:18,height:lerp(0,330,p10),background:C.red,borderRadius:9,boxShadow:'0 0 25px rgba(228,78,78,.35)'}}/>
    <div style={{position:'absolute',left:855,top:690,width:78,height:18,background:C.red,borderRadius:9,opacity:p10}}/>
    <div style={{position:'absolute',left:855,top:1002,width:78,height:18,background:C.red,borderRadius:9,opacity:p10}}/>
  </BG>;
};

const Chain=({x,y,count=10,p=1})=><div style={{position:'absolute',left:x,top:y,width:520,height:100}}>
  {Array.from({length:count}).map((_,i)=><div key={i} style={{
    position:'absolute',left:i*48,top:12+Math.sin(i*.7)*8,width:64,height:36,border:'10px solid #778392',borderRadius:26,
    transform:`rotate(${i%2?8:-8}deg) scale(${lerp(.6,1,p)})`,opacity:e(p,0,1)
  }}/>)}
</div>;

const S05=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b11a=local(start,33.715,fps),b11b=local(start,35.213,fps),b12a=local(start,35.77,fps),b12b=local(start,40.229,fps);
  const p11=e(f,b11a,b11b),p12=e(f,b12a,b12b),drop=e(f,b12a+35,b12a+82);
  const arrowRot=lerp(-10,35,p11)-18*e(f,b11a+20,b11b);
  return <BG>
    <Text y={170} size={46} color={C.gray}>THE PIVOT GETS HARDER</Text><Rule y={240}/>
    <div style={{position:'absolute',left:155,top:820,width:770,height:14,borderRadius:7,background:'rgba(255,255,255,.09)'}}/>
    <Arrow x={360} y={810} len={410} progress={1} color={C.blue} rotation={arrowRot}/>
    <Pill x={110} y={1050} w={260} label="STORE" color="#435064"/>
    <Pill x={700} y={1050} w={260} label="DIGITAL" color={C.cyan}/>
    <Chain x={170} y={535} count={11} p={p11}/>
    <Text y={1340} size={57} color={C.red} align="center" opacity={p11}>DEBT MADE THE PIVOT HARDER</Text>
    <div style={{
      position:'absolute',left:190,top:lerp(-420,430,drop),width:700,height:330,borderRadius:52,
      background:'linear-gradient(180deg,#a9343e,#691a22)',border:'4px solid rgba(255,255,255,.08)',
      boxShadow:'0 60px 100px rgba(0,0,0,.48)',opacity:p12
    }}>
      <Text x={45} y={72} w={610} size={52} color={C.cream} align="center">2010</Text>
      <Text x={45} y={145} w={610} size={68} color={C.cream} align="center">NEARLY $1 BILLION DEBT</Text>
    </div>
    <div style={{position:'absolute',left:150,right:150,top:1165,height:8,borderRadius:8,background:C.red,opacity:drop}}/>
  </BG>;
};

const S06=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b13a=local(start,40.635,fps),b13b=local(start,44.861,fps),b14a=local(start,45.267,fps),b14b=local(start,48.24,fps);
  const p13=e(f,b13a,b13b),legal=e(f,b14a,b14a+22);
  return <BG light>
    <div style={{opacity:1-legal}}>
      <Text y={170} size={46} color="#3f4856">CAPITAL VS CONVENIENCE</Text><Rule y={240}/>
      <div style={{position:'absolute',left:100,top:590,width:380,height:760,borderRadius:44,background:'#202d3f',boxShadow:'0 28px 70px rgba(0,0,0,.25)'}}/>
      <div style={{position:'absolute',right:100,top:590,width:380,height:760,borderRadius:44,background:'#d7e8ea',boxShadow:'0 28px 70px rgba(0,0,0,.18)'}}/>
      <div style={{position:'absolute',left:420,top:570,width:240,height:800,borderRadius:28,background:C.red,boxShadow:'0 26px 70px rgba(0,0,0,.32)'}}/>
      {Array.from({length:6}).map((_,i)=><div key={i} style={{
        position:'absolute',left:180+(i%2)*135,top:720+Math.floor(i/2)*170,width:74,height:74,borderRadius:'50%',
        background:C.blue,transform:`translateX(${lerp(0,Math.min(120,i*14),p13)}px)`
      }}/>)}
      <Text x={110} y={1415} w={360} size={42} color={C.red} align="center">LIMITED INVESTMENT</Text>
      <Text x={610} y={1415} w={360} size={42} color="#254a52" align="center">CHEAPER + MORE CONVENIENT</Text>
    </div>
    <div style={{opacity:legal}}>
      <div style={{position:'absolute',left:145,top:430,width:790,height:990,borderRadius:38,background:'#fffdf8',border:'3px solid #c6bcae',boxShadow:'0 36px 90px rgba(0,0,0,.22)',transform:`scale(${lerp(.93,1,legal)}) rotate(${lerp(2,0,legal)}deg)`}}>
        {Array.from({length:8}).map((_,i)=><div key={i} style={{position:'absolute',left:90,right:90,top:250+i*70,height:10,borderRadius:5,background:'rgba(20,24,29,.10)'}}/>)}
        <Text x={70} y={95} w={650} size={84} color={C.ink}>CHAPTER 11</Text>
        <div style={{position:'absolute',left:135,top:680,width:520,height:150,border:'14px solid '+C.red,color:C.red,display:'grid',placeItems:'center',fontSize:56,fontWeight:900,transform:'rotate(-6deg)'}}>SEPTEMBER 2010</div>
      </div>
    </div>
  </BG>;
};

const S07=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b15a=local(start,48.646,fps),b15b=local(start,50.945,fps),b16a=local(start,51.026,fps),b16b=local(start,54.544,fps);
  const p15=e(f,b15a,b15b),p16=e(f,b16a,b16b);
  return <BG>
    <div style={{opacity:1-e(f,b16a-6,b16a+4)}}>
      <Text y={170} size={48} color={C.gray}>THE ASSETS CHANGE HANDS</Text><Rule y={240}/>
      <Pill x={90} y={720} w={300} h={300} label="ASSETS" color={C.blue}/>
      <Pill x={690} y={720} w={300} h={300} label="DISH" color="#475568"/>
      <div style={{position:'absolute',left:lerp(200,700,p15),top:920,width:220,height:155,borderRadius:24,background:C.yellow,boxShadow:'0 26px 55px rgba(0,0,0,.3)',display:'grid',placeItems:'center',fontSize:34,fontWeight:900,color:C.ink}}>CRATE</div>
      <Text y={1280} size={58} color={C.yellow} align="center" opacity={p15}>2011</Text>
    </div>
    <div style={{opacity:p16}}>
      <Text y={170} size={46} color={C.gray}>THEN THE STOREFRONTS GO DARK</Text><Rule y={240}/>
      {Array.from({length:5}).map((_,i)=>{
        const px=75+(i%2)*520, py=420+Math.floor(i/2)*420;
        const shut=e(f,b16a+20+i*10,b16a+42+i*10);
        return <div key={i} style={{opacity:e(f,b16a+5+i*4,b16a+18+i*4),transform:`scale(${i===4?.78:.62})`}}><Storefront x={px} y={py} w={i===4?760:650} h={430} progress={1} closed={shut}/></div>
      })}
      <Text y={1570} size={64} color={C.yellow} align="center">EARLY 2014</Text>
    </div>
  </BG>;
};

const S08=({pkg})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),s=pkg.sceneManifest,start=Number(s.start_sec);
  const b17a=local(start,54.951,fps),b17b=local(start,59.026,fps),p=e(f,b17a,b17b);
  return <BG>
    <Text y={170} size={46} color={C.gray}>THE REAL STORY WASN'T ONE MISSED MOVE</Text><Rule y={240}/>
    <div style={{position:'absolute',left:80,top:570,width:365,height:230,borderRadius:34,background:C.blue,boxShadow:'0 30px 75px rgba(0,0,0,.34)',display:'grid',placeItems:'center',fontSize:48,fontWeight:900,textAlign:'center'}}>COSTLY<br/>STORES</div>
    <div style={{position:'absolute',right:80,top:570,width:365,height:230,borderRadius:34,background:C.red,boxShadow:'0 30px 75px rgba(0,0,0,.34)',display:'grid',placeItems:'center',fontSize:52,fontWeight:900}}>DEBT</div>
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
      <path d="M 260 825 C 350 990, 440 1100, 505 1200" fill="none" stroke={C.blue} strokeWidth="18" strokeLinecap="round"/>
      <path d="M 820 825 C 730 990, 640 1100, 575 1200" fill="none" stroke={C.red} strokeWidth="18" strokeLinecap="round"/>
      <path d="M 430 1180 L 650 1180 L 605 1420 L 475 1420 Z" fill={C.yellow} opacity={.9}/>
    </svg>
    <Arrow x={475} y={1335} len={180} progress={e(f,b17a+40,b17a+84)} color={C.blue}/>
    <Text y={1505} size={78} align="center" opacity={e(f,b17a+40,b17a+78)}>SLOW PIVOT</Text>
    <Text y={1645} size={42} color={C.gray} align="center" opacity={e(f,b17a+65,b17a+98)}>COSTLY STORES + DEBT</Text>
  </BG>;
};

const registry={S01,S03,S04,S05,S06,S07,S08};

export const ProductionMaster=({package:pkg})=>{
  const id=pkg?.sceneManifest?.scene_id;
  if(id==='S02') return <ProductionS02 package={pkg}/>;
  const Comp=registry[id]||S01;
  return <Comp pkg={pkg}/>;
};
