import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Image,
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
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Text,
  Tr,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiInfo,
  FiMessageCircle,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader";
import { readMessageCache, writeMessageCache } from "./messageCache";
import {
  getCurrentUserIds,
  isCurrentUserId,
} from "../../utils/currentUserIdentity";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

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

const roleColorScheme = (role) => {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole.includes("owner") && normalizedRole.includes("driver")) {
    return "teal";
  }
  if (normalizedRole.includes("owner")) return "purple";
  if (normalizedRole.includes("driver")) return "cyan";
  if (normalizedRole.includes("client")) return "orange";
  if (normalizedRole.includes("student")) return "green";
  if (normalizedRole.includes("parent")) return "blue";
  if (normalizedRole.includes("school")) return "pink";
  if (normalizedRole.includes("admin")) return "red";
  return "gray";
};

const SchoolCommunityTable = ({
  schoolName,
  members,
  currentUserIds,
  onMessage,
  onViewDetails,
  onViewPhoto,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(members.length / pageSize));
  const pageMembers = members.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
    >
      <Flex
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        direction={{ base: "column", sm: "row" }}
        gap={2}
        p={4}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Box>
          <Text fontWeight="700" color="gray.800">
            {schoolName} users
          </Text>
          <Text fontSize="sm" color="gray.500">
            School staff accounts and their access status.
          </Text>
        </Box>
        <Badge colorScheme="purple" borderRadius="full" px={3} py={1}>
          {members.length} {members.length === 1 ? "user" : "users"}
        </Badge>
      </Flex>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>User</Th>
              <Th>Role / School</Th>
              <Th>Status</Th>
              <Th>Verification</Th>
              <Th textAlign="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pageMembers.map((user) => {
              const isSelf =
                user.is_current_user ||
                isCurrentUserId(user.id, currentUserIds);
              const membership = user.schools?.find(
                (school) => school.name === schoolName,
              );
              return (
                <Tr key={`${schoolName}-${user.id}`} _hover={{ bg: "blue.50" }}>
                  <Td minW="240px">
                    <HStack spacing={3}>
                      {user.avatar ? (
                        <Box
                          as="button"
                          type="button"
                          aria-label={`View ${user.name || user.email}'s profile photo`}
                          onClick={() => onViewPhoto(user)}
                          borderRadius="full"
                          cursor="zoom-in"
                        >
                          <Avatar
                            name={user.name || user.email}
                            src={user.avatar}
                            size="sm"
                          />
                        </Box>
                      ) : (
                        <Avatar name={user.name || user.email} size="sm" />
                      )}
                      <Box minW={0}>
                        <HStack spacing={2}>
                          <Text fontWeight="600" noOfLines={1}>
                            {user.name || "Unnamed user"}
                          </Text>
                          {isSelf ? (
                            <Badge colorScheme="blue">You</Badge>
                          ) : null}
                        </HStack>
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>
                          {user.email || user.phone || "No contact details"}
                        </Text>
                      </Box>
                    </HStack>
                  </Td>
                  <Td minW="150px">
                    <Text fontSize="sm" color="gray.700">
                      {membership?.staffRole || displayRole(user)}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {schoolName}
                    </Text>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={user.status === "active" ? "green" : "gray"}
                      textTransform="capitalize"
                    >
                      {user.status || "active"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={user.is_verified ? "green" : "gray"}>
                      {user.is_verified ? "Verified" : "Not verified"}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack justify="flex-end" spacing={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        leftIcon={<Icon as={FiEye} />}
                        onClick={() => onViewDetails(user)}
                      >
                        Details
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="blue"
                        leftIcon={<Icon as={FiMessageCircle} />}
                        onClick={() => onMessage(user)}
                        isDisabled={!user.id || isSelf}
                      >
                        Message
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        p={4}
        borderTop="1px solid"
        borderColor="gray.100"
        wrap="wrap"
      >
        <Text fontSize="sm" color="gray.500">
          Showing {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, members.length)} of {members.length} users
        </Text>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Icon as={FiChevronLeft} />}
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            isDisabled={page <= 1}
          >
            Previous
          </Button>
          <Text fontSize="sm" color="gray.600">
            Page {page} of {pageCount}
          </Text>
          <Button
            size="sm"
            variant="outline"
            rightIcon={<Icon as={FiChevronRight} />}
            onClick={() =>
              setPage((currentPage) => Math.min(pageCount, currentPage + 1))
            }
            isDisabled={page >= pageCount}
          >
            Next
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

const formatDetailLabel = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (key, value) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "")
    return "Not provided";
  if (
    typeof value === "string" &&
    /(?:_at|_date)$/.test(key) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return new Date(value).toLocaleString();
  }
  if (typeof value === "number" && key === "per_child_amount_cents") {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "ZAR",
    }).format(value / 100);
  }
  return String(value);
};

const getUserDetailIcon = (title) => {
  if (title.includes("Children")) return FiUsers;
  if (title.includes("Driver")) return FiTruck;
  if (title.includes("Fleet owner")) return FiBriefcase;
  if (title.includes("School")) return FiBookOpen;
  if (title.includes("Parent") || title.includes("Account")) return FiUser;
  if (title.includes("Date")) return FiCalendar;
  if (title.includes("Organization")) return FiHome;
  return FiInfo;
};

