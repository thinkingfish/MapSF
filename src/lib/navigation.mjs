import { validEntrance } from './events.mjs';

/** Navigate to a reviewed entrance, never an inferred polygon center. */
export function entranceDirectionsUrl(event) {
  if (!validEntrance(event?.entrance)) return null;
  const [longitude, latitude] = event.entrance.geometry.coordinates;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(latitude + ',' + longitude);
}
