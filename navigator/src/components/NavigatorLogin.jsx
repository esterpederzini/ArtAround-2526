import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/NavigatorLogin.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUniversity } from "@fortawesome/free-solid-svg-icons";

const NavigatorLogin = () => {
  const [identifier, setIdentifier] = useState("");
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
        const userData = json?.data?.user || json?.data;
        const token = json?.data?.token || null;
        const sessionData = {
          user: userData,
          token,
          loginTimestamp: new Date().getTime(),
        };
        localStorage.setItem("user_session", JSON.stringify(sessionData));
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

        {/* Icon */}
        <div className="logo-icon">
          <FontAwesomeIcon icon={faUniversity} />
        </div>

        {/* Heading */}
        <h1>Bentornato</h1>
        <p className="subtitle">Museum Explorer</p>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="identifier">Username</label>
            <input
              id="identifier"
              type="text"
              placeholder="Inserisci il tuo username"
              // className="login-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Inserisci la password"
                // className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
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

        <p className="footer-text">ArtAround &mdash; Museum Explorer</p>
      </div>
    </div>
  );
};

export default NavigatorLogin;