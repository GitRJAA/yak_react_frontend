import { useState, useEffect, useContext, useRef } from 'react';
import { useAvatarContext } from '../LLMTalkInterface/hooks/useAvatar';

import useWebSocket, {ReadyState} from 'react-use-websocket';
import RecordRTC, { StereoAudioRecorder } from "recordrtc";
import { AppContext } from "../../api/services/AppContext";

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

const WebRTCSTT = ({ onSpeechConverted, onConversionDone, onRecorderStatusChange, menuID, autoStart }) => {
  /*
    This component handles the webRTC connection with the speech-to-text provider Asemebly AI. It has not been tested with other providers.

    onSpeechConverted: func: called everytime chunk of text becomes available
    onConversionDone: func: called when no more speech to convert. 
    onRecordingStatusChange: func: call end stop.resume buttons pressed. 
    menuID: str: the menuID of the currently selected menu. The menu contains, among other things, the 
            text of the menu and menu_rules. 
  */

    let texts = {};
    const recorder = useRef(null)

    const [socketUrl, setSocketUrl] = useState('');
    const [shouldConnect, setShouldConnect] = useState(false);  //For Websocket.
    const [startIsDisabled, setStartIsDisabled ] = useState(false);
    const [stopIsDisabled, setStopIsDisabled] = useState(true);
    const [resumeIsDisabled, setResumeIsDisabled] = useState(true);
    const connectionStatus = useRef(null);

    const { tempSttToken } = useContext(AppContext);
    const { statusEnum, avatarStatusRef, setAvatarStatus } = useAvatarContext();

    useEffect(()=>{
      if (autoStart){
        startSTTConnection();
      }
    },[]);

    /*
      Websocket connection and STT text processing (assemblyAI)

       + Parameters are specific to Assembly Ai and may 
         need to be changed to accomodate other providers.
    */

    function createAndStartRecorder(stream) {
      recorder.current = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm;codecs=pcm",
        recorderType: StereoAudioRecorder,
        timeSlice: 250,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 16384,
        audioBitsPerSecond: 128000,
        ondataavailable: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64data = reader.result;
            sendJsonMessage({
              audio_data: base64data.split("base64,")[1],
            });
          };
          reader.readAsDataURL(blob);
        },
      });
      recorder.current.startRecording();
    }

    const { sendJsonMessage, lastMessage, readyState} = useWebSocket(socketUrl, {
      onOpen: () => {
        console.log('AssemplyAI websocket opened');
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Check if there's an existing recorder and stop it before creating a new one
            if (recorder.current) {
              recorder.current.stopRecording(() => {
                // Ensure that the previous recorder is completely stopped before starting a new one
                recorder.current = null;
                createAndStartRecorder(stream);
              });
            } else {
              createAndStartRecorder(stream);
            }
          });
      },
    
      onClose: (e) => {
        console.log(`WS closed for reason: ${e.reason}`);
        // You may want to handle WebSocket closure and reconnection logic here
      },
    
      shouldReconnect: (closeEvent) => {
        return true;
      },
      reconnectAttempts: 5,
      reconnectInterval: 3000,
    }, shouldConnect);
    

    connectionStatus.current = {
      [ReadyState.CONNECTING]: 'Connecting',
      [ReadyState.OPEN]: 'Open',
      [ReadyState.CLOSING]: 'Closing',
      [ReadyState.CLOSED]: 'Closed',
      [ReadyState.UNINSTANTIATED]: 'Press Start to begin.',
    }[readyState];

    const processTranscript = (msgJSON) => {
        let msg = "";
        //const res = JSON.parse(source.data);
        if (msgJSON.text) {
          texts[msgJSON.audio_start] = msgJSON.text;
          const keys = Object.keys(texts);
          keys.sort((a, b) => a - b);
          for (const key of keys) {
            if (texts[key]) {     
              msg += ` ${texts[key]}`;
            }
          }
        }
        return msg;
      };

    useEffect(() => {
          if (lastMessage!==null){
              //console.log(`last message:${lastMessage.data}`);
              let lastMessageJSON = JSON.parse(lastMessage.data); 
              //console.log(`last message:${lastMessageJSON}`);
              //Set avatar status to listening just started
              if (lastMessageJSON.text && lastMessageJSON.text!==''){ //There are signalling messages sometimes returned so check that we have text in the message.
                  console.log(lastMessageJSON.text);
                  onSpeechConverted(lastMessageJSON.text);
                  if (avatarStatusRef.current!==statusEnum.LISTENING){
                      console.log(`Set avatarStatus to ${statusEnum.LISTENING} in webrtc`)
                      setAvatarStatus(statusEnum.LISTENING);
                  }
              }
              if (lastMessageJSON.message_type==='FinalTranscript'){
                let text = processTranscript(lastMessageJSON)
                onConversionDone(text); //fire callback to send final text to parent state.
                //console.log('Set avatarStatus to IDLE in webrtc');
                //setAvatarStatus(statusEnum.IDLE);
              }
            }
        }, [lastMessage]);

    /*
      STT Listenting controls
    */

    const startSTTConnection = async()   =>{
      setSocketUrl(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tempSttToken}`);
      setShouldConnect(true);
      setStartIsDisabled(true);
      setStopIsDisabled(false);
      setResumeIsDisabled(true)
      onRecorderStatusChange('recording')
    }

    async function start(e) {
      startSTTConnection();
    }

    async function pause(e) {
        if (recorder.current) {
          console.log('Requested to pause recording voice.')
          recorder.current.pauseRecording()
          setStopIsDisabled(true);
          setResumeIsDisabled(false);
          onRecorderStatusChange('paused')
        }
      }
      
    async function resume(e) {
      if (recorder.current){
        console.log('resuming recording voice.')
        recorder.current.resumeRecording();
        setResumeIsDisabled(true);
        setStopIsDisabled(false);
        onRecorderStatusChange('recording')
      }
    }

    return (
      <Box sx={{'& button':{m:1}}}>
        <div>
          <Button variant="contained" disabled={startIsDisabled}  id="start" onClick={start}>Start</Button>
          <Button variant="contained" disabled={stopIsDisabled} id="stop" onClick={pause}>Stop</Button>
          <Button variant="contained" disabled={resumeIsDisabled} id="resume" onClick={resume}>Resume</Button>
          <p>connection: {connectionStatus.current}</p>
        </div>
      </Box>
      );
    }


export default WebRTCSTT;
