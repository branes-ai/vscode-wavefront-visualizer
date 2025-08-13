// VS Code API
const vscode = acquireVsCodeApi();

// Debug logging function
function debugLog(message) {
    console.log('[Wavefront]', message);
    const debugElement = document.getElementById('debugLog');
    if (debugElement) {
        debugElement.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
        debugElement.scrollTop = debugElement.scrollHeight;
    }
}

// Three.js scene components
let scene, camera, renderer, controls;
let wavefrontData = null;
let currentFrame = 0;
let isPlaying = false;
let animationSpeed = 1.0;
let renderMode = 'points';

// Visualization objects
let pointsGroup = new THREE.Group();
let cubesGroup = new THREE.Group();
let spheresGroup = new THREE.Group();
let gridHelper, axesHelper;

// Animation
let animationId = null;
let lastFrameTime = 0;

// Initialize the visualization
function init() {
    debugLog('Starting initialization...');
    
    try {
        if (typeof THREE === 'undefined') {
            debugLog('ERROR: Three.js is not loaded!');
            return;
        }
        
        debugLog('Three.js version: ' + THREE.REVISION);
        
        const container = document.getElementById('visualization');
        if (!container) {
            debugLog('ERROR: Could not find visualization container');
            return;
        }
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e1e1e);
        debugLog('Scene created');
        
        // Create camera
        camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(25, 25, 25);
        camera.lookAt(16, 16, 8);
        debugLog('Camera created');
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        debugLog('Renderer created and added to DOM');
        
        // Add orbit controls (simplified version)
        addOrbitControls();
        debugLog('Orbit controls added');
        
        // Create coordinate system helpers
        createHelpers();
        debugLog('Helpers created');
        
        // Add groups to scene
        scene.add(pointsGroup);
        scene.add(cubesGroup);
        scene.add(spheresGroup);
        scene.add(gridHelper);
        scene.add(axesHelper);
        debugLog('Groups added to scene');
        
        // Setup event listeners
        setupEventListeners();
        debugLog('Event listeners setup');
        
        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);
        
        // Start render loop
        animate();
        debugLog('Animation loop started');
        
        // Notify extension that webview is ready
        vscode.postMessage({ command: 'ready' });
        debugLog('Ready message sent to extension');
        
    } catch (error) {
        debugLog('ERROR in init: ' + error.message);
        console.error('Initialization error:', error);
    }
}

function createHelpers() {
    // Grid helper for visualization reference
    gridHelper = new THREE.GridHelper(64, 64, 0x444444, 0x444444);
    gridHelper.position.set(32, 0, 32);
    
    // Axes helper
    axesHelper = new THREE.AxesHelper(20);
    axesHelper.position.set(0, 0, 0);
}

function addOrbitControls() {
    // Simplified orbit controls implementation
    let isMouseDown = false;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    let phi = Math.PI / 4;
    let theta = Math.PI / 4;
    const radius = Math.sqrt(50*50 + 50*50 + 50*50);
    
    renderer.domElement.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        
        theta -= deltaX * 0.01;
        phi += deltaY * 0.01;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        
        updateCameraPosition();
        
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    renderer.domElement.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    renderer.domElement.addEventListener('wheel', (e) => {
        const scale = e.deltaY > 0 ? 1.1 : 0.9;
        camera.position.multiplyScalar(scale);
    });
    
    function updateCameraPosition() {
        const x = radius * Math.sin(phi) * Math.cos(theta) + 32;
        const y = radius * Math.cos(phi) + 32;
        const z = radius * Math.sin(phi) * Math.sin(theta) + 16;
        
        camera.position.set(x, y, z);
        camera.lookAt(32, 32, 16);
    }
}

function setupEventListeners() {
    // Time slider
    const timeSlider = document.getElementById('timeSlider');
    const timeValue = document.getElementById('timeValue');
    
    timeSlider.addEventListener('input', (e) => {
        currentFrame = parseInt(e.target.value);
        timeValue.textContent = currentFrame;
        updateVisualization();
    });
    
    // Play/pause/reset buttons
    document.getElementById('playBtn').addEventListener('click', () => {
        isPlaying = true;
        if (!animationId) {
            playAnimation();
        }
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        isPlaying = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        currentFrame = 0;
        timeSlider.value = '0';
        timeValue.textContent = '0';
        isPlaying = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        updateVisualization();
    });
    
    // Speed slider
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    
    speedSlider.addEventListener('input', (e) => {
        animationSpeed = parseFloat(e.target.value);
        speedValue.textContent = animationSpeed.toFixed(1) + 'x';
    });
    
    // Render mode
    document.getElementById('renderMode').addEventListener('change', (e) => {
        renderMode = e.target.value;
        updateVisualization();
    });
}

function playAnimation() {
    if (!isPlaying || !wavefrontData) return;
    
    const now = Date.now();
    if (now - lastFrameTime >= (1000 / (10 * animationSpeed))) {
        currentFrame = (currentFrame + 1) % wavefrontData.wavefronts.length;
        
        const timeSlider = document.getElementById('timeSlider');
        const timeValue = document.getElementById('timeValue');
        timeSlider.value = currentFrame.toString();
        timeValue.textContent = currentFrame.toString();
        
        updateVisualization();
        lastFrameTime = now;
    }
    
    if (isPlaying) {
        animationId = requestAnimationFrame(playAnimation);
    }
}

