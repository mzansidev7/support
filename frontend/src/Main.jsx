import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDisclosure } from "@chakra-ui/react";
import LoginPage from "./components/login/LoginPage";
import Dashboard from "./components/dashboard/Dashboard";
import Drivers from "./components/dashboard/Drivers";
import Trips from "./components/dashboard/Trips";
import Vehicles from "./components/dashboard/Vehicles";
import Requests from "./components/dashboard/Requests";
import Settings from "./components/dashboard/Settings";
import DashboardLayout from "./components/layout/DashboardLayout";

const Main = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Routes>

      <Route path="/" element={<LoginPage />} />

      {/* WRAPPED PAGES */}
      <Route
        path="/dashboard"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Dashboard />
          </DashboardLayout>
        }
      />

      <Route
        path="/drivers"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Drivers />
          </DashboardLayout>
        }
      />

      <Route
        path="/trips"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Trips />
          </DashboardLayout>
        }
      />

      <Route
        path="/vehicles"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Vehicles />
          </DashboardLayout>
        }
      />

      <Route
        path="/requests"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Requests />
          </DashboardLayout>
        }
      />

      <Route
        path="/settings"
        element={
          <DashboardLayout
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
          >
            <Settings />
          </DashboardLayout>
        }
      />

    </Routes>
  );
};

export default Main;