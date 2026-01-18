import React from "react";
import NavigatorHome from "./NavigatorHome";
import NavigatorSideBar from "./NavigatorSideBar";
import { Outlet } from "react-router-dom";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = ({ isMobile }) => {
  return (
    <div className="navigator-wrapper">
      {!isMobile && <NavigatorSideBar />}
      <main className="main-content">
        <Outlet></Outlet>
      </main>
    </div>
  );
};

export default NavigatorLayout;
