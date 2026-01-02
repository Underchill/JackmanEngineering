import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

const BLOOM_SCENE = 1; // Layer 1 is for glowing objects

function createTooltip() {
    if (document.getElementById('tooltip')) return; // Already exists
    
    const style = document.createElement('style');
    style.innerHTML = `
        #tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: sans-serif;
            font-size: 14px;
            pointer-events: none; /* Let clicks pass through */
            display: none; /* Hidden by default */
            border: 1px solid rgba(255, 255, 255, 0.3);
            z-index: 1000;
            transform: translate(-50%, -100%); /* Center above cursor/object */
            margin-top: -10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        #tooltip h4 { margin: 0 0 4px 0; color: #ffd700; font-size: 1.1em; }
        #tooltip p { margin: 0; color: #ccc; font-size: 0.9em; }
    `;
    document.head.appendChild(style);

    const div = document.createElement('div');
    div.id = 'tooltip';
    document.body.appendChild(div);
}

createTooltip(); // Run immediately
const tooltip = document.getElementById('tooltip');

// --- SHADERS & MATERIALS ---
const textureLoader = new THREE.TextureLoader();

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

const fragmentShader = `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
        gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
    }
`;

const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

const MATERIALS = {
    matYellow: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.0, roughness: 0.2 }),
    matRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 1, metalness: .1 }),
    matBlueO: new THREE.MeshStandardMaterial({color: 0x007bff, metalness: 0.0, roughness: 1, opacity: 0.7, transparent: false, emissive: 0x001133}),
    matMetallic: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.2 }),
    matOrange: new THREE.MeshStandardMaterial({color: 0xffa500, metalness: 0.0, roughness: 0.2, emissive: 0xffa500}),
    matBlue: new THREE.MeshStandardMaterial({ color: 0x0055ff, metalness: 0.0, roughness: 0.2 }),
    matBlack: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 1, metalness: .1 }),
    matWhite: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: .2, metalness: .1 }),
    matChrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.0 }),
    default: new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.0, roughness: 0.5 }),
    matPBR: new THREE.MeshStandardMaterial({
        map: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_albedo.png'),
        normalMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_normal-ogl.png'),
        roughnessMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_roughness.png'),
        metalnessMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_metallic.png'),
        aoMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_ao.png'),
        displacementMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_height.png'),
        displacementScale: 0.5,
    }),
};

