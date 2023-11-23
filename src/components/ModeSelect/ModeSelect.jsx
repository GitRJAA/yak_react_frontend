import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function ModeSelect({onModeChange}) {
  const [mode, setMode] = React.useState('');

  const handleChange = (event) => {
    setMode(event.target.value);
    onModeChange(mode)
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Mode</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={mode}
          label="Mode"
          onChange={handleChange}
        >
          <MenuItem value="talk">Voice Chat</MenuItem>
          <MenuItem value="chat">Messaging</MenuItem>
          <MenuItem value="cast">Cast</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}