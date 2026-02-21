import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardSubtitle,
  Navbar,
  Button,
  Modal,
} from "react-bootstrap";
import mockData from "../../mockData.json";
import "../CSS/NavigatorVisitOverview.css";

function NavigatorVisitOverview() {
  const { id } = useParams();
  const visit = mockData.visite.find((v) => v.id === id);
  const opera = [visit.oggetti];
  const [showExitModal, setShowExitModal] = useState(false);
  const navigate = useNavigate();

  const handleShow = () => setShowExitModal(true);
  const handleClose = () => setShowExitModal(false);
  const handleConfirmExit = () => navigate("/home");

  return (
    <>
      <Navbar
        className="align-items-center justify-content-center border-0 shadow-none"
        style={{
          height: "6vh",
          backgroundColor: "#242326",
          borderBottom: "none",
        }}
      >
        <div className="ms-3 position-absolute start-0">
          <Button
            variant="link"
            className="p-0 shadow-none"
            onClick={handleShow}
          >
            <i
              className="bi bi-arrow-left"
              style={{ fontSize: "1.6rem", color: "#FAF7F1" }}
            ></i>
          </Button>
        </div>
        <div className="w-100 d-flex justify-content-center">
          <span
            className="fw-bold"
            style={{ fontSize: "1.2rem", color: "#FAF7F1" }}
          >
            Tour preview
          </span>
        </div>
      </Navbar>
      <Container fluid className="full-container px-4">
        <div className="itinerary-header mt-4 mb-3">
          <h3 className="text-white fw-bold">Itenerario visita</h3>
        </div>

        <div className="d-grid mb-4">
          <Button
            className="start-visit-btn d-flex align-items-center justify-content-center gap-3"
            onClick={() => navigate(`/visit/${id}/0`)} // Parte sempre dalla prima opera (0)
          >
            <div className="play-icon-circle">
              <i className="bi bi-play-fill"></i>
            </div>
            <span className="fw-bold">Inizia la visita</span>
          </Button>
        </div>

        {visit.oggetti.map((opera, index) => (
          <Row
            key={index}
            className="g-0 mb-0 itinerary-row"
            onClick={() => navigate(`/visit/${id}/${index}`)}
            style={{ cursor: "pointer" }}
          >
            {/* Colonna Timeline (Numero e Linea) */}
            <Col
              xs={2}
              className="d-flex flex-column align-items-center position-relative"
            >
              <div className={`list-num-circle ${index === 0 ? "active" : ""}`}>
                {index + 1}
              </div>
              {/* Non mostriamo la linea dopo l'ultimo elemento */}
              {index < visit.oggetti.length - 1 && (
                <div className="timeline-line"></div>
              )}
            </Col>

            {/* Colonna Card Opera */}
            <Col xs={10} className="pb-4">
              <Card className="itinerary-card shadow-none">
                <Row className="g-0 align-items-center">
                  <Col xs={4} className="p-2">
                    <Card.Img
                      src={opera.immagine_riconoscimento}
                      className="img-list-new"
                    />
                  </Col>
                  <Col xs={8}>
                    <Card.Body className="py-2 px-3">
                      <Card.Title className="opera-title">
                        {opera.titolo_opera}
                      </Card.Title>
                      <CardSubtitle className="author">
                        {opera.autore}
                      </CardSubtitle>
                      <div className="audio-info mt-2">
                        <i className="bi bi-headphones me-2"></i>
                        <span>04:20</span>
                      </div>
                    </Card.Body>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        ))}
      </Container>
      <Modal show={showExitModal} onHide={handleClose} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title style={{ color: "#5b252d" }}>
            Conferma uscita
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler interrompere la visita e tornare alla Home?
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

export default NavigatorVisitOverview;
