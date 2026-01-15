import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
import "./App.css";
import { NavigatorProvider } from "./context/NavigatorContext";
import NavigatorLayout from "./components/NavigatorLayout";
import NavigatorVisitViewer from "./components/NavigatorVisitViewer";
import NavigatorHome from "./components/NavigatorHome";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showIntro, setShowIntro] = useState(isMobile);
  const [bounceTime, setBounceTime] = useState(0.1);
  const text = ["A", "r", "t", "A", "r", "o", "u", "n", "d"];

  const handleBounceTime = () => {
    setBounceTime((prev) => prev + 0.1);
  };

  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowIntro(false);
    }
  }, [isMobile]);

  return (
    <>
      {showIntro ? (
        <div className="intro-wrapper">
          <h1 className="bounce-text">
            {text.map((letter, index) => (
              <span
                key={index}
                style={{
                  animationDelay: `${index * 0.1 + bounceTime}s`,
                  display: "inline-block",
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
        </div>
      ) : (
        <NavigatorProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<NavigatorLayout />}>
                <Route path="/" element={<NavigatorHome />} />
                <Route path="/visit/:id" element={<NavigatorVisitViewer />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
