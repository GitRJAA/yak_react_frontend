/* All functions to execute when App is first loaded */

import AgentConfig from '../../data/Agent/DefaultConfig.json'
import createAgent from './Agent'

const fetch = require('sync-fetch')

const createAgentSession = (config) => {
    // Call api to create an agent based on the passed in config.
    //  Args: 
    //   config: json, see '../data/Agent/DefaultConfig.json'
    //   returns {'session_id': ... } 
    
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

const getTempSttToken =  (service_name, client_authoriztion_token) => {
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

export const appStartUp =  (sessionID) => {
    // 1. Create an agent
    console.log(AgentConfig)
    const session_response =  createAgentSession(AgentConfig);
    const { session_id, session_error } = session_response;
    if (session_error !== null){
        throw session_response.session_error;
    }

    // 2. Get STT temporary token
    const temp_token_response =  getTempSttToken('assemblyai_temp_token','inpracticethiswillbesomecryptostuff')
    const { temp_token, token_error } = temp_token_response;
    if (token_error!== null) {
        throw token_error;
    }

    const business_uid = "dummy_business_uid";

    return {session_id, temp_token, business_uid}
}
