import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';

const C={
  blue:'#1676E8',
  blue2:'#0B4FA8',
  yellow:'#F4C542',
  cyan:'#45D8E8',
  red:'#E44E4E',
  charcoal:'#11151C',
  deep:'#10233E',
  cream:'#F4F1E9',
  gray:'#9AA5B1',
  ink:'#080C12'
};

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const lerp=(a,b,p)=>a+(b-a)*p;
const ease=(frame,a,b)=>interpolate(frame,[a,b],[0,1],clamp);
const fade=(frame,a,b)=>1-ease(frame,a,b);

const Grain=()=>(
  <AbsoluteFill style={{
    opacity:.075,
    backgroundImage:
      'radial-gradient(circle at 20% 20%,rgba(255,255,255,.18) 0 1px,transparent 1px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.12) 0 1px,transparent 1px)',
    backgroundSize:'19px 19px,27px 27px',
    mixBlendMode:'soft-light',
    pointerEvents:'none'
  }}/>
);

const Vignette=({strength=.5})=>(
  <AbsoluteFill style={{
    background:`radial-gradient(circle at 50% 45%,transparent 48%,rgba(0,0,0,${strength}) 100%)`,
    pointerEvents:'none'
  }}/>
);

const Label=({children,x,y,w=300,size=44,color=C.cream,opacity=1,align='left',tracking=.5})=>(
  <div style={{
    position:'absolute',left:x,top:y,width:w,color,opacity,
    fontFamily:'Arial,Helvetica,sans-serif',fontSize:size,fontWeight:900,
    lineHeight:1.02,letterSpacing:tracking,textAlign:align,
    textShadow:'0 8px 22px rgba(0,0,0,.22)'
  }}>{children}</div>
);

const CaptionRule=({x,y,w=120,color=C.yellow,opacity=1})=>(
  <div style={{position:'absolute',left:x,top:y,width:w,height:8,borderRadius:99,background:color,opacity,
    boxShadow:`0 0 22px ${color}55`}}/>
);

const Disc=({x,y,scale=1,opacity=1,rotate=0})=>(
  <div style={{
    position:'absolute',left:x-58*scale,top:y-58*scale,width:116*scale,height:116*scale,
    borderRadius:'50%',
    background:'radial-gradient(circle at 36% 28%,#e76870 0%,#ad2d38 34%,#701b24 76%,#3d0d13 100%)',
    opacity,transform:`perspective(800px) rotateY(${rotate}deg) rotateZ(${rotate*.1}deg)`,
    boxShadow:'0 24px 50px rgba(0,0,0,.32), inset 0 0 0 8px rgba(255,255,255,.08)'
  }}>
    <div style={{position:'absolute',left:'37%',top:'37%',width:'26%',height:'26%',borderRadius:'50%',background:C.cream,opacity:.82}}/>
  </div>
);

