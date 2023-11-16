import React from 'react';
import { useState, useEffect } from "react";

const StreamingText = ({text}) => {

    const [streamingText, setStreamingText] = useState('waiting..')
    useEffect(() => {
         if (text!==''){
            setStreamingText(text)
        }
    }, [text]);
    
    return (
        <div>
            <p>{streamingText}</p>
        </div>
        );  

};
export default StreamingText;