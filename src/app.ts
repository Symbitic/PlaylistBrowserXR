import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Axis } from '@babylonjs/core/Maths/math.axis';
import { CannonJSPlugin } from '@babylonjs/core/Physics/Plugins/cannonJSPlugin';
//import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Observable } from '@babylonjs/core/Misc/observable';
import { PhysicsImpostor } from '@babylonjs/core/Physics/physicsImpostor';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WebXRDefaultExperience } from '@babylonjs/core/XR/webXRDefaultExperience';
import { WebXRSessionManager } from '@babylonjs/core/XR/webXRSessionManager';
import { EnvironmentHelper } from '@babylonjs/core/Helpers/environmentHelper';

import { GridMaterial } from '@babylonjs/materials';

import {
  Control3D,
  CylinderPanel,
  GUI3DManager,
  HolographicButton,
  StackPanel3D,
  TextBlock
} from "@babylonjs/gui";

import * as cannon from 'cannon';

import { HolographicLabel } from "./label";
import { SpotifyPlaylist, SpotifyPlaylists } from './spotify';

import "@babylonjs/core/Physics/physicsEngineComponent";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/loaders/glTF";

/** Commands. */
export type CommandName = "play"
  | 'pause';

export interface Command<T = any> {
  name: CommandName;
  data?: T;
}

type callback = () => void;

export default class App {
  private _engine: Engine;
  private _canvas: HTMLCanvasElement;
  private _scene: Scene;
  private _supported: boolean;
  private _floorMeshes: AbstractMesh[] = [];
  private _error: string = '';
  private _camera?: ArcRotateCamera;
  private _playlists: SpotifyPlaylist[] = [];
  private _container: CylinderPanel;
  private _gui: GUI3DManager;
  private _panel: StackPanel3D;
  private _anchor!: TransformNode;
  private _title: HolographicLabel;
  private _status: HolographicLabel;

  protected xr?: WebXRDefaultExperience;

  public onLoginClickedObservable = new Observable<void>();
  public onNewCommandObservable = new Observable<Command>();
  public onPlaylistsUpdated = new Observable<SpotifyPlaylists>();
  public onErrorObservable = new Observable<string>();

  /** Return the last error. */
  get error() {
    return this._error;
  }

  /** Does this browser support WebXR? */
  get supported() {
    return this._supported;
  }

