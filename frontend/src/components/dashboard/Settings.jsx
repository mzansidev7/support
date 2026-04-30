import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Switch,
  Button,
  Card,
  CardBody,
  Divider,
  Badge,
  Select,
  Textarea,
} from "@chakra-ui/react";

const Settings = () => {
  const [maxDelay, setMaxDelay] = useState(15);
  const [gpsInterval, setGpsInterval] = useState(10);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [auditLogs, setAuditLogs] = useState(true);
  const [geoFenceEnabled, setGeoFenceEnabled] = useState(true);

  return (
    <Box p={6}>

      {/* HEADER */}
      <Box mb={6}>
        <Heading>Support Control Center Settings</Heading>
        <Text color="gray.600">
          Full system configuration for transport safety & operations
        </Text>
      </Box>

      <VStack spacing={6} align="stretch">

        {/* ================= ROLES ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">Role & Permissions</Heading>

            <Text fontSize="sm" color="gray.500" mt={2}>
              Define what support staff can control
            </Text>

            <Select mt={4}>
              <option>Support Agent</option>
              <option>Senior Support</option>
              <option>Supervisor</option>
              <option>System Admin</option>
            </Select>

            <Textarea
              mt={4}
              placeholder="Define permissions (future backend rules)..."
            />
          </CardBody>
        </Card>

        {/* ================= AUTOMATION ENGINE ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">Automation Rules Engine</Heading>

            <FlexRow label="Auto Flag Delayed Trips">
              <Switch defaultChecked />
            </FlexRow>

            <FlexRow label="Auto Suspend After Violations">
              <Switch />
            </FlexRow>

            <FlexRow label="Max Delay Threshold (min)">
              <Input
                type="number"
                value={maxDelay}
                onChange={(e) => setMaxDelay(e.target.value)}
                w="100px"
              />
            </FlexRow>

          </CardBody>
        </Card>

        {/* ================= ESCALATION MATRIX ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">Incident Escalation Matrix</Heading>

            <Text fontSize="sm" color="gray.500" mb={3}>
              Define how incidents escalate in severity
            </Text>

            <VStack align="start">

              <Text>🟡 Delay → Support Agent</Text>
              <Text>🟠 Breakdown → Supervisor</Text>
              <Text>🔴 Accident → Admin + Emergency Contact</Text>

            </VStack>

            <Switch
              mt={4}
              isChecked={autoEscalate}
              onChange={() => setAutoEscalate(!autoEscalate)}
            >
              Enable Auto Escalation
            </Switch>

          </CardBody>
        </Card>

        {/* ================= GEO SAFETY ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">Geo & Route Safety</Heading>

            <FlexRow label="Enable Geo-Fencing Alerts">
              <Switch
                isChecked={geoFenceEnabled}
                onChange={() =>
                  setGeoFenceEnabled(!geoFenceEnabled)
                }
              />
            </FlexRow>

            <FlexRow label="GPS Refresh Interval (sec)">
              <Input
                type="number"
                value={gpsInterval}
                onChange={(e) => setGpsInterval(e.target.value)}
                w="100px"
              />
            </FlexRow>

            <Text fontSize="sm" color="gray.500" mt={2}>
              Detect route deviation and off-route movement
            </Text>

          </CardBody>
        </Card>

        {/* ================= AUDIT LOGS ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">Audit & Activity Logs</Heading>

            <FlexRow label="Enable System Logs">
              <Switch
                isChecked={auditLogs}
                onChange={() => setAuditLogs(!auditLogs)}
              />
            </FlexRow>

            <Text fontSize="sm" color="gray.500" mt={2}>
              Logs all actions: suspensions, messages, alerts
            </Text>

          </CardBody>
        </Card>

        {/* ================= SYSTEM HEALTH ================= */}
        <Card>
          <CardBody>
            <Heading size="sm">System Health</Heading>

            <HStack spacing={3} mt={3}>
              <Badge colorScheme="green">Tracking Active</Badge>
              <Badge colorScheme="green">Alerts Running</Badge>
              <Badge colorScheme="blue">Sync Stable</Badge>
              <Badge colorScheme="purple">AI Rules Ready</Badge>
            </HStack>

          </CardBody>
        </Card>

        {/* SAVE */}
        <Button colorScheme="blue" size="lg">
          Save All Settings
        </Button>

      </VStack>
    </Box>
  );
};

export default Settings;

/* ================= HELPER ================= */
const FlexRow = ({ label, children }) => (
  <HStack justify="space-between" w="100%" mt={3}>
    <Text>{label}</Text>
    {children}
  </HStack>
);