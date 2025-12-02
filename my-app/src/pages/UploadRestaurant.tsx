import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "https://youchews.onrender.com";

interface RestaurantFormData {
  name: string;
  id: number;
  address: string;
  categories: string;
  service_type: string;
  menu: string;
  flavors: string;
}

interface UploadRestaurantProps {
  initialData?: RestaurantFormData | null;
  restaurantId?: number;
  onSuccess?: () => void;
}

const UploadRestaurant: React.FC<UploadRestaurantProps> = ({ 
  initialData = null, 
  restaurantId,
  onSuccess 
}) => {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: initialData?.name || "",
    id: initialData?.id || restaurantId || 0,
    address: initialData?.address || "",
    categories: (initialData as any)?.categories || "",
    service_type: (initialData as any)?.service_type || "",
    menu: initialData?.menu || "",
    flavors: initialData?.flavors || "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "id" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found. Please log in.");
      setLoading(false);
      return;
    }

    // Ensure id is set from restaurantId if not provided
    const submitData = {
      ...formData,
      id: formData.id || restaurantId || 0,
    };

    // Validate required fields
    if (!submitData.name || !submitData.address || !submitData.categories || 
        !submitData.service_type || !submitData.menu || !submitData.flavors) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/upload_restaurant`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === 200) {
        setSuccess(response.data.message || "Restaurant information submitted successfully!");
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
      } else {
        setError(response.data.error || "Failed to submit restaurant information.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.message || 
        "Failed to submit restaurant information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          {initialData ? "Update Restaurant Information" : "Upload Restaurant Information"}
        </h1>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter restaurant name"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full address"
              />
            </div>

            <div>
              <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-2">
                Categories *
              </label>
              <input
                type="text"
                id="categories"
                name="categories"
                value={formData.categories}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Italian, Mexican, Asian"
              />
            </div>

            <div>
              <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-2">
                Service Type *
              </label>
              <input
                type="text"
                id="service_type"
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Fine Dining, Casual, Fast Food"
              />
            </div>

            <div>
              <label htmlFor="menu" className="block text-sm font-medium text-gray-700 mb-2">
                Menu Description *
              </label>
              <textarea
                id="menu"
                name="menu"
                value={formData.menu}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your menu items and specialties"
              />
            </div>

            <div>
              <label htmlFor="flavors" className="block text-sm font-medium text-gray-700 mb-2">
                Flavor Profile *
              </label>
              <input
                type="text"
                id="flavors"
                name="flavors"
                value={formData.flavors}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Spicy, Sweet, Savory, Umami"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : initialData ? "Update Restaurant" : "Submit Restaurant"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadRestaurant;
