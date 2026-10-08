import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
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
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
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
  FiMic,
  FiPaperclip,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSmile,
  FiSquare,
  FiUsers,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader";
import { readMessageCache, writeMessageCache } from "./messageCache";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const EMOJI_OPTIONS = ["😀", "😊", "👍", "❤️", "🙏", "🎉", "👋", "🚗", "✅", "🤝"];

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Your support session has expired. Please sign in again.");
  }
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

const displayRole = (user) => {
  if (user.role === "platform_admin") {
    return (user.platformRole || "platform admin")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  if (user.hasOwnerProfile && user.hasDriverProfile) return "Owner · Driver";
  return (user.role || "user")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const attachmentFromMessage = (content) => {
  try {
    const value = JSON.parse(content);
    return value?.type === "attachment" && value.url ? value : null;
  } catch {
    return null;
  }
};

const UserCard = ({ user, onMessage, isSelf, schoolName }) => {
  const membership = user.schools?.find((school) => school.name === schoolName) || user.school;
  return (
  <Card border="1px solid" borderColor="gray.100" shadow="sm">
    <CardBody>
      <Flex justify="space-between" align="flex-start" gap={3}>
        <HStack minW={0} spacing={3}>
          <Avatar name={user.name || user.email} size="sm" />
          <Box minW={0}>
            <Text fontWeight="700" noOfLines={1}>
              {user.name || "Unnamed user"}
            </Text>
            <Text fontSize="sm" color="gray.500" noOfLines={1}>
              {user.email}
            </Text>
          </Box>
        </HStack>
        <Badge colorScheme={user.status === "active" ? "green" : "gray"}>
          {user.status || "active"}
        </Badge>
      </Flex>
      <Flex justify="space-between" align="center" gap={3} mt={4}>
        <Box minW={0}>
          <Text fontSize="xs" color="gray.500">
            {displayRole(user)}
          </Text>
          {membership ? (
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {membership.staffRole} · {membership.name}
            </Text>
          ) : user.organization ? (
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {user.organization}
            </Text>
          ) : null}
        </Box>
        <Button
          size="sm"
          colorScheme="blue"
          variant="outline"
          leftIcon={<Icon as={FiMessageCircle} />}
          onClick={() => onMessage(user)}
          isDisabled={!user.id || isSelf}
        >
          Message
        </Button>
      </Flex>
    </CardBody>
  </Card>
  );
};

const Users = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.id;
    } catch {
      return null;
    }
  }, []);
  const cacheScope = `admin:${currentUserId || "unknown"}`;
  const [users, setUsers] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:users`);
    return Array.isArray(cached) ? cached : [];
  });

  useEffect(() => {
    if (users.length) writeMessageCache(`${cacheScope}:users`, users);
  }, [cacheScope, users]);

  useEffect(() => {
    if (conversationId && messages.length) {
      writeMessageCache(`${cacheScope}:messages:${conversationId}`, messages);
    }
  }, [cacheScope, conversationId, messages]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/users");
      setUsers(Array.isArray(result) ? result : []);
    } catch (requestError) {
      console.error("Could not load system users:", requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      const result = await apiRequest(
        `/admin/user-conversations/${encodeURIComponent(id)}/messages`,
      );
      setMessages(Array.isArray(result) ? result : []);
    } catch (requestError) {
      console.error("Could not refresh user conversation:", requestError);
      setMessageError(requestError.message);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    setRecordingSupported(
      typeof window !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof window.MediaRecorder !== "undefined",
    );
  }, [loadUsers]);

  useEffect(() => {
    if (!isOpen || !conversationId) return undefined;
    const timer = window.setInterval(() => loadMessages(conversationId), 5000);
    return () => window.clearInterval(timer);
  }, [conversationId, isOpen, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const normalizedSearch = search.trim().toLowerCase();
  const systemUsers = users.filter((user) => user.role !== "platform_admin");
  const filteredUsers = systemUsers.filter((user) => {
    const searchable = [
      user.name,
      user.email,
      user.phone,
      user.role,
      user.platformRole,
      user.organization,
      ...(user.schools || []).map((school) => school.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (roleFilter === "all" ||
        user.role === roleFilter ||
        (roleFilter === "driver" && user.hasDriverProfile) ||
        (roleFilter === "owner" && user.hasOwnerProfile) ||
        (roleFilter === "client" && user.hasClientProfile) ||
        (roleFilter === "school" && Boolean(user.schools?.length))) &&
      (statusFilter === "all" || user.status === statusFilter) &&
      searchable.includes(normalizedSearch)
    );
  });

  const schoolGroups = useMemo(() => {
    const groups = new Map();
    filteredUsers
      .filter((user) => user.schools?.length)
      .forEach((user) => {
        user.schools.forEach((school) => {
          const schoolName = school.name || "School not found";
          if (!groups.has(schoolName)) groups.set(schoolName, []);
          if (!groups.get(schoolName).some((member) => member.id === user.id)) {
            groups.get(schoolName).push(user);
          }
        });
      });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredUsers]);
  const otherUsers = filteredUsers.filter((user) => !user.schools?.length);

  const openConversation = useCallback(async (user) => {
    setSelectedUser(user);
    const cachedConversationId = readMessageCache(
      `${cacheScope}:conversation:${user.id}`,
    );
    setConversationId(cachedConversationId || "");
    setMessages(
      cachedConversationId
        ? readMessageCache(`${cacheScope}:messages:${cachedConversationId}`) || []
        : [],
    );
    setDraft("");
    setMessageError("");
    setConversationLoading(true);
    onOpen();
    try {
      const result = await apiRequest(
        `/admin/users/${encodeURIComponent(user.id)}/conversation`,
        { method: "POST", body: JSON.stringify({}) },
      );
      writeMessageCache(`${cacheScope}:conversation:${user.id}`, result.conversationId);
      setConversationId(result.conversationId);
      await loadMessages(result.conversationId);
    } catch (requestError) {
      console.error("Could not open user conversation:", requestError);
      setMessageError(requestError.message);
    } finally {
      setConversationLoading(false);
    }
  }, [cacheScope, loadMessages, onOpen]);

  useEffect(() => {
    const targetUserId = location.state?.openConversationUserId;
    if (!targetUserId || loading) return;
    const user = users.find((item) => String(item.id) === String(targetUserId));
    if (!user) return;
    navigate(location.pathname, { replace: true, state: null });
    void openConversation(user);
  }, [loading, location.pathname, location.state, navigate, openConversation, users]);

  const sendContent = async (content) => {
    if (!content.trim() || !conversationId) return;
    setSending(true);
    setMessageError("");
    try {
      const sent = await apiRequest(
        `/admin/user-conversations/${encodeURIComponent(conversationId)}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setMessages((current) => [...current, sent]);
      setDraft("");
    } catch (requestError) {
      console.error("Could not send user message:", requestError);
      setMessageError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const sendText = async (event) => {
    event.preventDefault();
    if ((!draft.trim() && !selectedFile) || !conversationId) return;
    if (selectedFile) {
      await uploadAttachment(selectedFile, draft.trim());
      return;
    }
    await sendContent(draft.trim());
  };

  const uploadAttachment = async (file, caption = "") => {
    if (!file || !conversationId) return;
    if (
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf" &&
      !file.type.startsWith("audio/")
    ) {
      setMessageError("Choose an image, PDF, or audio recording.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessageError("Attachments must be 20 MB or smaller.");
      return;
    }
    setSending(true);
    setMessageError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const attachment = await apiRequest(
        `/admin/user-conversations/${encodeURIComponent(conversationId)}/attachments`,
        { method: "POST", body: formData },
      );
      const sent = await apiRequest(
        `/admin/user-conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content: JSON.stringify({
              type: "attachment",
              ...attachment,
              caption,
            }),
          }),
        },
      );
      setMessages((current) => [...current, sent]);
      setDraft("");
      setSelectedFile(null);
    } catch (requestError) {
      console.error("Could not upload message attachment:", requestError);
      setMessageError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const startVoiceNote = async () => {
    setMessageError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new window.MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setMessageError("Voice recording failed. Please try again.");
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.onstop = () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!chunks.length) return;
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        const file = new File(chunks, `voice-note-${Date.now()}.${extension}`, {
          type: mimeType,
        });
        uploadAttachment(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (requestError) {
      console.error("Could not start voice recording:", requestError);
      setMessageError(
        requestError.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Voice recording could not be started on this device.",
      );
    }
  };

  const stopVoiceNote = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const handleClose = () => {
    stopVoiceNote();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    setEmojiOpen(false);
    setSelectedFile(null);
    onClose();
  };

  const renderMessage = (message) => {
    const own = message.sender_id === currentUserId;
    const attachment = attachmentFromMessage(message.content);
    return (
      <Flex key={message.id || `${message.sent_at}-${message.content}`} justify={own ? "flex-end" : "flex-start"}>
        <Box
          maxW="82%"
          bg={own ? "blue.600" : "white"}
          color={own ? "white" : "gray.800"}
          border="1px solid"
          borderColor={own ? "blue.600" : "gray.200"}
          px={3}
          py={2}
          borderRadius="16px"
          borderBottomRightRadius={own ? "4px" : "16px"}
          borderBottomLeftRadius={own ? "16px" : "4px"}
        >
          {attachment ? (
            attachment.mediaType === "image" ? (
              <a href={attachment.url} target="_blank" rel="noreferrer">
                <Box
                  as="img"
                  src={attachment.url}
                  alt={attachment.name}
                  maxW="260px"
                  maxH="240px"
                  borderRadius="md"
                />
              </a>
            ) : attachment.mediaType === "audio" ? (
              <Box as="audio" controls src={attachment.url} maxW="260px" />
            ) : (
              <Button
                as="a"
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                leftIcon={<Icon as={FiFileText} />}
                variant="ghost"
                color={own ? "white" : "blue.600"}
                maxW="260px"
                title={attachment.name}
              >
                <Text noOfLines={1}>{attachment.name || "Open PDF"}</Text>
              </Button>
            )
          ) : (
            <Text whiteSpace="pre-wrap" wordBreak="break-word">
              {message.content}
            </Text>
          )}
          {attachment?.caption ? (
            <Text whiteSpace="pre-wrap" wordBreak="break-word" mt={2}>
              {attachment.caption}
            </Text>
          ) : null}
          <Text fontSize="10px" opacity={0.75} textAlign="right" mt={1}>
            {message.sent_at
              ? new Date(message.sent_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </Text>
        </Box>
      </Flex>
    );
  };

  return (
    <Box>
      <PageHeader
        eyebrow="PLATFORM DIRECTORY"
        title="Users"
        description="Find system users, browse school communities, and message people directly."
        actions={
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            onClick={loadUsers}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
        meta={
          <Badge colorScheme="blue" px={3} py={1.5} borderRadius="full">
              {systemUsers.length} system users
          </Badge>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={5}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
          <Button ml="auto" size="sm" onClick={loadUsers}>
            Try again
          </Button>
        </Alert>
      ) : null}

      <Flex gap={3} wrap="wrap" mb={5}>
        <InputGroup maxW={{ base: "100%", md: "420px" }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, or school..."
            bg="white"
          />
        </InputGroup>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          maxW={{ base: "100%", sm: "210px" }}
          bg="white"
          aria-label="Filter users by role"
        >
          <option value="all">All roles</option>
          {[
            ["owner", "Owners"],
            ["driver", "Drivers"],
            ["client", "Clients"],
            ["school", "School users"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          maxW={{ base: "100%", sm: "170px" }}
          bg="white"
          aria-label="Filter users by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Flex>

      {loading && !users.length ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : filteredUsers.length ? (
        <VStack align="stretch" spacing={6}>
          {schoolGroups.length ? (
            <Box>
              <HStack mb={3}>
                <Icon as={FiUsers} color="blue.500" />
                <Text fontWeight="700" color="gray.700">
                  School communities
                </Text>
              </HStack>
              <Accordion allowMultiple>
                {schoolGroups.map(([schoolName, members]) => (
                  <AccordionItem
                    key={schoolName}
                    mb={3}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="xl"
                    overflow="hidden"
                  >
                    <AccordionButton bg="white" py={4}>
                      <Flex flex="1" justify="space-between" align="center" mr={3}>
                        <Text fontWeight="700" textAlign="left">
                          {schoolName}
                        </Text>
                        <Badge colorScheme="purple">
                          {members.length} {members.length === 1 ? "user" : "users"}
                        </Badge>
                      </Flex>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel bg="gray.50" pt={4}>
                      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={3}>
                        {members.map((user) => (
                          <UserCard
                            key={`${schoolName}-${user.id}`}
                            user={user}
                            onMessage={openConversation}
                            isSelf={user.id === currentUserId}
                            schoolName={schoolName}
                          />
                        ))}
                      </SimpleGrid>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </Box>
          ) : null}
          {otherUsers.length ? (
            <Box>
              {schoolGroups.length ? (
                <Text fontWeight="700" color="gray.700" mb={3}>
                  Other users
                </Text>
              ) : null}
              <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                {otherUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onMessage={openConversation}
                    isSelf={user.id === currentUserId}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ) : null}
        </VStack>
      ) : (
        <Card>
          <CardBody>
            <Text color="gray.500" textAlign="center" py={8}>
              No users match the selected filters.
            </Text>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={handleClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent h={{ base: "92vh", md: "min(760px, 90vh)" }}>
          <ModalHeader borderBottom="1px solid" borderColor="gray.100">
            <HStack spacing={3}>
              <Avatar name={selectedUser?.name || selectedUser?.email} size="sm" />
              <Box>
                <Text fontSize="md">{selectedUser?.name || "User conversation"}</Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  {selectedUser?.email}
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" p={0} minH={0}>
            {messageError ? (
              <Alert status="error" borderRadius={0}>
                <AlertIcon />
                <AlertDescription fontSize="sm">{messageError}</AlertDescription>
              </Alert>
            ) : null}
            <VStack
              align="stretch"
              spacing={3}
              flex="1"
              overflowY="auto"
              p={{ base: 4, md: 5 }}
              bg="gray.50"
            >
              {conversationLoading && !messages.length ? (
                <Flex justify="center" py={10}>
                  <Spinner color="blue.500" />
                </Flex>
              ) : messages.length ? (
                messages.map(renderMessage)
              ) : (
                <Text color="gray.500" textAlign="center" py={10} fontSize="sm">
                  Start a conversation with {selectedUser?.name || "this user"}.
                </Text>
              )}
              <Box ref={messagesEndRef} />
            </VStack>
            <Box as="form" onSubmit={sendText} p={3} borderTop="1px solid" borderColor="gray.200">
              {selectedFile ? (
                <HStack mb={2} justify="space-between">
                  <Text fontSize="sm" color="gray.600" noOfLines={1}>
                    Attachment: {selectedFile.name}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                    aria-label="Remove selected attachment"
                  >
                    Remove
                  </Button>
                </HStack>
              ) : null}
              <Flex gap={2} align="flex-end">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Write a message..."
                  resize="none"
                  rows={2}
                  bg="white"
                  isDisabled={conversationLoading || !conversationId || sending}
                />
                <VStack spacing={1}>
                  <Button
                    size="sm"
                    variant={emojiOpen ? "solid" : "ghost"}
                    colorScheme="yellow"
                    aria-label="Choose emoji"
                    onClick={() => setEmojiOpen((value) => !value)}
                    isDisabled={!conversationId}
                  >
                    <Icon as={FiSmile} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Attach image or PDF"
                    onClick={() => fileInputRef.current?.click()}
                    isDisabled={!conversationId || sending}
                  >
                    <Icon as={FiPaperclip} />
                  </Button>
                  {recordingSupported ? (
                    <Button
                      size="sm"
                      colorScheme={recording ? "red" : "gray"}
                      variant={recording ? "solid" : "ghost"}
                      aria-label={recording ? "Stop voice note" : "Record voice note"}
                      onClick={recording ? stopVoiceNote : startVoiceNote}
                      isDisabled={!conversationId || sending}
                    >
                      <Icon as={recording ? FiSquare : FiMic} />
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    colorScheme="blue"
                    aria-label="Send message"
                    type="submit"
                    isLoading={sending}
                    isDisabled={(!draft.trim() && !selectedFile) || !conversationId}
                  >
                    <Icon as={FiSend} />
                  </Button>
                </VStack>
              </Flex>
              {emojiOpen ? (
                <HStack mt={2} spacing={1} flexWrap="wrap">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      fontSize="lg"
                      onClick={() => setDraft((value) => `${value}${emoji}`)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </HStack>
              ) : null}
              {recording ? (
                <Text color="red.500" fontSize="xs" mt={2}>
                  Recording voice note… Press the stop button to send it.
                </Text>
              ) : (
                <Text color="gray.500" fontSize="xs" mt={2}>
                  Attach images or PDFs up to 20 MB. Voice notes use your microphone.
                </Text>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                display="none"
                onChange={(event) => {
                  const [file] = event.target.files || [];
                  if (file && file.size > 20 * 1024 * 1024) {
                    setMessageError("Attachments must be 20 MB or smaller.");
                  } else if (file) {
                    setSelectedFile(file);
                    setMessageError("");
                  }
                  event.target.value = "";
                }}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Users;
