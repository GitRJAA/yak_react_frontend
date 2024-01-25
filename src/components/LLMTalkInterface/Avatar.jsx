/* 
Everything related to avatar: .glb model rendering, animations, lipsync
*/

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useContext, useEffect, useRef, useState } from "react";

import { useAvatarContext } from "./hooks/useAvatar";
import { AppContext } from "../../api/services/AppContext";

import * as THREE from "three";

//Azure to Oculus viseme (best endevours) mapping
const azure_to_aculus_viseme_map = 
  ["viseme_sil", //0
  "viseme_aa",
  "viseme_aa",
  "viseme_O",
  "viseme_E",
  "viseme_I", //5
  "viseme_I",
  "viseme_U",
  "viseme_O",
  "viseme_aa",
  "viseme_O", //10
  "viseme_aa",
  "viseme_RR",
  "viseme_RR",
  "viseme_nn",
  "viseme_SS", //15
  "viseme_CH",
  "viseme_TH",
  "viseme_FF",
  "viseme_DD",
  "viseme_kk", //21
  "viseme_PP"]

  const facialExpressions = {
    default: {},
    smile: {
      browInnerUp: 0.17,
      eyeSquintLeft: 0.4,
      eyeSquintRight: 0.44,
      noseSneerLeft: 0.1700000727403593,
      noseSneerRight: 0.14000002836874015,
      mouthPressLeft: 0.61,
      mouthPressRight: 0.41000000000000003,
    }
  }

