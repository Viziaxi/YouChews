import React, { useEffect, useState } from "react";
import axios from "axios";

// --- Type Definitions ---

interface RecommendationData {
  id: string;
  name: string;
  address: string;
  formatted_address: string;
  cuisine: string[]; // Assuming array, adjust if string
  price_tier: number; // e.g., 1, 2, 3, 4
  lat: number;
  lon: number;
  distance_km: number;
  distance_miles: number;
  recommendation_score: number;
  rank: number;
}

interface Metadata {
  user_location: { lat: number; lng: number };
  search_radius_km: number;
  candidates_considered: number;
  recommendations_returned: number;
}

interface ApiResponse {
  status: string;
  data: RecommendationData[];
  metadata: Metadata;
}

// --- Component ---

const RecommendationPage: React.FC = () => {
  // State Management
  const [recommendations, setRecommendations] = useState<RecommendationData[]>(
    []
  );
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Initial Load: Check Token & Get Location ---
  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Unauthorized: No valid token found.");
        setLoading(false);
        return; // Redirect to login logic would go here
      }

      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        setLoading(false);
        return;
      }

      // Example: Times Square, New York
      const mockLat = 40.758;
      const mockLong = -73.9855;

      console.log("Using Mock Location:", mockLat, mockLong);

      // Call fetch directly, skipping navigator.geolocation
      fetchRecommendations(token, mockLat, mockLong);

      // --- CHANGE END ---

      /*navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchRecommendations(
            token,
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (geoError) => {
          setError(
            "Unable to retrieve your location. Please allow location access."
          );
          setLoading(false);
        }
      );*/
    };

    initialize();
  }, []);

  // --- 2. Fetch Recommendations ---
  const fetchRecommendations = async (
    token: string,
    latit: number,
    long: number
  ) => {
    try {
      const response = await axios.post<ApiResponse>(
        "/api/getrecommendations", // Replace with your actual endpoint
        { lat: latit, lon: long },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success" || response.status === 200) {
        setRecommendations(response.data.data);
        setMetadata(response.data.metadata);
      } else {
        setError("Failed to retrieve recommendations from server.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while communicating with the backend.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Handle User Interaction (Log Preference) ---
  const handlePreference = async (preferenceValue: 1 | -1) => {
    const currentItem = recommendations[currentIndex];
    const token = localStorage.getItem("authToken");

    if (!currentItem || !token) return;

    // Optimistic UI update: Move to next item immediately
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    try {
      await axios.post(
        "/api/logPreference",
        {
          id: currentItem.id,
          value: preferenceValue, // 1 for Like, -1 for Dislike
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Optional: Handle response if needed
    } catch (err) {
      console.error("Failed to log preference", err);
      // Optional: Revert index or show toast notification on error
    }
  };

  // --- Helper to render Price Tier ---
  const renderPrice = (tier: number) => {
    return "$".repeat(tier) || "$"; // Default to $ if 0/null
  };

  // --- Render States ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Finding the best spots for you...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-6 bg-white rounded-lg shadow-md text-red-500 border border-red-200">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Check if we have run out of recommendations
  if (currentIndex >= recommendations.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            That's all for now!
          </h2>
          <p className="text-gray-600">
            We've run out of recommendations in your area.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Refresh Search
          </button>
        </div>
      </div>
    );
  }

  const currentRec = recommendations[currentIndex];

  // --- Main UI ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header / Metadata Info (Optional) */}
      {metadata && (
        <div className="mb-4 text-xs text-gray-400">
          Considering {metadata.candidates_considered} places within{" "}
          {metadata.search_radius_km}km
        </div>
      )}

      {/* Card Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Image Placeholder (or Map view) */}
        <div className="h-48 bg-blue-100 flex items-center justify-center text-blue-300">
          {/* You could put a dynamic Google Map image here using the lat/long */}
          [Image of Restaurant Map View]
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentRec.name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentRec.formatted_address}
              </p>
            </div>
            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
              {currentRec.recommendation_score.toFixed(1)}/10
            </div>
          </div>

          <hr className="my-4 border-gray-100" />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-400">Cuisine</p>
              <p className="font-medium text-gray-700">
                {Array.isArray(currentRec.cuisine)
                  ? currentRec.cuisine.join(", ")
                  : currentRec.cuisine}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Price</p>
              <p className="font-medium text-green-600">
                {renderPrice(currentRec.price_tier)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Distance</p>
              <p className="font-medium text-gray-700">
                {currentRec.distance_miles.toFixed(2)} mi (
                {currentRec.distance_km.toFixed(2)} km)
              </p>
            </div>
            <div>
              <p className="text-gray-400">Rank</p>
              <p className="font-medium text-gray-700">#{currentRec.rank}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-2">
            <button
              onClick={() => handlePreference(-1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-200 active:scale-95"
            >
              <ThumbDownIcon />
              <span>Pass</span>
            </button>

            <button
              onClick={() => handlePreference(1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 text-white shadow-md hover:bg-green-600 hover:shadow-lg transition-all duration-200 active:scale-95"
            >
              <ThumbUpIcon />
              <span>Like</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Simple SVG Icons (Inline for portability) ---

const ThumbUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2h13.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

export default RecommendationPage;
