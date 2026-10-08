import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FiFileText,
  FiMessageCircle,
  FiPaperclip,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import "./Drivers.css";
import PageHeader from "./PageHeader";
import { readMessageCache, writeMessageCache } from "./messageCache";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token)
    throw new Error("Your support session has expired. Please sign in again.");
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result.message || result.error || "The request could not be completed.",
    );
  }
  return result;
};

const formatDate = (value) => {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No activity recorded"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const parseMessageAttachment = (content) => {
  try {
    const attachment = JSON.parse(content);
    if (
      attachment?.type === "attachment" &&
      ["image", "audio", "pdf"].includes(attachment.mediaType) &&
      typeof attachment.url === "string" &&
      (attachment.caption === undefined || typeof attachment.caption === "string")
    ) {
      return attachment;
    }
  } catch {
    return null;
  }
  return null;
};

const Drivers = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const cacheScope = `admin:${currentUser?.id || "unknown"}`;

  useEffect(() => {
    if (messages.length && conversationId) {
      writeMessageCache(`${cacheScope}:messages:${conversationId}`, messages);
    }
  }, [cacheScope, conversationId, messages]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/drivers");
      setDrivers(Array.isArray(result) ? result : []);
      writeMessageCache(
        `${cacheScope}:drivers`,
        Array.isArray(result) ? result : [],
      );
    } catch (requestError) {
      console.error("Could not load driver monitoring data:", requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [cacheScope]);

  useEffect(() => {
    const cached = readMessageCache(`${cacheScope}:drivers`);
    if (Array.isArray(cached)) {
      setDrivers(cached);
      setLoading(false);
    }
  }, [cacheScope]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const result = await apiRequest(
        `/admin/driver-conversations/${id}/messages`,
      );
      setMessages(Array.isArray(result) ? result : []);
    } catch (requestError) {
      console.error("Could not refresh driver conversation:", requestError);
      setMessageError(requestError.message);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !conversationId) return undefined;
    const timer = window.setInterval(() => loadMessages(conversationId), 5000);
    return () => window.clearInterval(timer);
  }, [conversationId, isOpen, loadMessages]);

  const filteredDrivers = drivers.filter((driver) => {
    const status = (driver.status || "inactive").toLowerCase();
    const ownerName =
      driver.owner?.company_name || driver.owner?.users?.name || "";
    const searchValue = [
      driver.users?.name,
      driver.users?.email,
      driver.users?.phone,
      driver.vehicle?.name,
      driver.vehicle?.license_plate,
      driver.vehicle_plate_number,
      driver.route?.route_name,
      ownerName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      searchValue.includes(search.trim().toLowerCase()) &&
      (statusFilter === "all" ||
        (statusFilter === "inactive"
          ? status !== "active"
          : status === statusFilter))
    );
  });

  const openConversation = useCallback(async (driver) => {
    setSelectedDriver(driver);
    const cachedConversationId = readMessageCache(
      `${cacheScope}:driver-conversation:${driver.user_id}`,
    );
    setConversationId(cachedConversationId || "");
    setMessages(
      cachedConversationId
        ? readMessageCache(`${cacheScope}:messages:${cachedConversationId}`) || []
        : [],
    );
    setMessageDraft("");
    setSelectedImage(null);
    setMessageError("");
    setConversationLoading(true);
    onOpen();
    try {
      if (!driver.user_id)
        throw new Error("This driver does not have a linked user account.");
      const result = await apiRequest(
        `/admin/drivers/${encodeURIComponent(driver.user_id)}/conversation`,
        { method: "POST", body: JSON.stringify({}) },
      );
      writeMessageCache(
        `${cacheScope}:driver-conversation:${driver.user_id}`,
        result.conversationId,
      );
      setConversationId(result.conversationId);
      await loadMessages(result.conversationId);
    } catch (requestError) {
      console.error("Could not open driver conversation:", requestError);
      setMessageError(requestError.message);
    } finally {
      setConversationLoading(false);
    }
  }, [cacheScope, loadMessages, onOpen]);

  useEffect(() => {
    const targetDriverId = location.state?.openConversationDriverId;
    if (!targetDriverId || loading) return;
    const driver = drivers.find(
      (item) => String(item.user_id) === String(targetDriverId),
    );
    if (!driver) return;
    navigate(location.pathname, { replace: true, state: null });
    void openConversation(driver);
  }, [drivers, loading, location.pathname, location.state, navigate, openConversation]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = messageDraft.trim();
    if ((!content && !selectedImage) || !conversationId) return;
    setSending(true);
    setMessageError("");
    try {
      let messageContent = content;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("file", selectedImage);
        const attachment = await apiRequest(
          `/admin/user-conversations/${encodeURIComponent(conversationId)}/attachments`,
          { method: "POST", body: formData },
        );
        messageContent = JSON.stringify({
          type: "attachment",
          ...attachment,
          caption: content,
        });
      }
      const sentMessage = await apiRequest(
        `/admin/driver-conversations/${encodeURIComponent(conversationId)}/messages`,
        { method: "POST", body: JSON.stringify({ content: messageContent }) },
      );
      setMessages((current) => [...current, sentMessage]);
      setMessageDraft("");
      setSelectedImage(null);
    } catch (requestError) {
      console.error("Could not send message to driver:", requestError);
      setMessageError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const activeCount = drivers.filter(
    (driver) => driver.status?.toLowerCase() === "active",
  ).length;

  return (
    <Box className="support-drivers-page">
      <PageHeader
        eyebrow="FLEET OPERATIONS"
        title="Drivers Monitoring"
        description="Monitor driver activity, status, and assignments — and communicate with drivers directly."
        actions={
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            onClick={loadDrivers}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={5}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
          <Button ml="auto" size="sm" onClick={loadDrivers}>
            Try again
          </Button>
        </Alert>
      ) : null}

      <HStack mb={5} spacing={2}>
        <Badge colorScheme="blue" px={3} py={1.5} borderRadius="full">
          {drivers.length} drivers
        </Badge>
        <Badge colorScheme="green" px={3} py={1.5} borderRadius="full">
          {activeCount} active
        </Badge>
      </HStack>

      <Flex gap={3} wrap="wrap" mb={5}>
        <InputGroup maxW={{ base: "100%", md: "460px" }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by driver, vehicle, route, or owner..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            bg="white"
          />
        </InputGroup>
        <HStack>
          {[
            ["all", "All"],
            ["active", "Active"],
            ["inactive", "Inactive"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? "solid" : "outline"}
              colorScheme={statusFilter === value ? "blue" : "gray"}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </HStack>
      </Flex>

      {loading && !drivers.length ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : filteredDrivers.length ? (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          {filteredDrivers.map((driver) => {
            const name = driver.users?.name || "Driver";
            const status = (driver.status || "inactive").toLowerCase();
            const vehicle = driver.vehicle;
            const vehicleIdentifiers = [
              vehicle?.name,
              vehicle?.license_plate,
              driver.vehicle_plate_number,
            ].filter(Boolean);
            const hasPendingVehicle = vehicleIdentifiers.some((value) =>
              /^PENDING-/i.test(String(value).trim()),
            );
            const assignedVehicleLabel = vehicle
              ? [vehicle.name, vehicle.license_plate].filter(Boolean).join(" · ")
              : driver.vehicle_plate_number;
            const vehicleLabel = hasPendingVehicle
              ? "Not assigned to a vehicle"
              : assignedVehicleLabel || "Not assigned to a vehicle";
            const ownerName =
              driver.owner?.company_name || driver.owner?.users?.name;
            return (
              <Card key={driver.id} className="driver-monitoring-card">
                <CardBody>
                  <Flex
                    justify="space-between"
                    align="flex-start"
                    gap={3}
                    mb={4}
                  >
                    <HStack spacing={3} minW={0}>
                      <Avatar name={name} src={driver.avatar} />
                      <Box minW={0}>
                        <Heading size="sm" noOfLines={1}>
                          {name}
                        </Heading>
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>
                          {driver.users?.email || "No email on file"}
                        </Text>
                      </Box>
                    </HStack>
                    <Badge
                      colorScheme={status === "active" ? "green" : "gray"}
                      textTransform="capitalize"
                    >
                      {status}
                    </Badge>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mb={5}>
                    <HStack align="flex-start" spacing={2}>
                      <Icon as={FiTruck} color="blue.500" mt={1} />
                      <Box>
                        <Text className="driver-detail-label">Vehicle</Text>
                        <Text
                          className={`driver-detail-value${hasPendingVehicle || !vehicleLabel ? " driver-detail-unassigned" : ""}`}
                        >
                          {vehicleLabel}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack align="flex-start" spacing={2}>
                      <Icon as={FiUser} color="blue.500" mt={1} />
                      <Box>
                        <Text fontSize="xs" color="gray.500">
                          Fleet owner
                        </Text>
                        <Text fontSize="sm" fontWeight="600">
                          {ownerName || "Not assigned"}
                        </Text>
                      </Box>
                    </HStack>
                    <Box gridColumn={{ sm: "1 / -1" }}>
                      <Text fontSize="xs" color="gray.500">
                        Route assignment
                      </Text>
                      <Text fontSize="sm" fontWeight="600">
                        {driver.route
                          ? `${driver.route.route_name} · ${driver.route.start_location} to ${driver.route.end_location}`
                          : "No active route assignment"}
                      </Text>
                    </Box>
                    <Box gridColumn={{ sm: "1 / -1" }}>
                      <Text fontSize="xs" color="gray.500">
                        Driver phone
                      </Text>
                      {driver.users?.phone ? (
                        <a
                          href={`tel:${driver.users.phone}`}
                          style={{
                            color: "#3975df",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {driver.users.phone}
                        </a>
                      ) : (
                        <Text fontSize="sm" fontWeight="600">
                          Not provided
                        </Text>
                      )}
                    </Box>
                  </SimpleGrid>

                  <Flex
                    justify="space-between"
                    align="center"
                    gap={3}
                    wrap="wrap"
                  >
                    <Text fontSize="xs" color="gray.500">
                      {driver.is_verified
                        ? "Verified driver"
                        : "Verification pending"}
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<Icon as={FiMessageCircle} />}
                      onClick={() => openConversation(driver)}
                      isDisabled={!driver.user_id}
                    >
                      Message driver
                    </Button>
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : !error && !loading ? (
        <Card className="driver-monitoring-card">
          <CardBody textAlign="center" py={12}>
            <Text color="gray.600">
              {drivers.length
                ? "No drivers match your search or filter."
                : "No drivers are available."}
            </Text>
          </CardBody>
        </Card>
      ) : null}

      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setConversationId("");
          setMessages([]);
          setMessageError("");
        }}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Avatar
                size="sm"
                name={selectedDriver?.users?.name || "Driver"}
              />
              <Box>
                <Text>Message {selectedDriver?.users?.name || "driver"}</Text>
                <Text fontSize="xs" fontWeight="normal" color="gray.500">
                  Messages are delivered to the driver’s account.
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {messageError ? (
              <Alert status="error" borderRadius="lg" mb={3}>
                <AlertIcon />
                <AlertDescription>{messageError}</AlertDescription>
              </Alert>
            ) : null}
            <VStack
              align="stretch"
              spacing={3}
              maxH="360px"
              overflowY="auto"
              bg="gray.50"
              borderRadius="lg"
              p={3}
              mb={4}
            >
              {conversationLoading && !messages.length ? (
                <Flex justify="center" py={8}>
                  <Spinner color="blue.500" />
                </Flex>
              ) : messages.length ? (
                messages.map((message) => {
                  const mine = message.sender_id === currentUser?.id;
                  const attachment = parseMessageAttachment(message.content);
                  return (
                    <Flex
                      key={message.id}
                      justify={mine ? "flex-end" : "flex-start"}
                    >
                      <Box
                        maxW="85%"
                        bg={mine ? "blue.500" : "white"}
                        color={mine ? "white" : "gray.800"}
                        borderRadius="xl"
                        px={3}
                        py={2}
                        boxShadow="sm"
                      >
                        {attachment?.mediaType === "image" ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open image ${attachment.name || "attachment"}`}
                          >
                            <Box
                              as="img"
                              src={attachment.url}
                              alt={attachment.name || "Image attachment"}
                              maxW="260px"
                              maxH="240px"
                              borderRadius="md"
                              objectFit="cover"
                            />
                          </a>
                        ) : attachment?.mediaType === "audio" ? (
                          <Box
                            as="audio"
                            controls
                            src={attachment.url}
                            maxW="260px"
                            aria-label="Voice message"
                          />
                        ) : attachment?.mediaType === "pdf" ? (
                          <Button
                            as="a"
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            leftIcon={<Icon as={FiFileText} />}
                            variant="ghost"
                            color={mine ? "white" : "blue.600"}
                            maxW="260px"
                            title={attachment.name || "PDF attachment"}
                          >
                            <Text noOfLines={1}>
                              {attachment.name || "Open PDF"}
                            </Text>
                          </Button>
                        ) : (
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {message.content}
                          </Text>
                        )}
                        {attachment?.caption ? (
                          <Text fontSize="sm" whiteSpace="pre-wrap" mt={2}>
                            {attachment.caption}
                          </Text>
                        ) : null}
                        <Text
                          fontSize="xs"
                          opacity={0.75}
                          mt={1}
                          textAlign="right"
                        >
                          {formatDate(message.sent_at)}
                        </Text>
                      </Box>
                    </Flex>
                  );
                })
              ) : (
                <Text color="gray.500" fontSize="sm" textAlign="center" py={8}>
                  Start a conversation with this driver.
                </Text>
              )}
            </VStack>
            <form id="driver-message-form" onSubmit={sendMessage}>
              {selectedImage ? (
                <HStack mb={2} justify="space-between">
                  <Text fontSize="sm" color="gray.600" noOfLines={1}>
                    Image: {selectedImage.name}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedImage(null)}
                    aria-label="Remove selected image"
                  >
                    Remove
                  </Button>
                </HStack>
              ) : null}
              <FormControl>
                <Textarea
                  placeholder="Write a message..."
                  value={messageDraft}
                  maxLength={5000}
                  resize="vertical"
                  onChange={(event) => setMessageDraft(event.target.value)}
                  isDisabled={conversationLoading || !conversationId || sending}
                />
              </FormControl>
              <Input
                type="file"
                accept="image/*"
                display="none"
                id="driver-message-image"
                onChange={(event) => {
                  const [file] = event.target.files || [];
                  if (file && file.size > 20 * 1024 * 1024) {
                    setMessageError("Images must be 20 MB or smaller.");
                  } else if (file) {
                    setSelectedImage(file);
                    setMessageError("");
                  }
                  event.target.value = "";
                }}
              />
              <Button
                mt={2}
                size="sm"
                variant="outline"
                leftIcon={<Icon as={FiPaperclip} />}
                as="label"
                htmlFor="driver-message-image"
                isDisabled={!conversationId || sending}
              >
                Add image
              </Button>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              type="submit"
              form="driver-message-form"
              colorScheme="blue"
              leftIcon={<Icon as={FiSend} />}
              ml={3}
              isLoading={sending}
              isDisabled={
                (!messageDraft.trim() && !selectedImage) ||
                !conversationId ||
                conversationLoading
              }
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
