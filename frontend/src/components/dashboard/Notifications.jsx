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
  Select,
  Table,
  TableContainer,
  Spinner,
  Stack,
  Text,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiUsers,
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
const PAGE_SIZE = 50;
const DISPLAY_PAGE_SIZE = 14;
const REFRESH_INTERVAL_MS = 30_000;
const CACHE_PREFIX = "support-notifications-inbox";
const AUTHORIZATION_HEADER = "Authorization";
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
    return Array.isArray(cache?.notifications)
      ? cache.notifications.slice(0, PAGE_SIZE)
      : [];
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
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const loadNotifications = useCallback(async ({ refresh = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your support session has expired. Please sign in again.");
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
      return;
    }

    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/admin/support-notifications`, {
        headers: { [AUTHORIZATION_HEADER]: ["Bearer", token].join(" ") },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load notifications.");
      }
      setNotifications(result.slice(0, PAGE_SIZE));
    } catch (requestError) {
      console.error("Could not load support notifications:", requestError);
      setError(requestError?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
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
          headers: { [AUTHORIZATION_HEADER]: ["Bearer", token].join(" ") },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to mark notification as read.",
        );
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
      console.error(
        "Could not mark support notification as read:",
        requestError,
      );
      setError(requestError?.message || "Unable to update notification.");
      return false;
    }
  };

  const markAllNotificationsRead = async () => {
    if (!unreadCount || markingAllRead) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your support session has expired. Please sign in again.");
      return;
    }

    setMarkingAllRead(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/support-notifications/read-all`,
        {
          method: "PATCH",
          headers: { [AUTHORIZATION_HEADER]: ["Bearer", token].join(" ") },
        },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.notifications)) {
        throw new Error(
          result?.error || "Unable to mark all notifications as read.",
        );
      }
      const readAtById = new Map(
        result.notifications.map((notification) => [
          notification.id,
          notification.read_at,
        ]),
      );
      setNotifications((current) =>
        current.map((notification) =>
          readAtById.has(notification.id)
            ? {
                ...notification,
                read_at: readAtById.get(notification.id),
              }
            : notification,
        ),
      );
    } catch (requestError) {
      console.error(
        "Could not mark all support notifications as read:",
        requestError,
      );
      setError(
        requestError?.message || "Unable to mark all notifications as read.",
      );
    } finally {
      setMarkingAllRead(false);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      const markedRead = await markNotificationRead(notification);
      if (!markedRead) return;
    }

    if (
      ["incident_report", "support_ticket", "emergency_alert"].includes(
        notification.entity_type,
      ) &&
      notification.entity_id
    ) {
      const params = new URLSearchParams();
      params.set(
        "tab",
        notification.entity_type === "incident_report"
          ? "incidents"
          : notification.entity_type === "support_ticket"
            ? "tickets"
            : "sos",
      );
      params.set("openType", notification.entity_type);
      params.set("openId", notification.entity_id);
      navigate(`/requests?${params.toString()}`);
    } else if (notification.entity_type === "support_settings") {
      const params = new URLSearchParams({
        configurationHistory: "1",
        historyAt: notification.created_at || "",
      });
      if (notification.entity_id) {
        params.set("historyId", notification.entity_id);
      }
      navigate(`/settings?${params.toString()}`);
    } else {
      navigate("/requests");
    }
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const notificationTypes = [
    ...new Set(
      notifications.map(
        (notification) => notification.entity_type || "support",
      ),
    ),
  ].sort();
  const filteredNotifications = notifications.filter((notification) => {
    const matchesReadStatus =
      readFilter === "all" ||
      (readFilter === "unread" && !notification.read_at) ||
      (readFilter === "read" && Boolean(notification.read_at));
    const matchesType =
      typeFilter === "all" ||
      (notification.entity_type || "support") === typeFilter;
    return matchesReadStatus && matchesType;
  });
  const pageCount = Math.max(
    1,
    Math.ceil(filteredNotifications.length / DISPLAY_PAGE_SIZE),
  );
  const visibleNotifications = filteredNotifications.slice(
    (page - 1) * DISPLAY_PAGE_SIZE,
    page * DISPLAY_PAGE_SIZE,
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return (
    <Box p={{ base: 4, md: 5 }} bg="gray.50" borderColor="gray.200">
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
            <Badge
              colorScheme={unreadCount ? "orange" : "gray"}
              borderRadius="full"
              px={2}
            >
              {notifications.length} total
            </Badge>
            <Button
              size="sm"
              leftIcon={<Icon as={FiCheck} />}
              colorScheme="blue"
              variant="outline"
              onClick={() => void markAllNotificationsRead()}
              isLoading={markingAllRead}
              isDisabled={!unreadCount || markingAllRead}
            >
              Mark all
            </Button>
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
          <Card border="1px solid" borderColor="gray.200" shadow="sm">
            <Flex
              px={4}
              py={3}
              gap={3}
              wrap="wrap"
              align="center"
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Text fontSize="sm" fontWeight="700" color="gray.700">
                Filter:
              </Text>
              <Select
                aria-label="Filter notifications by read status"
                size="sm"
                maxW="180px"
                value={readFilter}
                onChange={(event) => {
                  setReadFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </Select>
              <Select
                aria-label="Filter notifications by type"
                size="sm"
                maxW="220px"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All types</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
              <Text ml="auto" fontSize="sm" color="gray.500">
                {filteredNotifications.length} matching notifications
              </Text>
            </Flex>
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Type</Th>
                    <Th>Notification</Th>
                    <Th>Message</Th>
                    <Th>Received</Th>
                    <Th>Status</Th>
                    <Th textAlign="right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {visibleNotifications.length ? (
                    visibleNotifications.map((notification) => {
                      const unread = !notification.read_at;
                      const isIncident =
                        notification.entity_type === "incident_report";
                      return (
                        <Tr
                          key={notification.id}
                          bg={unread ? "blue.50" : "white"}
                          _hover={{ bg: unread ? "blue.100" : "gray.50" }}
                        >
                          <Td>
                            <HStack spacing={2}>
                              <Icon
                                as={isIncident ? FiAlertTriangle : FiUsers}
                                color={isIncident ? "orange.600" : "purple.600"}
                              />
                              <Text textTransform="capitalize">
                                {String(
                                  notification.entity_type || "support",
                                ).replaceAll("_", " ")}
                              </Text>
                            </HStack>
                          </Td>
                          <Td minW="190px">
                            <Text fontWeight="700">{notification.title}</Text>
                          </Td>
                          <Td minW="240px" maxW="420px">
                            <Text fontSize="sm" color="gray.700" noOfLines={2}>
                              {notification.message}
                            </Text>
                          </Td>
                          <Td whiteSpace="nowrap">
                            <Text fontSize="sm" color="gray.600">
                              {formatDateTime(notification.created_at)}
                            </Text>
                          </Td>
                          <Td>
                            <Badge colorScheme={unread ? "blue" : "green"}>
                              {unread ? "Unread" : "Read"}
                            </Badge>
                          </Td>
                          <Td textAlign="right">
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="blue"
                              onClick={() =>
                                void openNotification(notification)
                              }
                            >
                              View
                            </Button>
                          </Td>
                        </Tr>
                      );
                    })
                  ) : (
                    <Tr>
                      <Td colSpan={6} py={8} textAlign="center">
                        <Text color="gray.500">
                          No notifications match these filters.
                        </Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
            <Flex
              align="center"
              justify="space-between"
              gap={3}
              px={4}
              py={3}
              borderTop="1px solid"
              borderColor="gray.100"
              wrap="wrap"
            >
              <Text fontSize="sm" color="gray.500">
                Showing{" "}
                {filteredNotifications.length
                  ? (page - 1) * DISPLAY_PAGE_SIZE + 1
                  : 0}
                –
                {Math.min(
                  page * DISPLAY_PAGE_SIZE,
                  filteredNotifications.length,
                )}{" "}
                of {filteredNotifications.length} notifications
              </Text>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={FiChevronLeft} />}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  isDisabled={page <= 1}
                >
                  Previous
                </Button>
                <Text fontSize="sm" color="gray.600">
                  Page {page} of {pageCount}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  rightIcon={<Icon as={FiChevronRight} />}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  isDisabled={page >= pageCount}
                >
                  Next
                </Button>
              </HStack>
            </Flex>
          </Card>
        </Stack>
      ) : !error ? (
        <Card border="1px solid" borderColor="gray.200" shadow="sm">
          <CardBody py={12} textAlign="center">
            <Icon as={FiBell} boxSize={9} color="gray.400" />
            <Heading size="sm" mt={3}>
              No notifications yet
            </Heading>
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
