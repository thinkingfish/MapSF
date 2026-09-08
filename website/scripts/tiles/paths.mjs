import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const repoRoot=fileURLToPath(new URL('../../../',import.meta.url));
export const sourceDirectory=resolve(repoRoot,'maps/basemap');
export const releasePath=resolve(repoRoot,'website/config/basemap-release.json');
export const publicDirectory=resolve(repoRoot,'website/public/basemap');
