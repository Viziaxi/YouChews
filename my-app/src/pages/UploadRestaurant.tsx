import React, { useState, useEffect, FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

// Define the structure of the data we're sending to the backend
interface RestaurantData {
  name: string;
  id: string;
  address: string;
  cuisine: string;
  service_style: string;
  menu: string[]; // Array of strings
  price: number;
  flavors: string[]; // Array of strings
}

// State type for the component
interface UploadState {
  name: string;
  id: string;
  address: string;
  cuisine: string;
  service_style: string;
  menuInput: string; // Comma-separated string input for menu
  price: number | ""; // Use '' for initial empty state
  flavorsInput: string; // Comma-separated string input for flavors
}

interface Props {
  id: string; // assuming the page already receives an ID
}

// Main component
const UploadRestaurantPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [idee, setIdee] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [formData, setFormData] = useState<UploadState>({
    name: "",
    id: "",
    address: "",
    cuisine: "",
    service_style: "",
    menuInput: "",
    price: "",
    flavorsInput: "",
  });
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const backendUrl = "https://youchews.onrender.com/upload_restaurant"; // Update this if your backend is on a different domain/port

  // 1. Check for token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken) {
      setToken(storedToken);
    } else {
      setMessage("Authorization token not found. Please log in.");
    }

    if (!storedUser) {
      console.error("No user stored in localStorage.");
      setMessage("Authorization token not found. Please log in.");

      return;
    }

    const user = JSON.parse(storedUser);
    const scoreAsInteger = parseInt(user.id, 10);
    setIdee(user.id);
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]:
        name === "price" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMessage("Cannot submit: No valid token found.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Submitting restaurant data...");

    // Convert comma-separated strings to arrays
    const parsedData: RestaurantData = {
      name: formData.name,
      id: idee,
      address: formData.address,
      cuisine: formData.cuisine,
      service_style: formData.service_style,
      // Split by comma, trim whitespace, and filter out empty strings
      menu: formData.menuInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      price: typeof formData.price === "number" ? formData.price : 0, // Ensure price is a number
      flavors: formData.flavorsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };

    try {
      const response = await axios.post(backendUrl, parsedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // The backend should return a status number (e.g., 200, 201)
      setMessage(`Upload successful! Status: ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Handle HTTP error (e.g., 401 Unauthorized, 400 Bad Request)
        setMessage(
          `Upload failed: ${error.response.status} - ${
            error.response.data.message || "Server error"
          }`
        );
      } else {
        // Handle network or other errors
        setMessage(
          `An unexpected error occurred: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Rendering Logic ---

  if (!token && message.includes("token not found")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-700">{message}</p>
          <p className="mt-2 text-sm text-gray-500">
            Please ensure you have a valid token in local storage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-blue-100 p-4 relative`}
    >
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
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-2xl border-t-4 border-t-[#3b82f6]">
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt="Login"
            className="w-32 h-32  object-cover  border-4 border-white"
          />
        </div>
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Upload New Restaurant
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Name and ID */}
          <div>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Restaurant Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Row 3: Cuisine, Service Style, Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="cuisine"
                className="block text-sm font-medium text-gray-700"
              >
                Cuisine Type
              </label>
              <input
                type="text"
                id="cuisine"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Italian, Mexican"
              />
            </div>
            <div>
              <label
                htmlFor="service_style"
                className="block text-sm font-medium text-gray-700"
              >
                Service Style
              </label>
              <input
                type="text"
                id="service_style"
                name="service_style"
                value={formData.service_style}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., sit_down, take_out"
              />
            </div>
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700"
              >
                Price (Average)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="No dollar sign"
              />
            </div>
          </div>

          {/* Row 4: Menu and Flavors (Comma Separated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="menuInput"
                className="block text-sm font-medium text-gray-700"
              >
                Menu Items (Comma Separated)
              </label>
              <input
                type="text"
                id="menuInput"
                name="menuInput"
                value={formData.menuInput}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Burger, Fries, Salad"
              />
            </div>
            <div>
              <label
                htmlFor="flavorsInput"
                className="block text-sm font-medium text-gray-700"
              >
                Flavor Profiles (Comma Separated)
              </label>
              <input
                type="text"
                id="flavorsInput"
                name="flavorsInput"
                value={formData.flavorsInput}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Spicy, Savory, Sweet"
              />
            </div>
          </div>

          {/* Submission Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !token}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white transition duration-200 ${
                isSubmitting || !token
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              }`}
            >
              {isSubmitting ? "Sending Data..." : "Upload Restaurant"}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 p-4 rounded-md ${
                message.includes("successful")
                  ? "bg-green-100 text-green-800"
                  : message.includes("failed")
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              <p className="font-medium">{message}</p>
            </div>
          )}
        </form>
      </div>
      <Link
        to="/login" // Replace '/target-page' with your actual destination path
        className="absolute bottom-10 text-black hover:text-black-700 transition duration-150"
      >
        Log Out
      </Link>
    </div>
  );
};

export default UploadRestaurantPage;
