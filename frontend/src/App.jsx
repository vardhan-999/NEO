import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import Alerts from './pages/Alerts';
import Investigation from './pages/Investigation';
import InvestigationLab from './pages/InvestigationLab';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 p-6 z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/graph" element={<ProtectedRoute><GraphView /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/investigate/:nodeId" element={<ProtectedRoute><Investigation /></ProtectedRoute>} />
              <Route path="/investigation-lab" element={<ProtectedRoute><InvestigationLab /></ProtectedRoute>} />
            </Routes>
          </main>
          
          {/* Abstract background blobs for aesthetics */}
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
