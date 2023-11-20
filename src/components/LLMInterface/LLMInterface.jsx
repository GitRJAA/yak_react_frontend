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
    
    const [responseAccumulator, setResponseAccumulator] = useState('')

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

        if (response.ok || !response.body ) {
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
                        break;
                    }                
                const returnChunk = decoder.decoder(value,{stream: true});
                onChunkAvailable(returnChunk)
                setResponseAccumulator((responseAccumulator)=>responseAccumulator+returnChunk);
            }
        } catch (err) {
            console.log(err)
        }
        finally {
            onDone();
            setResponseAccumulator('')
        }
    }

    useEffect(() => {
        sendPrompt()
        .then( stream => {
            const streamReader = stream.body.getReader();
            consumeStream(streamReader);
        })
    }, [prompt]);
}

export default LLMInterface;
