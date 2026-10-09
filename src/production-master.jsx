import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  OffthreadVideo
} from 'remotion';

const C={
  bg:'#FFFFFF',
  ink:'#111111',
  muted:'#6B7280',
  line:'#D9DEE7',
  panel:'#F6F8FB',
  blue:'#2563EB',
  cyan:'#0891B2',
  amber:'#D97706',
  red:'#DC2626',
  green:'#059669',
  violet:'#7C3AED'
};

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const prog=(f,a,b)=>interpolate(f,[a,b],[0,1],clamp);

function parseProps(v){
  if(v && typeof v==='object') return v;
  if(typeof v==='string'){
    try{return JSON.parse(v);}catch{}
  }
  return {};
}

function isInternalText(v){
  const s=String(v??'').trim();
  if(!s) return true;
  if(/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(s)) return true;
  if(/^(generic|headline|layout|asset|component|renderer|stage|upper|lower|left|right)_/i.test(s)) return true;
  return false;
}

function cleanText(v,fallback=''){
  const s=String(v??'').trim();
  return s && !isInternalText(s) ? s : fallback;
}

function textValues(v,out=[]){
  if(v==null) return out;
  if(typeof v==='string'){
    const s=cleanText(v);
    if(s && s.length<180) out.push(s);
    return out;
  }
  if(typeof v==='number' || typeof v==='boolean'){
    out.push(String(v));
    return out;
  }
  if(Array.isArray(v)){
    for(const x of v) textValues(x,out);
    return out;
  }
  if(typeof v==='object'){
    for(const [k,x] of Object.entries(v)){
      if(/url|src|color|hex|id|path|position|anchor|slot|region|layer/i.test(k)) continue;
      textValues(x,out);
    }
  }
  return out;
}

