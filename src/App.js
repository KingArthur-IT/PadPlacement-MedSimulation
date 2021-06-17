import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'; 
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

//scene
let canvas, camera, scene, light, directionalLight, renderer;
let decalMaterial;
//objects
let patientObj, padMesh, glowObj;
//for pad projection moving
let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
//params
let params = {
	sceneWidth: 850,
	sceneHeight: 650,
	bgSrc: './assets/img/bg.jpg',
	padPrjColor: 0x00ff00
	
}
let objectsParams = {
	modelPath: './assets/models/',
	patient: {
		patientObj: 'body.obj',
		patientMtl: 'body.mtl',
		scale : 	new THREE.Vector3(1, 1, 1),
		position : 	new THREE.Vector3(0, 0, 0),
		rotation : 	new THREE.Vector3(Math.PI / 2.0, Math.PI / 2.0, 0)
	},
	lightBulb: {
		lightBulbObj: 'LightBulb_01.fbx',
		scale : 	new THREE.Vector3(1, 1, 1),
		position : 	new THREE.Vector3(-19, 6, 10),
		rotation : 	new THREE.Vector3(0, 0, 0)
	},
	pad: {
		padObj: 'SplitPad_01.fbx',
		scale : 	new THREE.Vector3(1, 1, 1),
		position : 	new THREE.Vector3(-20, -10, 10),
		rotation : 	new THREE.Vector3(Math.PI / 2.0, 0, 0)
	},
	padPrjection: {
		scale : 	new THREE.Vector3(3.5, 4.5, 10)
	},
	glowing: {
		radius: 3,
		segments: 16,
		position: new THREE.Vector3(-18.7, 7, 10),
		color: new THREE.Color(0xffd778),
		base: -0.1,
		pow: 10.0
	},
}

class App {
	init() {
		canvas = document.getElementById('canvas');
		canvas.setAttribute('width', 	params.sceneWidth);
		canvas.setAttribute('height', params.sceneHeight);
		
		//scene and camera
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(40.0, params.sceneWidth / params.sceneHeight, 0.1, 5000);
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
		loader.load(params.bgSrc, function (texture) {
			texture.minFilter = THREE.LinearFilter;
			//scene.background = texture;
		});
		scene.background = new THREE.Color(0xd0d0d0)

		//objects
		patientObj = new THREE.Object3D();
		let mtlLoader = new MTLLoader();
		mtlLoader.setPath(objectsParams.modelPath);

		//load patient body
		mtlLoader.load(objectsParams.patient.patientMtl, function (materials) {
			materials.preload();
			let objLoader = new OBJLoader();
			objLoader.setMaterials(materials);
			objLoader.setPath(objectsParams.modelPath);
			objLoader.load(objectsParams.patient.patientObj, function (object) {
				object.scale.copy(objectsParams.patient.scale);
				object.position.copy(objectsParams.patient.position);
				object.rotation.setFromVector3(objectsParams.patient.rotation);
				patientObj.add(object);
				scene.add(patientObj);
			});
		});		

		//light bulb
		let fbxLoader = new FBXLoader();
		fbxLoader.setPath(objectsParams.modelPath);
		fbxLoader.load(
			objectsParams.lightBulb.lightBulbObj,
			(object) => {
				object.scale.copy(objectsParams.lightBulb.scale);
				object.position.copy(objectsParams.lightBulb.position);
				object.rotation.setFromVector3(objectsParams.lightBulb.rotation);
				scene.add(object);
			}
		)

		//pad
		fbxLoader = new FBXLoader();
		fbxLoader.setPath(objectsParams.modelPath);
		fbxLoader.load(
			objectsParams.pad.padObj,
			(object) => {
				object.scale.copy(objectsParams.pad.scale);
				object.position.copy(objectsParams.pad.position);
				object.rotation.setFromVector3(objectsParams.pad.rotation);
				scene.add(object);
			}
		)
		
		//const textureLoader = new THREE.TextureLoader();
		//const decalDiffuse = textureLoader.load('textures/decal/decal-diffuse.png');	
		//decal material
		decalMaterial = new THREE.MeshPhongMaterial({
			color: params.padPrjColor,
			flatShading: false,
			shininess: 30,
			transparent: true,
			depthTest: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: - 4,
			wireframe: false
		});	

		const gui = new GUI();
		let intensity = gui.add(objectsParams.glowing, 'base', -0.1, 0.2);
		intensity.onChange(function (value) {			
			objectsParams.glowing.base = value;
		});
		
		renderer.render(scene, camera);
		//window.addEventListener( 'resize', onWindowResize, false );
		window.addEventListener('mousemove', onMouseMove, false)

		animate();
	}
}

function onMouseMove(event) {
	mouse.x = (event.clientX / params.sceneWidth) * 2 - 1;
	mouse.y = - (event.clientY / params.sceneHeight) * 2 + 1;

	scene.remove(padMesh)
	raycaster.setFromCamera(mouse, camera);
	raycaster.layers.enableAll()
	let intersects = []
	raycaster.intersectObjects(patientObj.children, true, intersects);

	if (intersects.length > 0) {
		const direction = new THREE.Euler();

		let decalGeometry = new DecalGeometry(
			patientObj.children[0].children[0], // it has to be a THREE.Mesh
			intersects[0].point, 				// THREE.Vector3 in world coordinates  
			direction, 							// THREE.Vector3 specifying the orientation of the decal  
			objectsParams.padPrjection.scale	// THREE.Vector3 specifying the size of the decal box  
		);
	
		padMesh = new THREE.Mesh(decalGeometry, decalMaterial);
		scene.add(padMesh)
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	createGlow();
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

function createGlow() {
	scene.remove(glowObj);
	//glowing obj
	var sphereGeom = new THREE.SphereGeometry(
		objectsParams.glowing.radius,
		objectsParams.glowing.segments,
		objectsParams.glowing.segments);
	
	// create custom material from the shader code above
	var glowMaterial = new THREE.ShaderMaterial( 
	{
		uniforms: 
		{ 
			"base":   { type: "f", value: objectsParams.glowing.base },
			"p":   { type: "f", value: objectsParams.glowing.pow },
			glowColor: { type: "c", value: objectsParams.glowing.color },
			viewVector: { type: "v3", value: camera.position }
		},
		vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
		side: THREE.FrontSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	}   );
		
	glowObj = new THREE.Mesh( sphereGeom.clone(), glowMaterial.clone() );
	glowObj.position.copy(objectsParams.glowing.position);
	scene.add(glowObj);
}

export default App;
