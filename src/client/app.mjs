import { sources as sourceRegistry } from '../../config/sources.mjs';
const sourceFilterIds = new Set(sourceRegistry.filter(source => source.showInSourceFilter === true).map(source => source.id));
import basemapRelease from '../../config/basemap-release.json';
import { createBasemapStyle } from '../lib/basemap-style.mjs';
import { applyVenuePriceHint } from '../lib/venue-pricing.mjs';
import { createCalendar, checkedDates } from "./calendar.mjs";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  sfDate,
  eventsForDay,
  validateEvent,
  dedupeEvents,
} from "../lib/events.mjs";
import { filterEvents } from "./view-model.mjs";

import { scheduledPlacesForDay } from "../lib/places.mjs";

const $ = (id) => document.getElementById(id);
const state = {
  events: [],
  visible: [],
  mapped: [],
  selected: null,
  sectionsOpen: { events: true, places: false },
  selectionCleared: false,
  day: sfDate(),
  followToday: true,
  freeOnly: false,
  excludedSourceIds: [],
  mapBounds: null,
  feed: null,
  error: false,
};
const dateInput = $("event-date");
const list = $("event-list");
const emptyIcon = list.querySelector(".empty-icon").cloneNode(true);
const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "numeric",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
});
let map;
let mapReady = false;
let mapTimeout;
let mappedDataSignature;
let paintedSelection;
let gestureHintTimer;
const sfBounds = [
  [-122.53, 37.7],
  [-122.348, 37.835],
];
const cityFitPadding = () => window.matchMedia('(max-width: 760px)').matches
  ? { top: 60, bottom: 85, left: 10, right: 10 }
  : 10;
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function eventTime(event, withDates = false) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const crossesDay = sfDate(start) !== sfDate(end);
  if (withDates || crossesDay)
    return `${dateFormat.format(start)}, ${timeFormat.format(start)} – ${crossesDay ? `${dateFormat.format(end)}, ` : ""}${timeFormat.format(end)} PT`;
  return `${timeFormat.format(start)} – ${timeFormat.format(end)}`;
}

function sourceStatus() {
  const status = $("feed-status");
  status.classList.remove("warning");
  if (state.error) {
    status.textContent =
      "The latest listings couldn’t be loaded. Please try again.";
    status.classList.add("warning");
    return;
  }
  const feed = state.feed;
  if (!feed) return;
  if (!feed.generatedAt) {
    status.textContent = "A new way to find your next San Francisco outing.";
    return;
  }
  const failed = feed.sources?.some((source) => source.status === "failed");
  const old =
    Date.now() - new Date(feed.generatedAt).getTime() > 36 * 60 * 60 * 1000 ||
    feed.sources?.some(
      (source) =>
        source.lastSuccessfulAt &&
        Date.now() - new Date(source.lastSuccessfulAt).getTime() >
          36 * 60 * 60 * 1000,
    );
  if (failed || old) {
    status.textContent =
      "Some listings haven’t been refreshed recently. Check the original source before heading out.";
    status.classList.add("warning");
  } else {
    status.textContent = `Updated ${dateFormat.format(new Date(feed.generatedAt))} · Times in San Francisco local time`;
  }
}

function renderEmpty(target = list) {
  const empty = element("div", "empty-state");
  empty.append(emptyIcon.cloneNode(true));
  const hasFilters =
    state.freeOnly || state.excludedSourceIds.length > 0 || Boolean(state.mapBounds);
  const dayChecked = checkedDates(state.feed?.coverage).has(state.day);
  const title = state.error
    ? "Let’s try that again."
    : !dayChecked
      ? "This date hasn’t been checked yet."
      : !state.events.length
      ? "No events found for this day."
      : hasFilters
        ? "Nothing quite matches."
        : "A little room for spontaneity.";
  const description = state.error
    ? "We couldn’t reach the event listings. Your next city outing can wait a moment."
    : !dayChecked
      ? "Choose a checked date on the calendar to explore event listings."
      : !state.events.length
      ? "We checked our sources. Try another available date for more listings."
      : hasFilters
        ? "Zoom out or clear the filters to see more listings."
        : "No upcoming listings for this date. Choose another day to see what’s coming up.";
  empty.append(element("h3", "", title), element("p", "", description));
  if (state.error || hasFilters) {
    const button = element(
      "button",
      "",
      state.error ? "Try again" : "Clear filters",
    );
    button.type = "button";
    button.addEventListener("click", state.error ? loadFeed : resetFilters);
    empty.append(button);
  }
  target.append(empty);
}

