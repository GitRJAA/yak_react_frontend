export const getLastResponse = async (session_id) =>{
    // Get the last model response in the agents conversation memory.
    let last_response = '';
    const URL = `${process.env.REACT_APP_LLM_ENDPOINT}/get_last_response/${session_id}`;
    
    try {
        const response = await fetch(URL); //GET
        const ret = await response.json(); 
        last_response = ret['last'];
    }
    catch(e){
        console.log(`Error getting last message for ${session_id}`);
    };
    return last_response;
    }
