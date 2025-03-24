import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { createNoise3D } from 'simplex-noise';

let renderer, scene, camera, sphereBg, nucleas, stars, controls, controls2;
let timeout_Debounce;
const container = document.getElementById('canvas_container');
const noise = createNoise3D();
let blobScale = 3;
const textures = {};

// **Preload Textures using LoadingManager**
const loadingManager = new THREE.LoadingManager(() => {
    console.log("All textures loaded");
    init(); // Call scene initialization only after textures are preloaded
});

const loader = new THREE.TextureLoader(loadingManager);

textures.sphereBg = loader.load('../static/textures/1.webp');
textures.nucleas = loader.load('../static/textures/2.webp');
textures.star = loader.load('../static/textures/3.png');
textures.texture2 = loader.load('../static/textures/4.png');

function randomPointSphere(radius) {
    const theta = 2 * Math.PI * Math.random() - 1;
    const phi = Math.acos(2 * Math.random() - 1);
    const dx = radius * Math.sin(phi) * Math.cos(theta);
    const dy = radius * Math.sin(phi) * Math.sin(theta);
    const dz = radius * Math.cos(phi);
    return new THREE.Vector3(dx, dy, dz);
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 230);

    // Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.7);
    scene.add(ambientLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.maxDistance = 350;
    controls.minDistance = 150;
    controls.enablePan = false;
    controls.enableZoom = false; // Let TrackballControls handle zoom

    controls2 = new TrackballControls(camera, renderer.domElement);
    controls2.noRotate = true;
    controls2.noPan = true;
    controls2.noZoom = false;
    controls2.zoomSpeed = 0.5;

    // Set texture properties
    textures.nucleas.anisotropy = 16;
    textures.sphereBg.anisotropy = 16;

    // **Create Nucleus (Main Blob)**
    const icosahedronGeometry = new THREE.IcosahedronGeometry(30, 10);
    const nucleusMaterial = new THREE.MeshPhongMaterial({ map: textures.nucleas });
    nucleas = new THREE.Mesh(icosahedronGeometry, nucleusMaterial);
    scene.add(nucleas);

    // **Create Background Sphere**
    const geometrySphereBg = new THREE.SphereGeometry(150, 40, 40);
    const materialSphereBg = new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: textures.sphereBg });
    sphereBg = new THREE.Mesh(geometrySphereBg, materialSphereBg);
    scene.add(sphereBg);

    // **Create Stars**
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const velocities = [];
    for (let i = 0; i < 1000; i++) {
        const particle = randomPointSphere(150);
        starPositions.push(particle.x, particle.y, particle.z);
        velocities.push(THREE.MathUtils.randFloat(100, 150));
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 1));

    const starsMaterial = new THREE.PointsMaterial({
        size: 5,
        color: 0xffffff,
        map: textures.star,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });
    starsMaterial.depthWrite = false;
    stars = new THREE.Points(starGeometry, starsMaterial);
    scene.add(stars);

    // Additional distant stars
    scene.add(createStars(textures.texture2, 1.3, 1000));

    animate();
}

// **Helper Function to Create More Stars**
function createStars(texture, size, total) {
    const pointGeometry = new THREE.BufferGeometry();
    const pointPositions = [];
    for (let i = 0; i < total; i++) {
        const radius = THREE.MathUtils.randInt(70, 149);
        const particle = randomPointSphere(radius);
        pointPositions.push(particle.x, particle.y, particle.z);
    }
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));

    const pointMaterial = new THREE.PointsMaterial({
        size: size,
        map: texture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 2.0,
    });
    return new THREE.Points(pointGeometry, pointMaterial);
}

// **Animation Loop**
function animate() {
    // Star animation
    const starPositions = stars.geometry.attributes.position.array;
    const velocities = stars.geometry.attributes.velocity.array;
    for (let i = 0; i < starPositions.length; i += 3) {
        let x = starPositions[i];
        let y = starPositions[i + 1];
        let z = starPositions[i + 2];
        let velocity = velocities[i / 3];

        x += (0 - x) / velocity;
        y += (0 - y) / velocity;
        z += (0 - z) / velocity;

        velocity -= 0.3;
        if (velocity < 10) velocity = THREE.MathUtils.randFloat(50, 200);

        if (Math.abs(x) < 5 && Math.abs(z) < 5) {
            const resetPos = randomPointSphere(150);
            x = resetPos.x;
            y = resetPos.y;
            z = resetPos.z;
            velocity = THREE.MathUtils.randFloat(50, 200);
        }

        starPositions[i] = x;
        starPositions[i + 1] = y;
        starPositions[i + 2] = z;
        velocities[i / 3] = velocity;
    }
    stars.geometry.attributes.position.needsUpdate = true;
    stars.geometry.attributes.velocity.needsUpdate = true;

    // Blob animation
    const positions = nucleas.geometry.attributes.position;
    const time = Date.now() * 0.0003;
    for (let i = 0; i < positions.array.length; i += 3) {
        const x = positions.array[i];
        const y = positions.array[i + 1];
        const z = positions.array[i + 2];

        const length = Math.sqrt(x * x + y * y + z * z);
        const nx = x / length;
        const ny = y / length;
        const nz = z / length;

        const noiseValue = noise(nx * 2.0 + time * 0.8, ny * 2.0 + time * 1.2, nz * 2.0 + time * 0.4);
        const distance = 30 * (1 + 0.16 * noiseValue);

        positions.array[i] = nx * distance;
        positions.array[i + 1] = ny * distance;
        positions.array[i + 2] = nz * distance;
    }
    positions.needsUpdate = true;

    // Rotation
    nucleas.rotation.x += 0.002;
    nucleas.rotation.y += 0.002;
    sphereBg.rotation.y += 0.00001;

    controls2.target.copy(controls.target);
    controls.update();
    controls2.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// **Resize Handler**
window.addEventListener('resize', () => {
    clearTimeout(timeout_Debounce);
    timeout_Debounce = setTimeout(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }, 88);
});
