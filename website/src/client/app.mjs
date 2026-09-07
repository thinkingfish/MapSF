import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  sfDate,
  eventsForDay,
  validateEvent,
  dedupeEvents,
} from "../lib/events.mjs";
import { filterEvents, geometryBounds } from "./view-model.mjs";

import { scheduledPlacesForDay } from "../lib/places.mjs";

const $ = (id) => document.getElementById(id);
const state = {
  events: [],
  visible: [],
  selected: null,
  selectionCleared: false,
  day: sfDate(),
  followToday: true,
  freeOnly: false,
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
const sfBounds = [
  [-122.53, 37.7],
  [-122.348, 37.835],
];
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

function renderEmpty() {
  const empty = element("div", "empty-state");
  empty.append(emptyIcon.cloneNode(true));
  const hasFilters =
    state.freeOnly;
  const title = state.error
    ? "Let’s try that again."
    : !state.events.length
      ? "No listings published yet."
      : hasFilters
        ? "Nothing quite matches."
        : "A little room for spontaneity.";
  const description = state.error
    ? "We couldn’t reach the event listings. Your next city outing can wait a moment."
    : !state.events.length
      ? "Good city days are on the way. Check back for local events, walks, and little discoveries."
      : hasFilters
        ? "Clear the free-only filter to see all listings."
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
  list.append(empty);
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
    `${event.title}, ${event.hoursLabel || eventTime(event)}, ${event.cost.label}`,
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
    element("span", "event-chevron", selected ? "−" : "+"),
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
  const scrollTop = list.scrollTop;
  list.replaceChildren();
  if (!state.visible.length) renderEmpty();
  else {
    const events = state.visible.filter(event => !event.recurring);
    const places = state.visible.filter(event => event.recurring);
    events.forEach(event => list.append(renderCard(event)));
    if (places.length) {
      if (state.error) {
        const notice = element("div", "places-intro", "Event listings couldn’t be loaded. These recurring places are still available to browse. ");
        const retry = element("button", "", "Try again");
        retry.type = "button";
        retry.addEventListener("click", loadFeed);
        notice.append(retry);
        list.append(notice);
      } else if (!events.length) list.append(element("p", "places-intro", "No one-off events listed for this day."));
      list.append(element("h3", "places-heading", state.day === sfDate() ? "More to do today" : "Places to explore"));
      list.append(element("p", "places-intro", "Free days and resident admission. Check the conditions below."));
      places.forEach(event => list.append(renderCard(event)));
    }
  }
  list.scrollTop = scrollTop;
  list.setAttribute("aria-busy", "false");
}

function render() {
  const now = new Date();
  const dayEvents = eventsForDay(state.events, state.day).filter(
    (event) => state.day !== sfDate(now) || new Date(event.endAt) > now,
  );
  state.visible = filterEvents([...dayEvents, ...scheduledPlacesForDay(state.day, { now })], state);
  if (
    !state.selectionCleared &&
    !state.visible.some((event) => event.id === state.selected)
  )
    state.selected = state.visible[0]?.id ?? null;
  const eventCount = state.visible.filter(event => !event.recurring).length;
  const placeCount = state.visible.length - eventCount;
  $("event-count").textContent = `${eventCount} ${eventCount === 1 ? "event" : "events"}${placeCount ? ` · ${placeCount} ${placeCount === 1 ? "place" : "places"}` : ""}`;
  // Noon UTC is on the same SF date throughout the year.
  $("day-label").textContent =
    `${state.day === sfDate() ? "TODAY" : "EXPLORE"} · ${dateFormat.format(new Date(`${state.day}T12:00:00Z`)).toUpperCase()}`;
  $("today-button").setAttribute(
    "aria-pressed",
    String(state.day === sfDate()),
  );
  sourceStatus();
  renderList();
  updateMap();
}

function selectEvent(id, origin) {
  const deselect = origin === "list" && state.selected === id;
  state.selected = deselect ? null : id;
  state.selectionCleared = deselect;
  renderList();
  updateMapSelection();
  const selected = state.visible.find((event) => event.id === state.selected);
  if (selected && mapReady)
    map.fitBounds(geometryBounds(selected.curation.geometry), {
      padding: 70,
      maxZoom: 15,
      duration: reduceMotion ? 0 : 650,
    });
  const card = Array.from(list.children).find(
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
  if (!mapReady) return;
  const selected = ["==", ["get", "eventId"], state.selected || ""];
  map.setPaintProperty("event-points", "circle-radius", [
    "case",
    selected,
    10,
    7,
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
  source.setData({
    type: "FeatureCollection",
    features: state.visible.map((event) => ({
      ...event.curation,
      properties: { ...event.curation.properties, eventId: event.id },
    })),
  });
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
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
            paint: {
              "raster-saturation": -0.82,
              "raster-opacity": 0.72,
              "raster-contrast": -0.15,
            },
          },
        ],
      },
      bounds: sfBounds,
      fitBoundsOptions: { padding: 10 },
      minZoom: 9,
      maxZoom: 18,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
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
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        },
      });
      mapReady = true;
      if (!$("map-status").classList.contains("map-warning"))
        $("map-status").hidden = true;
      updateMap();
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
    state.events = dedupeEvents(feed.events.filter(validateEvent));
    state.feed = feed;
  } catch {
    state.error = true;
  }
  render();
}

function resetFilters() {
  state.freeOnly = false;
  $("free-only").checked = false;
  render();
}

dateInput.value = state.day;
dateInput.addEventListener("change", () => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ||
    !dateInput.validity.valid
  ) {
    dateInput.value = state.day;
    return;
  }
  state.day = dateInput.value;
  state.followToday = state.day === sfDate();
  render();
});
$("today-button").addEventListener("click", () => {
  state.day = sfDate();
  state.followToday = true;
  dateInput.value = state.day;
  render();
});
$("free-only").addEventListener("change", (event) => {
  state.freeOnly = event.target.checked;
  render();
});
$("reset-map").addEventListener("click", () => {
  if (mapReady)
    map.fitBounds(sfBounds, { padding: 10, duration: reduceMotion ? 0 : 650 });
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
    dateInput.value = today;
    loadFeed();
  } else if (state.feed) {
    // Keep keyboard focus and expanded details stable between event changes.
    if (
      state.day === today &&
      state.visible.some((event) => new Date(event.endAt) <= new Date())
    )
      render();
    else sourceStatus();
  }
}, 60000);
loadFeed();
setupMap();
