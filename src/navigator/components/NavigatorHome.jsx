import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [config, setConfig] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const navigate = useNavigate();

  // Caricamento dati all'avvio
  useEffect(() => {
    // 1. Carichiamo la configurazione del museo (Requisito: sito generico)
    fetch("/data/config.json")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Errore config:", err));

    // 2. Carichiamo le visite dal database
    // Usiamo la rotta search senza parametri per averle tutte,
    // o filtrando per il museo nel config
    fetch("/db/search?type=visits")
      .then((res) => res.json())
      .then((data) => {
        // Se il backend restituisce un array di visite
        setVisits(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Errore visite:", err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedVisitId) {
      // Navighiamo alla pagina di preview che abbiamo appena aggiornato
      navigate(`/visit/${selectedVisitId}`);
    }
  };

  return (
    <div className="home-container">
      <div className="top-nav-bar">
        <span className="nav-icon nav-left">
          <i className="bi bi-list"></i>
        </span>
        {/* Usiamo il nome del museo dal config */}
        <span className="nav-title">
          {config?.museumName || "museum explorer"}
        </span>
        <span className="nav-icon nav-right">
          <i className="bi bi-person-circle"></i>
        </span>
      </div>

      {/* Hero Section dinamica */}
      <div className="home-hero-section">
        <img
          className="home-hero-img"
          src={config?.heroImage || "/img/default_hero.jpg"}
          alt="Museum intro"
        />
        <div className="home-hero-overlay">
          <h1 className="home-hero-title">{config?.appName || "Art Around"}</h1>
          <span className="home-hero-motto">
            {config?.motto || "Anywhere. Anytime. Everyone."}
          </span>
        </div>
      </div>

      {/* Form di selezione visita (riattivato e reso dinamico) */}
      <div
        className="content-overlay"
        style={{ position: "relative", zIndex: 10, marginTop: "-50px" }}
      >
        <form className="sel-museum px-4" onSubmit={handleSubmit}>
          <select
            className="museum-select form-select mb-3"
            style={{
              backgroundColor: "#FAF7F1",
              borderRadius: "10px",
              padding: "12px",
            }}
            onChange={(e) => setSelectedVisitId(e.target.value)}
            value={selectedVisitId}
          >
            <option value="" disabled>
              Scegli una visita...
            </option>
            {visits.map((visita) => (
              <option key={visita._id} value={visita._id}>
                {visita.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="submit-btn w-100"
            style={{
              backgroundColor: "#5b252d",
              color: "white",
              border: "none",
              padding: "12px",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
            disabled={!selectedVisitId}
          >
            Avvia Esplorazione
          </button>
        </form>
      </div>
    </div>
  );
};

export default NavigatorHome;
