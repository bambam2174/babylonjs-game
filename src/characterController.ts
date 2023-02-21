import { TransformNode, Scene, ShadowGenerator, Vector3, Mesh, UniversalCamera, Quaternion, Ray, AbstractMesh, Nullable, PickingInfo } from '@babylonjs/core';
import { PlayerInput } from './inputController';


export class Player extends TransformNode {

    public camera: UniversalCamera;
    public scene: Scene;
    private _input!: PlayerInput;

    //Player
    public mesh: Mesh;

    //Camera
    private _camRoot!: TransformNode;
    private _yTilt!: TransformNode;

    //const values
    private static readonly PLAYER_SPEED: number = 0.45;
    private static readonly JUMP_FORCE: number = 0.80;
    private static readonly GRAVITY: number = -2.8;
    private static readonly DASH_FACTOR: number = 2.5;
    private static readonly DASH_TIME: number = 10; //how many frames the dash lasts
    private static readonly DOWN_TILT: Vector3 = new Vector3(0.8290313946973066, 0, 0);
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);

    private static readonly NODE_NAME_CAMERA_ROOT: string = "root";
    private static readonly NODE_NAME_CAMERA_Y_TILT: string = "yTilt";
    private static readonly NODE_NAME_PLAYER: string = "Player";
    private static readonly NODE_NAME_STAIR: string = "stair";
    public dashTime: number = 0;

    //player movement vars
    private _deltaTime: number = 0;
    private _h: number = 0;
    private _v: number = 0;

    private _moveDirection: Vector3 = new Vector3();

    private _inputAmt: number = 0;

    //dashing
    private _dashPressed: boolean = false;
    private _canDash: boolean = true;

    //gravity, ground detection, jumping
    private _gravity: Vector3 = Vector3.Zero();
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
    private _grounded: boolean = true;
    private _jumpCount: number = 1;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, input?: PlayerInput) {
        super(Player.NODE_NAME_PLAYER, scene);
        this.scene = scene;

        this.camera = this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); // player mesh will cast shadows

        if (input) {
            this._input = input;
            this._h = this._input.horizontal;   // right-left, x-axis
            this._v = this._input.vertical;
        }


    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

        this._moveDirection = Vector3.Zero();
        this._h = this._input.horizontal;   // right-left, x-axis
        this._v = this._input.vertical;     // fwd-bck, z-axi


        // —> Dashing <—
        if (this._input.dashing && !this._dashPressed && this._canDash && !this._grounded) {
            this._canDash = false;
            this._dashPressed = true;
        }

        let dashFactor = 1;
        //if you're dashing, scale movement
        if (this._dashPressed) {
            if (this.dashTime > Player.DASH_TIME) {
                this.dashTime = 0;
                this._dashPressed = false;
            } else {
                dashFactor = Player.DASH_FACTOR;
            }
            this.dashTime++;
        }

        // Movements based on camera as it rotates
        let fwd = this._camRoot.forward;
        let right = this._camRoot.right;

        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);
        console.log('_updateFromControls', 'this._input', this._input);
        console.log('_updateFromControls', 'fwd', fwd, 'right', right);
        console.log('_updateFromControls', 'correctedVertical', correctedVertical, 'correctedHorizontal', correctedHorizontal);

        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);
        console.log('_updateFromControls: move', move);

        //clear y so that the character doesn't fly up, normalize for next step, taking into account whether we've DASHED or not
        this._moveDirection = new Vector3((move).normalize().x * dashFactor, 0, (move).normalize().z * dashFactor);
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

        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction

        // TODO: Try without return on no input by commenting out the following
        if (input.length() == 0) { //if there's no input detected, prevent rotation and keep player in same rotation
            return;
        }

        // rotation based on input & the camera angle
        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += this._camRoot.rotation.y;
        let quaternionFromAngle = Quaternion.FromEulerAngles(0, angle, 0);
        // CHECK: if this.mesh.rotationQuaternion could be null
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion!, quaternionFromAngle, 10 * this._deltaTime);
    }

    private _setUpAnimations(): void {

    }

    private _animatePlayer(): void {

    }

    private _floorRayCast(offsetX: number, offsetZ: number, rayCastLen: number): Vector3 {
        let rayCastFloor = new Vector3(this.mesh.position.x + offsetX, this.mesh.position.y + 0.5, this.mesh.position.z + offsetZ);
        console.log('rayCastFloor', rayCastFloor);
        // console.log('rayCastFloor this.mesh.position + (offsetX, 0.5, offsetZ', this.mesh.position.add(new Vector3(offsetX, 0.5, offsetZ)));

        let ray = new Ray(rayCastFloor, Vector3.Up().scale(-1), rayCastLen);
        console.log('Vector3.Up().scale(-1)', Vector3.Up().scale(-1));
        console.log('Vector3.Down()', Vector3.Down());

        let predicate = function (mesh: AbstractMesh): boolean {
            return mesh.isPickable && mesh.isEnabled();
        }
        let pick = this.scene.pickWithRay(ray, predicate);

        let vectorPickedPoint: Vector3 = Vector3.Zero();
        if (pick?.hit) {
            vectorPickedPoint = pick.pickedPoint!;
        }
        console.log('vectorPickedPoint', vectorPickedPoint);
        return vectorPickedPoint;
    }

    private _isGrounded(): boolean {
        let isGrounded = true
        if (this._floorRayCast(0, 0, 0.6).equals(Vector3.Zero())) {
            isGrounded = false;
        }
        return isGrounded;
    }

    private _checkSlope(): boolean {
        // only check meshes that are pickable and enabled (specific for collision meshes that are invisible)
        let predicate = function (mesh: AbstractMesh): boolean {
            return mesh.isPickable && mesh.isEnabled();
        }

        // 4 ray casts outward from center
        let rayCast = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z + .25);
        let ray = new Ray(rayCast, Vector3.Up().scale(-1), 1.5);
        let pick = this.scene.pickWithRay(ray, predicate);

        let rayCast2 = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z - .25);
        let ray2 = new Ray(rayCast2, Vector3.Up().scale(-1), 1.5);
        let pick2 = this.scene.pickWithRay(ray2, predicate);

        let rayCast3 = new Vector3(this.mesh.position.x + .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray3 = new Ray(rayCast3, Vector3.Up().scale(-1), 1.5);
        let pick3 = this.scene.pickWithRay(ray3, predicate);

        let rayCast4 = new Vector3(this.mesh.position.x - .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray4 = new Ray(rayCast4, Vector3.Up().scale(-1), 1.5);
        let pick4 = this.scene.pickWithRay(ray4, predicate);

        // TODO: DRY refactor it…!
        if (pick?.hit && !pick.getNormal()?.equals(Vector3.Up())) {
            if (pick.pickedMesh?.name.includes(Player.NODE_NAME_STAIR)) {
                return true;
            }
        } else if (pick2?.hit && !pick2.getNormal()?.equals(Vector3.Up())) {
            if (pick2.pickedMesh?.name.includes(Player.NODE_NAME_STAIR)) {
                return true;
            }
        }
        else if (pick3?.hit && !pick3.getNormal()?.equals(Vector3.Up())) {
            if (pick3.pickedMesh?.name.includes(Player.NODE_NAME_STAIR)) {
                return true;
            }
        }
        else if (pick4?.hit && !pick4.getNormal()?.equals(Vector3.Up())) {
            if (pick4.pickedMesh?.name.includes(Player.NODE_NAME_STAIR)) {
                return true;
            }
        }

        return false;
    }

    private _updateGroundDetection(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        if (!this._isGrounded()) {
            // TODO: try this._checkSlope2
            // if the body isn't grounded, check if it's on a slope and was either falling or walking onto it
            if (this._checkSlope() && this._gravity.y <= 0) {
                console.log("slope")
                //if you are considered on a slope, you're able to jump and gravity wont affect you
                this._gravity.y = 0;
                this._jumpCount = 1;
                this._grounded = true;
            } else {
                //keep applying gravity
                this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
                this._grounded = false;
            }
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
            this._jumpCount = 1;

            //dashing reset
            this._canDash = true; //the ability to dash
            //reset sequence(needed if we collide with the ground BEFORE actually completing the dash duration)
            this.dashTime = 0;
            this._dashPressed = false;

        }

        if (this._input.jumpKeyDown && this._jumpCount > 0) {
            this._gravity.y = Player.JUMP_FORCE;
            this._jumpCount--;
        }

    }


    private _beforeRenderUpdate(): void {
        this._updateFromControls();


        console.log('_beforeRenderUpdate: this._moveDirection', this._moveDirection);
        // move our mesh
        this._updateGroundDetection();

    }

    /**
     * activates Player Cameras
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

    private _setupPlayerCamera(): UniversalCamera {

        // root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode(Player.NODE_NAME_CAMERA_ROOT);
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        // TODO: Use _yTilt directly omitting local yTilt
        //rotations along the x-axis (up/down tilting)
        let yTilt = new TransformNode(Player.NODE_NAME_CAMERA_Y_TILT);
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


    // TODO: try this
    private _checkSlope2(): boolean {

        // 4 ray casts outward from center
        let rayCast = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z + .25);

        let rayCast2 = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z - .25);

        let rayCast3 = new Vector3(this.mesh.position.x + .25, this.mesh.position.y + 0.5, this.mesh.position.z);

        let rayCast4 = new Vector3(this.mesh.position.x - .25, this.mesh.position.y + 0.5, this.mesh.position.z);

        let arrPickInfo = this._slopeCast(rayCast, rayCast2, rayCast3, rayCast4);
        let foundPick: Nullable<PickingInfo> | any = arrPickInfo.find(pick => pick?.hit && !pick.getNormal()?.equals(Vector3.Up()));
        if (foundPick?.pickedMesh?.name.includes(Player.NODE_NAME_STAIR)) {
            return true;
        }

        return false;
    }

    // see TODO: DRY above
    private _slopeCast(...arrRayVectors: Vector3[]): Nullable<PickingInfo>[] {
        let predicate = function (mesh: AbstractMesh): boolean {
            return mesh.isPickable && mesh.isEnabled();
        }
        let arrPickingInfo: Nullable<PickingInfo>[] = [];

        for (let tmpVector of arrRayVectors) {
            let ray = new Ray(tmpVector, Vector3.Up().scale(-1), 1.5);
            arrPickingInfo.push(this.scene.pickWithRay(ray, predicate));
        }
        return arrPickingInfo;
    }
}