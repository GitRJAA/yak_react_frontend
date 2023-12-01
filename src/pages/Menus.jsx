import React, {useContext} from 'react';

import MenuGallery from '../components/MenuComponents/MenuGallery';
import AddImageOptions from '../components/MenuComponents/AddImageOptions';
import { AppContext } from "../api/services/AppContext";

import Smiley from "../assets/smiles.png";
import Twist from'../assets/twist_logo.png';

export default function Menus() {

    const businessUID = useContext(AppContext)

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

    return (
        <div className='menu'>
            <AddImageOptions businessUid={businessUID} />
            <MenuGallery menu_sources={menus} businessUid={businessUID}/>
        </div>
      );
    }