import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tbody,
  Tabs,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiMessageCircle,
  FiRefreshCw,
} from "react-icons/fi";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import { API_URL } from "../../Urls";
import PageHeader from "./PageHeader";
import { showConfirmationAlert } from "../../utils/sweetAlert.js";

const CACHE_PREFIX = "support-requests-cache";
const REFRESH_INTERVAL_MS = 30_000;
const emergencyAlertIcon = L.divIcon({
  className: "support-emergency-marker",
  html: '<span aria-hidden="true" style="display:flex;width:36px;height:36px;align-items:center;justify-content:center;border:3px solid #fff;border-radius:50%;background:#dc2626;box-shadow:0 3px 10px rgba(15,23,42,.35);color:#fff;font-size:18px;font-weight:800">!</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});
const REFRESH_RESOURCES = new Set([
  "support_tickets",
  "support_ticket_replies",
  "support_notifications",
  "activity_logs",
  "incident_reports",
  "incident_report_replies",
  "schools",
]);

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
    return Array.isArray(cache?.tickets) &&
      Array.isArray(cache?.incidents) &&
      Array.isArray(cache?.schools)
      ? {
          ...cache,
          incidentRepliesById:
            cache.incidentRepliesById &&
            typeof cache.incidentRepliesById === "object" &&
            !Array.isArray(cache.incidentRepliesById)
              ? cache.incidentRepliesById
              : {},
        }
      : null;
  } catch (error) {
    console.warn("Could not read cached support requests:", error);
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getAlertCoordinates = (alert) => {
  if (
    alert?.latitude == null ||
    alert.latitude === "" ||
    alert?.longitude == null ||
    alert.longitude === ""
  ) {
    return null;
  }
  const latitude = Number(alert?.latitude);
  const longitude = Number(alert?.longitude);
  return Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
    ? [latitude, longitude]
    : null;
};

const emergencySenderLabel = (role) => {
  const labels = {
    client: "Parent / guardian",
    driver: "Driver",
    school_admin: "School admin",
    owner: "Transport provider",
  };
  return labels[role] || (role ? prettyLabel(role) : "App user");
};

const emergencyStatusAppearance = (alert) => {
  if (alert?.status === "resolved") {
    return { label: "Resolved", scheme: "green", background: "green.50" };
  }
  if (alert?.status === "in_progress" || alert?.attending_at) {
    return {
      label: "Support is attending",
      scheme: "blue",
      background: "blue.50",
    };
  }
  return {
    label: "Waiting for support",
    scheme: "orange",
    background: "orange.50",
  };
};

const emergencyAssigneeName = (alert) => {
  const assignedUser = Array.isArray(alert?.attending_user)
    ? alert.attending_user[0]
    : alert?.attending_user;
  return assignedUser?.name || assignedUser?.email || null;
};

const emergencyConversationCacheKey = (alertId) =>
  `${getCacheKey()}:sos-conversation:${alertId}`;
const normalizeEmergencyConversationMessages = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter((message) => {
    if (
      !message ||
      typeof message !== "object" ||
      typeof message.id !== "string" ||
      typeof message.author_user_id !== "string" ||
      typeof message.body !== "string" ||
      typeof message.created_at !== "string" ||
      !Number.isFinite(Date.parse(message.created_at)) ||
      seen.has(message.id)
    ) {
      return false;
    }
    seen.add(message.id);
    return true;
  });
};
const readEmergencyConversationCache = (alertId) => {
  try {
    const cachedMessages = JSON.parse(
      localStorage.getItem(emergencyConversationCacheKey(alertId)) || "null",
    );
    return Array.isArray(cachedMessages)
      ? normalizeEmergencyConversationMessages(cachedMessages)
      : null;
  } catch (cacheError) {
    console.warn("Could not read cached SOS conversation:", cacheError);
    return null;
  }
};
const writeEmergencyConversationCache = (alertId, messages) => {
  try {
    localStorage.setItem(
      emergencyConversationCacheKey(alertId),
      JSON.stringify(normalizeEmergencyConversationMessages(messages)),
    );
  } catch (cacheError) {
    console.warn("Could not cache SOS conversation:", cacheError);
  }
};

const statusColor = (status) => {
  if (["resolved", "closed", "approved"].includes(status)) return "green";
  if (["in_progress"].includes(status)) return "blue";
  if (["rejected"].includes(status)) return "red";
  if (["urgent", "critical", "high"].includes(status)) return "red";
  return "orange";
};

const prettyLabel = (value) =>
  String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const incidentStatusLabel = (status) =>
  status === "resolved" ? "Closed" : prettyLabel(status);

const deadlineLabel = (value) => {
  if (!value) return null;
  const remaining = new Date(value).getTime() - Date.now();
  if (Number.isNaN(remaining)) return null;
  if (remaining < 0) {
    return { label: "Overdue", color: "red", date: formatDateTime(value) };
  }
  if (remaining <= 2 * 60 * 60 * 1000) {
    return { label: "Due soon", color: "orange", date: formatDateTime(value) };
  }
  return { label: "Due", color: "blue", date: formatDateTime(value) };
};

const safeExternalUrl = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;

const getAdminRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.admin_profile?.admin_role || "analyst";
  } catch {
    return "analyst";
  }
};
const getCurrentUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.id || null;
  } catch {
    return null;
  }
};
const authHeaderKey = "Authorization";

