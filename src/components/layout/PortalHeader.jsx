import React, { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import {
  FiBell,
  FiChevronDown,
  FiChevronRight,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { clearSupportSession } from "../../utils/asyncStorage/authSession";

const pageNames = {
  "/dashboard": "Dashboard",
  "/drivers": "Drivers",
  "/users": "Users",
  "/support-users": "Support Users",
  "/messages": "Messages",
  "/trips": "Trips",
  "/vehicles": "Vehicles",
  "/payments": "Payments",
  "/requests": "Requests",
  "/notifications": "Notifications",
  "/live_map": "Live Map",
  "/settings": "Settings",
  "/profile": "Profile",
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    console.error("Could not read the support user profile:", error);
    return null;
  }
};

const PortalHeader = ({ onOpen }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pageName = pageNames[pathname] || "Dashboard";
  const displayName =
    user?.full_name || user?.admin_profile?.name || user?.name || "Support user";
  const role = String(
    user?.admin_profile?.admin_role || user?.support_role || "support",
  )
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  useEffect(() => {
    const refreshUser = () => setUser(readUser());
    const refreshNotificationCount = (event) => {
      const count = Number(event.detail?.count);
      if (Number.isFinite(count)) setUnreadNotifications(Math.max(0, count));
    };

    window.addEventListener("support-user-updated", refreshUser);
    window.addEventListener(
      "support-unread-notifications-updated",
      refreshNotificationCount,
    );
    return () => {
      window.removeEventListener("support-user-updated", refreshUser);
      window.removeEventListener(
        "support-unread-notifications-updated",
        refreshNotificationCount,
      );
    };
  }, []);

  const logout = () => {
    clearSupportSession();
    navigate("/", { replace: true });
  };

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      h="64px"
      minH="64px"
      align="center"
      justify="space-between"
      gap={3}
      px={{ base: 4, md: 6, lg: 7 }}
      borderBottom="1px solid"
      borderColor="gray.200"
      bg="white"
      boxShadow="sm"
    >
      <HStack spacing={{ base: 2, md: 4 }} minW={0}>
        <IconButton
          display={{ base: "inline-flex", md: "none" }}
          aria-label="Open navigation menu"
          icon={<FiMenu />}
          variant="ghost"
          color="gray.600"
          onClick={onOpen}
        />
        <HStack spacing={{ base: 1, md: 2 }} minW={0} whiteSpace="nowrap">
          <Link
            as={RouterLink}
            to="/dashboard"
            display={{ base: "none", sm: "inline" }}
            color="gray.600"
            fontSize={{ base: "xs", md: "sm" }}
            _hover={{ color: "blue.600", textDecoration: "none" }}
          >
            Support
          </Link>
          <Icon
            display={{ base: "none", sm: "block" }}
            as={FiChevronRight}
            color="gray.400"
          />
          <Text color="gray.800" fontSize={{ base: "xs", md: "sm" }} fontWeight="700" noOfLines={1}>
            {pageName}
          </Text>
        </HStack>
      </HStack>

      <HStack spacing={{ base: 2, md: 4 }} flexShrink={0}>
        <Box position="relative">
          <IconButton
            aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`}
            title={`${unreadNotifications} unread notifications`}
            icon={<FiBell />}
            variant="ghost"
            color="gray.600"
            onClick={() => navigate("/notifications")}
          />
          {unreadNotifications > 0 && (
            <Badge
              position="absolute"
              top="1px"
              right="1px"
              minW="16px"
              h="16px"
              px={1}
              borderRadius="full"
              colorScheme="red"
              fontSize="9px"
              lineHeight="16px"
              textAlign="center"
              pointerEvents="none"
            >
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </Badge>
          )}
        </Box>

        <Menu>
          <MenuButton
            as={Button}
            variant="ghost"
            h="auto"
            minW={0}
            px={{ base: 1, md: 2 }}
            py={1}
            _hover={{ bg: "gray.50" }}
            _active={{ bg: "gray.100" }}
          >
            <HStack spacing={2}>
              <Avatar
                size="sm"
                name={displayName}
                bg="blue.500"
                color="white"
              />
              <Box
                display={{ base: "none", sm: "block" }}
                minW={0}
                textAlign="left"
              >
                <Text color="gray.800" fontSize="xs" fontWeight="700" noOfLines={1}>
                  {displayName}
                </Text>
                <Text color="gray.500" fontSize="xs" noOfLines={1}>
                  {role}
                </Text>
              </Box>
              <Icon as={FiChevronDown} color="gray.500" />
            </HStack>
          </MenuButton>
          <MenuList zIndex={20}>
            <Box px={3} py={2}>
              <Text fontSize="sm" fontWeight="700">
                {displayName}
              </Text>
              <Text color="gray.500" fontSize="xs">
                {user?.email || role}
              </Text>
            </Box>
            <MenuItem icon={<FiLogOut />} onClick={logout}>
              Sign out
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
};

export default PortalHeader;
