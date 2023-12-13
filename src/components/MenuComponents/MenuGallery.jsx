import React, { useState, useEffect, useContext } from 'react';
import { Box, Card, CardContent, IconButton, Typography, Grid, CircularProgress } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppContext from '../../api/services/AppContext';

import './MenuGallery.css'

export default function MenuGallery({menu_sources, onSelect }) {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const {businessUID} = useContext(AppContext)
    
  // Assume a common aspect ratio for all images, for example, 4:3
  const aspectRatio = (3 / 4) * 100; // This is for a 4:3 aspect ratio

  const showAllMenus = async () => {
    // Get all menus
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/menus/get_all/${businessUID}`); //Returns {"menus": List[Menus]
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const menusData = await response.json();
      if (menusData && menusData.menus.length !== 0){
        // base64 encoded image data can be directly rendered in browser without converting to blob.
        const menusWithBlobUrls = menusData.menus.map(menu => {
          return {
            'menu_id': menu.menu_id,
            'name': menu.name,
            'image_data':`data:image/png;base64,${menu.thumbnail_image_data}`};
        });
        setMenus(menusWithBlobUrls);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const delete_menu = async(menu_id) => {
    // TODO confirmation popup
    try {
      const response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/menus/delete_one/${businessUID}/${menu_id}`);
      console.log(response.ok)
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const ret = await response.json();
      if (ret.status === "success"){
        console.log(`OK: Deleted menu_id ${menu_id}`);
        showAllMenus();
      }
      else {
        console.log(`Failed: Failed to delete menu_id ${menu_id}, err: ${ret.message}`);
      }
    }
    catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (businessUID!==null && businessUID!==''){
      if (menu_sources){
        // If menu data directly passed in then use it. 
        setMenus(menu_sources);
      } else {
        // else get the list of Menu objects from the backend. 
        showAllMenus();
      }
    }
  }, [businessUID]);


  if (loading) return (
      <div className = "centerContainer">
        <CircularProgress />
      </div>
  )
  if (error) return (
    <div className = "centerContainer Error">
       <p>😳 Oops! {error}</p>
      </div>
  );

  const gridJustifyContent = menus.length < 3 ? 'center' : 'flex-start';


  return (
    <Box padding={2}>
      <Grid container spacing={2} justifyContent={gridJustifyContent}>
        {menus.map((menu, index) => (
          <Grid item xs={12} sm={6} lg={4} key={index}>
            <Card>
              <Box position="relative">
                <Box
                  style={{
                    paddingTop: `${aspectRatio}%`, // Maintain aspect ratio
                    position: 'relative'
                  }}
                >
                  <img
                    src={menu.image_data}
                    alt={menu.name}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
                <Box position="absolute" top={3} right={5} className='imageEditButtons'>
                <Tooltip title='edit menu data'>
                    <IconButton aria-label="edit" sx = {{ 
                            backgroundColor: '#FFFFFF', 
                            '&:hover':{
                              backgroundColor: 'lightgray', 
                            },
                            marginBottom: 5
                          }}
                          onClick = {() => onSelect(menu.menu_id)}
                        >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={menu.menu_id}>
                      <IconButton aria-label="delete" sx = {{ 
                              backgroundColor: '#FFFFFF', 
                              '&:hover':{
                                backgroundColor: 'lightgray'
                              }
                            }}
                            onClick={() => delete_menu(menu.menu_id)}
                      >
                      <DeleteIcon />
                  </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  {menu.name}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}



