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
  Textarea,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";

const Requests = () => {
  const [search, setSearch] = useState("");

  const [requests, setRequests] = useState([
    {
      id: 1,
      title: "Bus arrived late",
      type: "Parent",
      message: "Bus was 30 minutes late this morning.",
      status: "Pending",
      priority: "High",
    },
    {
      id: 2,
      title: "Vehicle breakdown",
      type: "Driver",
      message: "Bus 12 broke down on Route A.",
      status: "Urgent",
      priority: "Critical",
    },
    {
      id: 3,
      title: "Change pickup point",
      type: "Parent",
      message: "Please change pickup to gate 3.",
      status: "Resolved",
      priority: "Low",
    },
  ]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [response, setResponse] = useState("");

  // ================= OPEN REQUEST =================
  const openRequest = (req) => {
    setSelectedRequest(req);
    setResponse("");
    onOpen();
  };

  // ================= RESPOND =================
  const sendResponse = () => {
    console.log("Responding to:", selectedRequest.title);
    console.log("Response:", response);
    onClose();
  };

  // ================= UPDATE STATUS =================
  const updateStatus = (id, newStatus) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: newStatus } : r
      )
    );
  };

  return (
    <Box p={6}>

      {/* HEADER */}
      <Box mb={6}>
        <Heading>Support Requests</Heading>
        <Text color="gray.600">
          Handle complaints, incidents, and support tickets
        </Text>
      </Box>

      {/* SEARCH */}
      <Input
        placeholder="Search requests..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        bg="white"
        mb={6}
      />

      {/* REQUEST LIST */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>

        {requests
          .filter((r) =>
            r.title.toLowerCase().includes(search.toLowerCase())
          )
          .map((req) => (
            <Card key={req.id} borderRadius="xl" boxShadow="sm">

              <CardBody>

                {/* HEADER */}
                <Flex justify="space-between" mb={3}>
                  <Heading size="sm">{req.title}</Heading>

                  <Badge
                    colorScheme={
                      req.status === "Resolved"
                        ? "green"
                        : req.status === "Urgent"
                        ? "red"
                        : "yellow"
                    }
                  >
                    {req.status}
                  </Badge>
                </Flex>

                {/* DETAILS */}
                <VStack align="start" spacing={2}>
                  <Text>📌 Type: <b>{req.type}</b></Text>
                  <Text>⚡ Priority: <b>{req.priority}</b></Text>
                  <Text color="gray.600">{req.message}</Text>
                </VStack>

                {/* ACTIONS */}
                <HStack mt={4} wrap="wrap">

                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => openRequest(req)}
                  >
                    View / Respond
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() =>
                      updateStatus(req.id, "Resolved")
                    }
                  >
                    Resolve
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() =>
                      updateStatus(req.id, "Urgent")
                    }
                  >
                    Escalate
                  </Button>

                </HStack>

              </CardBody>

            </Card>
          ))}

      </SimpleGrid>

      {/* ================= RESPONSE MODAL ================= */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />

        <ModalContent>

          <ModalHeader>
            Respond to Request
          </ModalHeader>

          <ModalBody>

            <Text mb={2}>
              <b>{selectedRequest?.title}</b>
            </Text>

            <Text mb={4} color="gray.600">
              {selectedRequest?.message}
            </Text>

            <Textarea
              placeholder="Write response to user..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />

          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button
              colorScheme="green"
              ml={3}
              onClick={sendResponse}
              isDisabled={!response}
            >
              Send Response
            </Button>
          </ModalFooter>

        </ModalContent>
      </Modal>

    </Box>
  );
};

export default Requests;