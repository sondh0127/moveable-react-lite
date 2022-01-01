import * as React from "react";
import { IObject, isString, isArray } from "@daybrush/utils";
import { prefix, getId, isScenaFunction, isScenaElement, makeScenaFunctionComponent } from "../utils/utils";
import { DATA_SCENA_ELEMENT_ID } from "../consts";
import { ScenaJSXElement, ElementInfo, AddedInfo, ScenaProps, } from "../types";

const Badge = makeScenaFunctionComponent("Badge", function Badge(props: ScenaProps) {
    return <p className="badges" data-scena-element-id={props.scenaElementId}>
        <a href="https://www.npmjs.com/package/moveable" target="_blank">
            <img src="https://img.shields.io/npm/v/moveable.svg?style=flat-square&amp;color=007acc&amp;label=version" alt="npm version" /></a>
        <a href="https://github.com/daybrush/moveable" target="_blank">
            <img src="https://img.shields.io/github/stars/daybrush/moveable.svg?color=42b883&amp;style=flat-square" /></a>
        <a href="https://github.com/daybrush/moveable" target="_blank">
            <img src="https://img.shields.io/badge/language-typescript-blue.svg?style=flat-square" />
        </a>
        <br />
        <a href="https://github.com/daybrush/moveable/tree/master/packages/react-moveable" target="_blank"><img alt="React" src="https://img.shields.io/static/v1.svg?label=&amp;message=React&amp;style=flat-square&amp;color=61daeb" /></a>
        <a href="https://github.com/daybrush/moveable/tree/master/packages/preact-moveable" target="_blank"><img alt="Preact" src="https://img.shields.io/static/v1.svg?label=&amp;message=Preact&amp;style=flat-square&amp;color=673ab8" /></a>
        <a href="https://github.com/daybrush/moveable/tree/master/packages/ngx-moveable" target="_blank"><img alt="Angular" src="https://img.shields.io/static/v1.svg?label=&amp;message=Angular&amp;style=flat-square&amp;color=C82B38" /></a>
        <a href="https://github.com/probil/vue-moveable" target="_blank"><img alt="Vue" src="https://img.shields.io/static/v1.svg?label=&amp;message=Vue&amp;style=flat-square&amp;color=3fb984" /></a>
        <a href="https://github.com/daybrush/moveable/tree/master/packages/svelte-moveable" target="_blank"><img alt="Svelte" src="https://img.shields.io/static/v1.svg?label=&amp;message=Svelte&amp;style=flat-square&amp;color=C82B38" /></a>
    </p>;
});


