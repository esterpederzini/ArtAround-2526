# Insegnamento di Tecnologie Web
# CdS In Informatica   
# (A.A. 2025-26)

# Progetto ArtAround 18-24  
 
# READ ME DEL PROGETTO ARTAROUND

## Nome del gruppo: 
Le esaurite


## Membri del gruppo  

* Nome e cognome: `Ester Pederzini `, matricola: `0001113727 `, mail: ` ester.pederzini@studio.unibo.it`
* Nome e cognome: `Fiammetta Maria Ternullo`, matricola: `0001070483`, mail: `fiammetta.ternullo@studio.unibo.it `
* LLM (nome e versione e licenza): 
  - Gemini 3.0/3.5 Flash (Licenza Standard/Free di Google)
  - Claude Sonnet 4.5/4.6 (Licenza Standard/Free di Anthropic)

* fabio.vitali@unibo.it
* andrea.schimmenti2@unibo.it
* gianmarco.spinaci2@unibo.it
* remo.grillo@unibo.it

## Tipo progetto
18-24 

## Data di disponibilità delle applicazioni
_ Al massimo 15 giorni dopo la data di sottomissione del file README_

## Locazione del progetto:

* URI del marketplace: https://site252620.tw.cs.unibo.it.
* URI del navigator: https://site252620.tw.cs.unibo.it./navigator
* Altri URI rilevanti:

## Organizzazione dei sorgenti

L'organizzazione interna della directory "source" si struttura in tre 
sottocartelle dedicate:

/html/source/
│
├── backend-server/          # Directory dell'applicazione server-side
│   ├── config.json          # File di configurazione dinamica del museo
│   ├── seed_data.json       # Dataset in formato JSON con i dati iniziali di test
│   ├── index.js             # Punto di ingresso dell'applicazione Express
│   ├── package.json         # Manifest delle dipendenze NPM del server
│   ├── models/              # Modelli dei dati Mongoose (Item, User, Visita)
│   ├── controllers/         # Logica dei controller e gestione degli endpoint
│   ├── routes/              # Definizione delle rotte delle API REST
│   ├── middleware/          # Middleware di autenticazione e controllo ruoli
│   └── scripts/             # Script di utilità interni al backend
│       └── mongo.js         # Script di popolazione iniziale di MongoDB (Mongoose)
│
├── marketplace-app/         # Directory dell'applicazione Marketplace
│   ├── index.html           # Schermata di login e accesso degli utenti
│   ├── dashboard.html       # Pannello principale di consultazione del catalogo
│   ├── editor-item.html     # Interfaccia di creazione e modifica delle opere
│   ├── editor-visita.html   # Interfaccia di composizione dei percorsi
│   ├── css/                 # Fogli di stile proprietari del Marketplace
│   └── js/                  # Script JavaScript Vanilla per la logica del DOM
│
└── navigator-app/           # Directory dell'applicazione Navigator (React)
    ├── package.json         # Dipendenze e script di esecuzione dell'app React
    ├── public/              # Risorse statiche per il rendering nel browser
    └── src/
        ├── main.jsx         # Entry point del rendering del Virtual DOM
        ├── App.jsx          # Router e gestione principale delle viste mobile
        ├── App.css          # Foglio di stile principale dell'applicazione
        ├── index.css        # Stili globali e reset CSS
        ├── assets/          # Risorse multimediali statiche dell'applicazione
        ├── CSS/             # Sottocartella per fogli di stile specifici
        ├── Img/             # Icone e immagini locali per le viste del frontend
        ├── components/      # Componenti funzionali JSX riutilizzabili mobile-side
        └── context/         # Stato globale centralizzato tramite React Context
            └── NavigatorContext.jsx  # Context provider per azzerare il prop-drilling

  
#### Server-side
* **Linguaggio di programmazione**: JavaScript (Node.js v22)
* **Framework di backend**: Express.js
* **Database e Object Modeling**: MongoDB (tramite driver nativo e ODM Mongoose)
* **Pacchetti NPM installati e utilizzati**:
  - `express`: Per la creazione dell'infrastruttura del server web e la gestione delle rotte API/statiche.
  - `mongoose`: Per la modellazione dei dati, la definizione degli schemi (Item, Visita, User) e l'interazione con MongoDB.
  - `cors`: Middleware utilizzato per abilitare il Cross-Origin Resource Sharing tra il backend e i frontend.
  - `jsonwebtoken`: Per la gestione dell'autenticazione accoppiata a token crittografici (JWT) e la protezione delle rotte.
  - `bcryptjs`: Per l'algoritmo di hashing sicuro delle password degli utenti in fase di registrazione e login.
  - `music-metadata`: Libreria utilizzata per effettuare il parsing dei file audio sul server ed estrarre la durata reale in secondi dei file musicali.
  - `google-tts-api`: Libreria integrata per implementare la sintesi vocale dinamica (Text-to-Speech) dei testi descrittivi con caching locale degli MP3.
  - `dotenv`: Utilizzato per caricare in modo sicuro le configurazioni e le credenziali d'ambiente.

