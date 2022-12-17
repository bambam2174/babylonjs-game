import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder } from "@babylonjs/core";

class App {
    constructor() {

        // create the canvas html element & append it to body
        let canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        let engine = new Engine(canvas, true);
        let scene = new Scene(engine);

        let camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
        camera.attachControl(canvas, true);

        let light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        let sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

        window.addEventListener('keydown', (ev: KeyboardEvent) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'i') {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        })

        engine.runRenderLoop(() => {
            scene.render();
        });

    }
}

new App();