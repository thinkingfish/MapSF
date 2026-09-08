import { documents } from './_documents.mjs';
export function getStaticPaths() {
  return documents.filter(doc=>doc.data).map(({slug,data})=>({params:{day:slug},props:{data}}));
}
export function GET({props}) {
  return new Response(JSON.stringify(props.data,null,2)+'\n', {headers:{'Content-Type':'application/json; charset=utf-8'}});
}
