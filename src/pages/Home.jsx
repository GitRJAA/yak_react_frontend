import YakAvatar from "../components/YakAvatar/YakAvatar";
import ModeSelect from "../components/ModeSelect/ModeSelect"
import WebRTCSTT from "../components/WebRTCSTT/WebRTCSTT"
import StreamingText from "../components/StreamingText/StreamingText";
import { useEffect, useState } from "react";

import AgentConfig from '../data/Agent/DefaultConfig.json'
import createAgent from '../components/Agent/Agent'

const Home = () => {

    const [sessionID, setSessionID] = useState('');
    const [convertedText, setConvertedText] = useState('');
    const [streamingText, setStreamingText] = useState('');
    
    const send_to_LLM = async (text) =>{
        return `Converted_text:${text}`
    }

    const handleTextConverted = async (text)  => {
        setConvertedText(text);
        console.log(`text converted ${text}`)
        const streamingResponse = await send_to_LLM(text); 
        console.log(streamingResponse)
        setStreamingText(streamingResponse) //deal with asyn nature of the text. Need to have it render as well. 
    };
    
    useEffect(()=>{ 
        // Create the agent when the app first starts up. Returns a session_id that is used to track the agent on the server side.
        // Note: in development components are loaded and unloaded twice to show up bugs caused by component side effects.
        console.log('Creating agent')
        if (sessionID===''){
                createAgent(AgentConfig,false,sessionID).then( 
                    (session_meta_data) => { 
                                console.log(session_meta_data)
                                setSessionID(session_meta_data.session_id)
                    }
                ).catch((e)=> {
                        console.log(e)
                    });
            }
        console.log({sessionID})
    }, [])

    return (
        <div className="home">
            <p>Session ID: {sessionID}</p>
            <WebRTCSTT onTextConverted={handleTextConverted}/>
             <StreamingText text={streamingText} />
            <div className="avatar-panel" >
                <YakAvatar />
            </div>
            <div className='home-mode-buttons'>
                < ModeSelect />
            </div>
        </div>
    )
}

export default Home;
