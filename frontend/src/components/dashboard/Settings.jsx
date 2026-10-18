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
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Text,
  Tr,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiBell,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiSettings,
  FiLock,
  FiMessageCircle,
  FiRefreshCw,
  FiSave,
  FiZap,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import {
  getCurrentUserIds,
  isCurrentUserId,
} from "../../utils/currentUserIdentity";
import "./Settings.css";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const ticketLevels = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["urgent", "Urgent"],
];
const incidentLevels = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"],
];
const supportRoles = [
  ["agent", "Agent"],
  ["senior", "Senior"],
  ["admin", "Support admin"],
  ["emergency", "Emergency"],
];
const adminRoles = [
  ["super_admin", "Super admin"],
  ["support", "Support"],
  ["operations", "Operations"],
  ["analyst", "Analyst"],
];
const alertRules = [
  [
    "urgentTickets",
    "Urgent tickets",
    "Notify when a ticket has urgent priority.",
  ],
  [
    "unassignedTickets",
    "Unassigned tickets",
    "Alert on tickets that need an owner.",
  ],
  [
    "urgentIncidents",
    "Urgent or escalated incidents",
    "Alert on urgent incidents and automatic escalations.",
  ],
  [
    "unassignedIncidents",
    "Unassigned incidents",
    "Alert when an incident has no owner.",
  ],
  [
    "responseDeadlines",
    "Response deadlines",
    "Show response deadlines approaching or overdue.",
  ],
  [
    "resolutionDeadlines",
    "Resolution deadlines",
    "Show resolution deadlines approaching or overdue.",
  ],
];

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token)
    throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Unable to load support settings.",
    );
  }
  return data;
};