function renderCard(event) {
  const properties = event.curation.properties;
  const selected = state.selected === event.id;
  const card = element("article", `event-card${selected ? " selected" : ""}`);
  card.dataset.eventId = event.id;
  if (event.recurring) card.dataset.recurring = "true";
  const button = element("button", "event-select");
  button.type = "button";
  button.setAttribute("aria-expanded", String(selected));
  button.setAttribute(
    "aria-label",
    `${selected ? "Hide details" : "Details"}: ${event.title}, ${event.hoursLabel || eventTime(event)}, ${event.cost.label}`,
  );
  const detailsId = `event-details-${state.visible.indexOf(event)}`;
  button.setAttribute("aria-controls", detailsId);
  const kicker = element("span", "event-kicker");
  kicker.append(
    element("span", "", event.hoursLabel || eventTime(event)),
    element(
      "span",
      `event-price${event.cost.isFree ? " free" : ""}`,
      event.cost.label,
    ),
  );
  const place = element("span", "event-place");
  place.append(
    element("span", "place-marker"),
    element("span", "", properties.name),
    element("span", "event-details-label", selected ? "Hide details" : "Details"),
  );
  button.append(kicker, element("span", "event-title", event.title), place);
  if (event.eligibility) button.append(element("span", "admission-note", event.eligibility));
  if (event.entryEnded) button.append(element("span", "admission-note", "Entry has ended today."));
  button.addEventListener("click", () => selectEvent(event.id, "list"));
  const details = element("div", "event-details");
  details.id = detailsId;
  details.hidden = !selected;
  if (event.imageUrl) {
    const banner = element("img", "event-banner");
    banner.src = event.imageUrl;
    banner.alt = "";
    banner.loading = "lazy";
    banner.referrerPolicy = "no-referrer";
    banner.addEventListener("error", () => banner.remove());
    details.append(banner);
  }
  if (event.cost.inferredFromVenue) details.append(element("p", "admission-note", "Price inferred from the venue or event type; confirm with the organizer."));
  if (event.admissionNote || event.description)
    details.append(element("p", "event-description", event.admissionNote || event.description));
  details.append(element("p", "event-time", event.hoursLabel || eventTime(event, true)));
  if (properties.metadata?.address)
    details.append(element("p", "event-address", properties.metadata.address));
  const kind = { poi: "Place", segment: "Route", area: "Area" }[
    properties.layerType
  ];
  details.append(
    element("p", "event-address", `${kind} · ${event.cost.label}`),
  );
  const source = element(
    "a",
    "source-link",
    `Details at ${event.source.name} ↗`,
  );
  source.href = event.source.url;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.setAttribute(
    "aria-label",
    `Details for ${event.title} at ${event.source.name} (opens in a new tab)`,
  );
  details.append(source);
  card.append(button, details);
  return card;
}

function renderList() {
  const scrollPositions = Object.fromEntries(["events", "places"].map(kind => [kind, $(kind + "-entries")?.scrollTop || 0]));
  const active = list.contains(document.activeElement) ? document.activeElement : null;
  const activeId = active?.id;
  const activeEvent = active?.closest("article")?.dataset.eventId;
  const events = state.visible.filter(event => !event.recurring);
  const places = state.visible.filter(event => event.recurring);
  list.replaceChildren();
  for (const [kind, title, entries] of [["events", "Events", events], ["places", "Free Places", places]]) {
    const section = element("section", "result-section");
    section.dataset.expanded = String(state.sectionsOpen[kind]);
    const heading = element("h2", "result-section-heading");
    const button = element("button", "section-toggle");
    button.id = kind + "-toggle";
    button.type = "button";
    button.setAttribute("aria-label", title);
    button.setAttribute("aria-expanded", String(state.sectionsOpen[kind]));
    button.setAttribute("aria-controls", kind + "-entries");
    const count = element("span", "section-count", String(entries.length));
    count.setAttribute("aria-label", entries.length + " " + kind);
    const action = element("span", "section-action", state.sectionsOpen[kind] ? "Hide" : "Show");
    action.setAttribute("aria-hidden", "true");
    button.append(element("span", "section-title", title), count, action);
    button.addEventListener("click", () => {
      const open = !state.sectionsOpen[kind];
      state.sectionsOpen = { events: false, places: false, [kind]: open };
      renderList();
    });
    heading.append(button);
    const body = element("div", "section-entries");
    body.id = kind + "-entries";
    body.hidden = !state.sectionsOpen[kind];
    body.setAttribute("role", "region");
    body.setAttribute("aria-labelledby", button.id);
    if (kind === "events" && !entries.length) {
      if (state.error || !places.length || state.freeOnly || state.excludedSourceIds.length) renderEmpty(body);
      else body.append(element("p", "places-intro", checkedDates(state.feed?.coverage).has(state.day)
        ? "No one-off events listed for this day." : "Event listings haven’t been checked for this day."));
    }
    if (kind === "places") body.append(element("p", "places-intro", entries.length
      ? "Free access, free days, and resident admission. Check each place’s conditions."
      : "No free places match this date and map view. Try zooming out or changing the filters."));
    entries.forEach(event => body.append(renderCard(event)));
    section.append(heading, body);
    list.append(section);
    body.scrollTop = scrollPositions[kind];
  }
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
  else if (activeEvent) [...list.querySelectorAll("article")].find(card => card.dataset.eventId === activeEvent)?.querySelector("button")?.focus({ preventScroll: true });
  list.setAttribute("aria-busy", "false");
}

