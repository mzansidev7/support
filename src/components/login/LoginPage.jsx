import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from "lucide-react";
import mainLogo from "../../Asserts/images/mainLogo.png";
import { supabaseClient } from "../../supabaseClient/supabase.config";
import { API_URL } from "../../Urls";
import "./LoginPage.css";

const getLoginErrorMessage = (code) => {
    switch (code) {
        case "INVALID_CREDENTIALS":
            return "The email or password is incorrect.";
        case "ACCOUNT_INACTIVE":
        case "PLATFORM_ADMIN_INACTIVE":
            return "This account is inactive. Contact your administrator.";
        case "PLATFORM_ADMIN_REQUIRED":
            return "This account does not have support dashboard access.";
        default:
            return "Unable to sign in right now. Please try again.";
    }
};

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.token || !result.user) {
                setSuccess(false);
                setMessage(getLoginErrorMessage(result.error));
                return;
            }

            if (result.user.role !== "admin") {
                setSuccess(false);
                setMessage(
                    "This account does not have support dashboard access.",
                );
                return;
            }

            if (
                !result.supabaseSession?.access_token ||
                !result.supabaseSession?.refresh_token
            ) {
                throw new Error("The server returned an invalid Supabase session.");
            }
            const { error: sessionError } = await supabaseClient.auth.setSession({
                access_token: result.supabaseSession.access_token,
                refresh_token: result.supabaseSession.refresh_token,
            });
            if (sessionError) throw sessionError;

            localStorage.setItem("token", result.token);
            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...result.user,
                    full_name:
                        result.user.admin_profile?.name ||
                        result.user.name ||
                        result.user.email,
                    support_role:
                        result.user.admin_profile?.admin_role || "support",
                }),
            );
            window.dispatchEvent(new Event("support-auth-changed"));

            setSuccess(true);
            setMessage("Login successful!");

            // navigate after short delay (optional UX)
            setTimeout(() => {
                navigate("/dashboard");
            }, 800);
        } catch (err) {
            console.error("Support login request failed:", err);
            setSuccess(false);
            setMessage(
                "Could not connect to the authentication service. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="loginCard">
                <div className="left">
                    <h1>Welcome Back</h1>
                    <p>Sign in to access support dashboard</p>
                </div>

                <div className="right">
                    <div className="main_logo">
                        <img src={mainLogo} alt="Logo" />
                    </div>
                    <h2>Login</h2>

                    <form onSubmit={handleSubmit}>
                        <input
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <div
                            style={{ position: "relative", marginTop: "15px" }}
                        >
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    cursor: "pointer"
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </span>
                        </div>

                        <button
                            className={loading ? "loginLoading" : "loginBtn"}
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="footerText">Forgot password? Reset it</p>
                    {message ? (
                        <div className="messageBox">
                            <h4 className={success ? "success" : "error"}>
                                {message}
                            </h4>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
