import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Menus from './pages/Menus';
import Settings from './pages/Settings';
import Avatars from './pages/Avatars';
import NavMenu from './components/NavMenu/NavMenu';
import AppContext from './api/services/AppContext'

import { appStartUp } from './api/services/AppStartup';


function App() {

  const [tempSttToken, setTempSttToken] =  useState('');
  const [sessionID, setSessionID] = useState('');

  useEffect(()=>{ 
    // Create the agent when the app first starts up. Returns a session_id that is used to track the agent on the server side.
    console.log('Initializing App.')
    console.log('Create agent, get session_id, get stt temp token.')
    if (sessionID===''){            
        appStartUp(sessionID)
        .then( response => {
          debugger;
          const {session_id, temp_stt_token } = response;
          setSessionID(session_id);
          setTempSttToken(temp_stt_token);
          });
    }
    console.log(`session_id: ${sessionID}`);
    console.log(`temp STT token:${tempSttToken}`)
    }, []);

  return (

      <BrowserRouter>
        <header>
          <NavMenu logoName='Twist Cafe'/>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="menus" element={<Menus />} />
            <Route path="avatars" element={<Avatars />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </BrowserRouter>


  )
}

export default App;
