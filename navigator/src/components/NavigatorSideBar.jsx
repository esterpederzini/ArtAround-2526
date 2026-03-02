import React, { useState } from "react";
import "../CSS/NavigatorSideBar.css";
import { Link } from "react-router-dom";

const NavigatorSideBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const items = [
    {
      routerLink: "",
      icon: "bi bi-shop-window",
      label: "Market Place",
    },
    {
      routerLink: "",
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
        <button className="nav-btn" onClick={toggleMenu}>
          <i className={`bi ${isVisible ? "bi-x-lg" : "bi-list"}`}></i>
        </button>
        {/* {isVisible && <span className="menu-title">Menù</span>} */}
      </div>

      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.label} className="nav-item">
            {isVisible && (
              <>
                <i className={item.icon}></i>
                <span className="link-text">{item.label}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default NavigatorSideBar;
