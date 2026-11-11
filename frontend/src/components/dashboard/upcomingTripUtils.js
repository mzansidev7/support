import { getServiceDateKey } from "./tripHistoryUtils";

export const getUpcomingTripDate = (trip) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(trip.schedule_date || "")) {
    return trip.schedule_date;
  }
  const timestamp = new Date(trip.next_at || trip.started_at || "");
  return Number.isNaN(timestamp.getTime()) ? "" : getServiceDateKey(timestamp);
};

export const getUpcomingTripDates = (trips) =>
  [...new Set(trips.map(getUpcomingTripDate).filter(Boolean))].sort();

export const getFilteredUpcomingTripGroups = (
  trips,
  { search = "", tripType = "all", serviceDate = "all" } = {},
) => {
  const searchValue = search.trim().toLowerCase();
  const groups = new Map();

  trips.forEach((trip) => {
    const isSchoolTrip = trip.schedule_kind === "school_trip";
    if (tripType !== "all" && tripType !== (isSchoolTrip ? "school_trip" : "student_route")) {
      return;
    }

    const date = getUpcomingTripDate(trip);
    if (serviceDate !== "all" && date !== serviceDate) return;

    const routeName = trip.route?.route_name || "Scheduled trip";
    const searchableText = [
      routeName,
      trip.route?.start_location,
      trip.route?.end_location,
      trip.school?.name,
      trip.driver?.users?.name,
      trip.driver?.name,
      trip.vehicle?.name,
      trip.vehicle?.license_plate,
      trip.vehicle?.registration_number,
      ...(trip.studentNames || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (searchValue && !searchableText.includes(searchValue)) return;

    const key = routeName.trim().toLowerCase();
    const group = groups.get(key) || { routeName, trips: [] };
    group.trips.push(trip);
    groups.set(key, group);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      trips: group.trips.sort(
        (first, second) => {
          const dateOrder = getUpcomingTripDate(first).localeCompare(
            getUpcomingTripDate(second),
          );
          if (dateOrder) return dateOrder;

          const firstTime = new Date(
            first.next_at || first.started_at || "",
          ).getTime();
          const secondTime = new Date(
            second.next_at || second.started_at || "",
          ).getTime();
          if (!Number.isFinite(firstTime)) return 1;
          if (!Number.isFinite(secondTime)) return -1;
          return firstTime - secondTime;
        },
      ),
    }))
    .sort((first, second) => first.routeName.localeCompare(second.routeName));
};
