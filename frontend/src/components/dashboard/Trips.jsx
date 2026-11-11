import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import PageHeader from "./PageHeader";
import { getServiceDateKey, isAllowedHistoryDate } from "./tripHistoryUtils";
import {
  getFilteredUpcomingTripGroups,
  getUpcomingTripDates,
} from "./upcomingTripUtils";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");
const CACHE_PREFIX = "support-trips-cache";
const REFRESH_INTERVAL_MS = 30_000;

const getCacheKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return `${CACHE_PREFIX}:${user?.id || user?.email || "current-user"}`;
  } catch {
    return `${CACHE_PREFIX}:current-user`;
  }
};

const readCache = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(getCacheKey()) || "null");
    return Array.isArray(cache?.trips) ? cache : null;
  } catch (error) {
    console.warn("Could not read cached support trips:", error);
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getTripStatus = (status) => {
  switch (status) {
    case "active":
      return { label: "Active", color: "green" };
    case "paused":
      return { label: "Paused", color: "orange" };
    case "ended":
      return { label: "Completed", color: "blue" };
    case "completed":
      return { label: "Completed", color: "blue" };
    case "failed":
      return { label: "Failed", color: "red" };
    case "driver_offline":
      return { label: "Driver offline", color: "orange" };
    case "scheduled":
      return { label: "Scheduled", color: "purple" };
    case "preparing":
      return { label: "Preparing", color: "yellow" };
    default:
      return { label: status || "Unknown", color: "gray" };
  }
};

const getSchoolTrackingSummary = (trip) => {
  if (trip.status === "scheduled" || trip.status === "preparing") {
    return `Trip ${trip.status}`;
  }
  if (trip.journey_phase === "completed" || trip.status === "ended") {
    return "Journey complete";
  }
  if (trip.journey_phase === "at_destination") {
    return "At destination · location sharing paused";
  }
  if (!trip.location?.recorded_at) return "No GPS update yet";

  const ageMs = Date.now() - new Date(trip.location.recorded_at).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 2 * 60 * 1000) {
    return `Last GPS update ${formatDateTime(trip.location.recorded_at)} · stale`;
  }

  return `${trip.journey_phase === "returning" ? "Returning" : "Outbound"} · live location`;
};

