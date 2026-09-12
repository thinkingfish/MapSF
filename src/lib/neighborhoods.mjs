// Polygon intersection in WGS84 coordinates for city-scale neighborhood filters.
// Boundaries count as matches; holes and disconnected islands are preserved.
const EPS=1e-12;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const onSegment=(p,a,b)=>Math.abs(cross(a,b,p))<=EPS
 &&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS
 &&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;
function segmentsIntersect(a,b,c,d){
 const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 return ((abC>EPS&&abD < -EPS||abC < -EPS&&abD>EPS)&&(cdA>EPS&&cdB < -EPS||cdA < -EPS&&cdB>EPS))
 ||onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
function ringPosition(p,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i];
  if(onSegment(p,a,b))return 0;
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?1:-1;
}
function contains(p,polygon){
 const outer=ringPosition(p,polygon[0]);
 if(outer<=0)return outer===0;
 for(const hole of polygon.slice(1)){const pos=ringPosition(p,hole);if(pos===0)return true;if(pos===1)return false;}
 return true;
}
function pathsIntersect(a,b){
 for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++)if(segmentsIntersect(a[i-1],a[i],b[j-1],b[j]))return true;
 return false;
}
function intersectsPolygon(geometry,polygon){
 if(geometry.type==='Point')return contains(geometry.coordinates,polygon);
 const paths=geometry.type==='LineString'?[geometry.coordinates]:geometry.coordinates;
 if(paths.some(path=>path.some(p=>contains(p,polygon))))return true;
 if(paths.some(path=>polygon.some(ring=>pathsIntersect(path,ring))))return true;
 return geometry.type==='Polygon'&&contains(polygon[0][0],geometry.coordinates);
}
export function geometryIntersectsNeighborhood(geometry,neighborhood){
 if(geometry.type==='MultiPolygon')return geometry.coordinates.some(coordinates=>geometryIntersectsNeighborhood({type:'Polygon',coordinates},neighborhood));
 const polygons=neighborhood.type==='MultiPolygon'?neighborhood.coordinates:[neighborhood.coordinates];
 return polygons.some(polygon=>intersectsPolygon(geometry,polygon));
}

export function validateNeighborhoodCollection(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)return false;
 const ids=new Set();
 return data.features.every(f=>{
  if(f.type!=='Feature'||typeof f.id!=='string'||!f.id||ids.has(f.id)||f.properties?.id!==f.id||typeof f.properties?.name!=='string'||!f.properties.name.trim())return false;
  ids.add(f.id);
  const g=f.geometry;
  if(!['Polygon','MultiPolygon'].includes(g?.type))return false;
  const polygons=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
  return Array.isArray(polygons)&&polygons.length>0&&polygons.every(p=>Array.isArray(p)&&p.length>0&&p.every(r=>Array.isArray(r)&&r.length>=4&&r.every(v=>Array.isArray(v)&&v.length===2&&Number.isFinite(v[0])&&Number.isFinite(v[1])&&v[0]>=-123&&v[0]<=-122&&v[1]>=37&&v[1]<=38.5)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]));
 });
}
