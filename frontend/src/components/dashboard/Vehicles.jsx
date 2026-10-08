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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiClock,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiTruck,
  FiUser,
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
const CACHE_PREFIX = "support-vehicles-cache";
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
    return Array.isArray(cache?.vehicles) ? cache.vehicles : null;
  } catch (error) {
    console.warn("Could not read cached support vehicles:", error);
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

const formatStatus = (status) => {
  const normalized = (status || "").toLowerCase();
  const statusStyle = {
    active: { label: "Active", color: "green" },
    available: { label: "Available", color: "green" },
    assigned: { label: "Assigned", color: "blue" },
    inactive: { label: "Inactive", color: "gray" },
    maintenance: { label: "Maintenance", color: "orange" },
    offline: { label: "Offline", color: "red" },
  };
  return statusStyle[normalized] || {
    label: status || "Unknown",
    color: "gray",
  };
};

const getVehicleScope = (vehicle) =>
  String(vehicle?._vehicle_scope || "").toLowerCase() === "school"
    ? "school"
    : "fleet_owner";

const getVehicleTitle = (vehicle) =>
  vehicle?.name || vehicle?.model || vehicle?.license_plate || "Vehicle";

const Vehicles = () => {
  const cachedVehicles = useRef(readCache());
  const [vehicles, setVehicles] = useState(cachedVehicles.current || []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(!cachedVehicles.current);
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
      const response = await fetch(`${API_URL}/admin/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(
          result?.error || "Unable to load vehicles from the database.",
        );
      }
      setVehicles(result);
      try {
        localStorage.setItem(
          getCacheKey(),
          JSON.stringify({
            vehicles: result,
            cachedAt: new Date().toISOString(),
          }),
        );
      } catch (cacheError) {
        console.warn("Could not cache support vehicles:", cacheError);
      }
    } catch (requestError) {
      console.error("Could not load support vehicles:", requestError);
      setError(
        requestError?.message || "Unable to load vehicles from the database.",
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
      .channel("support-vehicles-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
        },
        (payload) => {
          if (
            !["vehicles", "drivers", "route_assignments", "route_children"].includes(
              payload.new?.resource_type,
            )
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
            "Support vehicles realtime subscription issue:",
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

  const filteredVehicles = vehicles.filter((vehicle) => {
    const query = search.trim().toLowerCase();
    const scope = getVehicleScope(vehicle);
    const searchable = [
      vehicle.name,
      vehicle.model,
      vehicle.license_plate,
      vehicle.registration_number,
      vehicle.owner?.company_name,
      vehicle.owner?.users?.name,
      vehicle.school?.name,
      vehicle.driver?.users?.name,
      vehicle.driver?.name,
      vehicle.route?.route_name,
      vehicle.route?.start_location,
      vehicle.route?.end_location,
      vehicle.trip?.name,
      vehicle.trip?.destination,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesStatus =
      filter === "All" || vehicle.status?.toLowerCase() === filter.toLowerCase();
    const matchesScope =
      scopeFilter === "All" ||
      (scopeFilter === "Fleet owner vehicles" && scope === "fleet_owner") ||
      (scopeFilter === "School vehicles" && scope === "school");
    const vehicleOwnerId = vehicle.owner?.id || vehicle.owner_id || "";
    const matchesOwner =
      ownerFilter === "All" ||
      (scope === "fleet_owner" && String(vehicleOwnerId) === ownerFilter);
    return matchesQuery && matchesStatus && matchesScope && matchesOwner;
  });

  const fleetOwners = [...new Map(
    vehicles
      .filter((vehicle) => getVehicleScope(vehicle) === "fleet_owner")
      .map((vehicle) => {
        const id = String(vehicle.owner?.id || vehicle.owner_id || "");
        const name =
          vehicle.owner?.company_name ||
          vehicle.owner?.users?.name ||
          "Unknown fleet owner";
        return [id, { id, name }];
      })
      .filter(([id]) => id),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const schoolVehicleCount = vehicles.filter(
    (vehicle) => getVehicleScope(vehicle) === "school",
  ).length;
  const fleetVehicleCount = vehicles.length - schoolVehicleCount;

  const activeCount = vehicles.filter(
    (vehicle) => vehicle.status?.toLowerCase() === "active",
  ).length;
  const maintenanceCount = vehicles.filter(
    (vehicle) => vehicle.status?.toLowerCase() === "maintenance",
  ).length;
  const offlineCount = vehicles.filter((vehicle) =>
    ["inactive", "offline"].includes(vehicle.status?.toLowerCase()),
  ).length;

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Vehicle Monitoring"
        description="Fleet vehicles and assignments from the transport database"
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
            <Text fontWeight="700">Could not load vehicles</Text>
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

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3} mb={5}>
        {[
          { label: "Total vehicles", value: vehicles.length, color: "blue.600" },
          { label: "Active", value: activeCount, color: "green.600" },
          {
            label: "Fleet / school",
            value: `${fleetVehicleCount} / ${schoolVehicleCount}`,
            color: "purple.600",
          },
          {
            label: "Maintenance / offline",
            value: maintenanceCount + offlineCount,
            color: "orange.600",
          },
        ].map((item) => (
          <Card key={item.label} borderRadius="xl" border="1px solid" borderColor="gray.200">
            <CardBody py={3}>
              <Text color="gray.600" fontSize="sm">
                {item.label}
              </Text>
              <Text color={item.color} fontSize="2xl" fontWeight="800">
                {item.value.toLocaleString()}
              </Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <HStack
        mb={5}
        spacing={3}
        align="stretch"
        flexDirection={{ base: "column", md: "row" }}
      >
        <Input
          placeholder="Search vehicle, owner, driver, or route..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          bg="white"
          aria-label="Search vehicles"
        />
        <Select
          value={scopeFilter}
          onChange={(event) => {
            setScopeFilter(event.target.value);
            setOwnerFilter("All");
          }}
          bg="white"
          w={{ base: "100%", md: "210px" }}
          aria-label="Filter vehicles by fleet or school"
        >
          <option>All</option>
          <option>Fleet owner vehicles</option>
          <option>School vehicles</option>
        </Select>
        {scopeFilter !== "School vehicles" ? (
          <Select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            bg="white"
            w={{ base: "100%", md: "220px" }}
            aria-label="Filter vehicles by fleet owner"
          >
            <option value="All">All fleet owners</option>
            {fleetOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          bg="white"
          w={{ base: "100%", md: "220px" }}
          aria-label="Filter vehicles by status"
        >
          <option>All</option>
          <option>Active</option>
          <option>Available</option>
          <option>Assigned</option>
          <option>Inactive</option>
          <option>Maintenance</option>
          <option>Offline</option>
        </Select>
      </HStack>

      {loading && vehicles.length === 0 ? (
        <Flex minH="240px" direction="column" align="center" justify="center">
          <Spinner color="blue.500" size="lg" />
          <Text mt={3} color="gray.600">
            Loading vehicles…
          </Text>
        </Flex>
      ) : filteredVehicles.length ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {filteredVehicles.map((vehicle) => {
            const status = formatStatus(vehicle.status);
            const location = vehicle.location;
            return (
              <Card
                key={`${getVehicleScope(vehicle)}-${vehicle.id}`}
                borderRadius="xl"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.100"
                cursor="pointer"
                transition="all 0.18s ease"
                _hover={{ boxShadow: "lg", borderColor: "blue.200", transform: "translateY(-1px)" }}
                onClick={() => setSelectedVehicle(vehicle)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedVehicle(vehicle);
                  }
                }}
                aria-label={`View ${getVehicleTitle(vehicle)} details`}
              >
                <CardBody>
                  <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
                    <Box minW={0}>
                      <Heading size="sm" color="gray.800">
                        {getVehicleTitle(vehicle)}
                      </Heading>
                      <Text color="gray.500" fontSize="xs" mt={1}>
                        {vehicle.model || "Model unavailable"} ·{" "}
                        {vehicle.license_plate ||
                          vehicle.registration_number ||
                          "No plate recorded"}
                      </Text>
                    </Box>
                    <VStack align="flex-end" spacing={1}>
                      <Badge colorScheme={status.color} flexShrink={0}>
                        {status.label}
                      </Badge>
                      <Badge colorScheme={getVehicleScope(vehicle) === "school" ? "purple" : "blue"}>
                        {getVehicleScope(vehicle) === "school" ? "School" : "Fleet"}
                      </Badge>
                    </VStack>
                  </Flex>

                  <VStack align="stretch" spacing={3}>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiUser} color="blue.500" />
                      <Text fontSize="sm">
                        Driver:{" "}
                        {vehicle.driver?.users?.name ||
                          vehicle.driver?.name ||
                          "Not assigned"}
                        {vehicle.driver?.status
                          ? ` · ${vehicle.driver.status}`
                          : ""}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiTruck} color="purple.500" />
                      <Text fontSize="sm">
                        {getVehicleScope(vehicle) === "school"
                          ? `School: ${vehicle.school?.name || "Unknown"}`
                          : `Fleet owner: ${
                              vehicle.owner?.company_name ||
                              vehicle.owner?.users?.name ||
                              "Unknown"
                            }`}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiMapPin} color="green.600" />
                      <Text fontSize="sm">
                        {getVehicleScope(vehicle) === "school" ? "Trip: " : "Route: "}
                        {vehicle.route?.route_name ||
                          vehicle.trip?.name ||
                          (getVehicleScope(vehicle) === "school"
                            ? "No assigned trip"
                            : "No active route")}
                        {vehicle.route
                          ? ` · ${vehicle.route.start_location || "Start unavailable"} → ${vehicle.route.end_location || "End unavailable"}`
                          : vehicle.trip?.destination
                            ? ` · ${vehicle.trip.destination}`
                            : ""}
                      </Text>
                    </HStack>
                    <HStack spacing={2} color="gray.700">
                      <Icon as={FiUsers} color="orange.500" />
                      <Text fontSize="sm">
                        {vehicle.studentCount || 0}{" "}
                        {vehicle.studentCount === 1 ? "student" : "students"}
                        {vehicle.capacity ? ` · Capacity ${vehicle.capacity}` : ""}
                      </Text>
                    </HStack>
                    {vehicle.trackingSession ? (
                      <HStack spacing={2} color="gray.700">
                        <Icon as={FiClock} color="teal.600" />
                        <Text fontSize="sm">
                          Tracking {vehicle.trackingSession.status} since{" "}
                          {formatDateTime(vehicle.trackingSession.started_at)}
                        </Text>
                      </HStack>
                    ) : null}
                    {location ? (
                      <Text color="gray.500" fontSize="xs">
                        Last location update: {formatDateTime(location.recorded_at)}
                      </Text>
                    ) : null}
                  </VStack>
                  <Text mt={4} color="blue.600" fontSize="xs" fontWeight="700">
                    View full vehicle details →
                  </Text>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Card borderRadius="xl">
          <CardBody py={12} textAlign="center">
            <Heading size="sm" color="gray.700">
              {vehicles.length
                ? "No matching vehicles"
                : "No vehicles found"}
            </Heading>
            <Text color="gray.500" fontSize="sm" mt={2}>
              {vehicles.length
                ? "Try changing the search or status filter."
                : "Vehicles will appear here after they are registered in the fleet."}
            </Text>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
        size="2xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        {selectedVehicle ? (
          <ModalContent
            borderRadius={{ base: "xl", md: "2xl" }}
            overflow="hidden"
            mx={3}
            boxShadow="2xl"
          >
            <Box
              bgGradient="linear(to-r, blue.700, blue.500)"
              color="white"
              px={{ base: 5, md: 7 }}
              pt={6}
              pb={5}
            >
              <ModalHeader p={0} pr={10} fontSize="xl">
                {getVehicleTitle(selectedVehicle)}
              </ModalHeader>
              <Text mt={1} color="blue.100" fontSize="sm">
                {selectedVehicle.license_plate ||
                  selectedVehicle.registration_number ||
                  "Registration not recorded"}
              </Text>
              <HStack mt={4} spacing={2}>
                <Badge colorScheme={formatStatus(selectedVehicle.status).color}>
                  {formatStatus(selectedVehicle.status).label}
                </Badge>
                <Badge colorScheme="whiteAlpha">
                  {getVehicleScope(selectedVehicle) === "school"
                    ? "School vehicle"
                    : "Fleet owner vehicle"}
                </Badge>
              </HStack>
            </Box>
            <ModalCloseButton color="white" top={5} />
            <ModalBody bg="gray.50" p={{ base: 4, md: 6 }}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <CardBody>
                    <Heading size="xs" color="gray.500" textTransform="uppercase" mb={3}>
                      Vehicle information
                    </Heading>
                    <VStack align="stretch" spacing={2}>
                      {[
                        ["Name", selectedVehicle.name],
                        ["Type", selectedVehicle.vehicle_type],
                        ["Make", selectedVehicle.make],
                        ["Model", selectedVehicle.model],
                        ["Year", selectedVehicle.year],
                        ["Colour", selectedVehicle.colour || selectedVehicle.color],
                        ["VIN", selectedVehicle.vin],
                        ["Passenger capacity", selectedVehicle.capacity || selectedVehicle.passenger_capacity],
                      ].map(([label, value]) => (
                        <Flex key={label} justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">{label}</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {value || "Not recorded"}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
                <Card borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <CardBody>
                    <Heading size="xs" color="gray.500" textTransform="uppercase" mb={3}>
                      Ownership & assignment
                    </Heading>
                    <VStack align="stretch" spacing={2}>
                      <Flex justify="space-between" gap={4}>
                        <Text color="gray.500" fontSize="sm">
                          {getVehicleScope(selectedVehicle) === "school" ? "School" : "Fleet owner"}
                        </Text>
                        <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                          {getVehicleScope(selectedVehicle) === "school"
                            ? selectedVehicle.school?.name || "Not linked"
                            : selectedVehicle.owner?.company_name ||
                              selectedVehicle.owner?.users?.name ||
                              "Not linked"}
                        </Text>
                      </Flex>
                      <Flex justify="space-between" gap={4}>
                        <Text color="gray.500" fontSize="sm">Assigned driver</Text>
                        <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                          {selectedVehicle.driver?.users?.name ||
                            selectedVehicle.driver?.name ||
                            "Not assigned"}
                        </Text>
                      </Flex>
                      {selectedVehicle.driver?.job_title ||
                      selectedVehicle.driver?.role ? (
                        <Flex justify="space-between" gap={4}>
                            <Text color="gray.500" fontSize="sm">Driver role</Text>
                            <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                              {selectedVehicle.driver.job_title ||
                                selectedVehicle.driver.role}
                            </Text>
                        </Flex>
                      ) : null}
                      <Flex justify="space-between" gap={4}>
                        <Text color="gray.500" fontSize="sm">
                          {getVehicleScope(selectedVehicle) === "school" ? "Assigned trip" : "Assigned route"}
                        </Text>
                        <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                          {selectedVehicle.route?.route_name ||
                            selectedVehicle.trip?.name ||
                            "Not assigned"}
                        </Text>
                      </Flex>
                      {selectedVehicle.route?.start_location ||
                      selectedVehicle.route?.end_location ? (
                        <Flex justify="space-between" gap={4}>
                            <Text color="gray.500" fontSize="sm">Route</Text>
                            <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                              {selectedVehicle.route.start_location || "Start unavailable"}
                              {" → "}
                              {selectedVehicle.route.end_location || "End unavailable"}
                            </Text>
                        </Flex>
                      ) : null}
                      {selectedVehicle.trip?.destination ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Destination</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {selectedVehicle.trip.destination}
                          </Text>
                        </Flex>
                      ) : null}
                      {selectedVehicle.trip?.status ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Trip status</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {selectedVehicle.trip.status.replaceAll("_", " ")}
                          </Text>
                        </Flex>
                      ) : null}
                      {selectedVehicle.trip?.departure_at ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Departure</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {formatDateTime(selectedVehicle.trip.departure_at)}
                          </Text>
                        </Flex>
                      ) : null}
                      {selectedVehicle.trip?.return_at ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Return</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {formatDateTime(selectedVehicle.trip.return_at)}
                          </Text>
                        </Flex>
                      ) : null}
                      {selectedVehicle.assignment?.coordinator ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Trip coordinator</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {selectedVehicle.assignment.coordinator.name ||
                              "Not assigned"}
                          </Text>
                        </Flex>
                      ) : null}
                      <Flex justify="space-between" gap={4}>
                        <Text color="gray.500" fontSize="sm">Assigned students</Text>
                        <Text color="gray.800" fontSize="sm" fontWeight="700" textAlign="right">
                          {selectedVehicle.studentCount || 0}
                          {selectedVehicle.capacity
                            ? ` / ${selectedVehicle.capacity}`
                            : ""}
                        </Text>
                      </Flex>
                      {selectedVehicle.trackingSession ? (
                        <Flex justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">Tracking</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {selectedVehicle.trackingSession.status} ·{" "}
                            {formatDateTime(selectedVehicle.trackingSession.started_at)}
                          </Text>
                        </Flex>
                      ) : null}
                    </VStack>
                  </CardBody>
                </Card>
                {selectedVehicle.tripAssignments?.length > 1 ? (
                  <Card
                    gridColumn={{ md: "1 / -1" }}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <CardBody>
                      <Heading size="xs" color="gray.500" textTransform="uppercase" mb={3}>
                        School trip assignments
                      </Heading>
                      <VStack align="stretch" spacing={3}>
                        {selectedVehicle.tripAssignments.map((assignment) => (
                          <Box
                            key={assignment.id}
                            p={3}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.100"
                            borderRadius="lg"
                          >
                            <Flex justify="space-between" align="flex-start" gap={3}>
                              <Box>
                                <Text color="gray.800" fontSize="sm" fontWeight="700">
                                  {assignment.trip?.name || "School trip"}
                                </Text>
                                <Text color="gray.500" fontSize="xs" mt={1}>
                                  {assignment.trip?.destination || "Destination not set"}
                                  {assignment.trip?.status
                                    ? ` · ${assignment.trip.status.replaceAll("_", " ")}`
                                    : ""}
                                </Text>
                              </Box>
                              <Badge colorScheme="blue">
                                {assignment.studentCount}{" "}
                                {assignment.studentCount === 1 ? "student" : "students"}
                              </Badge>
                            </Flex>
                            <Text color="gray.600" fontSize="xs" mt={2}>
                              Driver: {assignment.driver?.name || "Not assigned"}
                              {assignment.trip?.departure_at
                                ? ` · Departs ${formatDateTime(assignment.trip.departure_at)}`
                                : ""}
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                ) : null}
                <Card borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <CardBody>
                    <Heading size="xs" color="gray.500" textTransform="uppercase" mb={3}>
                      Compliance dates
                    </Heading>
                    <VStack align="stretch" spacing={2}>
                      {[
                        ["License expiry", selectedVehicle.license_expiry],
                        ["Roadworthy expiry", selectedVehicle.roadworthy_expiry],
                        ["Insurance expiry", selectedVehicle.insurance_expiry],
                        ["Added", selectedVehicle.created_at],
                        ["Last updated", selectedVehicle.updated_at],
                      ].map(([label, value]) => (
                        <Flex key={label} justify="space-between" gap={4}>
                          <Text color="gray.500" fontSize="sm">{label}</Text>
                          <Text color="gray.800" fontSize="sm" fontWeight="600" textAlign="right">
                            {value ? formatDateTime(value) : "Not recorded"}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
                <Card borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <CardBody>
                    <Heading size="xs" color="gray.500" textTransform="uppercase" mb={3}>
                      Live information
                    </Heading>
                    <VStack align="stretch" spacing={2}>
                      <HStack>
                        <Icon as={FiUsers} color="orange.500" />
                        <Text color="gray.700" fontSize="sm">
                          {selectedVehicle.studentCount || 0} assigned students
                        </Text>
                      </HStack>
                      {selectedVehicle.location ? (
                        <HStack align="flex-start">
                          <Icon as={FiMapPin} color="green.600" mt={1} />
                          <Text color="gray.700" fontSize="sm">
                            {selectedVehicle.location.latitude},{" "}
                            {selectedVehicle.location.longitude}
                            <Text as="span" display="block" color="gray.500" fontSize="xs">
                              Updated {formatDateTime(selectedVehicle.location.recorded_at)}
                            </Text>
                          </Text>
                        </HStack>
                      ) : (
                        <Text color="gray.500" fontSize="sm">No live location available.</Text>
                      )}
                      {Array.isArray(selectedVehicle.documents) &&
                      selectedVehicle.documents.length ? (
                        <HStack align="flex-start">
                          <Icon as={FiFileText} color="blue.500" mt={1} />
                          <Text color="gray.700" fontSize="sm">
                            {selectedVehicle.documents.length} vehicle documents on file
                          </Text>
                        </HStack>
                      ) : null}
                      {Array.isArray(selectedVehicle.photos) &&
                      selectedVehicle.photos.length ? (
                        <Text color="gray.500" fontSize="sm">
                          {selectedVehicle.photos.length} vehicle photos on file
                        </Text>
                      ) : null}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </ModalBody>
            <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.100">
              <Button onClick={() => setSelectedVehicle(null)} colorScheme="blue">
                Close details
              </Button>
            </ModalFooter>
          </ModalContent>
        ) : null}
      </Modal>
    </Box>
  );
};

export default Vehicles;
