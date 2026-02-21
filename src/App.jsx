import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
import "./App.css";
import { NavigatorProvider } from "./navigator/context/NavigatorContext";
import NavigatorLayout from "./navigator/components/NavigatorLayout";
import NavigatorItemViewer from "./navigator/components/NavigatorItemViewer";
import NavigatorHome from "./navigator/components/NavigatorHome";
import NavigatorVisitOverview from "./navigator/components/NavigatorVisitOverview";

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
    {/**In questo file andrà la logica di gestione per determinare se
      la vista dovrà essere quella della mobile app o della spa (la pagina web).
      Cerco di scriverla il prima possibile in modo che intanto non compaia sempre l'intro e
      poi la mia home, poi quando hai anche la tua home la aggiorniamo con le route.
      Se ti dà fastidio commentala pure, tanto io sviluppo in locale quindi a me non cambia finchè
      non faccio pull da git con anche la tua parte.*/}
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
              <Route element={<NavigatorLayout isMobile={isMobile} />} />
              <Route path="/" element={<NavigatorHome />} />
              <Route path="/home" element={<NavigatorHome />} />
              <Route path="/visit/:id" element={<NavigatorVisitOverview />} />
              <Route
                path="/visit/:id/:operaIndex"
                element={<NavigatorItemViewer />}
              />
            </Routes>
          </BrowserRouter>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
