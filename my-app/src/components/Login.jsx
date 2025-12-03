// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login({ userType = "user" }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: "" }
  const navigate = useNavigate();

  const config = {
    user: {
      title: "Welcome Back",
      endpoint: "/login",
      bgColor: "bg-yellow-100",
      successRedirect: "/recommender",
      registerPath: "/register",
    },
    restaurant: {
      title: "Restaurant Login",
      endpoint: "/restaurant_login",
      bgColor: "bg-blue-100",
      successRedirect: "/restaurant_submission",
      registerPath: "/restaurant_register",
    },
    admin: {
      title: "Admin Login",
      endpoint: "/admin_login",
      bgColor: "bg-purple-100",
      successRedirect: "/placeholder",
      registerPath: null,
    },
  };

  const { title, endpoint, bgColor, successRedirect, registerPath } = config[userType];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (res.ok || res.status === 200) {
        showToast("success", "Login successful! Welcome back!");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify({ ...data.user, type: userType }));
        setTimeout(() => navigate(successRedirect), 1500);
      } else {
        showToast("error", data.error || data.message || "Invalid credentials");
      }
    } catch (err) {
      showToast("error", `Server error. Please try again later.${err}`);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${bgColor} p-4 relative`}>
      {/* Beautiful Toast Popup — same as Register! */}
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
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {title}
        </h2>

        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Login"
            className="w-32 h-32  object-cover  border-4 border-white"
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

        <label className="block mb-8">
          <span className="text-gray-700 font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-current transition"
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!name || !password}
        >
          Sign In as {userType.charAt(0).toUpperCase() + userType.slice(1)}
        </Button>

        {registerPath && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate(registerPath)}
              className="text-blue-600 hover:underline font-medium"
            >
              Don’t have an account? Register here
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-center text-gray-600 mb-4 font-medium">
            Looking for a different login?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {userType !== "user" && (
              <button onClick={() => navigate("/login")} className="text-blue-600 hover:text-blue-800 underline font-medium transition">
                User Login
              </button>
            )}
            {userType !== "restaurant" && (
              <button onClick={() => navigate("/restaurant_login")} className="text-indigo-600 hover:text-indigo-800 underline font-medium transition">
                Restaurant Login
              </button>
            )}
            {userType !== "admin" && (
              <button onClick={() => navigate("/admin_login")} className="text-purple-600 hover:text-purple-800 underline font-medium transition">
                Admin Login
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Same animation as Register */}
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