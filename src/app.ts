import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, FreeCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Color4, Sound, Matrix, Quaternion, StandardMaterial, Color3, PointLight, ShadowGenerator } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui"
import { Environment } from "./environment";
import { Player } from "./characterController";
import { PlayerInput } from "./inputController";
//enum for states
enum State { START = 0, GAME = 1, LOSE = 2, CUTSCENE = 3 }

class App {

    // General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;


    //Game State Related
    public assets;
    // private _input: PlayerInput;
    // private _player: Player;
    // private _ui: Hud;
    // private _environment;

    //Sounds
    // public sfx: Sound;
    // public game: Sound;
    // public end: Sound;

    //Scene - related
    private _state: State = State.START;
    // private _containerScenes = {};

    protected _environment!: Environment;
    protected _gameScene!: Scene;
    protected _cutScene!: Scene;


    //post process
    private _transition: boolean = false;

    private _input!: PlayerInput;
    private _player!: Player;

    constructor() {

        // create the canvas html element & append it to body
        this._canvas = this._createCanvas();

        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        window.addEventListener('keydown', (ev: KeyboardEvent) => {
            // Shift+Ctrl+Alt+I
            console.log('[CreateGameTut] keydown', ev, ev.shiftKey, ev.ctrlKey, ev.altKey, ev.key);
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.code === 'KeyI') {
                console.log('[CreateGameTut] Shift+Ctrl+Alt+I pressed');
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        })

        this._main();

    }

    private _createCanvas(): HTMLCanvasElement {

        //Commented out for development
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        let canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        return canvas;
    }

    private async _main(): Promise<void> {
        await this._goToStart();

        // Register a render loop to repeatedly render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        //resize if the screen is resized/rotated
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    // goToStart
    private async _goToStart(): Promise<void> {
        this._engine.displayLoadingUI(); //make sure to wait for start to load

        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        const camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());


        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720;

        const btnStart = Button.CreateSimpleButton("start", "PLAY");
        btnStart.width = 0.2;
        btnStart.height = "40px";
        btnStart.color = "white";
        btnStart.top = "-14px";
        btnStart.thickness = 0;
        btnStart.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(btnStart);

        btnStart.onPointerDownObservable.add(() => {
            this._goToCutScene();
            scene.detachControl();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        //lastly set the current state to the start state and set the scene to the start scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    private async _goToCutScene(): Promise<void> {
        this._engine.displayLoadingUI();
        //--SETUP SCENE--
        //dont detect any inputs from this ui while the game is loading
        this._scene.detachControl();

        this._cutScene = new Scene(this._engine);
        const camera = new FreeCamera("camera2", new Vector3(0, 0, 0), this._cutScene);
        camera.setTarget(Vector3.Zero());
        this._cutScene.clearColor = new Color4(0, 0, 0, 1);

        const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");


        //--WHEN SCENE IS FINISHED LOADING--
        await this._cutScene.whenReadyAsync();
        this._scene.dispose();
        this._state = State.CUTSCENE;
        this._scene = this._cutScene;

        //--PROGRESS DIALOGUE--
        const next = Button.CreateSimpleButton("next", "NEXT");
        next.color = "white";
        next.thickness = 0;
        next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        next.width = "64px";
        next.height = "64px";
        next.top = "-3%";
        next.left = "-12%";
        cutScene.addControl(next);

        next.onPointerUpObservable.add(() => {
            this._goToGame();
        });

        //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
        let finishedLoading = false;
        await this._setUpGame().then(res => {
            finishedLoading = true;

        });
    }

    private async _setUpGame(): Promise<void> {
        //--CREATE SCENE--
        let scene = new Scene(this._engine);

        this._gameScene = scene;
        //--SOUNDS--
        // this._loadSounds(scene);

        //--CREATE ENVIRONMENT--
        const environment = new Environment(scene);
        this._environment = environment;
        //Load environment and character assets
        await this._environment.load(); //environment
        await this._loadCharacterAssets(scene); //character
    }

    /**
     * 
     * @param scene 
     * @returns Promise with loaded assets
     */
    private async _loadCharacterAssets(scene: Scene): Promise<any> {

        async function loadCharacter() {
            //collision mesh
            const outer: Mesh = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            //move origin of box collider to the bottom of the mesh (to match imported player mesh)
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

            //for collisions
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

            const box = MeshBuilder.CreateBox("Small1", { width: 0.5, depth: 0.5, height: 0.25, faceColors: [new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1), new Color4(0, 0, 0, 1)] }, scene);
            box.position.y = 1.5;
            box.position.z = 1;

            let optionsCylinder = {
                height: 3,
                diameterTop: 2,
                diameterBottom: 2,
                tessellation: 0,
                subdivisions: 0
            };

            const body = MeshBuilder.CreateCylinder("body", optionsCylinder, scene);
            const bodymtl = new StandardMaterial("red", scene);
            bodymtl.diffuseColor = new Color3(0.8, 0.5, 0.5);
            body.material = bodymtl;
            body.isPickable = false;
            body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0)); // simulates the imported mesh's origin

            //parent the meshes
            box.parent = body;
            body.parent = outer;

            return {
                mesh: outer
            }
        }

        return loadCharacter().then(assets => {
            this.assets = assets;
        });
    }

    private _loadSounds(scene: Scene): void {
        throw new Error("Method not implemented.");
    }

    private async _goToGame(): Promise<void> {
        //--SETUP SCENE--
        this._scene.detachControl();

        let scene = this._gameScene;


        scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098); // a color that fit the overall color scheme better
        // let camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
        // camera.setTarget(Vector3.Zero());

        //--GUI--
        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        //dont detect any inputs from this ui while the game is loading
        scene.detachControl();


        //create a simple button
        const loseBtn = Button.CreateSimpleButton("lose", "LOSE");
        loseBtn.width = 0.2
        loseBtn.height = "40px";
        loseBtn.color = "white";
        loseBtn.top = "-14px";
        loseBtn.thickness = 0;
        loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        playerUI.addControl(loseBtn);

        //this handles interactions with the start button attached to the scene
        loseBtn.onPointerDownObservable.add(() => {
            this._goToLose();
            scene.detachControl(); //observables disabled
        });

        this._input = new PlayerInput(scene);
        //primitive character and setting
        await this._initializeGameAsync(scene);

        //--WHEN SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        scene.getMeshByName("outer")!.position = new Vector3(0, 3, 0);

        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene;
        this._engine.hideLoadingUI();
        //the game is ready, attach control back
        this._scene.attachControl();
    }

    private async _goToLose(): Promise<void> {
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        const camera = new FreeCamera("camera2", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());


        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const btnMain = Button.CreateSimpleButton("mainmenu", "MAIN MENU");
        btnMain.width = 0.2;
        btnMain.height = "40px";
        btnMain.color = "white";
        guiMenu.addControl(btnMain)

        btnMain.onPointerUpObservable.add(() => {
            this._goToStart();
        });
        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }

    private async _initializeGameAsync(scene: Scene): Promise<any> {
        //temporary light to light the entire scene
        const light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);

        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
        light.intensity = 35;
        light.radius = 1;

        const shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.darkness = 0.4;

        //Create the player
        this._player = new Player(this.assets, scene, shadowGenerator, this._input); //dont have inputs yet so we dont need to pass it in
        const camera = this._player.activatePlayerCamera();
    }
}

new App();