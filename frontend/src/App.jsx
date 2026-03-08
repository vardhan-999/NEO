import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import UploadData from './pages/UploadData';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import Alerts from './pages/Alerts';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<UploadData />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </main>
        
        {/* Abstract background blobs for aesthetics */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
      </div>
    </Router>
  );
}

export default App;
