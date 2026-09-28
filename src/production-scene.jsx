import React from 'react';
import {AbsoluteFill,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';

const C={
  blue:'#1676E8',
  yellow:'#F4C542',
  cyan:'#45D8E8',
  red:'#E44E4E',
  charcoal:'#11151C',
  deep:'#10233E',
  cream:'#F4F1E9',
  gray:'#9AA5B1',
  ink:'#0B0F16'
};
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const ease=(frame,a,b)=>interpolate(frame,[a,b],[0,1],clamp);
const mix=(p,a,b)=>a+(b-a)*p;

const Grain=()=>(
  <AbsoluteFill style={{
    opacity:.08,
    backgroundImage:
      'radial-gradient(circle at 20% 20%,rgba(255,255,255,.18) 0 1px,transparent 1px),radial-gradient(circle at 70% 60%,rgba(255,255,255,.12) 0 1px,transparent 1px)',
    backgroundSize:'19px 19px, 27px 27px',
    mixBlendMode:'soft-light',
    pointerEvents:'none'
  }}/>
);

const Label=({children,x,y,w=260,accent=C.cream,size=44,align='left',opacity=1})=>(
  <div style={{
    position:'absolute',left:x,top:y,width:w,color:accent,fontFamily:'Arial,Helvetica,sans-serif',
    fontSize:size,fontWeight:900,letterSpacing:size>55?-1.5:.5,lineHeight:1.02,textAlign:align,opacity
  }}>{children}</div>
);

const Route=({frame,start=0,end=45,y=1010})=>{
  const p=ease(frame,start,end);
  return (
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
      <path d={`M 155 ${y} C 350 ${y-80}, 635 ${y+55}, 915 ${y-45}`}
        fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="14" strokeLinecap="round"/>
      <path d={`M 155 ${y} C 350 ${y-80}, 635 ${y+55}, 915 ${y-45}`}
        fill="none" stroke={C.yellow} strokeWidth="12" strokeLinecap="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}
        style={{filter:'drop-shadow(0 0 14px rgba(244,197,66,.26))'}}/>
    </svg>
  );
};

const Disc=({x,y,scale=1,opacity=1,rotate=0})=>(
  <div style={{
    position:'absolute',left:x-58*scale,top:y-58*scale,width:116*scale,height:116*scale,
    borderRadius:'50%',background:'linear-gradient(145deg,#c94049,#7e1f2a)',opacity,
    transform:`rotateY(${rotate}deg)`,
    boxShadow:'0 18px 40px rgba(0,0,0,.28), inset 0 0 0 10px rgba(255,255,255,.08)'
  }}>
    <div style={{position:'absolute',left:'39%',top:'39%',width:'22%',height:'22%',borderRadius:'50%',background:C.cream,opacity:.8}}/>
  </div>
);

const Sleeve=({x,y,scale=1,opacity=1,rotate=0})=>(
  <div style={{
    position:'absolute',left:x-82*scale,top:y-105*scale,width:164*scale,height:210*scale,
    borderRadius:18*scale,background:`linear-gradient(145deg,${C.blue},#0a4fac)`,opacity,
    transform:`rotate(${rotate}deg)`,
    boxShadow:'0 22px 50px rgba(0,0,0,.28), inset 0 0 0 5px rgba(255,255,255,.08)'
  }}>
    <div style={{position:'absolute',left:'15%',right:'15%',top:'15%',height:'48%',borderRadius:10,background:'rgba(244,241,233,.9)'}}/>
    <div style={{position:'absolute',left:'25%',right:'25%',bottom:'15%',height:8,borderRadius:5,background:C.yellow}}/>
  </div>
);

const Mailer=({x,y,w=430,h=290,open=0,opacity=1})=>(
  <div style={{
    position:'absolute',left:x-w/2,top:y-h/2,width:w,height:h,opacity,
    borderRadius:28,background:'linear-gradient(180deg,#f7f3e9,#d9d3c6)',
    boxShadow:'0 26px 60px rgba(0,0,0,.24)',overflow:'hidden',
    transform:`perspective(900px) rotateX(${mix(open,8,0)}deg)`
  }}>
    <div style={{position:'absolute',left:0,right:0,top:0,height:'54%',
      background:'linear-gradient(180deg,#ece5d7,#cfc5b6)',
      clipPath:'polygon(0 0,100% 0,50% 100%)',
      transformOrigin:'50% 0%',transform:`rotateX(${mix(open,0,-125)}deg)`}}/>
    <div style={{position:'absolute',left:0,right:0,bottom:0,height:8,background:C.yellow,opacity:.9}}/>
  </div>
);

const CardIcon=({type})=>{
  if(type==='MAIL') return <div style={{width:118,height:78,border:'7px solid #e9e5db',borderRadius:15,position:'relative'}}>
    <div style={{position:'absolute',left:10,top:14,right:10,bottom:14,borderTop:'6px solid #e9e5db',transform:'skewY(-19deg)'}}/>
  </div>;
  if(type==='KIOSK') return <div style={{width:86,height:130,borderRadius:14,background:'#8d99aa',position:'relative',boxShadow:'inset 0 0 0 5px rgba(255,255,255,.1)'}}>
    <div style={{position:'absolute',left:14,right:14,top:16,height:48,borderRadius:8,background:C.deep}}/>
    <div style={{position:'absolute',left:20,right:20,bottom:22,height:8,borderRadius:4,background:C.cream}}/>
  </div>;
  return <div style={{width:126,height:86,border:'7px solid '+C.cyan,borderRadius:16,display:'grid',placeItems:'center'}}>
    <div style={{width:0,height:0,borderTop:'22px solid transparent',borderBottom:'22px solid transparent',borderLeft:'34px solid '+C.cyan,marginLeft:8}}/>
  </div>;
};

const ChannelCard=({type,x,y,progress,delay=0})=>{
  const p=Math.max(0,Math.min(1,(progress-delay)/(1-delay)));
  const lift=interpolate(p,[0,1],[80,0],clamp);
  return <div style={{
    position:'absolute',left:x,top:y+lift,width:272,height:330,borderRadius:32,
    background:'linear-gradient(160deg,rgba(36,52,77,.96),rgba(14,24,39,.96))',
    border:'2px solid rgba(255,255,255,.13)',boxShadow:'0 28px 75px rgba(0,0,0,.38)',
    opacity:p,transform:`scale(${.86+.14*p})`,display:'flex',flexDirection:'column',
    alignItems:'center',justifyContent:'center',gap:36
  }}>
    <CardIcon type={type}/>
    <div style={{fontFamily:'Arial,sans-serif',fontWeight:900,fontSize:42,color:C.cream,letterSpacing:1}}>{type}</div>
  </div>
};

const Shelf=({x,y,w=520,rows=3,cols=6,opacity=1})=>(
  <div style={{position:'absolute',left:x,top:y,width:w,height:420,opacity}}>
    {Array.from({length:rows}).map((_,r)=><React.Fragment key={r}>
      <div style={{position:'absolute',left:0,right:0,top:r*132+100,height:12,borderRadius:6,background:'#657287',boxShadow:'0 7px 18px rgba(0,0,0,.25)'}}/>
      {Array.from({length:cols}).map((_,c)=><div key={c} style={{
        position:'absolute',left:22+c*((w-50)/cols),top:r*132+28,width:48,height:72,
        borderRadius:7,background:c%3===0?C.blue:c%3===1?C.cream:C.yellow,
        boxShadow:'0 6px 14px rgba(0,0,0,.18)'
      }}/>)}
    </React.Fragment>)}
  </div>
);

const StoreCutaway=({frame,startFrame,endFrame})=>{
  const local=frame-startFrame;
  const dur=Math.max(1,endFrame-startFrame);
  const p=Math.max(0,Math.min(1,local/dur));
  const cam=ease(local,0,dur*.72);
  const shelfIn=ease(local,dur*.19,dur*.5);
  const ret=ease(local,dur*.54,dur*.92);
  const shellScale=mix(cam,1,.78);
  const shellY=mix(cam,500,300);

  const caseX=ret<.48?mix(ret/.48,730,720):mix((ret-.48)/.52,720,525);
  const caseY=ret<.48?mix(ret/.48,870,1135):mix((ret-.48)/.52,1135,1345);

  return <>
    <div style={{
      position:'absolute',left:85,top:shellY,width:910,height:1110,borderRadius:54,
      background:'linear-gradient(155deg,#173865,#0b1c32)',border:'9px solid '+C.blue,
      transform:`perspective(1300px) scale(${shellScale}) rotateX(${mix(cam,3,0)}deg)`,
      transformOrigin:'50% 20%',boxShadow:'0 70px 120px rgba(0,0,0,.45)',
      overflow:'hidden'
    }}>
      <div style={{position:'absolute',left:0,right:0,top:0,height:150,background:C.blue}}>
        <div style={{position:'absolute',left:62,top:54,width:330,height:24,borderRadius:12,background:C.yellow,opacity:.9}}/>
        <div style={{position:'absolute',right:62,top:48,width:120,height:46,borderRadius:12,background:'rgba(255,255,255,.12)'}}/>
      </div>
      <div style={{position:'absolute',left:70,top:205,right:70,bottom:80,borderRadius:34,background:'linear-gradient(180deg,#13263e,#0c1422)'}}>
        <Shelf x={50} y={35} w={630} opacity={shelfIn}/>
        <div style={{position:'absolute',right:45,top:70,width:125,height:440,borderRadius:22,background:'#26364b',border:'2px solid rgba(255,255,255,.12)'}}>
          <div style={{position:'absolute',left:20,right:20,top:58,height:14,borderRadius:7,background:C.yellow}}/>
          <div style={{position:'absolute',left:25,right:25,bottom:85,height:16,borderRadius:8,background:'#09111c'}}/>
        </div>
        <div style={{position:'absolute',left:170,right:125,bottom:92,height:120,borderRadius:26,background:'linear-gradient(180deg,#3b4656,#222b39)',border:'3px solid rgba(255,255,255,.08)'}}>
          {Array.from({length:8}).map((_,i)=><div key={i} style={{position:'absolute',left:30+i*65,top:34,width:40,height:40,borderRadius:'50%',background:'#111720',boxShadow:'inset 0 0 0 8px #5d6879'}}/>)}
        </div>
      </div>
    </div>
    <Sleeve x={caseX} y={caseY} scale={.6} opacity={ret} rotate={ret*9}/>
    <Label x={115} y={410} w={280} size={48} accent={C.yellow} opacity={ease(local,0,dur*.2)}>STORES</Label>
    <Label x={120} y={765} w={280} size={48} accent={C.cream} opacity={shelfIn}>SHELVES</Label>
    <Label x={650} y={1230} w={300} size={48} accent={C.yellow} opacity={ret}>RETURNS</Label>
  </>;
};

export const ProductionScene=({package:pkg})=>{
  const frame=useCurrentFrame();
  const {fps,durationInFrames}=useVideoConfig();
  const sm=pkg?.sceneManifest||{};
  const sceneStart=Number(sm.start_sec??5.677);
  const toFrame=(sec)=>Math.round((Number(sec)-sceneStart)*fps);

  const b03Start=toFrame(5.677),b03End=toFrame(8.777);
  const b04Start=toFrame(8.975),b04End=toFrame(11.227);
  const b05Start=toFrame(11.633),b05End=toFrame(15.209);

  const p03=ease(frame,b03Start,b03End);
  const p04=ease(frame,b04Start,b04End);
  const timelineOut=ease(frame,b04Start-5,b04Start+8);
  const channelOut=ease(frame,b05Start-8,b05Start+10);

  const discX=mix(p03,540,270),discY=mix(p03,865,860);
  const sleeveP=ease(frame,b03Start+38,b03Start+72);
  const sleeveX=mix(sleeveP,270,610),sleeveY=mix(sleeveP,860,1030);
  const mailP=ease(frame,b03Start+48,b03Start+83);

  const channelP=ease(frame,b04Start,b04End-4);

  const bgShift=ease(frame,b05Start-15,b05Start+25);
  const topTitleOpacity=1-ease(frame,b05Start-10,b05Start+5);

  return <AbsoluteFill style={{
    background:`radial-gradient(circle at 50% 10%,rgba(22,118,232,${.16*(1-bgShift)}) 0%,transparent 42%),linear-gradient(180deg,${C.deep},${C.charcoal})`,
    color:C.cream,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden'
  }}>
    <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'72px 72px',opacity:.55}}/>
    <Grain/>

    {/* B03 — 2004 timeline */}
    <div style={{opacity:1-timelineOut,transform:`translateY(${-40*timelineOut}px)`}}>
      <Label x={96} y={205} w={888} size={42} accent={C.gray}>A NEW CHANNEL APPEARS</Label>
      <Label x={96} y={265} w={500} size={132} accent={C.cream} opacity={ease(frame,b03Start+22,b03Start+52)}>2004</Label>
      <Label x={102} y={420} w={700} size={48} accent={C.yellow} opacity={ease(frame,b03Start+28,b03Start+58)}>ONLINE RENTALS LAUNCH</Label>

      <div style={{position:'absolute',left:140,top:865,width:800,height:3,background:'rgba(255,255,255,.12)'}}/>
      {Array.from({length:7}).map((_,i)=><div key={i} style={{position:'absolute',left:150+i*126,top:846,width:3,height:42,background:i===1?C.yellow:'rgba(255,255,255,.18)'}}/>)}
      <Disc x={discX} y={discY} scale={.72} opacity={1-sleeveP*.9} rotate={p03*82}/>
      <Route frame={frame} start={b03Start+42} end={b03Start+82} y={1080}/>
      <Sleeve x={sleeveX} y={sleeveY} scale={.72} opacity={sleeveP*(1-mailP*.78)} rotate={-5+mailP*5}/>
      <Mailer x={815} y={1032} w={370} h={245} open={1-mailP} opacity={mailP}/>
    </div>

    {/* B04 — channel board */}
    <div style={{opacity:(frame>=b04Start?1:0)*(1-channelOut)}}>
      <Label x={96} y={220} w={850} size={46} accent={C.gray} opacity={topTitleOpacity}>THE RESPONSE EXPANDS</Label>
      <div style={{position:'absolute',left:144,top:1088,width:792,height:12,borderRadius:6,background:C.yellow,opacity:.8,boxShadow:'0 0 26px rgba(244,197,66,.25)'}}/>
      <ChannelCard type="MAIL" x={100} y={635} progress={channelP} delay={0}/>
      <ChannelCard type="KIOSK" x={404} y={635} progress={channelP} delay={.18}/>
      <ChannelCard type="ON DEMAND" x={708} y={635} progress={channelP} delay={.36}/>
    </div>

    {/* B05 — premium cutaway fallback */}
    {frame>=b05Start-8 && <div style={{opacity:ease(frame,b05Start-8,b05Start+5)}}>
      <Label x={96} y={190} w={880} size={42} accent={C.gray}>BUT THE OPERATING SYSTEM WAS PHYSICAL</Label>
      <StoreCutaway frame={frame} startFrame={b05Start} endFrame={b05End}/>
    </div>}

    {/* subtle continuity footer */}
    <div style={{position:'absolute',left:96,right:96,bottom:210,height:2,background:'linear-gradient(90deg,transparent,rgba(244,197,66,.45),transparent)',opacity:.55}}/>
  </AbsoluteFill>;
};
