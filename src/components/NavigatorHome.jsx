import { React, useState } from "react";
import "../CSS/NavigatorHome.css";

const NavigatorHome = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  const options = [
    { value: "Visita 1", label: "Museo 1" },
    { value: "Visita 2", label: "Museo 2" },
  ];

  return (
    <div className="home-container">
      <div className="content-overlay">
        <h1 className="txt">Art Around</h1>
        <span id="motto">Anywhere. Anytime. Everyone.</span>
        <form className="sel-museum" onSubmit={handleSubmit}>
          {/* <div
            className="museum-select"
            onClick={() => setShowOptions(!showOptions)}
          >
            {selected}
            {showOptions && (
              <div className="options-box">
                {options.map((opt) => (
                  <div
                    key={opt.value}
                    className="single-option"
                    onClick={() => setSelected(opt.label)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )} 
          </div> */}
          <select className="museum-select" defaultValue="">
            <option value="" disabled>
              Scegli una visita...
            </option>
            {options.map((option) => (
              <option
                key={option.label}
              >{`${option.value} - ${option.label}`}</option>
            ))}
          </select>
          <button type="submit" className="submit-btn">
            Avvia
          </button>
        </form>
      </div>
    </div>
  );
};

export default NavigatorHome;
