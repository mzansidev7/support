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
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiBell,
  FiCheck,
  FiClock,
  FiLock,
  FiRefreshCw,
  FiSave,
  FiZap,
} from "react-icons/fi";
import { supabaseClient } from "../../supabaseClient/supabase.config";
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
  ["urgentTickets", "Urgent tickets", "Notify when a ticket has urgent priority."],
  ["unassignedTickets", "Unassigned tickets", "Alert on tickets that need an owner."],
  ["urgentIncidents", "Urgent or escalated incidents", "Alert on urgent incidents and automatic escalations."],
  ["unassignedIncidents", "Unassigned incidents", "Alert when an incident has no owner."],
  ["responseDeadlines", "Response deadlines", "Show response deadlines approaching or overdue."],
  ["resolutionDeadlines", "Resolution deadlines", "Show resolution deadlines approaching or overdue."],
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
  if (!token) throw new Error("Your session has expired. Please sign in again.");
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
    throw new Error(data.message || data.error || "Unable to load support settings.");
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
          <span className="control-icon"><Icon as={FiClock} /></span>
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
                      onChange(key, target, event.target.value === "" ? "" : Number(event.target.value))
                    }
                  />
                  <Text className="sla-input-suffix">hours</Text>
                </FormControl>
              ))}
            </Box>
          ))}
        </Box>
        <Text className="control-footnote">
          Targets apply to open requests immediately. Minimum 15 minutes; maximum 30 days.
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
              Role permissions are enforced by the server and are intentionally not editable here.
            </Text>
          </Box>
          <span className="control-icon"><Icon as={FiLock} /></span>
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
                  {(Array.isArray(capabilities) ? capabilities : []).map((capability) => (
                    <HStack key={capability} align="flex-start" spacing={2}>
                      <Icon as={FiCheck} color="green.500" mt="2px" />
                      <Text fontSize="xs" color="gray.600" lineHeight="1.5">
                        {capability}
                      </Text>
                    </HStack>
                  ))}
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
  const user = useMemo(readUser, []);
  const isSuperAdmin = user?.admin_profile?.admin_role === "super_admin";
  const [settings, setSettings] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("checking");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setError(requestError.message || "Unable to load Support Control Center settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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
        () => {},
      )
      .subscribe((status, subscriptionError) => {
        if (subscriptionError) {
          setRealtimeStatus("error");
          return;
        }
        setRealtimeStatus(status === "SUBSCRIBED" ? "healthy" : "checking");
      });
    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [user?.id]);

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
      setSuccess("Support settings saved. Active request deadlines have been recalculated.");
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
          <AlertDescription>{error || "Support settings are unavailable."}</AlertDescription>
        </Alert>
        <Button mt={4} leftIcon={<Icon as={FiRefreshCw} />} onClick={loadSettings}>
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
        title="Support Control Center"
        description="Configure service targets, escalation behavior, and operational alerts."
        meta={
          <Text className="settings-updated">
            <Icon as={FiActivity} /> Last saved: {formatDate(updatedAt)}
          </Text>
        }
        actions={
          <HStack>
          <Button
            variant="outline"
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadSettings}
            isLoading={loading}
          >
            Refresh
          </Button>
          {isSuperAdmin ? (
            <>
              <Button variant="ghost" onClick={discardChanges} isDisabled={!settings || saving}>
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
          <AlertDescription>Settings are view-only. Only a super admin can change system controls.</AlertDescription>
        </Alert>
      ) : null}

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
        <SlaCard
          title="Ticket service targets"
          description="Set first-response and resolution targets for each ticket priority."
          levels={ticketLevels}
          settings={settings.ticketSlaHours}
          onChange={(level, target, value) => updateSla("ticketSlaHours", level, target, value)}
        />
        <SlaCard
          title="Incident service targets"
          description="Set first-response and resolution targets for each incident severity."
          levels={incidentLevels}
          settings={settings.incidentSlaHours}
          onChange={(level, target, value) => updateSla("incidentSlaHours", level, target, value)}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
        <Card className="control-card">
          <CardBody>
            <HStack justify="space-between" align="flex-start">
              <Box>
                <Heading size="sm">Escalation policy</Heading>
                <Text className="control-description">
                  Automatically flag high-severity incidents and set the alert horizon.
                </Text>
              </Box>
              <span className="control-icon"><Icon as={FiZap} /></span>
            </HStack>
            <HStack justify="space-between" py={4} mt={3} borderBottom="1px solid" borderColor="gray.100">
              <Box>
                <Text fontSize="sm" fontWeight="700">Automatic incident escalation</Text>
                <Text fontSize="xs" color="gray.500">Escalate incidents that meet the severity threshold.</Text>
              </Box>
              <Switch
                colorScheme="blue"
                isChecked={settings.escalation.enabled}
                isDisabled={!isSuperAdmin}
                onChange={(event) => updateEscalation("enabled", event.target.checked)}
              />
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Escalate at severity</FormLabel>
                <select
                  className="settings-native-select"
                  value={settings.escalation.incidentSeverityThreshold}
                  disabled={!isSuperAdmin || !settings.escalation.enabled}
                  onChange={(event) => updateEscalation("incidentSeverityThreshold", event.target.value)}
                >
                  {incidentLevels.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Deadline alert window</FormLabel>
                <HStack>
                  <Input
                    type="number"
                    min={1}
                    max={72}
                    value={settings.escalation.alertWindowHours}
                    isDisabled={!isSuperAdmin}
                    onChange={(event) =>
                      updateEscalation("alertWindowHours", event.target.value === "" ? "" : Number(event.target.value))
                    }
                  />
                  <Text color="gray.500" fontSize="sm">hours</Text>
                </HStack>
              </FormControl>
            </SimpleGrid>
            <VStack align="stretch" spacing={0} mt={4} divider={<Divider />}>
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
                <HStack key={key} justify="space-between" spacing={4} py={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="600">{title}</Text>
                    <Text fontSize="xs" color="gray.500">{description}</Text>
                  </Box>
                  <Switch
                    colorScheme="blue"
                    isChecked={settings.escalation[key]}
                    isDisabled={!isSuperAdmin || !settings.escalation.enabled}
                    onChange={(event) => updateEscalation(key, event.target.checked)}
                  />
                </HStack>
              ))}
            </VStack>
            <Divider my={5} />
            <Text fontSize="sm" fontWeight="700">Alert recipients</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>Choose which support staff and platform admin roles receive alerts.</Text>
            <Text fontSize="xs" fontWeight="700" color="gray.600" mt={4} mb={2}>SUPPORT STAFF</Text>
            <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
              {supportRoles.map(([role, label]) => (
                <Checkbox
                  key={role}
                  size="sm"
                  colorScheme="blue"
                  isChecked={settings.escalation.supportRoles.includes(role)}
                  isDisabled={!isSuperAdmin}
                  onChange={(event) => updateRecipients("supportRoles", role, event.target.checked)}
                >
                  {label}
                </Checkbox>
              ))}
            </SimpleGrid>
            <Text fontSize="xs" fontWeight="700" color="gray.600" mt={4} mb={2}>PLATFORM ADMINS</Text>
            <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
              {adminRoles.map(([role, label]) => (
                <Checkbox
                  key={role}
                  size="sm"
                  colorScheme="blue"
                  isChecked={settings.escalation.platformAdminRoles.includes(role)}
                  isDisabled={!isSuperAdmin}
                  onChange={(event) => updateRecipients("platformAdminRoles", role, event.target.checked)}
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
              <span className="control-icon"><Icon as={FiBell} /></span>
            </HStack>
            <VStack align="stretch" spacing={0} mt={4} divider={<Divider />}>
              {alertRules.map(([key, title, description]) => (
                <HStack key={key} justify="space-between" spacing={4} py={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="600">{title}</Text>
                    <Text fontSize="xs" color="gray.500">{description}</Text>
                  </Box>
                  <Switch
                    colorScheme="blue"
                    isChecked={settings.alerts[key]}
                    isDisabled={!isSuperAdmin}
                    onChange={(event) => updateAlert(key, event.target.checked)}
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
                <Text className="control-description">Live connectivity and service configuration.</Text>
              </Box>
              <span className="control-icon"><Icon as={FiActivity} /></span>
            </HStack>
            <VStack align="stretch" spacing={0} mt={4} divider={<Divider />}>
              {healthItems.map(([label, status]) => (
                <HStack key={label} justify="space-between" py={3}>
                  <Text fontSize="sm" color="gray.700">{label}</Text>
                  <Badge colorScheme={statusColor(status)} borderRadius="full" px={2} py={1}>
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

      <Card className="control-card settings-history-card">
        <CardBody>
          <Heading size="sm">Configuration history</Heading>
          <Text className="control-description">
            Recent changes made to Support Control Center settings.
          </Text>
          {history.length ? (
            <VStack align="stretch" spacing={0} mt={4} divider={<Divider />}>
              {history.map((entry) => (
                <Flex key={entry.id} justify="space-between" align="flex-start" gap={4} py={3} wrap="wrap">
                  <Box>
                    <Text fontSize="sm" fontWeight="700">{entry.action}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {entry.users?.name || entry.users?.email || "Platform administrator"}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="gray.500">{formatDate(entry.created_at)}</Text>
                </Flex>
              ))}
            </VStack>
          ) : (
            <Text mt={4} fontSize="sm" color="gray.500">No settings changes recorded yet.</Text>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default Settings;
