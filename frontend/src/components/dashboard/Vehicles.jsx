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
  SimpleGrid,
  Card,
  CardBody,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@chakra-ui/react";

const Vehicles = () => {
  const [search, setSearch] = useState("");

  const [vehicles, setVehicles] = useState([
    {
      id: 1,
      name: "Bus 12 - Toyota Hiace",
      status: "Active",
      driver: "John Mokoena",
      fleetOwner: "SafeWay Transport",
      students: 18,
      route: "Town → School A",
    },
    {
      id: 2,
      name: "Bus 3 - Nissan NV350",
      status: "Maintenance",
      driver: "Peter Dlamini",
      fleetOwner: "City Kids Transport",
      students: 0,
      route: "Depot",
    },
  ]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [message, setMessage] = useState("");

  // ================= MESSAGE =================
  const openMessage = (vehicle) => {
    setSelectedVehicle(vehicle);
    setMessage("");
    onOpen();
  };

  const sendMessage = () => {
    console.log("Message about vehicle:", selectedVehicle.name);
    console.log("Message:", message);
    onClose();
  };

  // ================= TOGGLE STATUS =================
  const toggleStatus = (id) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status:
                v.status === "Active"
                  ? "Maintenance"
                  : "Active",
            }
          : v
      )
    );
  };

  return (
    <Box p={6}>

      {/* HEADER */}
      <Box mb={6}>
        <Heading>Vehicle Monitoring</Heading>
        <Text color="gray.600">
          Monitor fleet safety, availability and usage
        </Text>
      </Box>

      {/* SEARCH */}
      <Input
        placeholder="Search vehicle..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        bg="white"
        mb={6}
      />

      {/* VEHICLE CARDS */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>

        {vehicles
          .filter((v) =>
            v.name.toLowerCase().includes(search.toLowerCase())
          )
          .map((vehicle) => (
            <Card key={vehicle.id} borderRadius="xl" boxShadow="sm">

              <CardBody>

                {/* HEADER */}
                <Flex justify="space-between" mb={4}>
                  <Heading size="sm">{vehicle.name}</Heading>

                  <Badge
                    colorScheme={
                      vehicle.status === "Active"
                        ? "green"
                        : vehicle.status === "Maintenance"
                        ? "orange"
                        : "red"
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </Flex>

                {/* DETAILS */}
                <VStack align="start" spacing={2}>
                  <Text>👨‍✈️ Driver: <b>{vehicle.driver}</b></Text>
                  <Text>🚛 Fleet Owner: <b>{vehicle.fleetOwner}</b></Text>
                  <Text>👨‍👩‍👧 Students: <b>{vehicle.students}</b></Text>
                  <Text>📍 Route: <b>{vehicle.route}</b></Text>
                </VStack>

                {/* ACTIONS */}
                <HStack mt={4} wrap="wrap">

                  <Button size="sm" colorScheme="blue">
                    View
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMessage(vehicle)}
                  >
                    Message Driver
                  </Button>

                  <Button
                    size="sm"
                    colorScheme={
                      vehicle.status === "Active"
                        ? "red"
                        : "green"
                    }
                    onClick={() => toggleStatus(vehicle.id)}
                  >
                    {vehicle.status === "Active"
                      ? "Take Offline"
                      : "Activate"}
                  </Button>

                </HStack>

              </CardBody>

            </Card>
          ))}

      </SimpleGrid>

      {/* ================= MESSAGE MODAL ================= */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />

        <ModalContent>
          <ModalHeader>
            Message about {selectedVehicle?.name}
          </ModalHeader>

          <ModalBody>
            <Textarea
              placeholder="Type message to driver or fleet owner..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button
              colorScheme="green"
              ml={3}
              onClick={sendMessage}
              isDisabled={!message}
            >
              Send
            </Button>
          </ModalFooter>

        </ModalContent>
      </Modal>

    </Box>
  );
};

export default Vehicles;