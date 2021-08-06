import React from "react";
import "./App.css";
import MapBoxContainer from "./components/MapBoxContainer";

function App() {
  return (
    <div className="App">
      <MapBoxContainer></MapBoxContainer>
      <button
        onClick={() => {
          localStorage.removeItem("venues");
          localStorage.removeItem("webcams");
          window.location.reload();
        }}
      >
        Clear API cache (refresh data)
      </button>
    </div>
  );
}

export default App;
