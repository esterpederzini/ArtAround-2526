import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import "../CSS/NavigatorSideBar.css";

const NavigatorHome = () => {
  const [visits, setVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // 1. AGGIUNTO: Stato per quello che scrivi
  const [config, setConfig] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Dati sessione
  const sessionRaw = localStorage.getItem("user_session");
  const sessionData = sessionRaw ? JSON.parse(sessionRaw) : null;
  const userName = sessionData?.user?.username || "ArtAround User";

  useEffect(() => {
    // Fetch configurazione
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => {
        console.warn("Config non trovato, uso default:", err);
        setConfig({ museumName: "ArtAround", appName: "Discover the Art" });
      });

    // Fetch visite
    fetch("/api/visite")
      .then((res) => res.json())
      .then((json) => {
        if (json.successo && json.data) {
          const dataVisite = json.data.visite || json.data;
          setVisits(Array.isArray(dataVisite) ? dataVisite : []);
        }
      })
      .catch((err) => console.error("Errore fetch visite:", err));
  }, []);

  // 2. AGGIUNTO: Questa è la "lente". Filtra le visite basandosi su searchTerm
  const filteredVisits = visits.filter((visita) => {
    const search = searchTerm.toLowerCase();
    const idVisita = (visita._id || visita.id || "").toLowerCase();
    const titoloVisita = (visita.title || visita.titolo || "").toLowerCase();
    return idVisita.includes(search) || titoloVisita.includes(search);
  });

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleNav = (path) => {
    closeSidebar();
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    navigate("/login");
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
            <strong>{userName}</strong>
          </div>
          <button className="close-btn" onClick={closeSidebar}>
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
        </nav>
        <div className="side-bar-footer">
          <button
            className="settings-btn"
            onClick={handleLogout}
            style={{ color: "#ff4444" }}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <header className="home-header">
        <i className="bi bi-list menu-icon" onClick={toggleSidebar}></i>
        <span className="brand-name">{config?.museumName || "Loading..."}</span>
      </header>

      <section className="hero-modern">
        <div className="hero-content">
          <h1 className="hero-title">{config?.appName || "ArtAround"}</h1>
          <p className="hero-subtitle">
            {config?.motto ||
              "Curated journeys through the finest collections."}
          </p>

          <div className="search-bar">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Inserisci ID o titolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="visits-section">
        <div className="section-header">
          <h2>{searchTerm ? "Risultati" : "Explore Visits"}</h2>
        </div>

        <div className="horizontal-scroll">
          {/* 4. CAMBIATO: Qui usiamo filteredVisits invece di visits */}
          {filteredVisits.length > 0 ? (
            filteredVisits.map((visita) => {
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
                      alt={visita.title}
                    />
                    <span className="card-badge">
                      {visita.type || "AUDIO GUIDE"}
                    </span>
                  </div>
                  <h3>{visita.title || visita.titolo}</h3>
                  <p>
                    {visita.duration} • {visita.stops || visita.tappe?.length}{" "}
                    stops
                  </p>
                </div>
              );
            })
          ) : (
            <p className="empty-msg">Nessuna visita trovata.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default NavigatorHome;
