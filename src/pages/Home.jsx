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
    const [avatarIcon, setAvatarIcon] = useState(process.env.REACT_APP_NOT_LISTENING_ICON);

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

    const handleRecorderStatusChange = (status) => {
        if (status === 'paused' || status ==='stopped'){
            debugger;
            setAvatarIcon(process.env.REACT_APP_NOT_LISTENING_ICON)
        } else {
            debugger;
            setAvatarIcon(process.env.REACT_APP_LISTENING_ICON)
        }
    }

    return (
    <div className="home allpages">
        <p>Session ID: {sessionID}</p>
        <WebRTCSTT onSpeechConverted={handleConvertedSpeech} onRecorderStatusChange={handleRecorderStatusChange} token = {tempSttToken}/>
        <StreamingTextCanvas text={convertedSpeechText} height="2" label="you"/>
        <LLMInterface session_id = {sessionID} prompt={convertedSpeechText} onChunkAvailable={handleChunkAvailable}  onDone={handleStreamDone} />
        <div className="avatar-panel" >
            <YakAvatar icon={avatarIcon} />
        </div>
        <StreamingTextCanvas text = {streamText} height="10" label="me"/>
        <div className='home-mode-buttons'>
            < ModeSelect />
        </div>
    </div>
    )
}

export default Home;