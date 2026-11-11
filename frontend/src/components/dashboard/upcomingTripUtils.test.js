import {
  getFilteredUpcomingTripGroups,
  getUpcomingTripDates,
} from "./upcomingTripUtils";

const trips = [
  {
    id: "route-tomorrow",
    schedule_kind: "student_route",
    schedule_date: "2026-10-27",
    route: { route_name: "North Route", start_location: "Home", end_location: "School" },
    studentNames: ["Ava Ndlovu"],
  },
  {
    id: "school-trip",
    schedule_kind: "school_trip",
    started_at: "2026-10-26T08:00:00.000Z",
    route: { route_name: "North Route", start_location: "School", end_location: "Museum" },
    school: { name: "North School" },
  },
  {
    id: "other-route",
    schedule_kind: "student_route",
    schedule_date: "2026-10-27",
    route: { route_name: "South Route" },
  },
];

describe("upcoming trip grouping and filters", () => {
  it("groups trips by route name and sorts route groups alphabetically", () => {
    const groups = getFilteredUpcomingTripGroups(trips);

    expect(groups.map(({ routeName }) => routeName)).toEqual([
      "North Route",
      "South Route",
    ]);
    expect(groups[0].trips.map(({ id }) => id)).toEqual([
      "school-trip",
      "route-tomorrow",
    ]);
  });

  it("filters by route or trip details, trip type, and service date", () => {
    expect(
      getFilteredUpcomingTripGroups(trips, { search: "ava" }).flatMap(
        (group) => group.trips.map(({ id }) => id),
      ),
    ).toEqual(["route-tomorrow"]);
    expect(
      getFilteredUpcomingTripGroups(trips, { tripType: "school_trip" }).flatMap(
        (group) => group.trips.map(({ id }) => id),
      ),
    ).toEqual(["school-trip"]);
    expect(
      getFilteredUpcomingTripGroups(trips, { serviceDate: "2026-10-27" }).flatMap(
        (group) => group.trips.map(({ id }) => id),
      ),
    ).toEqual(["route-tomorrow", "other-route"]);
  });

  it("returns distinct service dates in ascending order", () => {
    expect(getUpcomingTripDates(trips)).toEqual(["2026-10-26", "2026-10-27"]);
  });
});
