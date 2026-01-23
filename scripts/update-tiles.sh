#!/bin/bash
#
# Download and convert SF map tiles from Protomaps
#
# Usage: ./scripts/update-tiles.sh [YYYYMMDD]
#   If no date provided, uses the latest available build
#
# Requirements:
#   - pmtiles CLI: ~/Downloads/pmtiles (or in PATH)
#   - tile-join: brew install tippecanoe
#
# This script:
#   1. Downloads SF region from Protomaps world basemap
#   2. Converts pmtiles to mbtiles format
#   3. Copies to app Resources folder
#

set -e

# Configuration
PMTILES_CLI="${PMTILES_CLI:-$HOME/Downloads/pmtiles}"
OUTPUT_DIR="$(dirname "$0")/../MapSF/Resources/BaseMap"
TEMP_DIR="/tmp/mapsf-tiles"

# Desired SF area (approximate) - script will expand to z10 tile boundaries
# to ensure consistent coverage at all zoom levels
DESIRED_BBOX="-122.55,37.70,-122.35,37.85"

# Zoom levels (10-15 for city-scale maps)
MIN_ZOOM=10
MAX_ZOOM=15

# Tile coordinate to lat/lon conversion functions
tile_to_lat() {
    local row=$1 zoom=$2
    python3 -c "
import math
n = 2.0 ** $zoom
y_std = n - 1 - $row
lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y_std / n)))
print(f'{math.degrees(lat_rad):.6f}')
"
}

tile_to_lon() {
    local col=$1 zoom=$2
    python3 -c "print(f'{$col / (2.0 ** $zoom) * 360.0 - 180.0:.6f}')"
}

# Protomaps source
BUILD_DATE="${1:-}"
if [ -z "$BUILD_DATE" ]; then
    # Default to a recent build - update this periodically
    BUILD_DATE="20260123"
    echo "No date specified, using default: $BUILD_DATE"
fi
SOURCE_URL="https://build.protomaps.com/${BUILD_DATE}.pmtiles"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_step() { echo -e "${GREEN}==>${NC} $1"; }
echo_warn() { echo -e "${YELLOW}Warning:${NC} $1"; }
echo_error() { echo -e "${RED}Error:${NC} $1"; }

# Check dependencies
check_deps() {
    if [ ! -x "$PMTILES_CLI" ]; then
        if command -v pmtiles &> /dev/null; then
            PMTILES_CLI="pmtiles"
        else
            echo_error "pmtiles CLI not found at $PMTILES_CLI"
            echo "Download from: https://github.com/protomaps/go-pmtiles/releases"
            exit 1
        fi
    fi

    if ! command -v tile-join &> /dev/null; then
        echo_error "tile-join not found. Install with: brew install tippecanoe"
        exit 1
    fi
}

# Create temp directory
setup() {
    mkdir -p "$TEMP_DIR"
    mkdir -p "$OUTPUT_DIR"
}

# Extract SF region from world pmtiles (separate extracts for low/high zoom)
extract_region() {
    echo_step "Extracting z10-12 (wide coverage) and z13-15 (SF focused)"
    echo "    Desired bbox: $DESIRED_BBOX"

    # Extract z10-12 with desired bbox - tiles are large, will cover beyond SF naturally
    "$PMTILES_CLI" extract \
        "$SOURCE_URL" \
        "$TEMP_DIR/low-zoom.pmtiles" \
        --bbox="$DESIRED_BBOX" \
        --minzoom=10 \
        --maxzoom=12

    # Extract z13-15 with same bbox - tiles are small, stays focused on SF
    "$PMTILES_CLI" extract \
        "$SOURCE_URL" \
        "$TEMP_DIR/high-zoom.pmtiles" \
        --bbox="$DESIRED_BBOX" \
        --minzoom=13 \
        --maxzoom=15

    echo_step "Merging zoom levels"
    # Merge both extracts into one pmtiles
    tile-join -f -o "$TEMP_DIR/sf-tiles.pmtiles" \
        "$TEMP_DIR/low-zoom.pmtiles" \
        "$TEMP_DIR/high-zoom.pmtiles"

    echo_step "Extraction complete"
    ls -lh "$TEMP_DIR/sf-tiles.pmtiles"
}

# Convert pmtiles to mbtiles
convert_to_mbtiles() {
    echo_step "Converting to MBTiles format"

    # tile-join can read pmtiles and output mbtiles
    tile-join -f -o "$TEMP_DIR/sf-tiles.mbtiles" "$TEMP_DIR/sf-tiles.pmtiles"

    echo_step "Conversion complete"
    ls -lh "$TEMP_DIR/sf-tiles.mbtiles"
}

