export const vertexShader = `
    uniform float time;
    varying vec3 vPosition;
    uniform float audioDataFactor;

    void main() {
        float squashFactor = 0.2 * sin(audioDataFactor * 0.5) + 1.0;
        vec3 squashedPosition = vec3(position.x, position.y * squashFactor, position.z);

        float scale = 0.4 * sin(audioDataFactor * 4.0) + 0.8; // Change the numbers to adjust the scale animation
        vec3 scaledPosition = squashedPosition * scale;

        vPosition = scaledPosition;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
    }
`
