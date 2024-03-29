import React from "react";
import Moveable from "react-moveable";
import { getContentElement } from "../utils/utils";
import Selecto from "react-selecto";
import { moveableData } from '../Editor'
import { DimensionViewableProps, DimensionViewable } from "./ables/DimensionViewable";
import { DeleteButtonViewable } from "./ables/DeleteButtonViewable";
import { ElementInfo } from "..";

const MoveableMananger: React.FC<{
    selectedTargets: Array<HTMLElement | SVGElement>;
    selectedMenu: string,
    zoom: number,
    getSelecto: () => Selecto;
    viewportRef;
}> = (props, ref) => {
    const {
        selectedTargets,
        selectedMenu,
        zoom,
        getSelecto,
        onRemoveElements,
    } = props;

    const moveableRef = React.useRef<Moveable>();

    const elementGuidelines = [document.querySelector(".scena-viewport"), ...moveableData.getTargets()].filter(el => {
        return selectedTargets.indexOf(el as any) === -1;
    });

    const isShift = false

    React.useImperativeHandle(ref, () => ({
        moveableRef
    }));



    return <Moveable<DimensionViewableProps>
        ref={moveableRef}
        targets={selectedTargets}
        ables={[DimensionViewable, DeleteButtonViewable]}
        dimensionViewable={true}
        deleteButtonViewable={true}
        onRemoveElements={onRemoveElements}
        draggable={true}
        resizable={true}
        zoom={1 / zoom}
        throttleResize={1}
        passDragArea={selectedMenu === "Text"}
        checkInput={selectedMenu === "Text"}
        keepRatio={selectedTargets.length > 1 ? true : isShift}
        snappable={true}
        snapDirections={{ top: true, left: true, right: true, center: true, middle: true, bottom: true }}
        elementSnapDirections={{ top: true, left: true, right: true, center: true, middle: true, bottom: true }}
        isDisplayInnerSnapDigit={true}
        elementGuidelines={elementGuidelines as any}
        onDragStart={moveableData.onDragStart}
        onDrag={moveableData.onDrag}
        onResizeStart={moveableData.onResizeStart}
        onResize={moveableData.onResize}
        onClick={e => {
            const target = e.inputTarget as any;
            if (e.isDouble && target.isContentEditable) {
                const el = getContentElement(target);
                if (el) {
                    el.focus();
                }
            } else {
                getSelecto().clickTarget(e.inputEvent, e.inputTarget);
            }
        }}
    ></Moveable>
}

export default React.forwardRef(MoveableMananger);
