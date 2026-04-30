import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
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
import DashboardLayout from "./components/layout/DashboardLayout";

const Main = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [userData, setUserData] = useState(null);

    // const navigate = useNavigate();

    // const getUserFromLocalStorage = () => {
    //     try {
    //         const userStr = localStorage.getItem("user");
    //         return userStr ? JSON.parse(userStr) : null;
    //     } catch (error) {
    //         console.error("Error retrieving user:", error);
    //         return null;
    //     }
    // };

// useEffect(() => {
//     const user = getUserFromLocalStorage();
//     setUserData(user);
// }, []);

// useEffect(() => {
//     if (userData) {
//         navigate("/dashboard");
//     }
// }, [userData, navigate]);

    return (
        <>
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
        </>
    );
};

export default Main;
