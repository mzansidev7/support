import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PageHeader from "./PageHeader";
import { apiRequest } from "../../utils/asyncStorage/apiRequest";
import {
  getTrackingState,
  hasValidCoordinates,
  isTrackableTrip,
} from "./liveTrackingUtils";

const REFRESH_INTERVAL_MS = 20_000;

const vehicleIcon = L.divIcon({
  className: "support-live-vehicle-marker",
  html: '<span aria-hidden="true" style="display:flex;width:42px;height:42px;align-items:center;justify-content:center;border:3px solid #fff;border-radius:50%;background:#16a34a;box-shadow:0 4px 12px rgba(15,23,42,.3);font-size:20px">🚐</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -20],
});

const formatDateTime = (value) => {
  if (!value) return "No GPS update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No GPS update";
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getDriverName = (trip) =>
  trip.driver?.users?.name ||
  trip.driver?.name ||
  trip.coordinator?.name ||
  "Driver not assigned";

const getVehicleName = (trip) =>
  [
    trip.vehicle?.name || "Vehicle not assigned",
    trip.vehicle?.license_plate || trip.vehicle?.registration_number,
  ]
    .filter(Boolean)
    .join(" · ");

const getTripName = (trip) =>
  trip.route?.route_name || (trip.trip_type === "school_trip" ? "School trip" : "Route");

const getJourneyLabel = (trip) => {
  if (trip.journey_phase === "at_destination") return "At destination";
  if (trip.journey_phase === "returning") return "Returning";
  if (trip.journey_phase === "outbound") return "Outbound";
  return trip.trip_type === "school_trip" ? "School trip" : "Route in progress";
};

const TrackingMapViewport = ({ trips, selectedTripId }) => {
  const map = useMap();
  const pointKey = trips
    .map((trip) => `${trip.id}:${trip.location.latitude}:${trip.location.longitude}`)
    .join("|");

  useEffect(() => {
    if (selectedTripId) {
      const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
      if (selectedTrip) {
        map.flyTo(
          [Number(selectedTrip.location.latitude), Number(selectedTrip.location.longitude)],
          Math.max(map.getZoom(), 14),
          { duration: 0.5 },
        );
        return;
      }
    }

    if (trips.length === 1) {
      map.setView(
        [Number(trips[0].location.latitude), Number(trips[0].location.longitude)],
        14,
      );
    } else if (trips.length > 1) {
      const bounds = L.latLngBounds(
        trips.map((trip) => [
          Number(trip.location.latitude),
          Number(trip.location.longitude),
        ]),
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    }
  }, [map, pointKey, selectedTripId, trips]);

  return null;
};

const LiveMap = () => {
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (!background) setRefreshing(true);
    setError("");
    try {
      const result = await apiRequest("/admin/trips");
      if (!Array.isArray(result)) {
        throw new Error("The live trip response was not in the expected format.");
      }
      setTrips(result.filter(isTrackableTrip));
      setLastUpdatedAt(new Date().toISOString());
    } catch (requestError) {
      console.error("Could not load live vehicle tracking:", requestError);
      setError(requestError?.message || "Unable to load live vehicle data.");
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh({ background: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const now = Date.now();
  const trackableTrips = useMemo(
    () => trips.map((trip) => ({ ...trip, tracking: getTrackingState(trip, now) })),
    [now, trips],
  );
  const liveTrips = trackableTrips.filter(
    (trip) =>
      trip.tracking.state === "live" &&
      trip.journey_phase !== "at_destination" &&
      hasValidCoordinates(trip.location),
  );
  const liveTripIds = new Set(liveTrips.map((trip) => trip.id));

  const filteredTrips = trackableTrips.filter((trip) => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return true;
    return [
      getTripName(trip),
      getDriverName(trip),
      getVehicleName(trip),
      trip.school?.name,
      trip.route?.start_location,
      trip.route?.end_location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchValue);
  });

  const counts = {
    active: trackableTrips.filter((trip) => trip.status === "active").length,
    live: liveTrips.length,
    stale: trackableTrips.filter((trip) => trip.tracking.state === "stale").length,
    paused: trackableTrips.filter((trip) => trip.tracking.state === "paused").length,
  };

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      p={{ base: 4, md: 6, xl: 8 }}
      className="support-live-map-page"
    >
      <PageHeader
        eyebrow="FLEET OPERATIONS"
        title="Live Vehicle Tracking"
        description="Monitor active route and school-trip vehicles using their latest reported GPS location."
        actions={
          <VStack align={{ base: "stretch", sm: "flex-end" }} spacing={2}>
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              colorScheme="blue"
              variant="outline"
              onClick={() => void refresh()}
              isLoading={refreshing}
              loadingText="Refreshing"
            >
              Refresh
            </Button>
            <HStack color="gray.500" fontSize="xs" spacing={2}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={loading ? "gray.400" : "green.400"}
              />
              <Text>
                {lastUpdatedAt
                  ? `Updated ${formatDateTime(lastUpdatedAt)}`
                  : "Connecting to live data"}
              </Text>
            </HStack>
          </VStack>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={5} alignItems="flex-start">
          <AlertIcon mt={1} />
          <Box flex="1">
            <Text fontWeight="700">Live vehicle data unavailable</Text>
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

      <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={4} mb={5}>
        {[
          { label: "Active trips", value: counts.active, icon: FiActivity, color: "blue" },
          { label: "Live GPS", value: counts.live, icon: FiMapPin, color: "green" },
          { label: "Stale signal", value: counts.stale, icon: FiClock, color: "orange" },
          { label: "Location paused", value: counts.paused, icon: FiTruck, color: "purple" },
        ].map((metric) => (
          <Card
            key={metric.label}
            bg="white"
            border="1px solid"
            borderColor="gray.100"
            borderRadius="2xl"
            boxShadow="sm"
          >
            <CardBody>
              <HStack justify="space-between" align="flex-start">
                <Box>
                  <Text color="gray.500" fontSize="sm" fontWeight="600">
                    {metric.label}
                  </Text>
                  <Heading mt={2} size="lg" color="gray.800">
                    {metric.value}
                  </Heading>
                </Box>
                <Flex
                  align="center"
                  justify="center"
                  boxSize={10}
                  borderRadius="xl"
                  bg={`${metric.color}.50`}
                  color={`${metric.color}.600`}
                >
                  <Icon as={metric.icon} boxSize={5} />
                </Flex>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={5} alignItems="stretch">
        <Card
          gridColumn={{ base: "auto", xl: "span 2" }}
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="2xl"
          boxShadow="sm"
        >
          <Flex
            px={{ base: 4, md: 5 }}
            py={4}
            align="center"
            justify="space-between"
            gap={3}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Box>
              <Heading size="sm" color="gray.800">
                Fleet map
              </Heading>
              <Text mt={1} color="gray.500" fontSize="xs">
                Showing fresh GPS positions only · refreshed every 20 seconds
              </Text>
            </Box>
            <Badge colorScheme="green" borderRadius="full" px={2.5} py={1}>
              {liveTrips.length} live
            </Badge>
          </Flex>
          <Box h={{ base: "380px", md: "540px" }} position="relative" bg="gray.100">
            <MapContainer
              center={[-29, 24]}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <TrackingMapViewport
                trips={liveTrips}
                selectedTripId={selectedTripId}
              />
              {liveTrips.map((trip) => (
                <Marker
                  key={trip.id}
                  position={[
                    Number(trip.location.latitude),
                    Number(trip.location.longitude),
                  ]}
                  icon={vehicleIcon}
                  eventHandlers={{ click: () => setSelectedTripId(trip.id) }}
                >
                  <Popup>
                    <strong>{getTripName(trip)}</strong>
                    <br />
                    {getDriverName(trip)}
                    <br />
                    {getVehicleName(trip)}
                    <br />
                    Updated {formatDateTime(trip.location.recorded_at)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            {!liveTrips.length && !loading ? (
              <Flex
                position="absolute"
                inset={0}
                zIndex={500}
                align="center"
                justify="center"
                p={6}
                pointerEvents="none"
              >
                <Box
                  maxW="sm"
                  px={6}
                  py={5}
                  textAlign="center"
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="2xl"
                  boxShadow="lg"
                >
                  <Icon as={FiMapPin} color="gray.400" boxSize={6} />
                  <Text mt={2} fontWeight="700" color="gray.700">
                    No fresh GPS locations
                  </Text>
                  <Text mt={1} color="gray.500" fontSize="sm">
                    Active trips remain listed with their signal status. A vehicle
                    appears here once it reports a current location.
                  </Text>
                </Box>
              </Flex>
            ) : null}
          </Box>
        </Card>

        <Card
          border="1px solid"
          borderColor="gray.200"
          borderRadius="2xl"
          boxShadow="sm"
          minW={0}
        >
          <CardBody p={0}>
            <Flex px={5} pt={5} pb={4} direction="column" gap={3}>
              <HStack justify="space-between">
                <Box>
                  <Heading size="sm" color="gray.800">
                    Active vehicles
                  </Heading>
                  <Text mt={1} color="gray.500" fontSize="xs">
                    {trackableTrips.length} current trips
                  </Text>
                </Box>
                <Icon as={FiTruck} color="blue.500" boxSize={5} />
              </HStack>
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search driver, route, vehicle..."
                  aria-label="Search live vehicles"
                  borderRadius="lg"
                />
              </InputGroup>
            </Flex>
            <Stack
              px={3}
              pb={3}
              spacing={2}
              maxH={{ base: "none", xl: "492px" }}
              overflowY={{ base: "visible", xl: "auto" }}
            >
              {loading && !trackableTrips.length ? (
                <Flex minH="180px" align="center" justify="center" direction="column">
                  <Spinner color="blue.500" />
                  <Text mt={3} color="gray.500" fontSize="sm">
                    Loading vehicle data...
                  </Text>
                </Flex>
              ) : filteredTrips.length ? (
                filteredTrips.map((trip) => {
                  const tracking = trip.tracking;
                  const isSelected = selectedTripId === trip.id;
                  const stateColor =
                    tracking.state === "live"
                      ? "green"
                      : tracking.state === "stale"
                        ? "orange"
                        : tracking.state === "paused"
                          ? "purple"
                          : "gray";
                  return (
                    <Button
                      key={trip.id}
                      variant="ghost"
                      h="auto"
                      py={3}
                      px={3}
                      borderRadius="xl"
                      justifyContent="stretch"
                      whiteSpace="normal"
                      textAlign="left"
                      bg={isSelected ? "blue.50" : "white"}
                      border="1px solid"
                      borderColor={isSelected ? "blue.200" : "gray.100"}
                      _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
                      onClick={() => {
                        setSelectedTripId(trip.id);
                        if (liveTripIds.has(trip.id)) {
                          document
                            .querySelector(".support-live-map-page")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                    >
                      <Flex w="100%" align="flex-start" gap={3}>
                        <Flex
                          flexShrink={0}
                          align="center"
                          justify="center"
                          boxSize={9}
                          borderRadius="lg"
                          bg={`${stateColor}.50`}
                          color={`${stateColor}.600`}
                        >
                          <Icon as={FiTruck} />
                        </Flex>
                        <Box minW={0} flex="1">
                          <HStack justify="space-between" align="flex-start" gap={2}>
                            <Text noOfLines={1} fontSize="sm" fontWeight="700">
                              {getTripName(trip)}
                            </Text>
                            <Badge
                              flexShrink={0}
                              colorScheme={stateColor}
                              borderRadius="full"
                            >
                              {tracking.label}
                            </Badge>
                          </HStack>
                          <Text mt={1} noOfLines={1} color="gray.600" fontSize="xs">
                            {getVehicleName(trip)}
                          </Text>
                          <HStack mt={2} spacing={1.5} color="gray.500">
                            <Icon as={FiUsers} boxSize={3.5} />
                            <Text noOfLines={1} fontSize="xs">
                              {getDriverName(trip)}
                            </Text>
                          </HStack>
                          {trip.school?.name ? (
                            <Text mt={1} noOfLines={1} color="gray.500" fontSize="xs">
                              {trip.school.name} · {getJourneyLabel(trip)}
                            </Text>
                          ) : (
                            <Text mt={1} noOfLines={1} color="gray.500" fontSize="xs">
                              {trip.route?.start_location || "Start unavailable"}{" "}
                              → {trip.route?.end_location || "Destination unavailable"}
                            </Text>
                          )}
                          <Text mt={2} color="gray.400" fontSize="xs">
                            {tracking.state === "live"
                              ? `GPS updated ${formatDateTime(trip.location.recorded_at)}`
                              : tracking.label}
                            {hasValidCoordinates(trip.location) &&
                            tracking.state !== "live"
                              ? ` · last fix ${formatDateTime(trip.location.recorded_at)}`
                              : ""}
                          </Text>
                        </Box>
                      </Flex>
                    </Button>
                  );
                })
              ) : (
                <Box px={4} py={10} textAlign="center">
                  <Icon as={FiTruck} color="gray.300" boxSize={7} />
                  <Text mt={2} color="gray.600" fontWeight="600">
                    {trackableTrips.length ? "No matching vehicles" : "No active trips"}
                  </Text>
                  <Text mt={1} color="gray.500" fontSize="sm">
                    {trackableTrips.length
                      ? "Try another search."
                      : "Active route and school trips will appear here."}
                  </Text>
                </Box>
              )}
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

export default LiveMap;
