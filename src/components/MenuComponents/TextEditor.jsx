import AppContext from '../../api/services/AppContext';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { TextField, Button, CircularProgress, Tooltip  } from '@mui/material';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {AdapterDateFns}  from '@mui/x-date-pickers/AdapterDateFns';
import Autocomplete from '@mui/material/Autocomplete';


import './TextEditor.css'; // Import the CSS file

const TextEditor = ({menu_id, popUpHandlers }) => {
  const { businessUID } = useContext(AppContext);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);  //{'label':?,'value'}
  const applyBtnRef = useRef(null); // A ref for the apply button so that it can be scrolled to after editing combo-box

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

  // Popup configurations for common tasks.
  function templatePopup(template, ...values) {
    return template.replace(/{(\d+)}/g, (match, index) => values[index]);
  }

  const msg_updating = {'action':'open','msg':'Updating menu details', 'type':'wait'}
  const msg_close = {'action':'close','msg':'', 'type':''}
  const msg_ai_text_correction = {'action':'open','msg':'Working some AI magic', 'type':'wait'}
  const msg_success = {'action':'open', 'msg':'Done', 'type':'ok'}
  const msg_error_ai_text_correction = {'action':'open','msg':'An error occured when doing AI-text correction.','type':'error'}
  const msg_general_error  = "{'actoin':'open',msg:{0},'type':'error'}"

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

  const fetchAIEditorPrompts = async () => {
    fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/services/get_ai_prompts/${businessUID}`)
    .then((response) => response.json())
    .then((data) => {
      setOptions(data.payload); // response is {"success":?,"msg":?,"payload":[{'label':?,'value':?}...]}
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });
  }

  useEffect(() => {
    fetchMenuData();
    fetchAIEditorPrompts();
    }, []);

  const updateMenu = async() => {
    // Send form data back to database
    popUpHandlers[0](msg_updating);

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
    popUpHandlers[0](msg_success);
    popUpHandlers[1]("gallery")
  }

  if (loading) return (
    <div className = "centerContainer">
      <CircularProgress />
    </div>
)

  // General form field changes
  //
  const handleChange = (event) => {
    setMenuData({ ...menuData, [event.target.name]: event.target.value });
  };

  const handleTimeChange = (name, value) => {
    setMenuData({ ...menuData, valid_time_range: { ...menuData.valid_time_range, [name]: value } });
  };

  const undoChanges = () => {
    fetchMenuData(); // Reset menuData to original values from API
  };

  //   AI text editor functions 
  //
  const handleAIPromptChange = (event, newValue) => {
    setSelectedOption(newValue);
  };

  const handleInputChange = (event, newInputValue) => {
    //Custom text input to combo box
    const option = options.find((opt) => opt.label === newInputValue);
    if (option) {
      setSelectedOption(option);
    } else {
      // Handle the case where the input doesn't match any predefined options
      setSelectedOption({'label':newInputValue,'value':newInputValue});
    }
  };
  
  const handleInputKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      if (applyBtnRef.current) {
        applyBtnRef.current.focus();
      }
    }
  };

  const applyAIPrompt = async () => {
    //Apply ai prompt to current menu Text
    if (selectedOption === null || selectedOption.value === ''){
      return;
    }
    popUpHandlers[0](msg_ai_text_correction);
    try{
        const response = await fetch(
            `${process.env.REACT_APP_LLM_ENDPOINT}/services/service_agent/`,
            { method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({
                  'task':'fix',
                  'prompt': selectedOption.value+'\n\n'+menuData.menu_text,
                  stream:false
                }) // class ServiceAgentRequest(BaseModel):
            });           
        const ret = await response.json(); //Typical response success: ?, message: ?
        if (ret.status !== 'success'){
            console.log(`Failure furing ai-editing`, ret.msg);
            popUpHandlers[0](templatePopup(msg_general_error,'Failure during ai-editing.'));
        } else {
          //apply the updated text to the menu
          menuData.menu_text = ret.msg;
        }

    } catch (e) {
        console.log(`Fetch error ai-fixing text: error ${e}`);
        popUpHandlers[0](msg_error_ai_text_correction);
    }
    popUpHandlers[0](msg_success);
  }

  return (
    <div className="my-component-container">
        <TextField
            label="Name"
            name="name"
            value={menuData.name}
            onChange={handleChange}
            className="text-field"
        />
        <div className="text-editor-ai-prompt">
          <Autocomplete
            value={selectedOption}
            onChange={handleAIPromptChange}
            onInputChange={handleInputChange}
            onKeyDown={handleInputKeyDown} // Handle Tab key
            options={options}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => <TextField {...params} label="AI-power text editor prompt" />}
            className = 'prompt-combo'
          />
          <Tooltip title='Give natural language instructions to the AI-powered text editor to change or fix the menu text. Use Undo button, below, to cancel changes.' enterDelay={1000} disableFocusListener disableTouchListener >
            <Button variant="contained" color="primary" className='apply-button' onClick={applyAIPrompt} ref={applyBtnRef} >
                  Apply
            </Button>
          </Tooltip>
        </div>

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
