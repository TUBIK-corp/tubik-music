import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Player from './components/Player';
import Admin from './components/Admin';

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px' }}>
        <nav style={{ marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '20px' }}>Player</Link>
          <Link to="/admin">Admin</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Player />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