  /**
   * Create a new game instance.
   * @param engine Babylon.js Engine to attach to.
   * @param canvas HTML5 Canvas to render to.
   */
  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this._engine = engine;
    this._canvas = canvas;
    this._supported = false;
    this._scene = new Scene(this._engine);
    this._gui = new GUI3DManager(this._scene);
    this._title = new HolographicLabel("title", { width: 2.0, height: 0.25 });
    this._status = new HolographicLabel("subtitle", { width: 2.0, height: 0.25 });
    this._anchor = new TransformNode("");
    this._panel = new StackPanel3D(true);
    this._container = new CylinderPanel();
  }

  /**
   * Create a new Babylon.js scene.
   * @returns `true` if successful, `false` otherwise.
   */
  async createScene() {
    const lightDir = new Vector3(0, -0.5, 1.0);
    const light = new DirectionalLight('light', lightDir, this._scene);
    light.position = new Vector3(0, 5, -6);

    const alpha = -1.6;
    const beta = 1.6;
    const radius = 1.6;
    const cameraTarget = new Vector3(0, 1, 0);
    this._camera = new ArcRotateCamera('camera', alpha, beta, radius, cameraTarget, this._scene);
    this._camera.attachControl(this._canvas, true);

    //this._camera.inputs.attached.mousewheel.detachControl();
    this._camera.wheelDeltaPercentage = 0.01;
    this._camera.wheelPrecision = 0.01;

    const plugin = new CannonJSPlugin(true, 10, cannon);
    this._scene.enablePhysics(null, plugin);

    const environment = this._scene.createDefaultEnvironment({ enableGroundShadow: true });
    if (!environment) {
      throw new Error('Error creating the environment');
    }
    //environment.setMainColor(Color3.Teal());

    this.setupRoom(environment);
    this.setupGravity();
    this.setupGui();

    this._supported = await WebXRSessionManager.IsSessionSupportedAsync('immersive-vr');
    if (this._supported) {
      this.xr = await this._scene.createDefaultXRExperienceAsync({
        floorMeshes: this._floorMeshes,
        disableTeleportation: true,
        uiOptions: {
          sessionMode: 'immersive-vr',
          referenceSpaceType: 'local-floor'
        },
        inputOptions: {
          // Enable to disable loading controller models.
          doNotLoadControllerMeshes: false
        }
      });
    }
  }

  /**
   * Begins the main Babylon.js loop.
   */
  run(): void {
    if (!this._scene) {
      return;
    }
    const scene = this._scene;
    this._engine.runRenderLoop(() => {
      scene.render();
    });
  }

  setPlaylists(playlists: SpotifyPlaylist[]) {
    this._playlists = playlists;
    this.showPlaylists();
  }

  showError(msg: string, internalError: boolean = false) {
    this.clearContainer();

    const statusText = internalError ? "A fatal error has occurred" : 'Error';
    this.setStatus(statusText);

    const label = new HolographicLabel("error-msg", { width: 5.5, height: 2.0 });

    // TODO: should this be an environment variable?
    const GITHUB_URL = 'https://github.com/Symbitic/PlaylistBrowserXR';

    const labelText = new TextBlock("error-text");
    labelText.color = "white";
    labelText.fontSize = "50px";
    labelText.fontStyle = "bold";
    labelText.text = internalError ? `${msg}\n\nThis is an internal error\nPlease report it at:\n${GITHUB_URL}/issues` : msg;

    this._container.columns = 1;
    this._container.addControl(label);

    label.content = labelText;

    if (internalError) {
      // TODO: should label be a button to open GitHub?
    }
  }

  setStatus(text: string, cb?: callback) {
    const statusText = new TextBlock();
    statusText.color = "white";
    statusText.fontSize = "25px";
    statusText.fontStyle = "bold";
    statusText.text = text;

    this._status.onPointerUpObservable.clear();
    if (cb) {
      this._status.onPointerUpObservable.add(cb);
    }

    this._status.content = statusText;
  }

  showLoginScreen() {
    this.clearContainer();

    const button = new HolographicLabel("login", { width: 1.32, height: 1.35 });

    this._container.columns = 1;
    this._container.addControl(button);

    button.imageUrl = "/spotify.png";
    button.imageWidth = "185px";
    button.imageHeight = "285px";
    button.isButton = true;
    button.text = "Login";

    button.onPointerUpObservable.add(() => {
      this.onLoginClickedObservable.notifyObservers();
    });

    this.setStatus("Please login to Spotify");
  }

  showHomeScreen() {
    this.clearContainer();
    this.setStatus("Please select a playlist");
  }

  private setupRoom(environment: EnvironmentHelper) {
    const roomWidth = 16;
    const roomHeight = 6;
    const roomLength = 20;

    const floor = MeshBuilder.CreateBox('ground', { width: roomWidth, depth: roomLength, height: 0.2 });
    floor.position.y = -0.095
    floor.parent = null;
    floor.setAbsolutePosition(environment.ground!.getAbsolutePosition());
    floor.receiveShadows = true;

    const ceiling = MeshBuilder.CreateBox('ceiling', { width: roomWidth, depth: roomLength, height: 0.2 });
    ceiling.position.x = 0;
    ceiling.position.y = roomHeight;
    ceiling.position.z = 0;
    ceiling.receiveShadows = false;

    const wallRight = MeshBuilder.CreateBox('wallRight', { width: roomLength, height: roomHeight, depth: 0.3 });
    wallRight.rotate(Axis.Y, Math.PI / 2);
    wallRight.position.x = (roomWidth / 2) - 0.5;
    wallRight.position.y = (roomHeight / 2);
    wallRight.position.z = 0;

    const wallLeft = MeshBuilder.CreateBox('wallLeft', { width: roomLength, height: roomHeight, depth: 0.3 });
    wallLeft.rotate(Axis.Y, Math.PI / 2);
    wallLeft.position.x = -(roomWidth / 2) + 0.5;
    wallLeft.position.y = (roomHeight / 2);
    wallLeft.position.z = 0;

    const wallFront = MeshBuilder.CreateBox('wallBack', { width: roomWidth, height: roomHeight, depth: 0.3 });
    wallFront.position.x = 0;
    wallFront.position.y = (roomHeight / 2);
    wallFront.position.z = (roomLength / 2) - 0.5;

    const wallBack = MeshBuilder.CreateBox('wallBack', { width: roomWidth, height: roomHeight, depth: 0.3 });
    wallBack.position.x = 0;
    wallBack.position.y = (roomHeight / 2);
    wallBack.position.z = -(roomLength / 2) + 0.5;

    const grid = new GridMaterial('gridMaterial', this._scene);
    [floor, ceiling, wallFront, wallBack, wallLeft, wallRight].forEach(mesh => {
      mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 });
      mesh.material = grid;
    });

    this._floorMeshes.push(floor);
  }

  private setupGravity() {
    const gravityVector = new Vector3(0, -9.81, 0);
    this._scene.enablePhysics(gravityVector);

    const physicsRoot = new Mesh('physicsRoot', this._scene);
    physicsRoot.position.y -= 0.9;
    physicsRoot.scaling.scaleInPlace(1.0)
    physicsRoot.physicsImpostor = new PhysicsImpostor(
      physicsRoot,
      PhysicsImpostor.NoImpostor,
      { mass: 3 },
      this._scene
    );

    this._floorMeshes.forEach((ground) => {
      ground.physicsImpostor = new PhysicsImpostor(
        ground,
        PhysicsImpostor.BoxImpostor,
        { mass: 0, friction: 0.5, restitution: 0.85 },
        this._scene
      );
    });

    return physicsRoot;
  }

  private setupGui() {
    this._panel.margin = 0.2;
    this._gui.addControl(this._panel);
    this._panel.position.z = 2.5;
    this._panel.position.y = 3.2;

    // Order is important
    this._panel.addControl(this._container);
    this._panel.addControl(this._status);
    this._panel.addControl(this._title);

    this._title.text = "Playlist Browser XR";

    this._container.margin = 0.2;
    this._container.linkToTransformNode(this._anchor);
    this._container.position.y = 2.0;
    this._container.position.z = -2.65;
  }

  private clearContainer() {
    let children: Control3D[] = [];
    this._container.children.forEach((child) => {
      child.isVisible = false;
      child.dispose();
      children.push(child);
    });
    for (let child of children) {
      this._container.removeControl(child);
    }
  }

  private showPlaylist(playlist: SpotifyPlaylist, start: number = 0) {
    const tracks = playlist.tracks.slice(start, start + 5);

    this.setStatus(playlist.name, () => {
      this.showPlaylists();
    });
    this.clearContainer();

    this._container.rows = 1;
    this._container.blockLayout = true;

    // Show "Previous" button.
    if (start > 0) {
      const button = new HolographicButton('track-previous');
      this._container.addControl(button);

      button.onPointerClickObservable.add(() => {
        this.showPlaylist(playlist, start - 5);
      });

      button.imageUrl = 'https://models.babylonjs.com/Demos/weaponsDemo/textures/leftButton.png';
      button.text = 'Previous';
    }

    // Show each track.
    for (const track of tracks) {
      const button = new HolographicLabel(`track-${track.name}`);
      button.isButton = true;

      this._container.addControl(button);

      // Play a single track.
      button.onPointerClickObservable.add(() => {
        const command: Command<string> = {
          name: "play",
          data: track.uri
        };
        this.onNewCommandObservable.notifyObservers(command);
      });

      // Show album image (if available).
      if (track.image && track.image.url) {
        button.imageUrl = track.image.url;
      }

      button.text = track.name.slice(0, 20);
    }

    // Show "Next" button.
    if (playlist.tracks.length > start + tracks.length) {
      const button = new HolographicButton('track-next');
      this._container.addControl(button);

      button.onPointerClickObservable.add(() => {
        this.showPlaylist(playlist, start + 5);
      });

      button.imageUrl = 'https://models.babylonjs.com/Demos/weaponsDemo/textures/rightButton.png';
      button.text = 'Next';
    }

    this._container.blockLayout = false;
  }

  private showPlaylists(start: number = 0) {
    this.clearContainer();

    //this._container.rows = Math.floor(this._playlists.length / 2);
    this._container.rows = 1;
    this._container.blockLayout = true;

    const playlists = this._playlists.slice(start, start + 10);

    if (start > 0) {
      const button = new HolographicButton('playlists-previous');
      this._container.addControl(button);

      button.onPointerClickObservable.add(() => {
        this.showPlaylists(start - 10);
      });

      button.imageUrl = 'https://models.babylonjs.com/Demos/weaponsDemo/textures/leftButton.png';

      button.text = 'Previous';
    }

    for (const playlist of playlists) {
      const button = new HolographicButton(`playlist-${playlist.name}`);
      this._container.addControl(button);

      button.onPointerClickObservable.add(() => {
        this.showPlaylist(playlist);
      });

      button.text = playlist.name;
    }

    if (this._playlists.length > start + playlists.length) {
      const button = new HolographicButton('playlists-previous');
      this._container.addControl(button);

      button.onPointerClickObservable.add(() => {
        this.showPlaylists(start + 10);
      });

      button.imageUrl = 'https://models.babylonjs.com/Demos/weaponsDemo/textures/rightButton.png';

      button.text = 'Next';
    }

    this._container.blockLayout = false;
  }
}
