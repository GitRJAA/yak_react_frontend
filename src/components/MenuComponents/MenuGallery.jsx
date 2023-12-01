import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, IconButton, Typography, Grid, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function MenuGallery({menu_sources, businessUid }) {
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    
  // Assume a common aspect ratio for all images, for example, 4:3
  const aspectRatio = (3 / 4) * 100; // This is for a 4:3 aspect ratio


  useEffect(() => {

    if (menu_sources){
      setMenus(menu_sources)
    } else {
        const fetchData = async () => {
          setLoading(true);
          try {
            const response = await fetch(`/get_menus?business_uid=${businessUid}`);
            if (!response.ok) {
              throw new Error(`Error: ${response.status}`);
            }
            const menusData = await response.json();

            // Assuming menusData is an array of objects with a property 'image' containing the image binary data
            const menusWithBlobUrls = menusData.map(menu => {
              const blob = new Blob([menu.image], { type: 'image/jpeg' }); // Adjust the MIME type as needed
              const imageUrl = URL.createObjectURL(blob);
              return { ...menu, imageUrl };
            });

            setMenus(menusWithBlobUrls);

          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        fetchData();
    }

    // Cleanup Blob URLs on component unmount
    return () => {
      menus.forEach(menu => URL.revokeObjectURL(menu.imageUrl));
    };

  }, [businessUid]);

  if (loading) return <CircularProgress />;
  if (error) return <p>Error: {error}</p>;

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
                    src={menu.imageUrl}
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
                <Box position="absolute" top={3} right={3}>
                  <IconButton aria-label="edit" sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          '&:hover':{
                            backgroundColor: 'lightgray'
                          }
                        }}
                      >
                    <EditIcon />
                  </IconButton>
                  <IconButton aria-label="delete" sx = {{ 
                          backgroundColor: '#FFFFFF', 
                          '&:hover':{
                            backgroundColor: 'lightgray'
                          }
                        }}
                      >
                        
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  {menu.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available: {menu.timeRange}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}



