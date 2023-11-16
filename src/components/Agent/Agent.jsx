//Deal with agent lifecycle.

const createAgent = async (agent_config) => {

    var session_meta_data = null ;
    const response = await fetch( `${process.env.REACT_APP_LLM_ENDPOINT}/create_agent_session`, {
        method: "POST",
        body: JSON.stringify(agent_config),
        headers: { "Content-Type":"application/json"}
    });

    console.log(response)
    if (response.ok) {
        session_meta_data = await response.json();
    }
    else {
        throw new Error(`Failed to create Agent with error: ${response.statusText}`)
    }

    return session_meta_data;
};

export default createAgent;