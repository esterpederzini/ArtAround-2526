import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Lo stato è già qui
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Caricamento Configurazione
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => {
        console.warn("Config non trovato, uso default:", err);
        setConfig({
          museumName: "ArtAround",
          appName: "Discover the Art",
        });
      });

    // 2. Caricamento Visite
    fetch("/db/search")
      .then((res) => res.json())
      .then((data) => {
        const visitList = data.result || data;
        setVisits(Array.isArray(visitList) ? visitList : []);
      })
      .catch((err) => console.error("Errore fetch visite:", err));
  }, []);

  // Funzione per gestire l'apertura/chiusura
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="home-dark-container">
      {/* PASSAGGIO 1: Il componente NavigatorSideBar riceve 'open' 
          e la funzione per chiudersi 'onClose' 
      */}
      <NavigatorSideBar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        config={config}
        navigate={navigate}
      />

      {/* Header superiore */}
      <header className="home-header">
        {/* PASSAGGIO 2: Aggiungiamo onClick all'icona del menu
         */}
        <i
          className="bi bi-list menu-icon"
          onClick={toggleSidebar}
          style={{ cursor: "pointer" }}
        ></i>
        <span className="brand-name">{config?.museumName || "Loading..."}</span>
        <i className="bi bi-person-circle profile-icon"></i>
      </header>

      {/* Resto del codice invariato... */}
      <section className="hero-modern">
        <div className="hero-content">
          <span className="badge-featured">FEATURED EXPERIENCE</span>
          <h1 className="hero-title">{config?.appName || "ArtAround"}</h1>
          <p className="hero-subtitle">
            {config?.motto ||
              "Curated journeys through the finest collections."}
          </p>
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

      <section className="visits-section">
        <div className="section-header">
          <h2>Explore Visits</h2>
          <span className="see-all">SEE ALL</span>
        </div>
        <div className="horizontal-scroll">
          {visits.length > 0 ? (
            visits.map((visita) => (
              <div
                key={visita._id || visita.title}
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
                  {visita.duration || "60 min"} • {visita.stops || "12"} stops
                </p>
              </div>
            ))
          ) : (
            <p className="empty-msg">
              No visits found. Did you run /db/create?
            </p>
          )}
        </div>
      </section>

      <nav className="bottom-nav">
        <div className="nav-item active" onClick={() => navigate("/")}>
          <i className="bi bi-house-door-fill"></i>
          <span>HOME</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/map")}>
          <i className="bi bi-map"></i>
          <span>FLOOR MAP</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/audio")}>
          <i className="bi bi-headphones"></i>
          <span>AUDIO</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/favorites")}>
          <i className="bi bi-heart"></i>
          <span>FAVORITES</span>
        </div>
      </nav>
    </div>
  );
};

const NavigatorSideBar = ({ open, onClose, config, navigate }) => {
  const handleNav = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`side-bar ${open ? "open" : ""}`}>
        <div className="side-bar-header">
          <div className="profile-thumb">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-info">
            <strong>{config?.museumName || "ArtAround"}</strong>
            <small>Premium Member</small>
          </div>
          <button className="close-btn" onClick={onClose}>
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

export default NavigatorHome;
