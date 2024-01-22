import { Loader } from "@react-three/drei";
import { Suspense } from "react";

import WebRTCSTT from "../components/WebRTCSTT/WebRTCSTT"
import MenuIDSelector from "../components/MenuIDSelector/MenuIDSelector";
import StreamingTextCanvas from "../components/Canvas/StreamingTextCanvas.jsx";

import LLMTalkInterface from "../components/LLMTalkInterface/LLMTalkInterface";


import { createAgentSession } from "../api/services/AppStartup.js";

import { useState, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";

import { AppContext } from "../api/services/AppContext";
import { getLastResponse } from "../api/services/Utilities";

import { NULL_MENU } from "../data/GlobalConstants.jsx";

import './allpages.css'
import '../components/LLMTalkInterface/YakAvatar.css'


const Home = () => {

    /* 
        Landing page in app. Controls creation of agent and is a container for Speech-to-text, LLM interaction and Text to Speech connections
    */


    const {sessionID, tempSttToken, businessUID } = useContext(AppContext);
    const [convertedSpeechText, setConvertedSpeechText] = useState('');
    const [streamingConvertedText, setStreamingConvertedText] = useState('');
    const [responseText, setResponseText] = useState('');

    const agentHasBeenCreated = useRef(false);  // Current not used. Intended use if to cause existing agent to be updated rather than overwritten.
    const autoStart = useRef(false);

    const location = useLocation();
    const {override_menu_id} = location.state ||  {};

    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = async () => {
      setIsFullScreen(!isFullScreen);
    };


    if (override_menu_id){
        // If override_menu_id is set, then we were sent here from the 'run' command on the text editor page
        //  and we should start the vociebot immediately instead of waiting for the button press.
        autoStart.current = true;
    }

    /* 
        Audio and Text handling 
    */

    const handleConvertedSpeech = async (text)  => {
        // Show text as its converted, before its finalized. Assembly AI sends all text, not incremental text.
        if (text!==''){
            setStreamingConvertedText(text);
        }
    };

    const handleConversionDone = async (text) =>{
        setConvertedSpeechText(text);
        setStreamingConvertedText(text => text+'\n');
        //setResponseText('');
        console.log(`text converted ${text}`)
    }
    const handleRecorderStatusChange = async () => {

    }
    
    const handleAudioStreamDone = async () => {
        // Get the full response and paste it into the respons box.
        getLastResponse(sessionID)
        .then (msg_txt => {
            setResponseText(responseText => responseText +'\n\n'+msg_txt);
        })
        .catch ((error)=> console.log(error))

        console.log('Stream done');
    }

    /*
        Agent instantiation
    */

    const createAgentConfig = (menuID) =>{
        // See backend SessionStart(BaseModel) class
        return {
          'session_id': sessionID,
          'business_uid': businessUID,
          'menu_id': menuID,
          'avatar_personality': ' ',
          'stream': true      
        }
      }
  
      const createAgent = (menuID) => {
        
          //create modal popup because its going to take a while to set up agent and make websocket connection.
  
          //create yak_agent with the currently selected menu.
          if (menuID !== NULL_MENU) {
            console.log(`Create agent for businessUID ${businessUID} menuID ${menuID}`);
            const agentConfig = createAgentConfig(menuID);
            const {session_error} = createAgentSession(agentConfig); //This will overwrite the current agent and restart the conversation. This is reasonable as a new menu warrants a new start.
            if (session_error!==null) {
                agentHasBeenCreated.current = true;
            }
          }          
      }

    const handleMenuSelectionChanged = (menuID) => {
        createAgent(menuID);
    }

    return (
    <div className="home allpages">
        <Loader />
        <Suspense>
            <div className={`${isFullScreen ? 'hidden-menu-controls': 'menu-controls'}`}>
                <WebRTCSTT onSpeechConverted = {handleConvertedSpeech} 
                            onConversionDone = {handleConversionDone}
                            onRecorderStatusChange = {handleRecorderStatusChange} 
                            token = {tempSttToken}
                            autoStart = {autoStart.current} />
                <MenuIDSelector onSelectedMenuID = {handleMenuSelectionChanged} defaultMenuID = {override_menu_id} />
            </div>
            <StreamingTextCanvas text={streamingConvertedText} height="2" label="you" zIndex='1005'/>
            {/* <LLMInterface session_id = {sessionID} prompt={convertedSpeechText} onChunkAvailable={handleConvertedSpeech}  onDone={handleAudioStreamDone} /> */}
            <div className={`${isFullScreen ? 'avatar-full-screen' :'avatar-passthrough-container margin5topbottom'}`}>
                <LLMTalkInterface session_id={sessionID} 
                                prompt={convertedSpeechText} 
                                onToggleFullscreen={toggleFullScreen} 
                                isFullscreen={isFullScreen} 
                                onDone={handleAudioStreamDone} />
            </div>
            <StreamingTextCanvas text = {responseText} height="10" label="me" zIndex='0'/>
        </Suspense>
    </div>
    )
}

export default Home;