const Requests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const adminRole = getAdminRole();
  const currentUserId = getCurrentUserId();
  const isSuperAdmin = adminRole === "super_admin";
  const canManageRequests = ["super_admin", "support", "operations"].includes(
    adminRole,
  );
  const canChangePriorities = [
    "super_admin",
    "support",
    "operations",
    "analyst",
  ].includes(adminRole);
  const canReplyToTickets = ["super_admin", "support"].includes(adminRole);
  const canReviewSchools = ["super_admin", "support"].includes(adminRole);
  const canEscalateIncidents = [
    "super_admin",
    "support",
    "operations",
  ].includes(adminRole);
  const cached = useRef(readCache());
  const [tickets, setTickets] = useState(cached.current?.tickets || []);
  const [incidents, setIncidents] = useState(cached.current?.incidents || []);
  const [incidentRepliesById, setIncidentRepliesById] = useState(
    cached.current?.incidentRepliesById || {},
  );
  const [schools, setSchools] = useState(cached.current?.schools || []);
  const [search, setSearch] = useState("");
  const [ticketPage, setTicketPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [incidentFilter, setIncidentFilter] = useState("all");
  const [ticketOwnerFilter, setTicketOwnerFilter] = useState("all");
  const [incidentOwnerFilter, setIncidentOwnerFilter] = useState("all");
  const [staff, setStaff] = useState([]);
  const [currentStaffId, setCurrentStaffId] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState(
    cached.current?.emergencyAlerts || [],
  );
  const [emergencyAlertPage, setEmergencyAlertPage] = useState(1);
  const [emergencyAssignees, setEmergencyAssignees] = useState([]);
  const [emergencyAlertsError, setEmergencyAlertsError] = useState("");
  const [liveChats, setLiveChats] = useState([]);
  const [selectedLiveChat, setSelectedLiveChat] = useState(null);
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [liveChatDraft, setLiveChatDraft] = useState("");
  const [liveChatError, setLiveChatError] = useState("");
  const [liveChatsLoading, setLiveChatsLoading] = useState(false);
  const [liveChatSending, setLiveChatSending] = useState(false);
  const [markingAllSupportAlertsRead, setMarkingAllSupportAlertsRead] =
    useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    if (tab === "incidents") return 1;
    if (tab === "schools") return 2;
    if (tab === "sos") return 3;
    if (tab === "chats") return 4;
    return 0;
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedEmergencyAlert, setSelectedEmergencyAlert] = useState(null);
  const [emergencyConversationMessages, setEmergencyConversationMessages] =
    useState([]);
  const [emergencyConversationLoading, setEmergencyConversationLoading] =
    useState(false);
  const [emergencyConversationError, setEmergencyConversationError] =
    useState("");
  const [emergencyReplyDraft, setEmergencyReplyDraft] = useState("");
  const [emergencyReplySending, setEmergencyReplySending] = useState(false);
  const [emergencyStatusUpdating, setEmergencyStatusUpdating] = useState(false);
  const selectedIncidentRef = useRef(selectedIncident);
  selectedIncidentRef.current = selectedIncident;
  const previousTabRef = useRef(0);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [incidentEscalationNote, setIncidentEscalationNote] = useState("");
  const [replies, setReplies] = useState([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [schoolReviewNote, setSchoolReviewNote] = useState("");
  const [audit, setAudit] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const ticketDisclosure = useDisclosure();
  const incidentDisclosure = useDisclosure();
  const emergencyAlertDisclosure = useDisclosure();
  const schoolDisclosure = useDisclosure();
  const [loading, setLoading] = useState(!cached.current);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const inFlight = useRef(false);
  const handledNotificationRef = useRef(null);
  const openTicketRef = useRef(null);
  const openIncidentRef = useRef(null);
  const selectedTicketRef = useRef(selectedTicket);
  selectedTicketRef.current = selectedTicket;

  useEffect(() => {
    const tab = searchParams.get("tab");
    const nextTab =
      tab === "incidents"
        ? 1
        : tab === "schools"
          ? 2
          : tab === "sos"
            ? 3
            : tab === "chats"
              ? 4
              : 0;
    if (nextTab !== 4) previousTabRef.current = nextTab;
    setActiveTab(nextTab);
  }, [searchParams]);

  const handleTabChange = (index) => {
    if (index !== 4) previousTabRef.current = index;
    setActiveTab(index);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (index === 1) next.set("tab", "incidents");
        else if (index === 2) next.set("tab", "schools");
        else if (index === 3) next.set("tab", "sos");
        else if (index === 4) next.set("tab", "chats");
        else next.delete("tab");
        return next;
      },
      { replace: true },
    );
  };

  const toggleOneToOneChats = () => {
    if (activeTab === 4) {
      handleTabChange(previousTabRef.current);
      return;
    }
    previousTabRef.current = activeTab;
    handleTabChange(4);
  };

  useEffect(() => {
    if (!cached.current) return;
    setStaff(cached.current.staff || []);
    setCurrentStaffId(cached.current.currentStaffId || null);
    setMetrics(cached.current.metrics || null);
    setNotifications(cached.current.notifications || []);
  }, []);

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!background) setRefreshing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const headers = { [authHeaderKey]: `Bearer ${token}` };
      const [ticketsResponse, incidentsResponse, schoolsResponse] =
        await Promise.all([
          fetch(`${API_URL}/admin/support-tickets?limit=100`, { headers }),
          fetch(`${API_URL}/admin/incident-reports?limit=200`, { headers }),
          fetch(`${API_URL}/admin/pending-schools`, { headers }),
        ]);
      const results = await Promise.all([
        ticketsResponse.json(),
        incidentsResponse.json(),
        schoolsResponse.json(),
      ]);
      const [
        staffResponse,
        metricsResponse,
        notificationsResponse,
        emergencyAlertsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/admin/support-staff`, { headers }),
        fetch(`${API_URL}/admin/support-metrics`, { headers }),
        fetch(`${API_URL}/admin/support-notifications`, { headers }),
        fetch(`${API_URL}/admin/emergency-alerts?limit=100`, { headers }),
      ]);
      const [
        staffResult,
        metricsResult,
        notificationsResult,
        emergencyAlertsResult,
      ] = await Promise.all([
        staffResponse.json(),
        metricsResponse.json(),
        notificationsResponse.json(),
        emergencyAlertsResponse.json(),
      ]);
      const responses = [
        ticketsResponse,
        incidentsResponse,
        schoolsResponse,
        staffResponse,
        metricsResponse,
        notificationsResponse,
      ];
      const labels = ["support tickets", "incident reports", "pending schools"];
      for (let index = 0; index < results.length; index += 1) {
        if (!responses[index].ok || !Array.isArray(results[index])) {
          throw new Error(
            results[index]?.error || `Unable to load ${labels[index]}.`,
          );
        }
      }
      if (
        !staffResponse.ok ||
        !Array.isArray(staffResult?.staff) ||
        !metricsResponse.ok ||
        !metricsResult ||
        !notificationsResponse.ok ||
        !Array.isArray(notificationsResult)
      ) {
        throw new Error(
          "Unable to load support staff, metrics, or notifications.",
        );
      }
      if (emergencyAlertsResponse.ok && Array.isArray(emergencyAlertsResult)) {
        setEmergencyAlerts(emergencyAlertsResult);
        setEmergencyAlertsError("");
      } else {
        setEmergencyAlertsError(
          emergencyAlertsResult?.error ||
            "Unable to load emergency SOS alerts.",
        );
      }
      setTickets(results[0]);
      setIncidents(results[1]);
      const selectedIncidentId = selectedIncidentRef.current?.id;
      if (selectedIncidentId) {
        const updatedIncident = results[1].find(
          (incident) => incident.id === selectedIncidentId,
        );
        if (updatedIncident) setSelectedIncident(updatedIncident);
      }
      setSchools(results[2]);
      setStaff(staffResult.staff);
      setCurrentStaffId(staffResult.currentStaffId);
      setMetrics(metricsResult);
      setNotifications(notificationsResult);
    } catch (requestError) {
      console.error("Could not load support requests:", requestError);
      setError(
        requestError?.message ||
          "Unable to load support requests from the database.",
      );
    } finally {
      setLoading(false);
      if (!background) setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  const refreshLiveChats = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLiveChatError(
        "Your support session has expired. Please sign in again.",
      );
      return;
    }
    setLiveChatsLoading(true);
    try {
      const response = await fetch(`${API_URL}/support/live-chats`, {
        headers: { [authHeaderKey]: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load one-to-one chats.");
      }
      setLiveChats(result);
      setSelectedLiveChat((current) =>
        current
          ? result.find((chat) => chat.id === current.id) || null
          : result[0] || null,
      );
      setLiveChatError("");
    } catch (requestError) {
      console.error("Could not load support live chats:", requestError);
      setLiveChatError(
        requestError?.message || "Unable to load one-to-one chats.",
      );
    } finally {
      setLiveChatsLoading(false);
    }
  }, []);

  const refreshLiveChatMessages = useCallback(async (sessionId) => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;
    try {
      const response = await fetch(
        `${API_URL}/support/live-chats/${encodeURIComponent(sessionId)}/messages`,
        { headers: { [authHeaderKey]: `Bearer ${token}` } },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load chat messages.");
      }
      setLiveChatMessages(result);
      setLiveChatError("");
    } catch (requestError) {
      console.error("Could not load support live chat messages:", requestError);
      setLiveChatError(
        requestError?.message || "Unable to load chat messages.",
      );
    }
  }, []);

  const sendLiveChatReply = async () => {
    const message = liveChatDraft.trim();
    const token = localStorage.getItem("token");
    if (!token || !selectedLiveChat || !message || liveChatSending) return;
    setLiveChatSending(true);
    setLiveChatError("");
    try {
      const response = await fetch(
        `${API_URL}/support/live-chats/${encodeURIComponent(selectedLiveChat.id)}/messages`,
        {
          method: "POST",
          headers: {
            [authHeaderKey]: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to send chat message.");
      }
      setLiveChatMessages((current) => [...current, result]);
      setLiveChatDraft("");
      void refreshLiveChats();
    } catch (requestError) {
      console.error("Could not send support live chat reply:", requestError);
      setLiveChatError(requestError?.message || "Unable to send chat message.");
    } finally {
      setLiveChatSending(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 4) return undefined;
    void refreshLiveChats();
    const interval = setInterval(() => void refreshLiveChats(), 10000);
    return () => clearInterval(interval);
  }, [activeTab, refreshLiveChats]);

  useEffect(() => {
    if (!selectedLiveChat) return undefined;
    const sessionId = selectedLiveChat.id;
    const initialLoad = setTimeout(
      () => void refreshLiveChatMessages(sessionId),
      0,
    );
    const interval = setInterval(
      () => void refreshLiveChatMessages(sessionId),
      5000,
    );
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [selectedLiveChat, refreshLiveChatMessages]);

  const refreshTicketConversation = useCallback(async (ticketId) => {
    const token = localStorage.getItem("token");
    if (!token || !ticketId) return;
    const headers = { [authHeaderKey]: `Bearer ${token}` };
    const [replyResponse, auditResponse] = await Promise.all([
      fetch(`${API_URL}/admin/support-tickets/${ticketId}/replies`, {
        headers,
      }),
      fetch(`${API_URL}/admin/support-audit/support_ticket/${ticketId}`, {
        headers,
      }),
    ]);
    const [replyResult, auditResult] = await Promise.all([
      replyResponse.json(),
      auditResponse.json(),
    ]);
    if (!replyResponse.ok || !Array.isArray(replyResult)) {
      throw new Error(
        replyResult?.error || "Unable to refresh ticket conversation.",
      );
    }
    if (!auditResponse.ok || !Array.isArray(auditResult)) {
      throw new Error(
        auditResult?.error || "Unable to refresh ticket history.",
      );
    }
    if (selectedTicketRef.current?.id === ticketId) {
      setReplies(replyResult);
      setAudit(auditResult);
    }
  }, []);

  const refreshOpenTicketConversation = useCallback(() => {
    const ticketId = selectedTicketRef.current?.id;
    return ticketId ? refreshTicketConversation(ticketId) : Promise.resolve();
  }, [refreshTicketConversation]);

  const refreshIncidentConversation = useCallback(async () => {
    const incidentId = selectedIncidentRef.current?.id;
    const token = localStorage.getItem("token");
    if (!token || !incidentId) return;
    const response = await fetch(
      `${API_URL}/admin/incident-reports/${incidentId}/replies`,
      { headers: { [authHeaderKey]: ["Bearer", token].join(" ") } },
    );
    const result = await response.json();
    if (!response.ok || !Array.isArray(result)) {
      throw new Error(result?.error || "Unable to refresh incident responses.");
    }
    setIncidentRepliesById((current) => ({
      ...current,
      [incidentId]: result,
    }));
    if (selectedIncidentRef.current?.id === incidentId) setReplies(result);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          tickets,
          incidents,
          incidentRepliesById,
          schools,
          staff,
          currentStaffId,
          metrics,
          notifications,
          emergencyAlerts,
          cachedAt: new Date().toISOString(),
        }),
      );
    } catch (cacheError) {
      console.warn("Could not cache support requests:", cacheError);
    }
  }, [
    tickets,
    incidents,
    incidentRepliesById,
    schools,
    staff,
    currentStaffId,
    metrics,
    notifications,
    emergencyAlerts,
  ]);

  useEffect(() => {
    void refresh();
    let debounceTimer;
    const channel = supabaseClient
      .channel("support-requests-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_dashboard_events",
        },
        (payload) => {
          const resourceType = payload.new?.resource_type;
          if (!REFRESH_RESOURCES.has(resourceType)) return;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void refresh({ background: true });
            if (
              [
                "support_ticket_replies",
                "support_tickets",
                "activity_logs",
              ].includes(resourceType)
            ) {
              void refreshOpenTicketConversation().catch((requestError) => {
                console.error(
                  "Could not refresh live ticket conversation:",
                  requestError,
                );
                setError(
                  requestError?.message ||
                    "Unable to refresh the ticket conversation.",
                );
              });
            }
            if (
              ["incident_report_replies", "incident_reports"].includes(
                resourceType,
              )
            ) {
              void refreshIncidentConversation().catch((requestError) => {
                console.error(
                  "Could not refresh live incident conversation:",
                  requestError,
                );
                setError(
                  requestError?.message ||
                    "Unable to refresh the incident conversation.",
                );
              });
            }
          }, 400);
        },
      )
      .subscribe((status, subscriptionError) => {
        setRealtimeConnected(status === "SUBSCRIBED");
        if (subscriptionError) {
          console.warn(
            "Support requests realtime subscription issue:",
            subscriptionError,
          );
        }
      });
    const interval = setInterval(() => {
      void refresh({ background: true });
      void refreshOpenTicketConversation().catch((requestError) => {
        console.error("Could not refresh ticket conversation:", requestError);
        setError(
          requestError?.message || "Unable to refresh the ticket conversation.",
        );
      });
      void refreshIncidentConversation().catch((requestError) => {
        console.error("Could not refresh incident conversation:", requestError);
        setError(
          requestError?.message ||
            "Unable to refresh the incident conversation.",
        );
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(interval);
      void supabaseClient.removeChannel(channel);
    };
  }, [refresh, refreshIncidentConversation, refreshOpenTicketConversation]);

  const patchRequest = async (kind, id, changes) => {
    const actionKey = `${kind}:${id}`;
    setPendingAction(actionKey);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const path =
        kind === "ticket"
          ? `/admin/support-tickets/${id}`
          : `/admin/incident-reports/${id}`;
      const response = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: {
          [authHeaderKey]: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to update request status.");
      }
      if (kind === "ticket") {
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === id ? { ...ticket, ...result } : ticket,
          ),
        );
        setSelectedTicket((current) =>
          current?.id === id ? { ...current, ...result } : current,
        );
      } else {
        setIncidents((current) =>
          current.map((incident) =>
            incident.id === id ? { ...incident, ...result } : incident,
          ),
        );
        setSelectedIncident((current) =>
          current?.id === id ? { ...current, ...result } : current,
        );
      }
      return true;
    } catch (actionError) {
      console.error("Could not update support request:", actionError);
      setError(actionError?.message || "Unable to update request status.");
      return false;
    } finally {
      setPendingAction("");
    }
  };

  const updateStatus = async (kind, id, status) => {
    if (["resolved", "closed"].includes(status)) {
      incidentDisclosure.onClose();
      const requestType = kind === "incident" ? "incident" : "ticket";
      const result = await showConfirmationAlert({
        title: `Close ${requestType} #: ${id.slice(0, 8)} ?`,
        text: `This ${requestType} will be automatically removed 48 hours after closing.`,
        confirmButtonText: `Close ${requestType}`,
        denyButtonText: "Keep open",
        zIndex: 2000,
      });
      if (!result.isConfirmed) return;
    }
    const updated = await patchRequest(kind, id, { status });
    if (!updated) return;
    if (
      kind === "ticket" &&
      selectedTicket?.id === id &&
      ticketDisclosure.isOpen
    ) {
      ticketDisclosure.onClose();
    } else if (
      kind === "incident" &&
      selectedIncident?.id === id &&
      incidentDisclosure.isOpen
    ) {
      incidentDisclosure.onClose();
    }
  };

  const assignRequest = (kind, id, assigned_to) =>
    patchRequest(kind, id, { assigned_to: assigned_to || null });

  const updatePriority = (id, priority) =>
    patchRequest("ticket", id, { priority });

  const escalateIncident = async (incident, note = "") => {
    const actionKey = `escalate:${incident.id}`;
    setPendingAction(actionKey);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(
        `${API_URL}/admin/incident-reports/${incident.id}/escalate`,
        {
          method: "POST",
          headers: {
            [authHeaderKey]: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Unable to escalate incident.");
      setIncidents((current) =>
        current.map((item) =>
          item.id === incident.id ? { ...item, ...result } : item,
        ),
      );
      setSelectedIncident((current) =>
        current?.id === incident.id ? { ...current, ...result } : current,
      );
      setIncidentEscalationNote("");
      await loadAudit("incident_report", incident.id);
    } catch (actionError) {
      console.error("Could not escalate incident:", actionError);
      setError(actionError?.message || "Unable to escalate incident.");
    } finally {
      setPendingAction("");
    }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReplies([]);
    setAudit([]);
    setReplyDraft("");
    setDetailLoading(true);
    ticketDisclosure.onOpen();
    try {
      const token = localStorage.getItem("token");
      const headers = { [authHeaderKey]: `Bearer ${token}` };
      const [replyResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/admin/support-tickets/${ticket.id}/replies`, {
          headers,
        }),
        fetch(`${API_URL}/admin/support-audit/support_ticket/${ticket.id}`, {
          headers,
        }),
      ]);
      const [replyResult, auditResult] = await Promise.all([
        replyResponse.json(),
        auditResponse.json(),
      ]);
      if (!replyResponse.ok || !Array.isArray(replyResult)) {
        throw new Error(
          replyResult?.error || "Unable to load conversation history.",
        );
      }
      if (!auditResponse.ok || !Array.isArray(auditResult)) {
        throw new Error(auditResult?.error || "Unable to load ticket history.");
      }
      setReplies(replyResult);
      setAudit(auditResult);
    } catch (detailError) {
      console.error("Could not load ticket conversation:", detailError);
      setError(detailError?.message || "Unable to load ticket details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyDraft.trim()) return;
    setPendingAction(`reply:${selectedTicket.id}`);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/support-tickets/${selectedTicket.id}/replies`,
        {
          method: "POST",
          headers: {
            [authHeaderKey]: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: replyDraft.trim() }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Unable to send reply.");
      setReplies((current) => [...current, result]);
      setReplyDraft("");
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
                ...ticket,
                first_response_at:
                  ticket.first_response_at || result.created_at,
              }
            : ticket,
        ),
      );
      await loadAudit("support_ticket", selectedTicket.id);
    } catch (replyError) {
      console.error("Could not send ticket reply:", replyError);
      setError(replyError?.message || "Unable to send reply.");
    } finally {
      setPendingAction("");
    }
  };

  const loadAudit = async (entityType, entityId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/support-audit/${entityType}/${entityId}`,
        { headers: { [authHeaderKey]: ["Bearer", token].join(" ") } },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load audit history.");
      }
      setAudit(result);
    } catch (auditError) {
      console.error("Could not load support audit history:", auditError);
      setError(auditError?.message || "Unable to load audit history.");
    }
  };

  const openIncident = async (incident) => {
    selectedIncidentRef.current = incident;
    setSelectedIncident(incident);
    setIncidentEscalationNote(incident.escalation_note || "");
    setAudit([]);
    setReplies(incidentRepliesById[incident.id] || []);
    setReplyDraft("");
    setDetailLoading(true);
    incidentDisclosure.onOpen();
    try {
      const token = localStorage.getItem("token");
      const headers = { [authHeaderKey]: `Bearer ${token}` };
      const [replyResponse, auditResponse] = await Promise.all([
        fetch(`${API_URL}/admin/incident-reports/${incident.id}/replies`, {
          headers,
        }),
        fetch(`${API_URL}/admin/support-audit/incident_report/${incident.id}`, {
          headers,
        }),
      ]);
      const [replyResult, auditResult] = await Promise.all([
        replyResponse.json(),
        auditResponse.json(),
      ]);
      if (!replyResponse.ok || !Array.isArray(replyResult)) {
        throw new Error(
          replyResult?.error || "Unable to load incident responses.",
        );
      }
      if (!auditResponse.ok || !Array.isArray(auditResult)) {
        throw new Error(
          auditResult?.error || "Unable to load incident history.",
        );
      }
      setReplies(replyResult);
      setIncidentRepliesById((current) => ({
        ...current,
        [incident.id]: replyResult,
      }));
      setAudit(auditResult);
    } catch (detailError) {
      console.error("Could not load incident details:", detailError);
      setError(detailError?.message || "Unable to load incident details.");
    } finally {
      setDetailLoading(false);
    }
  };

  openTicketRef.current = openTicket;
  openIncidentRef.current = openIncident;

  const sendIncidentReply = async () => {
    if (!selectedIncident || !replyDraft.trim()) return;
    setPendingAction(`incident-reply:${selectedIncident.id}`);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/incident-reports/${selectedIncident.id}/replies`,
        {
          method: "POST",
          headers: {
            [authHeaderKey]: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: replyDraft.trim() }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Unable to send incident response.");
      const nextReplies = [...replies, result];
      setReplies(nextReplies);
      setIncidentRepliesById((current) => ({
        ...current,
        [selectedIncident.id]: nextReplies,
      }));
      setReplyDraft("");
    } catch (replyError) {
      console.error("Could not send incident response:", replyError);
      setError(replyError?.message || "Unable to send incident response.");
    } finally {
      setPendingAction("");
    }
  };

  const openSchool = (school) => {
    setSelectedSchool(school);
    setSchoolReviewNote(school.review_note || "");
    setAudit([]);
    schoolDisclosure.onOpen();
    void loadAudit("school", school.id);
  };

  const openNotification = (notification) => {
    if (notification.entity_type === "support_ticket") {
      setActiveTab(0);
      const ticket = tickets.find((item) => item.id === notification.entity_id);
      if (ticket) void openTicket(ticket);
    } else if (notification.entity_type === "incident_report") {
      setActiveTab(1);
      const incident = incidents.find(
        (item) => item.id === notification.entity_id,
      );
      if (incident) void openIncident(incident);
    } else if (notification.entity_type === "emergency_alert") {
      setActiveTab(3);
      const alertRecord = emergencyAlerts.find(
        (alert) => alert.id === notification.entity_id,
      );
      setSelectedEmergencyAlert(
        alertRecord || {
          id: notification.entity_id,
          title: notification.title,
          message: notification.message,
          created_at: notification.created_at,
        },
      );
      const cachedMessages = readEmergencyConversationCache(
        notification.entity_id,
      );
      setEmergencyConversationMessages(cachedMessages || []);
      setEmergencyConversationLoading(!cachedMessages);
      setEmergencyConversationError("");
      emergencyAlertDisclosure.onOpen();
      if (!alertRecord && notification.entity_id) {
        void (async () => {
          try {
            const token = localStorage.getItem("token");
            if (!token) {
              throw new Error(
                "Your support session has expired. Please sign in again.",
              );
            }
            const response = await fetch(
              `${API_URL}/admin/emergency-alerts?id=${encodeURIComponent(
                notification.entity_id,
              )}`,
              {
                headers: {
                  [authHeaderKey]: ["Bearer", token].join(" "),
                },
              },
            );
            const result = await response.json();
            if (!response.ok || !Array.isArray(result)) {
              throw new Error(
                result?.error || "Unable to load emergency alert details.",
              );
            }
            const details = result.find(
              (alert) => alert.id === notification.entity_id,
            );
            if (!details) {
              throw new Error("Emergency alert details were not found.");
            }
            setSelectedEmergencyAlert(details);
          } catch (requestError) {
            console.error(
              "Could not load emergency alert details:",
              requestError,
            );
            setError(
              requestError?.message ||
                "Unable to load emergency alert details.",
            );
          }
        })();
      }
    }
    if (!notification.read_at) void markNotificationRead(notification);
  };

  useEffect(() => {
    const alertId = selectedEmergencyAlert?.id;
    if (!emergencyAlertDisclosure.isOpen || !alertId) return undefined;
    let active = true;
    let requestVersion = 0;
    const loadConversation = async (showLoading = true) => {
      const currentVersion = ++requestVersion;
      if (showLoading && !readEmergencyConversationCache(alertId)) {
        setEmergencyConversationLoading(true);
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error(
            "Your support session has expired. Please sign in again.",
          );
        }
        const response = await fetch(
          `${API_URL}/admin/emergency-alerts/${alertId}/messages`,
          { headers: { [authHeaderKey]: ["Bearer", token].join(" ") } },
        );
        const result = await response.json();
        if (!response.ok || !Array.isArray(result?.messages)) {
          throw new Error(
            result?.error || "Unable to load the SOS conversation.",
          );
        }
        if (active && currentVersion === requestVersion) {
          const messages = normalizeEmergencyConversationMessages(
            result.messages,
          );
          setSelectedEmergencyAlert((current) =>
            current?.id === alertId ? { ...current, ...result.alert } : current,
          );
          setEmergencyAlerts((current) =>
            current.map((alert) =>
              alert.id === alertId ? { ...alert, ...result.alert } : alert,
            ),
          );
          setEmergencyConversationMessages(messages);
          writeEmergencyConversationCache(alertId, messages);
        }
      } catch (conversationError) {
        if (active && currentVersion === requestVersion) {
          setEmergencyConversationError(
            conversationError?.message ||
              "Unable to load the SOS conversation.",
          );
        }
      } finally {
        if (active && currentVersion === requestVersion && showLoading) {
          setEmergencyConversationLoading(false);
        }
      }
    };

    void loadConversation();
    if (isSuperAdmin) {
      const token = localStorage.getItem("token");
      if (token) {
        void fetch(`${API_URL}/admin/emergency-alerts/assignees`, {
          headers: { [authHeaderKey]: ["Bearer", token].join(" ") },
        })
          .then(async (response) => {
            const result = await response.json();
            if (!response.ok || !Array.isArray(result)) {
              throw new Error(
                result?.error || "Unable to load active SOS assignees.",
              );
            }
            if (active) setEmergencyAssignees(result);
          })
          .catch((assigneeError) => {
            if (!active) return;
            console.error("Could not load SOS assignees:", assigneeError);
            setEmergencyConversationError(
              assigneeError?.message || "Unable to load active SOS assignees.",
            );
          });
      }
    }
    const channel = supabaseClient
      .channel(`support-sos-conversation-${alertId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alert_messages",
          filter: `alert_id=eq.${alertId}`,
        },
        () => void loadConversation(false),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
          filter: `id=eq.${alertId}`,
        },
        () => void loadConversation(false),
      )
      .subscribe((status, subscriptionError) => {
        if (subscriptionError) {
          console.warn("SOS conversation realtime issue:", subscriptionError);
        }
        if (status === "SUBSCRIBED") void loadConversation(false);
      });
    const interval = setInterval(() => void loadConversation(false), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
      void supabaseClient.removeChannel(channel);
    };
  }, [
    isSuperAdmin,
    selectedEmergencyAlert?.id,
    emergencyAlertDisclosure.isOpen,
  ]);

  useEffect(() => {
    if (activeTab !== 3) return undefined;
    let refreshTimer;
    const scheduleSOSRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refresh({ background: true });
      }, 200);
    };
    const channel = supabaseClient
      .channel("support-sos-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_alerts",
        },
        scheduleSOSRefresh,
      )
      .subscribe((status, subscriptionError) => {
        if (subscriptionError) {
          console.warn(
            "Support SOS realtime subscription issue:",
            subscriptionError,
          );
        }
        if (status === "SUBSCRIBED") scheduleSOSRefresh();
      });
    return () => {
      clearTimeout(refreshTimer);
      void supabaseClient.removeChannel(channel);
    };
  }, [
    activeTab,
    emergencyAlertDisclosure.isOpen,
    refresh,
    selectedEmergencyAlert?.id,
  ]);

  const sendEmergencyReply = async () => {
    const alertId = selectedEmergencyAlert?.id;
    const body = emergencyReplyDraft.trim();
    if (
      !alertId ||
      !body ||
      emergencyReplySending ||
      !currentUserId ||
      selectedEmergencyAlert?.attending_by !== currentUserId ||
      selectedEmergencyAlert?.status === "resolved"
    ) {
      return;
    }
    setEmergencyReplySending(true);
    setEmergencyConversationError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(
        `${API_URL}/admin/emergency-alerts/${alertId}/messages`,
        {
          method: "POST",
          headers: {
            [authHeaderKey]: ["Bearer", token].join(" "),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );
      const result = await response.json();
      const [sentMessage] = normalizeEmergencyConversationMessages([result]);
      if (!response.ok || !sentMessage) {
        throw new Error(result?.error || "Unable to send the SOS response.");
      }
      const updatedMessages = normalizeEmergencyConversationMessages([
        ...emergencyConversationMessages,
        sentMessage,
      ]);
      setEmergencyConversationMessages(updatedMessages);
      writeEmergencyConversationCache(alertId, updatedMessages);
      setEmergencyReplyDraft("");
      setSelectedEmergencyAlert((current) =>
        current?.id === alertId
          ? {
              ...current,
              status: "in_progress",
              attending_at: current.attending_at || sentMessage.created_at,
              attending_by: current.attending_by || sentMessage.author_user_id,
            }
          : current,
      );
      setEmergencyAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: "in_progress",
                attending_at: alert.attending_at || sentMessage.created_at,
                attending_by: alert.attending_by || sentMessage.author_user_id,
              }
            : alert,
        ),
      );
    } catch (sendError) {
      setEmergencyConversationError(
        sendError?.message || "Unable to send the SOS response.",
      );
    } finally {
      setEmergencyReplySending(false);
    }
  };

  const updateEmergencyStatus = async (status, attendingBy) => {
    const alertId = selectedEmergencyAlert?.id;
    if (!alertId || emergencyStatusUpdating) return;
    setEmergencyStatusUpdating(true);
    setEmergencyConversationError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(
        `${API_URL}/admin/emergency-alerts/${alertId}/status`,
        {
          method: "PATCH",
          headers: {
            [authHeaderKey]: ["Bearer", token].join(" "),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(status ? { status } : {}),
            ...(attendingBy !== undefined ? { attending_by: attendingBy } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result?.id) {
        throw new Error(result?.error || "Unable to update the SOS status.");
      }
      setSelectedEmergencyAlert((current) =>
        current?.id === alertId ? { ...current, ...result } : current,
      );
      setEmergencyAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId ? { ...alert, ...result } : alert,
        ),
      );
    } catch (statusError) {
      setEmergencyConversationError(
        statusError?.message || "Unable to update the SOS status.",
      );
    } finally {
      setEmergencyStatusUpdating(false);
    }
  };

  useEffect(() => {
    const entityType = searchParams.get("openType");
    const entityId = searchParams.get("openId");
    if (!entityType || !entityId) return;

    const notificationKey = `${entityType}:${entityId}`;
    if (handledNotificationRef.current === notificationKey) return;

    if (entityType === "support_ticket") {
      const ticket = tickets.find((item) => item.id === entityId);
      if (!ticket) return;
      handledNotificationRef.current = notificationKey;
      setActiveTab(0);
      void openTicketRef.current(ticket);
    } else if (entityType === "incident_report") {
      const incident = incidents.find((item) => item.id === entityId);
      if (!incident) return;
      handledNotificationRef.current = notificationKey;
      setActiveTab(1);
      void openIncidentRef.current(incident);
    } else if (entityType === "emergency_alert") {
      const alert = emergencyAlerts.find((item) => item.id === entityId);
      if (!alert) return;
      handledNotificationRef.current = notificationKey;
      setActiveTab(3);
      setSelectedEmergencyAlert(alert);
      setEmergencyConversationMessages(
        readEmergencyConversationCache(entityId) || [],
      );
      setEmergencyConversationLoading(!readEmergencyConversationCache(entityId));
      setEmergencyConversationError("");
      emergencyAlertDisclosure.onOpen();
      void (async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error(
              "Your support session has expired. Please sign in again.",
            );
          }
          const response = await fetch(
            `${API_URL}/admin/emergency-alerts/${entityId}/messages`,
            {
              headers: { [authHeaderKey]: ["Bearer", token].join(" ") },
            },
          );
          const result = await response.json();
          if (!response.ok || !Array.isArray(result?.messages)) {
            throw new Error(
              result?.error || "Unable to load the SOS conversation.",
            );
          }
          const messages = normalizeEmergencyConversationMessages(result.messages);
          setEmergencyConversationMessages(messages);
          writeEmergencyConversationCache(entityId, messages);
          setSelectedEmergencyAlert((current) =>
            current?.id === entityId ? { ...current, ...result.alert } : current,
          );
          setEmergencyAlerts((current) =>
            current.map((item) =>
              item.id === entityId ? { ...item, ...result.alert } : item,
            ),
          );
        } catch (requestError) {
          console.error("Could not open SOS alert from notification:", requestError);
          setEmergencyConversationError(
            requestError?.message || "Unable to load the SOS conversation.",
          );
        } finally {
          setEmergencyConversationLoading(false);
        }
      })();
    } else {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("openType");
        next.delete("openId");
        return next;
      },
      { replace: true },
    );
  }, [
    searchParams,
    setSearchParams,
    tickets,
    incidents,
    emergencyAlerts,
    emergencyAlertDisclosure,
  ]);

  const reviewSchool = async (schoolId, decision) => {
    const actionKey = `school:${schoolId}`;
    setPendingAction(actionKey);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error(
          "Your support session has expired. Please sign in again.",
        );
      }
      const response = await fetch(
        `${API_URL}/admin/schools/${schoolId}/review`,
        {
          method: "PATCH",
          headers: {
            [authHeaderKey]: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision, note: schoolReviewNote.trim() }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to review school registration.",
        );
      }
      if (decision === "needs_info") {
        setSchools((current) =>
          current.map((school) =>
            school.id === schoolId ? { ...school, ...result } : school,
          ),
        );
        setSelectedSchool((current) =>
          current?.id === schoolId ? { ...current, ...result } : current,
        );
      } else {
        setSchools((current) =>
          current.filter((school) => school.id !== schoolId),
        );
      }
      schoolDisclosure.onClose();
    } catch (actionError) {
      console.error("Could not review school registration:", actionError);
      setError(actionError?.message || "Unable to review school registration.");
    } finally {
      setPendingAction("");
    }
  };

  const searchMatches = (...values) =>
    values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());

  const visibleTickets = tickets.filter(
    (ticket) =>
      (ticketFilter === "all" || ticket.status === ticketFilter) &&
      (ticketOwnerFilter === "all" ||
        (ticketOwnerFilter === "unassigned" && !ticket.assigned_to) ||
        (ticketOwnerFilter === "mine" &&
          currentStaffId &&
          ticket.assigned_to === currentStaffId)) &&
      searchMatches(
        ticket.subject,
        ticket.message,
        ticket.category,
        ticket.priority,
        ticket.users?.name,
        ticket.users?.email,
      ),
  );
  const sortedVisibleTickets = [...visibleTickets].sort(
    (first, second) =>
      new Date(second.created_at || 0).getTime() -
      new Date(first.created_at || 0).getTime(),
  );
  const ticketPageSize = 5;
  const ticketPageCount = Math.max(
    1,
    Math.ceil(sortedVisibleTickets.length / ticketPageSize),
  );
  const paginatedTickets = sortedVisibleTickets.slice(
    (ticketPage - 1) * ticketPageSize,
    ticketPage * ticketPageSize,
  );

  useEffect(() => {
    setTicketPage(1);
  }, [search, ticketFilter, ticketOwnerFilter]);

  useEffect(() => {
    setTicketPage((page) => Math.min(page, ticketPageCount));
  }, [ticketPageCount]);
  const visibleIncidents = incidents.filter(
    (incident) =>
      (incidentFilter === "all" || incident.status === incidentFilter) &&
      (incidentOwnerFilter === "all" ||
        (incidentOwnerFilter === "unassigned" && !incident.assigned_to) ||
        (incidentOwnerFilter === "mine" &&
          currentStaffId &&
          incident.assigned_to === currentStaffId)) &&
      searchMatches(
        incident.incident_type,
        incident.description,
        incident.severity,
        incident.location,
        incident.users?.name,
        incident.users?.email,
        incident.schools?.name,
      ),
  );
  const sortedVisibleIncidents = [...visibleIncidents].sort(
    (first, second) =>
      new Date(second.created_at || 0).getTime() -
      new Date(first.created_at || 0).getTime(),
  );
  const incidentPageSize = 5;
  const incidentPageCount = Math.max(
    1,
    Math.ceil(sortedVisibleIncidents.length / incidentPageSize),
  );
  const paginatedIncidents = sortedVisibleIncidents.slice(
    (incidentPage - 1) * incidentPageSize,
    incidentPage * incidentPageSize,
  );

  useEffect(() => {
    setIncidentPage(1);
  }, [search, incidentFilter, incidentOwnerFilter]);

  useEffect(() => {
    setIncidentPage((page) => Math.min(page, incidentPageCount));
  }, [incidentPageCount]);
  const visibleSchools = schools.filter((school) =>
    searchMatches(
      school.name,
      school.emis_number,
      school.school_email,
      school.phone,
      school.principal_name,
      school.address,
      ...(school.school_admins || []).flatMap((admin) => [
        admin.first_name,
        admin.last_name,
        admin.your_email,
        admin.users?.name,
        admin.users?.email,
      ]),
    ),
  );

  const renderStatusSelect = (item, kind) => {
    const statuses =
      kind === "ticket"
        ? ["open", "in_progress", "resolved", "closed"]
        : ["open", "in_progress", "resolved"];
    const actionKey = `${kind}:${item.id}`;
    return (
      <HStack spacing={2}>
        <Select
          size="sm"
          maxW="165px"
          aria-label={`Update status for ${kind}`}
          value={item.status}
          onChange={(event) =>
            void updateStatus(kind, item.id, event.target.value)
          }
          isDisabled={!canManageRequests || Boolean(pendingAction)}
          bg="white"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {kind === "incident"
                ? incidentStatusLabel(status)
                : prettyLabel(status)}
            </option>
          ))}
        </Select>
        {pendingAction === actionKey ? <Spinner size="sm" /> : null}
      </HStack>
    );
  };

  const renderAssignmentSelect = (item, kind) => (
    <Select
      size="sm"
      maxW="220px"
      bg="white"
      value={item.assigned_to || ""}
      aria-label={`Assign ${kind} to support staff`}
      isDisabled={!isSuperAdmin || Boolean(pendingAction)}
      onChange={(event) =>
        void assignRequest(kind, item.id, event.target.value)
      }
    >
      <option value="">Unassigned</option>
      {staff.map((member) => (
        <option key={member.id} value={member.id}>
          {member.full_name} · {prettyLabel(member.support_role)}
        </option>
      ))}
    </Select>
  );

  const renderDeadline = (label, value, responded = false) => {
    if (responded) return <Badge colorScheme="green">Responded</Badge>;
    const deadline = deadlineLabel(value);
    if (!deadline) return null;
    return (
      <Badge
        colorScheme={deadline.color}
        title={`${label}: ${deadline.date}`}
        display="inline-flex"
        alignItems="center"
        gap={1}
      >
        <Icon as={deadline.color === "red" ? FiAlertTriangle : FiClock} />
        {label}: {deadline.label}
      </Badge>
    );
  };

  const markNotificationRead = async (notification) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/admin/support-notifications/${notification.id}/read`,
        {
          method: "PATCH",
          headers: { [authHeaderKey]: ["Bearer", token].join(" ") },
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Unable to mark alert as read.");
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: result.read_at }
            : item,
        ),
      );
    } catch (notificationError) {
      console.error("Could not mark support alert as read:", notificationError);
      setError(notificationError?.message || "Unable to update support alert.");
    }
  };

  const supportAlertNotifications = notifications.filter((notification) =>
    ["support_ticket", "incident_report", "emergency_alert"].includes(
      notification.entity_type,
    ),
  );
  const unreadSupportAlertCount = supportAlertNotifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const emergencyAlertPageSize = 6;
  const emergencyAlertPageCount = Math.max(
    1,
    Math.ceil(emergencyAlerts.length / emergencyAlertPageSize),
  );
  const paginatedEmergencyAlerts = emergencyAlerts.slice(
    (emergencyAlertPage - 1) * emergencyAlertPageSize,
    emergencyAlertPage * emergencyAlertPageSize,
  );

  useEffect(() => {
    setEmergencyAlertPage((page) =>
      Math.min(page, emergencyAlertPageCount),
    );
  }, [emergencyAlertPageCount]);

  const markAllSupportAlertsRead = async () => {
    if (!unreadSupportAlertCount || markingAllSupportAlertsRead) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Your support session has expired. Please sign in again.");
      return;
    }

    setMarkingAllSupportAlertsRead(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/support-notifications/read-all`,
        {
          method: "PATCH",
          headers: { [authHeaderKey]: ["Bearer", token].join(" ") },
        },
      );
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.notifications)) {
        throw new Error(
          result?.error || "Unable to mark all support alerts as read.",
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
    } catch (notificationError) {
      console.error(
        "Could not mark all support alerts as read:",
        notificationError,
      );
      setError(
        notificationError?.message ||
          "Unable to mark all support alerts as read.",
      );
    } finally {
      setMarkingAllSupportAlertsRead(false);
    }
  };

  const renderAudit = () => (
    <Box
      mt={6}
      p={{ base: 4, md: 5 }}
      bg="gray.50"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading size="sm">Activity history</Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            A record of updates and actions on this request
          </Text>
        </Box>
        <Badge colorScheme="blue" borderRadius="full" px={2.5} py={1}>
          {audit.length} {audit.length === 1 ? "event" : "events"}
        </Badge>
      </Flex>
      {audit.length ? (
        <VStack align="stretch" spacing={0}>
          {audit.map((entry, index) => (
            <Flex key={entry.id} gap={3} align="stretch">
              <VStack spacing={0} w="18px" flexShrink={0}>
                <Box
                  mt={1}
                  w="10px"
                  h="10px"
                  borderRadius="full"
                  bg={index === 0 ? "blue.500" : "gray.300"}
                  boxShadow={
                    index === 0
                      ? "0 0 0 3px var(--chakra-colors-blue-100)"
                      : "none"
                  }
                />
                {index < audit.length - 1 ? (
                  <Box w="1px" flex="1" minH="16px" bg="gray.200" />
                ) : null}
              </VStack>
              <Box
                flex="1"
                mb={index < audit.length - 1 ? 3 : 0}
                p={3}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                boxShadow="xs"
              >
                <Flex justify="space-between" gap={3} wrap="wrap">
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    {entry.action}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDateTime(entry.created_at)}
                  </Text>
                </Flex>
                <Text fontSize="xs" color="blue.700" mt={1}>
                  {entry.users?.name || entry.users?.email || "Support staff"}
                </Text>
                {entry.metadata?.note ? (
                  <Text
                    fontSize="sm"
                    mt={2}
                    color="gray.700"
                    whiteSpace="pre-wrap"
                  >
                    {entry.metadata.note}
                  </Text>
                ) : null}
                {entry.metadata?.change_details?.length ? (
                  <VStack align="stretch" spacing={1.5} mt={3}>
                    {entry.metadata.change_details.map((change) => (
                      <Flex
                        key={`${entry.id}:${change.field}`}
                        align="center"
                        gap={2}
                        wrap="wrap"
                        fontSize="xs"
                        color="gray.600"
                      >
                        <Text fontWeight="600">
                          {change.label || prettyLabel(change.field)}
                        </Text>
                        <Badge variant="subtle" colorScheme="gray">
                          {change.from_label || prettyLabel(change.from)}
                        </Badge>
                        <Text color="gray.400">→</Text>
                        <Badge variant="subtle" colorScheme="blue">
                          {change.to_label || prettyLabel(change.to)}
                        </Badge>
                        {change.automatic ? (
                          <Text color="gray.500">
                            (automatically assigned to you)
                          </Text>
                        ) : null}
                      </Flex>
                    ))}
                  </VStack>
                ) : null}
                {entry.action === "Created support ticket" ? (
                  <HStack mt={2} spacing={2} wrap="wrap">
                    {[
                      entry.metadata?.category && [
                        "Category",
                        entry.metadata.category,
                      ],
                      entry.metadata?.priority && [
                        "Priority",
                        entry.metadata.priority,
                      ],
                      entry.metadata?.status && [
                        "Status",
                        entry.metadata.status,
                      ],
                    ]
                      .filter(Boolean)
                      .map(([label, value]) => (
                        <Badge key={label} variant="subtle" colorScheme="gray">
                          {label}: {prettyLabel(value)}
                        </Badge>
                      ))}
                  </HStack>
                ) : null}
                {entry.metadata?.changes &&
                !entry.metadata?.change_details?.length ? (
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Updated{" "}
                    {Object.keys(entry.metadata.changes)
                      .map(prettyLabel)
                      .join(", ")}
                  </Text>
                ) : null}
              </Box>
            </Flex>
          ))}
        </VStack>
      ) : (
        <Box
          p={4}
          bg="white"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Text fontSize="sm" color="gray.500">
            No recorded activity yet.
          </Text>
        </Box>
      )}
    </Box>
  );

  const renderTicketCards = () => (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
      boxShadow="sm"
    >
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={2}
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Box>
          <Heading size="sm" color="gray.800">
            Support ticket queue
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Latest requests first · open a ticket to review conversation and
            history
          </Text>
        </Box>
        <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
          {sortedVisibleTickets.length}{" "}
          {sortedVisibleTickets.length === 1 ? "ticket" : "tickets"}
        </Badge>
      </Flex>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Request</Th>
              <Th>Priority</Th>
              <Th>Response SLA</Th>
              <Th>Status</Th>
              <Th>Assigned to</Th>
              <Th textAlign="right">Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedTickets.map((ticket) => (
              <Tr key={ticket.id} _hover={{ bg: "blue.50" }}>
                <Td minW="260px" maxW="390px">
                  <Text
                    as="button"
                    textAlign="left"
                    fontWeight="700"
                    color="gray.800"
                    noOfLines={1}
                    onClick={() => void openTicket(ticket)}
                    _hover={{ color: "blue.600", textDecoration: "underline" }}
                  >
                    {ticket.subject || "Untitled request"}
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
                    {ticket.users?.name || "Unknown requester"}
                    {ticket.users?.email ? ` · ${ticket.users.email}` : ""}
                  </Text>
                  <HStack mt={1.5} spacing={2} wrap="wrap">
                    <Badge variant="subtle" colorScheme="blue">
                      {prettyLabel(ticket.category)}
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      {formatDateTime(ticket.created_at)}
                    </Text>
                  </HStack>
                </Td>
                <Td minW="125px">
                  <Select
                    size="sm"
                    maxW="130px"
                    bg="white"
                    value={ticket.priority}
                    aria-label={`Set priority for ${ticket.subject}`}
                    onChange={(event) =>
                      void updatePriority(ticket.id, event.target.value)
                    }
                    isDisabled={!canChangePriorities || Boolean(pendingAction)}
                  >
                    {["low", "medium", "high", "urgent"].map((priority) => (
                      <option key={priority} value={priority}>
                        {prettyLabel(priority)}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td minW="150px">
                  <VStack align="flex-start" spacing={1}>
                    {renderDeadline(
                      "Response",
                      ticket.response_due_at,
                      Boolean(ticket.first_response_at),
                    ) || (
                      <Text fontSize="xs" color="gray.400">
                        No deadline
                      </Text>
                    )}
                    {renderDeadline(
                      "Resolution",
                      ticket.resolution_due_at,
                      ["resolved", "closed"].includes(ticket.status),
                    )}
                  </VStack>
                </Td>
                <Td minW="170px">{renderStatusSelect(ticket, "ticket")}</Td>
                <Td minW={isSuperAdmin ? "230px" : "160px"}>
                  {isSuperAdmin ? (
                    renderAssignmentSelect(ticket, "ticket")
                  ) : (
                    <Text fontSize="sm" color="gray.600">
                      {ticket.assigned_staff?.full_name || "Unassigned"}
                    </Text>
                  )}
                </Td>
                <Td textAlign="right" minW="125px">
                  <Button
                    size="xs"
                    leftIcon={<Icon as={FiMessageCircle} />}
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => void openTicket(ticket)}
                  >
                    Details
                  </Button>
                </Td>
              </Tr>
            ))}
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
          Showing {(ticketPage - 1) * ticketPageSize + 1}–
          {Math.min(ticketPage * ticketPageSize, sortedVisibleTickets.length)}{" "}
          of {sortedVisibleTickets.length} tickets
        </Text>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FiChevronLeft} />}
            onClick={() => setTicketPage((page) => Math.max(1, page - 1))}
            isDisabled={ticketPage <= 1}
          >
            Previous
          </Button>
          <Text fontSize="sm" color="gray.600">
            Page {ticketPage} of {ticketPageCount}
          </Text>
          <Button
            size="sm"
            variant="outline"
            rightIcon={<Icon as={FiChevronRight} />}
            onClick={() =>
              setTicketPage((page) => Math.min(ticketPageCount, page + 1))
            }
            isDisabled={ticketPage >= ticketPageCount}
          >
            Next
          </Button>
        </HStack>
      </Flex>
    </Box>
  );

  const renderIncidentTable = () => (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
      boxShadow="sm"
      SOS
      conversation
    >
      <Flex
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={2}
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Box>
          <Heading size="sm" color="gray.800">
            Safety incident queue
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Latest reports first · open a report for full details and history
          </Text>
        </Box>
        <Badge colorScheme="purple" borderRadius="full" px={3} py={1}>
          {sortedVisibleIncidents.length}{" "}
          {sortedVisibleIncidents.length === 1 ? "incident" : "incidents"}
        </Badge>
      </Flex>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Incident</Th>
              <Th>Severity</Th>
              <Th>Response SLA</Th>
              <Th>Status</Th>
              <Th>Assigned to</Th>
              <Th textAlign="right">Details</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedIncidents.map((incident) => (
              <Tr key={incident.id} _hover={{ bg: "blue.50" }}>
                <Td minW="260px" maxW="400px">
                  <Text
                    as="button"
                    textAlign="left"
                    fontWeight="700"
                    color="gray.800"
                    noOfLines={1}
                    onClick={() => void openIncident(incident)}
                    _hover={{ color: "blue.600", textDecoration: "underline" }}
                  >
                    {prettyLabel(incident.incident_type)}
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
                    {incident.users?.name ||
                      prettyLabel(incident.reporter_role)}
                    {incident.users?.email ? ` · ${incident.users.email}` : ""}
                  </Text>
                  <Text fontSize="xs" color="gray.600" noOfLines={2} mt={1}>
                    {incident.description || "No description provided"}
                  </Text>
                  <HStack mt={1.5} spacing={2} wrap="wrap">
                    {incident.schools?.name ? (
                      <Badge variant="subtle" colorScheme="purple">
                        {incident.schools.name}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="subtle"
                      colorScheme={
                        incident.recipient_type === "support"
                          ? "orange"
                          : "gray"
                      }
                    >
                      {incident.recipient_type === "support"
                        ? "Support + school"
                        : "School"}
                    </Badge>
                    {incident.routes?.route_name ? (
                      <Badge variant="subtle" colorScheme="blue">
                        {incident.routes.route_name}
                      </Badge>
                    ) : null}
                    <Text fontSize="xs" color="gray.500">
                      {formatDateTime(incident.created_at)}
                    </Text>
                  </HStack>
                </Td>
                <Td minW="135px">
                  <VStack align="flex-start" spacing={1.5}>
                    {isSuperAdmin ? (
                      <Select
                        size="sm"
                        maxW="130px"
                        bg="white"
                        value={incident.severity}
                        aria-label={`Set severity for ${prettyLabel(incident.incident_type)}`}
                        onChange={(event) =>
                          void patchRequest("incident", incident.id, {
                            severity: event.target.value,
                          })
                        }
                        isDisabled={Boolean(pendingAction)}
                      >
                        {["low", "medium", "high", "critical"].map(
                          (severity) => (
                            <option key={severity} value={severity}>
                              {prettyLabel(severity)}
                            </option>
                          ),
                        )}
                      </Select>
                    ) : (
                      <Badge colorScheme={statusColor(incident.severity)}>
                        {prettyLabel(incident.severity)}
                      </Badge>
                    )}
                    {incident.is_escalated ? (
                      <Badge colorScheme="red">Escalated</Badge>
                    ) : null}
                    {canEscalateIncidents ? (
                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="outline"
                        isDisabled={incident.is_escalated}
                        isLoading={pendingAction === `escalate:${incident.id}`}
                        onClick={() => void escalateIncident(incident)}
                      >
                        {incident.is_escalated ? "Escalated" : "Escalate"}
                      </Button>
                    ) : null}
                  </VStack>
                </Td>
                <Td minW="150px">
                  <VStack align="flex-start" spacing={1}>
                    {renderDeadline(
                      "Response",
                      incident.response_due_at,
                      Boolean(incident.first_response_at),
                    ) || (
                      <Text fontSize="xs" color="gray.400">
                        No deadline
                      </Text>
                    )}
                    {renderDeadline(
                      "Resolution",
                      incident.resolution_due_at,
                      incident.status === "resolved",
                    )}
                  </VStack>
                </Td>
                <Td minW="165px">{renderStatusSelect(incident, "incident")}</Td>
                <Td minW={isSuperAdmin ? "230px" : "160px"}>
                  {isSuperAdmin ? (
                    renderAssignmentSelect(incident, "incident")
                  ) : (
                    <Text fontSize="sm" color="gray.600">
                      {incident.assigned_staff?.full_name || "Unassigned"}
                    </Text>
                  )}
                </Td>
                <Td textAlign="right" minW="145px">
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="blue"
                    onClick={() => void openIncident(incident)}
                  >
                    Details & history
                  </Button>
                </Td>
              </Tr>
            ))}
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
          Showing {(incidentPage - 1) * incidentPageSize + 1}–
          {Math.min(
            incidentPage * incidentPageSize,
            sortedVisibleIncidents.length,
          )}{" "}
          of {sortedVisibleIncidents.length} incidents
        </Text>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FiChevronLeft} />}
            onClick={() => setIncidentPage((page) => Math.max(1, page - 1))}
            isDisabled={incidentPage <= 1}
          >
            Previous
          </Button>
          <Text fontSize="sm" color="gray.600">
            Page {incidentPage} of {incidentPageCount}
          </Text>
          <Button
            size="sm"
            variant="outline"
            rightIcon={<Icon as={FiChevronRight} />}
            onClick={() =>
              setIncidentPage((page) => Math.min(incidentPageCount, page + 1))
            }
            isDisabled={incidentPage >= incidentPageCount}
          >
            Next
          </Button>
        </HStack>
      </Flex>
    </Box>
  );

  const renderSchoolCards = () => (
    <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
      {visibleSchools.map((school) => {
        const admin = school.school_admins?.[0];
        const adminName =
          [admin?.first_name, admin?.last_name].filter(Boolean).join(" ") ||
          admin?.users?.name;
        return (
          <Card
            key={school.id}
            borderRadius="xl"
            borderColor="gray.200"
            borderWidth="1px"
          >
            <CardBody>
              <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
                <Box>
                  <Button
                    p={0}
                    h="auto"
                    whiteSpace="normal"
                    textAlign="left"
                    variant="link"
                    color="gray.800"
                    onClick={() => openSchool(school)}
                  >
                    <Heading size="sm">{school.name}</Heading>
                  </Button>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Submitted {formatDateTime(school.created_at)}
                  </Text>
                </Box>
                <Badge
                  colorScheme={
                    school.status === "needs_info" ? "purple" : "orange"
                  }
                >
                  {school.status === "needs_info"
                    ? "More information requested"
                    : "Pending review"}
                </Badge>
              </Flex>
              <VStack
                align="stretch"
                spacing={1}
                color="gray.700"
                fontSize="sm"
              >
                {school.submission_source === "client_child_entry" ? (
                  <Text>
                    Submitted by parent
                    {school.submitted_by?.name
                      ? `: ${school.submitted_by.name}`
                      : ""}
                    {school.submitted_by?.email
                      ? ` · ${school.submitted_by.email}`
                      : ""}
                  </Text>
                ) : null}
                {school.emis_number ? (
                  <Text>EMIS: {school.emis_number}</Text>
                ) : null}
                {school.address ? <Text>{school.address}</Text> : null}
                {[school.district, school.province].filter(Boolean).length ? (
                  <Text>
                    {[school.district, school.province]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
                {school.phone ? <Text>Phone: {school.phone}</Text> : null}
                {adminName || admin?.your_email || admin?.users?.email ? (
                  <Text>
                    Applicant: {adminName || "School administrator"}
                    {admin?.your_email || admin?.users?.email
                      ? ` · ${admin?.your_email || admin?.users?.email}`
                      : ""}
                  </Text>
                ) : null}
              </VStack>
              {school.review_note ? (
                <Text fontSize="sm" color="purple.700" mt={3}>
                  Previous review: {school.review_note}
                </Text>
              ) : null}
              <Button
                mt={4}
                size="sm"
                colorScheme="blue"
                onClick={() => openSchool(school)}
              >
                Review full application
              </Button>
            </CardBody>
          </Card>
        );
      })}
    </SimpleGrid>
  );

  const emptyMessage = (length, description) =>
    length ? null : (
      <Box
        py={12}
        textAlign="center"
        bg="white"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Text fontWeight="700" color="gray.700">
          Nothing to review
        </Text>
        <Text fontSize="sm" color="gray.500" mt={1}>
          {description}
        </Text>
      </Box>
    );

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Support Requests"
        description="Manage tickets, safety incidents, and school registration reviews"
        actions={
          <VStack align={{ base: "flex-start", md: "flex-end" }} spacing={2}>
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
            <Text fontWeight="700">Support request action failed</Text>
            <AlertDescription fontSize="sm">{error}</AlertDescription>
          </Box>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => void refresh()}
          >
            Retry
          </Button>
        </Alert>
      ) : null}

      {metrics ? (
        <Box mb={6}>
          <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3} mb={4}>
            {[
              ["Open tickets", metrics.openTickets, "blue"],
              [
                "Overdue requests",
                (metrics.overdueTickets || 0) + (metrics.overdueIncidents || 0),
                "red",
              ],
              [
                "Overdue responses",
                (metrics.overdueResponses || 0) +
                  (metrics.overdueIncidentResponses || 0),
                "orange",
              ],
              ["Open incidents", metrics.openIncidents, "purple"],
              ["Critical incidents", metrics.criticalIncidents, "red"],
              ["School backlog", metrics.pendingSchools, "teal"],
            ].map(([label, value, color]) => (
              <Card
                key={label}
                borderRadius="lg"
                borderTopWidth="3px"
                borderTopColor={`${color}.400`}
              >
                <CardBody py={3}>
                  <Text color="gray.500" fontSize="xs" fontWeight="700">
                    {label}
                  </Text>
                  <Text color="gray.800" fontSize="2xl" fontWeight="800">
                    {value ?? 0}
                  </Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
          <Flex
            gap={5}
            align="center"
            wrap="wrap"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            p={4}
          >
            <HStack>
              <Icon as={FiClock} color="blue.500" />
              <Text fontSize="sm">
                Average resolution:{" "}
                <b>
                  {metrics.averageResolutionHours == null
                    ? "No recent data"
                    : `${metrics.averageResolutionHours} hours`}
                </b>
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Resolved in 30 days: <b>{metrics.resolvedLast30Days || 0}</b>
            </Text>
            <Box flex="1" minW="240px">
              <Text fontSize="xs" color="gray.500" mb={2}>
                Incident reports · last 7 days
              </Text>
              <HStack align="end" spacing={1} h="42px">
                {(metrics.incidentTrends || []).map((point) => {
                  const maxCount = Math.max(
                    1,
                    ...(metrics.incidentTrends || []).map((item) => item.count),
                  );
                  return (
                    <VStack
                      key={point.date}
                      spacing={0}
                      flex="1"
                      justify="end"
                      h="100%"
                    >
                      <Box
                        w="100%"
                        minH="3px"
                        h={`${Math.max(3, (point.count / maxCount) * 30)}px`}
                        borderRadius="sm"
                        bg="blue.400"
                        title={`${point.date}: ${point.count} incidents`}
                      />
                      <Text fontSize="8px" color="gray.400">
                        {point.date.slice(5)}
                      </Text>
                    </VStack>
                  );
                })}
              </HStack>
            </Box>
          </Flex>
        </Box>
      ) : null}

      <Flex justify="flex-end" mb={4} gap={2}>
        <Button
          leftIcon={<Icon as={FiMessageCircle} />}
          variant="outline"
          colorScheme="green"
          borderRadius="xl"
          aria-label={
            activeTab === 4
              ? "Return to support requests"
              : "Open one-to-one support chat"
          }
          onClick={toggleOneToOneChats}
        >
          {activeTab === 4 ? "Support requests" : "One-to-one chat"}
          {activeTab !== 4 && liveChats.length ? (
            <Badge ml={2} colorScheme="green" borderRadius="full" px={2}>
              {liveChats.length}
            </Badge>
          ) : null}
        </Button>
        <Menu isLazy>
          <MenuButton
            as={Button}
            leftIcon={<Icon as={FiBell} />}
            variant="solid"
            colorScheme={unreadSupportAlertCount ? "orange" : "gray"}
            borderRadius="xl"
            boxShadow="sm"
            _hover={{ transform: "translateY(-1px)", boxShadow: "md" }}
            transition="all 0.2s"
          >
            Support alerts
            {unreadSupportAlertCount ? (
              <Badge
                ml={2}
                colorScheme="red"
                borderRadius="full"
                px={2}
                variant="solid"
              >
                {unreadSupportAlertCount}
              </Badge>
            ) : null}
          </MenuButton>
          <MenuList
            maxH="min(70vh, 520px)"
            minW={{ base: "320px", md: "440px" }}
            p={0}
            display="flex"
            flexDirection="column"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="2xl"
            boxShadow="2xl"
            overflow="hidden"
          >
            <Flex
              px={4}
              py={4}
              justify="space-between"
              align="center"
              gap={3}
              bg="gray.50"
              borderBottom="1px solid"
              borderColor="gray.200"
              flexShrink={0}
            >
              <HStack spacing={3} minW={0}>
                <Flex
                  align="center"
                  justify="center"
                  w={10}
                  h={10}
                  flexShrink={0}
                  borderRadius="xl"
                  bg="orange.100"
                  color="orange.600"
                >
                  <Icon as={FiBell} boxSize={5} />
                </Flex>
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    Support alerts
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Tickets, incidents, and driver SOS alerts
                  </Text>
                </Box>
              </HStack>
              <Button
                size="sm"
                leftIcon={<Icon as={FiCheck} />}
                variant="outline"
                colorScheme="blue"
                borderRadius="lg"
                flexShrink={0}
                onClick={() => void markAllSupportAlertsRead()}
                isLoading={markingAllSupportAlertsRead}
                isDisabled={
                  !unreadSupportAlertCount || markingAllSupportAlertsRead
                }
              >
                Mark all
              </Button>
            </Flex>
            <Box p={2} bg="white" overflowY="auto" flex="1" minH={0}>
              {supportAlertNotifications.length ? (
                <VStack align="stretch" spacing={1}>
                  {supportAlertNotifications
                    .slice(0, 10)
                    .map((notification) => {
                      const isIncident =
                        notification.entity_type === "incident_report";
                      const isEmergencyAlert =
                        notification.entity_type === "emergency_alert";
                      return (
                        <Box
                          key={notification.id}
                          p={1}
                          borderRadius="xl"
                          bg={notification.read_at ? "white" : "blue.50"}
                          border="1px solid"
                          borderColor={
                            notification.read_at
                              ? "gray.100"
                              : isEmergencyAlert
                                ? "red.200"
                                : "blue.100"
                          }
                          transition="all 0.15s"
                          _hover={{
                            borderColor: notification.read_at
                              ? "gray.200"
                              : "blue.200",
                            boxShadow: "sm",
                          }}
                        >
                          <MenuItem
                            onClick={() => openNotification(notification)}
                            borderRadius="lg"
                            alignItems="center"
                            whiteSpace="normal"
                            py={2}
                            px={2}
                            bg="transparent"
                            _hover={{ bg: "transparent" }}
                            _focus={{ bg: "transparent" }}
                          >
                            <HStack align="flex-start" spacing={3} w="100%">
                              <Flex
                                align="center"
                                justify="center"
                                w={9}
                                h={9}
                                flexShrink={0}
                                borderRadius="lg"
                                bg={
                                  isEmergencyAlert
                                    ? "red.100"
                                    : isIncident
                                      ? "purple.100"
                                      : "blue.100"
                                }
                                color={
                                  isEmergencyAlert
                                    ? "red.600"
                                    : isIncident
                                      ? "purple.600"
                                      : "blue.600"
                                }
                              >
                                <Icon
                                  as={
                                    isIncident || isEmergencyAlert
                                      ? FiAlertTriangle
                                      : FiMessageCircle
                                  }
                                  boxSize={4}
                                />
                              </Flex>
                              <Box flex="1" minW={0}>
                                <Flex align="center" gap={2} mb={1}>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="700"
                                    color="gray.800"
                                    noOfLines={1}
                                  >
                                    {notification.title}
                                  </Text>
                                  {!notification.read_at ? (
                                    <Box
                                      w={2}
                                      h={2}
                                      flexShrink={0}
                                      borderRadius="full"
                                      bg="blue.500"
                                      aria-label="Unread"
                                    />
                                  ) : null}
                                </Flex>
                                <Text
                                  fontSize="sm"
                                  color="gray.600"
                                  noOfLines={2}
                                >
                                  {notification.message}
                                </Text>
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {formatDateTime(notification.created_at)}
                                </Text>
                              </Box>
                            </HStack>
                          </MenuItem>
                          {!notification.read_at ? (
                            <Button
                              size="xs"
                              leftIcon={<Icon as={FiCheck} />}
                              variant="ghost"
                              colorScheme="blue"
                              borderRadius="md"
                              onClick={() =>
                                void markNotificationRead(notification)
                              }
                              ml={12}
                              mb={1}
                            >
                              Mark read
                            </Button>
                          ) : null}
                        </Box>
                      );
                    })}
                </VStack>
              ) : (
                <Flex
                  direction="column"
                  align="center"
                  textAlign="center"
                  py={8}
                >
                  <Flex
                    align="center"
                    justify="center"
                    w={12}
                    h={12}
                    mb={3}
                    borderRadius="full"
                    bg="green.50"
                    color="green.600"
                  >
                    <Icon as={FiCheck} boxSize={6} />
                  </Flex>
                  <Text fontSize="sm" fontWeight="600" color="gray.700">
                    You’re all caught up
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    No ticket or incident alerts right now.
                  </Text>
                </Flex>
              )}
            </Box>
          </MenuList>
        </Menu>
      </Flex>

      {activeTab !== 4 ? (
        <Input
          placeholder="Search tickets, incidents, or schools..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          bg="white"
          mb={5}
          maxW="560px"
        />
      ) : null}

      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : (
        <Tabs
          colorScheme="blue"
          isLazy
          index={activeTab}
          onChange={handleTabChange}
        >
          {activeTab !== 4 ? (
            <TabList overflowX="auto">
              <Tab>
                Tickets <Badge ml={2}>{tickets.length}</Badge>
              </Tab>
              <Tab>
                Incidents <Badge ml={2}>{incidents.length}</Badge>
              </Tab>
              <Tab>
                Schools awaiting approval{" "}
                <Badge ml={2} colorScheme="orange">
                  {schools.length}
                </Badge>
              </Tab>
              <Tab>
                Emergency SOS{" "}
                <Badge ml={2} colorScheme="red">
                  {emergencyAlerts.length}
                </Badge>
              </Tab>
            </TabList>
          ) : null}
          <TabPanels>
            <TabPanel px={0} pt={5}>
              <Flex justify="space-between" mb={4} gap={3} wrap="wrap">
                <Text color="gray.600" fontSize="sm">
                  Support tickets and user complaints
                </Text>
                <HStack>
                  <Select
                    size="sm"
                    maxW="190px"
                    bg="white"
                    value={ticketFilter}
                    onChange={(event) => setTicketFilter(event.target.value)}
                    aria-label="Filter tickets by status"
                  >
                    <option value="all">All statuses</option>
                    {["open", "in_progress", "resolved", "closed"].map(
                      (status) => (
                        <option key={status} value={status}>
                          {prettyLabel(status)}
                        </option>
                      ),
                    )}
                  </Select>
                  <Select
                    size="sm"
                    maxW="180px"
                    bg="white"
                    value={ticketOwnerFilter}
                    onChange={(event) =>
                      setTicketOwnerFilter(event.target.value)
                    }
                    aria-label="Filter tickets by assignment"
                  >
                    <option value="all">All owners</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="mine" disabled={!currentStaffId}>
                      Assigned to me
                    </option>
                  </Select>
                </HStack>
              </Flex>
              {renderTicketCards()}
              {emptyMessage(
                visibleTickets.length,
                "No support tickets match this search or filter.",
              )}
            </TabPanel>
            <TabPanel px={0} pt={5}>
              <Flex justify="space-between" mb={4} gap={3} wrap="wrap">
                <Text color="gray.600" fontSize="sm">
                  Safety reports submitted by users
                </Text>
                <HStack>
                  <Select
                    size="sm"
                    maxW="190px"
                    bg="white"
                    value={incidentFilter}
                    onChange={(event) => setIncidentFilter(event.target.value)}
                    aria-label="Filter incidents by status"
                  >
                    <option value="all">All statuses</option>
                    {["open", "in_progress", "resolved"].map((status) => (
                      <option key={status} value={status}>
                        {incidentStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    size="sm"
                    maxW="180px"
                    bg="white"
                    value={incidentOwnerFilter}
                    onChange={(event) =>
                      setIncidentOwnerFilter(event.target.value)
                    }
                    aria-label="Filter incidents by assignment"
                  >
                    <option value="all">All owners</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="mine" disabled={!currentStaffId}>
                      Assigned to me
                    </option>
                  </Select>
                </HStack>
              </Flex>
              {renderIncidentTable()}
              {emptyMessage(
                visibleIncidents.length,
                "No incident reports match this search or filter.",
              )}
            </TabPanel>
            <TabPanel px={0} pt={5}>
              <Text color="gray.600" fontSize="sm" mb={4}>
                Review school registrations before enabling school administrator
                access.
              </Text>
              {renderSchoolCards()}
              {emptyMessage(
                visibleSchools.length,
                "There are no schools awaiting approval.",
              )}
            </TabPanel>
            <TabPanel px={0} pt={5}>
              <Flex justify="space-between" align="center" mb={4} gap={3}>
                <Box>
                  <Heading size="sm" color="gray.800">
                    Emergency SOS alerts
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    Sender alerts with reported location and support-response
                    status.
                  </Text>
                </Box>
                <Button
                  size="sm"
                  leftIcon={<Icon as={FiRefreshCw} />}
                  onClick={() => void refresh({ background: false })}
                  isLoading={refreshing}
                >
                  Refresh
                </Button>
              </Flex>
              {emergencyAlertsError ? (
                <Alert status="error" mb={4} borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>{emergencyAlertsError}</AlertDescription>
                </Alert>
              ) : null}
              {emergencyAlerts.length ? (
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  overflow="hidden"
                  boxShadow="sm"
                >
                  <Flex
                    align="center"
                    justify="space-between"
                    gap={3}
                    px={4}
                    py={3}
                    bg="gray.50"
                    borderBottomWidth="1px"
                    borderColor="gray.200"
                  >
                    <Box>
                      <Text fontWeight="700" color="gray.800">
                        Active SOS queue
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        Opening an unassigned alert assigns it to you. Only the
                        assigned support member can reply.
                      </Text>
                    </Box>
                    <Badge colorScheme="red" borderRadius="full" px={3} py={1}>
                      {emergencyAlerts.length}{" "}
                      {emergencyAlerts.length === 1 ? "alert" : "alerts"}
                    </Badge>
                  </Flex>
                  <TableContainer>
                    <Table size="sm" variant="simple">
                      <Thead bg="white">
                        <Tr>
                          <Th>Sender</Th>
                          <Th minW="250px">Emergency</Th>
                          <Th>Status</Th>
                          <Th>Assigned support</Th>
                          <Th>Received</Th>
                          <Th textAlign="right">Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {paginatedEmergencyAlerts.map((alert) => {
                          const appearance = emergencyStatusAppearance(alert);
                          const assigneeName = emergencyAssigneeName(alert);
                          const isAssignedToCurrentUser =
                            Boolean(
                              currentUserId &&
                                alert.attending_by === currentUserId,
                            );
                          const coordinates = getAlertCoordinates(alert);
                          return (
                            <Tr
                              key={alert.id}
                              _hover={{ bg: "gray.50" }}
                              borderLeftWidth="3px"
                              borderLeftColor={`${appearance.scheme}.400`}
                            >
                              <Td minW="175px">
                                <Text fontWeight="700" color="gray.800">
                                  {alert.users?.name || "Unknown sender"}
                                </Text>
                                <Text fontSize="xs" color="gray.500" mt={0.5}>
                                  {emergencySenderLabel(alert.users?.role)}
                                  {alert.users?.phone
                                    ? ` · ${alert.users.phone}`
                                    : ""}
                                </Text>
                              </Td>
                              <Td maxW="360px">
                                <Text
                                  color="gray.700"
                                  noOfLines={2}
                                  title={
                                    alert.message ||
                                    "Emergency assistance requested"
                                  }
                                >
                                  {alert.message ||
                                    "Emergency assistance requested"}
                                </Text>
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                  {alert.route?.route_name ||
                                    "Route unavailable"}
                                  {coordinates
                                    ? ` · ${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}`
                                    : ""}
                                </Text>
                              </Td>
                              <Td minW="155px">
                                <Badge
                                  colorScheme={appearance.scheme}
                                  borderRadius="full"
                                  px={2.5}
                                  py={1}
                                >
                                  {appearance.label}
                                </Badge>
                              </Td>
                              <Td minW="175px">
                                <Text
                                  fontSize="sm"
                                  fontWeight={alert.attending_by ? "600" : "400"}
                                  color={alert.attending_by ? "gray.700" : "gray.400"}
                                >
                                  {assigneeName ||
                                    (alert.attending_by
                                      ? "Assigned support"
                                      : "Unassigned")}
                                </Text>
                                {isAssignedToCurrentUser ? (
                                  <Badge
                                    mt={1}
                                    colorScheme="green"
                                    variant="subtle"
                                  >
                                    Assigned to you
                                  </Badge>
                                ) : null}
                              </Td>
                              <Td minW="160px">
                                <Text fontSize="sm" color="gray.600">
                                  {formatDateTime(alert.created_at)}
                                </Text>
                              </Td>
                              <Td textAlign="right" minW="155px">
                                <Button
                                  size="sm"
                                  colorScheme={
                                    isAssignedToCurrentUser ? "blue" : "gray"
                                  }
                                  variant={
                                    isAssignedToCurrentUser ? "solid" : "outline"
                                  }
                                  leftIcon={<Icon as={FiMessageCircle} />}
                                  onClick={() => {
                                    setSelectedEmergencyAlert(alert);
                                    const cachedMessages =
                                      readEmergencyConversationCache(alert.id);
                                    setEmergencyConversationMessages(
                                      cachedMessages || [],
                                    );
                                    setEmergencyConversationLoading(
                                      !cachedMessages,
                                    );
                                    setEmergencyConversationError("");
                                    emergencyAlertDisclosure.onOpen();
                                  }}
                                >
                                  {isAssignedToCurrentUser
                                    ? alert.status === "resolved"
                                      ? "View"
                                      : "Respond"
                                    : alert.attending_by ||
                                        alert.status === "resolved"
                                      ? "View"
                                      : "Claim"}
                                </Button>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  <Flex
                    align="center"
                    justify="space-between"
                    gap={3}
                    px={4}
                    py={3}
                    borderTopWidth="1px"
                    borderColor="gray.100"
                    wrap="wrap"
                  >
                    <Text fontSize="sm" color="gray.500">
                      Showing{" "}
                      {emergencyAlerts.length
                        ? (emergencyAlertPage - 1) * emergencyAlertPageSize + 1
                        : 0}
                      –
                      {Math.min(
                        emergencyAlertPage * emergencyAlertPageSize,
                        emergencyAlerts.length,
                      )}{" "}
                      of {emergencyAlerts.length} alerts
                    </Text>
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Icon as={FiChevronLeft} />}
                        onClick={() =>
                          setEmergencyAlertPage((page) => Math.max(1, page - 1))
                        }
                        isDisabled={emergencyAlertPage <= 1}
                      >
                        Previous
                      </Button>
                      <Text fontSize="sm" color="gray.600">
                        Page {emergencyAlertPage} of {emergencyAlertPageCount}
                      </Text>
                      <Button
                        size="sm"
                        variant="outline"
                        rightIcon={<Icon as={FiChevronRight} />}
                        onClick={() =>
                          setEmergencyAlertPage((page) =>
                            Math.min(emergencyAlertPageCount, page + 1),
                          )
                        }
                        isDisabled={emergencyAlertPage >= emergencyAlertPageCount}
                      >
                        Next
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ) : !emergencyAlertsError ? (
                <Flex
                  direction="column"
                  align="center"
                  textAlign="center"
                  py={12}
                  color="gray.500"
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                >
                  <Icon as={FiCheck} boxSize={7} mb={2} color="green.500" />
                  <Text fontSize="sm" fontWeight="600">
                    No emergency SOS alerts
                  </Text>
                  <Text fontSize="xs" mt={1}>
                    New driver alerts will appear here.
                  </Text>
                </Flex>
              ) : null}
            </TabPanel>
            <TabPanel px={0} pt={5}>
              <Flex justify="space-between" align="center" mb={4} gap={3}>
                <Text color="gray.600" fontSize="sm">
                  Private support chats requested from the mobile app.
                </Text>
                <Button
                  size="sm"
                  leftIcon={<Icon as={FiRefreshCw} />}
                  onClick={() => void refreshLiveChats()}
                  isLoading={liveChatsLoading}
                >
                  Refresh
                </Button>
              </Flex>
              {liveChatError ? (
                <Alert status="error" mb={4} borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{liveChatError}</AlertDescription>
                </Alert>
              ) : null}
              <Flex
                align="stretch"
                gap={4}
                direction={{ base: "column", lg: "row" }}
              >
                <Box
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  overflow="hidden"
                  w={{ base: "100%", lg: "320px" }}
                  flexShrink={0}
                >
                  <Flex
                    align="center"
                    justify="space-between"
                    px={4}
                    py={3}
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                  >
                    <Text fontWeight="700" color="gray.800">
                      Chat requests
                    </Text>
                    <Badge colorScheme="green" borderRadius="full" px={2}>
                      {liveChats.length}
                    </Badge>
                  </Flex>
                  {liveChats.length ? (
                    <VStack
                      align="stretch"
                      spacing={0}
                      maxH={{ base: "240px", lg: "560px" }}
                      overflowY="auto"
                    >
                      {liveChats.map((chat) => {
                        const requester =
                          chat.users?.name || chat.users?.email || "App user";
                        return (
                          <Button
                            key={chat.id}
                            variant="ghost"
                            borderRadius={0}
                            justifyContent="flex-start"
                            h="auto"
                            whiteSpace="normal"
                            textAlign="left"
                            px={4}
                            py={3}
                            bg={
                              selectedLiveChat?.id === chat.id
                                ? "green.50"
                                : "white"
                            }
                            borderBottomWidth="1px"
                            borderColor="gray.100"
                            onClick={() => {
                              setLiveChatMessages([]);
                              setSelectedLiveChat(chat);
                              setLiveChatError("");
                            }}
                          >
                            <Box minW={0}>
                              <Text
                                fontSize="sm"
                                fontWeight="700"
                                noOfLines={1}
                              >
                                {requester}
                              </Text>
                              <Text
                                color="gray.500"
                                fontSize="xs"
                                mt={1}
                                textTransform="capitalize"
                              >
                                {prettyLabel(chat.status)} ·{" "}
                                {formatDateTime(
                                  chat.last_message_at || chat.created_at,
                                )}
                              </Text>
                            </Box>
                          </Button>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Text color="gray.500" fontSize="sm" px={4} py={6}>
                      No one-to-one chat requests yet.
                    </Text>
                  )}
                </Box>
                <Flex
                  direction="column"
                  flex={1}
                  minH={{ base: "420px", lg: "560px" }}
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="xl"
                  overflow="hidden"
                >
                  {selectedLiveChat ? (
                    <>
                      <Flex
                        align="center"
                        justify="space-between"
                        px={4}
                        py={3}
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                      >
                        <Box>
                          <Text fontWeight="700" color="gray.800">
                            {selectedLiveChat.users?.name ||
                              selectedLiveChat.users?.email ||
                              "App user"}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            One-to-one support conversation
                          </Text>
                        </Box>
                        <Badge
                          colorScheme={statusColor(selectedLiveChat.status)}
                        >
                          {prettyLabel(selectedLiveChat.status)}
                        </Badge>
                      </Flex>
                      <VStack
                        align="stretch"
                        spacing={3}
                        flex={1}
                        overflowY="auto"
                        p={4}
                        bg="gray.50"
                      >
                        {liveChatMessages.length ? (
                          liveChatMessages.map((message) => {
                            const isSupport = message.sender_role === "support";
                            return (
                              <Flex
                                key={message.id}
                                justify={isSupport ? "flex-end" : "flex-start"}
                              >
                                <Box
                                  maxW="80%"
                                  px={3}
                                  py={2}
                                  borderRadius="lg"
                                  bg={isSupport ? "green.600" : "white"}
                                  color={isSupport ? "white" : "gray.800"}
                                  boxShadow="sm"
                                >
                                  <Text fontSize="sm" whiteSpace="pre-wrap">
                                    {message.message}
                                  </Text>
                                  <Text
                                    fontSize="xs"
                                    mt={1}
                                    opacity={0.75}
                                    textAlign="right"
                                  >
                                    {formatDateTime(message.created_at)}
                                  </Text>
                                </Box>
                              </Flex>
                            );
                          })
                        ) : (
                          <Text
                            color="gray.500"
                            fontSize="sm"
                            textAlign="center"
                            py={8}
                          >
                            No messages yet. Send a message to start the
                            conversation.
                          </Text>
                        )}
                      </VStack>
                      <HStack
                        align="flex-end"
                        p={3}
                        borderTopWidth="1px"
                        borderColor="gray.100"
                        spacing={2}
                      >
                        <Textarea
                          value={liveChatDraft}
                          onChange={(event) =>
                            setLiveChatDraft(event.target.value)
                          }
                          placeholder="Write a reply..."
                          resize="none"
                          rows={2}
                          maxLength={10000}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent?.isComposing
                            ) {
                              event.preventDefault();
                              void sendLiveChatReply();
                            }
                          }}
                        />
                        <Button
                          colorScheme="green"
                          leftIcon={<Icon as={FiMessageCircle} />}
                          onClick={() => void sendLiveChatReply()}
                          isLoading={liveChatSending}
                          isDisabled={!liveChatDraft.trim()}
                        >
                          Send
                        </Button>
                      </HStack>
                    </>
                  ) : (
                    <Flex
                      flex={1}
                      align="center"
                      justify="center"
                      direction="column"
                      color="gray.500"
                      gap={2}
                      p={6}
                    >
                      <Icon as={FiMessageCircle} boxSize={8} />
                      <Text fontSize="sm">
                        Select a chat request to view the conversation.
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      <Modal
        isOpen={emergencyAlertDisclosure.isOpen}
        onClose={emergencyAlertDisclosure.onClose}
        size="full"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="gray.900Alpha.700" />
        <ModalContent
          maxW="100vw"
          h="100dvh"
          maxH="100dvh"
          m={0}
          borderRadius={0}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <ModalHeader
            bg="white"
            color="gray.800"
            borderBottomWidth="1px"
            borderColor="gray.200"
            pr={12}
            py={4}
          >
            <HStack spacing={3} align="center">
              <Flex
                align="center"
                justify="center"
                w={11}
                h={11}
                flexShrink={0}
                borderRadius="xl"
                bg="red.50"
                color="red.600"
              >
                <Icon as={FiAlertTriangle} boxSize={5} />
              </Flex>
              <Box minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="800"
                  letterSpacing="1.2px"
                  color="red.600"
                  textTransform="uppercase"
                >
                  Emergency response
                </Text>
                <Text
                  fontSize={{ base: "md", md: "lg" }}
                  fontWeight="700"
                  noOfLines={1}
                >
                  {selectedEmergencyAlert?.title ||
                    `${emergencySenderLabel(selectedEmergencyAlert?.users?.role)} emergency SOS`}
                </Text>
              </Box>
              <Badge
                ml="auto"
                colorScheme={statusColor(selectedEmergencyAlert?.status)}
                borderRadius="full"
                px={3}
                py={1}
                flexShrink={0}
              >
                {prettyLabel(selectedEmergencyAlert?.status || "open")}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            p={{ base: 3, md: 6 }}
            bg="gray.50"
            flex="1"
            minH={0}
            overflowY="auto"
          >
            <SimpleGrid
              maxW="1600px"
              mx="auto"
              alignItems="start"
              spacing={{ base: 4, xl: 6 }}
              templateColumns={{
                base: "minmax(0, 1fr)",
                lg: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
              }}
            >
              <VStack
                align="stretch"
                spacing={4}
                p={{ base: 3, md: 5 }}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="2xl"
                boxShadow="sm"
              >
                <HStack justify="space-between" align="flex-start">
                  <Box>
                    <Text fontWeight="700" color="gray.800">
                      {selectedEmergencyAlert?.users?.name ||
                        "Sender details unavailable"}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {emergencySenderLabel(selectedEmergencyAlert?.users?.role)}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {selectedEmergencyAlert?.users?.phone ||
                        selectedEmergencyAlert?.users?.email ||
                        "No sender contact details"}
                    </Text>
                  </Box>
                </HStack>
              <HStack
                justify="space-between"
                align={{ base: "stretch", sm: "center" }}
                flexDirection={{ base: "column", sm: "row" }}
                p={3}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={`${emergencyStatusAppearance(selectedEmergencyAlert).scheme}.200`}
                bg={
                  emergencyStatusAppearance(selectedEmergencyAlert).background
                }
              >
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    SOS status
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {!isSuperAdmin
                      ? "Only super-admins can change status or assignment."
                      : emergencyAssigneeName(selectedEmergencyAlert)
                        ? `Assigned to: ${emergencyAssigneeName(selectedEmergencyAlert)}`
                        : selectedEmergencyAlert?.attending_by
                          ? "Assigned support member"
                          : "Unassigned — opening this alert claims it"}
                  </Text>
                </Box>
                {isSuperAdmin ? (
                  <VStack
                    align="stretch"
                    spacing={2}
                    minW={{ base: "100%", sm: "230px" }}
                  >
                    <Select
                      size="sm"
                      value={selectedEmergencyAlert?.status || "open"}
                      onChange={(event) =>
                        void updateEmergencyStatus(event.target.value)
                      }
                      isDisabled={emergencyStatusUpdating}
                      aria-label="Update SOS status"
                      bg="white"
                    >
                      <option
                        value="open"
                        disabled={selectedEmergencyAlert?.status !== "open"}
                      >
                        Waiting for support
                      </option>
                      <option value="in_progress">Support is attending</option>
                      <option value="resolved">Resolved</option>
                    </Select>
                    <Select
                      size="sm"
                      value={selectedEmergencyAlert?.attending_by || ""}
                      onChange={(event) =>
                        void updateEmergencyStatus(
                          undefined,
                          event.target.value || null,
                        )
                      }
                      isDisabled={emergencyStatusUpdating}
                      aria-label="Assign SOS to support"
                      bg="white"
                    >
                      <option
                        value=""
                        disabled={selectedEmergencyAlert?.status !== "open"}
                      >
                        Unassigned / waiting
                      </option>
                      {emergencyAssignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name} · {prettyLabel(assignee.role)}
                        </option>
                      ))}
                    </Select>
                  </VStack>
                ) : null}
              </HStack>
              {selectedEmergencyAlert?.route?.route_name ? (
                <Text fontSize="sm" color="gray.600">
                  Route: {selectedEmergencyAlert.route.route_name}
                </Text>
              ) : null}
              {selectedEmergencyAlert?.children ? (
                <Text fontSize="sm" color="gray.600">
                  Child:{" "}
                  {[
                    selectedEmergencyAlert.children.name,
                    selectedEmergencyAlert.children.lastname,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Name unavailable"}
                </Text>
              ) : null}
              <Text color="gray.800" whiteSpace="pre-wrap">
                {selectedEmergencyAlert?.message ||
                  "No additional emergency details were provided."}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Received {formatDateTime(selectedEmergencyAlert?.created_at)}
              </Text>
              {getAlertCoordinates(selectedEmergencyAlert) ? (
                <>
                  <Text fontSize="sm" fontWeight="600" color="gray.700">
                    Coordinates:{" "}
                    {getAlertCoordinates(selectedEmergencyAlert).join(", ")}
                  </Text>
                  <Box
                    h={{ base: "280px", md: "min(42vh, 520px)" }}
                    overflow="hidden"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <MapContainer
                      center={getAlertCoordinates(selectedEmergencyAlert)}
                      zoom={15}
                      style={{ width: "100%", height: "100%" }}
                      scrollWheelZoom
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker
                        position={getAlertCoordinates(selectedEmergencyAlert)}
                        icon={emergencyAlertIcon}
                      >
                        <Popup>
                          <strong>
                            {selectedEmergencyAlert?.users?.name ||
                              `${emergencySenderLabel(selectedEmergencyAlert?.users?.role)} SOS`}
                          </strong>
                          <br />
                          {formatDateTime(selectedEmergencyAlert?.created_at)}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </Box>
                </>
              ) : (
                <Alert status="warning" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>
                    No valid GPS coordinates were attached to this alert.
                    {selectedEmergencyAlert?.location
                      ? ` Location: ${selectedEmergencyAlert.location}`
                      : ""}
                  </AlertDescription>
                </Alert>
              )}
              </VStack>
              <VStack
                align="stretch"
                spacing={4}
                p={{ base: 3, md: 5 }}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="2xl"
                boxShadow="sm"
              >
                <Box>
                  <Heading size="sm" color="gray.800" mb={1}>
                    SOS conversation
                  </Heading>
                  <Text fontSize="sm" color="gray.500" mb={3}>
                    Messages between support and the alert sender
                  </Text>
                  <Box
                    maxH={{
                      base: "min(42vh, 420px)",
                      lg: "min(55vh, 620px)",
                    }}
                    minH="180px"
                    overflowY="auto"
                    p={{ base: 3, md: 4 }}
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="xl"
                  >
                  {emergencyConversationLoading ? (
                    <Flex justify="center" py={5}>
                      <Spinner size="sm" color="red.500" />
                    </Flex>
                  ) : emergencyConversationMessages.length ? (
                    <VStack align="stretch" spacing={3}>
                      {emergencyConversationMessages.map((item) => {
                        const isOwn = item.author_user_id === currentUserId;
                        return (
                          <Flex
                            key={item.id}
                            justify={isOwn ? "flex-end" : "flex-start"}
                          >
                            <Box
                              maxW="85%"
                              px={3}
                              py={2}
                              borderRadius="xl"
                              bg={isOwn ? "red.600" : "white"}
                              color={isOwn ? "white" : "gray.800"}
                              borderWidth="1px"
                              borderColor={
                                isOwn
                                  ? `${emergencyStatusAppearance(selectedEmergencyAlert).scheme}.600`
                                  : `${emergencyStatusAppearance(selectedEmergencyAlert).scheme}.200`
                              }
                            >
                              <Text fontSize="xs" fontWeight="700" mb={1}>
                                {isOwn
                                  ? "Support"
                                  : item.users?.name ||
                                    emergencySenderLabel(item.users?.role)}
                              </Text>
                              <Text fontSize="sm" whiteSpace="pre-wrap">
                                {item.body}
                              </Text>
                              <Text
                                fontSize="xs"
                                opacity={0.75}
                                mt={1}
                                textAlign="right"
                              >
                                {formatDateTime(item.created_at)}
                              </Text>
                            </Box>
                          </Flex>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Text
                      color="gray.500"
                      fontSize="sm"
                      textAlign="center"
                      py={5}
                    >
                      Send a message to let the sender know support is
                      attending.
                    </Text>
                  )}
                  </Box>
                  {emergencyConversationError ? (
                    <Alert status="error" mt={3} borderRadius="lg">
                      <AlertIcon />
                      <AlertDescription>
                        {emergencyConversationError}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {selectedEmergencyAlert?.attending_by &&
                  selectedEmergencyAlert.attending_by !== currentUserId ? (
                    <Alert status="info" mt={3} borderRadius="lg">
                      <AlertIcon />
                      <AlertDescription>
                        This alert is assigned to{" "}
                        {emergencyAssigneeName(selectedEmergencyAlert) ||
                          "another support member"}
                        . Only the assigned support member can respond.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <HStack align="flex-end" mt={3}>
                    <Textarea
                      value={emergencyReplyDraft}
                      onChange={(event) =>
                        setEmergencyReplyDraft(event.target.value)
                      }
                      placeholder="Message the SOS sender..."
                      maxLength={3000}
                      rows={2}
                      resize="vertical"
                      isDisabled={
                        !currentUserId ||
                        selectedEmergencyAlert?.attending_by !==
                          currentUserId ||
                        selectedEmergencyAlert?.status === "resolved" ||
                        emergencyReplySending
                      }
                    />
                    <Button
                      colorScheme="red"
                      onClick={() => void sendEmergencyReply()}
                      isLoading={emergencyReplySending}
                      isDisabled={
                        !emergencyReplyDraft.trim() ||
                        !currentUserId ||
                        selectedEmergencyAlert?.attending_by !==
                          currentUserId ||
                        selectedEmergencyAlert?.status === "resolved"
                      }
                    >
                      Send
                    </Button>
                  </HStack>
                  {selectedEmergencyAlert?.attending_by === currentUserId &&
                  currentUserId &&
                  selectedEmergencyAlert?.attending_at ? (
                    <Text fontSize="xs" color="green.600" mt={2}>
                      You are attending this SOS.
                    </Text>
                  ) : !selectedEmergencyAlert?.attending_by &&
                    selectedEmergencyAlert?.status !== "resolved" ? (
                    <Text fontSize="xs" color="orange.600" mt={2}>
                      Open an unassigned alert to claim it before responding.
                    </Text>
                  ) : null}
                </Box>
              </VStack>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter
            bg="white"
            borderTopWidth="1px"
            borderColor="gray.200"
            py={3}
          >
            <Button
              colorScheme="red"
              onClick={emergencyAlertDisclosure.onClose}
            >
              Close alert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={ticketDisclosure.isOpen}
        onClose={ticketDisclosure.onClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl">
          <ModalHeader
            bg="white"
            borderBottomWidth="1px"
            borderColor="gray.100"
            pr={12}
          >
            <Text fontSize="lg" fontWeight="800" noOfLines={2}>
              {selectedTicket?.subject || "Ticket conversation"}
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody bg="gray.50" p={{ base: 4, md: 6 }}>
            {selectedTicket ? (
              <>
                <Box
                  p={4}
                  bg="white"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="blue.100"
                  boxShadow="sm"
                >
                  <Flex
                    justify="space-between"
                    align="flex-start"
                    gap={3}
                    wrap="wrap"
                  >
                    <Box>
                      <Text fontWeight="700" color="gray.800">
                        {selectedTicket.users?.name || "Requester"}
                      </Text>
                      {selectedTicket.users?.email ? (
                        <Text fontSize="sm" color="gray.500" mt={0.5}>
                          {selectedTicket.users.email}
                        </Text>
                      ) : null}
                    </Box>
                    <Text fontSize="xs" color="gray.500">
                      {formatDateTime(selectedTicket.created_at)}
                    </Text>
                  </Flex>
                  <HStack mt={3} spacing={2} wrap="wrap">
                    <Badge colorScheme={statusColor(selectedTicket.status)}>
                      {prettyLabel(selectedTicket.status)}
                    </Badge>
                    <Badge variant="subtle" colorScheme="blue">
                      {prettyLabel(selectedTicket.category)}
                    </Badge>
                    <Badge
                      variant="subtle"
                      colorScheme={statusColor(selectedTicket.priority)}
                    >
                      {prettyLabel(selectedTicket.priority)} priority
                    </Badge>
                  </HStack>
                  <Divider my={3} />
                  <Text
                    color="gray.700"
                    whiteSpace="pre-wrap"
                    lineHeight="tall"
                  >
                    {selectedTicket.message}
                  </Text>
                </Box>
                <Flex justify="space-between" align="center" mt={6} mb={3}>
                  <Box>
                    <Heading size="sm">Conversation</Heading>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Replies between the requester and support
                    </Text>
                  </Box>
                  <Badge colorScheme="gray" borderRadius="full" px={2.5} py={1}>
                    {replies.length}{" "}
                    {replies.length === 1 ? "reply" : "replies"}
                  </Badge>
                </Flex>
                {detailLoading ? (
                  <Flex justify="center" py={5}>
                    <Spinner />
                  </Flex>
                ) : replies.length ? (
                  <VStack align="stretch" spacing={3}>
                    {replies.map((reply) => (
                      <Box
                        key={reply.id}
                        alignSelf={
                          reply.author_user_id === selectedTicket.user_id
                            ? "flex-start"
                            : "flex-end"
                        }
                        maxW={{ base: "96%", md: "88%" }}
                        p={3}
                        bg={
                          reply.author_user_id === selectedTicket.user_id
                            ? "white"
                            : "blue.50"
                        }
                        borderWidth="1px"
                        borderColor={
                          reply.author_user_id === selectedTicket.user_id
                            ? "gray.200"
                            : "blue.100"
                        }
                        borderRadius="xl"
                        boxShadow="xs"
                      >
                        <HStack
                          justify="space-between"
                          gap={3}
                          align="flex-start"
                        >
                          <Text fontSize="sm" fontWeight="700" color="gray.800">
                            {reply.users?.name ||
                              reply.users?.email ||
                              "Support"}
                          </Text>
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            whiteSpace="nowrap"
                          >
                            {formatDateTime(reply.created_at)}
                          </Text>
                        </HStack>
                        <Text mt={2} color="gray.700" whiteSpace="pre-wrap">
                          {reply.body}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    No replies yet. Send the first response below.
                  </Text>
                )}
                {canReplyToTickets ? (
                  <>
                    <Box
                      mt={5}
                      p={4}
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="xl"
                    >
                      <Text fontSize="sm" fontWeight="700" mb={2}>
                        Write a reply
                      </Text>
                      <Textarea
                        minH="110px"
                        bg="gray.50"
                        placeholder="Write a reply to the requester..."
                        value={replyDraft}
                        maxLength={10000}
                        onChange={(event) => setReplyDraft(event.target.value)}
                      />
                      <Flex justify="space-between" align="center" mt={2}>
                        <Text fontSize="xs" color="gray.500">
                          {replyDraft.length}/10000
                        </Text>
                        <Button
                          colorScheme="blue"
                          onClick={() => void sendReply()}
                          isLoading={
                            pendingAction === `reply:${selectedTicket.id}`
                          }
                          isDisabled={!replyDraft.trim() || detailLoading}
                        >
                          Send reply
                        </Button>
                      </Flex>
                    </Box>
                  </>
                ) : (
                  <Text mt={4} fontSize="sm" color="gray.500">
                    Your platform admin role allows viewing this conversation
                    but not replying.
                  </Text>
                )}
                <Divider my={5} />
                {renderAudit()}
              </>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={ticketDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={incidentDisclosure.isOpen}
        onClose={incidentDisclosure.onClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Incident details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedIncident ? (
              <>
                <Flex
                  justify="space-between"
                  align="center"
                  gap={3}
                  wrap="wrap"
                >
                  <Heading size="md">
                    {prettyLabel(selectedIncident.incident_type)}
                  </Heading>
                  <HStack>
                    <Badge colorScheme={statusColor(selectedIncident.severity)}>
                      {prettyLabel(selectedIncident.severity)} severity
                    </Badge>
                    <Badge colorScheme={statusColor(selectedIncident.status)}>
                      {incidentStatusLabel(selectedIncident.status)}
                    </Badge>
                  </HStack>
                </Flex>
                {selectedIncident.recipient_type === "support" ? (
                  <Badge mt={2} colorScheme="purple">
                    Sent to Support · visible to school
                  </Badge>
                ) : null}
                <Text mt={3} whiteSpace="pre-wrap">
                  {selectedIncident.description}
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={5}>
                  <Box p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="xs" color="gray.500">
                      Reporter
                    </Text>
                    <Text fontWeight="600">
                      {selectedIncident.users?.name || "Unknown reporter"}
                    </Text>
                    <Text fontSize="sm">
                      {selectedIncident.users?.email || "No email recorded"}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {prettyLabel(selectedIncident.reporter_role)} ·{" "}
                      {formatDateTime(selectedIncident.created_at)}
                    </Text>
                  </Box>
                  <Box p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="xs" color="gray.500">
                      Location
                    </Text>
                    <Text>
                      {selectedIncident.location || "No location provided"}
                    </Text>
                  </Box>
                  {selectedIncident.schools ? (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">
                        Linked school
                      </Text>
                      <Text fontWeight="600">
                        {selectedIncident.schools.name}
                      </Text>
                      {selectedIncident.schools.emis_number ? (
                        <Text fontSize="sm">
                          EMIS: {selectedIncident.schools.emis_number}
                        </Text>
                      ) : null}
                      {selectedIncident.schools.school_email ? (
                        <Text fontSize="sm">
                          {selectedIncident.schools.school_email}
                        </Text>
                      ) : null}
                      {selectedIncident.schools.phone ? (
                        <Text fontSize="sm">
                          {selectedIncident.schools.phone}
                        </Text>
                      ) : null}
                      <Text fontSize="sm">
                        {[
                          selectedIncident.schools.address,
                          selectedIncident.schools.district,
                          selectedIncident.schools.province,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address recorded"}
                      </Text>
                    </Box>
                  ) : null}
                  {selectedIncident.routes ? (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">
                        Linked route
                      </Text>
                      <Text fontWeight="600">
                        {selectedIncident.routes.route_name}
                      </Text>
                      <Text fontSize="sm">
                        {[
                          selectedIncident.routes.start_location,
                          selectedIncident.routes.end_location,
                        ]
                          .filter(Boolean)
                          .join(" → ")}
                      </Text>
                    </Box>
                  ) : null}
                  {selectedIncident.children ? (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">
                        Linked child
                      </Text>
                      <Text fontWeight="600">
                        {[
                          selectedIncident.children.name,
                          selectedIncident.children.lastname,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </Text>
                      {selectedIncident.children.grade ? (
                        <Text fontSize="sm">
                          Grade {selectedIncident.children.grade}
                        </Text>
                      ) : null}
                    </Box>
                  ) : null}
                </SimpleGrid>
                <Flex mt={5} gap={3} align="center" wrap="wrap">
                  {renderAssignmentSelect(selectedIncident, "incident")}
                  {renderStatusSelect(selectedIncident, "incident")}
                </Flex>
                <Box
                  mt={4}
                  p={4}
                  borderWidth="1px"
                  borderColor="red.200"
                  borderRadius="lg"
                >
                  <Flex align="center" gap={2}>
                    <Icon as={FiAlertTriangle} color="red.500" />
                    <Text fontWeight="700">Escalation</Text>
                    {selectedIncident.is_escalated ? (
                      <Badge colorScheme="red">Escalated</Badge>
                    ) : null}
                  </Flex>
                  {selectedIncident.escalation_note ? (
                    <Text mt={2} fontSize="sm" whiteSpace="pre-wrap">
                      {selectedIncident.escalation_note}
                    </Text>
                  ) : null}
                  <Textarea
                    mt={3}
                    placeholder="Add an escalation note for the incident record (optional)"
                    value={incidentEscalationNote}
                    onChange={(event) =>
                      setIncidentEscalationNote(event.target.value)
                    }
                    maxLength={2000}
                  />
                  <Button
                    mt={3}
                    size="sm"
                    colorScheme="red"
                    isDisabled={selectedIncident.is_escalated}
                    isLoading={
                      pendingAction === `escalate:${selectedIncident.id}`
                    }
                    onClick={() =>
                      void escalateIncident(
                        selectedIncident,
                        incidentEscalationNote,
                      )
                    }
                  >
                    Escalate incident
                  </Button>
                </Box>
                <Box mt={5}>
                  <Heading size="sm" mb={3}>
                    Responses
                  </Heading>
                  {detailLoading ? (
                    <Spinner size="sm" />
                  ) : replies.length ? (
                    <VStack align="stretch" spacing={3}>
                      {replies.map((reply) => (
                        <Box
                          key={reply.id}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                        >
                          <Text fontSize="xs" color="gray.500">
                            {reply.users?.name || "Incident team"} ·{" "}
                            {formatDateTime(reply.created_at)}
                          </Text>
                          <Text mt={1} whiteSpace="pre-wrap">
                            {reply.body}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      No responses yet.
                    </Text>
                  )}
                  <Text mt={2} fontSize="xs" color="gray.500">
                    {selectedIncident.recipient_type === "support"
                      ? "Only Support can respond to this report. The related school can view the conversation."
                      : "The related school and Support can respond to this report."}
                  </Text>
                  {canReplyToTickets &&
                  selectedIncident.status !== "resolved" ? (
                    <>
                      <Textarea
                        mt={3}
                        placeholder="Write a response to the reporter..."
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        maxLength={3000}
                      />
                      <Button
                        mt={2}
                        colorScheme="blue"
                        isDisabled={!replyDraft.trim()}
                        isLoading={
                          pendingAction ===
                          `incident-reply:${selectedIncident.id}`
                        }
                        onClick={() => void sendIncidentReply()}
                      >
                        Send response
                      </Button>
                    </>
                  ) : selectedIncident.status === "resolved" ? (
                    <Text mt={2} fontSize="sm" color="gray.500">
                      This incident is closed.
                    </Text>
                  ) : null}
                </Box>
                {renderAudit()}
              </>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={incidentDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={schoolDisclosure.isOpen}
        onClose={schoolDisclosure.onClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>School registration review</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedSchool ? (
              <>
                <Flex
                  justify="space-between"
                  align="center"
                  gap={3}
                  wrap="wrap"
                >
                  <Heading size="md">{selectedSchool.name}</Heading>
                  <Badge
                    colorScheme={
                      selectedSchool.status === "needs_info"
                        ? "purple"
                        : "orange"
                    }
                  >
                    {prettyLabel(selectedSchool.status)}
                  </Badge>
                </Flex>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Submitted {formatDateTime(selectedSchool.created_at)}
                </Text>
                {selectedSchool.submission_source === "client_child_entry" ? (
                  <Alert status="info" mt={4} borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                      This school was added by a parent while registering a
                      child. Approval will activate the school listing; it does
                      not create or approve a school administrator account.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={5}>
                  {[
                    ["EMIS number", selectedSchool.emis_number],
                    ["School email", selectedSchool.school_email],
                    ["Phone", selectedSchool.phone],
                    ["Principal", selectedSchool.principal_name],
                    ["Contact person", selectedSchool.contact_person],
                    ["Address", selectedSchool.address],
                    ["District", selectedSchool.district],
                    ["Province", selectedSchool.province],
                    ["Latitude", selectedSchool.latitude],
                    ["Longitude", selectedSchool.longitude],
                    ["Start time", selectedSchool.start_time],
                    ["End time", selectedSchool.end_time],
                  ].map(([label, value]) => (
                    <Box key={label} p={3} bg="gray.50" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">
                        {label}
                      </Text>
                      <Text fontSize="sm" fontWeight="600">
                        {value || "Not provided"}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Heading size="sm" mt={5} mb={2}>
                  Submitter and school administrator details
                </Heading>
                {selectedSchool.submitted_by ? (
                  <Box p={3} bg="gray.50" borderRadius="md" mb={2}>
                    <Text fontWeight="600">
                      {selectedSchool.submitted_by.name || "Parent"}
                    </Text>
                    <Text fontSize="sm">
                      {selectedSchool.submitted_by.email || "No email recorded"}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Parent who submitted the school
                    </Text>
                  </Box>
                ) : null}
                {(selectedSchool.school_admins || []).length ? (
                  <VStack align="stretch" spacing={2}>
                    {selectedSchool.school_admins.map((admin) => (
                      <Box key={admin.id} p={3} bg="gray.50" borderRadius="md">
                        <Text fontWeight="600">
                          {[admin.first_name, admin.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                            admin.users?.name ||
                            "School administrator"}
                        </Text>
                        <Text fontSize="sm">
                          {admin.your_email ||
                            admin.users?.email ||
                            "No email recorded"}
                        </Text>
                        {admin.phone ? (
                          <Text fontSize="sm">{admin.phone}</Text>
                        ) : null}
                        <Text fontSize="xs" color="gray.500">
                          {prettyLabel(admin.role)} ·{" "}
                          {prettyLabel(admin.access_level)}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    No school administrator account is linked.
                  </Text>
                )}
                {safeExternalUrl(selectedSchool.logo) ? (
                  <Text fontSize="sm" mt={3}>
                    Submitted logo:{" "}
                    <a
                      href={safeExternalUrl(selectedSchool.logo)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view file
                    </a>
                  </Text>
                ) : selectedSchool.logo ? (
                  <Text fontSize="sm" mt={3}>
                    Submitted logo URL: {selectedSchool.logo}
                  </Text>
                ) : null}
                <Divider my={5} />
                <Heading size="sm" mb={2}>
                  Review note
                </Heading>
                {canReviewSchools ? (
                  <>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Required for rejection or to request more information. The
                      applicant is notified.
                    </Text>
                    <Textarea
                      value={schoolReviewNote}
                      onChange={(event) =>
                        setSchoolReviewNote(event.target.value)
                      }
                      maxLength={3000}
                      placeholder="Add a reason, missing information, or approval note..."
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {schoolReviewNote.length}/3000
                    </Text>
                  </>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    Your platform admin role allows viewing applications but not
                    reviewing them.
                  </Text>
                )}
                {renderAudit()}
              </>
            ) : null}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap">
            <Button variant="ghost" onClick={schoolDisclosure.onClose}>
              {canReviewSchools ? "Cancel" : "Close"}
            </Button>
            {canReviewSchools ? (
              <>
                <Button
                  colorScheme="purple"
                  isLoading={pendingAction === `school:${selectedSchool?.id}`}
                  isDisabled={
                    Boolean(pendingAction) || !schoolReviewNote.trim()
                  }
                  onClick={() =>
                    void reviewSchool(selectedSchool.id, "needs_info")
                  }
                >
                  Request information
                </Button>
                <Button
                  colorScheme="red"
                  variant="outline"
                  isLoading={pendingAction === `school:${selectedSchool?.id}`}
                  isDisabled={
                    Boolean(pendingAction) || !schoolReviewNote.trim()
                  }
                  onClick={() =>
                    void reviewSchool(selectedSchool.id, "rejected")
                  }
                >
                  Reject
                </Button>
                <Button
                  colorScheme="green"
                  isLoading={pendingAction === `school:${selectedSchool?.id}`}
                  isDisabled={Boolean(pendingAction)}
                  onClick={() =>
                    void reviewSchool(selectedSchool.id, "approved")
                  }
                >
                  Approve
                </Button>
              </>
            ) : null}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Requests;
