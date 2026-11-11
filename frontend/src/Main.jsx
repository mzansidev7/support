import React, { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useDisclosure } from "@chakra-ui/react";
import LoginPage from "./components/login/LoginPage";
import Dashboard from "./components/dashboard/Dashboard";
import Drivers from "./components/dashboard/Drivers";
import Trips from "./components/dashboard/Trips";
import Vehicles from "./components/dashboard/Vehicles";
import Requests from "./components/dashboard/Requests";
import Settings from "./components/dashboard/Settings";
import Profile from "./components/dashboard/Profile";
import LiveMap from "./components/dashboard/LiveMap";
import Users from "./components/dashboard/Users";
import MessagesInbox from "./components/dashboard/MessagesInbox";
import Payments from "./components/dashboard/Payments";
import SupportUsers from "./components/dashboard/SupportUsers";
import Notifications from "./components/dashboard/Notifications";
import DashboardLayout from "./components/layout/DashboardLayout";
import { PresenceProvider } from "./presence/PresenceProvider";

const getCachedSupportSession = () => {
    try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return token && user?.role === "admin";
    } catch (error) {
        console.error("Could not restore cached support session:", error);
        return false;
    }
};

const Main = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const navigate = useNavigate();

    useEffect(() => {
        const handleSessionExpired = () => navigate("/", { replace: true });
        window.addEventListener("support-auth-expired", handleSessionExpired);
        return () =>
            window.removeEventListener(
                "support-auth-expired",
                handleSessionExpired,
            );
    }, [navigate]);

    return (
        <PresenceProvider>
            <Routes>
                <Route
                    path="/"
                    element={
                        getCachedSupportSession() ? (
                            <Navigate to="/dashboard" replace />
                        ) : (
                            <LoginPage />
                        )
                    }
                />

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
                    path="/users"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <Users />
                        </DashboardLayout>
                    }
                />

                <Route
                    path="/support-users"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <SupportUsers />
                        </DashboardLayout>
                    }
                />

                <Route
                    path="/messages"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <MessagesInbox />
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
                    path="/payments"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <Payments />
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
                    path="/notifications"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <Notifications />
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
                <Route
                    path="/profile"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <Profile />
                        </DashboardLayout>
                    }
                />
                <Route
                    path="/live_map"
                    element={
                        <DashboardLayout
                            isOpen={isOpen}
                            onOpen={onOpen}
                            onClose={onClose}
                        >
                            <LiveMap />
                        </DashboardLayout>
                    }
                />
            </Routes>
        </PresenceProvider>
    );
};

export default Main;
