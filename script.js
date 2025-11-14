// Get references to our DOM elements
        const canvasContainer = document.getElementById('canvas-container');
        const canvas = document.getElementById('three-canvas');
        const loadingIndicator = document.getElementById('loading-indicator');
        const loadingBar = document.getElementById('loading-bar');
        const loadingProgress = document.getElementById('loading-progress');
        const assembleButton = document.getElementById('assemble-button');

        // --- Core 3D Scene Variables ---
        let scene, camera, renderer, controls, clock;
        let modelGroup; // A THREE.Group to hold all 7 model parts
        let loadedModels = []; // To store references to the loaded models and their data
        const textureLoader = new THREE.TextureLoader(); // <-- ADD THIS
        // --- Animation State ---
        let animationState = {
            isAssembled: false, // Is the model currently assembled?
            isAnimating: false, // Is an animation in progress?
            progress: 0.0,      // Animation progress (0.0 = exploded, 1.0 = assembled)
            duration: 2.0,      // Duration of the animation in seconds
        };
        
        // --- Model Definitions ---
        // - 'id': A unique name for the part.
        // - 'mtl': The path to the .mtl file (e.g., './part1.mtl')
        // - 'obj': The path to the .obj file (e.g., './part1.obj')
        // - 'startPos': The "exploded" position { x, y, z }
        // - 'endPos': The "assembled" position { x, y, z }
        const modelDefs = [
            { id: 'part1', obj: './PARTS/plug.obj', materialKey: 'matYellow',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part1', obj: './PARTS/plugO.obj', materialKey: 'matBlueO',
            startPos: { x: 0, y: 12, z: 0 }, 
            endPos: { x: 0, y: 0, z: 0 } },

            { id: 'part2', obj: './PARTS/nuts.obj', materialKey: 'matMetallic',
            startPos: { x: 0, y: 13, z: 0 }, 
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


        // --- Initialize the 3D Scene ---
        function init() {
            // 1. Scene
            scene = new THREE.Scene();
            
            // 2. Clock (for animation timing)
            clock = new THREE.Clock();

            // 3. Camera
            const fov = 45;
            const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            const near = 0.1;
            const far = 1000;
            camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

            // Raised camera position
            camera.position.set(0, 20, 50);

            // 4. Renderer
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            // 6. Controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 0, 0); // Point controls at the center of the action
            controls.update();
            controls.enableDamping = true; // Smooths out the camera movement

            // reflection mapping

            new THREE.RGBELoader()
                .setPath('https://threejs.org/examples/textures/equirectangular/')
                .load('royal_esplanade_1k.hdr', function (texture) {

                    texture.mapping = THREE.EquirectangularReflectionMapping;

                    // 1. Create the PMREMGenerator
                    const pmremGenerator = new THREE.PMREMGenerator(renderer);

                    // 2. Process the texture into an optimized environment map
                    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

                    // 3. Set the blurred background
                    scene.background = envMap;
                    scene.backgroundBlurriness = 0.5; // <-- As requested

                    // 4. Set the environment for all reflections
                    scene.environment = envMap;
                    scene.background = new THREE.Color(0x727272);
                    // 5. Clean up the generator and original texture
                    pmremGenerator.dispose();
                    texture.dispose();

                });

            // 7. Model Group
            modelGroup = new THREE.Group();
            scene.add(modelGroup);

            // 8. Load Models
            loadAllModels();

            // 9. Event Listeners
            window.addEventListener('resize', onWindowResize);
            assembleButton.addEventListener('click', toggleAssemble);
        }

        // --- Load All Models ---
        // --- Load All Models ---
        function loadAllModels() {
            const manager = new THREE.LoadingManager();
            const objLoader = new THREE.OBJLoader(manager);

            // --- Define our custom materials ---
            const materials = {
                // A bright, metallic finish for all hardware
                hardwareMetallic: new THREE.MeshStandardMaterial({ 
                    color: 0x808080,  // Neutral Metallic Grey
                    roughness: 0.2,   // Shiny
                    metalness: 0.9    // Very metallic
                }),
                matRed: new THREE.MeshStandardMaterial({ 
                    color: 0xdc2626,  // Strong Red
                    roughness: 1, 
                    metalness: .1 
                }),
                matGreen: new THREE.MeshStandardMaterial({ 
                    color: 0x16a34a,  // Clear Green
                    roughness: 1, 
                    metalness: .1 
                }),
                matBlueO: new THREE.MeshStandardMaterial({ 
                    color: 0x0047AB,  // o ring Blue
                    roughness: 0.4, 
                    metalness: 0.1 
                }),
                matBlue: new THREE.MeshStandardMaterial({ 
                    color: 0x2563eb,  // Primary Blue
                    roughness: 1, 
                    metalness: .3
                }),
                matYellow: new THREE.MeshStandardMaterial({ 
                    color: 0xeab308,  // Strong Yellow
                    roughness: 1, 
                    metalness: .1 
                }),
                matOrange: new THREE.MeshStandardMaterial({ 
                    color: 0xea580c,  // Bright Orange
                    roughness: 1, 
                    metalness: .1 
                }),
                matPurple: new THREE.MeshStandardMaterial({ 
                    color: 0x9333ea,  // Vibrant Purple
                    roughness: 1, 
                    metalness: 0 
                }),
                matWhite: new THREE.MeshStandardMaterial({ 
                    color: 0xf5f5f5,  // Off-White
                    roughness: 1, 
                    metalness: .1 
                }),
                matBlack: new THREE.MeshStandardMaterial({ 
                    color: 0x333333,  // Dark Graphite
                    roughness: 1, 
                    metalness: .1 
                }),

                matMetallic: new THREE.MeshStandardMaterial({ 
                    color: 0xa1a1aa,  // Neutral Metallic (Zinc-400)
                    roughness: 0.2,   // Shiny
                    metalness: 0.9    // Very metallic
                }),
                matChrome: new THREE.MeshStandardMaterial({
                    color: 0xffffff,  // White, to reflect light purely
                    metalness: 1.0,   // 100% metallic
                    roughness: 0.0,   // 0% rough (perfectly smooth)
                })
            };

            let modelsLoaded = 0;
            const totalModels = modelDefs.length;

            // LoadingManager callbacks
            manager.onStart = function (url, itemsLoaded, itemsTotal) {
                console.log('Started loading models...');
            };

            manager.onProgress = function (url, itemsLoaded, itemsTotal) {
                // This tracks internal files, so we'll use our custom progress below
            };

            manager.onLoad = function () {
                console.log('All models loaded!');
                loadingIndicator.style.opacity = '0'; // Fade out
                setTimeout(() => loadingIndicator.style.display = 'none', 300); // Hide after fade
                assembleButton.disabled = false; // Enable the button
            };

            manager.onError = function (url) {
                console.error('There was an error loading ' + url);
                loadingIndicator.innerText = 'Error loading model. Check console.';
            };

            // --- Loop over model definitions and load each one ---
            modelDefs.forEach(modelDef => {
                // Get the correct material for this model
                const material = materials[modelDef.materialKey];

                objLoader.setPath('./'); // Assume files are in the same directory
                objLoader.load(modelDef.obj, function (object) {
                    
                    // Set the model's initial (exploded) position
                    object.position.set(modelDef.startPos.x, modelDef.startPos.y, modelDef.startPos.z);
                    
                    // --- Apply our custom material ---
                    object.traverse(function (child) {
                        if (child.isMesh) {
                            child.material = material; // Assign the material
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Add to our group and store the reference
                    modelGroup.add(object);
                    loadedModels.push({
                        id: modelDef.id,
                        object: object,
                        startPos: new THREE.Vector3(modelDef.startPos.x, modelDef.startPos.y, modelDef.startPos.z),
                        endPos: new THREE.Vector3(modelDef.endPos.x, modelDef.endPos.y, modelDef.endPos.z)
                    });

                    // Update custom progress bar
                    modelsLoaded++;
                    const progress = (modelsLoaded / totalModels) * 100;
                    loadingBar.style.width = progress + '%';
                    loadingProgress.innerText = `${Math.round(progress)}%`;

                }, undefined, function (error) {
                    console.error(`Error loading OBJ ${modelDef.obj}:`, error);
                });
            });
        }


        // --- Handle Button Click ---
        function toggleAssemble() {
            if (animationState.isAnimating) return; // Don't do anything if already moving

            animationState.isAnimating = true;
            animationState.isAssembled = !animationState.isAssembled; // Flip the state
            
            // Update button text
            assembleButton.innerText = animationState.isAssembled ? 'Explode Model' : 'Assemble Model';
        }

        // --- Handle Window Resize ---
        function onWindowResize() {
            const width = canvasContainer.clientWidth;
            const height = canvasContainer.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
        }

        // --- Easing Function (for smooth start/end) ---
        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        // --- Animation Loop (called every frame) ---
        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta(); // Time since last frame

            // --- Handle Assembly/Explode Animation ---
            if (animationState.isAnimating) {
                // Move progress forward or backward
                if (animationState.isAssembled) {
                    animationState.progress += delta / animationState.duration; // Assemble
                } else {
                    animationState.progress -= delta / animationState.duration; // Explode
                }

                // Clamp progress between 0.0 and 1.0
                animationState.progress = Math.max(0, Math.min(1, animationState.progress));
                
                // Apply easing
                const easedProgress = easeInOutCubic(animationState.progress);

                // Update position of each model
                loadedModels.forEach(model => {
                    model.object.position.lerpVectors(model.startPos, model.endPos, easedProgress);
                });

                // Check if animation is finished
                if ((animationState.isAssembled && animationState.progress === 1.0) ||
                    (!animationState.isAssembled && animationState.progress === 0.0)) {
                    animationState.isAnimating = false;
                }
            }

            // --- Handle idle rotation ---
            // Only rotate if *not* animating, to avoid weird motion
            if (!animationState.isAnimating) {
                 modelGroup.rotation.y += 0.1 * delta;
            }

            // Update controls
            controls.update();

            // Render the scene
            renderer.render(scene, camera);
        }

        // --- Start Everything ---
        init();
        animate();
