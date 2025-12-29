import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import HistoricalDataPage from './pages/HistoricalDataPage';
import SplashGate from './pages/SplashGate';
import { getInitialMode } from './theme/theme';
import './index.css';

const initialMode = getInitialMode();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App initialMode={initialMode} />}>
          <Route index element={<SplashGate />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/historical" element={<HistoricalDataPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