const formatDate = (value) => {
  if (!value) return "Not yet changed";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

function SlaCard({ title, levels, settings, onChange, description }) {
  return (
    <Card className="control-card">
      <CardBody>
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Box>
            <Heading size="sm">{title}</Heading>
            <Text className="control-description">{description}</Text>
          </Box>
          <span className="control-icon">
            <Icon as={FiClock} />
          </span>
        </Flex>
        <Box className="sla-table-wrap">
          <Box className="sla-grid sla-grid-heading">
            <Text>Priority</Text>
            <Text>First response</Text>
            <Text>Resolution</Text>
          </Box>
          {levels.map(([key, label]) => (
            <Box className="sla-grid sla-grid-row" key={key}>
              <Text className="sla-level">{label}</Text>
              {["response", "resolution"].map((target) => (
                <FormControl key={target}>
                  <Input
                    aria-label={`${label} ${target} target in hours`}
                    type="number"
                    min={0.25}
                    max={720}
                    step={0.25}
                    value={settings[key][target]}
                    onChange={(event) =>
                      onChange(
                        key,
                        target,
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                  />
                  <Text className="sla-input-suffix">hours</Text>
                </FormControl>
              ))}
            </Box>
          ))}
        </Box>
        <Text className="control-footnote">
          Targets apply to open requests immediately. Minimum 15 minutes;
          maximum 30 days.
        </Text>
      </CardBody>
    </Card>
  );
}

function RoleCard({ permissions }) {
  const labels = {
    super_admin: ["Super admin", "purple"],
    support: ["Support", "blue"],
    operations: ["Operations", "orange"],
    analyst: ["Analyst", "gray"],
  };
  return (
    <Card className="control-card">
      <CardBody>
        <Flex justify="space-between" align="center" gap={3}>
          <Box>
            <Heading size="sm">Platform access</Heading>
            <Text className="control-description">
              Role permissions are enforced by the server and are intentionally
              not editable here.
            </Text>
          </Box>
          <span className="control-icon">
            <Icon as={FiLock} />
          </span>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={5}>
          {Object.entries(permissions || {}).map(([role, capabilities]) => {
            const [label, color] = labels[role] || [role, "gray"];
            return (
              <Box className="permission-card" key={role}>
                <Badge colorScheme={color} borderRadius="full" px={2} py={1}>
                  {label}
                </Badge>
                <VStack align="stretch" spacing={2} mt={3}>
                  {(Array.isArray(capabilities) ? capabilities : []).map(
                    (capability) => (
                      <HStack key={capability} align="flex-start" spacing={2}>
                        <Icon as={FiCheck} color="green.500" mt="2px" />
                        <Text fontSize="xs" color="gray.600" lineHeight="1.5">
                          {capability}
                        </Text>
                      </HStack>
                    ),
                  )}
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      </CardBody>
    </Card>
  );
}

const Settings = () => {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);
  const currentUserIds = useMemo(getCurrentUserIds, []);
  const isSuperAdmin = user?.admin_profile?.admin_role === "super_admin";
  const [settings, setSettings] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [history, setHistory] = useState([]);
  const [requestLogs, setRequestLogs] = useState([]);
  const [requestLogsLoading, setRequestLogsLoading] = useState(false);
  const [requestLogsError, setRequestLogsError] = useState("");
  const [requestLogFilter, setRequestLogFilter] = useState("all");
  const [requestLogPage, setRequestLogPage] = useState(1);
  const [requestLogId, setRequestLogId] = useState("");
  const [requestLogSearchId, setRequestLogSearchId] = useState("");
  const [showingRequestLogs, setShowingRequestLogs] = useState(false);
  const [showingConfigurationHistory, setShowingConfigurationHistory] =
    useState(false);
  const [health, setHealth] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("checking");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const settingsRefreshTimer = useRef(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/support-settings");
      setSettings(result.settings);
      setPermissions(result.permissions || {});
      setHistory(result.history || []);
      setHealth(result.health || null);
      setUpdatedAt(result.updatedAt);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load Support Control Center settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequestLogs = useCallback(async () => {
    if (!isSuperAdmin) return;
    setRequestLogsLoading(true);
    setRequestLogsError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (requestLogFilter !== "all") {
        params.set("status", requestLogFilter);
      }
      if (requestLogSearchId) params.set("id", requestLogSearchId);
      const result = await apiRequest(
        `/admin/system-request-logs?${params.toString()}`,
      );
      setRequestLogs(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setRequestLogsError(
        requestError.message || "Unable to load failed request logs.",
      );
    } finally {
      setRequestLogsLoading(false);
    }
  }, [isSuperAdmin, requestLogFilter, requestLogSearchId]);

  const sortedRequestLogs = useMemo(
    () =>
      [...requestLogs].sort(
        (first, second) =>
          new Date(second.created_at || 0).getTime() -
          new Date(first.created_at || 0).getTime(),
      ),
    [requestLogs],
  );
  const requestLogsPerPage = 5;
  const requestLogPageCount = Math.max(
    1,
    Math.ceil(sortedRequestLogs.length / requestLogsPerPage),
  );
  const paginatedRequestLogs = sortedRequestLogs.slice(
    (requestLogPage - 1) * requestLogsPerPage,
    requestLogPage * requestLogsPerPage,
  );

  useEffect(() => {
    setRequestLogPage((page) => Math.min(page, requestLogPageCount));
  }, [requestLogPageCount]);

  const submitRequestLogSearch = (event) => {
    event.preventDefault();
    setRequestLogPage(1);
    setRequestLogSearchId(requestLogId.trim());
  };

  const clearRequestLogSearch = () => {
    setRequestLogPage(1);
    setRequestLogId("");
    setRequestLogSearchId("");
  };

  const messageRequestUser = (entry) => {
    if (!entry.user_id) return;
    navigate("/messages", {
      state: {
        openConversationUserId: entry.user_id,
        openConversationRole: entry.user_role,
      },
    });
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadRequestLogs();
  }, [loadRequestLogs]);

  useEffect(() => {
    if (!supabaseClient) {
      setRealtimeStatus("not_configured");
      return undefined;
    }
    const channel = supabaseClient
      .channel(`support-settings-health:${user?.id || "admin"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_dashboard_events" },
        (payload) => {
          if (payload.new?.resource_type !== "support_settings") return;
          if (settingsRefreshTimer.current) {
            clearTimeout(settingsRefreshTimer.current);
          }
          settingsRefreshTimer.current = setTimeout(() => {
            void loadSettings();
          }, 250);
        },
      )
      .subscribe((status, subscriptionError) => {
        if (subscriptionError) {
          setRealtimeStatus("error");
          return;
        }
        setRealtimeStatus(status === "SUBSCRIBED" ? "healthy" : "checking");
      });
    return () => {
      if (settingsRefreshTimer.current) {
        clearTimeout(settingsRefreshTimer.current);
        settingsRefreshTimer.current = null;
      }
      void supabaseClient.removeChannel(channel);
    };
  }, [loadSettings, user?.id]);

  const updateSla = (section, level, target, value) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [level]: { ...current[section][level], [target]: value },
      },
    }));
    setSuccess("");
  };

  const updateEscalation = (key, value) => {
    setSettings((current) => ({
      ...current,
      escalation: { ...current.escalation, [key]: value },
    }));
    setSuccess("");
  };

  const updateAlert = (key, value) => {
    setSettings((current) => ({
      ...current,
      alerts: { ...current.alerts, [key]: value },
    }));
    setSuccess("");
  };

  const updateRecipients = (key, role, checked) => {
    setSettings((current) => {
      const selected = new Set(current.escalation[key]);
      if (checked) selected.add(role);
      else selected.delete(role);
      return {
        ...current,
        escalation: { ...current.escalation, [key]: [...selected] },
      };
    });
    setSuccess("");
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest("/admin/support-settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      });
      setSettings(result.settings);
      setUpdatedAt(result.updated_at);
      setSuccess(
        result.notifications_sent === false
          ? "Support settings saved, but super-admin notifications could not be sent. Check the server logs and apply the notifications migration."
          : "Support settings saved. Active request deadlines have been recalculated, and all active super admins were notified.",
      );
      await loadSettings();
    } catch (requestError) {
      setError(requestError.message || "Unable to save support settings.");
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = async () => {
    await loadSettings();
    setSuccess("");
  };

  if (loading && !settings) {
    return (
      <Flex className="settings-loading">
        <Spinner color="blue.500" />
        <Text>Loading Support Control Center…</Text>
      </Flex>
    );
  }

  if (!settings) {
    return (
      <Box className="support-settings-page">
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          <AlertDescription>
            {error || "Support settings are unavailable."}
          </AlertDescription>
        </Alert>
        <Button
          mt={4}
          leftIcon={<Icon as={FiRefreshCw} />}
          onClick={loadSettings}
        >
          Try again
        </Button>
      </Box>
    );
  }

  const healthItems = [
    ["API", health?.api || "unknown"],
    ["Database", health?.database || "unknown"],
    ["Data services", health?.supportData || "unknown"],
    ["Realtime connection", realtimeStatus],
  ];
  const statusColor = (status) =>
    ["healthy", "configured"].includes(status)
      ? "green"
      : ["checking"].includes(status)
        ? "yellow"
        : "red";

  return (
    <Box className="support-settings-page">
      <PageHeader
        eyebrow="SYSTEM ADMINISTRATION"
        title={
          showingRequestLogs
            ? "Failed system requests"
            : showingConfigurationHistory
              ? "Configuration history"
              : "Support Control Center"
        }
        description={
          showingRequestLogs
            ? "Review recent API requests that returned an error."
            : showingConfigurationHistory
              ? "Review recent changes made to Support Control Center settings."
              : "Configure service targets, escalation behavior, and operational alerts."
        }
        meta={
          !showingRequestLogs && !showingConfigurationHistory ? (
            <Text className="settings-updated">
              <Icon as={FiActivity} /> Last saved: {formatDate(updatedAt)}
            </Text>
          ) : null
        }
        actions={
          <HStack spacing={2}>
            <Button
              variant="outline"
              leftIcon={<Icon as={FiRefreshCw} />}
              onClick={
                showingRequestLogs ? loadRequestLogs : loadSettings
              }
              isLoading={showingRequestLogs ? requestLogsLoading : loading}
            >
              Refresh
            </Button>
            {isSuperAdmin ? (
              <>
                <Button
                  variant={showingRequestLogs ? "solid" : "outline"}
                  colorScheme={showingRequestLogs ? "red" : "gray"}
                  leftIcon={<Icon as={FiAlertTriangle} />}
                  onClick={() => {
                    setShowingRequestLogs(true);
                    setShowingConfigurationHistory(false);
                  }}
                >
                  Failed system requests
                </Button>
                <Button
                  variant={showingConfigurationHistory ? "solid" : "outline"}
                  colorScheme={showingConfigurationHistory ? "blue" : "gray"}
                  leftIcon={<Icon as={FiSettings} />}
                  onClick={() => {
                    setShowingRequestLogs(false);
                    setShowingConfigurationHistory(true);
                  }}
                >
                  Configuration history
                </Button>
                {(showingRequestLogs || showingConfigurationHistory) && (
                  <Button
                    variant="outline"
                    leftIcon={<Icon as={FiArrowLeft} />}
                    onClick={() => {
                      setShowingRequestLogs(false);
                      setShowingConfigurationHistory(false);
                    }}
                  >
                    Support Control Center
                  </Button>
                )}
              </>
            ) : null}
            {!showingRequestLogs &&
            !showingConfigurationHistory &&
            isSuperAdmin ? (
              <>
                <Button
                  variant="ghost"
                  onClick={discardChanges}
                  isDisabled={!settings || saving}
                >
                  Discard
                </Button>
                <Button
                  colorScheme="blue"
                  leftIcon={<Icon as={FiSave} />}
                  onClick={saveSettings}
                  isLoading={saving}
                >
                  Save changes
                </Button>
              </>
            ) : null}
          </HStack>
        }
      />

      {!showingRequestLogs && !showingConfigurationHistory ? (
        <>
          {error ? (
            <Alert status="error" borderRadius="xl" mb={5}>
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert status="success" borderRadius="xl" mb={5}>
              <AlertIcon />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}
          {!isSuperAdmin ? (
            <Alert status="info" borderRadius="xl" mb={5}>
              <AlertIcon />
              <AlertDescription>
                Settings are view-only. Only a super admin can change system
                controls.
              </AlertDescription>
            </Alert>
          ) : null}

          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
            <SlaCard
              title="Ticket service targets"
              description="Set first-response and resolution targets for each ticket priority."
              levels={ticketLevels}
              settings={settings.ticketSlaHours}
              onChange={(level, target, value) =>
                updateSla("ticketSlaHours", level, target, value)
              }
            />
            <SlaCard
              title="Incident service targets"
              description="Set first-response and resolution targets for each incident severity."
              levels={incidentLevels}
              settings={settings.incidentSlaHours}
              onChange={(level, target, value) =>
                updateSla("incidentSlaHours", level, target, value)
              }
            />
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
            <Card className="control-card">
              <CardBody>
                <HStack justify="space-between" align="flex-start">
                  <Box>
                    <Heading size="sm">Escalation policy</Heading>
                    <Text className="control-description">
                      Automatically flag high-severity incidents and set the
                      alert horizon.
                    </Text>
                  </Box>
                  <span className="control-icon">
                    <Icon as={FiZap} />
                  </span>
                </HStack>
                <HStack
                  justify="space-between"
                  py={4}
                  mt={3}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="700">
                      Automatic incident escalation
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Escalate incidents that meet the severity threshold.
                    </Text>
                  </Box>
                  <Switch
                    colorScheme="blue"
                    isChecked={settings.escalation.enabled}
                    isDisabled={!isSuperAdmin}
                    onChange={(event) =>
                      updateEscalation("enabled", event.target.checked)
                    }
                  />
                </HStack>
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600">
                      Escalate at severity
                    </FormLabel>
                    <select
                      className="settings-native-select"
                      value={settings.escalation.incidentSeverityThreshold}
                      disabled={!isSuperAdmin || !settings.escalation.enabled}
                      onChange={(event) =>
                        updateEscalation(
                          "incidentSeverityThreshold",
                          event.target.value,
                        )
                      }
                    >
                      {incidentLevels.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600">
                      Deadline alert window
                    </FormLabel>
                    <HStack>
                      <Input
                        type="number"
                        min={1}
                        max={72}
                        value={settings.escalation.alertWindowHours}
                        isDisabled={!isSuperAdmin}
                        onChange={(event) =>
                          updateEscalation(
                            "alertWindowHours",
                            event.target.value === ""
                              ? ""
                              : Number(event.target.value),
                          )
                        }
                      />
                      <Text color="gray.500" fontSize="sm">
                        hours
                      </Text>
                    </HStack>
                  </FormControl>
                </SimpleGrid>
                <VStack
                  align="stretch"
                  spacing={0}
                  mt={4}
                  divider={<Divider />}
                >
                  {[
                    [
                      "escalateOnResponseBreach",
                      "Escalate missed first responses",
                      "Flag an incident and notify recipients when its response SLA expires.",
                    ],
                    [
                      "escalateOnResolutionBreach",
                      "Escalate missed resolutions",
                      "Flag an incident and notify recipients when its resolution SLA expires.",
                    ],
                  ].map(([key, title, description]) => (
                    <HStack
                      key={key}
                      justify="space-between"
                      spacing={4}
                      py={3}
                    >
                      <Box>
                        <Text fontSize="sm" fontWeight="600">
                          {title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {description}
                        </Text>
                      </Box>
                      <Switch
                        colorScheme="blue"
                        isChecked={settings.escalation[key]}
                        isDisabled={
                          !isSuperAdmin || !settings.escalation.enabled
                        }
                        onChange={(event) =>
                          updateEscalation(key, event.target.checked)
                        }
                      />
                    </HStack>
                  ))}
                </VStack>
                <Divider my={5} />
                <Text fontSize="sm" fontWeight="700">
                  Alert recipients
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Choose which support staff and platform admin roles receive
                  alerts.
                </Text>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.600"
                  mt={4}
                  mb={2}
                >
                  SUPPORT STAFF
                </Text>
                <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                  {supportRoles.map(([role, label]) => (
                    <Checkbox
                      key={role}
                      size="sm"
                      colorScheme="blue"
                      isChecked={settings.escalation.supportRoles.includes(
                        role,
                      )}
                      isDisabled={!isSuperAdmin}
                      onChange={(event) =>
                        updateRecipients(
                          "supportRoles",
                          role,
                          event.target.checked,
                        )
                      }
                    >
                      {label}
                    </Checkbox>
                  ))}
                </SimpleGrid>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.600"
                  mt={4}
                  mb={2}
                >
                  PLATFORM ADMINS
                </Text>
                <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                  {adminRoles.map(([role, label]) => (
                    <Checkbox
                      key={role}
                      size="sm"
                      colorScheme="blue"
                      isChecked={settings.escalation.platformAdminRoles.includes(
                        role,
                      )}
                      isDisabled={!isSuperAdmin}
                      onChange={(event) =>
                        updateRecipients(
                          "platformAdminRoles",
                          role,
                          event.target.checked,
                        )
                      }
                    >
                      {label}
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card className="control-card">
              <CardBody>
                <HStack justify="space-between" align="flex-start">
                  <Box>
                    <Heading size="sm">Alert rules</Heading>
                    <Text className="control-description">
                      Choose which events create Support Console alerts.
                    </Text>
                  </Box>
                  <span className="control-icon">
                    <Icon as={FiBell} />
                  </span>
                </HStack>
                <VStack
                  align="stretch"
                  spacing={0}
                  mt={4}
                  divider={<Divider />}
                >
                  {alertRules.map(([key, title, description]) => (
                    <HStack
                      key={key}
                      justify="space-between"
                      spacing={4}
                      py={3}
                    >
                      <Box>
                        <Text fontSize="sm" fontWeight="600">
                          {title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {description}
                        </Text>
                      </Box>
                      <Switch
                        colorScheme="blue"
                        isChecked={settings.alerts[key]}
                        isDisabled={!isSuperAdmin}
                        onChange={(event) =>
                          updateAlert(key, event.target.checked)
                        }
                      />
                    </HStack>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
            <RoleCard permissions={permissions} />
            <Card className="control-card">
              <CardBody>
                <HStack justify="space-between" align="flex-start">
                  <Box>
                    <Heading size="sm">System health</Heading>
                    <Text className="control-description">
                      Live connectivity and service configuration.
                    </Text>
                  </Box>
                  <span className="control-icon">
                    <Icon as={FiActivity} />
                  </span>
                </HStack>
                <VStack
                  align="stretch"
                  spacing={0}
                  mt={4}
                  divider={<Divider />}
                >
                  {healthItems.map(([label, status]) => (
                    <HStack key={label} justify="space-between" py={3}>
                      <Text fontSize="sm" color="gray.700">
                        {label}
                      </Text>
                      <Badge
                        colorScheme={statusColor(status)}
                        borderRadius="full"
                        px={2}
                        py={1}
                      >
                        {status.replaceAll("_", " ")}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
                <Text fontSize="xs" color="gray.400" mt={3}>
                  Checked {formatDate(health?.checkedAt)}
                </Text>
              </CardBody>
            </Card>
          </SimpleGrid>
        </>
      ) : null}

      {isSuperAdmin && showingRequestLogs ? (
        <Card className="control-card settings-history-card" mb={5}>
          <CardBody>
            <Flex
              justify="space-between"
              align="flex-start"
              gap={3}
              wrap="wrap"
            >
              <Box>
                <HStack spacing={2}>
                  <Icon as={FiAlertTriangle} color="red.500" />
                  <Heading size="sm">Failed system requests</Heading>
                </HStack>
                <Text className="control-description">
                  Recent API requests that returned an error. Request bodies and
                  query strings are not recorded; failed login requests include
                  only the submitted email address.
                </Text>
              </Box>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={loadRequestLogs}
                isLoading={requestLogsLoading}
              >
                Refresh logs
              </Button>
            </Flex>

            <HStack mt={4} mb={2} spacing={2}>
              {[
                ["all", "All failures"],
                ["4xx", "Client errors"],
                ["5xx", "Server errors"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  size="xs"
                  variant={requestLogFilter === value ? "solid" : "outline"}
                  colorScheme={requestLogFilter === value ? "blue" : "gray"}
                  onClick={() => {
                    setRequestLogPage(1);
                    setRequestLogFilter(value);
                  }}
                >
                  {label}
                </Button>
              ))}
            </HStack>

            <Box as="form" onSubmit={submitRequestLogSearch} mt={3}>
              <Flex gap={2} wrap="wrap">
                <Input
                  aria-label="Search failed requests by request ID or user ID"
                  placeholder="Search by request ID or user ID"
                  value={requestLogId}
                  onChange={(event) => setRequestLogId(event.target.value)}
                  maxW={{ base: "100%", md: "420px" }}
                />
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={requestLogsLoading}
                  isDisabled={!requestLogId.trim()}
                >
                  Search by ID
                </Button>
                {requestLogSearchId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearRequestLogSearch}
                  >
                    Clear
                  </Button>
                ) : null}
              </Flex>
            </Box>

            {requestLogsError ? (
              <Alert status="error" borderRadius="lg" mt={3}>
                <AlertIcon />
                <AlertDescription>{requestLogsError}</AlertDescription>
              </Alert>
            ) : requestLogsLoading && requestLogs.length === 0 ? (
              <Flex align="center" gap={2} py={6}>
                <Spinner size="sm" color="blue.500" />
                <Text fontSize="sm" color="gray.500">
                  Loading request logs…
                </Text>
              </Flex>
            ) : sortedRequestLogs.length ? (
              <>
                <TableContainer
                  mt={4}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  whiteSpace="normal"
                >
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Date and time</Th>
                        <Th>Status</Th>
                        <Th>Request</Th>
                        <Th>User</Th>
                        <Th isNumeric>Duration</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedRequestLogs.map((entry) => {
                        const requestUser = Array.isArray(entry.users)
                          ? entry.users[0]
                          : entry.users;
                        const statusColor =
                          entry.status_code >= 500 ? "red" : "yellow";
                        const rowColor =
                          entry.status_code >= 500 ? "red" : "yellow";
                        return (
                          <Tr
                            key={entry.id}
                            bg={`${rowColor}.50`}
                            borderLeft="4px solid"
                            borderColor={`${rowColor}.300`}
                            _hover={{ bg: `${rowColor}.100` }}
                            transition="background-color 0.15s ease"
                          >
                            <Td whiteSpace="nowrap" color="gray.600">
                              {formatDate(entry.created_at)}
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={statusColor}
                                borderRadius="full"
                                px={2}
                                py={1}
                              >
                                {entry.status_code}
                              </Badge>
                            </Td>
                            <Td minW="240px" maxW="380px">
                              <Text
                                fontSize="sm"
                                fontWeight="700"
                                wordBreak="break-all"
                              >
                                {entry.method} {entry.path}
                              </Text>
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {entry.error_code || "Request failed"}
                              </Text>
                              <Text
                                fontSize="xs"
                                color="gray.400"
                                mt={1}
                                wordBreak="break-all"
                              >
                                Request ID: {entry.request_id}
                              </Text>
                              {entry.attempted_email ? (
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  mt={1}
                                  wordBreak="break-all"
                                >
                                  Email tried: {entry.attempted_email}
                                </Text>
                              ) : null}
                            </Td>
                            <Td minW="160px">
                              <Text fontSize="sm">
                                {requestUser?.name ||
                                  requestUser?.email ||
                                  entry.user_role ||
                                  "Unauthenticated"}
                              </Text>
                              {entry.user_id ? (
                                <Text
                                  fontSize="xs"
                                  color="gray.400"
                                  mt={1}
                                  wordBreak="break-all"
                                >
                                  User ID: {entry.user_id}
                                </Text>
                              ) : null}
                            </Td>
                            <Td isNumeric whiteSpace="nowrap">
                              {entry.duration_ms ?? "—"} ms
                            </Td>
                            <Td>
                              {entry.user_id &&
                              (entry.is_current_user ||
                                isCurrentUserId(
                                  entry.user_id,
                                  currentUserIds,
                                )) ? (
                                <HStack spacing={1} color="gray.500">
                                  <Icon as={FiCheck} aria-hidden="true" />
                                  <Text fontSize="xs">You</Text>
                                </HStack>
                              ) : entry.user_id ? (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<Icon as={FiMessageCircle} />}
                                  onClick={() => messageRequestUser(entry)}
                                >
                                  Message user
                                </Button>
                              ) : (
                                <Text fontSize="xs" color="gray.400">
                                  —
                                </Text>
                              )}
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
                  mt={3}
                  wrap="wrap"
                >
                  <Text fontSize="sm" color="gray.500">
                    Showing {(requestLogPage - 1) * requestLogsPerPage + 1}–
                    {Math.min(
                      requestLogPage * requestLogsPerPage,
                      sortedRequestLogs.length,
                    )}{" "}
                    of {sortedRequestLogs.length} loaded requests
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={FiChevronLeft} />}
                      onClick={() =>
                        setRequestLogPage((page) => Math.max(1, page - 1))
                      }
                      isDisabled={requestLogPage <= 1 || requestLogsLoading}
                    >
                      Previous
                    </Button>
                    <Text fontSize="sm" color="gray.600">
                      Page {requestLogPage} of {requestLogPageCount}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      rightIcon={<Icon as={FiChevronRight} />}
                      onClick={() =>
                        setRequestLogPage((page) =>
                          Math.min(requestLogPageCount, page + 1),
                        )
                      }
                      isDisabled={
                        requestLogPage >= requestLogPageCount ||
                        requestLogsLoading
                      }
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              </>
            ) : (
              <Text mt={4} fontSize="sm" color="gray.500">
                No failed requests recorded for this filter.
              </Text>
            )}
            <Text fontSize="xs" color="gray.400" mt={3}>
              Showing up to 100 most recent failed requests. Use the request ID
              to correlate an entry with server logs.
            </Text>
          </CardBody>
        </Card>
      ) : null}

      {showingConfigurationHistory ? (
        <Card className="control-card settings-history-card">
          <CardBody>
            <Heading size="sm">Configuration history</Heading>
            <Text className="control-description">
              Recent changes made to Support Control Center settings.
            </Text>
            {history.length ? (
              <VStack align="stretch" spacing={0} mt={4} divider={<Divider />}>
                {history.map((entry) => (
                  <Flex
                    key={entry.id}
                    justify="space-between"
                    align="flex-start"
                    gap={4}
                    py={3}
                    wrap="wrap"
                  >
                    <Box>
                      <Text fontSize="sm" fontWeight="700">
                        {entry.action}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {entry.users?.name ||
                          entry.users?.email ||
                          "Platform administrator"}
                      </Text>
                    </Box>
                    <Text fontSize="xs" color="gray.500">
                      {formatDate(entry.created_at)}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            ) : (
              <Text mt={4} fontSize="sm" color="gray.500">
                No settings changes recorded yet.
              </Text>
            )}
          </CardBody>
        </Card>
      ) : null}
    </Box>
  );
};

export default Settings;
