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

import { useEffect, useState, useRef } from 'react'

const LLMTalkInterface = ({ session_id, prompt, onDone }) => {

  // constants for action endpoints.
  const ActionEndPoint = { 
        SAY: 'get_agent_to_say',
        CONVERSATION: 'talk_with_agent'
      }
   
  const audioContext = useRef(null);
  const sourceQueue = useRef([]);
  const isStreamPlaying = useRef(false);
  const sourceToPlay = useRef(null); //current buffer being played.

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

     const processAudioChunk = async (chunk) => {
        if (audioContext) {
            const buffer = await audioContext.current.decodeAudioData(chunk.buffer);
            const source = audioContext.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.current.destination);

            // Add source to queue
            sourceQueue.current.push(source);

            if (!isStreamPlaying.current) { 
                playNextChunk();
            }
        }
    };

      const playNextChunk = () => {
          if (sourceQueue.current.length > 0) {
              sourceToPlay.current = sourceQueue.current.shift();
              sourceToPlay.current.start(0);
              sourceToPlay.current.onended = () => {
                  playNextChunk();
              };
              isStreamPlaying.current = true;
          } else {
              isStreamPlaying.current = false;
          }
      };
 
    useEffect(() => {
        if (typeof prompt !== 'undefined' && prompt!==''){
            // Initialize Audio Context only once.
            if (!audioContext.current){
              audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Fetch Audio Data
            const fetchData = async () => {
                let response = null;

                if (!isStreamPlaying.current){
                  response = await sendPrompt(prompt, ActionEndPoint.CONVERSATION);
                } else {
                  //Allow yak to be interrupted when its speaking.
                  isStreamPlaying.current = false;
                  response = await sendPrompt('Sorry, can you say that again.', ActionEndPoint.SAY);
                  sourceToPlay.current.stop();
                  sourceQueue.current = [];
                }

                const reader = response.body.getReader();  //response.body exposes a ReadableStream

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    //queue and play the chunk.
                    processAudioChunk(value);
                }
            };
          fetchData()
        }
    }, [prompt]);


}

export default LLMTalkInterface;
