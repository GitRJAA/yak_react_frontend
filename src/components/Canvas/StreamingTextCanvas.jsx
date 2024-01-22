import { useEffect, useRef } from "react"
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const StreamingTextCanvas = ({text, height, label, zIndex }) => {
    
    return (
            <div className="margin-top-8" style={{width: '80%', zIndex: zIndex}}>
                <TextField
                multiline
                fullWidth
                label={label}
                    value = {text}
                    rows={height}
                InputProps={{
                    startAdornment: <InputAdornment position="start">{ label==='you' ? <KeyboardVoiceIcon />: <SmartToyIcon/> }</InputAdornment>,
                  }}
                />
            </div>
        );  

};
export default StreamingTextCanvas;