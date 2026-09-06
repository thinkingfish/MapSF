#!/usr/bin/env node
// Generate checked architecture SVGs using only Node.js built-ins.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'MapSF');
const COLORS = { interface: '#FBB4AE', state: '#B3CDE3', core: '#CCEBC5', foundation: '#F2F2F2' };
const read = path => readFileSync(path, 'utf8');
const require = (ok, message) => assert.ok(ok, message);
const equalSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[c]);
const decimal = value => Number.isInteger(value) ? `${value}.0` : String(value);

function swiftFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return swiftFiles(path);
    return entry.isFile() && entry.name.endsWith('.swift') ? [relative(APP, path).split('\\').join('/')] : [];
  });
}

function project() {
  // Read the OpenStep plist; reject unsupported syntax instead of skipping it.
  const raw = read(join(ROOT, 'MapSF.xcodeproj/project.pbxproj'));
  const pattern = /\s+|\/\*.*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;,"]+/gs;
  const tokens = [];
  let end = 0;
  for (const match of raw.matchAll(pattern)) {
    require(match.index === end, 'Unsupported Xcode project syntax');
    end = match.index + match[0].length;
    const value = match[0];
    if (value.trim() && !value.startsWith('/*') && !value.startsWith('//')) tokens.push(value);
  }
  require(end === raw.length, 'Unparsed project suffix');
  let pos = 0;
  function take(expected) {
    require(pos < tokens.length, 'Unexpected end of Xcode project');
    const value = tokens[pos++];
    require(expected === undefined || value === expected, `Expected ${expected}, got ${value}`);
    return value;
  }
  function parse() {
    const value = take();
    if (value === '{') {
      const result = Object.create(null);
      while (tokens[pos] !== '}') {
        const key = take().replace(/^"|"$/g, '');
        take('=');
        require(!Object.hasOwn(result, key), `Duplicate project key: ${key}`);
        result[key] = parse();
        take(';');
      }
      take('}');
      return result;
    }
    if (value === '(') {
      const result = [];
      while (tokens[pos] !== ')') {
        result.push(parse());
        if (tokens[pos] !== ')') take(',');
      }
      take(')');
      return result;
    }
    return value.startsWith('"') ? value.slice(1, -1) : value;
  }
  const result = parse();
  require(pos === tokens.length, 'Trailing project tokens');
  return result.objects;
}

