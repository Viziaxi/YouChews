import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Login from "./Login";
import AdminLogin from "./AdminLogin";
import Dashboard from "./Home";
//import { PrivateRoute } from "./PrivateRoute";
import Register from "./Register";
import AdminRegister from "./AdminRegister";

/*function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />

        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />*/

{
  /* root redirect on boot */
}
{
  /*<Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;*/
}

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Welcome</h1>

      <button onClick={() => navigate("/login")}>Go to Login</button>

      <button onClick={() => navigate("/register")}>Go to Register</button>

      <button onClick={() => navigate("/adminregister")}>
        Register as Admin
      </button>

      <button onClick={() => navigate("/adminlogin")}>Login as Admin</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/adminregister" element={<AdminRegister />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
