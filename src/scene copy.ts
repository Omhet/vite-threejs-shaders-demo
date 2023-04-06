import { MathUtils, Mesh, PerspectiveCamera, Scene, ShaderMaterial, SphereGeometry, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { fragmentShader } from './shaders/fragment'
import { vertexShader } from './shaders/vertex'
import './style.css'

class CustomGlitchPass extends GlitchPass {
    constructor() {
        super()
    }

    // @ts-ignore
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        // Increase the frame counter
        this.curF += deltaTime

        // Check if the random number is less than the frame counter
        if (this.curF > this.randX) {
            // Reset the frame counter and generate a new random number
            this.curF = 0
            this.randX = MathUtils.randInt(0, 0.001) // Change these values to control the frequency of the glitches
        }

        // Call the original GlitchPass render method
        super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive)
    }
}

const CANVAS_ID = 'scene'

// ===== 🖼️ CANVAS, RENDERER, & SCENE =====
const canvas = document.querySelector(`canvas#${CANVAS_ID}`)!
const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const scene = new Scene()

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

// ===== 🕹️ CONTROLS =====
const cameraControls = new OrbitControls(camera, canvas as HTMLElement)
cameraControls.target = mainSphere.position.clone()
cameraControls.enableDamping = true
cameraControls.autoRotate = true
cameraControls.autoRotateSpeed = 0.5
cameraControls.enableZoom = false
cameraControls.update()

const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

// const glitchPass = new CustomGlitchPass()
// composer.addPass(glitchPass)

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
    composer.render()
}

animate()