function hash(s=''){
  let h=2166136261;
  for(let i=0;i<s.length;i++){
    h^=s.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function accent(seed=''){
  const a=[C.blue,C.cyan,C.amber,C.red,C.green,C.violet];
  return a[hash(seed)%a.length];
}

const Shell=({children})=><AbsoluteFill style={{
  background:C.bg,
  color:C.ink,
  fontFamily:'Arial,Helvetica,sans-serif',
  overflow:'hidden'
}}>
  <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#FFFFFF 0%,#FAFBFD 100%)'}}/>
  <div style={{position:'absolute',left:64,right:64,top:94,height:2,background:'#EEF1F5'}}/>
  {children}
</AbsoluteFill>;

const Headline=({text,color=C.ink,small=false,align='left',y=145})=>{
  const f=useCurrentFrame();
  return <div style={{
    position:'absolute',left:84,right:84,top:y,
    fontSize:small?42:72,fontWeight:900,lineHeight:1.03,letterSpacing:-1.5,
    color,textAlign:align,
    opacity:prog(f,0,10),
    transform:`translateY(${interpolate(f,[0,12],[28,0],clamp)}px)`
  }}>{text}</div>;
};

const Label=({text,x=90,y=315,color=C.muted})=>{
  const f=useCurrentFrame();
  return <div style={{
    position:'absolute',left:x,top:y,
    fontSize:26,fontWeight:800,letterSpacing:1.5,textTransform:'uppercase',
    color,opacity:prog(f,4,14)
  }}>{text}</div>;
};

const Panel=({x,y,w,h,color=C.panel,children,border=C.line,opacity=1})=>
  <div style={{
    position:'absolute',left:x,top:y,width:w,height:h,
    borderRadius:34,background:color,border:`2px solid ${border}`,
    boxShadow:'0 16px 45px rgba(17,24,39,.08)',overflow:'hidden',opacity
  }}>{children}</div>;

const GenericText=({c})=>{
  const p=parseProps(c.props);
  const explicitMain=[
    p.text,p.headline,p.title,p.copy,p.label,p.value,c.purpose,c.data_binding
  ].map(v=>cleanText(v)).find(Boolean)||'';
  const explicitSub=[
    p.subtitle,p.subhead,p.secondary_text,p.kicker
  ].map(v=>cleanText(v)).find(Boolean)||'';
  const col=accent(c.persistent_object_id||c.instance_id);
  if(!explicitMain) return null;
  return <>
    <Headline text={explicitMain}/>
    {explicitSub?<Headline text={explicitSub} small y={285} color={col}/>:null}
  </>;
};

const TagLabel=({c})=>{
  const p=parseProps(c.props);
  const text=[p.text,p.label,p.title,p.copy,c.purpose].map(v=>cleanText(v)).find(Boolean)||'';
  if(!text) return null;
  return <Label text={text} color={accent(c.persistent_object_id||c.instance_id)}/>;
};

const StatCard=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const texts=textValues(p);
  const value=texts.find(x=>/[0-9%$AED]/i.test(x))||texts[0]||'—';
  const label=texts.find(x=>x!==value)||c.purpose||'KEY METRIC';
  const col=accent(c.persistent_object_id||c.instance_id);
  return <>
    <Label text={label} color={col}/>
    <Panel x={110} y={520} w={860} h={500} border={col}>
      <div style={{
        position:'absolute',inset:0,display:'grid',placeItems:'center',
        transform:`scale(${interpolate(f,[0,20],[.86,1],clamp)})`,
        opacity:prog(f,0,12)
      }}>
        <div style={{fontSize:128,fontWeight:950,color:col,textAlign:'center'}}>{value}</div>
      </div>
    </Panel>
  </>;
};

const ProgressMeter=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const texts=textValues(p);
  const pctText=texts.find(x=>/%/.test(x));
  const raw=pctText==null?NaN:Number(String(pctText).replace(/[^0-9.]/g,''));
  const hasPct=Number.isFinite(raw);
  const pct=hasPct?Math.max(0,Math.min(100,raw)):100;
  const col=accent(c.instance_id);
  const shown=interpolate(f,[0,24],[0,pct],clamp);
  const title=cleanText(p.title)||cleanText(p.text)||cleanText(c.purpose,'PROGRESS');
  return <>
    <Headline text={title} small/>
    <div style={{position:'absolute',left:110,right:110,top:700,height:86,borderRadius:50,background:'#E9EDF3',overflow:'hidden'}}>
      <div style={{height:'100%',width:`${shown}%`,background:col,borderRadius:50}}/>
    </div>
    {hasPct?<div style={{position:'absolute',left:110,right:110,top:820,fontSize:76,fontWeight:900,color:col,textAlign:'center'}}>{Math.round(shown)}%</div>:null}
  </>;
};

const BarChart=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const texts=textValues(p);
  const labels=(Array.isArray(p.labels)?p.labels.map(x=>cleanText(x)).filter(Boolean):texts.slice(0,4)).slice(0,4);
  const hasValues=Array.isArray(p.values)&&p.values.length>0&&p.values.every(v=>Number.isFinite(Number(v)));
  const values=hasValues?p.values.slice(0,4).map(Number):Array.from({length:Math.max(1,labels.length||3)},()=>1);
  const max=Math.max(1,...values);
  const title=cleanText(p.title)||cleanText(c.purpose,'COMPARISON');
  return <>
    <Headline text={title} small/>
    <div style={{position:'absolute',left:120,right:120,top:500,bottom:340,display:'flex',alignItems:'flex-end',gap:38}}>
      {values.map((v,i)=>{
        const h=(Number(v)||0)/max*700*prog(f,5+i*4,28+i*4);
        const col=accent((c.instance_id||'')+i);
        return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center',gap:18}}>
          {hasValues?<div style={{fontSize:28,fontWeight:900,color:col}}>{String(v)}</div>:null}
          <div style={{width:'100%',height:h,borderRadius:'20px 20px 4px 4px',background:col}}/>
          <div style={{fontSize:24,fontWeight:800,textAlign:'center',minHeight:60}}>{labels[i]||''}</div>
        </div>;
      })}
    </div>
  </>;
};