const Sleeve=({x,y,scale=1,opacity=1,rotate=-5})=>(
  <div style={{
    position:'absolute',left:x-82*scale,top:y-105*scale,width:164*scale,height:210*scale,
    borderRadius:20*scale,
    background:`linear-gradient(145deg,${C.blue},${C.blue2})`,
    opacity,transform:`perspective(1000px) rotateZ(${rotate}deg) rotateY(${rotate*.35}deg)`,
    boxShadow:'0 28px 62px rgba(0,0,0,.34), inset 0 0 0 5px rgba(255,255,255,.08)',
    overflow:'hidden'
  }}>
    <div style={{position:'absolute',left:'14%',right:'14%',top:'14%',height:'50%',borderRadius:10,background:'rgba(244,241,233,.94)'}}/>
    <div style={{position:'absolute',left:'22%',right:'22%',bottom:'16%',height:8,borderRadius:8,background:C.yellow}}/>
    <div style={{position:'absolute',right:-22,top:-10,width:70,height:250,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)',transform:'rotate(14deg)'}}/>
  </div>
);

const Mailer=({x,y,w=430,h=290,open=0,opacity=1,rotate=0})=>(
  <div style={{
    position:'absolute',left:x-w/2,top:y-h/2,width:w,height:h,opacity,
    borderRadius:30,background:'linear-gradient(180deg,#f7f3e9,#d6cec0)',
    boxShadow:'0 30px 70px rgba(0,0,0,.28)',
    transform:`perspective(1100px) rotateZ(${rotate}deg) rotateX(${lerp(8,0,open)}deg)`,
    overflow:'hidden'
  }}>
    <div style={{position:'absolute',left:0,right:0,top:0,height:'54%',
      background:'linear-gradient(180deg,#eee7db,#cfc5b6)',
      clipPath:'polygon(0 0,100% 0,50% 100%)',
      transformOrigin:'50% 0%',transform:`rotateX(${lerp(0,-132,open)}deg)`}}/>
    <div style={{position:'absolute',left:0,right:0,bottom:0,height:9,background:C.yellow,opacity:.9}}/>
  </div>
);

const TimelineDepth=({frame,start,end})=>{
  const p=ease(frame,start,end);
  const z=lerp(0,170,p);
  return <div style={{
    position:'absolute',left:90,right:90,top:560,height:710,
    transform:`perspective(1000px) rotateX(64deg) translateY(${lerp(120,-60,p)}px) translateZ(${z}px)`,
    transformOrigin:'50% 50%',opacity:fade(frame,end-16,end+3)
  }}>
    <div style={{position:'absolute',left:90,right:70,top:300,height:5,background:'linear-gradient(90deg,rgba(255,255,255,.05),rgba(244,197,66,.7),rgba(255,255,255,.08))'}}/>
    {Array.from({length:9}).map((_,i)=>(
      <div key={i} style={{
        position:'absolute',left:105+i*88,top:270,width:4,height:i===2?110:72,
        borderRadius:4,background:i===2?C.yellow:'rgba(255,255,255,.12)',
        boxShadow:i===2?'0 0 28px rgba(244,197,66,.25)':'none'
      }}/>
    ))}
  </div>;
};

const ChannelCard=({type,x,y,progress,delay=0,index=0})=>{
  const p=Math.max(0,Math.min(1,(progress-delay)/(1-delay)));
  const s=spring({fps:30,frame:p*28,config:{damping:17,stiffness:145,mass:.9}});
  const lift=lerp(105,0,s);
  const rot=lerp(index===0?-10:index===2?10:0,0,s);
  return <div style={{
    position:'absolute',left:x,top:y+lift,width:278,height:348,borderRadius:34,
    background:'linear-gradient(155deg,rgba(42,60,88,.98),rgba(11,20,33,.98))',
    border:'2px solid rgba(255,255,255,.14)',
    boxShadow:'0 32px 80px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.04)',
    opacity:p,transform:`perspective(1000px) rotateY(${rot}deg) scale(${.82+.18*s})`,
    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:38,
    overflow:'hidden'
  }}>
    <div style={{position:'absolute',left:-80,top:-30,width:180,height:460,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)',transform:`translateX(${p*420}px) rotate(16deg)`}}/>
    {type==='MAIL' ? (
      <div style={{width:126,height:86,border:'7px solid #ebe6dc',borderRadius:16,position:'relative'}}>
        <div style={{position:'absolute',left:10,right:10,top:18,height:44,borderTop:'6px solid #ebe6dc',transform:'skewY(-19deg)'}}/>
      </div>
    ) : type==='KIOSK' ? (
      <div style={{width:92,height:138,borderRadius:15,background:'#8d99aa',position:'relative',boxShadow:'inset 0 0 0 5px rgba(255,255,255,.08)'}}>
        <div style={{position:'absolute',left:15,right:15,top:18,height:50,borderRadius:8,background:C.deep}}/>
        <div style={{position:'absolute',left:23,right:23,bottom:23,height:9,borderRadius:5,background:C.cream}}/>
      </div>
    ) : (
      <div style={{width:136,height:92,border:'7px solid '+C.cyan,borderRadius:18,display:'grid',placeItems:'center'}}>
        <div style={{width:0,height:0,borderTop:'22px solid transparent',borderBottom:'22px solid transparent',borderLeft:'34px solid '+C.cyan,marginLeft:8}}/>
      </div>
    )}
    <div style={{fontSize:42,fontWeight:900,color:C.cream,letterSpacing:1}}>{type}</div>
  </div>;
};

const ShelfBank=({x,y,w=560,rows=3,cols=7,depth=0,progress=1})=>(
  <div style={{
    position:'absolute',left:x,top:y,width:w,height:440,opacity:progress,
    transform:`perspective(900px) rotateY(${depth}deg) translateZ(${Math.abs(depth)*2}px)`
  }}>
    {Array.from({length:rows}).map((_,r)=><React.Fragment key={r}>
      <div style={{position:'absolute',left:0,right:0,top:r*138+105,height:14,borderRadius:7,background:'#67768c',boxShadow:'0 8px 18px rgba(0,0,0,.28)'}}/>
      {Array.from({length:cols}).map((_,c)=><div key={c} style={{
        position:'absolute',left:18+c*((w-42)/cols),top:r*138+28,width:46,height:76,
        borderRadius:7,
        background:(r+c)%4===0?C.blue:(r+c)%4===1?C.yellow:(r+c)%4===2?C.cream:'#516074',
        boxShadow:'0 7px 14px rgba(0,0,0,.2)',
        transform:`translateY(${lerp(35,0,progress)}px)`
      }}/>)}
    </React.Fragment>)}
  </div>
);

const ReturnConveyor=({progress})=>{
  const beltShift=(progress*160)%64;
  return <div style={{position:'absolute',left:180,right:130,bottom:86,height:132,borderRadius:28,background:'linear-gradient(180deg,#465266,#222a37)',border:'3px solid rgba(255,255,255,.08)',overflow:'hidden'}}>
    <div style={{position:'absolute',left:-70+beltShift,right:-20,top:36,height:58,background:'repeating-linear-gradient(90deg,#0c121d 0 40px,#303b4c 40px 56px)',opacity:.9}}/>
    <div style={{position:'absolute',left:0,right:0,top:0,height:18,background:'rgba(255,255,255,.06)'}}/>
  </div>;
};

const CutawayRefined=({frame,startFrame,endFrame})=>{
  const local=frame-startFrame;
  const dur=Math.max(1,endFrame-startFrame);
  const enter=ease(local,-8,dur*.18);
  const camera=ease(local,0,dur*.76);
  const shelves=ease(local,dur*.14,dur*.44);
  const returnP=ease(local,dur*.52,dur*.94);
  const light=ease(local,dur*.18,dur*.72);

  const shellScale=lerp(1.08,.84,camera);
  const shellX=lerp(-55,30,camera);
  const shellY=lerp(490,270,camera);

  const caseX=returnP<.42?lerp(770,742,returnP/.42):lerp(742,520,(returnP-.42)/.58);
  const caseY=returnP<.42?lerp(930,1140,returnP/.42):lerp(1140,1330,(returnP-.42)/.58);

  const foreground=ease(local,dur*.12,dur*.58);

  return <>
    <div style={{
      position:'absolute',left:95+shellX,top:shellY,width:945,height:1160,
      borderRadius:56,overflow:'hidden',
      background:`linear-gradient(165deg,rgba(17,55,99,.98),rgba(6,17,31,.99))`,
      border:`10px solid ${C.blue}`,
      boxShadow:'0 80px 150px rgba(0,0,0,.5),0 0 60px rgba(22,118,232,.14)',
      transform:`perspective(1400px) scale(${shellScale}) rotateX(${lerp(5,0,camera)}deg) rotateY(${lerp(-5,0,camera)}deg)`,
      transformOrigin:'52% 20%',opacity:enter
    }}>
      <div style={{position:'absolute',left:0,right:0,top:0,height:160,background:`linear-gradient(90deg,${C.blue2},${C.blue})`}}>
        <div style={{position:'absolute',left:58,top:57,width:350,height:22,borderRadius:12,background:C.yellow,boxShadow:'0 0 28px rgba(244,197,66,.24)'}}/>
      </div>
      <div style={{
        position:'absolute',left:60,top:205,right:60,bottom:70,borderRadius:38,
        background:`radial-gradient(circle at 60% 20%,rgba(69,216,232,${.08+.08*light}) 0%,transparent 28%),linear-gradient(180deg,#152a45,#08111e)`
      }}>
        <ShelfBank x={35} y={30} w={620} rows={3} cols={7} depth={-5} progress={shelves}/>
        <ShelfBank x={120} y={430} w={510} rows={2} cols={6} depth={4} progress={shelves*.92}/>
        <div style={{position:'absolute',right:42,top:60,width:132,height:472,borderRadius:24,background:'linear-gradient(180deg,#2e3d54,#182334)',border:'2px solid rgba(255,255,255,.13)',boxShadow:'0 18px 42px rgba(0,0,0,.36)'}}>
          <div style={{position:'absolute',left:22,right:22,top:62,height:15,borderRadius:7,background:C.yellow,boxShadow:'0 0 18px rgba(244,197,66,.22)'}}/>
          <div style={{position:'absolute',left:27,right:27,bottom:92,height:18,borderRadius:9,background:'#050912',boxShadow:'inset 0 0 0 2px rgba(255,255,255,.05)'}}/>
        </div>
        <ReturnConveyor progress={returnP}/>
      </div>
    </div>

    <Sleeve x={caseX} y={caseY} scale={.58} opacity={returnP} rotate={lerp(-4,8,returnP)}/>

    {/* foreground occluder */}
    <div style={{
      position:'absolute',left:-120,top:980,width:470,height:560,
      background:'linear-gradient(155deg,#0a1421,#15263e)',
      borderRight:'5px solid rgba(255,255,255,.05)',
      transform:`perspective(900px) rotateY(-20deg) translateX(${lerp(-180,10,foreground)}px)`,
      opacity:.86*foreground,
      boxShadow:'40px 0 80px rgba(0,0,0,.34)'
    }}>
      {Array.from({length:12}).map((_,i)=><div key={i} style={{
        position:'absolute',left:55+(i%3)*100,top:90+Math.floor(i/3)*105,width:58,height:82,
        borderRadius:7,background:i%3===0?C.blue:i%3===1?C.cream:C.yellow,opacity:.55
      }}/>)}
    </div>

    {/* integrated layer callouts */}
    <div style={{position:'absolute',left:96,top:465,width:250,height:4,background:C.yellow,opacity:ease(local,0,dur*.18)}}/>
    <Label x={96} y={410} w={250} size={50} color={C.yellow} opacity={ease(local,0,dur*.18)}>STORES</Label>

    <div style={{position:'absolute',left:96,top:820,width:330,height:4,background:'rgba(244,241,233,.62)',opacity:shelves}}/>
    <Label x={96} y={758} w={290} size={50} color={C.cream} opacity={shelves}>SHELVES</Label>

    <div style={{position:'absolute',right:100,top:1270,width:210,height:4,background:C.yellow,opacity:returnP}}/>
    <Label x={760} y={1210} w={250} size={50} color={C.yellow} opacity={returnP}>RETURNS</Label>
  </>;
};

export const ProductionScene=({package:pkg})=>{
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();

  const sm=pkg?.sceneManifest||{};
  const sceneStart=Number(sm.start_sec??5.677);
  const toFrame=(sec)=>Math.round((Number(sec)-sceneStart)*fps);

  const b03Start=toFrame(5.677),b03End=toFrame(8.777);
  const b04Start=toFrame(8.975),b04End=toFrame(11.227);
  const b05Start=toFrame(11.633),b05End=toFrame(15.209);

  const p03=ease(frame,b03Start,b03End);
  const timelineFade=fade(frame,b04Start-5,b04Start+8);

  const discRotate=ease(frame,b03Start+4,b03Start+46);
  const sleeveP=ease(frame,b03Start+36,b03Start+70);
  const routeP=ease(frame,b03Start+42,b03Start+84);
  const mailP=ease(frame,b03Start+54,b03Start+86);

  const discX=lerp(540,300,p03);
  const discY=lerp(890,875,p03);
  const sleeveX=lerp(300,610,sleeveP);
  const sleeveY=lerp(875,1080,sleeveP);

  const channelP=ease(frame,b04Start,b04End-3);
  const channelFade=fade(frame,b05Start-10,b05Start+10);
  const railP=ease(frame,b04Start+4,b04Start+54);

  const cutawayIn=ease(frame,b05Start-8,b05Start+6);
  const darken=ease(frame,b05Start-20,b05Start+22);

  return <AbsoluteFill style={{
    background:`radial-gradient(circle at 50% 12%,rgba(22,118,232,${.17*(1-darken)}) 0%,transparent 38%),linear-gradient(180deg,${C.deep},${C.charcoal})`,
    color:C.cream,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden'
  }}>
    <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'72px 72px',opacity:.48}}/>
    <Grain/>

    {/* B03: spatial timeline */}
    <div style={{opacity:timelineFade}}>
      <Label x={96} y={188} w={860} size={40} color={C.gray}>A NEW CHANNEL APPEARS</Label>
      <CaptionRule x={96} y={252} w={112} opacity={ease(frame,b03Start+10,b03Start+26)}/>
      <Label x={96} y={285} w={500} size={138} color={C.cream} opacity={ease(frame,b03Start+18,b03Start+48)}>2004</Label>
      <Label x={104} y={450} w={760} size={48} color={C.yellow} opacity={ease(frame,b03Start+28,b03Start+58)}>ONLINE RENTALS LAUNCH</Label>

      <TimelineDepth frame={frame} start={b03Start} end={b03End}/>

      <Disc x={discX} y={discY} scale={.76} opacity={1-sleeveP*.95} rotate={discRotate*88}/>

      <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,opacity:timelineFade}}>
        <path d="M 295 1085 C 430 1025, 610 1105, 835 1018" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="18" strokeLinecap="round"/>
        <path d="M 295 1085 C 430 1025, 610 1105, 835 1018" fill="none" stroke={C.yellow} strokeWidth="12" strokeLinecap="round"
          pathLength="1" strokeDasharray="1" strokeDashoffset={1-routeP} style={{filter:'drop-shadow(0 0 14px rgba(244,197,66,.28))'}}/>
      </svg>

      <Sleeve x={sleeveX} y={sleeveY} scale={.74} opacity={sleeveP*(1-mailP*.82)} rotate={lerp(-7,-1,mailP)}/>
      <Mailer x={830} y={1040} w={380} h={250} open={mailP} opacity={mailP}/>
    </div>

    {/* B04: dimensional channel board */}
    <div style={{opacity:(frame>=b04Start?1:0)*channelFade}}>
      <Label x={96} y={200} w={860} size={42} color={C.gray}>THE RESPONSE EXPANDS</Label>
      <CaptionRule x={96} y={268} w={142} opacity={channelP}/>

      <div style={{
        position:'absolute',left:130,top:620,width:820,height:530,
        transform:`perspective(1200px) rotateX(${lerp(10,2,channelP)}deg) scale(${.94+.06*channelP})`,
        transformOrigin:'50% 65%'
      }}>
        <div style={{position:'absolute',left:22,top:410,width:776,height:12,borderRadius:7,background:'rgba(244,197,66,.18)'}}/>
        <div style={{position:'absolute',left:22,top:410,width:776*railP,height:12,borderRadius:7,background:C.yellow,boxShadow:'0 0 30px rgba(244,197,66,.25)'}}/>
        <ChannelCard type="MAIL" x={0} y={0} progress={channelP} delay={0} index={0}/>
        <ChannelCard type="KIOSK" x={272} y={0} progress={channelP} delay={.16} index={1}/>
        <ChannelCard type="ON DEMAND" x={544} y={0} progress={channelP} delay={.32} index={2}/>
      </div>

      <div style={{position:'absolute',left:96,right:96,top:1260,height:1,background:'linear-gradient(90deg,transparent,rgba(69,216,232,.3),transparent)'}}/>
    </div>

    {/* B05: refined physical system cutaway */}
    <div style={{opacity:cutawayIn}}>
      <Label x={96} y={175} w={900} size={39} color={C.gray}>THE DIGITAL CHANNELS WERE ATTACHED TO A PHYSICAL MACHINE</Label>
      <CaptionRule x={96} y={244} w={168} opacity={cutawayIn}/>
      <CutawayRefined frame={frame} startFrame={b05Start} endFrame={b05End}/>
    </div>

    <div style={{position:'absolute',left:96,right:96,bottom:205,height:2,background:'linear-gradient(90deg,transparent,rgba(244,197,66,.45),transparent)',opacity:.52}}/>
    <Vignette strength={.42}/>
  </AbsoluteFill>;
};
