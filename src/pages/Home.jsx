import YakAvatar from "../components/YakAvatar/YakAvatar";
import ModeSelect from "../components/ModeSelect/ModeSelect"
import WebRTCSTT from "../components/WebRTCSTT/WebRTCSTT"
import StreamingTextCanvas from "../components/StreamingTextCanvas/StreamingTextCanvas";

import LLMInterface from "../components/LLMInterface/LLMInterface";
import LLMTalkInterface from "../components/LLMTalkInterface/LLMTalkInterface";

import { useState, useContext } from "react";
import { AppContext } from "../api/services/AppContext";
import { getLastResponse } from "../api/services/Utilities";

import './allpages.css'

const Home = () => {

    const {sessionID, tempSttToken } = useContext(AppContext);
    const [convertedSpeechText, setConvertedSpeechText] = useState('');
    const [streamingConvertedText, setStreamingConvertedText] = useState('');
    const [responseText, setResponseText] = useState('');

    const [avatarIcon, setAvatarIcon] = useState(process.env.REACT_APP_NOT_LISTENING_ICON);

    const [convoMode, setConvoMode ] = useState('talk')

    const handleConvertedSpeech = async (text)  => {
        /* Show text as its converted, before its finalized. Assembly AI sends all text, not incremental text. */
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
    
    const handleAudioStreamDone = async () => {
        // Get the full response and paste it into the respons box.
        getLastResponse(sessionID)
        .then (msg_txt => {
            setResponseText(responseText => responseText +'\n\n'+msg_txt);
        })
        .catch ((error)=> console.log(error))

        console.log('Stream done');

    }

    const handleRecorderStatusChange = (status) => {
        if (status === 'paused' || status ==='stopped'){
            setAvatarIcon(process.env.REACT_APP_NOT_LISTENING_ICON)
        } else {
            setAvatarIcon(process.env.REACT_APP_LISTENING_ICON)
        }
    }

    const handleConvoModeChange = (mode) => {
        setConvoMode(mode)
    }

    return (
    <div className="home allpages">
        <p>Session ID: {sessionID}</p>
        <WebRTCSTT onSpeechConverted={handleConvertedSpeech} onConversionDone={handleConversionDone} onRecorderStatusChange={handleRecorderStatusChange} token = {tempSttToken}/>
        <StreamingTextCanvas text={streamingConvertedText} height="2" label="you"/>
        {/* <LLMInterface session_id = {sessionID} prompt={convertedSpeechText} mode={convoMode} onChunkAvailable={handleChunkAvailable}  onDone={handleStreamDone} /> */}

        <LLMTalkInterface session_id={sessionID} prompt={convertedSpeechText} onDone={handleAudioStreamDone} />
        <div className="avatar-panel" >
            <YakAvatar icon={avatarIcon} />
        </div>
        <StreamingTextCanvas text = {responseText} height="10" label="me"/>
        <div className='home-mode-buttons'>
            < ModeSelect onModeChange={handleConvoModeChange} />
        </div>
    </div>
    )
}

export default Home;