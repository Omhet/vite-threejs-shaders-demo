import {
    Mesh,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    WebGLRenderTarget,
    WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { fragmentShader } from './shaders/fragment'
import { vertexShader } from './shaders/vertex'
import './style.css'

const CANVAS_ID = 'scene'

// ===== 🖼️ CANVAS, RENDERER, & SCENE =====
const canvas = document.querySelector(`canvas#${CANVAS_ID}`)!
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const scene = new Scene()

const renderTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
const blendScene = new Scene()
const blendGeometry = new PlaneGeometry(2, 2)
const blendMaterial = new ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        mixRatio: { value: 0.9 },
    },
    vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float mixRatio;

    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      gl_FragColor = mix(texel, gl_FragColor, mixRatio);
    }
  `,
    transparent: true,
})
const blendMesh = new Mesh(blendGeometry, blendMaterial)
blendScene.add(blendMesh)

// ===== 🎥 CAMERA =====
const camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
camera.position.set(2, 2, 7)

// ===== 📦 OBJECTS =====
const shaderMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
        time: { value: 0.0 },
    },
})
const geometry = new SphereGeometry(2, 32, 32)
const mainSphere = new Mesh(geometry, shaderMaterial)

scene.add(mainSphere)

const blendSphere = mainSphere.clone()
blendScene.add(blendSphere)

// ===== 🕹️ CONTROLS =====
const cameraControls = new OrbitControls(camera, canvas as HTMLElement)
cameraControls.target = mainSphere.position.clone()
cameraControls.enableDamping = true
cameraControls.autoRotate = true
cameraControls.autoRotateSpeed = 0.5
cameraControls.enableZoom = false
cameraControls.update()

function animate() {
    requestAnimationFrame(animate)

    // shaderMaterial.uniforms.time.value += 0.01
    // @ts-ignore
    mainSphere.material.uniforms.time.value = performance.now() / 1000

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    cameraControls.update()

    // renderer.render(scene, camera)

    // Render the scene to the render target
    // renderer.setRenderTarget(renderTarget)
    // renderer.render(scene, camera)

    // Render the blend scene to the screen
    // renderer.setRenderTarget(null)
    blendMaterial.uniforms.tDiffuse.value = renderTarget.texture
    renderer.render(blendScene, camera)
}

animate()
