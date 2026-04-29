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
  const recognitionRef = useRef(null);
  const [logisticsMsg, setLogisticsMsg] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [uiLabels, setUiLabels] = useState({
    "3s": "3s",
    "15s": "15s",
    "40s": "40s",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());
  const ttsIntervalRef = useRef(null); // Per gestire il progresso della sintesi vocale

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapFloor, setSelectedMapFloor] = useState(
    currentItem?.piano || "0",
  );

  const showLogistics = (msg) => {
    setLogisticsMsg(msg);
    // Requisito base: la logistica dovrebbe essere anche udibile
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = "it-IT";
    window.speechSynthesis.speak(utterance);

    // Scompare dopo 5 secondi
    setTimeout(() => setLogisticsMsg(""), 5000);
  };

  const handleLogistics = (msg) => {
    if (!msg) return;
    setLogisticsMsg(msg);

    // Sintesi vocale (opzionale ma consigliata per il base)
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = "it-IT";
    window.speechSynthesis.speak(utterance);

    // Scompare dopo 5 secondi
    setTimeout(() => setLogisticsMsg(""), 5000);
  };

  // Aggiorna il piano visualizzato quando cambia l'opera
  useEffect(() => {
    if (currentItem?.piano) setSelectedMapFloor(currentItem.piano);
  }, [currentItem]);

  // --- FETCH INIZIALE ---
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setMuseumConfig(data);
      });

    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.successo && json.data) {
          setVisit(json.data);
          const defaultItem = json.data.tappe?.[safeIndex]?.item_default;
          if (defaultItem) {
            setCurrentItem(defaultItem);
            setLanguageLevel(defaultItem.linguaggio || "medio");
            setSelectedDuration(defaultItem.lunghezza || "15s");
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => {
      isMounted = false;
    };
  }, [id, safeIndex]);

  // --- GESTIONE LOGICA AUDIO E SINTESI ---

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    // Reset totale ad ogni cambio item o stato
    window.speechSynthesis.cancel();
    clearInterval(ttsIntervalRef.current);

    if (!isPlaying) {
      audio.pause();
      return;
    }

    if (currentItem?.audioUrl) {
      // CASO A: File audio presente
      audio.src = currentItem.audioUrl;
      audio.play().catch((e) => console.log("Autoplay blocked", e));

      const upMeta = () => setDuration(audio.duration);
      const upTime = () => setCurrentTime(audio.currentTime);
      const onEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener("loadedmetadata", upMeta);
      audio.addEventListener("timeupdate", upTime);
      audio.addEventListener("ended", onEnd);

      return () => {
        audio.removeEventListener("loadedmetadata", upMeta);
        audio.removeEventListener("timeupdate", upTime);
        audio.removeEventListener("ended", onEnd);
      };
    } else if (currentItem?.descrizione) {
      // CASO B: Solo testo (Sintesi Vocale)
      const utterance = new SpeechSynthesisUtterance(currentItem.descrizione);
      utterance.lang = "it-IT";

      // Simuliamo una durata basata sulla lunghezza del testo (circa 15 caratteri al secondo)
      const estimatedDuration = currentItem.descrizione.length / 15;
      setDuration(estimatedDuration);
      setCurrentTime(0);

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        clearInterval(ttsIntervalRef.current);
      };

      window.speechSynthesis.speak(utterance);

      // Facciamo avanzare la barra di progresso manualmente
      ttsIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= estimatedDuration) {
            clearInterval(ttsIntervalRef.current);
            return estimatedDuration;
          }
          return prev + 0.5;
        });
      }, 500);
    }
  }, [currentItem, isPlaying]);

  // --- HELPER NAVIGAZIONE ---
  const changeItem = (newIndex) => {
    if (visit && newIndex >= 0 && newIndex < visit.tappe.length) {
      // Fermiamo l'audio attuale prima di cambiare
      setIsPlaying(false);
      // Navighiamo alla nuova tappa
      navigate(`/visit/${id}/${newIndex}`);
      // Nota: l'autoplay effettivo avverrà grazie allo useEffect qui sotto
    }
  };

  const updateContent = async (newLevel, newDuration) => {
    const operaId = visit?.tappe?.[safeIndex]?.operaId;
    if (!operaId) return;

    try {
      const res = await fetch(
        `/api/items?operaId=${operaId}&linguaggio=${newLevel}&lunghezza=${newDuration}`,
      );
      const json = await res.json();
      if (json.successo && json.data.items.length > 0) {
        setCurrentItem(json.data.items[0]);
        setLanguageLevel(newLevel);
        setSelectedDuration(newDuration);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Se l'item è stato caricato correttamente, avvia la riproduzione
    if (currentItem) {
      setIsPlaying(true);
    }
  }, [currentItem]);

  // --- COMANDI VOCALI ---
  useEffect(() => {
    if (!recognition) return;

    // IMPORTANTE: Collega l'istanza globale al riferimento del componente
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const cmd = event.results[0][0].transcript.toLowerCase();
      console.log("Comando vocale ricevuto:", cmd);

      // 1. NAVIGAZIONE TRA OPERE
      if (cmd.includes("prossimo") || cmd.includes("avanti")) {
        changeItem(safeIndex + 1);
      }
      if (cmd.includes("precedente") || cmd.includes("indietro")) {
        changeItem(safeIndex - 1);
      }

      // 2. NAVIGAZIONE VERSO LA MAPPA (Nuovo!)
      if (
        cmd.includes("mappa") ||
        cmd.includes("dove si trova") ||
        cmd.includes("posizione")
      ) {
        // Invece di navigate(...), apriamo il Modal
        setShowMapModal(true);

        // Opzionale: facciamo in modo che mostri subito il piano dell'opera attuale
        if (currentItem?.piano) {
          setSelectedMapFloor(currentItem.piano);
        }
      }

      // 3. CONTROLLO LIVELLO E LINGUAGGIO
      if (cmd.includes("più semplice") || cmd.includes("non capisco")) {
        const levels = ["infantile", "medio", "avanzato"];
        const idx = levels.indexOf(languageLevel);
        if (idx > 0) updateContent(levels[idx - 1], selectedDuration);
      }

      if (cmd.includes("dimmi di più") || cmd.includes("approfondisci")) {
        const durations = ["3s", "15s", "40s"];
        const idx = durations.indexOf(selectedDuration);
        if (idx < durations.length - 1) {
          updateContent(languageLevel, durations[idx + 1]);
        }
      }

      // 4. CONTROLLO DEL PLAYER AUDIO
      if (cmd.includes("ferma") || cmd.includes("pausa")) {
        setIsPlaying(false);
      }
      if (
        cmd.includes("riprendi") ||
        cmd.includes("play") ||
        cmd.includes("continua")
      ) {
        setIsPlaying(true);
      }

      // 5. INFORMAZIONI LOGISTICHE (COMANDI VOCALI)
      if (cmd.includes("bagno") || cmd.includes("toilette")) {
        handleLogistics(
          museumConfig?.logistica_globale?.toilette ||
          "Informazione non disponibile",
        );
      }
      if (cmd.includes("uscita")) {
        handleLogistics(
          museumConfig?.logistica_globale?.uscita ||
          "Segui le indicazioni per l'uscita principale",
        );
      }
      if (cmd.includes("bar")) {
        handleLogistics(
          museumConfig?.logistica_globale?.bar ||
          "Il bar si trova al piano terra",
        );
      }

      // 6. METADATI (Sostituisci alert con handleLogistics se vuoi coerenza visiva)
      if (cmd.includes("chi è l'autore") || cmd.includes("chi è l'artista")) {
        handleLogistics(`L'autore è ${currentItem?.artista || "sconosciuto"}`);
      }
      if (cmd.includes("periodo") || cmd.includes("quando è stato fatto")) {
        handleLogistics(
          `L'opera risale al periodo: ${currentItem?.periodo || "non specificato"}`,
        );
      }

      // 7. AIUTO
      if (
        cmd.includes("aiuto") ||
        cmd.includes("comandi") ||
        cmd.includes("cosa posso dire")
      ) {
        setShowHelpModal(true);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    // Aggiungiamo tutte le variabili che servono all'interno della funzione per evitare dati "vecchi"
  }, [
    safeIndex,
    languageLevel,
    selectedDuration,
    currentItem,
    museumConfig,
    navigate,
    id,
  ]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // DISATTIVA AUDIO PRIMA DI ASCOLTARE [cite: 718]
      setIsPlaying(false);

      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Errore attivazione riconoscimento vocale:", err);
      }
    }
  };

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
      {logisticsMsg && (
        <div className="logistics-toast">
          <i className="bi bi-info-circle-fill me-2"></i>
          {logisticsMsg}
        </div>
      )}
      {/* BOTTOM NAV */}
      <div className="bottom-nav-viewer">
        <button className="nav-item" onClick={() => setShowMapModal(true)}>
          <i className="bi bi-map"></i>
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
              <strong>Periodo:</strong>{" "}
              {currentItem?.periodo || "Non specificato"}
            </p>
            <p className="mb-2">
              <strong>Stile:</strong> {currentItem?.stile || "Non specificato"}
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
                handleLogistics(museumConfig?.logistica_globale?.bagno); // <--- CAMBIATO QUI
                setShowAccessMenu(false);
              }}
            >
              <i className="bi bi-water me-2"></i>Bagno
            </button>

            <button
              className="btn-museum-outline"
              onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.bar); // <--- CAMBIATO QUI
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
      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        className="museum-map-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">
            Mappa - Piano {selectedMapFloor}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-0">
          <div className="map-floor-selector d-flex justify-content-center">
            {["-1", "0", "1", "2"].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${selectedMapFloor === f ? "active" : ""}`}
                onClick={() => setSelectedMapFloor(f)}
              >
                P{f}
              </button>
            ))}
          </div>

          <div className="map-container">
            <img
              src={`/mobile/maps/mappa-museo-piano_${selectedMapFloor}.png`}
              alt={`Piano ${selectedMapFloor}`}
            />

            {/* Il marker usa le coordinate % che abbiamo salvato nel DB */}
            {currentItem?.piano === selectedMapFloor && (
              <div
                className="map-marker-ping"
                style={{
                  left: `${currentItem.mappa_x}%`,
                  top: `${currentItem.mappa_y}%`,
                }}
              />
            )}
          </div>
        </Modal.Body>
      </Modal>
      <Modal
        show={showHelpModal}
        onHide={() => setShowHelpModal(false)}
        centered
        className="museum-modal"
      >
        <Modal.Header closeButton className="bg-museum text-white">
          <Modal.Title>Cosa puoi chiedermi?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white p-4">
          <ul className="list-unstyled">
            <li className="mb-3">
              <i className="bi bi-play-circle me-2 text-warning"></i>{" "}
              <strong>Navigazione:</strong> "Prossimo", "Precedente"
            </li>
            <li className="mb-3">
              <i className="bi bi-info-square me-2 text-warning"></i>{" "}
              <strong>Dettagli:</strong> "Chi è l'autore", "Qual è lo stile",
              "Cos'è questo"
            </li>
            <li className="mb-3">
              <i className="bi bi-map me-2 text-warning"></i>{" "}
              <strong>Mappa:</strong> "Mappa", "Dove mi trovo"
            </li>
            <li className="mb-3">
              <i className="bi bi-gear me-2 text-warning"></i>{" "}
              <strong>Livello:</strong> "Più semplice", "Più corto", "Più lungo"
            </li>
            <li className="mb-3">
              <i className="bi bi-geo-alt me-2 text-warning"></i>{" "}
              <strong>Logistica:</strong> "Dov'è il bagno", "Dov'è l'uscita"
            </li>
          </ul>
          <button
            className="btn btn-museum-primary w-100 mt-3"
            onClick={() => setShowHelpModal(false)}
          >
            Ho capito
          </button>
        </Modal.Body>
      </Modal>
    </div>
  );
}
