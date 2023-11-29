import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import TextChat from './pages/TxtChat';
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
      // To avoid reinitializing a session, sessionID is checked 
      console.log('Initializing App.')
      console.log('Begin: create agent, get session_id, get stt temp token.')

      /* fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/test_connection`,{
        method: 'GET',
        header: {'Content-Type': 'application/json'}
      })
      .then(response => {
        console.log('test connection ok',response);
      })
      .catch( (error) => {
        console.error('test connection err',error);
      } ) */

      const response = appStartUp(sessionID);
      if (response!==null){
        const {session_id, temp_token } = response;
        setSessionID(session_id);
        setTempSttToken(temp_token);
      } else {
        console.log('Warning: session can only be initialized once');
      }
    }
    , []);

    useEffect(()=>{
      console.log('sessionid',{sessionID});
      console.log('temp_token',{tempSttToken});
    },[sessionID, tempSttToken]);

  return (
      <AppContext.Provider value = { {sessionID, tempSttToken}} >
      <BrowserRouter>
        <header>
          <NavMenu logoName='Twist Cafe'/>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="textchat" element = {<TextChat />} />
            <Route path="menus" element={<Menus />} />
            <Route path="avatars" element={<Avatars />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </BrowserRouter>
      </AppContext.Provider>

  )
}

export default App;