function facts() {
  const objects = project();
  const targets = Object.values(objects).filter(v => v.isa === 'PBXNativeTarget');
  require(targets.length === 1 && targets[0].name === 'MapSF', 'Target inventory changed');
  const target = targets[0];
  const groups = target.fileSystemSynchronizedGroups.map(x => objects[x]);
  require(equalSet(new Set(groups.map(g => g.path)), new Set(['Views', 'State', 'Services', 'Models', 'Data', 'Resources'])), 'Classify changed synchronized groups');
  const sources = new Set();
  for (const group of groups) {
    require(!group.exceptions?.length, 'Handle synchronized group exceptions');
    for (const path of swiftFiles(join(APP, group.path))) sources.add(path);
  }
  for (const id of target.buildPhases) {
    const phase = objects[id];
    if (phase.isa === 'PBXSourcesBuildPhase') {
      for (const file of phase.files) sources.add(objects[objects[file].fileRef].path);
    }
  }
  require(equalSet(sources, new Set(swiftFiles(APP))), 'Swift files and target membership differ');
  assert.deepEqual(target.packageProductDependencies.map(x => objects[x].productName), ['MapLibre'], 'Classify changed package products');
  // Preserve strings (URLs are evidence); ignore previews and comment-only lines.
  const code = Object.fromEntries([...sources].map(p => [p, read(join(APP, p)).split('#Preview')[0].replace(/^\s*\/\/[^\n]*/gm, '')]));
  function claim(path, ...snippets) {
    require(Object.hasOwn(code, path), `Missing source: ${path}`);
    for (const snippet of snippets) require(code[path].includes(snippet), `Runtime claim changed in ${path}: ${snippet}`);
  }
    claim('MapSFApp.swift', '.environment(albumLoader)', '.environment(mapState)',
          '.environment(locationManager)', 'albumLoader.evictAllCaches()', 'mapState.clearAll()', 'clearCoverImageCache()')
    claim('ContentView.swift', 'AlbumGalleryView()', 'SplashView(')
    claim('Views/AlbumGalleryView.swift', 'MapExplorerView(initialAlbum: album)')
    claim('Views/MapExplorerView.swift', 'mapState.setAlbum(initialAlbum)', 'MapLibreMapView()', 'CurationInfoPanel()', 'QuerySheet()')
    claim('Services/AlbumLoader.swift', 'forResource: "albums"', 'withExtension: "json"',
          'JSONDecoder().decode(AlbumsContainer.self', 'GeoJSONParser.parse(data: data)',
          'loadedCurations[album.id] = curations', 'if let cached = loadedCurations[album.id]',
          'cachedPOIs', 'cachedSegments', 'cachedAreas')
    claim('Services/GeoJSONParser.swift', 'JSONDecoder().decode(GeoJSONFeatureCollection.self',
          'return .poi(poi)', 'return .segment(segment)', 'return .area(area)')
    claim('Views/MapLibreMapView.swift', 'withExtension: "mbtiles"', 'let tileURL = "mbtiles://',
          'appendingPathComponent("mapstyle.json")', 'styleJSON.write(to: styleFile',
          'mapView.styleURL = styleURL', 'MLNMapView(frame:', 'func updateOverlays(',
          'albumLoader.pois(for: album)', 'albumLoader.segments(for: album)', 'albumLoader.areas(for: album)',
          'mapState.select(poi: poi)', 'mapState.select(segment: segment)', 'mapState.select(area: area)')
    claim('Views/CurationInfoPanel.swift', 'mapState.selectedPOI', 'mapState.selectedSegment', 'mapState.selectedArea')
    claim('Views/AlbumCoverView.swift', 'NSCache<NSString, UIImage>()', 'coverImageCache.setObject(image')
    claim('Services/LocationManager.swift', 'manager.requestLocation()', 'userLocation = locations.last?.coordinate')
  require(!code['Services/LocationManager.swift'].includes('startUpdatingLocation('), 'Continuous tracking added');
  require(Object.entries(code).every(([p, s]) => p === 'Services/PMTilesSource.swift' || !s.includes('PMTilesSource')), 'PMTiles is now wired');
  require(!code['Views/MapLibreMapView.swift'].includes('ProximityQuery'), 'Renderer query integration changed');
  require([...code['Views/MapExplorerView.swift'].matchAll(/\binsidePOIIds\b/g)].length === 1, 'Query result is now consumed');
  require(!code['Views/MapLibreMapView.swift'].includes('withExtension: "json"'), 'Check bundled style loading');
  require(!Object.values(code).some(s => /\b(NWListener|HTTPServer|GCDWebServer)\b/.test(s)), 'Check new server wiring');
  const albums = JSON.parse(read(join(APP, 'Data/albums.json'))).albums;
  for (const album of albums) require(statSync(join(APP, 'Data', album.dataFile)).isFile(), `Missing album data: ${album.id}`);
  require(statSync(join(APP, 'Resources/BaseMap/sf-tiles.mbtiles')).isFile(), 'Missing bundled tiles');
  const imports = new Set(Object.values(code).flatMap(s => [...s.matchAll(/^import (\w+)/gm)].map(m => m[1])));
  require(equalSet(imports, new Set(['SwiftUI', 'Foundation', 'CoreLocation', 'MapKit', 'MapLibre'])), 'Classify changed imports');
  require([...sources].every(p => !p.includes('/') || ['Views', 'State', 'Services', 'Models'].includes(p.split('/')[0])), 'Classify Swift files outside the displayed source groups');
  require(statSync(join(APP, 'Resources/BaseMap/style.json')).isFile(), 'Missing bundled style');
  return { sources: [...sources], albums };
}

