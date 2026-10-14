import fs from 'node:fs/promises';
import {buildUploadedScriptPlan} from '../src/semantic/uploaded-script-plan.mjs';
const [source,assets,output]=process.argv.slice(2);
if(!source||!assets||!output)throw Error('Usage: prepare-uploaded-script-pitch.mjs MEASURED_PLAN ASSET_CONFIG OUTPUT_PLAN');
const plan=buildUploadedScriptPlan(JSON.parse(await fs.readFile(source,'utf8')),JSON.parse(await fs.readFile(assets,'utf8')));
await fs.writeFile(output,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({duration:plan.duration,scenes:plan.sentences.length,sentenceBeats:plan.sentenceBeats.length,objects:plan.objects.length,actions:plan.actions.length,sfx:plan.soundEvents.length}));
