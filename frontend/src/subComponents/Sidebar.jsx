import React from "react";
import {
    VStack,
    Button,
    Box,
    Heading,
    Drawer,
    DrawerBody,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    Spacer
} from "@chakra-ui/react";

import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = ({ isOpen, onOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const items = [
        { label: "Dashboard", path: "/Dashboard" },
        { label: "Drivers", path: "/drivers" },
        { label: "Trips", path: "/trips" },
        { label: "Vehicles", path: "/vehicles" },
        { label: "Requests", path: "/requests" },
        { label: "Live Map", path: "/live_map" },
        { label: "Settings", path: "/settings" },
        { label: "Profile", path: "/profile" }
    ];

    const handleLogout = () => {
        // Optional: clear auth storage here
        localStorage.removeItem("user");
        localStorage.removeItem("token");

        navigate("/");
    };

    const NavItems = () => (
        <VStack align="start" spacing={3} w="100%" h="100%">
            {items.map(item => (
                <Button
                    key={item.path}
                    w="100%"
                    justifyContent="flex-start"
                    variant={
                        location.pathname === item.path ? "solid" : "ghost"
                    }
                    colorScheme={
                        location.pathname === item.path ? "blue" : "gray"
                    }
                    onClick={() => {
                        navigate(item.path);
                        onClose?.();
                    }}
                >
                    {item.label}
                </Button>
            ))}

            <Spacer />

            <Button
                w="100%"
                colorScheme="red"
                variant="solid"
                onClick={handleLogout}
            >
                Logout
            </Button>
        </VStack>
    );

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <Box
                w="260px"
                bg="white"
                p={6}
                boxShadow="md"
                minH="100vh"
                display={{ base: "none", md: "block" }}
            >
                <Heading size="md" mb={8}>
                    🚍 Track My Kid
                </Heading>

                <NavItems />
            </Box>

            {/* MOBILE DRAWER */}
            <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerBody mt={10}>
                        <NavItems />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    );
};

export default Sidebar;
