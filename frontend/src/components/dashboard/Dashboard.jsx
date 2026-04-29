import React, { useState } from "react";
import {
  Box,
  Flex,
  Grid,
  Text,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  VStack,
  HStack,
  Badge,
  Icon,
  Avatar,
  Input,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
} from "@chakra-ui/react";

import {
  FiUsers,
  FiTruck,
  FiAlertCircle,
  FiMap,
  FiMenu,
  FiBell,
} from "react-icons/fi";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex minH="100vh" bg="gray.100">

      {/* ================= DESKTOP SIDEBAR ================= */}
      <Box
        w="260px"
        bg="white"
        p={6}
        display={{ base: "none", md: "block" }}
        boxShadow="md"
      >
        <Heading size="md" mb={8}>
          🚍 Track My Kid
        </Heading>

        <VStack align="start" spacing={3}>
          <NavItem label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem label="Drivers" active={activeTab === "drivers"} onClick={() => setActiveTab("drivers")} />
          <NavItem label="Trips" active={activeTab === "trips"} onClick={() => setActiveTab("trips")} />
          <NavItem label="Vehicles" active={activeTab === "vehicles"} onClick={() => setActiveTab("vehicles")} />
          <NavItem label="Requests" active={activeTab === "requests"} onClick={() => setActiveTab("requests")} />
          <NavItem label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </VStack>
      </Box>

      {/* ================= MAIN AREA ================= */}
      <Box flex="1">

        {/* ================= TOP NAVBAR ================= */}
        <Flex
          bg="white"
          px={6}
          py={4}
          justify="space-between"
          align="center"
          boxShadow="sm"
        >
          <HStack spacing={3}>
            {/* Mobile menu button */}
            <Icon
              as={FiMenu}
              boxSize={6}
              cursor="pointer"
              onClick={onOpen}
            />

            <Heading size="md">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </Heading>
          </HStack>

          <HStack spacing={4}>
            <Input placeholder="Search..." size="sm" w="180px" />
            <Icon as={FiBell} boxSize={5} />
            <Badge colorScheme="green">Online</Badge>
            <Avatar size="sm" name="Admin" />
          </HStack>
        </Flex>

        {/* ================= CONTENT ================= */}
        <Box p={6}>

          {/* Header */}
          <Box mb={6}>
            <Heading size="lg">Welcome back 👋</Heading>
            <Text color="gray.600">
              Monitor your school transport system in real time
            </Text>
          </Box>

          {/* Stats */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6}>

            <StatCard title="Drivers" value="24" help="+2 this week" icon={FiUsers} />
            <StatCard title="Active Trips" value="8" help="Running now" icon={FiMap} />
            <StatCard title="Vehicles" value="12" help="Tracked" icon={FiTruck} />
            <StatCard title="Alerts" value="3" help="Needs attention" icon={FiAlertCircle} />

          </Grid>

          {/* Activity */}
          <Box mt={10}>
            <Heading size="md" mb={4}>
              Recent Activity
            </Heading>

            <VStack spacing={4} align="stretch">
              <ActivityItem text="Driver John started Trip #TR-102" />
              <ActivityItem text="Vehicle VH-11 arrived at School A" />
              <ActivityItem text="Delay reported on Route 4" />
            </VStack>
          </Box>

        </Box>
      </Box>

      {/* ================= MOBILE SIDEBAR (DRAWER) ================= */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />

          <DrawerBody mt={10}>
            <VStack align="start" spacing={4}>
              <NavItem label="Dashboard" onClick={onClose} />
              <NavItem label="Drivers" onClick={onClose} />
              <NavItem label="Trips" onClick={onClose} />
              <NavItem label="Vehicles" onClick={onClose} />
              <NavItem label="Requests" onClick={onClose} />
              <NavItem label="Settings" onClick={onClose} />
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

    </Flex>
  );
};

export default Dashboard;

/* ================= NAV ITEM ================= */
const NavItem = ({ label, active, onClick }) => (
  <Button
    w="100%"
    justifyContent="flex-start"
    variant={active ? "solid" : "ghost"}
    colorScheme={active ? "blue" : "gray"}
    onClick={onClick}
  >
    {label}
  </Button>
);

/* ================= STAT CARD ================= */
const StatCard = ({ title, value, help, icon }) => (
  <Box
    p={5}
    bg="white"
    borderRadius="xl"
    boxShadow="sm"
    _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
    transition="0.2s"
  >
    <Flex justify="space-between" align="center">
      <Box>
        <Stat>
          <StatLabel>{title}</StatLabel>
          <StatNumber>{value}</StatNumber>
          <StatHelpText>{help}</StatHelpText>
        </Stat>
      </Box>

      <Box p={3} bg="blue.50" borderRadius="full">
        <Icon as={icon} boxSize={5} color="blue.500" />
      </Box>
    </Flex>
  </Box>
);

/* ================= ACTIVITY ITEM ================= */
const ActivityItem = ({ text }) => (
  <Box p={4} bg="white" borderRadius="lg" boxShadow="sm">
    <Text>{text}</Text>
  </Box>
);