#### Applicazione marketplace
* **Linguaggi utilizzati**: HTML5, CSS3, JavaScript Vanilla (ES6+)
* **Framework utilizzati**: Nessuno. L'applicazione client-side dedicata a desktop e gestori rispetta il vincolo hard di bando, essendo sviluppata interamente senza l'ausilio di framework reattivi spinti.
* **Librerie esterne incluse via CDN**: 
  - `Bootstrap v5.3.2`: Utilizzato come framework CSS esterno per garantire la reattività del layout (griglie, navbar, form) e l'eleganza estetica dell'interfaccia utente.
  - `Bootstrap Icons v1.11.2`: Set di icone vettoriali utilizzato per arricchire la resa visiva dei controlli di editing, filtri e liste del percorso museale.
* **Pacchetti NPM installati**: Nessuno. L'applicazione viene servita come contenuto statico direttamente dal server Express, azzerando le dipendenze software locali in produzione.

#### Applicazione navigator
* **Linguaggi utilizzati**: JavaScript (ES6+), JSX
* **Framework / Librerie di frontend**: React (v18+) con architettura basata su componenti funzionali, React Hooks e gestione dello stato globale centralizzato tramite React Context API.
* **Pacchetti NPM installati e utilizzati (Dipendenze di sviluppo e runtime)**:
  - `react`: Libreria core per la strutturazione dell'interfaccia utente tramite Virtual DOM e fornitore nativo della Context API (`createContext`) per l'azzeramento del prop-drilling.
  - `react-dom`: Per il rendering dei componenti all'interno del contesto browser dello smartphone.
  - `react-router-dom`: Utilizzato per la gestione del routing mobile-side, della cronologia di navigazione (tramite il modulo `useNavigate`) e del deep linking per caricare i percorsi delle visite via URL parametrizzati.
  - `react-bootstrap`: Sfruttato per l'integrazione nativa dei componenti grafici di Bootstrap (come i bottoni leggeri `Button` e le finestre di dialogo modali `Modal`) re-ingegnerizzati per l'ecosistema React.
  - `@fortawesome/react-fontawesome` e `@fortawesome/free-solid-svg-icons`: Kit di icone vettoriali professionali integrato come componenti React nativi per la stilizzazione delle schede di accesso del login mobile.


## Contributo individuale

La ripartizione dei compiti all'interno del team è stata strutturata seguendo un approccio funzionale e incrementale, cooperando per la convergenza delle due interfacce verso il backend comune.

#### Ester Pederzini (Matricola: 0001113727):
Si è occupata dello sviluppo della logica di backend, della programmazione integrale dell'applicazione Navigator e delle procedure di revisione e integrazione del Marketplace. Nel dettaglio ha realizzato:
* **Autenticazione e Sicurezza**: Progettazione e sviluppo del modulo di autenticazione basato su Stateful Token (JWT), scrittura dei middleware di controllo accessi e gestione dei ruoli ("requireAuth", "requireRole"), e integrazione del sistema di hashing sicuro tramite bcryptjs.
* **Sviluppo e Ottimizzazione del Backend**: Cooperazione nella scrittura della logica server-side, perfezionamento dei controller API per la gestione dei filtri asincroni, stesura delle rotte condizionali in index.js (gestione degli ambienti Gocker/Locale) e integrazione dei motori multimediali (Google TTS con caching MD5 e music-metadata).
* **Sviluppo dell'Applicazione Navigator (React)**: Programmazione dell'intero frontend mobile, implementazione dei React Hooks per la reattività dell'interfaccia, gestione dello stato globale tramite Context API, integrazione della Web Speech API per i comandi vocali e sviluppo della mappa interattiva (FloorMap.jsx).
* **Integrazione e Debugging del Marketplace**: Revisione e refactoring mirato degli script JavaScript Vanilla (dashboard.js, editor-item.js, editor-visita.js) dove necessario, al fine di garantire la corretta integrazione asincrona (Fetch API) con il database e la piena compatibilità con le strutture dati richieste dal Navigator.

#### Fiammetta Maria Ternullo (Matricola: 0001070483):
Si è occupata della progettazione iniziale del database, dello sviluppo delle componenti del backend, della struttura del Marketplace e della cura della componente visiva. Nel dettaglio ha realizzato:
* **Modellazione dei Dati**: Stesura iniziale e configurazione degli schemi Mongoose (Item.js, User.js, Visita.js) sul database MongoDB per la strutturazione dei record di base relativi a utenti, item e visite.
* **Sviluppo e Configurazione Backend**: Scrittura e implementazione iniziale della componente server-side, predisposizione dei file core e delle route per l'interazione nativa tra il server Express e il database client.
* **Prototipazione e UI/UX del Marketplace**: Sviluppo della struttura fondamentale dei file dell'interfaccia desktop (index.html, dashboard.html, editor-item.html, editor-visita.html).
* **UI/UX Design e Stile**: Scrittura e gestione dei fogli di stile CSS personalizzati (style.css e interfacce del Navigator) e integrazione delle classi reattive di Bootstrap per garantire l'uniformità visiva delle maschere su desktop e smartphone.
* **Manutenzione del Database**: Supporto incrementale nella modifica degli schemi di ripiego e nel popolamento dei record in base all'evoluzione delle specifiche durante il ciclo di sviluppo.

