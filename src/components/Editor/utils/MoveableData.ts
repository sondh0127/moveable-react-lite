import MoveableHelper from "moveable-helper";
export default class MoveableData extends MoveableHelper {
    public selectedTargets: Array<HTMLElement | SVGElement> = [];
    constructor() {
        super({
            createAuto: true,
            useBeforeRender: true,
        });
    }
    public setSelectedTargets(targets: Array<HTMLElement | SVGElement>) {
        this.selectedTargets = targets;
    }
    public getSelectedTargets() {
        return this.selectedTargets;
    }
}
