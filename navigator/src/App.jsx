import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { NavigatorProvider } from "./context/NavigatorContext";
import NavigatorLayout from "./components/NavigatorLayout";
import NavigatorItemViewer from "./components/NavigatorItemViewer";
import NavigatorHome from "./components/NavigatorHome";
import NavigatorVisitOverview from "./components/NavigatorVisitOverview";
import NavigatorLogin from "./components/NavigatorLogin";
import ProtectedRoute from "./components/ProtectedRoute"; // <-- Importa il nuovo componente

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showIntro, setShowIntro] = useState(true); // Se vuoi l'intro, lasciala true inizialmente

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const text = ["A", "r", "t", "A", "r", "o", "u", "n", "d"];

  return (
    <NavigatorProvider>
      <BrowserRouter basename="/mobile">
        {showIntro ? (
          <div className="intro-wrapper">
            <h1 className="bounce-text">
              {text.map((letter, index) => (
                <span
                  key={index}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    display: "inline-block",
                  }}
                >
                  {letter}
                </span>
              ))}
            </h1>
          </div>
        ) : (
          <Routes>
            <Route element={<NavigatorLayout isMobile={isMobile} />}>
              {/* LOGIN: Sempre accessibile */}
              <Route path="/login" element={<NavigatorLogin />} />

              {/* TUTTE LE ALTRE ROTTE: Protette da ProtectedRoute */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <NavigatorHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <NavigatorHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/visit/:id"
                element={
                  <ProtectedRoute>
                    <NavigatorVisitOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/visit/:id/:operaIndex"
                element={
                  <ProtectedRoute>
                    <NavigatorItemViewer />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </NavigatorProvider>
  );
}

export default App;
