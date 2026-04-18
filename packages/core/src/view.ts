/**
 * `@easyink/core/view`：preact 薄封装，供 material extension 组装 VNode。
 *
 * Extension 代码请从此处引入 h / Fragment / render / onMount 等，
 * 未来更换 reconciler 时无需修改物料代码。
 *
 * 禁止：在 view 回调中持有可变闭包；DOM 副作用必须走 ref/onMount/onCleanup。
 */
export { Fragment, h, render } from 'preact'
export type { ComponentChildren, JSX, VNode } from 'preact'
export { useEffect as onMount, useLayoutEffect, useRef, useState } from 'preact/hooks'
