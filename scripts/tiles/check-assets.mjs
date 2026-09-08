import {readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {repoRoot} from './paths.mjs';
let count=0,bytes=0;
async function check(directory) {
 for(const entry of await readdir(directory,{withFileTypes:true})) {
  const path=join(directory,entry.name);
  if(entry.isDirectory())await check(path);
  else {const size=(await stat(path)).size;if(size>25*1024*1024)throw new Error(`Cloudflare asset exceeds 25 MiB: ${path}`);count++;bytes+=size;}
 }
}
await check(join(repoRoot,'dist'));
if(count>20000)throw new Error(`Cloudflare free-tier file count exceeded: ${count}`);
console.log(`Cloudflare assets: ${count}/20000 files, ${(bytes/1024/1024).toFixed(1)} MiB`);
