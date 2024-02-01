/*
A context to share state from STT and TTS and various timed lifecyle events. 
In particular, the varisous stages of idle that will trigger certain animations in the Avatar.
@mtman
*/

import { createContext, useContext, useRef, useState} from "react";

const AvatarContext = createContext(); 

export const AvatarProvider = ({children}) => {
  
    // Collection of all pre-made avatars models and their animations.
    const avatarCollection = {
        AVATURNMATT: {"name":"AVATURNMATT","model":'/models/AvaturnMatt/AvaturnMattv2.glb',"animations":'/models/AvaturnMatt/AvaturnMattAnimationsv3.glb'},
        MATTSHEAD: {"name":"MATTSHEAD","model":'/models/AvaturnMatt/MattsHead.glb',"animations":'/models/AvaturnMatt/AvaturnMattAnimationsv3.glb'},
        AFROMALE: {"name":"AFROMALE","model":"/models/AfroMale/AfroMale.glb","animations":"/models/AfroMale/AfroMaleAnimationsv3.glb"},
        CARTOONMATT: {"name":"CARTOONMATT","model":"/models/Matt/Matt.glb","animations":"/models/Matt/MattAnimations.glb"}
    }
    /* useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
    useGLTF.preload("/models/animations.glb"); */
    
    const [avatarDefinition, setAvatarDefinition] = useState(avatarCollection.AVATURNMATT); 

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
                avatarDefinition
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