const LineChart=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const vals=Array.isArray(p.values)?p.values.map(Number):[22,38,31,57,73,88];
  const col=accent(c.instance_id);
  const pts=vals.map((v,i)=>[130+i*(820/Math.max(1,vals.length-1)),1220-(Math.max(0,Math.min(100,Number(v)||0))*7)]);
  const visible=Math.max(2,Math.round(interpolate(f,[0,30],[2,pts.length],clamp)));
  const d=pts.slice(0,visible).map((q,i)=>(i?'L':'M')+q[0]+' '+q[1]).join(' ');
  return <>
    <Headline text={p.title||c.purpose||'TREND'} small/>
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
      <line x1="130" y1="1220" x2="950" y2="1220" stroke={C.line} strokeWidth="4"/>
      <line x1="130" y1="470" x2="130" y2="1220" stroke={C.line} strokeWidth="4"/>
      <path d={d} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.slice(0,visible).map((q,i)=><circle key={i} cx={q[0]} cy={q[1]} r="15" fill={col}/>)}
    </svg>
  </>;
};

const Donut=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const texts=textValues(p);
  const pctText=texts.find(x=>/%/.test(x))??p.value;
  const raw=Number(String(pctText??'').replace(/[^0-9.]/g,''));
  const hasPct=Number.isFinite(raw);
  const pct=hasPct?Math.max(0,Math.min(100,raw)):0;
  const r=210,circ=2*Math.PI*r,shown=pct/100*circ*prog(f,0,25);
  const col=accent(c.instance_id);
  const title=cleanText(p.title)||cleanText(c.purpose,'SHARE');
  return <>
    <Headline text={title} small/>
    <svg width="1080" height="1200" style={{position:'absolute',top:380}}>
      <circle cx="540" cy="480" r={r} fill="none" stroke="#E7EBF0" strokeWidth="70"/>
      {hasPct?<circle cx="540" cy="480" r={r} fill="none" stroke={col} strokeWidth="70" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ-shown} transform="rotate(-90 540 480)"/>:null}
      {hasPct?<text x="540" y="505" textAnchor="middle" fontSize="94" fontWeight="900" fill={C.ink}>{Math.round(pct)}%</text>:null}
    </svg>
  </>;
};

const Flow=({c,mode='flow'})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const texts=textValues(p);
  const labels=(Array.isArray(p.steps)?p.steps.map(x=>cleanText(x)).filter(Boolean):texts.length?texts:['INPUT','MECHANISM','OUTPUT']).slice(0,5);
  const col=accent(c.persistent_object_id||c.instance_id);
  return <>
    <Headline text={p.title||c.purpose||'MECHANISM'} small/>
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
      {labels.slice(0,-1).map((_,i)=>{
        const y=570+i*225;
        const y2=570+(i+1)*225;
        const q=prog(f,8+i*5,24+i*5);
        return <line key={i} x1="540" y1={y+70} x2="540" y2={y2-70} stroke={col} strokeWidth="10" opacity={q}/>;
      })}
    </svg>
    {labels.map((x,i)=>{
      const q=prog(f,3+i*5,18+i*5);
      return <div key={i} style={{
        position:'absolute',left:190,top:500+i*225,width:700,height:140,
        borderRadius:28,border:`3px solid ${col}`,background:'#FFFFFF',
        display:'grid',placeItems:'center',fontSize:34,fontWeight:900,
        opacity:q,transform:`translateY(${(1-q)*30}px)`
      }}>{x}</div>;
    })}
  </>;
};

const Queue=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.instance_id);
  const n=7;
  return <>
    <Headline text={c.purpose||'QUEUE / THROUGHPUT'} small/>
    <div style={{position:'absolute',left:90,right:90,top:690,height:420,borderRadius:42,border:`3px solid ${col}`,background:C.panel,overflow:'hidden'}}>
      {Array.from({length:n}).map((_,i)=>{
        const q=prog(f,i*3,15+i*3);
        const x=80+i*105;
        return <div key={i} style={{position:'absolute',left:x,top:145,width:74,height:110,borderRadius:18,background:col,opacity:q,transform:`translateX(${(1-q)*80}px)`}}/>;
      })}
    </div>
  </>;
};

