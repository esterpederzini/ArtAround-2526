import React from "react";
import NavigatorHome from "./NavigatorHome";
import NavigatorSideBar from "./NavigatorSideBar";
import { Outlet } from "react-router-dom";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = () => {
  return (
    <div className="navigator-wrapper">
      <NavigatorSideBar />
      <main className="main-content">
        <Outlet>{console.log("va")}</Outlet>
      </main>
    </div>
  );
};

export default NavigatorLayout;
