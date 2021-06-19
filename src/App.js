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
	sceneHeight: 450,
	bgSrc: './assets/img/interaction_bg.jpg',
	padPrjColor: 0x00ff00
	
}
let objectsParams = {
	modelPath: './assets/models/',
	patient: {
		patientObj: 'body.obj',
		patientMtl: 'body.mtl',
		scale : 	new THREE.Vector3(2, 2, 2),
		position : 	new THREE.Vector3(0, -2, 0),
		rotation : 	new THREE.Vector3(Math.PI / 2.0, Math.PI / 2.0, 0)
	},
	lightBulb: {
		lightBulbObj: 'LightBulb_01.fbx',
		scale : 	new THREE.Vector3(1.5, 1.5, 1.5),
		position : 	new THREE.Vector3(-37, 10, 10),
		rotation : 	new THREE.Vector3(0, 0, 0)
	},
	pad: {
		padObj: 'SplitPad_01.fbx',
		scale : 	new THREE.Vector3(2, 2, 2),
		position : 	new THREE.Vector3(-37, -25, 10),
		rotation : 	new THREE.Vector3(Math.PI / 2.0, 0, 0)
	},
	padPrjection: {
		scale : 	new THREE.Vector3(5, 7, 10)
	},
	glowing: {
		radius: 6,
		segments: 32,
		position: 	new THREE.Vector3(-35, 11, 10),
		color: 		new THREE.Color(0xffd778),
		base: 0.2, //0.2 - not glow; -0.1 - glow max light
		pow: 10.0
	}
}
//const params of bounds near two different body parts 
//to avoid the glow jumping of decal to another part of the body  
//e.g. near two legs or arm and body
const projectionBounds = {
	upperLeg: {
		xLeft: 0.0,
		xRight: 0.25,
		yTop: 0.0,
		yBottom: -0.085
	},
	bottomLeg: {
		xLeft: 0.0,
		xRight: 0.25,
		yTop: -0.09,
		yBottom: -0.2
	},
	upperBody: {
		xLeft: -0.48,
		xRight: -0.31,
		yTop: 0.13,
		yBottom: 0.03
	},
	lowerBody: {
		xLeft: -0.48,
		xRight: -0.31,
		yTop: -0.25,
		yBottom: -0.34
	},
	upperArm: {
		xLeft: -0.48,
		yTop: 0.125,
		yMoveScale: 0.3,
		x1: -30.0, y1: 7.0,
		x2: -24.0, y2: 10.0,
		zAngle: 40.0 * Math.PI / 180.0,
		xAngle: -10.0 * Math.PI / 180.0
	},
	lowerArm: {
		xLeft: -0.48,
		yTop: -0.33,
		yMoveScale: 0.3,
		x1: -30.0, y1: -15.0,
		x2: -23, y2: -17.0,
		zAngle: -40.0 * Math.PI / 180.0,
		xAngle: 10.0 * Math.PI / 180.0
	}
}
const correctPlaces = {
	topBiceps: {
		x: -0.35, y: 0.22
	},
	bottomBiceps: {
		x: -0.35, y: -0.42
	},
	topSide: {
		x: -0.26, y: 0.05
	},
	bottomSide: {
		x: -0.26, y: -0.23
	}
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
			scene.background = texture;
		});

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

		/*
		const gui = new GUI();
		let intensity = gui.add(objectsParams.glowing, 'base', -0.2, 0.2);
		intensity.onChange(function (value) {			
			objectsParams.glowing.base = value;
		});
		*/

		renderer.render(scene, camera);
		//window.addEventListener( 'resize', onWindowResize, false );
		window.addEventListener('mousemove', onMouseMove, false)

		animate();
	}
}

