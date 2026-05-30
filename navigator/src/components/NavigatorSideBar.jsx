import React, { useState } from "react";
import "../CSS/NavigatorSideBar.css";

const NavigatorSideBar = () => {
  const [isVisible, setIsVisible] = useState(false);

  const items = [
    {
      routerLink: "/marketplace",
      icon: "bi bi-shop-window",
      label: "Market Place",
    },
    {
      routerLink: "/mappa",
      icon: "bi bi-map",
      label: "Mappa",
    },
  ];

  const toggleMenu = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <nav className={`sidebar ${isVisible ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
        <button
          className="nav-btn"
          onClick={toggleMenu}
          title="Apri/Chiudi Menù"
        >
          <i className={`bi ${isVisible ? "bi-x-lg" : "bi-list"}`}></i>
        </button>
      </div>

      <ul className="nav-list">
        {items.map((item) => (
          <li
            key={item.label}
            className="nav-item"
            title={!isVisible ? item.label : ""}
          >
            {/* L'icona rimane stampata nel DOM così è visibile sia da contratta che da espansa */}
            <i className={item.icon}></i>

            {/* Il testo viene renderizzato solo se la barra è aperta */}
            {isVisible && <span className="link-text">{item.label}</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default NavigatorSideBar;
