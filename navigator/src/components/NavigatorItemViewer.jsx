import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Navbar,
  Modal,
  Button,
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
  const [prefLingua, setPrefLingua] = useState("medio");
  const [isPlaying, setIsPlaying] = useState(false); // Partiamo da false per sicurezza
  const [showExitModal, setShowExitModal] = useState(false);

  // --- LOGICA SINTESI VOCALE ---
  const speak = (text) => {
    window.speechSynthesis.cancel(); // Ferma letture precedenti
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = 0.9; // Velocità leggermente ridotta per chiarezza

    // Quando la sintesi finisce, resettiamo lo stato play
    utterance.onend = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  // Effetto per gestire la voce quando cambia l'item o lo stato isPlaying
  useEffect(() => {
    if (isPlaying && currentItem) {
      speak(currentItem.descrizione);
    } else {
      window.speechSynthesis.cancel();
    }
  }, [currentItem, isPlaying]);

  // Stop sintesi se lasciamo la pagina
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);
  // -----------------------------

  const handleClose = () => setShowExitModal(false);
  const handleShow = () => {
    stopSpeaking(); // Fermiamo la voce se apriamo il modal
    setShowExitModal(true);
  };
  const handleConfirmExit = () => navigate(`/visit/${id}`);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.successo && json.data) {
          setVisit(json.data);
          setCurrentItem(json.data.tappe[safeIndex].item_default);
          if (json.data.livello_base) setPrefLingua(json.data.livello_base);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore fetch:", err);
        setLoading(false);
      });
  }, [id, safeIndex]);

  const cambiaDifficolta = (livello) => {
    stopSpeaking(); // Reset audio al cambio difficoltà
    setPrefLingua(livello);
    const nuovoId = visit.tappe[safeIndex].varianti_difficolta[livello];
    if (!nuovoId) return alert("Variante non disponibile");

    fetch(`/api/items/${nuovoId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.successo) {
          setCurrentItem(json.data);
          // Facciamo ripartire la voce automaticamente dopo il caricamento
          setIsPlaying(true);
        }
      });
  };

  const cambiaOpera = (nuovoIndice) => {
    stopSpeaking();
    if (visit && nuovoIndice >= 0 && nuovoIndice < visit.tappe.length) {
      navigate(`/visit/${id}/${nuovoIndice}`);
    }
  };

  if (loading)
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
        <Spinner animation="border" variant="light" />
      </div>
    );

  if (!visit || !currentItem)
    return <div className="text-white p-5 text-center">Opera non trovata</div>;

  return (
    <>
      <Container fluid className="card-container">
        <div className="top-nav-viewer">
          <button className="top-nav-btn" onClick={handleShow}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <div className="top-nav-center">
            <span className="top-nav-title">{visit.title || visit.titolo}</span>
          </div>
        </div>

        <Row className="justify-content-center g-0">
          <Col xs={12} md={8} lg={6} className="p-0 text-center">
            <div className="img-container mb-3">
              <img
                src={currentItem.url || "/img/placeholder.jpg"}
                alt={currentItem.titolo}
              />
            </div>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xs={12} md={6} className="p-0">
            <Card className="card-viewer shadow-none">
              <Card.Body>
                <div className="text-start px-2">
                  <h2 className="mb-1 fw-bold h4">{currentItem.titolo}</h2>
                  <div className="d-flex gap-2 my-3">
                    {["infantile", "medio", "avanzato"].map((lvl) => (
                      <button
                        key={lvl}
                        className={`btn-difficolta-custom ${prefLingua === lvl ? "active" : ""}`}
                        onClick={() => cambiaDifficolta(lvl)}
                      >
                        {lvl === "infantile" ? "semplice" : lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="my-3 mx-2" style={{ opacity: "0.1" }} />
                <div className="text-start px-2">
                  <Card.Text>{currentItem.descrizione}</Card.Text>
                </div>

                {/* --- BOTTONI ACCESSIBILI (REQUISITO BASE) --- */}
                <div className="mt-4 px-2 d-flex flex-wrap gap-2">
                  <Button
                    variant="outline-light"
                    size="sm"
                    className="rounded-pill"
                    onClick={() =>
                      speak(
                        `L'autore di quest'opera è ${currentItem.autore || "sconosciuto"}`,
                      )
                    }
                  >
                    <i className="bi bi-person-fill me-1"></i> Chi è l'autore?
                  </Button>
                  <Button
                    variant="outline-light"
                    size="sm"
                    className="rounded-pill"
                    onClick={() =>
                      speak(
                        `Il periodo artistico è ${currentItem.periodo || "non specificato"}`,
                      )
                    }
                  >
                    <i className="bi bi-calendar-event-fill me-1"></i> Qual è il
                    periodo?
                  </Button>
                </div>

                <div className="mt-4 mx-2">
                  <div className="text-start rounded border-warning border-start border-3 p-3 bg-dark">
                    <p className="small text-muted m-0">Logistica:</p>
                    <p className="m-0 small">
                      {visit.tappe[safeIndex].logistica}
                    </p>
                    {/* Pulsante audio per logistica */}
                    <i
                      className="bi bi-volume-up mt-2 d-inline-block"
                      style={{ cursor: "pointer" }}
                      onClick={() => speak(visit.tappe[safeIndex].logistica)}
                    >
                      {" "}
                      Ascolta logistica
                    </i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Navbar fixed="bottom" className="audio-player-fixed p-0 border-0">
        <Container fluid className="player-container">
          <div className="progress-section">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill mt-2"
                style={{ width: isPlaying ? "60%" : "30%" }}
              >
                <div className="progress-cursor"></div>
              </div>
            </div>
            <div className="timer-row">
              <span>00:00</span>
              <span>{currentItem.lunghezza || "02:00"}</span>
            </div>
          </div>

          <div className="controls-row">
            <button
              className="btn-skip-step"
              onClick={() => cambiaOpera(safeIndex - 1)}
            >
              <i className="bi bi-skip-start-fill"></i>
            </button>
            <div
              className="play-btn-sphere"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <i
                className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
              ></i>
            </div>
            <button
              className="btn-skip-step"
              onClick={() => cambiaOpera(safeIndex + 1)}
            >
              <i className="bi bi-skip-end-fill"></i>
            </button>
          </div>
        </Container>
      </Navbar>

      <Modal
        show={showExitModal}
        onHide={handleClose}
        centered
        className="exit-modal"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold" style={{ color: "#5b252d" }}>
            Conferma uscita
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ color: "#212529" }}>
          Sei sicuro di voler tornare alla lista delle opere?
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={handleClose}>
            Annulla
          </Button>
          <Button
            style={{ backgroundColor: "#5b252d", border: "none" }}
            onClick={handleConfirmExit}
          >
            Esci
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