// Advance the SF calendar date, including 23- and 25-hour days.
function tomorrowDate(now = new Date()) {
  const day = new Date(sfDate(now) + "T12:00:00Z");
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function updateDateShortcuts(now = new Date()) {
  const covered = checkedDates(state.feed?.coverage);
  for (const [id, day] of [["today-button", sfDate(now)], ["tomorrow-button", tomorrowDate(now)]]) {
    $(id).disabled = !covered.has(day);
    $(id).setAttribute("aria-pressed", String(state.day === day));
  }
}

function updateSourceOptions() {
  const options = $("source-options");
  // Keep the publisher menu stable across dates, including zero-result sources.
  const sources = new Map((state.feed?.sources || []).map(source => [source.id, source.name]));
  for (const event of state.events) {
    if (!event.recurring) sources.set(event.source.id, event.source.name);
  }
  const hasOtherSources = [...sources.keys()].some(id => !sourceFilterIds.has(id));
  const entries = [...sources].filter(([id]) => sourceFilterIds.has(id)).sort((a, b) => a[1].localeCompare(b[1]));
  const signature = JSON.stringify(entries);
  if (options.dataset.options !== signature) {
    options.replaceChildren(...entries.map(([id, name]) => {
      const label = element("label", "source-option");
      const checkbox = element("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.addEventListener("change", () => {
        state.excludedSourceIds = checkbox.checked
          ? state.excludedSourceIds.filter(value => value !== id)
          : [...new Set([...state.excludedSourceIds, id])];
        render();
      });
      label.append(checkbox, document.createTextNode(name));
      return label;
    }));
    options.dataset.options = signature;
  }
  for (const checkbox of options.querySelectorAll("input")) checkbox.checked = !state.excludedSourceIds.includes(checkbox.value);
  const selected = entries.filter(([id]) => !state.excludedSourceIds.includes(id));
  $("source-filter").textContent = selected.length === entries.length ? "All sources" : selected.length === 0
    ? (hasOtherSources ? "Other sources only" : "No sources") : selected.length === 1 ? selected[0][1] : selected.length + " sources";
  positionSourceMenu();
}

function render() {
  const now = new Date();
  calendar.update(state.day, state.feed?.coverage);
  updateDateShortcuts(now);
  const dayEvents = eventsForDay(state.events, state.day).filter(
    (event) => state.day !== sfDate(now) || new Date(event.endAt) > now,
  );
  const candidates = [...dayEvents, ...scheduledPlacesForDay(state.day, { now })];
  updateSourceOptions();
  state.mapped = filterEvents(candidates, { ...state, mapBounds: null });
  state.visible = filterEvents(state.mapped, { mapBounds: state.mapBounds });
  $("region-status").hidden = !state.mapBounds;
  $("region-status").textContent = state.mapBounds ? "Showing listings in the current map view." : "";
  if (
    !state.selectionCleared &&
    !state.visible.some((event) => event.id === state.selected)
  )
    state.selected = null;
  const eventCount = state.visible.filter(event => !event.recurring).length;
  const placeCount = state.visible.length - eventCount;
  $("event-count").textContent = `${eventCount} ${eventCount === 1 ? "event" : "events"}${placeCount ? ` · ${placeCount} ${placeCount === 1 ? "place" : "places"}` : ""}`;
  // Noon UTC is on the same SF date throughout the year.
  $("day-label").textContent =
    `${state.day === sfDate() ? "TODAY" : "EXPLORE"} · ${dateFormat.format(new Date(`${state.day}T12:00:00Z`)).toUpperCase()}`;
  sourceStatus();
  renderList();
  updateMap();
}

