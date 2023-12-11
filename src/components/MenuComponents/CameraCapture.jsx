import React, { useState, useEffect, useRef, useContext } from 'react';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AppContext from '../../api/services/AppContext';

import { convertDataURLToBlob } from '../../api/services/Utilities';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import './CameraCapture.css'

const CameraCapture = ({popUpHandlers}) => {
    const {businessUID} = useContext(AppContext);

    const [stream, setStream] = useState(null);
    const [photoTaken, setPhotoTaken] = useState(false);
    const [photoSrc, setPhotoSrc] = useState('');
    const videoRef = useRef(null);
    const photoRef = useRef(null);
    const menuID = useRef(null);
    const cameraIDList = useRef(null); // A list of available camera devices.
    const cameraSelection = useRef('environment'); //Index of the currently selected option in cameraIDList

    const [open, setOpen] = useState(false); // Add images dialog
    const grp_id = useRef('null');  // For grouping images into a single menu. Must use the string 'null'. Using '' will cause pydantic validation errors on api.
 
    const ENVIRONMENT_FACING = 'environment';
    const USER_FACING = 'user';

    /*
         Camera functions 
    */

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

    const takePhoto = async () => { 
        // Capture the current image frame
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
            const photoDataURL = photo.toDataURL('image/png');  //Inline data base64. Use PNG due to lossless encoding.

            setPhotoSrc(photoDataURL);
            setPhotoTaken(true);
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

    /* 
        Image management
    */

    const uploadImage = async () => {
        // Send image to api.
        const dataURL = photoSrc
        const blob = convertDataURLToBlob(dataURL);  // Data must be passed as blob to fastAPI.
        const file = new File([blob], 'upload.png', { type: 'image/png' });
      debugger;
        const formData = new FormData();
        formData.append('business_uid', businessUID);
        formData.append('file', file);
        formData.append('grp_id',grp_id.current)

        if (grp_id.current === null || grp_id.current === ''){
            throw Error('grp_id can not be null or empty. This will cause pydantic validation errors on api. ')
        }
        
        debugger;
        try {
            const response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/menus/upload/`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            console.log(data);
    
            if (data && data.payload) {
                menuID.current = data.payload.menu_id;
                grp_id.current = data.payload.grp_id;
                return true; 
            } else {
                console.error('Menu Upload failed');
                return false; 
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            return false;
        }
    };
    
    const handleKeepPhoto = async() => {
        console.log('Photo kept');
        //UPload image to server and extract text. Sets menuID if successful.
        popUpHandlers[0]({'action':'open','msg':'Uploading and Extracting Text','type':'wait'});
        
        try {
            const upload_ok = await uploadImage();
            if (menuID.current === null){
                throw new Error('Error uploading Image.');
            }
            const ocr_ok = await doOCR(businessUID, menuID.current);
            if (!upload_ok || !ocr_ok){
                throw new Error('Error during OCR on uploaded image.');
            }
            //popUpHandlers[0]({'action':'open','msg':'Done','type':'ok'});
            popUpHandlers[0]({'action':'close','msg':'','type':''});
            handleClickOpen(); 
        }
        catch (err) {
            handleRejectPhoto(); 
            popUpHandlers[0]({'action':'open','msg':`${err}`,'type':'error'});
            console.error('Error processing menu image:',err);
        }
    }

    const handleRejectPhoto = () => {
        setPhotoTaken(false);
        setPhotoSrc('');
        initializeCamera(); // Restart the camera
    };

    const doOCR = async () => {
        // Perform OCR on image saved on server.
        var ok = false;

        try {
            const response = await fetch (`${process.env.REACT_APP_LLM_ENDPOINT}/menus/ocr/${businessUID}/${menuID.current}`);
            const { status, message } = await response.json();
            if (status === "success"){
                console.log('Successfully extract text for image:', menuID.current);
                ok = true;
            }
            else {
                console.error('Error performing OCR for image:',menuID.current, message);
            }
        }
        catch(error) {
            console.error('Error performing OCR for image:',menuID.current, error);
        }
        return ok;
    }

    /* 
        Dialog to add more photos
    */
    
    const handleClickOpen = () => {
        setOpen(true);
    };
    
    const handleNoMore = () => {
        setOpen(false);
        popUpHandlers[1]("menu_metadata_editor", menuID.current);
    };
    
    // Handle the action when the user confirms
    const handleAddMore = () => {
        // Add your logic here for the "Add more images?" action
        // This is where you can trigger the appropriate action
        // For now, we'll just close the dialog
        setOpen(false);
        handleRejectPhoto();  // Re-initialize and let the user add another image.

    };


    return (
        
        <div className="camera-container">

        <div>
        <Dialog open={open} onClose={handleNoMore}>
            <DialogTitle>Add More Images?</DialogTitle>
            <DialogContent>
            <DialogContentText>
                Add another image to same menu?
            </DialogContentText>
            </DialogContent>
            <DialogActions>
            <Button onClick={handleNoMore} color="primary">
                No
            </Button>
            <Button onClick={handleAddMore} color="primary">
                Yes
            </Button>
            </DialogActions>
        </Dialog>
        </div>


        {!photoTaken ? (
                <div className='video-container'>
                    <video ref={videoRef} autoPlay playsInline className="video-stream"></video>
                    <div className="controls">
                        <IconButton color="primary" aria-label="take photo" component="span" onClick={takePhoto}  sx = {{ 
                            backgroundColor: '#FFFFFF', 
                            '&:hover':{
                                backgroundColor: 'lightgray'
                            }
                            }}>
                            <PhotoCamera fontSize="large" style={{ fontSize: '3rem'}}/>
                        </IconButton>
                        <IconButton color="light-gray" aria-label="switch camera" component="span" onClick={handleCameraSwitch} sx = {{ 
                            backgroundColor: '#FFFFFF', 
                            '&:hover':{
                                backgroundColor: 'lightgray'
                            }
                            }}>
                            <FlipCameraIosIcon fontSize='large' />
                        </IconButton>
                    </div>
                </div>
        ) : (
            // Render the taken photo and action buttons
            <div className='video-container'>
                <img src={photoSrc} alt="Captured" className="captured-image" />
                <div className="photo-actions">
                    <IconButton color="primary" aria-label="keep photo" component="span" onClick={handleKeepPhoto}  sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          m: 5,
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
            </div>
        )}
        <canvas ref={photoRef} style={{ display: 'none' }}></canvas>
        <div className = 'cameraFlip' >

        </div>
    </div>

    );
};

export default CameraCapture;
