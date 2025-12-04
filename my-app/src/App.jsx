import { Route, Routes } from 'react-router-dom';
import Login from './components/Login.jsx';
import Register from './components/register.jsx';
import Placeholder from "./pages/test_page.jsx";
import RecommendationPage from './pages/RecommendationPage.tsx';
import UploadRestaurantPage from './pages/UploadRestaurant.tsx';
import RecommendationPageTest from './pages/RecommendationPageTest.tsx';
import AdminQueuePage from './pages/AdminQueuePage.tsx';

function App() {
  return (
    <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/placeholder" element={<Placeholder />} />
        <Route path="/recommender" element={<RecommendationPage />} />
        <Route path="/recommendertest" element={<RecommendationPageTest />} />
        <Route path="/admin" element={<AdminQueuePage />} />

        <Route path="/register" element={<Register userType="user" />} />
        <Route path="/restaurant_register" element={<Register userType="restaurant" />} />
        <Route path="/restaurant_submission" element={<UploadRestaurantPage />} />

        <Route path="/login" element={<Login userType="user" />} />
        <Route path="/restaurant_login" element={<Login userType="restaurant" />} />
        <Route path="/admin_login" element={<Login userType="admin" />} />
    </Routes>
  );
}

export default App;