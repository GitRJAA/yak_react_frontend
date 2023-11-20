import React from 'react';
import { useState, useEffect } from "react";

const StreamingTextCanvas = ({text, accumulate=false}) => {

    const [streamingText, setStreamingText] = useState('waiting..')
    useEffect(() => {
         if (text!==''){
            if (accumulate) {
                setStreamingText( (text) => streamingText+text);
            }
            else {
            setStreamingText(text);
          }
        }
    }, [text]);
    
    return (
        <div>
            <p>{streamingText}</p>
        </div>
        );  

};
export default StreamingTextCanvas;