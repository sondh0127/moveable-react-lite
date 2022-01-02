import { atom } from 'jotai'
import { ElementInfo } from '.'

interface Ids {
  viewport: ElementInfo
  [key: string]: ElementInfo
}

export const idsAtom = atom<Ids>({
  viewport: {
    jsx: <div></div>,
    name: "Viewport",
    id: "viewport",
    children: [],
  },
})
