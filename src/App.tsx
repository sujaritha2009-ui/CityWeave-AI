import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./data/store";
import { AppLayout } from "./layouts/AppLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { InstitutionFormPage } from "./pages/InstitutionFormPage";
import { InstitutionsPage } from "./pages/InstitutionsPage";
import { JunctionDetailsPage } from "./pages/JunctionDetailsPage";
import { LandingPage } from "./pages/LandingPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ScheduleComparisonPage } from "./pages/ScheduleComparisonPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrafficMapPage } from "./pages/TrafficMapPage";

export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
          </Route>
          <Route path="app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="map" element={<TrafficMapPage />} />
            <Route path="junctions/:id" element={<JunctionDetailsPage />} />
            <Route path="institutions" element={<InstitutionsPage />} />
            <Route path="institutions/new" element={<InstitutionFormPage />} />
            <Route path="institutions/:id/edit" element={<InstitutionFormPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="compare" element={<ScheduleComparisonPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
