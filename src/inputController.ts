import { ActionManager, ExecuteCodeAction, Scalar, Scene } from "@babylonjs/core";


export class PlayerInput {

    public inputMap;

    public vertical = 0;
    public verticalAxis;

    public horizontal = 0;
    public horizontalAxis;

    //jumping and dashing
    public jumpKeyDown: boolean = false;
    public dashDxn: number = 0;
    public dashing: boolean = false;

    constructor(scene: Scene) {
        scene.actionManager = new ActionManager(scene);

        this.inputMap = {};

        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, event => {
            this.inputMap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";
        }));

        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, event => {
            this.inputMap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";

        }));

        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });
    }

    private _updateFromKeyboard(): void {
        if (this.inputMap["ArrowUp"]) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
            this.verticalAxis = 1;
        } else if (this.inputMap["ArrowDown"]) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this.verticalAxis = -1;
        } else {
            this.vertical = Scalar.Lerp(this.vertical, 0, 0.2);
            this.verticalAxis = 0;
        }

        if (this.inputMap["ArrowLeft"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this.horizontalAxis = -1;
        } else if (this.inputMap["ArrowRight"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this.horizontalAxis = 1;
        } else {
            this.horizontal = Scalar.Lerp(this.horizontal, 0, 0.2);
            this.horizontalAxis = 0;
        }

        // TODO: Try the lines below and refactor if feasible
        // [ ]: log this.inputMap["Shift"]
        // [ ]: log this.inputMap[" "]
        /*
        [ ]: try this.dashing = this.inputMap["Shift"];
        [ ]: try this.jumpKeyDown = this.inputMap[" "];
        */
        if (this.inputMap["Shift"]) {
            this.dashing = true;
        } else {
            this.dashing = false;
        }

        if (this.inputMap[" "]) {
            this.jumpKeyDown = true;
        } else {
            this.jumpKeyDown = false;
        }
    }
}