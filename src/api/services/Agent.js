//Deal with agent lifecycle.
const fetch = require('sync-fetch');

const createAgent = (agent_config) => {

    var session_meta_data = null ;

    const response =  fetch( `${process.env.REACT_APP_LLM_ENDPOINT}/create_agent_session`, {
        method: "POST",
        body: JSON.stringify(agent_config),
        headers: { "Content-Type":"application/json"}
    });

    if (response.ok) {
        session_meta_data =  response.json();
    }
    else {
        throw new Error(`Failed to create Agent with error: ${response.statusText}`)
    }
    //console.log('session_meta',session_meta_data)
    return session_meta_data;
};

export default createAgent;