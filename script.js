import * as THREE from 'three';
        import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
        import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
        import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

        let scene, camera, renderer, controls, clock;
        let loadedModels = [];
        let modelGroup;

        const textureLoader = new THREE.TextureLoader();

        const MATERIALS = {
    matYellow: new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.0, // Non-metallic (like plastic or paint)
        roughness: 0.2  // A bit glossy
    }),
    matRed: new THREE.MeshStandardMaterial({ 
                    color: 0xdc2626,  // Strong Red
                    roughness: 1, 
                    metalness: .1 
                }),
    matBlueO: new THREE.MeshStandardMaterial({
        color: 0x007bff,
        metalness: 0.0, // Non-metallic (like glass or plastic)
        roughness: 1,  // Very glossy
        opacity: 0.7,
        transparent: false,
    }),
    matMetallic: new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, // Base color for the metal
        metalness: 1.0, // 100% metallic
        roughness: 0.2  // Slightly brushed/worn metal
    }),
    matOrange: new THREE.MeshStandardMaterial({
        color: 0xffa500,
        metalness: 0.0,
        roughness: 0.2
    }),
    matBlue: new THREE.MeshStandardMaterial({
        color: 0x0055ff,
        metalness: 0.0,
        roughness: 0.2
    }),
    matBlack: new THREE.MeshStandardMaterial({ 
                    color: 0x333333,  // Dark Graphite
                    roughness: 1, 
                    metalness: .1 
                }),
    matWhite: new THREE.MeshStandardMaterial({ 
                    color: 0xf5f5f5,  // Off-White
                    roughness: .2, 
                    metalness: .1 
                }),
    matChrome: new THREE.MeshStandardMaterial({
                    color: 0xffffff,  // White, to reflect light purely
                    metalness: 1.0,   // 100% metallic
                    roughness: 0.0,   // 0% rough (perfectly smooth)
                }),
    // A good, neutral default
    default: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.0,
        roughness: 0.5 // A matte, plastic-like default
    }),

    matPBR: new THREE.MeshStandardMaterial({
        map: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_albedo.png'),

        normalMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_normal-ogl.png'),
        normalScale: new THREE.Vector2(1, 1), // Adjust depth of normal

        roughnessMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_roughness.png'),
        roughness: 1.0, // Acts as a multiplier. Set to 1 to use the map fully.

        metalnessMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_metallic.png'),
        metalness: 1.0, // Acts as a multiplier. Set to 1 to use the map fully.

        aoMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_ao.png'),
        aoMapIntensity: 1, // Adjust shadow intensity in crevices

        displacementMap: textureLoader.load('./MATERIALS/angled-tiled-floor-bl/angled-tiled-floor_height.png'),
        displacementScale: 0.5, // KEEP THIS LOW initially!
    }),
};

        // Demo definitions for Viewer 1
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

        // Demo definitions for Viewer 2
        const viewer2Defs = [
            { id: 'part1', obj: './PARTS/plug.obj', materialKey: 'matYellow',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part1', obj: './PARTS/plugO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part2', obj: './PARTS/nuts.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 13, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/screws.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 18, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part3', obj: './PARTS/topHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 2, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part4', obj: './PARTS/maleFlange.obj', materialKey: 'matOrange',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part4', obj: './PARTS/maleFlangeO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part5', obj: './PARTS/bottomHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: -1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part6', obj: './PARTS/femaleFlange.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: -5, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },
        ];

        // Your definitions for Viewer 3
        const viewer3Defs = [
            { id: 'part2', obj: './PARTS/nuts.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 13, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'Screws', obj: './PARTS/screws.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 18, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part3', obj: './PARTS/topHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 2, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part4', obj: './PARTS/maleFlange.obj', materialKey: 'matOrange',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part4', obj: './PARTS/maleFlangeO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 7, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part5', obj: './PARTS/bottomHW.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: -1, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part6', obj: './PARTS/femaleFlange.obj', materialKey: 'matBlue',
            startPos: { x: 0, y: -5, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },
        ];

        const initializedViewers = {};
        const activeViewers = {};

        function createScene(container) {
            scene = new THREE.Scene();
            clock = new THREE.Clock();

            scene.background = new THREE.Color(0x222222);
            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 20, 50);

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.shadowMap.enabled = true; // Added shadowMap
            container.appendChild(renderer.domElement);
            renderer.toneMapping = THREE.ACESFilmicToneMapping; // Added toneMapping

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Changed light
            scene.add(ambientLight);

            new RGBELoader()
                .setPath('https://threejs.org/examples/textures/equirectangular/')
                .load('royal_esplanade_1k.hdr', function (texture) {

                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    const pmremGenerator = new THREE.PMREMGenerator(renderer);
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                    scene.backgroundBlurriness = 0.5; // <-- As requested
                    scene.environment = envMap; 
                    scene.background = new THREE.Color(0x727272);

                    pmremGenerator.dispose();
                    texture.dispose();

                });
                
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            return { scene, camera, renderer, controls };
        }

        function fitCameraToObject(camera, object, controls) {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
            const fitWidthDistance = fitHeightDistance / camera.aspect;
            const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);
            const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);
            controls.maxDistance = distance * 10;
            controls.target.copy(center);
            camera.near = distance / 100;
            camera.far = distance * 100;
            camera.updateProjectionMatrix();
            camera.position.copy(controls.target).sub(direction);
            controls.update();
        }

        /**
         * --- NEW: Asynchronous Model Group Loader ---
         * This function fetches all models from their file paths and builds a group.
         * It returns a Promise that resolves with the THREE.Group.
         */
        function loadModelsFromDefs(modelDefs, objLoader) { // Killed TWEEN. This is just better
            const assembly = new THREE.Group();
            const promises = []; // To track all our file loads

            modelDefs.forEach(def => {
                const promise = new Promise((resolve, reject) => {
                    // Use objLoader.load to fetch the file from the URL
                    objLoader.load(
                        def.obj, // The URL: './parts/plug.obj'
                        (object) => {
                            // --- OnLoad ---
                            const material = MATERIALS[def.materialKey] || MATERIALS['default'];
                            object.traverse((child) => {
                                if (child.isMesh) child.material = material;
                            });
                            object.position.set(def.startPos.x, def.startPos.y, def.startPos.z);
                            
                            object.userData.id = def.id;
                            object.userData.startPos = def.startPos;
                            object.userData.endPos = def.endPos;
                            
                            // NEW: Initialize the animation target
                            object.userData.targetPosition = null; 
                            
                            assembly.add(object); // Add to the group
                            resolve(object); // Mark this promise as complete
                        },
                        undefined, // onProgress (not used)
                        (error) => {
                            // --- OnError ---
                            console.error(`Error loading ${def.obj}:`, error);
                            reject(error); // Mark this promise as failed
                        }
                    );
                });
                promises.push(promise);
            });

            // Wait for all promises to resolve, then return the full group
            return Promise.all(promises).then(() => assembly);
        }


        /**
         * --- NEW: Asynchronous Viewer Setup ---
         * Initializes a 3D viewer by awaiting the model loader.
         */
        async function setupViewer(tabId, modelDefs) {
            const container = document.getElementById(`canvas-container-${tabId}`);
            if (!container) {
                console.error(`Container not found for tab: ${tabId}`);
                return;
            }

            const { scene, camera, renderer, controls } = createScene(container);
            // UPDATE: Store more components in activeViewers
            activeViewers[tabId] = { scene, camera, renderer, controls, container, modelGroup: null };

            let currentModelGroup = null; // This variable will be local
            const objLoader = new OBJLoader();

            try {
                currentModelGroup = await loadModelsFromDefs(modelDefs, objLoader);
                scene.add(currentModelGroup);
                activeViewers[tabId].modelGroup = currentModelGroup; 

                //fitCameraToObject(camera, currentModelGroup, controls);

                camera.position.set(30, 10, -20);
            } catch (e) {
                console.error(`Error loading models for ${tabId}: `, e);
            }

            // --- Animation loop ---
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                
                /* REMOVED: TWEEN_update(); */

                // --- NEW: Simple LERP Animation Logic ---
                if (currentModelGroup) {
                    currentModelGroup.rotation.y += 0.001; // Simple rotation

                    // Iterate over all parts in this viewer's group
                    currentModelGroup.children.forEach(part => {
                        // Check if we have set a target position
                        if (part.userData.targetPosition) {
                            
                            // Move 5% closer to the target each frame
                            part.position.lerp(part.userData.targetPosition, 0.01);

                            // If we are very close, snap to the target and stop animating
                            if (part.position.distanceTo(part.userData.targetPosition) < 0.01) {
                                part.position.copy(part.userData.targetPosition);
                                part.userData.targetPosition = null; // Stop
                            }
                        }
                    });
                }
                renderer.render(scene, camera);
            }
            animate();
        }

        function startAnimation(tabId) {
            console.log(`Starting animation for ${tabId}`);
            const viewer = activeViewers[tabId];
            if (!viewer || !viewer.modelGroup) {
                console.warn(`No model group found for ${tabId} to animate.`);
                return;
            }

            viewer.modelGroup.children.forEach(part => {
                if (part.userData.endPos) {
                    // Set the target for the animation loop
                    part.userData.targetPosition = new THREE.Vector3(
                        part.userData.endPos.x,
                        part.userData.endPos.y,
                        part.userData.endPos.z
                    );
                }
            });
        }

        function resetAnimation(tabId) {
            console.log(`Resetting animation for ${tabId}`);
            const viewer = activeViewers[tabId];
            if (!viewer || !viewer.modelGroup) {
                console.warn(`No model group found for ${tabId} to reset.`);
                return;
            }

            viewer.modelGroup.children.forEach(part => {
                if (part.userData.startPos) {
                    // Set the target for the animation loop
                    part.userData.targetPosition = new THREE.Vector3(
                        part.userData.startPos.x,
                        part.userData.startPos.y,
                        part.userData.startPos.z
                    );
                }
            });
        }

        // --- Specific initializers for each tab (now async) ---
        async function initTab1(tabId) {
            await setupViewer(tabId, viewer1Defs);
        }

        async function initTab2(tabId) {
            await setupViewer(tabId, viewer2Defs);
        }

        async function initTab3(tabId) {
            await setupViewer(tabId, viewer3Defs);
        }

        // --- Tab Switching Logic (now async) ---
        document.addEventListener('DOMContentLoaded', async () => { // Make async
            const tabLinks = document.querySelectorAll('.tab-link');
            const tabContents = document.querySelectorAll('.tab-content');

            tabLinks.forEach(link => {
                link.addEventListener('click', async () => { // Make async
                    const tabId = link.getAttribute('data-tab');
                    tabLinks.forEach(item => item.classList.remove('active'));
                    tabContents.forEach(item => item.classList.remove('active'));
                    link.classList.add('active');
                    const activeContent = document.getElementById(tabId);
                    activeContent.classList.add('active');

                    if (!initializedViewers[tabId]) {
                        initializedViewers[tabId] = true;
                        
                        // We now await the init functions
                        if (tabId === 'Tab1') {
                            await initTab1(tabId);
                        } else if (tabId === 'Tab2') {
                            await initTab2(tabId);
                        } else if (tabId === 'Tab3') {
                            await initTab3(tabId);
                        }
                    }
                });
            });

            // 4. Initialize the default active tab (and await it)
            const defaultTab = document.querySelector('.tab-link.active');
            if (defaultTab) {
                const defaultTabId = defaultTab.getAttribute('data-tab');
                await initTab1(defaultTabId); // Await the first tab load
                initializedViewers[defaultTabId] = true;
            }
            document.getElementById('animate-btn-Tab1').addEventListener('click', () => startAnimation('Tab1'));
            document.getElementById('reset-btn-Tab1').addEventListener('click', () => resetAnimation('Tab1'));

            document.getElementById('animate-btn-Tab2').addEventListener('click', () => startAnimation('Tab2'));
            document.getElementById('reset-btn-Tab2').addEventListener('click', () => resetAnimation('Tab2'));

            document.getElementById('animate-btn-Tab3').addEventListener('click', () => startAnimation('Tab3'));
            document.getElementById('reset-btn-Tab3').addEventListener('click', () => resetAnimation('Tab3'));
        });

        // --- Global Resize Handler (no changes) ---
        window.addEventListener('resize', () => {
            const activeContent = document.querySelector('.tab-content.active');
            if (!activeContent) return;

            const tabId = activeContent.id;
            const viewer = activeViewers[tabId];
            if (!viewer) return;

            viewer.camera.aspect = viewer.container.clientWidth / viewer.container.clientHeight;
            viewer.camera.updateProjectionMatrix();
            viewer.renderer.setSize(viewer.container.clientWidth, viewer.container.clientHeight);
        });