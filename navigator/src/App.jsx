import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { NavigatorProvider } from "./context/NavigatorContext";
import NavigatorLayout from "./components/NavigatorLayout";
import NavigatorItemViewer from "./components/NavigatorItemViewer";
import NavigatorHome from "./components/NavigatorHome";
import NavigatorVisitOverview from "./components/NavigatorVisitOverview";
import NavigatorLogin from "./components/NavigatorLogin";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. LOGICA INTRO
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
              <Route path="/login" element={<NavigatorLogin />} />
              <Route path="/" element={<NavigatorHome />} />
              <Route path="/home" element={<NavigatorHome />} />
              <Route path="/visit/:id" element={<NavigatorVisitOverview />} />
              <Route
                path="/visit/:id/:operaIndex"
                element={<NavigatorItemViewer />}
              />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </NavigatorProvider>
  );
}

export default App;
