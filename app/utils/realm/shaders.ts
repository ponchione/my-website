// Terrain + political map shader. Province ids, border distance fields, and the water
// signed-distance field come from scripts/map/build-map.mjs; see that file for encodings.

export const terrainVertexShader = /* glsl */ `
uniform vec2 uMapSize;

varying vec2 vMapUv;

void main() {
  // (0,0) is the north-west corner, matching the PNG row order (textures are not flipped).
  vMapUv = vec2(position.x / uMapSize.x + 0.5, position.z / uMapSize.y + 0.5);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const terrainFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uProvinces;
uniform sampler2D uFields;
uniform sampler2D uRelief;
uniform sampler2D uCountyColors;
uniform sampler2D uRealmColors;
uniform vec3 uRanges;
uniform vec2 uMapPixels;
uniform vec3 uSunDirection;
uniform float uHomeRealm;
uniform float uHoverCounty;
uniform float uHoverRealm;
uniform float uSelectedCounty;
uniform float uSelectedRealm;
uniform float uOverlay;
uniform float uZoom;
uniform float uTime;

varying vec2 vMapUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + 17.0;
    amplitude *= 0.5;
  }
  return value;
}

float brightness(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 landAlbedo(vec2 uv, float height, float ridge, vec3 normal) {
  vec2 ground = uv * vec2(uMapPixels.x / uMapPixels.y, 1.0);
  float slope = 1.0 - normal.y;
  float patches = fbm(ground * 46.0);
  float fields = noise(ground * 210.0);
  float grain = noise(ground * 900.0);

  vec3 meadow = vec3(0.40, 0.50, 0.26);
  vec3 wheat = vec3(0.66, 0.62, 0.38);
  vec3 pasture = vec3(0.52, 0.58, 0.31);
  vec3 forest = vec3(0.19, 0.31, 0.17);
  vec3 highForest = vec3(0.15, 0.25, 0.15);
  vec3 rock = vec3(0.46, 0.43, 0.37);

  vec3 farmland = mix(meadow, pasture, smoothstep(0.35, 0.65, patches));
  farmland = mix(farmland, wheat, smoothstep(0.62, 0.78, fields) * smoothstep(0.3, 0.6, patches) * 0.8);

  // Ridges and the high plateau are wooded; valleys and lowlands are farmed.
  float wooded = smoothstep(-0.01, 0.05, ridge * 1.6 + (height - 0.42) * 0.3 + (patches - 0.5) * 0.06 + slope * 0.4);
  vec3 woods = mix(forest, highForest, smoothstep(0.35, 0.7, height));
  vec3 color = mix(farmland, woods, wooded);
  color = mix(color, rock, smoothstep(0.25, 0.5, slope) * 0.5);
  return color * (0.93 + 0.14 * grain);
}

vec4 lookup(sampler2D table, float id) {
  return texture2D(table, vec2((id + 0.5) / 256.0, 0.5));
}

float band(float distance, float width, float aa) {
  return 1.0 - smoothstep(width - aa, width + aa, distance);
}

void main() {
  vec2 uv = vMapUv;
  vec4 province = texture2D(uProvinces, uv);
  vec4 fields = texture2D(uFields, uv);
  vec4 relief = texture2D(uRelief, uv);

  float county = floor(province.r * 255.0 + 0.5);
  float realm = floor(province.g * 255.0 + 0.5);
  vec3 normal = normalize(relief.rgb * 2.0 - 1.0);
  float height = relief.a;
  // Height above the surrounding country (a blurred mip), to tell ridges from valleys.
  float ridge = height - texture2D(uRelief, uv, 4.5).a;

  // Map texels per screen pixel, for resolution-independent line widths.
  float texelsPerPixel = max(length(fwidth(uv * uMapPixels)), 1e-3);
  float aa = texelsPerPixel * 0.6;

  float countyDistance = fields.r * uRanges.x;
  float realmDistance = fields.g * uRanges.y;
  float waterDistance = (fields.b * 255.0 - 128.0) / 127.0 * uRanges.z;

  float diffuse = max(dot(normal, uSunDirection), 0.0);
  float light = 0.5 + 0.62 * diffuse;

  // --- land and political overlay
  vec3 color = landAlbedo(uv, height, ridge, normal) * light;

  vec4 tint = county > 0.5 ? lookup(uCountyColors, county) : lookup(uRealmColors, realm);
  float overlay = tint.a * uOverlay * mix(0.2, 0.66, uZoom);
  overlay += tint.a * uOverlay * band(realmDistance, uRanges.y, uRanges.y) * 0.2;
  vec3 tinted = tint.rgb * (0.52 + 0.62 * diffuse);
  color = mix(color, tinted, clamp(overlay, 0.0, 0.95));

  bool foreign = realm > 0.5 && abs(realm - uHomeRealm) > 0.5;
  if (foreign) {
    color = mix(color, vec3(brightness(color)), 0.3) * 0.82;
  }

  bool hovered = (county > 0.5 && abs(county - uHoverCounty) < 0.5)
    || (county < 0.5 && realm > 0.5 && abs(realm - uHoverRealm) < 0.5);
  if (hovered) {
    color = mix(color, color * 1.35 + 0.05, 0.75);
  }

  // --- water
  float waterAa = max(fwidth(waterDistance), 1e-3);
  float water = 1.0 - smoothstep(-waterAa, waterAa, waterDistance);
  float depth = smoothstep(0.0, -uRanges.z * 0.9, waterDistance);
  vec2 ground = uv * vec2(uMapPixels.x / uMapPixels.y, 1.0);
  float ripple = noise(ground * 340.0 + vec2(uTime * 0.35, uTime * 0.22))
    * noise(ground * 150.0 - vec2(uTime * 0.12, uTime * 0.18));
  vec3 waterColor = mix(vec3(0.20, 0.40, 0.47), vec3(0.09, 0.22, 0.32), depth);
  waterColor += (ripple - 0.25) * 0.07;
  waterColor = mix(waterColor, vec3(0.42, 0.58, 0.60), (1.0 - smoothstep(0.0, 2.5, -waterDistance)) * 0.35);
  if (foreign) waterColor *= 0.9;
  color = mix(color, waterColor, water);
  float shoreline = band(abs(waterDistance), 0.35, waterAa);
  color = mix(color, color * 0.55, shoreline * 0.6);

  // --- borders
  // Wide enough to cover the stair-steps of the nearest-sampled province fill.
  float countyLine = band(countyDistance, max(0.9, texelsPerPixel * 0.6), aa);
  color = mix(color, color * 0.4, countyLine * (foreign ? 0.4 : 0.75));

  float realmBand = band(realmDistance, max(3.2, texelsPerPixel * 2.6), aa);
  float realmCore = band(realmDistance, max(0.8, texelsPerPixel * 0.9), aa);
  vec3 bandColor = (tint.a > 0.0 ? tint.rgb : color) * 0.5 * light;
  color = mix(color, bandColor, realmBand * 0.8 * max(uOverlay, 0.4));
  color = mix(color, vec3(0.07, 0.06, 0.05), realmCore * 0.85);

  // --- selection
  bool selected = (county > 0.5 && abs(county - uSelectedCounty) < 0.5)
    || (county < 0.5 && realm > 0.5 && abs(realm - uSelectedRealm) < 0.5);
  if (selected) color = mix(color, color * 1.18 + 0.04, 0.5);
  if (uSelectedCounty > 0.0 || uSelectedRealm > 0.0) {
    // The rim is centered on the smooth border field, so look around for the selection
    // instead of trusting this (stair-stepped) texel alone.
    float reach = max(2.5, texelsPerPixel * 3.0);
    bool near = selected;
    for (int i = 0; i < 8; i++) {
      float angle = float(i) * 0.785398;
      vec4 around = texture2D(uProvinces, uv + vec2(cos(angle), sin(angle)) * reach / uMapPixels);
      float aroundCounty = floor(around.r * 255.0 + 0.5);
      float aroundRealm = floor(around.g * 255.0 + 0.5);
      near = near || (aroundCounty > 0.5 && abs(aroundCounty - uSelectedCounty) < 0.5)
        || (aroundCounty < 0.5 && aroundRealm > 0.5 && abs(aroundRealm - uSelectedRealm) < 0.5);
    }
    float edge = uSelectedCounty > 0.0 ? countyDistance : realmDistance;
    float rim = near ? band(edge, max(1.4, texelsPerPixel * 1.6), aa) : 0.0;
    float pulse = 0.7 + 0.3 * sin(uTime * 3.0);
    color = mix(color, vec3(1.0, 0.88, 0.58), rim * pulse);
  }

  // --- the edge of the known world (the camera keeps it at the screen edge, so it stays thin)
  vec2 edge = min(uv, 1.0 - uv) * vec2(uMapPixels.x / uMapPixels.y, 1.0);
  float mist = fbm(ground * 6.0 + uTime * 0.01);
  float fog = 1.0 - smoothstep(0.0, 0.012 + mist * 0.014, min(edge.x, edge.y));
  color = mix(color, vec3(0.07, 0.08, 0.09), fog);

  // Colors are authored in display (sRGB) space, so no output conversion.
  gl_FragColor = vec4(color, 1.0);
}
`
