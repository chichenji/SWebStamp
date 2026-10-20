import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
            </Route>
          </Routes>
        </Router>
      </ErrorBoundary>
    </AppProvider>
  );
}

export default App;
