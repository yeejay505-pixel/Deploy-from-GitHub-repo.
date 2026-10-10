import React,{useLayoutEffect,useMemo,useRef} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {compileSceneSpec} from './scene-contract.mjs';
import {drawSemanticScene} from './scene-renderer.mjs';
export function SemanticScene({spec}){
  const compiled=useMemo(()=>compileSceneSpec(spec),[spec]);
  const ref=useRef(null),frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();
  useLayoutEffect(()=>{drawSemanticScene(ref.current.getContext('2d'),compiled,frame/fps,{width,height});},[compiled,frame,fps,width,height]);
  return <canvas ref={ref} width={width} height={height} style={{width:'100%',height:'100%'}}/>;
}
