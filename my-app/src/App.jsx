import { Route, Routes } from 'react-router-dom';
import Login from './components/Login.jsx';
import Register from './components/register.jsx';
import Placeholder from "./pages/test_page.jsx";
import RestaurantDashboard from "./pages/RestaurantDashboard.tsx";
import RecommendationPage from "./pages/RecommendationPage.js";
import AdminQueuePage from "./pages/AdminQueuePage.tsx";

function App() {
  return (
    <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/placeholder" element={<Placeholder />} />

        <Route path="/register" element={<Register userType="user" />} />
        <Route path="/restaurant_register" element={<Register userType="restaurant" />} />

        <Route path="/RecommendationPage" element={<RecommendationPage/>} />
        <Route path="/RestaurantDashboard" element={<RestaurantDashboard />} />
        <Route path="/AdminQueuePage" element={<AdminQueuePage />} />

        <Route path="/login" element={<Login userType="user" />} />
        <Route path="/restaurant_login" element={<Login userType="restaurant" />} />
        <Route path="/admin_login" element={<Login userType="admin" />} />
    </Routes>
  );
}

export default App;