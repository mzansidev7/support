import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiRefreshCw,
  FiUsers,
  FiTruck,
  FiMap,
  FiMapPin,
  FiHeadphones,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");
const CACHE_PREFIX = "support-dashboard-cache";
const REFRESH_INTERVAL_MS = 30_000;

const emptyMetrics = {
  users: 0,
  schools: 0,
  children: 0,
  drivers: 0,
  vehicles: 0,
  activeVehicles: 0,
  routes: 0,
  liveTrips: 0,
  openTickets: 0,
  openIncidents: 0,
};

const metricsList = [
  { key: "users", label: "Platform users", icon: FiUsers, color: "blue.500" },
  { key: "schools", label: "Schools", icon: FiBookOpen, color: "purple.500" },
  { key: "children", label: "Students", icon: FiUser, color: "cyan.600" },
  { key: "drivers", label: "Drivers", icon: FiUsers, color: "orange.500" },
  { key: "vehicles", label: "Vehicles", icon: FiTruck, color: "green.600" },
  { key: "routes", label: "Routes", icon: FiMap, color: "pink.600" },
];

const formatTime = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getDashboardCacheKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return `${CACHE_PREFIX}:${user?.id || user?.email || "current-user"}`;
  } catch {
    return `${CACHE_PREFIX}:current-user`;
  }
};

const readDashboardCache = () => {
  try {
    const cached = JSON.parse(
      localStorage.getItem(getDashboardCacheKey()) || "null",
    );
    if (!cached?.metrics || !cached?.generatedAt) return null;
    return {
      metrics: { ...emptyMetrics, ...cached.metrics },
      recentActivity: Array.isArray(cached.recentActivity)
        ? cached.recentActivity
        : [],
      generatedAt: cached.generatedAt,
    };
  } catch (error) {
    console.warn("Could not read the support dashboard cache:", error);
    return null;
  }
};

