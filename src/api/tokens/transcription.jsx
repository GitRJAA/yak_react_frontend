export const GET = async (req, res) => {
  console.log('token',process.env.REACT_APP_ASSEMBLY_AI_API)
    const response = await fetch("https://api.assemblyai.com/v2/realtime/token", {
      method: "POST",
      body: JSON.stringify({ expires_in: 3600 }),
      headers: {
        Authorization: process.env.REACT_APP_ASSEMBLY_AI_API,
        "Content-Type": "application/json",
      },
    });
    const token = await response.json();
    console.log(token);
    return res.json(token);
  };