function onMouseMove(event) {
	scene.remove(glowObj);
	scene.remove(padMesh);

	mouse.x = (event.clientX / params.sceneWidth) * 2 - 1;
	mouse.y = - (event.clientY / params.sceneHeight) * 2 + 1;
	
	raycaster.setFromCamera(mouse, camera);
	raycaster.layers.enableAll()
	let intersects = []
	raycaster.intersectObjects(patientObj.children, true, intersects);

	if (intersects.length > 0) {
		//1.for adding pad projection to scene
		let direction = new THREE.Euler();
		let padProjSize = new THREE.Vector3();
		padProjSize.copy(objectsParams.padPrjection.scale);
	
		//offset or/and rotation of decal geometry at the boundaries of two
		//different body parts to avoid the glow jumping to another part of the body
		//upper leg
		if (mouse.x > projectionBounds.upperLeg.xLeft &&
			mouse.x < projectionBounds.upperLeg.xRight &&
			mouse.y > projectionBounds.upperLeg.yBottom &&
			mouse.y < projectionBounds.upperLeg.yTop)
		{
			let deltaY = (projectionBounds.upperLeg.yTop - mouse.y) /
				(projectionBounds.upperLeg.yTop - projectionBounds.upperLeg.yBottom);
			padProjSize.y *= (1.0 - deltaY);
		}			
		//bottom leg
		if (mouse.x > projectionBounds.bottomLeg.xLeft &&
			mouse.x < projectionBounds.bottomLeg.xRight &&
			mouse.y > projectionBounds.bottomLeg.yBottom &&
			mouse.y < projectionBounds.bottomLeg.yTop)
		{
			let deltaY = (projectionBounds.bottomLeg.yTop - mouse.y) /
				(projectionBounds.bottomLeg.yTop - projectionBounds.bottomLeg.yBottom);
			padProjSize.y *= deltaY;
		}		
		//upper body
		if (mouse.x > projectionBounds.upperBody.xLeft &&
			mouse.x < projectionBounds.upperBody.xRight &&
			mouse.y > projectionBounds.upperBody.yBottom &&
			mouse.y < projectionBounds.upperBody.yTop)
		{
			let deltaY = (projectionBounds.upperBody.yTop - mouse.y) /
				(projectionBounds.upperBody.yTop - projectionBounds.upperBody.yBottom);
			padProjSize.y *= deltaY;
		}		
		//lower body
		if (mouse.x > projectionBounds.lowerBody.xLeft &&
			mouse.x < projectionBounds.lowerBody.xRight &&
			mouse.y > projectionBounds.lowerBody.yBottom &&
			mouse.y < projectionBounds.lowerBody.yTop)
		{
			let deltaY = (projectionBounds.lowerBody.yTop - mouse.y) /
				(projectionBounds.lowerBody.yTop - projectionBounds.lowerBody.yBottom);
			padProjSize.y *= (1.0 - deltaY);
		}
		//upper arm
		if (mouse.x > projectionBounds.upperArm.xLeft &&
			mouse.y > projectionBounds.upperArm.yTop +
			(mouse.x - projectionBounds.upperArm.xLeft) * projectionBounds.upperArm.yMoveScale)
		{
			direction.z = projectionBounds.upperArm.zAngle;
			direction.x = projectionBounds.upperArm.xAngle;

			let x1 = projectionBounds.upperArm.x1,
				y1 = projectionBounds.upperArm.y1,
				x2 = projectionBounds.upperArm.x2,
				y2 = projectionBounds.upperArm.y2
			intersects[0].point.y = (intersects[0].point.x - x1) * (y2 - y1) / (x2 - x1) + y1;
		}		
		//lower arm
		if (mouse.x > projectionBounds.lowerArm.xLeft &&
			mouse.y < projectionBounds.lowerArm.yTop -
			(mouse.x - projectionBounds.lowerArm.xLeft) * projectionBounds.lowerArm.yMoveScale)
		{
			direction.z = projectionBounds.lowerArm.zAngle;
			direction.x = projectionBounds.lowerArm.xAngle;
			let x1 = projectionBounds.lowerArm.x1,
				y1 = projectionBounds.lowerArm.y1,
				x2 = projectionBounds.lowerArm.x2,
				y2 = projectionBounds.lowerArm.y2
			intersects[0].point.y = (intersects[0].point.x - x1) * (y2 - y1) / (x2 - x1) + y1;
		}			
	
		let decalGeometry = new DecalGeometry(
			patientObj.children[0].children[0], // it has to be a THREE.Mesh
			intersects[0].point, 				// THREE.Vector3 in world coordinates  
			direction, 							// THREE.Vector3 specifying the orientation of the decal  
			padProjSize	// THREE.Vector3 specifying the size of the decal box  
		);
	
		padMesh = new THREE.Mesh(decalGeometry, decalMaterial);
		scene.add(padMesh)

		//2.for light bulb glowing
		let distance1 = CalculateDistance(mouse.x, mouse.y,
			correctPlaces.topBiceps.x, correctPlaces.topBiceps.y);
		let distance2 = CalculateDistance(mouse.x, mouse.y,
			correctPlaces.bottomBiceps.x, correctPlaces.bottomBiceps.y);
		let distance3 = CalculateDistance(mouse.x, mouse.y,
			correctPlaces.topSide.x, correctPlaces.topSide.y);
		let distance4 = CalculateDistance(mouse.x, mouse.y,
			correctPlaces.bottomSide.x, correctPlaces.bottomSide.y);
		let distance = FindMin(distance1, distance2, distance3, distance4);
		distance = distance > 0.3 ? 0.3 : distance;
		objectsParams.glowing.base = distance - 0.15;
		createGlow();
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
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

function CalculateDistance(x1, y1, x2, y2) {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function FindMin(a, b, c, d) {
	let rezult = a;
	if (b < rezult) rezult = b;
	if (c < rezult) rezult = c;
	if (d < rezult) rezult = d;

	return rezult;
}

export default App;
