import React, { useState, useEffect, useContext, useRef } from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AppContext from '../../api/services/AppContext';

import './MenuIDSelector.css'

function MenuIDSelector({onSelectedMenuID}) {    // getSelectedMenuID is a function to set the selected menuID in the parent component.
  const menuData = useRef([{'label':'please wait','value':'none'}]); // expects {'payload':{'options':[{'label':?,'value':<menu_id>},'default':<label of selected option>]}
  const [selectedMenuID, setSelectedMenuID] = useState('');

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
                    setSelectedMenuID(selected.value);
                    onSelectedMenuID(selected.value);// pass back to parent.
                } else {
                    setSelectedMenuID(menuData.current[0].value)
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
    const localTime = new Date();
    const utcTimeString = localTime.toISOString();
    const encodedTime = encodeURIComponent(utcTimeString);
    populateMenuOptionsAndDefault(encodedTime);

  }, []);

  // Handle changes in the dropdown selection
  const handleSelectChange = (event) => {
    setSelectedMenuID(event.target.value);
    onSelectedMenuID(event.target.value); // pass back to parent.
  };

  return (
    <FormControl className="width_80_pct menuDropdown">
      <InputLabel>Menu</InputLabel>
      <Select
        value={selectedMenuID}
        onChange={handleSelectChange}
      >
        {menuData.current.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default MenuIDSelector;
