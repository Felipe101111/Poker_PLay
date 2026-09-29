import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';
import { LocalGamePage } from './pages/LocalGamePage';
import { RoomsPage } from './pages/RoomsPage';
import { MultiplayerTablePage } from './pages/MultiplayerTablePage';
import { TrainerPage } from './pages/TrainerPage';
import { TrainerProgressPage } from './pages/TrainerProgressPage';
import { HandHistoryPage } from './pages/HandHistoryPage';
import { HandHistoryDetailPage } from './pages/HandHistoryDetailPage';
import { HandReplayPage } from './pages/HandReplayPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StrategyAdministrationPage } from './pages/StrategyAdministrationPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/local-game" element={<LocalGamePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:roomId/table" element={<MultiplayerTablePage />} />
        <Route path="/trainer" element={<TrainerPage />} />
        <Route path="/trainer/progress" element={<TrainerProgressPage />} />
        <Route path="/hand-history" element={<HandHistoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/strategy/administration" element={<StrategyAdministrationPage />} />
        <Route path="/hand-history/:historyId/replay" element={<HandReplayPage />} />
        <Route path="/hand-history/:historyId" element={<HandHistoryDetailPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
