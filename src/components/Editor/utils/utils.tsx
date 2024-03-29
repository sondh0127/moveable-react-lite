import { prefixNames } from "framework-utils";
import { PREFIX, DATA_SCENA_ELEMENT_ID } from "../consts";
import {ScenaComponent, ScenaJSXElement, ElementInfo } from "../types";
import { IObject, isFunction, isObject } from "@daybrush/utils";


export function prefix(...classNames: string[]) {
    return prefixNames(PREFIX, ...classNames);
}
export function getContentElement(el: HTMLElement): HTMLElement | null {
    if (el.contentEditable === "inherit") {
        return getContentElement(el.parentElement!);
    }
    if (el.contentEditable === "true") {
        return el;
    }
    return null;
}

export function getId(el: HTMLElement | SVGElement) {
    return el.getAttribute(DATA_SCENA_ELEMENT_ID)!;
}

export function checkInput(target: HTMLElement | SVGElement) {
    const tagName = target.tagName.toLowerCase();

    return (target as HTMLElement).isContentEditable || tagName === "input" || tagName === "textarea";
}
export function checkImageLoaded(el: HTMLElement | SVGElement): Promise<any> {
    if (el.tagName.toLowerCase() !== "img") {
        return Promise.all([].slice.call(el.querySelectorAll("img")).map(el => checkImageLoaded(el)));
    }
    return new Promise(resolve => {
        if ((el as HTMLImageElement).complete) {
            resolve();
        } else {
            el.addEventListener("load", function loaded() {
                resolve();

                el.removeEventListener("load", loaded);
            })
        }
    });
}

export function getScenaAttrs(el: HTMLElement | SVGElement) {
    const attributes = el.attributes;
    const length = attributes.length;
    const attrs: IObject<any> = {};

    for (let i = 0; i < length; ++i) {
        const { name, value } = attributes[i];

        if (name === DATA_SCENA_ELEMENT_ID || name === "style") {
            continue;
        }
        attrs[name] = value;
    }

    return attrs;
}

export function isScenaFunction(value: any): value is ScenaComponent {
    return isFunction(value) && "scenaComponentId" in value;
}

export function isScenaElement(value: any): value is ScenaJSXElement {
    return isObject(value) && !isScenaFunction(value);
}

export function updateElements(infos: ElementInfo[]) {
    return infos.map(function registerElement(info) {
        const id = info.id!;

        const target = document.querySelector<HTMLElement>(`[${DATA_SCENA_ELEMENT_ID}="${id}"]`)!;
        const attrs = info.attrs || {};

        info.el = target;

        for (const name in attrs) {
            target.setAttribute(name, attrs[name]);
        }
        info.attrs = getScenaAttrs(target);
        const children = info.children || [];

        if (children.length) {
            children.forEach(registerElement);
        } else if (info.attrs!.contenteditable) {
            if ("innerText" in info) {
                (target as HTMLElement).innerText = info.innerText || "";
            } else {
                info.innerText = (target as HTMLElement).innerText || "";
            }
        } else if (!info.componentId) {
            if ("innerHTML" in info) {
                target.innerHTML = info.innerHTML || "";
            } else {
                info.innerHTML = target.innerHTML || "";
            }
        }
        return { ...info };
    });
}
