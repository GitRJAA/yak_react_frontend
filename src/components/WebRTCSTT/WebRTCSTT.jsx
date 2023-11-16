import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import RecordRTC, { StereoAudioRecorder } from "recordrtc";

const WebRTCSTT = ({ onTextConverted }) => {

    let texts = {};
    let recorder = null;

    const [socketUrl, setSocketUrl] = useState('');
    const [shouldConnect, setShouldConnect] = useState(false);

    const [transcription, setTranscription] = useState(''); //for the returned text

    // Open the websocket and connect to socketUrl. Parameters are specific to Assembly Ai and may need to be changed to accomodate other providers.
    const { sendJsonMessage, lastMessage} = useWebSocket(socketUrl,
        {
            onOpen: () => {
                console.log('AssemplyAI websocket opened');
                navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                  recorder = new RecordRTC(stream, {
                  type: "audio",
                  mimeType: "audio/webm;codecs=pcm", // endpoint requires 16bit PCM audio
                  recorderType: StereoAudioRecorder,
                  timeSlice: 500, // set 250 ms intervals of data that sends to AAI
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
              recorder.startRecording();
            })
        },
    }, shouldConnect);

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
        //if (lastMessage !== null && lastMessage.message_type === 'FinalTranscript'){
          if (lastMessage!==null){
              let lastMessageJSON = JSON.parse(lastMessage.data)
              console.log(lastMessageJSON.text)
              if (lastMessageJSON.message_type==='FinalTranscript'){
                console.log(lastMessageJSON)
                let text = processTranscript(lastMessageJSON)
                setTranscription(text); //display it in the UI
                onTextConverted(text); //fire callback to send text to parent state.
              }
          }
      }, [lastMessage]);

    async function start(e) {
        setSocketUrl(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${process.env.REACT_APP_ASSEMBLY_AI_TEMP}`);
        setShouldConnect(true);
    }
    async function pause(e) {
        if (recorder)
          recorder.pauseRecording()
      }
    async function resume(e) {
      if (recorder)
        recorder.resumeRecording();
    }

    return (

        <div>
          <button id="start" onClick={start}>Start</button>
          <button id="stop" onClick={pause}>Stop</button>
          <button id="resume" onClick={resume}>Resume</button>
        </div>
      );
    }


export default WebRTCSTT;
