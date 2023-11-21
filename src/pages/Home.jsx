import YakAvatar from "../components/YakAvatar/YakAvatar";
import ModeSelect from "../components/ModeSelect/ModeSelect"
import WebRTCSTT from "../components/WebRTCSTT/WebRTCSTT"
import StreamingTextCanvas from "../components/StreamingTextCanvas/StreamingTextCanvas";
import LLMInterface from "../components/LLMInterface/LLMInterface";

import { useState, useContext } from "react";
import { AppContext } from "../api/services/AppContext";

import './allpages.css'

const Home = () => {

    const {sessionID, tempSttToken } = useContext(AppContext);
    const [convertedSpeechText, setConvertedSpeechText] = useState('');
    const [streamText, setStreamText] = useState('');

    const handleConvertedSpeech = async (text)  => {
        setConvertedSpeechText(text);
        setStreamText('');
        console.log(`text converted ${text}`)
    };

    const handleChunkAvailable =  (chunk) => {
        setStreamText(streamText => streamText + chunk);
    }
    
    const handleStreamDone = () => {
        console.log('Stream done');
    }

    return (
    <div className="home allpages">
        <p>Session ID: {sessionID}</p>
        <WebRTCSTT onSpeechConverted={handleConvertedSpeech} token = {tempSttToken}/>
        <StreamingTextCanvas text={convertedSpeechText} height="2" label="you"/>
        <LLMInterface session_id = {sessionID} prompt={convertedSpeechText} onChunkAvailable={handleChunkAvailable}  onDone={handleStreamDone} />
        <div className="avatar-panel" >
            <YakAvatar />
        </div>
        <StreamingTextCanvas text = {streamText} height="10" label="me"/>
        <div className='home-mode-buttons'>
            < ModeSelect />
        </div>
    </div>
    )
}

export default Home;