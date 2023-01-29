import { TransformNode, Scene, ShadowGenerator, Vector3, Mesh, UniversalCamera, Quaternion, Ray, AbstractMesh } from '@babylonjs/core';
import { PlayerInput } from './inputController';


export class Player extends TransformNode {

    public camera: UniversalCamera;
    public scene: Scene;

    private _input!: PlayerInput;

    private _camRoot!: TransformNode;

    private _yTilt!: TransformNode;
    // Player
    public mesh: Mesh;

    //const values
    private static readonly PLAYER_SPEED: number = 0.45;
    private static readonly JUMP_FORCE: number = 0.80;
    private static readonly GRAVITY: number = -2.8;
    private static readonly DASH_FACTOR: number = 2.5;
    private static readonly DASH_TIME: number = 10; //how many frames the dash lasts
    private static readonly DOWN_TILT: Vector3 = new Vector3(0.8290313946973066, 0, 0);
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);

    //player movement vars
    private _deltaTime: number = 0;
    private _h: number = 0;
    private _v: number = 0;

    private _moveDirection: Vector3 = new Vector3();

    private _inputAmt: number = 0;

    //gravity, ground detection, jumping
    private _gravity: Vector3 = Vector3.Zero();
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
    private _grounded: boolean = true;
    private _jumpCount: number = 1;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, input?: PlayerInput) {
        super("Player", scene);
        this.scene = scene;

        this.camera = this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); // player mesh will cast shadowss

        if (input) {
            this._input = input;
            this._h = this._input.horizontal;   // right-left, x-axis
            this._v = this._input.vertical;
        }


    }

    private _setupPlayerCamera(): UniversalCamera {

        // root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        // TODO: Use _yTilt directly omitting local yTilt
        //rotations along the x-axis (up/down tilting)
        let yTilt = new TransformNode("ytilt");
        //adjustments to camera view to point down at our player
        yTilt.rotation = Player.ORIGINAL_TILT;
        this._yTilt = yTilt;
        yTilt.parent = this._camRoot;

        let camera: UniversalCamera = new UniversalCamera('cam', new Vector3(0, 0, -30), this.scene);
        camera.lockedTarget = this._camRoot.position;
        camera.fov = 0.47350045992678597;
        camera.parent = yTilt;

        this.scene.activeCamera = camera;

        return camera;
    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

        this._moveDirection = Vector3.Zero();
        this._h = this._input.horizontal;   // right-left, x-axis
        this._v = this._input.vertical;     // fwd-bck, z-axi


        // Movements based on camera as it rotates
        let fwd = this._camRoot.forward;
        let right = this._camRoot.right;

        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);
        console.log('_updateFromControls', 'this._input', this._input);
        console.log('_updateFromControls', 'fwd', fwd, 'right', right);
        console.log('_updateFromControls', 'correctedVertical', correctedVertical, 'correctedHorizontal', correctedHorizontal);

        let move = correctedHorizontal.addInPlace(correctedVertical);
        console.log('_updateFromControls: move', move);

        this._moveDirection = new Vector3(move.normalize().x, 0, move.normalize().z);
        console.log('_updateFromControls: 1 this._moveDirection', this._moveDirection);

        // TODO: check case for negative inputMag. Seems meaningless since absolute value are always positive
        // clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }

        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * Player.PLAYER_SPEED);
        console.log('_updateFromControls: 2 this._moveDirection', this._moveDirection);

        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis);

        // TODO: Try without return on no input by commenting out the following
        if (input.length() == 0) {
            return;
        }

        // rotation based on input & the camera angle
        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += this._camRoot.rotation.y;
        let targ = Quaternion.FromEulerAngles(0, angle, 0);
        // CHECK: if this.mesh.rotationQuaternion could be null
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion!, targ, 10 * this._deltaTime);


    }

    private _beforeRenderUpdate(): void {
        this._updateFromControls();


        console.log('_beforeRenderUpdate: this._moveDirection', this._moveDirection);
        // move our mesh
        this._updateGroundDetection();

    }

    /**
     * activates Player Camerass
     * @returns UniversalCamera
     */
    public activatePlayerCamera(): UniversalCamera {
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
            this._updateCamera();
        })
        return this.camera;
    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y + 2;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
    }

    private _floorRaycast(offsetx: number, offsetz: number, raycastlen: number): Vector3 {
        let raycastFloor = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y + 0.5, this.mesh.position.z + offsetz);
        console.log('raycastFloor', raycastFloor);
        // console.log('raycastFloor this.mesh.position + (offsetx, 0.5, offsetz', this.mesh.position.addInPlace(new Vector3(offsetx, 0.5, offsetz)));

        let ray = new Ray(raycastFloor, Vector3.Up().scale(-1), raycastlen);
        console.log('Vector3.Up().scale(-1)', Vector3.Up().scale(-1));
        console.log('Vector3.Down()', Vector3.Down());

        let predicate = function (mesh: AbstractMesh) {
            return mesh.isPickable && mesh.isEnabled();
        }
        let pick = this.scene.pickWithRay(ray, predicate);

        if (pick?.hit) {
            return pick.pickedPoint!;
        }
        return Vector3.Zero();
    }

    private _isGrounded(): boolean {
        let isGrounded = false
        if (this._floorRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
            isGrounded = true;
        }
        return isGrounded;
    }

    private _updateGroundDetection(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        if (!this._isGrounded()) {
            this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
            this._grounded = false;
        }

        //limit the speed of gravity to the negative of the jump power
        if (this._gravity.y < -Player.JUMP_FORCE) {
            this._gravity.y = -Player.JUMP_FORCE;
        }
        this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));


        if (this._isGrounded()) {
            this._gravity.y = 0;
            this._grounded = true;
            this._lastGroundPos.copyFrom(this.mesh.position);
        }


    }
}