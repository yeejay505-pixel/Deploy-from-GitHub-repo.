import fs from 'node:fs/promises';
import {buildSupplyGapPlan} from '../src/semantic/supply-gap-plan.mjs';
const [source,assets,out]=process.argv.slice(2);
const plan=buildSupplyGapPlan(JSON.parse(await fs.readFile(source,'utf8')),JSON.parse(await fs.readFile(assets,'utf8')));
await fs.writeFile(out,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({duration:plan.duration,scenes:plan.sentences.length,objects:plan.objects.length,actions:plan.actions.length,sfx:plan.soundEvents.length}));
