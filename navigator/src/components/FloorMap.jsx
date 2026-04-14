import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export default function FloorMap({ config, currentItem }) {
  const navigate = useNavigate();
  
  // Funzione per trovare le coordinate cliccando sulla mappa
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Stampa in console i valori da copiare nel Database
    console.log(`Coordinate per ${currentItem?.titolo || "opera"}:`);
    console.log(`mappa_x: ${x.toFixed(2)}, mappa_y: ${y.toFixed(2)}`);
    
    // Opzionale: un alert per vederlo subito sul telefono
    alert(`X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`);
  };

  // Recuperiamo l'immagine corretta in base al piano dell'opera attuale
  const pianoAttuale = currentItem?.piano || "0";
  const urlMappa = config?.mappe?.[pianoAttuale];

  return (
    <div className="bg-dark min-vh-100 text-white">
      <div className="p-3">
        <Button variant="outline-light" onClick={() => navigate(-1)}>Indietro</Button>
        <h5 className="mt-3">Posizione: {currentItem?.titolo} (Piano {pianoAttuale})</h5>
      </div>

      <div className="position-relative d-inline-block w-100" onClick={handleMapClick}>
        {urlMappa ? (
          <img 
            src={urlMappa} 
            alt="Mappa Piano" 
            className="img-fluid w-100"
            style={{ cursor: 'crosshair', border: '1px solid #b38b4d' }}
          />
        ) : (
          <p className="p-5 text-center">Mappa non disponibile per questo piano.</p>
        )}

        {/* Pallino rosso dell'opera attuale */}
        {currentItem?.mappa_x && (
          <div style={{
            position: 'absolute',
            left: `${currentItem.mappa_x}%`,
            top: `${currentItem.mappa_y}%`,
            width: '18px',
            height: '18px',
            backgroundColor: 'red',
            borderRadius: '50%',
            border: '2px solid white',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px rgba(255,0,0,0.8)'
          }} />
        )}
      </div>
      
      <div className="p-3 small opacity-75">
        <i className="bi bi-info-circle me-2"></i>
        Clicca sulla mappa per ottenere le coordinate X e Y da inserire nel DB.
      </div>
    </div>
  );
}