import { Color, Mesh, PerspectiveCamera, Scene, ShaderMaterial, SphereGeometry, WebGLRenderer } from 'three'
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
        })
        .catch(console.error)
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
const shaderMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
        time: { value: 0.0 },
        audioDataFactor: { value: 0.0 },
        audioColor: { value: new Color(0xffffff) },
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
