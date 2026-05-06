# Animations

Reference: <https://help.shapediver.com/doc/animations>

Animations make models more lively. Define animations using `AnimationData` (a wrapper
around one or more `AnimationTracks` that execute together). Each `AnimationTrack` specifies
which node moves and how.

## Imports

**NPM:**

```ts
import { AnimationData, IAnimationTrack } from "@shapediver/viewer";
```

**CDN:** Use `SDV.AnimationData` and the `SDV.IAnimationTrack` type.

## AnimationTrack Properties

| Property        | Type        | Description                                                        |
| :-------------- | :---------- | :----------------------------------------------------------------- |
| `times`         | `number[]`  | Keyframe times in seconds                                          |
| `values`        | `number[]`  | Flat array of values at each keyframe (3 per keyframe for vectors) |
| `node`          | `ITreeNode` | The scene tree node to animate                                     |
| `path`          | `string`    | Animation type: `"translation"`, `"rotation"`, or `"scale"`        |
| `interpolation` | `string`    | Interpolation mode: `"linear"`, `"step"`, or `"cubicspline"`       |

## Simple Example — Translation

Move the whole model to one side and back over 5 seconds:

```ts
const tracks: IAnimationTrack[] = [
  {
    times: [0, 2.5, 5],
    values: [0, 0, 0, 25, 0, 0, 0, 0, 0],
    node: session.node,
    path: "translation",
    interpolation: "linear",
  },
];
const data = new AnimationData("myAnimation", tracks, 0, 5);

session.node.data.push(data);
data.repeat = true;
data.startAnimation();
```

- At second `0`: position `[0, 0, 0]`
- At second `2.5`: position `[25, 0, 0]`
- At second `5`: back to `[0, 0, 0]`

## Where to Add AnimationData

It does not matter where you add the `AnimationData` — the nodes specified by the tracks
will be animated. However, store it in the corresponding session node so that
`session.customize()` calls remove invalid nodes automatically.

## Advanced Example — Multiple Tracks

Combine translation, rotation, and scale on different nodes:

```ts
// Translation track — move a node, hold, then return
const translateTrack: IAnimationTrack = {
  times: [0, 2.5, 7.5, 10],
  values: [0, 0, 0, 14.5, 0, 0, 14.5, 0, 0, 0, 0, 0],
  node: doorNode,
  path: "translation",
  interpolation: "linear",
};

// Rotation track — rotate around z-axis
const rotateTrack: IAnimationTrack = {
  times: [2.5, 7.5],
  values: [0, 0, 0, 1, 0, 0, 0.707, 0.707],
  node: doorNode,
  path: "rotation",
  interpolation: "linear",
};

// Scale tracks — scale individual parts
const scaleTrack: IAnimationTrack = {
  times: [0, 2.5, 5],
  values: [1, 1, 1, 2, 2, 2, 1, 1, 1],
  node: boardNode,
  path: "scale",
  interpolation: "linear",
};

const data = new AnimationData(
  "advancedAnimation",
  [translateTrack, rotateTrack, scaleTrack],
  0,
  10,
);
session.node.data.push(data);
data.repeat = true;
data.startAnimation();
```

## AnimationData API

| Method / Property  | Description                             |
| :----------------- | :-------------------------------------- |
| `startAnimation()` | Start or resume the animation           |
| `pauseAnimation()` | Pause the animation                     |
| `stopAnimation()`  | Stop and reset the animation            |
| `repeat`           | `boolean` — whether the animation loops |

## Global Access & glTF Animations

Access all active animations via `viewer.animations` (returns an array). You can
start/pause/stop them and toggle `repeat`. Animations defined in a glTF v2 file are
accessible the same way.

## Additional Examples

See the [viewer examples — animations section](https://viewer.shapediver.com/v3/examples/index.html#animations).
