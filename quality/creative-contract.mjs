// Creative approval is separate from codec, duration and audio-level validation.
export function validateCreativeApproval(review){
  const errors=[];
  if(!review?.componentId)errors.push('An explicit executable component is required.');
  if(!review?.renderId)errors.push('Review must identify the exact rendered sample.');
  if(!review?.humanReviewer)errors.push('Human review is required.');
  if(!Number.isFinite(review?.score)||review.score<8)errors.push('The owner must rate this exact sample at least 8/10.');
  for(const key of ['visualLogic','motionComplete','textReadable','voiceNatural','soundSupportsAction','syncApproved']){
    if(review?.checks?.[key]!==true)errors.push(`Not approved: ${key}`);
  }
  return {approved:errors.length===0,errors};
}