class SVG {
  constructor(title, subtitle, height) {
    this.height = height;
    this.parts = [];
    this.boxes = [];
    this.texts = [];
    this.lines = [];
    this.parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}" viewBox="0 0 1100 ${height}" role="img" aria-labelledby="title desc">`);
    this.parts.push(`<title id="title">${escape(title)}</title><desc id="desc">${escape(subtitle)}</desc>`);
    this.parts.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#566575"/></marker></defs>');
    this.parts.push(`<rect width="1100" height="${height}" fill="#fff"/>`);
    this.text(40, 46, title, 28, true);
    this.text(40, 79, subtitle, 16);
  }
  overlap(a, b) {
    return a[0] < b[0]+b[2] && b[0] < a[0]+a[2] && a[1] < b[1]+b[3] && b[1] < a[1]+a[3];
  }
  text(x, y, value, size = 17, bold = false, center = false) {
    const width = [...value].length * size * .64;
    const bounds = [center ? x-width/2 : x, y-size, width, size+4];
    require(bounds[0] >= 20 && bounds[0]+width <= 1080 && y+4 <= this.height-10, `Text out of bounds: ${value}`);
    require(this.texts.every(t => !this.overlap(bounds, t)), `Text collision: ${value}`);
    this.texts.push(bounds);
    this.parts.push(`<text x="${center ? decimal(x) : x}" y="${center ? decimal(y) : y}" font-family="DejaVu Sans, sans-serif" font-size="${size}" font-weight="${bold ? 600 : 400}" text-anchor="${center ? 'middle' : 'start'}" fill="#243447">${escape(value)}</text>`);
  }
  box(x, y, w, h, lines, role = 'foundation') {
    const bounds = [x, y, w, h];
    require(x >= 30 && x+w <= 1070 && y >= 100 && y+h <= this.height-20, 'Box out of bounds');
    require(this.boxes.every(b => !this.overlap(bounds, b)), 'Overlapping boxes');
    require(Object.hasOwn(COLORS, role), `Unknown role: ${role}`);
    this.boxes.push(bounds);
    this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${COLORS[role]}" stroke="#b2bac2"/>`);
    const pitch = 27;
    require(lines.length*pitch <= h-24, 'Box needs more height');
    const first = y+h/2-(lines.length-1)*pitch/2+6;
    lines.forEach((line, i) => {
      const size = i === 0 ? 17 : 16;
      require([...line].length*size*.64 < w-28, `Label too wide: ${line}`);
      this.text(x+w/2, first+i*pitch, line, size, i === 0, true);
    });
    return bounds;
  }
  arrow(a, b) {
    require(a[1]+a[3]/2 === b[1]+b[3]/2, 'Flow boxes must align');
    const x1 = a[0]+a[2], x2 = b[0], y = a[1]+a[3]/2;
    require(x2-x1 >= 24, 'Arrow needs clearance');
    this.lines.push([x1+2, y-3, x2-x1-4, 6]);
    this.parts.push(`<path d="M${x1} ${decimal(y)} H${x2}" fill="none" stroke="#566575" stroke-width="1.4" marker-end="url(#arrow)"/>`);
  }
  finish() {
    for (const line of this.lines) {
      require(this.texts.every(t => !this.overlap(line, t)), 'Connector crosses text');
      require(this.boxes.every(b => !this.overlap(line, b)), 'Connector crosses shape');
    }
    this.parts.push('</svg>');
    // Fixed SVG templates plus escaped text; no external XML parser dependency.
    return this.parts.join('\n')+'\n';
  }
}

