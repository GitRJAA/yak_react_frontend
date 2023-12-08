import React from 'react';
import Modal from '@mui/material/Modal';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
    width: {
      xs: '50%', // responsive width
      sm: '40%',
      md: '30%',
      lg: '20%',
      xl: '10%',
    },
    maxWidth: '500px', // max width of the modal
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    outline: 'none',
  };


const ModalPopup = ({context, handleClose }) => {
    console.log('popup type', context);
    const {action, msg, type} = context;
    return (
        <Modal open={(action === 'open')} onClose={handleClose}>
            <Box sx={style}>
                {/*<div className='message'>{msg}</div> */}
                <Typography variant="h6" style={{ marginTop: '20px' }}>{msg}</Typography>
                <div>
                    { type==='wait' && <CircularProgress />  }
                    { type==='alert' && <CloseIcon className="largeRedCross" /> }
                    { type==='ok' && <CheckCircleIcon className='successIcon' /> }
                </div>               
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleClose}
                    sx={{ mt: 2 }}
                >Close
                </Button>
            </Box>
        </Modal>
    );
};

export default ModalPopup;
