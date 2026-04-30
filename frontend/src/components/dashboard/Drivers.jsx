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
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@chakra-ui/react";

const Drivers = () => {
  const [search, setSearch] = useState("");

  const [drivers, setDrivers] = useState([
    {
      id: 1,
      name: "John Mokoena",
      status: "Active",
      fleetOwner: "SafeWay Transport",
      vehicle: "Bus 12 - Toyota Hiace",
      students: 18,
    },
    {
      id: 2,
      name: "Peter Dlamini",
      status: "Suspended",
      fleetOwner: "City Kids Transport",
      vehicle: "Bus 3 - Nissan NV350",
      students: 12,
    },
  ]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [message, setMessage] = useState("");

  // ================= MESSAGE =================
  const openMessage = (driver) => {
    setSelectedDriver(driver);
    setMessage("");
    onOpen();
  };

  const sendMessage = () => {
    console.log("Message to:", selectedDriver.name);
    console.log("Message:", message);
    onClose();
  };

  // ================= SUSPEND TOGGLE =================
  const toggleStatus = (id) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status:
                d.status === "Active"
                  ? "Suspended"
                  : "Active",
            }
          : d
      )
    );
  };

  return (
    <Box p={6}>

      {/* HEADER */}
      <Box mb={6}>
        <Heading>Drivers Monitoring</Heading>
        <Text color="gray.600">
          Monitor driver activity, status, and assignments
        </Text>
      </Box>

      {/* SEARCH */}
      <Input
        placeholder="Search driver..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        bg="white"
        mb={6}
      />

      {/* DRIVER LIST */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>

        {drivers
          .filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
          )
          .map((driver) => (
            <Card key={driver.id} borderRadius="xl" boxShadow="sm">

              <CardBody>

                {/* HEADER */}
                <Flex justify="space-between" mb={4}>
                  <HStack>
                    <Avatar name={driver.name} />
                    <Box>
                      <Heading size="sm">{driver.name}</Heading>

                      <Badge
                        colorScheme={
                          driver.status === "Active"
                            ? "green"
                            : "red"
                        }
                      >
                        {driver.status}
                      </Badge>
                    </Box>
                  </HStack>
                </Flex>

                {/* INFO */}
                <VStack align="start" spacing={2}>
                  <Text>🚛 Fleet Owner: <b>{driver.fleetOwner}</b></Text>
                  <Text>🚌 Vehicle: <b>{driver.vehicle}</b></Text>
                  <Text>👨‍👩‍👧 Students Affected: <b>{driver.students}</b></Text>
                </VStack>

                {/* ACTIONS */}
                <HStack mt={4} wrap="wrap">

                  <Button size="sm" colorScheme="blue">
                    View
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMessage(driver)}
                  >
                    Message
                  </Button>

                  <Button
                    size="sm"
                    colorScheme={
                      driver.status === "Active" ? "red" : "green"
                    }
                    onClick={() => toggleStatus(driver.id)}
                  >
                    {driver.status === "Active"
                      ? "Suspend"
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
            Message {selectedDriver?.name}
          </ModalHeader>

          <ModalBody>
            <Textarea
              placeholder="Type message to driver..."
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

export default Drivers;