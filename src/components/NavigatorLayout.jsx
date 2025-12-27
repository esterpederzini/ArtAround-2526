import React from "react";
import NavigatorHome from "./NavigatorHome";
import NavigatorSideBar from "./NavigatorSideBar";
import NavigatorBottomNav from "./NavigatorBottomNav";
import "../CSS/NavigatorLayout.css";

const NavigatorLayout = () => {
  return (
    <div className="navigator-wrapper">
      <NavigatorSideBar />
      <main className="main-content">
        <NavigatorHome />
      </main>
    </div>
  );
};

export default NavigatorLayout;
