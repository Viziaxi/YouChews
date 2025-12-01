import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';


//IGNORE THIS ONE!!!!
//IGNORE THIS ONE!!!!
//IGNORE THIS ONE!!!!

// --- Configuration ---
// **IMPORTANT**: Replace with your actual backend endpoint
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Helper Functions ---
// A mock function for demonstration. In a real app, this would be a full-fledged 
// token validation logic (e.g., checking expiration, signing, etc.).
const validateToken = (token) => {
    // Basic check: Token is present and not 'expired'
    if (!token || token === 'expired_token') {
        return false;
    }
    // In a real application, you'd decode the JWT and check its 'exp' claim.
    return true; 
};

// A function to get the user's current location
const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser.'));
        }
        
        // Options: high accuracy, timeout after 5 seconds
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                // Handle different error codes (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
                console.error("Geolocation Error:", error.code, error.message);
                reject(new Error(`Unable to retrieve your location: ${error.message}`));
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
};


// --- React Component ---
const RecommendationPage = () => {
    const [recommendation, setRecommendation] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(null);

    

    // Replace with your actual token retrieval logic (e.g., from localStorage)
    const MOCK_JWT_TOKEN = localStorage.getItem('token') || 'mock_valid_jwt_token_12345';
    const isTokenValid = validateToken(MOCK_JWT_TOKEN);

    // 1. Function to fetch a new recommendation
    const getRecommendations = useCallback(async (latitude, longitude) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/getrecommendations`, {
                userLat: latitude,
                userLon: longitude,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const { data, metadata, status } = response.data;

            if (status === 'success' && data.length > 0) {
                // The prompt implies displaying *a* recommendation, so we'll take the first one.
                setRecommendation(data[0]); 
                setMetadata(metadata);
            } else {
                setError("No recommendations found or API status not successful.");
                setRecommendation(null);
                setMetadata(null);
            }
        } catch (err) {
            console.error("Error fetching recommendations:", err);
            setError(`Failed to fetch recommendations: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [MOCK_JWT_TOKEN]);

    // 2. Initial Setup: Token Check, Location Fetch, and First Recommendation
    useEffect(() => {
        if (!isTokenValid) {
            setLoading(false);
            setError("Authentication failed: Invalid or missing JWT token.");
            return;
        }

        const initialFetch = async () => {
            try {
                //const userLocation = await getCurrentLocation();
                setLocation( 45.5152, -122.6784);
                // After getting location, fetch the first recommendation
                await getRecommendations(45.5152, -122.6784);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        initialFetch();
    }, [isTokenValid, getRecommendations]); // Dependencies ensure this runs once on mount, or if token status/fetch function changes.

    // 3. Function to log the user's preference
    const logPreference = async (recommendationId, preferenceValue) => {
        if (!recommendationId) return;

        try {
            // Optimistically update the UI by immediately fetching the next recommendation
            if (location) {
                // This line fetches the *next* item
                await getRecommendations(location.latitude, location.longitude);
            }

            // Log the preference in the background. We don't wait for this response.
            await axios.post(`${API_BASE_URL}/logPreference`, {
                recommendation_id: recommendationId,
                preference: preferenceValue, // 1 for Thumbs Up, -1 for Thumbs Down
            }, {
                headers: {
                    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });
            // You might add a small toast notification here for 'Preference logged'

        } catch (err) {
            // Note: If the log fails, we might still have fetched the next recommendation
            console.error("Error logging preference:", err);
            // You might want to handle this error (e.g., offer a retry)
        }
    };

    // 4. Handlers for Thumbs Up/Down
    const handleThumb = (isUp) => {
        if (recommendation) {
            const preferenceValue = isUp ? 1 : -1;
            // Log preference for the current recommendation and fetch the next one
            logPreference(recommendation.id, preferenceValue);
        }
    };

    // --- Conditional Rendering ---

    if (!isTokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl text-red-600">🛑 **Authentication Error**: Please log in to continue.</p>
            </div>
        );
    }

    if (loading && !recommendation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="ml-4 text-gray-700">Finding a great spot near you...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-8 bg-red-50">
                <h1 className="text-3xl font-bold text-red-700 mb-4">Error</h1>
                <p className="text-red-500">{error}</p>
                {/* Optional: Add a button to retry fetching recommendations */}
                <button
                    onClick={() => location && getRecommendations(location.latitude, location.longitude)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    disabled={!location}
                >
                    {location ? 'Retry Fetching' : 'Waiting for Location...'}
                </button>
            </div>
        );
    }

    if (!recommendation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-xl text-gray-700">No more recommendations available right now. Try expanding your search!</p>
            </div>
        );
    }

    // --- Main UI Rendering ---

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-100 font-sans">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold text-gray-800">🍽️ Your Next Spot</h1>
                <p className="text-gray-600 mt-2">Swipe through to find your perfect recommendation.</p>
            </header>

            {/* Recommendation Card */}
            <div className="max-w-xl mx-auto bg-white shadow-2xl rounded-xl p-6 md:p-8 border-t-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-3xl font-bold text-gray-900">{recommendation.name}</h2>
                    <span className="text-2xl font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        #{recommendation.rank}
                    </span>
                </div>

                <p className="text-lg text-gray-700 mb-2">📍 {recommendation.formatted_address}</p>

                <hr className="my-4 border-gray-200" />
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-gray-600">
                    <div>
                        <p className="font-semibold text-gray-800">Cuisine:</p>
                        <p>{recommendation.cuisine}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">Price:</p>
                        <p>{'$'.repeat(recommendation.price_tier || 1)}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">Distance:</p>
                        <p>{recommendation.distance_km.toFixed(1)} km / {recommendation.distance_miles.toFixed(1)} mi</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">Score:</p>
                        <p className="font-bold text-green-600">{recommendation.recommendation_score.toFixed(2)}</p>
                    </div>
                </div>

                {/* Thumbs Buttons */}
                <div className="flex justify-center space-x-8 mt-8">
                    <button
                        onClick={() => handleThumb(false)}
                        className="flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full shadow-lg hover:bg-red-200 transition transform hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                        aria-label="Thumbs Down"
                    >
                        {loading ? '...' : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.144 1.328l.17-.038 3.5-1.225a1 1 0 00.414-.954V9a1 1 0 011.666-.75l3.5 1.75a1 1 0 001.382-.82v-6.7a1 1 0 00-.72-.947zM5 16.5l.5-.25L9 14.5V10.7l-4 2v3.8zM15 16.5V11.8l-4-2V14l3.5 1.75.5.25z" /></svg>}
                    </button>
                    <button
                        onClick={() => handleThumb(true)}
                        className="flex items-center justify-center w-20 h-20 bg-green-500 text-white rounded-full shadow-2xl hover:bg-green-600 transition transform hover:scale-110 disabled:opacity-50"
                        disabled={loading}
                        aria-label="Thumbs Up"
                    >
                         {loading ? '...' : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M13 10a1 1 0 01-1 1H7v7a1 1 0 01-1 1h2a1 1 0 011 1v-7h4a1 1 0 011 1z" clipRule="evenodd" fillRule="evenodd" /></svg>}
                    </button>
                </div>
            </div>

            {/* Metadata (for debugging/context) */}
            {metadata && (
                <div className="mt-8 max-w-xl mx-auto p-4 bg-gray-200 rounded-lg text-sm text-gray-700">
                    <h3 className="font-bold mb-2">Metadata</h3>
                    <p><strong>Your Location:</strong> {metadata.user_location.latitude.toFixed(4)}, {metadata.user_location.longitude.toFixed(4)}</p>
                    <p><strong>Search Radius:</strong> {metadata.search_radius_km} km</p>
                    <p><strong>Candidates Considered:</strong> {metadata.candidates_considered}</p>
                    <p><strong>Recommendations Returned:</strong> {metadata.recommendations_returned}</p>
                </div>
            )}
        </div>
    );
};

export default RecommendationPage;