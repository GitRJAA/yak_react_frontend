/*
A context to share state from STT and TTS and various timed lifecyle events. 
In particular, the varisous stages of idle that will trigger certain animations in the Avatar.
@mtman
*/

import { createContext, useContext, useRef} from "react";

const AvatarContext = createContext(); 

export const AvatarProvider = ({children}) => {

    const statusEnum = {
        IDLE: 'Idle',
        LISTENING: 'Listening',
        SPEAKING: 'Speaking'
    }

    //const [avatarStatus, setAvatarStatus] = useState("");  //Lifecylce of Avatar e.g. idle, start talking, has started hearing input from the customer etc
    //USe these getters and setters for type safety.
    const avatarStatusRef = useRef("");
    const setAvatarStatus = (newStatus) =>{
        if (Object.values(statusEnum).includes(newStatus)){
            avatarStatusRef.current = newStatus;
            console.log(`Status change in context => ${newStatus}`)
        } else {
            console.log(`Error: ${newStatus} is not value statusEnum`);
        }
    }

    return (
        <AvatarContext.Provider
            value = {{
                avatarStatusRef,
                setAvatarStatus,               
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
