// Operator configuration pins a previously stored revision; no source/model mutation.
import {GatewayError} from './gateway-store.mjs';
export function enqueuePinnedReview({reviewer,renderer,pin,workerEnabled,workerEventId}){
 if(!pin)return null;
 if(!pin.event_id||!/^REV-[a-f0-9]{32}$/.test(pin.revision_id??'')||!/^[a-f0-9]{64}$/.test(pin.plan_hash??''))throw new GatewayError('pinned_review_configuration_invalid',503);
 if(!workerEnabled||workerEventId!==pin.event_id)throw new GatewayError('pinned_review_worker_scope_required',503);
 const revision=reviewer.loadForRender(pin.event_id,pin.revision_id);
 if(revision.plan_hash!==pin.plan_hash)throw new GatewayError('pinned_review_plan_mismatch',409);
 const queued=renderer.enqueue(pin.event_id,{reviewRevisionId:pin.revision_id});
 if(!['queued','running','completed_review','review_required'].includes(queued.status))throw new GatewayError('pinned_review_render_not_configured',503);
 return {event_id:pin.event_id,revision_id:pin.revision_id,plan_hash:pin.plan_hash,status:queued.status,duplicate:queued.duplicate,paid_call:false,release_eligible:false};
}
