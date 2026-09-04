import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Site from "@/Site";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Site lang="es" />} />
        <Route path="/en" element={<Site lang="en" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
