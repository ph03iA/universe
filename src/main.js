import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { createNoise3D } from 'simplex-noise';

let renderer, scene, camera, sphereBg, nucleas, stars, controls, controls2;
let timeout_Debounce;
const container = document.getElementById('canvas_container');
const noise = createNoise3D();
let blobScale = 3;

function randomPointSphere(radius) {
    const theta = 2 * Math.PI * Math.random() - 1;
    const phi = Math.acos(2 * Math.random() - 1);
    const dx = 0 + radius * Math.sin(phi) * Math.cos(theta);
    const dy = 0 + radius * Math.sin(phi) * Math.sin(theta);
    const dz = 0 + radius * Math.cos(phi);
    return new THREE.Vector3(dx, dy, dz);
}

init();
animate();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 230);


    // Add ambient light to fill in shadows
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.7);
    scene.add(ambientLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // OrbitControls for rotation and pan.
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.maxDistance = 350;
    controls.minDistance = 150;
    controls.enablePan = false;
    // Disable zoom in OrbitControls, so that TrackballControls can handle it.
    controls.enableZoom = false;

    // TrackballControls for smooth zooming.
    controls2 = new TrackballControls(camera, renderer.domElement);
    controls2.noRotate = true;
    controls2.noPan = true;
    controls2.noZoom = false;
    controls2.zoomSpeed = 0.5;

    const loader = new THREE.TextureLoader();
    const textureSphereBg = loader.load('../static/textures/1.jpg');
    const textureNucleas = loader.load('../static/textures/2.jpg');
    const textureStar = loader.load('../static/textures/3.png');
    const texture2 = loader.load('../static/textures/4.png');

    textureNucleas.anisotropy = 16;
    // Create geometry once in init
    const icosahedronGeometry = new THREE.IcosahedronGeometry(30, 10);


    // Updated material for better visibility
    const nucleusMaterial = new THREE.MeshPhongMaterial({
        map: textureNucleas,
        // color: 0xffffff,
        // roughness: 0.2,
        // metalness: 0.1,
        // transmission: 0.0,
        // clearcoat: 0.0,
        // clearcoatRoughness: 0.0,
        // toneMapped: false
    });


    // nucleusMaterial.color.setHex(0xffffff);




    nucleas = new THREE.Mesh(icosahedronGeometry, nucleusMaterial);
    scene.add(nucleas);

    textureSphereBg.anisotropy = 16;
    const geometrySphereBg = new THREE.SphereGeometry(150, 40, 40);
    const materialSphereBg = new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: textureSphereBg, reflectivity: 1.0 });
    sphereBg = new THREE.Mesh(geometrySphereBg, materialSphereBg);
    scene.add(sphereBg);

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
        map: textureStar,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });
    starsMaterial.depthWrite = false;
    stars = new THREE.Points(starGeometry, starsMaterial);
    scene.add(stars);

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

    scene.add(createStars(texture2, 1.3, 1000));
}

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

    // Blob animation: Update existing geometry instead of recreating
    // In the animate function, modify the blob animation section:
    const positions = nucleas.geometry.attributes.position;
    const time = Date.now() * 0.0003; // Slower time factor for more fluid movement
    for (let i = 0; i < positions.array.length; i += 3) {
        const x = positions.array[i];
        const y = positions.array[i + 1];
        const z = positions.array[i + 2];

        // Calculate the base position (normalized direction from center)
        const length = Math.sqrt(x * x + y * y + z * z);
        const nx = x / length;
        const ny = y / length;
        const nz = z / length;

        // Use a different noise pattern with varying frequencies
        const noiseValue = noise(
            nx * 2.0 + time * 0.8,
            ny * 2.0 + time * 1.2,
            nz * 2.0 + time * 0.4
        );



        // Create more rounded, organic blob shape
        const distance = 30 * (1 + 0.16 * noiseValue);

        positions.array[i] = nx * distance;
        positions.array[i + 1] = ny * distance;
        positions.array[i + 2] = nz * distance;
    }
    positions.needsUpdate = true;


    // Full rotation for the blob
    nucleas.rotation.x += 0.002;
    nucleas.rotation.y += 0.002;
    nucleas.rotation.z += 0.002;

    // Background sphere rotation
    sphereBg.rotation.x += 0.00001;
    sphereBg.rotation.y += 0.00001;
    sphereBg.rotation.z += 0.00001;

    // Synchronize TrackballControls zoom target with OrbitControls target.
    controls2.target.copy(controls.target);

    // Update both controls.
    controls.update();
    controls2.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    clearTimeout(timeout_Debounce);
    timeout_Debounce = setTimeout(onWindowResize, 88);
});

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}