const viewer1Defs = [
            { id: 'Toilet', obj: './PARTS/toilet.obj', materialKey: 'matWhite',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Sealant', obj: './PARTS/sealant.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: 11, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Nuts', obj: './PARTS/nuts.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 13, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/screws.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 18, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Upper Hardware', obj: './PARTS/topHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 2, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Male Flange', obj: './PARTS/maleFlange.obj', materialKey: 'matOrange',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'O-Ring', obj: './PARTS/maleFlangeO.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Bottom HW Screws', obj: './PARTS/bottomHWScrews.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Bottom HW', obj: './PARTS/bottomHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: -1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Female Flange', obj: './PARTS/femaleFlange.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: -5, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/femaleFlangeScrews.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Floor', obj: './PARTS/floor.obj', materialKey: 'matPBR',
            startPos: { x: 0, y: -13, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Drain', obj: './PARTS/drain.obj', materialKey: 'matWhite',
            startPos: { x: 0, y: -12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },
        ];

        const viewer2Defs = [
            { id: 'Test Plug', obj: './PARTS/plug.obj', materialKey: 'matYellow',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Plug O-ring', obj: './PARTS/plugO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/screws.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 18, z: 0 }, 
            endPos: { x: 0, y: -1, z: 0 } },

            { id: 'Bottom Hardware', obj: './PARTS/bottomHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: -1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Female Flange', obj: './PARTS/femaleFlange.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: -5, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Drain', obj: './PARTS/drain.obj', materialKey: 'matWhite',
            startPos: { x: 0, y: -12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },
        ];

        const viewer3Defs = [
            { id: 'Nuts', obj: './PARTS/nuts.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 13, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/screws.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 18, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Upper Hardware', obj: './PARTS/topHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 2, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Male Flange', obj: './PARTS/maleFlange.obj', materialKey: 'matOrange',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Male Flange O-Ring', obj: './PARTS/maleFlangeO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Bottom Hardware', obj: './PARTS/bottomHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: -1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Female Flange', obj: './PARTS/femaleFlange.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: -5, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },
        ];

const initializedViewers = {};
const activeViewers = {};

// --- HELPERS ---

function checkBloomLayer(obj) {
    return obj.layers.test( { mask: 1 << BLOOM_SCENE } );
}

function darkenNonBloomed( obj ) {
    if ( obj.isMesh && checkBloomLayer(obj) === false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial( obj ) {
    if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
    }
}

function loadModelsFromDefs(modelDefs, objLoader) {
    const assembly = new THREE.Group();
    const promises = [];

    modelDefs.forEach(def => {
        const promise = new Promise((resolve, reject) => {
            objLoader.load(
                def.obj,
                (object) => {
                    const material = MATERIALS[def.materialKey] || MATERIALS['default'];
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    });
                    object.position.set(def.startPos.x, def.startPos.y, def.startPos.z);
                    object.userData.id = def.id; // Used for the blurb text
                    object.userData.startPos = def.startPos;
                    object.userData.endPos = def.endPos;
                    object.userData.targetPosition = null; 
                    
                    assembly.add(object);
                    resolve(object);
                },
                undefined,
                (error) => { console.error(`Error loading ${def.obj}:`, error); reject(error); }
            );
        });
        promises.push(promise);
    });

    return Promise.all(promises).then(() => assembly);
}

// --- VIEWER SETUP ---

async function setupViewer(tabId, modelDefs) {
    const container = document.getElementById(`canvas-container-${tabId}`);
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const clock = new THREE.Clock();
    scene.background = new THREE.Color(0x0E0E0E);
    
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 20, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); 
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    // Environment
    // CHANGED: Use TextureLoader instead of RGBELoader for .jpg files
    new THREE.TextureLoader() 
        .setPath('./MATERIALS/')
        .load('royal_esplanade.jpg', function (texture) {
            texture.colorSpace = THREE.SRGBColorSpace; // Ensure colors look correct for a JPG
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            
            scene.backgroundBlurriness = 0.5;
            scene.environment = envMap; 
            scene.background = new THREE.Color(0x0E0E0E);
            
            pmremGenerator.dispose();
            texture.dispose();
        });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // --- POST PROCESSING ---
    const renderScene = new RenderPass( scene, camera );
    const bloomPass = new UnrealBloomPass( 
        new THREE.Vector2( container.clientWidth * window.devicePixelRatio, container.clientHeight * window.devicePixelRatio ), 
        .5, 0.4, 0.85 
    );
    bloomPass.threshold = 0;
    bloomPass.strength = .5; // High strength for obvious glow
    bloomPass.radius = 0.1;

    const bloomComposer = new EffectComposer( renderer );
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass( renderScene );
    bloomComposer.addPass( bloomPass );

    const mixPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        } ), 'baseTexture'
    );
    mixPass.needsSwap = true;

    const fxaaPass = new ShaderPass( FXAAShader );
    const pixelRatio = renderer.getPixelRatio();
    fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( container.clientWidth * pixelRatio );
    fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( container.clientHeight * pixelRatio );
    const outputPass = new OutputPass();

    const finalComposer = new EffectComposer( renderer );

    finalComposer.setPixelRatio(pixelRatio);
    finalComposer.addPass( renderScene );
    finalComposer.addPass( mixPass );
    finalComposer.addPass( fxaaPass );
    finalComposer.addPass( outputPass );

    // --- INTERACTION VARIABLES ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let selectedObject = null; // Track what is currently clicked

    function onMouseClick( event ) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
        pointer.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

        raycaster.setFromCamera( pointer, camera );

        if (!activeViewers[tabId].modelGroup) return;
        
        const intersects = raycaster.intersectObjects( activeViewers[tabId].modelGroup.children, true );

        if ( intersects.length > 0 ) {
            const res = intersects[ 0 ];
            let object = res.object;
            
            // Logic: Clear previous selection
            if (selectedObject) {
                selectedObject.layers.disable( BLOOM_SCENE );
            }

            selectedObject = object;

            const objectId = selectedObject.userData.id || selectedObject.parent?.userData.id;
            
            // List of items that should NOT glow
            const noGlowList = ['Floor', 'Toilet'];

            // Only enable bloom if the item is NOT in the list
            if ( !noGlowList.includes(objectId) ) {
                selectedObject.layers.enable( BLOOM_SCENE );
            }
            // Update Tooltip Text
            let label = objectId || "Unknown Part";
            
            tooltip.innerHTML = `
                <h4>${label}</h4>
            `;
            tooltip.style.display = 'block';

        } else {
            // ... existing deselect logic ...
            if (selectedObject) {
                selectedObject.layers.disable( BLOOM_SCENE );
                selectedObject = null;
            }
            tooltip.style.display = 'none';
        }
    }

    renderer.domElement.addEventListener( 'pointerdown', onMouseClick );


    // --- STORAGE ---
    activeViewers[tabId] = { 
        scene, camera, renderer, controls, container, 
        modelGroup: null,
        bloomComposer, finalComposer,
        getSelected: () => selectedObject
    };

    // Load Models
    const objLoader = new OBJLoader();
    try {
        const currentModelGroup = await loadModelsFromDefs(modelDefs, objLoader);
        scene.add(currentModelGroup);
        activeViewers[tabId].modelGroup = currentModelGroup; 
        camera.position.set(30, 10, -20);
    } catch (e) {
        console.error(e);
    }

    // --- ANIMATION LOOP ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();

        // Animation Logic (Lerp)
        if (activeViewers[tabId].modelGroup) {
            activeViewers[tabId].modelGroup.rotation.y += 0.0002;
            activeViewers[tabId].modelGroup.children.forEach(part => {
                if (part.userData.targetPosition) {
                    part.position.lerp(part.userData.targetPosition, 0.01);
                    if (part.position.distanceTo(part.userData.targetPosition) < 0.01) {
                        part.position.copy(part.userData.targetPosition);
                        part.userData.targetPosition = null;
                    }
                }
            });
        }

        // --- TOOLTIP POSITION SYNC ---
        // If an object is selected, move the tooltip to follow it
        if (selectedObject) {
            // Get world position
            const vector = new THREE.Vector3();
            selectedObject.getWorldPosition(vector);
            
            // Project 3D point to 2D screen space
            vector.project(camera);

            // Convert to CSS coordinates
            const x = (vector.x * .5 + .5) * container.clientWidth;
            const y = (-(vector.y * .5) + .5) * container.clientHeight;

            tooltip.style.left = `${container.offsetLeft + x}px`;
            tooltip.style.top = `${container.offsetTop + y}px`;
        }

        // --- RENDER ---
        scene.traverse( darkenNonBloomed );
        bloomComposer.render();
        scene.traverse( restoreMaterial );
        finalComposer.render();
    }
    animate();
}

