import React, { useState, useEffect } from "react";
import mockData from "../mockData.json";
import { Container, Row, Col, Card, Nav, Navbar } from "react-bootstrap";
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
        <Row className="justify-content-center">
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

                <div className="mt-4 mx-2 logistic mb-3">
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

      <Navbar fixed="bottom" className="audio-player-fixed p-0 border-top">
        <Container fluid className="p-3 shadow-lg player-container">
          <div className="w-100 px-2">
            <div className="d-flex align-items-center mb-2">
              <span className="timer-text me-2" style={{ color: "#333333" }}>
                00:00
              </span>
              <div className="progress-bar-container flex-grow-1">
                <div
                  className="progress-bar-fill"
                  style={{ width: "40%" }}
                ></div>
              </div>
              <span className="timer-text ms-2" style={{ color: "#333333" }}>
                03:00
              </span>
            </div>

            <Nav className="w-100 d-flex justify-content-around align-items-center">
              <Nav.Link
                onClick={() => cambiaOpera(safeIndex - 1)}
                disabled={safeIndex === 0}
                className={`arrow d-flex flex-column align-items-center p-0 ${safeIndex === 0 ? "opacity-25" : ""}`}
              >
                <i className="bi bi-caret-left-fill fs-5"></i>
                <span style={{ fontSize: "10px" }}>Indietro</span>
              </Nav.Link>

              <div
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-center justify-content-center shadow-sm player">
                  <i
                    className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"}`}
                  ></i>
                </div>
              </div>

              <Nav.Link
                onClick={() => cambiaOpera(safeIndex + 1)}
                disabled={safeIndex === visit.oggetti.length - 1}
                className={`arrow d-flex flex-column align-items-center p-0 ${safeIndex === visit.oggetti.length - 1 ? "opacity-25" : ""}`}
              >
                <i className="bi bi-caret-right-fill fs-5"></i>
                <span style={{ fontSize: "10px" }}>Avanti</span>
              </Nav.Link>
            </Nav>
          </div>
        </Container>
      </Navbar>
    </>
  );
}
