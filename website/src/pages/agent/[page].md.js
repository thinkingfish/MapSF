import { documents } from './_documents.mjs';
export function getStaticPaths() {
  return documents.map(({slug,body}) => ({params:{page:slug},props:{body}}));
}
export function GET({props}) {
  return new Response(props.body, {headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
