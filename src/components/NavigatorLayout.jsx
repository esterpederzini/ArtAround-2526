import React from "react";
import NavigatorHome from "./NavigatorHome";
import NavigatorSideBar from "./NavigatorSideBar";
import { useLocation, Outlet } from "react-router-dom";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = ({ isMobile }) => {
  const location = useLocation();
  const showSideBar = !isMobile || ["/", "/home"].includes(location.pathname);

  return (
    <div className="navigator-wrapper">
      {showSideBar && <NavigatorSideBar />}
      <main className="main-content">
        <Outlet></Outlet>
      </main>
    </div>
  );
};

export default NavigatorLayout;
