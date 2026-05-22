import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Modal } from "react-bootstrap";
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

  const [uiLabels] = useState({
    "3s": "3s",
    "15s": "15s",
    "40s": "40s",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(new Audio());
  const ttsIntervalRef = useRef(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedMapFloor, setSelectedMapFloor] = useState("0");

  // ---------- FURTHEST INDEX TRACKING ----------
  useEffect(() => {
    if (!id) return;
    const key = `artaround_furthest_${id}`;
    const stored = parseInt(localStorage.getItem(key)) || 0;
    if (safeIndex > stored) {
      localStorage.setItem(key, String(safeIndex));
    }
  }, [safeIndex, id]);

  // ---------- LOGISTICS ----------
  const handleLogistics = (msg) => {
    if (!msg) return;
    setLogisticsMsg(msg);
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.lang = "it-IT";
    window.speechSynthesis.speak(utterance);
    setTimeout(() => setLogisticsMsg(""), 5000);
  };

  // ---------- REFS ----------
  const languageLevelRef = useRef(languageLevel);
  const selectedDurationRef = useRef(selectedDuration);
  const currentItemRef = useRef(currentItem);
  const museumConfigRef = useRef(museumConfig);
  const safeIndexRef = useRef(safeIndex);
  const visitRef = useRef(visit);

  useEffect(() => { languageLevelRef.current = languageLevel; }, [languageLevel]);
  useEffect(() => { selectedDurationRef.current = selectedDuration; }, [selectedDuration]);
  useEffect(() => { currentItemRef.current = currentItem; }, [currentItem]);
  useEffect(() => { museumConfigRef.current = museumConfig; }, [museumConfig]);
  useEffect(() => { safeIndexRef.current = safeIndex; }, [safeIndex]);
  useEffect(() => { visitRef.current = visit; }, [visit]);

  const updateContentRef = useRef(null);
  const changeItemRef = useRef(null);
  const handleLogisticsRef = useRef(null);

  // All four helpers MUST be after updateContentRef is declared
  const handleSimplify = () => {
    const levels = ["infantile", "medio", "avanzato"];
    const idx = levels.indexOf(languageLevelRef.current);
    if (idx > 0) updateContentRef.current(levels[idx - 1], selectedDurationRef.current);
  };

  const handleAdvance = () => {
    const levels = ["infantile", "medio", "avanzato"];
    const idx = levels.indexOf(languageLevelRef.current);
    if (idx < levels.length - 1) updateContentRef.current(levels[idx + 1], selectedDurationRef.current);
  };

  const handleMoreContent = () => {
    const durations = ["3s", "15s", "40s"];
    const idx = durations.indexOf(selectedDurationRef.current);
    if (idx < durations.length - 1) updateContentRef.current(languageLevelRef.current, durations[idx + 1]);
  };

  const handleLessContent = () => {
    const durations = ["3s", "15s", "40s"];
    const idx = durations.indexOf(selectedDurationRef.current);
    if (idx > 0) updateContentRef.current(languageLevelRef.current, durations[idx - 1]);
  };

  useEffect(() => {
    if (currentItem?.piano) setSelectedMapFloor(currentItem.piano);
  }, [currentItem]);

  // ---------- FETCH INIZIALE ----------
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setMuseumConfig(data);
      })
      .catch(() => { });

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

    return () => { isMounted = false; };
  }, [id, safeIndex]);

  // ---------- CLEANUP AUDIO ----------
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

  // ---------- GESTIONE AUDIO / TTS ----------
  useEffect(() => {
    const audio = audioRef.current;
    window.speechSynthesis.cancel();
    clearInterval(ttsIntervalRef.current);

    if (!isPlaying) {
      audio.pause();
      return;
    }

    if (currentItem?.audioUrl) {
      audio.src = currentItem.audioUrl;
      audio.play().catch((e) => console.log("Autoplay blocked", e));

      const upMeta = () => setDuration(audio.duration);
      const upTime = () => setCurrentTime(audio.currentTime);
      const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };

      audio.addEventListener("loadedmetadata", upMeta);
      audio.addEventListener("timeupdate", upTime);
      audio.addEventListener("ended", onEnd);

      return () => {
        audio.removeEventListener("loadedmetadata", upMeta);
        audio.removeEventListener("timeupdate", upTime);
        audio.removeEventListener("ended", onEnd);
      };
    } else if (currentItem?.descrizione) {
      const utterance = new SpeechSynthesisUtterance(currentItem.descrizione);
      utterance.lang = "it-IT";
      const estimatedDuration = currentItem.descrizione.length / 15;
      setDuration(estimatedDuration);
      setCurrentTime(0);

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        clearInterval(ttsIntervalRef.current);
      };

      window.speechSynthesis.speak(utterance);

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

  // ---------- NAVIGAZIONE ----------
  const changeItem = (newIndex) => {
    const v = visitRef.current;
    if (v && newIndex >= 0 && newIndex < v.tappe.length) {
      setIsPlaying(false);
      navigate(`/visit/${id}/${newIndex}`);
    }
  };

  const updateContent = async (newLevel, newDuration) => {
    const v = visitRef.current;
    const operaId = v?.tappe?.[safeIndexRef.current]?.operaId;
    if (!operaId) {
      // Ti avvisa se manca l'ID dell'opera nella tappa
      setLogisticsMsg("Errore: operaId non trovato per questa tappa.");
      setTimeout(() => setLogisticsMsg(""), 4000);
      return;
    }

    setIsPlaying(false);
    window.speechSynthesis.cancel();

    try {
      const res = await fetch(
        `/api/items?operaId=${operaId}&linguaggio=${newLevel}&lunghezza=${newDuration}`
      );
      const json = await res.json();

      if (json.successo && json.data.items.length > 0) {
        setLanguageLevel(newLevel);
        setSelectedDuration(newDuration);
        setCurrentItem(json.data.items[0]);
      } else {
        // CORREZIONE: Se la combinazione non esiste, avvisa l'utente senza bloccare l'interfaccia
        setLogisticsMsg(`Variante (${newLevel} - ${newDuration}) non disponibile per questa opera.`);
        setTimeout(() => setLogisticsMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { updateContentRef.current = updateContent; });
  useEffect(() => { changeItemRef.current = changeItem; });
  useEffect(() => { handleLogisticsRef.current = handleLogistics; });

  useEffect(() => {
    if (currentItem) setIsPlaying(true);
  }, [currentItem]);

  // ---------- COMANDI VOCALI ----------
  useEffect(() => {
    if (!recognition) return;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const raw = event.results[0][0].transcript.toLowerCase();
      const cmd = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      console.log("Comando vocale (normalizzato):", cmd);

      const cfg = museumConfigRef.current;
      const item = currentItemRef.current;
      const idx = safeIndexRef.current;

      if (cmd.includes("prossimo") || cmd.includes("avanti")) {
        changeItemRef.current(idx + 1);
      }
      if (cmd.includes("precedente") || cmd.includes("indietro")) {
        changeItemRef.current(idx - 1);
      }
      if (
        cmd.includes("mappa") ||
        cmd.includes("dove si trova") ||
        cmd.includes("dove mi trovo") ||
        cmd.includes("posizione")
      ) {
        setShowMapModal(true);
        if (item?.piano) setSelectedMapFloor(item.piano);
      }
      if (cmd.includes("piu semplice") || cmd.includes("non capisco")) {
        handleSimplify();
      }
      if (cmd.includes("piu difficile")) {
        handleAdvance();
      }
      if (cmd.includes("dimmi di piu") || cmd.includes("approfondisci") || cmd.includes("piu lungo")) {
        handleMoreContent();
      }
      if (cmd.includes("dimmi di meno") || cmd.includes("piu corto") || cmd.includes("riduci")) {
        handleLessContent();
      }
      if (cmd.includes("ferma") || cmd.includes("pausa")) {
        setIsPlaying(false);
      }
      if (cmd.includes("riprendi") || cmd.includes("play") || cmd.includes("continua")) {
        setIsPlaying(true);
      }
      if (cmd.includes("bagno") || cmd.includes("toilette")) {
        handleLogisticsRef.current(cfg?.logistica_globale?.toilette || "Informazione non disponibile");
      }
      if (cmd.includes("uscita")) {
        handleLogisticsRef.current(cfg?.logistica_globale?.uscita || "Segui le indicazioni per l'uscita principale");
      }
      if (cmd.includes("bar")) {
        handleLogisticsRef.current(cfg?.logistica_globale?.bar || "Il bar si trova al piano terra");
      }
      if (cmd.includes("shop") || cmd.includes("negozio") || cmd.includes("bookshop")) {
        handleLogisticsRef.current(cfg?.logistica_globale?.shop || "Lo shop si trova al piano terra");
      }
      if (cmd.includes("ostacoli") || cmd.includes("accessibilita") || cmd.includes("accessibile")) {
        handleLogisticsRef.current(cfg?.logistica_globale?.ostacoli || "Nessun ostacolo segnalato sul percorso");
      }
      if (
        cmd.includes("chi e l'autore") ||
        cmd.includes("chi e lautore") ||
        cmd.includes("chi e l artista") ||
        cmd.includes("chi e lartista") ||
        cmd.includes("chi l ha dipinto")
      ) {
        handleLogisticsRef.current(`L'autore è ${item?.artista || "sconosciuto"}`);
      }
      if (cmd.includes("qual e lo stile") || cmd.includes("che stile") || cmd.includes("cos e il")) {
        handleLogisticsRef.current(`Lo stile è: ${item?.stile || "non specificato"}`);
      }
      if (cmd.includes("cos e questo") || cmd.includes("che cos e") || cmd.includes("cosa sto guardando")) {
        handleLogisticsRef.current(
          `${item?.titolo || "Opera"} — ${item?.categoria || ""}. ${item?.artista ? "Autore: " + item.artista : ""}`
        );
      }
      if (cmd.includes("periodo") || cmd.includes("quando e stato fatto")) {
        handleLogisticsRef.current(`L'opera risale al periodo: ${item?.periodo || "non specificato"}`);
      }
      if (cmd.includes("aiuto") || cmd.includes("comandi") || cmd.includes("cosa posso dire")) {
        setShowHelpModal(true);
      }
    };

    recognition.onend = () => { setIsListening(false); };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setIsPlaying(false);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Errore attivazione riconoscimento vocale:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="navigator-viewer-layout d-flex align-items-center justify-content-center">
        <div className="text-white text-center">
          <div className="spinner-border mb-3" role="status" />
          <p>Caricamento visita...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="navigator-viewer-layout">
      {/* HEADER — FIX 1: removed marketplace shop icon, back arrow only */}
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
            <p className="category-label">{currentItem?.categoria || "Opera"}</p>
            <h1 className="hero-title">{currentItem?.titolo || "Titolo assente"}</h1>
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
              <i className="bi bi-info-circle me-2" style={{ color: "#e18f37" }}></i>
              Dettagli
            </button>
          </div>
        </section>

        <Container fluid className="p-0">
          <Row className="justify-content-center g-0">
            <Col xs={12} md={8} lg={6} className="p-0">
              <Card className="card-viewer shadow-none">
                <Card.Body className="pt-0">
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
                      <i className={`bi bi-chevron-${isConfigOpen ? "up" : "down"} transition-icon`}></i>
                    </div>
                    <div className={`config-content ${isConfigOpen ? "is-open" : ""}`}>
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
                      "{currentItem?.descrizione || "Nessuna descrizione disponibile."}"
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
                        audioRef.current.currentTime = parseFloat(e.target.value);
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
                    <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}></i>
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
            </Col>
          </Row>
        </Container>
      </div>

      {/* TOAST LOGISTICA */}
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

      {/* ===== MODALS ===== */}

      {/* SCHEDA TECNICA */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="sm" className="museum-modal">
        <Modal.Body className="museum-modal-content py-4">
          <div className="text-center mb-3">
            <i className="bi bi-palette" style={{ fontSize: "2rem", color: "#e18f37" }}></i>
          </div>
          <h6 className="text-uppercase fw-bold mb-3 text-white text-center">Scheda Tecnica</h6>
          <div className="small text-white opacity-90 px-2">
            <p className="mb-2"><strong>Autore:</strong> {currentItem?.artista || "Autore Ignoto"}</p>
            <p className="mb-2"><strong>Periodo:</strong> {currentItem?.periodo || "Non specificato"}</p>
            <p className="mb-2"><strong>Stile:</strong> {currentItem?.stile || "Non specificato"}</p>
            <p className="mb-2">
              <strong>Licenza:</strong>{" "}
              {typeof currentItem?.licenza === "object" ? currentItem?.licenza?.tipo : currentItem?.licenza || "Creative Commons"}
            </p>
            <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
            <p className="mb-0 text-muted" style={{ fontSize: "0.75rem" }}>
              Testi di: {currentItem?.autore_visita || "Sistema"}
            </p>
          </div>
          <button className="btn-museum-primary w-100 mt-4" onClick={() => setShowDetailsModal(false)}>Chiudi</button>
        </Modal.Body>
      </Modal>

      {/* ASSISTENTE */}
      <Modal show={showAccessMenu} onHide={() => setShowAccessMenu(false)} centered className="museum-modal">
        <Modal.Body className="museum-modal-content text-center">
          <h6 className="text-white mb-4 text-uppercase">Assistente</h6>
          <div className="d-grid gap-2">
            <p className="text-muted small text-uppercase mb-1" style={{ letterSpacing: "0.1em" }}>Navigazione</p>
            <div className="d-flex gap-2">
              <button className="btn-museum-outline flex-fill" disabled={safeIndex === 0}
                onClick={() => { changeItem(safeIndex - 1); setShowAccessMenu(false); }}>
                <i className="bi bi-skip-start me-1"></i>Precedente
              </button>
              <button className="btn-museum-outline flex-fill" disabled={safeIndex === (visit?.tappe?.length ?? 0) - 1}
                onClick={() => { changeItem(safeIndex + 1); setShowAccessMenu(false); }}>
                Prossimo<i className="bi bi-skip-end ms-1"></i>
              </button>
            </div>

            <p className="text-muted small text-uppercase mt-3 mb-1" style={{ letterSpacing: "0.1em" }}>Livello</p>
            <div className="d-flex gap-2">
              <button className="btn-museum-outline flex-fill" onClick={() => { handleSimplify(); setShowAccessMenu(false); }}>
                <i className="bi bi-arrow-down-circle me-1"></i>Più semplice
              </button>
              <button className="btn-museum-outline flex-fill" onClick={() => { handleAdvance(); setShowAccessMenu(false); }}>
                <i className="bi bi-arrow-up-circle me-1"></i>Più avanzato
              </button>
            </div>

            <p className="text-muted small text-uppercase mt-3 mb-1" style={{ letterSpacing: "0.1em" }}>Durata</p>
            <div className="d-flex gap-2">
              <button className="btn-museum-outline flex-fill" onClick={() => { handleLessContent(); setShowAccessMenu(false); }}>
                <i className="bi bi-dash-circle me-1"></i>Più corto
              </button>
              <button className="btn-museum-outline flex-fill" onClick={() => { handleMoreContent(); setShowAccessMenu(false); }}>
                <i className="bi bi-plus-circle me-1"></i>Più lungo
              </button>
            </div>

            <p className="text-muted small text-uppercase mt-3 mb-1" style={{ letterSpacing: "0.1em" }}>Info Opera</p>
            <div className="d-flex gap-2">
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(`L'autore è ${currentItem?.artista || "sconosciuto"}`);
                setShowAccessMenu(false);
              }}>
                <i className="bi bi-person me-1"></i>Autore
              </button>
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(`Lo stile è: ${currentItem?.stile || "non specificato"}`);
                setShowAccessMenu(false);
              }}>
                <i className="bi bi-brush me-1"></i>Stile
              </button>
            </div>
            <button className="btn-museum-outline" onClick={() => {
              handleLogistics(`${currentItem?.titolo || "Opera"} — ${currentItem?.categoria || ""}. ${currentItem?.artista ? "Autore: " + currentItem.artista : ""}`);
              setShowAccessMenu(false);
            }}>
              <i className="bi bi-eye me-2"></i>Cos'è questo
            </button>

            <p className="text-muted small text-uppercase mt-3 mb-1" style={{ letterSpacing: "0.1em" }}>Logistica</p>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.toilette || "Informazione non disponibile");
                setShowAccessMenu(false);
              }}><i className="bi bi-water me-1"></i>Bagno</button>
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.bar || "Il bar si trova al piano terra");
                setShowAccessMenu(false);
              }}><i className="bi bi-cup-hot me-1"></i>Bar</button>
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.uscita || "Segui le indicazioni per l'uscita principale");
                setShowAccessMenu(false);
              }}><i className="bi bi-door-open me-1"></i>Uscita</button>
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.shop || "Lo shop si trova al piano terra");
                setShowAccessMenu(false);
              }}><i className="bi bi-bag me-1"></i>Shop</button>
              <button className="btn-museum-outline flex-fill" onClick={() => {
                handleLogistics(museumConfig?.logistica_globale?.ostacoli || "Nessun ostacolo segnalato sul percorso");
                setShowAccessMenu(false);
              }}><i className="bi bi-exclamation-triangle me-1"></i>Ostacoli</button>
            </div>

            <button className="btn-museum-primary mt-3" onClick={() => setShowAccessMenu(false)}>Chiudi</button>
          </div>
        </Modal.Body>
      </Modal>

      {/* USCITA */}
      <Modal show={showExitModal} onHide={() => setShowExitModal(false)} centered className="museum-modal">
        <Modal.Body className="museum-modal-content text-center">
          <div className="museum-modal-icon">
            <i className="bi bi-door-open"></i>
          </div>
          <h5 className="museum-modal-title">Vuoi tornare alla preview?</h5>
          <div className="museum-modal-actions">
            <button className="btn-museum-outline" onClick={() => setShowExitModal(false)}>Annulla</button>
            <button className="btn-museum-primary" onClick={() => navigate(`/visit/${id}`)}>Esci</button>
          </div>
        </Modal.Body>
      </Modal>

      {/* MAPPA */}
      <Modal show={showMapModal} onHide={() => setShowMapModal(false)} centered className="museum-map-modal">
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Mappa - Piano {selectedMapFloor}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="map-floor-selector d-flex justify-content-center">
            {["-1", "0", "1", "2"].map((f) => (
              <button key={f} className={`btn btn-sm ${selectedMapFloor === f ? "active" : ""}`}
                onClick={() => setSelectedMapFloor(f)}>P{f}</button>
            ))}
          </div>

          <div className="map-container" style={{ position: "relative" }}>
            <img
              src={`/mobile/maps/mappa-museo-piano_${selectedMapFloor}.png`}
              alt={`Piano ${selectedMapFloor}`}
              style={{ width: "100%", display: "block" }}
            />
            {visit?.tappe?.map((tappa, idx) => {
              const item = tappa.item_default;
              if (!item || item.piano !== selectedMapFloor) return null;
              const isCurrent = idx === safeIndex;
              return (
                <div key={idx} title={item.titolo || `Tappa ${idx + 1}`}
                  onClick={() => { setShowMapModal(false); changeItem(idx); }}
                  style={{
                    position: "absolute",
                    left: `${item.mappa_x}%`,
                    top: `${item.mappa_y}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: "pointer",
                    zIndex: isCurrent ? 10 : 5,
                  }}
                >
                  {isCurrent ? (
                    <div className="map-marker-ping" />
                  ) : (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#e18f37", border: "2px solid white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "white", fontWeight: "bold",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}>{idx + 1}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-3 py-2" style={{ background: "#1a1a1a" }}>
            {visit?.tappe?.map((tappa, idx) => {
              const item = tappa.item_default;
              if (!item || item.piano !== selectedMapFloor) return null;
              const isCurrent = idx === safeIndex;
              return (
                <div key={idx} className="d-flex align-items-center gap-2 py-1"
                  style={{ cursor: "pointer", opacity: isCurrent ? 1 : 0.6 }}
                  onClick={() => { setShowMapModal(false); changeItem(idx); }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: isCurrent ? "#e18f37" : "#555",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "white", fontWeight: "bold", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <span style={{ fontSize: "0.8rem", color: isCurrent ? "#e18f37" : "white" }}>
                    {item.titolo || `Tappa ${idx + 1}`}
                  </span>
                  {isCurrent && (
                    <i className="bi bi-geo-alt-fill ms-auto" style={{ color: "#e18f37", fontSize: "0.75rem" }}></i>
                  )}
                </div>
              );
            })}
          </div>
        </Modal.Body>
      </Modal>

      {/* AIUTO */}
      <Modal show={showHelpModal} onHide={() => setShowHelpModal(false)} centered className="museum-modal">
        <Modal.Header closeButton className="bg-museum text-white">
          <Modal.Title>Cosa puoi chiedermi?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white p-4">
          <ul className="list-unstyled">
            <li className="mb-3">
              <i className="bi bi-arrow-left-right me-2 text-warning"></i>
              <strong>Navigazione:</strong> "Prossimo", "Precedente", "Avanti", "Indietro"
            </li>
            <li className="mb-3">
              <i className="bi bi-info-square me-2 text-warning"></i>
              <strong>Info opera:</strong> "Chi è l'autore", "Qual è lo stile", "Cos'è questo", "Cosa sto guardando"
            </li>
            <li className="mb-3">
              <i className="bi bi-map me-2 text-warning"></i>
              <strong>Mappa:</strong> "Mappa", "Dove mi trovo", "Posizione"
            </li>
            <li className="mb-3">
              <i className="bi bi-gear me-2 text-warning"></i>
              <strong>Livello:</strong> "Più semplice", "Non capisco", "Troppo semplice", "Meno scolastico"
            </li>
            <li className="mb-3">
              <i className="bi bi-clock me-2 text-warning"></i>
              <strong>Durata:</strong> "Dimmi di più", "Più lungo", "Dimmi di meno", "Più corto", "Riduci"
            </li>
            <li className="mb-3">
              <i className="bi bi-play-circle me-2 text-warning"></i>
              <strong>Player:</strong> "Ferma", "Pausa", "Riprendi", "Play", "Continua"
            </li>
            <li className="mb-3">
              <i className="bi bi-geo-alt me-2 text-warning"></i>
              <strong>Logistica:</strong> "Dov'è il bagno", "Dov'è l'uscita", "Dov'è il bar", "Dov'è lo shop", "Ci sono ostacoli"
            </li>
          </ul>
          <button className="btn btn-museum-primary w-100 mt-3" onClick={() => setShowHelpModal(false)}>
            Ho capito
          </button>
        </Modal.Body>
      </Modal>
    </div>
  );
}