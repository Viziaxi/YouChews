import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

// --- Type Definitions (Unchanged) ---

interface UploadState {
  lat: number;
  lon: number;
  id: number;
}

interface responseState {
  id: number;
  pref: number[]; // [itemID, likeLevel (1-5), preferenceValue (1 or -1)]
}

interface RecommendationData {
  id: string;
  name: string;
  address: string;
  formatted_address: string;
  cuisine: string[];
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
  const [currentRecId, setCurrentRecId] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number>(0);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // *** NEW STATE: Stores the user's 1-5 rating for relevance ***
  const [rating, setRating] = useState<number>(3); // Default to 3 (neutral)

  // --- 1. Initial Load: Check Token & Get Location ---
  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token) {
        setError("Unauthorized: No valid token found.");
        setLoading(false);
        return; // Redirect to login logic would go here
      }

      /*if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        setLoading(false);
        return;
      }*/

      setAuthToken(token);

      if (!storedUser) {
        console.error("No user stored in localStorage.");
        setError("User data not found. Please log in.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const ideee = parseInt(user.id, 10);
      setUserId(ideee);

      // Santa Clara's Coordinates
      const mockLat = 37.354107;
      const mockLong = -121.955238;

      console.log("Using Mock Location:", mockLat, mockLong);

      fetchRecommendations(token, mockLat, mockLong, ideee);

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
    Utoken: string,
    latit: number,
    long: number,
    ide: number
  ) => {
    const payload: UploadState = {
      lon: long,
      lat: latit,
      id: ide,
    };
    try {
      const response = await axios.post<ApiResponse>(
        "https://youchews.onrender.com/getrecommendations",
        payload,
        {
          headers: {
            Authorization: `Bearer ${Utoken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "success" || response.status === 200) {
        setRecommendations(response.data.data);
        setMetadata(response.data.metadata);

        if (response.data.data.length > 0) {
          setCurrentRecId(response.data.data[0].id);
        }
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

  /**
   * Logs the user's preference and relevance rating to the backend.
   * @param preferenceValue 1 for Like, -1 for Pass
   */
  const handlePreference = async (preferenceValue: 1 | -1) => {
    const currentItem = recommendations[currentIndex];

    // Check if we're out of items or essential data is missing
    if (!currentItem || !authToken || userId === 0) return;

    // *** Use the 'rating' state variable for the 'likeLevel' (1-5) ***
    const likeLevel = rating;
    const itemIDNumber = parseInt(currentItem.id, 10);

    const returnVal: number[] = [itemIDNumber, likeLevel, preferenceValue];

    const payload: responseState = {
      id: userId, // The user's ID
      pref: returnVal,
    };

    // Optimistic UI update: Move to next item immediately
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    // Reset rating for the next item
    setRating(3);

    // Update the ID for the next item (if one exists)
    if (nextIndex < recommendations.length) {
      setCurrentRecId(recommendations[nextIndex].id);
    }

    // Update the user's preference for this recommendation
    try {
      await axios.post("https://youchews.onrender.com/logPreference", payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.error("Failed to log preference", err);
    }
  };

  // --- Helper to render Price Tier
  const renderPrice = (tier: number) => {
    return "$".repeat(tier) || "$"; // Default to $ if 0/null
  };

  // --- Render States (Unchanged) ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-yellow-100">
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
      <div className="flex items-center justify-center min-h-screen bg-yellow-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border-t-4 border-t-[#ef4444]">
          <div className="flex justify-center mb-8">
            <img
              src="/logo.png"
              alt="Login"
              className="w-32 h-32 object-cover border-4 border-white"
            />
          </div>
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
        <Link
          to="/login" // Replace '/target-page' with your actual destination path
          className="absolute bottom-10 text-black hover:text-black-700 transition duration-150"
        >
          Log Out
        </Link>
      </div>
    );
  }

  const currentRec = recommendations[currentIndex];

  // --- Main UI ---
  return (
    <div className="min-h-screen bg-yellow-100 flex flex-col items-center justify-center p-4">
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
      <div className="flex justify-center mb-8">
        <img src="/logo.png" alt="Login" className="w-32 h-32 object-cover" />
      </div>

      {/* Card Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-t-[#ef4444]">
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

          {/* --- NEW RATING BAR --- */}
          <div className="my-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label
              htmlFor="relevance-rating"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              How close is this to what you want? **({rating}/5)**
            </label>
            <input
              id="relevance-rating"
              type="range"
              min="1"
              max="5"
              step="1"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg [&::-webkit-slider-thumb]:bg-[#ef4444] [&::-moz-range-thumb]:bg-[#ef4444]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 (Not at all)</span>
              <span>5 (Exactly)</span>
            </div>
          </div>
          {/* ----------------------- */}

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
      <Link
        to="/login"
        className="absolute bottom-10 text-black hover:text-black-700 transition duration-150"
      >
        Log Out
      </Link>
    </div>
  );
};

// --- Simple SVG Icons (Inline for portability - Unchanged) ---

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
