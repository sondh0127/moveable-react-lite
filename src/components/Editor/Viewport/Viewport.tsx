import * as React from "react";
import { IObject, isString, isArray } from "@daybrush/utils";
import { prefix, isScenaFunction } from "../utils/utils";
import { DATA_SCENA_ELEMENT_ID } from "../consts";
import { ScenaJSXElement, ElementInfo } from "../types";
import { useAtom } from "jotai";
import { idsAtom } from "../store";

const Viewport: React.FC<{
    style: IObject<any>,
}> = (props) => {
    const [ids, setIds] = useAtom(idsAtom)

    const viewportRef = React.useRef<HTMLDivElement>();

    React.useEffect(() => {
        setIds({
            ...ids,
            viewport: {
                ...ids.viewport,
                el: viewportRef.current,
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

    return <div className={prefix("viewport-container")} style={props.style}>
        {props.children}
        <div className={prefix("viewport")} {...{ [DATA_SCENA_ELEMENT_ID]: "viewport" }} ref={viewportRef}>
            {renderChildren(ids.viewport.children!)}
        </div>
    </div>
}

export default Viewport
