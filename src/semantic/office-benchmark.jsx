import React,{useLayoutEffect,useRef} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {drawOfficeDemand} from './office-demand.mjs';

export const OfficeBenchmark=({showCaptions=true})=>{
  const canvas=useRef(null);
  const frame=useCurrentFrame();
  const {fps,width,height}=useVideoConfig();
  useLayoutEffect(()=>{
    const ctx=canvas.current?.getContext('2d');
    if(ctx)drawOfficeDemand(ctx,frame/fps,{width,height,showCaptions});
  },[frame,fps,width,height,showCaptions]);
  return <canvas ref={canvas} width={width} height={height} style={{width:'100%',height:'100%'}}/>;
};
