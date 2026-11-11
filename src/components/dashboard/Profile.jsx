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
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";
import "../../styles/Profile.css";
import { API_URL } from "../../Urls";
import PageHeader from "./PageHeader";

const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token)
    throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      ADMIN_PROFILE_PHONE_IN_USE:
        "That phone number is already used by another account.",
      ADMIN_PROFILE_NAME_INVALID: "Enter a name of 1 to 120 characters.",
      ADMIN_PROFILE_PHONE_INVALID:
        "Phone number must be 32 characters or fewer.",
      INVALID_CURRENT_PASSWORD: "Your current password is incorrect.",
      PASSWORD_TOO_SHORT: "Your new password must be at least 8 characters.",
      PASSWORD_TOO_LONG: "Your new password must be 128 characters or fewer.",
    };
    throw new Error(
      messages[result.error] ||
        result.message ||
        result.error ||
        "The request could not be completed.",
    );
  }
  return result;
};

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const Profile = () => {
  const toast = useToast();
  const storedUser = useMemo(readStoredUser, []);
  const [profile, setProfile] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/admin/profile");
      const admin = result.admin;
      const nextProfile = {
        name: admin.display_name || admin.name || "",
        email: admin.email || "",
        phone: admin.phone || "",
        role:
          admin.admin_role ||
          storedUser?.admin_profile?.admin_role ||
          storedUser?.support_role ||
          "support",
        createdAt: admin.created_at || "",
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
    } catch (requestError) {
      console.error("Could not load support profile:", requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [storedUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const profileChanged =
    profile &&
    savedProfile &&
    (profile.name !== savedProfile.name ||
      profile.phone !== savedProfile.phone);

  const changeProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    try {
      const result = await apiRequest("/admin/profile", {
        method: "PUT",
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      const admin = result.admin;
      const updatedProfile = {
        ...profile,
        name: admin.display_name || admin.name,
        email: admin.email,
        phone: admin.phone || "",
      };
      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);

      const currentUser = readStoredUser() || {};
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...currentUser,
          name: admin.name,
          full_name: updatedProfile.name,
          email: admin.email,
          phone: admin.phone,
          admin_profile: {
            ...currentUser.admin_profile,
            name: updatedProfile.name,
            email: admin.email,
            admin_role: admin.admin_role,
          },
        }),
      );
      window.dispatchEvent(new Event("support-user-updated"));
      toast({
        title: "Profile saved",
        description: "Your support account information has been updated.",
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (requestError) {
      console.error("Could not update support profile:", requestError);
      setError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError("Your new password must be at least 8 characters.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiRequest("/admin/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password updated",
        description: "Your password was changed successfully.",
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (requestError) {
      console.error("Could not change support account password:", requestError);
      setPasswordError(requestError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <Flex className="profile-loading">
        <Spinner color="blue.500" />
        <Text>Loading your account information…</Text>
      </Flex>
    );
  }

  if (!profile) {
    return (
      <Box className="support-profile-page">
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          <AlertDescription>
            {error || "Your profile could not be loaded."}
          </AlertDescription>
          <Button ml="auto" size="sm" onClick={loadProfile}>
            Try again
          </Button>
        </Alert>
      </Box>
    );
  }

  const roleLabel = String(profile.role || "support")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <Box p={{ base: 4, md: 5 }} bg="gray.50" borderColor="gray.200">
      <PageHeader
        eyebrow="ACCOUNT"
        title="My Profile"
        description="Manage your support account information and security."
        actions={
          <Badge
            colorScheme="green"
            variant="subtle"
            px={3}
            py={1.5}
            borderRadius="full"
          >
            <HStack spacing={1.5}>
              <Icon as={FiCheck} />
              <Text>Account active</Text>
            </HStack>
          </Badge>
        }
      />

      {error ? (
        <Alert status="error" borderRadius="xl" mb={5}>
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="profile-card">
        <CardBody>
          <Flex className="profile-identity" align="center" gap={4}>
            <Avatar
              size="lg"
              name={profile.name || profile.email}
              bg="blue.500"
              color="white"
            />
            <Box minW={0}>
              <Heading size="md" noOfLines={1}>
                {profile.name || "Support user"}
              </Heading>
              <Text className="profile-identity-email" noOfLines={1}>
                {profile.email}
              </Text>
            </Box>
            <Badge className="profile-role-badge" colorScheme="blue" ml="auto">
              <HStack spacing={1.5}>
                <Icon as={FiShield} />
                <Text>{roleLabel}</Text>
              </HStack>
            </Badge>
          </Flex>

          <Divider my={6} />

          <form onSubmit={saveProfile}>
            <VStack align="stretch" spacing={5}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                <FormControl isRequired>
                  <FormLabel>Full name</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiUser} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      value={profile.name}
                      maxLength={120}
                      autoComplete="name"
                      onChange={(event) =>
                        changeProfile("name", event.target.value)
                      }
                    />
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel>Email address</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiMail} color="gray.400" />
                    </InputLeftElement>
                    <Input value={profile.email} isReadOnly bg="gray.50" />
                  </InputGroup>
                  <Text className="profile-field-hint">
                    Contact an administrator to change your login email.
                  </Text>
                </FormControl>
                <FormControl>
                  <FormLabel>Phone number</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiPhone} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      value={profile.phone}
                      maxLength={32}
                      autoComplete="tel"
                      onChange={(event) =>
                        changeProfile("phone", event.target.value)
                      }
                    />
                  </InputGroup>
                </FormControl>
                <FormControl>
                  <FormLabel>Platform role</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiShield} color="gray.400" />
                    </InputLeftElement>
                    <Input value={roleLabel} isReadOnly bg="gray.50" />
                  </InputGroup>
                  <Text className="profile-field-hint">
                    Your role controls access to support tools.
                  </Text>
                </FormControl>
              </SimpleGrid>

              <Flex justify="flex-end" gap={3} wrap="wrap">
                <Button
                  variant="outline"
                  onClick={() => setProfile(savedProfile)}
                  isDisabled={!profileChanged || savingProfile}
                >
                  Discard changes
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  leftIcon={<Icon as={FiSave} />}
                  isLoading={savingProfile}
                  isDisabled={!profileChanged || !profile.name.trim()}
                >
                  Save profile
                </Button>
              </Flex>
            </VStack>
          </form>
        </CardBody>
      </Card>

      <Card className="profile-card profile-security-card">
        <CardBody>
          <Flex align="flex-start" gap={3} mb={5}>
            <span className="profile-section-icon">
              <Icon as={FiLock} />
            </span>
            <Box>
              <Heading size="sm">Password & security</Heading>
              <Text className="profile-section-description">
                Change your password by confirming your current password first.
              </Text>
            </Box>
          </Flex>
          {passwordError ? (
            <Alert status="error" borderRadius="lg" mb={4}>
              <AlertIcon />
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={changePassword}>
            <VStack align="stretch" spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                {[
                  ["currentPassword", "Current password"],
                  ["newPassword", "New password"],
                  ["confirmPassword", "Confirm new password"],
                ].map(([field, label]) => (
                  <FormControl key={field} isRequired>
                    <FormLabel>{label}</FormLabel>
                    <InputGroup>
                      <Input
                        type={visiblePasswords[field] ? "text" : "password"}
                        autoComplete={
                          field === "currentPassword"
                            ? "current-password"
                            : "new-password"
                        }
                        value={passwords[field]}
                        onChange={(event) =>
                          setPasswords((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      />
                      <InputRightElement>
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`${visiblePasswords[field] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                          icon={
                            <Icon
                              as={visiblePasswords[field] ? FiEyeOff : FiEye}
                            />
                          }
                          onClick={() =>
                            setVisiblePasswords((current) => ({
                              ...current,
                              [field]: !current[field],
                            }))
                          }
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                ))}
              </SimpleGrid>
              <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                <Text className="profile-field-hint">
                  Use at least 8 characters.
                </Text>
                <Button
                  type="submit"
                  colorScheme="blue"
                  variant="outline"
                  leftIcon={<Icon as={FiLock} />}
                  isLoading={changingPassword}
                  isDisabled={
                    !passwords.currentPassword ||
                    !passwords.newPassword ||
                    !passwords.confirmPassword
                  }
                >
                  Update password
                </Button>
              </Flex>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Profile;
