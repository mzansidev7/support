import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerOverlay,
    Flex,
    HStack,
    Icon,
    Image,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    FiActivity,
    FiDollarSign,
    FiGrid,
    FiLogOut,
    FiMap,
    FiMessageCircle,
    FiSettings,
    FiShield,
    FiTruck,
    FiUser,
    FiUsers,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../Asserts/images/logo.png";

const items = [
    { label: "Dashboard", path: "/dashboard", icon: FiGrid },
    { label: "Drivers", path: "/drivers", icon: FiUsers },
    { label: "Users", path: "/users", icon: FiUsers },
    { label: "Support Users", path: "/support-users", icon: FiShield },
    { label: "Messages", path: "/messages", icon: FiMessageCircle },
    { label: "Trips", path: "/trips", icon: FiMap },
    { label: "Vehicles", path: "/vehicles", icon: FiTruck },
    { label: "Payments", path: "/payments", icon: FiDollarSign },
    { label: "Requests", path: "/requests", icon: FiActivity },
    { label: "Live Map", path: "/live_map", icon: FiMap },
    { label: "Settings", path: "/settings", icon: FiSettings },
    { label: "Profile", path: "/profile", icon: FiUser },
];

const SidebarContent = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    };
    const [user, setUser] = useState(readUser);
    useEffect(() => {
        const refreshUser = () => setUser(readUser());
        window.addEventListener("support-user-updated", refreshUser);
        return () => window.removeEventListener("support-user-updated", refreshUser);
    }, []);
    const displayName =
        user?.full_name || user?.admin_profile?.name || user?.name || "Support user";
    const email = user?.email || user?.admin_profile?.email || "";
    const role = String(
        user?.admin_profile?.admin_role || user?.support_role || "support",
    )
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
        onClose?.();
    };

    return (
        <Flex
            direction="column"
            h="100%"
            minH={0}
            overflow="hidden"
            px={{ base: 4, md: 5 }}
            py={{ base: 5, md: 6 }}
        >
            <HStack spacing={3} mb={{ base: 6, md: 8 }} px={2}>
                <Flex
                    align="center"
                    justify="center"
                    w="46px"
                    h="46px"
                    flexShrink={0}
                    borderRadius="13px"
                    bg="white"
                    overflow="hidden"
                    boxShadow="0 8px 20px rgba(0, 0, 0, 0.2)"
                >
                    <Image src={logo} alt="Track My Kid" boxSize="100%" objectFit="contain" />
                </Flex>
                <Box minW={0}>
                    <Text
                        color="white"
                        fontSize="sm"
                        fontWeight="800"
                        letterSpacing="-.02em"
                        lineHeight="1.25"
                    >
                        Track My Kid
                    </Text>
                    <Text color="blue.200" fontSize="xs" mt={1}>
                        Support console
                    </Text>
                </Box>
            </HStack>

            <Text
                color="whiteAlpha.600"
                fontSize="10px"
                fontWeight="800"
                letterSpacing=".14em"
                mb={2}
                px={3}
                textTransform="uppercase"
            >
                Workspace
            </Text>
            <VStack align="stretch" spacing={1} flex="1" minH={0}>
                {items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <Button
                            key={item.path}
                            h={{ base: "40px", md: "42px" }}
                            minH={{ base: "40px", md: "42px" }}
                            px={3}
                            justifyContent="flex-start"
                            borderRadius="10px"
                            bg={active ? "whiteAlpha.200" : "transparent"}
                            color={active ? "white" : "whiteAlpha.700"}
                            fontSize="sm"
                            fontWeight={active ? "700" : "500"}
                            leftIcon={<Icon as={item.icon} boxSize={4} />}
                            _hover={{
                                bg: active ? "whiteAlpha.200" : "whiteAlpha.100",
                                color: "white",
                            }}
                            _active={{ bg: "whiteAlpha.300" }}
                            onClick={() => {
                                navigate(item.path);
                                onClose?.();
                            }}
                        >
                            {item.label}
                        </Button>
                    );
                })}
            </VStack>

            <Box pt={3} mt={3} borderTop="1px solid" borderColor="whiteAlpha.200">
                <HStack
                    spacing={3}
                    p={3}
                    mb={2}
                    borderRadius="13px"
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    minW={0}
                >
                    <Flex
                        align="center"
                        justify="center"
                        flexShrink={0}
                        w="38px"
                        h="38px"
                        borderRadius="12px"
                        bg="blue.400"
                        color="white"
                        fontSize="sm"
                        fontWeight="800"
                        boxShadow="0 5px 14px rgba(59, 130, 246, 0.24)"
                    >
                        {initials || <Icon as={FiUser} />}
                    </Flex>
                    <Box minW={0} flex="1">
                        <Text
                            color="white"
                            fontSize="sm"
                            fontWeight="700"
                            noOfLines={1}
                        >
                            {displayName}
                        </Text>
                        <Text color="whiteAlpha.600" fontSize="xs" noOfLines={1}>
                            {email || role}
                        </Text>
                        {email ? (
                            <Text
                                display="inline-block"
                                mt={1}
                                px={2}
                                py="1px"
                                borderRadius="full"
                                bg="blue.400"
                                color="white"
                                fontSize="9px"
                                fontWeight="700"
                                textTransform="capitalize"
                            >
                                {role}
                            </Text>
                        ) : null}
                    </Box>
                </HStack>
                <Button
                    w="100%"
                    h="42px"
                    justifyContent="flex-start"
                    px={3}
                    borderRadius="10px"
                    bg="transparent"
                    color="red.200"
                    fontSize="sm"
                    fontWeight="600"
                    leftIcon={<Icon as={FiLogOut} boxSize={4} />}
                    _hover={{ bg: "red.500", color: "white" }}
                    onClick={handleLogout}
                >
                    Sign out
                </Button>
            </Box>
        </Flex>
    );
};

const Sidebar = ({ isOpen, onClose }) => (
    <>
        <Box
            as="aside"
            display={{ base: "none", md: "block" }}
            position="sticky"
            top={0}
            flexShrink={0}
            w="256px"
            h="100vh"
            overflow="hidden"
            bg="#111827"
            boxShadow="8px 0 28px rgba(15, 23, 42, 0.08)"
        >
            <SidebarContent />
        </Box>

        <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
            <DrawerOverlay bg="blackAlpha.600" />
            <DrawerContent bg="#111827" color="white" overflow="hidden">
                <DrawerBody p={0} h="100vh" overflow="hidden">
                    <SidebarContent onClose={onClose} />
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    </>
);

export default Sidebar;
