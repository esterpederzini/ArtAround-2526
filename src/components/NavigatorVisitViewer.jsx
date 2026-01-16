import React, { useState } from "react";
import mockData from "../mockData.json";
import { Button, Container, Row, Col, Card } from "react-bootstrap";
import { useParams } from "react-router-dom";
import "../CSS/NavigatorVisitViewer.css";

export default function NavigatorVisitViewer() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefDurata, setPrefDurata] = useState("3s");
  const [prefLingua, setPrefLingua] = useState("medio");

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

        {/* Footer fisso */}
        <div className="fixed-bottom p-3 bg-light d-flex justify-content-between border-top">
          <Button
            variant="secondary"
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            disabled={currentIndex === 0}
          >
            Precedente
          </Button>
          <Button
            variant="primary"
            onClick={() => setPrefDurata(prefDurata === "3s" ? "15s" : "3s")}
          >
            {prefDurata === "3s" ? "Approfondisci" : "Riduci"}
          </Button>

          <Button
            variant="success"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            disabled={currentIndex === visit.oggetti.length - 1}
          >
            Prossimo
          </Button>
        </div>
      </Container>
    </>
  );
}
