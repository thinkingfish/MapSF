import {mkdir,readFile,writeFile,mkdtemp,rename,rm,stat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openArchive,exportWebTiles,verifyFile,releaseVersion} from './core.mjs';
import {tileProfiles,fontStack,maxArchiveBytes} from '../../config/tiles.mjs';
import {sourceDirectory,releasePath,publicDirectory} from './paths.mjs';

export async function prepareTiles({inputs=sourceDirectory,manifest=releasePath,output=publicDirectory}={}) {
 const release=JSON.parse(await readFile(manifest,'utf8'));
 if(!/^[0-9]{8}-[a-f0-9]{16}$/.test(release.version))throw new Error('Invalid basemap version');
 if(release.version!==releaseVersion(release))throw new Error('Basemap version checksum mismatch');
 if(JSON.stringify(release.bounds)!==JSON.stringify(tileProfiles.web.bounds)||release.minzoom!==tileProfiles.web.minzoom||release.maxzoom!==tileProfiles.web.maxzoom)throw new Error('Tile source bounds/zoom differ from the configured profile');
 for(const name of ['web','ios'])if(JSON.stringify(release.profiles[name])!==JSON.stringify(tileProfiles[name]))throw new Error('Tile profiles changed; refresh and review the basemap first');
 if((await stat(join(inputs,'sf-bay.pmtiles'))).size>maxArchiveBytes)throw new Error('Master archive exceeds budget');
 const archive=await openArchive(join(inputs,'sf-bay.pmtiles'),release.source.sha256);
 await mkdir(dirname(output),{recursive:true});
 const staging=await mkdtemp(join(dirname(output),'.basemap-staging-'));
 try {
  const directory=join(staging,release.version);
  const report=await exportWebTiles(archive,tileProfiles.web,directory);
  if(JSON.stringify(report)!==JSON.stringify(release.web))throw new Error('Tile inventory differs from the reviewed release');
  for(const range of report.glyphRanges) {
   const name=`fonts/${fontStack}/${range}.pbf`;
   const bytes=await verifyFile(join(inputs,name),release.files[name]);
   if(bytes.length>tileProfiles.web.maxFileBytes)throw new Error('Glyph file exceeds budget');
   await mkdir(dirname(join(directory,name)),{recursive:true});await writeFile(join(directory,name),bytes);
  }
  for(const name of ['OFL.txt','NOTICE.txt']) {
   const bytes=await verifyFile(join(inputs,name),release.files[name]);
   await writeFile(join(directory,name),bytes);
  }
  await writeFile(join(directory,'manifest.json'),JSON.stringify(release,null,2)+'\n');
  if(report.tileCount+report.glyphRanges.length+3>tileProfiles.web.maxFiles)throw new Error('Basemap asset count exceeds budget');
  // Only replace generated assets after every committed input has been verified.
  const previous=`${output}.previous`;
  await rm(previous,{recursive:true,force:true});
  let moved=false;
  try{await rename(output,previous);moved=true;}catch(error){if(error.code!=='ENOENT')throw error;}
  try{await rename(staging,output);}catch(error){if(moved)await rename(previous,output);throw error;}
  await rm(previous,{recursive:true,force:true});
  console.log(`Basemap ${release.version}: ${report.tileCount} local vector tiles, ${report.glyphRanges.length} font ranges`);
  return release;
 }finally{await rm(staging,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await prepareTiles();
