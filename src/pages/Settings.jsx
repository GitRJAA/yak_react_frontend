import React, { useState, useEffect, useContext } from 'react';
import './allpages.css';
import './Settings.css'
import ModalPopup from '../components/ModalPopup/ModalPopup';
import { popup_close,
        popup_saving_settings,
        popup_error_custom,
        popup_success
     } from '../data/GlobalConstants'; 
import { format } from '../api/services/Utilities';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  Button,
  Box,
  CircularProgress,
  FormHelperText,
  MenuItem,
} from '@mui/material';

import AppContext from '../api/services/AppContext';
import SettingsIcon from '@mui/icons-material/Settings';
import { isDictionary } from '../api/services/Utilities';

function SettingsPage() {

  const {businessUID} = useContext(AppContext);
  const [avatarOptions, setAvatarOptions] = useState(null);
  const [modelOptions, setModelOptions] = useState(null);
  const [readyToRender, setReadyToRender] = useState(false);
  const [modelSet, setModelSet] = useState(true);
  const [avatarSet, setAvatarSet] = useState(true);

  const [popupContext, setpopupContext] = useState(popup_close);

  const default_settings = {
    business_uid: '',
    default_avatar: '',
    avatar_settings: '',
    house_rules: '',
    notes: '',
    model: ''
  };

  const [settings, setSettings] = useState(default_settings);

  const [isValidJSON, setIsValidJSON] = useState(true);

  const validateJSON = (text) => {
    let ret = null;
    try {
      ret = JSON.parse(text);
      setIsValidJSON(true);
    } catch (error) {
      setIsValidJSON(false);
    }
    return ret
  };
  
  const initialSettings = { ...settings }; // Store initial settings for undo

  const fetchOptions = async (table_name,return_field_list) => {
    // Get options data for populating controls.
    var options = null;
    var rft = ""; //return field list stringified
    try {
        if (return_field_list.length>0){
            rft = return_field_list.join(',');
        }
        else {
            return null;
        }

        const response = await fetch (`${process.env.REACT_APP_LLM_ENDPOINT}/data/options/${businessUID}/${table_name}/${rft}`);
        if (response.ok) {
            const _data = await response.json(); //Expects a Dict of settings.
            if (_data.payload){
                console.log(`OK: Retrieved options for table ${table_name}`)
                options = _data.payload;
            } // leave the default.
        } else {
            console.log(`A problem occured in fetching options for ${table_name}`);
        }
    } catch (error) {
        console.error(`Error fetching settings:${error}`);
    }
    return options;
};

const fetchSettings = async () => {
    // Fetch settings data from the get_cafe_settings endpoint
    var settings = null;
    try {
        const response = await fetch (`${process.env.REACT_APP_LLM_ENDPOINT}/cafe/settings/get/${businessUID}`);
        if (response.ok) {
            const _data = await response.json(); //Expects a Dict of settings.
            if (_data.payload && Object.keys(_data.payload).length > 0){
                console.log(`OK: Retrieved settings for ${businessUID}`)
                settings = _data.payload;
                // As settings maybe displaying dictionaries then these need to converted to strings for display in textField.
                for (const key in settings){
                  if (isDictionary(settings[key]) || typeof settings[key] === 'object' ){
                    settings[key] = JSON.stringify(settings[key])
                  }
                }
            } // leave the default.
        } else {
            console.log(`A problem occured in fetching settings for ${businessUID}: ${ response.statusText}`);
        }
    } catch (error) {
        console.error(`Error fetching settings:${error}`);
    }
    return settings;
};

  const populateSettings = async () =>{
    // Get saved setting options (dropdowns) and saved settings for the current business. Ensure there is always one option.
    const avatar_options = await fetchOptions('avatars',['id','name']);
    //setAvatarOptions([{'id':'','name':'Select and option'}, ...avatar_options ]);
    setAvatarOptions(avatar_options);
    const model_options = await fetchOptions('models',['id','name']);
    //setModelOptions([{'id':'','name':'-- none --'}, ...model_options]);
    setModelOptions(model_options);
  
    if (avatar_options && model_options) {
        const settings = await fetchSettings();
        if (settings) {
            setSettings(settings);
        }
    }
  }

  useEffect(() => {
    // When businessUID is available from the context, the populate the settings.
    if (businessUID){
        populateSettings();
    }
  }, [businessUID]);

  useEffect(() => {
    // Due to the multiple state variables used to fill out the page, then wait until they are all ready. 
    if (businessUID && avatarOptions && modelOptions) {
        if (settings !== default_settings){
            // Do validation on selection choices and set to empty if an invalid choice is passed in. 
            if (!avatarOptions.some((dict)=>dict.id === settings.default_avatar)){
              settings.default_avatar='';
            }
            if (!modelOptions.some((dict) => dict.id === settings.model)){
              settings.model='';
            }
            setReadyToRender(true);
        }
    }
  },[settings]);


  const handleFieldChange = (field, value) => {
    //Update without validation. Validation done JIT with save
    setSettings({ ...settings, [field]: value });
  };

  const validateAndPrepareSettings = () =>{
    /* Create a local copy and do type conversion and validation on 
      that copy instead of constantly hitting the state variable and re-rendering.
      Not that the settings state variable is a dictionary of strings. However, the endpoint validates 
      using Pydantic and expects types consistent with the Cafe class. Do all such converstions here. 
    */
    var converted_settings = { ...settings};  

        for (const key in converted_settings){
            if (settings.hasOwnProperty(key)){
                if (key === 'avatar_settings'){
                    const avatar_config = validateJSON(converted_settings['avatar_settings'])   //check that its formated as a dictionary and raises error if not.
                    if (avatar_config){
                        converted_settings.avatar_settings = avatar_config;
                    }
                    else {
                        converted_settings = null;
                    }
                }
                if (key === 'model'){
                  const ok = (converted_settings[key]!=='');
                  setModelSet(ok);
                  if (!ok){ return null;}
                }
                if (key === 'default_avatar'){
                  const ok = (converted_settings[key]!=='');
                  setAvatarSet(ok);
                  if (!ok){ return null;}
              }
                if (key === 'menus'){
                  converted_settings[key]=JSON.parse(converted_settings[key])
                } 
            }
        }
    return JSON.stringify(converted_settings);
    }

  const handleSave = async () => {
    debugger;
    setpopupContext(popup_saving_settings);
    try {
      debugger;
        const converted_settings = validateAndPrepareSettings();
        if (!converted_settings) {
            return null;
        }
      // Send the updated settings to the save_cafe_settings endpoint
      const response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/cafe/settings/save`,
      {
        headers: {
            'Content-Type': 'application/json'
        },
        method:'POST',
        body: converted_settings
      })

      if (response.ok){
        const data = await response.json();
        if (data.status==='success'){
            console.log(`Save settings for business_uid ${businessUID}`);
            setpopupContext(popup_success)
        } else {
            console.error(`A problem occured when saving settings for businessUID ${businessUID}`);
        }
      } else {
        throw Error(`A problem occured when saving settings: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setpopupContext(format(popup_error_custom,[error]));
    }
  };

  const handleUndo = () => {
    // Restore the initial settings
    setSettings(initialSettings);
  };
  
  const handleClose = () => {
    setpopupContext(popup_close);
  }

  return (
    <>
    { readyToRender ? (

    <div className="allpages my-component-container working_area">
      <ModalPopup context={popupContext} handleClose={handleClose} />
        <SettingsIcon className='setting-icon' />
        <form>
          <TextField
            className='settings_text_field'
            label='Business ID'
            value={settings.business_uid}
            variant="outlined"
            fullWidth
            disabled
          />
          <FormControl fullWidth variant="outlined" className='settings_text_field' required>
            <InputLabel>Avatar</InputLabel>
            <Select
              value={settings.default_avatar}
              onChange={(e) => handleFieldChange('default_avatar', e.target.value)}
              label="Avatar"
              error={!avatarSet}
              helperText={!avatarSet ? 'Avatar is a required field. Please select one.':''}
            >
               {
                  avatarOptions.map((option) => (
                      <MenuItem key={option.name} value={option.id}>
                          {option.name}
                      </MenuItem>
                  ))
              };
            </Select>
            <FormHelperText style={{ color:'red'}}>{ !avatarSet ? "required" :"" }</FormHelperText>
          </FormControl>
  
          <TextField
            className='settings_text_field'
            multiline
            rows={5}
            label="Avatar Configuration"
            value={settings.avatar_settings}  // Is a dictionary by default.
            onChange={(e) => handleFieldChange('avatar_settings', e.target.value)}
            placeholder="Avatar Configuration Dictionary"
            style={{ width: '100%' }}
            error={!isValidJSON}
            helpertext={!isValidJSON ? 'Avatar configs must be in the form of a dictionary.\\n e.g {"voice":"neutralAU", ...}':'' }
          />
  
          <TextField
            className='settings_text_field'
            rows={6}
            multiline
            label="House Rules"
            value={settings.house_rules}
            onChange={(e) => handleFieldChange('house_rules', e.target.value)}
            placeholder="Enter House Rules"
            style={{ width: '100%' }}
          />
          <TextField
            className='settings_text_field'
            label="Notes"
            multiline
            rows={5}
            value={settings.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Enter Notes"
            style={{ width: '100%' }}
          />
          <FormControl fullWidth variant="outlined" required>
            <InputLabel>Model</InputLabel>
            <Select
              value={settings.model}
              defaultValue=''
              onChange={(e) => handleFieldChange('model', e.target.value)}
              label="Model"
              error={!modelSet}
              helpertext={!modelSet ? 'An LLM model must be selected.':''}
            >
             { 
                  modelOptions.map((option) => (
                      <MenuItem key={option.name} value={option.id}>
                          {option.name}
                      </MenuItem>
                  ))
              };

            </Select>
            <FormHelperText style={{ color:'red'}}>{ !modelSet ? "required":""}</FormHelperText>
          </FormControl>
          <Box mt={2} className="settings-button-container">
            <Button variant="contained" color="primary" onClick={handleSave} className='setting-button'>
              Save
            </Button>
            <Button variant="outlined" onClick={handleUndo} className='setting-button'>
              Undo
            </Button>
          </Box>
        </form>
      </div> ) : (
        <div className = "allpages my-component-container working_area progress_center">
            <CircularProgress sx={{fontSize:3}}></CircularProgress>
        </div>
      )
    }
    </>
    );
}


export default SettingsPage;
