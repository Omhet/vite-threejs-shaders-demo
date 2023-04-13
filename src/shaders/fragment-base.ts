export const fragmentShaderBase = `
    uniform vec3 audioColor;

    void main() {
        csm_DiffuseColor = vec4(audioColor, 1.0);
    }
`