#### Condiviso (Sviluppo di Gruppo):
* Stesura del file di configurazione generica "config.json" associato al Museo Egizio di Torino.
* Scrittura e ottimizzazione dello script di seeding e arricchimento dinamico delle relazioni del database (scripts/mongo.js).
* Configurazione dell'ambiente di produzione all'interno dei container Docker sulle macchine del dipartimento.

#### LLM: 
L'utilizzo dei modelli di intelligenza artificiale è stato strutturato come assistente alla programmazione e strumento di consultazione avanzata (AI Co-Pilot) per supportare il team durante il ciclo di sviluppo del progetto. L'apporto delle LLM si è concentrato sulle seguenti attività:
* **Generazione del Dataset di Test**: Supporto nella creazione e nel riscontro del file JSON "seed_data.json" per popolare il database MongoDB con testi e metadati strutturati per i vari livelli di difficoltà, simulando un ambiente museale reale.
* **Ispezione degli Errori e Debugging**: Consultazione per l'analisi dei messaggi di errore (stack trace) restituiti dal server Node.js o dalle eccezioni di rendering dei frontend (sia Marketplace sia Navigator) durante le fasi di sviluppo e integrazione delle API, velocizzando l'individuazione di refusi sintattici.
* **Review della Sintassi**: Supporto nella verifica della corretta impostazione delle chiamate Fetch API asincrone e nella formattazione dei parametri Unix per il deploy dei container Docker.


## Descrizione dell'organizzazione logica del progetto e delle feature più rilevanti

Il progetto ArtAround è stato sviluppato seguendo principi di modularità 
e flessibilità per rispondere alle esigenze concrete del bando:

1. Clonazione delle visite per la tutela dei dati:
Quando un utente adotta o acquista una visita dal Marketplace, il sistema 
gli consente di personalizzarla. Tuttavia, per garantire l'integrità dei 
dati originali e non alterare il percorso pubblico creato dall'autore 
(che potrebbe essere usato da altri visitatori), il sistema non modifica 
mai la visita originale. Al contrario, genera in automatico una copia 
privata e indipendente associata al profilo dell'utente adottante. Questa 
scelta garantisce all'autore il controllo totale sulla propria opera e 
permette al visitatore di modificare liberamente il proprio itinerario 
(cambiando l'ordine o rimuovendo tappe) senza alcuna conseguenza sugli 
altri utenti del catalogo.

2. Testing della copertura audio e sistema di riproduzione fail-safe:
Per verificare a fondo la stabilità dell'applicazione in ogni scenario, 
il database è stato popolato combinando intenzionalmente due casistiche: 
una parte delle opere dispone di tracce audio pre-registrate ufficiali, 
mentre un'altra parte ne è priva. Questa configurazione asimmetrica 
serve a dimostrare l'efficacia del doppio livello di riproduzione: 
se per un'opera non è presente un file audio pronto sul server, 
l'applicazione attiva all'istante la sintesi vocale (Text-to-Speech) 
nativa sul testo scritto della spiegazione, garantendo che il visitatore 
possa ascoltare la guida in ogni circostanza.

3. Gestione delle coordinate e visualizzazione dinamica dei piani:
Si suppone che sia l'istituzione museale a popolare inizialmente il database 
inserendo le opere principali con le rispettive coordinate 
spaziali fisse ("mappa_x", "mappa_y"). Tutti gli item e le varianti creati 
successivamente dagli utenti ereditano in automatico queste coordinate 
dall'opera di riferimento. Quando il visitatore si sposta tra le tappe, 
l'applicazione riconosce il piano associato all'opera attiva e adatta 
dinamicamente lo sfondo della planimetria, mostrando l'indicatore sul punto 
esatto senza rischiare disallineamenti grafici tra i diversi smartphone.

4. Visibilità condizionale e gestione della libreria sul Navigator:
Per semplificare l'esperienza d'uso sul Navigator, l'accesso ai percorsi 
segue regole rigide di visibilità condizionale basate sull'autenticazione:
* Utenti non loggati (Ospiti): Possono visualizzare ed eseguire soltanto 
  le visite che risultano pubbliche e completamente gratuite sul Marketplace.
* Utenti loggati (Autori o Visitatori): Effettuando l'accesso, sbloccano 
  la sezione personale "Le mie Visite". In questa area riservata vengono mostrati, 
  oltre ai percorsi pubblici gratuiti, tutti i percorsi privati creati 
  personalmente dall'utente e l'elenco completo delle visite ufficiali 
  o della community precedentemente acquistate o adottate sul Marketplace.













