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
    const [modalContext, setModalContext] = useState({'action':'','msg':'', 'type':''})   //Message to display, type of popup ['alter', 'error', 'wait']


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

    // Functions to deal with modal popup.
    const modalClose = {'action':'close', 'msg':'','type':''};

    const handlePopup = (context) => {
      // Context must be a dictiooary containing 'action', 'msg', 'type'
      if (context.action === "open"){
        setModalContext(context);
        if (context.type === 'ok'){
          setTimeout(()=>{
              setModalContext(modalClose)}, 1750);              
        }
      } else {
        setModalContext(modalClose);
      }
    }

    const handleFinalize = (newPage) => {
      setModalContext(modalClose);
      if (newPage !=='') {
        setSubMenu(newPage);
      }
    }

    return (
        <div className='menu'>
            <AddImageOptions onSubMenuChange={handleMenuChange} />
            <ModalPopup context={modalContext} onClose={handleFinalize} />
            { subMenu === 'camera' && <CameraCapture popUpHandlers={[handlePopup, handleFinalize]}/>}
            { subMenu === "gallery" && <MenuGallery menu_sources={menu_none} onSelect={handleImageSelected} />}
            { subMenu === "menu_metadata_editor" && <TextEditor menu_id={menuID.current} popUpHandlers={[handlePopup, handleFinalize]} />}
        </div>
      );
    }