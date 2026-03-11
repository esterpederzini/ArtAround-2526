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
  Spinner,
} from "react-bootstrap";
import "../CSS/NavigatorVisitOverview.css";

function NavigatorVisitOverview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Puntiamo alla rotta definita in api.js: router.get("/visite/:id", ctrl.getVisitaById);
    fetch(`/api/visite/${id}`)
      .then((res) => res.json())
      .then((json) => {
        // Il tuo controller restituisce { successo: true, data: { ... } }
        if (json.successo && json.data) {
          setVisit(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore fetch dal DB:", err);
        setLoading(false);
      });
  }, [id]);

  const handleShow = () => setShowExitModal(true);
  const handleClose = () => setShowExitModal(false);
  const handleConfirmExit = () => navigate("/");

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh", backgroundColor: "#242326" }}
      >
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
        style={{ height: "6vh", backgroundColor: "#242326" }}
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
          {/* Supporto sia per 'title' che 'titolo' in base a come hai salvato su Atlas */}
          <h3 className="text-white fw-bold">{visit.title || visit.titolo}</h3>
          <p className="text-secondary small">{visit.museo}</p>
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

        {/* tappe è l'array nel modello Visita che contiene itemId */}
        {visit.tappe &&
          visit.tappe.map((tappa, index) => {
            // Grazie al .populate() del controller, itemId non è più solo una stringa ma l'intero oggetto Item
            const opera = tappa.item_default || {};
            console.log("Dati opera caricata:", opera);
            return (
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
                  <div
                    className={`list-num-circle ${index === 0 ? "active" : ""}`}
                  >
                    {index + 1}
                  </div>
                  {index < visit.tappe.length - 1 && (
                    <div className="timeline-line"></div>
                  )}
                </Col>

                <Col xs={10} className="pb-4">
                  <Card className="itinerary-card shadow-none">
                    <Row className="g-0 align-items-center">
                      <Col xs={4} className="p-2">
                        <Card.Img
                          src={opera.url || "/img/placeholder.jpg"} // Usiamo 'url' come nel tuo JSON items
                          className="img-list-new"
                        />
                      </Col>
                      <Col xs={8}>
                        <Card.Body className="py-2 px-3">
                          <Card.Title className="opera-title">
                            {opera.titolo}
                          </Card.Title>
                          <div className="audio-info mt-2">
                            <i className="bi bi-headphones me-2"></i>
                            <span>{opera.lunghezza}</span>
                          </div>
                        </Card.Body>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            );
          })}
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
