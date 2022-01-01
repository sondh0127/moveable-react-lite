import * as React from "react";
import InfiniteViewer from "react-infinite-viewer";
import Selecto, { Rect } from "react-selecto";
import styled, { StyledElement } from "react-css-styled";
import Viewport from "./Viewport/Viewport";
import { getContentElement, prefix, checkImageLoaded, checkInput, getParnetScenaElement, getScenaAttrs, setMoveMatrix, getOffsetOriginMatrix } from "./utils/utils";
import { IObject } from "@daybrush/utils";
import Memory from "./utils/Memory";
import MoveableManager from "./Viewport/MoveableMananger";
import MoveableData from "./utils/MoveableData";
import { ScenaEditorState, SavedScenaData, ScenaJSXElement, ElementInfo, MovedResult, MovedInfo, FrameInfo } from "./types";
import { DATA_SCENA_ELEMENT_ID, EditorContext, EDITOR_CSS } from "./consts";
import { NameType } from "scenejs";
import { invert, matrix3d,  } from "@scena/matrix";
import { getElementInfo } from "react-moveable";


const EditorElement = styled("div", EDITOR_CSS);

export default class Editor extends React.PureComponent<{
    width: number,
    height: number,
    debug?: boolean,
}, Partial<ScenaEditorState>> {
    public static defaultProps = {
        width: 400,
        height: 600,
    };
    public state: ScenaEditorState = {
        selectedTargets: [],
        horizontalGuides: [],
        verticalGuides: [],
        zoom: 1,
        selectedMenu: "MoveTool",
    };

    public memory = new Memory();
    public moveableData = new MoveableData(this.memory);
    public infiniteViewer = React.createRef<InfiniteViewer>();
    public selecto = React.createRef<Selecto>();
    public moveableManager = React.createRef<MoveableManager>();
    public viewport = React.createRef<Viewport>();
    public editorElement = React.createRef<StyledElement<HTMLDivElement>>();

    public render() {
        return <EditorContext.Provider value={this}>
            {this.renderChildren()}
        </EditorContext.Provider>;
    }
    public renderChildren() {
        const {
            infiniteViewer,
            moveableManager,
            viewport,
            selecto,
            state,
        } = this;
        const {
            selectedMenu,
            selectedTargets,
            zoom,
        } = state;
        const {
            width,
            height,
        } = this.props;

        let unit = 50;

        if (zoom < 0.8) {
            unit = Math.floor(1 / zoom) * 50;
        }
        return (
            <EditorElement className={prefix("editor")} ref={this.editorElement}>
                <InfiniteViewer ref={infiniteViewer}
                    className={prefix("viewer")}
                    usePinch={true}
                    useForceWheel={true}
                    pinchThreshold={50}
                    maxPinchWheel={3}
                    zoom={zoom}
                    onDragStart={e => {
                        const target = e.inputEvent.target;
                        this.checkBlur();

                        if (
                            target.nodeName === "A"
                            || moveableManager.current!.getMoveable().isMoveableElement(target)
                            || moveableManager.current!.getMoveable().isDragging()
                            || selectedTargets.some(t => t === target || t.contains(target))
                        ) {
                            e.stop();
                        }
                    }}
                    onDragEnd={e => {
                        if (!e.isDrag) {
                            selecto.current!.clickTarget(e.inputEvent);
                        }
                    }}
                    onAbortPinch={e => {
                        selecto.current!.triggerDragStart(e.inputEvent);
                    }}
                    onScroll={e => {}}
                    onPinch={e => {
                        if (moveableManager.current!.getMoveable().isDragging()) {
                            return;
                        }
                        this.setState({
                            zoom: e.zoom,
                        });
                    }}
                >
                    <Viewport ref={viewport}
                        onBlur={this.onBlur}
                        style={{
                            width: `${width}px`,
                            height: `${height}px`,
                        }}>
                        <MoveableManager
                            ref={moveableManager}
                            editor={this}
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

                        this.checkBlur();
                        if (selectedMenu === "Text" && target.isContentEditable) {
                            const contentElement = getContentElement(target);

                            if (contentElement && contentElement.hasAttribute(DATA_SCENA_ELEMENT_ID)) {
                                e.stop();
                                this.setSelectedTargets([contentElement]);
                            }
                        }
                        if (
                            (inputEvent.type === "touchstart" && e.isTrusted)
                            || moveableManager.current!.getMoveable().isMoveableElement(target)
                            || state.selectedTargets.some(t => t === target || t.contains(target))
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
                        if (this.selectEndMaker(rect)) {
                            return;
                        }
                        this.setSelectedTargets(selected).then(() => {
                            if (!isDragStart) {
                                return;
                            }
                            moveableManager.current!.getMoveable().dragStart(inputEvent);
                        });
                    }}
                ></Selecto>
            </EditorElement>
        );
    }
    public async componentDidMount() {
        const {
            infiniteViewer,
            memory,
        } = this;
        memory.set("background-color", "#4af");
        memory.set("color", "#333");

        requestAnimationFrame(() => {

            infiniteViewer.current!.scrollCenter();
        });
        window.addEventListener("resize", this.onResize);
    }
    public componentWillUnmount() {
        this.memory.clear();
        this.moveableData.clear();
        window.removeEventListener("resize", this.onResize);
    }
    public promiseState(state: Partial<ScenaEditorState>) {
        return new Promise<void>(resolve => {
            this.setState(state, () => {
                resolve();
            });
        });
    }
    public getSelecto = () => {
        return this.selecto.current!;
    }
    public getViewport = () => {
        return this.viewport.current!;
    }
    public getEditorElement = () => {
        return this.editorElement.current!.getElement();
    }
    public getMoveable = () => {
        return this.moveableManager.current!.getMoveable();
    }
    public getSelectedTargets = () => {
        return this.state.selectedTargets;
    }
    public getSelectedFrames = () => {
        return this.moveableData.getSelectedFrames();
    }
    public setSelectedTargets(targets: Array<HTMLElement | SVGElement>, isRestore?: boolean) {
        console.log('[LOG] ~ file: Editor.tsx ~ line 416 ~ targets', targets)
        targets = targets.filter(target => {
            return targets.every(parnetTarget => {
                return parnetTarget === target || !parnetTarget.contains(target);
            });
        });

        return this.promiseState({
            selectedTargets: targets,
        }).then(() => {
            this.selecto.current!.setSelectedTargets(targets);
            this.moveableData.setSelectedTargets(targets);
            return targets;
        });
    }
    public appendJSX(info: ElementInfo) {
        return this.appendJSXs([info]).then(targets => targets[0]);
    }

    public appendJSXs(jsxs: ElementInfo[], isRestore?: boolean): Promise<Array<HTMLElement | SVGElement>> {
        const viewport = this.getViewport();
        const indexesList = viewport.getSortedIndexesList(this.getSelectedTargets());
        const indexesListLength = indexesList.length;
        let appendIndex = -1;
        let scopeId: string = "";

        if (!isRestore && indexesListLength) {
            const indexes = indexesList[indexesListLength - 1];


            const info = viewport.getInfoByIndexes(indexes);

            scopeId = info.scopeId!;
            appendIndex = indexes[indexes.length - 1] + 1;
        }

        return this.getViewport().appendJSXs(jsxs, appendIndex, scopeId).then(({ added }) => {
            return this.appendComplete(added, isRestore);
        });
    }

    public removeByIds(ids: string[], isRestore?: boolean) {
        return this.removeElements(this.getViewport().getElements(ids), isRestore);
    }
    public removeFrames(targets: Array<HTMLElement | SVGElement>) {
        const frameMap: IObject<{
            frame: IObject<any>;
            frameOrder: IObject<any>;
        }> = {};
        const moveableData = this.moveableData;
        const viewport = this.getViewport();

        targets.forEach(function removeFrame(target) {
            const info = viewport.getInfoByElement(target)!;
            const frame = moveableData.getFrame(target);
            frameMap[info.id!] = {
                frame: frame.get(),
                frameOrder: frame.getOrderObject(),
            };
            moveableData.removeFrame(target);

            info.children!.forEach(childInfo => {
                removeFrame(childInfo.el!);
            });
        });

        return frameMap;
    }
    public restoreFrames(infos: MovedInfo[], frameMap: IObject<FrameInfo>) {
        const viewport = this.getViewport();
        const moveableData = this.moveableData;

        infos.map(({ info }) => info).forEach(function registerFrame(info: ElementInfo) {
            info.frame = frameMap[info.id!].frame;
            info.frameOrder = frameMap[info.id!].order;
            delete frameMap[info.id!];

            info.children!.forEach(registerFrame);
        });

        for (const id in frameMap) {
            moveableData.createFrame(viewport.getInfo(id).el!, frameMap[id]);
        }
    }
    public removeElements(targets: Array<HTMLElement | SVGElement>, isRestore?: boolean) {
        const viewport = this.getViewport();
        const indexesList = viewport.getSortedIndexesList(targets);
        const indexesListLength = indexesList.length;
        let scopeId = "";
        let selectedInfo: ElementInfo | null = null;

        if (indexesListLength) {
            const lastInfo = viewport.getInfoByIndexes(indexesList[indexesListLength - 1]);
            const nextInfo = viewport.getNextInfo(lastInfo.id!);

            scopeId = lastInfo.scopeId!;
            selectedInfo = nextInfo;
        }
        return viewport.removeTargets(targets).then(({ removed }) => {
            let selectedTarget = selectedInfo || viewport.getLastChildInfo(scopeId)! || viewport.getInfo(scopeId);

            this.setSelectedTargets(selectedTarget && selectedTarget.el ? [selectedTarget.el!] : [], true);
            return targets;
        });
    }
    public setProperty(scope: string[], value: any, isUpdate?: boolean) {
        if (isUpdate) {
            this.moveableManager.current!.updateRect();
        }
    }
    public setOrders(scope: string[], orders: NameType[], isUpdate?: boolean) {
        if (isUpdate) {
            this.moveableManager.current!.updateRect();
        }
    }
    public selectMenu = (menu: string) => {
    }
    public loadDatas(datas: SavedScenaData[]) {
        const viewport = this.getViewport();
        return this.appendJSXs(datas.map(function loadData(data): any {
            const { componentId, jsxId, children } = data;

            let jsx!: ScenaJSXElement;

            if (jsxId) {
                jsx = viewport.getJSX(jsxId);
            }
            if (!jsx && componentId) {
                const Component = viewport.getComponent(componentId);

                jsx = <Component />;
            }
            if (!jsx) {
                jsx = React.createElement(data.tagName);
            }
            return {
                ...data,
                children: children.map(loadData),
                jsx,
            };
        }).filter(info => info) as ElementInfo[]);
    }
    public saveTargets(targets: Array<HTMLElement | SVGElement>): SavedScenaData[] {
        const viewport = this.getViewport();
        const moveableData = this.moveableData;
        return targets.map(target => viewport.getInfoByElement(target)).map(function saveTarget(info): SavedScenaData {
            const target = info.el!;
            const isContentEditable = info.attrs!.contenteditable;
            return {
                name: info.name,
                attrs: getScenaAttrs(target),
                jsxId: info.jsxId || "",
                componentId: info.componentId!,
                innerHTML: isContentEditable ? "" : target.innerHTML,
                innerText: isContentEditable ? (target as HTMLElement).innerText : "",
                tagName: target.tagName.toLowerCase(),
                frame: moveableData.getFrame(target).get(),
                children: info.children!.map(saveTarget),
            };
        });
    }
    public getViewportInfos() {
        return this.getViewport().getViewportInfos();
    }
    public appendBlob(blob: Blob) {
        const url = URL.createObjectURL(blob);

        return this.appendJSX({
            jsx: <img src={url} alt="appended blob" />,
            name: "(Image)",
        });
    }
    public moves(movedInfos: MovedInfo[], isRestore?: boolean) {
        const frameMap = this.removeFrames(movedInfos.map(({ info }) => info.el!));

        return this.getViewport().moves(movedInfos).then(result => this.moveComplete(result, frameMap, isRestore));
    }

    private selectEndMaker(rect: Rect) {
        return false;
    }

    private checkBlur() {
        const activeElement = document.activeElement;
        if (activeElement) {
            (activeElement as HTMLElement).blur();
        }
        const selection = document.getSelection()!;

        if (selection) {
            selection.removeAllRanges();
        }
    }
    private onResize = () => {    }
    private onBlur = (e: any) => {
        const target = e.target as HTMLElement | SVGElement;

        if (!checkInput(target)) {
            return;
        }
        const parentTarget = getParnetScenaElement(target);

        if (!parentTarget) {
            return;
        }
        const info = this.getViewport().getInfoByElement(parentTarget)!;


        if (!info.attrs!.contenteditable) {
            return
        }
        const nextText = (parentTarget as HTMLElement).innerText;

        if (info.innerText === nextText) {
            return;
        }
        info.innerText = nextText;
    }
    private moveInside() {
        let targets = this.getSelectedTargets();

        const length = targets.length;
        if (length !== 1) {
            return;
        }
        targets = [targets[0]];


        const viewport = this.getViewport();
        const frameMap = this.removeFrames(targets);

        return viewport.moveInside(targets[0]).then(result => this.moveComplete(result, frameMap));
    }
    private appendComplete(infos: ElementInfo[], isRestore?: boolean) {
        const data = this.moveableData;
        const container = this.getViewport().viewportRef.current!;
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
        return Promise.all(targets.map(target => checkImageLoaded(target))).then(() => {
            this.setSelectedTargets(targets, true);

            return targets;
        });
    }
    private moveComplete(result: MovedResult, frameMap: IObject<any>, isRestore?: boolean) {
        const { prevInfos, nextInfos } = result;

        this.restoreFrames(nextInfos, frameMap);

        if (nextInfos.length) {
            // move complete
            this.appendComplete(nextInfos.map(({ info, moveMatrix }) => {
                return {
                    ...info,
                    moveMatrix,
                };
            }), true);
        }

        return result;
    }
}
