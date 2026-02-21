import { React, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import mockData from "../../mockData.json";

const NavigatorHome = () => {
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedVisitId) {
      navigate(`/visit/${selectedVisitId}`);
    }
  };

  return (
    <div className="home-container">
      <div className="top-nav-bar">
        <span className="nav-icon nav-left">
          <i className="bi bi-list"></i>
        </span>
        <span className="nav-title">museum explorer</span>
        <span className="nav-icon nav-right">
          <i className="bi bi-person-circle"></i>
        </span>
      </div>

      {/* Intro image and overlay text */}
      <div className="home-hero-section">
        <img
          className="home-hero-img"
          src={mockData.introImg}
          alt="Museum intro"
        />
        <div className="home-hero-overlay">
          <h1 className="home-hero-title">Art Around</h1>
          <span className="home-hero-motto">Anywhere. Anytime. Everyone.</span>
        </div>
      </div>

      {/* <div className="content-overlay">
        <h1 className="txt">Art Around</h1>
        <span id="motto">Anywhere. Anytime. Everyone.</span>
        <form className="sel-museum" onSubmit={handleSubmit}>
          <select
            className="museum-select"
            onChange={(e) => setSelectedVisitId(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Scegli una visita...
            </option>
            {mockData.visite.map((visita) => (
              <option key={visita.id} value={visita.id}>
                {visita.titolo}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="submit-btn"
            disabled={!selectedVisitId}
          >
            Avvia
          </button>
        </form>
      </div> */}
    </div>
  );
};

export default NavigatorHome;
