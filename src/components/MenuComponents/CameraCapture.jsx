import React, { useState, useEffect, useRef } from 'react';
import IconButton from '@mui/material/IconButton';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import './CameraCapture.css'

const CameraCapture = () => {
    const [stream, setStream] = useState(null);
    const [photoTaken, setPhotoTaken] = useState(false);
    const [photoSrc, setPhotoSrc] = useState('');
    const videoRef = useRef(null);
    const photoRef = useRef(null);

    const initializeCamera = async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(currentStream);
            if (videoRef.current) {
                videoRef.current.srcObject = currentStream;
            }
        } catch (error) {
            console.error('Error accessing the camera:', error);
        }
    };

    useEffect(() => {
       initializeCamera();

        // Clean up
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const takePhoto = () => {
        const video = videoRef.current;
        const photo = photoRef.current;
        const context = photo.getContext('2d');

        if (video && photo) {
            const width = video.videoWidth;
            const height = video.videoHeight;
            
            photo.width = width;
            photo.height = height;
            
            context.drawImage(video, 0, 0, width, height);

            // Get data URL of the photo
            const photoDataURL = photo.toDataURL('image/png');
            setPhotoSrc(photoDataURL);
            setPhotoTaken(true);
        }
        setPhotoTaken(true);
    };

    const handleKeepPhoto = () => {
        console.log('Photo kept:', photoSrc);
        // Here you can handle the logic to use the photo as needed
    };

    const handleRejectPhoto = () => {
        setPhotoTaken(false);
        setPhotoSrc('');
        initializeCamera(); // Restart the camera
    };

    return (
        <div className="camera-container">
        {!photoTaken ? (
            <>
                <video ref={videoRef} autoPlay playsInline className="video-stream"></video>
                <div className="controls">
                    <IconButton color="primary" aria-label="take photo" component="span" onClick={takePhoto}  sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          '&:hover':{
                            backgroundColor: 'lightgray'
                          }
                        }}>
                        <PhotoCamera fontSize="large" />
                    </IconButton>
                </div>
            </>
        ) : (
            // Render the taken photo and action buttons
            <>
                <img src={photoSrc} alt="Captured" className="captured-image" />
                <div className="photo-actions">
                    <IconButton color="primary" aria-label="keep photo" component="span" onClick={handleKeepPhoto}  sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          '&:hover':{
                            backgroundColor: 'lightgray'
                          }
                        }}>
                        <CheckIcon fontSize="large" />
                    </IconButton>
                    <IconButton color="secondary" aria-label="reject photo" component="span" onClick={handleRejectPhoto}  sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          '&:hover':{
                            backgroundColor: 'lightgray'
                          }
                        }}>
                        <CloseIcon fontSize="large" />
                    </IconButton>
                </div>
            </>
        )}
        <canvas ref={photoRef} style={{ display: 'none' }}></canvas>
    </div>
    );
};

export default CameraCapture;