const Compare=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const t=textValues(p);
  const left=t[0]||'BEFORE';
  const right=t[1]||'AFTER';
  const col=accent(c.instance_id);
  return <>
    <Headline text={p.title||c.purpose||'COMPARISON'} small/>
    <Panel x={70} y={500} w={450} h={760}>
      <div style={{padding:40,fontSize:38,fontWeight:900,color:C.muted}}>{left}</div>
      <div style={{position:'absolute',left:40,right:40,bottom:60,height:330,borderRadius:28,background:'#E8ECF2',transform:`scaleY(${.55+.45*prog(f,0,25)})`,transformOrigin:'bottom'}}/>
    </Panel>
    <Panel x={560} y={500} w={450} h={760} border={col}>
      <div style={{padding:40,fontSize:38,fontWeight:900,color:col}}>{right}</div>
      <div style={{position:'absolute',left:40,right:40,bottom:60,height:520,borderRadius:28,background:col,transform:`scaleY(${.35+.65*prog(f,8,32)})`,transformOrigin:'bottom'}}/>
    </Panel>
  </>;
};

const Timeline=({c})=>{
  const f=useCurrentFrame();
  const p=parseProps(c.props);
  const t=(Array.isArray(p.events)?p.events.map(x=>cleanText(x)).filter(Boolean):textValues(p)).slice(0,5);
  const events=t.length?t:['START','CHANGE','RESULT'];
  const col=accent(c.instance_id);
  return <>
    <Headline text={p.title||c.purpose||'TIMELINE'} small/>
    <div style={{position:'absolute',left:120,right:120,top:870,height:8,background:C.line}}/>
    {events.map((x,i)=>{
      const q=prog(f,5+i*5,18+i*5);
      const left=120+i*(840/Math.max(1,events.length-1));
      return <React.Fragment key={i}>
        <div style={{position:'absolute',left:left-20,top:850,width:40,height:40,borderRadius:'50%',background:col,opacity:q}}/>
        <div style={{position:'absolute',left:left-95,top:925,width:190,fontSize:23,fontWeight:800,textAlign:'center',opacity:q}}>{String(x)}</div>
      </React.Fragment>;
    })}
  </>;
};

const MapLike=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.persistent_object_id||c.instance_id);
  const p=parseProps(c.props);
  const t=textValues(p);
  return <>
    <Headline text={p.title||c.purpose||'LOCATION / SYSTEM MAP'} small/>
    <Panel x={80} y={430} w={920} h={980}>
      <svg viewBox="0 0 920 980" width="920" height="980">
        <path d="M70 780 C190 650 270 720 360 560 C460 390 590 430 850 180" fill="none" stroke="#D5DBE5" strokeWidth="30" strokeLinecap="round"/>
        <path d="M70 780 C190 650 270 720 360 560 C460 390 590 430 850 180" fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-prog(f,0,30)}/>
        {[{x:120,y:720},{x:390,y:540},{x:620,y:390},{x:820,y:205}].map((q,i)=><circle key={i} cx={q.x} cy={q.y} r="24" fill={col} opacity={prog(f,8+i*4,18+i*4)}/>)}
      </svg>
      {t.slice(0,4).map((x,i)=><div key={i} style={{position:'absolute',left:80+(i%2)*430,top:80+Math.floor(i/2)*160,width:330,fontSize:24,fontWeight:850,color:C.ink}}>{x}</div>)}
    </Panel>
  </>;
};

const Blocks=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.persistent_object_id||c.instance_id);
  return <>
    <Headline text={c.purpose||'SUPPLY / VOLUME'} small/>
    <div style={{position:'absolute',left:120,right:120,top:560,bottom:330,display:'flex',alignItems:'flex-end',gap:22}}>
      {Array.from({length:9}).map((_,i)=>{
        const q=prog(f,3+i*2,18+i*2);
        return <div key={i} style={{flex:1,height:(180+(i%4)*110)*q,borderRadius:'18px 18px 4px 4px',background:i%3===0?col:'#DCE2EA'}}/>;
      })}
    </div>
  </>;
};