function selectEvent(id, origin) {
  const deselect = origin === "list" && state.selected === id;
  state.selected = deselect ? null : id;
  state.selectionCleared = deselect;
  if (origin === "map") {
    const event = state.visible.find(event => event.id === id);
    if (event) state.sectionsOpen = { events: !event.recurring, places: Boolean(event.recurring) };
  }
  renderList();
  updateMapSelection();
  const card = Array.from(list.querySelectorAll("article")).find(
    (card) => card.dataset.eventId === id,
  );
  if (origin === "map") {
    card?.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "nearest",
    });
    card?.querySelector("button")?.focus({ preventScroll: true });
  } else card?.querySelector("button")?.focus({ preventScroll: true });
}

function updateMapSelection() {
  if (!mapReady || paintedSelection === state.selected) return;
  paintedSelection = state.selected;
  const selected = ["==", ["get", "eventId"], state.selected || ""];
  // Several events can share a venue. Keep its selected marker above the others
  // so their pale fill and white outlines cannot cover the deep pink center.
  map.setLayoutProperty("event-points", "circle-sort-key", ["case", selected, 1, 0]);
  map.setPaintProperty("event-points", "circle-radius", [
    "case",
    selected,
    7,
    5,
  ]);
  map.setPaintProperty("event-points", "circle-color", [
    "case",
    selected,
    "#b54464",
    "#f27890",
  ]);
  map.setPaintProperty("event-routes", "line-width", ["case", selected, 6, 4]);
  map.setPaintProperty("event-routes", "line-color", [
    "case",
    selected,
    "#ae3f61",
    "#da7e98",
  ]);
  map.setPaintProperty("event-areas", "fill-opacity", [
    "case",
    selected,
    0.3,
    0.15,
  ]);
  map.setPaintProperty("event-area-outlines", "line-width", [
    "case",
    selected,
    3,
    2,
  ]);
}

function updateMap() {
  if (!mapReady) return;
  const source = map.getSource("events");
  const data = {
    type: "FeatureCollection",
    features: state.mapped.map((event) => ({
      ...event.curation,
      properties: { ...event.curation.properties, eventId: event.id },
    })),
  };
  const signature = JSON.stringify(data);
  if (signature !== mappedDataSignature) {
    source.setData(data);
    mappedDataSignature = signature;
  }
  updateMapSelection();
}

function mapMessage(message, warning = false) {
  const status = $("map-status");
  status.textContent = message;
  status.hidden = false;
  status.classList.toggle("map-warning", warning);
}