function updateVisualization() {
    if (!wavefrontData || !wavefrontData.wavefronts[currentFrame]) return;
    
    const frameData = wavefrontData.wavefronts[currentFrame];
    
    // Clear previous visualization
    clearVisualization();
    
    // Update info panel
    updateInfoPanel(frameData);
    
    // Create visualization based on render mode
    switch (renderMode) {
        case 'points':
            createPointsVisualization(frameData);
            break;
        case 'cubes':
            createCubesVisualization(frameData);
            break;
        case 'spheres':
            createSpheresVisualization(frameData);
            break;
    }
}

function clearVisualization() {
    // Remove all children from visualization groups
    while (pointsGroup.children.length > 0) {
        pointsGroup.remove(pointsGroup.children[0]);
    }
    while (cubesGroup.children.length > 0) {
        cubesGroup.remove(cubesGroup.children[0]);
    }
    while (spheresGroup.children.length > 0) {
        spheresGroup.remove(spheresGroup.children[0]);
    }
}

function createPointsVisualization(frameData) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    frameData.activeIndices.forEach(([x, y, z]) => {
        positions.push(x, y, z);
        
        // Color based on position or metadata
        const intensity = Math.sin(x * 0.1) * Math.cos(y * 0.1) * Math.sin(z * 0.1);
        colors.push(
            0.5 + intensity * 0.5,  // R
            0.3 + intensity * 0.3,  // G
            0.8 + intensity * 0.2   // B
        );
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const points = new THREE.Points(geometry, material);
    pointsGroup.add(points);
    
    // Show only points group
    pointsGroup.visible = true;
    cubesGroup.visible = false;
    spheresGroup.visible = false;
}

function createCubesVisualization(frameData) {
    const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7
    });
    
    frameData.activeIndices.forEach(([x, y, z]) => {
        const cube = new THREE.Mesh(cubeGeometry, material.clone());
        cube.position.set(x, y, z);
        
        // Color variation based on position
        const hue = (x + y + z) / (64 + 64 + 32);
        cube.material.color.setHSL(hue, 0.8, 0.6);
        
        cubesGroup.add(cube);
    });
    
    // Show only cubes group
    pointsGroup.visible = false;
    cubesGroup.visible = true;
    spheresGroup.visible = false;
}

function createSpheresVisualization(frameData) {
    const sphereGeometry = new THREE.SphereGeometry(0.4, 8, 6);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    
    frameData.activeIndices.forEach(([x, y, z]) => {
        const sphere = new THREE.Mesh(sphereGeometry, material.clone());
        sphere.position.set(x, y, z);
        
        // Size variation based on distance from center
        const distance = Math.sqrt(
            Math.pow(x - 32, 2) + 
            Math.pow(y - 32, 2) + 
            Math.pow(z - 16, 2)
        );
        const scale = 0.5 + (1 - Math.min(distance / 40, 1)) * 1.5;
        sphere.scale.setScalar(scale);
        
        spheresGroup.add(sphere);
    });
    
    // Show only spheres group
    pointsGroup.visible = false;
    cubesGroup.visible = false;
    spheresGroup.visible = true;
}

function updateInfoPanel(frameData) {
    const operatorDetails = document.getElementById('operatorDetails');
    const frameDetails = document.getElementById('frameDetails');
    
    if (wavefrontData) {
        const opInfo = wavefrontData.operatorInfo;
        operatorDetails.innerHTML = `
            Type: ${opInfo.type}<br>
            Input: [${opInfo.inputShape.join(', ')}]<br>
            Output: [${opInfo.outputShape.join(', ')}]<br>
            Index Space: [${wavefrontData.indexSpace.dimensions.join(', ')}]
        `;
    }
    
    frameDetails.innerHTML = `
        Time: ${frameData.timestamp}<br>
        Active: ${frameData.activeIndices.length}<br>
        Type: ${frameData.operatorType}<br>
        ${frameData.metadata ? `Radius: ${frameData.metadata.wavefrontRadius?.toFixed(1) || 'N/A'}` : ''}
    `;
}

function onWindowResize() {
    const container = document.getElementById('visualization');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'loadSchedule':
            loadScheduleData(message.data);
            break;
    }
});

function loadScheduleData(data) {
    debugLog('loadScheduleData called with data: ' + JSON.stringify(data).substring(0, 200) + '...');
    
    try {
        wavefrontData = data;
        
        if (!wavefrontData || !wavefrontData.wavefronts || wavefrontData.wavefronts.length === 0) {
            debugLog('ERROR: Invalid wavefront data structure');
            return;
        }
        
        debugLog('Loaded ' + wavefrontData.wavefronts.length + ' wavefront frames');
        
        // Update time slider range
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            timeSlider.max = (data.wavefronts.length - 1).toString();
            debugLog('Time slider max set to: ' + timeSlider.max);
        }
        
        // Reset to first frame
        currentFrame = 0;
        if (timeSlider) {
            timeSlider.value = '0';
        }
        const timeValue = document.getElementById('timeValue');
        if (timeValue) {
            timeValue.textContent = '0';
        }
        
        // Update visualization
        updateVisualization();
        debugLog('Initial visualization update complete');
        
    } catch (error) {
        debugLog('ERROR in loadScheduleData: ' + error.message);
        console.error('Load schedule error:', error);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);