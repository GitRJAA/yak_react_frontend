# Yakwith.ai Front-End


A React.js UI for voice/speech interaction with Large Language Models (LLMS) accessed through the yakwith.ai API 
[yakwith.ai API](https://github.com/mattma1970/yak_react_frontend).

Voice interaction ( Speech-To-Text ) is currently provided by Assembly.ai which uses websockets to connect to and stream audio to the realtime transciption endpoint in chunks of 250ms of audio. Assembly.ai. This is a paid service and you'll need to set up an account to make use of it.

The app runs in the browser and in order for the browser to access the camera (used for ingesting) and the speaker, the UI needs to served over a secure connection. There are number a number ways this can be done, but I found that using cloudflare and nginx proxy manager to be a good solution that also allows the app to be easily shared. [cloudflare, nginx](https://www.reddit.com/r/selfhosted/comments/icwvox/super_simple_cloudflare_and_nginx_proxy_manager/). You can use free Let's Encrypt certificates so there is no need to muddle through with self-signed certs.

### Environment variables

```
Add these to the .env file located at the same level as you /src folder:

REACT_APP_LLM_ENDPOINT =  https://..yourdomain..     #your api server
REACT_APP_LISTENING_ICON = smiles.png      #image to display when listenting. Must be located in the src/asset folder
REACT_APP_NOT_LISTENING_ICON = smiles_with_headphones.png      #... when not listening.
REACT_APP_MODE = dev        #setting to dev will prevent it from trying to connect to your paid speech to text service.
REACT_APP_MAX_CAMERA_PIXEL_WIDTH = 1024  #pixel width of camera, aspect ratio is preserved automatically.

You'll also need to create a .env.local filed

REACT_APP_CLIENT_AUTHORIZATION_KEY = inpracticethiswillbesomecryptostuff #this is used for development purposes. 
REACT_APP_TEMP_TOKEN_PATH = get_temp_token  #the endpoint used to get a temporary authentication token for the speech-to-text service (paid).

```

### Running it.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser ( if your not using your own URL)


