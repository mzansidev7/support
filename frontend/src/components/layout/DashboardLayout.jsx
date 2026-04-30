import React from 'react';
import { Flex, Box, HStack, Heading, Icon } from "@chakra-ui/react";
import { FiMenu } from "react-icons/fi";
import Sidebar from "../../subComponents/Sidebar";

const DashboardLayout = ({ children, isOpen, onOpen, onClose }) => {
  return (
    <Flex bg="gray.100" minH="100vh">

      {/* SIDEBAR */}
      <Sidebar isOpen={isOpen} onClose={onClose} />

      {/* MAIN */}
      <Box flex="1">

        {/* 🔥 GLOBAL TOPBAR (THIS FIXES EVERYTHING) */}
        <Box
          display={{ base: "block", md: "none" }}
          bg="white"
          px={4}
          py={3}
          boxShadow="sm"
        >
          <HStack justify="space-between">

            <Heading size="sm">🚍 Track My Kid</Heading>

            <Icon
              as={FiMenu}
              boxSize={6}
              cursor="pointer"
              onClick={onOpen}
            />

          </HStack>
        </Box>

        {/* PAGE CONTENT */}
        <Box>
          {children}
        </Box>

      </Box>
    </Flex>
  );
};

export default DashboardLayout;