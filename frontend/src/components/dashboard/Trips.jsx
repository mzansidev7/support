import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  Input,
  Button,
  HStack,
  VStack,
  Badge,
  Avatar,
  SimpleGrid,
  Card,
  CardBody,
  Select,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@chakra-ui/react";

const Trips = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [incident, setIncident] = useState("");

  const trips = [
    {
      id: 1,
      route: "Route A - Town → School",
      driver: "John Mokoena",
      vehicle: "Bus 12",
      students: 18,
      status: "Active",
    },
    {
      id: 2,
      route: "Route B - Suburb Loop",
      driver: "Peter Dlamini",
      vehicle: "Bus 3",
      students: 12,
      status: "Delayed",
    },
    {
      id: 3,
      route: "Route C - North Zone",
      driver: "Sarah Nkosi",
      vehicle: "Bus 7",
      students: 20,
      status: "Completed",
    },
  ];

  const openIncident = (trip) => {
    setSelectedTrip(trip);
    setIncident("");
    onOpen();
  };

  const submitIncident = () => {
    console.log("Incident reported for:", selectedTrip.route);
    console.log("Details:", incident);
    onClose();
  };

  const filteredTrips = trips.filter((t) => {
    const matchesSearch = t.route
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ? true : t.status === filter;

    return matchesSearch && matchesFilter;
  });

  return (
    <Box p={6}>

      {/* HEADER */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading>Trips Monitoring</Heading>
          <Text color="gray.600">
            Live overview of all transport trips
          </Text>
        </Box>
      </Flex>

      {/* SEARCH + FILTER */}
      <HStack mb={6} spacing={4}>
        <Input
          placeholder="Search route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          bg="white"
        />

        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          bg="white"
          w="200px"
        >
          <option>All</option>
          <option>Active</option>
          <option>Delayed</option>
          <option>Completed</option>
        </Select>
      </HStack>

      {/* TRIP CARDS */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>

        {filteredTrips.map((trip) => (
          <Card key={trip.id} borderRadius="xl" boxShadow="sm">

            <CardBody>

              {/* HEADER */}
              <Flex justify="space-between" mb={4}>
                <Heading size="sm">{trip.route}</Heading>

                <Badge
                  colorScheme={
                    trip.status === "Active"
                      ? "green"
                      : trip.status === "Delayed"
                      ? "red"
                      : "blue"
                  }
                >
                  {trip.status}
                </Badge>
              </Flex>

              {/* DETAILS */}
              <VStack align="start" spacing={2}>
                <Text>🧑‍✈️ Driver: <b>{trip.driver}</b></Text>
                <Text>🚌 Vehicle: <b>{trip.vehicle}</b></Text>
                <Text>👨‍👩‍👧 Students: <b>{trip.students}</b></Text>
              </VStack>

              {/* ACTIONS */}
              <HStack mt={4} wrap="wrap">

                <Button size="sm" colorScheme="blue">
                  View
                </Button>

                <Button size="sm" variant="outline">
                  Message Driver
                </Button>

                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => openIncident(trip)}
                >
                  Report Issue
                </Button>

              </HStack>

            </CardBody>

          </Card>
        ))}

      </SimpleGrid>

      {/* ================= INCIDENT MODAL ================= */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>
            Report Incident
          </ModalHeader>

          <ModalBody>

            <Text mb={2}>
              Trip: <b>{selectedTrip?.route}</b>
            </Text>

            <Textarea
              placeholder="Describe the issue (delay, breakdown, accident...)"
              value={incident}
              onChange={(e) => setIncident(e.target.value)}
            />

          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button
              colorScheme="red"
              ml={3}
              onClick={submitIncident}
              isDisabled={!incident}
            >
              Submit
            </Button>
          </ModalFooter>

        </ModalContent>
      </Modal>

    </Box>
  );
};

export default Trips;