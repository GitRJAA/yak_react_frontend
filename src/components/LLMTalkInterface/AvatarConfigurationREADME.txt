This file provided details on how to select an avatar ( meaning, choosing the .glb model and animations)
and configuring the animations triggered by each avatarstatus change.

Avatar Selection
==================
The tuple of avatar model file and avatar animations are refered to as the Avatar Definition. The Avatar Definition
is selected in the useAvatar hook located in src\components\LLMTalkInterface\hooks.
The pairs are recording in the avatarCollection dictionary. The state object avatarDefinition stores the key of current definition.



Avatar configuration
===================

The avatar configuration in the setting page is a json string for voice and animation configuration. Voice is supplied by Azure 

The scheme is as follows. 

{
    "voice": azure voice id.e.g en-AU-TimNerual,
    "idle_config": [{"animation":str| [] | [[],..], "start": int, "variation": int,"cycle": int}],
    "speaking_config": [{"animation":str| [] | [[],..], "start": int, "variation": int,"cycle": int}]
    "listening_config": [{"animation":str| [] | [[],..], "start": int, "variation": int,"cycle": int}]
 }

_config entries
===============

The _config entries specify the animation or sequence of animations that will be scheduled when avatarStatus changes to the corresponding status. 

The 'animation' value is overloaded: 
i) if a string is speficied then it must be the name of an animation that is imported in the avatar component.
ii) if a list is provided (called a Substage), then the list must have 4 elements: [animation, animation fadeInTime(s), animation fadeOutTime(s), repeats]
  here 'animation' is either the name of an animation or a conditional of the form 'trigger_animation_name>target_animation_name', where trigger_animation_name is the name of the animation
  at the time of scheduling that should lead to a transition to the animation named target_animation_name. The use case for this is when a transition, such as standing, should be skipped if the 
  avatar is not sitting. In this case the conditional animation clause would be 'Sitting>SitToStand' assume that Sitting and SitToStand are both animations available for the current model. 
iii) If animation is a list of lists of 4-tuples (Substage) then each of the Substage is scheduled to run in sequence, overlapping according to the fade in and fade out times.

"start": the time in seconds from the state change when the animation or sequence of animations should start.
"variation": float(0,1): random variation of the start time. Actual start time will be start + start*variation. Note that variation is always positive. Used to break feeling of hard cyclicality of animation sequences.
"cycle": int \in [-1,1]: If -1 then it loops infinitely. If set to "1" it repeats just once and then reverts to the default pose (often a T pose).

Notes:
=====
Timing is not exact as react schedules changes in animation state and executes at some indeterminate amount of time later. This can lead to glitches in animation. Fadein/out times can mitigate this by giving a window 
for the orderly transition between animations. 










 Example:

 {
    "voice": "en-AU-TimNeural",
    "idle_config": [
        {
            "animation": [
                "Still",
                0,
                0.5,
                -1
            ],
            "start": 0,
            "variation": 0,
            "cylce": -1
        },
        {
            "animation": [
                [
                    "NailIdle",
                    0.5,
                    0.5,
                    -1
                ],
                [
                    "DwarfIdle",
                    0.5,
                    0.5,
                    -1
                ]
            ],
            "start": 10,
            "variation": 0,
            "cycle": -1
        },
        {
            "animation": [
                [
                    "StandToSit",
                    0.5,
                    0.75,
                    1
                ],
                [
                    "Sitting",
                    0.75,
                    0.5,
                    -1
                ]
            ],
            "start": 30,
            "variation": 0,
            "cycle": 1
        }
    ],
    "speaking_config": {
        "animation": [
            [
                "SitToStand",
                0.5,
                0.5,
                -1
            ],
            [
                "Still",
                0.5,
                0.5,
                -1
            ]
        ],
        "start": 0,
        "variation": 0,
        "cycle": -1
    },
    "listening_config": [
        {
            "animation": [
                "Still",
                0.5,
                0.5,
                -1
            ],
            "start": 3,
            "variation": 0,
            "cylce": -1
        },
        {
            "status": "Idle",
            "start": 30,
            "variation": 0.1,
            "cylce": -1
        }
    ]
}