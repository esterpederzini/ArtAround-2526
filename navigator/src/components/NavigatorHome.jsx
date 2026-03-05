import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import "../CSS/NavigatorSideBar.css";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch configurazione
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

    // Fetch visite
    fetch("/api/visite")
      .then((res) => res.json())
      .then((json) => {
        // Gestione flessibile della risposta del controller
        if (json.successo && json.data) {
          // Se i dati sono dentro json.data.visite o direttamente in json.data
          const dataVisite = json.data.visite || json.data;
          setVisits(Array.isArray(dataVisite) ? dataVisite : []);
        }
      })
      .catch((err) => console.error("Errore fetch visite:", err));
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleNav = (path) => {
    closeSidebar();
    navigate(path);
  };

  return (
    <div className="home-dark-container">
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
      />
      <aside className={`side-bar ${sidebarOpen ? "open" : ""}`}>
        <div className="side-bar-header">
          <div className="profile-thumb">
            <i className="bi bi-person-circle"></i>
          </div>
          <div className="profile-info">
            <strong>{"user" || "ArtAround"}</strong>
          </div>
          <button className="close-btn" onClick={closeSidebar}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        <nav className="side-nav">
          <div
            className="side-nav-item"
            onClick={() => (window.location.href = "/")}
          >
            <i className="bi bi-shop-window"></i>
            <span>Marketplace (PC)</span>
          </div>
          <div className="side-nav-item" onClick={() => handleNav("/")}>
            <i className="bi bi-house-door"></i>
            <span>Home</span>
          </div>
          <div className="side-nav-item" onClick={() => handleNav("/map")}>
            <i className="bi bi-map"></i>
            <span>Floor Map</span>
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

      {/* --- HEADER --- */}
      <header className="home-header">
        <i
          className="bi bi-list menu-icon"
          onClick={toggleSidebar}
          style={{ cursor: "pointer" }}
        ></i>
        <span className="brand-name">{config?.museumName || "Loading..."}</span>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="hero-modern">
        <div className="hero-content">
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

      {/* --- VISITS SECTION --- */}
      <section className="visits-section">
        <div className="section-header">
          <h2>Explore Visits</h2>
          <span className="see-all">SEE ALL</span>
        </div>
        <div className="horizontal-scroll">
          {visits.length > 0 ? (
            visits.map((visita) => {
              // Gestione flessibile degli ID (MongoDB _id o id manuale)
              const visitId = visita._id || visita.id;

              return (
                <div
                  key={visitId}
                  className="visit-card"
                  onClick={() => navigate(`/visit/${visitId}`)}
                >
                  <div className="card-img-wrapper">
                    <img
                      src={
                        visita.image ||
                        "https://images.unsplash.com/photo-1518998053502-53cc83e9ce78?q=80&w=1000"
                      }
                      alt={visita.title || visita.titolo}
                    />
                    <span className="card-badge">
                      {visita.type || "AUDIO GUIDE"}
                    </span>
                  </div>
                  {/* Visualizza title se esiste, altrimenti titolo */}
                  <h3>{visita.title || visita.titolo || "Untitled Visit"}</h3>
                  <p>
                    {visita.duration || "60 min"} •{" "}
                    {visita.stops || (visita.tappe ? visita.tappe.length : 0)}{" "}
                    stops
                  </p>
                </div>
              );
            })
          ) : (
            <p className="empty-msg">
              No visits found. Check your database connection.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default NavigatorHome;