export function Avatar({onFetchData, queueHasData, audioContext,  props}) {

  const { avatarStatus, statusEnum, setAvatarStatus } = useAvatarContext();  //Shared avatar status across components
  const { sessionID } = useContext(AppContext); 

  /*******************************************
    Avatar Configurations
  *********************************************/

  //Avatar definition and animations.
  const { nodes, materials, scene } = useGLTF(
    //"/models/64f1a714fe61576b46f27ca2.glb"  <- Original
    "/models/AfroMale/AfroMale.glb"
  );

  const { animations } = useGLTF(
    //"/models/animations.glb"
    //"/models/AfroMale/AfroMaleAnimations.glb"
    "/models/AfroMale/animations_v2.glb"
  );
  
   

  const avatarConfig = useRef(null);     // Used for misc avatar configuration such as idle config.

  //Avatar config keys produced by get_avatar_config endpoint.
  const statusToConfigNameMapping = {};
  statusToConfigNameMapping[statusEnum.IDLE] = 'idle_config'
  statusToConfigNameMapping[statusEnum.SPEAKING] = 'speaking_config'
  statusToConfigNameMapping[statusEnum.LISTENING] = 'listening_config'

  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group); //Animations is list type object
  const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name); // Check if Idle animation exists otherwise use first animation


  /****************
  Lifecycle configurations
  *****************/

  const getAvatarConfig = async() => {
    if (!avatarConfig.current){
        // only load config once.
        let response = await fetch(`${process.env.REACT_APP_LLM_ENDPOINT}/agent/get_avatar_config/${sessionID}`);
        if (response && response.ok){
            const data = await response.json();
            avatarConfig.current = data.payload; //Dict of configurations {animation:, start: variation, single_use}
            console.log(`Avatar config: ${avatarConfig.current}`);
            setAvatarStatus(statusEnum.IDLE);  // Make sure that the timers are set up only after the config has been loaded.
            console.log('avatar');
          }
      }
    }
    useEffect(() => {
      getAvatarConfig();
    },[]);

  /*******************************************
    Audio 
  ********************************************/

  // used to hold the tuple of (audio source, visemes data)
  const dataTuple = useRef([]); 

  // Time since the audioContext started. The audioContext is only started once but it plays many chunks each of which marks time starting at zero. 
  // Use audioChunkOffset to zero audioContext playback time used within the viseme events for each chunk of audio.
  const audioChunkOffset = useRef(0); 

  // This hook starts and stops playing the audio according to 
  // the queueHasData prop passed from the LLMTalkInterface
  useEffect(() => {
    console.log('recieved audio data');
    //TODO make it possible to pass in an animation.
    if (!queueHasData){
          //setAnimation("Idle");
          //setAvatarStatus(statusEnum.IDLE);
          if (dataTuple.current.length!==0){
            // interrupt audio if something is playing.
            try {
              dataTuple.current.stop();
            } catch (error) {
              console.log('Stopping audio')
            }
            dataTuple.current = []; 
          }
          return;
    } else {
      playAudioChunk();
    }
  },[queueHasData]);

  const playAudioChunk = async () => {
    console.log('fetching data')
    dataTuple.current = await onFetchData(); // get the data (audio, json) from the queue higher in the heirarchy.
    if (dataTuple.current && dataTuple.current.length===2){
      dataTuple.current[0].onended = () => {
        playAudioChunk(); // keep fetching audio until exhausted
        setAvatarStatus(statusEnum.IDLE);
    };
      dataTuple.current[1]=JSON.parse(dataTuple.current[1])
        dataTuple.current[0].start(0); // start audio
        audioChunkOffset.current = audioContext.current.currentTime;
    }
  }

  /**********************************************
    Animation section 
  ************************************************/

  // Smoothly transition into any animation that is passed in.
  useEffect(() => {
    console.log(`Animation state changed to ${animation}`)
    actions[animation].setLoop(THREE.LoopOnce);
    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play();
    return () => {
        try {
          actions[animation].fadeOut(0.5);
        }
        catch {}
      }
  }, [animation]);


  // Lineraly interpolation the change in the state (value) of a morph target
  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );
      }
    });
  };

  const [blink, setBlink] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");

  useFrame(() => {
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return; // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    lerpMorphTarget("eyeBlinkLeft", blink  ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink  ? 1 : 0, 0.5);

    // LIPSYNC
    const appliedMorphTargets = [];
    if (dataTuple.current.length===2){
      const currentAudioTime = audioContext.current.currentTime-audioChunkOffset.current; //time in seconds. Zero'd to the start of current audioChunk.
      for (let i = 0; i < dataTuple.current[1].length; i++) {
        const mouthCue = dataTuple.current[1][i];
        if (
          currentAudioTime >= mouthCue.start &&
          currentAudioTime <= mouthCue.end
        ) {
          appliedMorphTargets.push(azure_to_aculus_viseme_map[mouthCue.value]);
          lerpMorphTarget(azure_to_aculus_viseme_map[mouthCue.value], 1, 0.25);
          break;
        }
      }
    }

    // Reset the values of the morphTargets not active during this period.
    Object.values(azure_to_aculus_viseme_map).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return;
      }
      lerpMorphTarget(value, 0, 0.1);
    });
  });

  /**************************
    Humanizing Animations
  ***************************/

  // Periodically blink.
  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Lifecycle animations such as idle routines, talking , listening etc. 
  //    A change in the avatarStatus trigger the scheduling of transitions between different animations corresponding to each phase of the status lifecycle.
  //    For example, 'Idle' should progress from still, to fidgiting, to using phone to sitting etc.

  // A list of timers that is used for unloading them when the component renders or unloads.
  // {'id': timer id, 'expiration': time in ms (form 1970)}
  const lifecycleTimers = useRef([]);

  const createSingleShotTimer = (stage) => {
        //Schedule the animation just the once.
        const random_start = (1+Math.random()*stage['variation'])*stage['start']*1000;

        const newTimeout = setTimeout(()=>{
          console.log(`Start animation ${stage['animation']}, start_time: ${random_start} `)
          setAnimation(stage['animation']);
        }, random_start
      );
      lifecycleTimers.current.push(newTimeout);
    }

  const createRepeatTimer = (stage) => {
      // Nested timers so that cycle repeats. Using setTimer
      const cycle_length = (stage.hasOwnProperty('cycle') ? stage['cycle']:600)*1000; //Required
      const random_start = () => {
        if (stage['start']===0){
          return 0; //If starting immediately then don't vary the start time.
        }
        return (1+Math.random()*stage['variation'])*stage['start']*1000; //Start is minimum start time. Variation only ever extends start time.
      }
      const random_cycle_start = () =>{
        const ret = cycle_length-random_start(); // The start delay until the beginning of the next cycle when the random start will be scheduled.
        console.log(`Cycle restart time set to ${ret} for ${stage['animation']}`);
        return ret;
      }
      let newTimer, repeatTimer;

      const first = random_start();
      const second = random_cycle_start();

      const nextCycle = () => {
      newTimer = setTimeout(()=>{
            console.log(`Start animation ${stage['animation']} `);
            setAnimation(stage['animation']);
              //nested timer triggers the repeat of cycle
              repeatTimer = setTimeout(() => {
                console.log(`Call repeat animation ${animation}`);
                cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
                nextCycle();
              },second);
            lifecycleTimers.current.push({'id':repeatTimer,'expiration':(Date.now()+2*cycle_length)});  //Worst case expiration assuming variation<1.0
          }, first);
        lifecycleTimers.current.push({'id':newTimer,'expiration':(Date.now()+cycle_length)});
        }
      nextCycle();
  }  
  const cleanLifecycleTimerList = () => {
    const initialQueueLength = lifecycleTimers.current.length;
    if (initialQueueLength===0){
      return;
    }
    let tempQueue=[];
    //LifecycleTimers is appended to asynchronously so its possible that timers will be added while the clean up is happening. 
    //To avoid this, we effectively freeze the queue, duplicate valid timer ids on the queue then drop the frozen section.
    lifecycleTimers.current.forEach((lifeCycleTimer) => {
      if (lifeCycleTimer['expiration']>Date.now()){
        tempQueue.push(lifeCycleTimer); // duplicate valid ones.
      }
    });
    //Drop the old ones.
    lifecycleTimers.current = lifecycleTimers.current.concat(tempQueue);
    lifecycleTimers.current.splice(0,initialQueueLength); //Mutates the object inplace!
    console.log(`Timer queue length: ${lifecycleTimers.current.length}`);
  }
  const clearAllLifecycleTimers = () => {
    if (lifecycleTimers.current){
      lifecycleTimers.current.forEach( (lifeCycleTimer) => {
        clearTimeout(lifeCycleTimer);
      });
      
    }
  }
 
  // Create the timers for the lifecycle stage.
  useEffect(() => {
    //debugger;
    if (statusToConfigNameMapping.hasOwnProperty(avatarStatus) 
          && avatarConfig.current.hasOwnProperty(statusToConfigNameMapping[avatarStatus])){
          //There is an entry in avatarConfig for the animation sequence for this avatarStatus
          // Create an array of timers.
          avatarConfig.current[statusToConfigNameMapping[avatarStatus]].forEach((stage) => {
            //check the named animation is available and if not then skip it
            if (animations.find((a) => a.name === stage['animation'])) {
                if (!stage.hasOwnProperty('cycle') || stage['cycle'] <=0) {
                  console.log(`creating singleshot timer for ${stage}`);
                  createSingleShotTimer(stage);
              } else {
                console.log(`Creating repeatTimer for ${stage} `);
                createRepeatTimer(stage);
                //createSingleShotTimer(stage);
              }
            }
          });
    }
    return () => clearAllLifecycleTimers(); //Cleanup on change of avatarStatus
  },[avatarStatus]
);

 
  /******************************
   Model Component
  ********************************/

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
{/*       <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group> */}
    <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      </group>
  );
}

/* useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb"); */

useGLTF.preload("/models/AfroMale/AfroMale.glb");
useGLTF.preload("/models/AfroMale/animations_v2.glb")