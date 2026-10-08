import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiMessageCircle, FiRefreshCw, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const apiRequest = async (path) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Your support session has expired. Please sign in again.");
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.error || "Could not load conversations.");
  }
  return result;
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getPreview = (content) => {
  if (!content) return "Start a conversation";
  try {
    const attachment = JSON.parse(content);
    if (attachment?.type === "attachment") {
      const label =
        attachment.mediaType === "image"
          ? "Photo"
          : attachment.mediaType === "audio"
            ? "Voice message"
            : "PDF attachment";
      return attachment.caption ? `${label}: ${attachment.caption}` : label;
    }
  } catch {
    return content;
  }
  return content;
};

const roleLabel = (role) =>
  role === "driver"
    ? "Driver"
    : role === "client"
      ? "Parent"
      : role === "school"
        ? "School"
        : role === "owner"
          ? "Fleet owner"
          : role === "admin"
            ? "Support team"
            : "User";

const MessagesInbox = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/conversations");
      const sorted = [...(Array.isArray(result) ? result : [])].sort(
        (first, second) =>
          new Date(second.last_message_at || 0).getTime() -
          new Date(first.last_message_at || 0).getTime(),
      );
      setConversations(sorted);
    } catch (loadError) {
      console.error("Could not load support inbox:", loadError);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = window.setInterval(loadConversations, 15000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const participant = conversation.participant || {};
      const matchesRole = roleFilter === "all" || participant.role === roleFilter;
      const matchesSearch =
        !query ||
        [participant.name, participant.email, conversation.last_message?.content]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesRole && matchesSearch;
    });
  }, [conversations, roleFilter, search]);

  const openConversation = (conversation) => {
    const participant = conversation.participant || {};
    navigate(participant.role === "driver" ? "/drivers" : "/users", {
      state:
        participant.role === "driver"
          ? { openConversationDriverId: participant.id }
          : { openConversationUserId: participant.id },
    });
  };

  return (
    <Box p={{ base: 4, md: 6 }} maxW="1500px" mx="auto">
      <PageHeader
        eyebrow="MESSAGING"
        title="Conversations"
        description="Recent support conversations, ordered by their latest message."
        actions={
          <Button
            leftIcon={<FiRefreshCw />}
            variant="outline"
            onClick={loadConversations}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
      />

      <HStack mb={5} spacing={3} align="stretch" flexWrap="wrap">
        <InputGroup maxW={{ base: "100%", md: "420px" }}>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="currentColor" />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            bg="white"
          />
        </InputGroup>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          maxW={{ base: "100%", md: "220px" }}
          bg="white"
        >
          <option value="all">All contacts</option>
          <option value="client">Parents</option>
          <option value="driver">Drivers</option>
          <option value="owner">Fleet owners</option>
          <option value="school">Schools</option>
        </Select>
      </HStack>

      {error ? (
        <Alert status="error" borderRadius="lg" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      {loading && !conversations.length ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : filteredConversations.length ? (
        <VStack align="stretch" spacing={3}>
          {filteredConversations.map((conversation) => {
            const participant = conversation.participant || {};
            const lastMessage = conversation.last_message || {};
            return (
              <Card
                key={conversation.id}
                border="1px solid"
                borderColor="gray.100"
                shadow="sm"
              >
                <CardBody>
                  <Flex
                    align="center"
                    justify="space-between"
                    gap={4}
                    wrap="wrap"
                  >
                    <HStack minW={0} spacing={3} flex="1">
                      <Avatar name={participant.name || participant.email} />
                      <Box minW={0}>
                        <HStack spacing={2}>
                          <Text fontWeight="700" noOfLines={1}>
                            {participant.name || participant.email || "Contact"}
                          </Text>
                          <Badge colorScheme="blue">
                            {roleLabel(participant.role)}
                          </Badge>
                          {conversation.unread_count > 0 ? (
                            <Badge colorScheme="red">Unread</Badge>
                          ) : null}
                        </HStack>
                        <Text color="gray.600" fontSize="sm" noOfLines={1}>
                          {getPreview(lastMessage.content)}
                        </Text>
                        {participant.email ? (
                          <Text color="gray.500" fontSize="xs" noOfLines={1}>
                            {participant.email}
                          </Text>
                        ) : null}
                      </Box>
                    </HStack>
                    <VStack align={{ base: "stretch", md: "flex-end" }} spacing={2}>
                      <Text color="gray.500" fontSize="xs">
                        {formatTime(conversation.last_message_at)}
                      </Text>
                      <Button
                        leftIcon={<FiMessageCircle />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => openConversation(conversation)}
                      >
                        Open chat
                      </Button>
                    </VStack>
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </VStack>
      ) : (
        <Box py={12} textAlign="center" color="gray.500">
          <Text fontWeight="600">
            {loading ? "Loading conversations…" : "No conversations found"}
          </Text>
          {!loading && !search && (
            <Text fontSize="sm" mt={1}>
              Start a conversation from the Users or Drivers page.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MessagesInbox;
