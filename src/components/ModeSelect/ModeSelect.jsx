import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

export default function ModeSelect() {
  const [mode, setMode] = React.useState('');

  const handleChange = (event) => {
    setMode(event.target.value);
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
          <MenuItem value={10}>Voice Chat</MenuItem>
          <MenuItem value={20}>Messaging</MenuItem>
          <MenuItem value={30}>Cast</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}