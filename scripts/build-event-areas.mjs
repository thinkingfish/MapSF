import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const groups=JSON.parse(await readFile(new URL('config/event-areas.json',root),'utf8'));
const source=JSON.parse(await readFile(new URL('public/neighborhoods/analysis.geojson',root),'utf8'));
const assignment=new Map();
for(const group of groups){
 const id='area-'+group.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 for(const name of group.members){assert.ok(!assignment.has(name),'Duplicate assignment: '+name);assignment.set(name,{id,name:group.name});}
}
assert.equal(groups.length,15);assert.equal(assignment.size,source.features.length);
const features=source.features.map(f=>{const group=assignment.get(f.properties.name);assert.ok(group,'Unassigned neighborhood: '+f.properties.name);return {...f,properties:group};});
const dir=await mkdtemp(join(tmpdir(),'mapsf-areas-'));
try {
 const input=join(dir,'input.geojson'),output=join(dir,'output.geojson');
 await writeFile(input,JSON.stringify({type:'FeatureCollection',features}));
 const args=[input,'-dissolve','id','copy-fields=name','-o',output,'format=geojson'];
 execFileSync(process.env.MAPSHAPER_BIN || 'pnpm',process.env.MAPSHAPER_BIN?args:['dlx','mapshaper@0.7.61',...args],{stdio:'inherit'});
 const data=JSON.parse(await readFile(output,'utf8'));
 assert.equal(data.features.length,groups.length);
 data.features=data.features.map(f=>({...f,id:f.properties.id})).sort((a,b)=>a.properties.name.localeCompare(b.properties.name));
 await writeFile(new URL('public/neighborhoods/event-areas.geojson',root),JSON.stringify(data)+'\n');
} finally {await rm(dir,{recursive:true,force:true});}
