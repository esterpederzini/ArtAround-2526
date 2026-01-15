import { React, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorHome.css";
import mockData from "../mockData.json";

const NavigatorHome = () => {
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedVisitId) {
      navigate(`/visit/${selectedVisitId}`);
      console.log("agaha");
    }
  };

  return (
    <div className="home-container">
      <div className="content-overlay">
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
      </div>
    </div>
  );
};

export default NavigatorHome;
