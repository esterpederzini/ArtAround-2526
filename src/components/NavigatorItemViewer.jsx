import React, { useState, useEffect } from "react";
import mockData from "../mockData.json";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Navbar,
  Modal,
  Button,
} from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom"; // Aggiunto useNavigate
import "../CSS/NavigatorItemViewer.css";

export default function NavigatorItemViewer() {
  const { id, operaIndex } = useParams();
  const navigate = useNavigate();
  const currentIndex = parseInt(operaIndex) || 0;

  const safeId = id || "visita_001"; // Metti qui un ID che esiste nel tuo JSON
  const safeIndex = parseInt(operaIndex) || 0;
  console.log(safeId);

  const [prefDurata, setPrefDurata] = useState("3s");
  const [prefLingua, setPrefLingua] = useState("medio");
  const [isPlaying, setIsPlaying] = useState(true);

  // --- LOGICA MODAL ---
  const [showExitModal, setShowExitModal] = useState(false);
  const handleClose = () => setShowExitModal(false);
  const handleShow = () => setShowExitModal(true);
  const handleConfirmExit = () => navigate(`/visit/${safeId}`);

  const visit = mockData.visite.find((v) => String(v.id) === String(safeId));
  console.log(visit);
  if (!visit) return <div>Visita non trovata</div>;
  const currentOpera = visit.oggetti[safeIndex];

  const currentItem =
    currentOpera.items.find(
      (it) => it.durata === prefDurata && it.linguaggio === prefLingua,
    ) || currentOpera.items[0];

  const cambiaOpera = (nuovoIndice) => {
    if (nuovoIndice >= 0 && nuovoIndice < visit.oggetti.length) {
      navigate(`/visit/${safeId}/${nuovoIndice}`);
    }
  };

  return (
    <>
      <Container fluid className="card-container">
        <div className="top-nav-viewer">
          <button className="top-nav-btn" onClick={handleShow}>
            <i className="bi bi-chevron-left"></i>
          </button>

          <div className="top-nav-center">
            <span className="top-nav-title">GALLERY TOUR</span>
          </div>
        </div>
        <Row className="justify-content-center g-0">
          <Col xs={12} md={8} lg={6} className="p-0">
            <div className="img-container">
              <img
                src={currentOpera.immagine_riconoscimento}
                alt={currentOpera.titolo_opera}
              />
            </div>
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col xs={12} md={6} className="p-0">
            <Card
              className="d-flex text-center m-0 p-0 card-viewer"
              style={{ overflowY: "auto" }}
            >
              <Card.Body className="shadow-none card-viewer">
                <div className="text-start px-2">
                  <h2 className="mb-1 fw-bold h4">
                    {currentOpera.titolo_opera}
                  </h2>
                  <p
                    className="text-muted mb-2"
                    style={{ fontStyle: "italic" }}
                  >
                    {currentOpera.autore}
                    <i class="bi bi-info-circle p-2 mt-2"></i>
                  </p>

                  <p
                    className="small text-secondary mb-0"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {currentOpera.info_autore ||
                      "Facciamo finta ci sia scritto vita, morte e miracoli."}
                  </p>
                </div>

                <hr className="my-3 mx-2" style={{ opacity: "0.1" }} />

                <div className="text-start px-2 item-text-content">
                  <Card.Text>
                    {/* {currentItem.testo} */}
                    Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                    Quae, debitis! Voluptates magni nulla itaque ut quia
                    distinctio facilis tenetur ad! Lorem ipsum dolor sit amet
                    consectetur adipisicing elit. Quisquam in tempora maiores
                    excepturi quas eligendi dolore atque saepe expedita. Porro
                    debitis provident nam modi voluptas, distinctio fuga cumque?
                    Voluptates, nobis?
                  </Card.Text>
                </div>

                <div className="mt-4 mx-2 logistic mb-5">
                  <div className="text-start bg-light rounded border-danger border-start border-3 p-2">
                    <p className="d-block text-muted text-start m-0">
                      Prossima tappa:
                    </p>
                    <p>{currentOpera.logistica_prossimo}</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Navbar fixed="bottom" className="audio-player-fixed p-0 border-0">
        <Container fluid className="player-container">
          {/* Progress Area */}
          <div className="progress-section">
            <div className="progress-bar-container">
              <div className="progress-bar-fill mt-2" style={{ width: "40%" }}>
                <div className="progress-cursor"></div>
              </div>
            </div>
            <div className="timer-row">
              <span>01:42</span>
              <span>04:55</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="controls-row">
            <button className="btn-seek">
              <i className="bi bi-arrow-counterclockwise"></i>
              <span className="seek-val">10</span>
            </button>

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

            <button className="btn-seek">
              <i className="bi bi-arrow-clockwise"></i>
              <span className="seek-val">10</span>
            </button>
          </div>
        </Container>
      </Navbar>

      {/* MODAL DI CONFERMA */}
      <Modal
        show={showExitModal}
        onHide={handleClose}
        centered
        className="exit-modal"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold" style={{ color: "#1a1a1d" }}>
            Interrompere la visita?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-muted">
          Sei sicuro di voler interrompere l'ascolto e tornare alla lista delle
          opere?
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="link"
            className="text-decoration-none text-muted"
            onClick={handleClose}
          >
            Annulla
          </Button>
          <Button
            style={{
              backgroundColor: "#e18f37",
              border: "none",
              borderRadius: "10px",
              padding: "10px 25px",
            }}
            onClick={handleConfirmExit}
          >
            Conferma
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
