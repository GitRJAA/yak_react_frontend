/* 
Everything related to avatar: .glb model rendering, animations, lipsync
*/

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useContext, useEffect, useRef, useState } from "react";

import { useAvatarContext } from "./hooks/useAvatar";
import { AppContext } from "../../api/services/AppContext";
import AvaturnMatt from "./AvatarCollection/AvaturnMatt";

import * as THREE from "three";
import AfroMale from "./AvatarCollection/AfroMale";
import MattsHead from "./AvatarCollection/MattsHead";


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

  const { statusEnum, avatarStatusRef, setAvatarStatus, avatarDefinition } = useAvatarContext();  //Shared avatar status across components
  const { sessionID } = useContext(AppContext); 

  const avatarLastStatus = useRef(null); // Used to detect change in the status.
  const referenceSkinnedMesh = useRef(null); // Use to store the first skinned mesh in the model. Skinned meshes contain all the bendshapes/visemes.

  /*******************************************
    Avatar Configurations
  *********************************************/
  //Avatar definition and animations.
  const { nodes, materials, scene } = useGLTF(
    avatarDefinition['model']
  );

  const { animations } = useGLTF(
    avatarDefinition['animations']
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
    if (!referenceSkinnedMesh.current){
      // Get a skinnned mesh from the model because that will contain all the visemes and blendshapes.
          Object.keys(nodes).forEach((node) => {
          if ( (nodes[node].isSkinnedMesh=== true) && (nodes[node].morphTargetDictionary !== undefined)){
            referenceSkinnedMesh.current = nodes[node];
            return;
          }
        });
      }
    if (!referenceSkinnedMesh.current){
      throw new Error(" No skinned meshes found in the model.A skinned mesh with morphtargets is needed to acces the morphTargets for visemes and blendshapes");
    }
      Object.keys(referenceSkinnedMesh.current.morphTargetDictionary).forEach((key) => {
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

    lerpMorphTarget("eyeBlinkLeft", blink  ? blinkAmount.current : 0, 0.6);
    lerpMorphTarget("eyeBlinkRight", blink  ? blinkAmount.current : 0, 0.6);

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
          lerpMorphTarget(azure_to_aculus_viseme_map[mouthCue.value], 0.9, 0.29);
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
  const blinkAmount = useRef(0.5);
  // Periodically blink.
  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        if (Math.random()<0.4){
          blinkAmount.current  = 0.8;
        } else {
          blinkAmount.current = 1.0;
        }
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 6000));
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
  //Composite animations are specified as list of lists. These are a sequence of animations with deterministic start times that can be dealt with as a single animation.
  //
  // args@: stage: [[animation:str,fadeInTimeInSeconds:int, fadeOutTimeInSeconds:int, reps: int],...]
  //                'animation': name of animation. If the special character '>' is not present then this is treated as the name of the animation.
  //                           : If '>' is present, the transition operator, then it indicates that the target animation should only be created 
  //                             if the source animation is the animation at the time the timer is created. e.g if animation === 'Sitting>SitToStand' then this will 
  //                             schedule the SitToStand animation if the animation at the time the interval timer is created is Sitting. As avatar status changes always delete future timers (resets animations)
  //                             The animation at the time of the state change will be the one animatino at the time the new times will fire.
  //                'fadeInTimeInSecond' and 'fadeOutTimeInSeconds is the time in seconds that the consecutive animations will cross fade. The second animation
  //                            will begin fading in at its fadeouttimeinseconds prior to the end of the last animationclips end. Typically the fadeout and fadein times
  //                            of suebsequent animations should be equal. If not, then this can lead to stuttering as the first animation finishes and reverts to the default pose (typically a T pose)
  //                'reps' : int : Either -1,1 . Number of repartitions. -1 for infinte looping , 1 for a single iterations.  
    
    const randomStart = (1+Math.random()*stage['variation'])*stage['start']*1000;
    const tag = (Math.random() + 1).toString(36).substring(7);

    let fadeInStartDelta = 0; // The time at which the next animation should fade in.
    let cummPrevAnimationDurations = 0; //
    let initialAnimation = animation;  // Snapshot of the name of the animation running at the time the timer is created. 

    const conditionOperator = />/;  //Seperator for conditional animation transition.

    //Ensure that the animation is a list of lists if only a single list was passed in.
    if (!Array.isArray(stage['animation'][0])){
      stage['animation'] = [stage['animation']];      
    }

    let _stage = {"animation":[]}; //Local copy of composite animation definition.
    // Deal with conditional animation transitions if relevant.
    for (let i=0; i< stage['animation'].length; i++){
      if (conditionOperator.test(stage['animation'][i][0])){
        // Evaluate the conditional.
        const animationSplit = stage['animation'][i][0].split(conditionOperator);
        if (animationSplit[0].trim()!==initialAnimation){
          console.log(`Skip animation substage ${stage['animation']}`);
          return;              
        } else {
          
          let newSubStage = [...stage['animation'][i]]; //make a copy of the list.
          newSubStage[0]=animationSplit[1]; // replace conditional with target animation,
          _stage['animation'].push(newSubStage);
        }
      } else {
        _stage['animation'].push(stage['animation'][i]);  // else just add the existing stage.
      }
    }

    // Loop over the preprocessed substages of teh composite animation and schedul the timers to fire the animation transitions.
    for (let i=0; i< _stage['animation'].length; i++){
      if (_stage['animation'][i].length<3){
        continue;
      }
      if (_stage['animation'].length === 3)  {
        stage['animation'][i].push(1); //Default to 1 rep
      }

      if (i>0){
        //The current animation should cross-fade with the previous at the fade-out time before the end of the previous animation.
        fadeInStartDelta = -_stage['animation'][i][1]*1000;
        cummPrevAnimationDurations += animations.find((a)=> a.name === _stage['animation'][i-1][0]).duration*1000+fadeInStartDelta;  // get duration of previous animation in the composite animatino list
      }
      
      const startTime = randomStart+cummPrevAnimationDurations;
      console.log(`Create Composite Anim. Timer (Tag =${tag}): schedule ${_stage['animation'][i][0]} @ ${startTime}: ${randomStart}:${cummPrevAnimationDurations}:${fadeInStartDelta}`);

      const newSubStageTimer = setTimeout(() => {
        // Create a setTimer() object to fire an animation change.
        // @args: tag : str: unique identifier of this group of animations.
        //        startTime: absolutetime (in ms) when the timer should fire.
        console.log(`Fire : (Composite timer group key: ${tag}, setAnimation:${_stage['animation'][i][0]}, passedInCurrentAnimation : ${animation}`);
        const newAnimation = {"animation":_stage['animation'][i][0],"fadeInTime":_stage['animation'][i][1],"fadeOutTime":_stage['animation'][i][2],"reps":_stage['animation'][i][3]};
        console.log(`InsideTimer: newAnimation: ${JSON.stringify(newAnimation)}, current animationRef:${animationRef.current}`);

        animationSetter(newAnimation);
      },startTime, tag);

      lifecycleTimers.current.push({'id':newSubStageTimer,"expiration":Date.now()+startTime+200}); //This array is used for clearing up timers to avoid memory leak.
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
    <>
    {console.log(avatarDefinition['name'])}
       { avatarDefinition['name'] === 'AVATURNMATT' && <AvaturnMatt group={group} nodes={nodes} materials={materials} props =  {props}></AvaturnMatt>}
       { avatarDefinition['name'] === 'AFROMALE' && <AfroMale group={group} nodes={nodes} materials={materials} props =  {props}></AfroMale>}
       { avatarDefinition['name'] === 'MATTSHEAD' && <MattsHead group={group} nodes={nodes} materials={materials} props =  {props}></MattsHead>}
   </>
  );
}


