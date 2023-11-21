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

import { useEffect, useState } from 'react'


const LLMInterface = ({ session_id, prompt, onChunkAvailable, onDone }) => {
   
    const sendPrompt = async ( processed_prompt ) => {
        let response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/chat_with_agent`,{
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

    const consumeStream = async (streamReader) => {
        try {
                let looping = true;
                const decoder = new TextDecoder(); //for binary str. Not sure if needed.

                while (looping) {
                    const { value, done } = await streamReader.read();
                    if (done){
                        const finalChunk = decoder.decode(value) + '\n';
                        onChunkAvailable(finalChunk)
                        break;
                    }                
                    const returnChunk = decoder.decode(value,{stream: true});
                    onChunkAvailable(returnChunk)
                    console.log(returnChunk)
                }
        } catch (err) {
            console.log(err)
        }
        finally {
            onDone();
        }
    }

    useEffect(() => {
        if (typeof prompt !== 'undefined' && prompt!==''){
            const getResponse = async (prompt) => {
                try {
                    
                    const stream = await sendPrompt(prompt);
                    const streamReader = stream.body.getReader();
                    await consumeStream(streamReader);
                } 
                catch (e) {
                    console.log(e);
                }
            }
            getResponse(prompt);
        }
    }, [prompt]);
}

export default LLMInterface;
