const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'},number={type:'number'};
const array=items=>({type:'array',items});
const enumeration=values=>({type:'string',enum:values});
export const OBJECT_TYPES=['platform','shop','cart','person','counter','bar','connector','document','label','card','building','landscape','ring'];
export const ACTION_PROPERTIES=['x','y','opacity','progress','rotation','value'];
export const CUE_TYPES=['whoosh','click','arrival','resolve'];
export const SCENE_SCHEMA=obj({
  version:{type:'string',enum:['semantic-scene-1']},sceneId:str,duration:number,
  timingBasis:enumeration(['draft','voice_aligned']),
  disclaimer:str,
  claims:array(obj({id:str,text:str,status:enumeration(['sourced','illustrative','unsupported']),source:str})),
  metrics:array(obj({id:str,initial:number,max:number,prefix:str,suffix:str})),
  objects:array(obj({id:str,type:enumeration(OBJECT_TYPES),label:str,x:number,y:number,w:number,h:number,
    color:str,opacity:number,progress:number,rotation:number,metric:str})),
  actions:array(obj({id:str,target:str,property:enumeration(ACTION_PROPERTIES),start:number,end:number,
    from:number,to:number,easing:enumeration(['linear','smooth','ease_out'])})),
  beats:array(obj({id:str,start:number,end:number,narration:str,headline:str,focus:str,
    cause:str,action:str,consequence:str,mode:enumeration(['change','hold']),claimIds:array(str)})),
  cues:array(obj({time:number,type:enumeration(CUE_TYPES),target:str})),
});
