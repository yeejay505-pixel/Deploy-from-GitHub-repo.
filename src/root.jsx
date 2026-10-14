import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './scene.jsx';
import {ProductionMaster} from './production-master.jsx';
import manifest from './manifest.json';
import {OfficeBenchmark} from './semantic/office-benchmark.jsx';
import {SemanticScene} from './semantic/semantic-scene.jsx';
import semanticExample from '../examples/platform-dependency.json';

export const Root=()=> <>
  <Composition
    id="SemanticScene"
    component={SemanticScene}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{spec:semanticExample}}
    calculateMetadata={({props})=>({durationInFrames:Math.ceil(props.spec.duration*30),fps:30,width:1080,height:1920})}
  />
  <Composition
    id="OfficeBenchmark"
    component={OfficeBenchmark}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{showCaptions:true}}
  />
  <Composition
    id="Scene"
    component={Scene}
    durationInFrames={30}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{scene:manifest.scenes[0]}}
    calculateMetadata={({props})=>({
      durationInFrames:Math.max(1,Math.ceil((props.scene?.duration_sec||1)*30)),
      fps:30,width:1080,height:1920
    })}
  />
  <Composition
    id="ProductionScene"
    component={ProductionMaster}
    durationInFrames={286}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{package:{
      sceneManifest:{scene_id:'S02',start_sec:5.677,end_sec:15.209,duration_sec:9.532}
    }}}
    calculateMetadata={({props})=>({
      durationInFrames:Math.max(1,Math.ceil((props.package?.sceneManifest?.duration_sec||9.532)*30)),
      fps:30,width:1080,height:1920
    })}
  />
</>;
