import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorLogin.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faUniversity,
} from "@fortawesome/free-solid-svg-icons";

const NavigatorLogin = () => {
  const [identifier, setIdentifier] = useState(""); // Chiamiamolo identifier invece di email per chiarezza
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
      });

      const json = await response.json();

      if (json.successo) {
        localStorage.setItem("user", JSON.stringify(json.data));
        navigate("/");
      } else {
        setError(json.messaggio || "Credenziali non valide");
      }
    } catch (err) {
      setError("Errore di connessione al server");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-icon">
          <FontAwesomeIcon icon={faUniversity} />
        </div>

        <h1>Bentornato</h1>
        <p className="subtitle">Museum Explorer</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username o Email</label>
            <input
              type="text" // Cambiato in text per accettare "autore1"
              placeholder="Inserisci il tuo username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              // Rimosso lo stile inline che rompeva il layout
            />
          </div>

          <div className="input-group">
            <div className="label-row">
              <label>Password</label>
            </div>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Inserisci la password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </span>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="login-btn">
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
};

export default NavigatorLogin;
