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
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiBell, FiCheck, FiRefreshCw, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");
const PAGE_SIZE = 50;
const REFRESH_INTERVAL_MS = 30_000;
const CACHE_PREFIX = "support-notifications-inbox";
const REALTIME_RESOURCES = new Set(["support_notifications"]);

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
    return Array.isArray(cache?.notifications) ? cache.notifications : [];
  } catch (cacheError) {
    console.warn("Could not read cached support notifications:", cacheError);
    return [];
  }
};

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const Notifications = () => {
  const navigate = useNavigate();
  const [initialNotifications] = useState(readCache);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [loading, setLoading] = useState(initialNotifications.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const loadNotifications = useCallback(async ({ refresh = false, offset = 0 } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your support session has expired. Please sign in again.");
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      inFlight.current = false;
      return;
    }

    if (refresh) setRefreshing(true);
    else if (offset > 0) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/support-notifications?offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load notifications.");
      }
      setNotifications((current) => {
        if (offset) {
          const knownIds = new Set(current.map((item) => item.id));
          return [...current, ...result.filter((item) => !knownIds.has(item.id))];
        }
        if (current.length > result.length) {
          const refreshedIds = new Set(result.map((item) => item.id));
          return [
            ...result,
            ...current.filter((item) => !refreshedIds.has(item.id)),
          ];
        }
        return result;
      });
      setHasMore(result.length === PAGE_SIZE);
    } catch (requestError) {
      console.error("Could not load support notifications:", requestError);
      setError(requestError?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void loadNotifications({ refresh: initialNotifications.length > 0 });

    let debounceTimer;
    const channel = supabaseClient
      .channel("support-notifications-inbox-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
        },
        (payload) => {
          const resourceType = payload.new?.resource_type;
          if (!REALTIME_RESOURCES.has(resourceType)) return;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void loadNotifications({ refresh: true });
          }, 400);
        },
      )
      .subscribe((status, subscriptionError) => {
        if (status === "CHANNEL_ERROR" || subscriptionError) {
          console.warn(
            "Support notifications realtime subscription issue:",
            subscriptionError || status,
          );
        }
      });
    const interval = setInterval(() => {
      void loadNotifications({ refresh: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(interval);
      void supabaseClient.removeChannel(channel);
    };
  }, [initialNotifications.length, loadNotifications]);

  useEffect(() => {
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          notifications,
          cachedAt: new Date().toISOString(),
        }),
      );
    } catch (cacheError) {
      console.warn("Could not cache support notifications:", cacheError);
    }
  }, [notifications]);

  const markNotificationRead = async (notification) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your support session has expired. Please sign in again.");
      return false;
    }
    try {
      const response = await fetch(
        `${API_URL}/admin/support-notifications/${encodeURIComponent(notification.id)}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to mark notification as read.");
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: result.read_at || new Date().toISOString() }
            : item,
        ),
      );
      return true;
    } catch (requestError) {
      console.error("Could not mark support notification as read:", requestError);
      setError(requestError?.message || "Unable to update notification.");
      return false;
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      const markedRead = await markNotificationRead(notification);
      if (!markedRead) return;
    }

    if (notification.entity_type === "incident_report") {
      navigate("/requests?tab=incidents");
    } else if (notification.entity_type === "support_ticket") {
      navigate("/requests?tab=tickets");
    } else {
      navigate("/requests");
    }
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <Box>
      <PageHeader
        eyebrow="SUPPORT WORKSPACE"
        title="Notifications"
        description="Review incident, ticket, and support alerts assigned to your account."
        actions={
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            onClick={() => void loadNotifications({ refresh: true })}
            isLoading={refreshing}
          >
            Refresh
          </Button>
        }
      />

      <Card mb={5} border="1px solid" borderColor="gray.200" shadow="sm">
        <CardBody>
          <Flex align="center" gap={3}>
            <Flex
              align="center"
              justify="center"
              w={11}
              h={11}
              borderRadius="xl"
              bg="blue.50"
              color="blue.600"
            >
              <Icon as={FiBell} boxSize={5} />
            </Flex>
            <Box flex="1">
              <Text fontWeight="700">Your notification inbox</Text>
              <Text fontSize="sm" color="gray.600">
                {unreadCount
                  ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
                  : "You’re all caught up"}
              </Text>
            </Box>
            <Badge colorScheme={unreadCount ? "orange" : "gray"} borderRadius="full" px={2}>
              {notifications.length} total
            </Badge>
          </Flex>
        </CardBody>
      </Card>

      {error ? (
        <Alert status="error" borderRadius="lg" mb={4}>
          <AlertIcon />
          <AlertDescription flex="1">{error}</AlertDescription>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void loadNotifications({ refresh: true })}
          >
            Try again
          </Button>
        </Alert>
      ) : null}

      {loading ? (
        <Flex justify="center" align="center" minH="220px" gap={3}>
          <Spinner color="blue.500" />
          <Text color="gray.600">Loading notifications…</Text>
        </Flex>
      ) : notifications.length ? (
        <Stack spacing={3}>
          {notifications.map((notification) => {
            const unread = !notification.read_at;
            const isIncident = notification.entity_type === "incident_report";
            return (
              <Card
                key={notification.id}
                border="1px solid"
                borderColor={unread ? "blue.200" : "gray.200"}
                bg={unread ? "blue.50" : "white"}
                shadow="sm"
                _hover={{ shadow: "md", borderColor: "blue.300" }}
                cursor="pointer"
                onClick={() => void openNotification(notification)}
              >
                <CardBody>
                  <Flex align="flex-start" gap={3}>
                    <Flex
                      align="center"
                      justify="center"
                      flexShrink={0}
                      w={10}
                      h={10}
                      borderRadius="xl"
                      bg={isIncident ? "orange.100" : "purple.100"}
                      color={isIncident ? "orange.700" : "purple.700"}
                    >
                      <Icon as={isIncident ? FiAlertTriangle : FiUsers} boxSize={5} />
                    </Flex>
                    <Box flex="1" minW={0}>
                      <HStack spacing={2} mb={1} wrap="wrap">
                        <Heading size="sm">{notification.title}</Heading>
                        {unread ? <Badge colorScheme="blue">New</Badge> : null}
                        <Badge colorScheme={isIncident ? "orange" : "purple"}>
                          {String(notification.entity_type || "support")
                            .replaceAll("_", " ")}
                        </Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                        {notification.message}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={2}>
                        {formatDateTime(notification.created_at)}
                      </Text>
                    </Box>
                    {!unread ? (
                      <Icon as={FiCheck} color="green.500" aria-label="Read" />
                    ) : null}
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
          {hasMore ? (
            <Flex justify="center" py={2}>
              <Button
                variant="outline"
                onClick={() =>
                  void loadNotifications({ offset: notifications.length })
                }
                isLoading={loadingMore}
              >
                Load older notifications
              </Button>
            </Flex>
          ) : null}
        </Stack>
      ) : !error ? (
        <Card border="1px solid" borderColor="gray.200" shadow="sm">
          <CardBody py={12} textAlign="center">
            <Icon as={FiBell} boxSize={9} color="gray.400" />
            <Heading size="sm" mt={3}>No notifications yet</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              New support and incident updates will appear here.
            </Text>
          </CardBody>
        </Card>
      ) : null}
    </Box>
  );
};

export default Notifications;
