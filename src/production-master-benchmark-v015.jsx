import React from 'react';
import {AbsoluteFill,OffthreadVideo,Sequence,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';

const C={bg:'#151515',panel:'#242724',ivory:'#F2EEE6',green:'#365B49',blue:'#2C78D4',amber:'#C89138',muted:'#A6A49D'};
const cl={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const prog=(f,a,b)=>interpolate(f,[a,b],[0,1],cl);
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const parse=(v,d=[])=>{if(Array.isArray(v)||v&&typeof v==='object')return v;try{return JSON.parse(String(v||''));}catch{return d;}};
const recipe=(pkg,id)=>(pkg.recipes||[]).find(r=>String(r.beat_id)===String(id))||{};
const asset=(pkg,id)=>(pkg.assetTasks||[]).find(a=>String(a.asset_id)===String(id))||{};
const texts=(r)=>{const e=r&&r.props_schema&&r.props_schema.entries||[];const x=e.find(v=>v.name==='onScreenText');return parse(x&&x.value,[]);};
const summary=(r)=>String(r&&r.props_schema&&r.props_schema.summary||'');

const Base=({children})=><AbsoluteFill style={{background:'radial-gradient(circle at 50% 8%,#30352f 0%,#20231f 38%,#151515 78%,#0d0e0d 100%)',color:C.ivory,fontFamily:'Arial,Helvetica,sans-serif',overflow:'hidden'}}>
  <div style={{position:'absolute',inset:0,background:'linear-gradient(115deg,rgba(255,255,255,.025),transparent 40%,rgba(54,91,73,.08) 78%,transparent)'}}/>
  <div style={{position:'absolute',left:70,right:70,top:116,height:1,background:'rgba(242,238,230,.12)'}}/>
  {children}
</AbsoluteFill>;

const K=({t,c=C.muted})=><div style={{position:'absolute',left:96,right:96,top:150,fontSize:29,fontWeight:800,letterSpacing:2,color:c,textTransform:'uppercase'}}>{t}</div>;
const H=({t,y=285,s=68,c=C.ivory,a='left'})=><div style={{position:'absolute',left:96,right:96,top:y,fontSize:s,fontWeight:900,lineHeight:1.02,letterSpacing:-1.1,color:c,textAlign:a,textShadow:'0 15px 40px rgba(0,0,0,.3)'}}>{t}</div>;
const Rule=({f,c=C.ivory})=><div style={{position:'absolute',left:96,top:212,width:180*prog(f,0,18),height:5,borderRadius:5,background:c}}/>;

const Hero=({r})=>{const f=useCurrentFrame(),t=texts(r);return <>
  <K t='PRE-LAUNCH UNDERWRITING'/><Rule f={f} c={C.amber}/><H t={t[0]||'WHAT MUST BE TRUE?'} s={86}/>
  <div style={{position:'absolute',left:330,top:650,width:420,height:245,borderRadius:34,border:'5px solid '+C.amber,transform:'rotate('+interpolate(f,[0,25],[-8,0],cl)+'deg)'}}/>
  {['DEMAND','DELIVERY','LEGAL TERMS','ENTRY BASIS'].map((x,i)=><div key={x} style={{position:'absolute',left:96+(i%2)*450,top:1080+Math.floor(i/2)*190,width:390,height:150,borderRadius:28,border:'2px solid '+C.amber,background:'rgba(36,39,36,.95)',display:'grid',placeItems:'center',fontSize:31,fontWeight:900,opacity:prog(f,20+i*6,36+i*6)}}>{x}</div>)}
</>};

const Context=({r})=>{const f=useCurrentFrame(),t=texts(r);return <>
  <K t={t[0]||'CONTEXT'} c={C.green}/><Rule f={f} c={C.green}/><H t={t[1]||t[0]||'CONTEXT'} s={58}/>
  <div style={{position:'absolute',left:110,top:520,width:860,height:650,borderRadius:40,border:'2px solid rgba(242,238,230,.16)',background:'rgba(16,18,16,.45)'}}>
    <svg viewBox='0 0 860 650' width='860' height='650'><path d='M80 540 C210 410 300 450 390 330 C520 160 630 230 780 90' fill='none' stroke={C.green} strokeWidth='12' strokeDasharray='5 20'/></svg>
  </div>
  <div style={{position:'absolute',left:96,right:96,top:1240,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>{t.slice(1,5).map((x,i)=><div key={i} style={{minHeight:108,borderRadius:22,border:'1px solid rgba(242,238,230,.18)',background:'rgba(36,39,36,.9)',padding:24,fontSize:29,fontWeight:850}}>{x}</div>)}</div>
</>};

const Modules=({r})=>{const f=useCurrentFrame(),t=texts(r);return <>
  <K t={t[0]||'PROJECT / CONCEPT'} c={C.amber}/><Rule f={f} c={C.amber}/><H t={t[1]||'MODULAR CONFIGURATION'} s={58}/>
  {[[130,600],[610,600],[130,900],[610,900]].map((p,i)=><div key={i} style={{position:'absolute',left:p[0],top:p[1],width:340,height:235,borderRadius:32,border:'3px solid '+(i<2?C.ivory:C.amber),background:i<2?'rgba(54,91,73,.28)':'rgba(200,145,56,.1)',opacity:prog(f,10+i*6,28+i*6)}}/>)}
  {t[2]?<H t={t[2]} y={1280} s={42} c={C.muted}/>:null}{t[3]?<H t={t[3]} y={1400} s={44} c={C.amber}/>:null}
</>};

const Metrics=({r})=>{const f=useCurrentFrame(),t=texts(r),vals=t.filter(x=>/\d/.test(x));return <>
  <K t={t.find(x=>/DUBAI|2025|2026/i.test(x))||'VERIFIED MARKET CONTEXT'} c={C.blue}/><Rule f={f} c={C.blue}/><H t={vals[0]||t[0]||'MARKET CONTEXT'} s={78}/>
  <div style={{position:'absolute',left:96,right:96,top:610,display:'grid',gridTemplateColumns:vals.length>2?'1fr 1fr':'1fr',gap:24}}>{(vals.length?vals:t).slice(0,4).map((x,i)=><div key={i} style={{minHeight:205,borderRadius:30,border:'2px solid '+C.blue,background:'rgba(44,120,212,.12)',padding:38,fontSize:/\d/.test(x)?50:34,fontWeight:900,opacity:prog(f,12+i*7,30+i*7)}}>{x}</div>)}</div>
  <div style={{position:'absolute',left:96,right:96,bottom:250,fontSize:25,color:C.muted,textAlign:'center'}}>{t.find(x=>/NOT A CITY|DUBAI-WIDE|DEMAND CONTEXT/i.test(x))||''}</div>
</>};

const Network=({r})=>{const f=useCurrentFrame(),t=texts(r),n=[[540,680],[310,880],[770,880],[340,1140],[740,1140],[540,1370]];return <>
  <K t={t[1]||t[0]||'CONDITIONAL RELATIONSHIP'} c={C.green}/><Rule f={f} c={C.green}/><H t={t[0]||'ECOSYSTEM'} s={56}/>
  <svg viewBox='0 0 1080 1920' width='1080' height='1920' style={{position:'absolute',inset:0}}>{n.slice(1).map((x,i)=><line key={i} x1='540' y1='680' x2={x[0]} y2={x[1]} stroke={C.green} strokeWidth='7' strokeDasharray='6 22' opacity={prog(f,0,28)}/>)}</svg>
  {n.map((x,i)=><div key={i} style={{position:'absolute',left:x[0]-52,top:x[1]-52,width:104,height:104,borderRadius:'50%',background:i===0?C.ivory:C.green,border:'3px solid rgba(242,238,230,.35)',opacity:prog(f,8+i*5,24+i*5)}}/>)}
  {t[2]?<H t={t[2]} y={1510} s={42} c={C.amber} a='center'/>:null}
</>};

const Compare=({r})=>{const f=useCurrentFrame(),t=texts(r);return <>
  <K t={t[0]||'VALIDATION FRAME'} c={C.amber}/><Rule f={f} c={C.amber}/>
  <div style={{position:'absolute',left:96,top:440,width:410,height:820,borderRadius:34,border:'2px solid rgba(242,238,230,.15)',background:'rgba(242,238,230,.05)'}}><div style={{padding:32,fontSize:36,fontWeight:900,color:C.muted}}>ESTABLISHED</div></div>
  <div style={{position:'absolute',right:96,top:440,width:410,height:820,borderRadius:34,border:'2px solid '+C.amber,background:'rgba(200,145,56,.07)'}}><div style={{padding:32,fontSize:36,fontWeight:900,color:C.amber}}>EMERGING</div>{['DEMAND','ACCESS','FOOTFALL','EXIT LIQUIDITY'].map((x,i)=><div key={x} style={{position:'absolute',left:32,right:32,top:170+i*145,height:104,borderRadius:22,border:'2px solid '+C.ivory,display:'flex',alignItems:'center',padding:'0 22px',fontSize:27,fontWeight:850,opacity:prog(f,12+i*7,28+i*7)}}>{x}</div>)}</div>
  <H t={t.find(x=>/NOT AN ESTABLISHED|TO BE PROVEN/i.test(x))||''} y={1390} s={44} c={C.amber} a='center'/>
</>};

const Diligence=({r})=>{const f=useCurrentFrame(),t=texts(r),final=/quantitatively testable/i.test(t.join(' ')),labels=['PRICE','PAYMENT TERMS','LEGAL / ESCROW','DELIVERY','LEASING COMPARABLES'];return <>
  <K t={final?'UNDERWRITING THRESHOLD':'PENDING DILIGENCE'} c={C.amber}/><Rule f={f} c={C.amber}/><H t={t[0]||'TEST THE TERMS'} s={50}/>
  {labels.map((x,i)=>{const pending=i<2&&!final;return <div key={x} style={{position:'absolute',left:120,top:560+i*180,width:840,height:132,borderRadius:25,border:'2px solid '+(pending?C.amber:C.ivory),background:pending?'rgba(200,145,56,.10)':'rgba(242,238,230,.045)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',fontSize:32,fontWeight:900,opacity:prog(f,10+i*7,27+i*7)}}><span>{x}</span><span style={{width:110,height:8,borderRadius:8,background:pending?C.amber:'rgba(242,238,230,.3)'}}/></div>})}
  {final?<H t='THEN: QUANTITATIVELY TESTABLE' y={1510} s={52} a='center'/>:null}
</>};

const Generic=({r})=>{const f=useCurrentFrame(),t=texts(r);return <><K t='EDITORIAL EXPLAINER'/><Rule f={f}/><H t={t[0]||summary(r)||'EXPLAIN'} s={65}/><div style={{position:'absolute',left:120,right:120,top:650,bottom:420,borderRadius:40,border:'2px solid rgba(242,238,230,.14)',background:'rgba(242,238,230,.04)'}}/></>};

const Core=({pkg,l})=>{const r=recipe(pkg,l.beat_ids&&l.beat_ids[0]),t=texts(r),h=[r.wrapper_component,r.primary_renderer,summary(r),...t].join(' ').toLowerCase();
  if(/price tag|what must be true|hook kinetic/.test(h))return <Hero r={r}/>;
  if(/occupancy|rent|71,830|companies|metric|chart|d3/.test(h))return <Metrics r={r}/>;
  if(/ecosystem|proximity|network/.test(h))return <Network r={r}/>;
  if(/emerging|must be proven|validation|established cbd/.test(h))return <Compare r={r}/>;
  if(/diligence|pending: price|quantitatively testable|leasing comparables/.test(h))return <Diligence r={r}/>;
  if(/commercial block|flexible office|module/.test(h))return <Modules r={r}/>;
  if(/masterplan|context|scale card|supportive, not predictive/.test(h))return <Context r={r}/>;
  return <Generic r={r}/>;
};

const Text=({pkg,l})=>{const r=recipe(pkg,l.beat_ids&&l.beat_ids[0]),t=texts(r),q=t.find(x=>/NOT A CITY|DEVELOPER-SUPPLIED|PENDING FINAL|DUBAI-WIDE|CONCEPTUAL|TO BE PROVEN/i.test(x));return q?<div style={{position:'absolute',left:96,right:96,bottom:230,minHeight:66,borderRadius:20,border:'1px solid rgba(242,238,230,.2)',background:'rgba(12,13,12,.78)',display:'flex',alignItems:'center',justifyContent:'center',padding:'10px 22px',fontSize:23,fontWeight:800,color:/pending|proven/i.test(q)?C.amber:C.ivory,textAlign:'center'}}>{q}</div>:null;};

const Media=({pkg,l,idx,total})=>{const a=asset(pkg,l.asset_refs&&l.asset_refs[0]),src=a.staged_url||a.stagedUrl||'';if(!src)return null;const left=total>1?(idx%2===0?70:555):95,width=total>1?455:890,top=370+(total>2?Math.floor(idx/2)*270:0),height=total>2?500:750;return <div style={{position:'absolute',left,top,width,height,borderRadius:40,overflow:'hidden',border:'2px solid rgba(242,238,230,.12)',opacity:total>1?.42:.50}}><OffthreadVideo src={src} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/><AbsoluteFill style={{background:'linear-gradient(180deg,rgba(12,13,12,.15),rgba(12,13,12,.72))'}}/></div>;};

const Layer=({pkg,l,start,mi,mt})=>{const {fps}=useVideoConfig(),from=Math.max(0,Math.round((num(l.start_sec,start)-start)*fps)),to=Math.max(from+1,Math.round((num(l.end_sec,start+1)-start)*fps)),dur=Math.max(1,to-from);let x=null;
  if(l.renderer==='media_asset'||l.component_id==='MEDIA_SOURCE')x=<Media pkg={pkg} l={l} idx={mi} total={mt}/>;
  else if(/_TEXT$/.test(String(l.layer_id||''))||(Number(l.z_index)>=70&&Number(l.z_index)<90))x=<Text pkg={pkg} l={l}/>;
  else if(Number(l.z_index)>=20&&Number(l.z_index)<70)x=<Core pkg={pkg} l={l}/>;
  if(!x)return null;return <Sequence from={from} durationInFrames={dur} layout='none'>{x}</Sequence>;
};

export const ProductionMaster=({package:pkg})=>{const s=pkg&&pkg.sceneManifest||{},start=num(s.start_sec,0),ls=Array.isArray(s.layer_stack)?s.layer_stack:[],m=ls.filter(x=>x.renderer==='media_asset'||x.component_id==='MEDIA_SOURCE');return <Base>{ls.map((l,i)=><Layer key={String(l.layer_id||i)} pkg={pkg} l={l} start={start} mi={Math.max(0,m.indexOf(l))} mt={Math.max(1,m.length)}/>)}</Base>;};
