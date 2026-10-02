import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Site from "@/Site";
import CommercialCleaning from "@/CommercialCleaning";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landingpage_leads" element={<CommercialCleaning />} />
        <Route path="/comercial_cleaning" element={<Navigate to={`/landingpage_leads${window.location.search}`} replace />} />
        <Route path="/cleaning_comercial" element={<Navigate to={`/landingpage_leads${window.location.search}`} replace />} />
        <Route path="/" element={<Site lang="es" />} />
        <Route path="/en" element={<Site lang="en" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
