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

  const { statusEnum, avatarStatusRef, setAvatarStatus } = useAvatarContext();  //Shared avatar status across components
  const { sessionID } = useContext(AppContext); 

  const avatarLastStatus = useRef(null); // Used to detect change in the status.

  /*******************************************
    Avatar Configurations
  *********************************************/

  //Avatar definition and animations.
  const { nodes, materials, scene } = useGLTF(
    //"/models/MangaGirl/64f1a714fe61576b46f27ca2.glb"
    //"/models/AfroMale/AfroMale.glb"
    //"/models/Matt/Matt.glb"
    "/models/AvaturnMatt/AvaturnMatt.glb"
  );

  const { animations } = useGLTF(
    //"/models/MangaGirl/animations.glb"
    //"/models/AfroMale/animations_v2.glb"
    //"/models/Matt/MattAnimations.glb"
    "/models/AvaturnMatt/AvaturnMattAnimationsv3.glb"
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
  // An Idle default is provided. 
  // Note: The animation and animationRef hiold the same value. Duplication was required for access to the current animation value inside the setInterval function
  //       which holds a reference to the used values at the time the timer is created not when its executed. setAnimation inside the timer appears to update the the state variable correctly
  //       TODO fix this workaround. Use ref as source of truth and convert the status an update funcition that forces the update.
  const [animation, setAnimation] = useState({"animation":"Still","fadeIn":0.5,"fadeOut":0.5,"reps":-1 });
  const animationRef = useRef({"animation":"Still","fadeIn":0.5,"fadeOut":0.5,"reps":-1 });

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
            avatarStatusRef.current = statusEnum.IDLE;  // Make sure that the timers are set up only after the config has been loaded.
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
          if (avatarStatusRef.current===statusEnum.SPEAKING){
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
  // WARNING: Fading in and fading out the same animation will cause the animation to glitch, temporarily resetting it to the default pose. 
  //           For this reason, do not change animation direction. Always use the animationSetter function which ensures that this will not happen.
  // animation: str|Array[Arrary[]] can be either a single or composite.
  // If a composite, then the format of the inner Array is [animation name:str, fadeInTime:int, fadeOutTime:int]
  //  where fadeInTime and fadeOutTime are the time in seconds relative to the start and end of the animation. 

  useEffect(() => {
    if (!animation || animation === "" || animation === undefined || (Object.keys(animation).length === 0)){
      return;
    }
    let _animation = animation;
 
    if (typeof animation === 'string'){
      // If just the name of the animation is passed in then set defaults.
      _animation = {'animation':animation,'fadeInTime':(mixer.stats.actions.inUse === 0 ? 0 : 0.5),"fadeOutTime":0.5,"reps":1}
    }
    console.log(`FadeIn ${_animation['animation']} @ ${Date.now()}; ${animation['fadeOutTime']}, ${animation['fadeInTime']}`);
    let reps = _animation['reps']===1 ? THREE.LoopOnce : THREE.LoopRepeat;
    actions[_animation['animation']].clampWhenFinished = true;
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

  const animationSetter = (newAnimation) => {
    // Only process the animation change if the _animation['animation'] value has changed.
    // This is required to avoid rerendering the same animation and trying to simultaneously fade it out and in which leads to stuttering. 
    if (newAnimation){
      if (newAnimation['animation'] !== animationRef.current['animation']){
        animationRef.current = newAnimation;
        setAnimation(newAnimation);
      }
    }
  }

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
    //debugger;
      Object.keys(nodes.Head_Mesh.morphTargetDictionary).forEach((key) => {
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
            avatarStatusRef.current = stage['status'];
          } else {
            console.log(`Fire animation (Tag=${tag}): ${stage['animation']}, start_time: ${random_start} `);
          //setAnimation(stage['animation']);
          animationSetter(stage['animation'])
          }
        }, random_start, tag
      );
      lifecycleTimers.current.push({"id":newTimeout,"expiration":Date.now()+random_start+200});
      cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
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
            animationSetter(stage['animation']);
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
        console.log(`Fire : (Composite timer group key: ${tag}, setAnimation:${stage['animation'][i][0]}, passedInCurrentAnimation : ${animation}`)
        const newAnimation = {"animation":stage['animation'][i][0],"fadeInTime":stage['animation'][i][1],"fadeOutTime":stage['animation'][i][2],"reps":stage['animation'][i][3]};
        console.log(`InsideTimer: newAnimation: ${JSON.stringify(newAnimation)}, current animationRef:${animationRef.current}`);
        animationSetter(newAnimation);
      },startTime, tag);
      lifecycleTimers.current.push({'id':newSubStageTimer,"expiration":Date.now()+startTime+200});
      console.log(`Push timerID: ${newSubStageTimer}, expiration: ${Date.now()+startTime+200}, timerlist:${lifecycleTimers.current}`);
    }
      cleanLifecycleTimerList();  //maintain the queue so that it doesn't cause memory leak.
  }

  const cleanLifecycleTimerList = () => {
    //Clear expired timers that have been used by animations.
    const initialQueueLength = lifecycleTimers.current.length;
    if (initialQueueLength===0){
      return;
    }
    let tempQueue=[];
    //LifecycleTimers is appended to asynchronously so its possible that new animation timers will be added while the cleanup is happening. 
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
    // Clear all timers. Used on state change to clear any queued up animation sequences.
    if (lifecycleTimers.current){
      const initialQueueLength = lifecycleTimers.current.length;
      lifecycleTimers.current.forEach( (lifeCycleTimer) => {
        clearTimeout(lifeCycleTimer['id']);
      });
    lifecycleTimers.current.splice(0,initialQueueLength); //Mutates the object inplace!
    }
  }

