import { useState, useEffect, useContext, useRef } from 'react';
import useWebSocket, {ReadyState} from 'react-use-websocket';
import RecordRTC, { StereoAudioRecorder } from "recordrtc";
import { AppContext } from "../../api/services/AppContext";

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

const WebRTCSTT = ({ onSpeechConverted, onConversionDone, onRecorderStatusChange }) => {

    let texts = {};
    //let recorder = null;
    const recorder = useRef(null)

    const [socketUrl, setSocketUrl] = useState('');
    const [shouldConnect, setShouldConnect] = useState(false);
    const [startIsDisabled, setStartIsDisabled ] = useState(false);
    const [stopIsDisabled, setStopIsDisabled] = useState(true);
    const [resumeIsDisabled, setResumeIsDisabled] = useState(true);

    const { tempSttToken } = useContext(AppContext);

    // Open the websocket and connect to socketUrl. Parameters are specific to Assembly Ai and may need to be changed to accomodate other providers.
    const { sendJsonMessage, lastMessage, readyState} = useWebSocket(socketUrl,
        {
            onOpen: () => {
                  console.log('AssemplyAI websocket opened');
                  navigator.mediaDevices
                  .getUserMedia({ audio: true })
                  .then((stream) => {
                    recorder.current = new RecordRTC(stream, {
                    type: "audio",
                    mimeType: "audio/webm;codecs=pcm", // endpoint requires 16bit PCM audio
                    recorderType: StereoAudioRecorder,
                    timeSlice: 250, // set 250 ms intervals of data that sends to AAI
                    desiredSampRate: 16000,
                    numberOfAudioChannels: 1, // realtime requires only one channel
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
                })
                recorder.current.startRecording();
              })
            },

            onClose: (e) => {
              console.log(`WS closed for reason: ${e.reason}`);
            },
            shouldReconnect: (closeEvent) => {
              return true;
            },
            reconnectAttempts: 5,
            reconnectInterval: 3000,

    }, shouldConnect);

    const connectionStatus = {
      [ReadyState.CONNECTING]: 'Connecting',
      [ReadyState.OPEN]: 'Open',
      [ReadyState.CLOSING]: 'Closing',
      [ReadyState.CLOSED]: 'Closed',
      [ReadyState.UNINSTANTIATED]: 'Not connected. Press Start to begin.',
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
              let lastMessageJSON = JSON.parse(lastMessage.data)
              console.log(lastMessageJSON.text)
              onSpeechConverted(lastMessageJSON.text)
              if (lastMessageJSON.message_type==='FinalTranscript'){
                let text = processTranscript(lastMessageJSON)
                onConversionDone(text); //fire callback to send final text to parent state.
              }
          }
      }, [lastMessage]);

    async function start(e) {
        setSocketUrl(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tempSttToken}`);
        setShouldConnect(true);
        setStartIsDisabled(true);
        setStopIsDisabled(false);
        setResumeIsDisabled(true)
        onRecorderStatusChange('recording')
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
          <p>connection: {connectionStatus}</p>
        </div>
      </Box>
      );
    }


export default WebRTCSTT;
