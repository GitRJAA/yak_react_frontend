/* Component to handle sending and recieving from streaming LLM endpoint. Should alos be able to tolerate non-streamed data.
Should accept a prompt from home.jsx, post to LLM endpoint and get streaming text back. Each time a new chunk is recieved it should lift that data up to the parent. 
https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams

Endpoint parses schema of send data using pydantic and expects it to have 
class ApiUserMessage(BaseModel):
    """Message sent from App"""
    user_input: str
    session_id: str
    user_id: Optional[str]
*/

import { useEffect, useRef, useState } from 'react'
import Experience from './Experience.jsx';
import { ChatProvider } from "./hooks/useChat.jsx";

import TransparentCanvas from '../Canvas/TransparentCanvas.jsx';
import PassThroughVRBackground from "./PassThroughVRBackground.jsx";


const LLMTalkInterface = ({ session_id, prompt, onToggleFullscreen, isFullscreen, onDone }) => {

    // constants for action endpoints.
    const ActionEndPoint = { 
            SAY: 'get_agent_to_say',
            VOICE_ONLY: 'talk_with_agent',
            AVATAR: 'agent/talk_with_avatar'
        }
    
    const audioContext = useRef(null);  // Used to hold the webAPI audioContext reference.
 
    // A queue to hold the aduio and json/viseme data resp. IMPORTANT this must in 1-1 correspondance with the 
    // audioSourceQueue if viseme data being used. TODO There is a risk that due to errors in decoding a part
    // that these queues become misaligned. It would be better to accumulate a tuple of audio and json and push that on.
    const audioSourceQueue = useRef([]);   
    const jsonDataQueue = useRef([]);    

    const [queueHasData, setQueueHasData] = useState(false); // use to trigger rendering of the avatar component.

    const sendPrompt = async ( processed_prompt, mode ) => {
        let response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/${mode}`,{
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                {
                    'user_input': processed_prompt,
                    'session_id': session_id,
                    'user_id': null
                }
            ),
        });

        if (!response.ok || !response.body ) {
            throw response.statusText;
        }       
        return response;
    }

     const processAndQueueAudioChunk = async (chunk) => {
        // Process and queue the audio as a webAPI playable source.
        // @args: chunk: ArrayBuffer : contains the audio byte data.

        if (audioContext) {
            try {            
                //const id = Math.floor(Math.random() * 1000000);
                const buffer = await audioContext.current.decodeAudioData(chunk);
                const source = audioContext.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.current.destination);

                // Add source to queue so its played in the correct sequence.
                audioSourceQueue.current.push(source);
                //console.log('audio pushed to queue')
                if (!queueHasData) {
                    setQueueHasData(true);
                    //console.log('status of audio queue changed to HasData.')
                }
            }
            catch (err){
                console.log(`Audio Decoding error: ${err}`)
            }
        }
    };

    const processAndQueueJsonData = async (data) =>{
        // Add visemses json data to the queue.
        // @args:
        //  data: List of json string {start: float, end: float, event: int} representing start 
        //        and end time in milliseconds of the viseme event and the event id provided by 
        //        the viseme source. These events may need to be mapped to those used by the avatar model.
        
        jsonDataQueue.current.push(data);
    }
    
    const processVisemeData = (viseme_list) => {
        // Convert the data into the format required by the Avatar model. Depending on the source, 
        // this might be just translation of the viseme values or might be reformating
        
        // TODO
        return viseme_list
    }

    const base64ToArrayBuffer = (base64) => {
        // Helper function to convert base64 utf-8 string to ArrayBuffer of audio bytes.
        // TODO - not optimal for large base64 strings.
        const binaryString = window.atob(base64);
        const length = binaryString.length;
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };
    
    const processContent = async (part) => {
        //Process the different sections of the data audio/viseme(of json) data.
        if (part.includes('Content-Type: audio/mpeg')) {
            // Handle audio data
            const audioChunk = part.split('\r\n\r\n')[1];
            const arrayBuffer = base64ToArrayBuffer(audioChunk); //Convert base64encoded UTF-8 to an ArrayBuffer as required by webAPI for audio.      
            await processAndQueueAudioChunk(arrayBuffer);
        } else if (part.includes('Content-Type: application/json')) {
            // Handle viseme data.
            const metadataJSON = part.split('\r\n\r\n')[1].replace(/\r?\n.*$/,'');
            processAndQueueJsonData(metadataJSON)
            //console.log(metadataJSON);
        }
    }

    const interrupt = () => {
        // Call endpoint to interrupt speech synthesis. This stops sentance level yeilding of text to STT.
        // It does not clear the audio queue.
        const response =  fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/agent/interrupt/${session_id}`);
        return response
    }

    const cbPopQueueData = async () => {
        //Callback to get the next chunk of data for the audio/json data queues for consumption in the avatar
        //@ret: tuple( audio data, json data)
        
        if ((audioSourceQueue.current.length>0) && (jsonDataQueue.current.length>0)){
            return [audioSourceQueue.current.shift(),processVisemeData(jsonDataQueue.current.shift())];    
        } else {
            setQueueHasData(false); // Set avatar to idle model and cleanup audio.
            onDone(); // Fire the onDone callack from parent.
            return [];
        }
    }

    useEffect(() => {
        if (typeof prompt !== 'undefined' && prompt!==''){
            // Initialize Audio Context only once.
            if (!audioContext.current){
              audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const boundary = 'frame'; 

            // Fetch Audio Data
            const fetchData = async () => {
                let response = null;

                if (!queueHasData){
                  response = await sendPrompt(prompt, ActionEndPoint.AVATAR); //Streams audio and meta-data back.
                } else {
                  //Allow yak to be interrupted while its speaking.
                  setQueueHasData(false); // stop the talkinterface 
                  response = await interrupt();  // Signal to stop sending data. 
                  response = await sendPrompt('Sorry, can you say that again.', ActionEndPoint.SAY);
                  audioSourceQueue.current = []; //flush the audio queue
                  jsonDataQueue.current = []; //flush the jsondata queue (visemes)
                  onDone();
                }

                const reader = response.body.getReader();  //response.body exposes a ReadableStream
                let currentData = '';

                while (true) {
                    const { value, done } = await reader.read(); // Returns contents of streamreader as ArrayBuffer (Uint8Array) 
                    if (done) {
                        //Flush the remaining data
                        const parts = currentData.split(`--${boundary}`);
                        if (parts.length>1){
                            await processContent(parts[1])
                        }
                        break;
                    }

                    /* Convert the ArrayBuffer bytes back to string data. This string data will contains 
                        human readable strings and the audio encoded as base64 UTF-8. Its possible that 
                        the audio data is split into several 'sub-chunks' so they must be reassembled into 
                        the complete chunk before playing.

                        The Yak backend uses fastAPI StreamingResponse class to send multipartresponse data 
                        that uses 'frame' (set in boundary variable here) as a boundary marker. The 'frame' marks
                        the beginning of each part (audio or json) and NOT the tuple of parts. 
                    */
                    const chunk = new TextDecoder().decode(value); 
                    currentData += chunk;

                    while (true) {
                        //debugger;
                        const start_index = currentData.indexOf(`--${boundary}`); 
                        if (start_index>=0){
                            const end_index = currentData.indexOf(`--${boundary}`, start_index+1);
                            if (end_index>=0){
                                // The we have a pair of boundary markers so we can process the multi-part content
                                const part = currentData.slice(start_index,end_index);                      
                                // Process each part (audio or metadata)
                                //debugger;
                                await processContent(part);
                                currentData= currentData.slice(end_index); //Drop the prcessed data.
                            } else {
                                break; //keep reading and accumulating current data until we have assembled entire chunks.
                            }
                        } else {
                            break;
                        };
                      }
                }
            }
            fetchData();
        }
    }, [prompt]);

    return (
    <div className={`${isFullscreen ? 'avatar-full-screen':'yak-avatar-container'}`}>
        <ChatProvider>
               <PassThroughVRBackground onToggleFullscreen={ onToggleFullscreen} isFullscreen={isFullscreen} />
                <TransparentCanvas shadows className='avatar-canvas' style={{position: 'absolute', top:0, left:0 }} camera={{ position: [0, 0, 2], fov: 20 }}>
                    <Experience onFetchData = {cbPopQueueData} queueHasData = {queueHasData} audioContext = {audioContext} />
                </TransparentCanvas>
        </ChatProvider>
        </div> 
    );

}



export default LLMTalkInterface;


