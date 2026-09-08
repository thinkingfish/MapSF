import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {tileRange, tilesInProfile, verifyFile, exportMBTiles, exportWebTiles, sha256} from '../scripts/tiles/core.mjs';

// Minimal valid MVT water layer with one point, version 2, extent 4096.
const tile=Buffer.from([0x1a,0x15,0x0a,0x05,0x77,0x61,0x74,0x65,0x72,0x12,0x07,0x18,0x01,0x22,0x03,0x09,0x00,0x00,0x28,0x80,0x20,0x78,0x02]);
const profile={bounds:[-10,1,-1,10],minzoom:2,maxzoom:2,maxBytes:1048576,maxFiles:10,maxFileBytes:1048576};
const archive={getZxy:async()=>({data:tile}),getMetadata:async()=>({vector_layers:[{id:'water',fields:{}}]})};

test('tile ranges use XYZ north-to-south rows, including exact edges',()=>{
 assert.deepEqual(tileRange([-180,0,0,85.0511287798066],1),{minX:0,maxX:0,minY:0,maxY:0});
 assert.deepEqual([...tilesInProfile(profile)],[{z:2,x:1,y:1}]);
 assert.throws(()=>tileRange([1,0,-1,1],2),/bounds/);
});
test('checksums reject changed input',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mapsf-test-'));
 try {const path=join(dir,'input');await writeFile(path,tile);await verifyFile(path,sha256(tile));await assert.rejects(verifyFile(path,'0'.repeat(64)),/checksum/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('iOS export flips XYZ to TMS and preserves exact decompressed vector bytes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mapsf-test-'));
 try {
  const path=join(dir,'test.mbtiles');const report=await exportMBTiles(archive,profile,path);
  assert.equal(report.tileCount,1);
  const db=new DatabaseSync(path,{readOnly:true});
  const row=db.prepare('SELECT * FROM tiles').get();
  assert.equal(row.zoom_level,2);assert.equal(row.tile_column,1);assert.equal(row.tile_row,2);
  assert.deepEqual(gunzipSync(row.tile_data),tile);
  assert.equal(db.prepare("SELECT value FROM metadata WHERE name='format'").get().value,'pbf');
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('incomplete or oversized exports leave previous iOS file untouched',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mapsf-test-'));const path=join(dir,'test.mbtiles');await writeFile(path,'previous');
 try {
  await assert.rejects(exportMBTiles({getZxy:async()=>undefined},profile,path),/Missing tile 2\/1\/1/);
  assert.equal(await readFile(path,'utf8'),'previous');
  await assert.rejects(exportMBTiles(archive,{...profile,maxBytes:1},path),/budget/);
  assert.equal(await readFile(path,'utf8'),'previous');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('web export writes raw XYZ PBF and enforces file limits',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mapsf-test-'));
 try {
  const report=await exportWebTiles(archive,profile,join(dir,'tiles'));
  assert.deepEqual(await readFile(join(dir,'tiles/2/1/1.pbf')),tile);assert.equal(report.tileCount,1);
  await assert.rejects(exportWebTiles(archive,{...profile,maxFiles:0},join(dir,'too-many')),/budget/);
  await assert.rejects(exportWebTiles(archive,{...profile,maxFileBytes:1},join(dir,'too-large')),/budget/);
  await assert.rejects(exportWebTiles({getZxy:async()=>({data:Buffer.from('invalid')})},profile,join(dir,'invalid')),/Invalid vector tile/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('build preparation rejects tampering without removing the previous map assets',async()=>{
 const {prepareTiles}=await import('../scripts/tiles/prepare.mjs');
 const {sourceDirectory,releasePath}=await import('../scripts/tiles/paths.mjs');
 const {cp,mkdir}=await import('node:fs/promises');
 const directory=await mkdtemp(join(tmpdir(),'mapsf-prepare-test-'));
 try {
  const inputs=join(directory,'inputs');await cp(sourceDirectory,inputs,{recursive:true});
  const output=join(directory,'output');await mkdir(output);await writeFile(join(output,'previous'),'keep');
  // A corrupted font is found after tile generation, but before publication.
  await writeFile(join(inputs,'fonts/Noto Sans Regular/0-255.pbf'),'corrupt');
  await assert.rejects(prepareTiles({inputs,manifest:releasePath,output}),/checksum/);
  assert.equal(await readFile(join(output,'previous'),'utf8'),'keep');
  const manifest=JSON.parse(await readFile(releasePath,'utf8'));
  manifest.version='20260907-0000000000000000';
  const changed=join(directory,'release.json');await writeFile(changed,JSON.stringify(manifest));
  await assert.rejects(prepareTiles({inputs,manifest:changed,output}),/version.*checksum/i);
  assert.equal(await readFile(join(output,'previous'),'utf8'),'keep');
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('committed iOS bundle matches the reviewed release and zoom inventory',async()=>{
 const {repoRoot,releasePath}=await import('../scripts/tiles/paths.mjs');
 const release=JSON.parse(await readFile(releasePath,'utf8'));
 const path=join(repoRoot,'MapSF/Resources/BaseMap/sf-tiles.mbtiles');
 await verifyFile(path,release.ios.sha256);
 const db=new DatabaseSync(path,{readOnly:true});
 try {
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  const counts=Object.fromEntries(db.prepare('SELECT zoom_level, COUNT(*) AS count FROM tiles GROUP BY zoom_level ORDER BY zoom_level').all().map(row=>[row.zoom_level,row.count]));
  assert.deepEqual(counts,release.ios.byZoom);
  assert.equal(db.prepare("SELECT value FROM metadata WHERE name='bounds'").get().value,release.ios.bounds.join(','));
 }finally{db.close();}
});
