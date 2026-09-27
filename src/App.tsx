import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Site from "@/Site";
import CommercialCleaning from "@/CommercialCleaning";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/comercial_cleaning" element={<CommercialCleaning />} />
        <Route path="/" element={<Site lang="es" />} />
        <Route path="/en" element={<Site lang="en" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
