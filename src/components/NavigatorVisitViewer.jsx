import React from "react";
import mockData from "../mockData.json";
import { Button, Container, Row, Col, Card } from "react-bootstrap";

export default function NavigatorVisitViewer() {
  return (
    <Container fluid className="p-3">
      <Row>
        <Col xs={12} md={6}>
          <Card>
            <Card.Img variant="top" src={opera.immagine_riconoscimento} />
            <Card.Body>
              <Card.Title>{id_opera.titolo_opera}</Card.Title>
              <Card.Text>{items.testo}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Footer fisso con i controlli */}
      <div className="fixed-bottom p-3 bg-light d-flex justify-content-between">
        <Button variant="secondary">Precedente</Button>
        <Button variant="primary" onClick={() => setDurata("15s")}>
          Dimmi di più
        </Button>
        <Button variant="success">Prossimo</Button>
      </div>
    </Container>
  );
}
