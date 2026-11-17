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
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
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
  FiEye,
  FiEyeOff,
  FiInfo,
  FiPlus,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { API_URL } from "../../Urls";
import educationDistrictsAndProvinces from "../../data/educationDistrictsAndProvinces";
import SupportPageHeader from "./SupportPageHeader";

const governmentRoles = {
  national_admin: "National administrator",
  provincial_admin: "Provincial administrator",
  district_admin: "District administrator",
  monitoring_officer: "Monitoring officer",
};

const governmentRoleGuides = [
  {
    role: "national_admin",
    scope: "National",
    description: "Can view aggregated school information across the country.",
  },
  {
    role: "provincial_admin",
    scope: "One province",
    description: "Can view aggregated school information for the assigned province.",
  },
  {
    role: "district_admin",
    scope: "One district in one province",
    description: "Can view aggregated school information for the assigned education district.",
  },
  {
    role: "monitoring_officer",
    scope: "Assigned province, district, or school",
    description: "Can view aggregated school information within the assigned area.",
  },
];

const roleScopes = {
  national_admin: ["national"],
  provincial_admin: ["province"],
  district_admin: ["district"],
  monitoring_officer: ["province", "district", "school"],
};

const scopeLabels = {
  national: "National",
  province: "Province",
  district: "District",
  school: "School",
};

const defaultForm = {
  name: "",
  email: "",
  initial_password: "",
  government_role: "national_admin",
  scope_type: "national",
  province: "",
  district: "",
  school_id: "",
  can_view_live_locations: false,
  can_view_individual_learners: false,
  can_view_fleet_registry: false,
  can_view_overview: false,
  can_view_schools: false,
  can_view_trips: false,
  can_view_incidents: false,
  can_view_compliance: false,
  can_view_reports: false,
  can_view_government_users: false,
  can_view_audit_logs: false,
};

const modulePermissions = [
  ["can_view_overview", "Overview and geographic analytics"],
  ["can_view_schools", "School registry and profiles"],
  ["can_view_fleet_registry", "Operator, driver and vehicle registries"],
  ["can_view_trips", "Trip monitoring"],
  ["can_view_incidents", "Incident management"],
  ["can_view_compliance", "Compliance reviews"],
  ["can_view_reports", "Reports and analytics"],
  ["can_view_government_users", "Government user directory"],
  ["can_view_audit_logs", "Audit log access"],
];
const additionalPermissions = [
  ["can_view_live_locations", "View live vehicle locations"],
  ["can_view_individual_learners", "View individual learner records"],
];

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = {
      GOVERNMENT_USER_EMAIL_IN_USE: "That email is already registered.",
      GOVERNMENT_USER_SCOPE_NOT_FOUND:
        "The selected province, district, or school could not be found.",
      GOVERNMENT_USER_SCOPE_INVALID:
        "The selected role and geographic scope are not compatible.",
      GOVERNMENT_USER_PASSWORD_INVALID:
        "The initial password must be at least 12 characters and no more than 72 bytes.",
      GOVERNMENT_USER_NAME_INVALID: "Enter a name of up to 120 characters.",
      GOVERNMENT_USER_EMAIL_INVALID: "Enter a valid email address.",
      GOVERNMENT_USER_PERMISSIONS_INVALID:
        "The additional permission settings are invalid.",
      GOVERNMENT_USER_NOT_FOUND: "That active government account was not found.",
      GOVERNMENT_USER_SCOPE_REQUIRED:
        "That account has no active geographic assignment.",
      ADMIN_GOVERNMENT_USER_PERMISSIONS_UPDATE_FAILED:
        "Unable to update government access. Please try again.",
      GOVERNMENT_SCHOOLS_UNAVAILABLE: "Unable to search schools right now.",
      PLATFORM_ADMIN_ROLE_FORBIDDEN:
        "Only an active super admin can add government users.",
    };
    throw new Error(
      errors[result?.error] ||
        result?.message ||
        result?.error ||
        "The request could not be completed.",
    );
  }
  return result;
};

