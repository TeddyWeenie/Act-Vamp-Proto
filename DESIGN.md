# Character rebuild V5

This is a new character asset pipeline. V5 does not import heroes.mjs or its geometry builders.

Concept reference: ../art-direction-04/characters.png. The lower turnaround row is used for chibi proportions; the tall main illustrations provide costume details. Head including hair occupies 1 unit of a 3-unit neutral human figure, measured without weapons and wolf ears. Feet sit at zero. The skeleton has pelvis, spine, chest, neck, head, shoulders, upper/lower arms, hands, upper/lower legs, feet and toes, plus cloth and tail joints.

Lucien: narrow waist, split long burgundy coat, wide trailing cape with embroidered hem, ivory lace jabot, silver asymmetrical pointed hair, rapier and basket guard. Wolf: larger rib cage and shoulder armour, tapered canine muzzle and ears, dark military coat, leather cross belt, steel saber. Eda: chestnut bob, brass goggles, cropped teal jacket, ivory pleated tunic, thigh-high stockings, tool belt, copper backpack and crystal staff.

Each model exports skin weights, bind matrices, bones, materials and separate baked animation clips to GLB. Gameplay and the inspection viewer load those same files. Locomotion advances by travelled distance. One-shot attacks blend in, pass through anticipation/contact/recovery, and return to idle. Knees and elbows bend. Hits are shown at the animation contact event; death and victory wait for that event.

References inspected 2026-09-13:
- Kay Lousberg, KayKit Adventurers (rigged stylised 3D game characters): https://kaylousberg.itch.io/kaykit-adventurers
- KayKit Character Animations (movement, melee, magic and reactions): https://kaylousberg.itch.io/kaykit-character-animations
- Creator's CC0 model/animation source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Three.js animation transitions and one-shot actions: https://threejs.org/examples/webgl_animation_skinning_morph.html

The characters are original to this project. Reference characters are not reskins or replacements for the requested designs.

Motion clips are adapted from KayKit CC0, not claimed as newly hand-keyed animation. See KAYKIT-CC0.txt and dist/models-v5/CREDITS.txt. Cloth motion is baked secondary animation; there is no cloth collision simulation.
