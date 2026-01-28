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
import mockData from "../mockData.json";
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
        className="align-items-center justify-content-center"
        style={{
          height: "6vh",
          backgroundColor: "#242326",
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
            Opere da visitare
          </span>
        </div>
      </Navbar>
      <Container fluid className=" full-container">
        {visit.oggetti.map((opera, index) => (
          <Row key={index} className="justify-content-center mb-3 mt-3">
            <Col
              xs={1}
              className="justify-content-center align-items-center mt-3"
            >
              <div className="list-num-circle">{index + 1}</div>
            </Col>
            <Col xs={11} md={6} className="mt-2">
              <Card className="card">
                <Row className="g-0 align-items-center">
                  <Card.Img
                    src={opera.immagine_riconoscimento}
                    className="img-list"
                  />
                  <Col xs={8}>
                    <Card.Body
                      className="text-start mt-1"
                      style={{ padding: 0 }}
                    >
                      <Card.Title className="author">{opera.autore}</Card.Title>
                      <CardSubtitle className="title mt-1">
                        {opera.titolo_opera}
                      </CardSubtitle>
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