const assignmentDescription = (assignment) => {
  if (assignment.scope_type === "national") return "National";
  if (assignment.scope_type === "province") {
    return `${assignment.province} province`;
  }
  if (assignment.scope_type === "district") {
    return `${assignment.district}, ${assignment.province}`;
  }
  return assignment.school_name || "School scope";
};

const GovernmentUsers = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAccessOpen,
    onOpen: onAccessOpen,
    onClose: onAccessClose,
  } = useDisclosure();
  const {
    isOpen: isRolesGuideOpen,
    onOpen: onRolesGuideOpen,
    onClose: onRolesGuideClose,
  } = useDisclosure();
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      console.error("Could not read the current admin profile:", error);
      return null;
    }
  }, []);
  const isSuperAdmin = currentUser?.admin_profile?.admin_role === "super_admin";
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [accessUser, setAccessUser] = useState(null);
  const [accessForm, setAccessForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const provinces = Object.keys(educationDistrictsAndProvinces).filter(
    (province) => province !== "Other",
  );
  const districts = educationDistrictsAndProvinces[form.province] || [];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/government-users");
      if (!Array.isArray(result)) {
        throw new Error("The server returned an invalid government user list.");
      }
      setUsers(result);
    } catch (requestError) {
      setError(requestError.message || "Unable to load government users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!isOpen || form.scope_type !== "school") return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const query = new URLSearchParams({ search: schoolSearch.trim() });
        const result = await apiRequest(
          `/admin/government-users/schools?${query.toString()}`,
          { signal: controller.signal },
        );
        if (!Array.isArray(result)) {
          throw new Error("The server returned an invalid school search result.");
        }
        setSchools(result);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Unable to search schools.");
        }
      } finally {
        if (!controller.signal.aborted) setSearchingSchools(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.scope_type, isOpen, schoolSearch]);

  const openCreate = () => {
    setForm(defaultForm);
    setSchools([]);
    setSchoolSearch("");
    setError("");
    setSuccess("");
    setShowTemporaryPassword(false);
    onOpen();
  };

  const closeModal = () => {
    if (saving) return;
    onClose();
    setForm(defaultForm);
    setShowTemporaryPassword(false);
    setError("");
  };

  const updateRole = (governmentRole) => {
    const scopeType = roleScopes[governmentRole][0];
    setForm((current) => ({
      ...current,
      government_role: governmentRole,
      scope_type: scopeType,
      province: "",
      district: "",
      school_id: "",
      can_view_fleet_registry:
        governmentRole === "monitoring_officer"
          ? current.can_view_fleet_registry
          : false,
      can_view_overview: false,
      can_view_schools: false,
      can_view_trips: false,
      can_view_incidents: false,
      can_view_compliance: false,
      can_view_reports: false,
      can_view_government_users: false,
      can_view_audit_logs: false,
    }));
    setSchoolSearch("");
    setSchools([]);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest("/admin/government-users", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
          province: form.province.trim(),
          district: form.district.trim(),
        }),
      });
      setSuccess("Government user created and access recorded.");
      onClose();
      setForm(defaultForm);
      setShowTemporaryPassword(false);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Unable to create government user.");
    } finally {
      setSaving(false);
    }
  };

  const openAccessEditor = (user) => {
    const assignment = user.assignments?.[0] || {};
    setAccessUser(user);
    setAccessForm(
      Object.fromEntries(
        [
          ...additionalPermissions,
          ...modulePermissions,
        ].map(([field]) => [field, assignment[field] === true]),
      ),
    );
    setError("");
    setSuccess("");
    onAccessOpen();
  };

  const saveAccess = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin || !accessUser || savingAccess) return;
    setSavingAccess(true);
    setError("");
    setSuccess("");
    try {
      await apiRequest(
        `/admin/government-users/${accessUser.id}/permissions`,
        {
          method: "PATCH",
          body: JSON.stringify(accessForm),
        },
      );
      setSuccess(`Access permissions updated for ${accessUser.name || accessUser.email}.`);
      onAccessClose();
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Unable to update government access.");
    } finally {
      setSavingAccess(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 5 }} bg="gray.50">
      <SupportPageHeader
        eyebrow="GOVERNMENT ACCESS"
        title="Government users"
        description="Provision government accounts with role-based geographic access."
        actions={
          <HStack>
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              variant="outline"
              colorScheme="blue"
              onClick={() => void loadUsers()}
              isLoading={loading}
            >
              Refresh
            </Button>
            {isSuperAdmin ? (
              <Button
                leftIcon={<Icon as={FiPlus} />}
                colorScheme="blue"
                onClick={openCreate}
              >
                Add government user
              </Button>
            ) : null}
            <Button
              leftIcon={<Icon as={FiInfo} />}
              variant="outline"
              colorScheme="blue"
              onClick={onRolesGuideOpen}
            >
              Government roles
            </Button>
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
            Only super admins can provision government accounts.
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : users.length ? (
        <Box
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          bg="white"
          overflow="hidden"
          boxShadow="sm"
        >
          <TableContainer>
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Government user</Th>
                  <Th>Role</Th>
                  <Th>Geographic scope</Th>
                  <Th>Additional access</Th>
                  <Th>Status</Th>
                  {isSuperAdmin ? <Th>Actions</Th> : null}
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => {
                  const assignments = user.assignments || [];
                  const permissions = [
                    ...new Set(
                      assignments.flatMap((assignment) => [
                        ...(assignment.can_view_live_locations
                          ? ["Live locations"]
                          : []),
                        ...(assignment.can_view_individual_learners
                          ? ["Individual learners"]
                          : []),
                        ...(user.government_role === "monitoring_officer"
                          ? modulePermissions
                              .filter(([field]) => assignment[field])
                              .map(([, label]) => label)
                          : modulePermissions.map(([, label]) => label)),
                      ]),
                    ),
                  ];
                  return (
                    <Tr key={user.id} _hover={{ bg: "blue.50" }}>
                      <Td minW="230px">
                        <HStack spacing={3}>
                          <Avatar
                            name={user.name || user.email}
                            size="sm"
                            bg="blue.100"
                            color="blue.700"
                          />
                          <Box minW={0}>
                            <Text fontWeight="600" noOfLines={1}>
                              {user.name || "Unnamed government user"}
                            </Text>
                            <Text color="gray.500" fontSize="sm" noOfLines={1}>
                              {user.email}
                            </Text>
                          </Box>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme="purple">
                          {governmentRoles[user.government_role] ||
                            user.government_role}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          {assignments.length ? (
                            assignments.map((assignment, index) => (
                              <Text key={`${assignment.scope_type}-${index}`}>
                                {scopeLabels[assignment.scope_type]}:{" "}
                                {assignmentDescription(assignment)}
                              </Text>
                            ))
                          ) : (
                            <Text color="gray.500">No active scope</Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        {permissions.length ? permissions.join(", ") : "None"}
                      </Td>
                      <Td>
                        <Badge colorScheme={user.is_active ? "green" : "gray"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      {isSuperAdmin ? (
                        <Td>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="blue"
                            isDisabled={!assignments.length}
                            onClick={() => openAccessEditor(user)}
                          >
                            Manage access
                          </Button>
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Card>
          <CardBody textAlign="center" py={12}>
            <Icon as={FiShield} boxSize={8} color="gray.400" />
            <Text color="gray.600" mt={3}>
              No government users have been provisioned.
            </Text>
          </CardBody>
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent as="form" onSubmit={saveUser}>
          <ModalHeader>Add government user</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {error ? (
              <Alert status="error" borderRadius="lg" mb={4}>
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  maxLength={120}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  maxLength={254}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Initial password</FormLabel>
                <InputGroup>
                  <Input
                    type={showTemporaryPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.initial_password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        initial_password: event.target.value,
                      }))
                    }
                    minLength={12}
                    maxLength={72}
                    pr="3rem"
                  />
                  <InputRightElement>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label={
                        showTemporaryPassword
                          ? "Hide initial password"
                          : "Show initial password"
                      }
                      icon={
                        <Icon as={showTemporaryPassword ? FiEyeOff : FiEye} />
                      }
                      onClick={() =>
                        setShowTemporaryPassword((visible) => !visible)
                      }
                      type="button"
                    />
                  </InputRightElement>
                </InputGroup>
                <Text color="gray.500" fontSize="xs" mt={1}>
                  Use at least 12 characters. Share it with the user securely.
                </Text>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Government role</FormLabel>
                <Select
                  value={form.government_role}
                  onChange={(event) => updateRole(event.target.value)}
                >
                  {Object.entries(governmentRoles).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {roleScopes[form.government_role].length > 1 ? (
                <FormControl isRequired>
                  <FormLabel>Geographic scope type</FormLabel>
                  <Select
                    value={form.scope_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scope_type: event.target.value,
                        province: "",
                        district: "",
                        school_id: "",
                      }))
                    }
                  >
                    {roleScopes[form.government_role].map((scope) => (
                      <option key={scope} value={scope}>
                        {scopeLabels[scope]}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl>
                  <FormLabel>Geographic scope</FormLabel>
                  <Input value={scopeLabels[form.scope_type]} isReadOnly />
                </FormControl>
              )}
              {form.scope_type === "province" ||
              form.scope_type === "district" ? (
                <FormControl isRequired>
                  <FormLabel>Province</FormLabel>
                  <Select
                    value={form.province}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        province: event.target.value,
                        district: "",
                      }))
                    }
                    placeholder="Select a province"
                  >
                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              {form.scope_type === "district" ? (
                <FormControl isRequired>
                  <FormLabel>District</FormLabel>
                  <Select
                    value={form.district}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        district: event.target.value,
                      }))
                    }
                    placeholder="Select an education district"
                    isDisabled={!form.province}
                  >
                    {districts
                      .filter((district) => district !== "Other")
                      .map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                  </Select>
                </FormControl>
              ) : null}
              {form.scope_type === "school" ? (
                <>
                  <FormControl>
                    <FormLabel>Find a school</FormLabel>
                    <Input
                      value={schoolSearch}
                      onChange={(event) => setSchoolSearch(event.target.value)}
                      placeholder="Search by school name"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>School</FormLabel>
                    <Select
                      value={form.school_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          school_id: event.target.value,
                        }))
                      }
                      placeholder={
                        searchingSchools ? "Searching..." : "Select a school"
                      }
                      isDisabled={searchingSchools}
                    >
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                          {school.district || school.province
                            ? ` — ${[school.district, school.province]
                                .filter(Boolean)
                                .join(", ")}`
                            : ""}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </>
              ) : null}
              <Box>
                <Text fontWeight="600" mb={2}>
                  Sensitive data permissions
                </Text>
                <VStack align="start" spacing={2}>
                  {additionalPermissions.map(([field, label]) => (
                    <Checkbox
                      key={field}
                      isChecked={form[field]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.checked,
                        }))
                      }
                      colorScheme="blue"
                    >
                      {label}
                    </Checkbox>
                  ))}
                </VStack>
              </Box>
              {form.government_role === "monitoring_officer" ? (
                <Box>
                  <Text fontWeight="600" mb={2}>
                    Explicit module grants
                  </Text>
                  <Text color="gray.500" fontSize="sm" mb={3}>
                    Monitoring officers can only open the modules selected
                    here, and only within the assigned geographic scope.
                  </Text>
                  <VStack align="start" spacing={2}>
                    {modulePermissions.map(([field, label]) => (
                      <Checkbox
                        key={field}
                        isChecked={form[field]}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [field]: event.target.checked,
                          }))
                        }
                        colorScheme="blue"
                      >
                        {label}
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
              ) : null}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeModal} isDisabled={saving}>
              Cancel
            </Button>
            <Button type="submit" colorScheme="blue" isLoading={saving}>
              Create government user
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isAccessOpen}
        onClose={() => {
          if (!savingAccess) onAccessClose();
        }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent as="form" onSubmit={saveAccess}>
          <ModalHeader>Manage government access</ModalHeader>
          <ModalCloseButton isDisabled={savingAccess} />
          <ModalBody>
            <Text color="gray.600" fontSize="sm" mb={4}>
              {accessUser?.name || accessUser?.email}. Changes apply to all
              active geographic assignments and are recorded in the audit log.
            </Text>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="600" mb={2}>
                  Sensitive data permissions
                </Text>
                <VStack align="start" spacing={2}>
                  {additionalPermissions.map(([field, label]) => (
                    <Checkbox
                      key={field}
                      isChecked={accessForm[field] === true}
                      onChange={(event) =>
                        setAccessForm((current) => ({
                          ...current,
                          [field]: event.target.checked,
                        }))
                      }
                      colorScheme="blue"
                    >
                      {label}
                    </Checkbox>
                  ))}
                </VStack>
              </Box>
              {accessUser?.government_role === "monitoring_officer" ? (
                <Box>
                  <Text fontWeight="600" mb={2}>
                    Explicit module grants
                  </Text>
                  <VStack align="start" spacing={2}>
                    {modulePermissions.map(([field, label]) => (
                      <Checkbox
                        key={field}
                        isChecked={accessForm[field] === true}
                        onChange={(event) =>
                          setAccessForm((current) => ({
                            ...current,
                            [field]: event.target.checked,
                          }))
                        }
                        colorScheme="blue"
                      >
                        {label}
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
              ) : null}
              {error ? (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              variant="ghost"
              onClick={onAccessClose}
              isDisabled={savingAccess}
            >
              Cancel
            </Button>
            <Button type="submit" colorScheme="blue" isLoading={savingAccess}>
              Save access
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isRolesGuideOpen}
        onClose={onRolesGuideClose}
        isCentered
        scrollBehavior="inside"
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Government roles and permissions</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              {governmentRoleGuides.map((guide) => (
                <Box key={guide.role}>
                  <HStack mb={1} justify="space-between" flexWrap="wrap">
                    <Text fontWeight="700">{governmentRoles[guide.role]}</Text>
                    <Badge colorScheme="purple">{guide.scope}</Badge>
                  </HStack>
                  <Text color="gray.600" fontSize="sm">
                    {guide.description}
                  </Text>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    Assigned scope:{" "}
                    {roleScopes[guide.role]
                      .map((scope) => scopeLabels[scope])
                      .join(", ")}
                  </Text>
                </Box>
              ))}
              <Divider />
              <Box>
                <Text fontWeight="700" mb={1}>
                  Baseline access
                </Text>
                <Text color="gray.600" fontSize="sm">
                  National, provincial, and district administrators can access
                  their assigned scope. Monitoring officers need an explicit
                  grant for each module, and their records remain limited to
                  their assigned province, district, or school. Fleet review
                  decisions are restricted to administrators.
                </Text>
              </Box>
              <Box>
                <Text fontWeight="700" mb={1}>
                  Additional permissions
                </Text>
                <Text color="gray.600" fontSize="sm">
                  Live vehicle locations and individual learner records are
                  separate sensitive-data permissions. Monitoring-officer
                  module grants are off by default and can be changed by a
                  platform super admin. All grants are audited and enforced
                  separately from geographic scope.
                </Text>
              </Box>
              <Text color="gray.500" fontSize="sm">
                Scope values must match the education province and district
                directory used by the school portal.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onRolesGuideClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GovernmentUsers;
