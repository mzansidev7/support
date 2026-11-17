import React from 'react';
import { Flex, Box } from "@chakra-ui/react";
import Sidebar from "../../subComponents/Sidebar";
import PortalHeader from "./PortalHeader";

const DashboardLayout = ({ children, isOpen, onOpen, onClose }) => {
  return (
    <Flex bg="gray.100" minH="100vh">

      {/* SIDEBAR */}
      <Sidebar isOpen={isOpen} onClose={onClose} />

      {/* MAIN */}
      <Box flex="1" minW={0}>
        <PortalHeader onOpen={onOpen} />
        <Box>
          {children}
        </Box>

      </Box>
    </Flex>
  );
};

export default DashboardLayout;