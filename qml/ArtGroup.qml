import QtQuick
import QtQuick.Shapes

// One rig group's art: a stack of vector layers from core/compose.mjs
// ({ d, fill, stroke, width, cap, opacity, gradient }) on the 32×32 grid.
// Baked, the whole group is rasterised once into a texture and frames only
// move it; the texture is redrawn only when the art itself changes (look or
// theme), never by animation.
//
// box: the part of the grid this group covers, [x, y, w, h] in grid units
// (props and auras reach past the pet's 32×32). The item is placed and sized
// to the box; the art keeps its grid coordinates inside it.
//
// lazy: build the shapes only once the group is first shown (expressions and
// props a pet may never use cost nothing until then).
Item {
  id: root

  property var layers: []
  property real unit: 1
  property bool baked: true
  property real dpr: 1
  property var box: [0, 0, 32, 32]
  property bool lazy: false
  property bool used: !lazy || visible
  onVisibleChanged: if (visible) used = true

  x: box[0] * unit
  y: box[1] * unit
  width: box[2] * unit
  height: box[3] * unit

  readonly property bool hasArt: used && layers && layers.length > 0
  layer.enabled: baked && hasArt
  layer.smooth: true
  layer.textureSize: Qt.size(Math.ceil(width * Math.max(1, dpr)), Math.ceil(height * Math.max(1, dpr)))

  Repeater {
    model: root.hasArt ? root.layers : []
    Shape {
      id: shape
      required property var modelData
      readonly property var grad: modelData.gradient
      x: -root.box[0] * root.unit
      y: -root.box[1] * root.unit
      width: 32 * root.unit
      height: 32 * root.unit
      preferredRendererType: Shape.CurveRenderer
      opacity: modelData.opacity

      ShapePath {
        scale: Qt.size(root.unit, root.unit)
        fillColor: shape.modelData.fill
        fillGradient: !shape.grad ? null : (shape.grad.type === "radial" ? radial : linear)
        strokeColor: shape.modelData.stroke
        strokeWidth: shape.modelData.width
        capStyle: shape.modelData.cap === "round" ? ShapePath.RoundCap : ShapePath.FlatCap
        joinStyle: ShapePath.RoundJoin
        PathSvg { path: shape.modelData.d }
      }

      // Three stops cover every gradient the parts use (compose pads them).
      LinearGradient {
        id: linear
        x1: (shape.grad ? shape.grad.x1 || 16 : 16) * root.unit
        y1: (shape.grad ? shape.grad.y1 || 7 : 7) * root.unit
        x2: (shape.grad ? shape.grad.x2 || 16 : 16) * root.unit
        y2: (shape.grad ? shape.grad.y2 || 31 : 31) * root.unit
        GradientStop { position: shape.grad ? shape.grad.stops[0][0] : 0; color: shape.grad ? shape.grad.stops[0][1] : "transparent" }
        GradientStop { position: shape.grad ? shape.grad.stops[1][0] : 0.5; color: shape.grad ? shape.grad.stops[1][1] : "transparent" }
        GradientStop { position: shape.grad ? shape.grad.stops[2][0] : 1; color: shape.grad ? shape.grad.stops[2][1] : "transparent" }
      }
      RadialGradient {
        id: radial
        centerX: (shape.grad ? shape.grad.cx || 16 : 16) * root.unit
        centerY: (shape.grad ? shape.grad.cy || 16 : 16) * root.unit
        centerRadius: (shape.grad ? shape.grad.r || 16 : 16) * root.unit
        focalX: centerX
        focalY: centerY
        GradientStop { position: shape.grad ? shape.grad.stops[0][0] : 0; color: shape.grad ? shape.grad.stops[0][1] : "transparent" }
        GradientStop { position: shape.grad ? shape.grad.stops[1][0] : 0.5; color: shape.grad ? shape.grad.stops[1][1] : "transparent" }
        GradientStop { position: shape.grad ? shape.grad.stops[2][0] : 1; color: shape.grad ? shape.grad.stops[2][1] : "transparent" }
      }
    }
  }
}