const formatServiceDate = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00+02:00`);
  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString([], {
        timeZone: "Africa/Johannesburg",
        dateStyle: "medium",
      });
};

const Trips = () => {
  const cached = useRef(readCache());
  const [trips, setTrips] = useState(cached.current?.trips || []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(!cached.current);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const inFlight = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState(getServiceDateKey);
  const [historyTrips, setHistoryTrips] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const historyRequestId = useRef(0);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [upcomingSearch, setUpcomingSearch] = useState("");
  const [upcomingTypeFilter, setUpcomingTypeFilter] = useState("all");
  const [upcomingDateFilter, setUpcomingDateFilter] = useState("all");
  const upcomingTripGroups = useMemo(
    () =>
      getFilteredUpcomingTripGroups(upcomingTrips, {
        search: upcomingSearch,
        tripType: upcomingTypeFilter,
        serviceDate: upcomingDateFilter,
      }),
    [upcomingDateFilter, upcomingSearch, upcomingTrips, upcomingTypeFilter],
  );
  const upcomingDates = useMemo(
    () => getUpcomingTripDates(upcomingTrips),
    [upcomingTrips],
  );
  const filteredUpcomingCount = upcomingTripGroups.reduce(
    (count, group) => count + group.trips.length,
    0,
  );

  const loadUpcomingTrips = useCallback(async ({ background = false } = {}) => {
    if (!background) setUpcomingLoading(true);
    setUpcomingError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(`${API_URL}/admin/upcoming-trips`, {
        headers: { Authorization: "Bearer " + token },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load upcoming trips.");
      }
      setUpcomingTrips(result);
    } catch (requestError) {
      console.error("Could not load upcoming trips:", requestError);
      setUpcomingError(
        requestError?.message || "Unable to load upcoming trips.",
      );
    } finally {
      setUpcomingLoading(false);
    }
  }, []);

  const refresh = useCallback(
    async ({ background = false } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!background) setRefreshing(true);
      setError("");
      void loadUpcomingTrips({ background: true });
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error(
            "Your support session has expired. Please sign in again.",
          );
        }
        const response = await fetch(`${API_URL}/admin/trips`, {
          headers: { Authorization: "Bearer " + token },
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) {
          throw new Error(
            result?.error || "Unable to load trips from the database.",
          );
        }
        setTrips(result);
        try {
          localStorage.setItem(
            getCacheKey(),
            JSON.stringify({
              trips: result,
              cachedAt: new Date().toISOString(),
            }),
          );
        } catch (cacheError) {
          console.warn("Could not cache support trips:", cacheError);
        }
      } catch (requestError) {
        console.error("Could not load support trips:", requestError);
        setError(
          requestError?.message || "Unable to load trips from the database.",
        );
      } finally {
        setLoading(false);
        if (!background) setRefreshing(false);
        inFlight.current = false;
      }
    },
    [loadUpcomingTrips],
  );

  const loadHistory = useCallback(async (date) => {
    const requestId = ++historyRequestId.current;
    if (!isAllowedHistoryDate(date)) {
      setHistoryError("Choose a date up to and including today.");
      setHistoryTrips([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(
        `${API_URL}/admin/trips?history_date=${encodeURIComponent(date)}`,
        { headers: { Authorization: "Bearer " + token } },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load trip history.");
      }
      if (requestId === historyRequestId.current) setHistoryTrips(result);
    } catch (requestError) {
      console.error("Could not load trip history:", requestError);
      if (requestId === historyRequestId.current) {
        setHistoryError(
          requestError?.message || "Unable to load trip history.",
        );
        setHistoryTrips([]);
      }
    } finally {
      if (requestId === historyRequestId.current) setHistoryLoading(false);
    }
  }, []);

  const toggleHistory = () => {
    const shouldOpen = !historyOpen;
    setHistoryOpen(shouldOpen);
    if (shouldOpen) void loadHistory(historyDate);
  };

  const changeHistoryDate = (date) => {
    setHistoryDate(date);
    if (!isAllowedHistoryDate(date)) {
      setHistoryError("Choose a date up to and including today.");
      setHistoryTrips([]);
      return;
    }
    void loadHistory(date);
  };

  useEffect(() => {
    void refresh();
    let debounceTimer;
    const channel = supabaseClient
      .channel("support-trips-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
        },
        (payload) => {
          if (
            ![
              "tracking_sessions",
              "school_trips",
              "school_trip_vehicles",
              "school_trip_tracking",
              "school_trip_learners",
            ].includes(payload.new?.resource_type)
          ) {
            return;
          }
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(
            () => void refresh({ background: true }),
            400,
          );
        },
      )
      .subscribe((status, subscriptionError) => {
        setRealtimeConnected(status === "SUBSCRIBED");
        if (subscriptionError) {
          console.warn(
            "Support trips realtime subscription issue:",
            subscriptionError,
          );
        }
      });
    const interval = setInterval(
      () => void refresh({ background: true }),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(interval);
      void supabaseClient.removeChannel(channel);
    };
  }, [refresh]);

  const filteredTrips = trips.filter((trip) => {
    const tripStatus = getTripStatus(trip.status).label;
    const searchValue = search.trim().toLowerCase();
    const routeName = trip.route?.route_name || "";
    const routeLocation = `${trip.route?.start_location || ""} ${trip.route?.end_location || ""}`;
    const driverName = `${trip.driver?.users?.name || ""} ${trip.coordinator?.name || ""}`;
    const vehicleName = `${trip.vehicle?.name || ""} ${trip.vehicle?.license_plate || trip.vehicle?.registration_number || ""}`;
    const schoolName = trip.school?.name || "";
    const journeyPhase = trip.journey_phase || "";
    const matchesSearch =
      !searchValue ||
      `${routeName} ${routeLocation} ${driverName} ${vehicleName} ${schoolName} ${journeyPhase}`
        .toLowerCase()
        .includes(searchValue);
    const matchesFilter = filter === "All" || tripStatus === filter;
    return matchesSearch && matchesFilter;
  });


  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Trips Monitoring"
        description="Monitor fleet routes and school trips across the platform."
        actions={
          <VStack align={{ base: "stretch", md: "flex-end" }} spacing={2}>
            <HStack>
              <Button
                leftIcon={<Icon as={FiClock} />}
                variant={historyOpen ? "solid" : "outline"}
                colorScheme="blue"
                onClick={toggleHistory}
                aria-expanded={historyOpen}
              >
                {historyOpen ? "Hide history" : "History"}
              </Button>
              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                variant="outline"
                colorScheme="blue"
                onClick={() => void refresh()}
                isLoading={refreshing}
                loadingText="Refreshing"
              >
                Refresh
              </Button>
            </HStack>
            <HStack spacing={1.5}>
              <Box
                w="7px"
                h="7px"
                borderRadius="full"
                bg={realtimeConnected ? "green.500" : "gray.400"}
              />
              <Text color="gray.500" fontSize="xs">
                {realtimeConnected
                  ? "Live updates connected"
                  : "Syncing every 30s"}
              </Text>
            </HStack>
          </VStack>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="lg" mb={5} alignItems="flex-start">
          <AlertIcon mt={1} />
          <Box flex="1">
            <Text fontWeight="700">Could not load trips</Text>
            <AlertDescription fontSize="sm">{error}</AlertDescription>
          </Box>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => void refresh()}
            isLoading={refreshing}
          >
            Retry
          </Button>
        </Alert>
      ) : null}

      {historyOpen ? (
        <Box mb={6}>
          <Flex
            mb={4}
            p={4}
            align={{ base: "stretch", md: "flex-end" }}
            justify="space-between"
            gap={4}
            direction={{ base: "column", md: "row" }}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="xl"
          >
            <Box>
              <Heading size="sm" color="gray.800">
                Trip history
              </Heading>
              <Text mt={1} color="gray.500" fontSize="sm">
                Review route and school trips for a selected service date.
              </Text>
            </Box>
            <FormControl maxW={{ md: "240px" }}>
              <FormLabel htmlFor="trip-history-date" mb={1} fontSize="sm">
                History date
              </FormLabel>
              <Input
                id="trip-history-date"
                type="date"
                value={historyDate}
                max={getServiceDateKey()}
                onChange={(event) => changeHistoryDate(event.target.value)}
                aria-label="Filter trip history by date"
              />
            </FormControl>
          </Flex>

          {historyError ? (
            <Alert status="error" borderRadius="lg" mb={4}>
              <AlertIcon />
              <AlertDescription>{historyError}</AlertDescription>
            </Alert>
          ) : null}

          {historyLoading ? (
            <Flex
              minH="180px"
              direction="column"
              align="center"
              justify="center"
            >
              <Spinner color="blue.500" size="lg" />
              <Text mt={3} color="gray.600">
                Loading trip history…
              </Text>
            </Flex>
          ) : historyTrips.length ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={5}>
              {historyTrips.map((trip) => {
                const status = getTripStatus(trip.status);
                const missed = trip.schedule_kind === "missed_trip";
                const routeName =
                  trip.route?.route_name ||
                  `${trip.route?.start_location || "Route start"} → ${trip.route?.end_location || "Route end"}`;
                return (
                  <Card
                    key={trip.id}
                    borderRadius="xl"
                    boxShadow="sm"
                    borderWidth={missed ? "2px" : "1px"}
                    borderColor={missed ? "orange.300" : "transparent"}
                    bg={missed ? "orange.50" : "white"}
                  >
                    <CardBody>
                      <Flex
                        justify="space-between"
                        align="flex-start"
                        gap={3}
                        mb={4}
                      >
                        <Box minW={0}>
                          <Heading size="sm" color="gray.800">
                            {routeName}
                          </Heading>
                          <Text color="gray.500" fontSize="xs" mt={1}>
                            {trip.trip_type === "school_trip"
                              ? "School trip"
                              : "Route trip"}
                            {" · "}Trip ID: {trip.trip_id || trip.id}
                          </Text>
                          {trip.child?.name ? (
                            <Text color="gray.600" fontSize="sm" mt={2}>
                              Student:{" "}
                              {[trip.child.name, trip.child.lastname]
                                .filter(Boolean)
                                .join(" ")}
                            </Text>
                          ) : null}
                        </Box>
                        <Badge colorScheme={status.color} flexShrink={0}>
                          {status.label}
                        </Badge>
                      </Flex>
                      {missed ? (
                        <Alert status="warning" borderRadius="lg" mb={3}>
                          <AlertIcon />
                          <AlertDescription fontSize="sm" fontWeight="600">
                            {trip.missed_message}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <VStack align="stretch" spacing={2}>
                        <HStack spacing={2} color="gray.700">
                          <Icon as={FiUsers} color="purple.500" />
                          <Text fontSize="sm">
                            {trip.school?.name ? `${trip.school.name} · ` : ""}
                            Driver:{" "}
                            {trip.driver?.users?.name ||
                              trip.driver?.name ||
                              "Not assigned"}
                          </Text>
                        </HStack>
                        <HStack spacing={2} color="gray.700">
                          <Icon as={FiTruck} color="green.600" />
                          <Text fontSize="sm">
                            Vehicle: {trip.vehicle?.name || "Not assigned"}
                            {trip.vehicle?.license_plate ||
                            trip.vehicle?.registration_number
                              ? ` (${trip.vehicle.license_plate || trip.vehicle.registration_number})`
                              : ""}
                          </Text>
                        </HStack>
                        <HStack spacing={2} color="gray.600">
                          <Icon as={FiCalendar} />
                          <Text fontSize="sm">
                            Started {formatDateTime(trip.started_at)}
                            {trip.ended_at
                              ? ` · Ended ${formatDateTime(trip.ended_at)}`
                              : ""}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : !historyError ? (
            <Card mb={5} borderRadius="xl">
              <CardBody py={10} textAlign="center">
                <Heading size="sm" color="gray.700">
                  No trips found for this date
                </Heading>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  Choose another date to review its trip history.
                </Text>
              </CardBody>
            </Card>
          ) : null}
        </Box>
      ) : null}

      {!historyOpen ? (
        <>
          <Box mb={6}>
            <Flex
              mb={4}
              align={{ base: "stretch", md: "center" }}
              justify="space-between"
              gap={2}
              direction={{ base: "column", md: "row" }}
            >
              <Box>
                <Heading size="md" color="gray.800">
                  Upcoming scheduled trips
                </Heading>
                <Text mt={1} color="gray.500" fontSize="sm">
                  School trips and student route services for the next 7 days.
                </Text>
              </Box>
              <Badge
                alignSelf={{ base: "flex-start", md: "center" }}
                colorScheme="purple"
                borderRadius="full"
                px={3}
                py={1}
              >
                {filteredUpcomingCount} scheduled
              </Badge>
            </Flex>

            <HStack
              mb={4}
              spacing={3}
              align="stretch"
              flexDirection={{ base: "column", md: "row" }}
            >
              <Input
                placeholder="Search route, school, student, or driver..."
                value={upcomingSearch}
                onChange={(event) => setUpcomingSearch(event.target.value)}
                bg="white"
                aria-label="Search upcoming trips"
              />
              <Select
                value={upcomingTypeFilter}
                onChange={(event) => setUpcomingTypeFilter(event.target.value)}
                bg="white"
                w={{ base: "100%", md: "220px" }}
                aria-label="Filter upcoming trips by type"
              >
                <option value="all">All trip types</option>
                <option value="student_route">Student routes</option>
                <option value="school_trip">School trips</option>
              </Select>
              <Select
                value={upcomingDateFilter}
                onChange={(event) => setUpcomingDateFilter(event.target.value)}
                bg="white"
                w={{ base: "100%", md: "220px" }}
                aria-label="Filter upcoming trips by service date"
              >
                <option value="all">All service dates</option>
                {upcomingDates.map((date) => (
                  <option key={date} value={date}>
                    {formatServiceDate(date)}
                  </option>
                ))}
              </Select>
            </HStack>

            {upcomingError ? (
              <Alert status="error" borderRadius="lg" mb={4}>
                <AlertIcon />
                <Box flex="1">
                  <Text fontWeight="700">Could not load upcoming trips</Text>
                  <AlertDescription fontSize="sm">
                    {upcomingError}
                  </AlertDescription>
                </Box>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => void loadUpcomingTrips()}
                  isLoading={upcomingLoading}
                >
                  Retry
                </Button>
              </Alert>
            ) : null}

            {upcomingLoading ? (
              <Flex
                minH="140px"
                direction="column"
                align="center"
                justify="center"
              >
                <Spinner color="blue.500" />
                <Text mt={3} color="gray.600" fontSize="sm">
                  Loading upcoming trips…
                </Text>
              </Flex>
            ) : upcomingTrips.length && upcomingTripGroups.length ? (
              <VStack align="stretch" spacing={6}>
                {upcomingTripGroups.map((group) => (
                  <Box key={group.routeName}>
                    <Flex
                      mb={3}
                      align="center"
                      justify="space-between"
                      gap={3}
                    >
                      <Heading size="sm" color="gray.800">
                        {group.routeName}
                      </Heading>
                      <Badge colorScheme="blue" borderRadius="full" px={3}>
                        {group.trips.length}{" "}
                        {group.trips.length === 1 ? "trip" : "trips"}
                      </Badge>
                    </Flex>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {group.trips.map((trip) => {
                        const isSchoolTrip =
                          trip.schedule_kind === "school_trip";
                        return (
                          <Card
                            key={trip.id}
                            borderRadius="xl"
                            boxShadow="sm"
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            <CardBody>
                              <Flex
                                justify="space-between"
                                align="flex-start"
                                gap={3}
                                mb={4}
                              >
                                <Box minW={0}>
                                  <Text
                                    mt={1}
                                    color="gray.500"
                                    fontSize="xs"
                                  >
                                    {isSchoolTrip
                                      ? trip.school?.name || "School trip"
                                      : "Student route"}
                                  </Text>
                                </Box>
                                <Badge colorScheme="purple" flexShrink={0}>
                                  Scheduled
                                </Badge>
                              </Flex>
                              <VStack align="stretch" spacing={2}>
                                <HStack spacing={2} color="gray.700">
                                  <Icon as={FiMapPin} color="blue.500" />
                                  <Text fontSize="sm">
                                    {trip.route?.start_location ||
                                      "Start unavailable"}{" "}
                                    <Text as="span" color="gray.400">
                                      →
                                    </Text>{" "}
                                    {trip.route?.end_location ||
                                      "Destination unavailable"}
                                  </Text>
                                </HStack>
                                <HStack spacing={2} color="gray.700">
                                  <Icon as={FiCalendar} color="purple.500" />
                                  <Text fontSize="sm">
                                    {formatDateTime(
                                      trip.next_at || trip.started_at,
                                    )}
                                  </Text>
                                </HStack>
                                {!isSchoolTrip ? (
                                  <Text color="gray.600" fontSize="sm">
                                    Pickup {formatDateTime(trip.pickup_at)} ·
                                    Drop-off {formatDateTime(trip.dropoff_at)}
                                  </Text>
                                ) : trip.ended_at ? (
                                  <Text color="gray.600" fontSize="sm">
                                    Return {formatDateTime(trip.ended_at)}
                                  </Text>
                                ) : null}
                                <HStack spacing={2} color="gray.700">
                                  <Icon as={FiUsers} color="purple.500" />
                                  <Text fontSize="sm">
                                    {trip.studentCount || 0}{" "}
                                    {(trip.studentCount || 0) === 1
                                      ? "student"
                                      : "students"}
                                    {trip.studentNames?.length
                                      ? ` · ${trip.studentNames.join(", ")}`
                                      : ""}
                                  </Text>
                                </HStack>
                                <HStack spacing={2} color="gray.700">
                                  <Icon as={FiTruck} color="green.600" />
                                  <Text fontSize="sm">
                                    Driver:{" "}
                                    {trip.driver?.users?.name ||
                                      trip.driver?.name ||
                                      "Not assigned"}
                                    {" · "}Vehicle:{" "}
                                    {trip.vehicle?.name ||
                                      trip.vehicle?.license_plate ||
                                      trip.vehicle?.registration_number ||
                                      "Not assigned"}
                                  </Text>
                                </HStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            ) : upcomingTrips.length ? (
              <Card borderRadius="xl">
                <CardBody py={8} textAlign="center">
                  <Text color="gray.600" fontWeight="600">
                    No upcoming trips match these filters
                  </Text>
                </CardBody>
              </Card>
            ) : !upcomingError ? (
              <Card borderRadius="xl">
                <CardBody py={8} textAlign="center">
                  <Icon as={FiAlertTriangle} color="gray.400" boxSize={5} />
                  <Text mt={2} color="gray.600" fontWeight="600">
                    No upcoming trips scheduled in the next 7 days
                  </Text>
                </CardBody>
              </Card>
            ) : null}
          </Box>

          <HStack
            mb={5}
            spacing={3}
            align="stretch"
            flexDirection={{ base: "column", md: "row" }}
          >
            <Input
              placeholder="Search route, driver, or vehicle..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              bg="white"
              aria-label="Search trips"
            />
            <Select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              bg="white"
              w={{ base: "100%", md: "220px" }}
              aria-label="Filter trips by status"
            >
              <option>All</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Completed</option>
              <option>Scheduled</option>
              <option>Preparing</option>
            </Select>
          </HStack>

          {loading && trips.length === 0 ? (
            <Flex
              minH="240px"
              direction="column"
              align="center"
              justify="center"
            >
              <Spinner color="blue.500" size="lg" />
              <Text mt={3} color="gray.600">
                Loading trips…
              </Text>
            </Flex>
          ) : filteredTrips.length ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {filteredTrips.map((trip) => {
                const status = getTripStatus(trip.status);
                const routeName =
                  trip.route?.route_name ||
                  `${trip.route?.start_location || "Route start"} → ${trip.route?.end_location || "Route end"}`;
                return (
                  <Card key={trip.id} borderRadius="xl" boxShadow="sm">
                    <CardBody>
                      <Flex
                        justify="space-between"
                        align="flex-start"
                        gap={3}
                        mb={4}
                      >
                        <Box minW={0}>
                          <Heading size="sm" color="gray.800">
                            {routeName}
                          </Heading>
                          <Text color="gray.500" fontSize="xs" mt={1}>
                            {trip.trip_type === "school_trip"
                              ? "School trip"
                              : "Route trip"}
                            {" · "}Trip ID: {trip.trip_id || trip.id}
                          </Text>
                        </Box>
                        <Badge colorScheme={status.color} flexShrink={0}>
                          {status.label}
                        </Badge>
                      </Flex>
                      <VStack align="stretch" spacing={3}>
                        <HStack spacing={2} color="gray.700">
                          <Icon as={FiMapPin} color="blue.500" />
                          <Text fontSize="sm">
                            {trip.route?.start_location || "Start unavailable"}{" "}
                            <Text as="span" color="gray.400">
                              →
                            </Text>{" "}
                            {trip.route?.end_location ||
                              "Destination unavailable"}
                          </Text>
                        </HStack>
                        <HStack spacing={2} color="gray.700">
                          <Icon as={FiUsers} color="purple.500" />
                          <Text fontSize="sm">
                            {trip.trip_type === "school_trip" &&
                            trip.school?.name
                              ? `${trip.school.name} · `
                              : ""}
                            Driver: {trip.driver?.users?.name || "Not assigned"}
                            {trip.coordinator?.name
                              ? ` · Coordinator: ${trip.coordinator.name}`
                              : ""}
                            {" · "}
                            {trip.studentCount}{" "}
                            {trip.studentCount === 1 ? "student" : "students"}
                          </Text>
                        </HStack>
                        <HStack spacing={2} color="gray.700">
                          <Icon as={FiTruck} color="green.600" />
                          <Text fontSize="sm">
                            Vehicle: {trip.vehicle?.name || "Not assigned"}
                            {trip.vehicle?.license_plate ||
                            trip.vehicle?.registration_number
                              ? ` (${trip.vehicle.license_plate || trip.vehicle.registration_number})`
                              : ""}
                          </Text>
                        </HStack>
                        {trip.trip_type === "school_trip" ? (
                          <HStack spacing={2} color="gray.700">
                            <Icon as={FiMapPin} color="orange.500" />
                            <Text fontSize="sm">
                              {trip.status === "active" ||
                              trip.status === "paused"
                                ? `Journey: ${trip.journey_phase === "at_destination" ? "At destination" : trip.journey_phase === "returning" ? "Returning" : "Outbound"} · `
                                : ""}
                              {getSchoolTrackingSummary(trip)}
                              {trip.location?.latitude != null &&
                              trip.location?.longitude != null &&
                              Date.now() -
                                new Date(trip.location.recorded_at).getTime() <=
                                2 * 60 * 1000 &&
                              trip.journey_phase !== "at_destination"
                                ? ` · ${trip.location.latitude}, ${trip.location.longitude}`
                                : ""}
                              {trip.location?.shared_by?.name
                                ? ` · Shared by ${trip.location.shared_by.name}`
                                : ""}
                            </Text>
                          </HStack>
                        ) : null}
                        <HStack spacing={2} color="gray.600">
                          <Icon as={FiClock} />
                          <Text fontSize="sm">
                            {trip.trip_type === "school_trip"
                              ? "Departure"
                              : "Started"}{" "}
                            {formatDateTime(trip.started_at)}
                            {trip.ended_at
                              ? ` · Ended ${formatDateTime(trip.ended_at)}`
                              : ""}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Card borderRadius="xl">
              <CardBody py={12} textAlign="center">
                <Heading size="sm" color="gray.700">
                  {trips.length ? "No matching trips" : "No trips found"}
                </Heading>
                <Text color="gray.500" fontSize="sm" mt={2}>
                  {trips.length
                    ? "Try changing the search or status filter."
                    : "Trips will appear here when they are scheduled or tracking begins."}
                </Text>
              </CardBody>
            </Card>
          )}
        </>
      ) : null}
    </Box>
  );
};

export default Trips;
