import {
    AmbientLight,
    BoxGeometry,
    Color,
    Layers,
    Mesh,
    MeshBasicMaterial,
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
import { lerp } from 'three/src/math/MathUtils'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { fragmentShader } from './shaders/fragment'
import { fragmentShaderBase } from './shaders/fragment-base'
import { vertexShader } from './shaders/vertex'
import './style.css'

function mapRange(value: number, inputMin: number, inputMax: number, outputMin: number, outputMax: number) {
    return outputMin + ((outputMax - outputMin) * (value - inputMin)) / (inputMax - inputMin)
}

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
    document.querySelector(`#play-text`)!.textContent = 'LOADING...'
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
spotLight.target.position.set(0, 0, -5)
spotLight.angle = Math.PI / 6
spotLight.penumbra = 0.5
spotLight.layers.set(0)
scene.add(spotLight)
scene.add(spotLight.target)

const bigSpotLight = new SpotLight(0xffffff, 1)
bigSpotLight.position.set(0, 0, 5)
bigSpotLight.target.position.set(0, 0, -5)
bigSpotLight.angle = Math.PI / 6
bigSpotLight.penumbra = 0.5
bigSpotLight.layers.set(0)
scene.add(bigSpotLight)
scene.add(bigSpotLight.target)

const leftBottomSpotLight = new SpotLight(0xffffff, 1)
leftBottomSpotLight.position.set(-150, -150, 5)
leftBottomSpotLight.target.position.copy(spotLight.target.position)
leftBottomSpotLight.angle = Math.PI / 4
leftBottomSpotLight.penumbra = 0.1
leftBottomSpotLight.layers.set(0)
scene.add(leftBottomSpotLight)

const rightBottomSpotLight = new SpotLight(0xffffff, 1)
rightBottomSpotLight.position.set(150, -150, 5)
rightBottomSpotLight.target.position.copy(spotLight.target.position)
rightBottomSpotLight.angle = Math.PI / 4
rightBottomSpotLight.penumbra = 0.1
rightBottomSpotLight.layers.set(0)
scene.add(rightBottomSpotLight)

const leftTopSpotLight = new SpotLight(0xffffff, 1)
leftTopSpotLight.position.set(-150, 150, 5)
leftTopSpotLight.target.position.copy(spotLight.target.position)
leftTopSpotLight.angle = Math.PI / 4
leftTopSpotLight.penumbra = 0.1
leftTopSpotLight.layers.set(0)
scene.add(leftTopSpotLight)

const rightTopSpotLight = new SpotLight(0xffffff, 1)
rightTopSpotLight.position.set(150, 150, 5)
rightTopSpotLight.target.position.copy(spotLight.target.position)
rightTopSpotLight.angle = Math.PI / 4
rightTopSpotLight.penumbra = 0.1
rightTopSpotLight.layers.set(0)
scene.add(rightTopSpotLight)

/// MAIN OBJECTS

const smallSphereGeometry = new SphereGeometry(0.8, 32, 32)
const smallSphereMaterial = new CustomShaderMaterial({
    baseMaterial: MeshBasicMaterial,
    vertexShader,
    fragmentShader: fragmentShaderBase,
    uniforms: {
        time: { value: 0.0 },
        audioDataFactor: { value: 0.0 },
        audioColor: { value: new Color(0xffffff) },
    },
})
const smallSphere = new Mesh(smallSphereGeometry, smallSphereMaterial)
smallSphere.position.set(0, 0, 0)
scene.add(smallSphere)

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

const leftPointLight = new PointLight(0xffffff, 1, 100)
leftPointLight.position.set(-5, 0, 0)
leftPointLight.layers.set(1)
scene.add(leftPointLight)

const rightPointLight = new PointLight(0xffffff, 1, 100)
rightPointLight.position.set(5, 0, 0)
rightPointLight.layers.set(1)
scene.add(rightPointLight)

const ambientLight = new AmbientLight(0xffffff, 1)
ambientLight.layers.enable(1)
ambientLight.layers.disable(0)
// scene.add(ambientLight)

// ===== 🕹️ ANIMATE =====

let smoothedAudioDataFactor = 0.0
const smoothFactor = 0.06 // Adjust this value to control the smoothing speed (0.0 to 1.0)

let targetColor = new Color(0xffffff)
let smallTargetColor = new Color(0xffffff)
const lerpFactor = 0.05 // Adjust this value to change the smoothness of the color transition

let smoothedSpotAngle = Math.PI / 6 // Initialize to the starting angle
let smoothedBigAngle = Math.PI / 6 // Initialize to the starting angle
const angleSmoothFactor = 0.1 // Adjust this value to control the smoothing speed (0.0 to 1.0)

function animate() {
    requestAnimationFrame(animate)

    analyser.getByteTimeDomainData(dataArray)
    const maxValue = Math.max(...dataArray)
    const audioDataFactor = maxValue / 128.0 - 1.0

    // Apply low-pass filter
    smoothedAudioDataFactor += (audioDataFactor - smoothedAudioDataFactor) * smoothFactor

    shaderMaterial.uniforms.audioDataFactor.value = smoothedAudioDataFactor

    smallSphereMaterial.uniforms.audioDataFactor.value = smoothedAudioDataFactor * 2

    analyser.getByteFrequencyData(frequencyDataArray)
    const lowFrequencyValue = frequencyDataArray[frequencyDataArray.length - 1] / 255.0
    const highFrequencyValue = frequencyDataArray[0] / 255.0
    const colorFactor = highFrequencyValue - lowFrequencyValue

    targetColor.setHSL(colorFactor, 1.0, colorFactor * 0.7 + 0.1)
    shaderMaterial.uniforms.audioColor.value.lerp(targetColor, lerpFactor)

    smallTargetColor.setHSL(colorFactor, 1.0, colorFactor + 0.5)
    smallSphereMaterial.uniforms.audioColor.value.lerp(smallTargetColor, lerpFactor)
    // smallSphereMaterial.color.copy(shaderMaterial.uniforms.audioColor.value)

    const intencity = Math.sin(smoothedAudioDataFactor * 3) + 0.5
    ambientLight.intensity = 0.5 * intencity
    leftBottomSpotLight.intensity = intencity * 2
    rightBottomSpotLight.intensity = intencity * 2
    leftTopSpotLight.intensity = intencity * 2
    rightTopSpotLight.intensity = intencity * 2

    const minSpotAngle = Math.PI / 24
    const maxSpotAngle = Math.PI / 8
    const targetAngle = mapRange(smoothedAudioDataFactor, 0, 1, minSpotAngle, maxSpotAngle)
    smoothedSpotAngle += (targetAngle - smoothedSpotAngle) * angleSmoothFactor
    spotLight.angle = smoothedSpotAngle
    const spotIntensityFactor = mapRange(smoothedSpotAngle, minSpotAngle, maxSpotAngle, 0, 1)
    spotLight.intensity = lerp(0, 5, spotIntensityFactor)

    const minBigSpotAngle = Math.PI / 8
    const maxBigSpotAngle = Math.PI / 4
    const targetBigSpotAngle = mapRange(smoothedAudioDataFactor, 0, 1, minBigSpotAngle, maxBigSpotAngle)
    smoothedBigAngle += (targetBigSpotAngle - smoothedBigAngle) * angleSmoothFactor
    bigSpotLight.angle = smoothedBigAngle
    const intensityFactor = mapRange(smoothedBigAngle, minBigSpotAngle, maxBigSpotAngle, 0, 1)
    bigSpotLight.intensity = lerp(0, 1, intensityFactor)

    ambientLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    leftPointLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    rightPointLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    spotLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    bigSpotLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    leftBottomSpotLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    rightBottomSpotLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    leftTopSpotLight.color.copy(shaderMaterial.uniforms.audioColor.value)
    rightTopSpotLight.color.copy(shaderMaterial.uniforms.audioColor.value)

    // @ts-ignore
    const time = performance.now() / 1000
    mainSphere.material.uniforms.time.value = time
    smallSphere.material.uniforms.time.value = time

    mainSphere.rotation.x += 0.002
    mainSphere.rotation.y += -0.002
    mainSphere.rotation.z += 0.003

    smallSphere.rotation.x += 0.003
    smallSphere.rotation.y += -0.002
    smallSphere.rotation.z += 0.002

    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement
        camera.aspect = canvas.clientWidth / canvas.clientHeight
        camera.updateProjectionMatrix()
    }

    renderer.render(scene, camera)
}

animate()
