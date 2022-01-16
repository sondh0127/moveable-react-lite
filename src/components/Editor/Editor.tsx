import * as React from "react";
import InfiniteViewer from "react-infinite-viewer";
import Selecto from "react-selecto";
import Viewport from "./Viewport/Viewport";
import { getContentElement, prefix, checkImageLoaded, updateElements, isScenaElement } from "./utils/utils";
import Memory from "./utils/Memory";
import MoveableManager from "./Viewport/MoveableMananger";
import MoveableData from "./utils/MoveableData";
import { DATA_SCENA_ELEMENT_ID } from "./consts";
import { getElementInfo } from "react-moveable";
import './Editor.css';
import { useAtom } from "jotai";
import { idsAtom, jsxsAtom } from "./store";
import { AddedInfo, ElementInfo } from ".";
import { IObject } from "@daybrush/utils";

const memory = new Memory();
export const moveableData = new MoveableData(memory)

const Editor: React.FC = () => {
    const [state, setState] = React.useState({
        selectedTargets: [],
        zoom: 1,
        selectedMenu: "MoveTool",
    })

    const infiniteViewer = React.useRef<InfiniteViewer>();
    const selecto = React.useRef<Selecto>();
    const moveableManager = React.useRef<typeof MoveableManager>();
    const [ids, setIds] = useAtom(idsAtom)
    const [jsxs, setJsxs] = useAtom(jsxsAtom)

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
            moveableData!.clear();
        }
    }, [])

    function appendJSXs(): Promise<AddedInfo> {
        const jsxs = [
            {
                jsx: <div className="moveable" contentEditable="true" suppressContentEditableWarning={true}>Moveable</div>,
                name: "(Moveable 1)",
                frame: {
                    position: "absolute",
                    left: "50%",
                    top: "30%",
                    width: "250px",
                    height: "100px",
                    "font-size": "40px",
                    "transform": "translate(-125px, -100px)",
                    display: "flex",
                    "justify-content": "center",
                    "flex-direction": "column",
                    "text-align": "center",
                    "font-weight": 100,
                },
            },
            {
                jsx: <div className="moveable" contentEditable="true" suppressContentEditableWarning={true}>Moveable 2</div>,
                name: "(Moveable 2)",
                frame: {
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: "250px",
                    height: "100px",
                    "font-size": "40px",
                    "transform": "translate(-125px, -100px)",
                    display: "flex",
                    "justify-content": "center",
                    "flex-direction": "column",
                    "text-align": "center",
                    "font-weight": 100,
                },
            },
            {
                jsx: <div className="moveable" contentEditable="true" suppressContentEditableWarning={true}>Moveable is Draggable! Resizable! Scalable! Rotatable! Warpable! Pinchable</div>,
                name: "(Moveable 3)",
                frame: {
                    position: "absolute",
                    left: "0%",
                    top: "65%",
                    width: "100%",
                    "font-size": "14px",
                    "text-align": "center",
                    "font-weight": "normal",
                },
            },
        ]
        const jsxInfos = registerChildren(jsxs);

        jsxInfos.forEach((info, i) => {
            const scopeInfo = ids[info.scopeId!];
            const children = scopeInfo.children!;
            info.index = children.length;
            children.push(info);
        });

        return new Promise(resolve => {
            resolve({
                added: jsxInfos,
            });
        });
    }

    function registerChildren(_jsxs: ElementInfo[]) {
        function makeId(_ids?: IObject<any>) {
            _ids = _ids || ids
            while (true) {
                const id = `scena${Math.floor(Math.random() * 100000000)}`;
                if (_ids[id]) {
                    continue;
                }
                return id;
            }
        }

        return _jsxs.map(info => {
            const id = info.id || makeId();
            const jsx = info.jsx;
            const children = info.children || [];
            const scopeId = info.scopeId || "viewport";
            let componentId = "";
            let jsxId = "";


            if (isScenaElement(jsx)) {
                jsxId = makeId(jsxs);
                setJsxs({
                    ...jsxs,
                    [jsxId]: jsx,
                })
            }
            const elementInfo: ElementInfo = {
                ...info,
                jsx,
                children: registerChildren(children),
                scopeId,
                componentId,
                jsxId,
                frame: info.frame || {},
                el: null,
                id,
            };

            function setInfo(id: string, info: ElementInfo) {
                const _ids = ids;
                _ids[id] = info;
                setIds(_ids);
            }

            setInfo(id, elementInfo);
            return elementInfo;
        });
    }

    async function initTargets() {
        const { added } = await appendJSXs()
        const data = moveableData!;
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
        moveableData!.setSelectedTargets(targets);
        return targets;
    }



    return (
        <div className={prefix("editor")} >
            <InfiniteViewer ref={infiniteViewer}
                className={prefix("viewer")}
                useForceWheel={true}
                usePinch={true}
                pinchThreshold={50}
                maxPinchWheel={3}
                zoom={zoom}
            >
                <Viewport
                    style={{
                        width: `${500}px`,
                        height: `${600}px`,
                    }}>
                    <MoveableManager
                        ref={moveableManager}
                        getSelecto={() => selecto.current!}
                        selectedTargets={selectedTargets}
                        selectedMenu={selectedMenu}
                        zoom={zoom}
                        setSelectedTargets={setSelectedTargets}
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

                    if (
                        (inputEvent.type === "touchstart" && e.isTrusted)
                        || moveableManager.current!.moveableRef.current.isMoveableElement(target)
                        // || state.selectedTargets.some(t => t === target || t.contains(target))
                    ) {
                        e.stop();
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
        </div>
    );
}

export default Editor
