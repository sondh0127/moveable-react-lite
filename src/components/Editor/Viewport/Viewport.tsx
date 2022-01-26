import * as React from "react";
import { IObject, isString, isArray } from "@daybrush/utils";
import { getId, getScenaAttrs, prefix } from "../utils/utils";
import { DATA_SCENA_ELEMENT_ID } from "../consts";
import { ScenaJSXElement, ElementInfo } from "../types";
import { useAtom } from "jotai";
import { idsAtom } from "../store";

const Viewport: React.FC<{
    style: IObject<any>,
}> = (props, ref) => {
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

    function getInfo(id: string) {
        return ids[id];
    }

    function unregisterChildren(children: ElementInfo[], isChild: boolean): ElementInfo[] {

        return children.slice(0).map(info => {
            const target = info.el!;
            let innerText = "";
            let innerHTML = "";

            if (info.attrs!.contenteditable) {
                innerText = (target as HTMLElement).innerText;
            } else {
                innerHTML = target.innerHTML;
            }

            if (!isChild) {
                const parentInfo = getInfo(info.scopeId!);
                const parentChildren = parentInfo.children!;
                const index = parentChildren.indexOf(info);
                parentInfo.children!.splice(index, 1);
            }
            const nextChildren = unregisterChildren(info.children!, true);

            const newIds = {...ids};
            delete newIds[info.id!];
            setIds(newIds)
            delete info.el;

            return {
                ...info,
                innerText,
                innerHTML,
                attrs: getScenaAttrs(target),
                children: nextChildren,
            };
        });
    }

    function removeTargets(targets: Array<HTMLElement | SVGElement>) {
        const removedChildren = targets.map(target => {
            return ids[getId(target)];
        }).filter(info => info) as ElementInfo[];

        const removed = unregisterChildren(removedChildren, false);
        return new Promise(resolve => {
            resolve({
                removed,
            });
        });
    }

    React.useImperativeHandle(ref, () => ({
        removeTargets
      }));

    return <div className={prefix("viewport-container")} style={props.style}>
        {props.children}
        <div className={prefix("viewport")} {...{ [DATA_SCENA_ELEMENT_ID]: "viewport" }} ref={viewportRef}>
            {renderChildren(ids.viewport.children!)}
        </div>
    </div>
}

export default React.forwardRef(Viewport)
