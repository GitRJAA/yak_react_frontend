import React from 'react';
import Modal from '@mui/material/Modal';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { WarningAmber, ErrorOutline } from '@mui/icons-material';
import Button from '@mui/material/Button';


import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import './ModalPopup.css'; // Assuming you have a separate CSS file for the modal

// Responsive and Material-UI styled modal
const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    
    maxWidth: {
      xs: '50%', // responsive width
      sm: '45%',
      md: '40%',
      lg: '30%',
      xl: '20%',
    },
    //maxWidth: '500px', // max width of the modal
    bgcolor: 'background.paper',
    border: '1px solid light-gray',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
    outline: 'none'
  };


const ModalPopup = ({context, handleClose }) => {
    //console.log('popup type', context);
    const {action, msg, type} = context;
    return (
        <Modal open={(action === 'open')} onClose={handleClose}>
            <Box sx={style}>
                {/*<div className='message'>{msg}</div> */}
                <div className="icon_text_overlay_container">
                    <Typography variant="h6" style={{ marginTop: '5px' }}>{msg}</Typography>
                    <div className='background_icon' >
                        { type==='wait' && <CircularProgress className="largeProgress" />  }
                        { (type==='error') && <ErrorOutline className="largeError" /> }
                        { (type === 'alert') && <WarningAmber className = "largeWarning" />}
                        { type==='ok' && <CheckCircleIcon className='successIcon' /> }

                    </div>
                </div>

                { type!=='wait' &&              
                    <div className='popUpControls'>
                    <Button 
                        variant="text" 
                        color="primary" 
                        onClick={handleClose}
                        sx={{ mt: 2 }}
                    >Close
                    </Button>
                </div>
                }
            </Box>
        </Modal>
    );
};

export default ModalPopup;
