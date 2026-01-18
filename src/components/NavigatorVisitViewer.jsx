import React, { useState } from "react";
import mockData from "../mockData.json";
import {
  Button,
  Container,
  Row,
  Col,
  Card,
  Nav,
  Navbar,
} from "react-bootstrap";
import { useParams } from "react-router-dom";
import "../CSS/NavigatorVisitViewer.css";

export default function NavigatorVisitViewer() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefDurata, setPrefDurata] = useState("3s");
  const [prefLingua, setPrefLingua] = useState("medio");
  const [isPlaying, setIsPlaying] = useState(true);

  const visit = mockData.visite.find((v) => v.id === id);

  const currentOpera = visit.oggetti[currentIndex];
  const currentItem =
    currentOpera.items.find(
      (it) => it.durata === prefDurata && it.linguaggio === prefLingua
    ) || currentOpera.items[0];

  return (
    <>
      <Container fluid className="p-3 card-container">
        <Row className="justify-content-center">
          <Col xs={12} md={6}>
            <Card className="text-center shadow card-viewer">
              <Card.Body>
                <Card.Title className="mb-3">
                  {currentOpera.titolo_opera}
                </Card.Title>
                <div className="viewer-img-container mb-3 rounded">
                  <Card.Img src={currentOpera.immagine_riconoscimento} />
                </div>
                <Card.Text>{currentItem.testo}</Card.Text>
                <div className="mt-3 p-2 bg-light rounded">
                  <small>Logistica: {currentOpera.logistica_prossimo}</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Navbar fixed="bottom" className="bg-transparent mb-3">
          <Container className="bg-white shadow-lg rounded-pill p-1 border">
            <Nav className="w-100 d-flex justify-content-around align-items-center">
              <Nav.Link
                onClick={() => navigate("/")}
                className="text-dark d-flex flex-column align-items-center"
              >
                <span>
                  <i class="bi bi-list"></i>
                </span>
                <span style={{ fontSize: "10px" }}>Menù</span>
              </Nav.Link>
              <Nav.Link
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
                className="text-dark d-flex flex-column align-items-center back"
              >
                <span className="back">
                  <i class="bi bi-caret-left-fill"></i>
                </span>
                <span style={{ fontSize: "10px" }}>Indietro</span>
              </Nav.Link>

              {/* Tasto Centrale: Approfondisci (stile rosso Messages) */}
              <div
                onClick={() => setIsPlaying(!isPlaying)}
                className="d-flex flex-column align-items-center justify-content-center"
                style={{
                  cursor: "pointer",
                  width: "60px",
                }}
              >
                <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm player">
                  <i
                    className={`bi ${
                      isPlaying ? "bi-pause-fill" : "bi-play-fill"
                    }`}
                  ></i>
                </div>
                {/* <span
                  style={{ fontSize: "10px", color: "black", marginTop: "2px" }}
                >
                  {isPlaying ? "Pausa" : "Riproduci"}
                </span> */}
              </div>
              <Nav.Link
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                disabled={currentIndex === visit.oggetti.length - 1}
                className="text-dark d-flex flex-column align-items-center"
              >
                <span>
                  <i class="bi bi-caret-right-fill"></i>
                </span>
                <span style={{ fontSize: "10px" }}>Avanti</span>
              </Nav.Link>

              {/* Logout/Esci */}
              <Nav.Link
                onClick={() => navigate("/")}
                className="text-dark d-flex flex-column align-items-center"
              >
                <span className="fs-5">👤</span>
                <span style={{ fontSize: "10px" }}>Profilo</span>
              </Nav.Link>
            </Nav>
          </Container>
        </Navbar>
      </Container>
    </>
  );
}
