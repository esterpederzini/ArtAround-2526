import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Configurazione (Mock o Fetch)
    fetch("/data/config.json")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() =>
        setConfig({
          museumName: "Museum Explorer",
          appName: "Discover the World of Art",
        }),
      );

    // 2. Visite (Carichiamo i dati per le card)
    fetch("/db/search?type=visits")
      .then((res) => res.json())
      .then((data) => setVisits(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Errore visite:", err));
  }, []);

  // Inline side bar component
  const NavigatorSideBar = ({ open, onClose }) => {
    const handleNav = (path) => {
      onClose();
      navigate(path);
    };

    return (
      <>
        <div
          className={`sidebar-overlay ${open ? "visible" : ""}`}
          onClick={onClose}
          aria-hidden={!open}
        />
        <aside className={`side-bar ${open ? "open" : ""}`} aria-hidden={!open}>
          <div className="side-bar-header">
            <div className="profile-thumb">
              <i className="bi bi-person-circle"></i>
            </div>
            <div className="profile-info">
              <strong>{config?.museumName || "Museum Explorer"}</strong>
              <small>{config?.appName || "Discover the World of Art"}</small>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <i className="bi bi-x"></i>
            </button>
          </div>

          <nav className="side-nav">
            <div className="side-nav-item" onClick={() => handleNav("/")}>
              <i className="bi bi-house-door"></i>
              <span>Home</span>
            </div>
            <div className="side-nav-item" onClick={() => handleNav("/map")}>
              <i className="bi bi-map"></i>
              <span>Floor Map</span>
            </div>
            <div className="side-nav-item" onClick={() => handleNav("/audio")}>
              <i className="bi bi-headphones"></i>
              <span>Audio Guides</span>
            </div>
            <div
              className="side-nav-item"
              onClick={() => handleNav("/favorites")}
            >
              <i className="bi bi-heart"></i>
              <span>Favorites</span>
            </div>
          </nav>

          <div className="side-bar-footer">
            <button
              className="settings-btn"
              onClick={() => handleNav("/settings")}
            >
              <i className="bi bi-gear"></i>
              <span>Settings</span>
            </button>
          </div>
        </aside>
      </>
    );
  };

  return (
    <div className="home-dark-container">
      {/* Header superiore */}
      <header className="home-header">
        <i className="bi bi-list menu-icon"></i>
        <span className="brand-name">
          {config?.museumName || "Museum Explorer"}
        </span>
        <i className="bi bi-person-circle profile-icon"></i>
      </header>

      {/* Sezione Hero con Immagine di sfondo */}
      <section className="hero-modern">
        <div className="hero-content">
          <span className="badge-featured">FEATURED EXPERIENCE</span>
          <h1 className="hero-title">
            {config?.appName || "Discover the World of Art"}
          </h1>
          <p className="hero-subtitle">
            Curated journeys through the finest collections.
          </p>

          {/* Barra di ricerca finta (come da immagine) */}
          <div className="search-bar-mock">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search exhibits or artists..."
              disabled
            />
            <i className="bi bi-qr-code-scan"></i>
          </div>
        </div>
      </section>

      {/* Sezione Explore Visits (Orizzontale) */}
      <section className="visits-section">
        <div className="section-header">
          <h2>Explore Visits</h2>
          <span className="see-all">SEE ALL</span>
        </div>

        <div className="horizontal-scroll">
          {visits.length > 0 ? (
            visits.map((visita) => (
              <div
                key={visita._id}
                className="visit-card"
                onClick={() => navigate(`/visit/${visita._id}`)}
              >
                <div className="card-img-wrapper">
                  <img
                    src={visita.image || "/img/default_visit.jpg"}
                    alt={visita.title}
                  />
                  <span className="card-badge">
                    {visita.type || "AUDIO GUIDE"}
                  </span>
                </div>
                <h3>{visita.title}</h3>
                <p>
                  {visita.duration || "60 min"} • {visita.stops || "12 stops"}
                </p>
              </div>
            ))
          ) : (
            <p className="empty-msg">No visits available yet.</p>
          )}
        </div>
      </section>

      {/* Navigazione Bottom (Mockup come immagine) */}
      <nav className="bottom-nav">
        <div className="nav-item active">
          <i className="bi bi-house-door-fill"></i>
          <span>HOME</span>
        </div>
        <div className="nav-item">
          <i className="bi bi-map"></i>
          <span>FLOOR MAP</span>
        </div>
        <div className="nav-item">
          <i className="bi bi-headphones"></i>
          <span>AUDIO</span>
        </div>
        <div className="nav-item">
          <i className="bi bi-heart"></i>
          <span>FAVORITES</span>
        </div>
      </nav>
    </div>
  );
};

export default NavigatorHome;
