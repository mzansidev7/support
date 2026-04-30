import React from "react";
import {
    Box,
    Heading,
    Text,
    Grid,
    Badge,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    VStack,
    HStack,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText
} from "@chakra-ui/react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid
} from "recharts";
/* ================= MOCK DATA ================= */

const barData = [
    { name: "Drivers", value: 24 },
    { name: "Trips", value: 8 },
    { name: "Vehicles", value: 12 },
    { name: "Alerts", value: 3 }
];

const lineData = [
    { day: "Mon", trips: 5 },
    { day: "Tue", trips: 7 },
    { day: "Wed", trips: 6 },
    { day: "Thu", trips: 9 },
    { day: "Fri", trips: 12 }
];

const trips = [
    { id: "TR-101", driver: "John", status: "On Time", eta: "08:10" },
    { id: "TR-102", driver: "Sipho", status: "Delayed", eta: "08:25" },
    { id: "TR-103", driver: "Thabo", status: "On Time", eta: "08:05" }
];

const incidents = [
    "🚨 Route 4 delay reported",
    "⚠️ Vehicle VH-11 low fuel",
    "🚨 Driver late pickup - TR-102"
];

const vehicleHealth = [
    { name: "VH-11", status: "Warning" },
    { name: "VH-12", status: "Healthy" },
    { name: "VH-13", status: "Critical" }
];

const actions = [
    "You suspended Driver John",
    "You resolved Request #202",
    "You updated Route 4 schedule"
];

/* ================= DASHBOARD ================= */

const Dashboard = () => {
    return (
        <Box p={6} bg="gray.50" minH="100vh">
            {/* ================= KPI STRIP ================= */}
            <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={6}>
                <KPI title="On-Time Rate" value="92%" />
                <KPI title="Active Routes" value="14" />
                <KPI title="Delayed Trips" value="3" />
                <KPI title="Incidents" value="1" />
            </Grid>

            {/* ================= INCIDENT FEED ================= */}
            <Box bg="white" p={5} borderRadius="xl" mb={6}>
                <Heading size="sm" mb={3}>
                    Live Incidents
                </Heading>
                <VStack align="start">
                    {incidents.map((i, idx) => (
                        <Text key={idx}>{i}</Text>
                    ))}
                </VStack>
            </Box>

            {/* ================= ACTIVE TRIPS ================= */}
            <Box bg="white" p={5} borderRadius="xl" mb={6}>
                <Heading size="sm" mb={3}>
                    Active Trips
                </Heading>

                <Table size="sm">
                    <Thead>
                        <Tr>
                            <Th>Trip</Th>
                            <Th>Driver</Th>
                            <Th>Status</Th>
                            <Th>ETA</Th>
                        </Tr>
                    </Thead>

                    <Tbody>
                        {trips.map(t => (
                            <Tr key={t.id}>
                                <Td>{t.id}</Td>
                                <Td>{t.driver}</Td>
                                <Td>
                                    <Badge
                                        colorScheme={
                                            t.status === "On Time"
                                                ? "green"
                                                : "red"
                                        }
                                    >
                                        {t.status}
                                    </Badge>
                                </Td>
                                <Td>{t.eta}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>

            {/* ================= VEHICLE HEALTH ================= */}
            <Box bg="white" p={5} borderRadius="xl" mb={6}>
                <Heading size="sm" mb={3}>
                    Vehicle Health
                </Heading>

                <HStack spacing={4}>
                    {vehicleHealth.map(v => (
                        <Badge
                            key={v.name}
                            colorScheme={
                                v.status === "Healthy"
                                    ? "green"
                                    : v.status === "Warning"
                                      ? "yellow"
                                      : "red"
                            }
                            p={2}
                        >
                            {v.name} - {v.status}
                        </Badge>
                    ))}
                </HStack>
            </Box>

            {/* ================= CHARTS ================= */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
                {/* BAR */}
                <Box bg="white" p={5} borderRadius="xl">
                    <Heading size="sm" mb={4}>
                        System Overview
                    </Heading>

                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3182CE" />
                        </BarChart>
                    </ResponsiveContainer>
                </Box>

                {/* LINE */}
                <Box bg="white" p={5} borderRadius="xl">
                    <Heading size="sm" mb={4}>
                        Weekly Trips
                    </Heading>

                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="trips"
                                stroke="#38A169"
                                strokeWidth={3}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </SimpleGrid>

            {/* ================= RECENT ACTIONS ================= */}
            <Box bg="white" p={5} borderRadius="xl">
                <Heading size="sm" mb={3}>
                    Recent Support Actions
                </Heading>
                <VStack align="start">
                    {actions.map((a, i) => (
                        <Text key={i}>{a}</Text>
                    ))}
                </VStack>
            </Box>
        </Box>
    );
};

export default Dashboard;

/* ================= KPI ================= */

const KPI = ({ title, value }) => (
    <Box bg="white" p={4} borderRadius="xl">
        <Stat>
            <StatLabel>{title}</StatLabel>
            <StatNumber>{value}</StatNumber>
            <StatHelpText>Live data</StatHelpText>
        </Stat>
    </Box>
);
