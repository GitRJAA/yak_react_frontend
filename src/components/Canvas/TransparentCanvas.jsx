import React from 'react';
import { Canvas } from '@react-three/fiber';


const TransparentCanvas = ({ children, ...props }) => {

  return (
    <Canvas
        style={{ background: 'transparent'}}
        {...props}>
      {/* Your 3D scene components */}
      {children}
    </Canvas>
  );
};

export default TransparentCanvas;