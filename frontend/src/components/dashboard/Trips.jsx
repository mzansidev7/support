import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
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
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import PageHeader from "./PageHeader";

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
    default:
      return { label: status || "Unknown", color: "gray" };
  }
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

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!background) setRefreshing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const response = await fetch(`${API_URL}/admin/trips`, {
        headers: { Authorization: `Bearer ${token}` },
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
          JSON.stringify({ trips: result, cachedAt: new Date().toISOString() }),
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
  }, []);

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
          if (payload.new?.resource_type !== "tracking_sessions") return;
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
          console.warn("Support trips realtime subscription issue:", subscriptionError);
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
    const driverName = trip.driver?.users?.name || "";
    const vehicleName = `${trip.vehicle?.name || ""} ${trip.vehicle?.license_plate || ""}`;
    const matchesSearch =
      !searchValue ||
      `${routeName} ${routeLocation} ${driverName} ${vehicleName}`
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
        description="Tracking sessions from the transport database"
        actions={
          <VStack align="flex-end" spacing={2}>
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
          <HStack spacing={1.5}>
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              bg={realtimeConnected ? "green.500" : "gray.400"}
            />
            <Text color="gray.500" fontSize="xs">
              {realtimeConnected ? "Live updates connected" : "Syncing every 30s"}
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
        </Select>
      </HStack>

      {loading && trips.length === 0 ? (
        <Flex minH="240px" direction="column" align="center" justify="center">
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
                  <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
                    <Box minW={0}>
                      <Heading size="sm" color="gray.800">
                        {routeName}
                      </Heading>
                      <Text color="gray.500" fontSize="xs" mt={1}>
                        Trip ID: {trip.id}
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
                        <Text as="span" color="gray.400">→</Text>{" "}
                        {trip.route?.end_location || "Destination unavailable"}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiUsers} color="purple.500" />
                      <Text fontSize="sm">
                        Driver: {trip.driver?.users?.name || "Not assigned"}
                        {" · "}
                        {trip.studentCount}{" "}
                        {trip.studentCount === 1 ? "student" : "students"}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiTruck} color="green.600" />
                      <Text fontSize="sm">
                        Vehicle: {trip.vehicle?.name || "Not assigned"}
                        {trip.vehicle?.license_plate
                          ? ` (${trip.vehicle.license_plate})`
                          : ""}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.600">
                      <Icon as={FiClock} />
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
      ) : (
        <Card borderRadius="xl">
          <CardBody py={12} textAlign="center">
            <Heading size="sm" color="gray.700">
              {trips.length ? "No matching trips" : "No tracking sessions found"}
            </Heading>
            <Text color="gray.500" fontSize="sm" mt={2}>
              {trips.length
                ? "Try changing the search or status filter."
                : "Trips will appear here when drivers start tracking sessions."}
            </Text>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default Trips;
