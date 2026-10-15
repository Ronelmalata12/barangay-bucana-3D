// Shared stair dimensions keep the slab opening, rails and walking route aligned.
export const HALL_STAIRS = Object.freeze({
  minX:3.45, maxX:5.65, bottomZ:0.2, topZ:2.65,
  railLeft:3.35, railRight:5.75, openingFront:0.08, steps:17,
});

// The captain sits on the former visitor side of the desk, facing into the room.
export const CAPTAIN_WORKSPACE = Object.freeze({
  x:2.46, deskZ:-1.3, chairZ:-2.4,
  visitorX:5.34, visitorZs:Object.freeze([-1.8, -1.0]),
});

export const CAPTAIN_MONITOR = Object.freeze({ x:5.78, y:4.91, z:-1.0, rotationY:-Math.PI / 2 });
