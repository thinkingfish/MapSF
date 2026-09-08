import {readFile, writeFile, mkdir, rename, rm, stat} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {PMTiles} from 'pmtiles';
import {VectorTile} from '@mapbox/vector-tile';
import {PbfReader} from 'pbf';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function releaseVersion(release) {
  const {version: _version, ...contents}=release;
  const match=contents.source.url.match(/^https:\/\/build\.protomaps\.com\/(\d{8})\.pmtiles$/);
  if(!match)throw new Error('Invalid dated Protomaps source URL');
  return match[1]+'-'+sha256(JSON.stringify(contents)).slice(0,16);
}
export async function verifyFile(path, expected) {
  const data=await readFile(path);
  if (sha256(data)!==expected) throw new Error(`Input checksum mismatch: ${path}`);
  return data;
}

export function tileRange(bounds,z) {
  const [w,s,e,n]=bounds;
  if (bounds.length!==4 || !bounds.every(Number.isFinite) || w>=e || s>=n || w< -180 || e>180 || s< -85.0511287798066 || n>85.0511287798066 || !Number.isInteger(z) || z<0 || z>22) throw new Error('Invalid tile bounds or zoom');
  const size=2**z;
  const x=lon=>(lon+180)/360*size;
  const y=lat=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*size;
  const clamp=value=>Math.max(0,Math.min(size-1,value));
  return {minX:clamp(Math.floor(x(w))),maxX:clamp(Math.ceil(x(e))-1),minY:clamp(Math.floor(y(n))),maxY:clamp(Math.ceil(y(s))-1)};
}
export function* tilesInProfile(profile) {
  if (!Number.isInteger(profile.minzoom)||!Number.isInteger(profile.maxzoom)||profile.minzoom>profile.maxzoom) throw new Error('Invalid zoom profile');
  for(let z=profile.minzoom;z<=profile.maxzoom;z++) {
    const {minX,maxX,minY,maxY}=tileRange(profile.bounds,z);
    for(let x=minX;x<=maxX;x++) for(let y=minY;y<=maxY;y++) yield {z,x,y};
  }
}
export async function openArchive(path, expected) {
  const bytes=expected ? await verifyFile(path,expected) : await readFile(path);
  const archive=new PMTiles({getKey:()=>path,getBytes:async(offset,length)=>{
    // The PMTiles reader's initial header prefetch may extend beyond tiny archives.
    const data=bytes.subarray(offset,offset+length);
    return {data:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
  }});
  const header=await archive.getHeader();
  if(header.tileType!==1) throw new Error('Expected an MVT PMTiles archive');
  return archive;
}

async function readTile(archive,{z,x,y},ranges) {
  const result=await archive.getZxy(z,x,y);
  if(!result) throw new Error(`Missing tile ${z}/${x}/${y}`);
  const data=Buffer.from(result.data);
  try {
    const tile=new VectorTile(new PbfReader(data));
    if(!Object.keys(tile.layers).length) throw new Error('No layers');
    for(const layer of Object.values(tile.layers)) {
      for(let i=0;i<layer.length;i++) {
        const properties=layer.feature(i).properties;
        const label=properties['name:en']??properties.name;
        if(typeof label==='string') for(const character of label) {
          const code=character.codePointAt(0);
          // MapLibre glyph PBF ranges cover the BMP; astral glyphs use local fonts.
          if(code<=65535) ranges.add(Math.floor(code/256)*256);
        }
      }
    }
  } catch(error) {throw new Error(`Invalid vector tile ${z}/${x}/${y}: ${error.message}`);}
  return data;
}
function reportFor(profile) {return {bounds:profile.bounds,minzoom:profile.minzoom,maxzoom:profile.maxzoom,tileCount:0,bytes:0,byZoom:{}};}
function account(report,z,bytes,profile) {
  report.tileCount++;report.bytes+=bytes;
  report.byZoom[z]=(report.byZoom[z]??0)+1;
  if(report.tileCount>(profile.maxFiles??Infinity)||bytes>(profile.maxFileBytes??Infinity)||report.bytes>profile.maxBytes) throw new Error('Tile export exceeds configured budget');
}

// Callers provide a fresh staging directory; only complete output is promoted.
export async function exportWebTiles(archive,profile,directory) {
  const report=reportFor(profile),ranges=new Set([0]);
  for(const address of tilesInProfile(profile)) {
    const data=await readTile(archive,address,ranges);
    account(report,address.z,data.length,profile);
    const path=join(directory,String(address.z),String(address.x),`${address.y}.pbf`);
    await mkdir(dirname(path),{recursive:true});await writeFile(path,data);
  }
  report.glyphRanges=[...ranges].sort((a,b)=>a-b).map(start=>`${start}-${start+255}`);
  return report;
}
export async function exportMBTiles(archive,profile,path) {
  await mkdir(dirname(path),{recursive:true});
  const temporary=`${path}.${randomUUID()}.tmp`;
  let db;
  try {
    db=new DatabaseSync(temporary);
    db.exec('CREATE TABLE metadata (name TEXT PRIMARY KEY, value TEXT); CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER, tile_row INTEGER, tile_data BLOB, PRIMARY KEY(zoom_level,tile_column,tile_row)); BEGIN');
    const insert=db.prepare('INSERT INTO tiles VALUES (?,?,?,?)');
    const report=reportFor(profile),ranges=new Set();
    for(const address of tilesInProfile(profile)) {
      const data=await readTile(archive,address,ranges);
      const compressed=gzipSync(data,{level:9});
      account(report,address.z,compressed.length,profile);
      insert.run(address.z,address.x,2**address.z-1-address.y,compressed);
    }
    const metadata={name:'MapSF offline basemap',format:'pbf',type:'baselayer',version:'1',bounds:profile.bounds.join(','),minzoom:String(profile.minzoom),maxzoom:String(profile.maxzoom),attribution:'© OpenStreetMap contributors · Protomaps',json:JSON.stringify(await archive.getMetadata())};
    const insertMetadata=db.prepare('INSERT INTO metadata VALUES (?,?)');
    for(const [key,value] of Object.entries(metadata)) insertMetadata.run(key,value);
    db.exec('COMMIT; VACUUM');
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw new Error('Invalid MBTiles SQLite database');
    db.close();db=undefined;
    report.bytes=(await stat(temporary)).size;
    if(report.bytes>profile.maxBytes) throw new Error('iOS archive exceeds configured budget');
    report.sha256=sha256(await readFile(temporary));
    await rename(temporary,path);
    return report;
  } finally {db?.close();await rm(temporary,{force:true});}
}
