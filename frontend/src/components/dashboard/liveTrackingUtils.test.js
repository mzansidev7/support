import {
  getTrackingState,
  hasValidCoordinates,
  isTrackableTrip,
} from "./liveTrackingUtils";

describe("live vehicle tracking helpers", () => {
  const now = Date.parse("2026-10-26T08:00:00.000Z");

  it("only treats active and paused trips as trackable", () => {
    expect(isTrackableTrip({ status: "active" })).toBe(true);
    expect(isTrackableTrip({ status: "paused" })).toBe(true);
    expect(isTrackableTrip({ status: "scheduled" })).toBe(false);
    expect(isTrackableTrip({ status: "ended" })).toBe(false);
  });

  it("accepts valid GPS coordinates and rejects missing or invalid values", () => {
    expect(hasValidCoordinates({ latitude: "-26.2", longitude: "28.0" })).toBe(
      true,
    );
    expect(hasValidCoordinates({ latitude: null, longitude: 28 })).toBe(false);
    expect(hasValidCoordinates({ latitude: 91, longitude: 28 })).toBe(false);
  });

  it("distinguishes live, stale, missing, and intentionally paused locations", () => {
    expect(
      getTrackingState(
        {
          status: "active",
          location: {
            latitude: -26.2,
            longitude: 28.0,
            recorded_at: new Date(now - 30_000).toISOString(),
          },
        },
        now,
      ).state,
    ).toBe("live");

    expect(
      getTrackingState(
        {
          status: "active",
          location: {
            latitude: -26.2,
            longitude: 28.0,
            recorded_at: new Date(now - 3 * 60_000).toISOString(),
          },
        },
        now,
      ).state,
    ).toBe("stale");

    expect(
      getTrackingState({ status: "active", location: null }, now).state,
    ).toBe("missing");
    expect(
      getTrackingState(
        {
          status: "paused",
          location: {
            latitude: -26.2,
            longitude: 28.0,
            recorded_at: new Date(now).toISOString(),
          },
        },
        now,
      ).state,
    ).toBe("paused");
  });
});
