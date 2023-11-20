import YakAvatar from "../components/YakAvatar/YakAvatar";
import ModeSelect from "../components/ModeSelect/ModeSelect"
import WebRTCSTT from "../components/WebRTCSTT/WebRTCSTT"
import StreamingTextCanvas from "../components/StreamingTextCanvas/StreamingTextCanvas";
import LLMInterface from "../components/LLMInterface/LLMInterface";

import { useState, useContext } from "react";
import { AppContext } from "../api/services/AppContext";

const Home = () => {

    const [convertedSpeechText, setConvertedSpeechText] = useState('');
    const [streamingResponseText, setStreamingResponseText] = useState('');
    const {tempSttToken, sessionID} = useContext(AppContext);
    
    const handleConvertedSpeech = async (text)  => {
        setConvertedSpeechText(text);
        console.log(`text converted ${text}`)
    };

    const handleChunkAvailable = async (chunk) => {
        setStreamingResponseText(chunk); //Text should be accumulated or not in the component.
        console.log(`streaming chunk ${chunk}`)
    }
    
    const handleStreamDone = () => {
        console.log('Stream done');
    }

    return (
        <div className="home">
            <p>Session ID: {sessionID}</p>
            <WebRTCSTT onTextConverted={handleConvertedSpeech} token = {tempSttToken}/>
            <StreamingTextCanvas text={convertedSpeechText} accumulate = { false } />
            <LLMInterface session_id = {sessionID} prompt={convertedSpeechText} onChunkAvailable={handleChunkAvailable}  onDone={handleStreamDone} />
            <div className="avatar-panel" >
                <YakAvatar />
            </div>
            <div className = 'LLMResponse'>
                <StreamingTextCanvas text = {streamingResponseText} accumulate = { true } />
            </div>
            <div className='home-mode-buttons'>
                < ModeSelect />
            </div>
        </div>
    )
}

export default Home;
