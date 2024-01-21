import React, { useState, useEffect, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';

import '../MenuComponents/CameraCapture.css'

const PassThroughVRBackground = () => {
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
 
    // Camera selector
    const ENVIRONMENT_FACING = 'environment';
    const USER_FACING = 'user';

    const cameraIDList = useRef(null); // A list of available camera devices.
    const cameraSelection = useRef('environment'); //Index of the currently selected option in cameraIDList

    const setCameraList = async () => {
        // Populate camera list state with attached camera devices (e.g front an back)  - Deprecated
        try {
          const devices =  await navigator.mediaDevices.enumerateDevices();
          cameraIDList.current = devices.filter(device => device.kind === 'videoinput');
          if (cameraIDList.length === 0){
            throw new Error ('No camera devices found.')
          }
         } catch (error) {
          console.error('Error accessing media devices:', error);
        }
      };
    
    const initializeCamera = async () => {
        const constraints = {
            video: {
              width: { ideal: process.env.REACT_APP_MAX_CAMERA_PIXEL_WIDTH },
              height: { ideal: process.env.REACT_APP_MAX_CAMERA_PIXEL_WIDTH },
              facingMode: "environment"
            }
          };

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(currentStream);
            if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
            }
        } catch (error) {
            console.error('Error accessing the camera:', error);
        }
    };

   
    const handleCameraSwitch = async() => {
        // Switch cameras if more than one is available.
        if (cameraSelection.current === ENVIRONMENT_FACING){
            cameraSelection.current = USER_FACING;
        } else {
            cameraSelection.current = ENVIRONMENT_FACING;
        }
        initializeCamera();
    }

    useEffect(() => {
       setCameraList()
       .then( data =>  initializeCamera())
       .catch((err) => {console.error('Error initializing cameras', err)})
        // Clean up
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    return (      
            <>
                <video ref={videoRef} autoPlay playsInline className="avatar-passthrough-video"></video>
                <div className="controls">
                    <IconButton color="light-gray" aria-label="switch camera" component="span" onClick={handleCameraSwitch} sx = {{ 
                        backgroundColor: '#FFFFFF', 
                        '&:hover':{
                            backgroundColor: 'lightgray'
                        }
                        }}>
                        <FlipCameraIosIcon fontSize='large' />
                    </IconButton>
                </div>
            
                <div className = 'cameraFlip' >
                </div>
            </>
    );
};

export default PassThroughVRBackground;
