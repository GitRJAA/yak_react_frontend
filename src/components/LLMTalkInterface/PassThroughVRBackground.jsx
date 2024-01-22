import React, { useState, useEffect, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import '../MenuComponents/CameraCapture.css'
import './YakAvatar.css'

const PassThroughVRBackground = ({onToggleFullscreen, isFullscreen}) => {
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(1);
 
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

    const handleZoomIn = async () => {
        // Increase the zoom level (adjust the increment as needed)
        setZoomLevel((prevZoomLevel) => prevZoomLevel + 0.1);
        await updateCameraZoom();
      };
    
      const handleZoomOut = async () => {
        // Decrease the zoom level (adjust the decrement as needed)
        setZoomLevel((prevZoomLevel) => Math.max(prevZoomLevel - 0.1, 1)); // Ensure zoom level doesn't go below 1
        await updateCameraZoom();
      };
  
    const updateCameraZoom = async () => {
        debugger;
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject;
          const tracks = stream.getVideoTracks();
    
          if (tracks.length > 0) {
            const track = tracks[0];
    
            try {
              await track.applyConstraints({
                advanced: [{ zoom: zoomLevel }],
              });
            } catch (error) {
              console.error('Error updating camera constraints:', error);
            }
          }
        }
      };

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

    const handleToggleFullscreen = async ()=>{
        debugger;
        onToggleFullscreen();
    }


    return (      
            <>
              <video ref={videoRef} autoPlay playsInline className="avatar-passthrough-video"></video>
                <div className="avatar-passthrough-controls">
                    <IconButton color="light-gray" aria-label="switch camera" component="span" onClick={handleCameraSwitch} sx = {{ 
                        backgroundColor: '#FFFFFF', 
                        '&:hover':{
                            backgroundColor: 'lightgray'
                        }
                        }}>
                        <FlipCameraIosIcon fontSize='large'   />
                    </IconButton>
                    <IconButton color="light-gray" aria-label="zoom in" component="span" onClick={handleZoomIn} sx = {{ 
                        backgroundColor: '#FFFFFF', 
                        '&:hover':{
                            backgroundColor: 'lightgray'
                        }
                        }}>
                        <ZoomInIcon fontSize='large'   />
                    </IconButton>
                    <IconButton color="light-gray" aria-label="zoom out" component="span" onClick={handleZoomOut} sx = {{ 
                        backgroundColor: '#FFFFFF', 
                        '&:hover':{
                            backgroundColor: 'lightgray'
                        }
                        }}>
                        <ZoomOutIcon fontSize='large'   />
                    </IconButton>
                    <IconButton color="light-gray" aria-label="screen mode" component="span" onClick={handleToggleFullscreen} sx = {{ 
                        backgroundColor: '#FFFFFF', 
                        '&:hover':{
                            backgroundColor: 'lightgray'
                        }
                        }}>
                        {isFullscreen ? <FullscreenExitIcon fontSize='large' /> : <FullscreenIcon fontSize='large' /> }
                    </IconButton>
                </div>
            </>
    );
};

export default PassThroughVRBackground;
