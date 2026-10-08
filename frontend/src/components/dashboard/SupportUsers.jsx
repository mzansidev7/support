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
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { FiEdit2, FiPlus, FiRefreshCw, FiShield } from "react-icons/fi";
import PageHeader from "./PageHeader";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://track-my-kid-server-production.up.railway.app")
).replace(/\/$/, "");

const roleLabels = {
  super_admin: "Super admin",
  support: "Support",
  operations: "Operations",
  analyst: "Analyst",
};

const emptyForm = {
  name: "",
  email: "",
  admin_role: "support",
  is_active: true,
  temporary_password: "",
};

const readCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const SupportUsers = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const currentUser = useMemo(readCurrentUser, []);
  const isSuperAdmin = currentUser?.admin_profile?.admin_role === "super_admin";
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const response = await fetch(`${API_URL}/admin/support-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(result?.error || "Unable to load support users.");
      }
      setUsers(result);
    } catch (requestError) {
      console.error("Could not load platform support users:", requestError);
      setError(requestError?.message || "Unable to load support users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.email || ""} ${user.admin_role || ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    onOpen();
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      admin_role: user.admin_role,
      is_active: user.is_active,
      temporary_password: "",
    });
    setError("");
    setSuccess("");
    onOpen();
  };

  const closeModal = () => {
    if (saving) return;
    onClose();
    setEditingUser(null);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Your support session has expired. Please sign in again.");
      }
      const creating = !editingUser;
      const path = creating
        ? `${API_URL}/admin/support-users`
        : `${API_URL}/admin/support-users/${encodeURIComponent(editingUser.id)}`;
      const response = await fetch(path, {
        method: creating ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          admin_role: form.admin_role,
          is_active: form.is_active,
          ...(form.temporary_password
            ? { temporary_password: form.temporary_password }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errors = {
          SUPPORT_USER_EMAIL_IN_USE: "That email is already registered.",
          LAST_ACTIVE_SUPER_ADMIN:
            "At least one active super admin must remain on the platform.",
          CANNOT_REMOVE_OWN_SUPER_ADMIN_ACCESS:
            "You cannot remove your own active super admin access.",
          PLATFORM_ADMIN_ROLE_FORBIDDEN:
            "Only super admins can make support-user changes.",
        };
        throw new Error(
          errors[result?.error] || result?.message || result?.error || "Unable to save support user.",
        );
      }
      setSuccess(creating ? "Support user created." : "Support user updated.");
      await loadUsers(true);
      onClose();
    } catch (requestError) {
      setError(requestError?.message || "Unable to save support user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" p={{ base: 4, md: 6, xl: 8 }}>
      <PageHeader
        eyebrow="PLATFORM ACCESS"
        title="Support users"
        description="Manage platform administrators who can access the support console."
        actions={
          <HStack>
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              variant="outline"
              colorScheme="blue"
              onClick={() => void loadUsers(true)}
              isLoading={refreshing}
            >
              Refresh
            </Button>
            {isSuperAdmin ? (
              <Button
                leftIcon={<Icon as={FiPlus} />}
                colorScheme="blue"
                onClick={openCreate}
              >
                Add support user
              </Button>
            ) : null}
          </HStack>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert status="success" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {!isSuperAdmin ? (
        <Alert status="info" borderRadius="xl" mb={4}>
          <AlertIcon />
          <AlertDescription>
            You can view support users. Only super admins can add or edit accounts.
          </AlertDescription>
        </Alert>
      ) : null}

      <HStack mb={4} justify="space-between">
        <Input
          maxW={{ base: "100%", md: "380px" }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or role..."
          bg="white"
          aria-label="Search support users"
        />
        <Badge colorScheme="blue" px={3} py={2} borderRadius="full">
          {filteredUsers.length} users
        </Badge>
      </HStack>

      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : filteredUsers.length ? (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          {filteredUsers.map((user) => (
            <Card key={user.id} border="1px solid" borderColor="gray.100">
              <CardBody>
                <Flex justify="space-between" align="flex-start" gap={4}>
                  <HStack minW={0} align="flex-start" spacing={3}>
                    <Avatar name={user.name || user.email} />
                    <Box minW={0}>
                      <Heading size="sm" noOfLines={1}>
                        {user.name || "Unnamed support user"}
                      </Heading>
                      <Text color="gray.500" fontSize="sm" mt={1} noOfLines={1}>
                        {user.email}
                      </Text>
                      <HStack mt={3} spacing={2}>
                        <Badge colorScheme="purple">
                          {roleLabels[user.admin_role] || user.admin_role}
                        </Badge>
                        <Badge colorScheme={user.is_active ? "green" : "gray"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </HStack>
                    </Box>
                  </HStack>
                  {isSuperAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={FiEdit2} />}
                      onClick={() => openEdit(user)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </Flex>
                <Text color="gray.500" fontSize="xs" mt={4}>
                  Added {user.created_at ? new Date(user.created_at).toLocaleDateString() : "date unavailable"}
                </Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Card>
          <CardBody textAlign="center" py={12}>
            <Icon as={FiShield} boxSize={8} color="gray.400" />
            <Text color="gray.600" mt={3}>
              {search ? "No support users match your search." : "No support users have been added."}
            </Text>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={saveUser}>
          <ModalHeader>{editingUser ? "Edit support user" : "Add support user"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  maxLength={120}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  maxLength={254}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Access role</FormLabel>
                <Select
                  value={form.admin_role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, admin_role: event.target.value }))
                  }
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormControl>
              {!editingUser || form.temporary_password ? (
                <FormControl isRequired={!editingUser}>
                  <FormLabel>
                    {editingUser ? "Reset temporary password" : "Temporary password"}
                  </FormLabel>
                  <Input
                    type="password"
                    value={form.temporary_password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        temporary_password: event.target.value,
                      }))
                    }
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <Text color="gray.500" fontSize="xs" mt={1}>
                    Must be 12–128 characters. Share it with the user securely.
                  </Text>
                </FormControl>
              ) : (
                <FormControl>
                  <FormLabel>Reset temporary password</FormLabel>
                  <Input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={form.temporary_password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        temporary_password: event.target.value,
                      }))
                    }
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <Text color="gray.500" fontSize="xs" mt={1}>
                    Enter at least 12 characters to reset the password.
                  </Text>
                </FormControl>
              )}
              {editingUser ? (
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0}>Account active</FormLabel>
                  <Switch
                    isChecked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    colorScheme="green"
                  />
                </FormControl>
              ) : null}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeModal} isDisabled={saving}>
              Cancel
            </Button>
            <Button type="submit" colorScheme="blue" isLoading={saving}>
              {editingUser ? "Save changes" : "Create user"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SupportUsers;