const onStatusChange = () => {
    // Callback to handle status change. 
    // Responsible for co-ordinating the sequence of timers to execute the animation sequences. 
    console.log(`onStatusChange: Unloading all timers: previous status ${avatarStatusRef.current}`);
    clearAllLifecycleTimers();

    if (statusToConfigNameMapping.hasOwnProperty(avatarStatusRef.current) 
    && avatarConfig.current.hasOwnProperty(statusToConfigNameMapping[avatarStatusRef.current])){
    // Makesure the seuqence of animations is an Array. Its permitted for just a single animation to be entered in the avatarConfiguration settings UI.
    if (!Array.isArray(avatarConfig.current[statusToConfigNameMapping[avatarStatusRef.current]])){
      avatarConfig.current[statusToConfigNameMapping[avatarStatusRef.current]] = [avatarConfig.current[statusToConfigNameMapping[avatarStatusRef.current]]];
    }

    avatarConfig.current[statusToConfigNameMapping[avatarStatusRef.current]].forEach((stage) => {
      //Deal with a state change stage with the avartarStatus configuration. e.g {"idle_config":[{"state":,...}]}
      if (stage['status']){
        console.log(`Schedule state change`);
        createSingleShotTimer(stage);
      } else {
          //Animation sequence e.g {"idle_config":[{"animation":,...}]}
          if (Array.isArray(stage['animation'])){
            //If the animation value is an Array then its a composite animation which is a slist of list of tuples [["animation_name",fade in time in (s), fadeout time(s), "reps": -1 (loop infinitely) or 1 (just once)],...]
            //TODO check that all animations are available.
            //console.log('creating composite animation');
            createCompositeAnimationTimers(stage);
          } else {
            // Else its a single animation.
            if (animations.find((a) => a.name === stage['animation'])) {
              if (!stage.hasOwnProperty('cycle') || stage['cycle'] <=0) {
                //console.log(`creating singleshot timer for ${stage}`);
                createSingleShotTimer(stage);
            } else {
              console.log(`Creating repeatTimer for ${stage} `);
              createRepeatTimer(stage);
              //createSingleShotTimer(stage);
            }
          }
        }
      }
    }
  );

  }
};

useEffect(()=>{
  // This timer poll the status Ref object to check for changes. 
  // This was created to avoid the re-renders that are caused by implementing the same with state objects.
  
  console.log('Create statusPoll timer');
  const pollStatusTimer = setInterval(() => {
    console.log(`check status ${avatarStatusRef.current}, last: ${avatarStatusRef.current}`);
    if (avatarStatusRef.current || avatarLastStatus.current){
      if (avatarStatusRef.current !== avatarLastStatus.current){
        console.log('status change detected')
        avatarLastStatus.current = avatarStatusRef.current;
        onStatusChange();
      }
    }
  }, 500);
  return () => clearInterval(pollStatusTimer);
},[]);

 
  /******************************
   Model Component
  ********************************/

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

/* useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb"); */

//useGLTF.preload("/models/AfroMale/AfroMale.glb");
//useGLTF.preload("/models/AfroMale/animations_v2.glb")
//useGLTF.preload("/models/AfroMale/AfroMaleAnimationsv2.glb")

/* useGLTF.preload("/models/Matt/Matt.glb");
useGLTF.preload("/models/Matt/MattAnimations.glb"); */

useGLTF.preload("/models/AvaturnMatt/AvaturnMatt.glb");
useGLTF.preload("/models/AvaturnMatt/AvaturnMattAnimationsv3.glb")