const getSupportName = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    return (
      storedUser?.full_name ||
      storedUser?.name ||
      storedUser?.display_name ||
      "Support team"
    );
  } catch (error) {
    console.error("Could not read the support profile from local storage:", error);
    return "Support team";
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(
    () =>
      readDashboardCache() || {
        metrics: emptyMetrics,
        recentActivity: [],
        generatedAt: "",
      },
  );
  const [loading, setLoading] = useState(
    () => !readDashboardCache()?.generatedAt,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [supportName] = useState(getSupportName);
  const refreshTimer = useRef(null);
  const refreshInFlight = useRef(false);
  const metrics = dashboardData.metrics;
  const recentActivity = dashboardData.recentActivity;
  const generatedAt = dashboardData.generatedAt;
  const hasData = Boolean(generatedAt);

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!background) setRefreshing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error === "PLATFORM_ADMIN_REQUIRED"
            ? "This account does not have dashboard access."
            : result?.error || "Unable to load platform operations data.",
        );
      }

      const nextData = {
        metrics: { ...emptyMetrics, ...(result.metrics || {}) },
        recentActivity: Array.isArray(result.recentActivity)
          ? result.recentActivity
          : [],
        generatedAt: result.generatedAt || new Date().toISOString(),
      };
      setDashboardData(nextData);
      try {
        localStorage.setItem(
          getDashboardCacheKey(),
          JSON.stringify(nextData),
        );
      } catch (cacheError) {
        console.warn("Could not save the support dashboard cache:", cacheError);
      }
    } catch (requestError) {
      console.error("Could not load support dashboard:", requestError);
      setError(
        requestError?.message ||
          "Unable to load current platform operations data.",
      );
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
      refreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();

    let debounceTimer;
    const channel = supabaseClient
      .channel("support-dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(
            () => void refresh({ background: true }),
            400,
          );
        },
      );

    channel.subscribe((status, subscriptionError) => {
      const connected = status === "SUBSCRIBED";
      setRealtimeConnected(connected);
      if (subscriptionError) {
        console.warn("Support dashboard realtime subscription issue:", subscriptionError);
      }
    });

    refreshTimer.current = setInterval(
      () => void refresh({ background: true }),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      clearTimeout(debounceTimer);
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      void supabaseClient.removeChannel(channel);
    };
  }, [refresh]);

  const offlineVehicles = Math.max(
    0,
    metrics.vehicles - metrics.activeVehicles,
  );
  const hasAlerts =
    metrics.openTickets > 0 ||
    metrics.openIncidents > 0 ||
    offlineVehicles > 0;

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Support dashboard"
        description={`Welcome, ${supportName}`}
        meta={
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
        }
        actions={
          <Button
            aria-label="Refresh dashboard"
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            colorScheme="blue"
            onClick={() => void refresh()}
            isLoading={refreshing}
            loadingText="Refreshing"
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="lg" mb={5} alignItems="flex-start">
          <AlertIcon mt={1} />
          <Box flex="1">
            <Text fontWeight="700">Could not load current support data</Text>
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

      {loading && !hasData ? (
        <Flex minH="260px" direction="column" align="center" justify="center">
          <Spinner color="blue.500" size="lg" />
          <Text mt={3} color="gray.600">
            Loading platform metrics…
          </Text>
        </Flex>
      ) : hasData ? (
        <VStack align="stretch" spacing={5}>
          <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
            {metricsList.map((metric) => (
              <Card key={metric.key} borderRadius="xl" border="1px solid">
                <CardBody p={{ base: 3, md: 4 }}>
                  <Flex
                    align="center"
                    justify="center"
                    w="38px"
                    h="38px"
                    borderRadius="lg"
                    bg={`${metric.color.split(".")[0]}.50`}
                    color={metric.color}
                    mb={3}
                  >
                    <Icon as={metric.icon} boxSize={5} />
                  </Flex>
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    {metric.label}
                  </Text>
                  <Text fontSize="2xl" color="gray.800" fontWeight="800">
                    {metrics[metric.key].toLocaleString()}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          <Card borderRadius="xl" border="1px solid">
            <CardBody p={{ base: 4, md: 5 }}>
              <Heading size="sm" mb={3} color="gray.800">
                Needs attention
              </Heading>
              {hasAlerts ? (
                <VStack align="stretch" spacing={0} divider={<Box borderTop="1px solid" borderColor="gray.100" />}>
                  {metrics.openTickets > 0 ? (
                    <Button
                      variant="ghost"
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={1}
                      whiteSpace="normal"
                      textAlign="left"
                      onClick={() => navigate("/requests")}
                    >
                      <HStack w="100%" spacing={3}>
                        <Flex
                          w="40px"
                          h="40px"
                          borderRadius="lg"
                          align="center"
                          justify="center"
                          bg="red.50"
                          color="red.600"
                        >
                          <Icon as={FiHeadphones} boxSize={5} />
                        </Flex>
                        <Box flex="1">
                          <Text color="gray.800" fontSize="sm" fontWeight="700">
                            Support requests need attention
                          </Text>
                          <Text color="gray.600" fontSize="xs">
                            {metrics.openTickets} open or in-progress requests
                          </Text>
                        </Box>
                        <Text color="gray.400" fontSize="xl">›</Text>
                      </HStack>
                    </Button>
                  ) : null}
                  {metrics.openIncidents > 0 ? (
                    <Button
                      variant="ghost"
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={1}
                      whiteSpace="normal"
                      textAlign="left"
                      onClick={() => navigate("/requests?tab=incidents")}
                    >
                      <HStack w="100%" spacing={3}>
                        <Flex
                          w="40px"
                          h="40px"
                          borderRadius="lg"
                          align="center"
                          justify="center"
                          bg="orange.50"
                          color="orange.600"
                        >
                          <Icon as={FiAlertTriangle} boxSize={5} />
                        </Flex>
                        <Box flex="1">
                          <Text color="gray.800" fontSize="sm" fontWeight="700">
                            Incident reports are open
                          </Text>
                          <Text color="gray.600" fontSize="xs">
                            {metrics.openIncidents} reports require review
                          </Text>
                        </Box>
                        <Text color="gray.400" fontSize="xl">›</Text>
                      </HStack>
                    </Button>
                  ) : null}
                  {offlineVehicles > 0 ? (
                    <Button
                      variant="ghost"
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={1}
                      whiteSpace="normal"
                      textAlign="left"
                      onClick={() => navigate("/vehicles")}
                    >
                      <HStack w="100%" spacing={3}>
                        <Flex
                          w="40px"
                          h="40px"
                          borderRadius="lg"
                          align="center"
                          justify="center"
                          bg="blue.50"
                          color="blue.600"
                        >
                          <Icon as={FiTruck} boxSize={5} />
                        </Flex>
                        <Box flex="1">
                          <Text color="gray.800" fontSize="sm" fontWeight="700">
                            Vehicles not currently active
                          </Text>
                          <Text color="gray.600" fontSize="xs">
                            {offlineVehicles} of {metrics.vehicles} vehicles
                            are not in an active tracking session
                          </Text>
                        </Box>
                        <Text color="gray.400" fontSize="xl">›</Text>
                      </HStack>
                    </Button>
                  ) : null}
                </VStack>
              ) : (
                <HStack py={2} spacing={3}>
                  <Icon as={FiCheckCircle} color="green.600" boxSize={5} />
                  <Text color="gray.600" fontSize="sm">
                    No open tickets or incidents, and all vehicles have active
                    sessions.
                  </Text>
                </HStack>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="xl" border="1px solid">
            <CardBody p={{ base: 4, md: 5 }}>
              <Flex align="center" justify="space-between" gap={3} mb={3}>
                <Heading size="sm" color="gray.800">
                  Live operations
                </Heading>
                <Button
                  size="sm"
                  variant="link"
                  colorScheme="blue"
                  onClick={() => navigate("/live_map")}
                >
                  View live map
                </Button>
              </Flex>
              <HStack spacing={3} py={2}>
                <Icon as={FiMapPin} color="green.600" boxSize={6} />
                <Box flex="1">
                  <Text color="gray.800" fontSize="2xl" fontWeight="800">
                    {metrics.liveTrips}
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    active tracking sessions now
                  </Text>
                </Box>
                <Button
                  colorScheme="green"
                  variant="subtle"
                  size="sm"
                  onClick={() => navigate("/live_map")}
                >
                  Open live
                </Button>
              </HStack>
            </CardBody>
          </Card>

          <Card borderRadius="xl" border="1px solid">
            <CardBody p={{ base: 4, md: 5 }}>
              <Flex align="center" justify="space-between" gap={3}>
                <Button
                  variant="ghost"
                  px={2}
                  onClick={() => setActivityOpen((open) => !open)}
                  aria-expanded={activityOpen}
                  aria-controls="recent-platform-activity"
                  rightIcon={<Icon as={activityOpen ? FiChevronUp : FiChevronDown} />}
                  _hover={{ bg: "gray.50" }}
                  _active={{ bg: "gray.100" }}
                >
                  <Heading size="sm" color="gray.800">
                    Recent platform activity
                  </Heading>
                </Button>
                <Text color="gray.500" fontSize="xs" textAlign="right">
                  Updated {formatTime(generatedAt)}
                </Text>
              </Flex>
              <Collapse in={activityOpen} animateOpacity>
                <Box id="recent-platform-activity" pt={2}>
                  {recentActivity.length ? (
                    <VStack align="stretch" spacing={0} divider={<Box borderTop="1px solid" borderColor="gray.100" />}>
                      {recentActivity.map((item) => {
                        const relatedUser = Array.isArray(item.users)
                          ? item.users[0]
                          : item.users;
                        return (
                          <Flex
                            key={item.id}
                            align="center"
                            gap={3}
                            py={3}
                          >
                            <Box w="9px" h="9px" borderRadius="full" bg="blue.500" />
                            <Box flex="1" minW={0}>
                              <Text
                                color="gray.800"
                                fontSize="sm"
                                fontWeight="700"
                                noOfLines={1}
                              >
                                {item.action}
                              </Text>
                              <Text color="gray.600" fontSize="xs" noOfLines={1}>
                                {relatedUser?.name || relatedUser?.email || "System"}
                                {item.entity_type
                                  ? ` · ${item.entity_type.replaceAll("_", " ")}`
                                  : ""}
                              </Text>
                            </Box>
                            <Text
                              color="gray.500"
                              fontSize="xs"
                              maxW={{ base: "86px", md: "140px" }}
                              textAlign="right"
                            >
                              {formatTime(item.created_at)}
                            </Text>
                          </Flex>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Text color="gray.600" fontSize="sm" py={3}>
                      No platform activity has been recorded yet.
                    </Text>
                  )}
                </Box>
              </Collapse>
            </CardBody>
          </Card>
        </VStack>
      ) : null}

      {loading && hasData ? (
        <HStack justify="center" mt={4} color="gray.500" fontSize="sm">
          <Spinner size="xs" />
          <Text>Refreshing data…</Text>
        </HStack>
      ) : null}
      {!loading && !error && !hasData ? (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>
            Dashboard data was not returned. Refresh to try again.
          </AlertDescription>
        </Alert>
      ) : null}
    </Box>
  );
};

export default Dashboard;
