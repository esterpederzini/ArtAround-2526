import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Modal, Spinner } from "react-bootstrap";
import "../CSS/NavigatorItemViewer.css";

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
  const [museumConfig, setMuseumConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const [languageLevel, setLanguageLevel] = useState("medio");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [isListening, setIsListening] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const [uiLabels, setUiLabels] = useState({
    "3s": "3s",
    "15s": "15s",
    "40s": "40s",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);
    setUiLabels({ "3s": "3s", "15s": "15s", "40s": "40s" });

    // Configurazione Museo
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setMuseumConfig(data);
      })
      .catch((err) => console.error("Errore config:", err));

    // Dati Visita
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
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, safeIndex]);

  // --- 2. UPDATE CONTENT ---
  const updateContent = async (newLevel, newDuration) => {
    if (!visit?.tappe?.[safeIndex]) return;
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
        setTimeout(() => setIsPlaying(true), 100);
      } else {
        alert("Combinazione non disponibile.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- 3. VOICE LOGIC & HELPERS ---
  const handleSimplify = () => {
    let newLevel =
      languageLevel === "avanzato"
        ? "medio"
        : languageLevel === "medio"
          ? "infantile"
          : "infantile";
    if (newLevel !== languageLevel) updateContent(newLevel, selectedDuration);
    else alert("Versione più semplice già attiva.");
  };

  const toggleListening = () => {
    if (!recognition) return alert("Riconoscimento vocale non supportato.");
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsPlaying(false);
      setIsListening(true);
      recognition.start();
    }
  };

  const changeItem = (newIndex) => {
    setIsPlaying(false);
    if (visit && newIndex >= 0 && newIndex < (visit.tappe?.length ?? 0)) {
      navigate(`/visit/${id}/${newIndex}`);
      window.scrollTo(0, 0);
    }
  };

  // --- VOICE COMMAND LOGIC (VOCABOLARIO CONTROLLATO) ---
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("Comando ricevuto:", command);

      // --- NAVIGAZIONE ---
      if (command.includes("avanti") || command.includes("prossimo")) {
        changeItem(safeIndex + 1);
      } else if (
        command.includes("indietro") ||
        command.includes("precedente")
      ) {
        changeItem(safeIndex - 1);
      }

      // --- LIVELLO DI DETTAGLIO ---
      else if (
        command.includes("di più") ||
        command.includes("approfondisci")
      ) {
        if (selectedDuration === "3s") updateContent(languageLevel, "15s");
        else if (selectedDuration === "15s")
          updateContent(languageLevel, "40s");
      } else if (command.includes("di meno") || command.includes("riduci")) {
        if (selectedDuration === "40s") updateContent(languageLevel, "15s");
        else if (selectedDuration === "15s") updateContent(languageLevel, "3s");
      }

      // --- COMPRENSIONE E SEMPLIFICAZIONE (LOGICA STEP-DOWN) ---
      else if (
        command.includes("non capisco") ||
        command.includes("più semplice")
      ) {
        handleSimplify();
      }

      // --- METADATI ---
      else if (command.includes("autore") || command.includes("artista")) {
        setShowDetailsModal(true); // È meglio aprire il modal che un alert
      }

      // --- LOGISTICA ---
      else if (command.includes("uscita") || command.includes("esci")) {
        setShowExitModal(true);
      } else if (command.includes("toilette") || command.includes("bagno")) {
        alert(
          museumConfig?.logistica_globale?.toilette ||
            "Informazione non disponibile.",
        );
      } else if (command.includes("bar") || command.includes("shop")) {
        alert(
          museumConfig?.logistica_globale?.bar ||
            "Informazione non disponibile.",
        );
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    // CRITICO: lo useEffect deve ricaricarsi quando cambiano questi stati
    // per avere i valori aggiornati dentro la callback onresult
  }, [safeIndex, languageLevel, selectedDuration, currentItem, museumConfig]);

  // --- 4. AUDIO SYNC ---
  useEffect(() => {
    const audio = audioRef.current;
    if (currentItem?.audioUrl) {
      audio.pause();
      audio.src = currentItem.audioUrl;
      audio.load();
      const setMeta = () => setDuration(audio.duration);
      const upTime = () => setCurrentTime(audio.currentTime);
      const onEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.addEventListener("loadedmetadata", setMeta);
      audio.addEventListener("timeupdate", upTime);
      audio.addEventListener("ended", onEnd);
      if (isPlaying && !isListening) audio.play().catch(() => {});
      return () => {
        audio.removeEventListener("loadedmetadata", setMeta);
        audio.removeEventListener("timeupdate", upTime);
        audio.removeEventListener("ended", onEnd);
      };
    }
  }, [currentItem, isListening]);

  useEffect(() => {
    const audio = audioRef.current;
    if (isPlaying && !isListening) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying, isListening]);

  const formatTime = (t) =>
    `${Math.floor(t / 60)}:${Math.floor(t % 60)
      .toString()
      .padStart(2, "0")}`;

  if (loading)
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
        <Spinner animation="border" />
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
          <span className="top-nav-title">{visit?.titolo || "Visita"}</span>
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
              {currentItem?.categoria || "Opera"}
            </p>
            <h1 className="hero-title">
              {currentItem?.titolo || "Titolo assente"}
            </h1>
            <button
              className="btn-details-minimal mt-2"
              onClick={() => setShowDetailsModal(true)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                borderRadius: "20px",
                padding: "4px 15px",
                fontSize: "0.8rem",
                backdropFilter: "blur(5px)",
              }}
            >
              <i
                className="bi bi-info-circle me-2"
                style={{ color: "#e18f37" }}
              ></i>
              Dettagli
            </button>
          </div>
        </section>

        <Container fluid className="p-0">
          <Row className="justify-content-center g-0">
            <Col xs={12} md={8} lg={6} className="p-0">
              <Card className="card-viewer shadow-none">
                <Card.Body className="pt-0">
                  {/* CONFIGURAZIONE */}
                  <div className="config-box mx-3 mb-4">
                    <div
                      className="d-flex align-items-center justify-content-between"
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
                          {["infantile", "medio", "avanzato"].map((l) => (
                            <button
                              key={l}
                              className={`btn-difficolta-custom ${languageLevel === l ? "active" : ""}`}
                              onClick={() => updateContent(l, selectedDuration)}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                        <p className="small mb-3 text-uppercase ls-1 text-white">
                          Durata Audio
                        </p>
                        <div className="d-flex gap-2">
                          {["3s", "15s", "40s"].map((d) => (
                            <button
                              key={d}
                              className={`btn-duration-pill ${selectedDuration === d ? "active" : ""}`}
                              onClick={() => updateContent(languageLevel, d)}
                            >
                              {uiLabels[d]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="description-quote mx-3 mt-4">
                    <p className="m-0">
                      "
                      {currentItem?.descrizione ||
                        "Nessuna descrizione disponibile."}
                      "
                    </p>
                  </div>
                </Card.Body>
              </Card>

              {/* PLAYER */}
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
                        audioRef.current.currentTime = parseFloat(
                          e.target.value,
                        );
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
                  <div
                    className="play-sphere-main"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    <i
                      className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                    ></i>
                  </div>
                  <button
                    className="btn-item-skip"
                    onClick={() => changeItem(safeIndex + 1)}
                    disabled={safeIndex === (visit?.tappe?.length ?? 0) - 1}
                  >
                    <i className="bi bi-skip-end"></i>
                  </button>
                </div>
              </div>
              <div className="viewer-bottom-spacer"></div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav-viewer">
        <button className="nav-item" onClick={() => navigate("/mobile")}>
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
        <button className="nav-item" onClick={() => setShowAccessMenu(true)}>
          <i className="bi bi-plus-circle"></i>
        </button>
      </div>

      {/* MODALS */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        centered
        size="sm"
        className="museum-modal"
      >
        <Modal.Body className="museum-modal-content py-4">
          <div className="text-center mb-3">
            <i
              className="bi bi-palette"
              style={{ fontSize: "2rem", color: "#e18f37" }}
            ></i>
          </div>
          <h6 className="text-uppercase fw-bold mb-3 text-white text-center">
            Scheda Tecnica
          </h6>
          <div className="small text-white opacity-90 px-2">
            <p className="mb-2">
              <strong>Autore:</strong> {currentItem?.artista || "Autore Ignoto"}
            </p>
            <p className="mb-2">
              <strong>Periodo/Stile:</strong>{" "}
              {currentItem?.stile || currentItem?.periodo || "Non disponibile"}
            </p>
            <p className="mb-2">
              <strong>Licenza:</strong>{" "}
              {typeof currentItem?.licenza === "object"
                ? currentItem?.licenza?.tipo
                : currentItem?.licenza || "Creative Commons"}
            </p>
            <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <p className="mb-0 text-muted" style={{ fontSize: "0.75rem" }}>
              Testi di: {currentItem?.autore_visita || "Sistema"}
            </p>
          </div>
          <button
            className="btn-museum-primary w-100 mt-4"
            onClick={() => setShowDetailsModal(false)}
          >
            Chiudi
          </button>
        </Modal.Body>
      </Modal>

      <Modal
        show={showAccessMenu}
        onHide={() => setShowAccessMenu(false)}
        centered
        className="museum-modal"
      >
        <Modal.Body className="museum-modal-content text-center">
          <h6 className="text-white mb-4 text-uppercase">Assistente</h6>
          <div className="d-grid gap-2">
            <button
              className="btn-museum-outline"
              onClick={() => {
                handleSimplify();
                setShowAccessMenu(false);
              }}
            >
              <i className="bi bi-person-arms-up me-2"></i>Semplifica
            </button>
            <button
              className="btn-museum-outline"
              onClick={() => {
                alert(museumConfig?.logistica_globale?.toilette);
                setShowAccessMenu(false);
              }}
            >
              <i className="bi bi-badge-wc me-2"></i>Bagno
            </button>
            <button
              className="btn-museum-outline"
              onClick={() => {
                alert(museumConfig?.logistica_globale?.bar);
                setShowAccessMenu(false);
              }}
            >
              <i className="bi bi-cup-hot me-2"></i>Bar
            </button>
            <button
              className="btn-museum-primary mt-3"
              onClick={() => setShowAccessMenu(false)}
            >
              Chiudi
            </button>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showExitModal}
        onHide={() => setShowExitModal(false)}
        centered
        className="museum-modal"
      >
        <Modal.Body className="museum-modal-content text-center">
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
              onClick={() => navigate(`/visit/${id}`)}
            >
              Esci
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
