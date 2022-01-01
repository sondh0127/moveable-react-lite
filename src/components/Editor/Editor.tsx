import * as React from "react";
import InfiniteViewer from "react-infinite-viewer";
import Selecto from "react-selecto";
import styled, { StyledElement } from "react-css-styled";
import Viewport from "./Viewport/Viewport";
import { getContentElement, prefix, checkImageLoaded, setMoveMatrix, getOffsetOriginMatrix, updateElements } from "./utils/utils";
import Memory from "./utils/Memory";
import MoveableManager from "./Viewport/MoveableMananger";
import MoveableData from "./utils/MoveableData";
import { DATA_SCENA_ELEMENT_ID, EDITOR_CSS } from "./consts";
import { invert, matrix3d, } from "@scena/matrix";
import { getElementInfo } from "react-moveable";


const EditorElement = styled("div", EDITOR_CSS);


const Editor: React.FC = (props) => {
    const [state, setState] = React.useState({
        selectedTargets: [],
        zoom: 1,
        selectedMenu: "MoveTool",
    })

    const memory = new Memory();
    const moveableData = React.useRef<MoveableData>(new MoveableData(memory));
    const infiniteViewer = React.useRef<InfiniteViewer>();
    const selecto = React.useRef<Selecto>();
    const viewport = React.useRef<Viewport>();
    const editorElement = React.useRef<StyledElement<HTMLDivElement>>();

    const {
        selectedMenu,
        selectedTargets,
        zoom,
    } = state;

    React.useEffect(() => {
        memory.set("background-color", "#4af");
        memory.set("color", "#333");

        requestAnimationFrame(() => {
            infiniteViewer.current!.scrollCenter();
        });

        initTargets()
        return () => {
            memory.clear();
            moveableData.current!.clear();
        }
    }, [])

    async function initTargets() {
        const { added } = await viewport.current!.appendJSXs()
        const data = moveableData.current!;
        const container = viewport.current!.viewportRef.current!;
        const infos = updateElements(added)
        const targets = infos.map(function registerFrame(info) {
            const frame = data.createFrame(info.el!, info.frame);

            if (info.frameOrder) {
                frame.setOrderObject(info.frameOrder);
            }
            data.render(info.el!);

            info.children!.forEach(registerFrame);
            return info.el!;
        }).filter(el => el);
        infos.forEach(info => {
            if (!info.moveMatrix) {
                return;
            }
            const frame = data.getFrame(info.el!);
            let nextMatrix = getOffsetOriginMatrix(info.el!, container);

            nextMatrix = invert(nextMatrix, 4);

            const moveMatrix = matrix3d(nextMatrix, info.moveMatrix);

            setMoveMatrix(frame, moveMatrix);
            data.render(info.el!);
        });
        await Promise.all(targets.map(target => checkImageLoaded(target)))

        setSelectedTargets(targets);
        setSelectedTargets([targets[0]]);
    }

    async function setSelectedTargets(targets: Array<HTMLElement | SVGElement>) {
        targets = targets.filter(target => {
            return targets.every(parnetTarget => {
                return parnetTarget === target || !parnetTarget.contains(target);
            });
        });

        await new Promise<void>(resolve => {
            setState({
                ...state,
                selectedTargets: targets as any,
            });
            resolve()
        })
        selecto.current!.setSelectedTargets(targets);
        moveableData.current!.setSelectedTargets(targets);
        return targets;
    }

    return (
        <EditorElement className={prefix("editor")} ref={editorElement}>
            <InfiniteViewer ref={infiniteViewer}
                className={prefix("viewer")}
                useForceWheel={true}
                usePinch={true}
                pinchThreshold={50}
                maxPinchWheel={3}
                zoom={zoom}
            >
                <Viewport ref={viewport}
                    style={{
                        width: `${1000}px`,
                        height: `${1000}px`,
                    }}>
                    <MoveableManager
                        moveableData={() => moveableData.current!}
                        getSelecto={() => selecto.current!}
                        selectedTargets={selectedTargets}
                        selectedMenu={selectedMenu}
                        zoom={zoom}
                    ></MoveableManager>
                </Viewport>
            </InfiniteViewer>
            <Selecto
                ref={selecto}
                getElementRect={getElementInfo}
                dragContainer={".scena-viewer"}
                hitRate={0}
                selectableTargets={[`.scena-viewport [${DATA_SCENA_ELEMENT_ID}]`]}
                selectByClick={true}
                selectFromInside={false}
                toggleContinueSelect={["shift"]}
                preventDefault={true}
                scrollOptions={
                    infiniteViewer.current ? {
                        container: infiniteViewer.current.getContainer(),
                        threshold: 30,
                        throttleTime: 30,
                        getScrollPosition: () => {
                            const current = infiniteViewer.current!;
                            return [
                                current.getScrollLeft(),
                                current.getScrollTop(),
                            ];
                        },
                    } : undefined
                }
                onDragStart={e => {
                    const inputEvent = e.inputEvent;
                    const target = inputEvent.target;

                    const activeElement = document.activeElement;
                    if (activeElement) {
                        (activeElement as HTMLElement).blur();
                    }
                    const selection = document.getSelection()!;

                    if (selection) {
                        selection.removeAllRanges();
                    }

                    if (selectedMenu === "Text" && target.isContentEditable) {
                        const contentElement = getContentElement(target);

                        if (contentElement && contentElement.hasAttribute(DATA_SCENA_ELEMENT_ID)) {
                            e.stop();
                            setSelectedTargets([contentElement]);
                        }
                    }
                }}
                onScroll={({ direction }) => {
                    infiniteViewer.current!.scrollBy(direction[0] * 10, direction[1] * 10);
                }}
                onSelectEnd={({ isDragStart, selected, inputEvent, rect }) => {
                    if (isDragStart) {
                        inputEvent.preventDefault();
                    }

                    setSelectedTargets(selected).then(() => {
                        if (!isDragStart) {
                            return;
                        }
                    });
                }}
            ></Selecto>
        </EditorElement>
    );
}

export default Editor
