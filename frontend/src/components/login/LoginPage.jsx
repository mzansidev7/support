import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from "lucide-react";
import { supabaseClient } from "../../supabaseClient/supabase.config.js";
import mainLogo from "../../Asserts/images/mainLogo.png";
import "./LoginPage.css";

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
            const { data, error } = await supabaseClient
                .from("support_user")
                .select("*")
                .eq("email", email)
                .eq("password", password)

                .single();

            if (error || !data) {
                setSuccess(false);
                setMessage(error);
                setLoading(false);
                setTimeout(() => {
                    setMessage("");
                }, 10000);
                return;
            }

            if (!data.is_active) {
                setSuccess(false);
                setMessage("Account is disabled");
                setLoading(false);
                return;
            }

            // store session
            localStorage.setItem("user", JSON.stringify(data));

            setSuccess(true);
            setMessage("Login successful!");

            // navigate after short delay (optional UX)
            setTimeout(() => {
                navigate("/dashboard");
            }, 800);
        } catch (err) {
            setSuccess(false);
            setMessage("Something went wrong. Try again.");
        }
        setLoading(false);
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
                    {success && (
                        <div className="messageBox">
                            <h4 className="success">{message}</h4>
                        </div>
                    )}

                    <div className="messageBox">
                        <h4 style={{ color: "red" }}>Testing emails:</h4>

                        <h4 className="success">admim@test.com</h4>
                        <h4 className="success">agent@test.com</h4>
                        <h4 className="success">dispatch@test.com</h4>
                    </div>
                    <div className="messageBox">
                        <h3 style={{ color: "red" }}>Password:</h3>
                        <h4 className="success">123456</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
