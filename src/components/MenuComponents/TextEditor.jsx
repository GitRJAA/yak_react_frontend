import AppContext from '../../api/services/AppContext';

import React, { useState, useEffect, useContext } from 'react';
import { TextField, Button, CircularProgress  } from '@mui/material';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {AdapterDateFns}  from '@mui/x-date-pickers/AdapterDateFns';

import './TextEditor.css'; // Import the CSS file

const TextEditor = ({menu_id, showModal }) => {
  const { businessUID } = useContext(AppContext);

  //menuData is an object containing the mandatory fields in the yakwithai.voice_chat.datat_models.Menu dataclass.
  // Careful attention needed to format Timepickers correctly.
  const [menuData, setMenuData] = useState({
    menu_id: '',
    name: '',
    menu_text: '',
    valid_time_range: { start: new Date(), end: new Date() },
    rules: ''
  });

  const [loading, setLoading] = useState(false)

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/menus/get_one/${businessUID}/${menu_id}`);
      if (response.ok){
        const data = await response.json();
        if (data.menu){
          setMenuData(data.menu);
        }
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
    }
    setLoading(false);

  };

  useEffect(() => {
    // Fetch menu data from the API
    fetchMenuData();
    }, []);

  const updateMenu = async() => {
    // Send form data back to database
    setLoading(true);

    try{
        const response = await fetch(
            `${process.env.REACT_APP_LLM_ENDPOINT}/menus/update_one/${businessUID}/${menuData.menu_id}`,
            { method: "PUT",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify(menuData)
            });           
        const ret = await response.json(); //Typical response success: ?, message: ?
        if (ret.status !== 'success'){
            console.log(`Problem updating menu ${menuData.menu_id}: ${ret.message}`);
        }
    } catch (e) {
        console.log(`Fetch error updating menu ${menuData.menu_id}: error ${e}`);
    }
    setLoading(false);
    showModal('Success');
  }

  if (loading) return (
    <div className = "centerContainer">
      <CircularProgress />
    </div>
)

  const handleChange = (event) => {
    setMenuData({ ...menuData, [event.target.name]: event.target.value });
  };

  const handleTimeChange = (name, value) => {
    setMenuData({ ...menuData, valid_time_range: { ...menuData.valid_time_range, [name]: value } });
  };

  const undoChanges = () => {
    fetchMenuData(); // Reset menuData to original values from API
  };

  return (
    <div className="my-component-container">
        <TextField
            label="Name"
            name="name"
            value={menuData.name}
            onChange={handleChange}
            className="text-field"
        />
        <TextField
            label="Menu Text"
            name="menu_text"
            multiline
            rows={20}
            value={menuData.menu_text}
            onChange={handleChange}
            className="text-field"
        />
        <div className="time-picker-container">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                    label="Start Time"
                    value={new Date(menuData.valid_time_range.start)}
                    onChange={(value) => handleTimeChange('start', value)}
                    renderInput={(params) => <TextField {...params} className="time-picker" />}
                />
                <TimePicker
                    label="End Time"
                    value={new Date(menuData.valid_time_range.end)}
                    onChange={(value) => handleTimeChange('end', value)}
                    renderInput={(params) => <TextField {...params} className="time-picker" />}
                />
            </LocalizationProvider>
        </div>
        <TextField
            label="Rules"
            name="rules"
            multiline
            rows={6}
            value={menuData.rules}
            onChange={handleChange}
            className="text-field"
        />

        <div className="button-container">
            <Button variant="contained" color="primary" onClick={updateMenu}>
                Update
            </Button>
            <Button variant="outlined" color="secondary" onClick={undoChanges} style={{ marginLeft: '10px' }}>
                Undo
            </Button>
        </div>
    </div>
);
};

export default TextEditor;
