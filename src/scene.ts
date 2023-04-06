import {
    LoadingManager,
    Mesh,
    PCFSoftShadowMap,
    PerspectiveCamera,
    Scene,
    ShaderMaterial,
    SphereGeometry,
    WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { vertexShader } from './shaders/vertex'
import { fragmentShader } from './shaders/fragment'
import './style.css'

const CANVAS_ID = 'scene'

let canvas: HTMLElement
let renderer: WebGLRenderer
let scene: Scene
let loadingManager: LoadingManager
let mainSphere: Mesh
let camera: PerspectiveCamera
let cameraControls: OrbitControls

init()
animate()

function init() {
    // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    scene = new Scene()

    // ===== 👨🏻‍💼 LOADING MANAGER =====
    loadingManager = new LoadingManager()

    loadingManager.onStart = () => {
        console.log('loading started')
    }
    loadingManager.onProgress = (url, loaded, total) => {
        console.log('loading in progress:')
        console.log(`${url} -> ${loaded} / ${total}`)
    }
    loadingManager.onLoad = () => {
        console.log('loaded!')
    }
    loadingManager.onError = () => {
        console.log('❌ error while loading')
    }

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
    mainSphere = new Mesh(geometry, shaderMaterial)

    scene.add(mainSphere)

    // ===== 🎥 CAMERA =====
    camera = new PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(2, 2, 7)

    // ===== 🕹️ CONTROLS =====
    cameraControls = new OrbitControls(camera, canvas)
    cameraControls.target = mainSphere.position.clone()
    cameraControls.enableDamping = true
    cameraControls.autoRotate = true
    cameraControls.autoRotateSpeed = 0.5
    cameraControls.enableZoom = false
    cameraControls.update()
}

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

    renderer.render(scene, camera)
}
