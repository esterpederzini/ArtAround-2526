import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = ({ isMobile }) => {
  const location = useLocation();
  // Mostra sempre la sidebar su desktop. 
  // Su mobile, la mostriamo solo nella Home, così nelle altre sezioni (visita, item) 
  // lasciamo spazio al contenuto dell'opera/visita.
  const showSideBar = !isMobile || ["/", "/home", "/login"].includes(location.pathname);

  return (
    <div className={`navigator-wrapper ${showSideBar ? "with-sidebar" : ""}`}>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default NavigatorLayout;
