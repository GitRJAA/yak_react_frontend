import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';

export default function AddImageOptions() {

    return (
        <div className='menu'>
            <Box 
            display="flex" 
            justifyContent="center" 
            width="100vw" // Full viewport width
        >
            <Box 
            border={1} 
            borderColor="grey.500" 
            borderRadius={2} 
            p={1} // Add some padding inside the border
            margin={5}
            display="inline-block" // Make the box shrink to fit its content
        >
            <FormControl component="fieldset" variant="outlined" sx={{ p: 1, borderColor: 'grey.500' }}>
            <FormLabel component="legend" sx={{ mb: 1 }}>add menu page</FormLabel>
            <FormGroup>
                <Box display="flex" flexDirection="row" alignItems="center" justifyContent="center">
                <IconButton aria-label="camera" size="large" style={{ fontSize: '3rem'}}>
                    <CameraAltIcon fontSize="inherit" />
                </IconButton>
                <IconButton aria-label="attach" size="large" style={{ fontSize: '3rem' }}>
                    <AttachFileIcon fontSize="inherit" />
                </IconButton>
                <IconButton aria-label="document" size="large" style={{ fontSize: '3rem' }}>
                    <DescriptionIcon fontSize="inherit" />
                </IconButton>
                </Box>
            </FormGroup>
            </FormControl>
            </Box>
            </Box>
        </div>
      );
    }