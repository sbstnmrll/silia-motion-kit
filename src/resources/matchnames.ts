export const MATCHNAME_CHEATSHEET = `# After Effects matchName cheat sheet (locale-independent property paths)

Use these with ae_property_get / ae_property_set / ae_keyframes / ae_expression (path = segments joined by "/").
Aliases accepted by the tools: position, scale, rotation, opacity, anchor, orientation, effects, masks, text, "source text", animators, contents, "time remap", "audio levels".

## Layer transform  (ADBE Transform Group)
ADBE Anchor Point | ADBE Position | ADBE Position_0/_1/_2 (separated dims) | ADBE Scale | ADBE Orientation | ADBE Rotate X | ADBE Rotate Y | ADBE Rotate Z | ADBE Opacity

## Layer groups
ADBE Effect Parade (effects) | ADBE Mask Parade (masks) | ADBE Marker | ADBE Time Remapping | ADBE Audio Group/ADBE Audio Levels | ADBE Material Options Group | ADBE Layer Styles | ADBE Layer Overrides

## Text layer  (ADBE Text Properties)
ADBE Text Document (source text: TextDocument) | ADBE Text Path Options | ADBE Text More Options | ADBE Text Animators
Animator: ADBE Text Animators/ADBE Text Animator[n] -> ADBE Text Selectors/ADBE Text Selector -> ADBE Text Percent Start | ADBE Text Percent End | ADBE Text Percent Offset | ADBE Text Range Advanced (ADBE Text Range Type2 [1 chars,2 chars excl spaces,3 words,4 lines], ADBE Text Selector Mode, ADBE Text Selector Max Amount, ADBE Text Range Shape [1 square,2 ramp up,3 ramp down,4 triangle,5 round,6 smooth], ADBE Text Levels Max Ease, ADBE Text Levels Min Ease, ADBE Text Randomize Order)
Animator properties: ADBE Text Animator Properties/ ADBE Text Anchor Point 3D | ADBE Text Position 3D | ADBE Text Scale 3D | ADBE Text Rotation | ADBE Text Opacity | ADBE Text Fill Color | ADBE Text Stroke Color | ADBE Text Tracking Amount | ADBE Text Blur | ADBE Text Line Spacing | ADBE Text Character Offset

## Shape layer  (ADBE Root Vectors Group)
Group: ADBE Vector Group -> ADBE Vectors Group (children) + ADBE Vector Transform Group
Paths: ADBE Vector Shape - Rect (ADBE Vector Rect Size, ADBE Vector Rect Position, ADBE Vector Rect Roundness) | ADBE Vector Shape - Ellipse (ADBE Vector Ellipse Size, ADBE Vector Ellipse Position) | ADBE Vector Shape - Star (ADBE Vector Star Type, ADBE Vector Star Points, ADBE Vector Star Position, ADBE Vector Star Inner Radius, ADBE Vector Star Outer Radius, ADBE Vector Star Rotation) | ADBE Vector Shape - Group (ADBE Vector Shape: Shape value)
Fill: ADBE Vector Graphic - Fill (ADBE Vector Fill Color, ADBE Vector Fill Opacity, ADBE Vector Fill Rule)
Stroke: ADBE Vector Graphic - Stroke (ADBE Vector Stroke Color, ADBE Vector Stroke Width, ADBE Vector Stroke Opacity, ADBE Vector Stroke Line Cap, ADBE Vector Stroke Line Join, ADBE Vector Stroke Dashes)
Operators: ADBE Vector Filter - Trim (ADBE Vector Trim Start, ADBE Vector Trim End, ADBE Vector Trim Offset) | ADBE Vector Filter - Repeater (ADBE Vector Repeater Copies, ADBE Vector Repeater Offset, ADBE Vector Repeater Transform) | ADBE Vector Filter - RC (ADBE Vector RoundCorner Radius) | ADBE Vector Filter - Merge | ADBE Vector Filter - Offset | ADBE Vector Filter - Wiggler | ADBE Vector Filter - Zigzag | ADBE Vector Filter - Twist
Gradient fill/stroke: ADBE Vector Graphic - G-Fill / ADBE Vector Graphic - G-Stroke

## Masks  (ADBE Mask Parade/ADBE Mask Atom[n])
ADBE Mask Shape | ADBE Mask Feather | ADBE Mask Opacity | ADBE Mask Offset  (mode via mask.maskMode, inverted via mask.inverted)

## Camera / light
ADBE Camera Options Group: ADBE Camera Zoom, ADBE Camera Depth of Field, ADBE Camera Focus Distance, ADBE Camera Aperture, ADBE Camera Blur Level
ADBE Light Options Group: ADBE Light Intensity, ADBE Light Color, ADBE Light Cone Angle, ADBE Light Cone Feather 2, ADBE Casts Shadows, ADBE Light Shadow Darkness

## Common effects (matchName -> key params)
ADBE Gaussian Blur 2: ADBE Gaussian Blur 2-0001 (Blurriness), -0002 (Dimensions), -0003 (Repeat Edge Pixels)
ADBE Motion Blur (Directional Blur): -0001 Direction, -0002 Blur Length
ADBE Glo2 (Glow): ADBE Glo2-0002 Threshold, -0003 Radius, -0004 Intensity
ADBE Drop Shadow: ADBE Drop Shadow-0001 Color, -0002 Opacity, -0003 Direction, -0004 Distance, -0005 Softness
ADBE Fill: ADBE Fill-0002 Color, -0007 Opacity
ADBE Tint: ADBE Tint-0001 Map Black To, -0002 Map White To, -0003 Amount
ADBE Tritone: ADBE Tritone-0001 Highlights, -0002 Midtones, -0003 Shadows
ADBE HUE SATURATION: ADBE HUE SATURATION-0002 Master Hue, -0003 Master Saturation, -0004 Master Lightness
ADBE Pro Levels2 (Levels): ADBE Pro Levels2-0003 Input Black, -0004 Input White, -0005 Gamma, -0006 Output Black, -0007 Output White
ADBE Exposure2: ADBE Exposure2-0003 Exposure, -0004 Offset, -0005 Gamma
ADBE Geometry2 (Transform): -0001 Anchor, -0002 Position, -0003 Uniform Scale, -0004 Scale Height, -0005 Scale Width, -0006 Skew, -0007 Skew Axis, -0008 Rotation, -0009 Opacity
ADBE Linear Wipe: -0001 Transition Completion, -0002 Wipe Angle, -0003 Feather
ADBE Slider Control: ADBE Slider Control-0001 | ADBE Color Control: ADBE Color Control-0001 | ADBE Checkbox Control: ADBE Checkbox Control-0001 | ADBE Point Control: ADBE Point Control-0001 | ADBE Angle Control: ADBE Angle Control-0001 | ADBE Dropdown Control: ADBE Dropdown Control-0001
ADBE Lumetri: use ae_effect action=get_params to list (many parameters)
ADBE Fractal Noise: -0001 Fractal Type, -0002 Noise Type, -0003 Invert, -0004 Contrast, -0005 Brightness, ... -0010 Evolution
ADBE Noise: -0001 Amount of Noise, -0002 Noise Type, -0003 Clipping
ADBE Vignette: check params with get_params
Corrections (wrong in many tutorials): Glow is ADBE Glo2 (not "ADBE Glow"); Directional Blur is ADBE Motion Blur; Gaussian Blur is ADBE Gaussian Blur 2.

## Expressions quick reference
wiggle(freq, amp) | loopOut("cycle"|"pingpong"|"offset"|"continue") | loopIn(...) | ease(t, tMin, tMax, v1, v2) | linear(...) | time | thisComp.layer("Name").transform.position | valueAtTime(t) | thisLayer.sourceRectAtTime(time, false) (text bounds) | effect("Slider Control")("Slider") | posterizeTime(fps)
Inertia: n = 0; if (numKeys > 0){ n = nearestKey(time).index; if (key(n).time > time) n--; } if (n == 0){ t = 0; } else { t = time - key(n).time; } if (n > 0 && t < 1){ v = velocityAtTime(key(n).time - thisComp.frameDuration/10); amp = .05; freq = 4.0; decay = 8.0; value + v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t); } else { value; }
`;
