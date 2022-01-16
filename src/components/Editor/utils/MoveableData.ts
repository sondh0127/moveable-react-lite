import MoveableHelper from "moveable-helper";
import Memory from "./Memory";
export default class MoveableData extends MoveableHelper {
    public selectedTargets: Array<HTMLElement | SVGElement> = [];
    constructor(private memory: Memory) {
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
