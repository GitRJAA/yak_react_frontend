import React, { useState, useEffect, useContext, useRef } from 'react';
import { Autocomplete, TextField } from '@mui/material';

import AppContext from '../../api/services/AppContext';

import './MenuIDSelector.css'

function MenuIDSelector({onSelectedMenuID }) {    // getSelectedMenuID is a function to set the selected menuID in the parent component.
  const menuData = useRef([{'label':'please wait','value':'none'}]); // expects [{'label':?,'value':<menu_id>},'default':<label of selected option>]} 
  const [selectedOption, setSelectedOption] = useState('');

  const { businessUID } = useContext(AppContext);

  const findOptionByMenuID = (targetMenuID) => {
    return menuData.current.find((option) => option.value === targetMenuID);
  };

  const populateMenuOptionsAndDefault = async (encodedTime) => {
    try {
        const response = await fetch (`${process.env.REACT_APP_LLM_ENDPOINT}/menus/get_as_options/${businessUID}/${encodedTime}`);
        if (response.ok){
            const content = await response.json();
            if (!content.payload || content.payload['options'].length===0){
                menuData.current=[{"label":"No menus found","value":"none"}];
            }
            if (content.payload && (content.payload['options'].length)>0){
                menuData.current=content.payload['options']; // Update the state with the API data
                const selected = findOptionByMenuID(content.payload.default);
                if (selected){
                    setSelectedOption(selected);
                    onSelectedMenuID(selected.value);// pass back to parent.
                } else {
                    setSelectedOption(menuData.current[0])
                    onSelectedMenuID(menuData.current[0].value);// pass back to parent.
                }
            }
        }
    }
    catch (err) {
        console.error('Failed to fetch menuData', err)
    }
}

  useEffect(() => {
    if (businessUID!=='' && businessUID!==null){
      const localTime = new Date();
      const utcTimeString = localTime.toISOString();
      const encodedTime = encodeURIComponent(utcTimeString);
      populateMenuOptionsAndDefault(encodedTime);
    }

  }, [businessUID]);

  // Handle changes in the dropdown selection
  const handleSelectChange = (event, newOption) => {
    setSelectedOption(newOption);
    onSelectedMenuID(newOption.value); // pass back to parent.
  };

  
  return (
    <> {/* Use conditional load to deal with asynchronous update of businessUID state. buisnessUID required before rendering. */}
       { (businessUID !=='' && businessUID !== null && selectedOption!=='') ? <Autocomplete 
            className='width_80_pct menuDropdown'
            options={menuData.current}
            getOptionLabel={(option) => option.label}
            value={selectedOption}
            autoHighlight
            onChange={handleSelectChange}
            renderInput={(params) => <TextField {...params} label="Selected Menu" />}
        />: 
        <p>Loading...</p>
       }
    </>


  );
}

export default MenuIDSelector;
