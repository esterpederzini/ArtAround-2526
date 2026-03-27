import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Modal,
  Spinner,
} from "react-bootstrap";
import "../CSS/NavigatorItemViewer.css";

export default function NavigatorItemViewer() {
  const { id, operaIndex } = useParams();
  const navigate = useNavigate();
  const safeIndex = parseInt(operaIndex) || 0;

  const [visit, setVisit] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LOGIC LEVELS AND DURATIONS ---
  const [languageLevel, setLanguageLevel] = useState("medio");
  const [selectedDuration, setSelectedDuration] = useState("15s");

  const [isPlaying, setIsPlaying] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio());
  const sourceChangePlayTokenRef = useRef(0);

  const resolveAudioUrl = (rawUrl, requestedDuration) => {
    if (!rawUrl) return "";

    let resolved = rawUrl;

    // Temporary compatibility for legacy seed value pointing to a non-existent file.
    if (requestedDuration === "40s") {
      resolved = resolved.replace("_1m.m4a", "_40s.m4a");
    }

    return resolved;
  };

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    setLoading(true);
    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.successo && json.data) {
          const fetchedVisit = json.data;
          setVisit(fetchedVisit);

          const defaultItem = fetchedVisit.tappe[safeIndex]?.item_default;
          console.log("DEBUG: Initial Item Loaded:", defaultItem);

          if (defaultItem) {
            setCurrentItem(defaultItem);
            setLanguageLevel(defaultItem.linguaggio || "medio");
            setSelectedDuration(defaultItem.lunghezza || "15s");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  }, [id, safeIndex]);

  // --- 2. CORE LOGIC: CROSS-REFERENCE SEARCH (LEVEL + DURATION) ---
  const updateContent = async (newLevel, newDuration) => {
    if (!visit || !visit.tappe[safeIndex]) {
      console.error("DEBUG: Visit or Tappa data missing during updateContent");
      return;
    }

    setIsPlaying(false);
    const operaId =
      visit.tappe[safeIndex]?.operaId ||
      currentItem?.operaId ||
      visit.tappe[safeIndex]?.item_default?.operaId;

    // ADDED CONSOLE LOGS FOR DEBUGGING
    console.log("--- LOGIC UPDATE START ---");
    console.log("Target Level:", newLevel);
    console.log("Target Duration:", newDuration);
    console.log("Current OperaId:", operaId);

    try {
      if (!operaId) {
        console.warn("DEBUG: Missing operaId, cannot update item combination");
        alert("Dati opera non disponibili, ricarica la pagina.");
        return;
      }

      const url = `/api/items?operaId=${operaId}&linguaggio=${newLevel}&lunghezza=${newDuration}&pubblicato=tutti`;
      console.log("Fetching URL:", url);

      const response = await fetch(url);
      const json = await response.json();

      if (json.successo && json.data.items.length > 0) {
        const newItem = json.data.items[0];
        console.log("DEBUG: Item Found! New Item ID:", newItem._id);
        console.log("DEBUG: New Item Audio URL:", newItem.audioUrl);

        // Trigger source-change flow: stop previous and auto-start new source.
        setIsPlaying(false);
        setCurrentItem(newItem);
        setLanguageLevel(newLevel);
        setSelectedDuration(newDuration);
      } else {
        console.warn(`DEBUG: No item found for ${newLevel} and ${newDuration}`);
        alert(
          "Questa combinazione (Livello + Durata) non è disponibile per quest'opera.",
        );
      }
    } catch (err) {
      console.error("DEBUG: Error in updateContent fetch:", err);
    }
    console.log("--- LOGIC UPDATE END ---");
  };

  // --- AUDIO LOGIC ---
  const formatTime = (time) => {
    if (!time) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (currentItem?.audioUrl) {
      const audio = audioRef.current;
      const playToken = ++sourceChangePlayTokenRef.current;
      const resolvedAudioUrl = resolveAudioUrl(
        currentItem.audioUrl,
        selectedDuration,
      );
      console.log("[AUDIO] Source update", {
        itemId: currentItem?._id,
        rawAudioUrl: currentItem?.audioUrl,
        resolvedAudioUrl,
        selectedDuration,
      });
      audio.pause();
      audio.src = resolvedAudioUrl;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);

      const handleLoadedMetadata = () => {
        console.log("[AUDIO] loadedmetadata", {
          duration: audio.duration,
          readyState: audio.readyState,
          currentSrc: audio.currentSrc,
        });
        setDuration(audio.duration);
      };
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => {
        console.log("[AUDIO] ended");
        setIsPlaying(false);
        setCurrentTime(0);
      };
      const handleError = () => {
        console.error("[AUDIO] load error", {
          resolvedAudioUrl,
          currentSrc: audio.currentSrc,
          readyState: audio.readyState,
          mediaErrorCode: audio.error?.code,
          mediaErrorMessage: audio.error?.message,
        });
        setIsPlaying(false);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      // Always auto-start the new source when the visualized item changes.
      const autoStart = async () => {
        try {
          if (audio.readyState < 2) {
            await new Promise((resolve, reject) => {
              const onCanPlay = () => {
                cleanup();
                resolve();
              };
              const onError = () => {
                cleanup();
                reject(new Error("Cannot load source for autoplay"));
              };
              const cleanup = () => {
                audio.removeEventListener("canplay", onCanPlay);
                audio.removeEventListener("error", onError);
              };
              audio.addEventListener("canplay", onCanPlay, { once: true });
              audio.addEventListener("error", onError, { once: true });
            });
          }

          // Avoid stale play attempts if the source changed again.
          if (sourceChangePlayTokenRef.current !== playToken) return;

          await audio.play();
          if (sourceChangePlayTokenRef.current !== playToken) return;
          setIsPlaying(true);
          console.log("[AUDIO] Auto-started on source change", {
            currentSrc: audio.currentSrc,
          });
        } catch (e) {
          console.error("[AUDIO] Auto-start failed on source change", {
            error: e?.message || e,
            currentSrc: audio.currentSrc,
          });
          setIsPlaying(false);
        }
      };

      autoStart();

      return () => {
        // Invalidate any pending async play from previous source.
        sourceChangePlayTokenRef.current += 1;
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [currentItem, selectedDuration]);

  const handlePlayPauseClick = async () => {
    const audio = audioRef.current;
    if (!currentItem?.audioUrl) return;

    const resolvedAudioUrl = resolveAudioUrl(currentItem.audioUrl, selectedDuration);
    if (!resolvedAudioUrl) return;

    console.log("[AUDIO] Play button clicked", {
      isPlaying,
      itemId: currentItem?._id,
      selectedDuration,
      rawAudioUrl: currentItem?.audioUrl,
      resolvedAudioUrl,
      currentSrc: audio.currentSrc,
      readyState: audio.readyState,
      paused: audio.paused,
    });

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      console.log("[AUDIO] Paused by user");
      return;
    }

    try {
      // Ensure src is aligned with the currently selected variant.
      if (audio.src !== new URL(resolvedAudioUrl, window.location.origin).href) {
        console.log("[AUDIO] Syncing src before play", {
          previousSrc: audio.currentSrc,
          nextSrc: resolvedAudioUrl,
        });
        audio.src = resolvedAudioUrl;
        audio.load();
      }

      // If metadata is not ready yet, wait for canplay once.
      if (audio.readyState < 2) {
        console.log("[AUDIO] Waiting for canplay", {
          readyState: audio.readyState,
          currentSrc: audio.currentSrc,
        });
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            cleanup();
            console.log("[AUDIO] canplay received", {
              readyState: audio.readyState,
              currentSrc: audio.currentSrc,
            });
            resolve();
          };
          const onError = () => {
            cleanup();
            console.error("[AUDIO] Error before canplay", {
              currentSrc: audio.currentSrc,
              mediaErrorCode: audio.error?.code,
              mediaErrorMessage: audio.error?.message,
            });
            reject(new Error(`Cannot load audio: ${resolvedAudioUrl}`));
          };
          const cleanup = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error", onError);
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
          audio.addEventListener("error", onError, { once: true });
        });
      }

      // Play directly inside click gesture to avoid autoplay-policy blocking.
      await audio.play();
      setIsPlaying(true);
      console.log("[AUDIO] Playback started", {
        currentSrc: audio.currentSrc,
        currentTime: audio.currentTime,
        readyState: audio.readyState,
      });
    } catch (e) {
      console.error("[AUDIO] Play error", {
        error: e?.message || e,
        currentSrc: audio.currentSrc,
        readyState: audio.readyState,
        mediaErrorCode: audio.error?.code,
        mediaErrorMessage: audio.error?.message,
      });
      setIsPlaying(false);
    }
  };

  const changeItem = (newIndex) => {
    setIsPlaying(false);
    if (visit && newIndex >= 0 && newIndex < visit.tappe.length) {
      navigate(`/visit/${id}/${newIndex}`);
      window.scrollTo(0, 0);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (loading)
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
        <Spinner animation="border" variant="light" />
      </div>
    );

  return (
    <>
      <Container fluid className="card-container p-0">
        <div className="top-nav-viewer">
          <button
            className="top-nav-btn"
            onClick={() => setShowExitModal(true)}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <div className="top-nav-center">
            <span className="top-nav-title">
              {visit?.title || visit?.titolo}
            </span>
          </div>
        </div>

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

        <Row className="justify-content-center g-0">
          <Col xs={12} md={6} className="p-0">
            <Card className="card-viewer shadow-none">
              <Card.Body className="pt-0">
                <div className="config-box mx-3 mb-5">
                  <div className="d-flex align-items-center gap-2 mb-4 opacity-75">
                    <i className="bi bi-sliders"></i>
                    <span className="text-uppercase small fw-bold ls-1">
                      Configurazione Guida
                    </span>
                  </div>

                  <p className="small mb-3 text-uppercase ls-1 text-white">
                    Livello di analisi
                  </p>
                  <div className="d-flex gap-2 mb-4">
                    {["infantile", "medio", "avanzato"].map((level) => (
                      <button
                        key={level}
                        className={`btn-difficolta-custom ${languageLevel === level ? "active" : ""}`}
                        onClick={() => updateContent(level, selectedDuration)}
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
                        onClick={() => updateContent(languageLevel, dur)}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="description-quote mx-3 my-5">
                  <p className="m-0">"{currentItem?.descrizione}"</p>
                </div>

                <div className="integrated-player mx-3 mb-5">
                  <div className="progress-section mb-4">
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
                        style={{ width: `${progressPercent}%` }}
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
                      style={{ opacity: safeIndex === 0 ? 0.2 : 0.5 }}
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
                    <div
                      className="play-sphere-main"
                      onClick={handlePlayPauseClick}
                    >
                      <i
                        className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                      ></i>
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
                      disabled={visit && safeIndex === visit.tappe.length - 1}
                      style={{
                        opacity:
                          visit && safeIndex === visit.tappe.length - 1
                            ? 0.2
                            : 0.5,
                      }}
                    >
                      <i className="bi bi-skip-end"></i>
                    </button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

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
          <p className="museum-modal-text">Vuoi uscire comunque?</p>
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
    </>
  );
}