async function setupMap() {
  try {
    const { Map, NavigationControl, setWorkerUrl } = await import("maplibre-gl");
    setWorkerUrl(workerUrl);
    map = new Map({
      container: "map",
      style: createBasemapStyle(basemapRelease),
      maxBounds: basemapRelease.bounds,
      bounds: sfBounds,
      fitBoundsOptions: { padding: cityFitPadding() },
      minZoom: 9,
      maxZoom: 18,
      attributionControl: { compact: false },
      cooperativeGestures: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    // MapLibre removes its hint class after 100ms. Hold it through a wheel
    // gesture burst so reduced-motion users do not get a flashing overlay.
    map.on("cooperativegestureprevented", () => {
      const hint = map.getContainer().querySelector(".maplibregl-cooperative-gesture-screen");
      if (!hint) return;
      clearTimeout(gestureHintTimer);
      hint.classList.add("mapsf-gesture-hint");
      gestureHintTimer = setTimeout(() => hint.classList.remove("mapsf-gesture-hint"), 1600);
    });
    map.on("error", () =>
      mapMessage(
        "The map is having trouble loading. You can still explore the list.",
        true,
      ),
    );
    mapTimeout = setTimeout(() => {
      if (!mapReady)
        mapMessage(
          "The map is taking a little longer. Explore the event list while it loads.",
          true,
        );
    }, 12000);
    map.on("load", () => {
      clearTimeout(mapTimeout);
      map.addSource("events", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "event-areas",
        type: "fill",
        source: "events",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#ec849e", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "event-area-outlines",
        type: "line",
        source: "events",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "line-color": "#cd6584", "line-width": 2 },
      });
      map.addLayer({
        id: "event-routes",
        type: "line",
        source: "events",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#da7e98", "line-width": 4 },
      });
      map.addLayer({
        id: "event-points",
        type: "circle",
        source: "events",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#f27890",
          "circle-radius": 5,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      mapReady = true;
      if (!$("map-status").classList.contains("map-warning"))
        $("map-status").hidden = true;
      const updateViewport = () => {
        const bounds = map.getBounds();
        const nextBounds = [[bounds.getWest(), bounds.getSouth()], [bounds.getEast(), bounds.getNorth()]];
        if (JSON.stringify(nextBounds) === JSON.stringify(state.mapBounds)) return;
        state.mapBounds = nextBounds;
        render();
      };
      map.on("moveend", updateViewport);
      map.on("resize", updateViewport);
      updateViewport();
      const layers = ["event-points", "event-routes", "event-areas"];
      map.on("click", (event) => {
        const features = map.queryRenderedFeatures(event.point, { layers });
        if (features.length) selectEvent(features[0].properties.eventId, "map");
      });
      map.on("mousemove", (event) => {
        map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, {
          layers,
        }).length
          ? "pointer"
          : "";
      });
    });
  } catch {
    clearTimeout(mapTimeout);
    mapMessage(
      "The map isn’t available in this browser. All event details are in the list.",
    );
  }
}

async function loadFeed() {
  state.error = false;
  list.setAttribute("aria-busy", "true");
  $("feed-status").textContent = "Checking the latest local listings…";
  try {
    const response = await fetch("/events.json", {
      cache: "no-cache",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Feed unavailable");
    const feed = await response.json();
    if (
      feed.schemaVersion !== 1 ||
      !Array.isArray(feed.events) ||
      !Array.isArray(feed.sources) ||
      (feed.generatedAt !== null &&
        !Number.isFinite(Date.parse(feed.generatedAt)))
    )
      throw new Error("Invalid feed");
    state.events = dedupeEvents(feed.events.filter(validateEvent)).map(applyVenuePriceHint);
    state.feed = feed;
  } catch {
    state.error = true;
  }
  render();
}

function resetFilters() {
  state.freeOnly = false;
  state.excludedSourceIds = [];
  $("free-only").checked = false;
  if (mapReady) map.fitBounds(sfBounds, { padding: cityFitPadding(), duration: 0 });
  render();
}

function chooseDay(day) {
  if (!checkedDates(state.feed?.coverage).has(day)) return;
  state.day = day;
  state.followToday = day === sfDate();
  render();
}
const calendar = createCalendar({button: dateInput, panel: $("event-calendar"), onSelect: chooseDay});
calendar.update(state.day, null);
updateDateShortcuts();
$("today-button").addEventListener("click", () => chooseDay(sfDate()));
$("tomorrow-button").addEventListener("click", () => chooseDay(tomorrowDate()));
$("free-only").addEventListener("change", (event) => {
  state.freeOnly = event.target.checked;
  render();
});
function positionSourceMenu() {
  const panel = $("source-menu");
  if (!panel.matches(":popover-open")) return;
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft || 0;
  const top = viewport?.offsetTop || 0;
  const width = viewport?.width || innerWidth;
  const height = viewport?.height || innerHeight;
  panel.style.width = Math.min(340, width - 32) + "px";
  panel.style.maxHeight = Math.min(440, height - 32) + "px";
  const bounds = $("source-filter").getBoundingClientRect();
  panel.style.left = Math.max(left + 16, Math.min(bounds.left, left + width - panel.offsetWidth - 16)) + "px";
  panel.style.top = Math.max(top + 16, Math.min(bounds.bottom + 8, top + height - panel.offsetHeight - 16)) + "px";
}
$("source-menu").addEventListener("toggle", event => {
  $("source-filter").setAttribute("aria-expanded", String(event.newState === "open"));
  positionSourceMenu();
});
window.addEventListener("resize", positionSourceMenu);
window.visualViewport?.addEventListener("resize", positionSourceMenu);
window.visualViewport?.addEventListener("scroll", positionSourceMenu);
$("reset-map").addEventListener("click", () => {
  if (mapReady)
    map.fitBounds(sfBounds, { padding: cityFitPadding(), duration: reduceMotion ? 0 : 650 });
});
for (const [button, panel] of [
  ["show-map", "map-panel"],
  ["show-list", "event-results"],
]) {
  $(button).addEventListener("click", () => {
    $(panel).scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "start",
    });
    $(panel).focus({ preventScroll: true });
  });
}
setInterval(() => {
  const today = sfDate();
  if (state.followToday && today !== state.day) {
    state.day = today;
    loadFeed();
  } else if (state.feed) {
    // Keep keyboard focus and expanded details stable between event changes.
    if (
      state.day === today &&
      state.visible.some((event) => new Date(event.endAt) <= new Date())
    )
      render();
    else {
      updateDateShortcuts();
      sourceStatus();
    }
  }
}, 60000);
loadFeed();
setupMap();
