import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './scene.jsx';
import manifest from './manifest.json';
export const Root=()=> <Composition id="Scene" component={Scene} durationInFrames={30} fps={30} width={1080} height={1920}
defaultProps={{scene:manifest.scenes[0]}}
calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil((props.scene?.duration_sec||1)*30)),fps:30,width:1080,height:1920})}/>;
