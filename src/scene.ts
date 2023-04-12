import {
    AmbientLight,
    Color,
    DirectionalLight,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    PointLight,
    Scene,
    SphereGeometry,
    SpotLight,
    WebGLRenderer,
} from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { fragmentShader } from './shaders/fragment'
import { vertexShader } from './shaders/vertex'
import './style.css'

// @ts-ignore
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
const audioBufferSource = audioContext.createBufferSource()
const analyser = audioContext.createAnalyser()
analyser.fftSize = 2048
audioBufferSource.connect(analyser)

const bufferLength = analyser.frequencyBinCount
const dataArray = new Uint8Array(bufferLength)
const frequencyDataArray = new Uint8Array(bufferLength)

const playBtn = document.querySelector(`#play`)!

playBtn.addEventListener('click', () => {
    playBtn.textContent = 'Loading...'
    fetch('/audio.mp3')
        .then((response) => response.arrayBuffer())
        .then((data) => audioContext.decodeAudioData(data))
        .then((buffer) => {
            playBtn.classList.add('hidden')
            audioBufferSource.buffer = buffer
            audioBufferSource.connect(audioContext.destination)
            audioBufferSource.start()
            document.body.style.cursor = 'none'
        })
        .catch((error) => {
            console.error(error)
            document.body.innerHTML = 'Error ' + error
        })
})

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

const shaderMaterial = new CustomShaderMaterial({
    baseMaterial: MeshStandardMaterial,
    vertexShader,
    fragmentShader,
    uniforms: {
        time: { value: 0.0 },
        audioDataFactor: { value: 0.0 },
        audioColor: { value: new Color(0xffffff) },
    },
    transparent: true,
})

const geometry = new SphereGeometry(2, 32, 32)
const mainSphere = new Mesh(geometry, shaderMaterial)

scene.add(mainSphere)

// Create a directional light (like sunlight)
const directionalLight = new DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(1, 2, 3)
// scene.add(directionalLight)

// Create a point light (like a light bulb)
const pointLight = new PointLight(0xffffff, 1, 100)
pointLight.position.set(0, 5, 0)
// scene.add(pointLight)

// Create another point light (like a light bulb)
const oppositePointLight = new PointLight(0xffffff, 1, 100)
oppositePointLight.position.set(0, -5, 0)
// scene.add(oppositePointLight)

// Create a spotlight (like a stage light)
const spotLight = new SpotLight(0xffffff, 1)
spotLight.position.set(0, 0, -5)
spotLight.target.position.set(0, 0, 0)
scene.add(spotLight)
// scene.add(spotLight.target)

// Create the opposite stage light
const oppositeStageLight = new SpotLight(0xffffff, 1)
oppositeStageLight.position.set(0, 0, 5)
oppositeStageLight.target.position.set(0, 0, 0)
scene.add(oppositeStageLight)
// scene.add(oppositeStageLight.target)

// Create an ambient light for overall scene illumination
const ambientLight = new AmbientLight(0xffffff, 1)
scene.add(ambientLight)

// ===== 🕹️ CONTROLS =====
const cameraControls = new OrbitControls(camera, canvas as HTMLElement)
cameraControls.target = mainSphere.position.clone()
cameraControls.enableDamping = true
cameraControls.autoRotate = true
cameraControls.autoRotateSpeed = 1.0
cameraControls.enableZoom = false
cameraControls.update()

let smoothedAudioDataFactor = 0.0
const smoothFactor = 0.06 // Adjust this value to control the smoothing speed (0.0 to 1.0)

let targetColor = new Color(0xffffff)

function animate() {
    requestAnimationFrame(animate)

    analyser.getByteTimeDomainData(dataArray)
    const maxValue = Math.max(...dataArray)
    const audioDataFactor = maxValue / 128.0 - 1.0

    // Apply low-pass filter
    smoothedAudioDataFactor += (audioDataFactor - smoothedAudioDataFactor) * smoothFactor

    shaderMaterial.uniforms.audioDataFactor.value = smoothedAudioDataFactor

    analyser.getByteFrequencyData(frequencyDataArray)
    const lowFrequencyValue = frequencyDataArray[frequencyDataArray.length - 1] / 255.0
    const highFrequencyValue = frequencyDataArray[0] / 255.0
    const colorFactor = highFrequencyValue - lowFrequencyValue
    targetColor.setHSL(colorFactor * 0.7, 1.0, colorFactor * 0.7)
    const lerpFactor = 0.05 // Adjust this value to change the smoothness of the color transition
    shaderMaterial.uniforms.audioColor.value.lerp(targetColor, lerpFactor)

    const sma = 0.5 * Math.sin(smoothedAudioDataFactor * 3) + 0.1
    ambientLight.intensity = sma

    const rotationSpeed = 10.5
    spotLight.position.y = 5 + 3 * Math.sin(smoothedAudioDataFactor * rotationSpeed)
    spotLight.position.x = 3 * Math.cos(smoothedAudioDataFactor * rotationSpeed)
    oppositeStageLight.position.y = -5 - 3 * Math.sin(smoothedAudioDataFactor * rotationSpeed)
    oppositeStageLight.position.x = -3 * Math.cos(smoothedAudioDataFactor * rotationSpeed)

    spotLight.angle = Math.PI / 6 + 0.1 * smoothedAudioDataFactor
    oppositeStageLight.angle = Math.PI / 4 + 0.1 * smoothedAudioDataFactor

    // @ts-ignore
    mainSphere.material.uniforms.time.value = performance.now() / 1000

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    cameraControls.update()

    renderer.render(scene, camera)
}

animate()
