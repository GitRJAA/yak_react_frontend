/* All functions to execute when App is first loaded */

import AgentConfig from '../../data/Agent/DefaultConfig.json'
import createAgent from './Agent'

const createAgentSession = async (config) => {
    // Call api to create an agent based on the passed in config.
    //  Args: 
    //   config: json, see '../data/Agent/DefaultConfig.json'
    //   returns {'session_id': ... } 
    
    let session_id = null;
    let session_error = null;
    try {
       const session_data = await createAgent(config) //returns json {'session_id': str}
        console.log(session_data)    
        session_id = session_data['session_id']
    }
    catch(e){
        session_error = e;
        console.log(e);
    }
    return {session_id, session_error};
}

const getTempSttToken = async (service_name, client_authoriztion_token) => {
    let temp_stt_token = null;
    let token_error = null;

    try {
        const tokenResponse = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/get_temp_token`, {
        method: 'POST',
        header: {'Content-Type': 'application/json'},
        body: JSON.stringify(
                {
                    "service_name": service_name,
                    "client_authorization_key": client_authoriztion_token
                }
            )
        })
        const response_json = await tokenResponse.json();
        temp_stt_token = response_json['temp_token'];       
    } catch (e) {
        console.log(e);
        token_error = e;
    }

    return {temp_token: temp_stt_token, token_err: token_error};
}

export const appStartUp = async (sessionID) => {
    if (sessionID===''){
    // 1. Create an agent
    debugger;
    const {session_id, session_error} = await createAgentSession(AgentConfig);

    // 2. Get STT temporary token
    const { temp_stt_token, token_error } = await getTempSttToken('assemblyai_temp_token','inpracticethiswillbesomecryptostuff')

    // 3. Get TTS temporary token
    if (session_error === null && token_error === null){
            return {session_id, temp_stt_token}
        } 
    } else {
        console.log('App was reloaded but session_id and service tokens not changed');
        return;
    }
}