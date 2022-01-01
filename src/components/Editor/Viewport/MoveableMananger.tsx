import * as React from "react";
import Moveable from "react-moveable";
import { getContentElement } from "../utils/utils";
import Editor from "../Editor";
import { EditorInterface } from "../types";

export default class MoveableManager extends React.PureComponent<{
    selectedTargets: Array<HTMLElement | SVGElement>;
    selectedMenu: string,
    zoom: number,
    editor: Editor
}> {
    public moveable = React.createRef<Moveable>();
    public getMoveable() {
        return this.moveable.current!;
    }
    public render() {
        const {
            selectedTargets,
            selectedMenu,
            zoom,
            editor,
        } = this.props;

        if (!selectedTargets.length) {
            return this.renderViewportMoveable();
        }
        const moveableData = editor.moveableData;
        const memory = editor.memory;
        const elementGuidelines = [document.querySelector(".scena-viewport"), ...moveableData.getTargets()].filter(el => {
            return selectedTargets.indexOf(el as any) === -1;
        });

        const isShift = false

        return <Moveable
            ref={this.moveable}
            targets={selectedTargets}
            draggable={true}
            resizable={true}
            pinchable={["rotatable"]}
            zoom={1 / zoom}
            throttleResize={1}
            clippable={selectedMenu === "Crop"}
            passDragArea={selectedMenu === "Text"}
            checkInput={selectedMenu === "Text"}
            throttleDragRotate={isShift ? 45 : 0}
            keepRatio={selectedTargets.length > 1 ? true : isShift}
            rotatable={true}
            snappable={true}
            snapDirections={{ top: true, left: true, right: true, center: true, middle: true }}
            elementSnapDirections={{ top: true, left: true, right: true, center: true, middle: true }}
            snapGap={false}
            isDisplayInnerSnapDigit={true}
            roundable={true}
            elementGuidelines={elementGuidelines as any}
            clipArea={true}
            clipVerticalGuidelines={[0, "50%", "100%"]}
            clipHorizontalGuidelines={[0, "50%", "100%"]}
            clipTargetBounds={true}

            onBeforeRenderStart={moveableData.onBeforeRenderStart}
            onBeforeRenderGroupStart={moveableData.onBeforeRenderGroupStart}
            onDragStart={moveableData.onDragStart}
            onDrag={moveableData.onDrag}
            onDragGroupStart={moveableData.onDragGroupStart}
            onDragGroup={moveableData.onDragGroup}

            onScaleStart={moveableData.onScaleStart}
            onScale={moveableData.onScale}
            onScaleGroupStart={moveableData.onScaleGroupStart}
            onScaleGroup={moveableData.onScaleGroup}

            onResizeStart={moveableData.onResizeStart}
            onResize={moveableData.onResize}
            onResizeGroupStart={moveableData.onResizeGroupStart}
            onResizeGroup={moveableData.onResizeGroup}

            onRotateStart={moveableData.onRotateStart}
            onRotate={moveableData.onRotate}
            onRotateGroupStart={moveableData.onRotateGroupStart}
            onRotateGroup={moveableData.onRotateGroup}

            defaultClipPath={memory.get("crop") || "inset"}
            onClip={moveableData.onClip}

            onDragOriginStart={moveableData.onDragOriginStart}
            onDragOrigin={e => {
                moveableData.onDragOrigin(e);
            }}

            onRound={moveableData.onRound}

            onClick={e => {
                const target = e.inputTarget as any;

                if (e.isDouble && target.isContentEditable) {
                    this.selectMenu("Text");
                    const el = getContentElement(target);

                    if (el) {
                        el.focus();
                    }
                } else {
                    this.props.editor.getSelecto().clickTarget(e.inputEvent, e.inputTarget);
                }
            }}
            onClickGroup={e => {
                this.props.editor.getSelecto().clickTarget(e.inputEvent, e.inputTarget);
            }}
            onRenderStart={e => {
                e.datas.prevData = moveableData.getFrame(e.target).get();
            }}
            onRender={e => {
                e.datas.isRender = true;
            }}
            onRenderEnd={e => {
                if (!e.datas.isRender) {
                    return;
                }
            }}
            onRenderGroupStart={e => {
                e.datas.prevDatas = e.targets.map(target => moveableData.getFrame(target).get());
            }}
            onRenderGroup={e => {
                e.datas.isRender = true;
            }}
            onRenderGroupEnd={e => {
                if (!e.datas.isRender) {
                    return;
                }
            }}
        ></Moveable>
    }
    public renderViewportMoveable() {
        const moveableData = this.props.editor.moveableData;
        const {editor} = this.props;
        const viewport = editor.getViewport();
        const target = viewport ? viewport.viewportRef.current! : null;

        return <Moveable
            ref={this.moveable}
            target={target}
            origin={false}
            onRotateStart={moveableData.onRotateStart}
            onRotate={moveableData.onRotate}
        ></Moveable>
    }

    public updateRect() {
        this.getMoveable().updateRect();
    }
}
export default interface MoveableManager extends EditorInterface { }