# Verify tile coverage and calculate bounds intersection
verify_tiles() {
    echo_step "Verifying tile coverage"

    # Get coverage for each zoom and convert to lat/lon
    echo ""
    printf "%-5s %-6s %-12s %-12s %-12s %-12s\n" "Zoom" "Tiles" "South" "North" "West" "East"
    echo "-------------------------------------------------------------------"

    # Calculate intersection bounds (most restrictive)
    BOUNDS_SOUTH=""
    BOUNDS_NORTH=""
    BOUNDS_WEST=""
    BOUNDS_EAST=""

    while IFS='|' read -r z count min_row max_row min_col max_col; do
        south=$(tile_to_lat $min_row $z)
        north=$(tile_to_lat $((max_row + 1)) $z)
        west=$(tile_to_lon $min_col $z)
        east=$(tile_to_lon $((max_col + 1)) $z)
        printf "z%-4s %-6s %-12s %-12s %-12s %-12s\n" "$z" "$count" "$south" "$north" "$west" "$east"

        # Track intersection (most restrictive bounds)
        if [ -z "$BOUNDS_SOUTH" ]; then
            BOUNDS_SOUTH=$south
            BOUNDS_NORTH=$north
            BOUNDS_WEST=$west
            BOUNDS_EAST=$east
        else
            # Python to compare floats
            BOUNDS_SOUTH=$(python3 -c "print(max($BOUNDS_SOUTH, $south))")
            BOUNDS_NORTH=$(python3 -c "print(min($BOUNDS_NORTH, $north))")
            BOUNDS_WEST=$(python3 -c "print(max($BOUNDS_WEST, $west))")
            BOUNDS_EAST=$(python3 -c "print(min($BOUNDS_EAST, $east))")
        fi
    done < <(sqlite3 "$TEMP_DIR/sf-tiles.mbtiles" "
        SELECT zoom_level, COUNT(*), MIN(tile_row), MAX(tile_row), MIN(tile_column), MAX(tile_column)
        FROM tiles GROUP BY zoom_level ORDER BY zoom_level;
    ")

    echo ""
    echo_step "Bounds intersection (safe panning area at all zoom levels):"
    echo "    South: $BOUNDS_SOUTH  North: $BOUNDS_NORTH"
    echo "    West: $BOUNDS_WEST  East: $BOUNDS_EAST"
    echo ""
    echo_step "Update MapLibreMapView.swift sfBounds to:"
    echo "    sw: CLLocationCoordinate2D(latitude: $BOUNDS_SOUTH, longitude: $BOUNDS_WEST)"
    echo "    ne: CLLocationCoordinate2D(latitude: $BOUNDS_NORTH, longitude: $BOUNDS_EAST)"

    # Save for reference
    echo "$BOUNDS_WEST,$BOUNDS_SOUTH,$BOUNDS_EAST,$BOUNDS_NORTH" > "$TEMP_DIR/bounds.txt"
}

# Install to app
install_tiles() {
    echo_step "Installing to $OUTPUT_DIR"

    # Backup existing if present
    if [ -f "$OUTPUT_DIR/sf-tiles.mbtiles" ]; then
        echo_warn "Backing up existing tiles"
        mv "$OUTPUT_DIR/sf-tiles.mbtiles" "$OUTPUT_DIR/sf-tiles.mbtiles.backup"
    fi

    cp "$TEMP_DIR/sf-tiles.mbtiles" "$OUTPUT_DIR/sf-tiles.mbtiles"

    echo_step "Installation complete"
    ls -lh "$OUTPUT_DIR/sf-tiles.mbtiles"
}

# Cleanup
cleanup() {
    echo_step "Cleaning up temp files"
    rm -rf "$TEMP_DIR"
}

# Main
main() {
    echo "=== MapSF Tile Update Script ==="
    echo "Source: $SOURCE_URL"
    echo ""

    check_deps
    setup
    extract_region
    convert_to_mbtiles
    verify_tiles
    install_tiles
    cleanup

    echo ""
    echo_step "Done! Rebuild the app to use the new tiles."
    echo ""
    echo "Tile bounds may have changed. Run this to check:"
    echo "  sqlite3 MapSF/Resources/BaseMap/sf-tiles.mbtiles \\"
    echo "    \"SELECT zoom_level, MIN(tile_column), MAX(tile_column), MIN(tile_row), MAX(tile_row) FROM tiles GROUP BY zoom_level;\""
}

main
