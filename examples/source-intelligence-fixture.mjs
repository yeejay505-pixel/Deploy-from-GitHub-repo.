// Synthetic contract fixture, not Dubai market research or a production draft.
export function fixturePlan(job){
 const selected=job.extraction.claims.slice(0,3);if(selected.length<3)throw Error('Fixture needs three source paragraphs');
 const ids=selected.map(c=>c.claim_id),office='office-main';
 const states=['unbuilt suitable space','space under construction','completed suitable space','space with lease criteria shown'];
 const phases=['problem','mechanism','consequence'];
 const narratives=[
  'The supplied material frames a need for suitable workspace.',
  'If suitable workspace takes time to deliver, demand may meet a constraint.',
  'That mechanism suggests screening the asset and its lease conditions before investing.'
 ];
 return {schema_version:'intelligence-plan.v1',event_id:job.event_id,profile_id:job.intake.quality_profile.profile_id,benchmark_sha256:job.intake.quality_profile.reference.sha256,
 thesis:{text:'Assess how suitable-space constraints may affect occupier choices.',central_mechanism:'Demand competes for suitable space while delivery takes time.',claim_ids:ids,uncertainty:'Conditional interpretation; source assertions and asset-specific assumptions need review.'},
 claims:selected.map(c=>({claim_id:c.claim_id,verbatim_quote:c.text})),definitions:[],examples:[],causal_relationships:[{cause:'Suitable space takes time to deliver.',effect:'Demand may encounter limited suitable availability.',claim_ids:ids,certainty:'conditional_inference'}],
 uncertainties:['Synthetic validation fixture; not a semantically verified reading of these source paragraphs.'],unsupported_for_review:['Asset-level outcomes and any unsourced return figures require independent verification.'],
 objects:[{id:office,role:'same office progresses through the argument',kind:'diagram',initial_state:states[0],metric_ids:[]}],metrics:[],
 sentences:phases.map((phase,i)=>({id:'sentence-'+(i+1),phase,narration:narratives[i],claim_ids:[ids[i]],epistemic_role:i?'conditional_inference':'source_assertion',visual_argument:{visual_metaphor:'The same office changes from a future supply unit into a usable leased asset.',persistent_objects:[office],state_before:[{object_id:office,state:states[i]}],visible_action:[{object_id:office,operation:i===2?'sign':'build',from_state:states[i],to_state:states[i+1]}],state_after:[{object_id:office,state:states[i+1]}],quantity_treatment:{mode:'conceptual',metric_ids:[]},text_role:'diagram_label',sound_cue:{type:i===2?'click':'whoosh',object_id:office,trigger:'action_end'},transition:'carry'}})),
 timing_basis:'draft_unmeasured',release_eligible:false};
}
