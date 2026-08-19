var HtmlEscapedCallbackPhase = {
  Stringify: 1
}, raw = (r, e) => {
  const t = new String(r);
  return t.isEscaped = !0, t.callbacks = e, t;
}, escapeRe = /[&<>'"]/, stringBufferToString = async (r, e) => {
  let t = "";
  e ||= [];
  const n = await Promise.all(r);
  for (let a = n.length - 1; t += n[a], a--, !(a < 0); a--) {
    let i = n[a];
    typeof i == "object" && e.push(...i.callbacks || []);
    const s = i.isEscaped;
    if (i = await (typeof i == "object" ? i.toString() : i), typeof i == "object" && e.push(...i.callbacks || []), i.isEscaped ?? s)
      t += i;
    else {
      const o = [t];
      escapeToBuffer(i, o), t = o[0];
    }
  }
  return raw(t, e);
}, escapeToBuffer = (r, e) => {
  const t = r.search(escapeRe);
  if (t === -1) {
    e[0] += r;
    return;
  }
  let n, a, i = 0;
  for (a = t; a < r.length; a++) {
    switch (r.charCodeAt(a)) {
      case 34:
        n = "&quot;";
        break;
      case 39:
        n = "&#39;";
        break;
      case 38:
        n = "&amp;";
        break;
      case 60:
        n = "&lt;";
        break;
      case 62:
        n = "&gt;";
        break;
      default:
        continue;
    }
    e[0] += r.substring(i, a) + n, i = a + 1;
  }
  e[0] += r.substring(i, a);
}, resolveCallbackSync = (r) => {
  const e = r.callbacks;
  if (!e?.length)
    return r;
  const t = [r], n = {};
  return e.forEach((a) => a({ phase: HtmlEscapedCallbackPhase.Stringify, buffer: t, context: n })), t[0];
}, resolveCallback = async (r, e, t, n, a) => {
  typeof r == "object" && !(r instanceof String) && (r instanceof Promise || (r = r.toString()), r instanceof Promise && (r = await r));
  const i = r.callbacks;
  return i?.length ? (a ? a[0] += r : a = [r], Promise.all(i.map((o) => o({ phase: e, buffer: a, context: n }))).then(
    (o) => Promise.all(
      o.filter(Boolean).map((c) => resolveCallback(c, e, !1, n, a))
    ).then(() => a[0])
  )) : Promise.resolve(r);
}, DOM_RENDERER = /* @__PURE__ */ Symbol("RENDERER"), DOM_ERROR_HANDLER = /* @__PURE__ */ Symbol("ERROR_HANDLER"), DOM_INTERNAL_TAG = /* @__PURE__ */ Symbol("INTERNAL"), PERMALINK = /* @__PURE__ */ Symbol("PERMALINK"), setInternalTagFlag = (r) => (r[DOM_INTERNAL_TAG] = !0, r), createContextProviderFunction = (r) => ({ value: e, children: t }) => {
  if (!t)
    return;
  const n = {
    children: [
      {
        tag: setInternalTagFlag(() => {
          r.push(e);
        }),
        props: {}
      }
    ]
  };
  Array.isArray(t) ? n.children.push(...t.flat()) : n.children.push(t), n.children.push({
    tag: setInternalTagFlag(() => {
      r.pop();
    }),
    props: {}
  });
  const a = { tag: "", props: n, type: "" };
  return a[DOM_ERROR_HANDLER] = (i) => {
    throw r.pop(), i;
  }, a;
}, globalContexts = [], alsProbed = !1, asyncLocalStorage, fallbackStore, fallbackRendersInFlight = 0, warnedFallbackDefault = !1, loadAsyncLocalStorage = () => {
  if (alsProbed)
    return asyncLocalStorage;
  alsProbed = !0;
  const r = globalThis;
  let e;
  for (const t of [
    // Node.js >= 20.16, Deno, Bun, Cloudflare Workers (nodejs_compat). Property
    // access only, so bundlers don't statically resolve `node:async_hooks`.
    () => r.process?.getBuiltinModule?.("node:async_hooks")?.AsyncLocalStorage,
    // Node.js < 20.16 has no `process.getBuiltinModule`, but a CJS entrypoint
    // exposes the main module's `require` here.
    () => r.process?.mainModule?.require?.("node:async_hooks")?.AsyncLocalStorage
  ]) {
    try {
      e = t();
    } catch {
    }
    if (e)
      break;
  }
  return e && (asyncLocalStorage = new e()), asyncLocalStorage;
}, getCurrentStore = () => loadAsyncLocalStorage()?.getStore() || fallbackStore, warnIfStorelessAccess = () => {
  fallbackRendersInFlight > 0 && !warnedFallbackDefault && (warnedFallbackDefault = !0, console.warn(
    "hono/jsx: AsyncLocalStorage is unavailable in this runtime, so useContext() after an await in an async component falls back to the context default value during server-side rendering. To get provided values across await boundaries, use a runtime with AsyncLocalStorage (Node.js >= 20.16, Deno, Bun, or Cloudflare Workers with the nodejs_compat flag)."
  ));
}, getContextValuesIn = (r, e) => {
  if (!r)
    return warnIfStorelessAccess(), e.values;
  let t = r.get(e);
  return t || (t = [e.values[0]], r.set(e, t)), t;
}, readContextValueIn = (r, e) => {
  if (!r)
    return warnIfStorelessAccess(), e.values.at(-1);
  const t = r.get(e);
  return t?.length ? t.at(-1) : e.values[0];
}, captureContextValues = (r) => (r ? globalContexts.filter((e) => r.has(e)) : globalContexts).map((e) => [
  e,
  readContextValueIn(r, e)
]), resumeWithContextValues = (r, e, t) => runWithRenderContext(() => {
  const n = getCurrentStore(), a = t.map(([s, o]) => {
    const c = getContextValuesIn(n, s);
    return c.push(o), c;
  }), i = () => {
    a.forEach((s) => {
      s.pop();
    });
  };
  try {
    const s = r();
    return s instanceof Promise ? s.finally(i) : (i(), s);
  } catch (s) {
    throw i(), s;
  }
}, e), runWithRenderContext = (r, e) => {
  if (getCurrentStore())
    return r();
  const t = e ?? /* @__PURE__ */ new WeakMap(), n = loadAsyncLocalStorage();
  if (n)
    return n.run(t, r);
  fallbackStore = t;
  let a;
  try {
    a = r();
  } finally {
    fallbackStore = void 0;
  }
  return !warnedFallbackDefault && a instanceof Promise && (fallbackRendersInFlight++, a = a.finally(() => {
    fallbackRendersInFlight--;
  })), a;
}, captureRenderContext = () => {
  const r = getCurrentStore(), e = captureContextValues(r);
  return (t) => resumeWithContextValues(t, r, e);
}, createContext = (r) => {
  const e = [r], t = ((n) => {
    const a = getContextValuesIn(getCurrentStore(), t);
    a.push(n.value);
    let i;
    try {
      i = n.children ? (Array.isArray(n.children) ? new JSXFragmentNode("", {}, n.children) : n.children).toString() : "";
    } catch (s) {
      throw a.pop(), s;
    }
    return i instanceof Promise ? i.finally(() => a.pop()).then((s) => raw(s, s.callbacks)) : (a.pop(), raw(i));
  });
  return t.values = e, t.Provider = t, t[DOM_RENDERER] = createContextProviderFunction(e), globalContexts.push(t), t;
}, useContext = (r) => readContextValueIn(getCurrentStore(), r), deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
}, domRenderers = {}, dataPrecedenceAttr = "data-precedence", isStylesheetLinkWithPrecedence = (r) => r.rel === "stylesheet" && "precedence" in r, shouldDeDupeByKey = (r, e) => r === "link" ? e : deDupeKeyMap[r].length > 0, toArray = (r) => Array.isArray(r) ? r : [r], metaTagMap = /* @__PURE__ */ new WeakMap(), insertIntoHead = (r, e, t, n) => ({ buffer: a, context: i }) => {
  if (!a)
    return;
  const s = metaTagMap.get(i) || {};
  metaTagMap.set(i, s);
  const o = s[r] ||= [];
  let c = !1;
  const d = deDupeKeyMap[r], u = shouldDeDupeByKey(r, n !== void 0);
  if (u) {
    e: for (const [, f] of o)
      if (!(r === "link" && !(f.rel === "stylesheet" && f[dataPrecedenceAttr] !== void 0))) {
        for (const h of d)
          if ((f?.[h] ?? null) === t?.[h]) {
            c = !0;
            break e;
          }
      }
  }
  if (c ? a[0] = a[0].replaceAll(e, "") : u || r === "link" ? o.push([e, t, n]) : o.unshift([e, t, n]), a[0].indexOf("</head>") !== -1) {
    let f;
    if (r === "link" || n !== void 0) {
      const h = [];
      f = o.map(([g, , x], _) => {
        if (x === void 0)
          return [g, Number.MAX_SAFE_INTEGER, _];
        let P = h.indexOf(x);
        return P === -1 && (h.push(x), P = h.length - 1), [g, P, _];
      }).sort((g, x) => g[1] - x[1] || g[2] - x[2]).map(([g]) => g);
    } else
      f = o.map(([h]) => h);
    f.forEach((h) => {
      a[0] = a[0].replaceAll(h, "");
    }), a[0] = a[0].replace(/(?=<\/head>)/, f.join(""));
  }
}, returnWithoutSpecialBehavior = (r, e, t) => raw(new JSXNode(r, t, toArray(e ?? [])).toString()), documentMetadataTag = (r, e, t, n) => {
  if ("itemProp" in t)
    return returnWithoutSpecialBehavior(r, e, t);
  let { precedence: a, blocking: i, ...s } = t;
  a = n ? a ?? "" : void 0, n && (s[dataPrecedenceAttr] = a);
  const o = new JSXNode(r, s, toArray(e || [])).toString();
  return o instanceof Promise ? o.then(
    (c) => raw(c, [
      ...c.callbacks || [],
      insertIntoHead(r, c, s, a)
    ])
  ) : raw(o, [insertIntoHead(r, o, s, a)]);
}, title = ({ children: r, ...e }) => {
  const t = getNameSpaceContext();
  if (t) {
    const n = useContext(t);
    if (n === "svg" || n === "head")
      return new JSXNode(
        "title",
        e,
        toArray(r ?? [])
      );
  }
  return documentMetadataTag("title", r, e, !1);
}, script = ({
  children: r,
  ...e
}) => {
  const t = getNameSpaceContext();
  return ["src", "async"].some((n) => !e[n]) || t && useContext(t) === "head" ? returnWithoutSpecialBehavior("script", r, e) : documentMetadataTag("script", r, e, !1);
}, style = ({
  children: r,
  ...e
}) => ["href", "precedence"].every((t) => t in e) ? (e["data-href"] = e.href, delete e.href, documentMetadataTag("style", r, e, !0)) : returnWithoutSpecialBehavior("style", r, e), link$1 = ({ children: r, ...e }) => ["onLoad", "onError"].some((t) => t in e) || e.rel === "stylesheet" && (!("precedence" in e) || "disabled" in e) ? returnWithoutSpecialBehavior("link", r, e) : documentMetadataTag("link", r, e, isStylesheetLinkWithPrecedence(e)), meta = ({ children: r, ...e }) => {
  const t = getNameSpaceContext();
  return t && useContext(t) === "head" ? returnWithoutSpecialBehavior("meta", r, e) : documentMetadataTag("meta", r, e, !1);
}, newJSXNode = (r, { children: e, ...t }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new JSXNode(r, t, toArray(e ?? []))
), form = (r) => (typeof r.action == "function" && (r.action = PERMALINK in r.action ? r.action[PERMALINK] : void 0), newJSXNode("form", r)), formActionableElement = (r, e) => (typeof e.formAction == "function" && (e.formAction = PERMALINK in e.formAction ? e.formAction[PERMALINK] : void 0), newJSXNode(r, e)), input = (r) => formActionableElement("input", r), button = (r) => formActionableElement("button", r);
const intrinsicElementTags = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  button,
  form,
  input,
  link: link$1,
  meta,
  script,
  style,
  title
}, Symbol.toStringTag, { value: "Module" }));
var normalizeElementKeyMap = /* @__PURE__ */ new Map([
  ["className", "class"],
  ["htmlFor", "for"],
  ["crossOrigin", "crossorigin"],
  ["httpEquiv", "http-equiv"],
  ["itemProp", "itemprop"],
  ["fetchPriority", "fetchpriority"],
  ["noModule", "nomodule"],
  ["formAction", "formaction"]
]), normalizeIntrinsicElementKey = (r) => normalizeElementKeyMap.get(r) || r, invalidAttributeNameCharRe = /[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validAttributeNameCache = /* @__PURE__ */ new Set(), validAttributeNameCacheMax = 1024, invalidTagNameCharRe = /^[!?]|[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validTagNameCache = /* @__PURE__ */ new Set(), validTagNameCacheMax = 256, cacheValidName = (r, e, t) => {
  r.size >= e && r.clear(), r.add(t);
}, isValidTagName = (r) => validTagNameCache.has(r) ? !0 : typeof r != "string" ? !1 : r.length === 0 ? !0 : invalidTagNameCharRe.test(r) ? !1 : (cacheValidName(validTagNameCache, validTagNameCacheMax, r), !0), isValidAttributeName = (r) => {
  if (validAttributeNameCache.has(r))
    return !0;
  const e = r.length;
  if (e === 0)
    return !1;
  for (let t = 0; t < e; t++) {
    const n = r.charCodeAt(t);
    if (!(n >= 97 && n <= 122 || // a-z
    n >= 65 && n <= 90 || // A-Z
    n >= 48 && n <= 57 || // 0-9
    n === 45 || // -
    n === 95 || // _
    n === 46 || // .
    n === 58))
      return invalidAttributeNameCharRe.test(r) ? !1 : (cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, r), !0);
  }
  return cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, r), !0;
}, invalidStylePropertyNameCharRe = /[\s"'():;\\/\[\]{}\x00-\x1f\x7f-\x9f]/, validStylePropertyNameCache = /* @__PURE__ */ new Set(), validStylePropertyNameCacheMax = 1024, isValidStylePropertyName = (r) => {
  if (validStylePropertyNameCache.has(r))
    return !0;
  const e = r.length;
  if (e === 0)
    return !1;
  for (let t = 0; t < e; t++) {
    const n = r.charCodeAt(t);
    if (!(n >= 97 && n <= 122 || // a-z
    n >= 65 && n <= 90 || // A-Z
    n >= 48 && n <= 57 || // 0-9
    n === 45 || // -
    n === 95))
      return invalidStylePropertyNameCharRe.test(r) ? !1 : (cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, r), !0);
  }
  return cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, r), !0;
}, unsafeStyleValueCharRe = /[;"'\\/\[\](){}]/, hasUnsafeStyleValue = (r) => {
  if (!unsafeStyleValueCharRe.test(r))
    return !1;
  let e = 0;
  const t = [];
  for (let n = 0, a = r.length; n < a; n++) {
    const i = r.charCodeAt(n);
    if (i === 92) {
      if (n === a - 1)
        return !0;
      n++;
    } else if (e !== 0) {
      if (i === 10 || i === 12 || i === 13)
        return !0;
      i === e && (e = 0);
    } else if (i === 47 && r.charCodeAt(n + 1) === 42) {
      const s = r.indexOf("*/", n + 2);
      if (s === -1)
        return !0;
      n = s + 1;
    } else if (i === 34 || i === 39)
      e = i;
    else if (i === 40)
      t.push(41);
    else if (i === 91)
      t.push(93);
    else {
      if (i === 123 || i === 125)
        return !0;
      if (i === 41 || i === 93) {
        if (t[t.length - 1] !== i)
          return !0;
        t.pop();
      } else if (i === 59 && t.length === 0)
        return !0;
    }
  }
  return e !== 0 || t.length !== 0;
}, styleObjectForEach = (r, e) => {
  for (const [t, n] of Object.entries(r)) {
    const a = t[0] === "-" || !/[A-Z]/.test(t) ? t : t.replace(/[A-Z]/g, (s) => `-${s.toLowerCase()}`);
    if (!isValidStylePropertyName(a))
      continue;
    if (n == null) {
      e(a, null);
      continue;
    }
    let i;
    if (typeof n == "number")
      i = a.match(
        /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
      ) ? `${n}` : `${n}px`;
    else if (typeof n == "string") {
      if (hasUnsafeStyleValue(n))
        continue;
      i = n;
    } else
      continue;
    e(a, i);
  }
}, nameSpaceContext = void 0, getNameSpaceContext = () => nameSpaceContext, toSVGAttributeName = (r) => /[A-Z]/.test(r) && // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
// Or other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
r.match(
  /^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/
) ? r.replace(/([A-Z])/g, "-$1").toLowerCase() : r, emptyTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
], booleanAttributes = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "download",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
], resolveFunctionComponentResult = (r, e) => r.then((t) => {
  if (!Array.isArray(t) && !(t instanceof JSXNode))
    return t;
  const n = Array.isArray(t) ? t : [t], a = () => {
    const i = [""];
    return childrenToStringToBuffer(n, i), i.length === 1 ? raw(i[0], i.callbacks) : stringBufferToString(i, i.callbacks);
  };
  return e ? e(a) : runWithRenderContext(a);
}), childrenToStringToBuffer = (r, e) => {
  for (let t = 0, n = r.length; t < n; t++) {
    const a = r[t];
    if (typeof a == "string")
      escapeToBuffer(a, e);
    else {
      if (typeof a == "boolean" || a === null || a === void 0)
        continue;
      if (a instanceof JSXNode)
        a.toStringToBuffer(e);
      else if (typeof a == "number")
        e[0] += a;
      else if (a.isEscaped) {
        e[0] += a;
        const i = a.callbacks;
        i && (e.callbacks ||= [], e.callbacks.push(...i));
      } else a instanceof Promise ? e.unshift("", a) : childrenToStringToBuffer(a, e);
    }
  }
}, JSXNode = class {
  tag;
  props;
  key;
  children;
  isEscaped = !0;
  constructor(r, e, t) {
    if (typeof r != "function" && !isValidTagName(r))
      throw new Error(`Invalid JSX tag name: ${r}`);
    this.tag = r, this.props = e, this.children = t;
  }
  get type() {
    return this.tag;
  }
  // Added for compatibility with libraries that rely on React's internal structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get ref() {
    return this.props.ref || null;
  }
  toString() {
    return runWithRenderContext(() => {
      const e = [""];
      return this.toStringToBuffer(e), e.length === 1 ? "callbacks" in e ? resolveCallbackSync(raw(e[0], e.callbacks)).toString() : e[0] : stringBufferToString(e, e.callbacks);
    });
  }
  toStringToBuffer(r) {
    const e = this.tag, t = this.props;
    let { children: n } = this;
    r[0] += `<${e}`;
    const a = e === "svg" || nameSpaceContext && useContext(nameSpaceContext) === "svg" ? (i) => toSVGAttributeName(normalizeIntrinsicElementKey(i)) : (i) => normalizeIntrinsicElementKey(i);
    for (let [i, s] of Object.entries(t))
      if (i = a(i), !!isValidAttributeName(i) && i !== "children") {
        if (i === "style" && typeof s == "object") {
          let o = "";
          styleObjectForEach(s, (c, d) => {
            d != null && (o += `${o ? ";" : ""}${c}:${d}`);
          }), r[0] += ' style="', escapeToBuffer(o, r), r[0] += '"';
        } else if (typeof s == "string")
          r[0] += ` ${i}="`, escapeToBuffer(s, r), r[0] += '"';
        else if (s != null) if (typeof s == "number" || s.isEscaped)
          r[0] += ` ${i}="${s}"`;
        else if (typeof s == "boolean" && booleanAttributes.includes(i))
          s && (r[0] += ` ${i}=""`);
        else if (i === "dangerouslySetInnerHTML") {
          if (n.length > 0)
            throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
          n = [raw(s.__html)];
        } else if (s instanceof Promise)
          r[0] += ` ${i}="`, r.unshift('"', s);
        else if (typeof s == "function") {
          if (!i.startsWith("on") && i !== "ref")
            throw new Error(`Invalid prop '${i}' of type 'function' supplied to '${e}'.`);
        } else
          r[0] += ` ${i}="`, escapeToBuffer(s.toString(), r), r[0] += '"';
      }
    if (emptyTags.includes(e) && n.length === 0) {
      r[0] += "/>";
      return;
    }
    r[0] += ">", childrenToStringToBuffer(n, r), r[0] += `</${e}>`;
  }
}, JSXFunctionNode = class extends JSXNode {
  toStringToBuffer(r) {
    const { children: e } = this, t = { ...this.props };
    e.length && (t.children = e.length === 1 ? e[0] : e);
    const n = this.tag.call(null, t);
    typeof n == "boolean" || n == null || (n instanceof Promise ? globalContexts.length === 0 ? r.unshift("", resolveFunctionComponentResult(n)) : r.unshift("", resolveFunctionComponentResult(n, captureRenderContext())) : n instanceof JSXNode ? n.toStringToBuffer(r) : Array.isArray(n) ? childrenToStringToBuffer(n, r) : typeof n == "number" || n.isEscaped ? (r[0] += n, n.callbacks && (r.callbacks ||= [], r.callbacks.push(...n.callbacks))) : escapeToBuffer(n, r));
  }
}, JSXFragmentNode = class extends JSXNode {
  toStringToBuffer(r) {
    childrenToStringToBuffer(this.children, r);
  }
}, initDomRenderer = !1, jsxFn = (r, e, t) => {
  if (!initDomRenderer) {
    for (const n in domRenderers)
      intrinsicElementTags[n][DOM_RENDERER] = domRenderers[n];
    initDomRenderer = !0;
  }
  return typeof r == "function" ? new JSXFunctionNode(r, e, t) : intrinsicElementTags[r] ? new JSXFunctionNode(
    intrinsicElementTags[r],
    e,
    t
  ) : r === "svg" || r === "head" ? (nameSpaceContext ||= createContext(""), new JSXNode(r, e, [
    new JSXFunctionNode(
      nameSpaceContext,
      {
        value: r
      },
      t
    )
  ])) : new JSXNode(r, e, t);
};
function jsxDEV(r, e, t) {
  let n;
  if (!e || !("children" in e))
    n = jsxFn(r, e, []);
  else {
    const a = e.children;
    n = Array.isArray(a) ? jsxFn(r, e, a) : jsxFn(r, e, [a]);
  }
  return n.key = t, n;
}
function __rest(r, e) {
  var t = {};
  for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && e.indexOf(n) < 0 && (t[n] = r[n]);
  if (r != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, n = Object.getOwnPropertySymbols(r); a < n.length; a++)
      e.indexOf(n[a]) < 0 && Object.prototype.propertyIsEnumerable.call(r, n[a]) && (t[n[a]] = r[n[a]]);
  return t;
}
typeof SuppressedError == "function" && SuppressedError;
function isZodType(r, e) {
  var t;
  return ((t = r?._def) === null || t === void 0 ? void 0 : t.typeName) === e;
}
function isAnyZodType(r) {
  return "_def" in r;
}
function preserveMetadataFromModifier(r, e) {
  const t = r.ZodType.prototype[e];
  r.ZodType.prototype[e] = function(...n) {
    const a = t.apply(this, n);
    return a._def.openapi = this._def.openapi, a;
  };
}
function extendZodWithOpenApi(r) {
  if (typeof r.ZodType.prototype.openapi < "u")
    return;
  r.ZodType.prototype.openapi = function(a, i) {
    var s, o, c, d, u, f;
    const h = typeof a == "string" ? i : a, g = h ?? {}, { param: x } = g, _ = __rest(g, ["param"]), P = Object.assign(Object.assign({}, (s = this._def.openapi) === null || s === void 0 ? void 0 : s._internal), typeof a == "string" ? { refId: a } : void 0), O = Object.assign(Object.assign(Object.assign({}, (o = this._def.openapi) === null || o === void 0 ? void 0 : o.metadata), _), !((d = (c = this._def.openapi) === null || c === void 0 ? void 0 : c.metadata) === null || d === void 0) && d.param || x ? {
      param: Object.assign(Object.assign({}, (f = (u = this._def.openapi) === null || u === void 0 ? void 0 : u.metadata) === null || f === void 0 ? void 0 : f.param), x)
    } : void 0), v = new this.constructor(Object.assign(Object.assign({}, this._def), { openapi: Object.assign(Object.assign({}, Object.keys(P).length > 0 ? { _internal: P } : void 0), Object.keys(O).length > 0 ? { metadata: O } : void 0) }));
    if (isZodType(this, "ZodObject")) {
      const y = this.extend;
      v.extend = function(...A) {
        var E, I, N, $, M, B, H;
        const K = y.apply(this, A);
        return K._def.openapi = {
          _internal: {
            extendedFrom: !((I = (E = this._def.openapi) === null || E === void 0 ? void 0 : E._internal) === null || I === void 0) && I.refId ? { refId: ($ = (N = this._def.openapi) === null || N === void 0 ? void 0 : N._internal) === null || $ === void 0 ? void 0 : $.refId, schema: this } : (B = (M = this._def.openapi) === null || M === void 0 ? void 0 : M._internal) === null || B === void 0 ? void 0 : B.extendedFrom
          },
          metadata: (H = K._def.openapi) === null || H === void 0 ? void 0 : H.metadata
        }, K;
      };
    }
    return v;
  }, preserveMetadataFromModifier(r, "optional"), preserveMetadataFromModifier(r, "nullable"), preserveMetadataFromModifier(r, "default"), preserveMetadataFromModifier(r, "transform"), preserveMetadataFromModifier(r, "refine");
  const e = r.ZodObject.prototype.deepPartial;
  r.ZodObject.prototype.deepPartial = function() {
    const a = this._def.shape(), i = e.apply(this), s = i._def.shape();
    return Object.entries(s).forEach(([o, c]) => {
      var d, u;
      c._def.openapi = (u = (d = a[o]) === null || d === void 0 ? void 0 : d._def) === null || u === void 0 ? void 0 : u.openapi;
    }), i._def.openapi = void 0, i;
  };
  const t = r.ZodObject.prototype.pick;
  r.ZodObject.prototype.pick = function(...a) {
    const i = t.apply(this, a);
    return i._def.openapi = void 0, i;
  };
  const n = r.ZodObject.prototype.omit;
  r.ZodObject.prototype.omit = function(...a) {
    const i = n.apply(this, a);
    return i._def.openapi = void 0, i;
  };
}
function isEqual(r, e) {
  if (r == null || e === null || e === void 0)
    return r === e;
  if (r === e || r.valueOf() === e.valueOf())
    return !0;
  if (Array.isArray(r) && (!Array.isArray(e) || r.length !== e.length) || !(r instanceof Object) || !(e instanceof Object))
    return !1;
  const t = Object.keys(r);
  return Object.keys(e).every((n) => t.indexOf(n) !== -1) && t.every((n) => isEqual(r[n], e[n]));
}
class ObjectSet {
  constructor() {
    this.buckets = /* @__PURE__ */ new Map();
  }
  put(e) {
    const t = this.hashCodeOf(e), n = this.buckets.get(t);
    if (!n) {
      this.buckets.set(t, [e]);
      return;
    }
    n.some((i) => isEqual(i, e)) || n.push(e);
  }
  contains(e) {
    const t = this.hashCodeOf(e), n = this.buckets.get(t);
    return n ? n.some((a) => isEqual(a, e)) : !1;
  }
  values() {
    return [...this.buckets.values()].flat();
  }
  stats() {
    let e = 0, t = 0, n = 0;
    for (const i of this.buckets.values())
      e += 1, t += i.length, i.length > 1 && (n += 1);
    const a = e / t;
    return { totalBuckets: e, collisions: n, totalValues: t, hashEffectiveness: a };
  }
  hashCodeOf(e) {
    let t = 0;
    if (Array.isArray(e)) {
      for (let n = 0; n < e.length; n++)
        t ^= this.hashCodeOf(e[n]) * n;
      return t;
    }
    if (typeof e == "string") {
      for (let n = 0; n < e.length; n++)
        t ^= e.charCodeAt(n) * n;
      return t;
    }
    if (typeof e == "number")
      return e;
    if (typeof e == "object")
      for (const [n, a] of Object.entries(e))
        t ^= this.hashCodeOf(n) + this.hashCodeOf(a ?? "");
    return t;
  }
}
function isUndefined(r) {
  return r === void 0;
}
function mapValues(r, e) {
  const t = {};
  return Object.entries(r).forEach(([n, a]) => {
    t[n] = e(a);
  }), t;
}
function omit(r, e) {
  const t = {};
  return Object.entries(r).forEach(([n, a]) => {
    e.some((i) => i === n) || (t[n] = a);
  }), t;
}
function omitBy(r, e) {
  const t = {};
  return Object.entries(r).forEach(([n, a]) => {
    e(a, n) || (t[n] = a);
  }), t;
}
function compact(r) {
  return r.filter((e) => !isUndefined(e));
}
const objectEquals = isEqual;
function uniq(r) {
  const e = new ObjectSet();
  return r.forEach((t) => e.put(t)), [...e.values()];
}
function isString(r) {
  return typeof r == "string";
}
class OpenAPIRegistry {
  constructor(e) {
    this.parents = e, this._definitions = [];
  }
  get definitions() {
    var e, t;
    return [...(t = (e = this.parents) === null || e === void 0 ? void 0 : e.flatMap((a) => a.definitions)) !== null && t !== void 0 ? t : [], ...this._definitions];
  }
  /**
   * Registers a new component schema under /components/schemas/${name}
   */
  register(e, t) {
    const n = this.schemaWithRefId(e, t);
    return this._definitions.push({ type: "schema", schema: n }), n;
  }
  /**
   * Registers a new parameter schema under /components/parameters/${name}
   */
  registerParameter(e, t) {
    var n, a, i;
    const s = this.schemaWithRefId(e, t), o = (n = s._def.openapi) === null || n === void 0 ? void 0 : n.metadata, c = s.openapi(Object.assign(Object.assign({}, o), { param: Object.assign(Object.assign({}, o?.param), { name: (i = (a = o?.param) === null || a === void 0 ? void 0 : a.name) !== null && i !== void 0 ? i : e }) }));
    return this._definitions.push({
      type: "parameter",
      schema: c
    }), c;
  }
  /**
   * Registers a new path that would be generated under paths:
   */
  registerPath(e) {
    this._definitions.push({
      type: "route",
      route: e
    });
  }
  /**
   * Registers a new webhook that would be generated under webhooks:
   */
  registerWebhook(e) {
    this._definitions.push({
      type: "webhook",
      webhook: e
    });
  }
  /**
   * Registers a raw OpenAPI component. Use this if you have a simple object instead of a Zod schema.
   *
   * @param type The component type, e.g. `schemas`, `responses`, `securitySchemes`, etc.
   * @param name The name of the object, it is the key under the component
   *             type in the resulting OpenAPI document
   * @param component The actual object to put there
   */
  registerComponent(e, t, n) {
    return this._definitions.push({
      type: "component",
      componentType: e,
      name: t,
      component: n
    }), {
      name: t,
      ref: { $ref: `#/components/${e}/${t}` }
    };
  }
  schemaWithRefId(e, t) {
    return t.openapi(e);
  }
}
class ZodToOpenAPIError {
  constructor(e) {
    this.message = e;
  }
}
class ConflictError extends ZodToOpenAPIError {
  constructor(e, t) {
    super(e), this.data = t;
  }
}
class MissingParameterDataError extends ZodToOpenAPIError {
  constructor(e) {
    super(`Missing parameter data, please specify \`${e.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`ZodSchema.openapi\``), this.data = e;
  }
}
function enhanceMissingParametersError(r, e) {
  try {
    return r();
  } catch (t) {
    throw t instanceof MissingParameterDataError ? new MissingParameterDataError(Object.assign(Object.assign({}, t.data), e)) : t;
  }
}
class UnknownZodTypeError extends ZodToOpenAPIError {
  constructor(e) {
    super("Unknown zod object type, please specify `type` and other OpenAPI props using `ZodSchema.openapi`."), this.data = e;
  }
}
class Metadata {
  static getMetadata(e) {
    var t;
    const n = this.unwrapChained(e), a = e._def.openapi ? e._def.openapi : n._def.openapi, i = (t = e.description) !== null && t !== void 0 ? t : n.description;
    return {
      _internal: a?._internal,
      metadata: Object.assign({ description: i }, a?.metadata)
    };
  }
  static getInternalMetadata(e) {
    const t = this.unwrapChained(e), n = e._def.openapi ? e._def.openapi : t._def.openapi;
    return n?._internal;
  }
  static getParamMetadata(e) {
    var t, n;
    const a = this.unwrapChained(e), i = e._def.openapi ? e._def.openapi : a._def.openapi, s = (t = e.description) !== null && t !== void 0 ? t : a.description;
    return {
      _internal: i?._internal,
      metadata: Object.assign(Object.assign({}, i?.metadata), {
        // A description provided from .openapi() should be taken with higher precedence
        param: Object.assign({ description: s }, (n = i?.metadata) === null || n === void 0 ? void 0 : n.param)
      })
    };
  }
  /**
   * A method that omits all custom keys added to the regular OpenAPI
   * metadata properties
   */
  static buildSchemaMetadata(e) {
    return omitBy(omit(e, ["param"]), isUndefined);
  }
  static buildParameterMetadata(e) {
    return omitBy(e, isUndefined);
  }
  static applySchemaMetadata(e, t) {
    return omitBy(Object.assign(Object.assign({}, e), this.buildSchemaMetadata(t)), isUndefined);
  }
  static getRefId(e) {
    var t;
    return (t = this.getInternalMetadata(e)) === null || t === void 0 ? void 0 : t.refId;
  }
  static unwrapChained(e) {
    return this.unwrapUntil(e);
  }
  static getDefaultValue(e) {
    const t = this.unwrapUntil(e, "ZodDefault");
    return t?._def.defaultValue();
  }
  static unwrapUntil(e, t) {
    return t && isZodType(e, t) ? e : isZodType(e, "ZodOptional") || isZodType(e, "ZodNullable") || isZodType(e, "ZodBranded") ? this.unwrapUntil(e.unwrap(), t) : isZodType(e, "ZodDefault") || isZodType(e, "ZodReadonly") ? this.unwrapUntil(e._def.innerType, t) : isZodType(e, "ZodEffects") ? this.unwrapUntil(e._def.schema, t) : isZodType(e, "ZodPipeline") ? this.unwrapUntil(e._def.in, t) : t ? void 0 : e;
  }
  static isOptionalSchema(e) {
    return e.isOptional();
  }
}
class ArrayTransformer {
  transform(e, t, n) {
    var a, i;
    const s = e._def.type;
    return Object.assign(Object.assign({}, t("array")), { items: n(s), minItems: (a = e._def.minLength) === null || a === void 0 ? void 0 : a.value, maxItems: (i = e._def.maxLength) === null || i === void 0 ? void 0 : i.value });
  }
}
class BigIntTransformer {
  transform(e) {
    return Object.assign(Object.assign({}, e("string")), { pattern: "^d+$" });
  }
}
class DiscriminatedUnionTransformer {
  transform(e, t, n, a, i) {
    const s = [...e.options.values()], o = s.map(a);
    return t ? {
      oneOf: n(o, t)
    } : {
      oneOf: o,
      discriminator: this.mapDiscriminator(s, e.discriminator, i)
    };
  }
  mapDiscriminator(e, t, n) {
    if (e.some((i) => Metadata.getRefId(i) === void 0))
      return;
    const a = {};
    return e.forEach((i) => {
      var s;
      const o = Metadata.getRefId(i), c = (s = i.shape) === null || s === void 0 ? void 0 : s[t];
      if (isZodType(c, "ZodEnum") || isZodType(c, "ZodNativeEnum")) {
        Object.values(c.enum).filter(isString).forEach((f) => {
          a[f] = n(o);
        });
        return;
      }
      const d = c?._def.value;
      if (typeof d != "string")
        throw new Error(`Discriminator ${t} could not be found in one of the values of a discriminated union`);
      a[d] = n(o);
    }), {
      propertyName: t,
      mapping: a
    };
  }
}
class EnumTransformer {
  transform(e, t) {
    return Object.assign(Object.assign({}, t("string")), { enum: e._def.values });
  }
}
class IntersectionTransformer {
  transform(e, t, n, a) {
    const s = {
      allOf: this.flattenIntersectionTypes(e).map(a)
    };
    return t ? {
      anyOf: n([s], t)
    } : s;
  }
  flattenIntersectionTypes(e) {
    if (!isZodType(e, "ZodIntersection"))
      return [e];
    const t = this.flattenIntersectionTypes(e._def.left), n = this.flattenIntersectionTypes(e._def.right);
    return [...t, ...n];
  }
}
class LiteralTransformer {
  transform(e, t) {
    return Object.assign(Object.assign({}, t(typeof e._def.value)), { enum: [e._def.value] });
  }
}
function enumInfo(r) {
  const t = Object.keys(r).filter((i) => typeof r[r[i]] != "number").map((i) => r[i]), n = t.filter((i) => typeof i == "number").length, a = n === 0 ? "string" : n === t.length ? "numeric" : "mixed";
  return { values: t, type: a };
}
class NativeEnumTransformer {
  transform(e, t) {
    const { type: n, values: a } = enumInfo(e._def.values);
    if (n === "mixed")
      throw new ZodToOpenAPIError("Enum has mixed string and number values, please specify the OpenAPI type manually");
    return Object.assign(Object.assign({}, t(n === "numeric" ? "integer" : "string")), { enum: a });
  }
}
class NumberTransformer {
  transform(e, t, n) {
    return Object.assign(Object.assign({}, t(e.isInt ? "integer" : "number")), n(e._def.checks));
  }
}
class ObjectTransformer {
  transform(e, t, n, a) {
    var i;
    const s = (i = Metadata.getInternalMetadata(e)) === null || i === void 0 ? void 0 : i.extendedFrom, o = this.requiredKeysOf(e), c = mapValues(e._def.shape(), a);
    if (!s)
      return Object.assign(Object.assign(Object.assign(Object.assign({}, n("object")), { properties: c, default: t }), o.length > 0 ? { required: o } : {}), this.generateAdditionalProperties(e, a));
    const d = s.schema;
    a(d);
    const u = this.requiredKeysOf(d), f = mapValues(d?._def.shape(), a), h = Object.fromEntries(Object.entries(c).filter(([_, P]) => !objectEquals(f[_], P))), g = o.filter((_) => !u.includes(_)), x = Object.assign(Object.assign(Object.assign(Object.assign({}, n("object")), { default: t, properties: h }), g.length > 0 ? { required: g } : {}), this.generateAdditionalProperties(e, a));
    return {
      allOf: [
        { $ref: `#/components/schemas/${s.refId}` },
        x
      ]
    };
  }
  generateAdditionalProperties(e, t) {
    const n = e._def.unknownKeys, a = e._def.catchall;
    return isZodType(a, "ZodNever") ? n === "strict" ? { additionalProperties: !1 } : {} : { additionalProperties: t(a) };
  }
  requiredKeysOf(e) {
    return Object.entries(e._def.shape()).filter(([t, n]) => !Metadata.isOptionalSchema(n)).map(([t, n]) => t);
  }
}
class RecordTransformer {
  transform(e, t, n) {
    const a = e._def.valueType, i = e._def.keyType, s = n(a);
    if (isZodType(i, "ZodEnum") || isZodType(i, "ZodNativeEnum")) {
      const c = Object.values(i.enum).filter(isString).reduce((d, u) => Object.assign(Object.assign({}, d), { [u]: s }), {});
      return Object.assign(Object.assign({}, t("object")), { properties: c });
    }
    return Object.assign(Object.assign({}, t("object")), { additionalProperties: s });
  }
}
class StringTransformer {
  transform(e, t) {
    var n, a, i;
    const s = this.getZodStringCheck(e, "regex"), o = (n = this.getZodStringCheck(e, "length")) === null || n === void 0 ? void 0 : n.value, c = Number.isFinite(e.minLength) && (a = e.minLength) !== null && a !== void 0 ? a : void 0, d = Number.isFinite(e.maxLength) && (i = e.maxLength) !== null && i !== void 0 ? i : void 0;
    return Object.assign(Object.assign({}, t("string")), {
      // FIXME: https://github.com/colinhacks/zod/commit/d78047e9f44596a96d637abb0ce209cd2732d88c
      minLength: o ?? c,
      maxLength: o ?? d,
      format: this.mapStringFormat(e),
      pattern: s?.regex.source
    });
  }
  /**
   * Attempts to map Zod strings to known formats
   * https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
   */
  mapStringFormat(e) {
    if (e.isUUID)
      return "uuid";
    if (e.isEmail)
      return "email";
    if (e.isURL)
      return "uri";
    if (e.isDate)
      return "date";
    if (e.isDatetime)
      return "date-time";
    if (e.isCUID)
      return "cuid";
    if (e.isCUID2)
      return "cuid2";
    if (e.isULID)
      return "ulid";
    if (e.isIP)
      return "ip";
    if (e.isEmoji)
      return "emoji";
  }
  getZodStringCheck(e, t) {
    return e._def.checks.find((n) => n.kind === t);
  }
}
class TupleTransformer {
  constructor(e) {
    this.versionSpecifics = e;
  }
  transform(e, t, n) {
    const { items: a } = e._def, i = a.map(n);
    return Object.assign(Object.assign({}, t("array")), this.versionSpecifics.mapTupleItems(i));
  }
}
class UnionTransformer {
  transform(e, t, n) {
    const i = this.flattenUnionTypes(e).map((s) => {
      const o = this.unwrapNullable(s);
      return n(o);
    });
    return {
      anyOf: t(i)
    };
  }
  flattenUnionTypes(e) {
    return isZodType(e, "ZodUnion") ? e._def.options.flatMap((n) => this.flattenUnionTypes(n)) : [e];
  }
  unwrapNullable(e) {
    return isZodType(e, "ZodNullable") ? this.unwrapNullable(e.unwrap()) : e;
  }
}
class OpenApiTransformer {
  constructor(e) {
    this.versionSpecifics = e, this.objectTransformer = new ObjectTransformer(), this.stringTransformer = new StringTransformer(), this.numberTransformer = new NumberTransformer(), this.bigIntTransformer = new BigIntTransformer(), this.literalTransformer = new LiteralTransformer(), this.enumTransformer = new EnumTransformer(), this.nativeEnumTransformer = new NativeEnumTransformer(), this.arrayTransformer = new ArrayTransformer(), this.unionTransformer = new UnionTransformer(), this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer(), this.intersectionTransformer = new IntersectionTransformer(), this.recordTransformer = new RecordTransformer(), this.tupleTransformer = new TupleTransformer(e);
  }
  transform(e, t, n, a, i) {
    if (isZodType(e, "ZodNull"))
      return this.versionSpecifics.nullType;
    if (isZodType(e, "ZodUnknown") || isZodType(e, "ZodAny"))
      return this.versionSpecifics.mapNullableType(void 0, t);
    if (isZodType(e, "ZodObject"))
      return this.objectTransformer.transform(
        e,
        i,
        // verified on TS level from input
        // verified on TS level from input
        (o) => this.versionSpecifics.mapNullableType(o, t),
        n
      );
    const s = this.transformSchemaWithoutDefault(e, t, n, a);
    return Object.assign(Object.assign({}, s), { default: i });
  }
  transformSchemaWithoutDefault(e, t, n, a) {
    if (isZodType(e, "ZodUnknown") || isZodType(e, "ZodAny"))
      return this.versionSpecifics.mapNullableType(void 0, t);
    if (isZodType(e, "ZodString"))
      return this.stringTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t));
    if (isZodType(e, "ZodNumber"))
      return this.numberTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), (s) => this.versionSpecifics.getNumberChecks(s));
    if (isZodType(e, "ZodBigInt"))
      return this.bigIntTransformer.transform((s) => this.versionSpecifics.mapNullableType(s, t));
    if (isZodType(e, "ZodBoolean"))
      return this.versionSpecifics.mapNullableType("boolean", t);
    if (isZodType(e, "ZodLiteral"))
      return this.literalTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t));
    if (isZodType(e, "ZodEnum"))
      return this.enumTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t));
    if (isZodType(e, "ZodNativeEnum"))
      return this.nativeEnumTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t));
    if (isZodType(e, "ZodArray"))
      return this.arrayTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), n);
    if (isZodType(e, "ZodTuple"))
      return this.tupleTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), n);
    if (isZodType(e, "ZodUnion"))
      return this.unionTransformer.transform(e, (s) => this.versionSpecifics.mapNullableOfArray(s, t), n);
    if (isZodType(e, "ZodDiscriminatedUnion"))
      return this.discriminatedUnionTransformer.transform(e, t, (s) => this.versionSpecifics.mapNullableOfArray(s, t), n, a);
    if (isZodType(e, "ZodIntersection"))
      return this.intersectionTransformer.transform(e, t, (s) => this.versionSpecifics.mapNullableOfArray(s, t), n);
    if (isZodType(e, "ZodRecord"))
      return this.recordTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), n);
    if (isZodType(e, "ZodDate"))
      return this.versionSpecifics.mapNullableType("string", t);
    const i = Metadata.getRefId(e);
    throw new UnknownZodTypeError({
      currentSchema: e._def,
      schemaName: i
    });
  }
}
class OpenAPIGenerator {
  constructor(e, t) {
    this.definitions = e, this.versionSpecifics = t, this.schemaRefs = {}, this.paramRefs = {}, this.pathRefs = {}, this.rawComponents = [], this.openApiTransformer = new OpenApiTransformer(t), this.sortDefinitions();
  }
  generateDocumentData() {
    return this.definitions.forEach((e) => this.generateSingle(e)), {
      components: this.buildComponents(),
      paths: this.pathRefs
    };
  }
  generateComponents() {
    return this.definitions.forEach((e) => this.generateSingle(e)), {
      components: this.buildComponents()
    };
  }
  buildComponents() {
    var e, t;
    const n = {};
    return this.rawComponents.forEach(({ componentType: a, name: i, component: s }) => {
      var o;
      (o = n[a]) !== null && o !== void 0 || (n[a] = {}), n[a][i] = s;
    }), Object.assign(Object.assign({}, n), { schemas: Object.assign(Object.assign({}, (e = n.schemas) !== null && e !== void 0 ? e : {}), this.schemaRefs), parameters: Object.assign(Object.assign({}, (t = n.parameters) !== null && t !== void 0 ? t : {}), this.paramRefs) });
  }
  sortDefinitions() {
    const e = [
      "schema",
      "parameter",
      "component",
      "route"
    ];
    this.definitions.sort((t, n) => {
      if (!("type" in t))
        return "type" in n ? -1 : 0;
      if (!("type" in n))
        return 1;
      const a = e.findIndex((s) => s === t.type), i = e.findIndex((s) => s === n.type);
      return a - i;
    });
  }
  generateSingle(e) {
    if (!("type" in e)) {
      this.generateSchemaWithRef(e);
      return;
    }
    switch (e.type) {
      case "parameter":
        this.generateParameterDefinition(e.schema);
        return;
      case "schema":
        this.generateSchemaWithRef(e.schema);
        return;
      case "route":
        this.generateSingleRoute(e.route);
        return;
      case "component":
        this.rawComponents.push(e);
        return;
    }
  }
  generateParameterDefinition(e) {
    const t = Metadata.getRefId(e), n = this.generateParameter(e);
    return t && (this.paramRefs[t] = n), n;
  }
  getParameterRef(e, t) {
    var n, a, i, s, o;
    const c = (n = e?.metadata) === null || n === void 0 ? void 0 : n.param, d = !((a = e?._internal) === null || a === void 0) && a.refId ? this.paramRefs[(i = e._internal) === null || i === void 0 ? void 0 : i.refId] : void 0;
    if (!(!(!((s = e?._internal) === null || s === void 0) && s.refId) || !d)) {
      if (c && d.in !== c.in || t?.in && d.in !== t.in)
        throw new ConflictError(`Conflicting location for parameter ${d.name}`, {
          key: "in",
          values: compact([
            d.in,
            t?.in,
            c?.in
          ])
        });
      if (c && d.name !== c.name || t?.name && d.name !== t?.name)
        throw new ConflictError("Conflicting names for parameter", {
          key: "name",
          values: compact([
            d.name,
            t?.name,
            c?.name
          ])
        });
      return {
        $ref: `#/components/parameters/${(o = e._internal) === null || o === void 0 ? void 0 : o.refId}`
      };
    }
  }
  generateInlineParameters(e, t) {
    var n;
    const a = Metadata.getMetadata(e), i = (n = a?.metadata) === null || n === void 0 ? void 0 : n.param, s = this.getParameterRef(a, { in: t });
    if (s)
      return [s];
    if (isZodType(e, "ZodObject")) {
      const o = e._def.shape();
      return Object.entries(o).map(([d, u]) => {
        var f, h;
        const g = Metadata.getMetadata(u), x = this.getParameterRef(g, {
          in: t,
          name: d
        });
        if (x)
          return x;
        const _ = (f = g?.metadata) === null || f === void 0 ? void 0 : f.param;
        if (_?.name && _.name !== d)
          throw new ConflictError("Conflicting names for parameter", {
            key: "name",
            values: [d, _.name]
          });
        if (_?.in && _.in !== t)
          throw new ConflictError(`Conflicting location for parameter ${(h = _.name) !== null && h !== void 0 ? h : d}`, {
            key: "in",
            values: [t, _.in]
          });
        return this.generateParameter(u.openapi({ param: { name: d, in: t } }));
      });
    }
    if (i?.in && i.in !== t)
      throw new ConflictError(`Conflicting location for parameter ${i.name}`, {
        key: "in",
        values: [t, i.in]
      });
    return [
      this.generateParameter(e.openapi({ param: { in: t } }))
    ];
  }
  generateSimpleParameter(e) {
    var t;
    const n = Metadata.getParamMetadata(e), a = (t = n?.metadata) === null || t === void 0 ? void 0 : t.param, i = !Metadata.isOptionalSchema(e) && !e.isNullable(), s = this.generateSchemaWithRef(e);
    return Object.assign({
      schema: s,
      required: i
    }, a ? Metadata.buildParameterMetadata(a) : {});
  }
  generateParameter(e) {
    var t;
    const n = Metadata.getMetadata(e), a = (t = n?.metadata) === null || t === void 0 ? void 0 : t.param, i = a?.name, s = a?.in;
    if (!i)
      throw new MissingParameterDataError({ missingField: "name" });
    if (!s)
      throw new MissingParameterDataError({
        missingField: "in",
        paramName: i
      });
    const o = this.generateSimpleParameter(e);
    return Object.assign(Object.assign({}, o), { in: s, name: i });
  }
  generateSchemaWithMetadata(e) {
    var t;
    const n = Metadata.unwrapChained(e), a = Metadata.getMetadata(e), i = Metadata.getDefaultValue(e), s = !((t = a?.metadata) === null || t === void 0) && t.type ? { type: a?.metadata.type } : this.toOpenAPISchema(n, e.isNullable(), i);
    return a?.metadata ? Metadata.applySchemaMetadata(s, a.metadata) : omitBy(s, isUndefined);
  }
  /**
   * Same as above but applies nullable
   */
  constructReferencedOpenAPISchema(e) {
    var t;
    const n = Metadata.getMetadata(e), a = Metadata.unwrapChained(e), i = Metadata.getDefaultValue(e), s = e.isNullable();
    return !((t = n?.metadata) === null || t === void 0) && t.type ? this.versionSpecifics.mapNullableType(n.metadata.type, s) : this.toOpenAPISchema(a, s, i);
  }
  /**
   * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
   */
  generateSimpleSchema(e) {
    var t;
    const n = Metadata.getMetadata(e), a = Metadata.getRefId(e);
    if (!a || !this.schemaRefs[a])
      return this.generateSchemaWithMetadata(e);
    const i = this.schemaRefs[a], s = {
      $ref: this.generateSchemaRef(a)
    }, o = omitBy(Metadata.buildSchemaMetadata((t = n?.metadata) !== null && t !== void 0 ? t : {}), (u, f) => u === void 0 || objectEquals(u, i[f]));
    if (o.type)
      return {
        allOf: [s, o]
      };
    const c = omitBy(this.constructReferencedOpenAPISchema(e), (u, f) => u === void 0 || objectEquals(u, i[f])), d = Metadata.applySchemaMetadata(c, o);
    return Object.keys(d).length > 0 ? {
      allOf: [s, d]
    } : s;
  }
  /**
   * Same as `generateSchema` but if the new schema is added into the
   * referenced schemas, it would return a ReferenceObject and not the
   * whole result.
   *
   * Should be used for nested objects, arrays, etc.
   */
  generateSchemaWithRef(e) {
    const t = Metadata.getRefId(e), n = this.generateSimpleSchema(e);
    return t && this.schemaRefs[t] === void 0 ? (this.schemaRefs[t] = n, { $ref: this.generateSchemaRef(t) }) : n;
  }
  generateSchemaRef(e) {
    return `#/components/schemas/${e}`;
  }
  getRequestBody(e) {
    if (!e)
      return;
    const { content: t } = e, n = __rest(e, ["content"]), a = this.getBodyContent(t);
    return Object.assign(Object.assign({}, n), { content: a });
  }
  getParameters(e) {
    if (!e)
      return [];
    const { headers: t } = e, n = this.cleanParameter(e.query), a = this.cleanParameter(e.params), i = this.cleanParameter(e.cookies), s = enhanceMissingParametersError(() => n ? this.generateInlineParameters(n, "query") : [], { location: "query" }), o = enhanceMissingParametersError(() => a ? this.generateInlineParameters(a, "path") : [], { location: "path" }), c = enhanceMissingParametersError(() => i ? this.generateInlineParameters(i, "cookie") : [], { location: "cookie" }), d = enhanceMissingParametersError(() => {
      if (Array.isArray(t))
        return t.flatMap((f) => this.generateInlineParameters(f, "header"));
      const u = this.cleanParameter(t);
      return u ? this.generateInlineParameters(u, "header") : [];
    }, { location: "header" });
    return [
      ...o,
      ...s,
      ...d,
      ...c
    ];
  }
  cleanParameter(e) {
    if (e)
      return isZodType(e, "ZodEffects") ? this.cleanParameter(e._def.schema) : e;
  }
  generatePath(e) {
    const { method: t, path: n, request: a, responses: i } = e, s = __rest(e, ["method", "path", "request", "responses"]), o = mapValues(i, (f) => this.getResponse(f)), c = enhanceMissingParametersError(() => this.getParameters(a), { route: `${t} ${n}` }), d = this.getRequestBody(a?.body);
    return {
      [t]: Object.assign(Object.assign(Object.assign(Object.assign({}, s), c.length > 0 ? {
        parameters: [...s.parameters || [], ...c]
      } : {}), d ? { requestBody: d } : {}), { responses: o })
    };
  }
  generateSingleRoute(e) {
    const t = this.generatePath(e);
    return this.pathRefs[e.path] = Object.assign(Object.assign({}, this.pathRefs[e.path]), t), t;
  }
  getResponse(e) {
    if (this.isReferenceObject(e))
      return e;
    const { content: t, headers: n } = e, a = __rest(e, ["content", "headers"]), i = t ? { content: this.getBodyContent(t) } : {};
    if (!n)
      return Object.assign(Object.assign({}, a), i);
    const s = isZodType(n, "ZodObject") ? this.getResponseHeaders(n) : (
      // This is input data so it is okay to cast in the common generator
      // since this is the user's responsibility to keep it correct
      n
    );
    return Object.assign(Object.assign(Object.assign({}, a), { headers: s }), i);
  }
  isReferenceObject(e) {
    return "$ref" in e;
  }
  getResponseHeaders(e) {
    const t = e._def.shape();
    return mapValues(t, (a) => this.generateSimpleParameter(a));
  }
  getBodyContent(e) {
    return mapValues(e, (t) => {
      if (!t || !isAnyZodType(t.schema))
        return t;
      const { schema: n } = t, a = __rest(t, ["schema"]), i = this.generateSchemaWithRef(n);
      return Object.assign({ schema: i }, a);
    });
  }
  toOpenAPISchema(e, t, n) {
    return this.openApiTransformer.transform(e, t, (a) => this.generateSchemaWithRef(a), (a) => this.generateSchemaRef(a), n);
  }
}
class OpenApiGeneratorV30Specifics {
  get nullType() {
    return { nullable: !0 };
  }
  mapNullableOfArray(e, t) {
    return t ? [...e, this.nullType] : e;
  }
  mapNullableType(e, t) {
    return Object.assign(Object.assign({}, e ? { type: e } : void 0), t ? this.nullType : void 0);
  }
  mapTupleItems(e) {
    const t = uniq(e);
    return {
      items: t.length === 1 ? t[0] : { anyOf: t },
      minItems: e.length,
      maxItems: e.length
    };
  }
  getNumberChecks(e) {
    return Object.assign({}, ...e.map((t) => {
      switch (t.kind) {
        case "min":
          return t.inclusive ? { minimum: Number(t.value) } : { minimum: Number(t.value), exclusiveMinimum: !0 };
        case "max":
          return t.inclusive ? { maximum: Number(t.value) } : { maximum: Number(t.value), exclusiveMaximum: !0 };
        default:
          return {};
      }
    }));
  }
}
class OpenApiGeneratorV3 {
  constructor(e) {
    const t = new OpenApiGeneratorV30Specifics();
    this.generator = new OpenAPIGenerator(e, t);
  }
  generateDocument(e) {
    const t = this.generator.generateDocumentData();
    return Object.assign(Object.assign({}, e), t);
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
}
class OpenApiGeneratorV31Specifics {
  get nullType() {
    return { type: "null" };
  }
  mapNullableOfArray(e, t) {
    return t ? [...e, this.nullType] : e;
  }
  mapNullableType(e, t) {
    return e ? t ? {
      type: Array.isArray(e) ? [...e, "null"] : [e, "null"]
    } : {
      type: e
    } : {};
  }
  mapTupleItems(e) {
    return {
      prefixItems: e
    };
  }
  getNumberChecks(e) {
    return Object.assign({}, ...e.map((t) => {
      switch (t.kind) {
        case "min":
          return t.inclusive ? { minimum: Number(t.value) } : { exclusiveMinimum: Number(t.value) };
        case "max":
          return t.inclusive ? { maximum: Number(t.value) } : { exclusiveMaximum: Number(t.value) };
        default:
          return {};
      }
    }));
  }
}
function isWebhookDefinition(r) {
  return "type" in r && r.type === "webhook";
}
class OpenApiGeneratorV31 {
  constructor(e) {
    this.definitions = e, this.webhookRefs = {};
    const t = new OpenApiGeneratorV31Specifics();
    this.generator = new OpenAPIGenerator(this.definitions, t);
  }
  generateDocument(e) {
    const t = this.generator.generateDocumentData();
    return this.definitions.filter(isWebhookDefinition).forEach((n) => this.generateSingleWebhook(n.webhook)), Object.assign(Object.assign(Object.assign({}, e), t), { webhooks: this.webhookRefs });
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
  generateSingleWebhook(e) {
    const t = this.generator.generatePath(e);
    return this.webhookRefs[e.path] = Object.assign(Object.assign({}, this.webhookRefs[e.path]), t), t;
  }
}
var splitPath = (r) => {
  const e = r.split("/");
  return e[0] === "" && e.shift(), e;
}, splitRoutingPath = (r) => {
  const { groups: e, path: t } = extractGroupsFromPath(r), n = splitPath(t);
  return replaceGroupMarks(n, e);
}, extractGroupsFromPath = (r) => {
  const e = [];
  return r = r.replace(/\{[^}]+\}/g, (t, n) => {
    const a = `@${n}`;
    return e.push([a, t]), a;
  }), { groups: e, path: r };
}, replaceGroupMarks = (r, e) => {
  for (let t = e.length - 1; t >= 0; t--) {
    const [n] = e[t];
    for (let a = r.length - 1; a >= 0; a--)
      if (r[a].includes(n)) {
        r[a] = r[a].replace(n, e[t][1]);
        break;
      }
  }
  return r;
}, patternCache = {}, getPattern = (r, e) => {
  if (r === "*")
    return "*";
  const t = r.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (t) {
    const n = `${r}#${e}`;
    return patternCache[n] || (t[2] ? patternCache[n] = e && e[0] !== ":" && e[0] !== "*" ? [n, t[1], new RegExp(`^${t[2]}(?=/${e})`)] : [r, t[1], new RegExp(`^${t[2]}$`)] : patternCache[n] = [r, t[1], !0]), patternCache[n];
  }
  return null;
}, tryDecode = (r, e) => {
  try {
    return e(r);
  } catch {
    return r.replace(/(?:%[0-9A-Fa-f]{2})+/g, (t) => {
      try {
        return e(t);
      } catch {
        return t;
      }
    });
  }
}, tryDecodeURI = (r) => tryDecode(r, decodeURI), getPath = (r) => {
  const e = r.url, t = e.indexOf("/", e.indexOf(":") + 4);
  let n = t;
  for (; n < e.length; n++) {
    const a = e.charCodeAt(n);
    if (a === 37) {
      const i = e.indexOf("?", n), s = e.indexOf("#", n), o = i === -1 ? s === -1 ? void 0 : s : s === -1 ? i : Math.min(i, s), c = e.slice(t, o);
      return tryDecodeURI(c.includes("%25") ? c.replace(/%25/g, "%2525") : c);
    } else if (a === 63 || a === 35)
      break;
  }
  return e.slice(t, n);
}, getPathNoStrict = (r) => {
  const e = getPath(r);
  return e.length > 1 && e.at(-1) === "/" ? e.slice(0, -1) : e;
}, mergePath = (r, e, ...t) => (t.length && (e = mergePath(e, ...t)), `${r?.[0] === "/" ? "" : "/"}${r}${e === "/" ? "" : `${r?.at(-1) === "/" ? "" : "/"}${e?.[0] === "/" ? e.slice(1) : e}`}`), checkOptionalParameter = (r) => {
  if (r.charCodeAt(r.length - 1) !== 63 || !r.includes(":"))
    return null;
  const e = r.split("/"), t = [];
  let n = "";
  return e.forEach((a) => {
    if (a !== "" && !/\:/.test(a))
      n += "/" + a;
    else if (/\:/.test(a))
      if (a.charCodeAt(a.length - 1) === 63) {
        t.length === 0 && n === "" ? t.push("/") : t.push(n);
        const i = a.slice(0, -1);
        n += "/" + i, t.push(n);
      } else
        n += "/" + a;
  }), t.filter((a, i, s) => s.indexOf(a) === i);
}, tryDecodeURIComponent = (r) => r.indexOf("%") !== -1 ? tryDecode(r, decodeURIComponent_) : r, _decodeURI = (r) => (r.indexOf("+") !== -1 && (r = r.replace(/\+/g, " ")), tryDecodeURIComponent(r)), _getQueryParam = (r, e, t) => {
  let n;
  if (!t && e && e.indexOf("%") === -1 && e.indexOf("+") === -1) {
    let s = r.indexOf("?", 8);
    if (s === -1)
      return;
    for (r.startsWith(e, s + 1) || (s = r.indexOf(`&${e}`, s + 1)); s !== -1; ) {
      const o = r.charCodeAt(s + e.length + 1);
      if (o === 61) {
        const c = s + e.length + 2, d = r.indexOf("&", c);
        return _decodeURI(r.slice(c, d === -1 ? void 0 : d));
      } else if (o == 38 || isNaN(o))
        return "";
      s = r.indexOf(`&${e}`, s + 1);
    }
    if (n = /[%+]/.test(r), !n)
      return;
  }
  const a = /* @__PURE__ */ Object.create(null);
  n ??= /[%+]/.test(r);
  let i = r.indexOf("?", 8);
  for (; i !== -1; ) {
    const s = r.indexOf("&", i + 1);
    let o = r.indexOf("=", i);
    o > s && s !== -1 && (o = -1);
    let c = r.slice(
      i + 1,
      o === -1 ? s === -1 ? void 0 : s : o
    );
    if (n && (c = _decodeURI(c)), i = s, c === "")
      continue;
    let d;
    o === -1 ? d = "" : (d = r.slice(o + 1, s === -1 ? void 0 : s), n && (d = _decodeURI(d))), t ? (a[c] && Array.isArray(a[c]) || (a[c] = []), a[c].push(d)) : a[c] ??= d;
  }
  return e ? a[e] : a;
}, getQueryParam = _getQueryParam, getQueryParams = (r, e) => _getQueryParam(r, e, !0), decodeURIComponent_ = decodeURIComponent, validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/, relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/, validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/, trimCookieWhitespace = (r) => {
  let e = 0, t = r.length;
  for (; e < t; ) {
    const n = r.charCodeAt(e);
    if (n !== 32 && n !== 9)
      break;
    e++;
  }
  for (; t > e; ) {
    const n = r.charCodeAt(t - 1);
    if (n !== 32 && n !== 9)
      break;
    t--;
  }
  return e === 0 && t === r.length ? r : r.slice(e, t);
}, parse$1 = (r, e) => {
  if (e && r.indexOf(e) === -1)
    return {};
  const t = r.split(";"), n = /* @__PURE__ */ Object.create(null);
  for (const a of t) {
    const i = a.indexOf("=");
    if (i === -1)
      continue;
    const s = trimCookieWhitespace(a.substring(0, i));
    if (e && e !== s || !relaxedCookieNameRegEx.test(s) || s in n)
      continue;
    let o = trimCookieWhitespace(a.substring(i + 1));
    if (o.startsWith('"') && o.endsWith('"') && (o = o.slice(1, -1)), validCookieValueRegEx.test(o) && (n[s] = tryDecodeURIComponent(o), e))
      break;
  }
  return n;
}, _serialize = (r, e, t = {}) => {
  if (!validCookieNameRegEx.test(r))
    throw new Error("Invalid cookie name");
  let n = `${r}=${e}`;
  if (r.startsWith("__Secure-") && !t.secure)
    throw new Error("__Secure- Cookie must have Secure attributes");
  if (r.startsWith("__Host-")) {
    if (!t.secure)
      throw new Error("__Host- Cookie must have Secure attributes");
    if (t.path !== "/")
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    if (t.domain)
      throw new Error("__Host- Cookie must not have Domain attributes");
  }
  for (const a of ["domain", "path", "sameSite", "priority"])
    if (t[a] && /[;\r\n]/.test(t[a]))
      throw new Error(`${a} must not contain ";", "\\r", or "\\n"`);
  if (t && typeof t.maxAge == "number" && t.maxAge >= 0) {
    if (t.maxAge > 3456e4)
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    n += `; Max-Age=${t.maxAge | 0}`;
  }
  if (t.domain && t.prefix !== "host" && (n += `; Domain=${t.domain}`), t.path && (n += `; Path=${t.path}`), t.expires) {
    if (t.expires.getTime() - Date.now() > 3456e7)
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    n += `; Expires=${t.expires.toUTCString()}`;
  }
  if (t.httpOnly && (n += "; HttpOnly"), t.secure && (n += "; Secure"), t.sameSite && (n += `; SameSite=${t.sameSite.charAt(0).toUpperCase() + t.sameSite.slice(1)}`), t.priority && (n += `; Priority=${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}`), t.partitioned) {
    if (!t.secure)
      throw new Error("Partitioned Cookie must have Secure attributes");
    n += "; Partitioned";
  }
  return n;
}, serialize = (r, e, t) => (e = encodeURIComponent(e), _serialize(r, e, t)), getCookie = (r, e, t) => {
  const n = r.req.raw.headers.get("Cookie");
  if (typeof e == "string") {
    if (!n)
      return;
    let i = e;
    return t === "secure" ? i = "__Secure-" + e : t === "host" && (i = "__Host-" + e), parse$1(n, i)[i];
  }
  return n ? parse$1(n) : {};
}, generateCookie = (r, e, t) => {
  let n;
  return t?.prefix === "secure" ? n = serialize("__Secure-" + r, e, { path: "/", ...t, secure: !0 }) : t?.prefix === "host" ? n = serialize("__Host-" + r, e, {
    ...t,
    path: "/",
    secure: !0,
    domain: void 0
  }) : n = serialize(r, e, { path: "/", ...t }), n;
}, setCookie = (r, e, t, n) => {
  const a = generateCookie(e, t, n);
  r.header("Set-Cookie", a, { append: !0 });
}, deleteCookie = (r, e, t) => {
  const n = getCookie(r, e, t?.prefix);
  return setCookie(r, e, "", { ...t, maxAge: 0 }), n;
}, HTTPException = class extends Error {
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(r = 500, e) {
    super(e?.message, { cause: e?.cause }), this.res = e?.res, this.status = r;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    return this.res ? new Response(this.res.body, {
      status: this.status,
      headers: this.res.headers
    }) : new Response(this.message, {
      status: this.status
    });
  }
}, bufferToFormData = (r, e) => new Response(r, {
  headers: {
    // Normalize the media type (case-insensitive) while keeping parameters like the boundary
    "Content-Type": e.replace(/^[^;]+/, (n) => n.toLowerCase())
  }
}).formData(), jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/i, urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, validator = (r, e) => async (t, n) => {
  let a = {};
  const i = t.req.header("Content-Type");
  switch (r) {
    case "json":
      if (!i || !jsonRegex.test(i))
        break;
      try {
        a = await t.req.json();
      } catch {
        const o = "Malformed JSON in request body";
        throw new HTTPException(400, { message: o });
      }
      break;
    case "form": {
      if (!i || !(multipartRegex.test(i) || urlencodedRegex.test(i)))
        break;
      let o;
      if (t.req.bodyCache.formData)
        o = await t.req.bodyCache.formData;
      else
        try {
          const d = await t.req.arrayBuffer();
          o = await bufferToFormData(d, i), t.req.bodyCache.formData = o;
        } catch (d) {
          let u = "Malformed FormData request.";
          throw u += d instanceof Error ? ` ${d.message}` : ` ${String(d)}`, new HTTPException(400, { message: u });
        }
      const c = /* @__PURE__ */ Object.create(null);
      o.forEach((d, u) => {
        u.endsWith("[]") ? (c[u] ??= []).push(d) : Array.isArray(c[u]) ? c[u].push(d) : Object.hasOwn(c, u) ? c[u] = [c[u], d] : c[u] = d;
      }), a = c;
      break;
    }
    case "query":
      a = Object.fromEntries(
        Object.entries(t.req.queries()).map(([o, c]) => c.length === 1 ? [o, c[0]] : [o, c])
      );
      break;
    case "param":
      a = t.req.param();
      break;
    case "header":
      a = t.req.header();
      break;
    case "cookie":
      a = getCookie(t);
      break;
  }
  const s = await e(a, t);
  return s instanceof Response ? s : (t.req.addValidatedData(r, s), await n());
}, util;
(function(r) {
  r.assertEqual = (a) => {
  };
  function e(a) {
  }
  r.assertIs = e;
  function t(a) {
    throw new Error();
  }
  r.assertNever = t, r.arrayToEnum = (a) => {
    const i = {};
    for (const s of a)
      i[s] = s;
    return i;
  }, r.getValidEnumValues = (a) => {
    const i = r.objectKeys(a).filter((o) => typeof a[a[o]] != "number"), s = {};
    for (const o of i)
      s[o] = a[o];
    return r.objectValues(s);
  }, r.objectValues = (a) => r.objectKeys(a).map(function(i) {
    return a[i];
  }), r.objectKeys = typeof Object.keys == "function" ? (a) => Object.keys(a) : (a) => {
    const i = [];
    for (const s in a)
      Object.prototype.hasOwnProperty.call(a, s) && i.push(s);
    return i;
  }, r.find = (a, i) => {
    for (const s of a)
      if (i(s))
        return s;
  }, r.isInteger = typeof Number.isInteger == "function" ? (a) => Number.isInteger(a) : (a) => typeof a == "number" && Number.isFinite(a) && Math.floor(a) === a;
  function n(a, i = " | ") {
    return a.map((s) => typeof s == "string" ? `'${s}'` : s).join(i);
  }
  r.joinValues = n, r.jsonStringifyReplacer = (a, i) => typeof i == "bigint" ? i.toString() : i;
})(util || (util = {}));
var objectUtil;
(function(r) {
  r.mergeShapes = (e, t) => ({
    ...e,
    ...t
    // second overwrites first
  });
})(objectUtil || (objectUtil = {}));
const ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), getParsedType = (r) => {
  switch (typeof r) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(r) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      return Array.isArray(r) ? ZodParsedType.array : r === null ? ZodParsedType.null : r.then && typeof r.then == "function" && r.catch && typeof r.catch == "function" ? ZodParsedType.promise : typeof Map < "u" && r instanceof Map ? ZodParsedType.map : typeof Set < "u" && r instanceof Set ? ZodParsedType.set : typeof Date < "u" && r instanceof Date ? ZodParsedType.date : ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(e) {
    super(), this.issues = [], this.addIssue = (n) => {
      this.issues = [...this.issues, n];
    }, this.addIssues = (n = []) => {
      this.issues = [...this.issues, ...n];
    };
    const t = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, t) : this.__proto__ = t, this.name = "ZodError", this.issues = e;
  }
  format(e) {
    const t = e || function(i) {
      return i.message;
    }, n = { _errors: [] }, a = (i) => {
      for (const s of i.issues)
        if (s.code === "invalid_union")
          s.unionErrors.map(a);
        else if (s.code === "invalid_return_type")
          a(s.returnTypeError);
        else if (s.code === "invalid_arguments")
          a(s.argumentsError);
        else if (s.path.length === 0)
          n._errors.push(t(s));
        else {
          let o = n, c = 0;
          for (; c < s.path.length; ) {
            const d = s.path[c];
            c === s.path.length - 1 ? (o[d] = o[d] || { _errors: [] }, o[d]._errors.push(t(s))) : o[d] = o[d] || { _errors: [] }, o = o[d], c++;
          }
        }
    };
    return a(this), n;
  }
  static assert(e) {
    if (!(e instanceof ZodError))
      throw new Error(`Not a ZodError: ${e}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(e = (t) => t.message) {
    const t = {}, n = [];
    for (const a of this.issues)
      if (a.path.length > 0) {
        const i = a.path[0];
        t[i] = t[i] || [], t[i].push(e(a));
      } else
        n.push(e(a));
    return { formErrors: n, fieldErrors: t };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (r) => new ZodError(r);
const errorMap = (r, e) => {
  let t;
  switch (r.code) {
    case ZodIssueCode.invalid_type:
      r.received === ZodParsedType.undefined ? t = "Required" : t = `Expected ${r.expected}, received ${r.received}`;
      break;
    case ZodIssueCode.invalid_literal:
      t = `Invalid literal value, expected ${JSON.stringify(r.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      t = `Unrecognized key(s) in object: ${util.joinValues(r.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      t = "Invalid input";
      break;
    case ZodIssueCode.invalid_union_discriminator:
      t = `Invalid discriminator value. Expected ${util.joinValues(r.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      t = `Invalid enum value. Expected ${util.joinValues(r.options)}, received '${r.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      t = "Invalid function arguments";
      break;
    case ZodIssueCode.invalid_return_type:
      t = "Invalid function return type";
      break;
    case ZodIssueCode.invalid_date:
      t = "Invalid date";
      break;
    case ZodIssueCode.invalid_string:
      typeof r.validation == "object" ? "includes" in r.validation ? (t = `Invalid input: must include "${r.validation.includes}"`, typeof r.validation.position == "number" && (t = `${t} at one or more positions greater than or equal to ${r.validation.position}`)) : "startsWith" in r.validation ? t = `Invalid input: must start with "${r.validation.startsWith}"` : "endsWith" in r.validation ? t = `Invalid input: must end with "${r.validation.endsWith}"` : util.assertNever(r.validation) : r.validation !== "regex" ? t = `Invalid ${r.validation}` : t = "Invalid";
      break;
    case ZodIssueCode.too_small:
      r.type === "array" ? t = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "more than"} ${r.minimum} element(s)` : r.type === "string" ? t = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "over"} ${r.minimum} character(s)` : r.type === "number" ? t = `Number must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${r.minimum}` : r.type === "bigint" ? t = `Number must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${r.minimum}` : r.type === "date" ? t = `Date must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(r.minimum))}` : t = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      r.type === "array" ? t = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "less than"} ${r.maximum} element(s)` : r.type === "string" ? t = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "under"} ${r.maximum} character(s)` : r.type === "number" ? t = `Number must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "bigint" ? t = `BigInt must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "date" ? t = `Date must be ${r.exact ? "exactly" : r.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(r.maximum))}` : t = "Invalid input";
      break;
    case ZodIssueCode.custom:
      t = "Invalid input";
      break;
    case ZodIssueCode.invalid_intersection_types:
      t = "Intersection results could not be merged";
      break;
    case ZodIssueCode.not_multiple_of:
      t = `Number must be a multiple of ${r.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      t = "Number must be finite";
      break;
    default:
      t = e.defaultError, util.assertNever(r);
  }
  return { message: t };
};
let overrideErrorMap = errorMap;
function getErrorMap() {
  return overrideErrorMap;
}
const makeIssue = (r) => {
  const { data: e, path: t, errorMaps: n, issueData: a } = r, i = [...t, ...a.path || []], s = {
    ...a,
    path: i
  };
  if (a.message !== void 0)
    return {
      ...a,
      path: i,
      message: a.message
    };
  let o = "";
  const c = n.filter((d) => !!d).slice().reverse();
  for (const d of c)
    o = d(s, { data: e, defaultError: o }).message;
  return {
    ...a,
    path: i,
    message: o
  };
};
function addIssueToContext(r, e) {
  const t = getErrorMap(), n = makeIssue({
    issueData: e,
    data: r.data,
    path: r.path,
    errorMaps: [
      r.common.contextualErrorMap,
      // contextual error map is first priority
      r.schemaErrorMap,
      // then schema-bound map if available
      t,
      // then global override map
      t === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((a) => !!a)
  });
  r.common.issues.push(n);
}
class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(e, t) {
    const n = [];
    for (const a of t) {
      if (a.status === "aborted")
        return INVALID;
      a.status === "dirty" && e.dirty(), n.push(a.value);
    }
    return { status: e.value, value: n };
  }
  static async mergeObjectAsync(e, t) {
    const n = [];
    for (const a of t) {
      const i = await a.key, s = await a.value;
      n.push({
        key: i,
        value: s
      });
    }
    return ParseStatus.mergeObjectSync(e, n);
  }
  static mergeObjectSync(e, t) {
    const n = {};
    for (const a of t) {
      const { key: i, value: s } = a;
      if (i.status === "aborted" || s.status === "aborted")
        return INVALID;
      i.status === "dirty" && e.dirty(), s.status === "dirty" && e.dirty(), i.value !== "__proto__" && (typeof s.value < "u" || a.alwaysSet) && (n[i.value] = s.value);
    }
    return { status: e.value, value: n };
  }
}
const INVALID = Object.freeze({
  status: "aborted"
}), DIRTY = (r) => ({ status: "dirty", value: r }), OK = (r) => ({ status: "valid", value: r }), isAborted = (r) => r.status === "aborted", isDirty = (r) => r.status === "dirty", isValid = (r) => r.status === "valid", isAsync = (r) => typeof Promise < "u" && r instanceof Promise;
var errorUtil;
(function(r) {
  r.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, r.toString = (e) => typeof e == "string" ? e : e?.message;
})(errorUtil || (errorUtil = {}));
class ParseInputLazyPath {
  constructor(e, t, n, a) {
    this._cachedPath = [], this.parent = e, this.data = t, this._path = n, this._key = a;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const handleResult = (r, e) => {
  if (isValid(e))
    return { success: !0, data: e.value };
  if (!r.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const t = new ZodError(r.common.issues);
      return this._error = t, this._error;
    }
  };
};
function processCreateParams(r) {
  if (!r)
    return {};
  const { errorMap: e, invalid_type_error: t, required_error: n, description: a } = r;
  if (e && (t || n))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return e ? { errorMap: e, description: a } : { errorMap: (s, o) => {
    const { message: c } = r;
    return s.code === "invalid_enum_value" ? { message: c ?? o.defaultError } : typeof o.data > "u" ? { message: c ?? n ?? o.defaultError } : s.code !== "invalid_type" ? { message: o.defaultError } : { message: c ?? t ?? o.defaultError };
  }, description: a };
}
class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(e) {
    return getParsedType(e.data);
  }
  _getOrReturnCtx(e, t) {
    return t || {
      common: e.parent.common,
      data: e.data,
      parsedType: getParsedType(e.data),
      schemaErrorMap: this._def.errorMap,
      path: e.path,
      parent: e.parent
    };
  }
  _processInputParams(e) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: e.parent.common,
        data: e.data,
        parsedType: getParsedType(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent
      }
    };
  }
  _parseSync(e) {
    const t = this._parse(e);
    if (isAsync(t))
      throw new Error("Synchronous parse encountered promise.");
    return t;
  }
  _parseAsync(e) {
    const t = this._parse(e);
    return Promise.resolve(t);
  }
  parse(e, t) {
    const n = this.safeParse(e, t);
    if (n.success)
      return n.data;
    throw n.error;
  }
  safeParse(e, t) {
    const n = {
      common: {
        issues: [],
        async: t?.async ?? !1,
        contextualErrorMap: t?.errorMap
      },
      path: t?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: getParsedType(e)
    }, a = this._parseSync({ data: e, path: n.path, parent: n });
    return handleResult(n, a);
  }
  "~validate"(e) {
    const t = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: getParsedType(e)
    };
    if (!this["~standard"].async)
      try {
        const n = this._parseSync({ data: e, path: [], parent: t });
        return isValid(n) ? {
          value: n.value
        } : {
          issues: t.common.issues
        };
      } catch (n) {
        n?.message?.toLowerCase()?.includes("encountered") && (this["~standard"].async = !0), t.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: e, path: [], parent: t }).then((n) => isValid(n) ? {
      value: n.value
    } : {
      issues: t.common.issues
    });
  }
  async parseAsync(e, t) {
    const n = await this.safeParseAsync(e, t);
    if (n.success)
      return n.data;
    throw n.error;
  }
  async safeParseAsync(e, t) {
    const n = {
      common: {
        issues: [],
        contextualErrorMap: t?.errorMap,
        async: !0
      },
      path: t?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: getParsedType(e)
    }, a = this._parse({ data: e, path: n.path, parent: n }), i = await (isAsync(a) ? a : Promise.resolve(a));
    return handleResult(n, i);
  }
  refine(e, t) {
    const n = (a) => typeof t == "string" || typeof t > "u" ? { message: t } : typeof t == "function" ? t(a) : t;
    return this._refinement((a, i) => {
      const s = e(a), o = () => i.addIssue({
        code: ZodIssueCode.custom,
        ...n(a)
      });
      return typeof Promise < "u" && s instanceof Promise ? s.then((c) => c ? !0 : (o(), !1)) : s ? !0 : (o(), !1);
    });
  }
  refinement(e, t) {
    return this._refinement((n, a) => e(n) ? !0 : (a.addIssue(typeof t == "function" ? t(n, a) : t), !1));
  }
  _refinement(e) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement: e }
    });
  }
  superRefine(e) {
    return this._refinement(e);
  }
  constructor(e) {
    this.spa = this.safeParseAsync, this._def = e, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (t) => this["~validate"](t)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(e) {
    return ZodUnion.create([this, e], this._def);
  }
  and(e) {
    return ZodIntersection.create(this, e, this._def);
  }
  transform(e) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform: e }
    });
  }
  default(e) {
    const t = typeof e == "function" ? e : () => e;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: t,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(e) {
    const t = typeof e == "function" ? e : () => e;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: t,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(e) {
    const t = this.constructor;
    return new t({
      ...this._def,
      description: e
    });
  }
  pipe(e) {
    return ZodPipeline.create(this, e);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const cuidRegex = /^c[^\s-]{8,}$/i, cuid2Regex = /^[0-9a-z]+$/, ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i, uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, nanoidRegex = /^[a-z0-9_-]{21}$/i, jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, _emojiRegex = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let emojiRegex;
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, dateRegexSource = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(r) {
  let e = "[0-5]\\d";
  r.precision ? e = `${e}\\.\\d{${r.precision}}` : r.precision == null && (e = `${e}(\\.\\d+)?`);
  const t = r.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${e})${t}`;
}
function timeRegex(r) {
  return new RegExp(`^${timeRegexSource(r)}$`);
}
function datetimeRegex(r) {
  let e = `${dateRegexSource}T${timeRegexSource(r)}`;
  const t = [];
  return t.push(r.local ? "Z?" : "Z"), r.offset && t.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${t.join("|")})`, new RegExp(`^${e}$`);
}
function isValidIP(r, e) {
  return !!((e === "v4" || !e) && ipv4Regex.test(r) || (e === "v6" || !e) && ipv6Regex.test(r));
}
function isValidJWT(r, e) {
  if (!jwtRegex.test(r))
    return !1;
  try {
    const [t] = r.split(".");
    if (!t)
      return !1;
    const n = t.replace(/-/g, "+").replace(/_/g, "/").padEnd(t.length + (4 - t.length % 4) % 4, "="), a = JSON.parse(atob(n));
    return !(typeof a != "object" || a === null || "typ" in a && a?.typ !== "JWT" || !a.alg || e && a.alg !== e);
  } catch {
    return !1;
  }
}
function isValidCidr(r, e) {
  return !!((e === "v4" || !e) && ipv4CidrRegex.test(r) || (e === "v6" || !e) && ipv6CidrRegex.test(r));
}
class ZodString extends ZodType {
  _parse(e) {
    if (this._def.coerce && (e.data = String(e.data)), this._getType(e) !== ZodParsedType.string) {
      const i = this._getOrReturnCtx(e);
      return addIssueToContext(i, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: i.parsedType
      }), INVALID;
    }
    const n = new ParseStatus();
    let a;
    for (const i of this._def.checks)
      if (i.kind === "min")
        e.data.length < i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          code: ZodIssueCode.too_small,
          minimum: i.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: i.message
        }), n.dirty());
      else if (i.kind === "max")
        e.data.length > i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          code: ZodIssueCode.too_big,
          maximum: i.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: i.message
        }), n.dirty());
      else if (i.kind === "length") {
        const s = e.data.length > i.value, o = e.data.length < i.value;
        (s || o) && (a = this._getOrReturnCtx(e, a), s ? addIssueToContext(a, {
          code: ZodIssueCode.too_big,
          maximum: i.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: i.message
        }) : o && addIssueToContext(a, {
          code: ZodIssueCode.too_small,
          minimum: i.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: i.message
        }), n.dirty());
      } else if (i.kind === "email")
        emailRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "email",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "emoji")
        emojiRegex || (emojiRegex = new RegExp(_emojiRegex, "u")), emojiRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "emoji",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "uuid")
        uuidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "uuid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "nanoid")
        nanoidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "nanoid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "cuid")
        cuidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "cuid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "cuid2")
        cuid2Regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "cuid2",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "ulid")
        ulidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "ulid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), n.dirty());
      else if (i.kind === "url")
        try {
          new URL(e.data);
        } catch {
          a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: i.message
          }), n.dirty();
        }
      else i.kind === "regex" ? (i.regex.lastIndex = 0, i.regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "regex",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty())) : i.kind === "trim" ? e.data = e.data.trim() : i.kind === "includes" ? e.data.includes(i.value, i.position) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { includes: i.value, position: i.position },
        message: i.message
      }), n.dirty()) : i.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : i.kind === "toUpperCase" ? e.data = e.data.toUpperCase() : i.kind === "startsWith" ? e.data.startsWith(i.value) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { startsWith: i.value },
        message: i.message
      }), n.dirty()) : i.kind === "endsWith" ? e.data.endsWith(i.value) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { endsWith: i.value },
        message: i.message
      }), n.dirty()) : i.kind === "datetime" ? datetimeRegex(i).test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "datetime",
        message: i.message
      }), n.dirty()) : i.kind === "date" ? dateRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "date",
        message: i.message
      }), n.dirty()) : i.kind === "time" ? timeRegex(i).test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "time",
        message: i.message
      }), n.dirty()) : i.kind === "duration" ? durationRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "duration",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : i.kind === "ip" ? isValidIP(e.data, i.version) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "ip",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : i.kind === "jwt" ? isValidJWT(e.data, i.alg) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "jwt",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : i.kind === "cidr" ? isValidCidr(e.data, i.version) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "cidr",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : i.kind === "base64" ? base64Regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "base64",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : i.kind === "base64url" ? base64urlRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "base64url",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), n.dirty()) : util.assertNever(i);
    return { status: n.value, value: e.data };
  }
  _regex(e, t, n) {
    return this.refinement((a) => e.test(a), {
      validation: t,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(n)
    });
  }
  _addCheck(e) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  email(e) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(e) });
  }
  url(e) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(e) });
  }
  emoji(e) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(e) });
  }
  uuid(e) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(e) });
  }
  nanoid(e) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(e) });
  }
  cuid(e) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(e) });
  }
  cuid2(e) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(e) });
  }
  ulid(e) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(e) });
  }
  base64(e) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(e) });
  }
  base64url(e) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(e)
    });
  }
  jwt(e) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(e) });
  }
  ip(e) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(e) });
  }
  cidr(e) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(e) });
  }
  datetime(e) {
    return typeof e == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: e
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof e?.precision > "u" ? null : e?.precision,
      offset: e?.offset ?? !1,
      local: e?.local ?? !1,
      ...errorUtil.errToObj(e?.message)
    });
  }
  date(e) {
    return this._addCheck({ kind: "date", message: e });
  }
  time(e) {
    return typeof e == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: e
    }) : this._addCheck({
      kind: "time",
      precision: typeof e?.precision > "u" ? null : e?.precision,
      ...errorUtil.errToObj(e?.message)
    });
  }
  duration(e) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(e) });
  }
  regex(e, t) {
    return this._addCheck({
      kind: "regex",
      regex: e,
      ...errorUtil.errToObj(t)
    });
  }
  includes(e, t) {
    return this._addCheck({
      kind: "includes",
      value: e,
      position: t?.position,
      ...errorUtil.errToObj(t?.message)
    });
  }
  startsWith(e, t) {
    return this._addCheck({
      kind: "startsWith",
      value: e,
      ...errorUtil.errToObj(t)
    });
  }
  endsWith(e, t) {
    return this._addCheck({
      kind: "endsWith",
      value: e,
      ...errorUtil.errToObj(t)
    });
  }
  min(e, t) {
    return this._addCheck({
      kind: "min",
      value: e,
      ...errorUtil.errToObj(t)
    });
  }
  max(e, t) {
    return this._addCheck({
      kind: "max",
      value: e,
      ...errorUtil.errToObj(t)
    });
  }
  length(e, t) {
    return this._addCheck({
      kind: "length",
      value: e,
      ...errorUtil.errToObj(t)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(e) {
    return this.min(1, errorUtil.errToObj(e));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((e) => e.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((e) => e.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((e) => e.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((e) => e.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((e) => e.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((e) => e.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((e) => e.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((e) => e.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((e) => e.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((e) => e.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((e) => e.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((e) => e.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((e) => e.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((e) => e.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((e) => e.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((e) => e.kind === "base64url");
  }
  get minLength() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "min" && (e === null || t.value > e) && (e = t.value);
    return e;
  }
  get maxLength() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "max" && (e === null || t.value < e) && (e = t.value);
    return e;
  }
}
ZodString.create = (r) => new ZodString({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodString,
  coerce: r?.coerce ?? !1,
  ...processCreateParams(r)
});
function floatSafeRemainder(r, e) {
  const t = (r.toString().split(".")[1] || "").length, n = (e.toString().split(".")[1] || "").length, a = t > n ? t : n, i = Number.parseInt(r.toFixed(a).replace(".", "")), s = Number.parseInt(e.toFixed(a).replace(".", ""));
  return i % s / 10 ** a;
}
class ZodNumber extends ZodType {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(e) {
    if (this._def.coerce && (e.data = Number(e.data)), this._getType(e) !== ZodParsedType.number) {
      const i = this._getOrReturnCtx(e);
      return addIssueToContext(i, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: i.parsedType
      }), INVALID;
    }
    let n;
    const a = new ParseStatus();
    for (const i of this._def.checks)
      i.kind === "int" ? util.isInteger(e.data) || (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: "integer",
        received: "float",
        message: i.message
      }), a.dirty()) : i.kind === "min" ? (i.inclusive ? e.data < i.value : e.data <= i.value) && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.too_small,
        minimum: i.value,
        type: "number",
        inclusive: i.inclusive,
        exact: !1,
        message: i.message
      }), a.dirty()) : i.kind === "max" ? (i.inclusive ? e.data > i.value : e.data >= i.value) && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.too_big,
        maximum: i.value,
        type: "number",
        inclusive: i.inclusive,
        exact: !1,
        message: i.message
      }), a.dirty()) : i.kind === "multipleOf" ? floatSafeRemainder(e.data, i.value) !== 0 && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.not_multiple_of,
        multipleOf: i.value,
        message: i.message
      }), a.dirty()) : i.kind === "finite" ? Number.isFinite(e.data) || (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.not_finite,
        message: i.message
      }), a.dirty()) : util.assertNever(i);
    return { status: a.value, value: e.data };
  }
  gte(e, t) {
    return this.setLimit("min", e, !0, errorUtil.toString(t));
  }
  gt(e, t) {
    return this.setLimit("min", e, !1, errorUtil.toString(t));
  }
  lte(e, t) {
    return this.setLimit("max", e, !0, errorUtil.toString(t));
  }
  lt(e, t) {
    return this.setLimit("max", e, !1, errorUtil.toString(t));
  }
  setLimit(e, t, n, a) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: t,
          inclusive: n,
          message: errorUtil.toString(a)
        }
      ]
    });
  }
  _addCheck(e) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  int(e) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(e)
    });
  }
  positive(e) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: errorUtil.toString(e)
    });
  }
  negative(e) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: errorUtil.toString(e)
    });
  }
  nonpositive(e) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: errorUtil.toString(e)
    });
  }
  nonnegative(e) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: errorUtil.toString(e)
    });
  }
  multipleOf(e, t) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: errorUtil.toString(t)
    });
  }
  finite(e) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(e)
    });
  }
  safe(e) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(e)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(e)
    });
  }
  get minValue() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "min" && (e === null || t.value > e) && (e = t.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "max" && (e === null || t.value < e) && (e = t.value);
    return e;
  }
  get isInt() {
    return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && util.isInteger(e.value));
  }
  get isFinite() {
    let e = null, t = null;
    for (const n of this._def.checks) {
      if (n.kind === "finite" || n.kind === "int" || n.kind === "multipleOf")
        return !0;
      n.kind === "min" ? (t === null || n.value > t) && (t = n.value) : n.kind === "max" && (e === null || n.value < e) && (e = n.value);
    }
    return Number.isFinite(t) && Number.isFinite(e);
  }
}
ZodNumber.create = (r) => new ZodNumber({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodNumber,
  coerce: r?.coerce || !1,
  ...processCreateParams(r)
});
class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(e) {
    if (this._def.coerce)
      try {
        e.data = BigInt(e.data);
      } catch {
        return this._getInvalidInput(e);
      }
    if (this._getType(e) !== ZodParsedType.bigint)
      return this._getInvalidInput(e);
    let n;
    const a = new ParseStatus();
    for (const i of this._def.checks)
      i.kind === "min" ? (i.inclusive ? e.data < i.value : e.data <= i.value) && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.too_small,
        type: "bigint",
        minimum: i.value,
        inclusive: i.inclusive,
        message: i.message
      }), a.dirty()) : i.kind === "max" ? (i.inclusive ? e.data > i.value : e.data >= i.value) && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.too_big,
        type: "bigint",
        maximum: i.value,
        inclusive: i.inclusive,
        message: i.message
      }), a.dirty()) : i.kind === "multipleOf" ? e.data % i.value !== BigInt(0) && (n = this._getOrReturnCtx(e, n), addIssueToContext(n, {
        code: ZodIssueCode.not_multiple_of,
        multipleOf: i.value,
        message: i.message
      }), a.dirty()) : util.assertNever(i);
    return { status: a.value, value: e.data };
  }
  _getInvalidInput(e) {
    const t = this._getOrReturnCtx(e);
    return addIssueToContext(t, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: t.parsedType
    }), INVALID;
  }
  gte(e, t) {
    return this.setLimit("min", e, !0, errorUtil.toString(t));
  }
  gt(e, t) {
    return this.setLimit("min", e, !1, errorUtil.toString(t));
  }
  lte(e, t) {
    return this.setLimit("max", e, !0, errorUtil.toString(t));
  }
  lt(e, t) {
    return this.setLimit("max", e, !1, errorUtil.toString(t));
  }
  setLimit(e, t, n, a) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: t,
          inclusive: n,
          message: errorUtil.toString(a)
        }
      ]
    });
  }
  _addCheck(e) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  positive(e) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: errorUtil.toString(e)
    });
  }
  negative(e) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: errorUtil.toString(e)
    });
  }
  nonpositive(e) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: errorUtil.toString(e)
    });
  }
  nonnegative(e) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: errorUtil.toString(e)
    });
  }
  multipleOf(e, t) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: errorUtil.toString(t)
    });
  }
  get minValue() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "min" && (e === null || t.value > e) && (e = t.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "max" && (e === null || t.value < e) && (e = t.value);
    return e;
  }
}
ZodBigInt.create = (r) => new ZodBigInt({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodBigInt,
  coerce: r?.coerce ?? !1,
  ...processCreateParams(r)
});
class ZodBoolean extends ZodType {
  _parse(e) {
    if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== ZodParsedType.boolean) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: n.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodBoolean.create = (r) => new ZodBoolean({
  typeName: ZodFirstPartyTypeKind.ZodBoolean,
  coerce: r?.coerce || !1,
  ...processCreateParams(r)
});
class ZodDate extends ZodType {
  _parse(e) {
    if (this._def.coerce && (e.data = new Date(e.data)), this._getType(e) !== ZodParsedType.date) {
      const i = this._getOrReturnCtx(e);
      return addIssueToContext(i, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: i.parsedType
      }), INVALID;
    }
    if (Number.isNaN(e.data.getTime())) {
      const i = this._getOrReturnCtx(e);
      return addIssueToContext(i, {
        code: ZodIssueCode.invalid_date
      }), INVALID;
    }
    const n = new ParseStatus();
    let a;
    for (const i of this._def.checks)
      i.kind === "min" ? e.data.getTime() < i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.too_small,
        message: i.message,
        inclusive: !0,
        exact: !1,
        minimum: i.value,
        type: "date"
      }), n.dirty()) : i.kind === "max" ? e.data.getTime() > i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.too_big,
        message: i.message,
        inclusive: !0,
        exact: !1,
        maximum: i.value,
        type: "date"
      }), n.dirty()) : util.assertNever(i);
    return {
      status: n.value,
      value: new Date(e.data.getTime())
    };
  }
  _addCheck(e) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  min(e, t) {
    return this._addCheck({
      kind: "min",
      value: e.getTime(),
      message: errorUtil.toString(t)
    });
  }
  max(e, t) {
    return this._addCheck({
      kind: "max",
      value: e.getTime(),
      message: errorUtil.toString(t)
    });
  }
  get minDate() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "min" && (e === null || t.value > e) && (e = t.value);
    return e != null ? new Date(e) : null;
  }
  get maxDate() {
    let e = null;
    for (const t of this._def.checks)
      t.kind === "max" && (e === null || t.value < e) && (e = t.value);
    return e != null ? new Date(e) : null;
  }
}
ZodDate.create = (r) => new ZodDate({
  checks: [],
  coerce: r?.coerce || !1,
  typeName: ZodFirstPartyTypeKind.ZodDate,
  ...processCreateParams(r)
});
class ZodSymbol extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.symbol) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: n.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodSymbol.create = (r) => new ZodSymbol({
  typeName: ZodFirstPartyTypeKind.ZodSymbol,
  ...processCreateParams(r)
});
class ZodUndefined extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.undefined) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: n.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodUndefined.create = (r) => new ZodUndefined({
  typeName: ZodFirstPartyTypeKind.ZodUndefined,
  ...processCreateParams(r)
});
class ZodNull extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.null) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: n.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodNull.create = (r) => new ZodNull({
  typeName: ZodFirstPartyTypeKind.ZodNull,
  ...processCreateParams(r)
});
class ZodAny extends ZodType {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodAny.create = (r) => new ZodAny({
  typeName: ZodFirstPartyTypeKind.ZodAny,
  ...processCreateParams(r)
});
class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodUnknown.create = (r) => new ZodUnknown({
  typeName: ZodFirstPartyTypeKind.ZodUnknown,
  ...processCreateParams(r)
});
class ZodNever extends ZodType {
  _parse(e) {
    const t = this._getOrReturnCtx(e);
    return addIssueToContext(t, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: t.parsedType
    }), INVALID;
  }
}
ZodNever.create = (r) => new ZodNever({
  typeName: ZodFirstPartyTypeKind.ZodNever,
  ...processCreateParams(r)
});
class ZodVoid extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.undefined) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: n.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodVoid.create = (r) => new ZodVoid({
  typeName: ZodFirstPartyTypeKind.ZodVoid,
  ...processCreateParams(r)
});
class ZodArray extends ZodType {
  _parse(e) {
    const { ctx: t, status: n } = this._processInputParams(e), a = this._def;
    if (t.parsedType !== ZodParsedType.array)
      return addIssueToContext(t, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: t.parsedType
      }), INVALID;
    if (a.exactLength !== null) {
      const s = t.data.length > a.exactLength.value, o = t.data.length < a.exactLength.value;
      (s || o) && (addIssueToContext(t, {
        code: s ? ZodIssueCode.too_big : ZodIssueCode.too_small,
        minimum: o ? a.exactLength.value : void 0,
        maximum: s ? a.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: a.exactLength.message
      }), n.dirty());
    }
    if (a.minLength !== null && t.data.length < a.minLength.value && (addIssueToContext(t, {
      code: ZodIssueCode.too_small,
      minimum: a.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.minLength.message
    }), n.dirty()), a.maxLength !== null && t.data.length > a.maxLength.value && (addIssueToContext(t, {
      code: ZodIssueCode.too_big,
      maximum: a.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.maxLength.message
    }), n.dirty()), t.common.async)
      return Promise.all([...t.data].map((s, o) => a.type._parseAsync(new ParseInputLazyPath(t, s, t.path, o)))).then((s) => ParseStatus.mergeArray(n, s));
    const i = [...t.data].map((s, o) => a.type._parseSync(new ParseInputLazyPath(t, s, t.path, o)));
    return ParseStatus.mergeArray(n, i);
  }
  get element() {
    return this._def.type;
  }
  min(e, t) {
    return new ZodArray({
      ...this._def,
      minLength: { value: e, message: errorUtil.toString(t) }
    });
  }
  max(e, t) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: e, message: errorUtil.toString(t) }
    });
  }
  length(e, t) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: e, message: errorUtil.toString(t) }
    });
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
ZodArray.create = (r, e) => new ZodArray({
  type: r,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: ZodFirstPartyTypeKind.ZodArray,
  ...processCreateParams(e)
});
function deepPartialify(r) {
  if (r instanceof ZodObject) {
    const e = {};
    for (const t in r.shape) {
      const n = r.shape[t];
      e[t] = ZodOptional.create(deepPartialify(n));
    }
    return new ZodObject({
      ...r._def,
      shape: () => e
    });
  } else return r instanceof ZodArray ? new ZodArray({
    ...r._def,
    type: deepPartialify(r.element)
  }) : r instanceof ZodOptional ? ZodOptional.create(deepPartialify(r.unwrap())) : r instanceof ZodNullable ? ZodNullable.create(deepPartialify(r.unwrap())) : r instanceof ZodTuple ? ZodTuple.create(r.items.map((e) => deepPartialify(e))) : r;
}
class ZodObject extends ZodType {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const e = this._def.shape(), t = util.objectKeys(e);
    return this._cached = { shape: e, keys: t }, this._cached;
  }
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.object) {
      const d = this._getOrReturnCtx(e);
      return addIssueToContext(d, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: d.parsedType
      }), INVALID;
    }
    const { status: n, ctx: a } = this._processInputParams(e), { shape: i, keys: s } = this._getCached(), o = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip"))
      for (const d in a.data)
        s.includes(d) || o.push(d);
    const c = [];
    for (const d of s) {
      const u = i[d], f = a.data[d];
      c.push({
        key: { status: "valid", value: d },
        value: u._parse(new ParseInputLazyPath(a, f, a.path, d)),
        alwaysSet: d in a.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const d = this._def.unknownKeys;
      if (d === "passthrough")
        for (const u of o)
          c.push({
            key: { status: "valid", value: u },
            value: { status: "valid", value: a.data[u] }
          });
      else if (d === "strict")
        o.length > 0 && (addIssueToContext(a, {
          code: ZodIssueCode.unrecognized_keys,
          keys: o
        }), n.dirty());
      else if (d !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const d = this._def.catchall;
      for (const u of o) {
        const f = a.data[u];
        c.push({
          key: { status: "valid", value: u },
          value: d._parse(
            new ParseInputLazyPath(a, f, a.path, u)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: u in a.data
        });
      }
    }
    return a.common.async ? Promise.resolve().then(async () => {
      const d = [];
      for (const u of c) {
        const f = await u.key, h = await u.value;
        d.push({
          key: f,
          value: h,
          alwaysSet: u.alwaysSet
        });
      }
      return d;
    }).then((d) => ParseStatus.mergeObjectSync(n, d)) : ParseStatus.mergeObjectSync(n, c);
  }
  get shape() {
    return this._def.shape();
  }
  strict(e) {
    return errorUtil.errToObj, new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...e !== void 0 ? {
        errorMap: (t, n) => {
          const a = this._def.errorMap?.(t, n).message ?? n.defaultError;
          return t.code === "unrecognized_keys" ? {
            message: errorUtil.errToObj(e).message ?? a
          } : {
            message: a
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(e) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...e
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(e) {
    return new ZodObject({
      unknownKeys: e._def.unknownKeys,
      catchall: e._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...e._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(e, t) {
    return this.augment({ [e]: t });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(e) {
    return new ZodObject({
      ...this._def,
      catchall: e
    });
  }
  pick(e) {
    const t = {};
    for (const n of util.objectKeys(e))
      e[n] && this.shape[n] && (t[n] = this.shape[n]);
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  omit(e) {
    const t = {};
    for (const n of util.objectKeys(this.shape))
      e[n] || (t[n] = this.shape[n]);
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(e) {
    const t = {};
    for (const n of util.objectKeys(this.shape)) {
      const a = this.shape[n];
      e && !e[n] ? t[n] = a : t[n] = a.optional();
    }
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  required(e) {
    const t = {};
    for (const n of util.objectKeys(this.shape))
      if (e && !e[n])
        t[n] = this.shape[n];
      else {
        let i = this.shape[n];
        for (; i instanceof ZodOptional; )
          i = i._def.innerType;
        t[n] = i;
      }
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (r, e) => new ZodObject({
  shape: () => r,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.strictCreate = (r, e) => new ZodObject({
  shape: () => r,
  unknownKeys: "strict",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.lazycreate = (r, e) => new ZodObject({
  shape: r,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
class ZodUnion extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), n = this._def.options;
    function a(i) {
      for (const o of i)
        if (o.result.status === "valid")
          return o.result;
      for (const o of i)
        if (o.result.status === "dirty")
          return t.common.issues.push(...o.ctx.common.issues), o.result;
      const s = i.map((o) => new ZodError(o.ctx.common.issues));
      return addIssueToContext(t, {
        code: ZodIssueCode.invalid_union,
        unionErrors: s
      }), INVALID;
    }
    if (t.common.async)
      return Promise.all(n.map(async (i) => {
        const s = {
          ...t,
          common: {
            ...t.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await i._parseAsync({
            data: t.data,
            path: t.path,
            parent: s
          }),
          ctx: s
        };
      })).then(a);
    {
      let i;
      const s = [];
      for (const c of n) {
        const d = {
          ...t,
          common: {
            ...t.common,
            issues: []
          },
          parent: null
        }, u = c._parseSync({
          data: t.data,
          path: t.path,
          parent: d
        });
        if (u.status === "valid")
          return u;
        u.status === "dirty" && !i && (i = { result: u, ctx: d }), d.common.issues.length && s.push(d.common.issues);
      }
      if (i)
        return t.common.issues.push(...i.ctx.common.issues), i.result;
      const o = s.map((c) => new ZodError(c));
      return addIssueToContext(t, {
        code: ZodIssueCode.invalid_union,
        unionErrors: o
      }), INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (r, e) => new ZodUnion({
  options: r,
  typeName: ZodFirstPartyTypeKind.ZodUnion,
  ...processCreateParams(e)
});
function mergeValues(r, e) {
  const t = getParsedType(r), n = getParsedType(e);
  if (r === e)
    return { valid: !0, data: r };
  if (t === ZodParsedType.object && n === ZodParsedType.object) {
    const a = util.objectKeys(e), i = util.objectKeys(r).filter((o) => a.indexOf(o) !== -1), s = { ...r, ...e };
    for (const o of i) {
      const c = mergeValues(r[o], e[o]);
      if (!c.valid)
        return { valid: !1 };
      s[o] = c.data;
    }
    return { valid: !0, data: s };
  } else if (t === ZodParsedType.array && n === ZodParsedType.array) {
    if (r.length !== e.length)
      return { valid: !1 };
    const a = [];
    for (let i = 0; i < r.length; i++) {
      const s = r[i], o = e[i], c = mergeValues(s, o);
      if (!c.valid)
        return { valid: !1 };
      a.push(c.data);
    }
    return { valid: !0, data: a };
  } else return t === ZodParsedType.date && n === ZodParsedType.date && +r == +e ? { valid: !0, data: r } : { valid: !1 };
}
class ZodIntersection extends ZodType {
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e), a = (i, s) => {
      if (isAborted(i) || isAborted(s))
        return INVALID;
      const o = mergeValues(i.value, s.value);
      return o.valid ? ((isDirty(i) || isDirty(s)) && t.dirty(), { status: t.value, value: o.data }) : (addIssueToContext(n, {
        code: ZodIssueCode.invalid_intersection_types
      }), INVALID);
    };
    return n.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: n.data,
        path: n.path,
        parent: n
      }),
      this._def.right._parseAsync({
        data: n.data,
        path: n.path,
        parent: n
      })
    ]).then(([i, s]) => a(i, s)) : a(this._def.left._parseSync({
      data: n.data,
      path: n.path,
      parent: n
    }), this._def.right._parseSync({
      data: n.data,
      path: n.path,
      parent: n
    }));
  }
}
ZodIntersection.create = (r, e, t) => new ZodIntersection({
  left: r,
  right: e,
  typeName: ZodFirstPartyTypeKind.ZodIntersection,
  ...processCreateParams(t)
});
class ZodTuple extends ZodType {
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e);
    if (n.parsedType !== ZodParsedType.array)
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: n.parsedType
      }), INVALID;
    if (n.data.length < this._def.items.length)
      return addIssueToContext(n, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), INVALID;
    !this._def.rest && n.data.length > this._def.items.length && (addIssueToContext(n, {
      code: ZodIssueCode.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), t.dirty());
    const i = [...n.data].map((s, o) => {
      const c = this._def.items[o] || this._def.rest;
      return c ? c._parse(new ParseInputLazyPath(n, s, n.path, o)) : null;
    }).filter((s) => !!s);
    return n.common.async ? Promise.all(i).then((s) => ParseStatus.mergeArray(t, s)) : ParseStatus.mergeArray(t, i);
  }
  get items() {
    return this._def.items;
  }
  rest(e) {
    return new ZodTuple({
      ...this._def,
      rest: e
    });
  }
}
ZodTuple.create = (r, e) => {
  if (!Array.isArray(r))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new ZodTuple({
    items: r,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(e)
  });
};
class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e);
    if (n.parsedType !== ZodParsedType.object)
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: n.parsedType
      }), INVALID;
    const a = [], i = this._def.keyType, s = this._def.valueType;
    for (const o in n.data)
      a.push({
        key: i._parse(new ParseInputLazyPath(n, o, n.path, o)),
        value: s._parse(new ParseInputLazyPath(n, n.data[o], n.path, o)),
        alwaysSet: o in n.data
      });
    return n.common.async ? ParseStatus.mergeObjectAsync(t, a) : ParseStatus.mergeObjectSync(t, a);
  }
  get element() {
    return this._def.valueType;
  }
  static create(e, t, n) {
    return t instanceof ZodType ? new ZodRecord({
      keyType: e,
      valueType: t,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(n)
    }) : new ZodRecord({
      keyType: ZodString.create(),
      valueType: e,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(t)
    });
  }
}
class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e);
    if (n.parsedType !== ZodParsedType.map)
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: n.parsedType
      }), INVALID;
    const a = this._def.keyType, i = this._def.valueType, s = [...n.data.entries()].map(([o, c], d) => ({
      key: a._parse(new ParseInputLazyPath(n, o, n.path, [d, "key"])),
      value: i._parse(new ParseInputLazyPath(n, c, n.path, [d, "value"]))
    }));
    if (n.common.async) {
      const o = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const c of s) {
          const d = await c.key, u = await c.value;
          if (d.status === "aborted" || u.status === "aborted")
            return INVALID;
          (d.status === "dirty" || u.status === "dirty") && t.dirty(), o.set(d.value, u.value);
        }
        return { status: t.value, value: o };
      });
    } else {
      const o = /* @__PURE__ */ new Map();
      for (const c of s) {
        const d = c.key, u = c.value;
        if (d.status === "aborted" || u.status === "aborted")
          return INVALID;
        (d.status === "dirty" || u.status === "dirty") && t.dirty(), o.set(d.value, u.value);
      }
      return { status: t.value, value: o };
    }
  }
}
ZodMap.create = (r, e, t) => new ZodMap({
  valueType: e,
  keyType: r,
  typeName: ZodFirstPartyTypeKind.ZodMap,
  ...processCreateParams(t)
});
class ZodSet extends ZodType {
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e);
    if (n.parsedType !== ZodParsedType.set)
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: n.parsedType
      }), INVALID;
    const a = this._def;
    a.minSize !== null && n.data.size < a.minSize.value && (addIssueToContext(n, {
      code: ZodIssueCode.too_small,
      minimum: a.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: a.minSize.message
    }), t.dirty()), a.maxSize !== null && n.data.size > a.maxSize.value && (addIssueToContext(n, {
      code: ZodIssueCode.too_big,
      maximum: a.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: a.maxSize.message
    }), t.dirty());
    const i = this._def.valueType;
    function s(c) {
      const d = /* @__PURE__ */ new Set();
      for (const u of c) {
        if (u.status === "aborted")
          return INVALID;
        u.status === "dirty" && t.dirty(), d.add(u.value);
      }
      return { status: t.value, value: d };
    }
    const o = [...n.data.values()].map((c, d) => i._parse(new ParseInputLazyPath(n, c, n.path, d)));
    return n.common.async ? Promise.all(o).then((c) => s(c)) : s(o);
  }
  min(e, t) {
    return new ZodSet({
      ...this._def,
      minSize: { value: e, message: errorUtil.toString(t) }
    });
  }
  max(e, t) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: e, message: errorUtil.toString(t) }
    });
  }
  size(e, t) {
    return this.min(e, t).max(e, t);
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
ZodSet.create = (r, e) => new ZodSet({
  valueType: r,
  minSize: null,
  maxSize: null,
  typeName: ZodFirstPartyTypeKind.ZodSet,
  ...processCreateParams(e)
});
class ZodFunction extends ZodType {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(e) {
    const { ctx: t } = this._processInputParams(e);
    if (t.parsedType !== ZodParsedType.function)
      return addIssueToContext(t, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: t.parsedType
      }), INVALID;
    function n(o, c) {
      return makeIssue({
        data: o,
        path: t.path,
        errorMaps: [t.common.contextualErrorMap, t.schemaErrorMap, getErrorMap(), errorMap].filter((d) => !!d),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: c
        }
      });
    }
    function a(o, c) {
      return makeIssue({
        data: o,
        path: t.path,
        errorMaps: [t.common.contextualErrorMap, t.schemaErrorMap, getErrorMap(), errorMap].filter((d) => !!d),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: c
        }
      });
    }
    const i = { errorMap: t.common.contextualErrorMap }, s = t.data;
    if (this._def.returns instanceof ZodPromise) {
      const o = this;
      return OK(async function(...c) {
        const d = new ZodError([]), u = await o._def.args.parseAsync(c, i).catch((g) => {
          throw d.addIssue(n(c, g)), d;
        }), f = await Reflect.apply(s, this, u);
        return await o._def.returns._def.type.parseAsync(f, i).catch((g) => {
          throw d.addIssue(a(f, g)), d;
        });
      });
    } else {
      const o = this;
      return OK(function(...c) {
        const d = o._def.args.safeParse(c, i);
        if (!d.success)
          throw new ZodError([n(c, d.error)]);
        const u = Reflect.apply(s, this, d.data), f = o._def.returns.safeParse(u, i);
        if (!f.success)
          throw new ZodError([a(u, f.error)]);
        return f.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...e) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(e).rest(ZodUnknown.create())
    });
  }
  returns(e) {
    return new ZodFunction({
      ...this._def,
      returns: e
    });
  }
  implement(e) {
    return this.parse(e);
  }
  strictImplement(e) {
    return this.parse(e);
  }
  static create(e, t, n) {
    return new ZodFunction({
      args: e || ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: t || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(n)
    });
  }
}
class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(e) {
    const { ctx: t } = this._processInputParams(e);
    return this._def.getter()._parse({ data: t.data, path: t.path, parent: t });
  }
}
ZodLazy.create = (r, e) => new ZodLazy({
  getter: r,
  typeName: ZodFirstPartyTypeKind.ZodLazy,
  ...processCreateParams(e)
});
class ZodLiteral extends ZodType {
  _parse(e) {
    if (e.data !== this._def.value) {
      const t = this._getOrReturnCtx(e);
      return addIssueToContext(t, {
        received: t.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      }), INVALID;
    }
    return { status: "valid", value: e.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (r, e) => new ZodLiteral({
  value: r,
  typeName: ZodFirstPartyTypeKind.ZodLiteral,
  ...processCreateParams(e)
});
function createZodEnum(r, e) {
  return new ZodEnum({
    values: r,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(e)
  });
}
class ZodEnum extends ZodType {
  _parse(e) {
    if (typeof e.data != "string") {
      const t = this._getOrReturnCtx(e), n = this._def.values;
      return addIssueToContext(t, {
        expected: util.joinValues(n),
        received: t.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(e.data)) {
      const t = this._getOrReturnCtx(e), n = this._def.values;
      return addIssueToContext(t, {
        received: t.data,
        code: ZodIssueCode.invalid_enum_value,
        options: n
      }), INVALID;
    }
    return OK(e.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const e = {};
    for (const t of this._def.values)
      e[t] = t;
    return e;
  }
  get Values() {
    const e = {};
    for (const t of this._def.values)
      e[t] = t;
    return e;
  }
  get Enum() {
    const e = {};
    for (const t of this._def.values)
      e[t] = t;
    return e;
  }
  extract(e, t = this._def) {
    return ZodEnum.create(e, {
      ...this._def,
      ...t
    });
  }
  exclude(e, t = this._def) {
    return ZodEnum.create(this.options.filter((n) => !e.includes(n)), {
      ...this._def,
      ...t
    });
  }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
  _parse(e) {
    const t = util.getValidEnumValues(this._def.values), n = this._getOrReturnCtx(e);
    if (n.parsedType !== ZodParsedType.string && n.parsedType !== ZodParsedType.number) {
      const a = util.objectValues(t);
      return addIssueToContext(n, {
        expected: util.joinValues(a),
        received: n.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(util.getValidEnumValues(this._def.values))), !this._cache.has(e.data)) {
      const a = util.objectValues(t);
      return addIssueToContext(n, {
        received: n.data,
        code: ZodIssueCode.invalid_enum_value,
        options: a
      }), INVALID;
    }
    return OK(e.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (r, e) => new ZodNativeEnum({
  values: r,
  typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
  ...processCreateParams(e)
});
class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(e) {
    const { ctx: t } = this._processInputParams(e);
    if (t.parsedType !== ZodParsedType.promise && t.common.async === !1)
      return addIssueToContext(t, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: t.parsedType
      }), INVALID;
    const n = t.parsedType === ZodParsedType.promise ? t.data : Promise.resolve(t.data);
    return OK(n.then((a) => this._def.type.parseAsync(a, {
      path: t.path,
      errorMap: t.common.contextualErrorMap
    })));
  }
}
ZodPromise.create = (r, e) => new ZodPromise({
  type: r,
  typeName: ZodFirstPartyTypeKind.ZodPromise,
  ...processCreateParams(e)
});
class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e), a = this._def.effect || null, i = {
      addIssue: (s) => {
        addIssueToContext(n, s), s.fatal ? t.abort() : t.dirty();
      },
      get path() {
        return n.path;
      }
    };
    if (i.addIssue = i.addIssue.bind(i), a.type === "preprocess") {
      const s = a.transform(n.data, i);
      if (n.common.async)
        return Promise.resolve(s).then(async (o) => {
          if (t.value === "aborted")
            return INVALID;
          const c = await this._def.schema._parseAsync({
            data: o,
            path: n.path,
            parent: n
          });
          return c.status === "aborted" ? INVALID : c.status === "dirty" || t.value === "dirty" ? DIRTY(c.value) : c;
        });
      {
        if (t.value === "aborted")
          return INVALID;
        const o = this._def.schema._parseSync({
          data: s,
          path: n.path,
          parent: n
        });
        return o.status === "aborted" ? INVALID : o.status === "dirty" || t.value === "dirty" ? DIRTY(o.value) : o;
      }
    }
    if (a.type === "refinement") {
      const s = (o) => {
        const c = a.refinement(o, i);
        if (n.common.async)
          return Promise.resolve(c);
        if (c instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return o;
      };
      if (n.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: n.data,
          path: n.path,
          parent: n
        });
        return o.status === "aborted" ? INVALID : (o.status === "dirty" && t.dirty(), s(o.value), { status: t.value, value: o.value });
      } else
        return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((o) => o.status === "aborted" ? INVALID : (o.status === "dirty" && t.dirty(), s(o.value).then(() => ({ status: t.value, value: o.value }))));
    }
    if (a.type === "transform")
      if (n.common.async === !1) {
        const s = this._def.schema._parseSync({
          data: n.data,
          path: n.path,
          parent: n
        });
        if (!isValid(s))
          return INVALID;
        const o = a.transform(s.value, i);
        if (o instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: t.value, value: o };
      } else
        return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((s) => isValid(s) ? Promise.resolve(a.transform(s.value, i)).then((o) => ({
          status: t.value,
          value: o
        })) : INVALID);
    util.assertNever(a);
  }
}
ZodEffects.create = (r, e, t) => new ZodEffects({
  schema: r,
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  effect: e,
  ...processCreateParams(t)
});
ZodEffects.createWithPreprocess = (r, e, t) => new ZodEffects({
  schema: e,
  effect: { type: "preprocess", transform: r },
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  ...processCreateParams(t)
});
class ZodOptional extends ZodType {
  _parse(e) {
    return this._getType(e) === ZodParsedType.undefined ? OK(void 0) : this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (r, e) => new ZodOptional({
  innerType: r,
  typeName: ZodFirstPartyTypeKind.ZodOptional,
  ...processCreateParams(e)
});
class ZodNullable extends ZodType {
  _parse(e) {
    return this._getType(e) === ZodParsedType.null ? OK(null) : this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (r, e) => new ZodNullable({
  innerType: r,
  typeName: ZodFirstPartyTypeKind.ZodNullable,
  ...processCreateParams(e)
});
class ZodDefault extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e);
    let n = t.data;
    return t.parsedType === ZodParsedType.undefined && (n = this._def.defaultValue()), this._def.innerType._parse({
      data: n,
      path: t.path,
      parent: t
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (r, e) => new ZodDefault({
  innerType: r,
  typeName: ZodFirstPartyTypeKind.ZodDefault,
  defaultValue: typeof e.default == "function" ? e.default : () => e.default,
  ...processCreateParams(e)
});
class ZodCatch extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), n = {
      ...t,
      common: {
        ...t.common,
        issues: []
      }
    }, a = this._def.innerType._parse({
      data: n.data,
      path: n.path,
      parent: {
        ...n
      }
    });
    return isAsync(a) ? a.then((i) => ({
      status: "valid",
      value: i.status === "valid" ? i.value : this._def.catchValue({
        get error() {
          return new ZodError(n.common.issues);
        },
        input: n.data
      })
    })) : {
      status: "valid",
      value: a.status === "valid" ? a.value : this._def.catchValue({
        get error() {
          return new ZodError(n.common.issues);
        },
        input: n.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (r, e) => new ZodCatch({
  innerType: r,
  typeName: ZodFirstPartyTypeKind.ZodCatch,
  catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
  ...processCreateParams(e)
});
class ZodNaN extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.nan) {
      const n = this._getOrReturnCtx(e);
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: n.parsedType
      }), INVALID;
    }
    return { status: "valid", value: e.data };
  }
}
ZodNaN.create = (r) => new ZodNaN({
  typeName: ZodFirstPartyTypeKind.ZodNaN,
  ...processCreateParams(r)
});
class ZodBranded extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), n = t.data;
    return this._def.type._parse({
      data: n,
      path: t.path,
      parent: t
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class ZodPipeline extends ZodType {
  _parse(e) {
    const { status: t, ctx: n } = this._processInputParams(e);
    if (n.common.async)
      return (async () => {
        const i = await this._def.in._parseAsync({
          data: n.data,
          path: n.path,
          parent: n
        });
        return i.status === "aborted" ? INVALID : i.status === "dirty" ? (t.dirty(), DIRTY(i.value)) : this._def.out._parseAsync({
          data: i.value,
          path: n.path,
          parent: n
        });
      })();
    {
      const a = this._def.in._parseSync({
        data: n.data,
        path: n.path,
        parent: n
      });
      return a.status === "aborted" ? INVALID : a.status === "dirty" ? (t.dirty(), {
        status: "dirty",
        value: a.value
      }) : this._def.out._parseSync({
        data: a.value,
        path: n.path,
        parent: n
      });
    }
  }
  static create(e, t) {
    return new ZodPipeline({
      in: e,
      out: t,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}
class ZodReadonly extends ZodType {
  _parse(e) {
    const t = this._def.innerType._parse(e), n = (a) => (isValid(a) && (a.value = Object.freeze(a.value)), a);
    return isAsync(t) ? t.then((a) => n(a)) : n(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (r, e) => new ZodReadonly({
  innerType: r,
  typeName: ZodFirstPartyTypeKind.ZodReadonly,
  ...processCreateParams(e)
});
function custom(r, e = {}, t) {
  return ZodAny.create();
}
var ZodFirstPartyTypeKind;
(function(r) {
  r.ZodString = "ZodString", r.ZodNumber = "ZodNumber", r.ZodNaN = "ZodNaN", r.ZodBigInt = "ZodBigInt", r.ZodBoolean = "ZodBoolean", r.ZodDate = "ZodDate", r.ZodSymbol = "ZodSymbol", r.ZodUndefined = "ZodUndefined", r.ZodNull = "ZodNull", r.ZodAny = "ZodAny", r.ZodUnknown = "ZodUnknown", r.ZodNever = "ZodNever", r.ZodVoid = "ZodVoid", r.ZodArray = "ZodArray", r.ZodObject = "ZodObject", r.ZodUnion = "ZodUnion", r.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", r.ZodIntersection = "ZodIntersection", r.ZodTuple = "ZodTuple", r.ZodRecord = "ZodRecord", r.ZodMap = "ZodMap", r.ZodSet = "ZodSet", r.ZodFunction = "ZodFunction", r.ZodLazy = "ZodLazy", r.ZodLiteral = "ZodLiteral", r.ZodEnum = "ZodEnum", r.ZodEffects = "ZodEffects", r.ZodNativeEnum = "ZodNativeEnum", r.ZodOptional = "ZodOptional", r.ZodNullable = "ZodNullable", r.ZodDefault = "ZodDefault", r.ZodCatch = "ZodCatch", r.ZodPromise = "ZodPromise", r.ZodBranded = "ZodBranded", r.ZodPipeline = "ZodPipeline", r.ZodReadonly = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const stringType = ZodString.create, numberType = ZodNumber.create, booleanType = ZodBoolean.create, nullType = ZodNull.create, anyType = ZodAny.create;
ZodUnknown.create;
ZodNever.create;
const voidType = ZodVoid.create, arrayType = ZodArray.create, objectType = ZodObject.create, unionType = ZodUnion.create;
ZodIntersection.create;
ZodTuple.create;
const recordType = ZodRecord.create, functionType = ZodFunction.create, literalType = ZodLiteral.create, enumType = ZodEnum.create;
ZodPromise.create;
ZodOptional.create;
ZodNullable.create;
const z = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DIRTY,
  INVALID,
  OK,
  ParseStatus,
  Schema: ZodType,
  ZodAny,
  ZodArray,
  ZodBigInt,
  ZodBoolean,
  ZodBranded,
  ZodCatch,
  ZodDate,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodError,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  ZodFunction,
  ZodIntersection,
  ZodIssueCode,
  ZodLazy,
  ZodLiteral,
  ZodMap,
  ZodNaN,
  ZodNativeEnum,
  ZodNever,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodParsedType,
  ZodPipeline,
  ZodPromise,
  ZodReadonly,
  ZodRecord,
  ZodSchema: ZodType,
  ZodSet,
  ZodString,
  ZodSymbol,
  ZodTransformer: ZodEffects,
  ZodTuple,
  ZodType,
  ZodUndefined,
  ZodUnion,
  ZodUnknown,
  ZodVoid,
  addIssueToContext,
  any: anyType,
  array: arrayType,
  boolean: booleanType,
  custom,
  datetimeRegex,
  defaultErrorMap: errorMap,
  enum: enumType,
  function: functionType,
  getErrorMap,
  getParsedType,
  isAborted,
  isAsync,
  isDirty,
  isValid,
  literal: literalType,
  makeIssue,
  null: nullType,
  number: numberType,
  object: objectType,
  get objectUtil() {
    return objectUtil;
  },
  record: recordType,
  string: stringType,
  union: unionType,
  get util() {
    return util;
  },
  void: voidType
}, Symbol.toStringTag, { value: "Module" }));
var zValidator = (r, e, t) => (
  // @ts-expect-error not typed well
  validator(r, async (n, a) => {
    let i = n;
    if (r === "header" && e instanceof ZodObject) {
      const o = Object.keys(e.shape), c = Object.fromEntries(
        o.map((d) => [d.toLowerCase(), d])
      );
      i = Object.fromEntries(
        Object.entries(n).map(([d, u]) => [c[d] || d, u])
      );
    }
    const s = await e.safeParseAsync(i);
    if (t) {
      const o = await t({ data: i, ...s, target: r }, a);
      if (o) {
        if (o instanceof Response)
          return o;
        if ("response" in o)
          return o.response;
      }
    }
    return s.success ? s.data : a.json(s, 400);
  })
), compose = (r, e, t) => (n, a) => {
  let i = -1;
  return s(0);
  async function s(o) {
    if (o <= i)
      throw new Error("next() called multiple times");
    i = o;
    let c, d = !1, u;
    if (r[o] ? (u = r[o][0][0], n.req.routeIndex = o) : u = o === r.length && a || void 0, u)
      try {
        c = await u(n, () => s(o + 1));
      } catch (f) {
        if (f instanceof Error && e)
          n.error = f, c = await e(f, n), d = !0;
        else
          throw f;
      }
    else
      n.finalized === !1 && t && (c = await t(n));
    return c && (n.finalized === !1 || d) && (n.res = c), n;
  }
}, GET_MATCH_RESULT = /* @__PURE__ */ Symbol(), isRawRequest = (r) => "headers" in r, parseBody = async (r, e = /* @__PURE__ */ Object.create(null)) => {
  const { all: t = !1, dot: n = !1 } = e, s = (isRawRequest(r) ? r.headers : r.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  return s === "multipart/form-data" || s === "application/x-www-form-urlencoded" ? parseFormData(r, { all: t, dot: n }) : {};
};
async function parseFormData(r, e) {
  if (!isRawRequest(r) && r.bodyCache.formData)
    return convertFormDataToBodyData(
      await r.bodyCache.formData,
      e
    );
  const t = isRawRequest(r) ? r.headers : r.raw.headers, n = await r.arrayBuffer(), a = bufferToFormData(n, t.get("Content-Type") || "");
  isRawRequest(r) || (r.bodyCache.formData = a);
  const i = await a;
  return i ? convertFormDataToBodyData(i, e) : {};
}
function convertFormDataToBodyData(r, e) {
  const t = /* @__PURE__ */ Object.create(null);
  return r.forEach((n, a) => {
    e.all || a.endsWith("[]") ? handleParsingAllValues(t, a, n) : t[a] = n;
  }), e.dot && Object.entries(t).forEach(([n, a]) => {
    n.includes(".") && (handleParsingNestedValues(t, n, a), delete t[n]);
  }), t;
}
var handleParsingAllValues = (r, e, t) => {
  r[e] !== void 0 ? Array.isArray(r[e]) ? r[e].push(t) : r[e] = [r[e], t] : e.endsWith("[]") ? r[e] = [t] : r[e] = t;
}, handleParsingNestedValues = (r, e, t) => {
  if (/(?:^|\.)__proto__\./.test(e))
    return;
  let n = r;
  const a = e.split(".");
  a.forEach((i, s) => {
    s === a.length - 1 ? n[i] = t : ((!n[i] || typeof n[i] != "object" || Array.isArray(n[i]) || n[i] instanceof File) && (n[i] = /* @__PURE__ */ Object.create(null)), n = n[i]);
  });
}, HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #t;
  // Short name of validatedData
  #e;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(r, e = "/", t = [[]]) {
    this.raw = r, this.path = e, this.#e = t;
  }
  param(r) {
    return r ? this.#r(r) : this.#i();
  }
  #r(r) {
    const e = this.#e[0][this.routeIndex][1][r], t = this.#n(e);
    return t && tryDecodeURIComponent(t);
  }
  #i() {
    const r = {}, e = Object.keys(this.#e[0][this.routeIndex][1]);
    for (const t of e) {
      const n = this.#n(this.#e[0][this.routeIndex][1][t]);
      n !== void 0 && (r[t] = tryDecodeURIComponent(n));
    }
    return r;
  }
  #n(r) {
    return this.#e[1] ? this.#e[1][r] : r;
  }
  query(r) {
    return getQueryParam(this.url, r);
  }
  queries(r) {
    return getQueryParams(this.url, r);
  }
  header(r) {
    if (r)
      return this.raw.headers.get(r) ?? void 0;
    const e = /* @__PURE__ */ Object.create(null);
    return this.raw.headers.forEach((t, n) => {
      e[n] = t;
    }), e;
  }
  async parseBody(r) {
    return parseBody(this, r);
  }
  #a = (r) => {
    const { bodyCache: e, raw: t } = this, n = e[r];
    if (n)
      return n;
    for (const a in e)
      return e[a].then((i) => (a === "json" && (i = JSON.stringify(i)), new Response(i)[r]()));
    return e[r] = t[r]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#a("text").then((r) => JSON.parse(r));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#a("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#a("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#a("arrayBuffer").then((r) => new Uint8Array(r));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#a("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#a("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(r, e) {
    (this.#t ??= {})[r] = e;
  }
  valid(r) {
    return this.#t?.[r];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#e;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#e[0].map(([[, r]]) => r);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#e[0].map(([[, r]]) => r)[this.routeIndex].path;
  }
}, TEXT_PLAIN = "text/plain; charset=UTF-8", setDefaultContentType = (r, e) => ({
  "Content-Type": r,
  ...e
}), createResponseInstance = (r, e) => new Response(r, e), Context = class {
  #t;
  #e;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #r;
  finalized = !1;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #i;
  #n;
  #a;
  #d;
  #l;
  #c;
  #o;
  #u;
  #p;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(r, e) {
    this.#t = r, e && (this.#n = e.executionCtx, this.env = e.env, this.#c = e.notFoundHandler, this.#p = e.path, this.#u = e.matchResult);
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    return this.#e ??= new HonoRequest(this.#t, this.#p, this.#u), this.#e;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#n && "respondWith" in this.#n)
      return this.#n;
    throw Error("This context has no FetchEvent");
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#n)
      return this.#n;
    throw Error("This context has no ExecutionContext");
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#a ||= createResponseInstance(null, {
      headers: this.#o ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(r) {
    if (this.#a && r) {
      r = createResponseInstance(r.body, r);
      for (const [e, t] of this.#a.headers.entries())
        if (e !== "content-type")
          if (e === "set-cookie") {
            const n = this.#a.headers.getSetCookie();
            r.headers.delete("set-cookie");
            for (const a of n)
              r.headers.append("set-cookie", a);
          } else
            r.headers.set(e, t);
    }
    this.#a = r, this.finalized = !0;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...r) => (this.#l ??= (e) => this.html(e), this.#l(...r));
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (r) => this.#d = r;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#d;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (r) => {
    this.#l = r;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (r, e, t) => {
    this.finalized && (this.#a = createResponseInstance(this.#a.body, this.#a));
    const n = this.#a ? this.#a.headers : this.#o ??= new Headers();
    e === void 0 ? n.delete(r) : t?.append ? n.append(r, e) : n.set(r, e);
  };
  status = (r) => {
    this.#i = r;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (r, e) => {
    this.#r ??= /* @__PURE__ */ new Map(), this.#r.set(r, e);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (r) => this.#r ? this.#r.get(r) : void 0;
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    return this.#r ? Object.fromEntries(this.#r) : {};
  }
  #s(r, e, t) {
    let n = this.#a ? new Headers(this.#a.headers) : this.#o;
    if (typeof e == "object" && e.headers) {
      n ??= new Headers();
      for (const [i, s] of new Headers(e.headers))
        i === "set-cookie" ? n.append(i, s) : n.set(i, s);
    }
    if (t) {
      if (!n) {
        let i = 0;
        for (const s in t)
          if (++i > 1 || typeof t[s] != "string") {
            n = new Headers();
            break;
          }
      }
      if (n)
        for (const i in t) {
          const s = t[i];
          if (typeof s == "string")
            n.set(i, s);
          else {
            n.delete(i);
            for (const o of s)
              n.append(i, o);
          }
        }
    }
    const a = typeof e == "number" ? e : e?.status ?? this.#i;
    return createResponseInstance(r, {
      status: a,
      headers: n ?? t
    });
  }
  newResponse = (...r) => this.#s(...r);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (r, e, t) => this.#s(r, e, t);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (r, e, t) => !this.#o && !this.#i && !e && !t && !this.finalized ? new Response(r) : this.#s(
    r,
    e,
    setDefaultContentType(TEXT_PLAIN, t)
  );
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (r, e, t) => this.#s(
    JSON.stringify(r),
    e,
    setDefaultContentType("application/json", t)
  );
  html = (r, e, t) => {
    const n = (a) => this.#s(a, e, setDefaultContentType("text/html; charset=UTF-8", t));
    return typeof r == "object" ? resolveCallback(r, HtmlEscapedCallbackPhase.Stringify, !1, {}).then(n) : n(r);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (r, e) => {
    const t = String(r);
    return this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      /[^\x00-\xFF]/.test(t) ? encodeURI(t) : t
    ), this.newResponse(null, e ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => (this.#c ??= () => createResponseInstance(), this.#c(this));
}, METHOD_NAME_ALL = "ALL", METHOD_NAME_ALL_LOWERCASE = "all", METHODS = ["get", "post", "put", "delete", "options", "patch", "query"], MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.", UnsupportedPathError = class extends Error {
}, COMPOSED_HANDLER = "__COMPOSED_HANDLER", notFoundHandler = (r) => r.text("404 Not Found", 404), errorHandler = (r, e) => {
  if ("getResponse" in r) {
    const t = r.getResponse();
    return e.newResponse(t.body, t);
  }
  return console.error(r), e.text("Internal Server Error", 500);
}, Hono$1 = class Ie {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #t = "/";
  routes = [];
  constructor(e = {}) {
    [...METHODS, METHOD_NAME_ALL_LOWERCASE].forEach((i) => {
      this[i] = (s, ...o) => (typeof s == "string" ? this.#t = s : this.#i(i, this.#t, s), o.forEach((c) => {
        this.#i(i, this.#t, c);
      }), this);
    }), this.on = (i, s, ...o) => {
      for (const c of [s].flat()) {
        this.#t = c;
        for (const d of [i].flat())
          o.map((u) => {
            this.#i(d.toUpperCase(), this.#t, u);
          });
      }
      return this;
    }, this.use = (i, ...s) => (typeof i == "string" ? this.#t = i : (this.#t = "*", s.unshift(i)), s.forEach((o) => {
      this.#i(METHOD_NAME_ALL, this.#t, o);
    }), this);
    const { strict: n, ...a } = e;
    Object.assign(this, a), this.getPath = n ?? !0 ? e.getPath ?? getPath : getPathNoStrict;
  }
  #e() {
    const e = new Ie({
      router: this.router,
      getPath: this.getPath
    });
    return e.errorHandler = this.errorHandler, e.#r = this.#r, e.routes = this.routes, e;
  }
  #r = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(e, t) {
    const n = this.basePath(e);
    return t.routes.map((a) => {
      let i;
      t.errorHandler === errorHandler ? i = a.handler : (i = async (s, o) => (await compose([], t.errorHandler)(s, () => a.handler(s, o))).res, i[COMPOSED_HANDLER] = a.handler), n.#i(a.method, a.path, i, a.basePath);
    }), this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(e) {
    const t = this.#e();
    return t._basePath = mergePath(this._basePath, e), t;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (e) => (this.errorHandler = e, this);
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (e) => (this.#r = e, this);
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(e, t, n) {
    let a, i;
    n && (typeof n == "function" ? i = n : (i = n.optionHandler, n.replaceRequest === !1 ? a = (c) => c : a = n.replaceRequest));
    const s = i ? (c) => {
      const d = i(c);
      return Array.isArray(d) ? d : [d];
    } : (c) => {
      let d;
      try {
        d = c.executionCtx;
      } catch {
      }
      return [c.env, d];
    };
    a ||= (() => {
      const c = mergePath(this._basePath, e), d = c === "/" ? 0 : c.length;
      return (u) => {
        const f = new URL(u.url);
        return f.pathname = this.getPath(u).slice(d) || "/", new Request(f, u);
      };
    })();
    const o = async (c, d) => {
      const u = await t(a(c.req.raw), ...s(c));
      if (u)
        return u;
      await d();
    };
    return this.#i(METHOD_NAME_ALL, mergePath(e, "*"), o), this;
  }
  #i(e, t, n, a) {
    e = e.toUpperCase(), t = mergePath(this._basePath, t);
    const i = {
      basePath: a !== void 0 ? mergePath(this._basePath, a) : this._basePath,
      path: t,
      method: e,
      handler: n
    };
    this.router.add(e, t, [n, i]), this.routes.push(i);
  }
  #n(e, t) {
    if (e instanceof Error)
      return this.errorHandler(e, t);
    throw e;
  }
  #a(e, t, n, a) {
    if (a === "HEAD")
      return (async () => new Response(null, await this.#a(e, t, n, "GET")))();
    const i = this.getPath(e, { env: n }), s = this.router.match(a, i), o = new Context(e, {
      path: i,
      matchResult: s,
      env: n,
      executionCtx: t,
      notFoundHandler: this.#r
    });
    if (s[0].length === 1) {
      let d;
      try {
        d = s[0][0][0][0](o, async () => {
          o.res = await this.#r(o);
        });
      } catch (u) {
        return this.#n(u, o);
      }
      return d instanceof Promise ? d.then(
        (u) => u || (o.finalized ? o.res : this.#r(o))
      ).catch((u) => this.#n(u, o)) : d ?? this.#r(o);
    }
    const c = compose(s[0], this.errorHandler, this.#r);
    return (async () => {
      try {
        const d = await c(o);
        if (!d.finalized)
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        return d.res;
      } catch (d) {
        return this.#n(d, o);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (e, ...t) => this.#a(e, t[1], t[0], e.method);
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (e, t, n, a) => e instanceof Request ? this.fetch(t ? new Request(e, t) : e, n, a) : (e = e.toString(), this.fetch(
    new Request(
      /^https?:\/\//.test(e) ? e : `http://localhost${mergePath("/", e)}`,
      t
    ),
    n,
    a
  ));
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (e) => {
      e.respondWith(this.#a(e.request, e, void 0, e.request.method));
    });
  };
}, emptyParam = [];
function match(r, e) {
  const t = this.buildAllMatchers(), n = ((a, i) => {
    const s = t[a] || t[METHOD_NAME_ALL], o = s[2][i];
    if (o)
      return o;
    const c = i.match(s[0]);
    if (!c)
      return [[], emptyParam];
    const d = c.indexOf("", 1);
    return [s[1][d], c];
  });
  return this.match = n, n(r, e);
}
var LABEL_REG_EXP_STR = "[^/]+", ONLY_WILDCARD_REG_EXP_STR = ".*", TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)", PATH_ERROR = /* @__PURE__ */ Symbol(), regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(r, e) {
  return r.length === 1 ? e.length === 1 ? r < e ? -1 : 1 : -1 : e.length === 1 ? 1 : r === ONLY_WILDCARD_REG_EXP_STR || r === TAIL_WILDCARD_REG_EXP_STR ? e === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1 : e === ONLY_WILDCARD_REG_EXP_STR || e === TAIL_WILDCARD_REG_EXP_STR ? -1 : r === LABEL_REG_EXP_STR ? 1 : e === LABEL_REG_EXP_STR ? -1 : r.length === e.length ? r < e ? -1 : 1 : e.length - r.length;
}
var Node$1 = class Se {
  // handler index of a dynamic path, or -1 for a static path terminal
  #t;
  #e;
  #r = /* @__PURE__ */ Object.create(null);
  insert(e, t, n, a, i) {
    let s = this;
    for (let o = 0, c = e.length; o < c; o++) {
      const d = e[o], u = d.length === 1 ? d === "*" ? o === c - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : d === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : d.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let f;
      if (u) {
        const h = u[1];
        let g = u[2] || LABEL_REG_EXP_STR;
        if (h && u[2] && (g === ".*" || (g = g.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(g)) || g.length === 1 && regExpMetaChars.has(g)))
          throw PATH_ERROR;
        if (f = s.#r[g], !f) {
          if (g !== ONLY_WILDCARD_REG_EXP_STR && g !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const x in s.#r)
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (g.length > 1 || x.length > 1) && x !== ONLY_WILDCARD_REG_EXP_STR && x !== TAIL_WILDCARD_REG_EXP_STR
              )
                throw PATH_ERROR;
          }
          f = s.#r[g] = new Se();
        }
        h !== "" && (f.#e ??= a.varIndex++, n.push([h, f.#e]));
      } else if (f = s.#r[d], !f) {
        for (const h in s.#r)
          if (h.length > 1 && h !== ONLY_WILDCARD_REG_EXP_STR && h !== TAIL_WILDCARD_REG_EXP_STR)
            throw PATH_ERROR;
        f = s.#r[d] = new Se();
      }
      s = f;
    }
    if (s.#t !== void 0)
      throw PATH_ERROR;
    s.#t = i ? -1 : t;
  }
  buildRegExpStr() {
    const t = Object.keys(this.#r).sort(compareKey).map((n) => {
      const a = this.#r[n], i = a.buildRegExpStr();
      return i === "" ? "" : (typeof a.#e == "number" ? `(${n})@${a.#e}` : regExpMetaChars.has(n) ? `\\${n}` : n) + i;
    }).filter(Boolean);
    return typeof this.#t == "number" && this.#t !== -1 && t.unshift(`#${this.#t}`), t.length === 0 ? "" : t.length === 1 ? t[0] : "(?:" + t.join("|") + ")";
  }
}, Trie = class {
  #t = { varIndex: 0 };
  #e = new Node$1();
  #r = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(r, e) {
    if (e) {
      this.#e.insert(r.split(""), 0, [], this.#t, !0);
      return;
    }
    const t = [], n = [];
    let a = r;
    for (let s = 0; ; ) {
      let o = !1;
      if (a = a.replace(/\{[^}]+\}/g, (c) => {
        const d = `@\\${s}`;
        return n[s] = [d, c], s++, o = !0, d;
      }), !o)
        break;
    }
    const i = a.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let s = n.length - 1; s >= 0; s--) {
      const [o] = n[s];
      for (let c = i.length - 1; c >= 0; c--)
        if (i[c].indexOf(o) !== -1) {
          i[c] = i[c].replace(o, n[s][1]);
          break;
        }
    }
    this.#e.insert(i, this.#r, t, this.#t, !1), this.paths[r] = [this.#r++, t];
  }
  buildRegExp() {
    let r = this.#e.buildRegExpStr();
    if (r === "")
      return [/^$/, [], []];
    let e = 0;
    const t = [], n = [];
    return r = r.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, i, s) => i !== void 0 ? (t[++e] = Number(i), "$()") : (s !== void 0 && (n[Number(s)] = ++e), "")), [new RegExp(`^${r}`), t, n];
  }
}, wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(r) {
  return wildcardRegExpCache[r] ??= new RegExp(
    r === "*" ? "" : `^${r.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (e, t) => t ? `\\${t}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function findMiddleware(r, e) {
  if (r) {
    for (const t of Object.keys(r).sort((n, a) => a.length - n.length))
      if (buildWildcardRegExp(t).test(e))
        return [...r[t]];
  }
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #t;
  #e;
  #r;
  constructor() {
    this.#t = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) }, this.#e = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) }, this.#r = { [METHOD_NAME_ALL]: new Trie() };
  }
  #i(r, e) {
    try {
      this.#r[r].insert(e, !/\*|\/:/.test(e));
    } catch (t) {
      throw t === PATH_ERROR ? new UnsupportedPathError(e) : t;
    }
  }
  add(r, e, t) {
    const n = this.#t, a = this.#e;
    if (!n || !a)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    n[r] || (this.#r[r] = new Trie(), [n, a].forEach((o) => {
      o[r] = /* @__PURE__ */ Object.create(null), Object.keys(o[METHOD_NAME_ALL]).forEach((c) => {
        o[r][c] = [...o[METHOD_NAME_ALL][c]], this.#i(r, c);
      });
    })), e === "/*" && (e = "*");
    const i = (e.match(/\/:/g) || []).length;
    if (/\*$/.test(e)) {
      const o = buildWildcardRegExp(e);
      Object.keys(n).forEach((c) => {
        (r === METHOD_NAME_ALL || r === c) && !n[c][e] && (this.#i(c, e), n[c][e] = findMiddleware(n[c], e) || findMiddleware(n[METHOD_NAME_ALL], e) || []);
      }), Object.keys(n).forEach((c) => {
        (r === METHOD_NAME_ALL || r === c) && Object.keys(n[c]).forEach((d) => {
          o.test(d) && n[c][d].push([t, i]);
        });
      }), Object.keys(a).forEach((c) => {
        (r === METHOD_NAME_ALL || r === c) && Object.keys(a[c]).forEach(
          (d) => o.test(d) && a[c][d].push([t, i])
        );
      });
      return;
    }
    const s = checkOptionalParameter(e) || [e];
    for (let o = 0, c = s.length; o < c; o++) {
      const d = s[o];
      Object.keys(a).forEach((u) => {
        (r === METHOD_NAME_ALL || r === u) && (a[u][d] || (this.#i(u, d), a[u][d] = [
          ...findMiddleware(n[u], d) || findMiddleware(n[METHOD_NAME_ALL], d) || []
        ]), a[u][d].push([t, i - c + o + 1]));
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const r = /* @__PURE__ */ Object.create(null);
    return Object.keys(this.#e).concat(Object.keys(this.#t)).forEach((e) => {
      r[e] ||= this.#n(e);
    }), this.#t = this.#e = this.#r = void 0, clearWildcardRegExpCache(), r;
  }
  #n(r) {
    const e = this.#t[r], t = this.#e[r], n = this.#r[r], a = /* @__PURE__ */ Object.create(null), i = [];
    [e, t].forEach((u) => {
      for (const f in u) {
        const h = u[f], g = n.paths[f];
        if (!g) {
          a[f] = [h.map(([_]) => [_, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const x = g[1];
        i[g[0]] = h.map(([_, P]) => {
          const O = /* @__PURE__ */ Object.create(null);
          for (P -= 1; P >= 0; P--) {
            const [v, y] = x[P];
            O[v] = y;
          }
          return [_, O];
        });
      }
    });
    const [s, o, c] = n.buildRegExp();
    for (let u = 0, f = i.length; u < f; u++)
      for (let h = 0, g = i[u].length; h < g; h++) {
        const x = i[u][h]?.[1];
        if (!x)
          continue;
        const _ = Object.keys(x);
        for (let P = 0, O = _.length; P < O; P++)
          x[_[P]] = c[x[_[P]]];
      }
    const d = [];
    for (const u in o)
      d[u] = i[o[u]];
    return [s, d, a];
  }
}, SmartRouter = class {
  name = "SmartRouter";
  #t = [];
  #e = [];
  constructor(r) {
    this.#t = r.routers;
  }
  add(r, e, t) {
    if (!this.#e)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#e.push([r, e, t]);
  }
  match(r, e) {
    if (!this.#e)
      throw new Error("Fatal error");
    const t = this.#t, n = this.#e, a = t.length;
    let i = 0, s;
    for (; i < a; i++) {
      const o = t[i];
      try {
        for (let c = 0, d = n.length; c < d; c++)
          o.add(...n[c]);
        s = o.match(r, e);
      } catch (c) {
        if (c instanceof UnsupportedPathError)
          continue;
        throw c;
      }
      this.match = o.match.bind(o), this.#t = [o], this.#e = void 0;
      break;
    }
    if (i === a)
      throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, s;
  }
  get activeRouter() {
    if (this.#e || this.#t.length !== 1)
      throw new Error("No active router has been determined yet.");
    return this.#t[0];
  }
}, emptyParams = /* @__PURE__ */ Object.create(null), order = 0, Node = class Re {
  #t = [];
  #e = /* @__PURE__ */ Object.create(null);
  #r = [];
  #i;
  #n = emptyParams;
  insert(e, t, n) {
    let a = this;
    const i = splitRoutingPath(t), s = /* @__PURE__ */ new Set();
    let o = 0;
    for (const c of i) {
      const d = i[++o], u = getPattern(c, d) || (d === void 0 && c && c.indexOf("*") === c.length - 1 ? c : null), f = Array.isArray(u), h = f ? u[0] : u || c, g = a.#e[h] ||= new Re();
      u && !g.#i && (g.#i = u, a.#r.push(g)), a = g, f && s.add(u[1]);
    }
    a.#t.push({
      [e]: {
        handler: n,
        possibleKeys: [...s],
        score: ++order
      }
    });
  }
  #a(e, t, n, a, i) {
    for (let s = 0, o = t.#t.length; s < o; s++) {
      const c = t.#t[s], d = c[n] || c[METHOD_NAME_ALL];
      if (d) {
        d.params = /* @__PURE__ */ Object.create(null), e.push(d);
        for (let u = 0, f = d.possibleKeys.length; u < f; u++) {
          const h = d.possibleKeys[u];
          d.params[h] = i?.[h] && !u ? i[h] : a[h] ?? i?.[h];
        }
      }
    }
  }
  search(e, t) {
    const n = [];
    this.#n = emptyParams;
    let i = [this];
    const s = splitPath(t), o = [], c = s.length;
    let d = null;
    for (let u = 0; u < c; u++) {
      const f = s[u], h = u === c - 1, g = [];
      for (let _ = 0, P = i.length; _ < P; _++) {
        const O = i[_], v = O.#e[f];
        v && (v.#n = O.#n, h ? (v.#e["*"] && this.#a(n, v.#e["*"], e, O.#n), this.#a(n, v, e, O.#n)) : g.push(v));
        for (const y of O.#r) {
          const A = y.#i, E = O.#n === emptyParams ? {} : { ...O.#n };
          if (typeof A == "string") {
            (A === "*" || f.startsWith(A.slice(0, -1))) && (this.#a(n, y, e, O.#n), A === "*" && (y.#n = E, g.push(y)));
            continue;
          }
          const [, I, N] = A;
          if (!(!f && N === !0)) {
            if (N !== !0) {
              if (!d) {
                d = [];
                let B = t[0] === "/" ? 1 : 0;
                for (let H = 0; H < c; H++)
                  d[H] = B, B += s[H].length + 1;
              }
              const $ = t.slice(d[u]), M = N.exec($);
              if (M) {
                E[I] = M[0], this.#a(n, y, e, O.#n, E), M[0].length === $.length && y.#e["*"] && this.#a(
                  n,
                  y.#e["*"],
                  e,
                  O.#n,
                  E
                );
                for (const B in y.#e) {
                  y.#n = E;
                  const H = M[0].match(/\//g)?.length ?? 0;
                  (o[H] ||= []).push(y);
                  break;
                }
                continue;
              }
            }
            (N === !0 || N.test(f)) && (E[I] = f, h ? (this.#a(n, y, e, E, O.#n), y.#e["*"] && this.#a(
              n,
              y.#e["*"],
              e,
              E,
              O.#n
            )) : (y.#n = E, g.push(y)));
          }
        }
      }
      const x = o.shift();
      i = x ? g.concat(x) : g;
    }
    return n[1] && n.sort((u, f) => u.score - f.score), [n.map(({ handler: u, params: f }) => [u, f])];
  }
}, TrieRouter = class {
  name = "TrieRouter";
  #t = new Node();
  add(r, e, t) {
    for (const n of checkOptionalParameter(e) || [e])
      this.#t.insert(r, n, t);
  }
  match(r, e) {
    return this.#t.search(r, e);
  }
}, Hono = class extends Hono$1 {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(r = {}) {
    super(r), this.router = r.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, OpenAPIHono = class Ae extends Hono {
  openAPIRegistry;
  defaultHook;
  constructor(e) {
    super(e), this.openAPIRegistry = new OpenAPIRegistry(), this.defaultHook = e?.defaultHook;
  }
  /**
   *
   * @param {RouteConfig} route - The route definition which you create with `createRoute()`.
   * @param {Handler} handler - The handler. If you want to return a JSON object, you should specify the status code with `c.json()`.
   * @param {Hook} hook - Optional. The hook method defines what it should do after validation.
   * @example
   * app.openapi(
   *   route,
   *   (c) => {
   *     // ...
   *     return c.json(
   *       {
   *         age: 20,
   *         name: 'Young man',
   *       },
   *       200 // You should specify the status code even if it's 200.
   *     )
   *   },
   *  (result, c) => {
   *    if (!result.success) {
   *      return c.json(
   *        {
   *          code: 400,
   *          message: 'Custom Message',
   *        },
   *        400
   *      )
   *    }
   *  }
   *)
   */
  openapi = ({ middleware: e, ...t }, n, a = this.defaultHook) => {
    this.openAPIRegistry.registerPath(t);
    const i = [];
    if (t.request?.query) {
      const c = zValidator("query", t.request.query, a);
      i.push(c);
    }
    if (t.request?.params) {
      const c = zValidator("param", t.request.params, a);
      i.push(c);
    }
    if (t.request?.headers) {
      const c = zValidator("header", t.request.headers, a);
      i.push(c);
    }
    if (t.request?.cookies) {
      const c = zValidator("cookie", t.request.cookies, a);
      i.push(c);
    }
    const s = t.request?.body?.content;
    if (s)
      for (const c of Object.keys(s)) {
        if (!s[c])
          continue;
        const d = s[c].schema;
        if (d instanceof ZodType) {
          if (isJSONContentType(c)) {
            const u = zValidator("json", d, a);
            if (t.request?.body?.required)
              i.push(u);
            else {
              const f = async (h, g) => {
                if (h.req.header("content-type") && isJSONContentType(h.req.header("content-type")))
                  return await u(h, g);
                h.req.addValidatedData("json", {}), await g();
              };
              i.push(f);
            }
          }
          if (isFormContentType(c)) {
            const u = zValidator("form", d, a);
            if (t.request?.body?.required)
              i.push(u);
            else {
              const f = async (h, g) => {
                if (h.req.header("content-type") && isFormContentType(h.req.header("content-type")))
                  return await u(h, g);
                h.req.addValidatedData("form", {}), await g();
              };
              i.push(f);
            }
          }
        }
      }
    const o = e ? Array.isArray(e) ? e : [e] : [];
    return this.on(
      [t.method],
      t.path.replaceAll(/\/{(.+?)}/g, "/:$1"),
      ...o,
      ...i,
      n
    ), this;
  };
  getOpenAPIDocument = (e) => {
    const n = new OpenApiGeneratorV3(this.openAPIRegistry.definitions).generateDocument(e);
    return this._basePath ? addBasePathToDocument(n, this._basePath) : n;
  };
  getOpenAPI31Document = (e) => {
    const n = new OpenApiGeneratorV31(this.openAPIRegistry.definitions).generateDocument(e);
    return this._basePath ? addBasePathToDocument(n, this._basePath) : n;
  };
  doc = (e, t) => this.get(e, (n) => {
    const a = typeof t == "function" ? t(n) : t;
    try {
      const i = this.getOpenAPIDocument(a);
      return n.json(i);
    } catch (i) {
      return n.json(i, 500);
    }
  });
  doc31 = (e, t) => this.get(e, (n) => {
    const a = typeof t == "function" ? t(n) : t;
    try {
      const i = this.getOpenAPI31Document(a);
      return n.json(i);
    } catch (i) {
      return n.json(i, 500);
    }
  });
  route(e, t) {
    const n = e.replaceAll(/:([^\/]+)/g, "{$1}");
    return super.route(e, t), t instanceof Ae ? (t.openAPIRegistry.definitions.forEach((a) => {
      switch (a.type) {
        case "component":
          return this.openAPIRegistry.registerComponent(a.componentType, a.name, a.component);
        case "route":
          return this.openAPIRegistry.registerPath({
            ...a.route,
            path: mergePath(
              n,
              // @ts-expect-error _basePath is private
              t._basePath,
              a.route.path
            )
          });
        case "webhook":
          return this.openAPIRegistry.registerWebhook({
            ...a.webhook,
            path: mergePath(
              n,
              // @ts-expect-error _basePath is private
              t._basePath,
              a.webhook.path
            )
          });
        case "schema":
          return this.openAPIRegistry.register(a.schema._def.openapi._internal.refId, a.schema);
        case "parameter":
          return this.openAPIRegistry.registerParameter(
            a.schema._def.openapi._internal.refId,
            a.schema
          );
        default: {
          const i = a;
          throw new Error(`Unknown registry type: ${i}`);
        }
      }
    }), this) : this;
  }
  basePath(e) {
    return new Ae({ ...super.basePath(e), defaultHook: this.defaultHook });
  }
}, createRoute = (r) => {
  const e = {
    ...r,
    getRoutingPath() {
      return r.path.replaceAll(/\/{(.+?)}/g, "/:$1");
    }
  };
  return Object.defineProperty(e, "getRoutingPath", { enumerable: !1 });
};
extendZodWithOpenApi(z);
function addBasePathToDocument(r, e) {
  const t = {};
  return Object.keys(r.paths).forEach((n) => {
    t[mergePath(e, n)] = r.paths[n];
  }), {
    ...r,
    paths: t
  };
}
function isJSONContentType(r) {
  return /^application\/([a-z-\.]+\+)?json/.test(r);
}
function isFormContentType(r) {
  return r.startsWith("multipart/form-data") || r.startsWith("application/x-www-form-urlencoded");
}
const Layout = ({
  children: r,
  title: e = "Modern Edge Docs",
  description: t = "Documentation and API Reference powered by Hono, Scalar, and Cloudflare Workers.",
  activePath: n = "/"
}) => {
  const a = e === "Modern Edge Docs" ? e : `${e} | Edge Docs`;
  return /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDEV("head", { children: [
      /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      /* @__PURE__ */ jsxDEV("title", { children: a }),
      /* @__PURE__ */ jsxDEV("meta", { name: "description", content: t }),
      /* @__PURE__ */ jsxDEV("link", { rel: "icon", href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" }),
      /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: `
          :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --border-color: #e2e8f0;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --accent: #f97316; /* Cloudflare orange */
            --accent-hover: #ea580c;
            --accent-light: #fff7ed;
            --accent-text: #c2410c;
            --code-bg: #1e293b;
            --code-text: #e2e8f0;
            --sidebar-width: 280px;
            --toc-width: 240px;
            --header-height: 64px;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          [data-theme="dark"] {
            --bg-primary: #0b0f19;
            --bg-secondary: #111827;
            --bg-tertiary: #1f2937;
            --border-color: #1f2937;
            --text-primary: #f9fafb;
            --text-secondary: #cbd5e1;
            --text-muted: #94a3b8;
            --accent: #fb923c;
            --accent-hover: #f97316;
            --accent-light: #2c1a11;
            --accent-text: #fdba74;
            --code-bg: #090d16;
            --code-text: #f1f5f9;
          }

          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
              --bg-primary: #0b0f19;
              --bg-secondary: #111827;
              --bg-tertiary: #1f2937;
              --border-color: #1f2937;
              --text-primary: #f9fafb;
              --text-secondary: #cbd5e1;
              --text-muted: #94a3b8;
              --accent: #fb923c;
              --accent-hover: #f97316;
              --accent-light: #2c1a11;
              --accent-text: #fdba74;
              --code-bg: #090d16;
              --code-text: #f1f5f9;
            }
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: var(--font-sans);
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
          }

          a {
            color: var(--accent);
            text-decoration: none;
            transition: color 0.15s ease;
          }
          a:hover {
            color: var(--accent-hover);
          }

          /* Header / Navbar */
          .site-header {
            position: sticky;
            top: 0;
            z-index: 40;
            height: var(--header-height);
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            backdrop-filter: blur(8px);
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }

          .brand-logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--text-primary);
          }

          .brand-badge {
            background: var(--accent-light);
            color: var(--accent-text);
            font-size: 0.75rem;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-weight: 600;
            border: 1px solid var(--accent);
          }

          .nav-links {
            display: flex;
            align-items: center;
            gap: 1.25rem;
            list-style: none;
          }

          .nav-link {
            font-size: 0.9375rem;
            font-weight: 500;
            color: var(--text-secondary);
            padding: 0.375rem 0.625rem;
            border-radius: 0.375rem;
          }
          .nav-link:hover, .nav-link.active {
            color: var(--accent);
            background: var(--bg-tertiary);
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .search-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.375rem 0.75rem;
            color: var(--text-muted);
            font-size: 0.875rem;
            cursor: pointer;
            transition: border-color 0.15s;
          }
          .search-btn:hover {
            border-color: var(--accent);
            color: var(--text-primary);
          }

          .search-shortcut {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            padding: 0.1rem 0.35rem;
            font-size: 0.75rem;
            font-family: var(--font-mono);
          }

          .theme-toggle-btn, .mobile-menu-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.45rem 0.6rem;
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .theme-toggle-btn:hover, .mobile-menu-btn:hover {
            background: var(--bg-tertiary);
            color: var(--text-primary);
          }

          .mobile-menu-btn {
            display: none;
          }

          /* Content Container */
          .main-wrapper {
            min-height: calc(100vh - var(--header-height));
            display: flex;
            flex-direction: column;
          }

          /* Docs Layout Grid */
          .docs-container {
            display: flex;
            max-width: 1536px;
            margin: 0 auto;
            width: 100%;
            flex: 1;
          }

          .sidebar {
            width: var(--sidebar-width);
            flex-shrink: 0;
            position: sticky;
            top: var(--header-height);
            height: calc(100vh - var(--header-height));
            overflow-y: auto;
            padding: 1.5rem 1rem;
            border-right: 1px solid var(--border-color);
            background: var(--bg-primary);
          }

          .sidebar-group {
            margin-bottom: 1.5rem;
          }

          .sidebar-group-title {
            font-size: 0.8125rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
            padding: 0 0.5rem;
          }

          .sidebar-menu {
            list-style: none;
          }

          .sidebar-item {
            margin: 0.125rem 0;
          }

          .sidebar-link {
            display: block;
            padding: 0.4rem 0.6rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
            border-radius: 0.375rem;
            font-weight: 400;
            line-height: 1.4;
          }
          .sidebar-link:hover {
            color: var(--text-primary);
            background: var(--bg-secondary);
          }
          .sidebar-link.active {
            color: var(--accent-text);
            background: var(--accent-light);
            font-weight: 600;
          }

          .content-area {
            flex: 1;
            min-width: 0;
            padding: 2.5rem 3rem;
            max-width: 860px;
          }

          .toc-area {
            width: var(--toc-width);
            flex-shrink: 0;
            position: sticky;
            top: var(--header-height);
            height: calc(100vh - var(--header-height));
            overflow-y: auto;
            padding: 2rem 1rem;
            display: block;
          }

          .toc-title {
            font-size: 0.8125rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 0.75rem;
          }

          .toc-list {
            list-style: none;
            border-left: 2px solid var(--border-color);
            padding-left: 0.75rem;
          }

          .toc-item {
            margin: 0.375rem 0;
          }
          .toc-item.level-3 {
            padding-left: 0.75rem;
          }
          .toc-item.level-4 {
            padding-left: 1.5rem;
          }

          .toc-link {
            font-size: 0.8125rem;
            color: var(--text-muted);
            display: block;
            line-height: 1.4;
          }
          .toc-link:hover, .toc-link.active {
            color: var(--accent);
          }

          /* Breadcrumbs */
          .breadcrumbs {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-bottom: 1.25rem;
          }
          .breadcrumb-separator {
            opacity: 0.5;
          }

          /* Markdown Prose Typography */
          .doc-prose {
            color: var(--text-primary);
            line-height: 1.75;
          }

          .doc-prose h1 {
            font-size: 2.25rem;
            font-weight: 800;
            margin-bottom: 1rem;
            line-height: 1.25;
            letter-spacing: -0.02em;
          }

          .doc-prose h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 2.25rem;
            margin-bottom: 0.75rem;
            padding-bottom: 0.4rem;
            border-bottom: 1px solid var(--border-color);
            letter-spacing: -0.01em;
          }

          .doc-prose h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.75rem;
            margin-bottom: 0.5rem;
          }

          .doc-prose p {
            margin-bottom: 1.25rem;
            color: var(--text-secondary);
          }

          .doc-prose ul, .doc-prose ol {
            margin-bottom: 1.25rem;
            padding-left: 1.5rem;
            color: var(--text-secondary);
          }

          .doc-prose li {
            margin-bottom: 0.375rem;
          }

          .doc-prose strong {
            color: var(--text-primary);
          }

          .doc-prose code:not(pre code) {
            background: var(--bg-tertiary);
            color: var(--accent-text);
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
            font-family: var(--font-mono);
          }

          /* Code block container */
          .code-block-wrapper {
            background: var(--code-bg);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            margin: 1.25rem 0;
            overflow: hidden;
          }

          .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.2);
            padding: 0.35rem 0.75rem;
            font-size: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .code-lang {
            color: #94a3b8;
            text-transform: uppercase;
            font-family: var(--font-mono);
            font-weight: 600;
          }

          .copy-code-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #cbd5e1;
            padding: 0.2rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            cursor: pointer;
            font-family: var(--font-sans);
          }
          .copy-code-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
          }

          pre[class*="language-"] {
            margin: 0;
            padding: 1rem;
            overflow-x: auto;
            font-family: var(--font-mono);
            font-size: 0.875rem;
            line-height: 1.6;
            color: var(--code-text);
            background: transparent;
          }

          /* Prism Token Styles */
          .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #64748b; font-style: italic; }
          .token.punctuation { color: #94a3b8; }
          .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol { color: #f472b6; }
          .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin { color: #38bdf8; }
          .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #a78bfa; }
          .token.atrule, .token.attr-value, .token.keyword { color: #fb923c; font-weight: 600; }
          .token.function, .token.class-name { color: #4ade80; }
          .token.regex, .token.important, .token.variable { color: #fbbf24; }

          /* Tables */
          .table-container {
            width: 100%;
            overflow-x: auto;
            margin: 1.5rem 0;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.875rem;
          }

          th {
            background: var(--bg-secondary);
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 1px solid var(--border-color);
          }

          td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border-color);
            color: var(--text-secondary);
          }

          tr:last-child td {
            border-bottom: none;
          }

          /* Callouts / Alerts */
          .callout {
            border-radius: 0.5rem;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            border-left: 4px solid;
            background: var(--bg-secondary);
          }

          .callout-title {
            font-weight: 700;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .callout-body p {
            margin-bottom: 0.5rem;
          }
          .callout-body p:last-child {
            margin-bottom: 0;
          }

          .callout-note { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
          .callout-note .callout-title { color: #2563eb; }

          .callout-tip { border-color: #10b981; background: rgba(16, 185, 129, 0.08); }
          .callout-tip .callout-title { color: #059669; }

          .callout-important { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); }
          .callout-important .callout-title { color: #7c3aed; }

          .callout-warning { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
          .callout-warning .callout-title { color: #d97706; }

          .callout-caution { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
          .callout-caution .callout-title { color: #dc2626; }

          /* Heading Anchors */
          .heading-anchor {
            opacity: 0;
            margin-left: 0.5rem;
            color: var(--text-muted);
            font-weight: 400;
            font-size: 0.85em;
          }
          .doc-heading:hover .heading-anchor {
            opacity: 1;
          }

          /* Pagination footer */
          .docs-pagination {
            display: flex;
            justify-content: space-between;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
            gap: 1rem;
          }

          .pagination-card {
            display: flex;
            flex-direction: column;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            flex: 1;
            text-decoration: none;
            transition: all 0.15s ease;
          }
          .pagination-card:hover {
            border-color: var(--accent);
            background: var(--bg-secondary);
          }
          .pagination-card.next {
            text-align: right;
          }

          .pagination-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }

          .pagination-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-top: 0.25rem;
          }

          /* Search Modal */
          .search-modal-backdrop {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 100;
            align-items: flex-start;
            justify-content: center;
            padding-top: 10vh;
          }
          .search-modal-backdrop.open {
            display: flex;
          }

          .search-modal {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 0.75rem;
            width: 100%;
            max-width: 600px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 70vh;
          }

          .search-input-wrapper {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .search-modal-input {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            font-size: 1.125rem;
            color: var(--text-primary);
            font-family: var(--font-sans);
          }

          .search-results-list {
            list-style: none;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .search-result-item {
            padding: 0.75rem;
            border-radius: 0.5rem;
            cursor: pointer;
          }
          .search-result-item:hover, .search-result-item.selected {
            background: var(--bg-tertiary);
          }

          .search-result-title {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9375rem;
          }

          .search-result-category {
            font-size: 0.75rem;
            color: var(--accent);
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          .search-result-snippet {
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
            line-height: 1.4;
          }

          /* Responsive Breakpoints */
          @media (max-width: 1100px) {
            .toc-area {
              display: none;
            }
          }

          @media (max-width: 768px) {
            .sidebar {
              display: none;
              position: fixed;
              left: 0;
              top: var(--header-height);
              bottom: 0;
              z-index: 50;
              width: 80%;
              max-width: 320px;
              box-shadow: 10px 0 20px rgba(0,0,0,0.2);
            }
            .sidebar.mobile-open {
              display: block;
            }
            .mobile-menu-btn {
              display: flex;
            }
            .content-area {
              padding: 1.5rem 1rem;
            }
            .nav-links {
              display: none;
            }
          }
        ` } })
    ] }),
    /* @__PURE__ */ jsxDEV("body", { children: [
      /* @__PURE__ */ jsxDEV("header", { class: "site-header", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "header-left", children: [
          /* @__PURE__ */ jsxDEV("button", { class: "mobile-menu-btn", id: "mobile-toggle", "aria-label": "Toggle sidebar menu", children: "☰" }),
          /* @__PURE__ */ jsxDEV("a", { href: "/", class: "brand-logo", children: [
            /* @__PURE__ */ jsxDEV("span", { style: "font-size: 1.35rem", children: "⚡" }),
            /* @__PURE__ */ jsxDEV("span", { children: "HonoDocs" }),
            /* @__PURE__ */ jsxDEV("span", { class: "brand-badge", children: "Cloudflare" })
          ] }),
          /* @__PURE__ */ jsxDEV("ul", { class: "nav-links", children: [
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/docs", class: `nav-link ${n.startsWith("/docs") ? "active" : ""}`, children: "Documentation" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/reference", class: `nav-link ${n.startsWith("/reference") ? "active" : ""}`, children: "API Reference" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/openapi.json", class: "nav-link", target: "_blank", rel: "noopener", children: "OpenAPI Spec ↗" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "header-right", children: [
          /* @__PURE__ */ jsxDEV("button", { class: "search-btn", id: "open-search-btn", "aria-label": "Search documentation", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "🔍 Search..." }),
            /* @__PURE__ */ jsxDEV("span", { class: "search-shortcut", children: "⌘K" })
          ] }),
          /* @__PURE__ */ jsxDEV("button", { class: "theme-toggle-btn", id: "theme-toggle-btn", "aria-label": "Toggle theme", title: "Toggle dark/light mode", children: "🌓" })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "search-modal-backdrop", id: "search-modal", children: /* @__PURE__ */ jsxDEV("div", { class: "search-modal", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "search-input-wrapper", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "🔍" }),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              id: "search-input",
              class: "search-modal-input",
              placeholder: "Search documentation, guides, API...",
              autocomplete: "off"
            }
          ),
          /* @__PURE__ */ jsxDEV("span", { class: "search-shortcut", children: "ESC" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { id: "search-results", class: "search-results-list", children: /* @__PURE__ */ jsxDEV("div", { style: "padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;", children: "Type to start searching..." }) })
      ] }) }),
      /* @__PURE__ */ jsxDEV("div", { class: "main-wrapper", children: r }),
      /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
          // Theme toggling
          const themeToggleBtn = document.getElementById('theme-toggle-btn');
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
          }

          themeToggleBtn?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
          });

          // Mobile sidebar drawer
          const mobileToggle = document.getElementById('mobile-toggle');
          const sidebar = document.querySelector('.sidebar');
          mobileToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('mobile-open');
          });

          // Search Modal Logic
          const searchModal = document.getElementById('search-modal');
          const openSearchBtn = document.getElementById('open-search-btn');
          const searchInput = document.getElementById('search-input');
          const searchResults = document.getElementById('search-results');
          let searchData = [];

          async function loadSearchData() {
            if (searchData.length === 0) {
              try {
                const res = await fetch('/api/search');
                searchData = await res.json();
              } catch (e) {
                console.error('Failed to load search index', e);
              }
            }
          }

          function openSearch() {
            searchModal?.classList.add('open');
            loadSearchData();
            setTimeout(() => searchInput?.focus(), 50);
          }

          function closeSearch() {
            searchModal?.classList.remove('open');
            if (searchInput) searchInput.value = '';
          }

          openSearchBtn?.addEventListener('click', openSearch);

          window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              openSearch();
            }
            if (e.key === 'Escape') {
              closeSearch();
            }
          });

          searchModal?.addEventListener('click', (e) => {
            if (e.target === searchModal) closeSearch();
          });

          searchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (!query) {
              searchResults.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Type to start searching...</div>';
              return;
            }

            const matches = searchData.filter(item => 
              item.title.toLowerCase().includes(query) ||
              item.category.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query) ||
              item.contentSnippet.toLowerCase().includes(query)
            ).slice(0, 8);

            if (matches.length === 0) {
              searchResults.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No matching documents found.</div>';
              return;
            }

            searchResults.innerHTML = matches.map(item => \`
              <div class="search-result-item" onclick="window.location.href='/docs/\${item.slug}'">
                <div class="search-result-category">\${item.category}</div>
                <div class="search-result-title">\${item.title}</div>
                <div class="search-result-snippet">\${item.description || item.contentSnippet}</div>
              </div>
            \`).join('');
          });

          // Scroll Spy for TOC active links
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                document.querySelectorAll('.toc-link').forEach(link => {
                  link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
              }
            });
          }, { rootMargin: '0px 0px -80% 0px' });

          document.querySelectorAll('.doc-heading').forEach(heading => {
            observer.observe(heading);
          });
        ` } })
    ] })
  ] });
}, HomePage = () => /* @__PURE__ */ jsxDEV(Layout, { title: "Modern Edge Docs | Hono + Scalar + Cloudflare", activePath: "/", children: /* @__PURE__ */ jsxDEV("div", { style: "max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; text-align: center;", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "margin-bottom: 3.5rem;", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; margin-bottom: 1.5rem; color: var(--accent);", children: /* @__PURE__ */ jsxDEV("span", { children: "⚡ Powered by Hono + Scalar + Cloudflare Workers" }) }),
    /* @__PURE__ */ jsxDEV("h1", { style: "font-size: clamp(2.5rem, 5vw, 3.75rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; color: var(--text-primary);", children: [
      "Next-Gen Documentation & ",
      /* @__PURE__ */ jsxDEV("br", {}),
      /* @__PURE__ */ jsxDEV("span", { style: "color: var(--accent); background: linear-gradient(135deg, var(--accent), #e11d48); -webkit-background-clip: text; -webkit-text-fill-color: transparent;", children: "Interactive API Reference" })
    ] }),
    /* @__PURE__ */ jsxDEV("p", { style: "font-size: 1.25rem; color: var(--text-secondary); max-width: 700px; margin: 0 auto 2.5rem; line-height: 1.6;", children: "A complete edge-native documentation platform. Author documentation in Markdown with instant SSR, type-safe OpenAPI endpoints, and interactive Scalar API playground." }),
    /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;", children: [
      /* @__PURE__ */ jsxDEV(
        "a",
        {
          href: "/docs",
          style: "background: var(--accent); color: white; padding: 0.875rem 1.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);",
          children: "Get Started with Docs →"
        }
      ),
      /* @__PURE__ */ jsxDEV(
        "a",
        {
          href: "/reference",
          style: "background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.875rem 1.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;",
          children: "Interactive API Reference 🚀"
        }
      )
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; text-align: left;", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "font-size: 1.75rem; margin-bottom: 0.75rem;", children: "🔥" }),
      /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);", children: "Hono Web Framework" }),
      /* @__PURE__ */ jsxDEV("p", { style: "color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;", children: "Ultra-fast router and middleware engine built on Web Standards. Ultra-low latency cold starts." })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { style: "background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "font-size: 1.75rem; margin-bottom: 0.75rem;", children: "📖" }),
      /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);", children: "Scalar API Reference" }),
      /* @__PURE__ */ jsxDEV("p", { style: "color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;", children: "Stunning modern UI for OpenAPI 3.1 specifications with interactive request testing and live schema viewer." })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { style: "background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "font-size: 1.75rem; margin-bottom: 0.75rem;", children: "📝" }),
      /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);", children: "Markdown & Frontmatter" }),
      /* @__PURE__ */ jsxDEV("p", { style: "color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;", children: "Author guide articles in standard Markdown with YAML frontmatter, GitHub alerts, code highlighting, and TOC." })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { style: "background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "font-size: 1.75rem; margin-bottom: 0.75rem;", children: "☁️" }),
      /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);", children: "Cloudflare Workers" }),
      /* @__PURE__ */ jsxDEV("p", { style: "color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;", children: "Deploy anywhere worldwide with zero configuration. Scalable serverless architecture with global CDN caching." })
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { style: "background: var(--code-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; text-align: left; overflow: hidden; max-width: 800px; margin: 0 auto;", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "background: rgba(0,0,0,0.3); padding: 0.75rem 1rem; font-size: 0.8125rem; color: #94a3b8; font-family: var(--font-mono); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;", children: [
      /* @__PURE__ */ jsxDEV("span", { style: "width: 10px; height: 10px; border-radius: 50%; background: #ef4444; display: inline-block;" }),
      /* @__PURE__ */ jsxDEV("span", { style: "width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; display: inline-block;" }),
      /* @__PURE__ */ jsxDEV("span", { style: "width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block;" }),
      /* @__PURE__ */ jsxDEV("span", { style: "margin-left: 0.5rem;", children: "src/index.ts" })
    ] }),
    /* @__PURE__ */ jsxDEV("pre", { style: "padding: 1.25rem; margin: 0; color: #f1f5f9; font-family: var(--font-mono); font-size: 0.875rem; overflow-x: auto;", children: `import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono()

// Mount interactive Scalar API playground
app.get('/reference', Scalar({ url: '/openapi.json' }))

// Export Cloudflare Workers entrypoint
export default app` })
  ] })
] }) }), NotFoundPage = () => /* @__PURE__ */ jsxDEV(Layout, { title: "404 - Page Not Found", activePath: "/404", children: /* @__PURE__ */ jsxDEV("div", { style: "max-width: 600px; margin: 6rem auto; text-align: center; padding: 0 1.5rem;", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "font-size: 4rem; font-weight: 800; color: var(--accent); margin-bottom: 1rem;", children: "404" }),
  /* @__PURE__ */ jsxDEV("h1", { style: "font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);", children: "Documentation Page Not Found" }),
  /* @__PURE__ */ jsxDEV("p", { style: "color: var(--text-secondary); margin-bottom: 2rem;", children: "The documentation page or API endpoint you are looking for might have been moved, renamed, or does not exist." }),
  /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 1rem; justify-content: center;", children: [
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        href: "/docs",
        style: "background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;",
        children: "Browse Documentation"
      }
    ),
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        href: "/",
        style: "background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;",
        children: "Go to Home"
      }
    )
  ] })
] }) }), __vite_glob_0_0 = `---
title: Introduction
description: Welcome to the Hono + Scalar + Cloudflare documentation platform.
category: Getting Started
order: 1
---

# Introduction to the Docs Platform

Welcome to your modern, lightning-fast documentation site! This project brings together the best tools in the TypeScript and edge ecosystems to deliver instant load times, seamless markdown authoring, and interactive API documentation.

> [!NOTE]
> This platform runs natively on **Cloudflare Workers**, giving your documentation sub-millisecond cold starts and global edge caching worldwide.

## Why this Stack?

- ⚡ **[Hono](https://hono.dev)**: Ultra-fast, lightweight web framework built on web standards with zero external dependencies in the core.
- 📖 **[Scalar](https://scalar.com)**: World-class, interactive API reference playground that renders OpenAPI 3.0 and 3.1 specifications beautifully.
- 📝 **Markdown-Powered**: Author documentation in standard Markdown or GitHub Flavored Markdown (GFM) with frontmatter metadata.
- ☁️ **Cloudflare Ecosystem**: Deploy in seconds to Cloudflare Workers with Wrangler, backed by Cloudflare's global edge network.

## Key Features

1. **Server-Side Rendered (SSR) Markdown**: Markdown files are parsed and transformed to HTML at the edge using Hono JSX, ensuring fast first-contentful-paint (FCP) and optimal SEO.
2. **Type-Safe OpenAPI Spec Generation**: Define your API routes and validation schemas with \`@hono/zod-openapi\` and generate documentation automatically.
3. **Interactive API Reference**: Explore endpoints, inspect schemas, and test API calls live using the embedded Scalar interface.
4. **Built-in Search & Navigation**: Instant client-side search across all markdown articles with keyboard navigation (\`Ctrl+K\` / \`Cmd+K\`).
5. **Code Syntax Highlighting & Copy**: Pre-rendered syntax highlighting with one-click copy buttons and language badges.
6. **Alerts & Callouts**: GitHub-style alert callouts (\`[!NOTE]\`, \`[!TIP]\`, \`[!IMPORTANT]\`, \`[!WARNING]\`, \`[!CAUTION]\`).

## Quick Navigation

- [Installation Guide](/docs/getting-started/installation)
- [Quickstart Tutorial](/docs/getting-started/quickstart)
- [Configuration Reference](/docs/guides/configuration)
- [Interactive API Playground](/reference)

\`\`\`typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono()

app.get('/scalar', Scalar({ url: '/openapi.json' }))

export default app
\`\`\`
`, __vite_glob_0_1 = `---
title: Installation & Setup
description: Learn how to install prerequisites and run the documentation platform locally.
category: Getting Started
order: 2
---

# Installation & Local Setup

Setting up your Hono and Scalar documentation project is straightforward and requires only Node.js (or Bun / pnpm).

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js**: \`v18.0.0\` or later (Node 20+ recommended)
- **Package Manager**: \`npm\`, \`pnpm\`, \`yarn\`, or \`bun\`
- **Cloudflare Account**: (Optional, for production deployment)

## Clone & Install Dependencies

Clone your repository and install the project dependencies:

\`\`\`bash
# Install dependencies with npm
npm install

# Or using pnpm
pnpm install

# Or using bun
bun install
\`\`\`

## Running the Development Server

Start the local development server with hot-module replacement (HMR):

\`\`\`bash
npm run dev
\`\`\`

The server will start at \`http://localhost:5173\`. Open your browser to navigate the site:
- **Landing Page**: \`http://localhost:5173/\`
- **Documentation**: \`http://localhost:5173/docs\`
- **Scalar API Reference**: \`http://localhost:5173/reference\`
- **OpenAPI JSON Spec**: \`http://localhost:5173/openapi.json\`

> [!TIP]
> Changes made to markdown files inside \`content/docs/\` will automatically update on refresh!

## Project Verification

To verify that TypeScript types and builds pass without errors:

\`\`\`bash
# Check TypeScript types
npm run check

# Build production bundle
npm run build
\`\`\`
`, __vite_glob_0_2 = `---
title: Quickstart Guide
description: Get up and running in under 5 minutes with a new documentation page and API route.
category: Getting Started
order: 3
---

# Quickstart Guide

This quick tutorial will guide you through adding a new documentation article and defining a new API endpoint that appears automatically in Scalar.

## Step 1: Add a New Markdown Page

Create a new file in \`content/docs/02-guides/04-custom-guide.md\`:

\`\`\`markdown
---
title: My Custom Guide
description: An awesome custom guide.
category: Guides
order: 4
---

# My Custom Guide

Write your markdown here using standard Markdown syntax, callouts, and code blocks!

> [!NOTE]
> This note callout renders with custom styles.
\`\`\`

Your new page will immediately be available at \`/docs/guides/custom-guide\` and will be added to the sidebar navigation and search index!

## Step 2: Define a Documented OpenAPI Endpoint

Add a new route with \`@hono/zod-openapi\` in \`src/api/routes.ts\`:

\`\`\`typescript
import { createRoute, z } from '@hono/zod-openapi'

export const helloRoute = createRoute({
  method: 'get',
  path: '/api/v1/hello',
  tags: ['Greetings'],
  summary: 'Say Hello',
  description: 'Returns a friendly greeting message.',
  responses: {
    200: {
      description: 'Successful greeting response',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({ example: 'Hello, world!' })
          })
        }
      }
    }
  }
})
\`\`\`

Register it in your app:

\`\`\`typescript
app.openapi(helloRoute, (c) => {
  return c.json({ message: 'Hello, world!' }, 200)
})
\`\`\`

## Step 3: View in Scalar

Open \`http://localhost:5173/reference\` in your browser. The new **Greetings** tag and \`/api/v1/hello\` route will be immediately visible, complete with schema definitions and interactive testing!
`, __vite_glob_0_3 = `---
title: Configuration & Customization
description: How to configure themes, site metadata, Scalar options, and Cloudflare settings.
category: Guides
order: 1
---

# Configuration & Customization

This guide details how to customize your documentation site's branding, themes, OpenAPI settings, and Cloudflare deployment configurations.

## Wrangler Configuration (\`wrangler.jsonc\`)

The \`wrangler.jsonc\` file controls how Cloudflare Workers executes and deploys your project:

\`\`\`json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hono-scalar-docs",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-14",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "observability": {
    "enabled": true
  }
}
\`\`\`

### Key Wrangler Properties

- \`name\`: The name of your Cloudflare Worker project.
- \`main\`: The entry point script (\`src/index.ts\`).
- \`compatibility_date\`: Locks the Cloudflare runtime version to prevent breaking changes.
- \`compatibility_flags\`: Includes \`nodejs_compat\` to allow Node-compatible APIs.

## Scalar API Reference Customization

Scalar can be customized inside \`src/api/scalar.ts\` using the \`@scalar/hono-api-reference\` options:

\`\`\`typescript
import { Scalar } from '@scalar/hono-api-reference'

export const scalarMiddleware = Scalar({
  url: '/openapi.json',
  theme: 'purple', // 'default' | 'alternate' | 'moon' | 'purple' | 'solarized' | 'bluePlanet' | 'deepSpace'
  layout: 'modern', // 'modern' | 'classic'
  showSidebar: true,
  searchHotKey: 'k',
  customCss: \`
    :root {
      --scalar-font: 'Inter', sans-serif;
    }
  \`
})
\`\`\`

## OpenAPI Specification Info

The metadata displayed at the top of your Scalar API reference is defined in \`src/index.ts\`:

\`\`\`typescript
app.doc('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Cloudflare Documentation & REST API',
    version: '1.0.0',
    description: 'Interactive API reference and documentation powered by Hono and Scalar on Cloudflare Workers.'
  },
  servers: [
    {
      url: 'https://hono-scalar-docs.your-subdomain.workers.dev',
      description: 'Production Edge Worker'
    },
    {
      url: 'http://localhost:5173',
      description: 'Local Development Server'
    }
  ]
})
\`\`\`
`, __vite_glob_0_4 = `---
title: Authoring Markdown Docs
description: Complete reference for writing markdown files, frontmatter options, alerts, and tables.
category: Guides
order: 2
---

# Authoring Markdown Docs

Documentation files are organized inside the \`content/docs/\` directory. Each markdown file can include YAML frontmatter, headers, tables, callouts, and highlighted code snippets.

## Frontmatter Schema

Each document supports the following YAML frontmatter keys:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| \`title\` | \`string\` | **Yes** | The document's title in the sidebar, header, and search index |
| \`description\` | \`string\` | No | Short description for SEO and search snippets |
| \`category\` | \`string\` | No | Overrides the folder name for category grouping |
| \`order\` | \`number\` | No | Sort order within the category |
| \`slug\` | \`string\` | No | Custom route slug (e.g. \`/docs/custom-slug\`) |
| \`tags\` | \`string[]\` | No | Array of tags for categorization |

### Example Frontmatter

\`\`\`yaml
---
title: Authentication & Tokens
description: Learn how API keys and JWT authentication work.
category: Security & Auth
order: 1
tags: ["auth", "security", "tokens"]
---
\`\`\`

## Supported GitHub Alerts & Callouts

Add visual emphasis with alert callouts:

> [!NOTE]
> Informational context or helpful explanations.

> [!TIP]
> Best practices, performance optimizations, and handy shortcuts.

> [!IMPORTANT]
> Must-know details or crucial requirements.

> [!WARNING]
> Breaking changes or things that require caution.

> [!CAUTION]
> Dangerous operations that could result in data loss.

## Tables & Formatting

Standard GitHub Flavored Markdown (GFM) tables are automatically wrapped in responsive containers:

| HTTP Status | Meaning | Typical Usage |
| :--- | :--- | :--- |
| \`200 OK\` | Success | Standard successful response |
| \`201 Created\` | Resource Created | Resource creation response |
| \`400 Bad Request\` | Validation Error | Invalid request payload or parameter |
| \`401 Unauthorized\` | Missing / Invalid Auth | Invalid API token |
| \`404 Not Found\` | Not Found | Resource not found |

## Code Blocks & Syntax Highlighting

Code blocks are automatically highlighted with Prism.js and include a one-click copy button:

\`\`\`json
{
  "status": "success",
  "data": {
    "id": "usr_99812",
    "name": "Alex Mercer",
    "role": "Developer"
  }
}
\`\`\`
`, __vite_glob_0_5 = `---
title: Cloudflare Deployment
description: Deploy your documentation site to Cloudflare Workers with Wrangler in seconds.
category: Guides
order: 3
---

# Deploying to Cloudflare Workers

Deploying your documentation platform to Cloudflare Workers provides global distribution, DDoS protection, edge caching, and zero maintenance serverless architecture.

## Step 1: Login to Cloudflare via Wrangler

If you haven't already authenticated Wrangler with your Cloudflare account, run:

\`\`\`bash
npx wrangler login
\`\`\`

A browser window will open asking you to authorize the Cloudflare Workers CLI.

## Step 2: Deploy with a Single Command

To deploy the documentation site directly to your Cloudflare Workers account:

\`\`\`bash
npm run deploy
# or: npx wrangler deploy
\`\`\`

Wrangler will package your TypeScript code, bundle the markdown documentation, and deploy it to a \`*.workers.dev\` subdomain (or your custom domain).

## Custom Domain Setup

To attach your own domain (e.g. \`docs.yourdomain.com\`), update your \`wrangler.jsonc\` file:

\`\`\`json
{
  "name": "hono-scalar-docs",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-14",
  "routes": [
    {
      "pattern": "docs.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
\`\`\`

Then run \`npm run deploy\` again. Cloudflare will automatically provision SSL certificates and route traffic to your worker.

## Continuous Deployment with GitHub Actions

You can automate deployments using GitHub Actions:

\`\`\`yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
\`\`\`
`, __vite_glob_0_6 = `---
title: Admin Backend Panel
description: Guide on using the built-in Admin Panel to manage dynamic documentation and OpenAPI specifications.
category: Guides
order: 4
---

# Admin Backend Panel

The documentation platform includes a built-in, edge-native **Admin Backend Panel** located at \`/admin\`.

## Accessing the Admin Panel

1. Navigate to \`http://localhost:5173/admin\` (or \`https://your-worker.workers.dev/admin\`).
2. You will be prompted to log in.
3. Enter the default administrator password: \`admin123\` (customizable via \`ADMIN_PASSWORD\` environment secret).

> [!NOTE]
> Sessions are protected via HTTP-only signed cookies or \`Authorization: Bearer <password>\` headers.

## Admin Features

### 1. Dashboard Overview (\`/admin\`)
- Real-time statistics: Total articles, static vs dynamic counts, categories, and OpenAPI specifications.
- Quick navigation shortcuts to create new documents or edit OpenAPI schemas.

### 2. Documentation Management (\`/admin/docs\`)
- Full catalog of all static (filesystem) and dynamic (KV) documentation pages.
- Live search filter by title, category, or slug.
- Delete buttons for dynamic articles.

### 3. Markdown Live Editor (\`/admin/docs/new\`, \`/admin/docs/edit/:slug\`)
- Edit title, category, slug, sort order, and SEO description.
- **Split-screen live Markdown preview**: Watch headings, lists, code blocks, and GitHub alerts render in real-time as you type.
- Quick formatting toolbar (H2, H3, Bold, Italic, Code, Callout alerts).
- One-click **Save & Publish** button that instantly persists changes to Cloudflare KV.

### 4. OpenAPI Specification Editor (\`/admin/openapi\`)
- Edit OpenAPI 3.0 / 3.1 JSON definitions.
- Built-in JSON validator and formatting tool (\`Format JSON\`).
- Changes immediately update the live [Scalar API Reference](/reference) playground!

## Edge Storage Configuration (Cloudflare KV)

In production, dynamic documentation and OpenAPI schemas are saved to Cloudflare KV (\`DOCS_KV\` binding in \`wrangler.jsonc\`). In local development, an in-memory storage provider automatically handles all operations seamlessly.
`, __vite_glob_0_7 = `---
title: API Architecture & Overview
description: Overview of the REST API endpoints and interactive Scalar playground.
category: API Reference
order: 1
---

# API Overview & Playground

This project includes a built-in REST API powered by \`@hono/zod-openapi\` and interactive documentation rendered via \`@scalar/hono-api-reference\`.

## Interactive API Playground

You can explore all endpoints and test requests directly in the browser:

👉 **[Launch Interactive Scalar API Playground](/reference)**

## API Design Principles

1. **Type-Safe Validation**: All request bodies, query parameters, path params, and responses are validated via Zod.
2. **OpenAPI 3.1 Standard**: Specification generated natively at \`/openapi.json\`.
3. **Consistent Responses**: Standardized JSON response envelope across all endpoints.

## Base URLs

| Environment | URL |
| :--- | :--- |
| **Local Development** | \`http://localhost:5173\` |
| **Production Edge** | \`https://hono-scalar-docs.your-subdomain.workers.dev\` |

## Endpoints Overview

- \`GET /api/v1/health\` - System health and edge latency check.
- \`GET /api/v1/users\` - List all registered users with pagination.
- \`POST /api/v1/users\` - Create a new user with validation.
- \`GET /api/v1/users/:id\` - Retrieve user profile by ID.
- \`GET /api/v1/projects\` - List active projects.

## Example Request

\`\`\`bash
curl -X GET "http://localhost:5173/api/v1/users/usr_1" \\
  -H "Accept: application/json"
\`\`\`

Response:

\`\`\`json
{
  "id": "usr_1",
  "name": "Sarah Connor",
  "email": "sarah@example.com",
  "role": "admin",
  "createdAt": "2026-01-15T08:30:00.000Z"
}
\`\`\`
`;
var commonjsGlobal = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function getDefaultExportFromCjs(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
function getAugmentedNamespace(r) {
  if (Object.prototype.hasOwnProperty.call(r, "__esModule")) return r;
  var e = r.default;
  if (typeof e == "function") {
    var t = function n() {
      return this instanceof n ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    t.prototype = e.prototype;
  } else t = {};
  return Object.defineProperty(t, "__esModule", { value: !0 }), Object.keys(r).forEach(function(n) {
    var a = Object.getOwnPropertyDescriptor(r, n);
    Object.defineProperty(t, n, a.get ? a : {
      enumerable: !0,
      get: function() {
        return r[n];
      }
    });
  }), t;
}
const __viteBrowserExternal = {}, __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" })), require$$0 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
var kindOf, hasRequiredKindOf;
function requireKindOf() {
  if (hasRequiredKindOf) return kindOf;
  hasRequiredKindOf = 1;
  var r = Object.prototype.toString;
  kindOf = function(f) {
    if (f === void 0) return "undefined";
    if (f === null) return "null";
    var h = typeof f;
    if (h === "boolean") return "boolean";
    if (h === "string") return "string";
    if (h === "number") return "number";
    if (h === "symbol") return "symbol";
    if (h === "function")
      return s(f) ? "generatorfunction" : "function";
    if (t(f)) return "array";
    if (d(f)) return "buffer";
    if (c(f)) return "arguments";
    if (a(f)) return "date";
    if (n(f)) return "error";
    if (i(f)) return "regexp";
    switch (e(f)) {
      case "Symbol":
        return "symbol";
      case "Promise":
        return "promise";
      // Set, Map, WeakSet, WeakMap
      case "WeakMap":
        return "weakmap";
      case "WeakSet":
        return "weakset";
      case "Map":
        return "map";
      case "Set":
        return "set";
      // 8-bit typed arrays
      case "Int8Array":
        return "int8array";
      case "Uint8Array":
        return "uint8array";
      case "Uint8ClampedArray":
        return "uint8clampedarray";
      // 16-bit typed arrays
      case "Int16Array":
        return "int16array";
      case "Uint16Array":
        return "uint16array";
      // 32-bit typed arrays
      case "Int32Array":
        return "int32array";
      case "Uint32Array":
        return "uint32array";
      case "Float32Array":
        return "float32array";
      case "Float64Array":
        return "float64array";
    }
    if (o(f))
      return "generator";
    switch (h = r.call(f), h) {
      case "[object Object]":
        return "object";
      // iterators
      case "[object Map Iterator]":
        return "mapiterator";
      case "[object Set Iterator]":
        return "setiterator";
      case "[object String Iterator]":
        return "stringiterator";
      case "[object Array Iterator]":
        return "arrayiterator";
    }
    return h.slice(8, -1).toLowerCase().replace(/\s/g, "");
  };
  function e(u) {
    return typeof u.constructor == "function" ? u.constructor.name : null;
  }
  function t(u) {
    return Array.isArray ? Array.isArray(u) : u instanceof Array;
  }
  function n(u) {
    return u instanceof Error || typeof u.message == "string" && u.constructor && typeof u.constructor.stackTraceLimit == "number";
  }
  function a(u) {
    return u instanceof Date ? !0 : typeof u.toDateString == "function" && typeof u.getDate == "function" && typeof u.setDate == "function";
  }
  function i(u) {
    return u instanceof RegExp ? !0 : typeof u.flags == "string" && typeof u.ignoreCase == "boolean" && typeof u.multiline == "boolean" && typeof u.global == "boolean";
  }
  function s(u, f) {
    return e(u) === "GeneratorFunction";
  }
  function o(u) {
    return typeof u.throw == "function" && typeof u.return == "function" && typeof u.next == "function";
  }
  function c(u) {
    try {
      if (typeof u.length == "number" && typeof u.callee == "function")
        return !0;
    } catch (f) {
      if (f.message.indexOf("callee") !== -1)
        return !0;
    }
    return !1;
  }
  function d(u) {
    return u.constructor && typeof u.constructor.isBuffer == "function" ? u.constructor.isBuffer(u) : !1;
  }
  return kindOf;
}
/*!
 * is-extendable <https://github.com/jonschlinkert/is-extendable>
 *
 * Copyright (c) 2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */
var isExtendable, hasRequiredIsExtendable;
function requireIsExtendable() {
  return hasRequiredIsExtendable || (hasRequiredIsExtendable = 1, isExtendable = function(e) {
    return typeof e < "u" && e !== null && (typeof e == "object" || typeof e == "function");
  }), isExtendable;
}
var extendShallow, hasRequiredExtendShallow;
function requireExtendShallow() {
  if (hasRequiredExtendShallow) return extendShallow;
  hasRequiredExtendShallow = 1;
  var r = requireIsExtendable();
  extendShallow = function(a) {
    r(a) || (a = {});
    for (var i = arguments.length, s = 1; s < i; s++) {
      var o = arguments[s];
      r(o) && e(a, o);
    }
    return a;
  };
  function e(n, a) {
    for (var i in a)
      t(a, i) && (n[i] = a[i]);
  }
  function t(n, a) {
    return Object.prototype.hasOwnProperty.call(n, a);
  }
  return extendShallow;
}
var sectionMatter, hasRequiredSectionMatter;
function requireSectionMatter() {
  if (hasRequiredSectionMatter) return sectionMatter;
  hasRequiredSectionMatter = 1;
  var r = requireKindOf(), e = requireExtendShallow();
  sectionMatter = function(c, d) {
    typeof d == "function" && (d = { parse: d });
    var u = n(c), f = { section_delimiter: "---", parse: s }, h = e({}, f, d), g = h.section_delimiter, x = u.content.split(/\r?\n/), _ = null, P = i(), O = [], v = [];
    function y(M) {
      u.content = M, _ = [], O = [];
    }
    function A(M) {
      v.length && (P.key = a(v[0], g), P.content = M, h.parse(P, _), _.push(P), P = i(), O = [], v = []);
    }
    for (var E = 0; E < x.length; E++) {
      var I = x[E], N = v.length, $ = I.trim();
      if (t($, g)) {
        if ($.length === 3 && E !== 0) {
          if (N === 0 || N === 2) {
            O.push(I);
            continue;
          }
          v.push($), P.data = O.join(`
`), O = [];
          continue;
        }
        _ === null && y(O.join(`
`)), N === 2 && A(O.join(`
`)), v.push($);
        continue;
      }
      O.push(I);
    }
    return _ === null ? y(O.join(`
`)) : A(O.join(`
`)), u.sections = _, u;
  };
  function t(c, d) {
    return !(c.slice(0, d.length) !== d || c.charAt(d.length + 1) === d.slice(-1));
  }
  function n(c) {
    if (r(c) !== "object" && (c = { content: c }), typeof c.content != "string" && !o(c.content))
      throw new TypeError("expected a buffer or string");
    return c.content = c.content.toString(), c.sections = [], c;
  }
  function a(c, d) {
    return c ? c.slice(d.length).trim() : "";
  }
  function i() {
    return { key: "", data: "", content: "" };
  }
  function s(c) {
    return c;
  }
  function o(c) {
    return c && c.constructor && typeof c.constructor.isBuffer == "function" ? c.constructor.isBuffer(c) : !1;
  }
  return sectionMatter;
}
var engines = { exports: {} }, jsYaml$1 = {}, loader = {}, common = {}, hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function r(s) {
    return typeof s > "u" || s === null;
  }
  function e(s) {
    return typeof s == "object" && s !== null;
  }
  function t(s) {
    return Array.isArray(s) ? s : r(s) ? [] : [s];
  }
  function n(s, o) {
    var c, d, u, f;
    if (o)
      for (f = Object.keys(o), c = 0, d = f.length; c < d; c += 1)
        u = f[c], s[u] = o[u];
    return s;
  }
  function a(s, o) {
    var c = "", d;
    for (d = 0; d < o; d += 1)
      c += s;
    return c;
  }
  function i(s) {
    return s === 0 && Number.NEGATIVE_INFINITY === 1 / s;
  }
  return common.isNothing = r, common.isObject = e, common.toArray = t, common.repeat = a, common.isNegativeZero = i, common.extend = n, common;
}
var exception, hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function r(e, t) {
    Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : ""), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack || "";
  }
  return r.prototype = Object.create(Error.prototype), r.prototype.constructor = r, r.prototype.toString = function(t) {
    var n = this.name + ": ";
    return n += this.reason || "(unknown reason)", !t && this.mark && (n += " " + this.mark.toString()), n;
  }, exception = r, exception;
}
var mark, hasRequiredMark;
function requireMark() {
  if (hasRequiredMark) return mark;
  hasRequiredMark = 1;
  var r = requireCommon();
  function e(t, n, a, i, s) {
    this.name = t, this.buffer = n, this.position = a, this.line = i, this.column = s;
  }
  return e.prototype.getSnippet = function(n, a) {
    var i, s, o, c, d;
    if (!this.buffer) return null;
    for (n = n || 4, a = a || 75, i = "", s = this.position; s > 0 && `\0\r
\u2028\u2029`.indexOf(this.buffer.charAt(s - 1)) === -1; )
      if (s -= 1, this.position - s > a / 2 - 1) {
        i = " ... ", s += 5;
        break;
      }
    for (o = "", c = this.position; c < this.buffer.length && `\0\r
\u2028\u2029`.indexOf(this.buffer.charAt(c)) === -1; )
      if (c += 1, c - this.position > a / 2 - 1) {
        o = " ... ", c -= 5;
        break;
      }
    return d = this.buffer.slice(s, c), r.repeat(" ", n) + i + d + o + `
` + r.repeat(" ", n + this.position - s + i.length) + "^";
  }, e.prototype.toString = function(n) {
    var a, i = "";
    return this.name && (i += 'in "' + this.name + '" '), i += "at line " + (this.line + 1) + ", column " + (this.column + 1), n || (a = this.getSnippet(), a && (i += `:
` + a)), i;
  }, mark = e, mark;
}
var type, hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  var r = requireException(), e = [
    "kind",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "defaultStyle",
    "styleAliases"
  ], t = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function n(i) {
    var s = {};
    return i !== null && Object.keys(i).forEach(function(o) {
      i[o].forEach(function(c) {
        s[String(c)] = o;
      });
    }), s;
  }
  function a(i, s) {
    if (s = s || {}, Object.keys(s).forEach(function(o) {
      if (e.indexOf(o) === -1)
        throw new r('Unknown option "' + o + '" is met in definition of "' + i + '" YAML type.');
    }), this.tag = i, this.kind = s.kind || null, this.resolve = s.resolve || function() {
      return !0;
    }, this.construct = s.construct || function(o) {
      return o;
    }, this.instanceOf = s.instanceOf || null, this.predicate = s.predicate || null, this.represent = s.represent || null, this.defaultStyle = s.defaultStyle || null, this.styleAliases = n(s.styleAliases || null), t.indexOf(this.kind) === -1)
      throw new r('Unknown kind "' + this.kind + '" is specified for "' + i + '" YAML type.');
  }
  return type = a, type;
}
var schema, hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  var r = requireCommon(), e = requireException(), t = requireType();
  function n(s, o, c) {
    var d = [];
    return s.include.forEach(function(u) {
      c = n(u, o, c);
    }), s[o].forEach(function(u) {
      c.forEach(function(f, h) {
        f.tag === u.tag && f.kind === u.kind && d.push(h);
      }), c.push(u);
    }), c.filter(function(u, f) {
      return d.indexOf(f) === -1;
    });
  }
  function a() {
    var s = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {}
    }, o, c;
    function d(u) {
      s[u.kind][u.tag] = s.fallback[u.tag] = u;
    }
    for (o = 0, c = arguments.length; o < c; o += 1)
      arguments[o].forEach(d);
    return s;
  }
  function i(s) {
    this.include = s.include || [], this.implicit = s.implicit || [], this.explicit = s.explicit || [], this.implicit.forEach(function(o) {
      if (o.loadKind && o.loadKind !== "scalar")
        throw new e("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }), this.compiledImplicit = n(this, "implicit", []), this.compiledExplicit = n(this, "explicit", []), this.compiledTypeMap = a(this.compiledImplicit, this.compiledExplicit);
  }
  return i.DEFAULT = null, i.create = function() {
    var o, c;
    switch (arguments.length) {
      case 1:
        o = i.DEFAULT, c = arguments[0];
        break;
      case 2:
        o = arguments[0], c = arguments[1];
        break;
      default:
        throw new e("Wrong number of arguments for Schema.create function");
    }
    if (o = r.toArray(o), c = r.toArray(c), !o.every(function(d) {
      return d instanceof i;
    }))
      throw new e("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
    if (!c.every(function(d) {
      return d instanceof t;
    }))
      throw new e("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    return new i({
      include: o,
      explicit: c
    });
  }, schema = i, schema;
}
var str, hasRequiredStr;
function requireStr() {
  if (hasRequiredStr) return str;
  hasRequiredStr = 1;
  var r = requireType();
  return str = new r("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(e) {
      return e !== null ? e : "";
    }
  }), str;
}
var seq, hasRequiredSeq;
function requireSeq() {
  if (hasRequiredSeq) return seq;
  hasRequiredSeq = 1;
  var r = requireType();
  return seq = new r("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(e) {
      return e !== null ? e : [];
    }
  }), seq;
}
var map, hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  var r = requireType();
  return map = new r("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(e) {
      return e !== null ? e : {};
    }
  }), map;
}
var failsafe, hasRequiredFailsafe;
function requireFailsafe() {
  if (hasRequiredFailsafe) return failsafe;
  hasRequiredFailsafe = 1;
  var r = requireSchema();
  return failsafe = new r({
    explicit: [
      requireStr(),
      requireSeq(),
      requireMap()
    ]
  }), failsafe;
}
var _null, hasRequired_null;
function require_null() {
  if (hasRequired_null) return _null;
  hasRequired_null = 1;
  var r = requireType();
  function e(a) {
    if (a === null) return !0;
    var i = a.length;
    return i === 1 && a === "~" || i === 4 && (a === "null" || a === "Null" || a === "NULL");
  }
  function t() {
    return null;
  }
  function n(a) {
    return a === null;
  }
  return _null = new r("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: n,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      }
    },
    defaultStyle: "lowercase"
  }), _null;
}
var bool, hasRequiredBool;
function requireBool() {
  if (hasRequiredBool) return bool;
  hasRequiredBool = 1;
  var r = requireType();
  function e(a) {
    if (a === null) return !1;
    var i = a.length;
    return i === 4 && (a === "true" || a === "True" || a === "TRUE") || i === 5 && (a === "false" || a === "False" || a === "FALSE");
  }
  function t(a) {
    return a === "true" || a === "True" || a === "TRUE";
  }
  function n(a) {
    return Object.prototype.toString.call(a) === "[object Boolean]";
  }
  return bool = new r("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: n,
    represent: {
      lowercase: function(a) {
        return a ? "true" : "false";
      },
      uppercase: function(a) {
        return a ? "TRUE" : "FALSE";
      },
      camelcase: function(a) {
        return a ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  }), bool;
}
var int, hasRequiredInt;
function requireInt() {
  if (hasRequiredInt) return int;
  hasRequiredInt = 1;
  var r = requireCommon(), e = requireType();
  function t(c) {
    return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
  }
  function n(c) {
    return 48 <= c && c <= 55;
  }
  function a(c) {
    return 48 <= c && c <= 57;
  }
  function i(c) {
    if (c === null) return !1;
    var d = c.length, u = 0, f = !1, h;
    if (!d) return !1;
    if (h = c[u], (h === "-" || h === "+") && (h = c[++u]), h === "0") {
      if (u + 1 === d) return !0;
      if (h = c[++u], h === "b") {
        for (u++; u < d; u++)
          if (h = c[u], h !== "_") {
            if (h !== "0" && h !== "1") return !1;
            f = !0;
          }
        return f && h !== "_";
      }
      if (h === "x") {
        for (u++; u < d; u++)
          if (h = c[u], h !== "_") {
            if (!t(c.charCodeAt(u))) return !1;
            f = !0;
          }
        return f && h !== "_";
      }
      for (; u < d; u++)
        if (h = c[u], h !== "_") {
          if (!n(c.charCodeAt(u))) return !1;
          f = !0;
        }
      return f && h !== "_";
    }
    if (h === "_") return !1;
    for (; u < d; u++)
      if (h = c[u], h !== "_") {
        if (h === ":") break;
        if (!a(c.charCodeAt(u)))
          return !1;
        f = !0;
      }
    return !f || h === "_" ? !1 : h !== ":" ? !0 : /^(:[0-5]?[0-9])+$/.test(c.slice(u));
  }
  function s(c) {
    var d = c, u = 1, f, h, g = [];
    return d.indexOf("_") !== -1 && (d = d.replace(/_/g, "")), f = d[0], (f === "-" || f === "+") && (f === "-" && (u = -1), d = d.slice(1), f = d[0]), d === "0" ? 0 : f === "0" ? d[1] === "b" ? u * parseInt(d.slice(2), 2) : d[1] === "x" ? u * parseInt(d, 16) : u * parseInt(d, 8) : d.indexOf(":") !== -1 ? (d.split(":").forEach(function(x) {
      g.unshift(parseInt(x, 10));
    }), d = 0, h = 1, g.forEach(function(x) {
      d += x * h, h *= 60;
    }), u * d) : u * parseInt(d, 10);
  }
  function o(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && c % 1 === 0 && !r.isNegativeZero(c);
  }
  return int = new e("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: i,
    construct: s,
    predicate: o,
    represent: {
      binary: function(c) {
        return c >= 0 ? "0b" + c.toString(2) : "-0b" + c.toString(2).slice(1);
      },
      octal: function(c) {
        return c >= 0 ? "0" + c.toString(8) : "-0" + c.toString(8).slice(1);
      },
      decimal: function(c) {
        return c.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function(c) {
        return c >= 0 ? "0x" + c.toString(16).toUpperCase() : "-0x" + c.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  }), int;
}
var float, hasRequiredFloat;
function requireFloat() {
  if (hasRequiredFloat) return float;
  hasRequiredFloat = 1;
  var r = requireCommon(), e = requireType(), t = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function n(c) {
    return !(c === null || !t.test(c) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    c[c.length - 1] === "_");
  }
  function a(c) {
    var d, u, f, h;
    return d = c.replace(/_/g, "").toLowerCase(), u = d[0] === "-" ? -1 : 1, h = [], "+-".indexOf(d[0]) >= 0 && (d = d.slice(1)), d === ".inf" ? u === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : d === ".nan" ? NaN : d.indexOf(":") >= 0 ? (d.split(":").forEach(function(g) {
      h.unshift(parseFloat(g, 10));
    }), d = 0, f = 1, h.forEach(function(g) {
      d += g * f, f *= 60;
    }), u * d) : u * parseFloat(d, 10);
  }
  var i = /^[-+]?[0-9]+e/;
  function s(c, d) {
    var u;
    if (isNaN(c))
      switch (d) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    else if (Number.POSITIVE_INFINITY === c)
      switch (d) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    else if (Number.NEGATIVE_INFINITY === c)
      switch (d) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    else if (r.isNegativeZero(c))
      return "-0.0";
    return u = c.toString(10), i.test(u) ? u.replace("e", ".e") : u;
  }
  function o(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && (c % 1 !== 0 || r.isNegativeZero(c));
  }
  return float = new e("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: n,
    construct: a,
    predicate: o,
    represent: s,
    defaultStyle: "lowercase"
  }), float;
}
var json, hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  var r = requireSchema();
  return json = new r({
    include: [
      requireFailsafe()
    ],
    implicit: [
      require_null(),
      requireBool(),
      requireInt(),
      requireFloat()
    ]
  }), json;
}
var core, hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core;
  hasRequiredCore = 1;
  var r = requireSchema();
  return core = new r({
    include: [
      requireJson()
    ]
  }), core;
}
var timestamp, hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  var r = requireType(), e = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  ), t = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function n(s) {
    return s === null ? !1 : e.exec(s) !== null || t.exec(s) !== null;
  }
  function a(s) {
    var o, c, d, u, f, h, g, x = 0, _ = null, P, O, v;
    if (o = e.exec(s), o === null && (o = t.exec(s)), o === null) throw new Error("Date resolve error");
    if (c = +o[1], d = +o[2] - 1, u = +o[3], !o[4])
      return new Date(Date.UTC(c, d, u));
    if (f = +o[4], h = +o[5], g = +o[6], o[7]) {
      for (x = o[7].slice(0, 3); x.length < 3; )
        x += "0";
      x = +x;
    }
    return o[9] && (P = +o[10], O = +(o[11] || 0), _ = (P * 60 + O) * 6e4, o[9] === "-" && (_ = -_)), v = new Date(Date.UTC(c, d, u, f, h, g, x)), _ && v.setTime(v.getTime() - _), v;
  }
  function i(s) {
    return s.toISOString();
  }
  return timestamp = new r("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: n,
    construct: a,
    instanceOf: Date,
    represent: i
  }), timestamp;
}
var merge, hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  var r = requireType();
  function e(t) {
    return t === "<<" || t === null;
  }
  return merge = new r("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: e
  }), merge;
}
function commonjsRequire(r) {
  throw new Error('Could not dynamically require "' + r + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var binary, hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  var r;
  try {
    var e = commonjsRequire;
    r = e("buffer").Buffer;
  } catch {
  }
  var t = requireType(), n = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function a(c) {
    if (c === null) return !1;
    var d, u, f = 0, h = c.length, g = n;
    for (u = 0; u < h; u++)
      if (d = g.indexOf(c.charAt(u)), !(d > 64)) {
        if (d < 0) return !1;
        f += 6;
      }
    return f % 8 === 0;
  }
  function i(c) {
    var d, u, f = c.replace(/[\r\n=]/g, ""), h = f.length, g = n, x = 0, _ = [];
    for (d = 0; d < h; d++)
      d % 4 === 0 && d && (_.push(x >> 16 & 255), _.push(x >> 8 & 255), _.push(x & 255)), x = x << 6 | g.indexOf(f.charAt(d));
    return u = h % 4 * 6, u === 0 ? (_.push(x >> 16 & 255), _.push(x >> 8 & 255), _.push(x & 255)) : u === 18 ? (_.push(x >> 10 & 255), _.push(x >> 2 & 255)) : u === 12 && _.push(x >> 4 & 255), r ? r.from ? r.from(_) : new r(_) : _;
  }
  function s(c) {
    var d = "", u = 0, f, h, g = c.length, x = n;
    for (f = 0; f < g; f++)
      f % 3 === 0 && f && (d += x[u >> 18 & 63], d += x[u >> 12 & 63], d += x[u >> 6 & 63], d += x[u & 63]), u = (u << 8) + c[f];
    return h = g % 3, h === 0 ? (d += x[u >> 18 & 63], d += x[u >> 12 & 63], d += x[u >> 6 & 63], d += x[u & 63]) : h === 2 ? (d += x[u >> 10 & 63], d += x[u >> 4 & 63], d += x[u << 2 & 63], d += x[64]) : h === 1 && (d += x[u >> 2 & 63], d += x[u << 4 & 63], d += x[64], d += x[64]), d;
  }
  function o(c) {
    return r && r.isBuffer(c);
  }
  return binary = new t("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: a,
    construct: i,
    predicate: o,
    represent: s
  }), binary;
}
var omap, hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  var r = requireType(), e = Object.prototype.hasOwnProperty, t = Object.prototype.toString;
  function n(i) {
    if (i === null) return !0;
    var s = {}, o, c, d, u, f, h = i;
    for (o = 0, c = h.length; o < c; o += 1) {
      if (d = h[o], f = !1, t.call(d) !== "[object Object]") return !1;
      for (u in d)
        if (e.call(d, u))
          if (!f) f = !0;
          else return !1;
      if (!f || e.call(s, u)) return !1;
      Object.defineProperty(s, u, { value: !0 });
    }
    return !0;
  }
  function a(i) {
    return i !== null ? i : [];
  }
  return omap = new r("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: n,
    construct: a
  }), omap;
}
var pairs, hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  var r = requireType(), e = Object.prototype.toString;
  function t(a) {
    if (a === null) return !0;
    var i, s, o, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1) {
      if (o = u[i], e.call(o) !== "[object Object]" || (c = Object.keys(o), c.length !== 1)) return !1;
      d[i] = [c[0], o[c[0]]];
    }
    return !0;
  }
  function n(a) {
    if (a === null) return [];
    var i, s, o, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1)
      o = u[i], c = Object.keys(o), d[i] = [c[0], o[c[0]]];
    return d;
  }
  return pairs = new r("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: t,
    construct: n
  }), pairs;
}
var set, hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  var r = requireType(), e = Object.prototype.hasOwnProperty;
  function t(a) {
    if (a === null) return !0;
    var i, s = a;
    for (i in s)
      if (e.call(s, i) && s[i] !== null)
        return !1;
    return !0;
  }
  function n(a) {
    return a !== null ? a : {};
  }
  return set = new r("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: t,
    construct: n
  }), set;
}
var default_safe, hasRequiredDefault_safe;
function requireDefault_safe() {
  if (hasRequiredDefault_safe) return default_safe;
  hasRequiredDefault_safe = 1;
  var r = requireSchema();
  return default_safe = new r({
    include: [
      requireCore()
    ],
    implicit: [
      requireTimestamp(),
      requireMerge()
    ],
    explicit: [
      requireBinary(),
      requireOmap(),
      requirePairs(),
      requireSet()
    ]
  }), default_safe;
}
var _undefined, hasRequired_undefined;
function require_undefined() {
  if (hasRequired_undefined) return _undefined;
  hasRequired_undefined = 1;
  var r = requireType();
  function e() {
    return !0;
  }
  function t() {
  }
  function n() {
    return "";
  }
  function a(i) {
    return typeof i > "u";
  }
  return _undefined = new r("tag:yaml.org,2002:js/undefined", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: a,
    represent: n
  }), _undefined;
}
var regexp, hasRequiredRegexp;
function requireRegexp() {
  if (hasRequiredRegexp) return regexp;
  hasRequiredRegexp = 1;
  var r = requireType();
  function e(i) {
    if (i === null || i.length === 0) return !1;
    var s = i, o = /\/([gim]*)$/.exec(i), c = "";
    return !(s[0] === "/" && (o && (c = o[1]), c.length > 3 || s[s.length - c.length - 1] !== "/"));
  }
  function t(i) {
    var s = i, o = /\/([gim]*)$/.exec(i), c = "";
    return s[0] === "/" && (o && (c = o[1]), s = s.slice(1, s.length - c.length - 1)), new RegExp(s, c);
  }
  function n(i) {
    var s = "/" + i.source + "/";
    return i.global && (s += "g"), i.multiline && (s += "m"), i.ignoreCase && (s += "i"), s;
  }
  function a(i) {
    return Object.prototype.toString.call(i) === "[object RegExp]";
  }
  return regexp = new r("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: a,
    represent: n
  }), regexp;
}
var _function, hasRequired_function;
function require_function() {
  if (hasRequired_function) return _function;
  hasRequired_function = 1;
  var r;
  try {
    var e = commonjsRequire;
    r = e("esprima");
  } catch {
    typeof window < "u" && (r = window.esprima);
  }
  var t = requireType();
  function n(o) {
    if (o === null) return !1;
    try {
      var c = "(" + o + ")", d = r.parse(c, { range: !0 });
      return !(d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression");
    } catch {
      return !1;
    }
  }
  function a(o) {
    var c = "(" + o + ")", d = r.parse(c, { range: !0 }), u = [], f;
    if (d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression")
      throw new Error("Failed to resolve function");
    return d.body[0].expression.params.forEach(function(h) {
      u.push(h.name);
    }), f = d.body[0].expression.body.range, d.body[0].expression.body.type === "BlockStatement" ? new Function(u, c.slice(f[0] + 1, f[1] - 1)) : new Function(u, "return " + c.slice(f[0], f[1]));
  }
  function i(o) {
    return o.toString();
  }
  function s(o) {
    return Object.prototype.toString.call(o) === "[object Function]";
  }
  return _function = new t("tag:yaml.org,2002:js/function", {
    kind: "scalar",
    resolve: n,
    construct: a,
    predicate: s,
    represent: i
  }), _function;
}
var default_full, hasRequiredDefault_full;
function requireDefault_full() {
  if (hasRequiredDefault_full) return default_full;
  hasRequiredDefault_full = 1;
  var r = requireSchema();
  return default_full = r.DEFAULT = new r({
    include: [
      requireDefault_safe()
    ],
    explicit: [
      require_undefined(),
      requireRegexp(),
      require_function()
    ]
  }), default_full;
}
var hasRequiredLoader;
function requireLoader() {
  if (hasRequiredLoader) return loader;
  hasRequiredLoader = 1;
  var r = requireCommon(), e = requireException(), t = requireMark(), n = requireDefault_safe(), a = requireDefault_full(), i = Object.prototype.hasOwnProperty, s = 1, o = 2, c = 3, d = 4, u = 1, f = 2, h = 3, g = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, x = /[\x85\u2028\u2029]/, _ = /[,\[\]\{\}]/, P = /^(?:!|!!|![a-z\-]+!)$/i, O = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function v(l) {
    return Object.prototype.toString.call(l);
  }
  function y(l) {
    return l === 10 || l === 13;
  }
  function A(l) {
    return l === 9 || l === 32;
  }
  function E(l) {
    return l === 9 || l === 32 || l === 10 || l === 13;
  }
  function I(l) {
    return l === 44 || l === 91 || l === 93 || l === 123 || l === 125;
  }
  function N(l) {
    var b;
    return 48 <= l && l <= 57 ? l - 48 : (b = l | 32, 97 <= b && b <= 102 ? b - 97 + 10 : -1);
  }
  function $(l) {
    return l === 120 ? 2 : l === 117 ? 4 : l === 85 ? 8 : 0;
  }
  function M(l) {
    return 48 <= l && l <= 57 ? l - 48 : -1;
  }
  function B(l) {
    return l === 48 ? "\0" : l === 97 ? "\x07" : l === 98 ? "\b" : l === 116 || l === 9 ? "	" : l === 110 ? `
` : l === 118 ? "\v" : l === 102 ? "\f" : l === 114 ? "\r" : l === 101 ? "\x1B" : l === 32 ? " " : l === 34 ? '"' : l === 47 ? "/" : l === 92 ? "\\" : l === 78 ? "" : l === 95 ? " " : l === 76 ? "\u2028" : l === 80 ? "\u2029" : "";
  }
  function H(l) {
    return l <= 65535 ? String.fromCharCode(l) : String.fromCharCode(
      (l - 65536 >> 10) + 55296,
      (l - 65536 & 1023) + 56320
    );
  }
  function K(l, b, T) {
    b === "__proto__" ? Object.defineProperty(l, b, {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: T
    }) : l[b] = T;
  }
  for (var le = new Array(256), G = new Array(256), ie = 0; ie < 256; ie++)
    le[ie] = B(ie) ? 1 : 0, G[ie] = B(ie);
  function me(l, b) {
    this.input = l, this.filename = b.filename || null, this.schema = b.schema || a, this.onWarning = b.onWarning || null, this.legacy = b.legacy || !1, this.json = b.json || !1, this.listener = b.listener || null, this.maxTotalMergeKeys = typeof b.maxTotalMergeKeys == "number" ? b.maxTotalMergeKeys : 1e4, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = l.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.totalMergeKeys = 0, this.documents = [];
  }
  function ce(l, b) {
    return new e(
      b,
      new t(l.filename, l.input, l.position, l.line, l.position - l.lineStart)
    );
  }
  function L(l, b) {
    throw ce(l, b);
  }
  function Y(l, b) {
    l.onWarning && l.onWarning.call(null, ce(l, b));
  }
  var re = {
    YAML: function(b, T, Z) {
      var C, p, m;
      b.version !== null && L(b, "duplication of %YAML directive"), Z.length !== 1 && L(b, "YAML directive accepts exactly one argument"), C = /^([0-9]+)\.([0-9]+)$/.exec(Z[0]), C === null && L(b, "ill-formed argument of the YAML directive"), p = parseInt(C[1], 10), m = parseInt(C[2], 10), p !== 1 && L(b, "unacceptable YAML version of the document"), b.version = Z[0], b.checkLineBreaks = m < 2, m !== 1 && m !== 2 && Y(b, "unsupported YAML version of the document");
    },
    TAG: function(b, T, Z) {
      var C, p;
      Z.length !== 2 && L(b, "TAG directive accepts exactly two arguments"), C = Z[0], p = Z[1], P.test(C) || L(b, "ill-formed tag handle (first argument) of the TAG directive"), i.call(b.tagMap, C) && L(b, 'there is a previously declared suffix for "' + C + '" tag handle'), O.test(p) || L(b, "ill-formed tag prefix (second argument) of the TAG directive"), b.tagMap[C] = p;
    }
  };
  function Q(l, b, T, Z) {
    var C, p, m, w;
    if (b < T) {
      if (w = l.input.slice(b, T), Z)
        for (C = 0, p = w.length; C < p; C += 1)
          m = w.charCodeAt(C), m === 9 || 32 <= m && m <= 1114111 || L(l, "expected valid JSON character");
      else g.test(w) && L(l, "the stream contains non-printable characters");
      l.result += w;
    }
  }
  function J(l, b, T, Z) {
    var C, p, m, w;
    for (r.isObject(T) || L(l, "cannot merge mappings; the provided source object is unacceptable"), C = Object.keys(T), m = 0, w = C.length; m < w; m += 1)
      p = C[m], l.maxTotalMergeKeys !== -1 && ++l.totalMergeKeys > l.maxTotalMergeKeys && L(l, "merge keys exceeded maxTotalMergeKeys (" + l.maxTotalMergeKeys + ")"), i.call(b, p) || (K(b, p, T[p]), Z[p] = !0);
  }
  function ee(l, b, T, Z, C, p, m, w) {
    var k, D;
    if (Array.isArray(C))
      for (C = Array.prototype.slice.call(C), k = 0, D = C.length; k < D; k += 1)
        Array.isArray(C[k]) && L(l, "nested arrays are not supported inside keys"), typeof C == "object" && v(C[k]) === "[object Object]" && (C[k] = "[object Object]");
    if (typeof C == "object" && v(C) === "[object Object]" && (C = "[object Object]"), C = String(C), b === null && (b = {}), Z === "tag:yaml.org,2002:merge")
      if (Array.isArray(p))
        for (k = 0, D = p.length; k < D; k += 1)
          J(l, b, p[k], T);
      else
        J(l, b, p, T);
    else
      !l.json && !i.call(T, C) && i.call(b, C) && (l.line = m || l.line, l.position = w || l.position, L(l, "duplicated mapping key")), K(b, C, p), delete T[C];
    return b;
  }
  function te(l) {
    var b;
    b = l.input.charCodeAt(l.position), b === 10 ? l.position++ : b === 13 ? (l.position++, l.input.charCodeAt(l.position) === 10 && l.position++) : L(l, "a line break is expected"), l.line += 1, l.lineStart = l.position;
  }
  function W(l, b, T) {
    for (var Z = 0, C = l.input.charCodeAt(l.position); C !== 0; ) {
      for (; A(C); )
        C = l.input.charCodeAt(++l.position);
      if (b && C === 35)
        do
          C = l.input.charCodeAt(++l.position);
        while (C !== 10 && C !== 13 && C !== 0);
      if (y(C))
        for (te(l), C = l.input.charCodeAt(l.position), Z++, l.lineIndent = 0; C === 32; )
          l.lineIndent++, C = l.input.charCodeAt(++l.position);
      else
        break;
    }
    return T !== -1 && Z !== 0 && l.lineIndent < T && Y(l, "deficient indentation"), Z;
  }
  function ne(l) {
    var b = l.position, T;
    return T = l.input.charCodeAt(b), !!((T === 45 || T === 46) && T === l.input.charCodeAt(b + 1) && T === l.input.charCodeAt(b + 2) && (b += 3, T = l.input.charCodeAt(b), T === 0 || E(T)));
  }
  function ae(l, b) {
    b === 1 ? l.result += " " : b > 1 && (l.result += r.repeat(`
`, b - 1));
  }
  function de(l, b, T) {
    var Z, C, p, m, w, k, D, R, S = l.kind, F = l.result, j;
    if (j = l.input.charCodeAt(l.position), E(j) || I(j) || j === 35 || j === 38 || j === 42 || j === 33 || j === 124 || j === 62 || j === 39 || j === 34 || j === 37 || j === 64 || j === 96 || (j === 63 || j === 45) && (C = l.input.charCodeAt(l.position + 1), E(C) || T && I(C)))
      return !1;
    for (l.kind = "scalar", l.result = "", p = m = l.position, w = !1; j !== 0; ) {
      if (j === 58) {
        if (C = l.input.charCodeAt(l.position + 1), E(C) || T && I(C))
          break;
      } else if (j === 35) {
        if (Z = l.input.charCodeAt(l.position - 1), E(Z))
          break;
      } else {
        if (l.position === l.lineStart && ne(l) || T && I(j))
          break;
        if (y(j))
          if (k = l.line, D = l.lineStart, R = l.lineIndent, W(l, !1, -1), l.lineIndent >= b) {
            w = !0, j = l.input.charCodeAt(l.position);
            continue;
          } else {
            l.position = m, l.line = k, l.lineStart = D, l.lineIndent = R;
            break;
          }
      }
      w && (Q(l, p, m, !1), ae(l, l.line - k), p = m = l.position, w = !1), A(j) || (m = l.position + 1), j = l.input.charCodeAt(++l.position);
    }
    return Q(l, p, m, !1), l.result ? !0 : (l.kind = S, l.result = F, !1);
  }
  function he(l, b) {
    var T, Z, C;
    if (T = l.input.charCodeAt(l.position), T !== 39)
      return !1;
    for (l.kind = "scalar", l.result = "", l.position++, Z = C = l.position; (T = l.input.charCodeAt(l.position)) !== 0; )
      if (T === 39)
        if (Q(l, Z, l.position, !0), T = l.input.charCodeAt(++l.position), T === 39)
          Z = l.position, l.position++, C = l.position;
        else
          return !0;
      else y(T) ? (Q(l, Z, C, !0), ae(l, W(l, !1, b)), Z = C = l.position) : l.position === l.lineStart && ne(l) ? L(l, "unexpected end of the document within a single quoted scalar") : (l.position++, C = l.position);
    L(l, "unexpected end of the stream within a single quoted scalar");
  }
  function ue(l, b) {
    var T, Z, C, p, m, w;
    if (w = l.input.charCodeAt(l.position), w !== 34)
      return !1;
    for (l.kind = "scalar", l.result = "", l.position++, T = Z = l.position; (w = l.input.charCodeAt(l.position)) !== 0; ) {
      if (w === 34)
        return Q(l, T, l.position, !0), l.position++, !0;
      if (w === 92) {
        if (Q(l, T, l.position, !0), w = l.input.charCodeAt(++l.position), y(w))
          W(l, !1, b);
        else if (w < 256 && le[w])
          l.result += G[w], l.position++;
        else if ((m = $(w)) > 0) {
          for (C = m, p = 0; C > 0; C--)
            w = l.input.charCodeAt(++l.position), (m = N(w)) >= 0 ? p = (p << 4) + m : L(l, "expected hexadecimal character");
          l.result += H(p), l.position++;
        } else
          L(l, "unknown escape sequence");
        T = Z = l.position;
      } else y(w) ? (Q(l, T, Z, !0), ae(l, W(l, !1, b)), T = Z = l.position) : l.position === l.lineStart && ne(l) ? L(l, "unexpected end of the document within a double quoted scalar") : (l.position++, Z = l.position);
    }
    L(l, "unexpected end of the stream within a double quoted scalar");
  }
  function se(l, b) {
    var T = !0, Z, C = l.tag, p, m = l.anchor, w, k, D, R, S, F = {}, j, V, U, q;
    if (q = l.input.charCodeAt(l.position), q === 91)
      k = 93, S = !1, p = [];
    else if (q === 123)
      k = 125, S = !0, p = {};
    else
      return !1;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = p), q = l.input.charCodeAt(++l.position); q !== 0; ) {
      if (W(l, !0, b), q = l.input.charCodeAt(l.position), q === k)
        return l.position++, l.tag = C, l.anchor = m, l.kind = S ? "mapping" : "sequence", l.result = p, !0;
      T || L(l, "missed comma between flow collection entries"), V = j = U = null, D = R = !1, q === 63 && (w = l.input.charCodeAt(l.position + 1), E(w) && (D = R = !0, l.position++, W(l, !0, b))), Z = l.line, oe(l, b, s, !1, !0), V = l.tag, j = l.result, W(l, !0, b), q = l.input.charCodeAt(l.position), (R || l.line === Z) && q === 58 && (D = !0, q = l.input.charCodeAt(++l.position), W(l, !0, b), oe(l, b, s, !1, !0), U = l.result), S ? ee(l, p, F, V, j, U) : D ? p.push(ee(l, null, F, V, j, U)) : p.push(j), W(l, !0, b), q = l.input.charCodeAt(l.position), q === 44 ? (T = !0, q = l.input.charCodeAt(++l.position)) : T = !1;
    }
    L(l, "unexpected end of the stream within a flow collection");
  }
  function pe(l, b) {
    var T, Z, C = u, p = !1, m = !1, w = b, k = 0, D = !1, R, S;
    if (S = l.input.charCodeAt(l.position), S === 124)
      Z = !1;
    else if (S === 62)
      Z = !0;
    else
      return !1;
    for (l.kind = "scalar", l.result = ""; S !== 0; )
      if (S = l.input.charCodeAt(++l.position), S === 43 || S === 45)
        u === C ? C = S === 43 ? h : f : L(l, "repeat of a chomping mode identifier");
      else if ((R = M(S)) >= 0)
        R === 0 ? L(l, "bad explicit indentation width of a block scalar; it cannot be less than one") : m ? L(l, "repeat of an indentation width identifier") : (w = b + R - 1, m = !0);
      else
        break;
    if (A(S)) {
      do
        S = l.input.charCodeAt(++l.position);
      while (A(S));
      if (S === 35)
        do
          S = l.input.charCodeAt(++l.position);
        while (!y(S) && S !== 0);
    }
    for (; S !== 0; ) {
      for (te(l), l.lineIndent = 0, S = l.input.charCodeAt(l.position); (!m || l.lineIndent < w) && S === 32; )
        l.lineIndent++, S = l.input.charCodeAt(++l.position);
      if (!m && l.lineIndent > w && (w = l.lineIndent), y(S)) {
        k++;
        continue;
      }
      if (l.lineIndent < w) {
        C === h ? l.result += r.repeat(`
`, p ? 1 + k : k) : C === u && p && (l.result += `
`);
        break;
      }
      for (Z ? A(S) ? (D = !0, l.result += r.repeat(`
`, p ? 1 + k : k)) : D ? (D = !1, l.result += r.repeat(`
`, k + 1)) : k === 0 ? p && (l.result += " ") : l.result += r.repeat(`
`, k) : l.result += r.repeat(`
`, p ? 1 + k : k), p = !0, m = !0, k = 0, T = l.position; !y(S) && S !== 0; )
        S = l.input.charCodeAt(++l.position);
      Q(l, T, l.position, !1);
    }
    return !0;
  }
  function fe(l, b) {
    var T, Z = l.tag, C = l.anchor, p = [], m, w = !1, k;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = p), k = l.input.charCodeAt(l.position); k !== 0 && !(k !== 45 || (m = l.input.charCodeAt(l.position + 1), !E(m))); ) {
      if (w = !0, l.position++, W(l, !0, -1) && l.lineIndent <= b) {
        p.push(null), k = l.input.charCodeAt(l.position);
        continue;
      }
      if (T = l.line, oe(l, b, c, !1, !0), p.push(l.result), W(l, !0, -1), k = l.input.charCodeAt(l.position), (l.line === T || l.lineIndent > b) && k !== 0)
        L(l, "bad indentation of a sequence entry");
      else if (l.lineIndent < b)
        break;
    }
    return w ? (l.tag = Z, l.anchor = C, l.kind = "sequence", l.result = p, !0) : !1;
  }
  function ke(l, b, T) {
    var Z, C, p, m, w = l.tag, k = l.anchor, D = {}, R = {}, S = null, F = null, j = null, V = !1, U = !1, q;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = D), q = l.input.charCodeAt(l.position); q !== 0; ) {
      if (Z = l.input.charCodeAt(l.position + 1), p = l.line, m = l.position, (q === 63 || q === 58) && E(Z))
        q === 63 ? (V && (ee(l, D, R, S, F, null), S = F = j = null), U = !0, V = !0, C = !0) : V ? (V = !1, C = !0) : L(l, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), l.position += 1, q = Z;
      else if (oe(l, T, o, !1, !0))
        if (l.line === p) {
          for (q = l.input.charCodeAt(l.position); A(q); )
            q = l.input.charCodeAt(++l.position);
          if (q === 58)
            q = l.input.charCodeAt(++l.position), E(q) || L(l, "a whitespace character is expected after the key-value separator within a block mapping"), V && (ee(l, D, R, S, F, null), S = F = j = null), U = !0, V = !1, C = !1, S = l.tag, F = l.result;
          else if (U)
            L(l, "can not read an implicit mapping pair; a colon is missed");
          else
            return l.tag = w, l.anchor = k, !0;
        } else if (U)
          L(l, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else
          return l.tag = w, l.anchor = k, !0;
      else
        break;
      if ((l.line === p || l.lineIndent > b) && (oe(l, b, d, !0, C) && (V ? F = l.result : j = l.result), V || (ee(l, D, R, S, F, j, p, m), S = F = j = null), W(l, !0, -1), q = l.input.charCodeAt(l.position)), l.lineIndent > b && q !== 0)
        L(l, "bad indentation of a mapping entry");
      else if (l.lineIndent < b)
        break;
    }
    return V && ee(l, D, R, S, F, null), U && (l.tag = w, l.anchor = k, l.kind = "mapping", l.result = D), U;
  }
  function ge(l) {
    var b, T = !1, Z = !1, C, p, m;
    if (m = l.input.charCodeAt(l.position), m !== 33) return !1;
    if (l.tag !== null && L(l, "duplication of a tag property"), m = l.input.charCodeAt(++l.position), m === 60 ? (T = !0, m = l.input.charCodeAt(++l.position)) : m === 33 ? (Z = !0, C = "!!", m = l.input.charCodeAt(++l.position)) : C = "!", b = l.position, T) {
      do
        m = l.input.charCodeAt(++l.position);
      while (m !== 0 && m !== 62);
      l.position < l.length ? (p = l.input.slice(b, l.position), m = l.input.charCodeAt(++l.position)) : L(l, "unexpected end of the stream within a verbatim tag");
    } else {
      for (; m !== 0 && !E(m); )
        m === 33 && (Z ? L(l, "tag suffix cannot contain exclamation marks") : (C = l.input.slice(b - 1, l.position + 1), P.test(C) || L(l, "named tag handle cannot contain such characters"), Z = !0, b = l.position + 1)), m = l.input.charCodeAt(++l.position);
      p = l.input.slice(b, l.position), _.test(p) && L(l, "tag suffix cannot contain flow indicator characters");
    }
    return p && !O.test(p) && L(l, "tag name cannot contain such characters: " + p), T ? l.tag = p : i.call(l.tagMap, C) ? l.tag = l.tagMap[C] + p : C === "!" ? l.tag = "!" + p : C === "!!" ? l.tag = "tag:yaml.org,2002:" + p : L(l, 'undeclared tag handle "' + C + '"'), !0;
  }
  function ye(l) {
    var b, T;
    if (T = l.input.charCodeAt(l.position), T !== 38) return !1;
    for (l.anchor !== null && L(l, "duplication of an anchor property"), T = l.input.charCodeAt(++l.position), b = l.position; T !== 0 && !E(T) && !I(T); )
      T = l.input.charCodeAt(++l.position);
    return l.position === b && L(l, "name of an anchor node must contain at least one character"), l.anchor = l.input.slice(b, l.position), !0;
  }
  function _e(l) {
    var b, T, Z;
    if (Z = l.input.charCodeAt(l.position), Z !== 42) return !1;
    for (Z = l.input.charCodeAt(++l.position), b = l.position; Z !== 0 && !E(Z) && !I(Z); )
      Z = l.input.charCodeAt(++l.position);
    return l.position === b && L(l, "name of an alias node must contain at least one character"), T = l.input.slice(b, l.position), i.call(l.anchorMap, T) || L(l, 'unidentified alias "' + T + '"'), l.result = l.anchorMap[T], W(l, !0, -1), !0;
  }
  function oe(l, b, T, Z, C) {
    var p, m, w, k = 1, D = !1, R = !1, S, F, j, V, U;
    if (l.listener !== null && l.listener("open", l), l.tag = null, l.anchor = null, l.kind = null, l.result = null, p = m = w = d === T || c === T, Z && W(l, !0, -1) && (D = !0, l.lineIndent > b ? k = 1 : l.lineIndent === b ? k = 0 : l.lineIndent < b && (k = -1)), k === 1)
      for (; ge(l) || ye(l); )
        W(l, !0, -1) ? (D = !0, w = p, l.lineIndent > b ? k = 1 : l.lineIndent === b ? k = 0 : l.lineIndent < b && (k = -1)) : w = !1;
    if (w && (w = D || C), (k === 1 || d === T) && (s === T || o === T ? V = b : V = b + 1, U = l.position - l.lineStart, k === 1 ? w && (fe(l, U) || ke(l, U, V)) || se(l, V) ? R = !0 : (m && pe(l, V) || he(l, V) || ue(l, V) ? R = !0 : _e(l) ? (R = !0, (l.tag !== null || l.anchor !== null) && L(l, "alias node should not have any properties")) : de(l, V, s === T) && (R = !0, l.tag === null && (l.tag = "?")), l.anchor !== null && (l.anchorMap[l.anchor] = l.result)) : k === 0 && (R = w && fe(l, U))), l.tag !== null && l.tag !== "!")
      if (l.tag === "?") {
        for (l.result !== null && l.kind !== "scalar" && L(l, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + l.kind + '"'), S = 0, F = l.implicitTypes.length; S < F; S += 1)
          if (j = l.implicitTypes[S], j.resolve(l.result)) {
            l.result = j.construct(l.result), l.tag = j.tag, l.anchor !== null && (l.anchorMap[l.anchor] = l.result);
            break;
          }
      } else i.call(l.typeMap[l.kind || "fallback"], l.tag) ? (j = l.typeMap[l.kind || "fallback"][l.tag], l.result !== null && j.kind !== l.kind && L(l, "unacceptable node kind for !<" + l.tag + '> tag; it should be "' + j.kind + '", not "' + l.kind + '"'), j.resolve(l.result) ? (l.result = j.construct(l.result), l.anchor !== null && (l.anchorMap[l.anchor] = l.result)) : L(l, "cannot resolve a node with !<" + l.tag + "> explicit tag")) : L(l, "unknown tag !<" + l.tag + ">");
    return l.listener !== null && l.listener("close", l), l.tag !== null || l.anchor !== null || R;
  }
  function Te(l) {
    var b = l.position, T, Z, C, p = !1, m;
    for (l.version = null, l.checkLineBreaks = l.legacy, l.tagMap = {}, l.anchorMap = {}; (m = l.input.charCodeAt(l.position)) !== 0 && (W(l, !0, -1), m = l.input.charCodeAt(l.position), !(l.lineIndent > 0 || m !== 37)); ) {
      for (p = !0, m = l.input.charCodeAt(++l.position), T = l.position; m !== 0 && !E(m); )
        m = l.input.charCodeAt(++l.position);
      for (Z = l.input.slice(T, l.position), C = [], Z.length < 1 && L(l, "directive name must not be less than one character in length"); m !== 0; ) {
        for (; A(m); )
          m = l.input.charCodeAt(++l.position);
        if (m === 35) {
          do
            m = l.input.charCodeAt(++l.position);
          while (m !== 0 && !y(m));
          break;
        }
        if (y(m)) break;
        for (T = l.position; m !== 0 && !E(m); )
          m = l.input.charCodeAt(++l.position);
        C.push(l.input.slice(T, l.position));
      }
      m !== 0 && te(l), i.call(re, Z) ? re[Z](l, Z, C) : Y(l, 'unknown document directive "' + Z + '"');
    }
    if (W(l, !0, -1), l.lineIndent === 0 && l.input.charCodeAt(l.position) === 45 && l.input.charCodeAt(l.position + 1) === 45 && l.input.charCodeAt(l.position + 2) === 45 ? (l.position += 3, W(l, !0, -1)) : p && L(l, "directives end mark is expected"), oe(l, l.lineIndent - 1, d, !1, !0), W(l, !0, -1), l.checkLineBreaks && x.test(l.input.slice(b, l.position)) && Y(l, "non-ASCII line breaks are interpreted as content"), l.documents.push(l.result), l.position === l.lineStart && ne(l)) {
      l.input.charCodeAt(l.position) === 46 && (l.position += 3, W(l, !0, -1));
      return;
    }
    if (l.position < l.length - 1)
      L(l, "end of the stream or a document separator is expected");
    else
      return;
  }
  function ve(l, b) {
    l = String(l), b = b || {}, l.length !== 0 && (l.charCodeAt(l.length - 1) !== 10 && l.charCodeAt(l.length - 1) !== 13 && (l += `
`), l.charCodeAt(0) === 65279 && (l = l.slice(1)));
    var T = new me(l, b), Z = l.indexOf("\0");
    for (Z !== -1 && (T.position = Z, L(T, "null byte is not allowed in input")), T.input += "\0"; T.input.charCodeAt(T.position) === 32; )
      T.lineIndent += 1, T.position += 1;
    for (; T.position < T.length - 1; )
      Te(T);
    return T.documents;
  }
  function be(l, b, T) {
    b !== null && typeof b == "object" && typeof T > "u" && (T = b, b = null);
    var Z = ve(l, T);
    if (typeof b != "function")
      return Z;
    for (var C = 0, p = Z.length; C < p; C += 1)
      b(Z[C]);
  }
  function xe(l, b) {
    var T = ve(l, b);
    if (T.length !== 0) {
      if (T.length === 1)
        return T[0];
      throw new e("expected a single document in the stream, but found more");
    }
  }
  function Ee(l, b, T) {
    return typeof b == "object" && b !== null && typeof T > "u" && (T = b, b = null), be(l, b, r.extend({ schema: n }, T));
  }
  function we(l, b) {
    return xe(l, r.extend({ schema: n }, b));
  }
  return loader.loadAll = be, loader.load = xe, loader.safeLoadAll = Ee, loader.safeLoad = we, loader;
}
var dumper = {}, hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  var r = requireCommon(), e = requireException(), t = requireDefault_full(), n = requireDefault_safe(), a = Object.prototype.toString, i = Object.prototype.hasOwnProperty, s = 9, o = 10, c = 13, d = 32, u = 33, f = 34, h = 35, g = 37, x = 38, _ = 39, P = 42, O = 44, v = 45, y = 58, A = 61, E = 62, I = 63, N = 64, $ = 91, M = 93, B = 96, H = 123, K = 124, le = 125, G = {};
  G[0] = "\\0", G[7] = "\\a", G[8] = "\\b", G[9] = "\\t", G[10] = "\\n", G[11] = "\\v", G[12] = "\\f", G[13] = "\\r", G[27] = "\\e", G[34] = '\\"', G[92] = "\\\\", G[133] = "\\N", G[160] = "\\_", G[8232] = "\\L", G[8233] = "\\P";
  var ie = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  function me(p, m) {
    var w, k, D, R, S, F, j;
    if (m === null) return {};
    for (w = {}, k = Object.keys(m), D = 0, R = k.length; D < R; D += 1)
      S = k[D], F = String(m[S]), S.slice(0, 2) === "!!" && (S = "tag:yaml.org,2002:" + S.slice(2)), j = p.compiledTypeMap.fallback[S], j && i.call(j.styleAliases, F) && (F = j.styleAliases[F]), w[S] = F;
    return w;
  }
  function ce(p) {
    var m, w, k;
    if (m = p.toString(16).toUpperCase(), p <= 255)
      w = "x", k = 2;
    else if (p <= 65535)
      w = "u", k = 4;
    else if (p <= 4294967295)
      w = "U", k = 8;
    else
      throw new e("code point within a string may not be greater than 0xFFFFFFFF");
    return "\\" + w + r.repeat("0", k - m.length) + m;
  }
  function L(p) {
    this.schema = p.schema || t, this.indent = Math.max(1, p.indent || 2), this.noArrayIndent = p.noArrayIndent || !1, this.skipInvalid = p.skipInvalid || !1, this.flowLevel = r.isNothing(p.flowLevel) ? -1 : p.flowLevel, this.styleMap = me(this.schema, p.styles || null), this.sortKeys = p.sortKeys || !1, this.lineWidth = p.lineWidth || 80, this.noRefs = p.noRefs || !1, this.noCompatMode = p.noCompatMode || !1, this.condenseFlow = p.condenseFlow || !1, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
  }
  function Y(p, m) {
    for (var w = r.repeat(" ", m), k = 0, D = -1, R = "", S, F = p.length; k < F; )
      D = p.indexOf(`
`, k), D === -1 ? (S = p.slice(k), k = F) : (S = p.slice(k, D + 1), k = D + 1), S.length && S !== `
` && (R += w), R += S;
    return R;
  }
  function re(p, m) {
    return `
` + r.repeat(" ", p.indent * m);
  }
  function Q(p, m) {
    var w, k, D;
    for (w = 0, k = p.implicitTypes.length; w < k; w += 1)
      if (D = p.implicitTypes[w], D.resolve(m))
        return !0;
    return !1;
  }
  function J(p) {
    return p === d || p === s;
  }
  function ee(p) {
    return 32 <= p && p <= 126 || 161 <= p && p <= 55295 && p !== 8232 && p !== 8233 || 57344 <= p && p <= 65533 && p !== 65279 || 65536 <= p && p <= 1114111;
  }
  function te(p) {
    return ee(p) && !J(p) && p !== 65279 && p !== c && p !== o;
  }
  function W(p, m) {
    return ee(p) && p !== 65279 && p !== O && p !== $ && p !== M && p !== H && p !== le && p !== y && (p !== h || m && te(m));
  }
  function ne(p) {
    return ee(p) && p !== 65279 && !J(p) && p !== v && p !== I && p !== y && p !== O && p !== $ && p !== M && p !== H && p !== le && p !== h && p !== x && p !== P && p !== u && p !== K && p !== A && p !== E && p !== _ && p !== f && p !== g && p !== N && p !== B;
  }
  function ae(p) {
    var m = /^\n* /;
    return m.test(p);
  }
  var de = 1, he = 2, ue = 3, se = 4, pe = 5;
  function fe(p, m, w, k, D) {
    var R, S, F, j = !1, V = !1, U = k !== -1, q = -1, X = ne(p.charCodeAt(0)) && !J(p.charCodeAt(p.length - 1));
    if (m)
      for (R = 0; R < p.length; R++) {
        if (S = p.charCodeAt(R), !ee(S))
          return pe;
        F = R > 0 ? p.charCodeAt(R - 1) : null, X = X && W(S, F);
      }
    else {
      for (R = 0; R < p.length; R++) {
        if (S = p.charCodeAt(R), S === o)
          j = !0, U && (V = V || // Foldable line = too long, and not more-indented.
          R - q - 1 > k && p[q + 1] !== " ", q = R);
        else if (!ee(S))
          return pe;
        F = R > 0 ? p.charCodeAt(R - 1) : null, X = X && W(S, F);
      }
      V = V || U && R - q - 1 > k && p[q + 1] !== " ";
    }
    return !j && !V ? X && !D(p) ? de : he : w > 9 && ae(p) ? pe : V ? se : ue;
  }
  function ke(p, m, w, k) {
    p.dump = (function() {
      if (m.length === 0)
        return "''";
      if (!p.noCompatMode && ie.indexOf(m) !== -1)
        return "'" + m + "'";
      var D = p.indent * Math.max(1, w), R = p.lineWidth === -1 ? -1 : Math.max(Math.min(p.lineWidth, 40), p.lineWidth - D), S = k || p.flowLevel > -1 && w >= p.flowLevel;
      function F(j) {
        return Q(p, j);
      }
      switch (fe(m, S, p.indent, R, F)) {
        case de:
          return m;
        case he:
          return "'" + m.replace(/'/g, "''") + "'";
        case ue:
          return "|" + ge(m, p.indent) + ye(Y(m, D));
        case se:
          return ">" + ge(m, p.indent) + ye(Y(_e(m, R), D));
        case pe:
          return '"' + Te(m) + '"';
        default:
          throw new e("impossible error: invalid scalar style");
      }
    })();
  }
  function ge(p, m) {
    var w = ae(p) ? String(m) : "", k = p[p.length - 1] === `
`, D = k && (p[p.length - 2] === `
` || p === `
`), R = D ? "+" : k ? "" : "-";
    return w + R + `
`;
  }
  function ye(p) {
    return p[p.length - 1] === `
` ? p.slice(0, -1) : p;
  }
  function _e(p, m) {
    for (var w = /(\n+)([^\n]*)/g, k = (function() {
      var V = p.indexOf(`
`);
      return V = V !== -1 ? V : p.length, w.lastIndex = V, oe(p.slice(0, V), m);
    })(), D = p[0] === `
` || p[0] === " ", R, S; S = w.exec(p); ) {
      var F = S[1], j = S[2];
      R = j[0] === " ", k += F + (!D && !R && j !== "" ? `
` : "") + oe(j, m), D = R;
    }
    return k;
  }
  function oe(p, m) {
    if (p === "" || p[0] === " ") return p;
    for (var w = / [^ ]/g, k, D = 0, R, S = 0, F = 0, j = ""; k = w.exec(p); )
      F = k.index, F - D > m && (R = S > D ? S : F, j += `
` + p.slice(D, R), D = R + 1), S = F;
    return j += `
`, p.length - D > m && S > D ? j += p.slice(D, S) + `
` + p.slice(S + 1) : j += p.slice(D), j.slice(1);
  }
  function Te(p) {
    for (var m = "", w, k, D, R = 0; R < p.length; R++) {
      if (w = p.charCodeAt(R), w >= 55296 && w <= 56319 && (k = p.charCodeAt(R + 1), k >= 56320 && k <= 57343)) {
        m += ce((w - 55296) * 1024 + k - 56320 + 65536), R++;
        continue;
      }
      D = G[w], m += !D && ee(w) ? p[R] : D || ce(w);
    }
    return m;
  }
  function ve(p, m, w) {
    var k = "", D = p.tag, R, S;
    for (R = 0, S = w.length; R < S; R += 1)
      l(p, m, w[R], !1, !1) && (R !== 0 && (k += "," + (p.condenseFlow ? "" : " ")), k += p.dump);
    p.tag = D, p.dump = "[" + k + "]";
  }
  function be(p, m, w, k) {
    var D = "", R = p.tag, S, F;
    for (S = 0, F = w.length; S < F; S += 1)
      l(p, m + 1, w[S], !0, !0) && ((!k || S !== 0) && (D += re(p, m)), p.dump && o === p.dump.charCodeAt(0) ? D += "-" : D += "- ", D += p.dump);
    p.tag = R, p.dump = D || "[]";
  }
  function xe(p, m, w) {
    var k = "", D = p.tag, R = Object.keys(w), S, F, j, V, U;
    for (S = 0, F = R.length; S < F; S += 1)
      U = "", S !== 0 && (U += ", "), p.condenseFlow && (U += '"'), j = R[S], V = w[j], l(p, m, j, !1, !1) && (p.dump.length > 1024 && (U += "? "), U += p.dump + (p.condenseFlow ? '"' : "") + ":" + (p.condenseFlow ? "" : " "), l(p, m, V, !1, !1) && (U += p.dump, k += U));
    p.tag = D, p.dump = "{" + k + "}";
  }
  function Ee(p, m, w, k) {
    var D = "", R = p.tag, S = Object.keys(w), F, j, V, U, q, X;
    if (p.sortKeys === !0)
      S.sort();
    else if (typeof p.sortKeys == "function")
      S.sort(p.sortKeys);
    else if (p.sortKeys)
      throw new e("sortKeys must be a boolean or a function");
    for (F = 0, j = S.length; F < j; F += 1)
      X = "", (!k || F !== 0) && (X += re(p, m)), V = S[F], U = w[V], l(p, m + 1, V, !0, !0, !0) && (q = p.tag !== null && p.tag !== "?" || p.dump && p.dump.length > 1024, q && (p.dump && o === p.dump.charCodeAt(0) ? X += "?" : X += "? "), X += p.dump, q && (X += re(p, m)), l(p, m + 1, U, !0, q) && (p.dump && o === p.dump.charCodeAt(0) ? X += ":" : X += ": ", X += p.dump, D += X));
    p.tag = R, p.dump = D || "{}";
  }
  function we(p, m, w) {
    var k, D, R, S, F, j;
    for (D = w ? p.explicitTypes : p.implicitTypes, R = 0, S = D.length; R < S; R += 1)
      if (F = D[R], (F.instanceOf || F.predicate) && (!F.instanceOf || typeof m == "object" && m instanceof F.instanceOf) && (!F.predicate || F.predicate(m))) {
        if (p.tag = w ? F.tag : "?", F.represent) {
          if (j = p.styleMap[F.tag] || F.defaultStyle, a.call(F.represent) === "[object Function]")
            k = F.represent(m, j);
          else if (i.call(F.represent, j))
            k = F.represent[j](m, j);
          else
            throw new e("!<" + F.tag + '> tag resolver accepts not "' + j + '" style');
          p.dump = k;
        }
        return !0;
      }
    return !1;
  }
  function l(p, m, w, k, D, R) {
    p.tag = null, p.dump = w, we(p, w, !1) || we(p, w, !0);
    var S = a.call(p.dump);
    k && (k = p.flowLevel < 0 || p.flowLevel > m);
    var F = S === "[object Object]" || S === "[object Array]", j, V;
    if (F && (j = p.duplicates.indexOf(w), V = j !== -1), (p.tag !== null && p.tag !== "?" || V || p.indent !== 2 && m > 0) && (D = !1), V && p.usedDuplicates[j])
      p.dump = "*ref_" + j;
    else {
      if (F && V && !p.usedDuplicates[j] && (p.usedDuplicates[j] = !0), S === "[object Object]")
        k && Object.keys(p.dump).length !== 0 ? (Ee(p, m, p.dump, D), V && (p.dump = "&ref_" + j + p.dump)) : (xe(p, m, p.dump), V && (p.dump = "&ref_" + j + " " + p.dump));
      else if (S === "[object Array]") {
        var U = p.noArrayIndent && m > 0 ? m - 1 : m;
        k && p.dump.length !== 0 ? (be(p, U, p.dump, D), V && (p.dump = "&ref_" + j + p.dump)) : (ve(p, U, p.dump), V && (p.dump = "&ref_" + j + " " + p.dump));
      } else if (S === "[object String]")
        p.tag !== "?" && ke(p, p.dump, m, R);
      else {
        if (p.skipInvalid) return !1;
        throw new e("unacceptable kind of an object to dump " + S);
      }
      p.tag !== null && p.tag !== "?" && (p.dump = "!<" + p.tag + "> " + p.dump);
    }
    return !0;
  }
  function b(p, m) {
    var w = [], k = [], D, R;
    for (T(p, w, k), D = 0, R = k.length; D < R; D += 1)
      m.duplicates.push(w[k[D]]);
    m.usedDuplicates = new Array(R);
  }
  function T(p, m, w) {
    var k, D, R;
    if (p !== null && typeof p == "object")
      if (D = m.indexOf(p), D !== -1)
        w.indexOf(D) === -1 && w.push(D);
      else if (m.push(p), Array.isArray(p))
        for (D = 0, R = p.length; D < R; D += 1)
          T(p[D], m, w);
      else
        for (k = Object.keys(p), D = 0, R = k.length; D < R; D += 1)
          T(p[k[D]], m, w);
  }
  function Z(p, m) {
    m = m || {};
    var w = new L(m);
    return w.noRefs || b(p, w), l(w, 0, p, !0, !0) ? w.dump + `
` : "";
  }
  function C(p, m) {
    return Z(p, r.extend({ schema: n }, m));
  }
  return dumper.dump = Z, dumper.safeDump = C, dumper;
}
var hasRequiredJsYaml$1;
function requireJsYaml$1() {
  if (hasRequiredJsYaml$1) return jsYaml$1;
  hasRequiredJsYaml$1 = 1;
  var r = requireLoader(), e = requireDumper();
  function t(n) {
    return function() {
      throw new Error("Function " + n + " is deprecated and cannot be used.");
    };
  }
  return jsYaml$1.Type = requireType(), jsYaml$1.Schema = requireSchema(), jsYaml$1.FAILSAFE_SCHEMA = requireFailsafe(), jsYaml$1.JSON_SCHEMA = requireJson(), jsYaml$1.CORE_SCHEMA = requireCore(), jsYaml$1.DEFAULT_SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_FULL_SCHEMA = requireDefault_full(), jsYaml$1.load = r.load, jsYaml$1.loadAll = r.loadAll, jsYaml$1.safeLoad = r.safeLoad, jsYaml$1.safeLoadAll = r.safeLoadAll, jsYaml$1.dump = e.dump, jsYaml$1.safeDump = e.safeDump, jsYaml$1.YAMLException = requireException(), jsYaml$1.MINIMAL_SCHEMA = requireFailsafe(), jsYaml$1.SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_SCHEMA = requireDefault_full(), jsYaml$1.scan = t("scan"), jsYaml$1.parse = t("parse"), jsYaml$1.compose = t("compose"), jsYaml$1.addConstructor = t("addConstructor"), jsYaml$1;
}
var jsYaml, hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  var r = requireJsYaml$1();
  return jsYaml = r, jsYaml;
}
var hasRequiredEngines;
function requireEngines() {
  return hasRequiredEngines || (hasRequiredEngines = 1, (function(module, exports) {
    const yaml = requireJsYaml(), engines = module.exports;
    engines.yaml = {
      parse: yaml.safeLoad.bind(yaml),
      stringify: yaml.safeDump.bind(yaml)
    }, engines.json = {
      parse: JSON.parse.bind(JSON),
      stringify: function(r, e) {
        const t = Object.assign({ replacer: null, space: 2 }, e);
        return JSON.stringify(r, t.replacer, t.space);
      }
    }, engines.javascript = {
      parse: function parse(str, options, wrap) {
        try {
          return wrap !== !1 && (str = `(function() {
return ` + str.trim() + `;
}());`), eval(str) || {};
        } catch (r) {
          if (wrap !== !1 && /(unexpected|identifier)/i.test(r.message))
            return parse(str, options, !1);
          throw new SyntaxError(r);
        }
      },
      stringify: function() {
        throw new Error("stringifying JavaScript is not supported");
      }
    };
  })(engines)), engines.exports;
}
var utils = {};
/*!
 * strip-bom-string <https://github.com/jonschlinkert/strip-bom-string>
 *
 * Copyright (c) 2015, 2017, Jon Schlinkert.
 * Released under the MIT License.
 */
var stripBomString, hasRequiredStripBomString;
function requireStripBomString() {
  return hasRequiredStripBomString || (hasRequiredStripBomString = 1, stripBomString = function(r) {
    return typeof r == "string" && r.charAt(0) === "\uFEFF" ? r.slice(1) : r;
  }), stripBomString;
}
var hasRequiredUtils;
function requireUtils() {
  return hasRequiredUtils || (hasRequiredUtils = 1, (function(r) {
    const e = requireStripBomString(), t = requireKindOf();
    r.define = function(n, a, i) {
      Reflect.defineProperty(n, a, {
        enumerable: !1,
        configurable: !0,
        writable: !0,
        value: i
      });
    }, r.isBuffer = function(n) {
      return t(n) === "buffer";
    }, r.isObject = function(n) {
      return t(n) === "object";
    }, r.toBuffer = function(n) {
      return typeof n == "string" ? Buffer.from(n) : n;
    }, r.toString = function(n) {
      if (r.isBuffer(n)) return e(String(n));
      if (typeof n != "string")
        throw new TypeError("expected input to be a string or buffer");
      return e(n);
    }, r.arrayify = function(n) {
      return n ? Array.isArray(n) ? n : [n] : [];
    }, r.startsWith = function(n, a, i) {
      return typeof i != "number" && (i = a.length), n.slice(0, i) === a;
    };
  })(utils)), utils;
}
var defaults, hasRequiredDefaults;
function requireDefaults() {
  if (hasRequiredDefaults) return defaults;
  hasRequiredDefaults = 1;
  const r = requireEngines(), e = requireUtils();
  return defaults = function(t) {
    const n = Object.assign({}, t);
    return n.delimiters = e.arrayify(n.delims || n.delimiters || "---"), n.delimiters.length === 1 && n.delimiters.push(n.delimiters[0]), n.language = (n.language || n.lang || "yaml").toLowerCase(), n.engines = Object.assign({}, r, n.parsers, n.engines), n;
  }, defaults;
}
var engine, hasRequiredEngine;
function requireEngine() {
  if (hasRequiredEngine) return engine;
  hasRequiredEngine = 1, engine = function(e, t) {
    let n = t.engines[e] || t.engines[r(e)];
    if (typeof n > "u")
      throw new Error('gray-matter engine "' + e + '" is not registered');
    return typeof n == "function" && (n = { parse: n }), n;
  };
  function r(e) {
    switch (e.toLowerCase()) {
      case "js":
      case "javascript":
        return "javascript";
      case "coffee":
      case "coffeescript":
      case "cson":
        return "coffee";
      case "yaml":
      case "yml":
        return "yaml";
      default:
        return e;
    }
  }
  return engine;
}
var stringify, hasRequiredStringify;
function requireStringify() {
  if (hasRequiredStringify) return stringify;
  hasRequiredStringify = 1;
  const r = requireKindOf(), e = requireEngine(), t = requireDefaults();
  stringify = function(a, i, s) {
    if (i == null && s == null)
      switch (r(a)) {
        case "object":
          i = a.data, s = {};
          break;
        case "string":
          return a;
        default:
          throw new TypeError("expected file to be a string or object");
      }
    const o = a.content, c = t(s);
    if (i == null) {
      if (!c.data) return a;
      i = c.data;
    }
    const d = a.language || c.language, u = e(d, c);
    if (typeof u.stringify != "function")
      throw new TypeError('expected "' + d + '.stringify" to be a function');
    i = Object.assign({}, a.data, i);
    const f = c.delimiters[0], h = c.delimiters[1], g = u.stringify(i, s).trim();
    let x = "";
    return g !== "{}" && (x = n(f) + n(g) + n(h)), typeof a.excerpt == "string" && a.excerpt !== "" && o.indexOf(a.excerpt.trim()) === -1 && (x += n(a.excerpt) + n(h)), x + n(o);
  };
  function n(a) {
    return a.slice(-1) !== `
` ? a + `
` : a;
  }
  return stringify;
}
var excerpt, hasRequiredExcerpt;
function requireExcerpt() {
  if (hasRequiredExcerpt) return excerpt;
  hasRequiredExcerpt = 1;
  const r = requireDefaults();
  return excerpt = function(e, t) {
    const n = r(t);
    if (e.data == null && (e.data = {}), typeof n.excerpt == "function")
      return n.excerpt(e, n);
    const a = e.data.excerpt_separator || n.excerpt_separator;
    if (a == null && (n.excerpt === !1 || n.excerpt == null))
      return e;
    const i = typeof n.excerpt == "string" ? n.excerpt : a || n.delimiters[0], s = e.content.indexOf(i);
    return s !== -1 && (e.excerpt = e.content.slice(0, s)), e;
  }, excerpt;
}
var toFile, hasRequiredToFile;
function requireToFile() {
  if (hasRequiredToFile) return toFile;
  hasRequiredToFile = 1;
  const r = requireKindOf(), e = requireStringify(), t = requireUtils();
  return toFile = function(n) {
    return r(n) !== "object" && (n = { content: n }), r(n.data) !== "object" && (n.data = {}), n.contents && n.content == null && (n.content = n.contents), t.define(n, "orig", t.toBuffer(n.content)), t.define(n, "language", n.language || ""), t.define(n, "matter", n.matter || ""), t.define(n, "stringify", function(a, i) {
      return i && i.language && (n.language = i.language), e(n, a, i);
    }), n.content = t.toString(n.content), n.isEmpty = !1, n.excerpt = "", n;
  }, toFile;
}
var parse, hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse;
  hasRequiredParse = 1;
  const r = requireEngine(), e = requireDefaults();
  return parse = function(t, n, a) {
    const i = e(a), s = r(t, i);
    if (typeof s.parse != "function")
      throw new TypeError('expected "' + t + '.parse" to be a function');
    return s.parse(n, i);
  }, parse;
}
var grayMatter, hasRequiredGrayMatter;
function requireGrayMatter() {
  if (hasRequiredGrayMatter) return grayMatter;
  hasRequiredGrayMatter = 1;
  const r = require$$0, e = requireSectionMatter(), t = requireDefaults(), n = requireStringify(), a = requireExcerpt(), i = requireEngines(), s = requireToFile(), o = requireParse(), c = requireUtils();
  function d(f, h) {
    if (f === "")
      return { data: {}, content: f, excerpt: "", orig: f };
    let g = s(f);
    const x = d.cache[g.content];
    if (!h) {
      if (x)
        return g = Object.assign({}, x), g.orig = x.orig, g;
      d.cache[g.content] = g;
    }
    return u(g, h);
  }
  function u(f, h) {
    const g = t(h), x = g.delimiters[0], _ = `
` + g.delimiters[1];
    let P = f.content;
    g.language && (f.language = g.language);
    const O = x.length;
    if (!c.startsWith(P, x, O))
      return a(f, g), f;
    if (P.charAt(O) === x.slice(-1))
      return f;
    P = P.slice(O);
    const v = P.length, y = d.language(P, g);
    y.name && (f.language = y.name, P = P.slice(y.raw.length));
    let A = P.indexOf(_);
    return A === -1 && (A = v), f.matter = P.slice(0, A), f.matter.replace(/^\s*#[^\n]+/gm, "").trim() === "" ? (f.isEmpty = !0, f.empty = f.content, f.data = {}) : f.data = o(f.language, f.matter, g), A === v ? f.content = "" : (f.content = P.slice(A + _.length), f.content[0] === "\r" && (f.content = f.content.slice(1)), f.content[0] === `
` && (f.content = f.content.slice(1))), a(f, g), (g.sections === !0 || typeof g.section == "function") && e(f, g.section), f;
  }
  return d.engines = i, d.stringify = function(f, h, g) {
    return typeof f == "string" && (f = d(f, g)), n(f, h, g);
  }, d.read = function(f, h) {
    const g = r.readFileSync(f, "utf8"), x = d(g, h);
    return x.path = f, x;
  }, d.test = function(f, h) {
    return c.startsWith(f, t(h).delimiters[0]);
  }, d.language = function(f, h) {
    const x = t(h).delimiters[0];
    d.test(f) && (f = f.slice(x.length));
    const _ = f.slice(0, f.search(/\r?\n/));
    return {
      raw: _,
      name: _ ? _.trim() : ""
    };
  }, d.cache = {}, d.clearCache = function() {
    d.cache = {};
  }, grayMatter = d, grayMatter;
}
var grayMatterExports = requireGrayMatter();
const matter = /* @__PURE__ */ getDefaultExportFromCjs(grayMatterExports);
function _getDefaults() {
  return {
    async: !1,
    breaks: !1,
    extensions: null,
    gfm: !0,
    hooks: null,
    pedantic: !1,
    renderer: null,
    silent: !1,
    tokenizer: null,
    walkTokens: null
  };
}
var _defaults = _getDefaults();
function changeDefaults(r) {
  _defaults = r;
}
var noopTest = { exec: () => null };
function edit(r, e = "") {
  let t = typeof r == "string" ? r : r.source;
  const n = {
    replace: (a, i) => {
      let s = typeof i == "string" ? i : i.source;
      return s = s.replace(other.caret, "$1"), t = t.replace(a, s), n;
    },
    getRegex: () => new RegExp(t, e)
  };
  return n;
}
var other = {
  codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
  outputLinkReplace: /\\([\[\]])/g,
  indentCodeCompensation: /^(\s+)(?:```)/,
  beginningSpace: /^\s+/,
  endingHash: /#$/,
  startingSpaceChar: /^ /,
  endingSpaceChar: / $/,
  nonSpaceChar: /[^ ]/,
  newLineCharGlobal: /\n/g,
  tabCharGlobal: /\t/g,
  multipleSpaceGlobal: /\s+/g,
  blankLine: /^[ \t]*$/,
  doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
  blockquoteStart: /^ {0,3}>/,
  blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
  blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
  listReplaceTabs: /^\t+/,
  listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
  listIsTask: /^\[[ xX]\] /,
  listReplaceTask: /^\[[ xX]\] +/,
  anyLine: /\n.*\n/,
  hrefBrackets: /^<(.*)>$/,
  tableDelimiter: /[:|]/,
  tableAlignChars: /^\||\| *$/g,
  tableRowBlankLine: /\n[ \t]*$/,
  tableAlignRight: /^ *-+: *$/,
  tableAlignCenter: /^ *:-+: *$/,
  tableAlignLeft: /^ *:-+ *$/,
  startATag: /^<a /i,
  endATag: /^<\/a>/i,
  startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
  endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
  startAngleBracket: /^</,
  endAngleBracket: />$/,
  pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
  unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,
  caret: /(^|[^\[])\^/g,
  percentDecode: /%25/g,
  findPipe: /\|/g,
  splitPipe: / \|/,
  slashPipe: /\\\|/g,
  carriageReturn: /\r\n|\r/g,
  spaceLine: /^ +$/gm,
  notSpaceStart: /^\S*/,
  endingNewline: /\n$/,
  listItemRegex: (r) => new RegExp(`^( {0,3}${r})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (r) => new RegExp(`^ {0,${Math.min(3, r - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (r) => new RegExp(`^ {0,${Math.min(3, r - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (r) => new RegExp(`^ {0,${Math.min(3, r - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (r) => new RegExp(`^ {0,${Math.min(3, r - 1)}}#`),
  htmlBeginRegex: (r) => new RegExp(`^ {0,${Math.min(3, r - 1)}}<(?:[a-z].*>|!--)`, "i")
}, newline = /^(?:[ \t]*(?:\n|$))+/, blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, bullet = /(?:[*+-]|\d{1,9}[.)])/, lheadingCore = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, lheading = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), lheadingGfm = edit(lheadingCore).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, blockText = /^[^\n]+/, _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/, def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex(), _tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, html = edit(
  "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))",
  "i"
).replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex(), blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex(), blockNormal = {
  blockquote,
  code: blockCode,
  def,
  fences,
  heading,
  hr,
  html,
  lheading,
  list,
  newline,
  paragraph,
  table: noopTest,
  text: blockText
}, gfmTable = edit(
  "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex(), blockGfm = {
  ...blockNormal,
  lheading: lheadingGfm,
  table: gfmTable,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
}, blockPedantic = {
  ...blockNormal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", _comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(_paragraph).replace("hr", hr).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
}, escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, br = /^( {2,}|\\)\n(?!\s*$)/, inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, _punctuation = /[\p{P}\p{S}]/u, _punctuationOrSpace = /[\s\p{P}\p{S}]/u, _notPunctuationOrSpace = /[^\s\p{P}\p{S}]/u, punctuation = edit(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, _punctuationOrSpace).getRegex(), _punctuationGfmStrongEm = /(?!~)[\p{P}\p{S}]/u, _punctuationOrSpaceGfmStrongEm = /(?!~)[\s\p{P}\p{S}]/u, _notPunctuationOrSpaceGfmStrongEm = /(?:[^\s\p{P}\p{S}]|~)/u, blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g, emStrongLDelimCore = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, emStrongLDelim = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuation).getRegex(), emStrongLDelimGfm = edit(emStrongLDelimCore, "u").replace(/punct/g, _punctuationGfmStrongEm).getRegex(), emStrongRDelimAstCore = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", emStrongRDelimAst = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex(), emStrongRDelimAstGfm = edit(emStrongRDelimAstCore, "gu").replace(/notPunctSpace/g, _notPunctuationOrSpaceGfmStrongEm).replace(/punctSpace/g, _punctuationOrSpaceGfmStrongEm).replace(/punct/g, _punctuationGfmStrongEm).getRegex(), emStrongRDelimUnd = edit(
  "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
  "gu"
).replace(/notPunctSpace/g, _notPunctuationOrSpace).replace(/punctSpace/g, _punctuationOrSpace).replace(/punct/g, _punctuation).getRegex(), anyPunctuation = edit(/\\(punct)/, "gu").replace(/punct/g, _punctuation).getRegex(), autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex(), tag = edit(
  "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>"
).replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/, link = edit(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex(), nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex(), reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex(), inlineNormal = {
  _backpedal: noopTest,
  // only used for GFM url
  anyPunctuation,
  autolink,
  blockSkip,
  br,
  code: inlineCode,
  del: noopTest,
  emStrongLDelim,
  emStrongRDelimAst,
  emStrongRDelimUnd,
  escape,
  link,
  nolink,
  punctuation,
  reflink,
  reflinkSearch,
  tag,
  text: inlineText,
  url: noopTest
}, inlinePedantic = {
  ...inlineNormal,
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
}, inlineGfm = {
  ...inlineNormal,
  emStrongRDelimAst: emStrongRDelimAstGfm,
  emStrongLDelim: emStrongLDelimGfm,
  url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
}, inlineBreaks = {
  ...inlineGfm,
  br: edit(br).replace("{2,}", "*").getRegex(),
  text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
}, block = {
  normal: blockNormal,
  gfm: blockGfm,
  pedantic: blockPedantic
}, inline = {
  normal: inlineNormal,
  gfm: inlineGfm,
  breaks: inlineBreaks,
  pedantic: inlinePedantic
}, escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}, getEscapeReplacement = (r) => escapeReplacements[r];
function escape2(r, e) {
  if (e) {
    if (other.escapeTest.test(r))
      return r.replace(other.escapeReplace, getEscapeReplacement);
  } else if (other.escapeTestNoEncode.test(r))
    return r.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
  return r;
}
function cleanUrl(r) {
  try {
    r = encodeURI(r).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return r;
}
function splitCells(r, e) {
  const t = r.replace(other.findPipe, (i, s, o) => {
    let c = !1, d = s;
    for (; --d >= 0 && o[d] === "\\"; ) c = !c;
    return c ? "|" : " |";
  }), n = t.split(other.splitPipe);
  let a = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e)
    if (n.length > e)
      n.splice(e);
    else
      for (; n.length < e; ) n.push("");
  for (; a < n.length; a++)
    n[a] = n[a].trim().replace(other.slashPipe, "|");
  return n;
}
function rtrim(r, e, t) {
  const n = r.length;
  if (n === 0)
    return "";
  let a = 0;
  for (; a < n && r.charAt(n - a - 1) === e; )
    a++;
  return r.slice(0, n - a);
}
function findClosingBracket(r, e) {
  if (r.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let n = 0; n < r.length; n++)
    if (r[n] === "\\")
      n++;
    else if (r[n] === e[0])
      t++;
    else if (r[n] === e[1] && (t--, t < 0))
      return n;
  return t > 0 ? -2 : -1;
}
function outputLink(r, e, t, n, a) {
  const i = e.href, s = e.title || null, o = r[1].replace(a.other.outputLinkReplace, "$1");
  n.state.inLink = !0;
  const c = {
    type: r[0].charAt(0) === "!" ? "image" : "link",
    raw: t,
    href: i,
    title: s,
    text: o,
    tokens: n.inlineTokens(o)
  };
  return n.state.inLink = !1, c;
}
function indentCodeCompensation(r, e, t) {
  const n = r.match(t.other.indentCodeCompensation);
  if (n === null)
    return e;
  const a = n[1];
  return e.split(`
`).map((i) => {
    const s = i.match(t.other.beginningSpace);
    if (s === null)
      return i;
    const [o] = s;
    return o.length >= a.length ? i.slice(a.length) : i;
  }).join(`
`);
}
var _Tokenizer = class {
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(r) {
    this.options = r || _defaults;
  }
  space(r) {
    const e = this.rules.block.newline.exec(r);
    if (e && e[0].length > 0)
      return {
        type: "space",
        raw: e[0]
      };
  }
  code(r) {
    const e = this.rules.block.code.exec(r);
    if (e) {
      const t = e[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: e[0],
        codeBlockStyle: "indented",
        text: this.options.pedantic ? t : rtrim(t, `
`)
      };
    }
  }
  fences(r) {
    const e = this.rules.block.fences.exec(r);
    if (e) {
      const t = e[0], n = indentCodeCompensation(t, e[3] || "", this.rules);
      return {
        type: "code",
        raw: t,
        lang: e[2] ? e[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : e[2],
        text: n
      };
    }
  }
  heading(r) {
    const e = this.rules.block.heading.exec(r);
    if (e) {
      let t = e[2].trim();
      if (this.rules.other.endingHash.test(t)) {
        const n = rtrim(t, "#");
        (this.options.pedantic || !n || this.rules.other.endingSpaceChar.test(n)) && (t = n.trim());
      }
      return {
        type: "heading",
        raw: e[0],
        depth: e[1].length,
        text: t,
        tokens: this.lexer.inline(t)
      };
    }
  }
  hr(r) {
    const e = this.rules.block.hr.exec(r);
    if (e)
      return {
        type: "hr",
        raw: rtrim(e[0], `
`)
      };
  }
  blockquote(r) {
    const e = this.rules.block.blockquote.exec(r);
    if (e) {
      let t = rtrim(e[0], `
`).split(`
`), n = "", a = "";
      const i = [];
      for (; t.length > 0; ) {
        let s = !1;
        const o = [];
        let c;
        for (c = 0; c < t.length; c++)
          if (this.rules.other.blockquoteStart.test(t[c]))
            o.push(t[c]), s = !0;
          else if (!s)
            o.push(t[c]);
          else
            break;
        t = t.slice(c);
        const d = o.join(`
`), u = d.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        n = n ? `${n}
${d}` : d, a = a ? `${a}
${u}` : u;
        const f = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(u, i, !0), this.lexer.state.top = f, t.length === 0)
          break;
        const h = i.at(-1);
        if (h?.type === "code")
          break;
        if (h?.type === "blockquote") {
          const g = h, x = g.raw + `
` + t.join(`
`), _ = this.blockquote(x);
          i[i.length - 1] = _, n = n.substring(0, n.length - g.raw.length) + _.raw, a = a.substring(0, a.length - g.text.length) + _.text;
          break;
        } else if (h?.type === "list") {
          const g = h, x = g.raw + `
` + t.join(`
`), _ = this.list(x);
          i[i.length - 1] = _, n = n.substring(0, n.length - h.raw.length) + _.raw, a = a.substring(0, a.length - g.raw.length) + _.raw, t = x.substring(i.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return {
        type: "blockquote",
        raw: n,
        tokens: i,
        text: a
      };
    }
  }
  list(r) {
    let e = this.rules.block.list.exec(r);
    if (e) {
      let t = e[1].trim();
      const n = t.length > 1, a = {
        type: "list",
        raw: "",
        ordered: n,
        start: n ? +t.slice(0, -1) : "",
        loose: !1,
        items: []
      };
      t = n ? `\\d{1,9}\\${t.slice(-1)}` : `\\${t}`, this.options.pedantic && (t = n ? t : "[*+-]");
      const i = this.rules.other.listItemRegex(t);
      let s = !1;
      for (; r; ) {
        let c = !1, d = "", u = "";
        if (!(e = i.exec(r)) || this.rules.block.hr.test(r))
          break;
        d = e[0], r = r.substring(d.length);
        let f = e[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (O) => " ".repeat(3 * O.length)), h = r.split(`
`, 1)[0], g = !f.trim(), x = 0;
        if (this.options.pedantic ? (x = 2, u = f.trimStart()) : g ? x = e[1].length + 1 : (x = e[2].search(this.rules.other.nonSpaceChar), x = x > 4 ? 1 : x, u = f.slice(x), x += e[1].length), g && this.rules.other.blankLine.test(h) && (d += h + `
`, r = r.substring(h.length + 1), c = !0), !c) {
          const O = this.rules.other.nextBulletRegex(x), v = this.rules.other.hrRegex(x), y = this.rules.other.fencesBeginRegex(x), A = this.rules.other.headingBeginRegex(x), E = this.rules.other.htmlBeginRegex(x);
          for (; r; ) {
            const I = r.split(`
`, 1)[0];
            let N;
            if (h = I, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), N = h) : N = h.replace(this.rules.other.tabCharGlobal, "    "), y.test(h) || A.test(h) || E.test(h) || O.test(h) || v.test(h))
              break;
            if (N.search(this.rules.other.nonSpaceChar) >= x || !h.trim())
              u += `
` + N.slice(x);
            else {
              if (g || f.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || y.test(f) || A.test(f) || v.test(f))
                break;
              u += `
` + h;
            }
            !g && !h.trim() && (g = !0), d += I + `
`, r = r.substring(I.length + 1), f = N.slice(x);
          }
        }
        a.loose || (s ? a.loose = !0 : this.rules.other.doubleBlankLine.test(d) && (s = !0));
        let _ = null, P;
        this.options.gfm && (_ = this.rules.other.listIsTask.exec(u), _ && (P = _[0] !== "[ ] ", u = u.replace(this.rules.other.listReplaceTask, ""))), a.items.push({
          type: "list_item",
          raw: d,
          task: !!_,
          checked: P,
          loose: !1,
          text: u,
          tokens: []
        }), a.raw += d;
      }
      const o = a.items.at(-1);
      if (o)
        o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
      else
        return;
      a.raw = a.raw.trimEnd();
      for (let c = 0; c < a.items.length; c++)
        if (this.lexer.state.top = !1, a.items[c].tokens = this.lexer.blockTokens(a.items[c].text, []), !a.loose) {
          const d = a.items[c].tokens.filter((f) => f.type === "space"), u = d.length > 0 && d.some((f) => this.rules.other.anyLine.test(f.raw));
          a.loose = u;
        }
      if (a.loose)
        for (let c = 0; c < a.items.length; c++)
          a.items[c].loose = !0;
      return a;
    }
  }
  html(r) {
    const e = this.rules.block.html.exec(r);
    if (e)
      return {
        type: "html",
        block: !0,
        raw: e[0],
        pre: e[1] === "pre" || e[1] === "script" || e[1] === "style",
        text: e[0]
      };
  }
  def(r) {
    const e = this.rules.block.def.exec(r);
    if (e) {
      const t = e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), n = e[2] ? e[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", a = e[3] ? e[3].substring(1, e[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : e[3];
      return {
        type: "def",
        tag: t,
        raw: e[0],
        href: n,
        title: a
      };
    }
  }
  table(r) {
    const e = this.rules.block.table.exec(r);
    if (!e || !this.rules.other.tableDelimiter.test(e[2]))
      return;
    const t = splitCells(e[1]), n = e[2].replace(this.rules.other.tableAlignChars, "").split("|"), a = e[3]?.trim() ? e[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = {
      type: "table",
      raw: e[0],
      header: [],
      align: [],
      rows: []
    };
    if (t.length === n.length) {
      for (const s of n)
        this.rules.other.tableAlignRight.test(s) ? i.align.push("right") : this.rules.other.tableAlignCenter.test(s) ? i.align.push("center") : this.rules.other.tableAlignLeft.test(s) ? i.align.push("left") : i.align.push(null);
      for (let s = 0; s < t.length; s++)
        i.header.push({
          text: t[s],
          tokens: this.lexer.inline(t[s]),
          header: !0,
          align: i.align[s]
        });
      for (const s of a)
        i.rows.push(splitCells(s, i.header.length).map((o, c) => ({
          text: o,
          tokens: this.lexer.inline(o),
          header: !1,
          align: i.align[c]
        })));
      return i;
    }
  }
  lheading(r) {
    const e = this.rules.block.lheading.exec(r);
    if (e)
      return {
        type: "heading",
        raw: e[0],
        depth: e[2].charAt(0) === "=" ? 1 : 2,
        text: e[1],
        tokens: this.lexer.inline(e[1])
      };
  }
  paragraph(r) {
    const e = this.rules.block.paragraph.exec(r);
    if (e) {
      const t = e[1].charAt(e[1].length - 1) === `
` ? e[1].slice(0, -1) : e[1];
      return {
        type: "paragraph",
        raw: e[0],
        text: t,
        tokens: this.lexer.inline(t)
      };
    }
  }
  text(r) {
    const e = this.rules.block.text.exec(r);
    if (e)
      return {
        type: "text",
        raw: e[0],
        text: e[0],
        tokens: this.lexer.inline(e[0])
      };
  }
  escape(r) {
    const e = this.rules.inline.escape.exec(r);
    if (e)
      return {
        type: "escape",
        raw: e[0],
        text: e[1]
      };
  }
  tag(r) {
    const e = this.rules.inline.tag.exec(r);
    if (e)
      return !this.lexer.state.inLink && this.rules.other.startATag.test(e[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(e[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(e[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(e[0]) && (this.lexer.state.inRawBlock = !1), {
        type: "html",
        raw: e[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        block: !1,
        text: e[0]
      };
  }
  link(r) {
    const e = this.rules.inline.link.exec(r);
    if (e) {
      const t = e[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(t)) {
        if (!this.rules.other.endAngleBracket.test(t))
          return;
        const i = rtrim(t.slice(0, -1), "\\");
        if ((t.length - i.length) % 2 === 0)
          return;
      } else {
        const i = findClosingBracket(e[2], "()");
        if (i === -2)
          return;
        if (i > -1) {
          const o = (e[0].indexOf("!") === 0 ? 5 : 4) + e[1].length + i;
          e[2] = e[2].substring(0, i), e[0] = e[0].substring(0, o).trim(), e[3] = "";
        }
      }
      let n = e[2], a = "";
      if (this.options.pedantic) {
        const i = this.rules.other.pedanticHrefTitle.exec(n);
        i && (n = i[1], a = i[3]);
      } else
        a = e[3] ? e[3].slice(1, -1) : "";
      return n = n.trim(), this.rules.other.startAngleBracket.test(n) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(t) ? n = n.slice(1) : n = n.slice(1, -1)), outputLink(e, {
        href: n && n.replace(this.rules.inline.anyPunctuation, "$1"),
        title: a && a.replace(this.rules.inline.anyPunctuation, "$1")
      }, e[0], this.lexer, this.rules);
    }
  }
  reflink(r, e) {
    let t;
    if ((t = this.rules.inline.reflink.exec(r)) || (t = this.rules.inline.nolink.exec(r))) {
      const n = (t[2] || t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), a = e[n.toLowerCase()];
      if (!a) {
        const i = t[0].charAt(0);
        return {
          type: "text",
          raw: i,
          text: i
        };
      }
      return outputLink(t, a, t[0], this.lexer, this.rules);
    }
  }
  emStrong(r, e, t = "") {
    let n = this.rules.inline.emStrongLDelim.exec(r);
    if (!n || n[3] && t.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(n[1] || n[2] || "") || !t || this.rules.inline.punctuation.exec(t)) {
      const i = [...n[0]].length - 1;
      let s, o, c = i, d = 0;
      const u = n[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (u.lastIndex = 0, e = e.slice(-1 * r.length + i); (n = u.exec(e)) != null; ) {
        if (s = n[1] || n[2] || n[3] || n[4] || n[5] || n[6], !s) continue;
        if (o = [...s].length, n[3] || n[4]) {
          c += o;
          continue;
        } else if ((n[5] || n[6]) && i % 3 && !((i + o) % 3)) {
          d += o;
          continue;
        }
        if (c -= o, c > 0) continue;
        o = Math.min(o, o + c + d);
        const f = [...n[0]][0].length, h = r.slice(0, i + n.index + f + o);
        if (Math.min(i, o) % 2) {
          const x = h.slice(1, -1);
          return {
            type: "em",
            raw: h,
            text: x,
            tokens: this.lexer.inlineTokens(x)
          };
        }
        const g = h.slice(2, -2);
        return {
          type: "strong",
          raw: h,
          text: g,
          tokens: this.lexer.inlineTokens(g)
        };
      }
    }
  }
  codespan(r) {
    const e = this.rules.inline.code.exec(r);
    if (e) {
      let t = e[2].replace(this.rules.other.newLineCharGlobal, " ");
      const n = this.rules.other.nonSpaceChar.test(t), a = this.rules.other.startingSpaceChar.test(t) && this.rules.other.endingSpaceChar.test(t);
      return n && a && (t = t.substring(1, t.length - 1)), {
        type: "codespan",
        raw: e[0],
        text: t
      };
    }
  }
  br(r) {
    const e = this.rules.inline.br.exec(r);
    if (e)
      return {
        type: "br",
        raw: e[0]
      };
  }
  del(r) {
    const e = this.rules.inline.del.exec(r);
    if (e)
      return {
        type: "del",
        raw: e[0],
        text: e[2],
        tokens: this.lexer.inlineTokens(e[2])
      };
  }
  autolink(r) {
    const e = this.rules.inline.autolink.exec(r);
    if (e) {
      let t, n;
      return e[2] === "@" ? (t = e[1], n = "mailto:" + t) : (t = e[1], n = t), {
        type: "link",
        raw: e[0],
        text: t,
        href: n,
        tokens: [
          {
            type: "text",
            raw: t,
            text: t
          }
        ]
      };
    }
  }
  url(r) {
    let e;
    if (e = this.rules.inline.url.exec(r)) {
      let t, n;
      if (e[2] === "@")
        t = e[0], n = "mailto:" + t;
      else {
        let a;
        do
          a = e[0], e[0] = this.rules.inline._backpedal.exec(e[0])?.[0] ?? "";
        while (a !== e[0]);
        t = e[0], e[1] === "www." ? n = "http://" + e[0] : n = e[0];
      }
      return {
        type: "link",
        raw: e[0],
        text: t,
        href: n,
        tokens: [
          {
            type: "text",
            raw: t,
            text: t
          }
        ]
      };
    }
  }
  inlineText(r) {
    const e = this.rules.inline.text.exec(r);
    if (e) {
      const t = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: e[0],
        text: e[0],
        escaped: t
      };
    }
  }
}, _Lexer = class Ce {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(e) {
    this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || _defaults, this.options.tokenizer = this.options.tokenizer || new _Tokenizer(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
      inLink: !1,
      inRawBlock: !1,
      top: !0
    };
    const t = {
      other,
      block: block.normal,
      inline: inline.normal
    };
    this.options.pedantic ? (t.block = block.pedantic, t.inline = inline.pedantic) : this.options.gfm && (t.block = block.gfm, this.options.breaks ? t.inline = inline.breaks : t.inline = inline.gfm), this.tokenizer.rules = t;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(e, t) {
    return new Ce(t).lex(e);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(e, t) {
    return new Ce(t).inlineTokens(e);
  }
  /**
   * Preprocessing
   */
  lex(e) {
    e = e.replace(other.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      const n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = !1) {
    for (this.options.pedantic && (e = e.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "")); e; ) {
      let a;
      if (this.options.extensions?.block?.some((s) => (a = s.call({ lexer: this }, e, t)) ? (e = e.substring(a.raw.length), t.push(a), !0) : !1))
        continue;
      if (a = this.tokenizer.space(e)) {
        e = e.substring(a.raw.length);
        const s = t.at(-1);
        a.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(a);
        continue;
      }
      if (a = this.tokenizer.code(e)) {
        e = e.substring(a.raw.length);
        const s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.at(-1).src = s.text) : t.push(a);
        continue;
      }
      if (a = this.tokenizer.fences(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.heading(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.hr(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.blockquote(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.list(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.html(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.def(e)) {
        e = e.substring(a.raw.length);
        const s = t.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[a.tag] || (this.tokens.links[a.tag] = {
          href: a.href,
          title: a.title
        });
        continue;
      }
      if (a = this.tokenizer.table(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      if (a = this.tokenizer.lheading(e)) {
        e = e.substring(a.raw.length), t.push(a);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0;
        const o = e.slice(1);
        let c;
        this.options.extensions.startBlock.forEach((d) => {
          c = d.call({ lexer: this }, o), typeof c == "number" && c >= 0 && (s = Math.min(s, c));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (a = this.tokenizer.paragraph(i))) {
        const s = t.at(-1);
        n && s?.type === "paragraph" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(a), n = i.length !== e.length, e = e.substring(a.raw.length);
        continue;
      }
      if (a = this.tokenizer.text(e)) {
        e = e.substring(a.raw.length);
        const s = t.at(-1);
        s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(a);
        continue;
      }
      if (e) {
        const s = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(s);
          break;
        } else
          throw new Error(s);
      }
    }
    return this.state.top = !0, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(e, t = []) {
    let n = e, a = null;
    if (this.tokens.links) {
      const o = Object.keys(this.tokens.links);
      if (o.length > 0)
        for (; (a = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
          o.includes(a[0].slice(a[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (a = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
      n = n.slice(0, a.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    for (; (a = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
      n = n.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    let i = !1, s = "";
    for (; e; ) {
      i || (s = ""), i = !1;
      let o;
      if (this.options.extensions?.inline?.some((d) => (o = d.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), !0) : !1))
        continue;
      if (o = this.tokenizer.escape(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.tag(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.link(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(o.raw.length);
        const d = t.at(-1);
        o.type === "text" && d?.type === "text" ? (d.raw += o.raw, d.text += o.text) : t.push(o);
        continue;
      }
      if (o = this.tokenizer.emStrong(e, n, s)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.codespan(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.br(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.del(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (o = this.tokenizer.autolink(e)) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      if (!this.state.inLink && (o = this.tokenizer.url(e))) {
        e = e.substring(o.raw.length), t.push(o);
        continue;
      }
      let c = e;
      if (this.options.extensions?.startInline) {
        let d = 1 / 0;
        const u = e.slice(1);
        let f;
        this.options.extensions.startInline.forEach((h) => {
          f = h.call({ lexer: this }, u), typeof f == "number" && f >= 0 && (d = Math.min(d, f));
        }), d < 1 / 0 && d >= 0 && (c = e.substring(0, d + 1));
      }
      if (o = this.tokenizer.inlineText(c)) {
        e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (s = o.raw.slice(-1)), i = !0;
        const d = t.at(-1);
        d?.type === "text" ? (d.raw += o.raw, d.text += o.text) : t.push(o);
        continue;
      }
      if (e) {
        const d = "Infinite loop on byte: " + e.charCodeAt(0);
        if (this.options.silent) {
          console.error(d);
          break;
        } else
          throw new Error(d);
      }
    }
    return t;
  }
}, _Renderer = class {
  options;
  parser;
  // set by the parser
  constructor(r) {
    this.options = r || _defaults;
  }
  space(r) {
    return "";
  }
  code({ text: r, lang: e, escaped: t }) {
    const n = (e || "").match(other.notSpaceStart)?.[0], a = r.replace(other.endingNewline, "") + `
`;
    return n ? '<pre><code class="language-' + escape2(n) + '">' + (t ? a : escape2(a, !0)) + `</code></pre>
` : "<pre><code>" + (t ? a : escape2(a, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: r }) {
    return `<blockquote>
${this.parser.parse(r)}</blockquote>
`;
  }
  html({ text: r }) {
    return r;
  }
  heading({ tokens: r, depth: e }) {
    return `<h${e}>${this.parser.parseInline(r)}</h${e}>
`;
  }
  hr(r) {
    return `<hr>
`;
  }
  list(r) {
    const e = r.ordered, t = r.start;
    let n = "";
    for (let s = 0; s < r.items.length; s++) {
      const o = r.items[s];
      n += this.listitem(o);
    }
    const a = e ? "ol" : "ul", i = e && t !== 1 ? ' start="' + t + '"' : "";
    return "<" + a + i + `>
` + n + "</" + a + `>
`;
  }
  listitem(r) {
    let e = "";
    if (r.task) {
      const t = this.checkbox({ checked: !!r.checked });
      r.loose ? r.tokens[0]?.type === "paragraph" ? (r.tokens[0].text = t + " " + r.tokens[0].text, r.tokens[0].tokens && r.tokens[0].tokens.length > 0 && r.tokens[0].tokens[0].type === "text" && (r.tokens[0].tokens[0].text = t + " " + escape2(r.tokens[0].tokens[0].text), r.tokens[0].tokens[0].escaped = !0)) : r.tokens.unshift({
        type: "text",
        raw: t + " ",
        text: t + " ",
        escaped: !0
      }) : e += t + " ";
    }
    return e += this.parser.parse(r.tokens, !!r.loose), `<li>${e}</li>
`;
  }
  checkbox({ checked: r }) {
    return "<input " + (r ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: r }) {
    return `<p>${this.parser.parseInline(r)}</p>
`;
  }
  table(r) {
    let e = "", t = "";
    for (let a = 0; a < r.header.length; a++)
      t += this.tablecell(r.header[a]);
    e += this.tablerow({ text: t });
    let n = "";
    for (let a = 0; a < r.rows.length; a++) {
      const i = r.rows[a];
      t = "";
      for (let s = 0; s < i.length; s++)
        t += this.tablecell(i[s]);
      n += this.tablerow({ text: t });
    }
    return n && (n = `<tbody>${n}</tbody>`), `<table>
<thead>
` + e + `</thead>
` + n + `</table>
`;
  }
  tablerow({ text: r }) {
    return `<tr>
${r}</tr>
`;
  }
  tablecell(r) {
    const e = this.parser.parseInline(r.tokens), t = r.header ? "th" : "td";
    return (r.align ? `<${t} align="${r.align}">` : `<${t}>`) + e + `</${t}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens: r }) {
    return `<strong>${this.parser.parseInline(r)}</strong>`;
  }
  em({ tokens: r }) {
    return `<em>${this.parser.parseInline(r)}</em>`;
  }
  codespan({ text: r }) {
    return `<code>${escape2(r, !0)}</code>`;
  }
  br(r) {
    return "<br>";
  }
  del({ tokens: r }) {
    return `<del>${this.parser.parseInline(r)}</del>`;
  }
  link({ href: r, title: e, tokens: t }) {
    const n = this.parser.parseInline(t), a = cleanUrl(r);
    if (a === null)
      return n;
    r = a;
    let i = '<a href="' + r + '"';
    return e && (i += ' title="' + escape2(e) + '"'), i += ">" + n + "</a>", i;
  }
  image({ href: r, title: e, text: t, tokens: n }) {
    n && (t = this.parser.parseInline(n, this.parser.textRenderer));
    const a = cleanUrl(r);
    if (a === null)
      return escape2(t);
    r = a;
    let i = `<img src="${r}" alt="${t}"`;
    return e && (i += ` title="${escape2(e)}"`), i += ">", i;
  }
  text(r) {
    return "tokens" in r && r.tokens ? this.parser.parseInline(r.tokens) : "escaped" in r && r.escaped ? r.text : escape2(r.text);
  }
}, _TextRenderer = class {
  // no need for block level renderers
  strong({ text: r }) {
    return r;
  }
  em({ text: r }) {
    return r;
  }
  codespan({ text: r }) {
    return r;
  }
  del({ text: r }) {
    return r;
  }
  html({ text: r }) {
    return r;
  }
  text({ text: r }) {
    return r;
  }
  link({ text: r }) {
    return "" + r;
  }
  image({ text: r }) {
    return "" + r;
  }
  br() {
    return "";
  }
}, _Parser = class De {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || _defaults, this.options.renderer = this.options.renderer || new _Renderer(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new _TextRenderer();
  }
  /**
   * Static Parse Method
   */
  static parse(e, t) {
    return new De(t).parse(e);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(e, t) {
    return new De(t).parseInline(e);
  }
  /**
   * Parse Loop
   */
  parse(e, t = !0) {
    let n = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const o = i, c = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (c !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(o.type)) {
          n += c || "";
          continue;
        }
      }
      const s = i;
      switch (s.type) {
        case "space": {
          n += this.renderer.space(s);
          continue;
        }
        case "hr": {
          n += this.renderer.hr(s);
          continue;
        }
        case "heading": {
          n += this.renderer.heading(s);
          continue;
        }
        case "code": {
          n += this.renderer.code(s);
          continue;
        }
        case "table": {
          n += this.renderer.table(s);
          continue;
        }
        case "blockquote": {
          n += this.renderer.blockquote(s);
          continue;
        }
        case "list": {
          n += this.renderer.list(s);
          continue;
        }
        case "html": {
          n += this.renderer.html(s);
          continue;
        }
        case "paragraph": {
          n += this.renderer.paragraph(s);
          continue;
        }
        case "text": {
          let o = s, c = this.renderer.text(o);
          for (; a + 1 < e.length && e[a + 1].type === "text"; )
            o = e[++a], c += `
` + this.renderer.text(o);
          t ? n += this.renderer.paragraph({
            type: "paragraph",
            raw: c,
            text: c,
            tokens: [{ type: "text", raw: c, text: c, escaped: !0 }]
          }) : n += c;
          continue;
        }
        default: {
          const o = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(e, t = this.renderer) {
    let n = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (o !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += o || "";
          continue;
        }
      }
      const s = i;
      switch (s.type) {
        case "escape": {
          n += t.text(s);
          break;
        }
        case "html": {
          n += t.html(s);
          break;
        }
        case "link": {
          n += t.link(s);
          break;
        }
        case "image": {
          n += t.image(s);
          break;
        }
        case "strong": {
          n += t.strong(s);
          break;
        }
        case "em": {
          n += t.em(s);
          break;
        }
        case "codespan": {
          n += t.codespan(s);
          break;
        }
        case "br": {
          n += t.br(s);
          break;
        }
        case "del": {
          n += t.del(s);
          break;
        }
        case "text": {
          n += t.text(s);
          break;
        }
        default: {
          const o = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return n;
  }
}, _Hooks = class {
  options;
  block;
  constructor(r) {
    this.options = r || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(r) {
    return r;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(r) {
    return r;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(r) {
    return r;
  }
  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }
  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse : _Parser.parseInline;
  }
}, Marked = class {
  defaults = _getDefaults();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = _Parser;
  Renderer = _Renderer;
  TextRenderer = _TextRenderer;
  Lexer = _Lexer;
  Tokenizer = _Tokenizer;
  Hooks = _Hooks;
  constructor(...r) {
    this.use(...r);
  }
  /**
   * Run callback for every token
   */
  walkTokens(r, e) {
    let t = [];
    for (const n of r)
      switch (t = t.concat(e.call(this, n)), n.type) {
        case "table": {
          const a = n;
          for (const i of a.header)
            t = t.concat(this.walkTokens(i.tokens, e));
          for (const i of a.rows)
            for (const s of i)
              t = t.concat(this.walkTokens(s.tokens, e));
          break;
        }
        case "list": {
          const a = n;
          t = t.concat(this.walkTokens(a.items, e));
          break;
        }
        default: {
          const a = n;
          this.defaults.extensions?.childTokens?.[a.type] ? this.defaults.extensions.childTokens[a.type].forEach((i) => {
            const s = a[i].flat(1 / 0);
            t = t.concat(this.walkTokens(s, e));
          }) : a.tokens && (t = t.concat(this.walkTokens(a.tokens, e)));
        }
      }
    return t;
  }
  use(...r) {
    const e = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return r.forEach((t) => {
      const n = { ...t };
      if (n.async = this.defaults.async || n.async || !1, t.extensions && (t.extensions.forEach((a) => {
        if (!a.name)
          throw new Error("extension name required");
        if ("renderer" in a) {
          const i = e.renderers[a.name];
          i ? e.renderers[a.name] = function(...s) {
            let o = a.renderer.apply(this, s);
            return o === !1 && (o = i.apply(this, s)), o;
          } : e.renderers[a.name] = a.renderer;
        }
        if ("tokenizer" in a) {
          if (!a.level || a.level !== "block" && a.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          const i = e[a.level];
          i ? i.unshift(a.tokenizer) : e[a.level] = [a.tokenizer], a.start && (a.level === "block" ? e.startBlock ? e.startBlock.push(a.start) : e.startBlock = [a.start] : a.level === "inline" && (e.startInline ? e.startInline.push(a.start) : e.startInline = [a.start]));
        }
        "childTokens" in a && a.childTokens && (e.childTokens[a.name] = a.childTokens);
      }), n.extensions = e), t.renderer) {
        const a = this.defaults.renderer || new _Renderer(this.defaults);
        for (const i in t.renderer) {
          if (!(i in a))
            throw new Error(`renderer '${i}' does not exist`);
          if (["options", "parser"].includes(i))
            continue;
          const s = i, o = t.renderer[s], c = a[s];
          a[s] = (...d) => {
            let u = o.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u || "";
          };
        }
        n.renderer = a;
      }
      if (t.tokenizer) {
        const a = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const i in t.tokenizer) {
          if (!(i in a))
            throw new Error(`tokenizer '${i}' does not exist`);
          if (["options", "rules", "lexer"].includes(i))
            continue;
          const s = i, o = t.tokenizer[s], c = a[s];
          a[s] = (...d) => {
            let u = o.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u;
          };
        }
        n.tokenizer = a;
      }
      if (t.hooks) {
        const a = this.defaults.hooks || new _Hooks();
        for (const i in t.hooks) {
          if (!(i in a))
            throw new Error(`hook '${i}' does not exist`);
          if (["options", "block"].includes(i))
            continue;
          const s = i, o = t.hooks[s], c = a[s];
          _Hooks.passThroughHooks.has(i) ? a[s] = (d) => {
            if (this.defaults.async)
              return Promise.resolve(o.call(a, d)).then((f) => c.call(a, f));
            const u = o.call(a, d);
            return c.call(a, u);
          } : a[s] = (...d) => {
            let u = o.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u;
          };
        }
        n.hooks = a;
      }
      if (t.walkTokens) {
        const a = this.defaults.walkTokens, i = t.walkTokens;
        n.walkTokens = function(s) {
          let o = [];
          return o.push(i.call(this, s)), a && (o = o.concat(a.call(this, s))), o;
        };
      }
      this.defaults = { ...this.defaults, ...n };
    }), this;
  }
  setOptions(r) {
    return this.defaults = { ...this.defaults, ...r }, this;
  }
  lexer(r, e) {
    return _Lexer.lex(r, e ?? this.defaults);
  }
  parser(r, e) {
    return _Parser.parse(r, e ?? this.defaults);
  }
  parseMarkdown(r) {
    return (t, n) => {
      const a = { ...n }, i = { ...this.defaults, ...a }, s = this.onError(!!i.silent, !!i.async);
      if (this.defaults.async === !0 && a.async === !1)
        return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof t > "u" || t === null)
        return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof t != "string")
        return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
      i.hooks && (i.hooks.options = i, i.hooks.block = r);
      const o = i.hooks ? i.hooks.provideLexer() : r ? _Lexer.lex : _Lexer.lexInline, c = i.hooks ? i.hooks.provideParser() : r ? _Parser.parse : _Parser.parseInline;
      if (i.async)
        return Promise.resolve(i.hooks ? i.hooks.preprocess(t) : t).then((d) => o(d, i)).then((d) => i.hooks ? i.hooks.processAllTokens(d) : d).then((d) => i.walkTokens ? Promise.all(this.walkTokens(d, i.walkTokens)).then(() => d) : d).then((d) => c(d, i)).then((d) => i.hooks ? i.hooks.postprocess(d) : d).catch(s);
      try {
        i.hooks && (t = i.hooks.preprocess(t));
        let d = o(t, i);
        i.hooks && (d = i.hooks.processAllTokens(d)), i.walkTokens && this.walkTokens(d, i.walkTokens);
        let u = c(d, i);
        return i.hooks && (u = i.hooks.postprocess(u)), u;
      } catch (d) {
        return s(d);
      }
    };
  }
  onError(r, e) {
    return (t) => {
      if (t.message += `
Please report this to https://github.com/markedjs/marked.`, r) {
        const n = "<p>An error occurred:</p><pre>" + escape2(t.message + "", !0) + "</pre>";
        return e ? Promise.resolve(n) : n;
      }
      if (e)
        return Promise.reject(t);
      throw t;
    };
  }
}, markedInstance = new Marked();
function marked(r, e) {
  return markedInstance.parse(r, e);
}
marked.options = marked.setOptions = function(r) {
  return markedInstance.setOptions(r), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...r) {
  return markedInstance.use(...r), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.walkTokens = function(r, e) {
  return markedInstance.walkTokens(r, e);
};
marked.parseInline = markedInstance.parseInline;
marked.Parser = _Parser;
marked.parser = _Parser.parse;
marked.Renderer = _Renderer;
marked.TextRenderer = _TextRenderer;
marked.Lexer = _Lexer;
marked.lexer = _Lexer.lex;
marked.Tokenizer = _Tokenizer;
marked.Hooks = _Hooks;
marked.parse = marked;
marked.options;
marked.setOptions;
marked.use;
marked.walkTokens;
marked.parseInline;
_Parser.parse;
_Lexer.lex;
var prism = { exports: {} }, hasRequiredPrism;
function requirePrism() {
  return hasRequiredPrism || (hasRequiredPrism = 1, (function(r) {
    var e = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     *
     * @license MIT <https://opensource.org/licenses/MIT>
     * @author Lea Verou <https://lea.verou.me>
     * @namespace
     * @public
     */
    var t = (function(n) {
      var a = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, i = 0, s = {}, o = {
        /**
         * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
         * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
         * additional languages or plugins yourself.
         *
         * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
         *
         * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.manual = true;
         * // add a new <script> to load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        manual: n.Prism && n.Prism.manual,
        /**
         * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
         * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
         * own worker, you don't want it to do this.
         *
         * By setting this value to `true`, Prism will not add its own listeners to the worker.
         *
         * You obviously have to change this value before Prism executes. To do this, you can add an
         * empty Prism object into the global scope before loading the Prism script like this:
         *
         * ```js
         * window.Prism = window.Prism || {};
         * Prism.disableWorkerMessageHandler = true;
         * // Load Prism's script
         * ```
         *
         * @default false
         * @type {boolean}
         * @memberof Prism
         * @public
         */
        disableWorkerMessageHandler: n.Prism && n.Prism.disableWorkerMessageHandler,
        /**
         * A namespace for utility methods.
         *
         * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
         * change or disappear at any time.
         *
         * @namespace
         * @memberof Prism
         */
        util: {
          encode: function v(y) {
            return y instanceof c ? new c(y.type, v(y.content), y.alias) : Array.isArray(y) ? y.map(v) : y.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
          },
          /**
           * Returns the name of the type of the given value.
           *
           * @param {any} o
           * @returns {string}
           * @example
           * type(null)      === 'Null'
           * type(undefined) === 'Undefined'
           * type(123)       === 'Number'
           * type('foo')     === 'String'
           * type(true)      === 'Boolean'
           * type([1, 2])    === 'Array'
           * type({})        === 'Object'
           * type(String)    === 'Function'
           * type(/abc+/)    === 'RegExp'
           */
          type: function(v) {
            return Object.prototype.toString.call(v).slice(8, -1);
          },
          /**
           * Returns a unique number for the given object. Later calls will still return the same number.
           *
           * @param {Object} obj
           * @returns {number}
           */
          objId: function(v) {
            return v.__id || Object.defineProperty(v, "__id", { value: ++i }), v.__id;
          },
          /**
           * Creates a deep clone of the given object.
           *
           * The main intended use of this function is to clone language definitions.
           *
           * @param {T} o
           * @param {Record<number, any>} [visited]
           * @returns {T}
           * @template T
           */
          clone: function v(y, A) {
            A = A || {};
            var E, I;
            switch (o.util.type(y)) {
              case "Object":
                if (I = o.util.objId(y), A[I])
                  return A[I];
                E = /** @type {Record<string, any>} */
                {}, A[I] = E;
                for (var N in y)
                  y.hasOwnProperty(N) && (E[N] = v(y[N], A));
                return (
                  /** @type {any} */
                  E
                );
              case "Array":
                return I = o.util.objId(y), A[I] ? A[I] : (E = [], A[I] = E, /** @type {Array} */
                /** @type {any} */
                y.forEach(function($, M) {
                  E[M] = v($, A);
                }), /** @type {any} */
                E);
              default:
                return y;
            }
          },
          /**
           * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
           *
           * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
           *
           * @param {Element} element
           * @returns {string}
           */
          getLanguage: function(v) {
            for (; v; ) {
              var y = a.exec(v.className);
              if (y)
                return y[1].toLowerCase();
              v = v.parentElement;
            }
            return "none";
          },
          /**
           * Sets the Prism `language-xxxx` class of the given element.
           *
           * @param {Element} element
           * @param {string} language
           * @returns {void}
           */
          setLanguage: function(v, y) {
            v.className = v.className.replace(RegExp(a, "gi"), ""), v.classList.add("language-" + y);
          },
          /**
           * Returns the script element that is currently executing.
           *
           * This does __not__ work for line script element.
           *
           * @returns {HTMLScriptElement | null}
           */
          currentScript: function() {
            if (typeof document > "u")
              return null;
            if (document.currentScript && document.currentScript.tagName === "SCRIPT")
              return (
                /** @type {any} */
                document.currentScript
              );
            try {
              throw new Error();
            } catch (E) {
              var v = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(E.stack) || [])[1];
              if (v) {
                var y = document.getElementsByTagName("script");
                for (var A in y)
                  if (y[A].src == v)
                    return y[A];
              }
              return null;
            }
          },
          /**
           * Returns whether a given class is active for `element`.
           *
           * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
           * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
           * given class is just the given class with a `no-` prefix.
           *
           * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
           * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
           * ancestors have the given class or the negated version of it, then the default activation will be returned.
           *
           * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
           * version of it, the class is considered active.
           *
           * @param {Element} element
           * @param {string} className
           * @param {boolean} [defaultActivation=false]
           * @returns {boolean}
           */
          isActive: function(v, y, A) {
            for (var E = "no-" + y; v; ) {
              var I = v.classList;
              if (I.contains(y))
                return !0;
              if (I.contains(E))
                return !1;
              v = v.parentElement;
            }
            return !!A;
          }
        },
        /**
         * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
         *
         * @namespace
         * @memberof Prism
         * @public
         */
        languages: {
          /**
           * The grammar for plain, unformatted text.
           */
          plain: s,
          plaintext: s,
          text: s,
          txt: s,
          /**
           * Creates a deep copy of the language with the given id and appends the given tokens.
           *
           * If a token in `redef` also appears in the copied language, then the existing token in the copied language
           * will be overwritten at its original position.
           *
           * ## Best practices
           *
           * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
           * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
           * understand the language definition because, normally, the order of tokens matters in Prism grammars.
           *
           * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
           * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
           *
           * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
           * @param {Grammar} redef The new tokens to append.
           * @returns {Grammar} The new language created.
           * @public
           * @example
           * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
           *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
           *     // at its original position
           *     'comment': { ... },
           *     // CSS doesn't have a 'color' token, so this token will be appended
           *     'color': /\b(?:red|green|blue)\b/
           * });
           */
          extend: function(v, y) {
            var A = o.util.clone(o.languages[v]);
            for (var E in y)
              A[E] = y[E];
            return A;
          },
          /**
           * Inserts tokens _before_ another token in a language definition or any other grammar.
           *
           * ## Usage
           *
           * This helper method makes it easy to modify existing languages. For example, the CSS language definition
           * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
           * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
           * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
           * this:
           *
           * ```js
           * Prism.languages.markup.style = {
           *     // token
           * };
           * ```
           *
           * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
           * before existing tokens. For the CSS example above, you would use it like this:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'cdata', {
           *     'style': {
           *         // token
           *     }
           * });
           * ```
           *
           * ## Special cases
           *
           * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
           * will be ignored.
           *
           * This behavior can be used to insert tokens after `before`:
           *
           * ```js
           * Prism.languages.insertBefore('markup', 'comment', {
           *     'comment': Prism.languages.markup.comment,
           *     // tokens after 'comment'
           * });
           * ```
           *
           * ## Limitations
           *
           * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
           * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
           * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
           * deleting properties which is necessary to insert at arbitrary positions.
           *
           * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
           * Instead, it will create a new object and replace all references to the target object with the new one. This
           * can be done without temporarily deleting properties, so the iteration order is well-defined.
           *
           * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
           * you hold the target object in a variable, then the value of the variable will not change.
           *
           * ```js
           * var oldMarkup = Prism.languages.markup;
           * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
           *
           * assert(oldMarkup !== Prism.languages.markup);
           * assert(newMarkup === Prism.languages.markup);
           * ```
           *
           * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
           * object to be modified.
           * @param {string} before The key to insert before.
           * @param {Grammar} insert An object containing the key-value pairs to be inserted.
           * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
           * object to be modified.
           *
           * Defaults to `Prism.languages`.
           * @returns {Grammar} The new grammar object.
           * @public
           */
          insertBefore: function(v, y, A, E) {
            E = E || /** @type {any} */
            o.languages;
            var I = E[v], N = {};
            for (var $ in I)
              if (I.hasOwnProperty($)) {
                if ($ == y)
                  for (var M in A)
                    A.hasOwnProperty(M) && (N[M] = A[M]);
                A.hasOwnProperty($) || (N[$] = I[$]);
              }
            var B = E[v];
            return E[v] = N, o.languages.DFS(o.languages, function(H, K) {
              K === B && H != v && (this[H] = N);
            }), N;
          },
          // Traverse a language definition with Depth First Search
          DFS: function v(y, A, E, I) {
            I = I || {};
            var N = o.util.objId;
            for (var $ in y)
              if (y.hasOwnProperty($)) {
                A.call(y, $, y[$], E || $);
                var M = y[$], B = o.util.type(M);
                B === "Object" && !I[N(M)] ? (I[N(M)] = !0, v(M, A, null, I)) : B === "Array" && !I[N(M)] && (I[N(M)] = !0, v(M, A, $, I));
              }
          }
        },
        plugins: {},
        /**
         * This is the most high-level function in Prism’s API.
         * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
         * each one of them.
         *
         * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
         *
         * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
         * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
         * @memberof Prism
         * @public
         */
        highlightAll: function(v, y) {
          o.highlightAllUnder(document, v, y);
        },
        /**
         * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
         * {@link Prism.highlightElement} on each one of them.
         *
         * The following hooks will be run:
         * 1. `before-highlightall`
         * 2. `before-all-elements-highlight`
         * 3. All hooks of {@link Prism.highlightElement} for each element.
         *
         * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
         * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
         * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
         * @memberof Prism
         * @public
         */
        highlightAllUnder: function(v, y, A) {
          var E = {
            callback: A,
            container: v,
            selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          o.hooks.run("before-highlightall", E), E.elements = Array.prototype.slice.apply(E.container.querySelectorAll(E.selector)), o.hooks.run("before-all-elements-highlight", E);
          for (var I = 0, N; N = E.elements[I++]; )
            o.highlightElement(N, y === !0, E.callback);
        },
        /**
         * Highlights the code inside a single element.
         *
         * The following hooks will be run:
         * 1. `before-sanity-check`
         * 2. `before-highlight`
         * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
         * 4. `before-insert`
         * 5. `after-highlight`
         * 6. `complete`
         *
         * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
         * the element's language.
         *
         * @param {Element} element The element containing the code.
         * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
         * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
         * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
         * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
         *
         * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
         * asynchronous highlighting to work. You can build your own bundle on the
         * [Download page](https://prismjs.com/download.html).
         * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
         * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
         * @memberof Prism
         * @public
         */
        highlightElement: function(v, y, A) {
          var E = o.util.getLanguage(v), I = o.languages[E];
          o.util.setLanguage(v, E);
          var N = v.parentElement;
          N && N.nodeName.toLowerCase() === "pre" && o.util.setLanguage(N, E);
          var $ = v.textContent, M = {
            element: v,
            language: E,
            grammar: I,
            code: $
          };
          function B(K) {
            M.highlightedCode = K, o.hooks.run("before-insert", M), M.element.innerHTML = M.highlightedCode, o.hooks.run("after-highlight", M), o.hooks.run("complete", M), A && A.call(M.element);
          }
          if (o.hooks.run("before-sanity-check", M), N = M.element.parentElement, N && N.nodeName.toLowerCase() === "pre" && !N.hasAttribute("tabindex") && N.setAttribute("tabindex", "0"), !M.code) {
            o.hooks.run("complete", M), A && A.call(M.element);
            return;
          }
          if (o.hooks.run("before-highlight", M), !M.grammar) {
            B(o.util.encode(M.code));
            return;
          }
          if (y && n.Worker) {
            var H = new Worker(o.filename);
            H.onmessage = function(K) {
              B(K.data);
            }, H.postMessage(JSON.stringify({
              language: M.language,
              code: M.code,
              immediateClose: !0
            }));
          } else
            B(o.highlight(M.code, M.grammar, M.language));
        },
        /**
         * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
         * and the language definitions to use, and returns a string with the HTML produced.
         *
         * The following hooks will be run:
         * 1. `before-tokenize`
         * 2. `after-tokenize`
         * 3. `wrap`: On each {@link Token}.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @param {string} language The name of the language definition passed to `grammar`.
         * @returns {string} The highlighted HTML.
         * @memberof Prism
         * @public
         * @example
         * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
         */
        highlight: function(v, y, A) {
          var E = {
            code: v,
            grammar: y,
            language: A
          };
          if (o.hooks.run("before-tokenize", E), !E.grammar)
            throw new Error('The language "' + E.language + '" has no grammar.');
          return E.tokens = o.tokenize(E.code, E.grammar), o.hooks.run("after-tokenize", E), c.stringify(o.util.encode(E.tokens), E.language);
        },
        /**
         * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
         * and the language definitions to use, and returns an array with the tokenized code.
         *
         * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
         *
         * This method could be useful in other contexts as well, as a very crude parser.
         *
         * @param {string} text A string with the code to be highlighted.
         * @param {Grammar} grammar An object containing the tokens to use.
         *
         * Usually a language definition like `Prism.languages.markup`.
         * @returns {TokenStream} An array of strings and tokens, a token stream.
         * @memberof Prism
         * @public
         * @example
         * let code = `var foo = 0;`;
         * let tokens = Prism.tokenize(code, Prism.languages.javascript);
         * tokens.forEach(token => {
         *     if (token instanceof Prism.Token && token.type === 'number') {
         *         console.log(`Found numeric literal: ${token.content}`);
         *     }
         * });
         */
        tokenize: function(v, y) {
          var A = y.rest;
          if (A) {
            for (var E in A)
              y[E] = A[E];
            delete y.rest;
          }
          var I = new f();
          return h(I, I.head, v), u(v, I, y, I.head, 0), x(I);
        },
        /**
         * @namespace
         * @memberof Prism
         * @public
         */
        hooks: {
          all: {},
          /**
           * Adds the given callback to the list of callbacks for the given hook.
           *
           * The callback will be invoked when the hook it is registered for is run.
           * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
           *
           * One callback function can be registered to multiple hooks and the same hook multiple times.
           *
           * @param {string} name The name of the hook.
           * @param {HookCallback} callback The callback function which is given environment variables.
           * @public
           */
          add: function(v, y) {
            var A = o.hooks.all;
            A[v] = A[v] || [], A[v].push(y);
          },
          /**
           * Runs a hook invoking all registered callbacks with the given environment variables.
           *
           * Callbacks will be invoked synchronously and in the order in which they were registered.
           *
           * @param {string} name The name of the hook.
           * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
           * @public
           */
          run: function(v, y) {
            var A = o.hooks.all[v];
            if (!(!A || !A.length))
              for (var E = 0, I; I = A[E++]; )
                I(y);
          }
        },
        Token: c
      };
      n.Prism = o;
      function c(v, y, A, E) {
        this.type = v, this.content = y, this.alias = A, this.length = (E || "").length | 0;
      }
      c.stringify = function v(y, A) {
        if (typeof y == "string")
          return y;
        if (Array.isArray(y)) {
          var E = "";
          return y.forEach(function(B) {
            E += v(B, A);
          }), E;
        }
        var I = {
          type: y.type,
          content: v(y.content, A),
          tag: "span",
          classes: ["token", y.type],
          attributes: {},
          language: A
        }, N = y.alias;
        N && (Array.isArray(N) ? Array.prototype.push.apply(I.classes, N) : I.classes.push(N)), o.hooks.run("wrap", I);
        var $ = "";
        for (var M in I.attributes)
          $ += " " + M + '="' + (I.attributes[M] || "").replace(/"/g, "&quot;") + '"';
        return "<" + I.tag + ' class="' + I.classes.join(" ") + '"' + $ + ">" + I.content + "</" + I.tag + ">";
      };
      function d(v, y, A, E) {
        v.lastIndex = y;
        var I = v.exec(A);
        if (I && E && I[1]) {
          var N = I[1].length;
          I.index += N, I[0] = I[0].slice(N);
        }
        return I;
      }
      function u(v, y, A, E, I, N) {
        for (var $ in A)
          if (!(!A.hasOwnProperty($) || !A[$])) {
            var M = A[$];
            M = Array.isArray(M) ? M : [M];
            for (var B = 0; B < M.length; ++B) {
              if (N && N.cause == $ + "," + B)
                return;
              var H = M[B], K = H.inside, le = !!H.lookbehind, G = !!H.greedy, ie = H.alias;
              if (G && !H.pattern.global) {
                var me = H.pattern.toString().match(/[imsuy]*$/)[0];
                H.pattern = RegExp(H.pattern.source, me + "g");
              }
              for (var ce = H.pattern || H, L = E.next, Y = I; L !== y.tail && !(N && Y >= N.reach); Y += L.value.length, L = L.next) {
                var re = L.value;
                if (y.length > v.length)
                  return;
                if (!(re instanceof c)) {
                  var Q = 1, J;
                  if (G) {
                    if (J = d(ce, Y, v, le), !J || J.index >= v.length)
                      break;
                    var ne = J.index, ee = J.index + J[0].length, te = Y;
                    for (te += L.value.length; ne >= te; )
                      L = L.next, te += L.value.length;
                    if (te -= L.value.length, Y = te, L.value instanceof c)
                      continue;
                    for (var W = L; W !== y.tail && (te < ee || typeof W.value == "string"); W = W.next)
                      Q++, te += W.value.length;
                    Q--, re = v.slice(Y, te), J.index -= Y;
                  } else if (J = d(ce, 0, re, le), !J)
                    continue;
                  var ne = J.index, ae = J[0], de = re.slice(0, ne), he = re.slice(ne + ae.length), ue = Y + re.length;
                  N && ue > N.reach && (N.reach = ue);
                  var se = L.prev;
                  de && (se = h(y, se, de), Y += de.length), g(y, se, Q);
                  var pe = new c($, K ? o.tokenize(ae, K) : ae, ie, ae);
                  if (L = h(y, se, pe), he && h(y, L, he), Q > 1) {
                    var fe = {
                      cause: $ + "," + B,
                      reach: ue
                    };
                    u(v, y, A, L.prev, Y, fe), N && fe.reach > N.reach && (N.reach = fe.reach);
                  }
                }
              }
            }
          }
      }
      function f() {
        var v = { value: null, prev: null, next: null }, y = { value: null, prev: v, next: null };
        v.next = y, this.head = v, this.tail = y, this.length = 0;
      }
      function h(v, y, A) {
        var E = y.next, I = { value: A, prev: y, next: E };
        return y.next = I, E.prev = I, v.length++, I;
      }
      function g(v, y, A) {
        for (var E = y.next, I = 0; I < A && E !== v.tail; I++)
          E = E.next;
        y.next = E, E.prev = y, v.length -= I;
      }
      function x(v) {
        for (var y = [], A = v.head.next; A !== v.tail; )
          y.push(A.value), A = A.next;
        return y;
      }
      if (!n.document)
        return n.addEventListener && (o.disableWorkerMessageHandler || n.addEventListener("message", function(v) {
          var y = JSON.parse(v.data), A = y.language, E = y.code, I = y.immediateClose;
          n.postMessage(o.highlight(E, o.languages[A], A)), I && n.close();
        }, !1)), o;
      var _ = o.util.currentScript();
      _ && (o.filename = _.src, _.hasAttribute("data-manual") && (o.manual = !0));
      function P() {
        o.manual || o.highlightAll();
      }
      if (!o.manual) {
        var O = document.readyState;
        O === "loading" || O === "interactive" && _ && _.defer ? document.addEventListener("DOMContentLoaded", P) : window.requestAnimationFrame ? window.requestAnimationFrame(P) : window.setTimeout(P, 16);
      }
      return o;
    })(e);
    r.exports && (r.exports = t), typeof commonjsGlobal < "u" && (commonjsGlobal.Prism = t), t.languages.markup = {
      comment: {
        pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
        greedy: !0
      },
      prolog: {
        pattern: /<\?[\s\S]+?\?>/,
        greedy: !0
      },
      doctype: {
        // https://www.w3.org/TR/xml/#NT-doctypedecl
        pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
        greedy: !0,
        inside: {
          "internal-subset": {
            pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
            lookbehind: !0,
            greedy: !0,
            inside: null
            // see below
          },
          string: {
            pattern: /"[^"]*"|'[^']*'/,
            greedy: !0
          },
          punctuation: /^<!|>$|[[\]]/,
          "doctype-tag": /^DOCTYPE/i,
          name: /[^\s<>'"]+/
        }
      },
      cdata: {
        pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
        greedy: !0
      },
      tag: {
        pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
        greedy: !0,
        inside: {
          tag: {
            pattern: /^<\/?[^\s>\/]+/,
            inside: {
              punctuation: /^<\/?/,
              namespace: /^[^\s>\/:]+:/
            }
          },
          "special-attr": [],
          "attr-value": {
            pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
            inside: {
              punctuation: [
                {
                  pattern: /^=/,
                  alias: "attr-equals"
                },
                {
                  pattern: /^(\s*)["']|["']$/,
                  lookbehind: !0
                }
              ]
            }
          },
          punctuation: /\/?>/,
          "attr-name": {
            pattern: /[^\s>\/]+/,
            inside: {
              namespace: /^[^\s>\/:]+:/
            }
          }
        }
      },
      entity: [
        {
          pattern: /&[\da-z]{1,8};/i,
          alias: "named-entity"
        },
        /&#x?[\da-f]{1,8};/i
      ]
    }, t.languages.markup.tag.inside["attr-value"].inside.entity = t.languages.markup.entity, t.languages.markup.doctype.inside["internal-subset"].inside = t.languages.markup, t.hooks.add("wrap", function(n) {
      n.type === "entity" && (n.attributes.title = n.content.replace(/&amp;/, "&"));
    }), Object.defineProperty(t.languages.markup.tag, "addInlined", {
      /**
       * Adds an inlined language to markup.
       *
       * An example of an inlined language is CSS with `<style>` tags.
       *
       * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
       * case insensitive.
       * @param {string} lang The language key.
       * @example
       * addInlined('style', 'css');
       */
      value: function(a, i) {
        var s = {};
        s["language-" + i] = {
          pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
          lookbehind: !0,
          inside: t.languages[i]
        }, s.cdata = /^<!\[CDATA\[|\]\]>$/i;
        var o = {
          "included-cdata": {
            pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
            inside: s
          }
        };
        o["language-" + i] = {
          pattern: /[\s\S]+/,
          inside: t.languages[i]
        };
        var c = {};
        c[a] = {
          pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
            return a;
          }), "i"),
          lookbehind: !0,
          greedy: !0,
          inside: o
        }, t.languages.insertBefore("markup", "cdata", c);
      }
    }), Object.defineProperty(t.languages.markup.tag, "addAttribute", {
      /**
       * Adds an pattern to highlight languages embedded in HTML attributes.
       *
       * An example of an inlined language is CSS with `style` attributes.
       *
       * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
       * case insensitive.
       * @param {string} lang The language key.
       * @example
       * addAttribute('style', 'css');
       */
      value: function(n, a) {
        t.languages.markup.tag.inside["special-attr"].push({
          pattern: RegExp(
            /(^|["'\s])/.source + "(?:" + n + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
            "i"
          ),
          lookbehind: !0,
          inside: {
            "attr-name": /^[^\s=]+/,
            "attr-value": {
              pattern: /=[\s\S]+/,
              inside: {
                value: {
                  pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
                  lookbehind: !0,
                  alias: [a, "language-" + a],
                  inside: t.languages[a]
                },
                punctuation: [
                  {
                    pattern: /^=/,
                    alias: "attr-equals"
                  },
                  /"|'/
                ]
              }
            }
          }
        });
      }
    }), t.languages.html = t.languages.markup, t.languages.mathml = t.languages.markup, t.languages.svg = t.languages.markup, t.languages.xml = t.languages.extend("markup", {}), t.languages.ssml = t.languages.xml, t.languages.atom = t.languages.xml, t.languages.rss = t.languages.xml, (function(n) {
      var a = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
      n.languages.css = {
        comment: /\/\*[\s\S]*?\*\//,
        atrule: {
          pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + a.source + ")*?" + /(?:;|(?=\s*\{))/.source),
          inside: {
            rule: /^@[\w-]+/,
            "selector-function-argument": {
              pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
              lookbehind: !0,
              alias: "selector"
            },
            keyword: {
              pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
              lookbehind: !0
            }
            // See rest below
          }
        },
        url: {
          // https://drafts.csswg.org/css-values-3/#urls
          pattern: RegExp("\\burl\\((?:" + a.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
          greedy: !0,
          inside: {
            function: /^url/i,
            punctuation: /^\(|\)$/,
            string: {
              pattern: RegExp("^" + a.source + "$"),
              alias: "url"
            }
          }
        },
        selector: {
          pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + a.source + ")*(?=\\s*\\{)"),
          lookbehind: !0
        },
        string: {
          pattern: a,
          greedy: !0
        },
        property: {
          pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
          lookbehind: !0
        },
        important: /!important\b/i,
        function: {
          pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
          lookbehind: !0
        },
        punctuation: /[(){};:,]/
      }, n.languages.css.atrule.inside.rest = n.languages.css;
      var i = n.languages.markup;
      i && (i.tag.addInlined("style", "css"), i.tag.addAttribute("style", "css"));
    })(t), t.languages.clike = {
      comment: [
        {
          pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
          lookbehind: !0,
          greedy: !0
        },
        {
          pattern: /(^|[^\\:])\/\/.*/,
          lookbehind: !0,
          greedy: !0
        }
      ],
      string: {
        pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
        greedy: !0
      },
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
        lookbehind: !0,
        inside: {
          punctuation: /[.\\]/
        }
      },
      keyword: /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
      boolean: /\b(?:false|true)\b/,
      function: /\b\w+(?=\()/,
      number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
      operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
      punctuation: /[{}[\];(),.:]/
    }, t.languages.javascript = t.languages.extend("clike", {
      "class-name": [
        t.languages.clike["class-name"],
        {
          pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
          lookbehind: !0
        }
      ],
      keyword: [
        {
          pattern: /((?:^|\})\s*)catch\b/,
          lookbehind: !0
        },
        {
          pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
          lookbehind: !0
        }
      ],
      // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
      function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
      number: {
        pattern: RegExp(
          /(^|[^\w$])/.source + "(?:" + // constant
          (/NaN|Infinity/.source + "|" + // binary integer
          /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
          /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
          /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
          /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
          /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
        ),
        lookbehind: !0
      },
      operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
    }), t.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, t.languages.insertBefore("javascript", "keyword", {
      regex: {
        pattern: RegExp(
          // lookbehind
          // eslint-disable-next-line regexp/no-dupe-characters-character-class
          /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
          // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
          // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
          // with the only syntax, so we have to define 2 different regex patterns.
          /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
          /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
          /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
        ),
        lookbehind: !0,
        greedy: !0,
        inside: {
          "regex-source": {
            pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
            lookbehind: !0,
            alias: "language-regex",
            inside: t.languages.regex
          },
          "regex-delimiter": /^\/|\/$/,
          "regex-flags": /^[a-z]+$/
        }
      },
      // This must be declared before keyword because we use "function" inside the look-forward
      "function-variable": {
        pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
        alias: "function"
      },
      parameter: [
        {
          pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
          lookbehind: !0,
          inside: t.languages.javascript
        },
        {
          pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
          lookbehind: !0,
          inside: t.languages.javascript
        },
        {
          pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
          lookbehind: !0,
          inside: t.languages.javascript
        },
        {
          pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
          lookbehind: !0,
          inside: t.languages.javascript
        }
      ],
      constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    }), t.languages.insertBefore("javascript", "string", {
      hashbang: {
        pattern: /^#!.*/,
        greedy: !0,
        alias: "comment"
      },
      "template-string": {
        pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
        greedy: !0,
        inside: {
          "template-punctuation": {
            pattern: /^`|`$/,
            alias: "string"
          },
          interpolation: {
            pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
            lookbehind: !0,
            inside: {
              "interpolation-punctuation": {
                pattern: /^\$\{|\}$/,
                alias: "punctuation"
              },
              rest: t.languages.javascript
            }
          },
          string: /[\s\S]+/
        }
      },
      "string-property": {
        pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
        lookbehind: !0,
        greedy: !0,
        alias: "property"
      }
    }), t.languages.insertBefore("javascript", "operator", {
      "literal-property": {
        pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
        lookbehind: !0,
        alias: "property"
      }
    }), t.languages.markup && (t.languages.markup.tag.addInlined("script", "javascript"), t.languages.markup.tag.addAttribute(
      /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
      "javascript"
    )), t.languages.js = t.languages.javascript, (function() {
      if (typeof t > "u" || typeof document > "u")
        return;
      Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
      var n = "Loading…", a = function(_, P) {
        return "✖ Error " + _ + " while fetching file: " + P;
      }, i = "✖ Error: File does not exist or is empty", s = {
        js: "javascript",
        py: "python",
        rb: "ruby",
        ps1: "powershell",
        psm1: "powershell",
        sh: "bash",
        bat: "batch",
        h: "c",
        tex: "latex"
      }, o = "data-src-status", c = "loading", d = "loaded", u = "failed", f = "pre[data-src]:not([" + o + '="' + d + '"]):not([' + o + '="' + c + '"])';
      function h(_, P, O) {
        var v = new XMLHttpRequest();
        v.open("GET", _, !0), v.onreadystatechange = function() {
          v.readyState == 4 && (v.status < 400 && v.responseText ? P(v.responseText) : v.status >= 400 ? O(a(v.status, v.statusText)) : O(i));
        }, v.send(null);
      }
      function g(_) {
        var P = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(_ || "");
        if (P) {
          var O = Number(P[1]), v = P[2], y = P[3];
          return v ? y ? [O, Number(y)] : [O, void 0] : [O, O];
        }
      }
      t.hooks.add("before-highlightall", function(_) {
        _.selector += ", " + f;
      }), t.hooks.add("before-sanity-check", function(_) {
        var P = (
          /** @type {HTMLPreElement} */
          _.element
        );
        if (P.matches(f)) {
          _.code = "", P.setAttribute(o, c);
          var O = P.appendChild(document.createElement("CODE"));
          O.textContent = n;
          var v = P.getAttribute("data-src"), y = _.language;
          if (y === "none") {
            var A = (/\.(\w+)$/.exec(v) || [, "none"])[1];
            y = s[A] || A;
          }
          t.util.setLanguage(O, y), t.util.setLanguage(P, y);
          var E = t.plugins.autoloader;
          E && E.loadLanguages(y), h(
            v,
            function(I) {
              P.setAttribute(o, d);
              var N = g(P.getAttribute("data-range"));
              if (N) {
                var $ = I.split(/\r\n?|\n/g), M = N[0], B = N[1] == null ? $.length : N[1];
                M < 0 && (M += $.length), M = Math.max(0, Math.min(M - 1, $.length)), B < 0 && (B += $.length), B = Math.max(0, Math.min(B, $.length)), I = $.slice(M, B).join(`
`), P.hasAttribute("data-start") || P.setAttribute("data-start", String(M + 1));
              }
              O.textContent = I, t.highlightElement(O);
            },
            function(I) {
              P.setAttribute(o, u), O.textContent = I;
            }
          );
        }
      }), t.plugins.fileHighlight = {
        /**
         * Executes the File Highlight plugin for all matching `pre` elements under the given container.
         *
         * Note: Elements which are already loaded or currently loading will not be touched by this method.
         *
         * @param {ParentNode} [container=document]
         */
        highlight: function(P) {
          for (var O = (P || document).querySelectorAll(f), v = 0, y; y = O[v++]; )
            t.highlightElement(y);
        }
      };
      var x = !1;
      t.fileHighlight = function() {
        x || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), x = !0), t.plugins.fileHighlight.highlight.apply(this, arguments);
      };
    })();
  })(prism)), prism.exports;
}
var prismExports = requirePrism();
const Prism$1 = /* @__PURE__ */ getDefaultExportFromCjs(prismExports);
(function(r) {
  var e = "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b", t = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: !0,
    alias: "punctuation",
    // this looks reasonably well in all themes
    inside: null
    // see below
  }, n = {
    bash: t,
    environment: {
      pattern: RegExp("\\$" + e),
      alias: "constant"
    },
    variable: [
      // [0]: Arithmetic Environment
      {
        pattern: /\$?\(\([\s\S]+?\)\)/,
        greedy: !0,
        inside: {
          // If there is a $ sign at the beginning highlight $(( and )) as variable
          variable: [
            {
              pattern: /(^\$\(\([\s\S]+)\)\)/,
              lookbehind: !0
            },
            /^\$\(\(/
          ],
          number: /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
          // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
          operator: /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
          // If there is no $ sign at the beginning highlight (( and )) as punctuation
          punctuation: /\(\(?|\)\)?|,|;/
        }
      },
      // [1]: Command Substitution
      {
        pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
        greedy: !0,
        inside: {
          variable: /^\$\(|^`|\)$|`$/
        }
      },
      // [2]: Brace expansion
      {
        pattern: /\$\{[^}]+\}/,
        greedy: !0,
        inside: {
          operator: /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
          punctuation: /[\[\]]/,
          environment: {
            pattern: RegExp("(\\{)" + e),
            lookbehind: !0,
            alias: "constant"
          }
        }
      },
      /\$(?:\w+|[#?*!@$])/
    ],
    // Escape sequences from echo and printf's manuals, and escaped quotes.
    entity: /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/
  };
  r.languages.bash = {
    shebang: {
      pattern: /^#!\s*\/.*/,
      alias: "important"
    },
    comment: {
      pattern: /(^|[^"{\\$])#.*/,
      lookbehind: !0
    },
    "function-name": [
      // a) function foo {
      // b) foo() {
      // c) function foo() {
      // but not “foo {”
      {
        // a) and c)
        pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
        lookbehind: !0,
        alias: "function"
      },
      {
        // b)
        pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
        alias: "function"
      }
    ],
    // Highlight variable names as variables in for and select beginnings.
    "for-or-select": {
      pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
      alias: "variable",
      lookbehind: !0
    },
    // Highlight variable names as variables in the left-hand part
    // of assignments (“=” and “+=”).
    "assign-left": {
      pattern: /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
      inside: {
        environment: {
          pattern: RegExp("(^|[\\s;|&]|[<>]\\()" + e),
          lookbehind: !0,
          alias: "constant"
        }
      },
      alias: "variable",
      lookbehind: !0
    },
    // Highlight parameter names as variables
    parameter: {
      pattern: /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
      alias: "variable",
      lookbehind: !0
    },
    string: [
      // Support for Here-documents https://en.wikipedia.org/wiki/Here_document
      {
        pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
        lookbehind: !0,
        greedy: !0,
        inside: n
      },
      // Here-document with quotes around the tag
      // → No expansion (so no “inside”).
      {
        pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
        lookbehind: !0,
        greedy: !0,
        inside: {
          bash: t
        }
      },
      // “Normal” string
      {
        // https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
        pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
        lookbehind: !0,
        greedy: !0,
        inside: n
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
        pattern: /(^|[^$\\])'[^']*'/,
        lookbehind: !0,
        greedy: !0
      },
      {
        // https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
        pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
        greedy: !0,
        inside: {
          entity: n.entity
        }
      }
    ],
    environment: {
      pattern: RegExp("\\$?" + e),
      alias: "constant"
    },
    variable: n.variable,
    function: {
      pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
      lookbehind: !0
    },
    keyword: {
      pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
      lookbehind: !0
    },
    // https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    builtin: {
      pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
      lookbehind: !0,
      // Alias added to make those easier to distinguish from strings.
      alias: "class-name"
    },
    boolean: {
      pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
      lookbehind: !0
    },
    "file-descriptor": {
      pattern: /\B&\d\b/,
      alias: "important"
    },
    operator: {
      // Lots of redirections here, but not just that.
      pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
      inside: {
        "file-descriptor": {
          pattern: /^\d/,
          alias: "important"
        }
      }
    },
    punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
    number: {
      pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
      lookbehind: !0
    }
  }, t.inside = r.languages.bash;
  for (var a = [
    "comment",
    "function-name",
    "for-or-select",
    "assign-left",
    "parameter",
    "string",
    "environment",
    "function",
    "keyword",
    "builtin",
    "boolean",
    "file-descriptor",
    "operator",
    "punctuation",
    "number"
  ], i = n.variable[1].inside, s = 0; s < a.length; s++)
    i[a[s]] = r.languages.bash[a[s]];
  r.languages.sh = r.languages.bash, r.languages.shell = r.languages.bash;
})(Prism);
Prism.languages.javascript = Prism.languages.extend("clike", {
  "class-name": [
    Prism.languages.clike["class-name"],
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
      lookbehind: !0
    }
  ],
  keyword: [
    {
      pattern: /((?:^|\})\s*)catch\b/,
      lookbehind: !0
    },
    {
      pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
      lookbehind: !0
    }
  ],
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  function: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
  number: {
    pattern: RegExp(
      /(^|[^\w$])/.source + "(?:" + // constant
      (/NaN|Infinity/.source + "|" + // binary integer
      /0[bB][01]+(?:_[01]+)*n?/.source + "|" + // octal integer
      /0[oO][0-7]+(?:_[0-7]+)*n?/.source + "|" + // hexadecimal integer
      /0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source + "|" + // decimal bigint
      /\d+(?:_\d+)*n/.source + "|" + // decimal number (integer or float) but no bigint
      /(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source) + ")" + /(?![\w$])/.source
    ),
    lookbehind: !0
  },
  operator: /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});
Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;
Prism.languages.insertBefore("javascript", "keyword", {
  regex: {
    pattern: RegExp(
      // lookbehind
      // eslint-disable-next-line regexp/no-dupe-characters-character-class
      /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source + // Regex pattern:
      // There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
      // classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
      // with the only syntax, so we have to define 2 different regex patterns.
      /\//.source + "(?:" + /(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source + "|" + // `v` flag syntax. This supports 3 levels of nested character classes.
      /(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source + ")" + // lookahead
      /(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
    ),
    lookbehind: !0,
    greedy: !0,
    inside: {
      "regex-source": {
        pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
        lookbehind: !0,
        alias: "language-regex",
        inside: Prism.languages.regex
      },
      "regex-delimiter": /^\/|\/$/,
      "regex-flags": /^[a-z]+$/
    }
  },
  // This must be declared before keyword because we use "function" inside the look-forward
  "function-variable": {
    pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
    alias: "function"
  },
  parameter: [
    {
      pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
      lookbehind: !0,
      inside: Prism.languages.javascript
    },
    {
      pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
      lookbehind: !0,
      inside: Prism.languages.javascript
    },
    {
      pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
      lookbehind: !0,
      inside: Prism.languages.javascript
    },
    {
      pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
      lookbehind: !0,
      inside: Prism.languages.javascript
    }
  ],
  constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});
Prism.languages.insertBefore("javascript", "string", {
  hashbang: {
    pattern: /^#!.*/,
    greedy: !0,
    alias: "comment"
  },
  "template-string": {
    pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
    greedy: !0,
    inside: {
      "template-punctuation": {
        pattern: /^`|`$/,
        alias: "string"
      },
      interpolation: {
        pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
        lookbehind: !0,
        inside: {
          "interpolation-punctuation": {
            pattern: /^\$\{|\}$/,
            alias: "punctuation"
          },
          rest: Prism.languages.javascript
        }
      },
      string: /[\s\S]+/
    }
  },
  "string-property": {
    pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
    lookbehind: !0,
    greedy: !0,
    alias: "property"
  }
});
Prism.languages.insertBefore("javascript", "operator", {
  "literal-property": {
    pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
    lookbehind: !0,
    alias: "property"
  }
});
Prism.languages.markup && (Prism.languages.markup.tag.addInlined("script", "javascript"), Prism.languages.markup.tag.addAttribute(
  /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
  "javascript"
));
Prism.languages.js = Prism.languages.javascript;
var prismTypescript = {}, hasRequiredPrismTypescript;
function requirePrismTypescript() {
  return hasRequiredPrismTypescript || (hasRequiredPrismTypescript = 1, (function(r) {
    r.languages.typescript = r.languages.extend("javascript", {
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
        lookbehind: !0,
        greedy: !0,
        inside: null
        // see below
      },
      builtin: /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/
    }), r.languages.typescript.keyword.push(
      /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
      // keywords that have to be followed by an identifier
      /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
      // This is for `import type *, {}`
      /\btype\b(?=\s*(?:[\{*]|$))/
    ), delete r.languages.typescript.parameter, delete r.languages.typescript["literal-property"];
    var e = r.languages.extend("typescript", {});
    delete e["class-name"], r.languages.typescript["class-name"].inside = e, r.languages.insertBefore("typescript", "function", {
      decorator: {
        pattern: /@[$\w\xA0-\uFFFF]+/,
        inside: {
          at: {
            pattern: /^@/,
            alias: "operator"
          },
          function: /^[\s\S]+/
        }
      },
      "generic-function": {
        // e.g. foo<T extends "bar" | "baz">( ...
        pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
        greedy: !0,
        inside: {
          function: /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
          generic: {
            pattern: /<[\s\S]+/,
            // everything after the first <
            alias: "class-name",
            inside: e
          }
        }
      }
    }), r.languages.ts = r.languages.typescript;
  })(Prism)), prismTypescript;
}
requirePrismTypescript();
Prism.languages.json = {
  property: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  string: {
    pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    lookbehind: !0,
    greedy: !0
  },
  comment: {
    pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
    greedy: !0
  },
  number: /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:false|true)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: "keyword"
  }
};
Prism.languages.webmanifest = Prism.languages.json;
(function(r) {
  var e = /[*&][^\s[\]{},]+/, t = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/, n = "(?:" + t.source + "(?:[ 	]+" + e.source + ")?|" + e.source + "(?:[ 	]+" + t.source + ")?)", a = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(/<PLAIN>/g, function() {
    return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
  }), i = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
  function s(o, c) {
    c = (c || "").replace(/m/g, "") + "m";
    var d = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g, function() {
      return n;
    }).replace(/<<value>>/g, function() {
      return o;
    });
    return RegExp(d, c);
  }
  r.languages.yaml = {
    scalar: {
      pattern: RegExp(/([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(/<<prop>>/g, function() {
        return n;
      })),
      lookbehind: !0,
      alias: "string"
    },
    comment: /#.*/,
    key: {
      pattern: RegExp(/((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source.replace(/<<prop>>/g, function() {
        return n;
      }).replace(/<<key>>/g, function() {
        return "(?:" + a + "|" + i + ")";
      })),
      lookbehind: !0,
      greedy: !0,
      alias: "atrule"
    },
    directive: {
      pattern: /(^[ \t]*)%.+/m,
      lookbehind: !0,
      alias: "important"
    },
    datetime: {
      pattern: s(/\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/.source),
      lookbehind: !0,
      alias: "number"
    },
    boolean: {
      pattern: s(/false|true/.source, "i"),
      lookbehind: !0,
      alias: "important"
    },
    null: {
      pattern: s(/null|~/.source, "i"),
      lookbehind: !0,
      alias: "important"
    },
    string: {
      pattern: s(i),
      lookbehind: !0,
      greedy: !0
    },
    number: {
      pattern: s(/[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source, "i"),
      lookbehind: !0
    },
    tag: t,
    important: e,
    punctuation: /---|[:[\]{}\-,|>?]|\.\.\./
  }, r.languages.yml = r.languages.yaml;
})(Prism);
(function(r) {
  var e = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;
  function t(u) {
    return u = u.replace(/<inner>/g, function() {
      return e;
    }), RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + "(?:" + u + ")");
  }
  var n = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source, a = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function() {
    return n;
  }), i = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;
  r.languages.markdown = r.languages.extend("markup", {}), r.languages.insertBefore("markdown", "prolog", {
    "front-matter-block": {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: !0,
      greedy: !0,
      inside: {
        punctuation: /^---|---$/,
        "front-matter": {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ["yaml", "language-yaml"],
          inside: r.languages.yaml
        }
      }
    },
    blockquote: {
      // > ...
      pattern: /^>(?:[\t ]*>)*/m,
      alias: "punctuation"
    },
    table: {
      pattern: RegExp("^" + a + i + "(?:" + a + ")*", "m"),
      inside: {
        "table-data-rows": {
          pattern: RegExp("^(" + a + i + ")(?:" + a + ")*$"),
          lookbehind: !0,
          inside: {
            "table-data": {
              pattern: RegExp(n),
              inside: r.languages.markdown
            },
            punctuation: /\|/
          }
        },
        "table-line": {
          pattern: RegExp("^(" + a + ")" + i + "$"),
          lookbehind: !0,
          inside: {
            punctuation: /\||:?-{3,}:?/
          }
        },
        "table-header-row": {
          pattern: RegExp("^" + a + "$"),
          inside: {
            "table-header": {
              pattern: RegExp(n),
              alias: "important",
              inside: r.languages.markdown
            },
            punctuation: /\|/
          }
        }
      }
    },
    code: [
      {
        // Prefixed by 4 spaces or 1 tab and preceded by an empty line
        pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
        lookbehind: !0,
        alias: "keyword"
      },
      {
        // ```optional language
        // code block
        // ```
        pattern: /^```[\s\S]*?^```$/m,
        greedy: !0,
        inside: {
          "code-block": {
            pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
            lookbehind: !0
          },
          "code-language": {
            pattern: /^(```).+/,
            lookbehind: !0
          },
          punctuation: /```/
        }
      }
    ],
    title: [
      {
        // title 1
        // =======
        // title 2
        // -------
        pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
        alias: "important",
        inside: {
          punctuation: /==+$|--+$/
        }
      },
      {
        // # title 1
        // ###### title 6
        pattern: /(^\s*)#.+/m,
        lookbehind: !0,
        alias: "important",
        inside: {
          punctuation: /^#+|#+$/
        }
      }
    ],
    hr: {
      // ***
      // ---
      // * * *
      // -----------
      pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
      lookbehind: !0,
      alias: "punctuation"
    },
    list: {
      // * item
      // + item
      // - item
      // 1. item
      pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
      lookbehind: !0,
      alias: "punctuation"
    },
    "url-reference": {
      // [id]: http://example.com "Optional title"
      // [id]: http://example.com 'Optional title'
      // [id]: http://example.com (Optional title)
      // [id]: <http://example.com> "Optional title"
      pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
      inside: {
        variable: {
          pattern: /^(!?\[)[^\]]+/,
          lookbehind: !0
        },
        string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
        punctuation: /^[\[\]!:]|[<>]/
      },
      alias: "url"
    },
    bold: {
      // **strong**
      // __strong__
      // allow one nested instance of italic text using the same delimiter
      pattern: t(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),
      lookbehind: !0,
      greedy: !0,
      inside: {
        content: {
          pattern: /(^..)[\s\S]+(?=..$)/,
          lookbehind: !0,
          inside: {}
          // see below
        },
        punctuation: /\*\*|__/
      }
    },
    italic: {
      // *em*
      // _em_
      // allow one nested instance of bold text using the same delimiter
      pattern: t(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),
      lookbehind: !0,
      greedy: !0,
      inside: {
        content: {
          pattern: /(^.)[\s\S]+(?=.$)/,
          lookbehind: !0,
          inside: {}
          // see below
        },
        punctuation: /[*_]/
      }
    },
    strike: {
      // ~~strike through~~
      // ~strike~
      // eslint-disable-next-line regexp/strict
      pattern: t(/(~~?)(?:(?!~)<inner>)+\2/.source),
      lookbehind: !0,
      greedy: !0,
      inside: {
        content: {
          pattern: /(^~~?)[\s\S]+(?=\1$)/,
          lookbehind: !0,
          inside: {}
          // see below
        },
        punctuation: /~~?/
      }
    },
    "code-snippet": {
      // `code`
      // ``code``
      pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
      lookbehind: !0,
      greedy: !0,
      alias: ["code", "keyword"]
    },
    url: {
      // [example](http://example.com "Optional title")
      // [example][id]
      // [example] [id]
      pattern: t(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),
      lookbehind: !0,
      greedy: !0,
      inside: {
        operator: /^!/,
        content: {
          pattern: /(^\[)[^\]]+(?=\])/,
          lookbehind: !0,
          inside: {}
          // see below
        },
        variable: {
          pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
          lookbehind: !0
        },
        url: {
          pattern: /(^\]\()[^\s)]+/,
          lookbehind: !0
        },
        string: {
          pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
          lookbehind: !0
        }
      }
    }
  }), ["url", "bold", "italic", "strike"].forEach(function(u) {
    ["url", "bold", "italic", "strike", "code-snippet"].forEach(function(f) {
      u !== f && (r.languages.markdown[u].inside.content.inside[f] = r.languages.markdown[f]);
    });
  }), r.hooks.add("after-tokenize", function(u) {
    if (u.language !== "markdown" && u.language !== "md")
      return;
    function f(h) {
      if (!(!h || typeof h == "string"))
        for (var g = 0, x = h.length; g < x; g++) {
          var _ = h[g];
          if (_.type !== "code") {
            f(_.content);
            continue;
          }
          var P = _.content[1], O = _.content[3];
          if (P && O && P.type === "code-language" && O.type === "code-block" && typeof P.content == "string") {
            var v = P.content.replace(/\b#/g, "sharp").replace(/\b\+\+/g, "pp");
            v = (/[a-z][\w-]*/i.exec(v) || [""])[0].toLowerCase();
            var y = "language-" + v;
            O.alias ? typeof O.alias == "string" ? O.alias = [O.alias, y] : O.alias.push(y) : O.alias = [y];
          }
        }
    }
    f(u.tokens);
  }), r.hooks.add("wrap", function(u) {
    if (u.type === "code-block") {
      for (var f = "", h = 0, g = u.classes.length; h < g; h++) {
        var x = u.classes[h], _ = /language-(.+)/.exec(x);
        if (_) {
          f = _[1];
          break;
        }
      }
      var P = r.languages[f];
      if (P)
        u.content = r.highlight(d(u.content), P, f);
      else if (f && f !== "none" && r.plugins.autoloader) {
        var O = "md-" + (/* @__PURE__ */ new Date()).valueOf() + "-" + Math.floor(Math.random() * 1e16);
        u.attributes.id = O, r.plugins.autoloader.loadLanguages(f, function() {
          var v = document.getElementById(O);
          v && (v.innerHTML = r.highlight(v.textContent, r.languages[f], f));
        });
      }
    }
  });
  var s = RegExp(r.languages.markup.tag.pattern.source, "gi"), o = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"'
  }, c = String.fromCodePoint || String.fromCharCode;
  function d(u) {
    var f = u.replace(s, "");
    return f = f.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function(h, g) {
      if (g = g.toLowerCase(), g[0] === "#") {
        var x;
        return g[1] === "x" ? x = parseInt(g.slice(2), 16) : x = Number(g.slice(1)), c(x);
      } else {
        var _ = o[g];
        return _ || h;
      }
    }), f;
  }
  r.languages.md = r.languages.markdown;
})(Prism);
(function(r) {
  var e = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
  r.languages.css = {
    comment: /\/\*[\s\S]*?\*\//,
    atrule: {
      pattern: RegExp("@[\\w-](?:" + /[^;{\s"']|\s+(?!\s)/.source + "|" + e.source + ")*?" + /(?:;|(?=\s*\{))/.source),
      inside: {
        rule: /^@[\w-]+/,
        "selector-function-argument": {
          pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
          lookbehind: !0,
          alias: "selector"
        },
        keyword: {
          pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
          lookbehind: !0
        }
        // See rest below
      }
    },
    url: {
      // https://drafts.csswg.org/css-values-3/#urls
      pattern: RegExp("\\burl\\((?:" + e.source + "|" + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ")\\)", "i"),
      greedy: !0,
      inside: {
        function: /^url/i,
        punctuation: /^\(|\)$/,
        string: {
          pattern: RegExp("^" + e.source + "$"),
          alias: "url"
        }
      }
    },
    selector: {
      pattern: RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|` + e.source + ")*(?=\\s*\\{)"),
      lookbehind: !0
    },
    string: {
      pattern: e,
      greedy: !0
    },
    property: {
      pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
      lookbehind: !0
    },
    important: /!important\b/i,
    function: {
      pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
      lookbehind: !0
    },
    punctuation: /[(){};:,]/
  }, r.languages.css.atrule.inside.rest = r.languages.css;
  var t = r.languages.markup;
  t && (t.tag.addInlined("style", "css"), t.tag.addAttribute("style", "css"));
})(Prism);
(function(r) {
  var e = r.util.clone(r.languages.javascript), t = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source, n = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source, a = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
  function i(c, d) {
    return c = c.replace(/<S>/g, function() {
      return t;
    }).replace(/<BRACES>/g, function() {
      return n;
    }).replace(/<SPREAD>/g, function() {
      return a;
    }), RegExp(c, d);
  }
  a = i(a).source, r.languages.jsx = r.languages.extend("markup", e), r.languages.jsx.tag.pattern = i(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
  ), r.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/, r.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/, r.languages.jsx.tag.inside.tag.inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/, r.languages.jsx.tag.inside.comment = e.comment, r.languages.insertBefore("inside", "attr-name", {
    spread: {
      pattern: i(/<SPREAD>/.source),
      inside: r.languages.jsx
    }
  }, r.languages.jsx.tag), r.languages.insertBefore("inside", "special-attr", {
    script: {
      // Allow for two levels of nesting
      pattern: i(/=<BRACES>/.source),
      alias: "language-javascript",
      inside: {
        "script-punctuation": {
          pattern: /^=(?=\{)/,
          alias: "punctuation"
        },
        rest: r.languages.jsx
      }
    }
  }, r.languages.jsx.tag);
  var s = function(c) {
    return c ? typeof c == "string" ? c : typeof c.content == "string" ? c.content : c.content.map(s).join("") : "";
  }, o = function(c) {
    for (var d = [], u = 0; u < c.length; u++) {
      var f = c[u], h = !1;
      if (typeof f != "string" && (f.type === "tag" && f.content[0] && f.content[0].type === "tag" ? f.content[0].content[0].content === "</" ? d.length > 0 && d[d.length - 1].tagName === s(f.content[0].content[1]) && d.pop() : f.content[f.content.length - 1].content === "/>" || d.push({
        tagName: s(f.content[0].content[1]),
        openedBraces: 0
      }) : d.length > 0 && f.type === "punctuation" && f.content === "{" ? d[d.length - 1].openedBraces++ : d.length > 0 && d[d.length - 1].openedBraces > 0 && f.type === "punctuation" && f.content === "}" ? d[d.length - 1].openedBraces-- : h = !0), (h || typeof f == "string") && d.length > 0 && d[d.length - 1].openedBraces === 0) {
        var g = s(f);
        u < c.length - 1 && (typeof c[u + 1] == "string" || c[u + 1].type === "plain-text") && (g += s(c[u + 1]), c.splice(u + 1, 1)), u > 0 && (typeof c[u - 1] == "string" || c[u - 1].type === "plain-text") && (g = s(c[u - 1]) + g, c.splice(u - 1, 1), u--), c[u] = new r.Token("plain-text", g, null, g);
      }
      f.content && typeof f.content != "string" && o(f.content);
    }
  };
  r.hooks.add("after-tokenize", function(c) {
    c.language !== "jsx" && c.language !== "tsx" || o(c.tokens);
  });
})(Prism);
(function(r) {
  var e = r.util.clone(r.languages.typescript);
  r.languages.tsx = r.languages.extend("jsx", e), delete r.languages.tsx.parameter, delete r.languages.tsx["literal-property"];
  var t = r.languages.tsx.tag;
  t.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + t.pattern.source + ")", t.pattern.flags), t.lookbehind = !0;
})(Prism);
function slugify(r) {
  return r.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function escapeHtml(r) {
  return r.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function parseMarkdown(r) {
  const e = [], t = /* @__PURE__ */ new Map(), n = new marked.Renderer();
  n.heading = ({ tokens: o, depth: c, text: d }) => {
    let u = slugify(d);
    u || (u = `heading-${c}`);
    let f = u;
    const h = t.get(u) || 0;
    h > 0 && (f = `${u}-${h}`), t.set(u, h + 1), c >= 2 && c <= 4 && e.push({
      id: f,
      text: d.replace(/<[^>]*>/g, ""),
      level: c
    });
    const g = `<a href="#${f}" class="heading-anchor" aria-label="Link to ${escapeHtml(d)}">#</a>`;
    return `<h${c} id="${f}" class="doc-heading doc-h${c}"><span>${d}</span>${g}</h${c}>
`;
  }, n.code = ({ text: o, lang: c }) => {
    const d = (c || "").trim().toLowerCase();
    let u = escapeHtml(o);
    if (d && Prism$1.languages[d])
      try {
        u = Prism$1.highlight(o, Prism$1.languages[d], d);
      } catch {
        u = escapeHtml(o);
      }
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        ${d ? `<span class="code-lang">${d}</span>` : ""}
        <button class="copy-code-btn" type="button" title="Copy code" onclick="navigator.clipboard.writeText(this.closest('pre').querySelector('code').innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
      </div>
      <pre class="language-${d || "plaintext"}"><code class="language-${d || "plaintext"}">${u}</code></pre>
    </div>
`;
  }, n.table = ({ header: o, rows: c }) => {
    const d = o.map((f) => `<th>${f.text}</th>`).join(""), u = c.map((f) => `<tr>${f.map((h) => `<td>${h.text}</td>`).join("")}</tr>`).join("");
    return `<div class="table-container"><table><thead><tr>${d}</tr></thead><tbody>${u}</tbody></table></div>
`;
  };
  const a = /> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)+)/gi, i = r.replace(a, (o, c, d) => {
    const u = d.split(`
`).map((h) => h.replace(/^>\s?/, "")).join(`
`);
    return `<div class="callout callout-${c.toLowerCase()}">
<div class="callout-title"><span class="callout-icon"></span>${c.toUpperCase()}</div>
<div class="callout-body">

${u}

</div>
</div>

`;
  });
  return { html: marked.parse(i, {
    renderer: n,
    gfm: !0,
    breaks: !1
  }), headings: e };
}
function formatCategoryName(r) {
  return r.replace(/^\d+-/, "").split("-").map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function parseOrderPrefix(r, e) {
  const t = r.match(/^(\d+)-/);
  return t ? parseInt(t[1], 10) : e;
}
function cleanSlugPart(r) {
  return r.replace(/^\d+-/, "").replace(/\.md$/, "").toLowerCase();
}
const markdownFiles = /* @__PURE__ */ Object.assign({
  "../../content/docs/01-getting-started/01-introduction.md": __vite_glob_0_0,
  "../../content/docs/01-getting-started/02-installation.md": __vite_glob_0_1,
  "../../content/docs/01-getting-started/03-quickstart.md": __vite_glob_0_2,
  "../../content/docs/02-guides/01-configuration.md": __vite_glob_0_3,
  "../../content/docs/02-guides/02-writing-docs.md": __vite_glob_0_4,
  "../../content/docs/02-guides/03-cloudflare-deployment.md": __vite_glob_0_5,
  "../../content/docs/02-guides/04-admin-panel.md": __vite_glob_0_6,
  "../../content/docs/03-api/01-overview.md": __vite_glob_0_7
});
let cachedStaticDocs = null;
function initializeStaticDocs() {
  if (cachedStaticDocs) return cachedStaticDocs;
  const r = [];
  for (const [t, n] of Object.entries(markdownFiles)) {
    const i = t.replace(/\\/g, "/").split("/content/docs/")[1]?.split("/");
    if (!i || i.length === 0) continue;
    let s = "", o = "";
    i.length === 1 ? (s = "00-general", o = i[0]) : (s = i[0], o = i.slice(1).join("/"));
    const c = parseOrderPrefix(s, 99), d = parseOrderPrefix(o.split("/").pop() || "", 99);
    r.push({
      categoryFolder: s,
      fileSlug: o,
      categoryOrder: c,
      fileOrder: d,
      content: n
    });
  }
  const e = [];
  for (const t of r) {
    const n = matter(t.content), a = n.data || {}, { html: i, headings: s } = parseMarkdown(n.content), o = cleanSlugPart(t.categoryFolder), c = cleanSlugPart(t.fileSlug), u = a.slug?.replace(/^\//, "") || `${o}/${c}`, f = a.category || formatCategoryName(t.categoryFolder), h = a.title || s[0]?.text || c, g = typeof a.order == "number" ? a.order : t.fileOrder, x = a.author || a.owner || "Docs Team", _ = a.updatedAt || a.lastUpdated || "2026-08-19";
    e.push({
      slug: u,
      category: f,
      categorySlug: o,
      categoryOrder: t.categoryOrder,
      title: h,
      description: a.description || "",
      order: g,
      rawContent: n.content,
      htmlContent: i,
      headings: s,
      author: x,
      updatedAt: _
    });
  }
  return cachedStaticDocs = e, e;
}
function getAllStaticDocs() {
  return initializeStaticDocs();
}
async function getMergedDocs(r) {
  const e = await r.getDocs(), t = /* @__PURE__ */ new Map();
  for (const i of e) {
    const s = i.categorySlug || cleanSlugPart(i.category);
    t.has(s) || t.set(s, {
      title: i.category,
      slug: s,
      order: i.categoryOrder || 99,
      items: []
    }), t.get(s).items.push(i);
  }
  const n = Array.from(t.values()).sort((i, s) => i.order - s.order), a = [];
  for (const i of n)
    i.items.sort((s, o) => s.order - o.order), a.push(...i.items);
  for (let i = 0; i < a.length; i++) {
    const s = a[i];
    if (i > 0) {
      const o = a[i - 1];
      s.prevDoc = { slug: o.slug, title: o.title };
    } else
      s.prevDoc = void 0;
    if (i < a.length - 1) {
      const o = a[i + 1];
      s.nextDoc = { slug: o.slug, title: o.title };
    } else
      s.nextDoc = void 0;
  }
  return a;
}
async function getMergedDocBySlug(r, e) {
  return (await getMergedDocs(r)).find((n) => n.slug === e || n.slug.endsWith(`/${e}`));
}
async function getMergedNavigation(r) {
  const e = await getMergedDocs(r), t = /* @__PURE__ */ new Map();
  for (const n of e) {
    const a = n.categorySlug || cleanSlugPart(n.category);
    t.has(a) || t.set(a, {
      title: n.category,
      slug: a,
      order: n.categoryOrder || 99,
      items: []
    }), t.get(a).items.push({
      title: n.title,
      slug: n.slug,
      description: n.description,
      order: n.order
    });
  }
  return Array.from(t.values()).sort((n, a) => n.order - a.order);
}
async function getMergedSearchIndex(r) {
  return (await getMergedDocs(r)).map((t) => {
    const n = t.rawContent.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#*_-]/g, " ").replace(/\s+/g, " ").trim();
    return {
      slug: t.slug,
      title: t.title,
      category: t.category,
      description: t.description,
      contentSnippet: n.slice(0, 200),
      author: t.author,
      updatedAt: t.updatedAt
    };
  });
}
class MemoryStorageProvider {
  docsMap = /* @__PURE__ */ new Map();
  specsMap = /* @__PURE__ */ new Map();
  initialized = !1;
  async ensureInitialized() {
    if (this.initialized) return;
    const e = getAllStaticDocs();
    for (const t of e)
      this.docsMap.set(t.slug, {
        ...t,
        isDynamic: !1,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    this.specsMap.set("main", {
      id: "main",
      title: "Hono + Scalar Documentation Platform API",
      version: "1.0.0",
      description: "Primary REST API and Documentation Specification",
      specJson: JSON.stringify({
        openapi: "3.1.0",
        info: {
          title: "Hono + Scalar Documentation Platform API",
          version: "1.0.0",
          description: "Primary REST API Specification"
        },
        paths: {}
      }, null, 2),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }), this.initialized = !0;
  }
  async getDocs() {
    return await this.ensureInitialized(), Array.from(this.docsMap.values());
  }
  async getDoc(e) {
    return await this.ensureInitialized(), this.docsMap.get(e);
  }
  async saveDoc(e) {
    await this.ensureInitialized(), this.docsMap.set(e.slug, {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async deleteDoc(e) {
    return await this.ensureInitialized(), this.docsMap.delete(e);
  }
  async getOpenAPISpec(e) {
    return await this.ensureInitialized(), this.specsMap.get(e);
  }
  async getAllOpenAPISpecs() {
    return await this.ensureInitialized(), Array.from(this.specsMap.values());
  }
  async saveOpenAPISpec(e) {
    await this.ensureInitialized(), this.specsMap.set(e.id, {
      ...e,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async deleteOpenAPISpec(e) {
    return await this.ensureInitialized(), this.specsMap.delete(e);
  }
}
class KVStorageProvider {
  constructor(e) {
    this.kv = e;
  }
  DOC_PREFIX = "doc:";
  SPEC_PREFIX = "spec:";
  async getDocs() {
    const e = await this.kv.list({ prefix: this.DOC_PREFIX }), t = getAllStaticDocs(), n = /* @__PURE__ */ new Map();
    for (const a of t)
      n.set(a.slug, {
        ...a,
        isDynamic: !1,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    for (const a of e.keys) {
      const i = await this.kv.get(a.name);
      if (i)
        try {
          const s = JSON.parse(i);
          n.set(s.slug, s);
        } catch {
        }
    }
    return Array.from(n.values());
  }
  async getDoc(e) {
    const t = await this.kv.get(`${this.DOC_PREFIX}${e}`);
    if (t)
      try {
        return JSON.parse(t);
      } catch {
      }
    const n = getAllStaticDocs().find((a) => a.slug === e);
    if (n)
      return {
        ...n,
        isDynamic: !1,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
  }
  async saveDoc(e) {
    await this.kv.put(`${this.DOC_PREFIX}${e.slug}`, JSON.stringify(e));
  }
  async deleteDoc(e) {
    return await this.kv.delete(`${this.DOC_PREFIX}${e}`), !0;
  }
  async getOpenAPISpec(e) {
    const t = await this.kv.get(`${this.SPEC_PREFIX}${e}`);
    if (t)
      try {
        return JSON.parse(t);
      } catch {
        return;
      }
  }
  async getAllOpenAPISpecs() {
    const e = await this.kv.list({ prefix: this.SPEC_PREFIX }), t = [];
    for (const n of e.keys) {
      const a = await this.kv.get(n.name);
      if (a)
        try {
          t.push(JSON.parse(a));
        } catch {
        }
    }
    return t;
  }
  async saveOpenAPISpec(e) {
    await this.kv.put(`${this.SPEC_PREFIX}${e.id}`, JSON.stringify(e));
  }
  async deleteOpenAPISpec(e) {
    return await this.kv.delete(`${this.SPEC_PREFIX}${e}`), !0;
  }
}
const defaultMemoryStorage = new MemoryStorageProvider();
function getStorage(r) {
  return r && r.DOCS_KV ? new KVStorageProvider(r.DOCS_KV) : defaultMemoryStorage;
}
function formatDate$3(r) {
  if (!r) return "Recently";
  try {
    const e = new Date(r);
    return isNaN(e.getTime()) ? r : e.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return r;
  }
}
const DocPage = ({ doc: r, navigation: e }) => /* @__PURE__ */ jsxDEV(
  Layout,
  {
    title: r.title,
    description: r.description || `Read ${r.title} on the documentation site.`,
    activePath: `/docs/${r.slug}`,
    children: /* @__PURE__ */ jsxDEV("div", { class: "docs-container", children: [
      /* @__PURE__ */ jsxDEV("aside", { class: "sidebar", children: e.map((t) => /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group-title", children: t.title }),
        /* @__PURE__ */ jsxDEV("ul", { class: "sidebar-menu", children: t.items.map((n) => {
          const a = n.slug === r.slug;
          return /* @__PURE__ */ jsxDEV("li", { class: "sidebar-item", children: /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${n.slug}`,
              class: `sidebar-link ${a ? "active" : ""}`,
              children: n.title
            }
          ) }, n.slug);
        }) })
      ] }, t.slug)) }),
      /* @__PURE__ */ jsxDEV("main", { class: "content-area", children: [
        /* @__PURE__ */ jsxDEV("nav", { class: "breadcrumbs", "aria-label": "Breadcrumb", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/docs", children: "Docs" }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { children: r.category }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { style: "color: var(--text-primary); font-weight: 500;", children: r.title })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 1.5rem; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap;", children: [
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "👤" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Owner: ",
              /* @__PURE__ */ jsxDEV("strong", { style: "color: var(--text-primary);", children: r.author || "Docs Team" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "🕒" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Last updated: ",
              /* @__PURE__ */ jsxDEV("time", { datetime: r.updatedAt || "", style: "color: var(--text-primary); font-weight: 500;", children: formatDate$3(r.updatedAt) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("article", { class: "doc-prose", children: /* @__PURE__ */ jsxDEV("div", { dangerouslySetInnerHTML: { __html: r.htmlContent } }) }),
        (r.prevDoc || r.nextDoc) && /* @__PURE__ */ jsxDEV("div", { class: "docs-pagination", children: [
          r.prevDoc ? /* @__PURE__ */ jsxDEV("a", { href: `/docs/${r.prevDoc.slug}`, class: "pagination-card prev", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "← Previous" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: r.prevDoc.title })
          ] }) : /* @__PURE__ */ jsxDEV("div", {}),
          r.nextDoc && /* @__PURE__ */ jsxDEV("a", { href: `/docs/${r.nextDoc.slug}`, class: "pagination-card next", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "Next →" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: r.nextDoc.title })
          ] })
        ] })
      ] }),
      r.headings && r.headings.length > 0 ? /* @__PURE__ */ jsxDEV("aside", { class: "toc-area", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "toc-title", children: "On this page" }),
        /* @__PURE__ */ jsxDEV("ul", { class: "toc-list", children: r.headings.map((t) => /* @__PURE__ */ jsxDEV("li", { class: `toc-item level-${t.level}`, children: /* @__PURE__ */ jsxDEV("a", { href: `#${t.id}`, class: "toc-link", children: t.text }) }, t.id)) })
      ] }) : /* @__PURE__ */ jsxDEV("div", { style: "width: var(--toc-width); flex-shrink: 0;" })
    ] })
  }
), docsApp = new Hono();
docsApp.get("/api/search", async (r) => {
  const e = getStorage(r.env), t = await getMergedSearchIndex(e);
  return r.json(t);
});
docsApp.get("/docs", async (r) => {
  const e = getStorage(r.env), t = await getMergedDocs(e);
  return t.length > 0 ? r.redirect(`/docs/${t[0].slug}`) : r.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}));
});
docsApp.get("/docs/:slug", async (r) => {
  const e = r.req.param("slug"), t = getStorage(r.env), n = await getMergedDocBySlug(t, e), a = await getMergedNavigation(t);
  if (!n) {
    const s = (await getMergedDocs(t)).find((o) => o.categorySlug === e);
    return s ? r.redirect(`/docs/${s.slug}`) : (r.status(404), r.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
  }
  return r.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: n, navigation: a }));
});
docsApp.get("/docs/:category/:slug", async (r) => {
  const e = r.req.param("category"), t = r.req.param("slug"), n = `${e}/${t}`, a = getStorage(r.env), i = await getMergedDocBySlug(a, n) || await getMergedDocBySlug(a, t), s = await getMergedNavigation(a);
  return i ? r.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: i, navigation: s })) : (r.status(404), r.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
});
const apiRouter = new OpenAPIHono(), ErrorSchema = objectType({
  code: stringType().openapi({ example: "NOT_FOUND" }),
  message: stringType().openapi({ example: "Resource not found" })
}).openapi("ErrorResponse"), HealthSchema = objectType({
  status: enumType(["ok", "degraded", "error"]).openapi({ example: "ok" }),
  version: stringType().openapi({ example: "1.0.0" }),
  timestamp: stringType().openapi({ example: "2026-08-19T16:00:00.000Z" }),
  runtime: stringType().openapi({ example: "Cloudflare Workers (workerd)" })
}).openapi("HealthResponse"), UserSchema = objectType({
  id: stringType().openapi({ example: "usr_101" }),
  name: stringType().openapi({ example: "Sarah Connor" }),
  email: stringType().email().openapi({ example: "sarah@example.com" }),
  role: enumType(["admin", "member", "viewer"]).openapi({ example: "admin" }),
  createdAt: stringType().openapi({ example: "2026-01-15T08:30:00.000Z" })
}).openapi("User"), CreateUserSchema = objectType({
  name: stringType().min(2).openapi({ example: "John Doe" }),
  email: stringType().email().openapi({ example: "john@example.com" }),
  role: enumType(["admin", "member", "viewer"]).default("member").openapi({ example: "member" })
}).openapi("CreateUserPayload"), ProjectSchema = objectType({
  id: stringType().openapi({ example: "prj_404" }),
  name: stringType().openapi({ example: "Edge Documentation Platform" }),
  status: enumType(["active", "archived", "draft"]).openapi({ example: "active" }),
  stars: numberType().openapi({ example: 1240 })
}).openapi("Project"), usersDb = [
  {
    id: "usr_1",
    name: "Sarah Connor",
    email: "sarah@example.com",
    role: "admin",
    createdAt: "2026-01-15T08:30:00.000Z"
  },
  {
    id: "usr_2",
    name: "John Connor",
    email: "john@example.com",
    role: "member",
    createdAt: "2026-02-10T12:00:00.000Z"
  }
], getHealthRoute = createRoute({
  method: "get",
  path: "/api/v1/health",
  tags: ["System"],
  summary: "Check API Health",
  description: "Returns health status and runtime environment details for the Cloudflare Worker.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: HealthSchema
        }
      },
      description: "System is operational"
    }
  }
});
apiRouter.openapi(getHealthRoute, (r) => r.json({
  status: "ok",
  version: "1.0.0",
  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  runtime: "Cloudflare Workers (workerd)"
}, 200));
const getUsersRoute = createRoute({
  method: "get",
  path: "/api/v1/users",
  tags: ["Users"],
  summary: "List Users",
  description: "Retrieve a list of all users registered in the system.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: arrayType(UserSchema)
        }
      },
      description: "List of users"
    }
  }
});
apiRouter.openapi(getUsersRoute, (r) => r.json(usersDb, 200));
const createUserRoute = createRoute({
  method: "post",
  path: "/api/v1/users",
  tags: ["Users"],
  summary: "Create User",
  description: "Creates a new user profile with validation.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema
        }
      },
      required: !0
    }
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: UserSchema
        }
      },
      description: "User created successfully"
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema
        }
      },
      description: "Invalid input payload"
    }
  }
});
apiRouter.openapi(createUserRoute, (r) => {
  const e = r.req.valid("json"), t = {
    id: `usr_${Date.now()}`,
    name: e.name,
    email: e.email,
    role: e.role,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return usersDb.push(t), r.json(t, 201);
});
const getUserByIdRoute = createRoute({
  method: "get",
  path: "/api/v1/users/{id}",
  tags: ["Users"],
  summary: "Get User by ID",
  description: "Retrieve detailed information for a single user by their ID.",
  request: {
    params: objectType({
      id: stringType().openapi({
        param: {
          name: "id",
          in: "path"
        },
        example: "usr_1"
      })
    })
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserSchema
        }
      },
      description: "User details"
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema
        }
      },
      description: "User not found"
    }
  }
});
apiRouter.openapi(getUserByIdRoute, (r) => {
  const { id: e } = r.req.valid("param"), t = usersDb.find((n) => n.id === e);
  return t ? r.json(t, 200) : r.json({ code: "NOT_FOUND", message: `User with ID '${e}' not found.` }, 404);
});
const getProjectsRoute = createRoute({
  method: "get",
  path: "/api/v1/projects",
  tags: ["Projects"],
  summary: "List Projects",
  description: "Returns available projects with metadata.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: arrayType(ProjectSchema)
        }
      },
      description: "List of projects"
    }
  }
});
apiRouter.openapi(getProjectsRoute, (r) => r.json([
  {
    id: "prj_1",
    name: "Hono Edge Framework",
    status: "active",
    stars: 21500
  },
  {
    id: "prj_2",
    name: "Scalar API Reference",
    status: "active",
    stars: 9800
  },
  {
    id: "prj_3",
    name: "Cloudflare Workers Runtime",
    status: "active",
    stars: 18e3
  }
], 200));
const PREFIX_MIGRATIONS = [
  ["--theme-", "--scalar-"],
  ["--sidebar-", "--scalar-sidebar-"]
], LEGACY_PREFIXES = PREFIX_MIGRATIONS.map(([r]) => r);
function migrateThemeVariables(r) {
  return LEGACY_PREFIXES.some((t) => r.includes(t)) ? (console.warn("DEPRECATION WARNING: It looks like you're using legacy CSS variables in your custom CSS string. Please migrate them to use the updated prefixes. See https://github.com/scalar/scalar/blob/main/documentation/themes.md#theme-prefix-changes"), PREFIX_MIGRATIONS.reduce((t, [n, a]) => t.replaceAll(n, a), r)) : r;
}
const themeIdEnum = enumType([
  "alternate",
  "default",
  "moon",
  "purple",
  "solarized",
  "bluePlanet",
  "deepSpace",
  "saturn",
  "kepler",
  "elysiajs",
  "fastify",
  "mars",
  "none"
]), searchHotKeyEnum = enumType([
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z"
]), integrationEnum = enumType([
  "adonisjs",
  "docusaurus",
  "dotnet",
  "elysiajs",
  "express",
  "fastapi",
  "fastify",
  "go",
  "hono",
  "html",
  "laravel",
  "litestar",
  "nestjs",
  "nextjs",
  "nitro",
  "nuxt",
  "platformatic",
  "react",
  "rust",
  "vue"
]).nullable(), specConfigurationSchema = objectType({
  /** URL to an OpenAPI/Swagger document */
  url: stringType().optional(),
  /**
   * Directly embed the OpenAPI document.
   * Can be a string, object, function returning an object, or null.
   * @remarks It's recommended to pass a URL instead of content.
   */
  content: unionType([stringType(), recordType(anyType()), functionType().returns(recordType(anyType())), nullType()]).optional(),
  /**
   * The title of the OpenAPI document.
   *
   * @example 'Scalar Galaxy'
   */
  title: stringType().optional(),
  /**
   * The slug of the OpenAPI document used in the URL.
   *
   * If none is passed, the title will be used.
   *
   * If no title is used, it’ll just use the index.
   *
   * @example 'scalar-galaxy'
   */
  slug: stringType().optional()
}), pathRoutingSchema = objectType({
  /** Base path for the API reference */
  basePath: stringType()
}), apiClientConfigurationSchema = objectType({
  /** Prefill authentication */
  authentication: anyType().optional(),
  // Temp until we bring in the new auth
  /** Base URL for the API server */
  baseServerURL: stringType().optional(),
  /**
   * Whether to hide the client button
   * @default false
   */
  hideClientButton: booleanType().optional().default(!1).catch(!1),
  /** URL to a request proxy for the API client */
  proxyUrl: stringType().optional(),
  /** Key used with CTRL/CMD to open the search modal (defaults to 'k' e.g. CMD+k) */
  searchHotKey: searchHotKeyEnum.optional(),
  /** List of OpenAPI server objects */
  servers: arrayType(anyType()).optional(),
  // Using any for OpenAPIV3_1.ServerObject
  /**
   * Whether to show the sidebar
   * @default true
   */
  showSidebar: booleanType().optional().default(!0).catch(!0),
  /** The Swagger/OpenAPI spec to render */
  spec: specConfigurationSchema.optional(),
  /** A string to use one of the color presets */
  theme: themeIdEnum.optional().default("default").catch("default"),
  /** Integration type identifier */
  _integration: integrationEnum.optional()
}), OLD_PROXY_URL = "https://api.scalar.com/request-proxy", NEW_PROXY_URL = "https://proxy.scalar.com", _apiReferenceConfigurationSchema = apiClientConfigurationSchema.merge(objectType({
  /**
   * The layout to use for the references
   * @default 'modern'
   */
  layout: enumType(["modern", "classic"]).optional().default("modern").catch("modern"),
  /**
   * URL to a request proxy for the API client
   * @deprecated Use proxyUrl instead
   */
  proxy: stringType().optional(),
  /**
   * Whether the spec input should show
   * @default false
   */
  isEditable: booleanType().optional().default(!1).catch(!1),
  /**
   * Whether to show models in the sidebar, search, and content.
   * @default false
   */
  hideModels: booleanType().optional().default(!1).catch(!1),
  /**
   * Whether to show the "Download OpenAPI Document" button
   * @default false
   */
  hideDownloadButton: booleanType().optional().default(!1).catch(!1),
  /**
   * Whether to show the "Test Request" button
   * @default false
   */
  hideTestRequestButton: booleanType().optional().default(!1).catch(!1),
  /**
   * Whether to show the sidebar search bar
   * @default false
   */
  hideSearch: booleanType().optional().default(!1).catch(!1),
  /** Whether dark mode is on or off initially (light mode) */
  darkMode: booleanType().optional(),
  /** forceDarkModeState makes it always this state no matter what */
  forceDarkModeState: enumType(["dark", "light"]).optional(),
  /**
   * Whether to show the dark mode toggle
   * @default false
   */
  hideDarkModeToggle: booleanType().optional().default(!1).catch(!1),
  /**
   * If used, passed data will be added to the HTML header
   * @see https://unhead.unjs.io/usage/composables/use-seo-meta
   */
  metaData: anyType().optional(),
  // Using any for UseSeoMetaInput since it's an external type
  /**
   * Path to a favicon image
   * @default undefined
   * @example '/favicon.svg'
   */
  favicon: stringType().optional(),
  /**
   * List of httpsnippet clients to hide from the clients menu
   * By default hides Unirest, pass `[]` to show all clients
   */
  hiddenClients: unionType([recordType(unionType([booleanType(), arrayType(stringType())])), arrayType(stringType()), literalType(!0)]).optional(),
  /** Determine the HTTP client that's selected by default */
  defaultHttpClient: objectType({
    targetKey: custom(),
    clientKey: stringType()
  }).optional(),
  /** Custom CSS to be added to the page */
  customCss: stringType().optional(),
  /** onSpecUpdate is fired on spec/swagger content change */
  onSpecUpdate: functionType().args(stringType()).returns(voidType()).optional(),
  /** onServerChange is fired on selected server change */
  onServerChange: functionType().args(stringType()).returns(voidType()).optional(),
  /**
   * Route using paths instead of hashes, your server MUST support this
   * @example '/standalone-api-reference/:custom(.*)?'
   * @experimental
   * @default undefined
   */
  pathRouting: pathRoutingSchema.optional(),
  /**
   * Customize the heading portion of the hash
   * @param heading - The heading object
   * @returns A string ID used to generate the URL hash
   * @default (heading) => `#description/${heading.slug}`
   */
  generateHeadingSlug: functionType().args(objectType({ slug: stringType().default("headingSlug") })).returns(stringType()).optional(),
  /**
   * Customize the model portion of the hash
   * @param model - The model object with a name property
   * @returns A string ID used to generate the URL hash
   * @default (model) => slug(model.name)
   */
  generateModelSlug: functionType().args(objectType({ name: stringType().default("modelName") })).returns(stringType()).optional(),
  /**
   * Customize the tag portion of the hash
   * @param tag - The tag object
   * @returns A string ID used to generate the URL hash
   * @default (tag) => slug(tag.name)
   */
  generateTagSlug: functionType().args(objectType({ name: stringType().default("tagName") })).returns(stringType()).optional(),
  /**
   * Customize the operation portion of the hash
   * @param operation - The operation object
   * @returns A string ID used to generate the URL hash
   * @default (operation) => `${operation.method}${operation.path}`
   */
  generateOperationSlug: functionType().args(objectType({
    path: stringType(),
    operationId: stringType().optional(),
    method: stringType(),
    summary: stringType().optional()
  })).returns(stringType()).optional(),
  /**
   * Customize the webhook portion of the hash
   * @param webhook - The webhook object
   * @returns A string ID used to generate the URL hash
   * @default (webhook) => slug(webhook.name)
   */
  generateWebhookSlug: functionType().args(objectType({
    name: stringType(),
    method: stringType().optional()
  })).returns(stringType()).optional(),
  /** Callback fired when the reference is fully loaded */
  onLoaded: functionType().returns(voidType()).optional(),
  /**
   * To handle redirects, pass a function that will recieve:
   * - The current path with hash if pathRouting is enabled
   * - The current hash if hashRouting (default)
   * And then passes that to history.replaceState
   *
   * @example hashRouting (default)
   * ```ts
   * redirect: (hash: string) => hash.replace('#v1/old-path', '#v2/new-path')
   * ```
   * @example pathRouting
   * ```ts
   * redirect: (pathWithHash: string) => {
   *   if (pathWithHash.includes('#')) {
   *     return pathWithHash.replace('/v1/tags/user#operation/get-user', '/v1/tags/user/operation/get-user')
   *   }
   *   return null
   * }
   * ```
   */
  redirect: functionType().args(stringType()).returns(stringType().nullable().optional()).optional(),
  /**
   * Whether to include default fonts
   * @default true
   */
  withDefaultFonts: booleanType().optional().default(!0).catch(!0),
  /** Whether to expand all tags by default */
  defaultOpenAllTags: booleanType().optional(),
  /**
   * Function to sort tags
   * @default 'alpha' for alphabetical sorting
   */
  tagsSorter: unionType([literalType("alpha"), functionType().args(anyType(), anyType()).returns(numberType())]).optional(),
  /**
   * Function to sort operations
   * @default 'alpha' for alphabetical sorting
   */
  operationsSorter: unionType([literalType("alpha"), literalType("method"), functionType().args(anyType(), anyType()).returns(numberType())]).optional()
})), _apiReferenceConfigurationWithSourcesSchema = _apiReferenceConfigurationSchema.merge(objectType({
  spec: objectType({
    sources: arrayType(specConfigurationSchema)
  })
})), migrateConfiguration = (r) => {
  const e = { ...r };
  return e.customCss && (e.customCss = migrateThemeVariables(e.customCss)), e.proxy && (console.warn("[DEPRECATED] You’re using the deprecated 'proxy' attribute, rename it to 'proxyUrl' or update the package."), e.proxyUrl || (e.proxyUrl = e.proxy), delete e.proxy), e.proxyUrl === OLD_PROXY_URL && (console.warn(`[DEPRECATED] Warning: configuration.proxyUrl points to our old proxy (${OLD_PROXY_URL}).`), console.warn(`[DEPRECATED] We are overwriting the value and use the new proxy URL (${NEW_PROXY_URL}) instead.`), console.warn(`[DEPRECATED] Action Required: You should manually update your configuration to use the new URL (${NEW_PROXY_URL}). Read more: https://github.com/scalar/scalar`), e.proxyUrl = NEW_PROXY_URL), e;
}, apiReferenceConfigurationSchema = _apiReferenceConfigurationSchema.transform(migrateConfiguration);
_apiReferenceConfigurationWithSourcesSchema.transform(migrateConfiguration);
const htmlRenderingConfigurationSchema = objectType({
  /**
   * The URL to the Scalar API Reference JS CDN.
   *
   * Use this to pin a specific version of the Scalar API Reference.
   *
   * @default https://cdn.jsdelivr.net/npm/@scalar/api-reference
   *
   * @example https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.122
   */
  cdn: stringType().optional().default("https://cdn.jsdelivr.net/npm/@scalar/api-reference"),
  /**
   * The title of the page.
   */
  pageTitle: stringType().optional().default("Scalar API Reference")
}), getHtmlDocument = (r, e = "") => {
  const { cdn: t, pageTitle: n, ...a } = r, i = htmlRenderingConfigurationSchema.parse({ cdn: t, pageTitle: n, customTheme: e }), s = apiReferenceConfigurationSchema.parse(a);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${i.pageTitle}</title>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1" />
        <style>
          ${r.theme ? "" : e}
        </style>
      </head>
      <body>
        ${getScriptTags(s, i.cdn)}
      </body>
    </html>
  `;
};
function getScriptTags(r, e) {
  return `
      <script
        id="api-reference"
        type="application/json"
        data-configuration="${getConfiguration(r)}">${getScriptTagContent(r)}<\/script>
        <script src="${e}"><\/script>
    `;
}
const getConfiguration = (r) => {
  const e = {
    ...r
  };
  return e.spec?.url ? e.spec?.content && delete e.spec?.content : delete e.spec, JSON.stringify(e).split('"').join("&quot;");
}, getScriptTagContent = (r) => r.spec?.content ? typeof r.spec?.content == "function" ? JSON.stringify(r.spec?.content()) : JSON.stringify(r.spec?.content) : "", DEFAULT_CONFIGURATION = {
  _integration: "hono"
}, customTheme = `
.light-mode {
  color-scheme: light;
  --scalar-color-1: #2a2f45;
  --scalar-color-2: #757575;
  --scalar-color-3: #8e8e8e;
  --scalar-color-disabled: #b4b1b1;
  --scalar-color-ghost: #a7a7a7;
  --scalar-color-accent: #0099ff;
  --scalar-background-1: #fff;
  --scalar-background-2: #f6f6f6;
  --scalar-background-3: #e7e7e7;
  --scalar-background-4: rgba(0, 0, 0, 0.06);
  --scalar-background-accent: #8ab4f81f;

  --scalar-border-color: rgba(0, 0, 0, 0.1);
  --scalar-scrollbar-color: rgba(0, 0, 0, 0.18);
  --scalar-scrollbar-color-active: rgba(0, 0, 0, 0.36);
  --scalar-lifted-brightness: 1;
  --scalar-backdrop-brightness: 1;

  --scalar-shadow-1: 0 1px 3px 0 rgba(0, 0, 0, 0.11);
  --scalar-shadow-2: rgba(0, 0, 0, 0.08) 0px 13px 20px 0px,
    rgba(0, 0, 0, 0.08) 0px 3px 8px 0px, #eeeeed 0px 0 0 1px;

  --scalar-button-1: rgb(49 53 56);
  --scalar-button-1-color: #fff;
  --scalar-button-1-hover: rgb(28 31 33);

  --scalar-color-green: #069061;
  --scalar-color-red: #ef0006;
  --scalar-color-yellow: #edbe20;
  --scalar-color-blue: #0082d0;
  --scalar-color-orange: #fb892c;
  --scalar-color-purple: #5203d1;
}

.dark-mode {
  color-scheme: dark;
  --scalar-color-1: rgba(255, 255, 245, .86);
  --scalar-color-2: rgba(255, 255, 245, .6);
  --scalar-color-3: rgba(255, 255, 245, .38);
  --scalar-color-disabled: rgba(255, 255, 245, .25);
  --scalar-color-ghost: rgba(255, 255, 245, .25);
  --scalar-color-accent: #e36002;
  --scalar-background-1: #1e1e20;
  --scalar-background-2: #2a2a2a;
  --scalar-background-3: #505053;
  --scalar-background-4: rgba(255, 255, 255, 0.06);
  --scalar-background-accent: #e360021f;

  --scalar-border-color: rgba(255, 255, 255, 0.1);
  --scalar-scrollbar-color: rgba(255, 255, 255, 0.24);
  --scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);
  --scalar-lifted-brightness: 1.45;
  --scalar-backdrop-brightness: 0.5;

  --scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);
  --scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px,
    rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);

  --scalar-button-1: #f6f6f6;
  --scalar-button-1-color: #000;
  --scalar-button-1-hover: #e7e7e7;

  --scalar-color-green: #3dd68c;
  --scalar-color-red: #f66f81;
  --scalar-color-yellow: #f9b44e;
  --scalar-color-blue: #5c73e7;
  --scalar-color-orange: #ff8d4d;
  --scalar-color-purple: #b191f9;
}
/* Sidebar */
.light-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-item-hover-color: currentColor;
  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-active-background: var(--scalar-background-accent);
  --scalar-sidebar-border-color: var(--scalar-border-color);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-border-color: var(--scalar-sidebar-border-color);
  --scalar-sidebar-search-color: var(--scalar-color-3);
}

.dark-mode .sidebar {
  --scalar-sidebar-background-1: #161618;
  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);
  --scalar-sidebar-item-hover-background: transparent;
  --scalar-sidebar-item-active-background: transparent;
  --scalar-sidebar-border-color: transparent;
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-color-active: var(--scalar-color-accent);
  --scalar-sidebar-search-background: #252529;
  --scalar-sidebar-search-border-color: transparent;
  --scalar-sidebar-search-color: var(--scalar-color-3);
}
`, apiReference = (r) => {
  const e = {
    ...DEFAULT_CONFIGURATION,
    ...r
  };
  return async (t) => t.html(
    /* html */
    `${getHtmlDocument(e, customTheme)}`
  );
}, scalarReference = apiReference({
  pageTitle: "API Reference | Hono + Scalar on Cloudflare",
  theme: "purple",
  layout: "modern",
  spec: {
    url: "/openapi.json"
  }
}), COOKIE_NAME = "hono_admin_session", DEFAULT_PASSWORD = "admin123", DEFAULT_SECRET = "hono-edge-admin-secret-2026";
async function generateSessionToken(r) {
  const e = `admin_${Date.now()}`, t = new TextEncoder(), n = await crypto.subtle.importKey(
    "raw",
    t.encode(r),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), a = await crypto.subtle.sign("HMAC", n, t.encode(e)), i = Array.from(new Uint8Array(a)).map((s) => s.toString(16).padStart(2, "0")).join("");
  return `${e}.${i}`;
}
async function verifySessionToken(r, e) {
  if (!r || !r.includes(".")) return !1;
  const [t, n] = r.split(".");
  if (!t || !n) return !1;
  const a = new TextEncoder(), i = await crypto.subtle.importKey(
    "raw",
    a.encode(e),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), s = await crypto.subtle.sign("HMAC", i, a.encode(t)), o = Array.from(new Uint8Array(s)).map((c) => c.toString(16).padStart(2, "0")).join("");
  return n === o;
}
function getAdminPassword(r) {
  return r.env?.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}
function getSessionSecret(r) {
  return r.env?.SESSION_SECRET || DEFAULT_SECRET;
}
async function isAuthenticated(r) {
  const e = getSessionSecret(r), t = r.req.header("Authorization");
  if (t?.startsWith("Bearer ")) {
    const i = t.substring(7);
    if (i === getAdminPassword(r) || await verifySessionToken(i, e)) return !0;
  }
  const n = r.req.header("x-admin-key");
  if (n && n === getAdminPassword(r))
    return !0;
  const a = getCookie(r, COOKIE_NAME);
  return !!(a && await verifySessionToken(a, e));
}
async function loginAdmin(r) {
  const e = getSessionSecret(r), t = await generateSessionToken(e);
  return setCookie(r, COOKIE_NAME, t, {
    path: "/",
    httpOnly: !0,
    secure: !1,
    // will be upgraded in production
    sameSite: "Lax",
    maxAge: 3600 * 24 * 7
    // 7 days
  }), t;
}
function logoutAdmin(r) {
  deleteCookie(r, COOKIE_NAME, { path: "/" });
}
const adminAuthMiddleware = async (r, e) => {
  const t = r.req.path;
  return t === "/admin/login" || t === "/api/admin/login" || await isAuthenticated(r) ? e() : t.startsWith("/api/admin") ? r.json({ error: "Unauthorized: Admin authentication required" }, 401) : r.redirect(`/admin/login?redirect=${encodeURIComponent(t)}`);
}, LoginView = ({ error: r, redirect: e = "/admin" }) => /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
  /* @__PURE__ */ jsxDEV("head", { children: [
    /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
    /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
    /* @__PURE__ */ jsxDEV("title", { children: "Admin Login | Docs Platform" }),
    /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: `
          :root {
            --bg: #090d16;
            --card-bg: #111827;
            --border: #1f2937;
            --text: #f9fafb;
            --muted: #94a3b8;
            --accent: #f97316;
            --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: var(--font);
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .login-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            width: 100%;
            max-width: 400px;
            padding: 2.5rem 2rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
          }
          .brand-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
          }
          .form-group {
            margin-bottom: 1.25rem;
          }
          label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text);
          }
          input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #090d16;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            color: var(--text);
            font-size: 0.9375rem;
            outline: none;
          }
          input:focus {
            border-color: var(--accent);
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: opacity 0.15s;
            margin-top: 0.5rem;
          }
          button:hover { opacity: 0.9; }
          .error-banner {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            margin-bottom: 1.25rem;
          }
        ` } })
  ] }),
  /* @__PURE__ */ jsxDEV("body", { children: /* @__PURE__ */ jsxDEV("div", { class: "login-card", children: [
    /* @__PURE__ */ jsxDEV("div", { class: "brand-badge", children: [
      /* @__PURE__ */ jsxDEV("span", { children: "⚙️" }),
      /* @__PURE__ */ jsxDEV("span", { children: "Docs Admin Panel" })
    ] }),
    r && /* @__PURE__ */ jsxDEV("div", { class: "error-banner", children: r }),
    /* @__PURE__ */ jsxDEV("form", { action: "/admin/login", method: "post", children: [
      /* @__PURE__ */ jsxDEV("input", { type: "hidden", name: "redirect", value: e }),
      /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
        /* @__PURE__ */ jsxDEV("label", { for: "password", children: "Admin Password" }),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "password",
            id: "password",
            name: "password",
            placeholder: "Enter admin password...",
            required: !0,
            autofocus: !0
          }
        )
      ] }),
      /* @__PURE__ */ jsxDEV("button", { type: "submit", children: "Sign In to Admin" })
    ] }),
    /* @__PURE__ */ jsxDEV("p", { style: "text-align: center; margin-top: 1.5rem; font-size: 0.8125rem; color: var(--muted);", children: [
      "Default password for local dev: ",
      /* @__PURE__ */ jsxDEV("code", { style: "color: var(--accent);", children: "admin123" })
    ] })
  ] }) })
] }), AdminLayout = ({
  children: r,
  title: e = "Admin Dashboard",
  activePath: t = "/admin"
}) => /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
  /* @__PURE__ */ jsxDEV("head", { children: [
    /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
    /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
    /* @__PURE__ */ jsxDEV("title", { children: [
      e,
      " | Docs Admin"
    ] }),
    /* @__PURE__ */ jsxDEV("link", { rel: "icon", href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚙️</text></svg>" }),
    /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
          const savedTheme = localStorage.getItem('admin_theme') || localStorage.getItem('theme');
          if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
          }
        ` } }),
    /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: `
          :root {
            --admin-bg: #090d16;
            --admin-card-bg: #111827;
            --admin-sidebar-bg: #0d1322;
            --admin-border: #1f2937;
            --admin-text: #f9fafb;
            --admin-muted: #94a3b8;
            --admin-accent: #f97316;
            --admin-accent-hover: #ea580c;
            --admin-danger: #ef4444;
            --admin-success: #10b981;
            --admin-input-bg: #090d16;
            --admin-preview-bg: #090d16;
            --admin-preview-text: #cbd5e1;
            --admin-table-hover: rgba(255, 255, 255, 0.03);
            --admin-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --admin-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          [data-theme="light"] {
            --admin-bg: #f8fafc;
            --admin-card-bg: #ffffff;
            --admin-sidebar-bg: #ffffff;
            --admin-border: #e2e8f0;
            --admin-text: #0f172a;
            --admin-muted: #64748b;
            --admin-accent: #ea580c;
            --admin-accent-hover: #c2410c;
            --admin-danger: #dc2626;
            --admin-success: #059669;
            --admin-input-bg: #f8fafc;
            --admin-preview-bg: #f8fafc;
            --admin-preview-text: #334155;
            --admin-table-hover: rgba(0, 0, 0, 0.02);
          }

          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: var(--admin-font);
            background-color: var(--admin-bg);
            color: var(--admin-text);
            line-height: 1.5;
            display: flex;
            min-height: 100vh;
            transition: background-color 0.2s ease, color 0.2s ease;
          }

          /* Sidebar */
          .admin-sidebar {
            width: 260px;
            background: var(--admin-sidebar-bg);
            border-right: 1px solid var(--admin-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .admin-brand {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--admin-border);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--admin-text);
            text-decoration: none;
          }

          .admin-nav {
            padding: 1.5rem 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .nav-section-title {
            font-size: 0.6875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--admin-muted);
            padding: 0.5rem 0.75rem 0.25rem;
            font-weight: 700;
          }

          .admin-nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 0.875rem;
            border-radius: 0.5rem;
            color: var(--admin-muted);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.15s ease;
          }
          .admin-nav-item:hover {
            color: var(--admin-text);
            background: rgba(125, 125, 125, 0.08);
          }
          .admin-nav-item.active {
            color: #fff;
            background: var(--admin-accent);
            font-weight: 600;
          }

          .admin-footer-nav {
            padding: 1rem;
            border-top: 1px solid var(--admin-border);
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          /* Main Body */
          .admin-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .admin-topbar {
            height: 64px;
            border-bottom: 1px solid var(--admin-border);
            background: var(--admin-card-bg);
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .admin-page-title {
            font-size: 1.125rem;
            font-weight: 700;
          }

          .admin-content {
            padding: 2rem;
            flex: 1;
            overflow-y: auto;
          }

          /* Cards & UI Elements */
          .card {
            background: var(--admin-card-bg);
            border: 1px solid var(--admin-border);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: none;
            transition: opacity 0.15s, background-color 0.15s;
          }
          .btn:hover { opacity: 0.9; }

          .btn-primary { background: var(--admin-accent); color: white; }
          .btn-secondary { background: var(--admin-border); color: var(--admin-text); }
          .btn-danger { background: var(--admin-danger); color: white; }
          .btn-outline { background: transparent; border: 1px solid var(--admin-border); color: var(--admin-text); }
          .btn-outline:hover { background: rgba(125, 125, 125, 0.08); }

          .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .badge-dynamic { background: rgba(249, 115, 22, 0.15); color: var(--admin-accent); border: 1px solid rgba(249, 115, 22, 0.3); }
          .badge-static { background: rgba(100, 116, 139, 0.15); color: var(--admin-muted); border: 1px solid rgba(100, 116, 139, 0.3); }

          /* Tables */
          .admin-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }
          .admin-table th {
            text-align: left;
            padding: 0.75rem 1rem;
            color: var(--admin-muted);
            border-bottom: 1px solid var(--admin-border);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .admin-table td {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--admin-border);
            color: var(--admin-text);
          }
          .admin-table tr:hover td {
            background: var(--admin-table-hover);
          }

          /* Forms */
          .form-group {
            margin-bottom: 1.25rem;
          }
          .form-label {
            display: block;
            margin-bottom: 0.375rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--admin-text);
          }
          .form-control {
            width: 100%;
            padding: 0.625rem 0.875rem;
            background: var(--admin-input-bg);
            border: 1px solid var(--admin-border);
            border-radius: 0.375rem;
            color: var(--admin-text);
            font-size: 0.875rem;
            font-family: var(--admin-font);
            outline: none;
            transition: border-color 0.15s;
          }
          .form-control:focus {
            border-color: var(--admin-accent);
          }
          textarea.form-control {
            font-family: var(--admin-mono);
            line-height: 1.6;
          }

          /* Toast message */
          .toast-box {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 100;
            background: var(--admin-card-bg);
            border: 1px solid var(--admin-accent);
            color: var(--admin-text);
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            display: none;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          }
        ` } })
  ] }),
  /* @__PURE__ */ jsxDEV("body", { children: [
    /* @__PURE__ */ jsxDEV("aside", { class: "admin-sidebar", children: [
      /* @__PURE__ */ jsxDEV("a", { href: "/admin", class: "admin-brand", children: [
        /* @__PURE__ */ jsxDEV("span", { style: "font-size: 1.3rem", children: "⚡" }),
        /* @__PURE__ */ jsxDEV("span", { children: "Hono Admin" })
      ] }),
      /* @__PURE__ */ jsxDEV("nav", { class: "admin-nav", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "nav-section-title", children: "Overview" }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin", class: `admin-nav-item ${t === "/admin" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "📊" }),
          /* @__PURE__ */ jsxDEV("span", { children: "Dashboard" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "nav-section-title", style: "margin-top: 1rem;", children: "Content Management" }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs", class: `admin-nav-item ${t.startsWith("/admin/docs") && t !== "/admin/docs/new" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "📝" }),
          /* @__PURE__ */ jsxDEV("span", { children: "All Documents" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs/new", class: `admin-nav-item ${t === "/admin/docs/new" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "➕" }),
          /* @__PURE__ */ jsxDEV("span", { children: "New Document" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/openapi", class: `admin-nav-item ${t.startsWith("/admin/openapi") ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "📖" }),
          /* @__PURE__ */ jsxDEV("span", { children: "OpenAPI Specs" })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "admin-footer-nav", children: [
        /* @__PURE__ */ jsxDEV("a", { href: "/docs", target: "_blank", class: "admin-nav-item", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "🌐" }),
          /* @__PURE__ */ jsxDEV("span", { children: "View Public Docs ↗" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/reference", target: "_blank", class: "admin-nav-item", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "🚀" }),
          /* @__PURE__ */ jsxDEV("span", { children: "Scalar Reference ↗" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/logout", class: "admin-nav-item", style: "color: var(--admin-danger);", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "🚪" }),
          /* @__PURE__ */ jsxDEV("span", { children: "Log Out" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("main", { class: "admin-main", children: [
      /* @__PURE__ */ jsxDEV("header", { class: "admin-topbar", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "admin-page-title", children: e }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 1rem;", children: [
          /* @__PURE__ */ jsxDEV("span", { style: "font-size: 0.8125rem; color: var(--admin-muted);", children: [
            "Role: ",
            /* @__PURE__ */ jsxDEV("strong", { children: "Administrator" })
          ] }),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              id: "admin-theme-toggle",
              class: "btn btn-outline",
              style: "padding: 0.35rem 0.75rem; font-size: 0.8125rem; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.4rem;",
              title: "Toggle Dark / Light theme",
              "aria-label": "Toggle Dark / Light theme",
              children: [
                /* @__PURE__ */ jsxDEV("span", { id: "theme-icon", children: "🌓" }),
                /* @__PURE__ */ jsxDEV("span", { id: "theme-label", style: "font-size: 0.75rem;", children: "Theme" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "admin-content", children: r })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { id: "admin-toast", class: "toast-box" }),
    /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
          // Toast Notification
          function showToast(msg, isError = false) {
            const toast = document.getElementById('admin-toast');
            if (!toast) return;
            toast.innerText = msg;
            toast.style.borderColor = isError ? 'var(--admin-danger)' : 'var(--admin-success)';
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 3000);
          }

          // Dark / Light Mode Toggle
          const themeToggleBtn = document.getElementById('admin-theme-toggle');
          const themeIcon = document.getElementById('theme-icon');
          const themeLabel = document.getElementById('theme-label');

          function updateThemeUI(theme) {
            if (themeIcon) {
              themeIcon.innerText = theme === 'light' ? '☀️' : '🌙';
            }
            if (themeLabel) {
              themeLabel.innerText = theme === 'light' ? 'Light' : 'Dark';
            }
          }

          const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
          updateThemeUI(currentTheme);

          themeToggleBtn?.addEventListener('click', () => {
            const activeTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const nextTheme = activeTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', nextTheme);
            localStorage.setItem('admin_theme', nextTheme);
            localStorage.setItem('theme', nextTheme);
            updateThemeUI(nextTheme);
          });
        ` } })
  ] })
] });
function formatDate$2(r) {
  if (!r) return "Recently";
  try {
    const e = new Date(r);
    return isNaN(e.getTime()) ? r : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return r;
  }
}
const DashboardView = ({ docs: r, specs: e }) => {
  const t = r.filter((i) => i.isDynamic).length, n = r.filter((i) => !i.isDynamic).length, a = new Set(r.map((i) => i.category)).size;
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Dashboard Overview", activePath: "/admin", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "Total Articles" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;", children: r.length }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: [
          /* @__PURE__ */ jsxDEV("span", { children: [
            n,
            " static"
          ] }),
          " • ",
          /* @__PURE__ */ jsxDEV("span", { style: "color: var(--admin-accent); font-weight: 600;", children: [
            t,
            " dynamic"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "Categories" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;", children: a }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: "Organized doc sections" })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "OpenAPI Specs" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;", children: e.length }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: "Active in Scalar playground" })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "Edge Runtime" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 1.5rem; font-weight: 700; color: #10b981; margin-top: 0.5rem;", children: "Operational ⚡" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: "Cloudflare Workers + KV" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "card", style: "display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between;", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; color: var(--admin-text);", children: "Quick Operations" }),
        /* @__PURE__ */ jsxDEV("p", { style: "font-size: 0.8125rem; color: var(--admin-muted);", children: "Add new guides or manage OpenAPI document specifications." })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.75rem;", children: [
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs/new", class: "btn btn-primary", children: "➕ Create New Article" }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/openapi", class: "btn btn-secondary", children: "📖 Manage OpenAPI" })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
      /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; color: var(--admin-text); margin-bottom: 1rem;", children: "Recent Documentation Articles" }),
      /* @__PURE__ */ jsxDEV("div", { style: "overflow-x: auto;", children: /* @__PURE__ */ jsxDEV("table", { class: "admin-table", children: [
        /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
          /* @__PURE__ */ jsxDEV("th", { children: "Title" }),
          /* @__PURE__ */ jsxDEV("th", { children: "Category" }),
          /* @__PURE__ */ jsxDEV("th", { children: "Owner" }),
          /* @__PURE__ */ jsxDEV("th", { children: "Last Updated" }),
          /* @__PURE__ */ jsxDEV("th", { children: "Type" }),
          /* @__PURE__ */ jsxDEV("th", { style: "text-align: right;", children: "Action" })
        ] }) }),
        /* @__PURE__ */ jsxDEV("tbody", { children: r.slice(0, 6).map((i) => /* @__PURE__ */ jsxDEV("tr", { children: [
          /* @__PURE__ */ jsxDEV("td", { style: "font-weight: 600;", children: i.title }),
          /* @__PURE__ */ jsxDEV("td", { children: i.category }),
          /* @__PURE__ */ jsxDEV("td", { style: "color: var(--admin-muted); font-size: 0.8125rem;", children: [
            "👤 ",
            i.author || "Docs Team"
          ] }),
          /* @__PURE__ */ jsxDEV("td", { style: "color: var(--admin-muted); font-size: 0.8125rem;", children: [
            "🕒 ",
            formatDate$2(i.updatedAt)
          ] }),
          /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", { class: `badge ${i.isDynamic ? "badge-dynamic" : "badge-static"}`, children: i.isDynamic ? "Dynamic (KV)" : "Filesystem" }) }),
          /* @__PURE__ */ jsxDEV("td", { style: "text-align: right;", children: /* @__PURE__ */ jsxDEV("a", { href: `/admin/docs/edit/${encodeURIComponent(i.slug)}`, class: "btn btn-outline", style: "padding: 0.25rem 0.6rem; font-size: 0.75rem;", children: "Edit" }) })
        ] }, i.slug)) })
      ] }) })
    ] })
  ] });
};
function formatDate$1(r) {
  if (!r) return "Recently";
  try {
    const e = new Date(r);
    return isNaN(e.getTime()) ? r : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return r;
  }
}
const DocsListView = ({ docs: r }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Documentation Management", activePath: "/admin/docs", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: [
        "All Documentation Pages (",
        r.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxDEV("p", { style: "font-size: 0.875rem; color: var(--admin-muted);", children: "Manage static and dynamic documentation articles." })
    ] }),
    /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs/new", class: "btn btn-primary", children: "➕ New Document" })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "margin-bottom: 1rem;", children: /* @__PURE__ */ jsxDEV(
      "input",
      {
        type: "text",
        id: "doc-filter-input",
        class: "form-control",
        placeholder: "Filter documentation by title, slug, owner, or category..."
      }
    ) }),
    /* @__PURE__ */ jsxDEV("div", { style: "overflow-x: auto;", children: /* @__PURE__ */ jsxDEV("table", { class: "admin-table", id: "docs-table", children: [
      /* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
        /* @__PURE__ */ jsxDEV("th", { children: "Title" }),
        /* @__PURE__ */ jsxDEV("th", { children: "Category" }),
        /* @__PURE__ */ jsxDEV("th", { children: "Owner" }),
        /* @__PURE__ */ jsxDEV("th", { children: "Last Updated" }),
        /* @__PURE__ */ jsxDEV("th", { children: "Slug" }),
        /* @__PURE__ */ jsxDEV("th", { children: "Type" }),
        /* @__PURE__ */ jsxDEV("th", { style: "text-align: right;", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsxDEV("tbody", { children: r.map((e) => /* @__PURE__ */ jsxDEV("tr", { "data-search": `${e.title.toLowerCase()} ${e.category.toLowerCase()} ${e.slug.toLowerCase()} ${(e.author || "").toLowerCase()}`, children: [
        /* @__PURE__ */ jsxDEV("td", { children: [
          /* @__PURE__ */ jsxDEV("div", { style: "font-weight: 600; color: var(--admin-text);", children: e.title }),
          /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;", children: e.description || "No description provided" })
        ] }),
        /* @__PURE__ */ jsxDEV("td", { children: e.category }),
        /* @__PURE__ */ jsxDEV("td", { style: "color: var(--admin-muted); font-size: 0.8125rem; white-space: nowrap;", children: [
          "👤 ",
          e.author || "Docs Team"
        ] }),
        /* @__PURE__ */ jsxDEV("td", { style: "color: var(--admin-muted); font-size: 0.8125rem; white-space: nowrap;", children: [
          "🕒 ",
          formatDate$1(e.updatedAt)
        ] }),
        /* @__PURE__ */ jsxDEV("td", { style: "font-family: var(--admin-mono); font-size: 0.8125rem; color: var(--admin-muted);", children: /* @__PURE__ */ jsxDEV("a", { href: `/docs/${e.slug}`, target: "_blank", style: "color: var(--admin-muted); text-decoration: underline;", children: [
          "/docs/",
          e.slug,
          " ↗"
        ] }) }),
        /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", { class: `badge ${e.isDynamic ? "badge-dynamic" : "badge-static"}`, children: e.isDynamic ? "Dynamic (KV)" : "Filesystem" }) }),
        /* @__PURE__ */ jsxDEV("td", { style: "text-align: right; white-space: nowrap;", children: [
          /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/admin/docs/edit/${encodeURIComponent(e.slug)}`,
              class: "btn btn-outline",
              style: "padding: 0.25rem 0.6rem; font-size: 0.75rem; margin-right: 0.5rem;",
              children: "Edit"
            }
          ),
          e.isDynamic && /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              class: "btn btn-danger",
              style: "padding: 0.25rem 0.6rem; font-size: 0.75rem;",
              onclick: `deleteDoc('${e.slug}')`,
              children: "Delete"
            }
          )
        ] })
      ] }, e.slug)) })
    ] }) })
  ] }),
  /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
        // Search filter
        document.getElementById('doc-filter-input')?.addEventListener('input', (e) => {
          const val = e.target.value.toLowerCase().trim();
          document.querySelectorAll('#docs-table tbody tr').forEach(row => {
            const searchData = row.getAttribute('data-search') || '';
            row.style.display = searchData.includes(val) ? '' : 'none';
          });
        });

        // Delete Handler
        async function deleteDoc(slug) {
          if (!confirm('Are you sure you want to delete the document /docs/' + slug + '?')) return;
          try {
            const res = await fetch('/api/admin/docs/' + encodeURIComponent(slug), {
              method: 'DELETE'
            });
            if (res.ok) {
              showToast('Document deleted successfully!');
              setTimeout(() => window.location.reload(), 500);
            } else {
              const err = await res.json();
              alert('Failed to delete: ' + (err.message || 'Unknown error'));
            }
          } catch (e) {
            alert('Error deleting document');
          }
        }
      ` } })
] });
function formatDate(r) {
  if (!r) return "Not yet published";
  try {
    const e = new Date(r);
    return isNaN(e.getTime()) ? r : e.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return r;
  }
}
const DocEditorView = ({ doc: r, isNew: e = !1 }) => {
  const t = e ? "Create New Document" : `Edit: ${r?.title || "Document"}`, n = e ? `Write your markdown content here...

> [!NOTE]
> This is a callout note.

## Features

- Feature 1
- Feature 2

\`\`\`typescript
const example = "Hono on Cloudflare";
console.log(example);
\`\`\`
` : r?.rawContent || "";
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: t, activePath: e ? "/admin/docs/new" : "/admin/docs", children: [
    /* @__PURE__ */ jsxDEV("form", { id: "doc-editor-form", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 0.75rem;", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs", class: "btn btn-outline", children: "← Back to Docs" }),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: t }),
            !e && r?.updatedAt && /* @__PURE__ */ jsxDEV("span", { style: "font-size: 0.75rem; color: var(--admin-muted);", children: [
              "Last edited: ",
              formatDate(r.updatedAt),
              " by ",
              /* @__PURE__ */ jsxDEV("strong", { children: r.author || "Docs Team" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.75rem;", children: [
          !e && r?.slug && /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${r.slug}`,
              target: "_blank",
              class: "btn btn-outline",
              children: "Preview Public ↗"
            }
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "submit", class: "btn btn-primary", id: "save-btn", children: "💾 Save & Publish" })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
        /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--admin-text);", children: "Document Metadata" }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-title", children: "Document Title *" }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "text",
                id: "doc-title",
                name: "title",
                class: "form-control",
                placeholder: "e.g. Webhook Integration",
                value: r?.title || "",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-category", children: "Category *" }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "text",
                id: "doc-category",
                name: "category",
                class: "form-control",
                placeholder: "e.g. Guides, Getting Started, API",
                value: r?.category || "Guides",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-author", children: "Owner / Author" }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "text",
                id: "doc-author",
                name: "author",
                class: "form-control",
                placeholder: "e.g. Sarah Connor or Docs Team",
                value: r?.author || "Docs Team"
              }
            )
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-slug", children: "URL Slug *" }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "text",
                id: "doc-slug",
                name: "slug",
                class: "form-control",
                placeholder: "e.g. guides/webhook-integration",
                value: r?.slug || "",
                required: !0
              }
            ),
            /* @__PURE__ */ jsxDEV("span", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem; display: block;", children: [
              "Will be served at: ",
              /* @__PURE__ */ jsxDEV("code", { children: [
                "/docs/",
                "<slug>"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
            /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-order", children: "Sort Order" }),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "number",
                id: "doc-order",
                name: "order",
                class: "form-control",
                value: r?.order !== void 0 ? String(r.order) : "10"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "form-group", style: "margin-bottom: 0;", children: [
          /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "doc-desc", children: "Short Description (for SEO & Search)" }),
          /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "text",
              id: "doc-desc",
              name: "description",
              class: "form-control",
              placeholder: "Brief summary of this article...",
              value: r?.description || ""
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;", children: [
          /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; color: var(--admin-text);", children: "Markdown Content" }),
          /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.35rem; flex-wrap: wrap;", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('## ')", children: "H2" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('### ')", children: "H3" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertAround('**', '**')", children: "Bold" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertAround('*', '*')", children: "Italic" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertAround('```typescript\\n', '\\n```')", children: "Code" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('> [!NOTE]\\n> ')", children: "Note Alert" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('> [!TIP]\\n> ')", children: "Tip Alert" }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('> [!WARNING]\\n> ')", children: "Warning" })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; min-height: 480px;", children: [
          /* @__PURE__ */ jsxDEV("div", { style: "display: flex; flex-direction: column;", children: /* @__PURE__ */ jsxDEV(
            "textarea",
            {
              id: "doc-content",
              name: "content",
              class: "form-control",
              style: "flex: 1; resize: vertical; min-height: 450px; font-size: 0.875rem;",
              placeholder: "Type your markdown here...",
              required: !0,
              children: n
            }
          ) }),
          /* @__PURE__ */ jsxDEV("div", { style: "background: var(--admin-preview-bg); border: 1px solid var(--admin-border); border-radius: 0.375rem; padding: 1.25rem; overflow-y: auto; max-height: 600px; transition: background-color 0.2s ease, border-color 0.2s ease;", children: [
            /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; text-transform: uppercase; color: var(--admin-muted); font-weight: 700; margin-bottom: 0.75rem; border-bottom: 1px solid var(--admin-border); padding-bottom: 0.35rem;", children: "Live Preview" }),
            /* @__PURE__ */ jsxDEV("div", { id: "live-preview-container", class: "doc-prose", style: "color: var(--admin-preview-text); font-size: 0.875rem;" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("script", { src: "https://cdn.jsdelivr.net/npm/marked/marked.min.js" }),
    /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
        const contentTextarea = document.getElementById('doc-content');
        const previewContainer = document.getElementById('live-preview-container');
        const titleInput = document.getElementById('doc-title');
        const slugInput = document.getElementById('doc-slug');
        const isNewDoc = ${e ? "true" : "false"};

        if (isNewDoc) {
          titleInput?.addEventListener('input', () => {
            if (!slugInput.dataset.manual) {
              const base = titleInput.value.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-');
              const cat = (document.getElementById('doc-category')?.value || 'guides').toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-');
              slugInput.value = cat ? cat + '/' + base : base;
            }
          });
          slugInput?.addEventListener('input', () => {
            slugInput.dataset.manual = 'true';
          });
        }

        function updatePreview() {
          if (typeof marked !== 'undefined' && contentTextarea && previewContainer) {
            let md = contentTextarea.value;
            md = md.replace(/> \\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\]\\n((?:> .*\\n?)+)/gi, (_m, type, content) => {
              const clean = content.split('\\n').map(l => l.replace(/^>\\s?/, '')).join('\\n');
              return '<div style="border-left: 4px solid var(--admin-accent); background: rgba(249,115,22,0.1); padding: 0.5rem 0.75rem; border-radius: 0.35rem; margin: 1rem 0;"><strong>' + type + '</strong><br>' + clean + '</div>';
            });
            previewContainer.innerHTML = marked.parse(md);
          }
        }

        contentTextarea?.addEventListener('input', updatePreview);
        setTimeout(updatePreview, 100);

        function insertText(text) {
          if (!contentTextarea) return;
          const start = contentTextarea.selectionStart;
          const end = contentTextarea.selectionEnd;
          contentTextarea.setRangeText(text, start, end, 'end');
          updatePreview();
        }

        function insertAround(before, after) {
          if (!contentTextarea) return;
          const start = contentTextarea.selectionStart;
          const end = contentTextarea.selectionEnd;
          const selected = contentTextarea.value.substring(start, end) || 'text';
          contentTextarea.setRangeText(before + selected + after, start, end, 'end');
          updatePreview();
        }

        // Save Form Handler
        document.getElementById('doc-editor-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const saveBtn = document.getElementById('save-btn');
          if (saveBtn) saveBtn.innerText = 'Saving...';

          const title = titleInput.value.trim();
          const category = document.getElementById('doc-category').value.trim();
          const author = (document.getElementById('doc-author')?.value || 'Docs Team').trim();
          const slug = slugInput.value.trim();
          const order = parseInt(document.getElementById('doc-order').value || '10', 10);
          const description = document.getElementById('doc-desc').value.trim();
          const content = contentTextarea.value;

          const payload = { title, category, author, slug, order, description, content };

          try {
            const url = isNewDoc ? '/api/admin/docs' : '/api/admin/docs/' + encodeURIComponent(slug);
            const method = isNewDoc ? 'POST' : 'PUT';

            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              showToast('Document saved successfully!');
              setTimeout(() => {
                window.location.href = '/admin/docs';
              }, 600);
            } else {
              const err = await res.json();
              alert('Error saving document: ' + (err.error || err.message || 'Unknown error'));
              if (saveBtn) saveBtn.innerText = '💾 Save & Publish';
            }
          } catch (err) {
            alert('Failed to connect to admin API.');
            if (saveBtn) saveBtn.innerText = '💾 Save & Publish';
          }
        });
      ` } })
  ] });
}, OpenAPIEditorView = ({ spec: r, allSpecs: e }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "OpenAPI Document Management", activePath: "/admin/openapi", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: "OpenAPI Specification Editor" }),
      /* @__PURE__ */ jsxDEV("p", { style: "font-size: 0.875rem; color: var(--admin-muted);", children: "Manage OpenAPI 3.0 / 3.1 definitions rendered in the Scalar interactive playground." })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("a", { href: "/reference", target: "_blank", class: "btn btn-outline", children: "🚀 Open Scalar Playground ↗" }),
      /* @__PURE__ */ jsxDEV("a", { href: "/openapi.json", target: "_blank", class: "btn btn-outline", children: "📄 Raw JSON Spec ↗" }),
      /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-primary", id: "save-openapi-btn", children: "💾 Save OpenAPI Spec" })
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
    /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--admin-text);", children: "Specification Metadata" }),
    /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "spec-id", children: "Spec Identifier" }),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            id: "spec-id",
            class: "form-control",
            value: r.id,
            readonly: !0,
            style: "opacity: 0.7; cursor: not-allowed;"
          }
        )
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "spec-title", children: "API Title" }),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            id: "spec-title",
            class: "form-control",
            value: r.title,
            required: !0
          }
        )
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "form-group", children: [
        /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "spec-version", children: "Version" }),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            type: "text",
            id: "spec-version",
            class: "form-control",
            value: r.version,
            required: !0
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("div", { class: "form-group", style: "margin-bottom: 0;", children: [
      /* @__PURE__ */ jsxDEV("label", { class: "form-label", for: "spec-desc", children: "Description" }),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          type: "text",
          id: "spec-desc",
          class: "form-control",
          value: r.description
        }
      )
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("div", { class: "card", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 0.75rem;", children: [
        /* @__PURE__ */ jsxDEV("h3", { style: "font-size: 1rem; font-weight: 700; color: var(--admin-text);", children: "OpenAPI JSON Schema" }),
        /* @__PURE__ */ jsxDEV("span", { id: "json-status", style: "font-size: 0.75rem; color: #10b981; font-weight: 600;", children: "✓ Valid JSON" })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.5rem;", children: /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.25rem 0.6rem; font-size: 0.75rem;", id: "format-json-btn", children: "✨ Format JSON" }) })
    ] }),
    /* @__PURE__ */ jsxDEV(
      "textarea",
      {
        id: "spec-json",
        class: "form-control",
        style: "min-height: 500px; font-size: 0.875rem; font-family: var(--admin-mono); white-space: pre;",
        children: r.specJson
      }
    )
  ] }),
  /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
        const jsonTextarea = document.getElementById('spec-json');
        const jsonStatus = document.getElementById('json-status');
        const formatBtn = document.getElementById('format-json-btn');
        const saveBtn = document.getElementById('save-openapi-btn');

        function validateJSON() {
          try {
            JSON.parse(jsonTextarea.value);
            jsonStatus.innerText = '✓ Valid JSON';
            jsonStatus.style.color = '#10b981';
            return true;
          } catch (e) {
            jsonStatus.innerText = '⚠️ Invalid JSON: ' + e.message;
            jsonStatus.style.color = '#ef4444';
            return false;
          }
        }

        jsonTextarea?.addEventListener('input', validateJSON);

        formatBtn?.addEventListener('click', () => {
          try {
            const parsed = JSON.parse(jsonTextarea.value);
            jsonTextarea.value = JSON.stringify(parsed, null, 2);
            validateJSON();
            showToast('JSON formatted!');
          } catch (e) {
            alert('Cannot format invalid JSON: ' + e.message);
          }
        });

        saveBtn?.addEventListener('click', async () => {
          if (!validateJSON()) {
            alert('Please fix JSON syntax errors before saving.');
            return;
          }

          saveBtn.innerText = 'Saving...';
          const id = document.getElementById('spec-id').value;
          const title = document.getElementById('spec-title').value;
          const version = document.getElementById('spec-version').value;
          const description = document.getElementById('spec-desc').value;
          const specJson = jsonTextarea.value;

          try {
            const res = await fetch('/api/admin/openapi/' + encodeURIComponent(id), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, title, version, description, specJson })
            });

            if (res.ok) {
              showToast('OpenAPI Specification saved successfully!');
              saveBtn.innerText = '💾 Save OpenAPI Spec';
            } else {
              const err = await res.json();
              alert('Failed to save spec: ' + (err.error || 'Unknown error'));
              saveBtn.innerText = '💾 Save OpenAPI Spec';
            }
          } catch (e) {
            alert('Network error saving spec');
            saveBtn.innerText = '💾 Save OpenAPI Spec';
          }
        });
      ` } })
] }), adminViews = new Hono();
adminViews.get("/admin/login", (r) => {
  const e = r.req.query("redirect") || "/admin";
  return r.html(/* @__PURE__ */ jsxDEV(LoginView, { redirect: e }));
});
adminViews.post("/admin/login", async (r) => {
  const e = await r.req.parseBody(), t = String(e.password || ""), n = String(e.redirect || "/admin"), a = getAdminPassword(r);
  return t !== a ? r.html(/* @__PURE__ */ jsxDEV(LoginView, { error: "Invalid admin password. Please try again.", redirect: n }), 401) : (await loginAdmin(r), r.redirect(n));
});
adminViews.get("/admin/logout", (r) => (logoutAdmin(r), r.redirect("/admin/login")));
adminViews.get("/admin", async (r) => {
  const e = getStorage(r.env), t = await e.getDocs(), n = await e.getAllOpenAPISpecs();
  return r.html(/* @__PURE__ */ jsxDEV(DashboardView, { docs: t, specs: n }));
});
adminViews.get("/admin/docs", async (r) => {
  const t = await getStorage(r.env).getDocs();
  return r.html(/* @__PURE__ */ jsxDEV(DocsListView, { docs: t }));
});
adminViews.get("/admin/docs/new", (r) => r.html(/* @__PURE__ */ jsxDEV(DocEditorView, { isNew: !0 })));
adminViews.get("/admin/docs/edit/:slug{.+}", async (r) => {
  const e = decodeURIComponent(r.req.param("slug")), n = await getStorage(r.env).getDoc(e);
  return n ? r.html(/* @__PURE__ */ jsxDEV(DocEditorView, { doc: n, isNew: !1 })) : r.redirect("/admin/docs");
});
adminViews.get("/admin/openapi", async (r) => {
  const e = getStorage(r.env), t = await e.getAllOpenAPISpecs();
  let n = await e.getOpenAPISpec("main");
  return n || (n = {
    id: "main",
    title: "Hono + Scalar Documentation Platform API",
    version: "1.0.0",
    description: "Primary REST API Specification",
    specJson: JSON.stringify({
      openapi: "3.1.0",
      info: {
        title: "Hono + Scalar Documentation Platform API",
        version: "1.0.0"
      },
      paths: {}
    }, null, 2),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, await e.saveOpenAPISpec(n)), r.html(/* @__PURE__ */ jsxDEV(OpenAPIEditorView, { spec: n, allSpecs: t }));
});
const adminApi = new Hono();
adminApi.post("/api/admin/login", async (r) => {
  const t = (await r.req.json().catch(() => ({}))).password || "", n = getAdminPassword(r);
  if (t !== n)
    return r.json({ error: "Invalid admin password" }, 401);
  const a = await loginAdmin(r);
  return r.json({ success: !0, token: a });
});
adminApi.post("/api/admin/logout", (r) => (logoutAdmin(r), r.json({ success: !0 })));
adminApi.get("/api/admin/docs", async (r) => {
  const t = await getStorage(r.env).getDocs();
  return r.json(t);
});
adminApi.post("/api/admin/docs", async (r) => {
  const e = await r.req.json().catch(() => ({})), { title: t, category: n, slug: a, order: i = 10, description: s = "", content: o = "", author: c = "Docs Admin", owner: d } = e;
  if (!t || !a || !o)
    return r.json({ error: "Title, slug, and content are required" }, 400);
  const u = a.replace(/^\//, "").toLowerCase().trim(), { html: f, headings: h } = parseMarkdown(o), g = n || "Guides", x = g.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), _ = {
    slug: u,
    category: g,
    categorySlug: x,
    categoryOrder: 50,
    title: t,
    description: s,
    order: Number(i) || 10,
    rawContent: o,
    htmlContent: f,
    headings: h,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(r.env).saveDoc(_), r.json(_, 201);
});
adminApi.put("/api/admin/docs/:slug{.+}", async (r) => {
  const e = r.req.param("slug"), t = await r.req.json().catch(() => ({})), { title: n, category: a, order: i = 10, description: s = "", content: o = "", author: c = "Docs Admin", owner: d } = t;
  if (!n || !o)
    return r.json({ error: "Title and content are required" }, 400);
  const { html: u, headings: f } = parseMarkdown(o), h = a || "Guides", g = h.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), x = {
    slug: e,
    category: h,
    categorySlug: g,
    categoryOrder: 50,
    title: n,
    description: s,
    order: Number(i) || 10,
    rawContent: o,
    htmlContent: u,
    headings: f,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(r.env).saveDoc(x), r.json(x);
});
adminApi.delete("/api/admin/docs/:slug{.+}", async (r) => {
  const e = r.req.param("slug"), n = await getStorage(r.env).deleteDoc(e);
  return r.json({ success: n, slug: e });
});
adminApi.get("/api/admin/openapi", async (r) => {
  const t = await getStorage(r.env).getAllOpenAPISpecs();
  return r.json(t);
});
adminApi.put("/api/admin/openapi/:id", async (r) => {
  const e = r.req.param("id"), t = await r.req.json().catch(() => ({})), { title: n, version: a, description: i = "", specJson: s } = t;
  if (!n || !a || !s)
    return r.json({ error: "Title, version, and specJson are required" }, 400);
  try {
    JSON.parse(s);
  } catch (d) {
    return r.json({ error: `Invalid JSON syntax: ${d.message}` }, 400);
  }
  const o = {
    id: e,
    title: n,
    version: a,
    description: i,
    specJson: s,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(r.env).saveOpenAPISpec(o), r.json(o);
});
const app = new OpenAPIHono();
app.route("/", apiRouter);
app.doc("/openapi.default.json", {
  openapi: "3.1.0",
  info: {
    title: "Hono + Scalar Documentation Platform API",
    version: "1.0.0",
    description: `### Edge-Native REST API & Documentation
Welcome to the API specification generated natively via **@hono/zod-openapi** and rendered via **Scalar**.
- ⚡ **Framework**: [Hono](https://hono.dev)
- 📖 **Interactive UI**: [Scalar](https://scalar.com)
- ☁️ **Host**: Cloudflare Workers`
  },
  servers: [
    {
      url: "http://localhost:5173",
      description: "Local Dev Server"
    },
    {
      url: "https://hono-scalar-docs.your-subdomain.workers.dev",
      description: "Cloudflare Workers Production"
    }
  ]
});
app.get("/openapi.json", async (r) => {
  const t = await getStorage(r.env).getOpenAPISpec("main");
  if (t && t.specJson)
    try {
      const i = JSON.parse(t.specJson);
      if (i.paths && Object.keys(i.paths).length > 0)
        return r.json(i);
    } catch {
    }
  const a = await (await app.request("/openapi.default.json", {}, r.env)).json();
  return r.json(a);
});
app.get("/reference", scalarReference);
app.get("/reference/*", scalarReference);
app.get("/scalar", (r) => r.redirect("/reference"));
app.get("/docs/api/reference", (r) => r.redirect("/reference"));
app.use("/admin/*", adminAuthMiddleware);
app.use("/api/admin/*", adminAuthMiddleware);
app.route("/", adminViews);
app.route("/", adminApi);
app.get("/", (r) => r.html(/* @__PURE__ */ jsxDEV(HomePage, {})));
app.route("/", docsApp);
app.notFound((r) => r.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}), 404));
export {
  app as default
};
