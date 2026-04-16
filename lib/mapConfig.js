/** Adjust to match your server map */
export const MAP_CONFIG = {
  imageWidth:  4096,
  imageHeight: 4096,
  worldMinX: -100000,
  worldMaxX:  100000,
  worldMinZ: -100000,
  worldMaxZ:  100000,
};

/** Convert UE world coords to Leaflet pixel position */
export function worldToMap(x, z) {
  const px = (x - MAP_CONFIG.worldMinX) / (MAP_CONFIG.worldMaxX - MAP_CONFIG.worldMinX);
  const pz = (z - MAP_CONFIG.worldMinZ) / (MAP_CONFIG.worldMaxZ - MAP_CONFIG.worldMinZ);
  return [(1 - pz) * MAP_CONFIG.imageHeight, px * MAP_CONFIG.imageWidth];
}