function startAnimation(tabId) {
    const viewer = activeViewers[tabId];
    if (!viewer || !viewer.modelGroup) return;
    viewer.modelGroup.children.forEach(part => {
        if (part.userData.endPos) part.userData.targetPosition = new THREE.Vector3(part.userData.endPos.x, part.userData.endPos.y, part.userData.endPos.z);
    });
}

function resetAnimation(tabId) {
    const viewer = activeViewers[tabId];
    if (!viewer || !viewer.modelGroup) return;
    viewer.modelGroup.children.forEach(part => {
        if (part.userData.startPos) part.userData.targetPosition = new THREE.Vector3(part.userData.startPos.x, part.userData.startPos.y, part.userData.startPos.z);
    });
}

async function initTab1(tabId) { await setupViewer(tabId, viewer1Defs); }
async function initTab2(tabId) { await setupViewer(tabId, viewer2Defs); }
async function initTab3(tabId) { await setupViewer(tabId, viewer3Defs); }

document.addEventListener('DOMContentLoaded', async () => {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', async () => {
            const tabId = link.getAttribute('data-tab');
            tabLinks.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            if (!initializedViewers[tabId]) {
                initializedViewers[tabId] = true;
                if (tabId === 'Tab1') await initTab1(tabId);
                else if (tabId === 'Tab2') await initTab2(tabId);
                else if (tabId === 'Tab3') await initTab3(tabId);
            }
            // Hide tooltip when switching tabs to avoid floating artifacts
            tooltip.style.display = 'none';
        });
    });

    const defaultTab = document.querySelector('.tab-link.active');
    if (defaultTab) {
        const defaultTabId = defaultTab.getAttribute('data-tab');
        await initTab1(defaultTabId);
        initializedViewers[defaultTabId] = true;
    }

    document.getElementById('animate-btn-Tab1').addEventListener('click', () => startAnimation('Tab1'));
    document.getElementById('reset-btn-Tab1').addEventListener('click', () => resetAnimation('Tab1'));
    document.getElementById('animate-btn-Tab2').addEventListener('click', () => startAnimation('Tab2'));
    document.getElementById('reset-btn-Tab2').addEventListener('click', () => resetAnimation('Tab2'));
    document.getElementById('animate-btn-Tab3').addEventListener('click', () => startAnimation('Tab3'));
    document.getElementById('reset-btn-Tab3').addEventListener('click', () => resetAnimation('Tab3'));
});

window.addEventListener('resize', () => {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return;
    const tabId = activeContent.id;
    const viewer = activeViewers[tabId];
    if (!viewer) return;

    const width = viewer.container.clientWidth;
    const height = viewer.container.clientHeight;
    const pixelRatio = window.devicePixelRatio; // Get current ratio

    viewer.camera.aspect = width / height;
    viewer.camera.updateProjectionMatrix();
    
    viewer.renderer.setSize(width, height);
    viewer.renderer.setPixelRatio(pixelRatio);

    // Resize composers with the correct ratio
    if(viewer.bloomComposer) viewer.bloomComposer.setSize(width * pixelRatio, height * pixelRatio);
    if(viewer.finalComposer) viewer.finalComposer.setSize(width * pixelRatio, height * pixelRatio);

    // Update FXAA uniforms if it exists (you might need to store fxaaPass in activeViewers to access it here)
    // Note: To do this strictly correctly, you should return fxaaPass from setupViewer and store it in activeViewers
    const fxaaPass = viewer.finalComposer.passes.find(p => p.material && p.material.uniforms && p.material.uniforms.resolution);
    if (fxaaPass) {
        fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( width * pixelRatio );
        fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( height * pixelRatio );
    }
});
