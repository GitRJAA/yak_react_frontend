import React from 'react';
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import CollectionsIcon from '@mui/icons-material/Collections';

import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormGroup from '@mui/material/FormGroup';

export default function AddImageOptions({onSubMenuChange}) {

    return (
        <div className='menu'>
            <Box 
            display="flex" 
            justifyContent="center" 
            width="100vw" // Full viewport width
        >

                    <Box position="relative" border={1} borderColor="grey.400" borderRadius={2} p={1} m={2}>
                            <Typography
                                variant="caption"
                                style={{
                                    position: 'absolute',
                                    top: -10,
                                    left: 20,
                                    backgroundColor: 'white',
                                    padding: '0 4px'
                                }}
                            >
                                gallery
                            </Typography>
                        <Box display="flex" flexDirection="row" alignItems="center" justifyContent="center">
                            <IconButton aria-label="menu-images" size="large" style={{ fontSize: '3rem'}} onClick={()=>onSubMenuChange('gallery')}>
                                <CollectionsIcon fontSize="inheret" />
                            </IconButton>
                        </Box>
                    </Box>
 

                    <Box position="relative" border={1} borderColor="grey.400" borderRadius={2} p={1} m={2}>
                        <Typography
                            variant="caption"
                            style={{
                                position: 'absolute',
                                top: -10,
                                left: 20,
                                backgroundColor: 'white',
                                padding: '0 4px'
                            }}
                        >
                        add menus
                        </Typography>


                        <Box display="flex" flexDirection="row" alignItems="center" justifyContent="center">
                            <IconButton aria-label="camera" size="large" style={{ fontSize: '3rem'}} onClick={()=>onSubMenuChange('camera')}>
                                <CameraAltIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton aria-label="attach" size="large" style={{ fontSize: '3rem' }} onClick={()=>onSubMenuChange('file')}>
                                <AttachFileIcon fontSize="inherit" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>

        </div>
      );
    }