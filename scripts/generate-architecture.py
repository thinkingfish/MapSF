#!/usr/bin/env python3
"""Generate checked architecture SVGs. Standard-library only; --check rejects drift."""
import argparse
import html
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'MapSF'
COLORS = {'interface': '#FBB4AE', 'state': '#B3CDE3',
          'core': '#CCEBC5', 'foundation': '#F2F2F2'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def project():
    """Read the OpenStep plist; reject syntax this small reader cannot handle."""
    raw = (ROOT / 'MapSF.xcodeproj/project.pbxproj').read_text()
    pattern = r'\s+|/\*.*?\*/|//[^\n]*|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;,"]+'
    tokens, end = [], 0
    for match in re.finditer(pattern, raw, re.S):
        require(match.start() == end, 'Unsupported Xcode project syntax')
        end = match.end()
        value = match.group()
        if not value.isspace() and not value.startswith(('/*', '//')):
            tokens.append(value)
    require(end == len(raw), 'Unparsed project suffix')
    pos = 0

    def take(expected=None):
        nonlocal pos
        value = tokens[pos]
        pos += 1
        require(expected is None or value == expected, f'Expected {expected}, got {value}')
        return value

    def parse():
        value = take()
        if value == '{':
            result = {}
            while tokens[pos] != '}':
                key = take().strip('"')
                take('=')
                require(key not in result, f'Duplicate project key: {key}')
                result[key] = parse()
                take(';')
            take('}')
            return result
        if value == '(':
            result = []
            while tokens[pos] != ')':
                result.append(parse())
                if tokens[pos] != ')':
                    take(',')
            take(')')
            return result
        return value[1:-1] if value.startswith('"') else value

    result = parse()
    require(pos == len(tokens), 'Trailing project tokens')
    return result['objects']


def facts():
    objects = project()
    targets = [v for v in objects.values() if v['isa'] == 'PBXNativeTarget']
    require(len(targets) == 1 and targets[0]['name'] == 'MapSF', 'Target inventory changed')
    target = targets[0]
    groups = [objects[x] for x in target['fileSystemSynchronizedGroups']]
    require({g['path'] for g in groups} == {'Views', 'State', 'Services', 'Models', 'Data', 'Resources'},
            'Classify changed synchronized groups')
    sources = set()
    for group in groups:
        require(not group.get('exceptions'), 'Handle synchronized group exceptions')
        sources.update(p.relative_to(APP).as_posix() for p in (APP / group['path']).rglob('*.swift'))
    for phase_id in target['buildPhases']:
        phase = objects[phase_id]
        if phase['isa'] == 'PBXSourcesBuildPhase':
            for file_id in phase['files']:
                sources.add(objects[objects[file_id]['fileRef']]['path'])
    require(sources == {p.relative_to(APP).as_posix() for p in APP.rglob('*.swift')},
            'Swift files and target membership differ')
    require([objects[x]['productName'] for x in target['packageProductDependencies']] == ['MapLibre'],
            'Classify changed package products')
    code = {p: (APP / p).read_text().split('#Preview')[0] for p in sources}
    # Preserve strings: URLs are evidence. Ignore comment-only lines.
    code = {p: re.sub(r'(?m)^\s*//[^\n]*', '', s) for p, s in code.items()}

    def claim(path, *snippets):
        require(path in code, f'Missing source: {path}')
        for snippet in snippets:
            require(snippet in code[path], f'Runtime claim changed in {path}: {snippet}')

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
    require('startUpdatingLocation(' not in code['Services/LocationManager.swift'], 'Continuous tracking added')
    require(all('PMTilesSource' not in s for p, s in code.items() if p != 'Services/PMTilesSource.swift'), 'PMTiles is now wired')
    require('ProximityQuery' not in code['Views/MapLibreMapView.swift'], 'Renderer query integration changed')
    require(len(re.findall(r'\binsidePOIIds\b', code['Views/MapExplorerView.swift'])) == 1, 'Query result is now consumed')
    require('withExtension: "json"' not in code['Views/MapLibreMapView.swift'], 'Check bundled style loading')
    require(not any(re.search(r'\b(NWListener|HTTPServer|GCDWebServer)\b', s) for s in code.values()), 'Check new server wiring')
    albums = json.loads((APP / 'Data/albums.json').read_text())['albums']
    for album in albums:
        require((APP / 'Data' / album['dataFile']).is_file(), f'Missing album data: {album["id"]}')
    require((APP / 'Resources/BaseMap/sf-tiles.mbtiles').is_file(), 'Missing bundled tiles')
    imports = {m for s in code.values() for m in re.findall(r'(?m)^import (\w+)', s)}
    require(imports == {'SwiftUI', 'Foundation', 'CoreLocation', 'MapKit', 'MapLibre'}, 'Classify changed imports')
    classified = {p for p in sources if '/' not in p or p.split('/')[0] in {'Views', 'State', 'Services', 'Models'}}
    require(classified == sources, 'Classify Swift files outside the displayed source groups')
    require((APP / 'Resources/BaseMap/style.json').is_file(), 'Missing bundled style')
    return sources, albums


class SVG:
    """Shared drawing primitives with conservative text and connector checks."""
    def __init__(self, title, subtitle, height):
        self.height, self.parts, self.boxes, self.texts, self.lines = height, [], [], [], []
        self.parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="{height}" viewBox="0 0 1100 {height}" role="img" aria-labelledby="title desc">')
        self.parts.append(f'<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(subtitle)}</desc>')
        self.parts.append('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#566575"/></marker></defs>')
        self.parts.append(f'<rect width="1100" height="{height}" fill="#fff"/>')
        self.text(40, 46, title, 28, bold=True)
        self.text(40, 79, subtitle, 16)

    @staticmethod
    def overlap(a, b):
        return a[0] < b[0]+b[2] and b[0] < a[0]+a[2] and a[1] < b[1]+b[3] and b[1] < a[1]+a[3]

    def text(self, x, y, value, size=17, bold=False, center=False):
        width = len(value) * size * .64
        bounds = (x-width/2 if center else x, y-size, width, size+4)
        require(bounds[0] >= 20 and bounds[0]+width <= 1080 and y+4 <= self.height-10, f'Text out of bounds: {value}')
        require(all(not self.overlap(bounds, t) for t in self.texts), f'Text collision: {value}')
        self.texts.append(bounds)
        self.parts.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans, sans-serif" font-size="{size}" font-weight="{600 if bold else 400}" text-anchor="{"middle" if center else "start"}" fill="#243447">{html.escape(value)}</text>')

    def box(self, x, y, w, h, lines, role='foundation'):
        bounds = (x, y, w, h)
        require(x >= 30 and x+w <= 1070 and y >= 100 and y+h <= self.height-20, 'Box out of bounds')
        require(all(not self.overlap(bounds, b) for b in self.boxes), 'Overlapping boxes')
        self.boxes.append(bounds)
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{COLORS[role]}" stroke="#b2bac2"/>')
        pitch = 27
        require(len(lines)*pitch <= h-24, 'Box needs more height')
        first = y+h/2-(len(lines)-1)*pitch/2+6
        for i, line in enumerate(lines):
            size = 17 if i == 0 else 16
            require(len(line)*size*.64 < w-28, f'Label too wide: {line}')
            self.text(x+w/2, first+i*pitch, line, size, i == 0, center=True)
        return bounds

    def arrow(self, a, b):
        require(a[1]+a[3]/2 == b[1]+b[3]/2, 'Flow boxes must align')
        x1, x2, y = a[0]+a[2], b[0], a[1]+a[3]/2
        require(x2-x1 >= 24, 'Arrow needs clearance')
        self.lines.append((x1+2, y-3, x2-x1-4, 6))
        self.parts.append(f'<path d="M{x1} {y} H{x2}" fill="none" stroke="#566575" stroke-width="1.4" marker-end="url(#arrow)"/>')

    def finish(self):
        for line in self.lines:
            require(all(not self.overlap(line, t) for t in self.texts), 'Connector crosses text')
            require(all(not self.overlap(line, b) for b in self.boxes), 'Connector crosses shape')
        self.parts.append('</svg>')
        result = '\n'.join(self.parts)+'\n'
        ET.fromstring(result)
        return result


def generate():
    sources, albums = facts()
    s = SVG('MapSF / code structure', 'One iOS app target · source groups and bundled resources · no dependency-order claim', 1130)
    s.text(40, 127, 'APPLICATION', 14, True)
    roots = sorted(Path(p).stem for p in sources if '/' not in p)
    require(roots == ['ContentView', 'MapSFApp'], 'Classify root Swift sources')
    s.box(40, 146, 1020, 86, ['MapSF.app', ' + '.join(roots)], 'interface')
    sections = [('Views', 'interface', 40, 260, 490, 300), ('Services', 'core', 570, 260, 490, 300),
                ('State', 'state', 40, 588, 490, 228), ('Models', 'foundation', 570, 588, 490, 228)]
    for folder, role, x, y, w, h in sections:
        names = sorted(Path(p).stem for p in sources if p.startswith(folder+'/'))
        if folder == 'Services':
            names = [n + (' (unused)' if n == 'PMTilesSource' else '') for n in names]
        if folder == 'State':
            names += ['Active albums', 'Selection and query settings']
        s.box(x, y, w, h, [folder.upper()] + names, role)
    s.box(40, 844, 490, 154, ['BUNDLED CONTENT', f'albums.json + {len(albums)} GeoJSON albums', 'Cover images and asset catalogs', 'sf-tiles.mbtiles + style.json'], 'state')
    s.box(570, 844, 490, 154, ['FRAMEWORKS', 'MapLibre · Swift package product', 'SwiftUI · CoreLocation', 'Foundation · MapKit'])
    s.text(40, 1042, 'Folders are source groups within one target, not separate Swift modules.', 16)
    s.text(40, 1072, 'The renderer builds its style in code; bundled style.json is not loaded by that path.', 16)
    s.text(40, 1102, 'Generated from Xcode target membership and Swift source assertions.', 14)

    r = SVG('MapSF / runtime paths', 'Selected in-process flows · arrows show data or state propagation', 1160)

    def row(y, title, nodes, note=None):
        r.text(40, y, title, 20, True)
        boxes = [r.box(40+i*354, y+25, 312, 132, labels, role) for i, (labels, role) in enumerate(nodes)]
        r.arrow(boxes[0], boxes[1])
        r.arrow(boxes[1], boxes[2])
        if note:
            r.text(40, y+190, note, 16)
        return boxes

    row(128, '01 / Load album content', [
        (['Bundled album data', 'albums.json', 'albums/*.geojson'], 'state'),
        (['AlbumLoader', 'GeoJSONParser', 'Decode on cache miss'], 'core'),
        (['Curation caches', 'loadedCurations', 'POIs / segments / areas'], 'state')],
        'MapLibreMapView.Coordinator reads the cached models to create map overlays.')
    row(372, '02 / Select a map feature', [
        (['MapLibreMapView', 'Coordinator.handleTap', 'POI / segment / area'], 'interface'),
        (['MapState', 'select / clearSelection', 'Observable selection'], 'state'),
        (['CurationInfoPanel', 'Reads selected item', 'Displays item details'], 'interface')],
        'MapState also drives selection styling in MapLibreMapView.')
    boxes = row(616, '03 / Load the basemap', [
        (['sf-tiles.mbtiles', 'Bundled vector tiles', 'Native mbtiles:// access'], 'state'),
        (['MapLibre', 'MLNMapView', 'Renders tile geometry'], 'core'),
        (['Map surface', 'Basemap + app overlays', 'UIKit inside SwiftUI'], 'interface')])
    style = r.box(394, 830, 312, 86, ['mapstyle.json', 'Temporary style file'], 'state')
    center = style[0]+style[2]/2
    top = boxes[1][1]+boxes[1][3]
    require(center == boxes[1][0]+boxes[1][2]/2, 'Style connector must be centered')
    r.parts.append(f'<path d="M{center} {style[1]} V{top}" fill="none" stroke="#566575" stroke-width="1.4" marker-end="url(#arrow)"/>')
    r.lines.append((center-3, top+2, 6, style[1]-top-4))
    r.text(40, 950, 'The generated style references local tiles; no app-owned HTTP tile server is used.', 16)
    r.text(40, 982, 'QuerySheet edits query settings, but proximity results do not reach this renderer.', 16)
    r.text(40, 1014, 'LocationManager requests one-shot locations. PMTilesSource has no callers.', 16)
    r.text(40, 1046, 'Cover images use a separate NSCache; memory warnings evict app caches and state.', 16)
    r.text(40, 1082, 'Pink = interface   Blue = state / storage   Green = processing   Gray = foundations', 14)
    r.text(40, 1114, "Scope: app-level wiring. MapLibre's internal threads are not modeled.", 14)
    return {'docs/architecture.svg': s.finish(), 'docs/architecture-runtime.svg': r.finish()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if generated SVGs differ')
    args = parser.parse_args()
    outputs = generate()
    for name, content in outputs.items():
        path = ROOT / name
        if args.check:
            require(path.exists() and path.read_text() == content, f'Stale diagram: {name}; run {Path(__file__).name}')
        else:
            path.write_text(content)
    print(f"{'Checked' if args.check else 'Generated'} {len(outputs)} diagrams; source claims and geometry passed.")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, IndexError) as error:
        sys.exit(f'Architecture check failed: {error}')
