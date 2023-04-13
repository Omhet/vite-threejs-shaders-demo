import {
    AmbientLight,
    BoxGeometry,
    Color,
    Layers,
    Mesh,
    MeshStandardMaterial,
    PCFSoftShadowMap,
    PerspectiveCamera,
    PointLight,
    Scene,
    SphereGeometry,
    SpotLight,
    WebGLRenderer,
} from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { fragmentShader } from './shaders/fragment'
import { vertexShader } from './shaders/vertex'
import './style.css'

// function goFullScreen() {
//     if (document.documentElement.requestFullscreen) {
//         document.documentElement.requestFullscreen()
//     } else if (document.documentElement.mozRequestFullScreen) {
//         // Firefox
//         document.documentElement.mozRequestFullScreen()
//     } else if (document.documentElement.webkitRequestFullscreen) {
//         // Chrome, Safari and Opera
//         document.documentElement.webkitRequestFullscreen()
//     } else if (document.documentElement.msRequestFullscreen) {
//         // IE/Edge
//         document.documentElement.msRequestFullscreen()
//     }
// }

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
            // goFullScreen()
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
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap // Optional, for softer shadows

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
const scene = new Scene()

// ===== 🎥 CAMERA =====
const camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
camera.position.set(0, 0, 7)
camera.layers.enable(0) // Enable rendering of the default layer (0)
camera.layers.enable(1) // Enable rendering of layer 1

// ===== 📦 OBJECTS =====

const objectLayer = new Layers()
objectLayer.set(1) // Set the layer to 1 (0 is default)

const wallGeometry = new BoxGeometry(100, 100, 1)
const wallMaterial = new MeshStandardMaterial({ color: 0x111111 })
const wall = new Mesh(wallGeometry, wallMaterial)
wall.position.set(0, 0, -4)
wall.layers.set(0)
scene.add(wall)

const spotLight = new SpotLight(0xffffff, 1)
spotLight.position.set(0, 0, 5)
spotLight.target.position.set(0, 0, -5) // Point the spotlight towards the camera
spotLight.angle = Math.PI / 6
spotLight.penumbra = 0.5
spotLight.castShadow = true
spotLight.layers.set(0)
// spotLight.intensity = 10
scene.add(spotLight)
scene.add(spotLight.target)

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
mainSphere.castShadow = true
mainSphere.layers.set(1)

scene.add(mainSphere)

// Create a point light (like a light bulb) on the left
const leftPointLight = new PointLight(0xffffff, 1, 100)
leftPointLight.position.set(-5, 0, 0)
leftPointLight.layers.set(1)
scene.add(leftPointLight)

// Create a point light (like a light bulb) on the right
const rightPointLight = new PointLight(0xffffff, 1, 100)
rightPointLight.position.set(5, 0, 0)
rightPointLight.layers.set(1)
scene.add(rightPointLight)

// Create an ambient light for overall scene illumination
const ambientLight = new AmbientLight(0xffffff, 1)
ambientLight.layers.enable(1) // Enable the ambient light to affect layer 1
ambientLight.layers.disable(0) // Enable the ambient light to affect layer 1
scene.add(ambientLight)

// ===== 🕹️ ANIMATE =====

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
    targetColor.setHSL(colorFactor * 0.7, 1.0, colorFactor * 0.8)
    const lerpFactor = 0.05 // Adjust this value to change the smoothness of the color transition
    shaderMaterial.uniforms.audioColor.value.lerp(targetColor, lerpFactor)

    const sma = 0.5 * Math.sin(smoothedAudioDataFactor * 3) + 0.5
    ambientLight.intensity = sma
    spotLight.intensity = 5 * Math.sin(smoothedAudioDataFactor * 3) + 0.5

    ambientLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    leftPointLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    rightPointLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    spotLight.color.copy(shaderMaterial.uniforms.audioColor.value)

    // @ts-ignore
    mainSphere.material.uniforms.time.value = performance.now() / 1000

    mainSphere.rotation.x += 0.002
    mainSphere.rotation.y += -0.002
    mainSphere.rotation.z += 0.003

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    renderer.render(scene, camera)
}

animate()
