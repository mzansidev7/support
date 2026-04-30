import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ ADD
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../../supabaseClient/supabase.config.js";
import mainLogo from "../../Asserts/images/mainLogo.png";
import "./LoginPage.css";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // ✅ ADD

const handleSubmit = async (e) => {
  e.preventDefault();

  const email = e.target.email.value;
  const password = e.target.password.value;

  // 1. check user in support_user table
  const { data, error } = await supabase
    .from("support_user")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

console.log(data);
  if (error || !data) {
    alert("Invalid email or password");
    return;
  }

  if (!data.is_active) {
    alert("Account is disabled");
    return;
  }

  // 2. store user session
  localStorage.setItem("user", JSON.stringify(data));

navigate("/dashboard");
  // // 3. role-based routing
  // if (data.role === "admin") navigate("/admin");
  // if (data.role === "support_agent") navigate("/dashboard");
  // if (data.role === "dispatcher") navigate("/map");
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