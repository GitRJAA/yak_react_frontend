const AvaturnMatt = ({group, nodes, materials, ...props}) => {

return (
<group ref={group} {...props} dispose={null}>
          <primitive object={nodes.Hips} />
          <skinnedMesh
            name="Body_Mesh"
            geometry={nodes.Body_Mesh.geometry}
            material={materials.Body}
            skeleton={nodes.Body_Mesh.skeleton}
          />
          <skinnedMesh
            name="Eye_Mesh"
            geometry={nodes.Eye_Mesh.geometry}
            material={materials.Eyes}
            skeleton={nodes.Eye_Mesh.skeleton}
            morphTargetDictionary={nodes.Eye_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Eye_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="EyeAO_Mesh"
            geometry={nodes.EyeAO_Mesh.geometry}
            material={materials.EyeAO}
            skeleton={nodes.EyeAO_Mesh.skeleton}
            morphTargetDictionary={nodes.EyeAO_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.EyeAO_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="Eyelash_Mesh"
            geometry={nodes.Eyelash_Mesh.geometry}
            material={materials.Eyelash}
            skeleton={nodes.Eyelash_Mesh.skeleton}
            morphTargetDictionary={nodes.Eyelash_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Eyelash_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="Head_Mesh"
            geometry={nodes.Head_Mesh.geometry}
            material={materials.Head}
            skeleton={nodes.Head_Mesh.skeleton}
            morphTargetDictionary={nodes.Head_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Head_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="Teeth_Mesh"
            geometry={nodes.Teeth_Mesh.geometry}
            material={materials.Teeth}
            skeleton={nodes.Teeth_Mesh.skeleton}
            morphTargetDictionary={nodes.Teeth_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Teeth_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="Tongue_Mesh"
            geometry={nodes.Tongue_Mesh.geometry}
            material={materials.Teeth}
            skeleton={nodes.Tongue_Mesh.skeleton}
            morphTargetDictionary={nodes.Tongue_Mesh.morphTargetDictionary}
            morphTargetInfluences={nodes.Tongue_Mesh.morphTargetInfluences}
          />
          <skinnedMesh
            name="avaturn_hair_0"
            geometry={nodes.avaturn_hair_0.geometry}
            material={materials.avaturn_hair_0_material}
            skeleton={nodes.avaturn_hair_0.skeleton}
          />
          <skinnedMesh
            name="avaturn_hair_1"
            geometry={nodes.avaturn_hair_1.geometry}
            material={materials.avaturn_hair_1_material}
            skeleton={nodes.avaturn_hair_1.skeleton}
          />
          <skinnedMesh
            name="avaturn_shoes_0"
            geometry={nodes.avaturn_shoes_0.geometry}
            material={materials.avaturn_shoes_0_material}
            skeleton={nodes.avaturn_shoes_0.skeleton}
          />
          <skinnedMesh
            name="avaturn_look_0"
            geometry={nodes.avaturn_look_0.geometry}
            material={materials.avaturn_look_0_material}
            skeleton={nodes.avaturn_look_0.skeleton}
          />

    </group>
);

}


export default AvaturnMatt;