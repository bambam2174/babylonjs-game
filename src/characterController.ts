import { TransformNode, ArcRotateCamera, Scene, ShadowGenerator, Vector3, Mesh } from '@babylonjs/core';


export class Player extends TransformNode {

    public camera?: ArcRotateCamera;
    public scene: Scene;

    private _input;

    // Player
    public mesh: Mesh;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, input?) {
        super("Player", scene);
        this.scene = scene;

        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); // player mesh will cast shadowss

        this._input = input;
    }

    private _setupPlayerCamera() {
        let camera4 = new ArcRotateCamera("arc", Math.PI / 2, Math.PI / 2, 8, new Vector3(0, 3, 0), this.scene);

    }

}