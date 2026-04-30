import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  Avatar,
  Card,
  CardBody,
  Divider,
  useToast,
} from "@chakra-ui/react";

const Profile = () => {
  const toast = useToast();

  const [profile, setProfile] = useState({
    name: "Support Agent",
    email: "support@transport.com",
    phone: "081 234 5678",
    role: "Support Agent",
  });

  const handleChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = () => {
    console.log("Saving profile:", profile);

    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={6}>

      {/* HEADER */}
      <Box mb={6}>
        <Heading>My Profile</Heading>
        <Text color="gray.600">
          Manage your support account information
        </Text>
      </Box>

      <Card borderRadius="xl">
        <CardBody>

          {/* PROFILE HEADER */}
          <HStack spacing={6} mb={6}>
            <Avatar size="xl" name={profile.name} />

            <Box>
              <Heading size="md">{profile.name}</Heading>
              <Text color="gray.500">{profile.role}</Text>
            </Box>
          </HStack>

          <Divider mb={6} />

          {/* FORM */}
          <VStack spacing={4} align="stretch">

            <Box>
              <Text mb={1}>Full Name</Text>
              <Input
                value={profile.name}
                onChange={(e) =>
                  handleChange("name", e.target.value)
                }
              />
            </Box>

            <Box>
              <Text mb={1}>Email</Text>
              <Input
                value={profile.email}
                onChange={(e) =>
                  handleChange("email", e.target.value)
                }
              />
            </Box>

            <Box>
              <Text mb={1}>Phone</Text>
              <Input
                value={profile.phone}
                onChange={(e) =>
                  handleChange("phone", e.target.value)
                }
              />
            </Box>

            <Box>
              <Text mb={1}>Role</Text>
              <Input value={profile.role} isReadOnly />
            </Box>

          </VStack>

          {/* ACTIONS */}
          <HStack mt={6}>
            <Button colorScheme="blue" onClick={saveProfile}>
              Save Changes
            </Button>

            <Button variant="outline">
              Change Password
            </Button>
          </HStack>

        </CardBody>
      </Card>

    </Box>
  );
};

export default Profile;