const UserDetailSection = ({ title, data }) => {
  const details = Object.entries(data || {}).filter(
    ([key, value]) =>
      !/^(id|.*_id)$/i.test(key) &&
      value !== null &&
      value !== undefined &&
      value !== "",
  );
  if (!details.length) return null;

  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
      bg="white"
      boxShadow="sm"
    >
      <HStack mb={4} spacing={3}>
        <Flex
          align="center"
          justify="center"
          boxSize={9}
          borderRadius="lg"
          bg="blue.50"
          color="blue.600"
          flexShrink={0}
        >
          <Icon as={getUserDetailIcon(title)} />
        </Flex>
        <Text fontWeight="700" color="gray.800">
          {title}
        </Text>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        {details.map(([key, value]) => (
          <Box
            key={key}
            minW={0}
            borderRadius="lg"
            bg="gray.50"
            px={3}
            py={2.5}
          >
            <Text
              fontSize="xs"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              {formatDetailLabel(key)}
            </Text>
            <Text fontSize="sm" mt={1} color="gray.800" wordBreak="break-word">
              {formatDetailValue(key, value)}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

const Users = () => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const {
    isOpen: isPhotoOpen,
    onClose: onPhotoClose,
    onOpen: onPhotoOpen,
  } = useDisclosure();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [otherUsersPage, setOtherUsersPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUserIds = useMemo(getCurrentUserIds, []);
  const currentUserId = useMemo(
    () => currentUserIds.values().next().value || null,
    [currentUserIds],
  );
  const cacheScope = `admin:${currentUserId || "unknown"}`;
  const [unlinkedChildren, setUnlinkedChildren] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:unlinked-children`);
    return Array.isArray(cached) ? cached : [];
  });
  const [unlinkedChildrenLoading, setUnlinkedChildrenLoading] = useState(true);
  const [unlinkedChildrenError, setUnlinkedChildrenError] = useState("");
  const [showUnlinkedChildren, setShowUnlinkedChildren] = useState(false);
  const [unlinkedChildrenPage, setUnlinkedChildrenPage] = useState(1);
  const [linkedChildren, setLinkedChildren] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:linked-children`);
    return Array.isArray(cached) ? cached : [];
  });
  const [linkedChildrenLoading, setLinkedChildrenLoading] = useState(true);
  const [linkedChildrenError, setLinkedChildrenError] = useState("");
  const [showLinkedChildren, setShowLinkedChildren] = useState(false);
  const [linkedChildrenPage, setLinkedChildrenPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPhotoUser, setSelectedPhotoUser] = useState(null);
  const [users, setUsers] = useState(() => {
    const cached = readMessageCache(`${cacheScope}:users`);
    return Array.isArray(cached) ? cached : [];
  });
  const studentPageSize = 6;
  const unlinkedChildrenPageCount = Math.max(
    1,
    Math.ceil(unlinkedChildren.length / studentPageSize),
  );
  const linkedChildrenPageCount = Math.max(
    1,
    Math.ceil(linkedChildren.length / studentPageSize),
  );
  const paginatedUnlinkedChildren = unlinkedChildren.slice(
    (unlinkedChildrenPage - 1) * studentPageSize,
    unlinkedChildrenPage * studentPageSize,
  );
  const paginatedLinkedChildren = linkedChildren.slice(
    (linkedChildrenPage - 1) * studentPageSize,
    linkedChildrenPage * studentPageSize,
  );

  useEffect(() => {
    setUnlinkedChildrenPage((page) =>
      Math.min(page, unlinkedChildrenPageCount),
    );
  }, [unlinkedChildrenPageCount]);

  useEffect(() => {
    setLinkedChildrenPage((page) => Math.min(page, linkedChildrenPageCount));
  }, [linkedChildrenPageCount]);

  useEffect(() => {
    writeMessageCache(`${cacheScope}:users`, users);
  }, [cacheScope, users]);

  useEffect(() => {
    writeMessageCache(`${cacheScope}:unlinked-children`, unlinkedChildren);
  }, [cacheScope, unlinkedChildren]);

  useEffect(() => {
    writeMessageCache(`${cacheScope}:linked-children`, linkedChildren);
  }, [cacheScope, linkedChildren]);

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

  const loadUnlinkedChildren = useCallback(async () => {
    setUnlinkedChildrenLoading(true);
    setUnlinkedChildrenError("");
    try {
      const result = await apiRequest("/admin/unlinked-children");
      setUnlinkedChildren(Array.isArray(result) ? result : []);
    } catch (requestError) {
      console.error(
        "Could not load children without linked parents:",
        requestError,
      );
      setUnlinkedChildrenError(requestError.message);
    } finally {
      setUnlinkedChildrenLoading(false);
    }
  }, []);

  const loadLinkedChildren = useCallback(async () => {
    setLinkedChildrenLoading(true);
    setLinkedChildrenError("");
    try {
      const result = await apiRequest("/admin/linked-children");
      setLinkedChildren(Array.isArray(result) ? result : []);
    } catch (requestError) {
      console.error(
        "Could not load students with linked parents:",
        requestError,
      );
      setLinkedChildrenError(requestError.message);
    } finally {
      setLinkedChildrenLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadUnlinkedChildren();
    void loadLinkedChildren();
  }, [loadLinkedChildren, loadUnlinkedChildren, loadUsers]);

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
      (verificationFilter === "all" ||
        (verificationFilter === "verified" && user.is_verified === true) ||
        (verificationFilter === "not_verified" && user.is_verified !== true)) &&
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
  const otherUserRoleCounts = Object.entries(
    otherUsers.reduce((counts, user) => {
      const role = displayRole(user);
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {}),
  ).sort(([firstRole], [secondRole]) => firstRole.localeCompare(secondRole));
  const otherUsersPageSize = 10;
  const otherUsersPageCount = Math.max(
    1,
    Math.ceil(otherUsers.length / otherUsersPageSize),
  );
  const paginatedOtherUsers = otherUsers.slice(
    (otherUsersPage - 1) * otherUsersPageSize,
    otherUsersPage * otherUsersPageSize,
  );

  useEffect(() => {
    setOtherUsersPage(1);
  }, [normalizedSearch, roleFilter, statusFilter, verificationFilter]);

  useEffect(() => {
    setOtherUsersPage((page) => Math.min(page, otherUsersPageCount));
  }, [otherUsersPageCount]);

  const openConversation = useCallback(
    (user) => {
      navigate("/messages", {
        state: {
          openConversationUserId: user.id,
          openConversationRole: user.role,
        },
      });
    },
    [navigate],
  );

  const openUserDetails = (user) => {
    setSelectedUser(user);
    onOpen();
  };

  const openUserPhoto = (user) => {
    setSelectedPhotoUser(user);
    onPhotoOpen();
  };

  return (
    <Box px={{ base: 4, md: 6 }} py={6}>
      <PageHeader
        eyebrow="PLATFORM DIRECTORY"
        title="Users"
        description="Browse user accounts, inspect their profile details, and message people directly."
        actions={
          <HStack flexWrap="wrap">
            <Button
              leftIcon={<Icon as={FiUsers} />}
              variant={showUnlinkedChildren ? "solid" : "outline"}
              colorScheme="purple"
              onClick={() => {
                setShowUnlinkedChildren((visible) => !visible);
                setShowLinkedChildren(false);
              }}
            >
              Unlinked students
              <Badge
                ml={2}
                colorScheme={showUnlinkedChildren ? "whiteAlpha" : "purple"}
              >
                {unlinkedChildren.length}
              </Badge>
            </Button>
            <Button
              leftIcon={<Icon as={FiUsers} />}
              variant={showLinkedChildren ? "solid" : "outline"}
              colorScheme="teal"
              onClick={() => {
                setShowLinkedChildren((visible) => !visible);
                setShowUnlinkedChildren(false);
              }}
            >
              Linked students
              <Badge
                ml={2}
                colorScheme={showLinkedChildren ? "whiteAlpha" : "teal"}
              >
                {linkedChildren.length}
              </Badge>
            </Button>
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              variant="outline"
              onClick={() => {
                void loadUsers();
                void loadUnlinkedChildren();
                void loadLinkedChildren();
              }}
              isLoading={
                loading || unlinkedChildrenLoading || linkedChildrenLoading
              }
            >
              Refresh
            </Button>
          </HStack>
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

      {showUnlinkedChildren && (
        <Card mb={5} border="1px solid" borderColor="purple.100">
          <CardBody>
            <Flex
              justify="space-between"
              align={{ base: "flex-start", sm: "center" }}
              direction={{ base: "column", sm: "row" }}
              gap={2}
              mb={4}
            >
              <Box>
                <Text fontWeight="700" color="gray.800">
                  Students without a linked parent
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Review each student’s school and contact the school to follow
                  up.
                </Text>
              </Box>
              <Badge colorScheme="purple">
                {unlinkedChildren.length}{" "}
                {unlinkedChildren.length === 1 ? "student" : "students"}
              </Badge>
            </Flex>
            {unlinkedChildrenError ? (
              <Alert status="error" borderRadius="lg" mb={3}>
                <AlertIcon />
                <AlertDescription>{unlinkedChildrenError}</AlertDescription>
                <Button
                  ml="auto"
                  size="sm"
                  onClick={() => void loadUnlinkedChildren()}
                  isLoading={unlinkedChildrenLoading}
                >
                  Try again
                </Button>
              </Alert>
            ) : unlinkedChildrenLoading && !unlinkedChildren.length ? (
              <Flex justify="center" py={8}>
                <Spinner color="purple.500" />
              </Flex>
            ) : unlinkedChildren.length ? (
              <>
                <TableContainer
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  bg="white"
                >
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Student</Th>
                        <Th>Grade</Th>
                        <Th>School</Th>
                        <Th>School contact</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedUnlinkedChildren.map((child) => {
                        const school = child.schools;
                        return (
                          <Tr key={child.id} _hover={{ bg: "purple.50" }}>
                            <Td minW="220px">
                              <HStack spacing={3}>
                                <Avatar
                                  name={`${child.name || ""} ${child.lastname || ""}`}
                                  src={child.avatar || undefined}
                                  size="sm"
                                />
                                <Text fontWeight="600">
                                  {[child.name, child.lastname]
                                    .filter(Boolean)
                                    .join(" ") || "Unnamed student"}
                                </Text>
                              </HStack>
                            </Td>
                            <Td>{child.grade || "Not provided"}</Td>
                            <Td minW="220px">
                              <Text fontWeight="600">
                                {school?.name || "School not linked"}
                              </Text>
                              {school?.address ? (
                                <Text fontSize="xs" color="gray.500">
                                  {school.address}
                                  {[school.district, school.province].filter(
                                    Boolean,
                                  ).length
                                    ? ` · ${[school.district, school.province]
                                        .filter(Boolean)
                                        .join(", ")}`
                                    : ""}
                                </Text>
                              ) : null}
                            </Td>
                            <Td minW="200px">
                              {school?.contact_person ||
                              school?.principal_name ? (
                                <Text fontSize="sm">
                                  {school.contact_person ||
                                    school.principal_name}
                                </Text>
                              ) : null}
                              <HStack spacing={3} flexWrap="wrap">
                                {school?.phone ? (
                                  <Text
                                    as="a"
                                    href={`tel:${school.phone}`}
                                    fontSize="xs"
                                    color="blue.600"
                                  >
                                    {school.phone}
                                  </Text>
                                ) : null}
                                {school?.school_email ? (
                                  <Text
                                    as="a"
                                    href={`mailto:${school.school_email}`}
                                    fontSize="xs"
                                    color="blue.600"
                                  >
                                    {school.school_email}
                                  </Text>
                                ) : null}
                                {!school?.phone && !school?.school_email ? (
                                  <Text fontSize="xs" color="gray.500">
                                    No contact details
                                  </Text>
                                ) : null}
                              </HStack>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Flex
                  align="center"
                  justify="space-between"
                  gap={3}
                  mt={3}
                  wrap="wrap"
                >
                  <Text fontSize="sm" color="gray.500">
                    Showing {(unlinkedChildrenPage - 1) * studentPageSize + 1}–
                    {Math.min(
                      unlinkedChildrenPage * studentPageSize,
                      unlinkedChildren.length,
                    )}{" "}
                    of {unlinkedChildren.length} students
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={FiChevronLeft} />}
                      onClick={() =>
                        setUnlinkedChildrenPage((page) => Math.max(1, page - 1))
                      }
                      isDisabled={unlinkedChildrenPage <= 1}
                    >
                      Previous
                    </Button>
                    <Text fontSize="sm" color="gray.600">
                      Page {unlinkedChildrenPage} of {unlinkedChildrenPageCount}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      rightIcon={<Icon as={FiChevronRight} />}
                      onClick={() =>
                        setUnlinkedChildrenPage((page) =>
                          Math.min(unlinkedChildrenPageCount, page + 1),
                        )
                      }
                      isDisabled={
                        unlinkedChildrenPage >= unlinkedChildrenPageCount
                      }
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              </>
            ) : (
              <Text color="gray.500" textAlign="center" py={6}>
                No students without a linked parent were found.
              </Text>
            )}
          </CardBody>
        </Card>
      )}

      {showLinkedChildren && (
        <Card mb={5} border="1px solid" borderColor="teal.100">
          <CardBody>
            <Flex
              justify="space-between"
              align={{ base: "flex-start", sm: "center" }}
              direction={{ base: "column", sm: "row" }}
              gap={2}
              mb={4}
            >
              <Box>
                <Text fontWeight="700" color="gray.800">
                  Students with linked parents
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Review each student, their school, and the parent account
                  linked to them.
                </Text>
              </Box>
              <Badge colorScheme="teal">
                {linkedChildren.length}{" "}
                {linkedChildren.length === 1 ? "student" : "students"}
              </Badge>
            </Flex>
            {linkedChildrenError ? (
              <Alert status="error" borderRadius="lg" mb={3}>
                <AlertIcon />
                <AlertDescription>{linkedChildrenError}</AlertDescription>
                <Button
                  ml="auto"
                  size="sm"
                  onClick={() => void loadLinkedChildren()}
                  isLoading={linkedChildrenLoading}
                >
                  Try again
                </Button>
              </Alert>
            ) : linkedChildrenLoading && !linkedChildren.length ? (
              <Flex justify="center" py={8}>
                <Spinner color="teal.500" />
              </Flex>
            ) : linkedChildren.length ? (
              <>
                <TableContainer
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  bg="white"
                >
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Student</Th>
                        <Th>Grade</Th>
                        <Th>School</Th>
                        <Th>Parent</Th>
                        <Th>Contact</Th>
                        <Th textAlign="right">Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedLinkedChildren.map((child) => {
                        const school = child.schools;
                        const parent = child.clients;
                        const parentUser = parent?.users;
                        const parentName =
                          [parent?.first_name, parent?.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          parentUser?.name ||
                          "Parent account";
                        const parentPhone = parent?.phone || parentUser?.phone;
                        const parentIsCurrentUser =
                          parentUser?.is_current_user ||
                          isCurrentUserId(parentUser?.id, currentUserIds);
                        return (
                          <Tr key={child.id} _hover={{ bg: "teal.50" }}>
                            <Td minW="210px">
                              <HStack spacing={3}>
                                <Avatar
                                  name={`${child.name || ""} ${child.lastname || ""}`}
                                  src={child.avatar || undefined}
                                  size="sm"
                                />
                                <Text fontWeight="600">
                                  {[child.name, child.lastname]
                                    .filter(Boolean)
                                    .join(" ") || "Unnamed student"}
                                </Text>
                              </HStack>
                            </Td>
                            <Td>{child.grade || "Not provided"}</Td>
                            <Td minW="180px">
                              <Text fontWeight="600">
                                {school?.name || "School not linked"}
                              </Text>
                              {school?.address ? (
                                <Text fontSize="xs" color="gray.500">
                                  {school.address}
                                </Text>
                              ) : null}
                            </Td>
                            <Td minW="180px">
                              <Text fontWeight="600">{parentName}</Text>
                              {parentIsCurrentUser ? (
                                <Badge colorScheme="blue" mt={1}>
                                  You
                                </Badge>
                              ) : null}
                            </Td>
                            <Td minW="190px">
                              {parentPhone ? (
                                <Text
                                  as="a"
                                  href={`tel:${parentPhone}`}
                                  display="block"
                                  fontSize="xs"
                                  color="blue.600"
                                >
                                  {parentPhone}
                                </Text>
                              ) : null}
                              {parentUser?.email ? (
                                <Text
                                  as="a"
                                  href={`mailto:${parentUser.email}`}
                                  display="block"
                                  fontSize="xs"
                                  color="blue.600"
                                >
                                  {parentUser.email}
                                </Text>
                              ) : null}
                              {!parentPhone && !parentUser?.email ? (
                                <Text fontSize="xs" color="gray.500">
                                  No contact details
                                </Text>
                              ) : null}
                            </Td>
                            <Td textAlign="right">
                              {parentUser?.id ? (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() =>
                                    openConversation({
                                      id: parentUser.id,
                                      role: "client",
                                    })
                                  }
                                  isDisabled={parentIsCurrentUser}
                                >
                                  Contact parent
                                </Button>
                              ) : (
                                <Text fontSize="xs" color="gray.500">
                                  —
                                </Text>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Flex
                  align="center"
                  justify="space-between"
                  gap={3}
                  mt={3}
                  wrap="wrap"
                >
                  <Text fontSize="sm" color="gray.500">
                    Showing {(linkedChildrenPage - 1) * studentPageSize + 1}–
                    {Math.min(
                      linkedChildrenPage * studentPageSize,
                      linkedChildren.length,
                    )}{" "}
                    of {linkedChildren.length} students
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={FiChevronLeft} />}
                      onClick={() =>
                        setLinkedChildrenPage((page) => Math.max(1, page - 1))
                      }
                      isDisabled={linkedChildrenPage <= 1}
                    >
                      Previous
                    </Button>
                    <Text fontSize="sm" color="gray.600">
                      Page {linkedChildrenPage} of {linkedChildrenPageCount}
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      rightIcon={<Icon as={FiChevronRight} />}
                      onClick={() =>
                        setLinkedChildrenPage((page) =>
                          Math.min(linkedChildrenPageCount, page + 1),
                        )
                      }
                      isDisabled={linkedChildrenPage >= linkedChildrenPageCount}
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              </>
            ) : (
              <Text color="gray.500" textAlign="center" py={6}>
                No students with linked parents were found.
              </Text>
            )}
          </CardBody>
        </Card>
      )}

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
        <Select
          value={verificationFilter}
          onChange={(event) => setVerificationFilter(event.target.value)}
          maxW={{ base: "100%", sm: "200px" }}
          bg="white"
          aria-label="Filter users by verification"
        >
          <option value="all">All verification</option>
          <option value="verified">Verified</option>
          <option value="not_verified">Not verified</option>
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
                {schoolGroups.map(([schoolName, members]) => {
                  const school = members[0]?.schools?.find(
                    (membership) => membership.name === schoolName,
                  );
                  return (
                    <AccordionItem
                      key={schoolName}
                      mb={3}
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      overflow="hidden"
                    >
                      <AccordionButton bg="white" py={4}>
                        <Flex
                          flex="1"
                          justify="space-between"
                          align="center"
                          mr={3}
                        >
                          <HStack minW={0} spacing={2}>
                            {school?.logo ? (
                              <Avatar
                                name={schoolName}
                                src={school.logo}
                                size="sm"
                              />
                            ) : null}
                            <Text fontWeight="700" textAlign="left">
                              {schoolName}
                            </Text>
                          </HStack>
                          <Badge colorScheme="purple">
                            {members.length}{" "}
                            {members.length === 1 ? "user" : "users"}
                          </Badge>
                        </Flex>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel bg="gray.50" pt={4}>
                        <SchoolCommunityTable
                          schoolName={schoolName}
                          members={members}
                          currentUserIds={currentUserIds}
                          onMessage={openConversation}
                          onViewDetails={openUserDetails}
                          onViewPhoto={openUserPhoto}
                        />
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </Box>
          ) : null}
          {otherUsers.length ? (
            <Box
              border="1px solid"
              borderColor="gray.200"
              borderRadius="xl"
              bg="white"
              overflow="hidden"
            >
              <Flex
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap={2}
                p={4}
                borderBottom="1px solid"
                borderColor="gray.100"
              >
                <Box>
                  <Text fontWeight="700" color="gray.800">
                    Other Users
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Users not associated with a school
                  </Text>
                </Box>
                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>
                    {otherUsers.length}{" "}
                    {otherUsers.length === 1 ? "user" : "users"}
                  </Badge>
                  {otherUserRoleCounts.map(([role, count]) => (
                    <Badge
                      key={role}
                      colorScheme={roleColorScheme(role)}
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontWeight="500"
                    >
                      {role}: {count}
                    </Badge>
                  ))}
                </HStack>
              </Flex>
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>User</Th>
                      <Th>Role / Organization</Th>
                      <Th>Status</Th>
                      <Th>Verification</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedOtherUsers.map((user) => {
                      const isSelf =
                        user.is_current_user ||
                        isCurrentUserId(user.id, currentUserIds);
                      const role = displayRole(user);
                      const roleColor = roleColorScheme(role);
                      return (
                        <Tr
                          key={user.id}
                          bg={`${roleColor}.50`}
                          borderLeft="3px solid"
                          borderColor={`${roleColor}.400`}
                          _hover={{ bg: `${roleColor}.100` }}
                        >
                          <Td minW="240px">
                            <HStack spacing={3}>
                              {user.avatar ? (
                                <Box
                                  as="button"
                                  type="button"
                                  aria-label={`View ${user.name || user.email}'s profile photo`}
                                  onClick={() => openUserPhoto(user)}
                                  borderRadius="full"
                                  cursor="zoom-in"
                                >
                                  <Avatar
                                    name={user.name || user.email}
                                    src={user.avatar}
                                    size="sm"
                                  />
                                </Box>
                              ) : (
                                <Avatar
                                  name={user.name || user.email}
                                  size="sm"
                                />
                              )}
                              <Box minW={0}>
                                <HStack spacing={2}>
                                  <Text fontWeight="600" noOfLines={1}>
                                    {user.name || "Unnamed user"}
                                  </Text>
                                  {isSelf ? (
                                    <Badge colorScheme="blue">You</Badge>
                                  ) : null}
                                </HStack>
                                <Text
                                  fontSize="sm"
                                  color="gray.500"
                                  noOfLines={1}
                                >
                                  {user.email ||
                                    user.phone ||
                                    "No contact details"}
                                </Text>
                              </Box>
                            </HStack>
                          </Td>
                          <Td minW="150px">
                            <Badge colorScheme={roleColor}>{role}</Badge>
                            {user.organization ? (
                              <Text fontSize="xs" color="gray.500">
                                {user.organization}
                              </Text>
                            ) : null}
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={
                                user.status === "active" ? "green" : "gray"
                              }
                              textTransform="capitalize"
                            >
                              {user.status || "active"}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={user.is_verified ? "green" : "gray"}
                            >
                              {user.is_verified ? "Verified" : "Not verified"}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack justify="flex-end" spacing={1}>
                              <Button
                                size="xs"
                                variant="ghost"
                                leftIcon={<Icon as={FiEye} />}
                                onClick={() => openUserDetails(user)}
                              >
                                Details
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="blue"
                                leftIcon={<Icon as={FiMessageCircle} />}
                                onClick={() => openConversation(user)}
                                isDisabled={!user.id || isSelf}
                              >
                                Message
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
              <Flex
                align="center"
                justify="space-between"
                gap={3}
                p={4}
                borderTop="1px solid"
                borderColor="gray.100"
                wrap="wrap"
              >
                <Text fontSize="sm" color="gray.500">
                  Showing {(otherUsersPage - 1) * otherUsersPageSize + 1}–
                  {Math.min(
                    otherUsersPage * otherUsersPageSize,
                    otherUsers.length,
                  )}{" "}
                  of {otherUsers.length} users
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Icon as={FiChevronLeft} />}
                    onClick={() =>
                      setOtherUsersPage((page) => Math.max(1, page - 1))
                    }
                    isDisabled={otherUsersPage <= 1}
                  >
                    Previous
                  </Button>
                  <Text fontSize="sm" color="gray.600">
                    Page {otherUsersPage} of {otherUsersPageCount}
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    rightIcon={<Icon as={FiChevronRight} />}
                    onClick={() =>
                      setOtherUsersPage((page) =>
                        Math.min(otherUsersPageCount, page + 1),
                      )
                    }
                    isDisabled={otherUsersPage >= otherUsersPageCount}
                  >
                    Next
                  </Button>
                </HStack>
              </Flex>
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

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader borderBottom="1px solid" borderColor="gray.100" pr={12}>
            <HStack spacing={3}>
              <Avatar
                name={selectedUser?.name || selectedUser?.email}
                src={selectedUser?.avatar || undefined}
                size="md"
              />
              <Box minW={0}>
                <Text fontSize="md" noOfLines={1}>
                  {selectedUser?.name || "User details"}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="normal"
                  noOfLines={1}
                >
                  {selectedUser?.email}
                </Text>
              </Box>
              {selectedUser && (
                <Badge
                  ml="auto"
                  colorScheme={
                    selectedUser.status === "active" ? "green" : "gray"
                  }
                >
                  {selectedUser.status || "active"}
                </Badge>
              )}
              {selectedUser?.is_current_user ||
              isCurrentUserId(selectedUser?.id, currentUserIds) ? (
                <Badge colorScheme="blue">You</Badge>
              ) : null}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            {selectedUser && (
              <VStack align="stretch" spacing={4}>
                {selectedUser.avatar ? (
                  <Box display="flex" justifyContent="center">
                    <Box
                      as="button"
                      type="button"
                      aria-label={`View ${selectedUser.name || selectedUser.email}'s profile photo`}
                      onClick={() => openUserPhoto(selectedUser)}
                      borderRadius="full"
                      cursor="zoom-in"
                      _focusVisible={{
                        outline: "3px solid",
                        outlineColor: "blue.500",
                      }}
                    >
                      <Avatar
                        name={selectedUser.name || selectedUser.email}
                        src={selectedUser.avatar}
                        size="2xl"
                      />
                    </Box>
                  </Box>
                ) : null}
                <UserDetailSection
                  title="Account information"
                  data={{
                    name: selectedUser.name,
                    email: selectedUser.email,
                    phone: selectedUser.phone,
                    role: displayRole(selectedUser),
                    platformRole: selectedUser.platformRole,
                    status: selectedUser.status,
                    isVerified: selectedUser.is_verified,
                    createdAt: selectedUser.created_at,
                    organization: selectedUser.organization,
                  }}
                />
                {selectedUser.profiles?.client && (
                  <UserDetailSection
                    title="Parent / client profile"
                    data={selectedUser.profiles.client}
                  />
                )}
                {selectedUser.profiles?.client &&
                selectedUser.profiles.client.children?.length ? (
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p={4}
                  >
                    <HStack justify="space-between" mb={3}>
                      <Text fontWeight="700">Children</Text>
                      <Badge colorScheme="purple">
                        {selectedUser.profiles.client.children.length}
                      </Badge>
                    </HStack>
                    <VStack align="stretch" spacing={3}>
                      {selectedUser.profiles.client.children.map((child) => (
                        <HStack
                          key={child.id}
                          align="flex-start"
                          borderTop="1px solid"
                          borderColor="gray.100"
                          pt={3}
                        >
                          <Avatar
                            name={`${child.name || ""} ${child.lastname || ""}`}
                            src={child.avatar || undefined}
                            size="sm"
                          />
                          <Box minW={0}>
                            <Text fontWeight="600">
                              {[child.name, child.lastname]
                                .filter(Boolean)
                                .join(" ") || "Unnamed child"}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Grade: {child.grade || "Not provided"}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              School: {child.schools?.name || "Not linked"}
                            </Text>
                            {child.created_at ? (
                              <Text fontSize="xs" color="gray.500">
                                Added{" "}
                                {formatDetailValue(
                                  "created_at",
                                  child.created_at,
                                )}
                              </Text>
                            ) : null}
                          </Box>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                ) : selectedUser.profiles?.client ? (
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p={4}
                  >
                    <Text fontWeight="700">Children</Text>
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      No children are linked to this client account.
                    </Text>
                  </Box>
                ) : null}
                {selectedUser.profiles?.driver && (
                  <>
                    <UserDetailSection
                      title="Driver profile"
                      data={Object.fromEntries(
                        Object.entries(selectedUser.profiles.driver).filter(
                          ([key]) =>
                            ![
                              "avatar",
                              "owner",
                              "route",
                              "location",
                              "students",
                              "studentCount",
                            ].includes(key),
                        ),
                      )}
                    />
                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="lg"
                      p={4}
                    >
                      <HStack justify="space-between" mb={3}>
                        <Text fontWeight="700">Driver assignments</Text>
                        <Badge colorScheme="blue">
                          {selectedUser.profiles.driver.studentCount || 0}{" "}
                          {(selectedUser.profiles.driver.studentCount || 0) ===
                          1
                            ? "student"
                            : "students"}
                        </Badge>
                      </HStack>
                      <VStack align="stretch" spacing={3}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">
                            Linked fleet owner
                          </Text>
                          <Text fontSize="sm" fontWeight="600">
                            {selectedUser.profiles.driver.owner?.company_name ||
                              selectedUser.profiles.driver.owner?.users?.name ||
                              "Not assigned"}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">
                            Route and directions
                          </Text>
                          <Text fontSize="sm" fontWeight="600">
                            {selectedUser.profiles.driver.route?.route_name ||
                              "No active route"}
                          </Text>
                          {selectedUser.profiles.driver.route ? (
                            <HStack
                              justify="space-between"
                              align="flex-start"
                              mt={1}
                              gap={3}
                            >
                              <Text fontSize="sm" color="gray.600">
                                {selectedUser.profiles.driver.route
                                  .start_location || "Start not recorded"}
                                {" → "}
                                {selectedUser.profiles.driver.route
                                  .end_location || "Destination not recorded"}
                              </Text>
                              {selectedUser.profiles.driver.route
                                .start_location &&
                              selectedUser.profiles.driver.route
                                .end_location ? (
                                <Button
                                  as="a"
                                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(selectedUser.profiles.driver.route.start_location)}&destination=${encodeURIComponent(selectedUser.profiles.driver.route.end_location)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="xs"
                                  variant="outline"
                                >
                                  Directions
                                </Button>
                              ) : null}
                            </HStack>
                          ) : null}
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">
                            Last known location
                          </Text>
                          {selectedUser.profiles.driver.location ? (
                            <HStack justify="space-between" align="center">
                              <Text fontSize="sm">
                                {selectedUser.profiles.driver.location.latitude}
                                ,{" "}
                                {
                                  selectedUser.profiles.driver.location
                                    .longitude
                                }
                              </Text>
                              <Button
                                as="a"
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedUser.profiles.driver.location.latitude},${selectedUser.profiles.driver.location.longitude}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                size="xs"
                                variant="outline"
                              >
                                View on map
                              </Button>
                            </HStack>
                          ) : (
                            <Text fontSize="sm" color="gray.600">
                              No location has been recorded.
                            </Text>
                          )}
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={2}>
                            Students on route
                          </Text>
                          {selectedUser.profiles.driver.students?.length ? (
                            <VStack align="stretch" spacing={2}>
                              {selectedUser.profiles.driver.students.map(
                                (student) => (
                                  <HStack key={student.id}>
                                    <Avatar
                                      name={`${student.name || ""} ${student.lastname || ""}`}
                                      src={student.avatar || undefined}
                                      size="xs"
                                    />
                                    <Text fontSize="sm">
                                      {[student.name, student.lastname]
                                        .filter(Boolean)
                                        .join(" ") || "Unnamed student"}
                                      {student.grade
                                        ? ` · Grade ${student.grade}`
                                        : ""}
                                    </Text>
                                  </HStack>
                                ),
                              )}
                            </VStack>
                          ) : (
                            <Text fontSize="sm" color="gray.600">
                              No students are assigned to this route.
                            </Text>
                          )}
                        </Box>
                      </VStack>
                    </Box>
                  </>
                )}
                {selectedUser.profiles?.owner && (
                  <>
                    <UserDetailSection
                      title="Fleet owner profile"
                      data={Object.fromEntries(
                        Object.entries(selectedUser.profiles.owner).filter(
                          ([key]) =>
                            !["users", "vehicles", "drivers"].includes(key),
                        ),
                      )}
                    />
                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      p={{ base: 4, md: 5 }}
                      bg="white"
                      boxShadow="sm"
                    >
                      <HStack mb={4} spacing={3}>
                        <Flex
                          align="center"
                          justify="center"
                          boxSize={9}
                          borderRadius="lg"
                          bg="blue.50"
                          color="blue.600"
                        >
                          <Icon as={FiTruck} />
                        </Flex>
                        <Text fontWeight="700" color="gray.800">
                          Linked drivers
                        </Text>
                        <Badge colorScheme="blue">
                          {selectedUser.profiles.owner.drivers?.length || 0}
                        </Badge>
                      </HStack>
                      {selectedUser.profiles.owner.drivers?.length ? (
                        <VStack align="stretch" spacing={3}>
                          {selectedUser.profiles.owner.drivers.map((driver) => {
                            const driverUser = Array.isArray(driver.users)
                              ? driver.users[0]
                              : driver.users;
                            const routeStops = driver.route?.route_stops || [];
                            const directionStops = routeStops.length
                              ? routeStops.filter((stop) => stop.address)
                              : driver.route?.route_waypoints || [];
                            const directionsUrl =
                              driver.route?.start_location &&
                              driver.route?.end_location
                                ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(driver.route.start_location)}&destination=${encodeURIComponent(driver.route.end_location)}${directionStops.length ? `&waypoints=${encodeURIComponent(directionStops.map((stop) => stop.address).join("|"))}` : ""}`
                                : null;
                            return (
                              <Box
                                key={driver.id}
                                border="1px solid"
                                borderColor="gray.100"
                                borderRadius="lg"
                                p={3}
                                bg="gray.50"
                              >
                                <HStack align="flex-start" spacing={3}>
                                  <Avatar
                                    name={driverUser?.name || "Driver"}
                                    src={driver.avatar || undefined}
                                    size="sm"
                                  />
                                  <Box minW={0} flex={1}>
                                    <Text fontWeight="600">
                                      {driverUser?.name || "Unnamed driver"}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      {driverUser?.email || "No email provided"}
                                    </Text>
                                    <HStack mt={1} spacing={2} flexWrap="wrap">
                                      <Badge
                                        colorScheme={
                                          driver.status === "active"
                                            ? "green"
                                            : "gray"
                                        }
                                        textTransform="capitalize"
                                      >
                                        {driver.status || "Status unavailable"}
                                      </Badge>
                                      <Text fontSize="xs" color="gray.500">
                                        {driver.vehicle_plate_number ||
                                          "No vehicle plate on profile"}
                                      </Text>
                                    </HStack>
                                  </Box>
                                </HStack>
                                <Box
                                  mt={3}
                                  pt={3}
                                  borderTop="1px solid"
                                  borderColor="gray.200"
                                >
                                  <HStack spacing={2} mb={1}>
                                    <Icon as={FiMapPin} color="blue.500" />
                                    <Text fontSize="xs" color="gray.500">
                                      Assigned route
                                    </Text>
                                  </HStack>
                                  {driver.route ? (
                                    <Flex
                                      justify="space-between"
                                      align="flex-start"
                                      gap={3}
                                      wrap="wrap"
                                    >
                                      <Box>
                                        <Text fontSize="sm" fontWeight="600">
                                          {driver.route.route_name ||
                                            "Unnamed route"}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                          {driver.route.start_location ||
                                            "Start not recorded"}
                                          {" → "}
                                          {driver.route.end_location ||
                                            "Destination not recorded"}
                                        </Text>
                                      </Box>
                                      {directionsUrl ? (
                                        <Button
                                          as="a"
                                          href={directionsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          size="xs"
                                          variant="outline"
                                        >
                                          Directions
                                        </Button>
                                      ) : null}
                                    </Flex>
                                  ) : (
                                    <Text fontSize="sm" color="gray.600">
                                      No active route assigned.
                                    </Text>
                                  )}
                                </Box>
                                {driver.route ? (
                                  <>
                                    <Box
                                      mt={3}
                                      pt={3}
                                      borderTop="1px solid"
                                      borderColor="gray.200"
                                    >
                                      <HStack justify="space-between" mb={2}>
                                        <Text fontSize="xs" color="gray.500">
                                          Linked students and parents
                                        </Text>
                                        <Badge colorScheme="blue">
                                          {driver.students?.length || 0}
                                        </Badge>
                                      </HStack>
                                      {driver.students?.length ? (
                                        <VStack align="stretch" spacing={2}>
                                          {driver.students.map((student) => {
                                            const parent = Array.isArray(
                                              student.parent,
                                            )
                                              ? student.parent[0]
                                              : student.parent;
                                            const parentUser = Array.isArray(
                                              parent?.users,
                                            )
                                              ? parent.users[0]
                                              : parent?.users;
                                            const studentName = [
                                              student.name,
                                              student.lastname,
                                            ]
                                              .filter(Boolean)
                                              .join(" ");
                                            const parentName =
                                              parentUser?.name ||
                                              [
                                                parent?.first_name,
                                                parent?.last_name,
                                              ]
                                                .filter(Boolean)
                                                .join(" ");
                                            return (
                                              <Box
                                                key={student.id}
                                                borderRadius="md"
                                                bg="white"
                                                px={3}
                                                py={2}
                                              >
                                                <Text
                                                  fontSize="sm"
                                                  fontWeight="600"
                                                >
                                                  {studentName ||
                                                    "Unnamed student"}
                                                  {student.grade
                                                    ? ` · Grade ${student.grade}`
                                                    : ""}
                                                </Text>
                                                <Text
                                                  fontSize="xs"
                                                  color="gray.600"
                                                >
                                                  Parent/guardian:{" "}
                                                  {parentName ||
                                                    "No linked parent"}
                                                  {parentUser?.email ||
                                                  parent?.phone
                                                    ? ` · ${parentUser?.email || parent?.phone}`
                                                    : ""}
                                                </Text>
                                              </Box>
                                            );
                                          })}
                                        </VStack>
                                      ) : (
                                        <Text fontSize="sm" color="gray.600">
                                          No students are linked to this route.
                                        </Text>
                                      )}
                                    </Box>
                                    <Box
                                      mt={3}
                                      pt={3}
                                      borderTop="1px solid"
                                      borderColor="gray.200"
                                    >
                                      <HStack justify="space-between" mb={2}>
                                        <Text fontSize="xs" color="gray.500">
                                          Route stops
                                        </Text>
                                        <Badge colorScheme="purple">
                                          {directionStops.length}
                                        </Badge>
                                      </HStack>
                                      {directionStops.length ? (
                                        <VStack align="stretch" spacing={2}>
                                          {directionStops.map((stop, index) => {
                                            const stopChild = Array.isArray(
                                              stop.children,
                                            )
                                              ? stop.children[0]
                                              : stop.children;
                                            const stopParent = Array.isArray(
                                              stopChild?.clients,
                                            )
                                              ? stopChild.clients[0]
                                              : stopChild?.clients;
                                            const stopParentUser =
                                              Array.isArray(stopParent?.users)
                                                ? stopParent.users[0]
                                                : stopParent?.users;
                                            return (
                                              <HStack
                                                key={stop.id || `${stop.address}-${index}`}
                                                align="flex-start"
                                                spacing={3}
                                              >
                                                <Badge
                                                  colorScheme="blue"
                                                  minW={6}
                                                  textAlign="center"
                                                >
                                                  {stop.stop_order || index + 1}
                                                </Badge>
                                                <Box minW={0}>
                                                  <Text
                                                    fontSize="sm"
                                                    fontWeight="600"
                                                  >
                                                    {stop.children
                                                      ? [
                                                          stopChild?.name,
                                                          stopChild?.lastname,
                                                        ]
                                                          .filter(Boolean)
                                                          .join(" ") ||
                                                        stop.name ||
                                                        stop.address
                                                      : stop.name ||
                                                        stop.address}
                                                    {stop.stop_type
                                                      ? ` · ${stop.stop_type}`
                                                      : ""}
                                                  </Text>
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.600"
                                                  >
                                                    {stop.address}
                                                  </Text>
                                                  {stopParent ? (
                                                    <Text
                                                      fontSize="xs"
                                                      color="gray.500"
                                                    >
                                                      Parent/guardian:{" "}
                                                      {stopParentUser?.name ||
                                                        [
                                                          stopParent.first_name,
                                                          stopParent.last_name,
                                                        ]
                                                          .filter(Boolean)
                                                          .join(" ") ||
                                                        "Not provided"}
                                                    </Text>
                                                  ) : null}
                                                </Box>
                                              </HStack>
                                            );
                                          })}
                                        </VStack>
                                      ) : (
                                        <Text fontSize="sm" color="gray.600">
                                          No route stops have been recorded.
                                        </Text>
                                      )}
                                    </Box>
                                  </>
                                ) : null}
                              </Box>
                            );
                          })}
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No drivers are linked to this fleet owner.
                        </Text>
                      )}
                    </Box>

                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      p={{ base: 4, md: 5 }}
                      bg="white"
                      boxShadow="sm"
                    >
                      <HStack mb={4} spacing={3}>
                        <Flex
                          align="center"
                          justify="center"
                          boxSize={9}
                          borderRadius="lg"
                          bg="blue.50"
                          color="blue.600"
                        >
                          <Icon as={FiTruck} />
                        </Flex>
                        <Text fontWeight="700" color="gray.800">
                          Fleet vehicles
                        </Text>
                        <Badge colorScheme="blue">
                          {selectedUser.profiles.owner.vehicles?.length || 0}
                        </Badge>
                      </HStack>
                      {selectedUser.profiles.owner.vehicles?.length ? (
                        <VStack align="stretch" spacing={3}>
                          {selectedUser.profiles.owner.vehicles.map(
                            (vehicle) => {
                              const assignedDriver =
                                selectedUser.profiles.owner.drivers?.find(
                                  (driver) => driver.id === vehicle.driver_id,
                                );
                              const assignedDriverUser = Array.isArray(
                                assignedDriver?.users,
                              )
                                ? assignedDriver.users[0]
                                : assignedDriver?.users;
                              return (
                                <Box
                                  key={vehicle.id}
                                  border="1px solid"
                                  borderColor="gray.100"
                                  borderRadius="lg"
                                  p={3}
                                >
                                  <Flex
                                    justify="space-between"
                                    align="flex-start"
                                    gap={3}
                                  >
                                    <Box>
                                      <Text fontWeight="700">
                                        {vehicle.name || "Unnamed vehicle"}
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        {[vehicle.model, vehicle.license_plate]
                                          .filter(Boolean)
                                          .join(" · ") ||
                                          "No model or plate provided"}
                                      </Text>
                                    </Box>
                                    <Badge
                                      colorScheme={
                                        vehicle.status === "active"
                                          ? "green"
                                          : "gray"
                                      }
                                      textTransform="capitalize"
                                    >
                                      {vehicle.status || "Status unavailable"}
                                    </Badge>
                                  </Flex>
                                  <SimpleGrid
                                    columns={{ base: 1, sm: 2 }}
                                    spacing={2}
                                    mt={3}
                                  >
                                    <Text fontSize="sm" color="gray.600">
                                      Capacity:{" "}
                                      {vehicle.capacity || "Not provided"}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      Color: {vehicle.color || "Not provided"}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      Driver:{" "}
                                      {assignedDriverUser?.name ||
                                        "Not assigned"}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      Route:{" "}
                                      {assignedDriver?.route?.route_name ||
                                        "No active route"}
                                    </Text>
                                  </SimpleGrid>
                                  {vehicle.vehicle_images?.length ? (
                                    <SimpleGrid
                                      columns={{ base: 2, sm: 3, md: 4 }}
                                      spacing={2}
                                      mt={3}
                                    >
                                      {vehicle.vehicle_images.map(
                                        (image, index) => {
                                          const imageUrl =
                                            typeof image === "string"
                                              ? image
                                              : image?.url ||
                                                image?.publicUrl ||
                                                image?.image_url;
                                          return imageUrl ? (
                                            <Image
                                              key={`${vehicle.id}-image-${index}`}
                                              src={imageUrl}
                                              alt={`${vehicle.name || "Vehicle"} photo ${index + 1}`}
                                              w="100%"
                                              h="120px"
                                              objectFit="cover"
                                              borderRadius="md"
                                            />
                                          ) : null;
                                        },
                                      )}
                                    </SimpleGrid>
                                  ) : (
                                    <Text fontSize="sm" color="gray.500" mt={3}>
                                      No vehicle images available.
                                    </Text>
                                  )}
                                </Box>
                              );
                            },
                          )}
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No vehicles are registered to this fleet owner.
                        </Text>
                      )}
                    </Box>
                  </>
                )}
                {selectedUser.profiles?.schoolMemberships?.length ? (
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p={4}
                  >
                    <Text fontWeight="700" mb={3}>
                      School memberships
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      {selectedUser.profiles.schoolMemberships.map(
                        (membership) => (
                          <UserDetailSection
                            key={membership.id}
                            title={membership.name}
                            data={{
                              staffRole: membership.staffRole,
                              active: membership.isActive,
                              joinedAt: membership.createdAt,
                            }}
                          />
                        ),
                      )}
                    </VStack>
                  </Box>
                ) : null}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      <Modal isOpen={isPhotoOpen} onClose={onPhotoClose} size="4xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="gray.900" maxW="min(90vw, 960px)">
          <ModalCloseButton color="white" zIndex={1} />
          <ModalBody
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={{ base: 3, md: 6 }}
          >
            {selectedPhotoUser?.avatar ? (
              <Image
                src={selectedPhotoUser.avatar}
                alt={`${selectedPhotoUser.name || selectedPhotoUser.email || "User"} profile photo`}
                maxH="80vh"
                maxW="100%"
                objectFit="contain"
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Users;
