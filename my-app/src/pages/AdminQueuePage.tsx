import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://youchews.onrender.com";

interface QueueItem {
  id: string;
  name: string;
  address: string;
  categories: string | string[];
  service_type: string;
  menu: string;
  flavors: string | string[];
  formatted_address?: string;
  lat?: number;
  lon?: number;
}

interface QueueResponse {
  status: number;
  message: string;
  data: QueueItem[];
  error?: string;
}

interface ManageQueueResponse {
  status: number;
  message?: string;
  error?: string;
}

interface AllRestaurantsResponse {
  status: number;
  message: string;
  data: QueueItem[];
  error?: string;
}

type ViewMode = "queue" | "restaurants";

const AdminQueuePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("queue");
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<"approve" | "deny" | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check admin authentication
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/admin_login");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (user.type !== "admin") {
        setError("Unauthorized: Admin access required");
        setLoading(false);
        return;
      }
    } catch {
      navigate("/admin_login");
      return;
    }

    fetchQueue();
  }, [navigate]);

  const fetchAllRestaurants = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<AllRestaurantsResponse>(
        `${API_BASE_URL}/get_all_restaurants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === 200 && response.data.data) {
        setAllRestaurants(response.data.data);
      } else {
        setError(response.data.error || "Failed to fetch restaurants");
      }
    } catch (err: any) {
      console.error("Fetch restaurants error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to load restaurants. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<QueueResponse>(`${API_BASE_URL}/get_queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.status === 200 && response.data.data) {
        setQueueItems(response.data.data);
      } else {
        setError(response.data.error || "Failed to fetch queue");
      }
    } catch (err: any) {
      console.error("Fetch queue error:", err);
      setError(
        err.response?.data?.error ||
          "Failed to load queue. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === queueItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queueItems.map((item) => item.id)));
    }
  };

  const handleManageQueue = async (type: "approve" | "deny") => {
    if (selectedItems.size === 0) {
      setError("Please select at least one item");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      return;
    }

    setActionType(type);
    setProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const approved_list = type === "approve" ? Array.from(selectedItems) : [];
      const denied_list =
        type === "deny"
          ? Array.from(selectedItems).map((id) => ({ id }))
          : [];

      const response = await axios.post<ManageQueueResponse>(
        `${API_BASE_URL}/manage_queue`,
        {
          approved_list,
          denied_list,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === 200) {
        setSuccessMessage(
          response.data.message || `Successfully ${type}d ${selectedItems.size} item(s)`
        );
        setSelectedItems(new Set());
        // Refresh queue after a short delay
        setTimeout(() => {
          fetchQueue();
          if (viewMode === "restaurants") {
            fetchAllRestaurants();
          }
        }, 1000);
      } else {
        setError(response.data.error || `Failed to ${type} items`);
      }
    } catch (err: any) {
      console.error("Manage queue error:", err);
      setError(
        err.response?.data?.error ||
          `Failed to ${type} items. Please try again.`
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin_login");
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedItems(new Set());
    setError(null);
    setSuccessMessage(null);
    if (mode === "queue") {
      fetchQueue();
    } else {
      fetchAllRestaurants();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading queue...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Admin Management</h1>
          <div className="flex gap-4">
            <button
              onClick={() => viewMode === "queue" ? fetchQueue() : fetchAllRestaurants()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b-2 border-gray-200">
          <button
            onClick={() => handleViewModeChange("queue")}
            className={`px-6 py-3 font-semibold transition ${
              viewMode === "queue"
                ? "border-b-4 border-purple-500 text-purple-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Queue ({queueItems.length})
          </button>
          <button
            onClick={() => handleViewModeChange("restaurants")}
            className={`px-6 py-3 font-semibold transition ${
              viewMode === "restaurants"
                ? "border-b-4 border-purple-500 text-purple-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Restaurants ({allRestaurants.length})
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border-2 border-green-400 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Selection Controls - Only show for queue view */}
        {viewMode === "queue" && queueItems.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                {selectedItems.size === queueItems.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-gray-600">
                {selectedItems.size} of {queueItems.length} selected
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleManageQueue("approve")}
                disabled={selectedItems.size === 0 || processing}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {processing && actionType === "approve" ? "Processing..." : "Approve Selected"}
              </button>
              <button
                onClick={() => handleManageQueue("deny")}
                disabled={selectedItems.size === 0 || processing}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {processing && actionType === "deny" ? "Processing..." : "Deny Selected"}
              </button>
            </div>
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === "queue" ? (
          /* Queue Items */
          queueItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-2xl text-gray-600 mb-2">Queue is empty</p>
              <p className="text-gray-500">No restaurants pending approval</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-2 transition ${
                    selectedItems.has(item.id)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex-1">{item.name}</h3>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemToggle(item.id)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <p className="text-gray-700 font-medium">
                        {item.formatted_address || item.address}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Categories:</span>
                      <p className="text-gray-700 font-medium">
                        {Array.isArray(item.categories) ? item.categories.join(", ") : item.categories}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Service Type:</span>
                      <p className="text-gray-700 font-medium">{item.service_type}</p>
                    </div>
                    {item.flavors && (
                      <div>
                        <span className="text-gray-500">Flavors:</span>
                        <p className="text-gray-700 font-medium">
                          {Array.isArray(item.flavors) ? item.flavors.join(", ") : item.flavors}
                        </p>
                      </div>
                    )}
                    {item.menu && (
                      <div>
                        <span className="text-gray-500">Menu:</span>
                        <p className="text-gray-700 font-medium text-xs truncate">{item.menu}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* All Restaurants */
          allRestaurants.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-2xl text-gray-600 mb-2">No restaurants found</p>
              <p className="text-gray-500">No restaurants have been approved yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allRestaurants.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-gray-300 transition"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <p className="text-gray-700 font-medium">
                        {item.formatted_address || item.address}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Categories:</span>
                      <p className="text-gray-700 font-medium">
                        {Array.isArray(item.categories) ? item.categories.join(", ") : item.categories}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Service Type:</span>
                      <p className="text-gray-700 font-medium">{item.service_type}</p>
                    </div>
                    {item.flavors && (
                      <div>
                        <span className="text-gray-500">Flavors:</span>
                        <p className="text-gray-700 font-medium">
                          {Array.isArray(item.flavors) ? item.flavors.join(", ") : item.flavors}
                        </p>
                      </div>
                    )}
                    {item.menu && (
                      <div>
                        <span className="text-gray-500">Menu:</span>
                        <p className="text-gray-700 font-medium text-xs truncate">{item.menu}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AdminQueuePage;

