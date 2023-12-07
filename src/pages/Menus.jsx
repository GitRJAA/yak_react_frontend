import React, { useState, useRef } from 'react';

import MenuGallery from '../components/MenuComponents/MenuGallery';
import AddImageOptions from '../components/MenuComponents/AddImageOptions';
import CameraCapture from '../components/MenuComponents/CameraCapture';
import TextEditor from '../components/MenuComponents/TextEditor';
import ModalPopup from '../components/ModalPopup/ModalPopup';

import Smiley from "../assets/smiles.png";
import Twist from'../assets/twist_logo.png';

export default function Menus() {

    const subMenuOptions = ['gallery', 'camera','file','menu_metadata_editor']

    const [subMenu, setSubMenu] = useState('gallery')
    const menuID = useRef(null)
    const [modalMessage, setModalMessage] = useState('')

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
    
    const handleImageSelected = (menu_id) => {
      menuID.current = menu_id;
      setSubMenu('menu_metadata_editor');
    }

    const handleMenuChange = (option) => {
      if (subMenuOptions.includes(option)){
        setSubMenu(option)
      } else {
        console.log(`Attempt to navigate to invalid submenu of Menus tab: ${option}`)
      }
    }

    const handleOpenModal = (message) => {
      setModalMessage(message);
    }
    const handleClose = (action) => {
      setModalMessage('');
      setSubMenu("gallery");
    }

    return (
        <div className='menu'>
            <AddImageOptions onSubMenuChange={handleMenuChange} />
            <ModalPopup message={modalMessage} onClose={handleClose} />
            { subMenu === 'camera' && <CameraCapture />}
            { subMenu === "gallery" && <MenuGallery menu_sources={menu_none} onSelect={handleImageSelected} />}
            { subMenu === "menu_metadata_editor" && <TextEditor menu_id={menuID.current} showModal={handleOpenModal} />}
        </div>
      );
    }