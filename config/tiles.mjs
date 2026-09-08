// Bounds: west, south, east, north. All tile URLs use XYZ; MBTiles rows use TMS.
export const tileProfiles = {
  web: {bounds:[-122.65,37.60,-122.20,37.95],minzoom:8,maxzoom:15,maxBytes:180*1024*1024,maxFiles:18000,maxFileBytes:25*1024*1024},
  ios: {bounds:[-122.55,37.70,-122.35,37.85],minzoom:10,maxzoom:15,maxBytes:20*1024*1024},
};
export const maxArchiveBytes = 90*1024*1024;
export const fontStack = 'Noto Sans Regular';
export const fontRevision = '028c18f713baecad011301ff7a69acc39bcc2ae7';
export const fontBaseURL = `https://raw.githubusercontent.com/protomaps/basemaps-assets/${fontRevision}/fonts/`;
