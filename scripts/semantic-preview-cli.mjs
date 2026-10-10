import fs from 'node:fs/promises';
import path from 'node:path';
import {renderSemanticPreview} from '../semantic-preview.mjs';
const [input,output,width='1080']=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: semantic-preview-cli.mjs SPEC.json OUTPUT.mp4 [540|1080]');
const spec=JSON.parse(await fs.readFile(input,'utf8'));
const metadata=await renderSemanticPreview({spec,outputPath:path.resolve(output),width:Number(width),onProgress:(f,total)=>console.log(`Rendered ${f}/${total}`)});
console.log(JSON.stringify(metadata));
