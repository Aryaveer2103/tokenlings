import QtQuick

// One pet's animation channels: what the clip runtime writes and the Pet rig
// reads. Positions are in grid units (1/32 of the pet), angles in degrees.
// The string channels swap baked art (expressions and props); they never
// redraw anything.
QtObject {
  // body
  property real x: 0          // along the bar (walks, scoots)
  property real y: 0          // up is negative (hops)
  property real lift: 0       // seated height (chairs lift the pet); also roaming's vertical offset
  property real perch: 0      // 0..1: sitting on the edge below (the bar's, a window's), legs over it
  property real sx: 1         // squash and stretch about the feet
  property real sy: 1
  property real rot: 0        // lean about the feet
  property real dir: 1        // facing: 1 right, -1 left (mirrors the body)
  property real alpha: 1
  property real shadow: 1     // ground shadow scale (shrinks in the air)
  // face
  property real faceX: 0      // the face slides toward the gaze (fake depth)
  property real faceY: 0
  property real gazeX: 0      // the eyes alone, a little further
  property real gazeY: 0
  property real blink: 1      // eye height 0..1
  // limbs and follow-through
  property real armL: 0       // paw rotation about the shoulder (raise > 0)
  property real armR: 0
  property real topRot: 0     // topper / ears, driven by a spring
  // held prop
  property real propRot: 0
  property real propX: 0
  property real propY: 0
  // swaps
  property string eyes: "open"
  property string mouth: "base"
  property string seat: ""
  property string desk: ""
  property string hand: ""
  property string over: ""
}