const ScaleBalance=({c})=>{
  const f=useCurrentFrame();
  const q=prog(f,0,30);
  const rot=interpolate(q,[0,1],[-12,0]);
  const col=accent(c.instance_id);
  return <>
    <Headline text={c.purpose||'TRADE-OFF'} small/>
    <div style={{position:'absolute',left:170,right:170,top:850,height:18,borderRadius:12,background:C.ink,transform:`rotate(${rot}deg)`,transformOrigin:'center'}}>
      <div style={{position:'absolute',left:20,top:-220,width:220,height:180,borderRadius:30,border:`4px solid ${col}`,background:'#fff'}}/>
      <div style={{position:'absolute',right:20,top:-220,width:220,height:180,borderRadius:30,border:`4px solid ${C.amber}`,background:'#fff'}}/>
    </div>
    <div style={{position:'absolute',left:520,top:865,width:40,height:360,background:C.ink,clipPath:'polygon(45% 0,55% 0,100% 100%,0 100%)'}}/>
  </>;
};

const Ring=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.persistent_object_id||c.instance_id);
  const s=interpolate(f,[0,20],[.65,1],clamp);
  return <div style={{
    position:'absolute',left:260,top:580,width:560,height:560,borderRadius:'50%',
    border:`18px solid ${col}`,transform:`scale(${s})`,opacity:prog(f,0,10)
  }}/>;
};

const MediaFrame=({c,pkg,video=false})=>{
  const p=parseProps(c.props);
  const candidate=p.src||p.url||p.media_url||p.image_url||p.video_url||'';
  let src=String(candidate||'');
  if(!src){
    const a=(pkg.assetTasks||[]).find(x=>String(x.asset_id||'')===String(p.asset_id||''));
    src=String(a?.staged_url||a?.stagedUrl||'');
  }
  if(!src) return <GenericText c={c}/>;
  return <Panel x={90} y={420} w={900} h={1060}>
    {video
      ? <OffthreadVideo src={src} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      : <Img src={src} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
  </Panel>;
};

const Presenter=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.persistent_object_id||c.instance_id);
  return <>
    <Headline text={c.purpose||'PRESENTER'} small/>
    <div style={{position:'absolute',left:330,top:520,width:420,height:720,borderRadius:'210px 210px 80px 80px',background:'#F4F5F7',border:`5px solid ${col}`,opacity:prog(f,0,14)}}>
      <div style={{position:'absolute',left:110,top:80,width:200,height:200,borderRadius:'50%',background:'#D7DCE4'}}/>
      <div style={{position:'absolute',left:70,top:310,width:280,height:330,borderRadius:'120px 120px 50px 50px',background:col,opacity:.9}}/>
    </div>
  </>;
};

const Custom=({c})=>{
  const f=useCurrentFrame();
  const col=accent(c.instance_id);
  return <>
    <Headline text={c.purpose||'CUSTOM DIAGRAM'} small/>
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0}}>
      <rect x="150" y="520" width="780" height="720" rx="70" fill="#F8FAFC" stroke={col} strokeWidth="8" opacity={prog(f,0,12)}/>
      <path d="M250 1030 C390 790 550 1130 820 690" fill="none" stroke={col} strokeWidth="16" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-prog(f,6,28)}/>
    </svg>
  </>;
};

