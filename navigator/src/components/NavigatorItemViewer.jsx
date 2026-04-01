import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Modal, Spinner } from "react-bootstrap";
import "../CSS/NavigatorItemViewer.css";

// Configurazione Web Speech API
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "it-IT";
  recognition.continuous = false;
  recognition.interimResults = false;
}

export default function NavigatorItemViewer() {
  const { id, operaIndex } = useParams();
  const navigate = useNavigate();
  const safeIndex = parseInt(operaIndex) || 0;

  const [visit, setVisit] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [languageLevel, setLanguageLevel] = useState("medio");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [isListening, setIsListening] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Stato etichette: resettato ad ogni cambio opera
  const [uiLabels, setUiLabels] = useState({
    "3s": "3s",
    "15s": "15s",
    "40s": "40s",
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());

  // --- 1. INITIAL FETCH & RESET ---
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    // Reset etichette quando cambia l'opera
    setUiLabels({ "3s": "3s", "15s": "15s", "40s": "40s" });

    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.successo && json.data) {
          setVisit(json.data);
          const stops = json.data.tappe ?? [];
          const defaultItem = stops[safeIndex]?.item_default;

          if (defaultItem) {
            setCurrentItem(defaultItem);
            setLanguageLevel(defaultItem.linguaggio || "medio");
            setSelectedDuration(defaultItem.lunghezza || "15s");

            if (defaultItem.durata_reale) {
              setUiLabels((prev) => ({
                ...prev,
                [defaultItem.lunghezza]: `${defaultItem.durata_reale}s`,
              }));
            }
            setIsPlaying(true);
          }
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, safeIndex]);

  // --- 2. CORE LOGIC: UPDATE CONTENT (TONO/DURATA) ---
  const updateContent = async (newLevel, newDuration) => {
    if (!visit || !visit.tappe[safeIndex]) return;
    setIsPlaying(false);
    const operaId = visit.tappe[safeIndex].operaId;

    try {
      const url = `/api/items?operaId=${operaId}&linguaggio=${newLevel}&lunghezza=${newDuration}&pubblicato=tutti`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.successo && json.data.items.length > 0) {
        const newItem = json.data.items[0];
        setCurrentItem(newItem);
        setLanguageLevel(newLevel);
        setSelectedDuration(newDuration);

        if (newItem.durata_reale) {
          setUiLabels((prev) => ({
            ...prev,
            [newDuration]: `${newItem.durata_reale}s`,
          }));
        }

        setCurrentTime(0);
        setDuration(0);
        setTimeout(() => setIsPlaying(true), 100);
      } else {
        alert("Questa combinazione non è disponibile.");
      }
    } catch (err) {
      console.error("Error fetching variant:", err);
    }
  };

  // --- 3. VOICE COMMAND LOGIC (RIPRISTINATA) ---
  const toggleListening = () => {
    if (!recognition) {
      alert("Il tuo browser non supporta il riconoscimento vocale.");
      return;
    }

    if (isListening) {
      // Se sta già ascoltando, interrompiamo
      recognition.stop();
      setIsListening(false);
      console.log("Riconoscimento vocale interrotto manualmente.");
    } else {
      // Se non sta ascoltando, avviamo
      setIsListening(true);
      recognition.start();
      console.log("Riconoscimento vocale avviato.");
    }
  };

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      if (command.includes("avanti") || command.includes("prossimo"))
        changeItem(safeIndex + 1);
      else if (command.includes("indietro") || command.includes("precedente"))
        changeItem(safeIndex - 1);
      else if (
        command.includes("di più") ||
        command.includes("approfondisci")
      ) {
        if (selectedDuration === "15s") updateContent(languageLevel, "40s");
        else if (selectedDuration === "3s") updateContent(languageLevel, "15s");
      } else if (command.includes("semplice") || command.includes("meno")) {
        updateContent("infantile", "15s");
      } else if (command.includes("esci") || command.includes("uscita")) {
        setShowExitModal(true);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
  }, [safeIndex, languageLevel, selectedDuration]);

  // --- 4. AUDIO PLAYER LOGIC ---
  useEffect(() => {
    const audio = audioRef.current;
    if (currentItem?.audioUrl) {
      audio.pause();
      audio.src = currentItem.audioUrl;
      audio.load();

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setUiLabels((prev) => ({
          ...prev,
          [currentItem.lunghezza]: `${Math.round(audio.duration)}s`,
        }));
      };

      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      if (isPlaying) {
        audio
          .play()
          .catch((e) => console.log("Autoplay in attesa di interazione..."));
      }

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [currentItem]);

  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying) audio.play().catch((e) => {});
    else audio.pause();
  }, [isPlaying]);

  // Stop audio all'uscita definitiva
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      audio.pause();
      audio.src = "";
    };
  }, []);

  const changeItem = (newIndex) => {
    setIsPlaying(false);
    if (visit && newIndex >= 0 && newIndex < (visit.tappe?.length ?? 0)) {
      navigate(`/visit/${id}/${newIndex}`);
      window.scrollTo(0, 0);
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading)
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
        <Spinner animation="border" variant="light" />
      </div>
    );

  return (
    <div className="navigator-viewer-layout">
      {/* HEADER */}
      <div className="top-nav-viewer">
        <button className="top-nav-btn" onClick={() => setShowExitModal(true)}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <div className="top-nav-center">
          <span className="top-nav-title">{visit?.title || visit?.titolo}</span>
        </div>
      </div>

      <div className="scrollable-viewer-content">
        <section className="hero-image-container">
          <img
            src={currentItem?.url || "/img/placeholder.jpg"}
            className="hero-image"
            alt=""
          />
          <div className="hero-overlay-gradient"></div>
          <div className="hero-caption">
            <p className="category-label">
              {currentItem?.categoria || "Capolavoro"}
            </p>
            <h1 className="hero-title">{currentItem?.titolo}</h1>
          </div>
        </section>

        <Container fluid className="p-0">
          <Row className="justify-content-center g-0">
            <Col xs={12} md={8} lg={6} className="p-0">
              <Card className="card-viewer shadow-none">
                <Card.Body className="pt-0">
                  <div className="config-box mx-3 mb-4">
                    <div
                      className="d-flex align-items-center justify-content-between cursor-pointer"
                      onClick={() => setIsConfigOpen(!isConfigOpen)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-2 opacity-75">
                        <i className="bi bi-sliders text-white"></i>
                        <span className="text-uppercase small fw-bold ls-1 text-white">
                          Configurazione Guida
                        </span>
                      </div>
                      <i
                        className={`bi bi-chevron-${isConfigOpen ? "up" : "down"} transition-icon`}
                      ></i>
                    </div>

                    <div
                      className={`config-content ${isConfigOpen ? "is-open" : ""}`}
                    >
                      <div className="pt-4">
                        <p className="small mb-3 text-uppercase ls-1 text-white">
                          Livello di analisi
                        </p>
                        <div className="d-flex gap-2 mb-4">
                          {["infantile", "medio", "avanzato"].map((level) => (
                            <button
                              key={level}
                              className={`btn-difficolta-custom ${languageLevel === level ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateContent(level, selectedDuration);
                              }}
                            >
                              {level === "infantile" ? "semplice" : level}
                            </button>
                          ))}
                        </div>
                        <p className="small mb-3 text-uppercase ls-1 text-white">
                          Durata Audio
                        </p>
                        <div className="d-flex gap-2">
                          {["3s", "15s", "40s"].map((dur) => (
                            <button
                              key={dur}
                              className={`btn-duration-pill ${selectedDuration === dur ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateContent(languageLevel, dur);
                              }}
                            >
                              {uiLabels[dur]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="description-quote mx-3 mt-4">
                    <p className="m-0">"{currentItem?.descrizione}"</p>
                  </div>
                </Card.Body>
              </Card>
              <div className="integrated-player-static mx-3">
                <div className="progress-section">
                  <div className="progress-bar-container">
                    <input
                      type="range"
                      className="progress-range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      step="0.1"
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        audioRef.current.currentTime = time;
                        setCurrentTime(time);
                      }}
                    />
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <div className="timer-row">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="player-controls-row">
                  <button
                    className="btn-item-skip"
                    onClick={() => changeItem(safeIndex - 1)}
                    disabled={safeIndex === 0}
                  >
                    <i className="bi bi-skip-start"></i>
                  </button>
                  <button
                    className="btn-seek"
                    onClick={() => (audioRef.current.currentTime -= 10)}
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    <span className="seek-val">10</span>
                  </button>
                  <div className="play-controls-center">
                    <div
                      className="play-sphere-main"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      <i
                        className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                      ></i>
                    </div>
                  </div>
                  <button
                    className="btn-seek"
                    onClick={() => (audioRef.current.currentTime += 10)}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span className="seek-val">10</span>
                  </button>
                  <button
                    className="btn-item-skip"
                    onClick={() => changeItem(safeIndex + 1)}
                    disabled={safeIndex === (visit?.tappe?.length ?? 0) - 1}
                  >
                    <i className="bi bi-skip-end"></i>
                  </button>
                </div>
              </div>

              {/* SPACER FINALE PER NON FAR ATTACCARE IL PLAYER AL BORDO INFERIORE */}
              <div className="viewer-bottom-spacer"></div>
            </Col>
          </Row>
        </Container>
      </div>

      <div className="bottom-nav-viewer">
        <button className="nav-item">
          <i className="bi bi-house-door"></i>
        </button>

        <div className="nav-item central">
          <button
            className={`btn-mic-nav ${isListening ? "is-listening" : ""}`}
            onClick={toggleListening}
          >
            <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`}></i>
          </button>
        </div>

        <button className="nav-item">
          <i className="bi bi-map"></i>
        </button>
      </div>

      <Modal
        show={showExitModal}
        onHide={() => setShowExitModal(false)}
        centered
        className="museum-modal"
      >
        <Modal.Body className="museum-modal-content">
          <div className="museum-modal-icon">
            <i className="bi bi-door-open"></i>
          </div>
          <h5 className="museum-modal-title">Concludi l'esperienza?</h5>
          <div className="museum-modal-actions">
            <button
              className="btn-museum-outline"
              onClick={() => setShowExitModal(false)}
            >
              Annulla
            </button>
            <button
              className="btn-museum-primary"
              onClick={() => {
                audioRef.current.pause();
                navigate(`/visit/${id}`);
              }}
            >
              Esci
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
