import assert from 'node:assert/strict';
import {officeState,OFFICE_DURATION,OFFICE_FPS,OFFICE_EVENTS,OFFICE_NARRATION} from '../src/semantic/office-demand.mjs';
import {validateCreativeApproval} from '../quality/creative-contract.mjs';

// Review-relevant invariants: no occupants before arrival, monotonically populated desks,
// twelve people fully settled before final hold, and no technical pass bypasses approval.
assert.equal(officeState(10).occupied,0);
let previous=0;
for(let f=0;f<OFFICE_DURATION*OFFICE_FPS;f++){
  const s=officeState(f/OFFICE_FPS);
  assert.ok(s.occupied>=previous && s.occupied<=12);
  assert.ok(s.arrivals.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
  previous=s.occupied;
}
const final=officeState((OFFICE_DURATION*OFFICE_FPS-1)/OFFICE_FPS);
assert.equal(final.occupied,12);assert.equal(final.floorOpened,1);assert.equal(final.partitionShift,1);assert.equal(final.completed,true);
assert.ok(OFFICE_EVENTS.every(e=>e.at>=0&&e.at<OFFICE_DURATION));
assert.equal(OFFICE_NARRATION[0].start,0);assert.equal(OFFICE_NARRATION.at(-1).end,OFFICE_DURATION);
assert.equal(validateCreativeApproval({technicalQa:'PASS'}).approved,false);
const approved={componentId:'office-demand-v01',renderId:'test-01',humanReviewer:'owner',score:8,checks:Object.fromEntries(['visualLogic','motionComplete','textReadable','voiceNatural','soundSupportsAction','syncApproved'].map(x=>[x,true]))};
assert.equal(validateCreativeApproval(approved).approved,true);
assert.equal(validateCreativeApproval({...approved,checks:{...approved.checks,voiceNatural:false}}).approved,false);
console.log('PASS: final state, arrival order, timing, and human/voice approval gating.');