function generate() {
  const { sources, albums } = facts();
  const s = new SVG('MapSF / code structure', 'One iOS app target · source groups and bundled resources · no dependency-order claim', 1130);
  s.text(40, 127, 'APPLICATION', 14, true);
  const roots = sources.filter(p => !p.includes('/')).map(p => basename(p, '.swift')).sort();
  assert.deepEqual(roots, ['ContentView', 'MapSFApp'], 'Classify root Swift sources');
  s.box(40, 146, 1020, 86, ['MapSF.app', roots.join(' + ')], 'interface');
  const sections = [['Views', 'interface', 40, 260, 490, 300], ['Services', 'core', 570, 260, 490, 300],
    ['State', 'state', 40, 588, 490, 228], ['Models', 'foundation', 570, 588, 490, 228]];
  for (const [folder, role, x, y, w, h] of sections) {
    let names = sources.filter(p => p.startsWith(folder+'/')).map(p => basename(p, '.swift')).sort();
    if (folder === 'Services') names = names.map(n => n + (n === 'PMTilesSource' ? ' (unused)' : ''));
    if (folder === 'State') names.push('Active albums', 'Selection and query settings');
    s.box(x, y, w, h, [folder.toUpperCase(), ...names], role);
  }
  s.box(40, 844, 490, 154, ['BUNDLED CONTENT', `albums.json + ${albums.length} GeoJSON albums`, 'Cover images and asset catalogs', 'sf-tiles.mbtiles + style.json'], 'state');
  s.box(570, 844, 490, 154, ['FRAMEWORKS', 'MapLibre · Swift package product', 'SwiftUI · CoreLocation', 'Foundation · MapKit']);
  s.text(40, 1042, 'Folders are source groups within one target, not separate Swift modules.', 16);
  s.text(40, 1072, 'The renderer builds its style in code; bundled style.json is not loaded by that path.', 16);
  s.text(40, 1102, 'Generated from Xcode target membership and Swift source assertions.', 14);
  const r = new SVG('MapSF / runtime paths', 'Selected in-process flows · arrows show data or state propagation', 1160);
  function row(y, title, nodes, note) {
    r.text(40, y, title, 20, true);
    const boxes = nodes.map(([labels, role], i) => r.box(40+i*354, y+25, 312, 132, labels, role));
    r.arrow(boxes[0], boxes[1]);
    r.arrow(boxes[1], boxes[2]);
    if (note) r.text(40, y+190, note, 16);
    return boxes;
  }
  row(128, '01 / Load album content', [
    [['Bundled album data', 'albums.json', 'albums/*.geojson'], 'state'],
    [['AlbumLoader', 'GeoJSONParser', 'Decode on cache miss'], 'core'],
    [['Curation caches', 'loadedCurations', 'POIs / segments / areas'], 'state']],
    'MapLibreMapView.Coordinator reads the cached models to create map overlays.');
  row(372, '02 / Select a map feature', [
    [['MapLibreMapView', 'Coordinator.handleTap', 'POI / segment / area'], 'interface'],
    [['MapState', 'select / clearSelection', 'Observable selection'], 'state'],
    [['CurationInfoPanel', 'Reads selected item', 'Displays item details'], 'interface']],
    'MapState also drives selection styling in MapLibreMapView.');
  const boxes = row(616, '03 / Load the basemap', [
    [['sf-tiles.mbtiles', 'Bundled vector tiles', 'Native mbtiles:// access'], 'state'],
    [['MapLibre', 'MLNMapView', 'Renders tile geometry'], 'core'],
    [['Map surface', 'Basemap + app overlays', 'UIKit inside SwiftUI'], 'interface']]);
  const style = r.box(394, 830, 312, 86, ['mapstyle.json', 'Temporary style file'], 'state');
  const center = style[0]+style[2]/2, top = boxes[1][1]+boxes[1][3];
  require(center === boxes[1][0]+boxes[1][2]/2, 'Style connector must be centered');
  r.parts.push(`<path d="M${decimal(center)} ${style[1]} V${top}" fill="none" stroke="#566575" stroke-width="1.4" marker-end="url(#arrow)"/>`);
  r.lines.push([center-3, top+2, 6, style[1]-top-4]);
  r.text(40, 950, 'The generated style references local tiles; no app-owned HTTP tile server is used.', 16);
  r.text(40, 982, 'QuerySheet edits query settings, but proximity results do not reach this renderer.', 16);
  r.text(40, 1014, 'LocationManager requests one-shot locations. PMTilesSource has no callers.', 16);
  r.text(40, 1046, 'Cover images use a separate NSCache; memory warnings evict app caches and state.', 16);
  r.text(40, 1082, 'Pink = interface   Blue = state / storage   Green = processing   Gray = foundations', 14);
  r.text(40, 1114, "Scope: app-level wiring. MapLibre's internal threads are not modeled.", 14);
  return { 'docs/architecture.svg': s.finish(), 'docs/architecture-runtime.svg': r.finish() };
}

function main() {
  const args = process.argv.slice(2);
  require(args.length === 0 || (args.length === 1 && ['--check', '--help'].includes(args[0])), 'Usage: node scripts/generate-architecture.mjs [--check|--help]');
  if (args[0] === '--help') {
    console.log('Usage: node scripts/generate-architecture.mjs [--check]\nGenerate architecture SVGs; --check rejects stale output. No npm packages required.');
    return;
  }
  const check = args[0] === '--check';
  const outputs = generate();
  for (const [name, content] of Object.entries(outputs)) {
    const path = join(ROOT, name);
    if (check) require(existsSync(path) && read(path) === content, `Stale diagram: ${name}; run node scripts/generate-architecture.mjs`);
    else writeFileSync(path, content);
  }
  console.log(`${check ? 'Checked' : 'Generated'} ${Object.keys(outputs).length} diagrams; source claims and geometry passed.`);
}

try { main(); }
catch (error) {
  console.error(`Architecture check failed: ${error.message}`);
  process.exitCode = 1;
}
