import { MeshBuilder, Scene, SceneLoader, Vector3 } from "@babylonjs/core";
import modelEnvSetting from "../assets/models/envSetting.glb";


export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public async load() {
        var ground = MeshBuilder.CreateBox("ground", { size: 48 }, this._scene);
        ground.scaling = new Vector3(1, .02, 1);
        ground.receiveShadows = true;
        const assets = await this._loadAsset();

        assets.allMeshes.forEach(m => {
            m.receiveShadows = true;
            m.checkCollisions = true;
        });
    }

    public async _loadAsset() {

        const result = await SceneLoader.ImportMeshAsync(null, "", modelEnvSetting, this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();

        return {
            env: env,               // reference to our entire imported glb (meshes and transform nodes)
            allMeshes: allMeshes    // all of the meshes that are in the environment
        }

    }
}