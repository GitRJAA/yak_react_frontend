/* All functions to execute when App is first loaded */

import createAgent from './Agent'

const fetch = require('sync-fetch')

const createSession =  () => {
    // Get a sessionID and reserve it for future use.
    let session_id = '';
    let session_error = '';

    try{
        const response = fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/agent/reservation/`);
        if (response.ok){
            const data = response.json();
            session_id = data['session_id'];
        }
        else {
            console.error(`Error occured reservice session_id in agent_registry: ${response.statusText}`);
        }
    } 
    catch (e){
        session_error = e;
        console.log(e);
    }
    return { session_id, session_error}
}

const getTempSttToken =  (service_name, client_authoriztion_token) => {
    // Get a temporary authentication token for the speech to text service specified in the service_name.
    let temp_token = null;
    let token_error = null;

    try {
        const tokenResponse = fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/get_temp_token`, {
        method: 'POST',
        header: {'Content-Type': 'application/json'},
        body: JSON.stringify(
                {
                    "service_name": service_name,
                    "client_authorization_key": client_authoriztion_token
                }
            )
        })
        const response = tokenResponse.json();
        temp_token = response.temp_token;
    } catch (e) {
        console.log(e);
        token_error = e;
    }
    return {temp_token, token_error};
}


export const appStartUp =  () => {
    // 1. Create an agent
    //console.log(AgentConfig)
    //const session_response =  createAgentSession(AgentConfig);
    const session_response = createSession();  // Get session_id but don't create Agent. 
    const { session_id, session_error } = session_response;
    if (session_error !== null && session_error!==''){
        throw session_response.session_error;
    }

    // 2. Get STT temporary token
    const temp_token_response =  getTempSttToken('assemblyai_temp_token','inpracticethiswillbesomecryptostuff')
    const { temp_token, token_error } = temp_token_response;
    if (token_error!== null) {
        throw token_error;
    }

    const business_uid = "dummy_business_uid";  // TODO add logic to get businessUID from user login details. 

    return {session_id, temp_token, business_uid}
}

export const createAgentSession = (config) => {
    /* Call api to create an agent based on the passed in config.
       This is invoked just in time prior to starting a conversation and NOT at application startup.
      @args: 
       config: chat_api.py chat_data_classes.SessionStart(BaseModel)
                class SessionStart(BaseModel):
                    session_id: str
                    business_uid: str
                    menu_id: str
                    avatar_personality: Optional[str] 
                    stream: bool 
                    user_id: Optional[str] = None
      @returns:

    */
    let session_id = null;
    let session_error = null;
    try {
       const session_data = createAgent(config) //returns json {'session_id': str}
       session_id = session_data.session_id;
    }
    catch(e){
        session_error = e;
        console.log(e);
    }
    return {session_id, session_error};
}