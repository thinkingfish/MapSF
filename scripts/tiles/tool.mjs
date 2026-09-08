import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {sha256} from './core.mjs';
const exec=promisify(execFile);
// Official v1.31.2 release asset SHA-256 digests. Updating the CLI is a code review.
const assets={
 'linux-x64':['go-pmtiles_1.31.2_Linux_x86_64.tar.gz','3ed7dbf4ec2e6dfe5e25b6f70d1ffc932729f93c86db353bf514dd71010a312f'],
 'linux-arm64':['go-pmtiles_1.31.2_Linux_arm64.tar.gz','f8bd47e7ea866863489cad588fbaf2f31f42e5821f7a03f009b3769f05801cb1'],
 'darwin-x64':['go-pmtiles-1.31.2_Darwin_x86_64.zip','1f0dc02eee6c58312dd6c509faee1b5c32f0596568af1bf51f1b034e7a88a65b'],
 'darwin-arm64':['go-pmtiles-1.31.2_Darwin_arm64.zip','40528f7f616fcbf91207cd48c8fc023d213f6d86c0cbf1f748732803d1880f3d'],
};
export async function download(url) {
 const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error(`Download failed (${response.status}): ${url}`);
 return Buffer.from(await response.arrayBuffer());
}
export async function extractRegion(url,output,profile) {
 const asset=assets[`${process.platform}-${process.arch}`];
 if(!asset)throw new Error('Tile refresh supports Linux/macOS x64 and arm64; use the CI candidate on other platforms.');
 const directory=await mkdtemp(join(tmpdir(),'mapsf-pmtiles-'));
 try {
  const [name,checksum]=asset;
  const bytes=await download(`https://github.com/protomaps/go-pmtiles/releases/download/v1.31.2/${name}`);
  if(sha256(bytes)!==checksum)throw new Error('PMTiles CLI checksum mismatch');
  const archive=join(directory,name);await writeFile(archive,bytes);
  if(name.endsWith('.zip'))await exec('unzip',['-q',archive,'-d',directory]);
  else await exec('tar',['-xzf',archive,'-C',directory]);
  const {stderr}=await exec(join(directory,'pmtiles'),['extract',url,output,`--bbox=${profile.bounds.join(',')}`,`--minzoom=${profile.minzoom}`,`--maxzoom=${profile.maxzoom}`,'--download-threads=4'],{timeout:15*60*1000,maxBuffer:5*1024*1024});
  console.log(stderr.trim());
 }finally{await rm(directory,{recursive:true,force:true});}
}
