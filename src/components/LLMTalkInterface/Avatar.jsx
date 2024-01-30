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

  //const { avatarStatus, statusEnum, setAvatarStatus } = useAvatarContext();  //Shared avatar status across components
  const { statusEnum } = useAvatarContext();  //Shared avatar status across components
  const { sessionID } = useContext(AppContext); 

  const [avatarStatus, setAvatarStatus] = useState("");

  /*******************************************
    Avatar Configurations
  *********************************************/

  //Avatar definition and animations.
  const { nodes, materials, scene } = useGLTF(
    //"/models/64f1a714fe61576b46f27ca2.glb"  <- Original
    "/models/AfroMale/AfroMale.glb"
    //"/models/Matt/Matt.glb"
  );

  const { animations } = useGLTF(
    //"/models/animations.glb"
    //"/models/AfroMale/AfroMaleAnimations.glb"
    "/models/AfroMale/animations_v2.glb"
    //"/models/Matt/MattAnimations.glb"
    //"/models/AvaturnMatt/AvaturnMatt.glb"
  );
  
   

  const avatarConfig = useRef(null);     // Used for misc avatar configuration such as idle config.

  //Avatar config keys produced by get_avatar_config endpoint.
  const statusToConfigNameMapping = {};
  statusToConfigNameMapping[statusEnum.IDLE] = 'idle_config'
  statusToConfigNameMapping[statusEnum.SPEAKING] = 'speaking_config'
  statusToConfigNameMapping[statusEnum.LISTENING] = 'listening_config'

  const group = useRef();
  const { actions, mixer } = useAnimations(animations, group); //Animations is list type object


  // animation: str| Array[Array[]] depending whether its a single animation or a composite one. See createCompositeAnimation for details.
  //const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name);
  const [animation, setAnimation] = useState("");

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
            console.log(`Init avatarStatus: IDLE`);
            setAvatarStatus(statusEnum.IDLE);  // Make sure that the timers are set up only after the config has been loaded.
            console.log('Animations available:');
            animations.forEach((a)=>{console.log(a.name)});
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
    if (!queueHasData){
          if (avatarStatus===statusEnum.SPEAKING){
            console.log('avatarStatus=> LISTENING; after speaking')
            setAvatarStatus(statusEnum.LISTENING);
          }
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
      console.log('avatarStatus => SPEAKING; on queueHasData' );
      setAvatarStatus(statusEnum.SPEAKING);
      playAudioChunk();
    }
  },[queueHasData]);

  const playAudioChunk = async () => {
    dataTuple.current = await onFetchData(); // get the data (audio, json) from the queue higher in the heirarchy.
    if (dataTuple.current && dataTuple.current.length===2){
      dataTuple.current[0].onended = () => {
        playAudioChunk(); // keep fetching audio until exhausted
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
  // animation: str|Array[Arrary[]] can be either a single or composite.
  // If a composite, then the format of the inner Array is [animation name:str, fadeInTime:int, fadeOutTime:int]
  //  where fadeInTime and fadeOutTime are the time in seconds relative to the start and end of the animation. 
  // Note: All aniamtions loop infinitely.

  useEffect(() => {
    if (!animation || animation === ""){
      return;
    }

    let _animation = animation;
 
    if (typeof animation === 'string'){
      // If just the name of the animation is passed in then set defaults.
      _animation = {'animation':animation,'fadeInTime':(mixer.stats.actions.inUse === 0 ? 0 : 0.5),"fadeOutTime":0.5,"reps":1}
    }
    console.log(`FadeIn ${_animation['animation']} @ ${Date.now()}; ${animation['fadeOutTime']}, ${animation['fadeInTime']}`);
    let reps = _animation['reps']===1 ? THREE.LoopOnce : THREE.LoopRepeat;
    //actions[_animation['animation']].clampWhenFinished = true;
    actions[_animation['animation']]
      .setLoop(reps)
      .reset()
      .fadeIn(_animation['fadeInTime'])
      .play();
    return () => {
        try {
          console.log(`Fadeout ${_animation['animation']} @ ${Date.now()}; ${animation['fadeOutTime']}, ${animation['fadeInTime']}`);
          actions[_animation['animation']].fadeOut(_animation['fadeOutTime']);
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
  //
  // Note: All animations will loop infinitely until animation state variable changes. So to reset to 'idle', idle must be scheduled.

  // A list of timer ids that is used for unloading them when the component renders or unloads.
  // {'id': timer id, 'expiration': time in ms (form 1970)}
  const lifecycleTimers = useRef([]);

  const createSingleShotTimer = (stage) => {
        //Schedule the animation/ status change just the once.
        const random_start = (1+Math.random()*stage['variation'])*stage['start']*1000;
        const tag = (1+Math.random()).toString(36).substring(7);

        const newTimeout = setTimeout(()=>{
          console.log(`Fire status change (Tag=${tag}): ${stage['status']}, start_time: ${random_start} `);
          if (stage['status']){
            setAvatarStatus(stage['status']);
          } else {
            console.log(`Fire animation (Tag=${tag}): ${stage['animation']}, start_time: ${random_start} `);
          setAnimation(stage['animation']);
          }
        }, random_start, tag
      );
      lifecycleTimers.current.push({"id":newTimeout,"expiration":Date.now()+random_start+200});
      //cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
    }

  const createRepeatTimer = (stage) => {
      // Nested timers so that cycle repeats.
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
                //cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
                nextCycle();
              },second);
            lifecycleTimers.current.push({'id':repeatTimer,'expiration':(Date.now()+2*cycle_length)});  //Worst case expiration assuming variation<1.0
          }, first);
        lifecycleTimers.current.push({'id':newTimer,'expiration':(Date.now()+cycle_length)});
        }
      nextCycle();
  }  

  const createCompositeAnimationTimers = (stage) => {
  //Composite animations are specified as list of lists [[animation name:str,fadeInTimeInSeconds:int, fadeOutTimeInSeconds:int, reps: int],...]
  // If reps === -1 , then this means loop infinitely.

  //These are a sequence of animations with deterministic start times that can be dealt with as a single animation.
    
    const randomStart = (1+Math.random()*stage['variation'])*stage['start']*1000;
    const tag = (Math.random() + 1).toString(36).substring(7);

    let fadeInStartDelta = 0; // The time at which the next animation should fade in.
    let cummPrevAnimationDurations = 0; //
    //Ensure that the animation is a list of lists if only a single list was passed in.
    if (!Array.isArray(stage['animation'][0])){
      stage['animation'] = [stage['animation']];      
    }

    for (let i=0; i< stage['animation'].length; i++){
      if (stage['animation'][i].length<3){
        continue;
      }
      if (stage['animation'].length === 3)  {
        stage['animation'][i].push(1); //Default to 1 rep
      }

      if (i>0){
        //The current animation should cross-fade with the previous at the fade-out time before the end of the previous animation.
        //Note duration is returned in seconds.
        fadeInStartDelta = -stage['animation'][i][1]*1000;
        cummPrevAnimationDurations += animations.find((a)=> a.name === stage['animation'][i-1][0]).duration*1000+fadeInStartDelta;  // get duration of previous animation in the composite animatino list
      }
      
      const startTime = randomStart+cummPrevAnimationDurations;
      console.log(`Create Composite Anim. Timer (Tag =${tag}): schedule ${stage['animation'][i][0]} @ ${startTime}: ${randomStart}:${cummPrevAnimationDurations}:${fadeInStartDelta}`);
      const newSubStageTimer = setTimeout(() => {
        console.log(`Fire : (Composite timer group key: ${tag}, setAnimation:${stage['animation'][i][0]}`)
        setAnimation({"animation":stage['animation'][i][0],"fadeInTime":stage['animation'][i][1],"fadeOutTime":stage['animation'][i][2],"reps":stage['animation'][i][3]});
      },startTime, tag);
      lifecycleTimers.current.push({'id':newSubStageTimer,"expiration":Date.now()+startTime+200});
      console.log(`Push timerID: ${newSubStageTimer}, expiration: ${Date.now()+startTime+200}, timerlist:${lifecycleTimers.current}`);
    }
      //cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
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
  }
  const clearAllLifecycleTimers = () => {
    if (lifecycleTimers.current){
      const initialQueueLength = lifecycleTimers.current.length;
      lifecycleTimers.current.forEach( (lifeCycleTimer) => {
        clearTimeout(lifeCycleTimer['id']);
      });
    lifecycleTimers.current.splice(0,initialQueueLength); //Mutates the object inplace!
    }
  }
 
  // Create the timers for the lifecycle stage.
  // Lifecycle timers for scheduling sequences of animations and state changes. 
  useEffect(() => {
    if (statusToConfigNameMapping.hasOwnProperty(avatarStatus) 
          && avatarConfig.current.hasOwnProperty(statusToConfigNameMapping[avatarStatus])){
          //There is an entry in avatarConfig for the animation sequence for this avatarStatus
          // Create an array of timers.
          if (!Array.isArray(avatarConfig.current[statusToConfigNameMapping[avatarStatus]])){
            avatarConfig.current[statusToConfigNameMapping[avatarStatus]] = [avatarConfig.current[statusToConfigNameMapping[avatarStatus]]];
          }
          avatarConfig.current[statusToConfigNameMapping[avatarStatus]].forEach((stage) => {
            //Deal with a state change stage
            if (stage['status']){
              console.log(`Schedule state change`)
              createSingleShotTimer(stage);
            } else {
              //Animation sequence
              if (Array.isArray(stage['animation'])){
                //Then its a composite animation
                //Composite animations are specified as list of lists [["animation_name",fade in time in (s), fadeout time(s)],...]
                //TODO check that all animations are available.
                console.log('creating composite animation');
                createCompositeAnimationTimers(stage);
              } else {
                // Else its a single animation.
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
            }
          }
        });
    }
    return () => {console.log(`Unloading all timers: previous status ${avatarStatus}`);clearAllLifecycleTimers();} //Cleanup on change of avatarStatus
  },[avatarStatus]
);

 
  /******************************
   Model Component
  ********************************/

  return (
/*     /*<group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
       <skinnedMesh
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
    </group> } */

   <group {...props} dispose={null} ref={group}>
    <primitive object={nodes.Hips} />
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
{/*       <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      /> */}
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
{/*       <skinnedMesh
        name="Wolf3D_Beard"
        geometry={nodes.Wolf3D_Beard.geometry}
        material={materials.Wolf3D_Beard}
        skeleton={nodes.Wolf3D_Beard.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Beard.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Beard.morphTargetInfluences}
      /> */}
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

/* useGLTF.preload("/models/Matt/Matt.glb");
useGLTF.preload("/models/Matt/MattAnimations.glb"); */

//useGLTF.preload("/models/AvaturnMatt/AvaturnMatt.glb");
//useGLTF.preload("/models/AvaturnMatt/AvaturnAnimations.glb")