import React from 'react';
import 'utils/stlLoader';
import {
  loadMeshFromFile
} from 'utils/nodeProcessor/nodeProcessor';
import Detector from 'utils/detector';
import Stats from 'stats-js';
import OrbitControlsFactory from 'three-orbit-controls';

const OrbitControls = OrbitControlsFactory(THREE);
export default class Renderer extends React.Component {
  constructor() {
    super();
    this.container = null;
    this.stats = null;
    this.camera = null;
    this.cameraTarget = null;
    this.scene = null;
    this.renderer = null;
    this.stationModel = null;
    this.handrailModels = [];
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.animate = this.animate.bind(this);
    this.processFiles = this.processFiles.bind(this);
  }

  componentDidMount() {
    if (!Detector.webgl) {
      Detector.addGetWebGLMessage();
    }
    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 5000);
    this.camera.position.set(0, 0, 2);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('black');
    this.scene.fog = new THREE.Fog('black', 2, 15);

    // mouse controls to rotate/zoom the model
    new OrbitControls(this.camera);
    // Ground
    const plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(40, 40),
      new THREE.MeshLambertMaterial({color: 'black', specular: 'black'})
    );
    plane.rotation.x = -Math.PI/2;
    plane.position.y = -1;
    this.scene.add(plane);
    plane.receiveShadow = true;
    // Lights
    this.scene.add(new THREE.HemisphereLight(0x443333, 0x111122));
    this.addShadowedLight(1, 1, 1, 0xffffff, 1.35);
    this.addShadowedLight(0.5, 1, -1, 0xffaa00, 1);
    // this.renderer
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.renderReverseSided = false;
    this.container.appendChild(this.renderer.domElement);
    this.stats = new Stats();
    this.container.appendChild(this.stats.domElement);
    window.addEventListener('resize', this.handleWindowResize, false);
  }

  componentDidUpdate() {
    this.processFiles();
  }

  componentWillUnMount() {
    window.addEventListener('resize', this.handleWindowResize, false);
  }

  processFiles() {
    const {
      stationFile,
      handrailFiles,
    } = this.props;
    if (!stationFile) {
      return;
    }
    if (this.stationModel) {
      this.scene.remove(this.stationModel);
      this.stationModel.geometry.dispose();
      this.stationModel.material.dispose();
      this.stationModel = undefined;
    }
    const mesh = loadMeshFromFile(stationFile);
    this.stationModel = mesh;
    this.scene.add(mesh);

    if (this.handrailModels.length > 0) {
      this.handrailModels.forEach(model => {
        this.scene.remove(model);
        model.geometry.dispose();
        model.material.dispose();
        model = undefined;
      })
    }
    if (handrailFiles && handrailFiles.length > 0) {
      handrailFiles.forEach(handrailFile => {
        const handrailMesh = loadMeshFromFile(handrailFile, {color: 'red'});
        this.handrailModels.push(handrailMesh);
        this.scene.add(handrailMesh);
      });
    }
    this.animate();
  }

  addShadowedLight(x, y, z, color, intensity) {
    const directionalLight = new THREE.DirectionalLight(color, intensity);
    directionalLight.position.set(x, y, z);
    this.scene.add(directionalLight);
    directionalLight.castShadow = true;
    const d = 1;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 4;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.bias = -0.005;
  }
  handleWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  animate() {
    requestAnimationFrame(this.animate);
    this.renderStl();
    this.stats.update();
  }
  renderStl() {
    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return <div ref={c => this.container = c}></div>;
  }
}
