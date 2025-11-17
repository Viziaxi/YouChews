import './index.css'
import { BrowserRouter , Route, Routes} from 'react-router-dom'
import React from "react";
import Login from './pages/Login.jsx';
import Register from './pages/register.jsx';

function App() {
    return (
        <>
            <Routes>
                <Route path="/Login" element={<Login/>} />
                <Route path="/Register" element={<Register/>} />
            </Routes>
        </>
    )
}
export default App;