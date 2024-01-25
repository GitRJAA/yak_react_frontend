/*
A context to share state from STT and TTS and various timed lifecyle events. 
In particular, the varisous stages of idle that will trigger certain animations in the Avatar.
@mtman
*/

import { createContext, useContext, useRef, useEffect, useState } from "react";

const AvatarContext = createContext(); 

export const AvatarProvider = ({children}) => {

    const [avatarStatus, setAvatarStatus] = useState("");  //Lifecylce of Avatar e.g. idle, start talking, has started hearing input from the customer etc

    const statusEnum = {
        IDLE: 'Idle',
        LISTENING: 'Listening',
        SPEAKING: 'Speaking'
    }


    const getAvatarStatusNonRerender = () => {
        // A getter for the status that avoids re-rendering all child components.
        return avatarStatus;
    }

    return (
        <AvatarContext.Provider
            value = {{
                avatarStatus,
                setAvatarStatus,
                getAvatarStatusNonRerender,
                statusEnum,
            }}
            >
                {children}
        </AvatarContext.Provider>
    )
};

export const useAvatarContext = () =>{
    // Check that when this hook in invoked, its from inside an Avatar Context.
    const context = useContext(AvatarContext);

    if (!context) {
        throw new Error('Avatar must be used inside an Avatar Context.')
    }
    return context;
};
