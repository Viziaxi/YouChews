// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Register({ userType = "user" }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: "" }
  const navigate = useNavigate();

  const config = {
    user: { title: "Create Your Account", endpoint: "/register", bgColor: "bg-yellow-100", loginPath: "/login" },
    restaurant: { title: "Register Your Restaurant", endpoint: "/restaurant_register", bgColor: "bg-blue-100", loginPath: "/restaurant_login" },
    admin: { title: "Admin Registration", endpoint: "/admin_register", bgColor: "bg-purple-100", loginPath: "/admin_login" },
  };

  const { title, endpoint, bgColor, loginPath } = config[userType] || config.user;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000); // auto-hide after 4s
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check password match
    if (password !== confirmPassword) {
      showToast("error", "Passwords do not match!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("success", "Registration successful! Redirecting to login...");
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify({ ...data.user, type: userType }));
        }
        setTimeout(() => navigate(loginPath), 2000);
      } else {
        showToast("error", data.error || data.message || "Registration failed");
      }
    } catch (error) {
      showToast("error", `Server error. Please try again later.${error}`);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgColor} p-4 relative`}>
      {/* Beautiful Toast Popup */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div
            className={`px-4 py-2 rounded-lg border-2 text-white font-medium text-base flex items-center gap-2 transition-all
            ${toast.type === "success" 
              ? "bg-green-600/70 border-green-600" 
              : "bg-red-600/70 border-red-600"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

       <h1
        className="
        absolute top-0 left-1/2 -translate-x-1/2
        text-6xl sm:text-7xl md:text-8xl lg:text-9xl 
        font-extrabold 
        tracking-tight 
        text-transparent 
        bg-clip-text 
        bg-gradient-to-r from-purple-500 to-pink-500
        leading-tight
        mb-4
      "
      >
        YouChews
      </h1>

      <form
        className="bg-white shadow-xl rounded-xl p-10 w-full max-w-md border-t-4"
        style={{
          borderTopColor:
            userType === "admin" ? "#a855f7" :
            userType === "restaurant" ? "#3b82f6" : "#ef4444"
        }}
        onSubmit={handleSubmit}
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">{title}</h2>

        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Register"
            className="w-32 h-32 object-cover border-4 border-white"
          />
        </div>

        <label className="block mb-5">
          <span className="text-gray-700 font-medium">Username</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="mt-2 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-current transition"
          />
        </label>

        <label className="block mb-5">
          <span className="text-gray-700 font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-current transition"
          />
        </label>

        <label className="block mb-8">
          <span className="text-gray-700 font-medium">Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-2 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-current transition"
          />
        </label>

        {/* Button always enabled — as you requested */}
        <Button type="submit" variant="primary" size="lg" className="w-full">
          Register as {userType.charAt(0).toUpperCase() + userType.slice(1)}
        </Button>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => navigate(loginPath)}
            className="text-blue-600 hover:underline font-medium"
          >
            Already have an account? Login here
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 mb-4 font-medium">
            Register a different type of account?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {userType !== "user" && (
              <button onClick={() => navigate("/register")} className="text-blue-600 hover:text-blue-800 underline font-medium transition">
                User register
              </button>
            )}
            {userType !== "restaurant" && (
              <button onClick={() => navigate("/restaurant_register")} className="text-indigo-600 hover:text-indigo-800 underline font-medium transition">
                Restaurant register
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Simple CSS animation (add to your global CSS or inside component) */}
      <style jsx>{`
        @keyframes slideDown {
          from { transform: translateY(-100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}