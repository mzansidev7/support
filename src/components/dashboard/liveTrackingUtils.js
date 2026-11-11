const MAX_LIVE_LOCATION_AGE_MS = 2 * 60 * 1000;

export const hasValidCoordinates = (location) => {
  if (
    location?.latitude === null ||
    location?.latitude === undefined ||
    location?.longitude === null ||
    location?.longitude === undefined
  ) {
    return false;
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

export const isTrackableTrip = (trip) =>
  trip && ["active", "paused"].includes(trip.status);

export const getTrackingState = (trip, now = Date.now()) => {
  if (trip?.status === "paused" || trip?.journey_phase === "at_destination") {
    return { state: "paused", label: "Location paused" };
  }
  if (!hasValidCoordinates(trip?.location)) {
    return { state: "missing", label: "No GPS fix" };
  }
  const recordedAt = new Date(trip.location.recorded_at || "").getTime();
  const age = now - recordedAt;
  if (!Number.isFinite(recordedAt) || age < 0) {
    return { state: "missing", label: "No GPS fix" };
  }
  if (age > MAX_LIVE_LOCATION_AGE_MS) {
    return { state: "stale", label: "Stale signal" };
  }
  return { state: "live", label: "Live" };
};
