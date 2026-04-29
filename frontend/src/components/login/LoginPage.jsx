import React, { useState } from 'react';
import { useNavigate } from "react-router-dom"; // ✅ ADD
import { Eye, EyeOff } from "lucide-react";
import mainLogo from "../../Asserts/images/mainLogo.png";
import "./LoginPage.css";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // ✅ ADD

  const handleSubmit = (e) => {
    e.preventDefault(); // ✅ stop page reload

    // 👉 later: validate login / call API
    // for now just redirect

    navigate("/dashboard"); // ✅ REDIRECT
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

          {/* ✅ attach submit handler */}
          <form onSubmit={handleSubmit}>
            
            <div className="inputGroup">
              <label>Email</label>
              <input type="email" placeholder="Enter your email" />
            </div>

            <div className="inputGroup">
              <label>Password</label>

              <div className="passwordBox">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button className="loginBtn" type="submit">
              Sign In
            </button>

          </form>

          <p className="footerText">Forgot password? Reset it</p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;