import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'; 
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

let canvas, camera, scene, light, directionalLight, renderer, patientObj, padMesh;
let raycaster, mouse = new THREE.Vector2();

class App {
	init() {
		canvas = document.getElementById('canvas');
		canvas.setAttribute('width', 800);
		canvas.setAttribute('height', 600);

		//scene and camera
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(40.0, 800 / 600, 0.1, 5000);
		camera.position.set(0, 0, 100);
		//light
		light = new THREE.AmbientLight(0xffffff);
		scene.add(light);
		directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
		directionalLight.position.set(0, 0, 100);
		scene.add(directionalLight);

		//renderer
		renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
		renderer.setClearColor(0xffffff);

		//Load background texture
		let loader = new THREE.TextureLoader();
		loader.load('./assets/img/bg.jpg', function (texture) {
			texture.minFilter = THREE.LinearFilter;
			scene.background = texture;
		});

		//objects
		patientObj = new THREE.Object3D();
		let mtlLoader = new MTLLoader();
		mtlLoader.setPath('./assets/models/');
		//load pen
		mtlLoader.load('body.mtl', function (materials) {
			materials.preload();
			let objLoader = new OBJLoader();
			objLoader.setMaterials(materials);
			objLoader.setPath('../assets/models/');
			objLoader.load('body.obj', function (object) {
				object.scale.set(1, 1, 1);
				object.position.set(0, 0, 0);
				object.rotation.set(Math.PI / 2.0, Math.PI / 2.0, 0);
				patientObj.add(object);
			});
		});
		scene.add(patientObj);

		raycaster = new THREE.Raycaster();

		let fbxLoader = new FBXLoader();
		fbxLoader.setPath('./assets/models/');
		fbxLoader.load(
			'LightBulb_01.fbx',
			(object) => {
				object.position.set(-20, 10, 10)
				scene.add(object);
			},
			(xhr) => {
				console.log((xhr.loaded / xhr.total * 100) + '% loaded')
			},
			(error) => {
				console.log(error);
			}
		)

		fbxLoader = new FBXLoader();
		fbxLoader.setPath('./assets/models/');
		fbxLoader.load(
			'SplitPad_01.fbx',
			(object) => {
				object.position.set(-20, -10, 10)
				object.rotation.set(Math.PI * 0.5, 0, 0)
				scene.add(object);
			},
			(xhr) => {
				console.log((xhr.loaded / xhr.total * 100) + '% loaded')
			},
			(error) => {
				console.log(error);
			}
		)

		var sphereGeom = new THREE.SphereGeometry(3, 32, 32);    
		// create custom material from the shader code above
		//   that is within specially labeled script tags
		var customMaterial = new THREE.ShaderMaterial( 
		{
			uniforms: 
			{ 
				"c":   { type: "f", value: 0.0 },
				"p":   { type: "f", value: 10.4 },
				glowColor: { type: "c", value: new THREE.Color(0xffff00) },
				viewVector: { type: "v3", value: camera.position }
			},
			vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.FrontSide,
			blending: THREE.AdditiveBlending,
			transparent: true
		}   );
			
		let moonGlow = new THREE.Mesh( sphereGeom.clone(), customMaterial.clone() );
		moonGlow.position.set(-19.5, 10.5, 10);
		//scene.add(moonGlow);
		
		renderer.render(scene, camera);
		//window.addEventListener( 'resize', onWindowResize, false );
		window.addEventListener('mousemove', onMouseMove, false)

		animate();
	}
}

function onMouseMove(event) {
	// calculate mouse position in normalized device coordinates
	// (-1 to +1) for both components
	mouse.x = (event.clientX / 800) * 2 - 1;
	mouse.y = - (event.clientY / 600) * 2 + 1;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	// update the picking ray with the camera and mouse position
	raycaster.setFromCamera(mouse, camera);
	raycaster.layers.enableAll()
	// calculate objects intersecting the picking ray
	let intersects = []
	raycaster.intersectObjects(patientObj.children, true, intersects);

	if (intersects.length > 0) {
		const direction = new THREE.Euler();
		const size = new THREE.Vector3(3, 5, 10);

		var decalGeometry = new DecalGeometry(
			patientObj.children[0].children[0], // it has to be a THREE.Mesh
			intersects[0].point, // THREE.Vector3 in world coordinates  
			direction, // THREE.Vector3 specifying the orientation of the decal  
			size // THREE.Vector3 specifying the size of the decal box  
		);

		//const textureLoader = new THREE.TextureLoader();
		//const decalDiffuse = textureLoader.load('textures/decal/decal-diffuse.png');
		
		var decalMaterial = new THREE.MeshPhongMaterial({
			color: 0x00ff00,
			flatShading: false,
			shininess: 30,
			transparent: true,
			depthTest: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: - 4,
			wireframe: false
		});
	
		
		/* клвсс но цвет менять нельзя
		var decalMaterial = new THREE.MeshNormalMaterial({
			transparent: true,
			depthTest: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -4,
		});
		*/
		//var decalMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
		
		scene.remove(padMesh)
		padMesh = new THREE.Mesh(decalGeometry, decalMaterial);
		scene.add(padMesh)
	}

	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

export default App;
