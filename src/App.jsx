import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { NavigatorProvider } from "./context/NavigatorContext";
import NavigatorLayout from "./components/NavigatorLayout";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showIntro, setShowIntro] = useState(isMobile);
  const [bounceTime, setBounceTime] = useState(0.1);
  const text = ["A", "r", "t", "A", "r", "o", "u", "n", "d"];
  const bgIcons = [
    "fa fa-id-badge",
    "fa fa-area-chart",
    "fa fa-book",
    "fa fa-camera-retro",
    "fa fa-file-audio-o",
    "fa fa-users",
    "fa fa-map-marker",
    "fa fa-mobile",
    "fa fa-graduation-cap",
    "fa fa-paint-brush",
    "fa fa-language",
    "fa fa-arrow-left",
    "fa fa-arrow-right",
    "fa fa-file-text-o",
    "fa-solid fa-building-columns",
    "fa fa-volume-up",
    "fa fa-picture-o",
    "fa fa-laptop",
    "fa fa-child",
    "fa fa-university",
  ];
  const rows = Array.from({ length: 20 });

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
          <div className="bg-container">
            {rows.map((_, i) => (
              <div
                key={i}
                className="icon-row"
                style={{
                  "--duration": `${15 + (i % 5)}s`,
                  "--direction": i % 2 === 0 ? "forward" : "reverse",
                }}
              >
                <div className="icon-list">
                  {[...bgIcons, ...bgIcons, ...bgIcons].map((icon, j) => (
                    <i key={j} className={`${icon}`}></i>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
          <NavigatorLayout></NavigatorLayout>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
