# Yakwith.ai Front-End

A 3D animated Virtual Human using voice interaction with Large Language Models (LLMS) which is served through the yakwith.ai API ([API](https://github.com/mattma1970/yakwith.ai)). The animations are rendered in the browser without the need for any plug-ins or hefty GPU's. The goal is to create  platform agnost virtual human front end for an LLM agent back-end.

Check out this example to see some early results. This example is running using locally hosted,7B parameter LLM (OpenOrca) on a RTX 4090.
[Example](https://www.youtube.com/watch?v=pVYCfeJW7_A)

The avatar created using Avaturn.me.  and the voice synthesis is using Azure speech SDK from their cognitive services. Voice interaction ( Speech-To-Text ) is currently provided by Assembly.ai which uses websockets to connect to and stream audio to the realtime transciption endpoint in chunks of 250ms of audio. Assembly.ai. This is a paid service and you'll need to set up an account to make use of it.

The app runs in the browser and in order for the browser to access the camera (used for ingesting) and the speaker, the UI needs to served over a secure connection (https). There are number a number ways this can be done, but I found that using cloudflare and nginx proxy manager to be a good solution that also allows the app to be easily shared. [cloudflare, nginx](https://www.reddit.com/r/selfhosted/comments/icwvox/super_simple_cloudflare_and_nginx_proxy_manager/). You can use free Let's Encrypt certificates so there is no need to muddle through with self-signed certs.

The avatar is rendered in the browser using three.js / reach-three-fibre. This was favoured over using game engines life Unity or unreal engine to remove the need for users to install a standalone app and for the platform and formfactor versatility. The stylized avatars included where downloaded from [ReadyPlayer.me](https://readyplayer.me/) with Visemes and Blendshapes. Animations sourced from Maximo. Inspriation for the approach was provided by [WawSensei](https://www.youtube.com/c/WawaSensei) who has produced some fantastic tutorials on 3D animation in Three.js as well as a full online course. 

### Cloning Repo

Use git-lfs to clone this repo. Avatar models and animations (.glb files) are up to 10MB per file.

```
git clone ...
git lfs install
git-lfs fetch # To ensure that you've downloaded the large files.
```

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

Note that some browsers will throw CORS errors if you run on a different port. This can be fixed in the yak api by including the localhost URL and port in the fastAPI middleware in the server-side code (see the API repo listed above.)

