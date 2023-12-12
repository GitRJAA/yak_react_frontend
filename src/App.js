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
  const [businessUID, setBusinessUID] = useState('');  //Will eventually need to be set by the authorization provider.

  useEffect(()=>{ 
      // Create the agent when the app first starts up. Returns a session_id that is used to track the agent on the server side.
      // To avoid reinitializing a session, sessionID is checked 
      console.log('Initializing App.')
      console.log('Begin: create agent, get session_id, get stt temp token.')

    if (process.env.REACT_APP_MODE !== 'dev'){
      const response = appStartUp(sessionID);
      if (response!==null){
        const {session_id, temp_token, business_uid } = response;
        console.log('triplet or startup ids',response);
        setSessionID(session_id);
        setTempSttToken(temp_token);
        setBusinessUID(business_uid);
      } else {
        console.log('Warning: session can only be initialized once');
      }
    } else {
      setSessionID('dummy')
      setTempSttToken('dummy')
      setBusinessUID('dummy_business_uid')
    }
  }
  , []);

    useEffect(()=>{
      console.log('sessionid',{sessionID});
      console.log('temp_token',{tempSttToken});
      console.log('businessUID',{businessUID});
    },[sessionID, tempSttToken, businessUID]);

  return (
      <AppContext.Provider value = { {sessionID, tempSttToken, businessUID}} >
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