const Viewport: React.FC<{
    style: IObject<any>,
}> = (props, ref) => {
    const [state, setState] = React.useState<{
        jsxs: IObject<ScenaJSXElement>,
        ids: IObject<ElementInfo>
    }>({
        jsxs: {},
        ids: {
            viewport: {
                jsx: <div></div>,
                name: "Viewport",
                id: "viewport",
                children: [],
            },
        }
    });

    const viewportRef = React.useRef<HTMLDivElement>();

    React.useEffect(() => {
        setState({
            ...state,
            ids: {
                ...state.ids,
                viewport: {
                    ...state.ids.viewport,
                    el: viewportRef.current,
                }
            }
        })

    }, [])

    function renderChildren(children: ElementInfo[]): ScenaJSXElement[] {
        return children.map(info => {
            const jsx = info.jsx;
            const nextChildren = info.children!;
            const renderedChildren = renderChildren(nextChildren);
            const id = info.id!;
            const props: IObject<any> = {
                key: id,
            };
            if (isString(jsx)) {
                props[DATA_SCENA_ELEMENT_ID] = id;
                return React.createElement(jsx, props, ...renderedChildren) as ScenaJSXElement;
            } else if (isScenaFunction(jsx)) {
                props.scenaElementId = id;
                props.scenaAttrs = info.attrs || {};
                props.scenaText = info.innerText;
                props.scenaHTML = info.innerHTML;

                return React.createElement(jsx, props) as ScenaJSXElement;
            } else if (isString(jsx.type)) {
                props[DATA_SCENA_ELEMENT_ID] = id;
            } else {
                props.scenaElementId = id;
                props.scenaAttrs = info.attrs || {};
                props.scenaText = info.innerText;
                props.scenaHTML = info.innerHTML;
            }
            const jsxChildren = jsx.props.children;
            return React.cloneElement(jsx, { ...jsx.props, ...props },
                ...(isArray(jsxChildren) ? jsxChildren : [jsxChildren]),
                ...renderChildren(nextChildren),
            ) as ScenaJSXElement;
        });
    }


    function setInfo(id: string, info: ElementInfo) {
        const ids = state.ids;

        ids[id] = info;

        setState({
            ...state,
            ids,
        });
    }
    function getInfo(id: string) {
        return state.ids[id];
    }

    function getInfoByElement(el: HTMLElement | SVGElement) {
        return state.ids[getId(el)];
    }


    function registerChildren(jsxs: ElementInfo[], parentScopeId?: string) {

        function makeId(ids: IObject<any> = state.ids) {
            while (true) {
                const id = `scena${Math.floor(Math.random() * 100000000)}`;
                if (ids[id]) {
                    continue;
                }
                return id;
            }
        }

        return jsxs.map(info => {
            const id = info.id || makeId();
            const jsx = info.jsx;
            const children = info.children || [];
            const scopeId = parentScopeId || info.scopeId || "viewport";
            let componentId = "";
            let jsxId = "";


            if (isScenaElement(jsx)) {
                jsxId = makeId(state.jsxs);

                setState({
                    ...state,
                    jsxs: {
                        ...state.jsxs,
                        [jsxId]: jsx,
                    }
                })
            }
            const elementInfo: ElementInfo = {
                ...info,
                jsx,
                children: registerChildren(children, id),
                scopeId,
                componentId,
                jsxId,
                frame: info.frame || {},
                el: null,
                id,
            };
            setInfo(id, elementInfo);
            return elementInfo;
        });
    }

    function getIndexes(target: HTMLElement | SVGElement | string): number[] {
        const info = (isString(target) ? getInfo(target) : getInfoByElement(target))!;

        if (!info.scopeId) {
            return [];
        }
        const parentInfo = getInfo(info.scopeId)!;

        return [...getIndexes(info.scopeId), parentInfo.children!.indexOf(info)];
    }


    function appendJSXs(): Promise<AddedInfo> {
        const jsxs = [
            {
                jsx: <div className="moveable" contentEditable="true" suppressContentEditableWarning={true}>Moveable</div>,
                name: "(Logo)",
                frame: {
                    position: "absolute",
                    left: "50%",
                    top: "30%",
                    width: "250px",
                    height: "200px",
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
                jsx: <Badge />,
                name: "(Badges)",
                frame: {
                    position: "absolute",
                    left: "0%",
                    top: "50%",
                    width: "100%",
                    "text-align": "center",
                },
            },
            {
                jsx: <div className="moveable" contentEditable="true" suppressContentEditableWarning={true}>Moveable is Draggable! Resizable! Scalable! Rotatable! Warpable! Pinchable</div>,
                name: "(Description)",
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
        const jsxInfos = registerChildren(jsxs, "");

        jsxInfos.forEach((info, i) => {
            const scopeInfo = getInfo("" || info.scopeId!);
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

    React.useImperativeHandle(ref, () => ({
        appendJSXs,
        getIndexes,
        viewportRef
    }));

    const style = props.style;
    return <div className={prefix("viewport-container")} style={style}>
        {props.children}
        <div className={prefix("viewport")} {...{ [DATA_SCENA_ELEMENT_ID]: "viewport" }} ref={viewportRef}>
            {renderChildren(state.ids.viewport.children!)}
        </div>
    </div>
}

export default React.forwardRef(Viewport);
