import React, { useState, useEffect } from "react";
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
  Spinner
} from "react-bootstrap";
import "../CSS/NavigatorVisitOverview.css";

function NavigatorVisitOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Stato per i dati della visita e caricamento
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  // Recupero dati dal Backend
  useEffect(() => {
    // Chiamata alla rotta di ricerca che abbiamo definito in index.js
    // Passiamo l'id della visita (assumendo che il backend gestisca la ricerca per ID visita)
    fetch(`/db/search?visitId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        // Se il backend restituisce un array, prendiamo il primo elemento
        const foundVisit = Array.isArray(data) ? data[0] : data;
        setVisit(foundVisit);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore nel recupero della visita:", err);
        setLoading(false);
      });
  }, [id]);

  const handleShow = () => setShowExitModal(true);
  const handleClose = () => setShowExitModal(false);
  const handleConfirmExit = () => navigate("/home");

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: "100vh", backgroundColor: "#242326"}}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  if (!visit) {
    return <div className="text-white p-5">Visita non trovata.</div>;
  }

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
          <h3 className="text-white fw-bold">{visit.title}</h3>
          <p className="text-secondary small">{visit.museum}</p>
        </div>

        <div className="d-grid mb-4">
          <Button
            className="start-visit-btn d-flex align-items-center justify-content-center gap-3"
            onClick={() => navigate(`/visit/${id}/0`)}
          >
            <div className="play-icon-circle">
              <i className="bi bi-play-fill"></i>
            </div>
            <span className="fw-bold">Inizia la visita</span>
          </Button>
        </div>

        {/* Mappiamo visit.items (nome campo in inglese dallo schema Visit.js) */}
        {visit.items && visit.items.map((itemObj, index) => (
          <Row
            key={index}
            className="g-0 mb-0 itinerary-row"
            onClick={() => navigate(`/visit/${id}/${index}`)}
            style={{ cursor: "pointer" }}
          >
            <Col
              xs={2}
              className="d-flex flex-column align-items-center position-relative"
            >
              <div className={`list-num-circle ${index === 0 ? "active" : ""}`}>
                {itemObj.order || index + 1}
              </div>
              {index < visit.items.length - 1 && (
                <div className="timeline-line"></div>
              )}
            </Col>

            <Col xs={10} className="pb-4">
              <Card className="itinerary-card shadow-none">
                <Row className="g-0 align-items-center">
                  <Col xs={4} className="p-2">
                    {/* itemId è popolato dal backend, contiene i dati dell'opera */}
                    <Card.Img
                      src={itemObj.itemId?.image || "/img/placeholder.jpg"}
                      className="img-list-new"
                    />
                  </Col>
                  <Col xs={8}>
                    <Card.Body className="py-2 px-3">
                      <Card.Title className="opera-title">
                        {itemObj.itemId?.title}
                      </Card.Title>
                      <CardSubtitle className="author">
                        {itemObj.itemId?.author}
                      </CardSubtitle>
                      <div className="audio-info mt-2">
                        <i className="bi bi-headphones me-2"></i>
                        <span>{itemObj.itemId?.duration}</span>
                      </div>
                      {/* Mostriamo l'istruzione logistica (Requisito obbligatorio) */}
                      {itemObj.navigationInstruction && (
                        <div className="small text-muted mt-1 italic">
                           <i className="bi bi-geo-alt-fill me-1"></i>
                           {itemObj.navigationInstruction}
                        </div>
                      )}
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