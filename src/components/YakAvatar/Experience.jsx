import {
  CameraControls,
  ContactShadows,
  Environment,
} from "@react-three/drei";

import { useEffect, useRef } from "react";
import { useChat } from "./hooks/useChat";
import { Avatar } from "./Avatar";

const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();

  useEffect(() => {
    cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
    } else {
      cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
    }
  }, [cameraZoomed]);
  return (
    <>
        <CameraControls ref={cameraControls} />
        <Environment preset="sunset" />
          <Avatar />
        <ContactShadows opacity={0.7} />
    </>
  );
};

export default Experience;
