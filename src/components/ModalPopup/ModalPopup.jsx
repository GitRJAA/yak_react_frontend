import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

const ModalPopup = ({message, onClose}) => {

    const [open, setOpen] = useState(false);

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    useEffect(() => {  
        setOpen(true);
    }, [message]);

   const handleClose = () => {
    setOpen(false);
    //onClose();
   }

    return (
        <div>
            <Modal keepMounted
                open={open}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        {message}
                    </Typography>
                    <Button onClick={handleClose}>Close</Button>
                </Box>
            </Modal>
        </div>
    );
}

export default ModalPopup;
