import fs from 'node:fs/promises';
import {bindSourceRender} from './lib/bind-source-render.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/bind-live-source-render.mjs CURRENT_03S_EXPORT.json OUTPUT.json');
const workflow=bindSourceRender(JSON.parse(await fs.readFile(input,'utf8')));
await fs.writeFile(output,JSON.stringify(workflow,null,2)+'\n');
console.log('Prepared inactive 03S export. Credentials and adapter enabled setting retained. Live import/execution still required.');