function ComponentView({c,pkg}){
  const id=String(c.component_id||'').toLowerCase();
  if(id==='layout_stage_9x16') return null;
  if(id==='label_tag') return <TagLabel c={c}/>;
  if(id==='headline_block'||id==='kinetic_phrase'||id==='callout_box') return <GenericText c={c}/>;
  if(id==='stat_card'||id==='counter') return <StatCard c={c}/>;
  if(id==='progress_meter') return <ProgressMeter c={c}/>;
  if(id==='bar_chart') return <BarChart c={c}/>;
  if(id==='line_chart'||id==='area_chart'||id==='axis_scale') return <LineChart c={c}/>;
  if(id==='donut_chart') return <Donut c={c}/>;
  if(id==='flow_node'||id==='flow_arrow'||id==='process_steps'||id==='network_graph'||id==='object_transform') return <Flow c={c}/>;
  if(id==='queue_lane') return <Queue c={c}/>;
  if(id==='comparison_split') return <Compare c={c}/>;
  if(id==='timeline') return <Timeline c={c}/>;
  if(id==='map_frame'||id==='map_pin'||id==='road_corridor'||id==='city_cluster'||id==='building_mass') return <MapLike c={c}/>;
  if(id==='stacked_blocks') return <Blocks c={c}/>;
  if(id==='scale_balance') return <ScaleBalance c={c}/>;
  if(id==='highlight_ring') return <Ring c={c}/>;
  if(id==='presenter_frame') return <Presenter c={c}/>;
  if(id==='image_frame') return <MediaFrame c={c} pkg={pkg}/>;
  if(id==='video_frame') return <MediaFrame c={c} pkg={pkg} video/>;
  if(id==='custom_svg_required') return <Custom c={c}/>;
  return <GenericText c={c}/>;
}

const Layer=({c,pkg,sceneStart})=>{
  const {fps}=useVideoConfig();
  const from=Math.max(0,Math.round((num(c.start_sec,sceneStart)-sceneStart)*fps));
  const end=Math.max(num(c.end_sec,sceneStart+1),num(c.start_sec,sceneStart)+.15);
  const dur=Math.max(1,Math.round((end-num(c.start_sec,sceneStart))*fps));
  return <Sequence from={from} durationInFrames={dur} layout="none">
    <AbsoluteFill style={{zIndex:num(c.layer,0)}}>
      <ComponentView c={c} pkg={pkg}/>
    </AbsoluteFill>
  </Sequence>;
};

function prepareComponents(raw,start,end){
  const list=(Array.isArray(raw)?raw:[]).map(c=>({...c})).sort((a,b)=>{
    const sa=num(a.start_sec,start),sb=num(b.start_sec,start);
    if(sa!==sb) return sa-sb;
    return num(a.layer)-num(b.layer);
  });

  const headlineIds=new Set(['headline_block','kinetic_phrase','callout_box']);
  const headlines=list.filter(c=>headlineIds.has(String(c.component_id||'').toLowerCase()));

  for(let i=0;i<headlines.length-1;i++){
    const cur=headlines[i];
    const next=headlines[i+1];
    const nextStart=num(next.start_sec,start);
    const curStart=num(cur.start_sec,start);
    const curEnd=num(cur.end_sec,end);
    if(nextStart>curStart && nextStart<curEnd){
      cur.end_sec=Math.max(curStart+.15,nextStart-.04);
    }
  }

  const meaningful=list.filter(c=>{
    const id=String(c.component_id||'').toLowerCase();
    return !['layout_stage_9x16','headline_block','kinetic_phrase','callout_box','label_tag','highlight_ring'].includes(id);
  });

  const coveragePool=meaningful.length?meaningful:list.filter(c=>String(c.component_id||'').toLowerCase()!=='layout_stage_9x16');
  if(coveragePool.length){
    const last=coveragePool.reduce((best,c)=>num(c.end_sec,start)>num(best.end_sec,start)?c:best,coveragePool[0]);
    if(end-num(last.end_sec,start)>.25) last.end_sec=end;
  }

  return list.sort((a,b)=>num(a.layer)-num(b.layer));
}

export const ProductionMaster=({package:pkg})=>{
  const s=pkg?.sceneManifest||{};
  const start=num(s.start_sec,0);
  const end=num(s.end_sec,start+1);
  const components=prepareComponents(s.components,start,end);
  const fallback={
    instance_id:`${s.scene_id||'scene'}-fallback`,
    component_id:'headline_block',
    renderer:'remotion',
    purpose:String(s.scene_id||'SCENE'),
    layer:1,
    start_sec:start,
    end_sec:end,
    props:{text:String(s.scene_id||'SCENE')}
  };
  const list=components.length?components:[fallback];
  return <Shell>
    {list.map((c,i)=><Layer key={String(c.instance_id||i)} c={c} pkg={pkg} sceneStart={start}/>)}
  </Shell>;
};
