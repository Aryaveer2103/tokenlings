// Bodies. Each declares its outline and the anchor points every other part
// attaches to, so any topper, face or accessory fits any body.
//
//   top       [x, y]  top of the head (hats, halos, toppers)
//   hatW      half-width of the head a little below the top (hat brims)
//   earL/earR [x, y]  where ears, buns and headphone cups attach
//   eyeY, eyeDX       eyes sit at (16 ± eyeDX, eyeY)
//   mouthY, cheekY, cheekDX
//   neckY, neckHalf   collar line (scarf, bell, bow, bandana)
//   handL/handR       paws (props in later phases)
//   back      [x, y]  cape and backpack attachment
//   feet      [xL, xR]
//   torso     {x, y, w, h}  a box inside the body that patterns stay within
//   rim       a highlight stroke just inside the upper-left edge (rim light)
//   floats    true when the body has no feet (ghosty)

export const BODIES = {
  dumpling: {
    label: "Dumpling",
    path: "M4.6 27.2 C4.6 17.4 9 11.2 16 11.2 C23 11.2 27.4 17.4 27.4 27.2 C27.4 30 25 30.6 16 30.6 C7 30.6 4.6 30 4.6 27.2 Z",
    rim: "M6.4 22.4 C6.9 16.8 10.2 13.2 14.4 12.8",
    top: [16, 11.2], hatW: 6, earL: [9.6, 14.4], earR: [22.4, 14.4],
    eyeY: 20.6, eyeDX: 4, mouthY: 24.6, cheekY: 23.4, cheekDX: 6.6,
    neckY: 26.2, neckHalf: 10.6, handL: [5.4, 24.6], handR: [26.6, 24.6], back: [16, 22],
    feet: [11.8, 20.2], torso: { x: 10, y: 25.8, w: 12, h: 4 }
  },
  tallBlob: {
    label: "Tall blob",
    path: "M6.8 27.2 C6.4 16.4 10 10 16 10 C22 10 25.6 16.4 25.2 27.2 C25.1 30 23.3 30.6 16 30.6 C8.7 30.6 6.9 30 6.8 27.2 Z",
    rim: "M8.5 21.6 C8.6 15.6 11 12.1 14.6 11.6",
    top: [16, 10], hatW: 5.2, earL: [10.4, 13.2], earR: [21.6, 13.2],
    eyeY: 19.6, eyeDX: 3.6, mouthY: 23.8, cheekY: 22.6, cheekDX: 6,
    neckY: 25.8, neckHalf: 9, handL: [7.1, 24], handR: [24.9, 24], back: [16, 21],
    feet: [12.4, 19.6], torso: { x: 11, y: 25.4, w: 10, h: 4.4 }
  },
  roundBlob: {
    label: "Round blob",
    path: "M5.6 26.4 C5.6 16 10.2 10.8 16 10.8 C21.8 10.8 26.4 16 26.4 26.4 C26.4 29.9 23.4 30.6 16 30.6 C8.6 30.6 5.6 29.9 5.6 26.4 Z",
    rim: "M7.3 21.6 C7.6 16.2 10.6 12.9 14.6 12.4",
    top: [16, 10.8], hatW: 5.8, earL: [9.6, 14.2], earR: [22.4, 14.2],
    eyeY: 20.2, eyeDX: 3.8, mouthY: 24.4, cheekY: 23.2, cheekDX: 6.4,
    neckY: 26.2, neckHalf: 10.2, handL: [6.1, 24.4], handR: [25.9, 24.4], back: [16, 21.6],
    feet: [12, 20], torso: { x: 10, y: 25.6, w: 12, h: 4.2 }
  },
  bean: {
    label: "Bean",
    path: "M7.2 26.8 C6.4 20.6 8 12.6 15 11.6 C21.6 10.8 25.6 15.4 24.8 20.2 C24.4 22.6 25.8 24.4 25.4 26.8 C25 30 21.8 30.6 16 30.6 C10.2 30.6 7.6 30 7.2 26.8 Z",
    rim: "M8.7 22 C8.4 17.2 10 13.9 14.4 13.2",
    top: [16, 11.4], hatW: 5.2, earL: [10, 14.6], earR: [22.2, 14.2],
    eyeY: 19.4, eyeDX: 3.6, mouthY: 23.6, cheekY: 22.4, cheekDX: 6,
    neckY: 26, neckHalf: 9, handL: [7.4, 24.2], handR: [25.2, 24.2], back: [16, 21.4],
    feet: [12, 20], torso: { x: 11, y: 25.2, w: 10, h: 4.4 }
  },
  mochiCube: {
    label: "Mochi cube",
    path: "M6.8 15.2 Q6.8 11.4 10.6 11.4 L21.4 11.4 Q25.2 11.4 25.2 15.2 L25.4 27.2 Q25.4 30.6 22 30.6 L10 30.6 Q6.6 30.6 6.6 27.2 Z",
    rim: "M8.3 19.4 L8.3 15.4 Q8.3 12.9 10.8 12.9 L15 12.9",
    top: [16, 11.4], hatW: 7, earL: [8.4, 13.2], earR: [23.6, 13.2],
    eyeY: 19.8, eyeDX: 4, mouthY: 24, cheekY: 22.8, cheekDX: 6.4,
    neckY: 26, neckHalf: 9.4, handL: [6.8, 24], handR: [25.2, 24], back: [16, 21],
    feet: [11.6, 20.4], torso: { x: 10.4, y: 25.2, w: 11.2, h: 4.4 }
  },
  droplet: {
    label: "Droplet",
    path: "M16 7.8 C18.6 12.2 25.6 17.4 25.6 23.4 C25.6 28.2 21.4 30.6 16 30.6 C10.6 30.6 6.4 28.2 6.4 23.4 C6.4 17.4 13.4 12.2 16 7.8 Z",
    rim: "M8.1 21.8 C8.7 17.8 12.4 14 15 10.6",
    top: [16, 9.8], hatW: 3, earL: [12.6, 13.4], earR: [19.4, 13.4],
    eyeY: 20.8, eyeDX: 3.8, mouthY: 24.8, cheekY: 23.6, cheekDX: 6.4,
    neckY: 26.6, neckHalf: 9.2, handL: [6.6, 24.6], handR: [25.4, 24.6], back: [16, 22.4],
    feet: [12, 20], torso: { x: 10.6, y: 26, w: 10.8, h: 3.6 }
  },
  pear: {
    label: "Pear",
    path: "M16 9.8 C19.6 9.8 21.2 12.4 21.2 15.2 C21.2 17.6 26.6 19.8 26.6 25.4 C26.6 29.4 22.6 30.6 16 30.6 C9.4 30.6 5.4 29.4 5.4 25.4 C5.4 19.8 10.8 17.6 10.8 15.2 C10.8 12.4 12.4 9.8 16 9.8 Z",
    rim: "M7.1 24.6 C7.4 21.2 11.6 19.4 12.3 16.4 M12.5 14.2 C12.6 12.6 13.6 11.5 15.4 11.4",
    top: [16, 9.8], hatW: 4.4, earL: [11.6, 12.6], earR: [20.4, 12.6],
    eyeY: 15, eyeDX: 2.6, mouthY: 18, cheekY: 17.2, cheekDX: 4,
    neckY: 19.2, neckHalf: 6.6, handL: [6.2, 24.8], handR: [25.8, 24.8], back: [16, 22],
    feet: [11.6, 20.4], torso: { x: 9.6, y: 22.2, w: 12.8, h: 6.6 }
  },
  ghosty: {
    label: "Ghosty",
    path: "M6.6 29.6 L6.6 18.6 C6.6 12.8 10.8 9.6 16 9.6 C21.2 9.6 25.4 12.8 25.4 18.6 L25.4 29.6 Q23.8 28 22.2 29.6 Q20.6 31.2 19.1 29.6 Q17.6 28 16 29.6 Q14.4 31.2 12.9 29.6 Q11.4 28 9.8 29.6 Q8.2 31.2 6.6 29.6 Z",
    rim: "M8.2 22 L8.2 18.6 C8.2 14.1 11.2 11.4 14.8 11.2",
    top: [16, 9.6], hatW: 6, earL: [9.2, 13.2], earR: [22.8, 13.2],
    eyeY: 18.4, eyeDX: 3.8, mouthY: 22.6, cheekY: 21.4, cheekDX: 6.2,
    neckY: 24.2, neckHalf: 9.4, handL: [6.8, 22.6], handR: [25.2, 22.6], back: [16, 20.6],
    feet: [12, 20], torso: { x: 10, y: 23.6, w: 12, h: 4.4 }, floats: true
  }
}
