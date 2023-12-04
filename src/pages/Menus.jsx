import React, {useContext, useState} from 'react';

import MenuGallery from '../components/MenuComponents/MenuGallery';
import AddImageOptions from '../components/MenuComponents/AddImageOptions';
import { AppContext } from "../api/services/AppContext";
import CameraCapture from '../components/MenuComponents/CameraCapture';


import Smiley from "../assets/smiles.png";
import Twist from'../assets/twist_logo.png';

export default function Menus() {

    const subMenuOptions = ['gallery', 'camera','file','editor']

    const [subMenu, setSubMenu] = useState('gallery')

  //Dependancy injection data
    const menus = [
        {
          name: 'Breakfast Menu',
          imageUrl: Smiley,
          timeRange: '6:00 AM - 10:30 AM'
        },
        {
            name: 'Breakfast Menu',
            imageUrl: Twist,
            timeRange: '6:00 AM - 10:30 AM'
          }
      ];

      const menu_none = null;
    
    const handleMenuChange = (option) => {
      if (subMenuOptions.includes(option)){
        setSubMenu(option)
      } else {
        console.log(`Attempt to navigate to invalid submenu of Menus tab: ${option}`)
      }
    }

    return (
        <div className='menu'>
            <AddImageOptions onSubMenuChange={handleMenuChange} />
            { subMenu === 'camera' && <CameraCapture />}
            { subMenu === "gallery" && <MenuGallery menu_sources={menu_none} />}

        </div>
      );
    }