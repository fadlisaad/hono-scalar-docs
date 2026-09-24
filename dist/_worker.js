var HtmlEscapedCallbackPhase = {
  Stringify: 1
}, raw = (n, e) => {
  const t = new String(n);
  return t.isEscaped = !0, t.callbacks = e, t;
}, escapeRe = /[&<>'"]/, stringBufferToString = async (n, e) => {
  let t = "";
  e ||= [];
  const r = await Promise.all(n);
  for (let a = r.length - 1; t += r[a], a--, !(a < 0); a--) {
    let i = r[a];
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
}, escapeToBuffer = (n, e) => {
  const t = n.search(escapeRe);
  if (t === -1) {
    e[0] += n;
    return;
  }
  let r, a, i = 0;
  for (a = t; a < n.length; a++) {
    switch (n.charCodeAt(a)) {
      case 34:
        r = "&quot;";
        break;
      case 39:
        r = "&#39;";
        break;
      case 38:
        r = "&amp;";
        break;
      case 60:
        r = "&lt;";
        break;
      case 62:
        r = "&gt;";
        break;
      default:
        continue;
    }
    e[0] += n.substring(i, a) + r, i = a + 1;
  }
  e[0] += n.substring(i, a);
}, resolveCallbackSync = (n) => {
  const e = n.callbacks;
  if (!e?.length)
    return n;
  const t = [n], r = {};
  return e.forEach((a) => a({ phase: HtmlEscapedCallbackPhase.Stringify, buffer: t, context: r })), t[0];
}, resolveCallback = async (n, e, t, r, a) => {
  typeof n == "object" && !(n instanceof String) && (n instanceof Promise || (n = n.toString()), n instanceof Promise && (n = await n));
  const i = n.callbacks;
  return i?.length ? (a ? a[0] += n : a = [n], Promise.all(i.map((o) => o({ phase: e, buffer: a, context: r }))).then(
    (o) => Promise.all(
      o.filter(Boolean).map((c) => resolveCallback(c, e, !1, r, a))
    ).then(() => a[0])
  )) : Promise.resolve(n);
}, DOM_RENDERER = /* @__PURE__ */ Symbol("RENDERER"), DOM_ERROR_HANDLER = /* @__PURE__ */ Symbol("ERROR_HANDLER"), DOM_INTERNAL_TAG = /* @__PURE__ */ Symbol("INTERNAL"), PERMALINK = /* @__PURE__ */ Symbol("PERMALINK"), setInternalTagFlag = (n) => (n[DOM_INTERNAL_TAG] = !0, n), createContextProviderFunction = (n) => ({ value: e, children: t }) => {
  if (!t)
    return;
  const r = {
    children: [
      {
        tag: setInternalTagFlag(() => {
          n.push(e);
        }),
        props: {}
      }
    ]
  };
  Array.isArray(t) ? r.children.push(...t.flat()) : r.children.push(t), r.children.push({
    tag: setInternalTagFlag(() => {
      n.pop();
    }),
    props: {}
  });
  const a = { tag: "", props: r, type: "" };
  return a[DOM_ERROR_HANDLER] = (i) => {
    throw n.pop(), i;
  }, a;
}, globalContexts = [], alsProbed = !1, asyncLocalStorage, fallbackStore, fallbackRendersInFlight = 0, warnedFallbackDefault = !1, loadAsyncLocalStorage = () => {
  if (alsProbed)
    return asyncLocalStorage;
  alsProbed = !0;
  const n = globalThis;
  let e;
  for (const t of [
    // Node.js >= 20.16, Deno, Bun, Cloudflare Workers (nodejs_compat). Property
    // access only, so bundlers don't statically resolve `node:async_hooks`.
    () => n.process?.getBuiltinModule?.("node:async_hooks")?.AsyncLocalStorage,
    // Node.js < 20.16 has no `process.getBuiltinModule`, but a CJS entrypoint
    // exposes the main module's `require` here.
    () => n.process?.mainModule?.require?.("node:async_hooks")?.AsyncLocalStorage
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
}, getContextValuesIn = (n, e) => {
  if (!n)
    return warnIfStorelessAccess(), e.values;
  let t = n.get(e);
  return t || (t = [e.values[0]], n.set(e, t)), t;
}, readContextValueIn = (n, e) => {
  if (!n)
    return warnIfStorelessAccess(), e.values.at(-1);
  const t = n.get(e);
  return t?.length ? t.at(-1) : e.values[0];
}, captureContextValues = (n) => (n ? globalContexts.filter((e) => n.has(e)) : globalContexts).map((e) => [
  e,
  readContextValueIn(n, e)
]), resumeWithContextValues = (n, e, t) => runWithRenderContext(() => {
  const r = getCurrentStore(), a = t.map(([s, o]) => {
    const c = getContextValuesIn(r, s);
    return c.push(o), c;
  }), i = () => {
    a.forEach((s) => {
      s.pop();
    });
  };
  try {
    const s = n();
    return s instanceof Promise ? s.finally(i) : (i(), s);
  } catch (s) {
    throw i(), s;
  }
}, e), runWithRenderContext = (n, e) => {
  if (getCurrentStore())
    return n();
  const t = e ?? /* @__PURE__ */ new WeakMap(), r = loadAsyncLocalStorage();
  if (r)
    return r.run(t, n);
  fallbackStore = t;
  let a;
  try {
    a = n();
  } finally {
    fallbackStore = void 0;
  }
  return !warnedFallbackDefault && a instanceof Promise && (fallbackRendersInFlight++, a = a.finally(() => {
    fallbackRendersInFlight--;
  })), a;
}, captureRenderContext = () => {
  const n = getCurrentStore(), e = captureContextValues(n);
  return (t) => resumeWithContextValues(t, n, e);
}, createContext = (n) => {
  const e = [n], t = ((r) => {
    const a = getContextValuesIn(getCurrentStore(), t);
    a.push(r.value);
    let i;
    try {
      i = r.children ? (Array.isArray(r.children) ? new JSXFragmentNode("", {}, r.children) : r.children).toString() : "";
    } catch (s) {
      throw a.pop(), s;
    }
    return i instanceof Promise ? i.finally(() => a.pop()).then((s) => raw(s, s.callbacks)) : (a.pop(), raw(i));
  });
  return t.values = e, t.Provider = t, t[DOM_RENDERER] = createContextProviderFunction(e), globalContexts.push(t), t;
}, useContext = (n) => readContextValueIn(getCurrentStore(), n), deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
}, domRenderers = {}, dataPrecedenceAttr = "data-precedence", isStylesheetLinkWithPrecedence = (n) => n.rel === "stylesheet" && "precedence" in n, shouldDeDupeByKey = (n, e) => n === "link" ? e : deDupeKeyMap[n].length > 0, toArray = (n) => Array.isArray(n) ? n : [n], metaTagMap = /* @__PURE__ */ new WeakMap(), insertIntoHead = (n, e, t, r) => ({ buffer: a, context: i }) => {
  if (!a)
    return;
  const s = metaTagMap.get(i) || {};
  metaTagMap.set(i, s);
  const o = s[n] ||= [];
  let c = !1;
  const d = deDupeKeyMap[n], u = shouldDeDupeByKey(n, r !== void 0);
  if (u) {
    e: for (const [, m] of o)
      if (!(n === "link" && !(m.rel === "stylesheet" && m[dataPrecedenceAttr] !== void 0))) {
        for (const h of d)
          if ((m?.[h] ?? null) === t?.[h]) {
            c = !0;
            break e;
          }
      }
  }
  if (c ? a[0] = a[0].replaceAll(e, "") : u || n === "link" ? o.push([e, t, r]) : o.unshift([e, t, r]), a[0].indexOf("</head>") !== -1) {
    let m;
    if (n === "link" || r !== void 0) {
      const h = [];
      m = o.map(([g, , v], A) => {
        if (v === void 0)
          return [g, Number.MAX_SAFE_INTEGER, A];
        let I = h.indexOf(v);
        return I === -1 && (h.push(v), I = h.length - 1), [g, I, A];
      }).sort((g, v) => g[1] - v[1] || g[2] - v[2]).map(([g]) => g);
    } else
      m = o.map(([h]) => h);
    m.forEach((h) => {
      a[0] = a[0].replaceAll(h, "");
    }), a[0] = a[0].replace(/(?=<\/head>)/, m.join(""));
  }
}, returnWithoutSpecialBehavior = (n, e, t) => raw(new JSXNode(n, t, toArray(e ?? [])).toString()), documentMetadataTag = (n, e, t, r) => {
  if ("itemProp" in t)
    return returnWithoutSpecialBehavior(n, e, t);
  let { precedence: a, blocking: i, ...s } = t;
  a = r ? a ?? "" : void 0, r && (s[dataPrecedenceAttr] = a);
  const o = new JSXNode(n, s, toArray(e || [])).toString();
  return o instanceof Promise ? o.then(
    (c) => raw(c, [
      ...c.callbacks || [],
      insertIntoHead(n, c, s, a)
    ])
  ) : raw(o, [insertIntoHead(n, o, s, a)]);
}, title = ({ children: n, ...e }) => {
  const t = getNameSpaceContext();
  if (t) {
    const r = useContext(t);
    if (r === "svg" || r === "head")
      return new JSXNode(
        "title",
        e,
        toArray(n ?? [])
      );
  }
  return documentMetadataTag("title", n, e, !1);
}, script = ({
  children: n,
  ...e
}) => {
  const t = getNameSpaceContext();
  return ["src", "async"].some((r) => !e[r]) || t && useContext(t) === "head" ? returnWithoutSpecialBehavior("script", n, e) : documentMetadataTag("script", n, e, !1);
}, style = ({
  children: n,
  ...e
}) => ["href", "precedence"].every((t) => t in e) ? (e["data-href"] = e.href, delete e.href, documentMetadataTag("style", n, e, !0)) : returnWithoutSpecialBehavior("style", n, e), link$1 = ({ children: n, ...e }) => ["onLoad", "onError"].some((t) => t in e) || e.rel === "stylesheet" && (!("precedence" in e) || "disabled" in e) ? returnWithoutSpecialBehavior("link", n, e) : documentMetadataTag("link", n, e, isStylesheetLinkWithPrecedence(e)), meta = ({ children: n, ...e }) => {
  const t = getNameSpaceContext();
  return t && useContext(t) === "head" ? returnWithoutSpecialBehavior("meta", n, e) : documentMetadataTag("meta", n, e, !1);
}, newJSXNode = (n, { children: e, ...t }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new JSXNode(n, t, toArray(e ?? []))
), form = (n) => (typeof n.action == "function" && (n.action = PERMALINK in n.action ? n.action[PERMALINK] : void 0), newJSXNode("form", n)), formActionableElement = (n, e) => (typeof e.formAction == "function" && (e.formAction = PERMALINK in e.formAction ? e.formAction[PERMALINK] : void 0), newJSXNode(n, e)), input = (n) => formActionableElement("input", n), button = (n) => formActionableElement("button", n);
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
]), normalizeIntrinsicElementKey = (n) => normalizeElementKeyMap.get(n) || n, invalidAttributeNameCharRe = /[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validAttributeNameCache = /* @__PURE__ */ new Set(), validAttributeNameCacheMax = 1024, invalidTagNameCharRe = /^[!?]|[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validTagNameCache = /* @__PURE__ */ new Set(), validTagNameCacheMax = 256, cacheValidName = (n, e, t) => {
  n.size >= e && n.clear(), n.add(t);
}, isValidTagName = (n) => validTagNameCache.has(n) ? !0 : typeof n != "string" ? !1 : n.length === 0 ? !0 : invalidTagNameCharRe.test(n) ? !1 : (cacheValidName(validTagNameCache, validTagNameCacheMax, n), !0), isValidAttributeName = (n) => {
  if (validAttributeNameCache.has(n))
    return !0;
  const e = n.length;
  if (e === 0)
    return !1;
  for (let t = 0; t < e; t++) {
    const r = n.charCodeAt(t);
    if (!(r >= 97 && r <= 122 || // a-z
    r >= 65 && r <= 90 || // A-Z
    r >= 48 && r <= 57 || // 0-9
    r === 45 || // -
    r === 95 || // _
    r === 46 || // .
    r === 58))
      return invalidAttributeNameCharRe.test(n) ? !1 : (cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, n), !0);
  }
  return cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, n), !0;
}, invalidStylePropertyNameCharRe = /[\s"'():;\\/\[\]{}\x00-\x1f\x7f-\x9f]/, validStylePropertyNameCache = /* @__PURE__ */ new Set(), validStylePropertyNameCacheMax = 1024, isValidStylePropertyName = (n) => {
  if (validStylePropertyNameCache.has(n))
    return !0;
  const e = n.length;
  if (e === 0)
    return !1;
  for (let t = 0; t < e; t++) {
    const r = n.charCodeAt(t);
    if (!(r >= 97 && r <= 122 || // a-z
    r >= 65 && r <= 90 || // A-Z
    r >= 48 && r <= 57 || // 0-9
    r === 45 || // -
    r === 95))
      return invalidStylePropertyNameCharRe.test(n) ? !1 : (cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, n), !0);
  }
  return cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, n), !0;
}, unsafeStyleValueCharRe = /[;"'\\/\[\](){}]/, hasUnsafeStyleValue = (n) => {
  if (!unsafeStyleValueCharRe.test(n))
    return !1;
  let e = 0;
  const t = [];
  for (let r = 0, a = n.length; r < a; r++) {
    const i = n.charCodeAt(r);
    if (i === 92) {
      if (r === a - 1)
        return !0;
      r++;
    } else if (e !== 0) {
      if (i === 10 || i === 12 || i === 13)
        return !0;
      i === e && (e = 0);
    } else if (i === 47 && n.charCodeAt(r + 1) === 42) {
      const s = n.indexOf("*/", r + 2);
      if (s === -1)
        return !0;
      r = s + 1;
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
}, styleObjectForEach = (n, e) => {
  for (const [t, r] of Object.entries(n)) {
    const a = t[0] === "-" || !/[A-Z]/.test(t) ? t : t.replace(/[A-Z]/g, (s) => `-${s.toLowerCase()}`);
    if (!isValidStylePropertyName(a))
      continue;
    if (r == null) {
      e(a, null);
      continue;
    }
    let i;
    if (typeof r == "number")
      i = a.match(
        /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
      ) ? `${r}` : `${r}px`;
    else if (typeof r == "string") {
      if (hasUnsafeStyleValue(r))
        continue;
      i = r;
    } else
      continue;
    e(a, i);
  }
}, nameSpaceContext = void 0, getNameSpaceContext = () => nameSpaceContext, toSVGAttributeName = (n) => /[A-Z]/.test(n) && // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
// Or other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
n.match(
  /^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/
) ? n.replace(/([A-Z])/g, "-$1").toLowerCase() : n, emptyTags = [
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
], resolveFunctionComponentResult = (n, e) => n.then((t) => {
  if (!Array.isArray(t) && !(t instanceof JSXNode))
    return t;
  const r = Array.isArray(t) ? t : [t], a = () => {
    const i = [""];
    return childrenToStringToBuffer(r, i), i.length === 1 ? raw(i[0], i.callbacks) : stringBufferToString(i, i.callbacks);
  };
  return e ? e(a) : runWithRenderContext(a);
}), childrenToStringToBuffer = (n, e) => {
  for (let t = 0, r = n.length; t < r; t++) {
    const a = n[t];
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
  constructor(n, e, t) {
    if (typeof n != "function" && !isValidTagName(n))
      throw new Error(`Invalid JSX tag name: ${n}`);
    this.tag = n, this.props = e, this.children = t;
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
  toStringToBuffer(n) {
    const e = this.tag, t = this.props;
    let { children: r } = this;
    n[0] += `<${e}`;
    const a = e === "svg" || nameSpaceContext && useContext(nameSpaceContext) === "svg" ? (i) => toSVGAttributeName(normalizeIntrinsicElementKey(i)) : (i) => normalizeIntrinsicElementKey(i);
    for (let [i, s] of Object.entries(t))
      if (i = a(i), !!isValidAttributeName(i) && i !== "children") {
        if (i === "style" && typeof s == "object") {
          let o = "";
          styleObjectForEach(s, (c, d) => {
            d != null && (o += `${o ? ";" : ""}${c}:${d}`);
          }), n[0] += ' style="', escapeToBuffer(o, n), n[0] += '"';
        } else if (typeof s == "string")
          n[0] += ` ${i}="`, escapeToBuffer(s, n), n[0] += '"';
        else if (s != null) if (typeof s == "number" || s.isEscaped)
          n[0] += ` ${i}="${s}"`;
        else if (typeof s == "boolean" && booleanAttributes.includes(i))
          s && (n[0] += ` ${i}=""`);
        else if (i === "dangerouslySetInnerHTML") {
          if (r.length > 0)
            throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
          r = [raw(s.__html)];
        } else if (s instanceof Promise)
          n[0] += ` ${i}="`, n.unshift('"', s);
        else if (typeof s == "function") {
          if (!i.startsWith("on") && i !== "ref")
            throw new Error(`Invalid prop '${i}' of type 'function' supplied to '${e}'.`);
        } else
          n[0] += ` ${i}="`, escapeToBuffer(s.toString(), n), n[0] += '"';
      }
    if (emptyTags.includes(e) && r.length === 0) {
      n[0] += "/>";
      return;
    }
    n[0] += ">", childrenToStringToBuffer(r, n), n[0] += `</${e}>`;
  }
}, JSXFunctionNode = class extends JSXNode {
  toStringToBuffer(n) {
    const { children: e } = this, t = { ...this.props };
    e.length && (t.children = e.length === 1 ? e[0] : e);
    const r = this.tag.call(null, t);
    typeof r == "boolean" || r == null || (r instanceof Promise ? globalContexts.length === 0 ? n.unshift("", resolveFunctionComponentResult(r)) : n.unshift("", resolveFunctionComponentResult(r, captureRenderContext())) : r instanceof JSXNode ? r.toStringToBuffer(n) : Array.isArray(r) ? childrenToStringToBuffer(r, n) : typeof r == "number" || r.isEscaped ? (n[0] += r, r.callbacks && (n.callbacks ||= [], n.callbacks.push(...r.callbacks))) : escapeToBuffer(r, n));
  }
}, JSXFragmentNode = class extends JSXNode {
  toStringToBuffer(n) {
    childrenToStringToBuffer(this.children, n);
  }
}, initDomRenderer = !1, jsxFn = (n, e, t) => {
  if (!initDomRenderer) {
    for (const r in domRenderers)
      intrinsicElementTags[r][DOM_RENDERER] = domRenderers[r];
    initDomRenderer = !0;
  }
  return typeof n == "function" ? new JSXFunctionNode(n, e, t) : intrinsicElementTags[n] ? new JSXFunctionNode(
    intrinsicElementTags[n],
    e,
    t
  ) : n === "svg" || n === "head" ? (nameSpaceContext ||= createContext(""), new JSXNode(n, e, [
    new JSXFunctionNode(
      nameSpaceContext,
      {
        value: n
      },
      t
    )
  ])) : new JSXNode(n, e, t);
};
function jsxDEV(n, e, t) {
  let r;
  if (!e || !("children" in e))
    r = jsxFn(n, e, []);
  else {
    const a = e.children;
    r = Array.isArray(a) ? jsxFn(n, e, a) : jsxFn(n, e, [a]);
  }
  return r.key = t, r;
}
function __rest(n, e) {
  var t = {};
  for (var r in n) Object.prototype.hasOwnProperty.call(n, r) && e.indexOf(r) < 0 && (t[r] = n[r]);
  if (n != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, r = Object.getOwnPropertySymbols(n); a < r.length; a++)
      e.indexOf(r[a]) < 0 && Object.prototype.propertyIsEnumerable.call(n, r[a]) && (t[r[a]] = n[r[a]]);
  return t;
}
typeof SuppressedError == "function" && SuppressedError;
function isZodType(n, e) {
  var t;
  return ((t = n?._def) === null || t === void 0 ? void 0 : t.typeName) === e;
}
function isAnyZodType(n) {
  return "_def" in n;
}
function preserveMetadataFromModifier(n, e) {
  const t = n.ZodType.prototype[e];
  n.ZodType.prototype[e] = function(...r) {
    const a = t.apply(this, r);
    return a._def.openapi = this._def.openapi, a;
  };
}
function extendZodWithOpenApi(n) {
  if (typeof n.ZodType.prototype.openapi < "u")
    return;
  n.ZodType.prototype.openapi = function(a, i) {
    var s, o, c, d, u, m;
    const h = typeof a == "string" ? i : a, g = h ?? {}, { param: v } = g, A = __rest(g, ["param"]), I = Object.assign(Object.assign({}, (s = this._def.openapi) === null || s === void 0 ? void 0 : s._internal), typeof a == "string" ? { refId: a } : void 0), N = Object.assign(Object.assign(Object.assign({}, (o = this._def.openapi) === null || o === void 0 ? void 0 : o.metadata), A), !((d = (c = this._def.openapi) === null || c === void 0 ? void 0 : c.metadata) === null || d === void 0) && d.param || v ? {
      param: Object.assign(Object.assign({}, (m = (u = this._def.openapi) === null || u === void 0 ? void 0 : u.metadata) === null || m === void 0 ? void 0 : m.param), v)
    } : void 0), b = new this.constructor(Object.assign(Object.assign({}, this._def), { openapi: Object.assign(Object.assign({}, Object.keys(I).length > 0 ? { _internal: I } : void 0), Object.keys(N).length > 0 ? { metadata: N } : void 0) }));
    if (isZodType(this, "ZodObject")) {
      const y = this.extend;
      b.extend = function(...E) {
        var _, D, L, V, F, U, W;
        const Y = y.apply(this, E);
        return Y._def.openapi = {
          _internal: {
            extendedFrom: !((D = (_ = this._def.openapi) === null || _ === void 0 ? void 0 : _._internal) === null || D === void 0) && D.refId ? { refId: (V = (L = this._def.openapi) === null || L === void 0 ? void 0 : L._internal) === null || V === void 0 ? void 0 : V.refId, schema: this } : (U = (F = this._def.openapi) === null || F === void 0 ? void 0 : F._internal) === null || U === void 0 ? void 0 : U.extendedFrom
          },
          metadata: (W = Y._def.openapi) === null || W === void 0 ? void 0 : W.metadata
        }, Y;
      };
    }
    return b;
  }, preserveMetadataFromModifier(n, "optional"), preserveMetadataFromModifier(n, "nullable"), preserveMetadataFromModifier(n, "default"), preserveMetadataFromModifier(n, "transform"), preserveMetadataFromModifier(n, "refine");
  const e = n.ZodObject.prototype.deepPartial;
  n.ZodObject.prototype.deepPartial = function() {
    const a = this._def.shape(), i = e.apply(this), s = i._def.shape();
    return Object.entries(s).forEach(([o, c]) => {
      var d, u;
      c._def.openapi = (u = (d = a[o]) === null || d === void 0 ? void 0 : d._def) === null || u === void 0 ? void 0 : u.openapi;
    }), i._def.openapi = void 0, i;
  };
  const t = n.ZodObject.prototype.pick;
  n.ZodObject.prototype.pick = function(...a) {
    const i = t.apply(this, a);
    return i._def.openapi = void 0, i;
  };
  const r = n.ZodObject.prototype.omit;
  n.ZodObject.prototype.omit = function(...a) {
    const i = r.apply(this, a);
    return i._def.openapi = void 0, i;
  };
}
function isEqual(n, e) {
  if (n == null || e === null || e === void 0)
    return n === e;
  if (n === e || n.valueOf() === e.valueOf())
    return !0;
  if (Array.isArray(n) && (!Array.isArray(e) || n.length !== e.length) || !(n instanceof Object) || !(e instanceof Object))
    return !1;
  const t = Object.keys(n);
  return Object.keys(e).every((r) => t.indexOf(r) !== -1) && t.every((r) => isEqual(n[r], e[r]));
}
class ObjectSet {
  constructor() {
    this.buckets = /* @__PURE__ */ new Map();
  }
  put(e) {
    const t = this.hashCodeOf(e), r = this.buckets.get(t);
    if (!r) {
      this.buckets.set(t, [e]);
      return;
    }
    r.some((i) => isEqual(i, e)) || r.push(e);
  }
  contains(e) {
    const t = this.hashCodeOf(e), r = this.buckets.get(t);
    return r ? r.some((a) => isEqual(a, e)) : !1;
  }
  values() {
    return [...this.buckets.values()].flat();
  }
  stats() {
    let e = 0, t = 0, r = 0;
    for (const i of this.buckets.values())
      e += 1, t += i.length, i.length > 1 && (r += 1);
    const a = e / t;
    return { totalBuckets: e, collisions: r, totalValues: t, hashEffectiveness: a };
  }
  hashCodeOf(e) {
    let t = 0;
    if (Array.isArray(e)) {
      for (let r = 0; r < e.length; r++)
        t ^= this.hashCodeOf(e[r]) * r;
      return t;
    }
    if (typeof e == "string") {
      for (let r = 0; r < e.length; r++)
        t ^= e.charCodeAt(r) * r;
      return t;
    }
    if (typeof e == "number")
      return e;
    if (typeof e == "object")
      for (const [r, a] of Object.entries(e))
        t ^= this.hashCodeOf(r) + this.hashCodeOf(a ?? "");
    return t;
  }
}
function isUndefined(n) {
  return n === void 0;
}
function mapValues(n, e) {
  const t = {};
  return Object.entries(n).forEach(([r, a]) => {
    t[r] = e(a);
  }), t;
}
function omit(n, e) {
  const t = {};
  return Object.entries(n).forEach(([r, a]) => {
    e.some((i) => i === r) || (t[r] = a);
  }), t;
}
function omitBy(n, e) {
  const t = {};
  return Object.entries(n).forEach(([r, a]) => {
    e(a, r) || (t[r] = a);
  }), t;
}
function compact(n) {
  return n.filter((e) => !isUndefined(e));
}
const objectEquals = isEqual;
function uniq(n) {
  const e = new ObjectSet();
  return n.forEach((t) => e.put(t)), [...e.values()];
}
function isString(n) {
  return typeof n == "string";
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
    const r = this.schemaWithRefId(e, t);
    return this._definitions.push({ type: "schema", schema: r }), r;
  }
  /**
   * Registers a new parameter schema under /components/parameters/${name}
   */
  registerParameter(e, t) {
    var r, a, i;
    const s = this.schemaWithRefId(e, t), o = (r = s._def.openapi) === null || r === void 0 ? void 0 : r.metadata, c = s.openapi(Object.assign(Object.assign({}, o), { param: Object.assign(Object.assign({}, o?.param), { name: (i = (a = o?.param) === null || a === void 0 ? void 0 : a.name) !== null && i !== void 0 ? i : e }) }));
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
  registerComponent(e, t, r) {
    return this._definitions.push({
      type: "component",
      componentType: e,
      name: t,
      component: r
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
function enhanceMissingParametersError(n, e) {
  try {
    return n();
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
    const r = this.unwrapChained(e), a = e._def.openapi ? e._def.openapi : r._def.openapi, i = (t = e.description) !== null && t !== void 0 ? t : r.description;
    return {
      _internal: a?._internal,
      metadata: Object.assign({ description: i }, a?.metadata)
    };
  }
  static getInternalMetadata(e) {
    const t = this.unwrapChained(e), r = e._def.openapi ? e._def.openapi : t._def.openapi;
    return r?._internal;
  }
  static getParamMetadata(e) {
    var t, r;
    const a = this.unwrapChained(e), i = e._def.openapi ? e._def.openapi : a._def.openapi, s = (t = e.description) !== null && t !== void 0 ? t : a.description;
    return {
      _internal: i?._internal,
      metadata: Object.assign(Object.assign({}, i?.metadata), {
        // A description provided from .openapi() should be taken with higher precedence
        param: Object.assign({ description: s }, (r = i?.metadata) === null || r === void 0 ? void 0 : r.param)
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
  transform(e, t, r) {
    var a, i;
    const s = e._def.type;
    return Object.assign(Object.assign({}, t("array")), { items: r(s), minItems: (a = e._def.minLength) === null || a === void 0 ? void 0 : a.value, maxItems: (i = e._def.maxLength) === null || i === void 0 ? void 0 : i.value });
  }
}
class BigIntTransformer {
  transform(e) {
    return Object.assign(Object.assign({}, e("string")), { pattern: "^d+$" });
  }
}
class DiscriminatedUnionTransformer {
  transform(e, t, r, a, i) {
    const s = [...e.options.values()], o = s.map(a);
    return t ? {
      oneOf: r(o, t)
    } : {
      oneOf: o,
      discriminator: this.mapDiscriminator(s, e.discriminator, i)
    };
  }
  mapDiscriminator(e, t, r) {
    if (e.some((i) => Metadata.getRefId(i) === void 0))
      return;
    const a = {};
    return e.forEach((i) => {
      var s;
      const o = Metadata.getRefId(i), c = (s = i.shape) === null || s === void 0 ? void 0 : s[t];
      if (isZodType(c, "ZodEnum") || isZodType(c, "ZodNativeEnum")) {
        Object.values(c.enum).filter(isString).forEach((m) => {
          a[m] = r(o);
        });
        return;
      }
      const d = c?._def.value;
      if (typeof d != "string")
        throw new Error(`Discriminator ${t} could not be found in one of the values of a discriminated union`);
      a[d] = r(o);
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
  transform(e, t, r, a) {
    const s = {
      allOf: this.flattenIntersectionTypes(e).map(a)
    };
    return t ? {
      anyOf: r([s], t)
    } : s;
  }
  flattenIntersectionTypes(e) {
    if (!isZodType(e, "ZodIntersection"))
      return [e];
    const t = this.flattenIntersectionTypes(e._def.left), r = this.flattenIntersectionTypes(e._def.right);
    return [...t, ...r];
  }
}
class LiteralTransformer {
  transform(e, t) {
    return Object.assign(Object.assign({}, t(typeof e._def.value)), { enum: [e._def.value] });
  }
}
function enumInfo(n) {
  const t = Object.keys(n).filter((i) => typeof n[n[i]] != "number").map((i) => n[i]), r = t.filter((i) => typeof i == "number").length, a = r === 0 ? "string" : r === t.length ? "numeric" : "mixed";
  return { values: t, type: a };
}
class NativeEnumTransformer {
  transform(e, t) {
    const { type: r, values: a } = enumInfo(e._def.values);
    if (r === "mixed")
      throw new ZodToOpenAPIError("Enum has mixed string and number values, please specify the OpenAPI type manually");
    return Object.assign(Object.assign({}, t(r === "numeric" ? "integer" : "string")), { enum: a });
  }
}
class NumberTransformer {
  transform(e, t, r) {
    return Object.assign(Object.assign({}, t(e.isInt ? "integer" : "number")), r(e._def.checks));
  }
}
class ObjectTransformer {
  transform(e, t, r, a) {
    var i;
    const s = (i = Metadata.getInternalMetadata(e)) === null || i === void 0 ? void 0 : i.extendedFrom, o = this.requiredKeysOf(e), c = mapValues(e._def.shape(), a);
    if (!s)
      return Object.assign(Object.assign(Object.assign(Object.assign({}, r("object")), { properties: c, default: t }), o.length > 0 ? { required: o } : {}), this.generateAdditionalProperties(e, a));
    const d = s.schema;
    a(d);
    const u = this.requiredKeysOf(d), m = mapValues(d?._def.shape(), a), h = Object.fromEntries(Object.entries(c).filter(([A, I]) => !objectEquals(m[A], I))), g = o.filter((A) => !u.includes(A)), v = Object.assign(Object.assign(Object.assign(Object.assign({}, r("object")), { default: t, properties: h }), g.length > 0 ? { required: g } : {}), this.generateAdditionalProperties(e, a));
    return {
      allOf: [
        { $ref: `#/components/schemas/${s.refId}` },
        v
      ]
    };
  }
  generateAdditionalProperties(e, t) {
    const r = e._def.unknownKeys, a = e._def.catchall;
    return isZodType(a, "ZodNever") ? r === "strict" ? { additionalProperties: !1 } : {} : { additionalProperties: t(a) };
  }
  requiredKeysOf(e) {
    return Object.entries(e._def.shape()).filter(([t, r]) => !Metadata.isOptionalSchema(r)).map(([t, r]) => t);
  }
}
class RecordTransformer {
  transform(e, t, r) {
    const a = e._def.valueType, i = e._def.keyType, s = r(a);
    if (isZodType(i, "ZodEnum") || isZodType(i, "ZodNativeEnum")) {
      const c = Object.values(i.enum).filter(isString).reduce((d, u) => Object.assign(Object.assign({}, d), { [u]: s }), {});
      return Object.assign(Object.assign({}, t("object")), { properties: c });
    }
    return Object.assign(Object.assign({}, t("object")), { additionalProperties: s });
  }
}
class StringTransformer {
  transform(e, t) {
    var r, a, i;
    const s = this.getZodStringCheck(e, "regex"), o = (r = this.getZodStringCheck(e, "length")) === null || r === void 0 ? void 0 : r.value, c = Number.isFinite(e.minLength) && (a = e.minLength) !== null && a !== void 0 ? a : void 0, d = Number.isFinite(e.maxLength) && (i = e.maxLength) !== null && i !== void 0 ? i : void 0;
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
    return e._def.checks.find((r) => r.kind === t);
  }
}
class TupleTransformer {
  constructor(e) {
    this.versionSpecifics = e;
  }
  transform(e, t, r) {
    const { items: a } = e._def, i = a.map(r);
    return Object.assign(Object.assign({}, t("array")), this.versionSpecifics.mapTupleItems(i));
  }
}
class UnionTransformer {
  transform(e, t, r) {
    const i = this.flattenUnionTypes(e).map((s) => {
      const o = this.unwrapNullable(s);
      return r(o);
    });
    return {
      anyOf: t(i)
    };
  }
  flattenUnionTypes(e) {
    return isZodType(e, "ZodUnion") ? e._def.options.flatMap((r) => this.flattenUnionTypes(r)) : [e];
  }
  unwrapNullable(e) {
    return isZodType(e, "ZodNullable") ? this.unwrapNullable(e.unwrap()) : e;
  }
}
class OpenApiTransformer {
  constructor(e) {
    this.versionSpecifics = e, this.objectTransformer = new ObjectTransformer(), this.stringTransformer = new StringTransformer(), this.numberTransformer = new NumberTransformer(), this.bigIntTransformer = new BigIntTransformer(), this.literalTransformer = new LiteralTransformer(), this.enumTransformer = new EnumTransformer(), this.nativeEnumTransformer = new NativeEnumTransformer(), this.arrayTransformer = new ArrayTransformer(), this.unionTransformer = new UnionTransformer(), this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer(), this.intersectionTransformer = new IntersectionTransformer(), this.recordTransformer = new RecordTransformer(), this.tupleTransformer = new TupleTransformer(e);
  }
  transform(e, t, r, a, i) {
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
        r
      );
    const s = this.transformSchemaWithoutDefault(e, t, r, a);
    return Object.assign(Object.assign({}, s), { default: i });
  }
  transformSchemaWithoutDefault(e, t, r, a) {
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
      return this.arrayTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), r);
    if (isZodType(e, "ZodTuple"))
      return this.tupleTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), r);
    if (isZodType(e, "ZodUnion"))
      return this.unionTransformer.transform(e, (s) => this.versionSpecifics.mapNullableOfArray(s, t), r);
    if (isZodType(e, "ZodDiscriminatedUnion"))
      return this.discriminatedUnionTransformer.transform(e, t, (s) => this.versionSpecifics.mapNullableOfArray(s, t), r, a);
    if (isZodType(e, "ZodIntersection"))
      return this.intersectionTransformer.transform(e, t, (s) => this.versionSpecifics.mapNullableOfArray(s, t), r);
    if (isZodType(e, "ZodRecord"))
      return this.recordTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, t), r);
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
    const r = {};
    return this.rawComponents.forEach(({ componentType: a, name: i, component: s }) => {
      var o;
      (o = r[a]) !== null && o !== void 0 || (r[a] = {}), r[a][i] = s;
    }), Object.assign(Object.assign({}, r), { schemas: Object.assign(Object.assign({}, (e = r.schemas) !== null && e !== void 0 ? e : {}), this.schemaRefs), parameters: Object.assign(Object.assign({}, (t = r.parameters) !== null && t !== void 0 ? t : {}), this.paramRefs) });
  }
  sortDefinitions() {
    const e = [
      "schema",
      "parameter",
      "component",
      "route"
    ];
    this.definitions.sort((t, r) => {
      if (!("type" in t))
        return "type" in r ? -1 : 0;
      if (!("type" in r))
        return 1;
      const a = e.findIndex((s) => s === t.type), i = e.findIndex((s) => s === r.type);
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
    const t = Metadata.getRefId(e), r = this.generateParameter(e);
    return t && (this.paramRefs[t] = r), r;
  }
  getParameterRef(e, t) {
    var r, a, i, s, o;
    const c = (r = e?.metadata) === null || r === void 0 ? void 0 : r.param, d = !((a = e?._internal) === null || a === void 0) && a.refId ? this.paramRefs[(i = e._internal) === null || i === void 0 ? void 0 : i.refId] : void 0;
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
    var r;
    const a = Metadata.getMetadata(e), i = (r = a?.metadata) === null || r === void 0 ? void 0 : r.param, s = this.getParameterRef(a, { in: t });
    if (s)
      return [s];
    if (isZodType(e, "ZodObject")) {
      const o = e._def.shape();
      return Object.entries(o).map(([d, u]) => {
        var m, h;
        const g = Metadata.getMetadata(u), v = this.getParameterRef(g, {
          in: t,
          name: d
        });
        if (v)
          return v;
        const A = (m = g?.metadata) === null || m === void 0 ? void 0 : m.param;
        if (A?.name && A.name !== d)
          throw new ConflictError("Conflicting names for parameter", {
            key: "name",
            values: [d, A.name]
          });
        if (A?.in && A.in !== t)
          throw new ConflictError(`Conflicting location for parameter ${(h = A.name) !== null && h !== void 0 ? h : d}`, {
            key: "in",
            values: [t, A.in]
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
    const r = Metadata.getParamMetadata(e), a = (t = r?.metadata) === null || t === void 0 ? void 0 : t.param, i = !Metadata.isOptionalSchema(e) && !e.isNullable(), s = this.generateSchemaWithRef(e);
    return Object.assign({
      schema: s,
      required: i
    }, a ? Metadata.buildParameterMetadata(a) : {});
  }
  generateParameter(e) {
    var t;
    const r = Metadata.getMetadata(e), a = (t = r?.metadata) === null || t === void 0 ? void 0 : t.param, i = a?.name, s = a?.in;
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
    const r = Metadata.unwrapChained(e), a = Metadata.getMetadata(e), i = Metadata.getDefaultValue(e), s = !((t = a?.metadata) === null || t === void 0) && t.type ? { type: a?.metadata.type } : this.toOpenAPISchema(r, e.isNullable(), i);
    return a?.metadata ? Metadata.applySchemaMetadata(s, a.metadata) : omitBy(s, isUndefined);
  }
  /**
   * Same as above but applies nullable
   */
  constructReferencedOpenAPISchema(e) {
    var t;
    const r = Metadata.getMetadata(e), a = Metadata.unwrapChained(e), i = Metadata.getDefaultValue(e), s = e.isNullable();
    return !((t = r?.metadata) === null || t === void 0) && t.type ? this.versionSpecifics.mapNullableType(r.metadata.type, s) : this.toOpenAPISchema(a, s, i);
  }
  /**
   * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
   */
  generateSimpleSchema(e) {
    var t;
    const r = Metadata.getMetadata(e), a = Metadata.getRefId(e);
    if (!a || !this.schemaRefs[a])
      return this.generateSchemaWithMetadata(e);
    const i = this.schemaRefs[a], s = {
      $ref: this.generateSchemaRef(a)
    }, o = omitBy(Metadata.buildSchemaMetadata((t = r?.metadata) !== null && t !== void 0 ? t : {}), (u, m) => u === void 0 || objectEquals(u, i[m]));
    if (o.type)
      return {
        allOf: [s, o]
      };
    const c = omitBy(this.constructReferencedOpenAPISchema(e), (u, m) => u === void 0 || objectEquals(u, i[m])), d = Metadata.applySchemaMetadata(c, o);
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
    const t = Metadata.getRefId(e), r = this.generateSimpleSchema(e);
    return t && this.schemaRefs[t] === void 0 ? (this.schemaRefs[t] = r, { $ref: this.generateSchemaRef(t) }) : r;
  }
  generateSchemaRef(e) {
    return `#/components/schemas/${e}`;
  }
  getRequestBody(e) {
    if (!e)
      return;
    const { content: t } = e, r = __rest(e, ["content"]), a = this.getBodyContent(t);
    return Object.assign(Object.assign({}, r), { content: a });
  }
  getParameters(e) {
    if (!e)
      return [];
    const { headers: t } = e, r = this.cleanParameter(e.query), a = this.cleanParameter(e.params), i = this.cleanParameter(e.cookies), s = enhanceMissingParametersError(() => r ? this.generateInlineParameters(r, "query") : [], { location: "query" }), o = enhanceMissingParametersError(() => a ? this.generateInlineParameters(a, "path") : [], { location: "path" }), c = enhanceMissingParametersError(() => i ? this.generateInlineParameters(i, "cookie") : [], { location: "cookie" }), d = enhanceMissingParametersError(() => {
      if (Array.isArray(t))
        return t.flatMap((m) => this.generateInlineParameters(m, "header"));
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
    const { method: t, path: r, request: a, responses: i } = e, s = __rest(e, ["method", "path", "request", "responses"]), o = mapValues(i, (m) => this.getResponse(m)), c = enhanceMissingParametersError(() => this.getParameters(a), { route: `${t} ${r}` }), d = this.getRequestBody(a?.body);
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
    const { content: t, headers: r } = e, a = __rest(e, ["content", "headers"]), i = t ? { content: this.getBodyContent(t) } : {};
    if (!r)
      return Object.assign(Object.assign({}, a), i);
    const s = isZodType(r, "ZodObject") ? this.getResponseHeaders(r) : (
      // This is input data so it is okay to cast in the common generator
      // since this is the user's responsibility to keep it correct
      r
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
      const { schema: r } = t, a = __rest(t, ["schema"]), i = this.generateSchemaWithRef(r);
      return Object.assign({ schema: i }, a);
    });
  }
  toOpenAPISchema(e, t, r) {
    return this.openApiTransformer.transform(e, t, (a) => this.generateSchemaWithRef(a), (a) => this.generateSchemaRef(a), r);
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
function isWebhookDefinition(n) {
  return "type" in n && n.type === "webhook";
}
class OpenApiGeneratorV31 {
  constructor(e) {
    this.definitions = e, this.webhookRefs = {};
    const t = new OpenApiGeneratorV31Specifics();
    this.generator = new OpenAPIGenerator(this.definitions, t);
  }
  generateDocument(e) {
    const t = this.generator.generateDocumentData();
    return this.definitions.filter(isWebhookDefinition).forEach((r) => this.generateSingleWebhook(r.webhook)), Object.assign(Object.assign(Object.assign({}, e), t), { webhooks: this.webhookRefs });
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
  generateSingleWebhook(e) {
    const t = this.generator.generatePath(e);
    return this.webhookRefs[e.path] = Object.assign(Object.assign({}, this.webhookRefs[e.path]), t), t;
  }
}
var splitPath = (n) => {
  const e = n.split("/");
  return e[0] === "" && e.shift(), e;
}, splitRoutingPath = (n) => {
  const { groups: e, path: t } = extractGroupsFromPath(n), r = splitPath(t);
  return replaceGroupMarks(r, e);
}, extractGroupsFromPath = (n) => {
  const e = [];
  return n = n.replace(/\{[^}]+\}/g, (t, r) => {
    const a = `@${r}`;
    return e.push([a, t]), a;
  }), { groups: e, path: n };
}, replaceGroupMarks = (n, e) => {
  for (let t = e.length - 1; t >= 0; t--) {
    const [r] = e[t];
    for (let a = n.length - 1; a >= 0; a--)
      if (n[a].includes(r)) {
        n[a] = n[a].replace(r, e[t][1]);
        break;
      }
  }
  return n;
}, patternCache = {}, getPattern = (n, e) => {
  if (n === "*")
    return "*";
  const t = n.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (t) {
    const r = `${n}#${e}`;
    return patternCache[r] || (t[2] ? patternCache[r] = e && e[0] !== ":" && e[0] !== "*" ? [r, t[1], new RegExp(`^${t[2]}(?=/${e})`)] : [n, t[1], new RegExp(`^${t[2]}$`)] : patternCache[r] = [n, t[1], !0]), patternCache[r];
  }
  return null;
}, tryDecode = (n, e) => {
  try {
    return e(n);
  } catch {
    return n.replace(/(?:%[0-9A-Fa-f]{2})+/g, (t) => {
      try {
        return e(t);
      } catch {
        return t;
      }
    });
  }
}, tryDecodeURI = (n) => tryDecode(n, decodeURI), getPath = (n) => {
  const e = n.url, t = e.indexOf("/", e.indexOf(":") + 4);
  let r = t;
  for (; r < e.length; r++) {
    const a = e.charCodeAt(r);
    if (a === 37) {
      const i = e.indexOf("?", r), s = e.indexOf("#", r), o = i === -1 ? s === -1 ? void 0 : s : s === -1 ? i : Math.min(i, s), c = e.slice(t, o);
      return tryDecodeURI(c.includes("%25") ? c.replace(/%25/g, "%2525") : c);
    } else if (a === 63 || a === 35)
      break;
  }
  return e.slice(t, r);
}, getPathNoStrict = (n) => {
  const e = getPath(n);
  return e.length > 1 && e.at(-1) === "/" ? e.slice(0, -1) : e;
}, mergePath = (n, e, ...t) => (t.length && (e = mergePath(e, ...t)), `${n?.[0] === "/" ? "" : "/"}${n}${e === "/" ? "" : `${n?.at(-1) === "/" ? "" : "/"}${e?.[0] === "/" ? e.slice(1) : e}`}`), checkOptionalParameter = (n) => {
  if (n.charCodeAt(n.length - 1) !== 63 || !n.includes(":"))
    return null;
  const e = n.split("/"), t = [];
  let r = "";
  return e.forEach((a) => {
    if (a !== "" && !/\:/.test(a))
      r += "/" + a;
    else if (/\:/.test(a))
      if (a.charCodeAt(a.length - 1) === 63) {
        t.length === 0 && r === "" ? t.push("/") : t.push(r);
        const i = a.slice(0, -1);
        r += "/" + i, t.push(r);
      } else
        r += "/" + a;
  }), t.filter((a, i, s) => s.indexOf(a) === i);
}, tryDecodeURIComponent = (n) => n.indexOf("%") !== -1 ? tryDecode(n, decodeURIComponent_) : n, _decodeURI = (n) => (n.indexOf("+") !== -1 && (n = n.replace(/\+/g, " ")), tryDecodeURIComponent(n)), _getQueryParam = (n, e, t) => {
  let r;
  if (!t && e && e.indexOf("%") === -1 && e.indexOf("+") === -1) {
    let s = n.indexOf("?", 8);
    if (s === -1)
      return;
    for (n.startsWith(e, s + 1) || (s = n.indexOf(`&${e}`, s + 1)); s !== -1; ) {
      const o = n.charCodeAt(s + e.length + 1);
      if (o === 61) {
        const c = s + e.length + 2, d = n.indexOf("&", c);
        return _decodeURI(n.slice(c, d === -1 ? void 0 : d));
      } else if (o == 38 || isNaN(o))
        return "";
      s = n.indexOf(`&${e}`, s + 1);
    }
    if (r = /[%+]/.test(n), !r)
      return;
  }
  const a = /* @__PURE__ */ Object.create(null);
  r ??= /[%+]/.test(n);
  let i = n.indexOf("?", 8);
  for (; i !== -1; ) {
    const s = n.indexOf("&", i + 1);
    let o = n.indexOf("=", i);
    o > s && s !== -1 && (o = -1);
    let c = n.slice(
      i + 1,
      o === -1 ? s === -1 ? void 0 : s : o
    );
    if (r && (c = _decodeURI(c)), i = s, c === "")
      continue;
    let d;
    o === -1 ? d = "" : (d = n.slice(o + 1, s === -1 ? void 0 : s), r && (d = _decodeURI(d))), t ? (a[c] && Array.isArray(a[c]) || (a[c] = []), a[c].push(d)) : a[c] ??= d;
  }
  return e ? a[e] : a;
}, getQueryParam = _getQueryParam, getQueryParams = (n, e) => _getQueryParam(n, e, !0), decodeURIComponent_ = decodeURIComponent, validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/, relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/, validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/, trimCookieWhitespace = (n) => {
  let e = 0, t = n.length;
  for (; e < t; ) {
    const r = n.charCodeAt(e);
    if (r !== 32 && r !== 9)
      break;
    e++;
  }
  for (; t > e; ) {
    const r = n.charCodeAt(t - 1);
    if (r !== 32 && r !== 9)
      break;
    t--;
  }
  return e === 0 && t === n.length ? n : n.slice(e, t);
}, parse$1 = (n, e) => {
  if (e && n.indexOf(e) === -1)
    return {};
  const t = n.split(";"), r = /* @__PURE__ */ Object.create(null);
  for (const a of t) {
    const i = a.indexOf("=");
    if (i === -1)
      continue;
    const s = trimCookieWhitespace(a.substring(0, i));
    if (e && e !== s || !relaxedCookieNameRegEx.test(s) || s in r)
      continue;
    let o = trimCookieWhitespace(a.substring(i + 1));
    if (o.startsWith('"') && o.endsWith('"') && (o = o.slice(1, -1)), validCookieValueRegEx.test(o) && (r[s] = tryDecodeURIComponent(o), e))
      break;
  }
  return r;
}, _serialize = (n, e, t = {}) => {
  if (!validCookieNameRegEx.test(n))
    throw new Error("Invalid cookie name");
  let r = `${n}=${e}`;
  if (n.startsWith("__Secure-") && !t.secure)
    throw new Error("__Secure- Cookie must have Secure attributes");
  if (n.startsWith("__Host-")) {
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
    r += `; Max-Age=${t.maxAge | 0}`;
  }
  if (t.domain && t.prefix !== "host" && (r += `; Domain=${t.domain}`), t.path && (r += `; Path=${t.path}`), t.expires) {
    if (t.expires.getTime() - Date.now() > 3456e7)
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    r += `; Expires=${t.expires.toUTCString()}`;
  }
  if (t.httpOnly && (r += "; HttpOnly"), t.secure && (r += "; Secure"), t.sameSite && (r += `; SameSite=${t.sameSite.charAt(0).toUpperCase() + t.sameSite.slice(1)}`), t.priority && (r += `; Priority=${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}`), t.partitioned) {
    if (!t.secure)
      throw new Error("Partitioned Cookie must have Secure attributes");
    r += "; Partitioned";
  }
  return r;
}, serialize = (n, e, t) => (e = encodeURIComponent(e), _serialize(n, e, t)), getCookie = (n, e, t) => {
  const r = n.req.raw.headers.get("Cookie");
  if (typeof e == "string") {
    if (!r)
      return;
    let i = e;
    return t === "secure" ? i = "__Secure-" + e : t === "host" && (i = "__Host-" + e), parse$1(r, i)[i];
  }
  return r ? parse$1(r) : {};
}, generateCookie = (n, e, t) => {
  let r;
  return t?.prefix === "secure" ? r = serialize("__Secure-" + n, e, { path: "/", ...t, secure: !0 }) : t?.prefix === "host" ? r = serialize("__Host-" + n, e, {
    ...t,
    path: "/",
    secure: !0,
    domain: void 0
  }) : r = serialize(n, e, { path: "/", ...t }), r;
}, setCookie = (n, e, t, r) => {
  const a = generateCookie(e, t, r);
  n.header("Set-Cookie", a, { append: !0 });
}, deleteCookie = (n, e, t) => {
  const r = getCookie(n, e, t?.prefix);
  return setCookie(n, e, "", { ...t, maxAge: 0 }), r;
}, HTTPException = class extends Error {
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(n = 500, e) {
    super(e?.message, { cause: e?.cause }), this.res = e?.res, this.status = n;
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
}, bufferToFormData = (n, e) => new Response(n, {
  headers: {
    // Normalize the media type (case-insensitive) while keeping parameters like the boundary
    "Content-Type": e.replace(/^[^;]+/, (r) => r.toLowerCase())
  }
}).formData(), jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/i, urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, validator = (n, e) => async (t, r) => {
  let a = {};
  const i = t.req.header("Content-Type");
  switch (n) {
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
  return s instanceof Response ? s : (t.req.addValidatedData(n, s), await r());
}, util;
(function(n) {
  n.assertEqual = (a) => {
  };
  function e(a) {
  }
  n.assertIs = e;
  function t(a) {
    throw new Error();
  }
  n.assertNever = t, n.arrayToEnum = (a) => {
    const i = {};
    for (const s of a)
      i[s] = s;
    return i;
  }, n.getValidEnumValues = (a) => {
    const i = n.objectKeys(a).filter((o) => typeof a[a[o]] != "number"), s = {};
    for (const o of i)
      s[o] = a[o];
    return n.objectValues(s);
  }, n.objectValues = (a) => n.objectKeys(a).map(function(i) {
    return a[i];
  }), n.objectKeys = typeof Object.keys == "function" ? (a) => Object.keys(a) : (a) => {
    const i = [];
    for (const s in a)
      Object.prototype.hasOwnProperty.call(a, s) && i.push(s);
    return i;
  }, n.find = (a, i) => {
    for (const s of a)
      if (i(s))
        return s;
  }, n.isInteger = typeof Number.isInteger == "function" ? (a) => Number.isInteger(a) : (a) => typeof a == "number" && Number.isFinite(a) && Math.floor(a) === a;
  function r(a, i = " | ") {
    return a.map((s) => typeof s == "string" ? `'${s}'` : s).join(i);
  }
  n.joinValues = r, n.jsonStringifyReplacer = (a, i) => typeof i == "bigint" ? i.toString() : i;
})(util || (util = {}));
var objectUtil;
(function(n) {
  n.mergeShapes = (e, t) => ({
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
]), getParsedType = (n) => {
  switch (typeof n) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(n) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      return Array.isArray(n) ? ZodParsedType.array : n === null ? ZodParsedType.null : n.then && typeof n.then == "function" && n.catch && typeof n.catch == "function" ? ZodParsedType.promise : typeof Map < "u" && n instanceof Map ? ZodParsedType.map : typeof Set < "u" && n instanceof Set ? ZodParsedType.set : typeof Date < "u" && n instanceof Date ? ZodParsedType.date : ZodParsedType.object;
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
    super(), this.issues = [], this.addIssue = (r) => {
      this.issues = [...this.issues, r];
    }, this.addIssues = (r = []) => {
      this.issues = [...this.issues, ...r];
    };
    const t = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, t) : this.__proto__ = t, this.name = "ZodError", this.issues = e;
  }
  format(e) {
    const t = e || function(i) {
      return i.message;
    }, r = { _errors: [] }, a = (i) => {
      for (const s of i.issues)
        if (s.code === "invalid_union")
          s.unionErrors.map(a);
        else if (s.code === "invalid_return_type")
          a(s.returnTypeError);
        else if (s.code === "invalid_arguments")
          a(s.argumentsError);
        else if (s.path.length === 0)
          r._errors.push(t(s));
        else {
          let o = r, c = 0;
          for (; c < s.path.length; ) {
            const d = s.path[c];
            c === s.path.length - 1 ? (o[d] = o[d] || { _errors: [] }, o[d]._errors.push(t(s))) : o[d] = o[d] || { _errors: [] }, o = o[d], c++;
          }
        }
    };
    return a(this), r;
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
    const t = {}, r = [];
    for (const a of this.issues)
      if (a.path.length > 0) {
        const i = a.path[0];
        t[i] = t[i] || [], t[i].push(e(a));
      } else
        r.push(e(a));
    return { formErrors: r, fieldErrors: t };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (n) => new ZodError(n);
const errorMap = (n, e) => {
  let t;
  switch (n.code) {
    case ZodIssueCode.invalid_type:
      n.received === ZodParsedType.undefined ? t = "Required" : t = `Expected ${n.expected}, received ${n.received}`;
      break;
    case ZodIssueCode.invalid_literal:
      t = `Invalid literal value, expected ${JSON.stringify(n.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      t = `Unrecognized key(s) in object: ${util.joinValues(n.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      t = "Invalid input";
      break;
    case ZodIssueCode.invalid_union_discriminator:
      t = `Invalid discriminator value. Expected ${util.joinValues(n.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      t = `Invalid enum value. Expected ${util.joinValues(n.options)}, received '${n.received}'`;
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
      typeof n.validation == "object" ? "includes" in n.validation ? (t = `Invalid input: must include "${n.validation.includes}"`, typeof n.validation.position == "number" && (t = `${t} at one or more positions greater than or equal to ${n.validation.position}`)) : "startsWith" in n.validation ? t = `Invalid input: must start with "${n.validation.startsWith}"` : "endsWith" in n.validation ? t = `Invalid input: must end with "${n.validation.endsWith}"` : util.assertNever(n.validation) : n.validation !== "regex" ? t = `Invalid ${n.validation}` : t = "Invalid";
      break;
    case ZodIssueCode.too_small:
      n.type === "array" ? t = `Array must contain ${n.exact ? "exactly" : n.inclusive ? "at least" : "more than"} ${n.minimum} element(s)` : n.type === "string" ? t = `String must contain ${n.exact ? "exactly" : n.inclusive ? "at least" : "over"} ${n.minimum} character(s)` : n.type === "number" ? t = `Number must be ${n.exact ? "exactly equal to " : n.inclusive ? "greater than or equal to " : "greater than "}${n.minimum}` : n.type === "bigint" ? t = `Number must be ${n.exact ? "exactly equal to " : n.inclusive ? "greater than or equal to " : "greater than "}${n.minimum}` : n.type === "date" ? t = `Date must be ${n.exact ? "exactly equal to " : n.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(n.minimum))}` : t = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      n.type === "array" ? t = `Array must contain ${n.exact ? "exactly" : n.inclusive ? "at most" : "less than"} ${n.maximum} element(s)` : n.type === "string" ? t = `String must contain ${n.exact ? "exactly" : n.inclusive ? "at most" : "under"} ${n.maximum} character(s)` : n.type === "number" ? t = `Number must be ${n.exact ? "exactly" : n.inclusive ? "less than or equal to" : "less than"} ${n.maximum}` : n.type === "bigint" ? t = `BigInt must be ${n.exact ? "exactly" : n.inclusive ? "less than or equal to" : "less than"} ${n.maximum}` : n.type === "date" ? t = `Date must be ${n.exact ? "exactly" : n.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(n.maximum))}` : t = "Invalid input";
      break;
    case ZodIssueCode.custom:
      t = "Invalid input";
      break;
    case ZodIssueCode.invalid_intersection_types:
      t = "Intersection results could not be merged";
      break;
    case ZodIssueCode.not_multiple_of:
      t = `Number must be a multiple of ${n.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      t = "Number must be finite";
      break;
    default:
      t = e.defaultError, util.assertNever(n);
  }
  return { message: t };
};
let overrideErrorMap = errorMap;
function getErrorMap() {
  return overrideErrorMap;
}
const makeIssue = (n) => {
  const { data: e, path: t, errorMaps: r, issueData: a } = n, i = [...t, ...a.path || []], s = {
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
  const c = r.filter((d) => !!d).slice().reverse();
  for (const d of c)
    o = d(s, { data: e, defaultError: o }).message;
  return {
    ...a,
    path: i,
    message: o
  };
};
function addIssueToContext(n, e) {
  const t = getErrorMap(), r = makeIssue({
    issueData: e,
    data: n.data,
    path: n.path,
    errorMaps: [
      n.common.contextualErrorMap,
      // contextual error map is first priority
      n.schemaErrorMap,
      // then schema-bound map if available
      t,
      // then global override map
      t === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((a) => !!a)
  });
  n.common.issues.push(r);
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
    const r = [];
    for (const a of t) {
      if (a.status === "aborted")
        return INVALID;
      a.status === "dirty" && e.dirty(), r.push(a.value);
    }
    return { status: e.value, value: r };
  }
  static async mergeObjectAsync(e, t) {
    const r = [];
    for (const a of t) {
      const i = await a.key, s = await a.value;
      r.push({
        key: i,
        value: s
      });
    }
    return ParseStatus.mergeObjectSync(e, r);
  }
  static mergeObjectSync(e, t) {
    const r = {};
    for (const a of t) {
      const { key: i, value: s } = a;
      if (i.status === "aborted" || s.status === "aborted")
        return INVALID;
      i.status === "dirty" && e.dirty(), s.status === "dirty" && e.dirty(), i.value !== "__proto__" && (typeof s.value < "u" || a.alwaysSet) && (r[i.value] = s.value);
    }
    return { status: e.value, value: r };
  }
}
const INVALID = Object.freeze({
  status: "aborted"
}), DIRTY = (n) => ({ status: "dirty", value: n }), OK = (n) => ({ status: "valid", value: n }), isAborted = (n) => n.status === "aborted", isDirty = (n) => n.status === "dirty", isValid = (n) => n.status === "valid", isAsync = (n) => typeof Promise < "u" && n instanceof Promise;
var errorUtil;
(function(n) {
  n.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, n.toString = (e) => typeof e == "string" ? e : e?.message;
})(errorUtil || (errorUtil = {}));
class ParseInputLazyPath {
  constructor(e, t, r, a) {
    this._cachedPath = [], this.parent = e, this.data = t, this._path = r, this._key = a;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const handleResult = (n, e) => {
  if (isValid(e))
    return { success: !0, data: e.value };
  if (!n.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const t = new ZodError(n.common.issues);
      return this._error = t, this._error;
    }
  };
};
function processCreateParams(n) {
  if (!n)
    return {};
  const { errorMap: e, invalid_type_error: t, required_error: r, description: a } = n;
  if (e && (t || r))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return e ? { errorMap: e, description: a } : { errorMap: (s, o) => {
    const { message: c } = n;
    return s.code === "invalid_enum_value" ? { message: c ?? o.defaultError } : typeof o.data > "u" ? { message: c ?? r ?? o.defaultError } : s.code !== "invalid_type" ? { message: o.defaultError } : { message: c ?? t ?? o.defaultError };
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
    const r = this.safeParse(e, t);
    if (r.success)
      return r.data;
    throw r.error;
  }
  safeParse(e, t) {
    const r = {
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
    }, a = this._parseSync({ data: e, path: r.path, parent: r });
    return handleResult(r, a);
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
        const r = this._parseSync({ data: e, path: [], parent: t });
        return isValid(r) ? {
          value: r.value
        } : {
          issues: t.common.issues
        };
      } catch (r) {
        r?.message?.toLowerCase()?.includes("encountered") && (this["~standard"].async = !0), t.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: e, path: [], parent: t }).then((r) => isValid(r) ? {
      value: r.value
    } : {
      issues: t.common.issues
    });
  }
  async parseAsync(e, t) {
    const r = await this.safeParseAsync(e, t);
    if (r.success)
      return r.data;
    throw r.error;
  }
  async safeParseAsync(e, t) {
    const r = {
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
    }, a = this._parse({ data: e, path: r.path, parent: r }), i = await (isAsync(a) ? a : Promise.resolve(a));
    return handleResult(r, i);
  }
  refine(e, t) {
    const r = (a) => typeof t == "string" || typeof t > "u" ? { message: t } : typeof t == "function" ? t(a) : t;
    return this._refinement((a, i) => {
      const s = e(a), o = () => i.addIssue({
        code: ZodIssueCode.custom,
        ...r(a)
      });
      return typeof Promise < "u" && s instanceof Promise ? s.then((c) => c ? !0 : (o(), !1)) : s ? !0 : (o(), !1);
    });
  }
  refinement(e, t) {
    return this._refinement((r, a) => e(r) ? !0 : (a.addIssue(typeof t == "function" ? t(r, a) : t), !1));
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
function timeRegexSource(n) {
  let e = "[0-5]\\d";
  n.precision ? e = `${e}\\.\\d{${n.precision}}` : n.precision == null && (e = `${e}(\\.\\d+)?`);
  const t = n.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${e})${t}`;
}
function timeRegex(n) {
  return new RegExp(`^${timeRegexSource(n)}$`);
}
function datetimeRegex(n) {
  let e = `${dateRegexSource}T${timeRegexSource(n)}`;
  const t = [];
  return t.push(n.local ? "Z?" : "Z"), n.offset && t.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${t.join("|")})`, new RegExp(`^${e}$`);
}
function isValidIP(n, e) {
  return !!((e === "v4" || !e) && ipv4Regex.test(n) || (e === "v6" || !e) && ipv6Regex.test(n));
}
function isValidJWT(n, e) {
  if (!jwtRegex.test(n))
    return !1;
  try {
    const [t] = n.split(".");
    if (!t)
      return !1;
    const r = t.replace(/-/g, "+").replace(/_/g, "/").padEnd(t.length + (4 - t.length % 4) % 4, "="), a = JSON.parse(atob(r));
    return !(typeof a != "object" || a === null || "typ" in a && a?.typ !== "JWT" || !a.alg || e && a.alg !== e);
  } catch {
    return !1;
  }
}
function isValidCidr(n, e) {
  return !!((e === "v4" || !e) && ipv4CidrRegex.test(n) || (e === "v6" || !e) && ipv6CidrRegex.test(n));
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
    const r = new ParseStatus();
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
        }), r.dirty());
      else if (i.kind === "max")
        e.data.length > i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          code: ZodIssueCode.too_big,
          maximum: i.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: i.message
        }), r.dirty());
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
        }), r.dirty());
      } else if (i.kind === "email")
        emailRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "email",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "emoji")
        emojiRegex || (emojiRegex = new RegExp(_emojiRegex, "u")), emojiRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "emoji",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "uuid")
        uuidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "uuid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "nanoid")
        nanoidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "nanoid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "cuid")
        cuidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "cuid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "cuid2")
        cuid2Regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "cuid2",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "ulid")
        ulidRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
          validation: "ulid",
          code: ZodIssueCode.invalid_string,
          message: i.message
        }), r.dirty());
      else if (i.kind === "url")
        try {
          new URL(e.data);
        } catch {
          a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: i.message
          }), r.dirty();
        }
      else i.kind === "regex" ? (i.regex.lastIndex = 0, i.regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "regex",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty())) : i.kind === "trim" ? e.data = e.data.trim() : i.kind === "includes" ? e.data.includes(i.value, i.position) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { includes: i.value, position: i.position },
        message: i.message
      }), r.dirty()) : i.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : i.kind === "toUpperCase" ? e.data = e.data.toUpperCase() : i.kind === "startsWith" ? e.data.startsWith(i.value) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { startsWith: i.value },
        message: i.message
      }), r.dirty()) : i.kind === "endsWith" ? e.data.endsWith(i.value) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: { endsWith: i.value },
        message: i.message
      }), r.dirty()) : i.kind === "datetime" ? datetimeRegex(i).test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "datetime",
        message: i.message
      }), r.dirty()) : i.kind === "date" ? dateRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "date",
        message: i.message
      }), r.dirty()) : i.kind === "time" ? timeRegex(i).test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.invalid_string,
        validation: "time",
        message: i.message
      }), r.dirty()) : i.kind === "duration" ? durationRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "duration",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : i.kind === "ip" ? isValidIP(e.data, i.version) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "ip",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : i.kind === "jwt" ? isValidJWT(e.data, i.alg) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "jwt",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : i.kind === "cidr" ? isValidCidr(e.data, i.version) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "cidr",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : i.kind === "base64" ? base64Regex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "base64",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : i.kind === "base64url" ? base64urlRegex.test(e.data) || (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        validation: "base64url",
        code: ZodIssueCode.invalid_string,
        message: i.message
      }), r.dirty()) : util.assertNever(i);
    return { status: r.value, value: e.data };
  }
  _regex(e, t, r) {
    return this.refinement((a) => e.test(a), {
      validation: t,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(r)
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
ZodString.create = (n) => new ZodString({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodString,
  coerce: n?.coerce ?? !1,
  ...processCreateParams(n)
});
function floatSafeRemainder(n, e) {
  const t = (n.toString().split(".")[1] || "").length, r = (e.toString().split(".")[1] || "").length, a = t > r ? t : r, i = Number.parseInt(n.toFixed(a).replace(".", "")), s = Number.parseInt(e.toFixed(a).replace(".", ""));
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
    let r;
    const a = new ParseStatus();
    for (const i of this._def.checks)
      i.kind === "int" ? util.isInteger(e.data) || (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: "integer",
        received: "float",
        message: i.message
      }), a.dirty()) : i.kind === "min" ? (i.inclusive ? e.data < i.value : e.data <= i.value) && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.too_small,
        minimum: i.value,
        type: "number",
        inclusive: i.inclusive,
        exact: !1,
        message: i.message
      }), a.dirty()) : i.kind === "max" ? (i.inclusive ? e.data > i.value : e.data >= i.value) && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.too_big,
        maximum: i.value,
        type: "number",
        inclusive: i.inclusive,
        exact: !1,
        message: i.message
      }), a.dirty()) : i.kind === "multipleOf" ? floatSafeRemainder(e.data, i.value) !== 0 && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.not_multiple_of,
        multipleOf: i.value,
        message: i.message
      }), a.dirty()) : i.kind === "finite" ? Number.isFinite(e.data) || (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
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
  setLimit(e, t, r, a) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: t,
          inclusive: r,
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
    for (const r of this._def.checks) {
      if (r.kind === "finite" || r.kind === "int" || r.kind === "multipleOf")
        return !0;
      r.kind === "min" ? (t === null || r.value > t) && (t = r.value) : r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    }
    return Number.isFinite(t) && Number.isFinite(e);
  }
}
ZodNumber.create = (n) => new ZodNumber({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodNumber,
  coerce: n?.coerce || !1,
  ...processCreateParams(n)
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
    let r;
    const a = new ParseStatus();
    for (const i of this._def.checks)
      i.kind === "min" ? (i.inclusive ? e.data < i.value : e.data <= i.value) && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.too_small,
        type: "bigint",
        minimum: i.value,
        inclusive: i.inclusive,
        message: i.message
      }), a.dirty()) : i.kind === "max" ? (i.inclusive ? e.data > i.value : e.data >= i.value) && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
        code: ZodIssueCode.too_big,
        type: "bigint",
        maximum: i.value,
        inclusive: i.inclusive,
        message: i.message
      }), a.dirty()) : i.kind === "multipleOf" ? e.data % i.value !== BigInt(0) && (r = this._getOrReturnCtx(e, r), addIssueToContext(r, {
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
  setLimit(e, t, r, a) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: t,
          inclusive: r,
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
ZodBigInt.create = (n) => new ZodBigInt({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodBigInt,
  coerce: n?.coerce ?? !1,
  ...processCreateParams(n)
});
class ZodBoolean extends ZodType {
  _parse(e) {
    if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== ZodParsedType.boolean) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: r.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodBoolean.create = (n) => new ZodBoolean({
  typeName: ZodFirstPartyTypeKind.ZodBoolean,
  coerce: n?.coerce || !1,
  ...processCreateParams(n)
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
    const r = new ParseStatus();
    let a;
    for (const i of this._def.checks)
      i.kind === "min" ? e.data.getTime() < i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.too_small,
        message: i.message,
        inclusive: !0,
        exact: !1,
        minimum: i.value,
        type: "date"
      }), r.dirty()) : i.kind === "max" ? e.data.getTime() > i.value && (a = this._getOrReturnCtx(e, a), addIssueToContext(a, {
        code: ZodIssueCode.too_big,
        message: i.message,
        inclusive: !0,
        exact: !1,
        maximum: i.value,
        type: "date"
      }), r.dirty()) : util.assertNever(i);
    return {
      status: r.value,
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
ZodDate.create = (n) => new ZodDate({
  checks: [],
  coerce: n?.coerce || !1,
  typeName: ZodFirstPartyTypeKind.ZodDate,
  ...processCreateParams(n)
});
class ZodSymbol extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.symbol) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: r.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodSymbol.create = (n) => new ZodSymbol({
  typeName: ZodFirstPartyTypeKind.ZodSymbol,
  ...processCreateParams(n)
});
class ZodUndefined extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.undefined) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: r.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodUndefined.create = (n) => new ZodUndefined({
  typeName: ZodFirstPartyTypeKind.ZodUndefined,
  ...processCreateParams(n)
});
class ZodNull extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.null) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: r.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodNull.create = (n) => new ZodNull({
  typeName: ZodFirstPartyTypeKind.ZodNull,
  ...processCreateParams(n)
});
class ZodAny extends ZodType {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodAny.create = (n) => new ZodAny({
  typeName: ZodFirstPartyTypeKind.ZodAny,
  ...processCreateParams(n)
});
class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodUnknown.create = (n) => new ZodUnknown({
  typeName: ZodFirstPartyTypeKind.ZodUnknown,
  ...processCreateParams(n)
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
ZodNever.create = (n) => new ZodNever({
  typeName: ZodFirstPartyTypeKind.ZodNever,
  ...processCreateParams(n)
});
class ZodVoid extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.undefined) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: r.parsedType
      }), INVALID;
    }
    return OK(e.data);
  }
}
ZodVoid.create = (n) => new ZodVoid({
  typeName: ZodFirstPartyTypeKind.ZodVoid,
  ...processCreateParams(n)
});
class ZodArray extends ZodType {
  _parse(e) {
    const { ctx: t, status: r } = this._processInputParams(e), a = this._def;
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
      }), r.dirty());
    }
    if (a.minLength !== null && t.data.length < a.minLength.value && (addIssueToContext(t, {
      code: ZodIssueCode.too_small,
      minimum: a.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.minLength.message
    }), r.dirty()), a.maxLength !== null && t.data.length > a.maxLength.value && (addIssueToContext(t, {
      code: ZodIssueCode.too_big,
      maximum: a.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.maxLength.message
    }), r.dirty()), t.common.async)
      return Promise.all([...t.data].map((s, o) => a.type._parseAsync(new ParseInputLazyPath(t, s, t.path, o)))).then((s) => ParseStatus.mergeArray(r, s));
    const i = [...t.data].map((s, o) => a.type._parseSync(new ParseInputLazyPath(t, s, t.path, o)));
    return ParseStatus.mergeArray(r, i);
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
ZodArray.create = (n, e) => new ZodArray({
  type: n,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: ZodFirstPartyTypeKind.ZodArray,
  ...processCreateParams(e)
});
function deepPartialify(n) {
  if (n instanceof ZodObject) {
    const e = {};
    for (const t in n.shape) {
      const r = n.shape[t];
      e[t] = ZodOptional.create(deepPartialify(r));
    }
    return new ZodObject({
      ...n._def,
      shape: () => e
    });
  } else return n instanceof ZodArray ? new ZodArray({
    ...n._def,
    type: deepPartialify(n.element)
  }) : n instanceof ZodOptional ? ZodOptional.create(deepPartialify(n.unwrap())) : n instanceof ZodNullable ? ZodNullable.create(deepPartialify(n.unwrap())) : n instanceof ZodTuple ? ZodTuple.create(n.items.map((e) => deepPartialify(e))) : n;
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
    const { status: r, ctx: a } = this._processInputParams(e), { shape: i, keys: s } = this._getCached(), o = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip"))
      for (const d in a.data)
        s.includes(d) || o.push(d);
    const c = [];
    for (const d of s) {
      const u = i[d], m = a.data[d];
      c.push({
        key: { status: "valid", value: d },
        value: u._parse(new ParseInputLazyPath(a, m, a.path, d)),
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
        }), r.dirty());
      else if (d !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const d = this._def.catchall;
      for (const u of o) {
        const m = a.data[u];
        c.push({
          key: { status: "valid", value: u },
          value: d._parse(
            new ParseInputLazyPath(a, m, a.path, u)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: u in a.data
        });
      }
    }
    return a.common.async ? Promise.resolve().then(async () => {
      const d = [];
      for (const u of c) {
        const m = await u.key, h = await u.value;
        d.push({
          key: m,
          value: h,
          alwaysSet: u.alwaysSet
        });
      }
      return d;
    }).then((d) => ParseStatus.mergeObjectSync(r, d)) : ParseStatus.mergeObjectSync(r, c);
  }
  get shape() {
    return this._def.shape();
  }
  strict(e) {
    return errorUtil.errToObj, new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...e !== void 0 ? {
        errorMap: (t, r) => {
          const a = this._def.errorMap?.(t, r).message ?? r.defaultError;
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
    for (const r of util.objectKeys(e))
      e[r] && this.shape[r] && (t[r] = this.shape[r]);
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  omit(e) {
    const t = {};
    for (const r of util.objectKeys(this.shape))
      e[r] || (t[r] = this.shape[r]);
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
    for (const r of util.objectKeys(this.shape)) {
      const a = this.shape[r];
      e && !e[r] ? t[r] = a : t[r] = a.optional();
    }
    return new ZodObject({
      ...this._def,
      shape: () => t
    });
  }
  required(e) {
    const t = {};
    for (const r of util.objectKeys(this.shape))
      if (e && !e[r])
        t[r] = this.shape[r];
      else {
        let i = this.shape[r];
        for (; i instanceof ZodOptional; )
          i = i._def.innerType;
        t[r] = i;
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
ZodObject.create = (n, e) => new ZodObject({
  shape: () => n,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.strictCreate = (n, e) => new ZodObject({
  shape: () => n,
  unknownKeys: "strict",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.lazycreate = (n, e) => new ZodObject({
  shape: n,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
class ZodUnion extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), r = this._def.options;
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
      return Promise.all(r.map(async (i) => {
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
      for (const c of r) {
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
ZodUnion.create = (n, e) => new ZodUnion({
  options: n,
  typeName: ZodFirstPartyTypeKind.ZodUnion,
  ...processCreateParams(e)
});
function mergeValues(n, e) {
  const t = getParsedType(n), r = getParsedType(e);
  if (n === e)
    return { valid: !0, data: n };
  if (t === ZodParsedType.object && r === ZodParsedType.object) {
    const a = util.objectKeys(e), i = util.objectKeys(n).filter((o) => a.indexOf(o) !== -1), s = { ...n, ...e };
    for (const o of i) {
      const c = mergeValues(n[o], e[o]);
      if (!c.valid)
        return { valid: !1 };
      s[o] = c.data;
    }
    return { valid: !0, data: s };
  } else if (t === ZodParsedType.array && r === ZodParsedType.array) {
    if (n.length !== e.length)
      return { valid: !1 };
    const a = [];
    for (let i = 0; i < n.length; i++) {
      const s = n[i], o = e[i], c = mergeValues(s, o);
      if (!c.valid)
        return { valid: !1 };
      a.push(c.data);
    }
    return { valid: !0, data: a };
  } else return t === ZodParsedType.date && r === ZodParsedType.date && +n == +e ? { valid: !0, data: n } : { valid: !1 };
}
class ZodIntersection extends ZodType {
  _parse(e) {
    const { status: t, ctx: r } = this._processInputParams(e), a = (i, s) => {
      if (isAborted(i) || isAborted(s))
        return INVALID;
      const o = mergeValues(i.value, s.value);
      return o.valid ? ((isDirty(i) || isDirty(s)) && t.dirty(), { status: t.value, value: o.data }) : (addIssueToContext(r, {
        code: ZodIssueCode.invalid_intersection_types
      }), INVALID);
    };
    return r.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      }),
      this._def.right._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      })
    ]).then(([i, s]) => a(i, s)) : a(this._def.left._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }), this._def.right._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }));
  }
}
ZodIntersection.create = (n, e, t) => new ZodIntersection({
  left: n,
  right: e,
  typeName: ZodFirstPartyTypeKind.ZodIntersection,
  ...processCreateParams(t)
});
class ZodTuple extends ZodType {
  _parse(e) {
    const { status: t, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== ZodParsedType.array)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: r.parsedType
      }), INVALID;
    if (r.data.length < this._def.items.length)
      return addIssueToContext(r, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), INVALID;
    !this._def.rest && r.data.length > this._def.items.length && (addIssueToContext(r, {
      code: ZodIssueCode.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), t.dirty());
    const i = [...r.data].map((s, o) => {
      const c = this._def.items[o] || this._def.rest;
      return c ? c._parse(new ParseInputLazyPath(r, s, r.path, o)) : null;
    }).filter((s) => !!s);
    return r.common.async ? Promise.all(i).then((s) => ParseStatus.mergeArray(t, s)) : ParseStatus.mergeArray(t, i);
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
ZodTuple.create = (n, e) => {
  if (!Array.isArray(n))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new ZodTuple({
    items: n,
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
    const { status: t, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== ZodParsedType.object)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: r.parsedType
      }), INVALID;
    const a = [], i = this._def.keyType, s = this._def.valueType;
    for (const o in r.data)
      a.push({
        key: i._parse(new ParseInputLazyPath(r, o, r.path, o)),
        value: s._parse(new ParseInputLazyPath(r, r.data[o], r.path, o)),
        alwaysSet: o in r.data
      });
    return r.common.async ? ParseStatus.mergeObjectAsync(t, a) : ParseStatus.mergeObjectSync(t, a);
  }
  get element() {
    return this._def.valueType;
  }
  static create(e, t, r) {
    return t instanceof ZodType ? new ZodRecord({
      keyType: e,
      valueType: t,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(r)
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
    const { status: t, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== ZodParsedType.map)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: r.parsedType
      }), INVALID;
    const a = this._def.keyType, i = this._def.valueType, s = [...r.data.entries()].map(([o, c], d) => ({
      key: a._parse(new ParseInputLazyPath(r, o, r.path, [d, "key"])),
      value: i._parse(new ParseInputLazyPath(r, c, r.path, [d, "value"]))
    }));
    if (r.common.async) {
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
ZodMap.create = (n, e, t) => new ZodMap({
  valueType: e,
  keyType: n,
  typeName: ZodFirstPartyTypeKind.ZodMap,
  ...processCreateParams(t)
});
class ZodSet extends ZodType {
  _parse(e) {
    const { status: t, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== ZodParsedType.set)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: r.parsedType
      }), INVALID;
    const a = this._def;
    a.minSize !== null && r.data.size < a.minSize.value && (addIssueToContext(r, {
      code: ZodIssueCode.too_small,
      minimum: a.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: a.minSize.message
    }), t.dirty()), a.maxSize !== null && r.data.size > a.maxSize.value && (addIssueToContext(r, {
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
    const o = [...r.data.values()].map((c, d) => i._parse(new ParseInputLazyPath(r, c, r.path, d)));
    return r.common.async ? Promise.all(o).then((c) => s(c)) : s(o);
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
ZodSet.create = (n, e) => new ZodSet({
  valueType: n,
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
    function r(o, c) {
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
          throw d.addIssue(r(c, g)), d;
        }), m = await Reflect.apply(s, this, u);
        return await o._def.returns._def.type.parseAsync(m, i).catch((g) => {
          throw d.addIssue(a(m, g)), d;
        });
      });
    } else {
      const o = this;
      return OK(function(...c) {
        const d = o._def.args.safeParse(c, i);
        if (!d.success)
          throw new ZodError([r(c, d.error)]);
        const u = Reflect.apply(s, this, d.data), m = o._def.returns.safeParse(u, i);
        if (!m.success)
          throw new ZodError([a(u, m.error)]);
        return m.data;
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
  static create(e, t, r) {
    return new ZodFunction({
      args: e || ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: t || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(r)
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
ZodLazy.create = (n, e) => new ZodLazy({
  getter: n,
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
ZodLiteral.create = (n, e) => new ZodLiteral({
  value: n,
  typeName: ZodFirstPartyTypeKind.ZodLiteral,
  ...processCreateParams(e)
});
function createZodEnum(n, e) {
  return new ZodEnum({
    values: n,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(e)
  });
}
class ZodEnum extends ZodType {
  _parse(e) {
    if (typeof e.data != "string") {
      const t = this._getOrReturnCtx(e), r = this._def.values;
      return addIssueToContext(t, {
        expected: util.joinValues(r),
        received: t.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(e.data)) {
      const t = this._getOrReturnCtx(e), r = this._def.values;
      return addIssueToContext(t, {
        received: t.data,
        code: ZodIssueCode.invalid_enum_value,
        options: r
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
    return ZodEnum.create(this.options.filter((r) => !e.includes(r)), {
      ...this._def,
      ...t
    });
  }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
  _parse(e) {
    const t = util.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(e);
    if (r.parsedType !== ZodParsedType.string && r.parsedType !== ZodParsedType.number) {
      const a = util.objectValues(t);
      return addIssueToContext(r, {
        expected: util.joinValues(a),
        received: r.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(util.getValidEnumValues(this._def.values))), !this._cache.has(e.data)) {
      const a = util.objectValues(t);
      return addIssueToContext(r, {
        received: r.data,
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
ZodNativeEnum.create = (n, e) => new ZodNativeEnum({
  values: n,
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
    const r = t.parsedType === ZodParsedType.promise ? t.data : Promise.resolve(t.data);
    return OK(r.then((a) => this._def.type.parseAsync(a, {
      path: t.path,
      errorMap: t.common.contextualErrorMap
    })));
  }
}
ZodPromise.create = (n, e) => new ZodPromise({
  type: n,
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
    const { status: t, ctx: r } = this._processInputParams(e), a = this._def.effect || null, i = {
      addIssue: (s) => {
        addIssueToContext(r, s), s.fatal ? t.abort() : t.dirty();
      },
      get path() {
        return r.path;
      }
    };
    if (i.addIssue = i.addIssue.bind(i), a.type === "preprocess") {
      const s = a.transform(r.data, i);
      if (r.common.async)
        return Promise.resolve(s).then(async (o) => {
          if (t.value === "aborted")
            return INVALID;
          const c = await this._def.schema._parseAsync({
            data: o,
            path: r.path,
            parent: r
          });
          return c.status === "aborted" ? INVALID : c.status === "dirty" || t.value === "dirty" ? DIRTY(c.value) : c;
        });
      {
        if (t.value === "aborted")
          return INVALID;
        const o = this._def.schema._parseSync({
          data: s,
          path: r.path,
          parent: r
        });
        return o.status === "aborted" ? INVALID : o.status === "dirty" || t.value === "dirty" ? DIRTY(o.value) : o;
      }
    }
    if (a.type === "refinement") {
      const s = (o) => {
        const c = a.refinement(o, i);
        if (r.common.async)
          return Promise.resolve(c);
        if (c instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return o;
      };
      if (r.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return o.status === "aborted" ? INVALID : (o.status === "dirty" && t.dirty(), s(o.value), { status: t.value, value: o.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((o) => o.status === "aborted" ? INVALID : (o.status === "dirty" && t.dirty(), s(o.value).then(() => ({ status: t.value, value: o.value }))));
    }
    if (a.type === "transform")
      if (r.common.async === !1) {
        const s = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!isValid(s))
          return INVALID;
        const o = a.transform(s.value, i);
        if (o instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: t.value, value: o };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((s) => isValid(s) ? Promise.resolve(a.transform(s.value, i)).then((o) => ({
          status: t.value,
          value: o
        })) : INVALID);
    util.assertNever(a);
  }
}
ZodEffects.create = (n, e, t) => new ZodEffects({
  schema: n,
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  effect: e,
  ...processCreateParams(t)
});
ZodEffects.createWithPreprocess = (n, e, t) => new ZodEffects({
  schema: e,
  effect: { type: "preprocess", transform: n },
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
ZodOptional.create = (n, e) => new ZodOptional({
  innerType: n,
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
ZodNullable.create = (n, e) => new ZodNullable({
  innerType: n,
  typeName: ZodFirstPartyTypeKind.ZodNullable,
  ...processCreateParams(e)
});
class ZodDefault extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e);
    let r = t.data;
    return t.parsedType === ZodParsedType.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
      data: r,
      path: t.path,
      parent: t
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (n, e) => new ZodDefault({
  innerType: n,
  typeName: ZodFirstPartyTypeKind.ZodDefault,
  defaultValue: typeof e.default == "function" ? e.default : () => e.default,
  ...processCreateParams(e)
});
class ZodCatch extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), r = {
      ...t,
      common: {
        ...t.common,
        issues: []
      }
    }, a = this._def.innerType._parse({
      data: r.data,
      path: r.path,
      parent: {
        ...r
      }
    });
    return isAsync(a) ? a.then((i) => ({
      status: "valid",
      value: i.status === "valid" ? i.value : this._def.catchValue({
        get error() {
          return new ZodError(r.common.issues);
        },
        input: r.data
      })
    })) : {
      status: "valid",
      value: a.status === "valid" ? a.value : this._def.catchValue({
        get error() {
          return new ZodError(r.common.issues);
        },
        input: r.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (n, e) => new ZodCatch({
  innerType: n,
  typeName: ZodFirstPartyTypeKind.ZodCatch,
  catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
  ...processCreateParams(e)
});
class ZodNaN extends ZodType {
  _parse(e) {
    if (this._getType(e) !== ZodParsedType.nan) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: r.parsedType
      }), INVALID;
    }
    return { status: "valid", value: e.data };
  }
}
ZodNaN.create = (n) => new ZodNaN({
  typeName: ZodFirstPartyTypeKind.ZodNaN,
  ...processCreateParams(n)
});
class ZodBranded extends ZodType {
  _parse(e) {
    const { ctx: t } = this._processInputParams(e), r = t.data;
    return this._def.type._parse({
      data: r,
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
    const { status: t, ctx: r } = this._processInputParams(e);
    if (r.common.async)
      return (async () => {
        const i = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return i.status === "aborted" ? INVALID : i.status === "dirty" ? (t.dirty(), DIRTY(i.value)) : this._def.out._parseAsync({
          data: i.value,
          path: r.path,
          parent: r
        });
      })();
    {
      const a = this._def.in._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      });
      return a.status === "aborted" ? INVALID : a.status === "dirty" ? (t.dirty(), {
        status: "dirty",
        value: a.value
      }) : this._def.out._parseSync({
        data: a.value,
        path: r.path,
        parent: r
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
    const t = this._def.innerType._parse(e), r = (a) => (isValid(a) && (a.value = Object.freeze(a.value)), a);
    return isAsync(t) ? t.then((a) => r(a)) : r(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (n, e) => new ZodReadonly({
  innerType: n,
  typeName: ZodFirstPartyTypeKind.ZodReadonly,
  ...processCreateParams(e)
});
function custom(n, e = {}, t) {
  return ZodAny.create();
}
var ZodFirstPartyTypeKind;
(function(n) {
  n.ZodString = "ZodString", n.ZodNumber = "ZodNumber", n.ZodNaN = "ZodNaN", n.ZodBigInt = "ZodBigInt", n.ZodBoolean = "ZodBoolean", n.ZodDate = "ZodDate", n.ZodSymbol = "ZodSymbol", n.ZodUndefined = "ZodUndefined", n.ZodNull = "ZodNull", n.ZodAny = "ZodAny", n.ZodUnknown = "ZodUnknown", n.ZodNever = "ZodNever", n.ZodVoid = "ZodVoid", n.ZodArray = "ZodArray", n.ZodObject = "ZodObject", n.ZodUnion = "ZodUnion", n.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", n.ZodIntersection = "ZodIntersection", n.ZodTuple = "ZodTuple", n.ZodRecord = "ZodRecord", n.ZodMap = "ZodMap", n.ZodSet = "ZodSet", n.ZodFunction = "ZodFunction", n.ZodLazy = "ZodLazy", n.ZodLiteral = "ZodLiteral", n.ZodEnum = "ZodEnum", n.ZodEffects = "ZodEffects", n.ZodNativeEnum = "ZodNativeEnum", n.ZodOptional = "ZodOptional", n.ZodNullable = "ZodNullable", n.ZodDefault = "ZodDefault", n.ZodCatch = "ZodCatch", n.ZodPromise = "ZodPromise", n.ZodBranded = "ZodBranded", n.ZodPipeline = "ZodPipeline", n.ZodReadonly = "ZodReadonly";
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
var zValidator = (n, e, t) => (
  // @ts-expect-error not typed well
  validator(n, async (r, a) => {
    let i = r;
    if (n === "header" && e instanceof ZodObject) {
      const o = Object.keys(e.shape), c = Object.fromEntries(
        o.map((d) => [d.toLowerCase(), d])
      );
      i = Object.fromEntries(
        Object.entries(r).map(([d, u]) => [c[d] || d, u])
      );
    }
    const s = await e.safeParseAsync(i);
    if (t) {
      const o = await t({ data: i, ...s, target: n }, a);
      if (o) {
        if (o instanceof Response)
          return o;
        if ("response" in o)
          return o.response;
      }
    }
    return s.success ? s.data : a.json(s, 400);
  })
), compose = (n, e, t) => (r, a) => {
  let i = -1;
  return s(0);
  async function s(o) {
    if (o <= i)
      throw new Error("next() called multiple times");
    i = o;
    let c, d = !1, u;
    if (n[o] ? (u = n[o][0][0], r.req.routeIndex = o) : u = o === n.length && a || void 0, u)
      try {
        c = await u(r, () => s(o + 1));
      } catch (m) {
        if (m instanceof Error && e)
          r.error = m, c = await e(m, r), d = !0;
        else
          throw m;
      }
    else
      r.finalized === !1 && t && (c = await t(r));
    return c && (r.finalized === !1 || d) && (r.res = c), r;
  }
}, GET_MATCH_RESULT = /* @__PURE__ */ Symbol(), isRawRequest = (n) => "headers" in n, parseBody = async (n, e = /* @__PURE__ */ Object.create(null)) => {
  const { all: t = !1, dot: r = !1 } = e, s = (isRawRequest(n) ? n.headers : n.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  return s === "multipart/form-data" || s === "application/x-www-form-urlencoded" ? parseFormData(n, { all: t, dot: r }) : {};
};
async function parseFormData(n, e) {
  if (!isRawRequest(n) && n.bodyCache.formData)
    return convertFormDataToBodyData(
      await n.bodyCache.formData,
      e
    );
  const t = isRawRequest(n) ? n.headers : n.raw.headers, r = await n.arrayBuffer(), a = bufferToFormData(r, t.get("Content-Type") || "");
  isRawRequest(n) || (n.bodyCache.formData = a);
  const i = await a;
  return i ? convertFormDataToBodyData(i, e) : {};
}
function convertFormDataToBodyData(n, e) {
  const t = /* @__PURE__ */ Object.create(null);
  return n.forEach((r, a) => {
    e.all || a.endsWith("[]") ? handleParsingAllValues(t, a, r) : t[a] = r;
  }), e.dot && Object.entries(t).forEach(([r, a]) => {
    r.includes(".") && (handleParsingNestedValues(t, r, a), delete t[r]);
  }), t;
}
var handleParsingAllValues = (n, e, t) => {
  n[e] !== void 0 ? Array.isArray(n[e]) ? n[e].push(t) : n[e] = [n[e], t] : e.endsWith("[]") ? n[e] = [t] : n[e] = t;
}, handleParsingNestedValues = (n, e, t) => {
  if (/(?:^|\.)__proto__\./.test(e))
    return;
  let r = n;
  const a = e.split(".");
  a.forEach((i, s) => {
    s === a.length - 1 ? r[i] = t : ((!r[i] || typeof r[i] != "object" || Array.isArray(r[i]) || r[i] instanceof File) && (r[i] = /* @__PURE__ */ Object.create(null)), r = r[i]);
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
  constructor(n, e = "/", t = [[]]) {
    this.raw = n, this.path = e, this.#e = t;
  }
  param(n) {
    return n ? this.#n(n) : this.#i();
  }
  #n(n) {
    const e = this.#e[0][this.routeIndex][1][n], t = this.#r(e);
    return t && tryDecodeURIComponent(t);
  }
  #i() {
    const n = {}, e = Object.keys(this.#e[0][this.routeIndex][1]);
    for (const t of e) {
      const r = this.#r(this.#e[0][this.routeIndex][1][t]);
      r !== void 0 && (n[t] = tryDecodeURIComponent(r));
    }
    return n;
  }
  #r(n) {
    return this.#e[1] ? this.#e[1][n] : n;
  }
  query(n) {
    return getQueryParam(this.url, n);
  }
  queries(n) {
    return getQueryParams(this.url, n);
  }
  header(n) {
    if (n)
      return this.raw.headers.get(n) ?? void 0;
    const e = /* @__PURE__ */ Object.create(null);
    return this.raw.headers.forEach((t, r) => {
      e[r] = t;
    }), e;
  }
  async parseBody(n) {
    return parseBody(this, n);
  }
  #a = (n) => {
    const { bodyCache: e, raw: t } = this, r = e[n];
    if (r)
      return r;
    for (const a in e)
      return e[a].then((i) => (a === "json" && (i = JSON.stringify(i)), new Response(i)[n]()));
    return e[n] = t[n]();
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
    return this.#a("text").then((n) => JSON.parse(n));
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
    return this.#a("arrayBuffer").then((n) => new Uint8Array(n));
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
  addValidatedData(n, e) {
    (this.#t ??= {})[n] = e;
  }
  valid(n) {
    return this.#t?.[n];
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
    return this.#e[0].map(([[, n]]) => n);
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
    return this.#e[0].map(([[, n]]) => n)[this.routeIndex].path;
  }
}, TEXT_PLAIN = "text/plain; charset=UTF-8", setDefaultContentType = (n, e) => ({
  "Content-Type": n,
  ...e
}), createResponseInstance = (n, e) => new Response(n, e), Context = class {
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
  #n;
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
  #r;
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
  constructor(n, e) {
    this.#t = n, e && (this.#r = e.executionCtx, this.env = e.env, this.#c = e.notFoundHandler, this.#p = e.path, this.#u = e.matchResult);
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
    if (this.#r && "respondWith" in this.#r)
      return this.#r;
    throw Error("This context has no FetchEvent");
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#r)
      return this.#r;
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
  set res(n) {
    if (this.#a && n) {
      n = createResponseInstance(n.body, n);
      for (const [e, t] of this.#a.headers.entries())
        if (e !== "content-type")
          if (e === "set-cookie") {
            const r = this.#a.headers.getSetCookie();
            n.headers.delete("set-cookie");
            for (const a of r)
              n.headers.append("set-cookie", a);
          } else
            n.headers.set(e, t);
    }
    this.#a = n, this.finalized = !0;
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
  render = (...n) => (this.#l ??= (e) => this.html(e), this.#l(...n));
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (n) => this.#d = n;
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
  setRenderer = (n) => {
    this.#l = n;
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
  header = (n, e, t) => {
    this.finalized && (this.#a = createResponseInstance(this.#a.body, this.#a));
    const r = this.#a ? this.#a.headers : this.#o ??= new Headers();
    e === void 0 ? r.delete(n) : t?.append ? r.append(n, e) : r.set(n, e);
  };
  status = (n) => {
    this.#i = n;
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
  set = (n, e) => {
    this.#n ??= /* @__PURE__ */ new Map(), this.#n.set(n, e);
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
  get = (n) => this.#n ? this.#n.get(n) : void 0;
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
    return this.#n ? Object.fromEntries(this.#n) : {};
  }
  #s(n, e, t) {
    let r = this.#a ? new Headers(this.#a.headers) : this.#o;
    if (typeof e == "object" && e.headers) {
      r ??= new Headers();
      for (const [i, s] of new Headers(e.headers))
        i === "set-cookie" ? r.append(i, s) : r.set(i, s);
    }
    if (t) {
      if (!r) {
        let i = 0;
        for (const s in t)
          if (++i > 1 || typeof t[s] != "string") {
            r = new Headers();
            break;
          }
      }
      if (r)
        for (const i in t) {
          const s = t[i];
          if (typeof s == "string")
            r.set(i, s);
          else {
            r.delete(i);
            for (const o of s)
              r.append(i, o);
          }
        }
    }
    const a = typeof e == "number" ? e : e?.status ?? this.#i;
    return createResponseInstance(n, {
      status: a,
      headers: r ?? t
    });
  }
  newResponse = (...n) => this.#s(...n);
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
  body = (n, e, t) => this.#s(n, e, t);
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
  text = (n, e, t) => !this.#o && !this.#i && !e && !t && !this.finalized ? new Response(n) : this.#s(
    n,
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
  json = (n, e, t) => this.#s(
    JSON.stringify(n),
    e,
    setDefaultContentType("application/json", t)
  );
  html = (n, e, t) => {
    const r = (a) => this.#s(a, e, setDefaultContentType("text/html; charset=UTF-8", t));
    return typeof n == "object" ? resolveCallback(n, HtmlEscapedCallbackPhase.Stringify, !1, {}).then(r) : r(n);
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
  redirect = (n, e) => {
    const t = String(n);
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
}, COMPOSED_HANDLER = "__COMPOSED_HANDLER", notFoundHandler = (n) => n.text("404 Not Found", 404), errorHandler = (n, e) => {
  if ("getResponse" in n) {
    const t = n.getResponse();
    return e.newResponse(t.body, t);
  }
  return console.error(n), e.text("Internal Server Error", 500);
}, Hono$1 = class De {
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
    const { strict: r, ...a } = e;
    Object.assign(this, a), this.getPath = r ?? !0 ? e.getPath ?? getPath : getPathNoStrict;
  }
  #e() {
    const e = new De({
      router: this.router,
      getPath: this.getPath
    });
    return e.errorHandler = this.errorHandler, e.#n = this.#n, e.routes = this.routes, e;
  }
  #n = notFoundHandler;
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
    const r = this.basePath(e);
    return t.routes.map((a) => {
      let i;
      t.errorHandler === errorHandler ? i = a.handler : (i = async (s, o) => (await compose([], t.errorHandler)(s, () => a.handler(s, o))).res, i[COMPOSED_HANDLER] = a.handler), r.#i(a.method, a.path, i, a.basePath);
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
  notFound = (e) => (this.#n = e, this);
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
  mount(e, t, r) {
    let a, i;
    r && (typeof r == "function" ? i = r : (i = r.optionHandler, r.replaceRequest === !1 ? a = (c) => c : a = r.replaceRequest));
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
        const m = new URL(u.url);
        return m.pathname = this.getPath(u).slice(d) || "/", new Request(m, u);
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
  #i(e, t, r, a) {
    e = e.toUpperCase(), t = mergePath(this._basePath, t);
    const i = {
      basePath: a !== void 0 ? mergePath(this._basePath, a) : this._basePath,
      path: t,
      method: e,
      handler: r
    };
    this.router.add(e, t, [r, i]), this.routes.push(i);
  }
  #r(e, t) {
    if (e instanceof Error)
      return this.errorHandler(e, t);
    throw e;
  }
  #a(e, t, r, a) {
    if (a === "HEAD")
      return (async () => new Response(null, await this.#a(e, t, r, "GET")))();
    const i = this.getPath(e, { env: r }), s = this.router.match(a, i), o = new Context(e, {
      path: i,
      matchResult: s,
      env: r,
      executionCtx: t,
      notFoundHandler: this.#n
    });
    if (s[0].length === 1) {
      let d;
      try {
        d = s[0][0][0][0](o, async () => {
          o.res = await this.#n(o);
        });
      } catch (u) {
        return this.#r(u, o);
      }
      return d instanceof Promise ? d.then(
        (u) => u || (o.finalized ? o.res : this.#n(o))
      ).catch((u) => this.#r(u, o)) : d ?? this.#n(o);
    }
    const c = compose(s[0], this.errorHandler, this.#n);
    return (async () => {
      try {
        const d = await c(o);
        if (!d.finalized)
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        return d.res;
      } catch (d) {
        return this.#r(d, o);
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
  request = (e, t, r, a) => e instanceof Request ? this.fetch(t ? new Request(e, t) : e, r, a) : (e = e.toString(), this.fetch(
    new Request(
      /^https?:\/\//.test(e) ? e : `http://localhost${mergePath("/", e)}`,
      t
    ),
    r,
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
function match(n, e) {
  const t = this.buildAllMatchers(), r = ((a, i) => {
    const s = t[a] || t[METHOD_NAME_ALL], o = s[2][i];
    if (o)
      return o;
    const c = i.match(s[0]);
    if (!c)
      return [[], emptyParam];
    const d = c.indexOf("", 1);
    return [s[1][d], c];
  });
  return this.match = r, r(n, e);
}
var LABEL_REG_EXP_STR = "[^/]+", ONLY_WILDCARD_REG_EXP_STR = ".*", TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)", PATH_ERROR = /* @__PURE__ */ Symbol(), regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(n, e) {
  return n.length === 1 ? e.length === 1 ? n < e ? -1 : 1 : -1 : e.length === 1 ? 1 : n === ONLY_WILDCARD_REG_EXP_STR || n === TAIL_WILDCARD_REG_EXP_STR ? e === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1 : e === ONLY_WILDCARD_REG_EXP_STR || e === TAIL_WILDCARD_REG_EXP_STR ? -1 : n === LABEL_REG_EXP_STR ? 1 : e === LABEL_REG_EXP_STR ? -1 : n.length === e.length ? n < e ? -1 : 1 : e.length - n.length;
}
var Node$1 = class Ce {
  // handler index of a dynamic path, or -1 for a static path terminal
  #t;
  #e;
  #n = /* @__PURE__ */ Object.create(null);
  insert(e, t, r, a, i) {
    let s = this;
    for (let o = 0, c = e.length; o < c; o++) {
      const d = e[o], u = d.length === 1 ? d === "*" ? o === c - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : d === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : d.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let m;
      if (u) {
        const h = u[1];
        let g = u[2] || LABEL_REG_EXP_STR;
        if (h && u[2] && (g === ".*" || (g = g.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(g)) || g.length === 1 && regExpMetaChars.has(g)))
          throw PATH_ERROR;
        if (m = s.#n[g], !m) {
          if (g !== ONLY_WILDCARD_REG_EXP_STR && g !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const v in s.#n)
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (g.length > 1 || v.length > 1) && v !== ONLY_WILDCARD_REG_EXP_STR && v !== TAIL_WILDCARD_REG_EXP_STR
              )
                throw PATH_ERROR;
          }
          m = s.#n[g] = new Ce();
        }
        h !== "" && (m.#e ??= a.varIndex++, r.push([h, m.#e]));
      } else if (m = s.#n[d], !m) {
        for (const h in s.#n)
          if (h.length > 1 && h !== ONLY_WILDCARD_REG_EXP_STR && h !== TAIL_WILDCARD_REG_EXP_STR)
            throw PATH_ERROR;
        m = s.#n[d] = new Ce();
      }
      s = m;
    }
    if (s.#t !== void 0)
      throw PATH_ERROR;
    s.#t = i ? -1 : t;
  }
  buildRegExpStr() {
    const t = Object.keys(this.#n).sort(compareKey).map((r) => {
      const a = this.#n[r], i = a.buildRegExpStr();
      return i === "" ? "" : (typeof a.#e == "number" ? `(${r})@${a.#e}` : regExpMetaChars.has(r) ? `\\${r}` : r) + i;
    }).filter(Boolean);
    return typeof this.#t == "number" && this.#t !== -1 && t.unshift(`#${this.#t}`), t.length === 0 ? "" : t.length === 1 ? t[0] : "(?:" + t.join("|") + ")";
  }
}, Trie = class {
  #t = { varIndex: 0 };
  #e = new Node$1();
  #n = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(n, e) {
    if (e) {
      this.#e.insert(n.split(""), 0, [], this.#t, !0);
      return;
    }
    const t = [], r = [];
    let a = n;
    for (let s = 0; ; ) {
      let o = !1;
      if (a = a.replace(/\{[^}]+\}/g, (c) => {
        const d = `@\\${s}`;
        return r[s] = [d, c], s++, o = !0, d;
      }), !o)
        break;
    }
    const i = a.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let s = r.length - 1; s >= 0; s--) {
      const [o] = r[s];
      for (let c = i.length - 1; c >= 0; c--)
        if (i[c].indexOf(o) !== -1) {
          i[c] = i[c].replace(o, r[s][1]);
          break;
        }
    }
    this.#e.insert(i, this.#n, t, this.#t, !1), this.paths[n] = [this.#n++, t];
  }
  buildRegExp() {
    let n = this.#e.buildRegExpStr();
    if (n === "")
      return [/^$/, [], []];
    let e = 0;
    const t = [], r = [];
    return n = n.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, i, s) => i !== void 0 ? (t[++e] = Number(i), "$()") : (s !== void 0 && (r[Number(s)] = ++e), "")), [new RegExp(`^${n}`), t, r];
  }
}, wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(n) {
  return wildcardRegExpCache[n] ??= new RegExp(
    n === "*" ? "" : `^${n.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (e, t) => t ? `\\${t}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function findMiddleware(n, e) {
  if (n) {
    for (const t of Object.keys(n).sort((r, a) => a.length - r.length))
      if (buildWildcardRegExp(t).test(e))
        return [...n[t]];
  }
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #t;
  #e;
  #n;
  constructor() {
    this.#t = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) }, this.#e = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) }, this.#n = { [METHOD_NAME_ALL]: new Trie() };
  }
  #i(n, e) {
    try {
      this.#n[n].insert(e, !/\*|\/:/.test(e));
    } catch (t) {
      throw t === PATH_ERROR ? new UnsupportedPathError(e) : t;
    }
  }
  add(n, e, t) {
    const r = this.#t, a = this.#e;
    if (!r || !a)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    r[n] || (this.#n[n] = new Trie(), [r, a].forEach((o) => {
      o[n] = /* @__PURE__ */ Object.create(null), Object.keys(o[METHOD_NAME_ALL]).forEach((c) => {
        o[n][c] = [...o[METHOD_NAME_ALL][c]], this.#i(n, c);
      });
    })), e === "/*" && (e = "*");
    const i = (e.match(/\/:/g) || []).length;
    if (/\*$/.test(e)) {
      const o = buildWildcardRegExp(e);
      Object.keys(r).forEach((c) => {
        (n === METHOD_NAME_ALL || n === c) && !r[c][e] && (this.#i(c, e), r[c][e] = findMiddleware(r[c], e) || findMiddleware(r[METHOD_NAME_ALL], e) || []);
      }), Object.keys(r).forEach((c) => {
        (n === METHOD_NAME_ALL || n === c) && Object.keys(r[c]).forEach((d) => {
          o.test(d) && r[c][d].push([t, i]);
        });
      }), Object.keys(a).forEach((c) => {
        (n === METHOD_NAME_ALL || n === c) && Object.keys(a[c]).forEach(
          (d) => o.test(d) && a[c][d].push([t, i])
        );
      });
      return;
    }
    const s = checkOptionalParameter(e) || [e];
    for (let o = 0, c = s.length; o < c; o++) {
      const d = s[o];
      Object.keys(a).forEach((u) => {
        (n === METHOD_NAME_ALL || n === u) && (a[u][d] || (this.#i(u, d), a[u][d] = [
          ...findMiddleware(r[u], d) || findMiddleware(r[METHOD_NAME_ALL], d) || []
        ]), a[u][d].push([t, i - c + o + 1]));
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const n = /* @__PURE__ */ Object.create(null);
    return Object.keys(this.#e).concat(Object.keys(this.#t)).forEach((e) => {
      n[e] ||= this.#r(e);
    }), this.#t = this.#e = this.#n = void 0, clearWildcardRegExpCache(), n;
  }
  #r(n) {
    const e = this.#t[n], t = this.#e[n], r = this.#n[n], a = /* @__PURE__ */ Object.create(null), i = [];
    [e, t].forEach((u) => {
      for (const m in u) {
        const h = u[m], g = r.paths[m];
        if (!g) {
          a[m] = [h.map(([A]) => [A, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const v = g[1];
        i[g[0]] = h.map(([A, I]) => {
          const N = /* @__PURE__ */ Object.create(null);
          for (I -= 1; I >= 0; I--) {
            const [b, y] = v[I];
            N[b] = y;
          }
          return [A, N];
        });
      }
    });
    const [s, o, c] = r.buildRegExp();
    for (let u = 0, m = i.length; u < m; u++)
      for (let h = 0, g = i[u].length; h < g; h++) {
        const v = i[u][h]?.[1];
        if (!v)
          continue;
        const A = Object.keys(v);
        for (let I = 0, N = A.length; I < N; I++)
          v[A[I]] = c[v[A[I]]];
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
  constructor(n) {
    this.#t = n.routers;
  }
  add(n, e, t) {
    if (!this.#e)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#e.push([n, e, t]);
  }
  match(n, e) {
    if (!this.#e)
      throw new Error("Fatal error");
    const t = this.#t, r = this.#e, a = t.length;
    let i = 0, s;
    for (; i < a; i++) {
      const o = t[i];
      try {
        for (let c = 0, d = r.length; c < d; c++)
          o.add(...r[c]);
        s = o.match(n, e);
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
  #n = [];
  #i;
  #r = emptyParams;
  insert(e, t, r) {
    let a = this;
    const i = splitRoutingPath(t), s = /* @__PURE__ */ new Set();
    let o = 0;
    for (const c of i) {
      const d = i[++o], u = getPattern(c, d) || (d === void 0 && c && c.indexOf("*") === c.length - 1 ? c : null), m = Array.isArray(u), h = m ? u[0] : u || c, g = a.#e[h] ||= new Re();
      u && !g.#i && (g.#i = u, a.#n.push(g)), a = g, m && s.add(u[1]);
    }
    a.#t.push({
      [e]: {
        handler: r,
        possibleKeys: [...s],
        score: ++order
      }
    });
  }
  #a(e, t, r, a, i) {
    for (let s = 0, o = t.#t.length; s < o; s++) {
      const c = t.#t[s], d = c[r] || c[METHOD_NAME_ALL];
      if (d) {
        d.params = /* @__PURE__ */ Object.create(null), e.push(d);
        for (let u = 0, m = d.possibleKeys.length; u < m; u++) {
          const h = d.possibleKeys[u];
          d.params[h] = i?.[h] && !u ? i[h] : a[h] ?? i?.[h];
        }
      }
    }
  }
  search(e, t) {
    const r = [];
    this.#r = emptyParams;
    let i = [this];
    const s = splitPath(t), o = [], c = s.length;
    let d = null;
    for (let u = 0; u < c; u++) {
      const m = s[u], h = u === c - 1, g = [];
      for (let A = 0, I = i.length; A < I; A++) {
        const N = i[A], b = N.#e[m];
        b && (b.#r = N.#r, h ? (b.#e["*"] && this.#a(r, b.#e["*"], e, N.#r), this.#a(r, b, e, N.#r)) : g.push(b));
        for (const y of N.#n) {
          const E = y.#i, _ = N.#r === emptyParams ? {} : { ...N.#r };
          if (typeof E == "string") {
            (E === "*" || m.startsWith(E.slice(0, -1))) && (this.#a(r, y, e, N.#r), E === "*" && (y.#r = _, g.push(y)));
            continue;
          }
          const [, D, L] = E;
          if (!(!m && L === !0)) {
            if (L !== !0) {
              if (!d) {
                d = [];
                let U = t[0] === "/" ? 1 : 0;
                for (let W = 0; W < c; W++)
                  d[W] = U, U += s[W].length + 1;
              }
              const V = t.slice(d[u]), F = L.exec(V);
              if (F) {
                _[D] = F[0], this.#a(r, y, e, N.#r, _), F[0].length === V.length && y.#e["*"] && this.#a(
                  r,
                  y.#e["*"],
                  e,
                  N.#r,
                  _
                );
                for (const U in y.#e) {
                  y.#r = _;
                  const W = F[0].match(/\//g)?.length ?? 0;
                  (o[W] ||= []).push(y);
                  break;
                }
                continue;
              }
            }
            (L === !0 || L.test(m)) && (_[D] = m, h ? (this.#a(r, y, e, _, N.#r), y.#e["*"] && this.#a(
              r,
              y.#e["*"],
              e,
              _,
              N.#r
            )) : (y.#r = _, g.push(y)));
          }
        }
      }
      const v = o.shift();
      i = v ? g.concat(v) : g;
    }
    return r[1] && r.sort((u, m) => u.score - m.score), [r.map(({ handler: u, params: m }) => [u, m])];
  }
}, TrieRouter = class {
  name = "TrieRouter";
  #t = new Node();
  add(n, e, t) {
    for (const r of checkOptionalParameter(e) || [e])
      this.#t.insert(n, r, t);
  }
  match(n, e) {
    return this.#t.search(n, e);
  }
}, Hono = class extends Hono$1 {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(n = {}) {
    super(n), this.router = n.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, OpenAPIHono = class Ee extends Hono {
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
  openapi = ({ middleware: e, ...t }, r, a = this.defaultHook) => {
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
              const m = async (h, g) => {
                if (h.req.header("content-type") && isJSONContentType(h.req.header("content-type")))
                  return await u(h, g);
                h.req.addValidatedData("json", {}), await g();
              };
              i.push(m);
            }
          }
          if (isFormContentType(c)) {
            const u = zValidator("form", d, a);
            if (t.request?.body?.required)
              i.push(u);
            else {
              const m = async (h, g) => {
                if (h.req.header("content-type") && isFormContentType(h.req.header("content-type")))
                  return await u(h, g);
                h.req.addValidatedData("form", {}), await g();
              };
              i.push(m);
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
      r
    ), this;
  };
  getOpenAPIDocument = (e) => {
    const r = new OpenApiGeneratorV3(this.openAPIRegistry.definitions).generateDocument(e);
    return this._basePath ? addBasePathToDocument(r, this._basePath) : r;
  };
  getOpenAPI31Document = (e) => {
    const r = new OpenApiGeneratorV31(this.openAPIRegistry.definitions).generateDocument(e);
    return this._basePath ? addBasePathToDocument(r, this._basePath) : r;
  };
  doc = (e, t) => this.get(e, (r) => {
    const a = typeof t == "function" ? t(r) : t;
    try {
      const i = this.getOpenAPIDocument(a);
      return r.json(i);
    } catch (i) {
      return r.json(i, 500);
    }
  });
  doc31 = (e, t) => this.get(e, (r) => {
    const a = typeof t == "function" ? t(r) : t;
    try {
      const i = this.getOpenAPI31Document(a);
      return r.json(i);
    } catch (i) {
      return r.json(i, 500);
    }
  });
  route(e, t) {
    const r = e.replaceAll(/:([^\/]+)/g, "{$1}");
    return super.route(e, t), t instanceof Ee ? (t.openAPIRegistry.definitions.forEach((a) => {
      switch (a.type) {
        case "component":
          return this.openAPIRegistry.registerComponent(a.componentType, a.name, a.component);
        case "route":
          return this.openAPIRegistry.registerPath({
            ...a.route,
            path: mergePath(
              r,
              // @ts-expect-error _basePath is private
              t._basePath,
              a.route.path
            )
          });
        case "webhook":
          return this.openAPIRegistry.registerWebhook({
            ...a.webhook,
            path: mergePath(
              r,
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
    return new Ee({ ...super.basePath(e), defaultHook: this.defaultHook });
  }
}, createRoute = (n) => {
  const e = {
    ...n,
    getRoutingPath() {
      return n.path.replaceAll(/\/{(.+?)}/g, "/:$1");
    }
  };
  return Object.defineProperty(e, "getRoutingPath", { enumerable: !1 });
};
extendZodWithOpenApi(z);
function addBasePathToDocument(n, e) {
  const t = {};
  return Object.keys(n.paths).forEach((r) => {
    t[mergePath(e, r)] = n.paths[r];
  }), {
    ...n,
    paths: t
  };
}
function isJSONContentType(n) {
  return /^application\/([a-z-\.]+\+)?json/.test(n);
}
function isFormContentType(n) {
  return n.startsWith("multipart/form-data") || n.startsWith("application/x-www-form-urlencoded");
}
const logo = "data:image/png;base64,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", Layout = ({
  children: n,
  title: e = "NexGen Docs",
  description: t = "Guides and API reference for NexGen Collection Payment and QR Payment.",
  activePath: r = "/"
}) => {
  const a = e === "NexGen Docs" ? e : `${e} | NexGen Docs`;
  return /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDEV("head", { children: [
      /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      /* @__PURE__ */ jsxDEV("title", { children: a }),
      /* @__PURE__ */ jsxDEV("meta", { name: "description", content: t }),
      /* @__PURE__ */ jsxDEV("link", { rel: "icon", type: "image/png", href: logo }),
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

          /* Mermaid Diagram Container */
          .mermaid-block {
            margin: 1.5rem 0;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 1.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow-x: auto;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }

          .mermaid-block .mermaid {
            width: 100%;
            display: flex;
            justify-content: center;
            background: transparent;
            font-family: var(--font-sans);
          }

          .mermaid-block .mermaid svg {
            max-width: 100%;
            height: auto;
          }

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
            /* @__PURE__ */ jsxDEV("img", { src: logo, alt: "", width: "28", height: "28" }),
            /* @__PURE__ */ jsxDEV("span", { children: "NexGen Docs" })
          ] }),
          /* @__PURE__ */ jsxDEV("ul", { class: "nav-links", children: [
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/docs", class: `nav-link ${r.startsWith("/docs") ? "active" : ""}`, children: "Documentation" }) }),
            /* @__PURE__ */ jsxDEV("li", { children: /* @__PURE__ */ jsxDEV("a", { href: "/reference", class: `nav-link ${r.startsWith("/reference") ? "active" : ""}`, children: "API Reference" }) }),
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
      /* @__PURE__ */ jsxDEV("div", { class: "main-wrapper", children: n }),
      /* @__PURE__ */ jsxDEV("script", { src: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" }),
      /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
          // Mermaid Diagrams Rendering
          function renderMermaid() {
            if (typeof mermaid === 'undefined') return;
            const nodes = document.querySelectorAll('.mermaid');
            if (nodes.length === 0) return;

            const currentTheme = document.documentElement.getAttribute('data-theme') || 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            const isDark = currentTheme === 'dark';

            mermaid.initialize({
              startOnLoad: false,
              theme: isDark ? 'dark' : 'default',
              themeVariables: isDark ? {
                darkMode: true,
                background: '#111827',
                primaryColor: '#f97316',
                primaryTextColor: '#f9fafb',
                primaryBorderColor: '#f97316',
                lineColor: '#fdba74',
                secondaryColor: '#1f2937',
                tertiaryColor: '#0b0f19'
              } : {
                primaryColor: '#fff7ed',
                primaryBorderColor: '#f97316',
                primaryTextColor: '#0f172a',
                lineColor: '#ea580c'
              },
              securityLevel: 'loose'
            });

            nodes.forEach(el => {
              if (!el.getAttribute('data-original-code')) {
                el.setAttribute('data-original-code', el.textContent || '');
              } else {
                el.removeAttribute('data-processed');
                el.innerHTML = el.getAttribute('data-original-code') || '';
              }
            });

            mermaid.run({ nodes: Array.from(nodes) }).catch(err => {
              console.warn('Mermaid rendering notice:', err);
            });
          }

          // Initial run on page load
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderMermaid);
          } else {
            renderMermaid();
          }

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
            renderMermaid();
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
}, endpointGroups = [
  {
    title: "Collection Payment",
    href: "/docs/api/collection-payment",
    endpoints: [
      ["POST", "/collection/create"],
      ["GET", "/collection/get/list"],
      ["GET", "/collection/get/data/{collection_code}"],
      ["GET", "/collection/get/data/{collection_code}/billing"],
      ["PUT", "/collection/switch/status/data/{collection_code}"],
      ["POST", "/billing/create/{collection_code}"],
      ["GET", "/billing/get/data/{collection_code}/{bill_code}"]
    ]
  },
  {
    title: "QR Payment",
    href: "/docs/api/qr-payment",
    endpoints: [
      ["POST", "/terminal/create"],
      ["GET", "/terminal/get/list"],
      ["GET", "/terminal/get/data/{terminal_code}"],
      ["GET", "/terminal/get/data/{terminal_code}/billing"],
      ["PUT", "/terminal/switch/status/data/{terminal_code}"],
      ["POST", "/qr/create/{terminal_code}"],
      ["GET", "/qr/get/data/{terminal_code}/{qr_code}"],
      ["POST", "/qr/maybank/create/{terminal_code}"],
      ["GET", "/qr/maybank/status/{transaction_ref_id}"]
    ]
  }
], steps = [
  { title: "Create a collection", body: "Once, through the API or your dashboard. It groups related bills.", code: "POST /collection/create" },
  { title: "Create a bill", body: "Your server creates a bill when the customer checks out.", code: "POST /billing/create/{code}" },
  { title: "Redirect to pay", body: "Send the customer to the payment_url in the response.", code: "302 → payment_url" },
  { title: "Receive the callback", body: "NexGen posts the payment result to your server.", code: "POST callback_url" }
], icon = (n) => raw(`<svg class="lp-icon" viewBox="0 0 24 24" aria-hidden="true">${n}</svg>`), icons = {
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
}, products = [
  {
    icon: icons.receipt,
    title: "Collection Payment",
    body: "Group bills into collections and send customers to a hosted payment page.",
    href: "/docs/api/collection-payment"
  },
  {
    icon: icons.qr,
    title: "QR Payment",
    body: "Register terminals and generate a unique QR code for every transaction, including Maybank QR.",
    href: "/docs/api/qr-payment"
  },
  {
    icon: icons.webhook,
    title: "Callbacks & Redirects",
    body: "Receive payment results on your server and bring customers back to your site.",
    href: "/docs/api/callbacks-and-redirects"
  }
], styles = `
  :root { --lp-cta-bg: var(--accent-text); --lp-cta-fg: #ffffff; }
  [data-theme="dark"] { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  }

  .lp { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
  .lp section { padding: 4.5rem 0; border-top: 1px solid var(--border-color); }
  .lp section.lp-hero { border-top: 0; padding: 5rem 0 4.5rem; }
  .lp h2 { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); margin-bottom: 0.5rem; }
  .lp-lead { color: var(--text-secondary); font-size: 1.0625rem; max-width: 60ch; margin-bottom: 2.5rem; }
  .lp-icon { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .lp a:focus-visible, .lp button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 0.5rem; }

  /* Hero */
  .lp-hero { display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: center; }
  @media (min-width: 1024px) { .lp-hero { grid-template-columns: 1.05fr 1fr; gap: 4rem; } }
  .lp-eyebrow { display: inline-flex; gap: 0.5rem; align-items: center; font-family: var(--font-mono); font-size: 0.8125rem; color: var(--accent-text); background: var(--accent-light); border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1.5rem; }
  .lp-hero h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.035em; color: var(--text-primary); margin-bottom: 1.25rem; }
  .lp-hero h1 span { color: var(--accent-text); }
  .lp-hero p { font-size: 1.125rem; color: var(--text-secondary); max-width: 34rem; margin-bottom: 2rem; }
  .lp-search { display: flex; align-items: center; gap: 0.75rem; width: 100%; max-width: 30rem; min-height: 48px; padding: 0 1rem; margin-bottom: 1.25rem; font: inherit; font-size: 1rem; color: var(--text-muted); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 0.625rem; cursor: pointer; text-align: left; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .lp-search:hover { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
  .lp-search kbd { margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; padding: 0.125rem 0.5rem; border: 1px solid var(--border-color); border-radius: 0.375rem; background: var(--bg-tertiary); color: var(--text-secondary); }
  .lp-ctas { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .lp-btn { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; padding: 0 1.25rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9375rem; transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease; }
  .lp-btn:active { transform: scale(0.98); }
  .lp-btn-primary { background: var(--lp-cta-bg); color: var(--lp-cta-fg); }
  .lp-btn-primary:hover { color: var(--lp-cta-fg); filter: brightness(1.08); }
  .lp-btn-secondary { color: var(--text-primary); border: 1px solid var(--border-color); background: var(--bg-primary); }
  .lp-btn-secondary:hover { color: var(--text-primary); border-color: var(--text-muted); }

  /* Code window */
  .lp-code { background: var(--code-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; overflow: hidden; min-width: 0; box-shadow: 0 24px 48px -24px rgba(15, 23, 42, 0.35); }
  .lp-code-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.625rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); font-family: var(--font-mono); font-size: 0.75rem; color: #94a3b8; }
  .lp-code pre { margin: 0; padding: 1.25rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.7; color: var(--code-text); }
  .lp-code pre + pre { border-top: 1px solid rgba(255,255,255,0.08); }
  .lp-c { color: #94a3b8; } .lp-s { color: #86efac; } .lp-k { color: #fdba74; } .lp-n { color: #93c5fd; }

  /* Products */
  .lp-grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
  @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
  .lp-card { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 0.75rem; background: var(--bg-secondary); color: var(--text-secondary); transition: border-color 0.2s ease, transform 0.2s ease; }
  .lp-card:hover { border-color: var(--accent); color: var(--text-secondary); transform: translateY(-2px); }
  .lp-card-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 0.5rem; background: var(--accent-light); color: var(--accent-text); }
  .lp-card h3 { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
  .lp-card p { font-size: 0.9375rem; flex: 1; }
  .lp-more { display: inline-flex; align-items: center; gap: 0.375rem; font-weight: 600; font-size: 0.875rem; color: var(--accent-text); }
  .lp-more .lp-icon { width: 16px; height: 16px; transition: transform 0.2s ease; }
  .lp-card:hover .lp-more .lp-icon { transform: translateX(3px); }

  /* Steps */
  .lp-steps { list-style: none; display: grid; gap: 1rem; grid-template-columns: 1fr; counter-reset: step; }
  @media (min-width: 640px) { .lp-steps { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .lp-steps { grid-template-columns: repeat(4, 1fr); } }
  .lp-steps li { counter-increment: step; padding: 1.25rem; border-left: 2px solid var(--border-color); }
  .lp-steps li::before { content: counter(step, decimal-leading-zero); display: block; font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 600; color: var(--accent-text); margin-bottom: 0.5rem; }
  .lp-steps h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.375rem; }
  .lp-steps p { font-size: 0.9375rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .lp-steps code { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }

  /* Endpoints */
  .lp-endpoints { display: grid; gap: 2rem; grid-template-columns: 1fr; }
  @media (min-width: 1024px) { .lp-endpoints { grid-template-columns: 1fr 1fr; } }
  .lp-endpoints h3 { display: flex; justify-content: space-between; align-items: baseline; font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
  .lp-endpoints ul { list-style: none; border: 1px solid var(--border-color); border-radius: 0.75rem; overflow: hidden; }
  .lp-endpoints li { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border-top: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-primary); min-width: 0; }
  .lp-endpoints li:first-child { border-top: 0; }
  .lp-endpoints li span:last-child { overflow-wrap: anywhere; }
  .lp-method { flex: none; width: 3.25rem; text-align: center; font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0; border-radius: 0.25rem; }
  .lp-method-GET { color: #1d4ed8; background: #dbeafe; }
  .lp-method-POST { color: #15803d; background: #dcfce7; }
  .lp-method-PUT { color: #b45309; background: #fef3c7; }
  [data-theme="dark"] .lp-method-GET { color: #93c5fd; background: #1e3a5f; }
  [data-theme="dark"] .lp-method-POST { color: #86efac; background: #14391f; }
  [data-theme="dark"] .lp-method-PUT { color: #fcd34d; background: #422a06; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .lp-method-GET { color: #93c5fd; background: #1e3a5f; }
    :root:not([data-theme="light"]) .lp-method-POST { color: #86efac; background: #14391f; }
    :root:not([data-theme="light"]) .lp-method-PUT { color: #fcd34d; background: #422a06; }
  }
  .lp-base { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-muted); margin-top: 1.5rem; }

  @media (prefers-reduced-motion: reduce) {
    .lp *, .lp *::before { transition: none !important; transform: none !important; }
  }
`, HomePage = () => /* @__PURE__ */ jsxDEV(
  Layout,
  {
    activePath: "/",
    children: [
      /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: styles } }),
      /* @__PURE__ */ jsxDEV("main", { class: "lp", children: [
        /* @__PURE__ */ jsxDEV("section", { class: "lp-hero", children: [
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("div", { class: "lp-eyebrow", children: "NexGen API · v1" }),
            /* @__PURE__ */ jsxDEV("h1", { children: [
              "Collect payments with ",
              /* @__PURE__ */ jsxDEV("span", { children: "bills and QR codes" })
            ] }),
            /* @__PURE__ */ jsxDEV("p", { children: "Create a bill, send your customer to a hosted payment page and get the result on your server. Or generate a QR code for every transaction at the counter." }),
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "lp-search", onclick: "openSearch()", "aria-label": "Search the documentation", children: [
              icon(icons.search),
              /* @__PURE__ */ jsxDEV("span", { children: "Search the docs…" }),
              /* @__PURE__ */ jsxDEV("kbd", { children: "⌘K" })
            ] }),
            /* @__PURE__ */ jsxDEV("div", { class: "lp-ctas", children: [
              /* @__PURE__ */ jsxDEV("a", { href: "/docs/api/overview", class: "lp-btn lp-btn-primary", children: [
                "Read the overview ",
                icon(icons.arrow)
              ] }),
              /* @__PURE__ */ jsxDEV("a", { href: "/reference", class: "lp-btn lp-btn-secondary", children: "API reference" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "lp-code", role: "region", "aria-label": "Example: create a bill", children: [
            /* @__PURE__ */ jsxDEV("div", { class: "lp-code-bar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: "Create a bill" }),
              /* @__PURE__ */ jsxDEV("span", { children: "POST" })
            ] }),
            /* @__PURE__ */ jsxDEV("pre", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "lp-k", children: "curl" }),
              " -X POST ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"https://nexgen.example.com/api/v1/billing/create/RLVCQOIA0001?ApiSecret=$SECRET"' }),
              " \\",
              `
`,
              "  ",
              "-H ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"ApiKey: $API_KEY"' }),
              " \\",
              `
`,
              "  ",
              "-F fieldName=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"Aisyah Rahman"' }),
              " \\",
              `
`,
              "  ",
              "-F fieldEmail=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"aisyah@example.com"' }),
              " \\",
              `
`,
              "  ",
              "-F fieldPhone=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-n", children: "60123456789" }),
              " \\",
              `
`,
              "  ",
              "-F fieldAmount=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-n", children: "10.00" }),
              " \\",
              `
`,
              "  ",
              "-F fieldPaymentDescription=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"Membership 2026"' }),
              " \\",
              `
`,
              "  ",
              "-F fieldCallbackUrl=",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"https://example.com/callback"' })
            ] }),
            /* @__PURE__ */ jsxDEV("pre", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: "lp-c", children: "// 201 Created" }),
              `
`,
              "{",
              `
`,
              "  ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-k", children: '"code"' }),
              ": ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"RLVBEVN241004A9YU1"' }),
              ",",
              `
`,
              "  ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-k", children: '"status"' }),
              ": ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"unpaid"' }),
              ",",
              `
`,
              "  ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-k", children: '"amount"' }),
              ": ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"10.00"' }),
              ",",
              `
`,
              "  ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-k", children: '"payment_url"' }),
              ": ",
              /* @__PURE__ */ jsxDEV("span", { class: "lp-s", children: '"https://nexgen.example.com/p/b/RLVBEVN241004A9YU1/1"' }),
              `
`,
              "}"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("section", { "aria-labelledby": "products-heading", children: [
          /* @__PURE__ */ jsxDEV("h2", { id: "products-heading", children: "Choose how you get paid" }),
          /* @__PURE__ */ jsxDEV("p", { class: "lp-lead", children: "Both products use the same credentials, request format and callback flow." }),
          /* @__PURE__ */ jsxDEV("div", { class: "lp-grid", children: products.map((n) => /* @__PURE__ */ jsxDEV("a", { href: n.href, class: "lp-card", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "lp-card-icon", children: icon(n.icon) }),
            /* @__PURE__ */ jsxDEV("h3", { children: n.title }),
            /* @__PURE__ */ jsxDEV("p", { children: n.body }),
            /* @__PURE__ */ jsxDEV("span", { class: "lp-more", children: [
              "Read the guide ",
              icon(icons.arrow)
            ] })
          ] })) })
        ] }),
        /* @__PURE__ */ jsxDEV("section", { "aria-labelledby": "flow-heading", children: [
          /* @__PURE__ */ jsxDEV("h2", { id: "flow-heading", children: "How a bill payment works" }),
          /* @__PURE__ */ jsxDEV("p", { class: "lp-lead", children: "Four steps from checkout to a confirmed payment." }),
          /* @__PURE__ */ jsxDEV("ol", { class: "lp-steps", children: steps.map((n) => /* @__PURE__ */ jsxDEV("li", { children: [
            /* @__PURE__ */ jsxDEV("h3", { children: n.title }),
            /* @__PURE__ */ jsxDEV("p", { children: n.body }),
            /* @__PURE__ */ jsxDEV("code", { children: n.code })
          ] })) })
        ] }),
        /* @__PURE__ */ jsxDEV("section", { "aria-labelledby": "endpoints-heading", children: [
          /* @__PURE__ */ jsxDEV("h2", { id: "endpoints-heading", children: "Endpoints at a glance" }),
          /* @__PURE__ */ jsxDEV("p", { class: "lp-lead", children: [
            "Every request needs your ",
            /* @__PURE__ */ jsxDEV("code", { children: "ApiKey" }),
            " header and ",
            /* @__PURE__ */ jsxDEV("code", { children: "ApiSecret" }),
            " query parameter."
          ] }),
          /* @__PURE__ */ jsxDEV("div", { class: "lp-endpoints", children: endpointGroups.map((n) => /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h3", { children: [
              n.title,
              /* @__PURE__ */ jsxDEV("a", { href: n.href, class: "lp-more", children: [
                "Guide ",
                icon(icons.arrow)
              ] })
            ] }),
            /* @__PURE__ */ jsxDEV("ul", { children: n.endpoints.map(([e, t]) => /* @__PURE__ */ jsxDEV("li", { children: [
              /* @__PURE__ */ jsxDEV("span", { class: `lp-method lp-method-${e}`, children: e }),
              /* @__PURE__ */ jsxDEV("span", { children: t })
            ] })) })
          ] })) }),
          /* @__PURE__ */ jsxDEV("p", { class: "lp-base", children: "All paths are relative to https://nexgen.example.com/api/v1" })
        ] })
      ] })
    ]
  }
), NotFoundPage = () => /* @__PURE__ */ jsxDEV(Layout, { title: "404 - Page Not Found", activePath: "/404", children: /* @__PURE__ */ jsxDEV("div", { style: "max-width: 600px; margin: 6rem auto; text-align: center; padding: 0 1.5rem;", children: [
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

## Mermaid Diagrams

You can embed interactive diagrams and flowcharts directly in your markdown using \`\`\`\`mermaid\`\`\`\` code blocks. The documentation engine automatically renders them into SVGs that dynamically adapt to light and dark themes.

### Flowchart Example

\`\`\`mermaid
graph TD
    A[Client Request] --> B[Cloudflare Edge Worker]
    B --> C{Route Match}
    C -->|/docs/*| D[Markdown SSR Engine]
    C -->|/reference| E[Scalar API Reference]
    C -->|/api/*| F[Hono REST Router]
    D --> G[Client HTML Response]
    E --> G
    F --> G
\`\`\`

### Sequence Diagram Example

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant Worker as Cloudflare Worker
    participant DB as Storage / KV

    User->>Browser: Navigate to /docs
    Browser->>Worker: GET /docs/guides/mermaid
    Worker->>DB: Fetch Doc Content
    DB-->>Worker: Return Markdown
    Worker-->>Browser: Return Rendered HTML with Mermaid
    Browser->>Browser: Execute client-side mermaid.run()
    Browser-->>User: Interactive Diagram Displayed
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
title: NexGen API Overview
description: Base URLs, authentication, request format and error handling for the NexGen API.
category: API Reference
order: 1
---

# NexGen API Overview

The NexGen API lets you create bills and take payments. It follows RESTful principles and every response, including errors, is JSON.

👉 **[Open the interactive API reference](/reference)** to try each endpoint in the browser.

## Products

| Product | What it does | Guide |
| :--- | :--- | :--- |
| **Collection Payment** | Group bills into **Collections**, send customers to a hosted payment page | [Collection Payment](/docs/api/collection-payment) |
| **QR Payment** | Register **Terminals** and generate dynamic, per-transaction QR codes | [QR Payment](/docs/api/qr-payment) |
| **Callbacks & Redirects** | How NexGen tells your server and your customer about a payment result | [Callbacks & Redirects](/docs/api/callbacks-and-redirects) |

## Base URL

Examples use \`https://nexgen.example.com\`. Replace it with the staging or production host you receive with your credentials. All paths start with the API version, \`api/v1\`:

\`\`\`text
https://nexgen.example.com/api/v1/collection/get/list
\`\`\`

## Authentication

Every request needs two credentials from your **NexGen dashboard**:

| Credential | Sent as | Example |
| :--- | :--- | :--- |
| \`ApiKey\` | HTTP header | \`ApiKey: YOUR_API_KEY\` |
| \`ApiSecret\` | Query string parameter | \`?ApiSecret=YOUR_API_SECRET\` |

\`\`\`bash
curl "https://nexgen.example.com/api/v1/collection/get/list?ApiSecret=$NEXGEN_API_SECRET" \\
  -H "ApiKey: $NEXGEN_API_KEY"
\`\`\`

> [!WARNING]
> Keep your API key and secret on your server. Never ship them in browser or mobile app code.

## Request format

Endpoints that create data accept \`multipart/form-data\`. \`application/x-www-form-urlencoded\` and \`application/json\` bodies are also supported. Request fields are prefixed with \`field\`, for example \`fieldName\` or \`fieldAmount\`.

## Errors

Errors share one shape:

\`\`\`json
{
  "status": "error",
  "message": "There was a validation error. Please review the input and try again.",
  "error": {
    "fieldName": "The field name field is required."
  }
}
\`\`\`

| HTTP status | Meaning | \`error\` contains |
| :--- | :--- | :--- |
| \`400\` | Validation failed | An object mapping each invalid field to its message |
| \`401\` | Missing or invalid \`ApiKey\` / \`ApiSecret\` | Not present |
| \`404\` | Collection, terminal or bill not found | A short reason string |
| \`500\` | Unexpected server error | A diagnostic string |

## Statuses

| Resource | Values |
| :--- | :--- |
| **Collection / Terminal** | \`active\`, \`inactive\` |
| **Bill / QR** | \`unpaid\`, \`pending\`, \`paid\`, \`expired\` |

> [!IMPORTANT]
> NexGen assumes no liability for financial losses caused by improper use of the API. Always confirm a payment from the server-side callback or the Get Billing Data endpoint, not only from the redirect.
`, __vite_glob_0_8 = '---\ntitle: Collection Payment\ndescription: Create collections and bills, then send customers to a hosted payment page.\ncategory: API Reference\norder: 2\n---\n\n# Collection Payment\n\nA **Collection** groups related bills, such as *Membership Fees*, *Utility Payments* or *Service Charges*. A **Bill** is an invoice for one customer and always belongs to one collection.\n\n## Payment flow\n\n1. Create a collection once, through the API or the NexGen dashboard.\n2. When a customer pays, your server creates a bill in that collection.\n3. NexGen returns a `payment_url`. Redirect the customer to it.\n4. The customer pays with their preferred method.\n5. NexGen `POST`s the result to your `callback_url`.\n6. If you set a `redirect_url`, NexGen sends the customer back to your site.\n\n```mermaid\nsequenceDiagram\n    participant C as Customer\n    participant S as Your server\n    participant N as NexGen\n    C->>S: Choose to pay\n    S->>N: POST /billing/create/{collection_code}\n    N-->>S: Bill with payment_url\n    S-->>C: Redirect to payment_url\n    C->>N: Pay\n    N->>S: POST callback_url (payment result)\n    N-->>C: Redirect to redirect_url (optional)\n```\n\nSee [Callbacks & Redirects](/docs/api/callbacks-and-redirects) for the payloads NexGen sends.\n\n## Collections\n\n### Create a collection\n\n`POST /api/v1/collection/create`\n\n| Field | Required | Description |\n| :--- | :--- | :--- |\n| `fieldName` | Yes | Collection name |\n| `fieldDescription` | Yes | Short description |\n| `fieldStatus` | Yes | `active` or `inactive` |\n\n```bash\ncurl -X POST "https://nexgen.example.com/api/v1/collection/create?ApiSecret=$NEXGEN_API_SECRET" \\\n  -H "ApiKey: $NEXGEN_API_KEY" \\\n  -F fieldName="Membership Fees" \\\n  -F fieldDescription="Annual membership" \\\n  -F fieldStatus=active\n```\n\nResponse `201`:\n\n```json\n{\n  "code": "RLVCQOIA0001",\n  "name": "Membership Fees",\n  "description": "Annual membership",\n  "status": "active"\n}\n```\n\nKeep the `code`. The other collection and billing endpoints need it as `{collection_code}`.\n\n### Other collection endpoints\n\n| Method | Path | Returns |\n| :--- | :--- | :--- |\n| `GET` | `/api/v1/collection/get/list` | Array of all your collections |\n| `GET` | `/api/v1/collection/get/data/{collection_code}` | One collection |\n| `GET` | `/api/v1/collection/get/data/{collection_code}/billing` | One collection, with every bill in `bill_list` |\n| `PUT` | `/api/v1/collection/switch/status/data/{collection_code}?fieldStatus=inactive` | The updated collection |\n\n`fieldStatus` on the switch-status endpoint is a **query** parameter and must be `active` or `inactive`.\n\n## Bills\n\n### Create a bill\n\n`POST /api/v1/billing/create/{collection_code}`\n\n| Field | Required | Description |\n| :--- | :--- | :--- |\n| `fieldName` | Yes | Payer name |\n| `fieldEmail` | Yes | Payer email |\n| `fieldPhone` | Yes | Payer phone, with country code (e.g. `60123456789`) |\n| `fieldAmount` | Yes | Amount as a decimal string (e.g. `10.00`) |\n| `fieldPaymentDescription` | Yes | What the payment is for |\n| `fieldCallbackUrl` | Yes | Your server endpoint that receives the payment result |\n| `fieldRedirectUrl` | No | Where to send the customer after paying |\n| `fieldDueDate` | No | When the bill expires |\n| `fieldExternalReferenceLabel1` / `fieldExternalReferenceValue1` | No | Your own reference, such as an order ID |\n\n```bash\ncurl -X POST "https://nexgen.example.com/api/v1/billing/create/RLVCQOIA0001?ApiSecret=$NEXGEN_API_SECRET" \\\n  -H "ApiKey: $NEXGEN_API_KEY" \\\n  -F fieldName="Aisyah Rahman" \\\n  -F fieldEmail="aisyah@example.com" \\\n  -F fieldPhone=60123456789 \\\n  -F fieldAmount=10.00 \\\n  -F fieldPaymentDescription="Membership 2026" \\\n  -F fieldCallbackUrl="https://example.com/nexgen/callback" \\\n  -F fieldRedirectUrl="https://example.com/payment/done"\n```\n\nResponse `201`:\n\n```json\n{\n  "code": "RLVBEVN241004A9YU1",\n  "status": "unpaid",\n  "amount": "10.00",\n  "payment_description": "Membership 2026",\n  "due_date": "05-10-2024 08:49:00",\n  "payer_name": "Aisyah Rahman",\n  "payer_email": "aisyah@example.com",\n  "payer_phone": "60123456789",\n  "external_reference_label_1": null,\n  "external_reference_value_1": null,\n  "redirect_url": "https://example.com/payment/done",\n  "callback_url": "https://example.com/nexgen/callback",\n  "payment_url": "https://nexgen.example.com/p/b/RLVBEVN241004A9YU1/1"\n}\n```\n\nRedirect the customer to `payment_url`.\n\n> [!NOTE]\n> A missing payment description is reported under the key `fieldDescription` in the `400` error, even though the request field is `fieldPaymentDescription`.\n\n### Get a bill\n\n`GET /api/v1/billing/get/data/{collection_code}/{bill_code}`\n\nThis returns the same object as Create Bill. Use it to check a bill\'s `status` from your server.\n\n## Bill fields\n\n| Field | Description |\n| :--- | :--- |\n| `code` | Unique bill code |\n| `status` | `unpaid`, `pending`, `paid` or `expired` |\n| `amount` | Bill amount |\n| `payment_description` | What the payment is for |\n| `due_date` | Due date, formatted `DD-MM-YYYY HH:mm:ss` |\n| `payer_name`, `payer_email`, `payer_phone` | Payer details |\n| `external_reference_label_1`…`_4`, `external_reference_value_1`…`_4` | Your own references, `null` when unused |\n| `redirect_url` | Where the customer returns after paying, or `null` |\n| `callback_url` | Where NexGen sends the payment result |\n| `payment_url` | Hosted payment page for the customer |\n', __vite_glob_0_9 = `---
title: QR Payment
description: Register terminals and generate dynamic, per-transaction payment QR codes.
category: API Reference
order: 3
---

# QR Payment

QR Payment generates a unique QR code for each transaction. The customer scans it with their phone and pays. Typical uses:

- **Point of sale:** show a QR code at checkout.
- **Web and mobile apps:** show a QR code for the order.
- **Self-service kiosks:** show a QR code after the customer orders.

A **Terminal** represents a place that takes payments, such as a POS counter or a kiosk. Every QR code is created on a terminal.

## Terminals

### Create a terminal

\`POST /api/v1/terminal/create\`

| Field | Required | Description |
| :--- | :--- | :--- |
| \`fieldName\` | Yes | Terminal name |
| \`fieldDescription\` | Yes | Short description |
| \`fieldStatus\` | Yes | \`active\` or \`inactive\` |

\`\`\`bash
curl -X POST "https://nexgen.example.com/api/v1/terminal/create?ApiSecret=$NEXGEN_API_SECRET" \\
  -H "ApiKey: $NEXGEN_API_KEY" \\
  -F fieldName="Counter 1" \\
  -F fieldDescription="Front counter" \\
  -F fieldStatus=active
\`\`\`

Response \`201\`:

\`\`\`json
{
  "code": "RLVTBAQA0003",
  "name": "Counter 1",
  "description": "Front counter",
  "status": "active"
}
\`\`\`

### Other terminal endpoints

| Method | Path | Returns |
| :--- | :--- | :--- |
| \`GET\` | \`/api/v1/terminal/get/list\` | Array of all your terminals |
| \`GET\` | \`/api/v1/terminal/get/data/{terminal_code}\` | One terminal |
| \`GET\` | \`/api/v1/terminal/get/data/{terminal_code}/billing\` | One terminal, with its QR bills in \`bill_list\` |
| \`PUT\` | \`/api/v1/terminal/switch/status/data/{terminal_code}?fieldStatus=inactive\` | The updated terminal |

## Dynamic QR

### Create a QR code

\`POST /api/v1/qr/create/{terminal_code}\`

| Field | Required | Description |
| :--- | :--- | :--- |
| \`fieldAmount\` | Yes | Amount as a decimal string (e.g. \`1.00\`) |
| \`fieldPaymentDescription\` | Yes | What the payment is for |
| \`fieldCallbackUrl\` | Yes | Your server endpoint that receives the payment result |
| \`fieldExternalReferenceLabel1\` / \`fieldExternalReferenceValue1\` | No | Your own reference, e.g. \`terminal_id\` |
| \`fieldExternalReferenceLabel2\` / \`fieldExternalReferenceValue2\` | No | A second reference, e.g. a transaction ID |

\`\`\`bash
curl -X POST "https://nexgen.example.com/api/v1/qr/create/RLVTBAQA0003?ApiSecret=$NEXGEN_API_SECRET" \\
  -H "ApiKey: $NEXGEN_API_KEY" \\
  -F fieldAmount=1.00 \\
  -F fieldPaymentDescription="Order #1042" \\
  -F fieldCallbackUrl="https://example.com/nexgen/callback"
\`\`\`

Response \`201\`:

\`\`\`json
{
  "code": "RLVQSD4241006AZ2O5",
  "status": "unpaid",
  "amount": "1.00",
  "payment_description": "Order #1042",
  "due_date": "06-10-2024 21:20:00",
  "external_reference_label_1": null,
  "external_reference_value_1": null,
  "external_reference_label_2": null,
  "external_reference_value_2": null,
  "callback_url": "https://example.com/nexgen/callback",
  "qr_code": "iVBORw0KGgoAAAANSUhEUgAA..."
}
\`\`\`

\`qr_code\` is a base64-encoded PNG. Show it with:

\`\`\`html
<img src="data:image/png;base64,{qr_code}" alt="Scan to pay" />
\`\`\`

### Get a QR payment

\`GET /api/v1/qr/get/data/{terminal_code}/{qr_code}\`

This returns the QR bill with its current \`status\` and a \`soundbox_response\` field. \`soundbox_response\` holds the audio confirmation from a soundbox device, when one is used.

## Maybank QR

Maybank QR works like Dynamic QR. It also needs a \`ClientTerminalId\` header, which you get from Maybank.

### Create a Maybank QR code

\`POST /api/v1/qr/maybank/create/{terminal_code}\`

| Header | Description |
| :--- | :--- |
| \`ApiKey\` | From the NexGen dashboard |
| \`ClientTerminalId\` | From Maybank |

The body fields are the same as [Create a QR code](#create-a-qr-code). The response also includes \`transaction_ref_id\`:

\`\`\`json
{
  "code": "STGQMZH5260505A0002",
  "status": "unpaid",
  "amount": "1",
  "payment_description": "Order #1042",
  "due_date": "05-05-2026 13:04:00",
  "callback_url": "https://example.com/nexgen/callback",
  "transaction_ref_id": "MBUAT111111115627039",
  "qr_code": "iVBORw0KGgoAAAANSUhEUgAA..."
}
\`\`\`

### Check a Maybank transaction

\`GET /api/v1/qr/maybank/status/{transaction_ref_id}\`

\`\`\`json
{
  "status": "OK",
  "transaction_status": "Success",
  "data": {
    "transaction_ref_id": "MBUAT111111115627269",
    "client_ref_id": "STGQMX19260507A0001",
    "startdate": "2026-05-07T11:07:37.330Z",
    "enddate": "2026-05-07T11:08:45.670Z",
    "sale_amount": "1.00",
    "final_amount": "1.00",
    "discount_amount": null,
    "promo_code": null,
    "client_terminal_id": "MBUAT1351514CASHRGB1"
  }
}
\`\`\`

\`client_ref_id\` is the NexGen QR \`code\`.
`, __vite_glob_0_10 = `---
title: Callbacks & Redirects
description: How NexGen reports payment results to your server and returns customers to your site.
category: API Reference
order: 4
---

# Callbacks & Redirects

When a payment finishes, NexGen reports the result in two ways:

| | Callback | Redirect |
| :--- | :--- | :--- |
| **Who receives it** | Your server | The customer's browser |
| **How** | \`POST\` with a JSON body to \`callback_url\` | \`GET\` to \`redirect_url\` with query parameters |
| **Set with** | \`fieldCallbackUrl\` (required) | \`fieldRedirectUrl\` (optional, bills only) |
| **Use it to** | Update the order and mark it paid | Show the customer a result page |

\`\`\`mermaid
sequenceDiagram
    participant C as Customer
    participant N as NexGen
    participant S as Your server
    C->>N: Complete payment
    N->>S: POST callback_url (JSON)
    S-->>N: 200 OK
    N-->>C: 302 to redirect_url?code=...&status=...
    C->>S: GET redirect_url
\`\`\`

## Callback

NexGen sends a \`POST\` to your \`callback_url\` with the bill as JSON:

\`\`\`json
{
  "code": "RLVBXMU241004AXQP6",
  "status": "paid",
  "amount": "10.00",
  "payment_description": "Membership 2026",
  "due_date": "05-10-2024 08:56:00",
  "payer_name": "Aisyah Rahman",
  "payer_email": "aisyah@example.com",
  "payer_phone": "60123456789",
  "external_reference_label_1": null,
  "external_reference_value_1": null,
  "redirect_url": "https://example.com/payment/done",
  "callback_url": "https://example.com/nexgen/callback",
  "payment_url": "https://nexgen.example.com/p/b/RLVBXMU241004AXQP6/1"
}
\`\`\`

QR payment callbacks contain the QR bill fields instead: \`code\`, \`status\`, \`amount\`, \`payment_description\`, \`due_date\`, \`external_reference_*_1\`/\`_2\`, \`callback_url\` and \`soundbox_response\`.

### Handling the callback

1. Listen for \`POST\` requests at your \`callback_url\`.
2. Find the order by \`code\`, or by your own \`external_reference_value_*\`.
3. Update the order's status.
4. Return \`200 OK\` when you're done, or \`400 Bad Request\` if you couldn't process it.

If processing fails or hasn't finished, the customer stays in a **processing queue**. They aren't redirected until the payment status is confirmed.

> [!WARNING]
> The callback URL must be publicly reachable. It **cannot** be \`localhost\`. When developing locally, use a tunnel such as \`cloudflared tunnel\` or a request inspector such as webhook.site.

> [!TIP]
> Before you mark an order paid, confirm the status with [Get a bill](/docs/api/collection-payment#get-a-bill). This protects you from forged callbacks.

Example handler (Hono):

\`\`\`ts
app.post('/nexgen/callback', async (c) => {
  const payment = await c.req.json()
  if (payment.status === 'paid') {
    await markOrderPaid(payment.code)
  }
  return c.text('OK')
})
\`\`\`

## Redirect

After a successful callback, NexGen sends the customer to your \`redirect_url\` with the bill fields as query parameters:

\`\`\`text
GET /payment/done?code=RLVBXMU241004AXQP6&status=paid&amount=10.00&payment_description=Membership+2026&due_date=2024-10-05T08:56:00&payer_name=Aisyah+Rahman&payer_email=aisyah@example.com&payer_phone=60123456789
\`\`\`

Read \`status\` to show "Payment successful" or "Payment failed". Don't fulfil the order from the redirect: anyone can edit a URL. Rely on the callback.

## Payload fields

| Field | Description |
| :--- | :--- |
| \`code\` | Unique bill code |
| \`status\` | \`unpaid\`, \`pending\`, \`paid\` or \`expired\` |
| \`amount\` | Bill amount |
| \`payment_description\` | What the payment is for |
| \`due_date\` | Due date |
| \`payer_name\`, \`payer_email\`, \`payer_phone\` | Payer details (bills only) |
| \`external_reference_label_N\`, \`external_reference_value_N\` | Your own references |
| \`redirect_url\`, \`callback_url\`, \`payment_url\` | URLs attached to the bill (bills only) |
| \`soundbox_response\` | Soundbox audio confirmation (QR only) |
`, __vite_glob_0_11 = `---
title: Mermaid Example
description: Example of a Mermaid diagram.
category: Mermaid
order: 1
---

# Mermaid Diagram Example
## Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database

    User->>Frontend: Click Login
    Frontend->>API: POST /auth/login
    API->>Database: Query user
    Database-->>API: User data
    API-->>Frontend: JWT Token
    Frontend-->>User: Redirect to dashboard
\`\`\`
## Flowchart
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Deploy]
    E --> F[End]
\`\`\`
## ER Diagram

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ REVIEW : writes
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "appears in"
    PRODUCT ||--o{ REVIEW : "reviewed by"
    CATEGORY ||--o{ PRODUCT : groups

    CUSTOMER {
        uuid id PK
        string email UK
        string name
        string phone
        timestamp created_at
    }
    ORDER {
        uuid id PK
        uuid customer_id FK
        string status
        decimal total
        timestamp ordered_at
    }
    LINE_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    PRODUCT {
        uuid id PK
        string name
        decimal price
        int stock
        uuid category_id FK
    }
    CATEGORY {
        uuid id PK
        string name UK
        string description
    }
    REVIEW {
        uuid id PK
        uuid customer_id FK
        uuid product_id FK
        int rating
        text body
        timestamp created_at
    }
\`\`\`
## Mind Map
\`\`\`mermaid
mindmap
  root((Project Ideas))
    Marketing
      Social Media Campaign
      Email Newsletter
      Content Strategy
    Development
      Mobile App
        iOS
        Android
      Web Platform
        Frontend
        Backend
    Research
      User Interviews
      Competitor Analysis
      Market Trends
\`\`\``;
var commonjsGlobal = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function getDefaultExportFromCjs(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, "__esModule")) return n;
  var e = n.default;
  if (typeof e == "function") {
    var t = function r() {
      return this instanceof r ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    t.prototype = e.prototype;
  } else t = {};
  return Object.defineProperty(t, "__esModule", { value: !0 }), Object.keys(n).forEach(function(r) {
    var a = Object.getOwnPropertyDescriptor(n, r);
    Object.defineProperty(t, r, a.get ? a : {
      enumerable: !0,
      get: function() {
        return n[r];
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
  var n = Object.prototype.toString;
  kindOf = function(m) {
    if (m === void 0) return "undefined";
    if (m === null) return "null";
    var h = typeof m;
    if (h === "boolean") return "boolean";
    if (h === "string") return "string";
    if (h === "number") return "number";
    if (h === "symbol") return "symbol";
    if (h === "function")
      return s(m) ? "generatorfunction" : "function";
    if (t(m)) return "array";
    if (d(m)) return "buffer";
    if (c(m)) return "arguments";
    if (a(m)) return "date";
    if (r(m)) return "error";
    if (i(m)) return "regexp";
    switch (e(m)) {
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
    if (o(m))
      return "generator";
    switch (h = n.call(m), h) {
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
  function r(u) {
    return u instanceof Error || typeof u.message == "string" && u.constructor && typeof u.constructor.stackTraceLimit == "number";
  }
  function a(u) {
    return u instanceof Date ? !0 : typeof u.toDateString == "function" && typeof u.getDate == "function" && typeof u.setDate == "function";
  }
  function i(u) {
    return u instanceof RegExp ? !0 : typeof u.flags == "string" && typeof u.ignoreCase == "boolean" && typeof u.multiline == "boolean" && typeof u.global == "boolean";
  }
  function s(u, m) {
    return e(u) === "GeneratorFunction";
  }
  function o(u) {
    return typeof u.throw == "function" && typeof u.return == "function" && typeof u.next == "function";
  }
  function c(u) {
    try {
      if (typeof u.length == "number" && typeof u.callee == "function")
        return !0;
    } catch (m) {
      if (m.message.indexOf("callee") !== -1)
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
  var n = requireIsExtendable();
  extendShallow = function(a) {
    n(a) || (a = {});
    for (var i = arguments.length, s = 1; s < i; s++) {
      var o = arguments[s];
      n(o) && e(a, o);
    }
    return a;
  };
  function e(r, a) {
    for (var i in a)
      t(a, i) && (r[i] = a[i]);
  }
  function t(r, a) {
    return Object.prototype.hasOwnProperty.call(r, a);
  }
  return extendShallow;
}
var sectionMatter, hasRequiredSectionMatter;
function requireSectionMatter() {
  if (hasRequiredSectionMatter) return sectionMatter;
  hasRequiredSectionMatter = 1;
  var n = requireKindOf(), e = requireExtendShallow();
  sectionMatter = function(c, d) {
    typeof d == "function" && (d = { parse: d });
    var u = r(c), m = { section_delimiter: "---", parse: s }, h = e({}, m, d), g = h.section_delimiter, v = u.content.split(/\r?\n/), A = null, I = i(), N = [], b = [];
    function y(F) {
      u.content = F, A = [], N = [];
    }
    function E(F) {
      b.length && (I.key = a(b[0], g), I.content = F, h.parse(I, A), A.push(I), I = i(), N = [], b = []);
    }
    for (var _ = 0; _ < v.length; _++) {
      var D = v[_], L = b.length, V = D.trim();
      if (t(V, g)) {
        if (V.length === 3 && _ !== 0) {
          if (L === 0 || L === 2) {
            N.push(D);
            continue;
          }
          b.push(V), I.data = N.join(`
`), N = [];
          continue;
        }
        A === null && y(N.join(`
`)), L === 2 && E(N.join(`
`)), b.push(V);
        continue;
      }
      N.push(D);
    }
    return A === null ? y(N.join(`
`)) : E(N.join(`
`)), u.sections = A, u;
  };
  function t(c, d) {
    return !(c.slice(0, d.length) !== d || c.charAt(d.length + 1) === d.slice(-1));
  }
  function r(c) {
    if (n(c) !== "object" && (c = { content: c }), typeof c.content != "string" && !o(c.content))
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
  function n(s) {
    return typeof s > "u" || s === null;
  }
  function e(s) {
    return typeof s == "object" && s !== null;
  }
  function t(s) {
    return Array.isArray(s) ? s : n(s) ? [] : [s];
  }
  function r(s, o) {
    var c, d, u, m;
    if (o)
      for (m = Object.keys(o), c = 0, d = m.length; c < d; c += 1)
        u = m[c], s[u] = o[u];
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
  return common.isNothing = n, common.isObject = e, common.toArray = t, common.repeat = a, common.isNegativeZero = i, common.extend = r, common;
}
var exception, hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function n(e, t) {
    Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = t, this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : ""), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack || "";
  }
  return n.prototype = Object.create(Error.prototype), n.prototype.constructor = n, n.prototype.toString = function(t) {
    var r = this.name + ": ";
    return r += this.reason || "(unknown reason)", !t && this.mark && (r += " " + this.mark.toString()), r;
  }, exception = n, exception;
}
var mark, hasRequiredMark;
function requireMark() {
  if (hasRequiredMark) return mark;
  hasRequiredMark = 1;
  var n = requireCommon();
  function e(t, r, a, i, s) {
    this.name = t, this.buffer = r, this.position = a, this.line = i, this.column = s;
  }
  return e.prototype.getSnippet = function(r, a) {
    var i, s, o, c, d;
    if (!this.buffer) return null;
    for (r = r || 4, a = a || 75, i = "", s = this.position; s > 0 && `\0\r
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
    return d = this.buffer.slice(s, c), n.repeat(" ", r) + i + d + o + `
` + n.repeat(" ", r + this.position - s + i.length) + "^";
  }, e.prototype.toString = function(r) {
    var a, i = "";
    return this.name && (i += 'in "' + this.name + '" '), i += "at line " + (this.line + 1) + ", column " + (this.column + 1), r || (a = this.getSnippet(), a && (i += `:
` + a)), i;
  }, mark = e, mark;
}
var type, hasRequiredType;
function requireType() {
  if (hasRequiredType) return type;
  hasRequiredType = 1;
  var n = requireException(), e = [
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
  function r(i) {
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
        throw new n('Unknown option "' + o + '" is met in definition of "' + i + '" YAML type.');
    }), this.tag = i, this.kind = s.kind || null, this.resolve = s.resolve || function() {
      return !0;
    }, this.construct = s.construct || function(o) {
      return o;
    }, this.instanceOf = s.instanceOf || null, this.predicate = s.predicate || null, this.represent = s.represent || null, this.defaultStyle = s.defaultStyle || null, this.styleAliases = r(s.styleAliases || null), t.indexOf(this.kind) === -1)
      throw new n('Unknown kind "' + this.kind + '" is specified for "' + i + '" YAML type.');
  }
  return type = a, type;
}
var schema, hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  var n = requireCommon(), e = requireException(), t = requireType();
  function r(s, o, c) {
    var d = [];
    return s.include.forEach(function(u) {
      c = r(u, o, c);
    }), s[o].forEach(function(u) {
      c.forEach(function(m, h) {
        m.tag === u.tag && m.kind === u.kind && d.push(h);
      }), c.push(u);
    }), c.filter(function(u, m) {
      return d.indexOf(m) === -1;
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
    }), this.compiledImplicit = r(this, "implicit", []), this.compiledExplicit = r(this, "explicit", []), this.compiledTypeMap = a(this.compiledImplicit, this.compiledExplicit);
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
    if (o = n.toArray(o), c = n.toArray(c), !o.every(function(d) {
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
  var n = requireType();
  return str = new n("tag:yaml.org,2002:str", {
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
  var n = requireType();
  return seq = new n("tag:yaml.org,2002:seq", {
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
  var n = requireType();
  return map = new n("tag:yaml.org,2002:map", {
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
  var n = requireSchema();
  return failsafe = new n({
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
  var n = requireType();
  function e(a) {
    if (a === null) return !0;
    var i = a.length;
    return i === 1 && a === "~" || i === 4 && (a === "null" || a === "Null" || a === "NULL");
  }
  function t() {
    return null;
  }
  function r(a) {
    return a === null;
  }
  return _null = new n("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: r,
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
  var n = requireType();
  function e(a) {
    if (a === null) return !1;
    var i = a.length;
    return i === 4 && (a === "true" || a === "True" || a === "TRUE") || i === 5 && (a === "false" || a === "False" || a === "FALSE");
  }
  function t(a) {
    return a === "true" || a === "True" || a === "TRUE";
  }
  function r(a) {
    return Object.prototype.toString.call(a) === "[object Boolean]";
  }
  return bool = new n("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: r,
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
  var n = requireCommon(), e = requireType();
  function t(c) {
    return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
  }
  function r(c) {
    return 48 <= c && c <= 55;
  }
  function a(c) {
    return 48 <= c && c <= 57;
  }
  function i(c) {
    if (c === null) return !1;
    var d = c.length, u = 0, m = !1, h;
    if (!d) return !1;
    if (h = c[u], (h === "-" || h === "+") && (h = c[++u]), h === "0") {
      if (u + 1 === d) return !0;
      if (h = c[++u], h === "b") {
        for (u++; u < d; u++)
          if (h = c[u], h !== "_") {
            if (h !== "0" && h !== "1") return !1;
            m = !0;
          }
        return m && h !== "_";
      }
      if (h === "x") {
        for (u++; u < d; u++)
          if (h = c[u], h !== "_") {
            if (!t(c.charCodeAt(u))) return !1;
            m = !0;
          }
        return m && h !== "_";
      }
      for (; u < d; u++)
        if (h = c[u], h !== "_") {
          if (!r(c.charCodeAt(u))) return !1;
          m = !0;
        }
      return m && h !== "_";
    }
    if (h === "_") return !1;
    for (; u < d; u++)
      if (h = c[u], h !== "_") {
        if (h === ":") break;
        if (!a(c.charCodeAt(u)))
          return !1;
        m = !0;
      }
    return !m || h === "_" ? !1 : h !== ":" ? !0 : /^(:[0-5]?[0-9])+$/.test(c.slice(u));
  }
  function s(c) {
    var d = c, u = 1, m, h, g = [];
    return d.indexOf("_") !== -1 && (d = d.replace(/_/g, "")), m = d[0], (m === "-" || m === "+") && (m === "-" && (u = -1), d = d.slice(1), m = d[0]), d === "0" ? 0 : m === "0" ? d[1] === "b" ? u * parseInt(d.slice(2), 2) : d[1] === "x" ? u * parseInt(d, 16) : u * parseInt(d, 8) : d.indexOf(":") !== -1 ? (d.split(":").forEach(function(v) {
      g.unshift(parseInt(v, 10));
    }), d = 0, h = 1, g.forEach(function(v) {
      d += v * h, h *= 60;
    }), u * d) : u * parseInt(d, 10);
  }
  function o(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && c % 1 === 0 && !n.isNegativeZero(c);
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
  var n = requireCommon(), e = requireType(), t = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function r(c) {
    return !(c === null || !t.test(c) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    c[c.length - 1] === "_");
  }
  function a(c) {
    var d, u, m, h;
    return d = c.replace(/_/g, "").toLowerCase(), u = d[0] === "-" ? -1 : 1, h = [], "+-".indexOf(d[0]) >= 0 && (d = d.slice(1)), d === ".inf" ? u === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : d === ".nan" ? NaN : d.indexOf(":") >= 0 ? (d.split(":").forEach(function(g) {
      h.unshift(parseFloat(g, 10));
    }), d = 0, m = 1, h.forEach(function(g) {
      d += g * m, m *= 60;
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
    else if (n.isNegativeZero(c))
      return "-0.0";
    return u = c.toString(10), i.test(u) ? u.replace("e", ".e") : u;
  }
  function o(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && (c % 1 !== 0 || n.isNegativeZero(c));
  }
  return float = new e("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: r,
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
  var n = requireSchema();
  return json = new n({
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
  var n = requireSchema();
  return core = new n({
    include: [
      requireJson()
    ]
  }), core;
}
var timestamp, hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  var n = requireType(), e = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  ), t = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function r(s) {
    return s === null ? !1 : e.exec(s) !== null || t.exec(s) !== null;
  }
  function a(s) {
    var o, c, d, u, m, h, g, v = 0, A = null, I, N, b;
    if (o = e.exec(s), o === null && (o = t.exec(s)), o === null) throw new Error("Date resolve error");
    if (c = +o[1], d = +o[2] - 1, u = +o[3], !o[4])
      return new Date(Date.UTC(c, d, u));
    if (m = +o[4], h = +o[5], g = +o[6], o[7]) {
      for (v = o[7].slice(0, 3); v.length < 3; )
        v += "0";
      v = +v;
    }
    return o[9] && (I = +o[10], N = +(o[11] || 0), A = (I * 60 + N) * 6e4, o[9] === "-" && (A = -A)), b = new Date(Date.UTC(c, d, u, m, h, g, v)), A && b.setTime(b.getTime() - A), b;
  }
  function i(s) {
    return s.toISOString();
  }
  return timestamp = new n("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: r,
    construct: a,
    instanceOf: Date,
    represent: i
  }), timestamp;
}
var merge, hasRequiredMerge;
function requireMerge() {
  if (hasRequiredMerge) return merge;
  hasRequiredMerge = 1;
  var n = requireType();
  function e(t) {
    return t === "<<" || t === null;
  }
  return merge = new n("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: e
  }), merge;
}
function commonjsRequire(n) {
  throw new Error('Could not dynamically require "' + n + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var binary, hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  var n;
  try {
    var e = commonjsRequire;
    n = e("buffer").Buffer;
  } catch {
  }
  var t = requireType(), r = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function a(c) {
    if (c === null) return !1;
    var d, u, m = 0, h = c.length, g = r;
    for (u = 0; u < h; u++)
      if (d = g.indexOf(c.charAt(u)), !(d > 64)) {
        if (d < 0) return !1;
        m += 6;
      }
    return m % 8 === 0;
  }
  function i(c) {
    var d, u, m = c.replace(/[\r\n=]/g, ""), h = m.length, g = r, v = 0, A = [];
    for (d = 0; d < h; d++)
      d % 4 === 0 && d && (A.push(v >> 16 & 255), A.push(v >> 8 & 255), A.push(v & 255)), v = v << 6 | g.indexOf(m.charAt(d));
    return u = h % 4 * 6, u === 0 ? (A.push(v >> 16 & 255), A.push(v >> 8 & 255), A.push(v & 255)) : u === 18 ? (A.push(v >> 10 & 255), A.push(v >> 2 & 255)) : u === 12 && A.push(v >> 4 & 255), n ? n.from ? n.from(A) : new n(A) : A;
  }
  function s(c) {
    var d = "", u = 0, m, h, g = c.length, v = r;
    for (m = 0; m < g; m++)
      m % 3 === 0 && m && (d += v[u >> 18 & 63], d += v[u >> 12 & 63], d += v[u >> 6 & 63], d += v[u & 63]), u = (u << 8) + c[m];
    return h = g % 3, h === 0 ? (d += v[u >> 18 & 63], d += v[u >> 12 & 63], d += v[u >> 6 & 63], d += v[u & 63]) : h === 2 ? (d += v[u >> 10 & 63], d += v[u >> 4 & 63], d += v[u << 2 & 63], d += v[64]) : h === 1 && (d += v[u >> 2 & 63], d += v[u << 4 & 63], d += v[64], d += v[64]), d;
  }
  function o(c) {
    return n && n.isBuffer(c);
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
  var n = requireType(), e = Object.prototype.hasOwnProperty, t = Object.prototype.toString;
  function r(i) {
    if (i === null) return !0;
    var s = {}, o, c, d, u, m, h = i;
    for (o = 0, c = h.length; o < c; o += 1) {
      if (d = h[o], m = !1, t.call(d) !== "[object Object]") return !1;
      for (u in d)
        if (e.call(d, u))
          if (!m) m = !0;
          else return !1;
      if (!m || e.call(s, u)) return !1;
      Object.defineProperty(s, u, { value: !0 });
    }
    return !0;
  }
  function a(i) {
    return i !== null ? i : [];
  }
  return omap = new n("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: r,
    construct: a
  }), omap;
}
var pairs, hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  var n = requireType(), e = Object.prototype.toString;
  function t(a) {
    if (a === null) return !0;
    var i, s, o, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1) {
      if (o = u[i], e.call(o) !== "[object Object]" || (c = Object.keys(o), c.length !== 1)) return !1;
      d[i] = [c[0], o[c[0]]];
    }
    return !0;
  }
  function r(a) {
    if (a === null) return [];
    var i, s, o, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1)
      o = u[i], c = Object.keys(o), d[i] = [c[0], o[c[0]]];
    return d;
  }
  return pairs = new n("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: t,
    construct: r
  }), pairs;
}
var set, hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  var n = requireType(), e = Object.prototype.hasOwnProperty;
  function t(a) {
    if (a === null) return !0;
    var i, s = a;
    for (i in s)
      if (e.call(s, i) && s[i] !== null)
        return !1;
    return !0;
  }
  function r(a) {
    return a !== null ? a : {};
  }
  return set = new n("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: t,
    construct: r
  }), set;
}
var default_safe, hasRequiredDefault_safe;
function requireDefault_safe() {
  if (hasRequiredDefault_safe) return default_safe;
  hasRequiredDefault_safe = 1;
  var n = requireSchema();
  return default_safe = new n({
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
  var n = requireType();
  function e() {
    return !0;
  }
  function t() {
  }
  function r() {
    return "";
  }
  function a(i) {
    return typeof i > "u";
  }
  return _undefined = new n("tag:yaml.org,2002:js/undefined", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: a,
    represent: r
  }), _undefined;
}
var regexp, hasRequiredRegexp;
function requireRegexp() {
  if (hasRequiredRegexp) return regexp;
  hasRequiredRegexp = 1;
  var n = requireType();
  function e(i) {
    if (i === null || i.length === 0) return !1;
    var s = i, o = /\/([gim]*)$/.exec(i), c = "";
    return !(s[0] === "/" && (o && (c = o[1]), c.length > 3 || s[s.length - c.length - 1] !== "/"));
  }
  function t(i) {
    var s = i, o = /\/([gim]*)$/.exec(i), c = "";
    return s[0] === "/" && (o && (c = o[1]), s = s.slice(1, s.length - c.length - 1)), new RegExp(s, c);
  }
  function r(i) {
    var s = "/" + i.source + "/";
    return i.global && (s += "g"), i.multiline && (s += "m"), i.ignoreCase && (s += "i"), s;
  }
  function a(i) {
    return Object.prototype.toString.call(i) === "[object RegExp]";
  }
  return regexp = new n("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve: e,
    construct: t,
    predicate: a,
    represent: r
  }), regexp;
}
var _function, hasRequired_function;
function require_function() {
  if (hasRequired_function) return _function;
  hasRequired_function = 1;
  var n;
  try {
    var e = commonjsRequire;
    n = e("esprima");
  } catch {
    typeof window < "u" && (n = window.esprima);
  }
  var t = requireType();
  function r(o) {
    if (o === null) return !1;
    try {
      var c = "(" + o + ")", d = n.parse(c, { range: !0 });
      return !(d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression");
    } catch {
      return !1;
    }
  }
  function a(o) {
    var c = "(" + o + ")", d = n.parse(c, { range: !0 }), u = [], m;
    if (d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression")
      throw new Error("Failed to resolve function");
    return d.body[0].expression.params.forEach(function(h) {
      u.push(h.name);
    }), m = d.body[0].expression.body.range, d.body[0].expression.body.type === "BlockStatement" ? new Function(u, c.slice(m[0] + 1, m[1] - 1)) : new Function(u, "return " + c.slice(m[0], m[1]));
  }
  function i(o) {
    return o.toString();
  }
  function s(o) {
    return Object.prototype.toString.call(o) === "[object Function]";
  }
  return _function = new t("tag:yaml.org,2002:js/function", {
    kind: "scalar",
    resolve: r,
    construct: a,
    predicate: s,
    represent: i
  }), _function;
}
var default_full, hasRequiredDefault_full;
function requireDefault_full() {
  if (hasRequiredDefault_full) return default_full;
  hasRequiredDefault_full = 1;
  var n = requireSchema();
  return default_full = n.DEFAULT = new n({
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
  var n = requireCommon(), e = requireException(), t = requireMark(), r = requireDefault_safe(), a = requireDefault_full(), i = Object.prototype.hasOwnProperty, s = 1, o = 2, c = 3, d = 4, u = 1, m = 2, h = 3, g = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, v = /[\x85\u2028\u2029]/, A = /[,\[\]\{\}]/, I = /^(?:!|!!|![a-z\-]+!)$/i, N = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function b(l) {
    return Object.prototype.toString.call(l);
  }
  function y(l) {
    return l === 10 || l === 13;
  }
  function E(l) {
    return l === 9 || l === 32;
  }
  function _(l) {
    return l === 9 || l === 32 || l === 10 || l === 13;
  }
  function D(l) {
    return l === 44 || l === 91 || l === 93 || l === 123 || l === 125;
  }
  function L(l) {
    var x;
    return 48 <= l && l <= 57 ? l - 48 : (x = l | 32, 97 <= x && x <= 102 ? x - 97 + 10 : -1);
  }
  function V(l) {
    return l === 120 ? 2 : l === 117 ? 4 : l === 85 ? 8 : 0;
  }
  function F(l) {
    return 48 <= l && l <= 57 ? l - 48 : -1;
  }
  function U(l) {
    return l === 48 ? "\0" : l === 97 ? "\x07" : l === 98 ? "\b" : l === 116 || l === 9 ? "	" : l === 110 ? `
` : l === 118 ? "\v" : l === 102 ? "\f" : l === 114 ? "\r" : l === 101 ? "\x1B" : l === 32 ? " " : l === 34 ? '"' : l === 47 ? "/" : l === 92 ? "\\" : l === 78 ? "" : l === 95 ? " " : l === 76 ? "\u2028" : l === 80 ? "\u2029" : "";
  }
  function W(l) {
    return l <= 65535 ? String.fromCharCode(l) : String.fromCharCode(
      (l - 65536 >> 10) + 55296,
      (l - 65536 & 1023) + 56320
    );
  }
  function Y(l, x, k) {
    x === "__proto__" ? Object.defineProperty(l, x, {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: k
    }) : l[x] = k;
  }
  for (var le = new Array(256), J = new Array(256), ie = 0; ie < 256; ie++)
    le[ie] = U(ie) ? 1 : 0, J[ie] = U(ie);
  function fe(l, x) {
    this.input = l, this.filename = x.filename || null, this.schema = x.schema || a, this.onWarning = x.onWarning || null, this.legacy = x.legacy || !1, this.json = x.json || !1, this.listener = x.listener || null, this.maxTotalMergeKeys = typeof x.maxTotalMergeKeys == "number" ? x.maxTotalMergeKeys : 1e4, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = l.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.totalMergeKeys = 0, this.documents = [];
  }
  function ce(l, x) {
    return new e(
      x,
      new t(l.filename, l.input, l.position, l.line, l.position - l.lineStart)
    );
  }
  function q(l, x) {
    throw ce(l, x);
  }
  function X(l, x) {
    l.onWarning && l.onWarning.call(null, ce(l, x));
  }
  var ne = {
    YAML: function(x, k, j) {
      var S, p, f;
      x.version !== null && q(x, "duplication of %YAML directive"), j.length !== 1 && q(x, "YAML directive accepts exactly one argument"), S = /^([0-9]+)\.([0-9]+)$/.exec(j[0]), S === null && q(x, "ill-formed argument of the YAML directive"), p = parseInt(S[1], 10), f = parseInt(S[2], 10), p !== 1 && q(x, "unacceptable YAML version of the document"), x.version = j[0], x.checkLineBreaks = f < 2, f !== 1 && f !== 2 && X(x, "unsupported YAML version of the document");
    },
    TAG: function(x, k, j) {
      var S, p;
      j.length !== 2 && q(x, "TAG directive accepts exactly two arguments"), S = j[0], p = j[1], I.test(S) || q(x, "ill-formed tag handle (first argument) of the TAG directive"), i.call(x.tagMap, S) && q(x, 'there is a previously declared suffix for "' + S + '" tag handle'), N.test(p) || q(x, "ill-formed tag prefix (second argument) of the TAG directive"), x.tagMap[S] = p;
    }
  };
  function $(l, x, k, j) {
    var S, p, f, w;
    if (x < k) {
      if (w = l.input.slice(x, k), j)
        for (S = 0, p = w.length; S < p; S += 1)
          f = w.charCodeAt(S), f === 9 || 32 <= f && f <= 1114111 || q(l, "expected valid JSON character");
      else g.test(w) && q(l, "the stream contains non-printable characters");
      l.result += w;
    }
  }
  function K(l, x, k, j) {
    var S, p, f, w;
    for (n.isObject(k) || q(l, "cannot merge mappings; the provided source object is unacceptable"), S = Object.keys(k), f = 0, w = S.length; f < w; f += 1)
      p = S[f], l.maxTotalMergeKeys !== -1 && ++l.totalMergeKeys > l.maxTotalMergeKeys && q(l, "merge keys exceeded maxTotalMergeKeys (" + l.maxTotalMergeKeys + ")"), i.call(x, p) || (Y(x, p, k[p]), j[p] = !0);
  }
  function ee(l, x, k, j, S, p, f, w) {
    var T, P;
    if (Array.isArray(S))
      for (S = Array.prototype.slice.call(S), T = 0, P = S.length; T < P; T += 1)
        Array.isArray(S[T]) && q(l, "nested arrays are not supported inside keys"), typeof S == "object" && b(S[T]) === "[object Object]" && (S[T] = "[object Object]");
    if (typeof S == "object" && b(S) === "[object Object]" && (S = "[object Object]"), S = String(S), x === null && (x = {}), j === "tag:yaml.org,2002:merge")
      if (Array.isArray(p))
        for (T = 0, P = p.length; T < P; T += 1)
          K(l, x, p[T], k);
      else
        K(l, x, p, k);
    else
      !l.json && !i.call(k, S) && i.call(x, S) && (l.line = f || l.line, l.position = w || l.position, q(l, "duplicated mapping key")), Y(x, S, p), delete k[S];
    return x;
  }
  function te(l) {
    var x;
    x = l.input.charCodeAt(l.position), x === 10 ? l.position++ : x === 13 ? (l.position++, l.input.charCodeAt(l.position) === 10 && l.position++) : q(l, "a line break is expected"), l.line += 1, l.lineStart = l.position;
  }
  function G(l, x, k) {
    for (var j = 0, S = l.input.charCodeAt(l.position); S !== 0; ) {
      for (; E(S); )
        S = l.input.charCodeAt(++l.position);
      if (x && S === 35)
        do
          S = l.input.charCodeAt(++l.position);
        while (S !== 10 && S !== 13 && S !== 0);
      if (y(S))
        for (te(l), S = l.input.charCodeAt(l.position), j++, l.lineIndent = 0; S === 32; )
          l.lineIndent++, S = l.input.charCodeAt(++l.position);
      else
        break;
    }
    return k !== -1 && j !== 0 && l.lineIndent < k && X(l, "deficient indentation"), j;
  }
  function re(l) {
    var x = l.position, k;
    return k = l.input.charCodeAt(x), !!((k === 45 || k === 46) && k === l.input.charCodeAt(x + 1) && k === l.input.charCodeAt(x + 2) && (x += 3, k = l.input.charCodeAt(x), k === 0 || _(k)));
  }
  function ae(l, x) {
    x === 1 ? l.result += " " : x > 1 && (l.result += n.repeat(`
`, x - 1));
  }
  function de(l, x, k) {
    var j, S, p, f, w, T, P, R, C = l.kind, Z = l.result, O;
    if (O = l.input.charCodeAt(l.position), _(O) || D(O) || O === 35 || O === 38 || O === 42 || O === 33 || O === 124 || O === 62 || O === 39 || O === 34 || O === 37 || O === 64 || O === 96 || (O === 63 || O === 45) && (S = l.input.charCodeAt(l.position + 1), _(S) || k && D(S)))
      return !1;
    for (l.kind = "scalar", l.result = "", p = f = l.position, w = !1; O !== 0; ) {
      if (O === 58) {
        if (S = l.input.charCodeAt(l.position + 1), _(S) || k && D(S))
          break;
      } else if (O === 35) {
        if (j = l.input.charCodeAt(l.position - 1), _(j))
          break;
      } else {
        if (l.position === l.lineStart && re(l) || k && D(O))
          break;
        if (y(O))
          if (T = l.line, P = l.lineStart, R = l.lineIndent, G(l, !1, -1), l.lineIndent >= x) {
            w = !0, O = l.input.charCodeAt(l.position);
            continue;
          } else {
            l.position = f, l.line = T, l.lineStart = P, l.lineIndent = R;
            break;
          }
      }
      w && ($(l, p, f, !1), ae(l, l.line - T), p = f = l.position, w = !1), E(O) || (f = l.position + 1), O = l.input.charCodeAt(++l.position);
    }
    return $(l, p, f, !1), l.result ? !0 : (l.kind = C, l.result = Z, !1);
  }
  function he(l, x) {
    var k, j, S;
    if (k = l.input.charCodeAt(l.position), k !== 39)
      return !1;
    for (l.kind = "scalar", l.result = "", l.position++, j = S = l.position; (k = l.input.charCodeAt(l.position)) !== 0; )
      if (k === 39)
        if ($(l, j, l.position, !0), k = l.input.charCodeAt(++l.position), k === 39)
          j = l.position, l.position++, S = l.position;
        else
          return !0;
      else y(k) ? ($(l, j, S, !0), ae(l, G(l, !1, x)), j = S = l.position) : l.position === l.lineStart && re(l) ? q(l, "unexpected end of the document within a single quoted scalar") : (l.position++, S = l.position);
    q(l, "unexpected end of the stream within a single quoted scalar");
  }
  function ue(l, x) {
    var k, j, S, p, f, w;
    if (w = l.input.charCodeAt(l.position), w !== 34)
      return !1;
    for (l.kind = "scalar", l.result = "", l.position++, k = j = l.position; (w = l.input.charCodeAt(l.position)) !== 0; ) {
      if (w === 34)
        return $(l, k, l.position, !0), l.position++, !0;
      if (w === 92) {
        if ($(l, k, l.position, !0), w = l.input.charCodeAt(++l.position), y(w))
          G(l, !1, x);
        else if (w < 256 && le[w])
          l.result += J[w], l.position++;
        else if ((f = V(w)) > 0) {
          for (S = f, p = 0; S > 0; S--)
            w = l.input.charCodeAt(++l.position), (f = L(w)) >= 0 ? p = (p << 4) + f : q(l, "expected hexadecimal character");
          l.result += W(p), l.position++;
        } else
          q(l, "unknown escape sequence");
        k = j = l.position;
      } else y(w) ? ($(l, k, j, !0), ae(l, G(l, !1, x)), k = j = l.position) : l.position === l.lineStart && re(l) ? q(l, "unexpected end of the document within a double quoted scalar") : (l.position++, j = l.position);
    }
    q(l, "unexpected end of the stream within a double quoted scalar");
  }
  function se(l, x) {
    var k = !0, j, S = l.tag, p, f = l.anchor, w, T, P, R, C, Z = {}, O, M, H, B;
    if (B = l.input.charCodeAt(l.position), B === 91)
      T = 93, C = !1, p = [];
    else if (B === 123)
      T = 125, C = !0, p = {};
    else
      return !1;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = p), B = l.input.charCodeAt(++l.position); B !== 0; ) {
      if (G(l, !0, x), B = l.input.charCodeAt(l.position), B === T)
        return l.position++, l.tag = S, l.anchor = f, l.kind = C ? "mapping" : "sequence", l.result = p, !0;
      k || q(l, "missed comma between flow collection entries"), M = O = H = null, P = R = !1, B === 63 && (w = l.input.charCodeAt(l.position + 1), _(w) && (P = R = !0, l.position++, G(l, !0, x))), j = l.line, oe(l, x, s, !1, !0), M = l.tag, O = l.result, G(l, !0, x), B = l.input.charCodeAt(l.position), (R || l.line === j) && B === 58 && (P = !0, B = l.input.charCodeAt(++l.position), G(l, !0, x), oe(l, x, s, !1, !0), H = l.result), C ? ee(l, p, Z, M, O, H) : P ? p.push(ee(l, null, Z, M, O, H)) : p.push(O), G(l, !0, x), B = l.input.charCodeAt(l.position), B === 44 ? (k = !0, B = l.input.charCodeAt(++l.position)) : k = !1;
    }
    q(l, "unexpected end of the stream within a flow collection");
  }
  function pe(l, x) {
    var k, j, S = u, p = !1, f = !1, w = x, T = 0, P = !1, R, C;
    if (C = l.input.charCodeAt(l.position), C === 124)
      j = !1;
    else if (C === 62)
      j = !0;
    else
      return !1;
    for (l.kind = "scalar", l.result = ""; C !== 0; )
      if (C = l.input.charCodeAt(++l.position), C === 43 || C === 45)
        u === S ? S = C === 43 ? h : m : q(l, "repeat of a chomping mode identifier");
      else if ((R = F(C)) >= 0)
        R === 0 ? q(l, "bad explicit indentation width of a block scalar; it cannot be less than one") : f ? q(l, "repeat of an indentation width identifier") : (w = x + R - 1, f = !0);
      else
        break;
    if (E(C)) {
      do
        C = l.input.charCodeAt(++l.position);
      while (E(C));
      if (C === 35)
        do
          C = l.input.charCodeAt(++l.position);
        while (!y(C) && C !== 0);
    }
    for (; C !== 0; ) {
      for (te(l), l.lineIndent = 0, C = l.input.charCodeAt(l.position); (!f || l.lineIndent < w) && C === 32; )
        l.lineIndent++, C = l.input.charCodeAt(++l.position);
      if (!f && l.lineIndent > w && (w = l.lineIndent), y(C)) {
        T++;
        continue;
      }
      if (l.lineIndent < w) {
        S === h ? l.result += n.repeat(`
`, p ? 1 + T : T) : S === u && p && (l.result += `
`);
        break;
      }
      for (j ? E(C) ? (P = !0, l.result += n.repeat(`
`, p ? 1 + T : T)) : P ? (P = !1, l.result += n.repeat(`
`, T + 1)) : T === 0 ? p && (l.result += " ") : l.result += n.repeat(`
`, T) : l.result += n.repeat(`
`, p ? 1 + T : T), p = !0, f = !0, T = 0, k = l.position; !y(C) && C !== 0; )
        C = l.input.charCodeAt(++l.position);
      $(l, k, l.position, !1);
    }
    return !0;
  }
  function me(l, x) {
    var k, j = l.tag, S = l.anchor, p = [], f, w = !1, T;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = p), T = l.input.charCodeAt(l.position); T !== 0 && !(T !== 45 || (f = l.input.charCodeAt(l.position + 1), !_(f))); ) {
      if (w = !0, l.position++, G(l, !0, -1) && l.lineIndent <= x) {
        p.push(null), T = l.input.charCodeAt(l.position);
        continue;
      }
      if (k = l.line, oe(l, x, c, !1, !0), p.push(l.result), G(l, !0, -1), T = l.input.charCodeAt(l.position), (l.line === k || l.lineIndent > x) && T !== 0)
        q(l, "bad indentation of a sequence entry");
      else if (l.lineIndent < x)
        break;
    }
    return w ? (l.tag = j, l.anchor = S, l.kind = "sequence", l.result = p, !0) : !1;
  }
  function Te(l, x, k) {
    var j, S, p, f, w = l.tag, T = l.anchor, P = {}, R = {}, C = null, Z = null, O = null, M = !1, H = !1, B;
    for (l.anchor !== null && (l.anchorMap[l.anchor] = P), B = l.input.charCodeAt(l.position); B !== 0; ) {
      if (j = l.input.charCodeAt(l.position + 1), p = l.line, f = l.position, (B === 63 || B === 58) && _(j))
        B === 63 ? (M && (ee(l, P, R, C, Z, null), C = Z = O = null), H = !0, M = !0, S = !0) : M ? (M = !1, S = !0) : q(l, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), l.position += 1, B = j;
      else if (oe(l, k, o, !1, !0))
        if (l.line === p) {
          for (B = l.input.charCodeAt(l.position); E(B); )
            B = l.input.charCodeAt(++l.position);
          if (B === 58)
            B = l.input.charCodeAt(++l.position), _(B) || q(l, "a whitespace character is expected after the key-value separator within a block mapping"), M && (ee(l, P, R, C, Z, null), C = Z = O = null), H = !0, M = !1, S = !1, C = l.tag, Z = l.result;
          else if (H)
            q(l, "can not read an implicit mapping pair; a colon is missed");
          else
            return l.tag = w, l.anchor = T, !0;
        } else if (H)
          q(l, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else
          return l.tag = w, l.anchor = T, !0;
      else
        break;
      if ((l.line === p || l.lineIndent > x) && (oe(l, x, d, !0, S) && (M ? Z = l.result : O = l.result), M || (ee(l, P, R, C, Z, O, p, f), C = Z = O = null), G(l, !0, -1), B = l.input.charCodeAt(l.position)), l.lineIndent > x && B !== 0)
        q(l, "bad indentation of a mapping entry");
      else if (l.lineIndent < x)
        break;
    }
    return M && ee(l, P, R, C, Z, null), H && (l.tag = w, l.anchor = T, l.kind = "mapping", l.result = P), H;
  }
  function ge(l) {
    var x, k = !1, j = !1, S, p, f;
    if (f = l.input.charCodeAt(l.position), f !== 33) return !1;
    if (l.tag !== null && q(l, "duplication of a tag property"), f = l.input.charCodeAt(++l.position), f === 60 ? (k = !0, f = l.input.charCodeAt(++l.position)) : f === 33 ? (j = !0, S = "!!", f = l.input.charCodeAt(++l.position)) : S = "!", x = l.position, k) {
      do
        f = l.input.charCodeAt(++l.position);
      while (f !== 0 && f !== 62);
      l.position < l.length ? (p = l.input.slice(x, l.position), f = l.input.charCodeAt(++l.position)) : q(l, "unexpected end of the stream within a verbatim tag");
    } else {
      for (; f !== 0 && !_(f); )
        f === 33 && (j ? q(l, "tag suffix cannot contain exclamation marks") : (S = l.input.slice(x - 1, l.position + 1), I.test(S) || q(l, "named tag handle cannot contain such characters"), j = !0, x = l.position + 1)), f = l.input.charCodeAt(++l.position);
      p = l.input.slice(x, l.position), A.test(p) && q(l, "tag suffix cannot contain flow indicator characters");
    }
    return p && !N.test(p) && q(l, "tag name cannot contain such characters: " + p), k ? l.tag = p : i.call(l.tagMap, S) ? l.tag = l.tagMap[S] + p : S === "!" ? l.tag = "!" + p : S === "!!" ? l.tag = "tag:yaml.org,2002:" + p : q(l, 'undeclared tag handle "' + S + '"'), !0;
  }
  function ye(l) {
    var x, k;
    if (k = l.input.charCodeAt(l.position), k !== 38) return !1;
    for (l.anchor !== null && q(l, "duplication of an anchor property"), k = l.input.charCodeAt(++l.position), x = l.position; k !== 0 && !_(k) && !D(k); )
      k = l.input.charCodeAt(++l.position);
    return l.position === x && q(l, "name of an anchor node must contain at least one character"), l.anchor = l.input.slice(x, l.position), !0;
  }
  function Ae(l) {
    var x, k, j;
    if (j = l.input.charCodeAt(l.position), j !== 42) return !1;
    for (j = l.input.charCodeAt(++l.position), x = l.position; j !== 0 && !_(j) && !D(j); )
      j = l.input.charCodeAt(++l.position);
    return l.position === x && q(l, "name of an alias node must contain at least one character"), k = l.input.slice(x, l.position), i.call(l.anchorMap, k) || q(l, 'unidentified alias "' + k + '"'), l.result = l.anchorMap[k], G(l, !0, -1), !0;
  }
  function oe(l, x, k, j, S) {
    var p, f, w, T = 1, P = !1, R = !1, C, Z, O, M, H;
    if (l.listener !== null && l.listener("open", l), l.tag = null, l.anchor = null, l.kind = null, l.result = null, p = f = w = d === k || c === k, j && G(l, !0, -1) && (P = !0, l.lineIndent > x ? T = 1 : l.lineIndent === x ? T = 0 : l.lineIndent < x && (T = -1)), T === 1)
      for (; ge(l) || ye(l); )
        G(l, !0, -1) ? (P = !0, w = p, l.lineIndent > x ? T = 1 : l.lineIndent === x ? T = 0 : l.lineIndent < x && (T = -1)) : w = !1;
    if (w && (w = P || S), (T === 1 || d === k) && (s === k || o === k ? M = x : M = x + 1, H = l.position - l.lineStart, T === 1 ? w && (me(l, H) || Te(l, H, M)) || se(l, M) ? R = !0 : (f && pe(l, M) || he(l, M) || ue(l, M) ? R = !0 : Ae(l) ? (R = !0, (l.tag !== null || l.anchor !== null) && q(l, "alias node should not have any properties")) : de(l, M, s === k) && (R = !0, l.tag === null && (l.tag = "?")), l.anchor !== null && (l.anchorMap[l.anchor] = l.result)) : T === 0 && (R = w && me(l, H))), l.tag !== null && l.tag !== "!")
      if (l.tag === "?") {
        for (l.result !== null && l.kind !== "scalar" && q(l, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + l.kind + '"'), C = 0, Z = l.implicitTypes.length; C < Z; C += 1)
          if (O = l.implicitTypes[C], O.resolve(l.result)) {
            l.result = O.construct(l.result), l.tag = O.tag, l.anchor !== null && (l.anchorMap[l.anchor] = l.result);
            break;
          }
      } else i.call(l.typeMap[l.kind || "fallback"], l.tag) ? (O = l.typeMap[l.kind || "fallback"][l.tag], l.result !== null && O.kind !== l.kind && q(l, "unacceptable node kind for !<" + l.tag + '> tag; it should be "' + O.kind + '", not "' + l.kind + '"'), O.resolve(l.result) ? (l.result = O.construct(l.result), l.anchor !== null && (l.anchorMap[l.anchor] = l.result)) : q(l, "cannot resolve a node with !<" + l.tag + "> explicit tag")) : q(l, "unknown tag !<" + l.tag + ">");
    return l.listener !== null && l.listener("close", l), l.tag !== null || l.anchor !== null || R;
  }
  function ke(l) {
    var x = l.position, k, j, S, p = !1, f;
    for (l.version = null, l.checkLineBreaks = l.legacy, l.tagMap = {}, l.anchorMap = {}; (f = l.input.charCodeAt(l.position)) !== 0 && (G(l, !0, -1), f = l.input.charCodeAt(l.position), !(l.lineIndent > 0 || f !== 37)); ) {
      for (p = !0, f = l.input.charCodeAt(++l.position), k = l.position; f !== 0 && !_(f); )
        f = l.input.charCodeAt(++l.position);
      for (j = l.input.slice(k, l.position), S = [], j.length < 1 && q(l, "directive name must not be less than one character in length"); f !== 0; ) {
        for (; E(f); )
          f = l.input.charCodeAt(++l.position);
        if (f === 35) {
          do
            f = l.input.charCodeAt(++l.position);
          while (f !== 0 && !y(f));
          break;
        }
        if (y(f)) break;
        for (k = l.position; f !== 0 && !_(f); )
          f = l.input.charCodeAt(++l.position);
        S.push(l.input.slice(k, l.position));
      }
      f !== 0 && te(l), i.call(ne, j) ? ne[j](l, j, S) : X(l, 'unknown document directive "' + j + '"');
    }
    if (G(l, !0, -1), l.lineIndent === 0 && l.input.charCodeAt(l.position) === 45 && l.input.charCodeAt(l.position + 1) === 45 && l.input.charCodeAt(l.position + 2) === 45 ? (l.position += 3, G(l, !0, -1)) : p && q(l, "directives end mark is expected"), oe(l, l.lineIndent - 1, d, !1, !0), G(l, !0, -1), l.checkLineBreaks && v.test(l.input.slice(x, l.position)) && X(l, "non-ASCII line breaks are interpreted as content"), l.documents.push(l.result), l.position === l.lineStart && re(l)) {
      l.input.charCodeAt(l.position) === 46 && (l.position += 3, G(l, !0, -1));
      return;
    }
    if (l.position < l.length - 1)
      q(l, "end of the stream or a document separator is expected");
    else
      return;
  }
  function be(l, x) {
    l = String(l), x = x || {}, l.length !== 0 && (l.charCodeAt(l.length - 1) !== 10 && l.charCodeAt(l.length - 1) !== 13 && (l += `
`), l.charCodeAt(0) === 65279 && (l = l.slice(1)));
    var k = new fe(l, x), j = l.indexOf("\0");
    for (j !== -1 && (k.position = j, q(k, "null byte is not allowed in input")), k.input += "\0"; k.input.charCodeAt(k.position) === 32; )
      k.lineIndent += 1, k.position += 1;
    for (; k.position < k.length - 1; )
      ke(k);
    return k.documents;
  }
  function xe(l, x, k) {
    x !== null && typeof x == "object" && typeof k > "u" && (k = x, x = null);
    var j = be(l, k);
    if (typeof x != "function")
      return j;
    for (var S = 0, p = j.length; S < p; S += 1)
      x(j[S]);
  }
  function ve(l, x) {
    var k = be(l, x);
    if (k.length !== 0) {
      if (k.length === 1)
        return k[0];
      throw new e("expected a single document in the stream, but found more");
    }
  }
  function _e(l, x, k) {
    return typeof x == "object" && x !== null && typeof k > "u" && (k = x, x = null), xe(l, x, n.extend({ schema: r }, k));
  }
  function we(l, x) {
    return ve(l, n.extend({ schema: r }, x));
  }
  return loader.loadAll = xe, loader.load = ve, loader.safeLoadAll = _e, loader.safeLoad = we, loader;
}
var dumper = {}, hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  var n = requireCommon(), e = requireException(), t = requireDefault_full(), r = requireDefault_safe(), a = Object.prototype.toString, i = Object.prototype.hasOwnProperty, s = 9, o = 10, c = 13, d = 32, u = 33, m = 34, h = 35, g = 37, v = 38, A = 39, I = 42, N = 44, b = 45, y = 58, E = 61, _ = 62, D = 63, L = 64, V = 91, F = 93, U = 96, W = 123, Y = 124, le = 125, J = {};
  J[0] = "\\0", J[7] = "\\a", J[8] = "\\b", J[9] = "\\t", J[10] = "\\n", J[11] = "\\v", J[12] = "\\f", J[13] = "\\r", J[27] = "\\e", J[34] = '\\"', J[92] = "\\\\", J[133] = "\\N", J[160] = "\\_", J[8232] = "\\L", J[8233] = "\\P";
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
  function fe(p, f) {
    var w, T, P, R, C, Z, O;
    if (f === null) return {};
    for (w = {}, T = Object.keys(f), P = 0, R = T.length; P < R; P += 1)
      C = T[P], Z = String(f[C]), C.slice(0, 2) === "!!" && (C = "tag:yaml.org,2002:" + C.slice(2)), O = p.compiledTypeMap.fallback[C], O && i.call(O.styleAliases, Z) && (Z = O.styleAliases[Z]), w[C] = Z;
    return w;
  }
  function ce(p) {
    var f, w, T;
    if (f = p.toString(16).toUpperCase(), p <= 255)
      w = "x", T = 2;
    else if (p <= 65535)
      w = "u", T = 4;
    else if (p <= 4294967295)
      w = "U", T = 8;
    else
      throw new e("code point within a string may not be greater than 0xFFFFFFFF");
    return "\\" + w + n.repeat("0", T - f.length) + f;
  }
  function q(p) {
    this.schema = p.schema || t, this.indent = Math.max(1, p.indent || 2), this.noArrayIndent = p.noArrayIndent || !1, this.skipInvalid = p.skipInvalid || !1, this.flowLevel = n.isNothing(p.flowLevel) ? -1 : p.flowLevel, this.styleMap = fe(this.schema, p.styles || null), this.sortKeys = p.sortKeys || !1, this.lineWidth = p.lineWidth || 80, this.noRefs = p.noRefs || !1, this.noCompatMode = p.noCompatMode || !1, this.condenseFlow = p.condenseFlow || !1, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
  }
  function X(p, f) {
    for (var w = n.repeat(" ", f), T = 0, P = -1, R = "", C, Z = p.length; T < Z; )
      P = p.indexOf(`
`, T), P === -1 ? (C = p.slice(T), T = Z) : (C = p.slice(T, P + 1), T = P + 1), C.length && C !== `
` && (R += w), R += C;
    return R;
  }
  function ne(p, f) {
    return `
` + n.repeat(" ", p.indent * f);
  }
  function $(p, f) {
    var w, T, P;
    for (w = 0, T = p.implicitTypes.length; w < T; w += 1)
      if (P = p.implicitTypes[w], P.resolve(f))
        return !0;
    return !1;
  }
  function K(p) {
    return p === d || p === s;
  }
  function ee(p) {
    return 32 <= p && p <= 126 || 161 <= p && p <= 55295 && p !== 8232 && p !== 8233 || 57344 <= p && p <= 65533 && p !== 65279 || 65536 <= p && p <= 1114111;
  }
  function te(p) {
    return ee(p) && !K(p) && p !== 65279 && p !== c && p !== o;
  }
  function G(p, f) {
    return ee(p) && p !== 65279 && p !== N && p !== V && p !== F && p !== W && p !== le && p !== y && (p !== h || f && te(f));
  }
  function re(p) {
    return ee(p) && p !== 65279 && !K(p) && p !== b && p !== D && p !== y && p !== N && p !== V && p !== F && p !== W && p !== le && p !== h && p !== v && p !== I && p !== u && p !== Y && p !== E && p !== _ && p !== A && p !== m && p !== g && p !== L && p !== U;
  }
  function ae(p) {
    var f = /^\n* /;
    return f.test(p);
  }
  var de = 1, he = 2, ue = 3, se = 4, pe = 5;
  function me(p, f, w, T, P) {
    var R, C, Z, O = !1, M = !1, H = T !== -1, B = -1, Q = re(p.charCodeAt(0)) && !K(p.charCodeAt(p.length - 1));
    if (f)
      for (R = 0; R < p.length; R++) {
        if (C = p.charCodeAt(R), !ee(C))
          return pe;
        Z = R > 0 ? p.charCodeAt(R - 1) : null, Q = Q && G(C, Z);
      }
    else {
      for (R = 0; R < p.length; R++) {
        if (C = p.charCodeAt(R), C === o)
          O = !0, H && (M = M || // Foldable line = too long, and not more-indented.
          R - B - 1 > T && p[B + 1] !== " ", B = R);
        else if (!ee(C))
          return pe;
        Z = R > 0 ? p.charCodeAt(R - 1) : null, Q = Q && G(C, Z);
      }
      M = M || H && R - B - 1 > T && p[B + 1] !== " ";
    }
    return !O && !M ? Q && !P(p) ? de : he : w > 9 && ae(p) ? pe : M ? se : ue;
  }
  function Te(p, f, w, T) {
    p.dump = (function() {
      if (f.length === 0)
        return "''";
      if (!p.noCompatMode && ie.indexOf(f) !== -1)
        return "'" + f + "'";
      var P = p.indent * Math.max(1, w), R = p.lineWidth === -1 ? -1 : Math.max(Math.min(p.lineWidth, 40), p.lineWidth - P), C = T || p.flowLevel > -1 && w >= p.flowLevel;
      function Z(O) {
        return $(p, O);
      }
      switch (me(f, C, p.indent, R, Z)) {
        case de:
          return f;
        case he:
          return "'" + f.replace(/'/g, "''") + "'";
        case ue:
          return "|" + ge(f, p.indent) + ye(X(f, P));
        case se:
          return ">" + ge(f, p.indent) + ye(X(Ae(f, R), P));
        case pe:
          return '"' + ke(f) + '"';
        default:
          throw new e("impossible error: invalid scalar style");
      }
    })();
  }
  function ge(p, f) {
    var w = ae(p) ? String(f) : "", T = p[p.length - 1] === `
`, P = T && (p[p.length - 2] === `
` || p === `
`), R = P ? "+" : T ? "" : "-";
    return w + R + `
`;
  }
  function ye(p) {
    return p[p.length - 1] === `
` ? p.slice(0, -1) : p;
  }
  function Ae(p, f) {
    for (var w = /(\n+)([^\n]*)/g, T = (function() {
      var M = p.indexOf(`
`);
      return M = M !== -1 ? M : p.length, w.lastIndex = M, oe(p.slice(0, M), f);
    })(), P = p[0] === `
` || p[0] === " ", R, C; C = w.exec(p); ) {
      var Z = C[1], O = C[2];
      R = O[0] === " ", T += Z + (!P && !R && O !== "" ? `
` : "") + oe(O, f), P = R;
    }
    return T;
  }
  function oe(p, f) {
    if (p === "" || p[0] === " ") return p;
    for (var w = / [^ ]/g, T, P = 0, R, C = 0, Z = 0, O = ""; T = w.exec(p); )
      Z = T.index, Z - P > f && (R = C > P ? C : Z, O += `
` + p.slice(P, R), P = R + 1), C = Z;
    return O += `
`, p.length - P > f && C > P ? O += p.slice(P, C) + `
` + p.slice(C + 1) : O += p.slice(P), O.slice(1);
  }
  function ke(p) {
    for (var f = "", w, T, P, R = 0; R < p.length; R++) {
      if (w = p.charCodeAt(R), w >= 55296 && w <= 56319 && (T = p.charCodeAt(R + 1), T >= 56320 && T <= 57343)) {
        f += ce((w - 55296) * 1024 + T - 56320 + 65536), R++;
        continue;
      }
      P = J[w], f += !P && ee(w) ? p[R] : P || ce(w);
    }
    return f;
  }
  function be(p, f, w) {
    var T = "", P = p.tag, R, C;
    for (R = 0, C = w.length; R < C; R += 1)
      l(p, f, w[R], !1, !1) && (R !== 0 && (T += "," + (p.condenseFlow ? "" : " ")), T += p.dump);
    p.tag = P, p.dump = "[" + T + "]";
  }
  function xe(p, f, w, T) {
    var P = "", R = p.tag, C, Z;
    for (C = 0, Z = w.length; C < Z; C += 1)
      l(p, f + 1, w[C], !0, !0) && ((!T || C !== 0) && (P += ne(p, f)), p.dump && o === p.dump.charCodeAt(0) ? P += "-" : P += "- ", P += p.dump);
    p.tag = R, p.dump = P || "[]";
  }
  function ve(p, f, w) {
    var T = "", P = p.tag, R = Object.keys(w), C, Z, O, M, H;
    for (C = 0, Z = R.length; C < Z; C += 1)
      H = "", C !== 0 && (H += ", "), p.condenseFlow && (H += '"'), O = R[C], M = w[O], l(p, f, O, !1, !1) && (p.dump.length > 1024 && (H += "? "), H += p.dump + (p.condenseFlow ? '"' : "") + ":" + (p.condenseFlow ? "" : " "), l(p, f, M, !1, !1) && (H += p.dump, T += H));
    p.tag = P, p.dump = "{" + T + "}";
  }
  function _e(p, f, w, T) {
    var P = "", R = p.tag, C = Object.keys(w), Z, O, M, H, B, Q;
    if (p.sortKeys === !0)
      C.sort();
    else if (typeof p.sortKeys == "function")
      C.sort(p.sortKeys);
    else if (p.sortKeys)
      throw new e("sortKeys must be a boolean or a function");
    for (Z = 0, O = C.length; Z < O; Z += 1)
      Q = "", (!T || Z !== 0) && (Q += ne(p, f)), M = C[Z], H = w[M], l(p, f + 1, M, !0, !0, !0) && (B = p.tag !== null && p.tag !== "?" || p.dump && p.dump.length > 1024, B && (p.dump && o === p.dump.charCodeAt(0) ? Q += "?" : Q += "? "), Q += p.dump, B && (Q += ne(p, f)), l(p, f + 1, H, !0, B) && (p.dump && o === p.dump.charCodeAt(0) ? Q += ":" : Q += ": ", Q += p.dump, P += Q));
    p.tag = R, p.dump = P || "{}";
  }
  function we(p, f, w) {
    var T, P, R, C, Z, O;
    for (P = w ? p.explicitTypes : p.implicitTypes, R = 0, C = P.length; R < C; R += 1)
      if (Z = P[R], (Z.instanceOf || Z.predicate) && (!Z.instanceOf || typeof f == "object" && f instanceof Z.instanceOf) && (!Z.predicate || Z.predicate(f))) {
        if (p.tag = w ? Z.tag : "?", Z.represent) {
          if (O = p.styleMap[Z.tag] || Z.defaultStyle, a.call(Z.represent) === "[object Function]")
            T = Z.represent(f, O);
          else if (i.call(Z.represent, O))
            T = Z.represent[O](f, O);
          else
            throw new e("!<" + Z.tag + '> tag resolver accepts not "' + O + '" style');
          p.dump = T;
        }
        return !0;
      }
    return !1;
  }
  function l(p, f, w, T, P, R) {
    p.tag = null, p.dump = w, we(p, w, !1) || we(p, w, !0);
    var C = a.call(p.dump);
    T && (T = p.flowLevel < 0 || p.flowLevel > f);
    var Z = C === "[object Object]" || C === "[object Array]", O, M;
    if (Z && (O = p.duplicates.indexOf(w), M = O !== -1), (p.tag !== null && p.tag !== "?" || M || p.indent !== 2 && f > 0) && (P = !1), M && p.usedDuplicates[O])
      p.dump = "*ref_" + O;
    else {
      if (Z && M && !p.usedDuplicates[O] && (p.usedDuplicates[O] = !0), C === "[object Object]")
        T && Object.keys(p.dump).length !== 0 ? (_e(p, f, p.dump, P), M && (p.dump = "&ref_" + O + p.dump)) : (ve(p, f, p.dump), M && (p.dump = "&ref_" + O + " " + p.dump));
      else if (C === "[object Array]") {
        var H = p.noArrayIndent && f > 0 ? f - 1 : f;
        T && p.dump.length !== 0 ? (xe(p, H, p.dump, P), M && (p.dump = "&ref_" + O + p.dump)) : (be(p, H, p.dump), M && (p.dump = "&ref_" + O + " " + p.dump));
      } else if (C === "[object String]")
        p.tag !== "?" && Te(p, p.dump, f, R);
      else {
        if (p.skipInvalid) return !1;
        throw new e("unacceptable kind of an object to dump " + C);
      }
      p.tag !== null && p.tag !== "?" && (p.dump = "!<" + p.tag + "> " + p.dump);
    }
    return !0;
  }
  function x(p, f) {
    var w = [], T = [], P, R;
    for (k(p, w, T), P = 0, R = T.length; P < R; P += 1)
      f.duplicates.push(w[T[P]]);
    f.usedDuplicates = new Array(R);
  }
  function k(p, f, w) {
    var T, P, R;
    if (p !== null && typeof p == "object")
      if (P = f.indexOf(p), P !== -1)
        w.indexOf(P) === -1 && w.push(P);
      else if (f.push(p), Array.isArray(p))
        for (P = 0, R = p.length; P < R; P += 1)
          k(p[P], f, w);
      else
        for (T = Object.keys(p), P = 0, R = T.length; P < R; P += 1)
          k(p[T[P]], f, w);
  }
  function j(p, f) {
    f = f || {};
    var w = new q(f);
    return w.noRefs || x(p, w), l(w, 0, p, !0, !0) ? w.dump + `
` : "";
  }
  function S(p, f) {
    return j(p, n.extend({ schema: r }, f));
  }
  return dumper.dump = j, dumper.safeDump = S, dumper;
}
var hasRequiredJsYaml$1;
function requireJsYaml$1() {
  if (hasRequiredJsYaml$1) return jsYaml$1;
  hasRequiredJsYaml$1 = 1;
  var n = requireLoader(), e = requireDumper();
  function t(r) {
    return function() {
      throw new Error("Function " + r + " is deprecated and cannot be used.");
    };
  }
  return jsYaml$1.Type = requireType(), jsYaml$1.Schema = requireSchema(), jsYaml$1.FAILSAFE_SCHEMA = requireFailsafe(), jsYaml$1.JSON_SCHEMA = requireJson(), jsYaml$1.CORE_SCHEMA = requireCore(), jsYaml$1.DEFAULT_SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_FULL_SCHEMA = requireDefault_full(), jsYaml$1.load = n.load, jsYaml$1.loadAll = n.loadAll, jsYaml$1.safeLoad = n.safeLoad, jsYaml$1.safeLoadAll = n.safeLoadAll, jsYaml$1.dump = e.dump, jsYaml$1.safeDump = e.safeDump, jsYaml$1.YAMLException = requireException(), jsYaml$1.MINIMAL_SCHEMA = requireFailsafe(), jsYaml$1.SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_SCHEMA = requireDefault_full(), jsYaml$1.scan = t("scan"), jsYaml$1.parse = t("parse"), jsYaml$1.compose = t("compose"), jsYaml$1.addConstructor = t("addConstructor"), jsYaml$1;
}
var jsYaml, hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  var n = requireJsYaml$1();
  return jsYaml = n, jsYaml;
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
      stringify: function(n, e) {
        const t = Object.assign({ replacer: null, space: 2 }, e);
        return JSON.stringify(n, t.replacer, t.space);
      }
    }, engines.javascript = {
      parse: function parse(str, options, wrap) {
        try {
          return wrap !== !1 && (str = `(function() {
return ` + str.trim() + `;
}());`), eval(str) || {};
        } catch (n) {
          if (wrap !== !1 && /(unexpected|identifier)/i.test(n.message))
            return parse(str, options, !1);
          throw new SyntaxError(n);
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
  return hasRequiredStripBomString || (hasRequiredStripBomString = 1, stripBomString = function(n) {
    return typeof n == "string" && n.charAt(0) === "\uFEFF" ? n.slice(1) : n;
  }), stripBomString;
}
var hasRequiredUtils;
function requireUtils() {
  return hasRequiredUtils || (hasRequiredUtils = 1, (function(n) {
    const e = requireStripBomString(), t = requireKindOf();
    n.define = function(r, a, i) {
      Reflect.defineProperty(r, a, {
        enumerable: !1,
        configurable: !0,
        writable: !0,
        value: i
      });
    }, n.isBuffer = function(r) {
      return t(r) === "buffer";
    }, n.isObject = function(r) {
      return t(r) === "object";
    }, n.toBuffer = function(r) {
      return typeof r == "string" ? Buffer.from(r) : r;
    }, n.toString = function(r) {
      if (n.isBuffer(r)) return e(String(r));
      if (typeof r != "string")
        throw new TypeError("expected input to be a string or buffer");
      return e(r);
    }, n.arrayify = function(r) {
      return r ? Array.isArray(r) ? r : [r] : [];
    }, n.startsWith = function(r, a, i) {
      return typeof i != "number" && (i = a.length), r.slice(0, i) === a;
    };
  })(utils)), utils;
}
var defaults, hasRequiredDefaults;
function requireDefaults() {
  if (hasRequiredDefaults) return defaults;
  hasRequiredDefaults = 1;
  const n = requireEngines(), e = requireUtils();
  return defaults = function(t) {
    const r = Object.assign({}, t);
    return r.delimiters = e.arrayify(r.delims || r.delimiters || "---"), r.delimiters.length === 1 && r.delimiters.push(r.delimiters[0]), r.language = (r.language || r.lang || "yaml").toLowerCase(), r.engines = Object.assign({}, n, r.parsers, r.engines), r;
  }, defaults;
}
var engine, hasRequiredEngine;
function requireEngine() {
  if (hasRequiredEngine) return engine;
  hasRequiredEngine = 1, engine = function(e, t) {
    let r = t.engines[e] || t.engines[n(e)];
    if (typeof r > "u")
      throw new Error('gray-matter engine "' + e + '" is not registered');
    return typeof r == "function" && (r = { parse: r }), r;
  };
  function n(e) {
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
  const n = requireKindOf(), e = requireEngine(), t = requireDefaults();
  stringify = function(a, i, s) {
    if (i == null && s == null)
      switch (n(a)) {
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
    const m = c.delimiters[0], h = c.delimiters[1], g = u.stringify(i, s).trim();
    let v = "";
    return g !== "{}" && (v = r(m) + r(g) + r(h)), typeof a.excerpt == "string" && a.excerpt !== "" && o.indexOf(a.excerpt.trim()) === -1 && (v += r(a.excerpt) + r(h)), v + r(o);
  };
  function r(a) {
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
  const n = requireDefaults();
  return excerpt = function(e, t) {
    const r = n(t);
    if (e.data == null && (e.data = {}), typeof r.excerpt == "function")
      return r.excerpt(e, r);
    const a = e.data.excerpt_separator || r.excerpt_separator;
    if (a == null && (r.excerpt === !1 || r.excerpt == null))
      return e;
    const i = typeof r.excerpt == "string" ? r.excerpt : a || r.delimiters[0], s = e.content.indexOf(i);
    return s !== -1 && (e.excerpt = e.content.slice(0, s)), e;
  }, excerpt;
}
var toFile, hasRequiredToFile;
function requireToFile() {
  if (hasRequiredToFile) return toFile;
  hasRequiredToFile = 1;
  const n = requireKindOf(), e = requireStringify(), t = requireUtils();
  return toFile = function(r) {
    return n(r) !== "object" && (r = { content: r }), n(r.data) !== "object" && (r.data = {}), r.contents && r.content == null && (r.content = r.contents), t.define(r, "orig", t.toBuffer(r.content)), t.define(r, "language", r.language || ""), t.define(r, "matter", r.matter || ""), t.define(r, "stringify", function(a, i) {
      return i && i.language && (r.language = i.language), e(r, a, i);
    }), r.content = t.toString(r.content), r.isEmpty = !1, r.excerpt = "", r;
  }, toFile;
}
var parse, hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse;
  hasRequiredParse = 1;
  const n = requireEngine(), e = requireDefaults();
  return parse = function(t, r, a) {
    const i = e(a), s = n(t, i);
    if (typeof s.parse != "function")
      throw new TypeError('expected "' + t + '.parse" to be a function');
    return s.parse(r, i);
  }, parse;
}
var grayMatter, hasRequiredGrayMatter;
function requireGrayMatter() {
  if (hasRequiredGrayMatter) return grayMatter;
  hasRequiredGrayMatter = 1;
  const n = require$$0, e = requireSectionMatter(), t = requireDefaults(), r = requireStringify(), a = requireExcerpt(), i = requireEngines(), s = requireToFile(), o = requireParse(), c = requireUtils();
  function d(m, h) {
    if (m === "")
      return { data: {}, content: m, excerpt: "", orig: m };
    let g = s(m);
    const v = d.cache[g.content];
    if (!h) {
      if (v)
        return g = Object.assign({}, v), g.orig = v.orig, g;
      d.cache[g.content] = g;
    }
    return u(g, h);
  }
  function u(m, h) {
    const g = t(h), v = g.delimiters[0], A = `
` + g.delimiters[1];
    let I = m.content;
    g.language && (m.language = g.language);
    const N = v.length;
    if (!c.startsWith(I, v, N))
      return a(m, g), m;
    if (I.charAt(N) === v.slice(-1))
      return m;
    I = I.slice(N);
    const b = I.length, y = d.language(I, g);
    y.name && (m.language = y.name, I = I.slice(y.raw.length));
    let E = I.indexOf(A);
    return E === -1 && (E = b), m.matter = I.slice(0, E), m.matter.replace(/^\s*#[^\n]+/gm, "").trim() === "" ? (m.isEmpty = !0, m.empty = m.content, m.data = {}) : m.data = o(m.language, m.matter, g), E === b ? m.content = "" : (m.content = I.slice(E + A.length), m.content[0] === "\r" && (m.content = m.content.slice(1)), m.content[0] === `
` && (m.content = m.content.slice(1))), a(m, g), (g.sections === !0 || typeof g.section == "function") && e(m, g.section), m;
  }
  return d.engines = i, d.stringify = function(m, h, g) {
    return typeof m == "string" && (m = d(m, g)), r(m, h, g);
  }, d.read = function(m, h) {
    const g = n.readFileSync(m, "utf8"), v = d(g, h);
    return v.path = m, v;
  }, d.test = function(m, h) {
    return c.startsWith(m, t(h).delimiters[0]);
  }, d.language = function(m, h) {
    const v = t(h).delimiters[0];
    d.test(m) && (m = m.slice(v.length));
    const A = m.slice(0, m.search(/\r?\n/));
    return {
      raw: A,
      name: A ? A.trim() : ""
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
function changeDefaults(n) {
  _defaults = n;
}
var noopTest = { exec: () => null };
function edit(n, e = "") {
  let t = typeof n == "string" ? n : n.source;
  const r = {
    replace: (a, i) => {
      let s = typeof i == "string" ? i : i.source;
      return s = s.replace(other.caret, "$1"), t = t.replace(a, s), r;
    },
    getRegex: () => new RegExp(t, e)
  };
  return r;
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
  listItemRegex: (n) => new RegExp(`^( {0,3}${n})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (n) => new RegExp(`^ {0,${Math.min(3, n - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (n) => new RegExp(`^ {0,${Math.min(3, n - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (n) => new RegExp(`^ {0,${Math.min(3, n - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (n) => new RegExp(`^ {0,${Math.min(3, n - 1)}}#`),
  htmlBeginRegex: (n) => new RegExp(`^ {0,${Math.min(3, n - 1)}}<(?:[a-z].*>|!--)`, "i")
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
}, getEscapeReplacement = (n) => escapeReplacements[n];
function escape2(n, e) {
  if (e) {
    if (other.escapeTest.test(n))
      return n.replace(other.escapeReplace, getEscapeReplacement);
  } else if (other.escapeTestNoEncode.test(n))
    return n.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
  return n;
}
function cleanUrl(n) {
  try {
    n = encodeURI(n).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return n;
}
function splitCells(n, e) {
  const t = n.replace(other.findPipe, (i, s, o) => {
    let c = !1, d = s;
    for (; --d >= 0 && o[d] === "\\"; ) c = !c;
    return c ? "|" : " |";
  }), r = t.split(other.splitPipe);
  let a = 0;
  if (r[0].trim() || r.shift(), r.length > 0 && !r.at(-1)?.trim() && r.pop(), e)
    if (r.length > e)
      r.splice(e);
    else
      for (; r.length < e; ) r.push("");
  for (; a < r.length; a++)
    r[a] = r[a].trim().replace(other.slashPipe, "|");
  return r;
}
function rtrim(n, e, t) {
  const r = n.length;
  if (r === 0)
    return "";
  let a = 0;
  for (; a < r && n.charAt(r - a - 1) === e; )
    a++;
  return n.slice(0, r - a);
}
function findClosingBracket(n, e) {
  if (n.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let r = 0; r < n.length; r++)
    if (n[r] === "\\")
      r++;
    else if (n[r] === e[0])
      t++;
    else if (n[r] === e[1] && (t--, t < 0))
      return r;
  return t > 0 ? -2 : -1;
}
function outputLink(n, e, t, r, a) {
  const i = e.href, s = e.title || null, o = n[1].replace(a.other.outputLinkReplace, "$1");
  r.state.inLink = !0;
  const c = {
    type: n[0].charAt(0) === "!" ? "image" : "link",
    raw: t,
    href: i,
    title: s,
    text: o,
    tokens: r.inlineTokens(o)
  };
  return r.state.inLink = !1, c;
}
function indentCodeCompensation(n, e, t) {
  const r = n.match(t.other.indentCodeCompensation);
  if (r === null)
    return e;
  const a = r[1];
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
  constructor(n) {
    this.options = n || _defaults;
  }
  space(n) {
    const e = this.rules.block.newline.exec(n);
    if (e && e[0].length > 0)
      return {
        type: "space",
        raw: e[0]
      };
  }
  code(n) {
    const e = this.rules.block.code.exec(n);
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
  fences(n) {
    const e = this.rules.block.fences.exec(n);
    if (e) {
      const t = e[0], r = indentCodeCompensation(t, e[3] || "", this.rules);
      return {
        type: "code",
        raw: t,
        lang: e[2] ? e[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : e[2],
        text: r
      };
    }
  }
  heading(n) {
    const e = this.rules.block.heading.exec(n);
    if (e) {
      let t = e[2].trim();
      if (this.rules.other.endingHash.test(t)) {
        const r = rtrim(t, "#");
        (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (t = r.trim());
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
  hr(n) {
    const e = this.rules.block.hr.exec(n);
    if (e)
      return {
        type: "hr",
        raw: rtrim(e[0], `
`)
      };
  }
  blockquote(n) {
    const e = this.rules.block.blockquote.exec(n);
    if (e) {
      let t = rtrim(e[0], `
`).split(`
`), r = "", a = "";
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
        r = r ? `${r}
${d}` : d, a = a ? `${a}
${u}` : u;
        const m = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(u, i, !0), this.lexer.state.top = m, t.length === 0)
          break;
        const h = i.at(-1);
        if (h?.type === "code")
          break;
        if (h?.type === "blockquote") {
          const g = h, v = g.raw + `
` + t.join(`
`), A = this.blockquote(v);
          i[i.length - 1] = A, r = r.substring(0, r.length - g.raw.length) + A.raw, a = a.substring(0, a.length - g.text.length) + A.text;
          break;
        } else if (h?.type === "list") {
          const g = h, v = g.raw + `
` + t.join(`
`), A = this.list(v);
          i[i.length - 1] = A, r = r.substring(0, r.length - h.raw.length) + A.raw, a = a.substring(0, a.length - g.raw.length) + A.raw, t = v.substring(i.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return {
        type: "blockquote",
        raw: r,
        tokens: i,
        text: a
      };
    }
  }
  list(n) {
    let e = this.rules.block.list.exec(n);
    if (e) {
      let t = e[1].trim();
      const r = t.length > 1, a = {
        type: "list",
        raw: "",
        ordered: r,
        start: r ? +t.slice(0, -1) : "",
        loose: !1,
        items: []
      };
      t = r ? `\\d{1,9}\\${t.slice(-1)}` : `\\${t}`, this.options.pedantic && (t = r ? t : "[*+-]");
      const i = this.rules.other.listItemRegex(t);
      let s = !1;
      for (; n; ) {
        let c = !1, d = "", u = "";
        if (!(e = i.exec(n)) || this.rules.block.hr.test(n))
          break;
        d = e[0], n = n.substring(d.length);
        let m = e[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (N) => " ".repeat(3 * N.length)), h = n.split(`
`, 1)[0], g = !m.trim(), v = 0;
        if (this.options.pedantic ? (v = 2, u = m.trimStart()) : g ? v = e[1].length + 1 : (v = e[2].search(this.rules.other.nonSpaceChar), v = v > 4 ? 1 : v, u = m.slice(v), v += e[1].length), g && this.rules.other.blankLine.test(h) && (d += h + `
`, n = n.substring(h.length + 1), c = !0), !c) {
          const N = this.rules.other.nextBulletRegex(v), b = this.rules.other.hrRegex(v), y = this.rules.other.fencesBeginRegex(v), E = this.rules.other.headingBeginRegex(v), _ = this.rules.other.htmlBeginRegex(v);
          for (; n; ) {
            const D = n.split(`
`, 1)[0];
            let L;
            if (h = D, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), L = h) : L = h.replace(this.rules.other.tabCharGlobal, "    "), y.test(h) || E.test(h) || _.test(h) || N.test(h) || b.test(h))
              break;
            if (L.search(this.rules.other.nonSpaceChar) >= v || !h.trim())
              u += `
` + L.slice(v);
            else {
              if (g || m.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || y.test(m) || E.test(m) || b.test(m))
                break;
              u += `
` + h;
            }
            !g && !h.trim() && (g = !0), d += D + `
`, n = n.substring(D.length + 1), m = L.slice(v);
          }
        }
        a.loose || (s ? a.loose = !0 : this.rules.other.doubleBlankLine.test(d) && (s = !0));
        let A = null, I;
        this.options.gfm && (A = this.rules.other.listIsTask.exec(u), A && (I = A[0] !== "[ ] ", u = u.replace(this.rules.other.listReplaceTask, ""))), a.items.push({
          type: "list_item",
          raw: d,
          task: !!A,
          checked: I,
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
          const d = a.items[c].tokens.filter((m) => m.type === "space"), u = d.length > 0 && d.some((m) => this.rules.other.anyLine.test(m.raw));
          a.loose = u;
        }
      if (a.loose)
        for (let c = 0; c < a.items.length; c++)
          a.items[c].loose = !0;
      return a;
    }
  }
  html(n) {
    const e = this.rules.block.html.exec(n);
    if (e)
      return {
        type: "html",
        block: !0,
        raw: e[0],
        pre: e[1] === "pre" || e[1] === "script" || e[1] === "style",
        text: e[0]
      };
  }
  def(n) {
    const e = this.rules.block.def.exec(n);
    if (e) {
      const t = e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = e[2] ? e[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", a = e[3] ? e[3].substring(1, e[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : e[3];
      return {
        type: "def",
        tag: t,
        raw: e[0],
        href: r,
        title: a
      };
    }
  }
  table(n) {
    const e = this.rules.block.table.exec(n);
    if (!e || !this.rules.other.tableDelimiter.test(e[2]))
      return;
    const t = splitCells(e[1]), r = e[2].replace(this.rules.other.tableAlignChars, "").split("|"), a = e[3]?.trim() ? e[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = {
      type: "table",
      raw: e[0],
      header: [],
      align: [],
      rows: []
    };
    if (t.length === r.length) {
      for (const s of r)
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
  lheading(n) {
    const e = this.rules.block.lheading.exec(n);
    if (e)
      return {
        type: "heading",
        raw: e[0],
        depth: e[2].charAt(0) === "=" ? 1 : 2,
        text: e[1],
        tokens: this.lexer.inline(e[1])
      };
  }
  paragraph(n) {
    const e = this.rules.block.paragraph.exec(n);
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
  text(n) {
    const e = this.rules.block.text.exec(n);
    if (e)
      return {
        type: "text",
        raw: e[0],
        text: e[0],
        tokens: this.lexer.inline(e[0])
      };
  }
  escape(n) {
    const e = this.rules.inline.escape.exec(n);
    if (e)
      return {
        type: "escape",
        raw: e[0],
        text: e[1]
      };
  }
  tag(n) {
    const e = this.rules.inline.tag.exec(n);
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
  link(n) {
    const e = this.rules.inline.link.exec(n);
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
      let r = e[2], a = "";
      if (this.options.pedantic) {
        const i = this.rules.other.pedanticHrefTitle.exec(r);
        i && (r = i[1], a = i[3]);
      } else
        a = e[3] ? e[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(t) ? r = r.slice(1) : r = r.slice(1, -1)), outputLink(e, {
        href: r && r.replace(this.rules.inline.anyPunctuation, "$1"),
        title: a && a.replace(this.rules.inline.anyPunctuation, "$1")
      }, e[0], this.lexer, this.rules);
    }
  }
  reflink(n, e) {
    let t;
    if ((t = this.rules.inline.reflink.exec(n)) || (t = this.rules.inline.nolink.exec(n))) {
      const r = (t[2] || t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), a = e[r.toLowerCase()];
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
  emStrong(n, e, t = "") {
    let r = this.rules.inline.emStrongLDelim.exec(n);
    if (!r || r[3] && t.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(r[1] || r[2] || "") || !t || this.rules.inline.punctuation.exec(t)) {
      const i = [...r[0]].length - 1;
      let s, o, c = i, d = 0;
      const u = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (u.lastIndex = 0, e = e.slice(-1 * n.length + i); (r = u.exec(e)) != null; ) {
        if (s = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !s) continue;
        if (o = [...s].length, r[3] || r[4]) {
          c += o;
          continue;
        } else if ((r[5] || r[6]) && i % 3 && !((i + o) % 3)) {
          d += o;
          continue;
        }
        if (c -= o, c > 0) continue;
        o = Math.min(o, o + c + d);
        const m = [...r[0]][0].length, h = n.slice(0, i + r.index + m + o);
        if (Math.min(i, o) % 2) {
          const v = h.slice(1, -1);
          return {
            type: "em",
            raw: h,
            text: v,
            tokens: this.lexer.inlineTokens(v)
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
  codespan(n) {
    const e = this.rules.inline.code.exec(n);
    if (e) {
      let t = e[2].replace(this.rules.other.newLineCharGlobal, " ");
      const r = this.rules.other.nonSpaceChar.test(t), a = this.rules.other.startingSpaceChar.test(t) && this.rules.other.endingSpaceChar.test(t);
      return r && a && (t = t.substring(1, t.length - 1)), {
        type: "codespan",
        raw: e[0],
        text: t
      };
    }
  }
  br(n) {
    const e = this.rules.inline.br.exec(n);
    if (e)
      return {
        type: "br",
        raw: e[0]
      };
  }
  del(n) {
    const e = this.rules.inline.del.exec(n);
    if (e)
      return {
        type: "del",
        raw: e[0],
        text: e[2],
        tokens: this.lexer.inlineTokens(e[2])
      };
  }
  autolink(n) {
    const e = this.rules.inline.autolink.exec(n);
    if (e) {
      let t, r;
      return e[2] === "@" ? (t = e[1], r = "mailto:" + t) : (t = e[1], r = t), {
        type: "link",
        raw: e[0],
        text: t,
        href: r,
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
  url(n) {
    let e;
    if (e = this.rules.inline.url.exec(n)) {
      let t, r;
      if (e[2] === "@")
        t = e[0], r = "mailto:" + t;
      else {
        let a;
        do
          a = e[0], e[0] = this.rules.inline._backpedal.exec(e[0])?.[0] ?? "";
        while (a !== e[0]);
        t = e[0], e[1] === "www." ? r = "http://" + e[0] : r = e[0];
      }
      return {
        type: "link",
        raw: e[0],
        text: t,
        href: r,
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
  inlineText(n) {
    const e = this.rules.inline.text.exec(n);
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
}, _Lexer = class Se {
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
    return new Se(t).lex(e);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(e, t) {
    return new Se(t).inlineTokens(e);
  }
  /**
   * Preprocessing
   */
  lex(e) {
    e = e.replace(other.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0; t < this.inlineQueue.length; t++) {
      const r = this.inlineQueue[t];
      this.inlineTokens(r.src, r.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], r = !1) {
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
        r && s?.type === "paragraph" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(a), r = i.length !== e.length, e = e.substring(a.raw.length);
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
    let r = e, a = null;
    if (this.tokens.links) {
      const o = Object.keys(this.tokens.links);
      if (o.length > 0)
        for (; (a = this.tokenizer.rules.inline.reflinkSearch.exec(r)) != null; )
          o.includes(a[0].slice(a[0].lastIndexOf("[") + 1, -1)) && (r = r.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (a = this.tokenizer.rules.inline.anyPunctuation.exec(r)) != null; )
      r = r.slice(0, a.index) + "++" + r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    for (; (a = this.tokenizer.rules.inline.blockSkip.exec(r)) != null; )
      r = r.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
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
      if (o = this.tokenizer.emStrong(e, r, s)) {
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
        let m;
        this.options.extensions.startInline.forEach((h) => {
          m = h.call({ lexer: this }, u), typeof m == "number" && m >= 0 && (d = Math.min(d, m));
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
  constructor(n) {
    this.options = n || _defaults;
  }
  space(n) {
    return "";
  }
  code({ text: n, lang: e, escaped: t }) {
    const r = (e || "").match(other.notSpaceStart)?.[0], a = n.replace(other.endingNewline, "") + `
`;
    return r ? '<pre><code class="language-' + escape2(r) + '">' + (t ? a : escape2(a, !0)) + `</code></pre>
` : "<pre><code>" + (t ? a : escape2(a, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: n }) {
    return `<blockquote>
${this.parser.parse(n)}</blockquote>
`;
  }
  html({ text: n }) {
    return n;
  }
  heading({ tokens: n, depth: e }) {
    return `<h${e}>${this.parser.parseInline(n)}</h${e}>
`;
  }
  hr(n) {
    return `<hr>
`;
  }
  list(n) {
    const e = n.ordered, t = n.start;
    let r = "";
    for (let s = 0; s < n.items.length; s++) {
      const o = n.items[s];
      r += this.listitem(o);
    }
    const a = e ? "ol" : "ul", i = e && t !== 1 ? ' start="' + t + '"' : "";
    return "<" + a + i + `>
` + r + "</" + a + `>
`;
  }
  listitem(n) {
    let e = "";
    if (n.task) {
      const t = this.checkbox({ checked: !!n.checked });
      n.loose ? n.tokens[0]?.type === "paragraph" ? (n.tokens[0].text = t + " " + n.tokens[0].text, n.tokens[0].tokens && n.tokens[0].tokens.length > 0 && n.tokens[0].tokens[0].type === "text" && (n.tokens[0].tokens[0].text = t + " " + escape2(n.tokens[0].tokens[0].text), n.tokens[0].tokens[0].escaped = !0)) : n.tokens.unshift({
        type: "text",
        raw: t + " ",
        text: t + " ",
        escaped: !0
      }) : e += t + " ";
    }
    return e += this.parser.parse(n.tokens, !!n.loose), `<li>${e}</li>
`;
  }
  checkbox({ checked: n }) {
    return "<input " + (n ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: n }) {
    return `<p>${this.parser.parseInline(n)}</p>
`;
  }
  table(n) {
    let e = "", t = "";
    for (let a = 0; a < n.header.length; a++)
      t += this.tablecell(n.header[a]);
    e += this.tablerow({ text: t });
    let r = "";
    for (let a = 0; a < n.rows.length; a++) {
      const i = n.rows[a];
      t = "";
      for (let s = 0; s < i.length; s++)
        t += this.tablecell(i[s]);
      r += this.tablerow({ text: t });
    }
    return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + e + `</thead>
` + r + `</table>
`;
  }
  tablerow({ text: n }) {
    return `<tr>
${n}</tr>
`;
  }
  tablecell(n) {
    const e = this.parser.parseInline(n.tokens), t = n.header ? "th" : "td";
    return (n.align ? `<${t} align="${n.align}">` : `<${t}>`) + e + `</${t}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens: n }) {
    return `<strong>${this.parser.parseInline(n)}</strong>`;
  }
  em({ tokens: n }) {
    return `<em>${this.parser.parseInline(n)}</em>`;
  }
  codespan({ text: n }) {
    return `<code>${escape2(n, !0)}</code>`;
  }
  br(n) {
    return "<br>";
  }
  del({ tokens: n }) {
    return `<del>${this.parser.parseInline(n)}</del>`;
  }
  link({ href: n, title: e, tokens: t }) {
    const r = this.parser.parseInline(t), a = cleanUrl(n);
    if (a === null)
      return r;
    n = a;
    let i = '<a href="' + n + '"';
    return e && (i += ' title="' + escape2(e) + '"'), i += ">" + r + "</a>", i;
  }
  image({ href: n, title: e, text: t, tokens: r }) {
    r && (t = this.parser.parseInline(r, this.parser.textRenderer));
    const a = cleanUrl(n);
    if (a === null)
      return escape2(t);
    n = a;
    let i = `<img src="${n}" alt="${t}"`;
    return e && (i += ` title="${escape2(e)}"`), i += ">", i;
  }
  text(n) {
    return "tokens" in n && n.tokens ? this.parser.parseInline(n.tokens) : "escaped" in n && n.escaped ? n.text : escape2(n.text);
  }
}, _TextRenderer = class {
  // no need for block level renderers
  strong({ text: n }) {
    return n;
  }
  em({ text: n }) {
    return n;
  }
  codespan({ text: n }) {
    return n;
  }
  del({ text: n }) {
    return n;
  }
  html({ text: n }) {
    return n;
  }
  text({ text: n }) {
    return n;
  }
  link({ text: n }) {
    return "" + n;
  }
  image({ text: n }) {
    return "" + n;
  }
  br() {
    return "";
  }
}, _Parser = class Pe {
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
    return new Pe(t).parse(e);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(e, t) {
    return new Pe(t).parseInline(e);
  }
  /**
   * Parse Loop
   */
  parse(e, t = !0) {
    let r = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const o = i, c = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (c !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(o.type)) {
          r += c || "";
          continue;
        }
      }
      const s = i;
      switch (s.type) {
        case "space": {
          r += this.renderer.space(s);
          continue;
        }
        case "hr": {
          r += this.renderer.hr(s);
          continue;
        }
        case "heading": {
          r += this.renderer.heading(s);
          continue;
        }
        case "code": {
          r += this.renderer.code(s);
          continue;
        }
        case "table": {
          r += this.renderer.table(s);
          continue;
        }
        case "blockquote": {
          r += this.renderer.blockquote(s);
          continue;
        }
        case "list": {
          r += this.renderer.list(s);
          continue;
        }
        case "html": {
          r += this.renderer.html(s);
          continue;
        }
        case "paragraph": {
          r += this.renderer.paragraph(s);
          continue;
        }
        case "text": {
          let o = s, c = this.renderer.text(o);
          for (; a + 1 < e.length && e[a + 1].type === "text"; )
            o = e[++a], c += `
` + this.renderer.text(o);
          t ? r += this.renderer.paragraph({
            type: "paragraph",
            raw: c,
            text: c,
            tokens: [{ type: "text", raw: c, text: c, escaped: !0 }]
          }) : r += c;
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
    return r;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(e, t = this.renderer) {
    let r = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (o !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          r += o || "";
          continue;
        }
      }
      const s = i;
      switch (s.type) {
        case "escape": {
          r += t.text(s);
          break;
        }
        case "html": {
          r += t.html(s);
          break;
        }
        case "link": {
          r += t.link(s);
          break;
        }
        case "image": {
          r += t.image(s);
          break;
        }
        case "strong": {
          r += t.strong(s);
          break;
        }
        case "em": {
          r += t.em(s);
          break;
        }
        case "codespan": {
          r += t.codespan(s);
          break;
        }
        case "br": {
          r += t.br(s);
          break;
        }
        case "del": {
          r += t.del(s);
          break;
        }
        case "text": {
          r += t.text(s);
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
    return r;
  }
}, _Hooks = class {
  options;
  block;
  constructor(n) {
    this.options = n || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(n) {
    return n;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(n) {
    return n;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(n) {
    return n;
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
  constructor(...n) {
    this.use(...n);
  }
  /**
   * Run callback for every token
   */
  walkTokens(n, e) {
    let t = [];
    for (const r of n)
      switch (t = t.concat(e.call(this, r)), r.type) {
        case "table": {
          const a = r;
          for (const i of a.header)
            t = t.concat(this.walkTokens(i.tokens, e));
          for (const i of a.rows)
            for (const s of i)
              t = t.concat(this.walkTokens(s.tokens, e));
          break;
        }
        case "list": {
          const a = r;
          t = t.concat(this.walkTokens(a.items, e));
          break;
        }
        default: {
          const a = r;
          this.defaults.extensions?.childTokens?.[a.type] ? this.defaults.extensions.childTokens[a.type].forEach((i) => {
            const s = a[i].flat(1 / 0);
            t = t.concat(this.walkTokens(s, e));
          }) : a.tokens && (t = t.concat(this.walkTokens(a.tokens, e)));
        }
      }
    return t;
  }
  use(...n) {
    const e = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return n.forEach((t) => {
      const r = { ...t };
      if (r.async = this.defaults.async || r.async || !1, t.extensions && (t.extensions.forEach((a) => {
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
      }), r.extensions = e), t.renderer) {
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
        r.renderer = a;
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
        r.tokenizer = a;
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
              return Promise.resolve(o.call(a, d)).then((m) => c.call(a, m));
            const u = o.call(a, d);
            return c.call(a, u);
          } : a[s] = (...d) => {
            let u = o.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u;
          };
        }
        r.hooks = a;
      }
      if (t.walkTokens) {
        const a = this.defaults.walkTokens, i = t.walkTokens;
        r.walkTokens = function(s) {
          let o = [];
          return o.push(i.call(this, s)), a && (o = o.concat(a.call(this, s))), o;
        };
      }
      this.defaults = { ...this.defaults, ...r };
    }), this;
  }
  setOptions(n) {
    return this.defaults = { ...this.defaults, ...n }, this;
  }
  lexer(n, e) {
    return _Lexer.lex(n, e ?? this.defaults);
  }
  parser(n, e) {
    return _Parser.parse(n, e ?? this.defaults);
  }
  parseMarkdown(n) {
    return (t, r) => {
      const a = { ...r }, i = { ...this.defaults, ...a }, s = this.onError(!!i.silent, !!i.async);
      if (this.defaults.async === !0 && a.async === !1)
        return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof t > "u" || t === null)
        return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof t != "string")
        return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
      i.hooks && (i.hooks.options = i, i.hooks.block = n);
      const o = i.hooks ? i.hooks.provideLexer() : n ? _Lexer.lex : _Lexer.lexInline, c = i.hooks ? i.hooks.provideParser() : n ? _Parser.parse : _Parser.parseInline;
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
  onError(n, e) {
    return (t) => {
      if (t.message += `
Please report this to https://github.com/markedjs/marked.`, n) {
        const r = "<p>An error occurred:</p><pre>" + escape2(t.message + "", !0) + "</pre>";
        return e ? Promise.resolve(r) : r;
      }
      if (e)
        return Promise.reject(t);
      throw t;
    };
  }
}, markedInstance = new Marked();
function marked(n, e) {
  return markedInstance.parse(n, e);
}
marked.options = marked.setOptions = function(n) {
  return markedInstance.setOptions(n), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...n) {
  return markedInstance.use(...n), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.walkTokens = function(n, e) {
  return markedInstance.walkTokens(n, e);
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
  return hasRequiredPrism || (hasRequiredPrism = 1, (function(n) {
    var e = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     *
     * @license MIT <https://opensource.org/licenses/MIT>
     * @author Lea Verou <https://lea.verou.me>
     * @namespace
     * @public
     */
    var t = (function(r) {
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
        manual: r.Prism && r.Prism.manual,
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
        disableWorkerMessageHandler: r.Prism && r.Prism.disableWorkerMessageHandler,
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
          encode: function b(y) {
            return y instanceof c ? new c(y.type, b(y.content), y.alias) : Array.isArray(y) ? y.map(b) : y.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
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
          type: function(b) {
            return Object.prototype.toString.call(b).slice(8, -1);
          },
          /**
           * Returns a unique number for the given object. Later calls will still return the same number.
           *
           * @param {Object} obj
           * @returns {number}
           */
          objId: function(b) {
            return b.__id || Object.defineProperty(b, "__id", { value: ++i }), b.__id;
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
          clone: function b(y, E) {
            E = E || {};
            var _, D;
            switch (o.util.type(y)) {
              case "Object":
                if (D = o.util.objId(y), E[D])
                  return E[D];
                _ = /** @type {Record<string, any>} */
                {}, E[D] = _;
                for (var L in y)
                  y.hasOwnProperty(L) && (_[L] = b(y[L], E));
                return (
                  /** @type {any} */
                  _
                );
              case "Array":
                return D = o.util.objId(y), E[D] ? E[D] : (_ = [], E[D] = _, /** @type {Array} */
                /** @type {any} */
                y.forEach(function(V, F) {
                  _[F] = b(V, E);
                }), /** @type {any} */
                _);
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
          getLanguage: function(b) {
            for (; b; ) {
              var y = a.exec(b.className);
              if (y)
                return y[1].toLowerCase();
              b = b.parentElement;
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
          setLanguage: function(b, y) {
            b.className = b.className.replace(RegExp(a, "gi"), ""), b.classList.add("language-" + y);
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
            } catch (_) {
              var b = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(_.stack) || [])[1];
              if (b) {
                var y = document.getElementsByTagName("script");
                for (var E in y)
                  if (y[E].src == b)
                    return y[E];
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
          isActive: function(b, y, E) {
            for (var _ = "no-" + y; b; ) {
              var D = b.classList;
              if (D.contains(y))
                return !0;
              if (D.contains(_))
                return !1;
              b = b.parentElement;
            }
            return !!E;
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
          extend: function(b, y) {
            var E = o.util.clone(o.languages[b]);
            for (var _ in y)
              E[_] = y[_];
            return E;
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
          insertBefore: function(b, y, E, _) {
            _ = _ || /** @type {any} */
            o.languages;
            var D = _[b], L = {};
            for (var V in D)
              if (D.hasOwnProperty(V)) {
                if (V == y)
                  for (var F in E)
                    E.hasOwnProperty(F) && (L[F] = E[F]);
                E.hasOwnProperty(V) || (L[V] = D[V]);
              }
            var U = _[b];
            return _[b] = L, o.languages.DFS(o.languages, function(W, Y) {
              Y === U && W != b && (this[W] = L);
            }), L;
          },
          // Traverse a language definition with Depth First Search
          DFS: function b(y, E, _, D) {
            D = D || {};
            var L = o.util.objId;
            for (var V in y)
              if (y.hasOwnProperty(V)) {
                E.call(y, V, y[V], _ || V);
                var F = y[V], U = o.util.type(F);
                U === "Object" && !D[L(F)] ? (D[L(F)] = !0, b(F, E, null, D)) : U === "Array" && !D[L(F)] && (D[L(F)] = !0, b(F, E, V, D));
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
        highlightAll: function(b, y) {
          o.highlightAllUnder(document, b, y);
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
        highlightAllUnder: function(b, y, E) {
          var _ = {
            callback: E,
            container: b,
            selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          o.hooks.run("before-highlightall", _), _.elements = Array.prototype.slice.apply(_.container.querySelectorAll(_.selector)), o.hooks.run("before-all-elements-highlight", _);
          for (var D = 0, L; L = _.elements[D++]; )
            o.highlightElement(L, y === !0, _.callback);
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
        highlightElement: function(b, y, E) {
          var _ = o.util.getLanguage(b), D = o.languages[_];
          o.util.setLanguage(b, _);
          var L = b.parentElement;
          L && L.nodeName.toLowerCase() === "pre" && o.util.setLanguage(L, _);
          var V = b.textContent, F = {
            element: b,
            language: _,
            grammar: D,
            code: V
          };
          function U(Y) {
            F.highlightedCode = Y, o.hooks.run("before-insert", F), F.element.innerHTML = F.highlightedCode, o.hooks.run("after-highlight", F), o.hooks.run("complete", F), E && E.call(F.element);
          }
          if (o.hooks.run("before-sanity-check", F), L = F.element.parentElement, L && L.nodeName.toLowerCase() === "pre" && !L.hasAttribute("tabindex") && L.setAttribute("tabindex", "0"), !F.code) {
            o.hooks.run("complete", F), E && E.call(F.element);
            return;
          }
          if (o.hooks.run("before-highlight", F), !F.grammar) {
            U(o.util.encode(F.code));
            return;
          }
          if (y && r.Worker) {
            var W = new Worker(o.filename);
            W.onmessage = function(Y) {
              U(Y.data);
            }, W.postMessage(JSON.stringify({
              language: F.language,
              code: F.code,
              immediateClose: !0
            }));
          } else
            U(o.highlight(F.code, F.grammar, F.language));
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
        highlight: function(b, y, E) {
          var _ = {
            code: b,
            grammar: y,
            language: E
          };
          if (o.hooks.run("before-tokenize", _), !_.grammar)
            throw new Error('The language "' + _.language + '" has no grammar.');
          return _.tokens = o.tokenize(_.code, _.grammar), o.hooks.run("after-tokenize", _), c.stringify(o.util.encode(_.tokens), _.language);
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
        tokenize: function(b, y) {
          var E = y.rest;
          if (E) {
            for (var _ in E)
              y[_] = E[_];
            delete y.rest;
          }
          var D = new m();
          return h(D, D.head, b), u(b, D, y, D.head, 0), v(D);
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
          add: function(b, y) {
            var E = o.hooks.all;
            E[b] = E[b] || [], E[b].push(y);
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
          run: function(b, y) {
            var E = o.hooks.all[b];
            if (!(!E || !E.length))
              for (var _ = 0, D; D = E[_++]; )
                D(y);
          }
        },
        Token: c
      };
      r.Prism = o;
      function c(b, y, E, _) {
        this.type = b, this.content = y, this.alias = E, this.length = (_ || "").length | 0;
      }
      c.stringify = function b(y, E) {
        if (typeof y == "string")
          return y;
        if (Array.isArray(y)) {
          var _ = "";
          return y.forEach(function(U) {
            _ += b(U, E);
          }), _;
        }
        var D = {
          type: y.type,
          content: b(y.content, E),
          tag: "span",
          classes: ["token", y.type],
          attributes: {},
          language: E
        }, L = y.alias;
        L && (Array.isArray(L) ? Array.prototype.push.apply(D.classes, L) : D.classes.push(L)), o.hooks.run("wrap", D);
        var V = "";
        for (var F in D.attributes)
          V += " " + F + '="' + (D.attributes[F] || "").replace(/"/g, "&quot;") + '"';
        return "<" + D.tag + ' class="' + D.classes.join(" ") + '"' + V + ">" + D.content + "</" + D.tag + ">";
      };
      function d(b, y, E, _) {
        b.lastIndex = y;
        var D = b.exec(E);
        if (D && _ && D[1]) {
          var L = D[1].length;
          D.index += L, D[0] = D[0].slice(L);
        }
        return D;
      }
      function u(b, y, E, _, D, L) {
        for (var V in E)
          if (!(!E.hasOwnProperty(V) || !E[V])) {
            var F = E[V];
            F = Array.isArray(F) ? F : [F];
            for (var U = 0; U < F.length; ++U) {
              if (L && L.cause == V + "," + U)
                return;
              var W = F[U], Y = W.inside, le = !!W.lookbehind, J = !!W.greedy, ie = W.alias;
              if (J && !W.pattern.global) {
                var fe = W.pattern.toString().match(/[imsuy]*$/)[0];
                W.pattern = RegExp(W.pattern.source, fe + "g");
              }
              for (var ce = W.pattern || W, q = _.next, X = D; q !== y.tail && !(L && X >= L.reach); X += q.value.length, q = q.next) {
                var ne = q.value;
                if (y.length > b.length)
                  return;
                if (!(ne instanceof c)) {
                  var $ = 1, K;
                  if (J) {
                    if (K = d(ce, X, b, le), !K || K.index >= b.length)
                      break;
                    var re = K.index, ee = K.index + K[0].length, te = X;
                    for (te += q.value.length; re >= te; )
                      q = q.next, te += q.value.length;
                    if (te -= q.value.length, X = te, q.value instanceof c)
                      continue;
                    for (var G = q; G !== y.tail && (te < ee || typeof G.value == "string"); G = G.next)
                      $++, te += G.value.length;
                    $--, ne = b.slice(X, te), K.index -= X;
                  } else if (K = d(ce, 0, ne, le), !K)
                    continue;
                  var re = K.index, ae = K[0], de = ne.slice(0, re), he = ne.slice(re + ae.length), ue = X + ne.length;
                  L && ue > L.reach && (L.reach = ue);
                  var se = q.prev;
                  de && (se = h(y, se, de), X += de.length), g(y, se, $);
                  var pe = new c(V, Y ? o.tokenize(ae, Y) : ae, ie, ae);
                  if (q = h(y, se, pe), he && h(y, q, he), $ > 1) {
                    var me = {
                      cause: V + "," + U,
                      reach: ue
                    };
                    u(b, y, E, q.prev, X, me), L && me.reach > L.reach && (L.reach = me.reach);
                  }
                }
              }
            }
          }
      }
      function m() {
        var b = { value: null, prev: null, next: null }, y = { value: null, prev: b, next: null };
        b.next = y, this.head = b, this.tail = y, this.length = 0;
      }
      function h(b, y, E) {
        var _ = y.next, D = { value: E, prev: y, next: _ };
        return y.next = D, _.prev = D, b.length++, D;
      }
      function g(b, y, E) {
        for (var _ = y.next, D = 0; D < E && _ !== b.tail; D++)
          _ = _.next;
        y.next = _, _.prev = y, b.length -= D;
      }
      function v(b) {
        for (var y = [], E = b.head.next; E !== b.tail; )
          y.push(E.value), E = E.next;
        return y;
      }
      if (!r.document)
        return r.addEventListener && (o.disableWorkerMessageHandler || r.addEventListener("message", function(b) {
          var y = JSON.parse(b.data), E = y.language, _ = y.code, D = y.immediateClose;
          r.postMessage(o.highlight(_, o.languages[E], E)), D && r.close();
        }, !1)), o;
      var A = o.util.currentScript();
      A && (o.filename = A.src, A.hasAttribute("data-manual") && (o.manual = !0));
      function I() {
        o.manual || o.highlightAll();
      }
      if (!o.manual) {
        var N = document.readyState;
        N === "loading" || N === "interactive" && A && A.defer ? document.addEventListener("DOMContentLoaded", I) : window.requestAnimationFrame ? window.requestAnimationFrame(I) : window.setTimeout(I, 16);
      }
      return o;
    })(e);
    n.exports && (n.exports = t), typeof commonjsGlobal < "u" && (commonjsGlobal.Prism = t), t.languages.markup = {
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
    }, t.languages.markup.tag.inside["attr-value"].inside.entity = t.languages.markup.entity, t.languages.markup.doctype.inside["internal-subset"].inside = t.languages.markup, t.hooks.add("wrap", function(r) {
      r.type === "entity" && (r.attributes.title = r.content.replace(/&amp;/, "&"));
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
      value: function(r, a) {
        t.languages.markup.tag.inside["special-attr"].push({
          pattern: RegExp(
            /(^|["'\s])/.source + "(?:" + r + ")" + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
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
    }), t.languages.html = t.languages.markup, t.languages.mathml = t.languages.markup, t.languages.svg = t.languages.markup, t.languages.xml = t.languages.extend("markup", {}), t.languages.ssml = t.languages.xml, t.languages.atom = t.languages.xml, t.languages.rss = t.languages.xml, (function(r) {
      var a = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
      r.languages.css = {
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
      }, r.languages.css.atrule.inside.rest = r.languages.css;
      var i = r.languages.markup;
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
      var r = "Loading…", a = function(A, I) {
        return "✖ Error " + A + " while fetching file: " + I;
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
      }, o = "data-src-status", c = "loading", d = "loaded", u = "failed", m = "pre[data-src]:not([" + o + '="' + d + '"]):not([' + o + '="' + c + '"])';
      function h(A, I, N) {
        var b = new XMLHttpRequest();
        b.open("GET", A, !0), b.onreadystatechange = function() {
          b.readyState == 4 && (b.status < 400 && b.responseText ? I(b.responseText) : b.status >= 400 ? N(a(b.status, b.statusText)) : N(i));
        }, b.send(null);
      }
      function g(A) {
        var I = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(A || "");
        if (I) {
          var N = Number(I[1]), b = I[2], y = I[3];
          return b ? y ? [N, Number(y)] : [N, void 0] : [N, N];
        }
      }
      t.hooks.add("before-highlightall", function(A) {
        A.selector += ", " + m;
      }), t.hooks.add("before-sanity-check", function(A) {
        var I = (
          /** @type {HTMLPreElement} */
          A.element
        );
        if (I.matches(m)) {
          A.code = "", I.setAttribute(o, c);
          var N = I.appendChild(document.createElement("CODE"));
          N.textContent = r;
          var b = I.getAttribute("data-src"), y = A.language;
          if (y === "none") {
            var E = (/\.(\w+)$/.exec(b) || [, "none"])[1];
            y = s[E] || E;
          }
          t.util.setLanguage(N, y), t.util.setLanguage(I, y);
          var _ = t.plugins.autoloader;
          _ && _.loadLanguages(y), h(
            b,
            function(D) {
              I.setAttribute(o, d);
              var L = g(I.getAttribute("data-range"));
              if (L) {
                var V = D.split(/\r\n?|\n/g), F = L[0], U = L[1] == null ? V.length : L[1];
                F < 0 && (F += V.length), F = Math.max(0, Math.min(F - 1, V.length)), U < 0 && (U += V.length), U = Math.max(0, Math.min(U, V.length)), D = V.slice(F, U).join(`
`), I.hasAttribute("data-start") || I.setAttribute("data-start", String(F + 1));
              }
              N.textContent = D, t.highlightElement(N);
            },
            function(D) {
              I.setAttribute(o, u), N.textContent = D;
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
        highlight: function(I) {
          for (var N = (I || document).querySelectorAll(m), b = 0, y; y = N[b++]; )
            t.highlightElement(y);
        }
      };
      var v = !1;
      t.fileHighlight = function() {
        v || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), v = !0), t.plugins.fileHighlight.highlight.apply(this, arguments);
      };
    })();
  })(prism)), prism.exports;
}
var prismExports = requirePrism();
const Prism$1 = /* @__PURE__ */ getDefaultExportFromCjs(prismExports);
(function(n) {
  var e = "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b", t = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: !0,
    alias: "punctuation",
    // this looks reasonably well in all themes
    inside: null
    // see below
  }, r = {
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
  n.languages.bash = {
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
        inside: r
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
        inside: r
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
          entity: r.entity
        }
      }
    ],
    environment: {
      pattern: RegExp("\\$?" + e),
      alias: "constant"
    },
    variable: r.variable,
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
  }, t.inside = n.languages.bash;
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
  ], i = r.variable[1].inside, s = 0; s < a.length; s++)
    i[a[s]] = n.languages.bash[a[s]];
  n.languages.sh = n.languages.bash, n.languages.shell = n.languages.bash;
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
  return hasRequiredPrismTypescript || (hasRequiredPrismTypescript = 1, (function(n) {
    n.languages.typescript = n.languages.extend("javascript", {
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
        lookbehind: !0,
        greedy: !0,
        inside: null
        // see below
      },
      builtin: /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/
    }), n.languages.typescript.keyword.push(
      /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
      // keywords that have to be followed by an identifier
      /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
      // This is for `import type *, {}`
      /\btype\b(?=\s*(?:[\{*]|$))/
    ), delete n.languages.typescript.parameter, delete n.languages.typescript["literal-property"];
    var e = n.languages.extend("typescript", {});
    delete e["class-name"], n.languages.typescript["class-name"].inside = e, n.languages.insertBefore("typescript", "function", {
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
    }), n.languages.ts = n.languages.typescript;
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
(function(n) {
  var e = /[*&][^\s[\]{},]+/, t = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/, r = "(?:" + t.source + "(?:[ 	]+" + e.source + ")?|" + e.source + "(?:[ 	]+" + t.source + ")?)", a = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(/<PLAIN>/g, function() {
    return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
  }), i = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
  function s(o, c) {
    c = (c || "").replace(/m/g, "") + "m";
    var d = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g, function() {
      return r;
    }).replace(/<<value>>/g, function() {
      return o;
    });
    return RegExp(d, c);
  }
  n.languages.yaml = {
    scalar: {
      pattern: RegExp(/([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source.replace(/<<prop>>/g, function() {
        return r;
      })),
      lookbehind: !0,
      alias: "string"
    },
    comment: /#.*/,
    key: {
      pattern: RegExp(/((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source.replace(/<<prop>>/g, function() {
        return r;
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
  }, n.languages.yml = n.languages.yaml;
})(Prism);
(function(n) {
  var e = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;
  function t(u) {
    return u = u.replace(/<inner>/g, function() {
      return e;
    }), RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + "(?:" + u + ")");
  }
  var r = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source, a = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function() {
    return r;
  }), i = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;
  n.languages.markdown = n.languages.extend("markup", {}), n.languages.insertBefore("markdown", "prolog", {
    "front-matter-block": {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: !0,
      greedy: !0,
      inside: {
        punctuation: /^---|---$/,
        "front-matter": {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ["yaml", "language-yaml"],
          inside: n.languages.yaml
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
              pattern: RegExp(r),
              inside: n.languages.markdown
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
              pattern: RegExp(r),
              alias: "important",
              inside: n.languages.markdown
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
    ["url", "bold", "italic", "strike", "code-snippet"].forEach(function(m) {
      u !== m && (n.languages.markdown[u].inside.content.inside[m] = n.languages.markdown[m]);
    });
  }), n.hooks.add("after-tokenize", function(u) {
    if (u.language !== "markdown" && u.language !== "md")
      return;
    function m(h) {
      if (!(!h || typeof h == "string"))
        for (var g = 0, v = h.length; g < v; g++) {
          var A = h[g];
          if (A.type !== "code") {
            m(A.content);
            continue;
          }
          var I = A.content[1], N = A.content[3];
          if (I && N && I.type === "code-language" && N.type === "code-block" && typeof I.content == "string") {
            var b = I.content.replace(/\b#/g, "sharp").replace(/\b\+\+/g, "pp");
            b = (/[a-z][\w-]*/i.exec(b) || [""])[0].toLowerCase();
            var y = "language-" + b;
            N.alias ? typeof N.alias == "string" ? N.alias = [N.alias, y] : N.alias.push(y) : N.alias = [y];
          }
        }
    }
    m(u.tokens);
  }), n.hooks.add("wrap", function(u) {
    if (u.type === "code-block") {
      for (var m = "", h = 0, g = u.classes.length; h < g; h++) {
        var v = u.classes[h], A = /language-(.+)/.exec(v);
        if (A) {
          m = A[1];
          break;
        }
      }
      var I = n.languages[m];
      if (I)
        u.content = n.highlight(d(u.content), I, m);
      else if (m && m !== "none" && n.plugins.autoloader) {
        var N = "md-" + (/* @__PURE__ */ new Date()).valueOf() + "-" + Math.floor(Math.random() * 1e16);
        u.attributes.id = N, n.plugins.autoloader.loadLanguages(m, function() {
          var b = document.getElementById(N);
          b && (b.innerHTML = n.highlight(b.textContent, n.languages[m], m));
        });
      }
    }
  });
  var s = RegExp(n.languages.markup.tag.pattern.source, "gi"), o = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"'
  }, c = String.fromCodePoint || String.fromCharCode;
  function d(u) {
    var m = u.replace(s, "");
    return m = m.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function(h, g) {
      if (g = g.toLowerCase(), g[0] === "#") {
        var v;
        return g[1] === "x" ? v = parseInt(g.slice(2), 16) : v = Number(g.slice(1)), c(v);
      } else {
        var A = o[g];
        return A || h;
      }
    }), m;
  }
  n.languages.md = n.languages.markdown;
})(Prism);
(function(n) {
  var e = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
  n.languages.css = {
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
  }, n.languages.css.atrule.inside.rest = n.languages.css;
  var t = n.languages.markup;
  t && (t.tag.addInlined("style", "css"), t.tag.addAttribute("style", "css"));
})(Prism);
(function(n) {
  var e = n.util.clone(n.languages.javascript), t = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source, r = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source, a = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
  function i(c, d) {
    return c = c.replace(/<S>/g, function() {
      return t;
    }).replace(/<BRACES>/g, function() {
      return r;
    }).replace(/<SPREAD>/g, function() {
      return a;
    }), RegExp(c, d);
  }
  a = i(a).source, n.languages.jsx = n.languages.extend("markup", e), n.languages.jsx.tag.pattern = i(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
  ), n.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/, n.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/, n.languages.jsx.tag.inside.tag.inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/, n.languages.jsx.tag.inside.comment = e.comment, n.languages.insertBefore("inside", "attr-name", {
    spread: {
      pattern: i(/<SPREAD>/.source),
      inside: n.languages.jsx
    }
  }, n.languages.jsx.tag), n.languages.insertBefore("inside", "special-attr", {
    script: {
      // Allow for two levels of nesting
      pattern: i(/=<BRACES>/.source),
      alias: "language-javascript",
      inside: {
        "script-punctuation": {
          pattern: /^=(?=\{)/,
          alias: "punctuation"
        },
        rest: n.languages.jsx
      }
    }
  }, n.languages.jsx.tag);
  var s = function(c) {
    return c ? typeof c == "string" ? c : typeof c.content == "string" ? c.content : c.content.map(s).join("") : "";
  }, o = function(c) {
    for (var d = [], u = 0; u < c.length; u++) {
      var m = c[u], h = !1;
      if (typeof m != "string" && (m.type === "tag" && m.content[0] && m.content[0].type === "tag" ? m.content[0].content[0].content === "</" ? d.length > 0 && d[d.length - 1].tagName === s(m.content[0].content[1]) && d.pop() : m.content[m.content.length - 1].content === "/>" || d.push({
        tagName: s(m.content[0].content[1]),
        openedBraces: 0
      }) : d.length > 0 && m.type === "punctuation" && m.content === "{" ? d[d.length - 1].openedBraces++ : d.length > 0 && d[d.length - 1].openedBraces > 0 && m.type === "punctuation" && m.content === "}" ? d[d.length - 1].openedBraces-- : h = !0), (h || typeof m == "string") && d.length > 0 && d[d.length - 1].openedBraces === 0) {
        var g = s(m);
        u < c.length - 1 && (typeof c[u + 1] == "string" || c[u + 1].type === "plain-text") && (g += s(c[u + 1]), c.splice(u + 1, 1)), u > 0 && (typeof c[u - 1] == "string" || c[u - 1].type === "plain-text") && (g = s(c[u - 1]) + g, c.splice(u - 1, 1), u--), c[u] = new n.Token("plain-text", g, null, g);
      }
      m.content && typeof m.content != "string" && o(m.content);
    }
  };
  n.hooks.add("after-tokenize", function(c) {
    c.language !== "jsx" && c.language !== "tsx" || o(c.tokens);
  });
})(Prism);
(function(n) {
  var e = n.util.clone(n.languages.typescript);
  n.languages.tsx = n.languages.extend("jsx", e), delete n.languages.tsx.parameter, delete n.languages.tsx["literal-property"];
  var t = n.languages.tsx.tag;
  t.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + t.pattern.source + ")", t.pattern.flags), t.lookbehind = !0;
})(Prism);
function slugify(n) {
  return n.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function escapeHtml(n) {
  return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function parseMarkdown(n) {
  const e = [], t = /* @__PURE__ */ new Map(), r = new marked.Renderer();
  r.heading = ({ tokens: o, depth: c, text: d }) => {
    let u = slugify(d);
    u || (u = `heading-${c}`);
    let m = u;
    const h = t.get(u) || 0;
    h > 0 && (m = `${u}-${h}`), t.set(u, h + 1), c >= 2 && c <= 4 && e.push({
      id: m,
      text: d.replace(/<[^>]*>/g, ""),
      level: c
    });
    const g = `<a href="#${m}" class="heading-anchor" aria-label="Link to ${escapeHtml(d)}">#</a>`;
    return `<h${c} id="${m}" class="doc-heading doc-h${c}"><span>${d}</span>${g}</h${c}>
`;
  }, r.code = ({ text: o, lang: c }) => {
    const d = (c || "").trim().toLowerCase();
    if (d === "mermaid")
      return `<div class="mermaid-block">
      <pre class="mermaid">${escapeHtml(o)}</pre>
    </div>
`;
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
        <button class="copy-code-btn" type="button" title="Copy code" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
      </div>
      <pre class="language-${d || "plaintext"}"><code class="language-${d || "plaintext"}">${u}</code></pre>
    </div>
`;
  }, r.table = ({ header: o, rows: c }) => {
    const d = o.map((m) => `<th>${marked.parseInline(m.text)}</th>`).join(""), u = c.map((m) => `<tr>${m.map((h) => `<td>${marked.parseInline(h.text)}</td>`).join("")}</tr>`).join("");
    return `<div class="table-container"><table><thead><tr>${d}</tr></thead><tbody>${u}</tbody></table></div>
`;
  };
  const a = /> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)+)/gi, i = n.replace(a, (o, c, d) => {
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
    renderer: r,
    gfm: !0,
    breaks: !1
  }), headings: e };
}
function formatCategoryName(n) {
  return n.replace(/^\d+-/, "").split("-").map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function parseOrderPrefix(n, e) {
  const t = n.match(/^(\d+)-/);
  return t ? parseInt(t[1], 10) : e;
}
function cleanSlugPart(n) {
  return n.replace(/^\d+-/, "").replace(/\.md$/, "").toLowerCase();
}
const markdownFiles = /* @__PURE__ */ Object.assign({
  "../../content/docs/01-getting-started/01-introduction.md": __vite_glob_0_0,
  "../../content/docs/01-getting-started/02-installation.md": __vite_glob_0_1,
  "../../content/docs/01-getting-started/03-quickstart.md": __vite_glob_0_2,
  "../../content/docs/02-guides/01-configuration.md": __vite_glob_0_3,
  "../../content/docs/02-guides/02-writing-docs.md": __vite_glob_0_4,
  "../../content/docs/02-guides/03-cloudflare-deployment.md": __vite_glob_0_5,
  "../../content/docs/02-guides/04-admin-panel.md": __vite_glob_0_6,
  "../../content/docs/03-api/01-overview.md": __vite_glob_0_7,
  "../../content/docs/03-api/02-collection-payment.md": __vite_glob_0_8,
  "../../content/docs/03-api/03-qr-payment.md": __vite_glob_0_9,
  "../../content/docs/03-api/04-callbacks-and-redirects.md": __vite_glob_0_10,
  "../../content/docs/04-mermaid-example/01-diagram.md": __vite_glob_0_11
});
let cachedStaticDocs = null;
function initializeStaticDocs() {
  if (cachedStaticDocs) return cachedStaticDocs;
  const n = [];
  for (const [t, r] of Object.entries(markdownFiles)) {
    const i = t.replace(/\\/g, "/").split("/content/docs/")[1]?.split("/");
    if (!i || i.length === 0) continue;
    let s = "", o = "";
    i.length === 1 ? (s = "00-general", o = i[0]) : (s = i[0], o = i.slice(1).join("/"));
    const c = parseOrderPrefix(s, 99), d = parseOrderPrefix(o.split("/").pop() || "", 99);
    n.push({
      categoryFolder: s,
      fileSlug: o,
      categoryOrder: c,
      fileOrder: d,
      content: r
    });
  }
  const e = [];
  for (const t of n) {
    const r = matter(t.content), a = r.data || {}, { html: i, headings: s } = parseMarkdown(r.content), o = cleanSlugPart(t.categoryFolder), c = cleanSlugPart(t.fileSlug), u = a.slug?.replace(/^\//, "") || `${o}/${c}`, m = a.category || formatCategoryName(t.categoryFolder), h = a.title || s[0]?.text || c, g = typeof a.order == "number" ? a.order : t.fileOrder, v = a.author || a.owner || "Docs Team", A = a.updatedAt || a.lastUpdated || "2026-08-19";
    e.push({
      slug: u,
      category: m,
      categorySlug: o,
      categoryOrder: t.categoryOrder,
      title: h,
      description: a.description || "",
      order: g,
      rawContent: r.content,
      htmlContent: i,
      headings: s,
      author: v,
      updatedAt: A
    });
  }
  return cachedStaticDocs = e, e;
}
function getAllStaticDocs() {
  return initializeStaticDocs();
}
async function getMergedDocs(n) {
  const e = await n.getDocs(), t = /* @__PURE__ */ new Map();
  for (const i of e) {
    const s = i.categorySlug || cleanSlugPart(i.category);
    t.has(s) || t.set(s, {
      title: i.category,
      slug: s,
      order: i.categoryOrder || 99,
      items: []
    }), t.get(s).items.push(i);
  }
  const r = Array.from(t.values()).sort((i, s) => i.order - s.order), a = [];
  for (const i of r)
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
async function getMergedDocBySlug(n, e) {
  return (await getMergedDocs(n)).find((r) => r.slug === e || r.slug.endsWith(`/${e}`));
}
async function getMergedNavigation(n) {
  const e = await getMergedDocs(n), t = /* @__PURE__ */ new Map();
  for (const r of e) {
    const a = r.categorySlug || cleanSlugPart(r.category);
    t.has(a) || t.set(a, {
      title: r.category,
      slug: a,
      order: r.categoryOrder || 99,
      items: []
    }), t.get(a).items.push({
      title: r.title,
      slug: r.slug,
      description: r.description,
      order: r.order
    });
  }
  return Array.from(t.values()).sort((r, a) => r.order - a.order);
}
async function getMergedSearchIndex(n) {
  return (await getMergedDocs(n)).map((t) => {
    const r = t.rawContent.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#*_-]/g, " ").replace(/\s+/g, " ").trim();
    return {
      slug: t.slug,
      title: t.title,
      category: t.category,
      description: t.description,
      contentSnippet: r.slice(0, 200),
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
    const e = await this.kv.list({ prefix: this.DOC_PREFIX }), t = getAllStaticDocs(), r = /* @__PURE__ */ new Map();
    for (const a of t)
      r.set(a.slug, {
        ...a,
        isDynamic: !1,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    for (const a of e.keys) {
      const i = await this.kv.get(a.name);
      if (i)
        try {
          const s = JSON.parse(i);
          r.set(s.slug, s);
        } catch {
        }
    }
    return Array.from(r.values());
  }
  async getDoc(e) {
    const t = await this.kv.get(`${this.DOC_PREFIX}${e}`);
    if (t)
      try {
        return JSON.parse(t);
      } catch {
      }
    const r = getAllStaticDocs().find((a) => a.slug === e);
    if (r)
      return {
        ...r,
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
    for (const r of e.keys) {
      const a = await this.kv.get(r.name);
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
function getStorage(n) {
  return n && n.DOCS_KV ? new KVStorageProvider(n.DOCS_KV) : defaultMemoryStorage;
}
function formatDate$3(n) {
  if (!n) return "Recently";
  try {
    const e = new Date(n);
    return isNaN(e.getTime()) ? n : e.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return n;
  }
}
const DocPage = ({ doc: n, navigation: e }) => /* @__PURE__ */ jsxDEV(
  Layout,
  {
    title: n.title,
    description: n.description || `Read ${n.title} on the documentation site.`,
    activePath: `/docs/${n.slug}`,
    children: /* @__PURE__ */ jsxDEV("div", { class: "docs-container", children: [
      /* @__PURE__ */ jsxDEV("aside", { class: "sidebar", children: e.map((t) => /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group-title", children: t.title }),
        /* @__PURE__ */ jsxDEV("ul", { class: "sidebar-menu", children: t.items.map((r) => {
          const a = r.slug === n.slug;
          return /* @__PURE__ */ jsxDEV("li", { class: "sidebar-item", children: /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${r.slug}`,
              class: `sidebar-link ${a ? "active" : ""}`,
              children: r.title
            }
          ) }, r.slug);
        }) })
      ] }, t.slug)) }),
      /* @__PURE__ */ jsxDEV("main", { class: "content-area", children: [
        /* @__PURE__ */ jsxDEV("nav", { class: "breadcrumbs", "aria-label": "Breadcrumb", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/docs", children: "Docs" }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { children: n.category }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { style: "color: var(--text-primary); font-weight: 500;", children: n.title })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 1.5rem; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap;", children: [
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "👤" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Owner: ",
              /* @__PURE__ */ jsxDEV("strong", { style: "color: var(--text-primary);", children: n.author || "Docs Team" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "🕒" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Last updated: ",
              /* @__PURE__ */ jsxDEV("time", { datetime: n.updatedAt || "", style: "color: var(--text-primary); font-weight: 500;", children: formatDate$3(n.updatedAt) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("article", { class: "doc-prose", children: /* @__PURE__ */ jsxDEV("div", { dangerouslySetInnerHTML: { __html: n.htmlContent } }) }),
        (n.prevDoc || n.nextDoc) && /* @__PURE__ */ jsxDEV("div", { class: "docs-pagination", children: [
          n.prevDoc ? /* @__PURE__ */ jsxDEV("a", { href: `/docs/${n.prevDoc.slug}`, class: "pagination-card prev", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "← Previous" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: n.prevDoc.title })
          ] }) : /* @__PURE__ */ jsxDEV("div", {}),
          n.nextDoc && /* @__PURE__ */ jsxDEV("a", { href: `/docs/${n.nextDoc.slug}`, class: "pagination-card next", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "Next →" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: n.nextDoc.title })
          ] })
        ] })
      ] }),
      n.headings && n.headings.length > 0 ? /* @__PURE__ */ jsxDEV("aside", { class: "toc-area", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "toc-title", children: "On this page" }),
        /* @__PURE__ */ jsxDEV("ul", { class: "toc-list", children: n.headings.map((t) => /* @__PURE__ */ jsxDEV("li", { class: `toc-item level-${t.level}`, children: /* @__PURE__ */ jsxDEV("a", { href: `#${t.id}`, class: "toc-link", children: t.text }) }, t.id)) })
      ] }) : /* @__PURE__ */ jsxDEV("div", { style: "width: var(--toc-width); flex-shrink: 0;" })
    ] })
  }
), docsApp = new Hono();
docsApp.get("/api/search", async (n) => {
  const e = getStorage(n.env), t = await getMergedSearchIndex(e);
  return n.json(t);
});
docsApp.get("/docs", async (n) => {
  const e = getStorage(n.env), t = await getMergedDocs(e);
  return t.length > 0 ? n.redirect(`/docs/${t[0].slug}`) : n.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}));
});
docsApp.get("/docs/:slug", async (n) => {
  const e = n.req.param("slug"), t = getStorage(n.env), r = await getMergedDocBySlug(t, e), a = await getMergedNavigation(t);
  if (!r) {
    const s = (await getMergedDocs(t)).find((o) => o.categorySlug === e);
    return s ? n.redirect(`/docs/${s.slug}`) : (n.status(404), n.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
  }
  return n.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: r, navigation: a }));
});
docsApp.get("/docs/:category/:slug", async (n) => {
  const e = n.req.param("category"), t = n.req.param("slug"), r = `${e}/${t}`, a = getStorage(n.env), i = await getMergedDocBySlug(a, r) || await getMergedDocBySlug(a, t), s = await getMergedNavigation(a);
  return i ? n.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: i, navigation: s })) : (n.status(404), n.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
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
apiRouter.openapi(getHealthRoute, (n) => n.json({
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
apiRouter.openapi(getUsersRoute, (n) => n.json(usersDb, 200));
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
apiRouter.openapi(createUserRoute, (n) => {
  const e = n.req.valid("json"), t = {
    id: `usr_${Date.now()}`,
    name: e.name,
    email: e.email,
    role: e.role,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return usersDb.push(t), n.json(t, 201);
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
apiRouter.openapi(getUserByIdRoute, (n) => {
  const { id: e } = n.req.valid("param"), t = usersDb.find((r) => r.id === e);
  return t ? n.json(t, 200) : n.json({ code: "NOT_FOUND", message: `User with ID '${e}' not found.` }, 404);
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
apiRouter.openapi(getProjectsRoute, (n) => n.json([
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
], LEGACY_PREFIXES = PREFIX_MIGRATIONS.map(([n]) => n);
function migrateThemeVariables(n) {
  return LEGACY_PREFIXES.some((t) => n.includes(t)) ? (console.warn("DEPRECATION WARNING: It looks like you're using legacy CSS variables in your custom CSS string. Please migrate them to use the updated prefixes. See https://github.com/scalar/scalar/blob/main/documentation/themes.md#theme-prefix-changes"), PREFIX_MIGRATIONS.reduce((t, [r, a]) => t.replaceAll(r, a), n)) : n;
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
})), migrateConfiguration = (n) => {
  const e = { ...n };
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
}), getHtmlDocument = (n, e = "") => {
  const { cdn: t, pageTitle: r, ...a } = n, i = htmlRenderingConfigurationSchema.parse({ cdn: t, pageTitle: r, customTheme: e }), s = apiReferenceConfigurationSchema.parse(a);
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
          ${n.theme ? "" : e}
        </style>
      </head>
      <body>
        ${getScriptTags(s, i.cdn)}
      </body>
    </html>
  `;
};
function getScriptTags(n, e) {
  return `
      <script
        id="api-reference"
        type="application/json"
        data-configuration="${getConfiguration(n)}">${getScriptTagContent(n)}<\/script>
        <script src="${e}"><\/script>
    `;
}
const getConfiguration = (n) => {
  const e = {
    ...n
  };
  return e.spec?.url ? e.spec?.content && delete e.spec?.content : delete e.spec, JSON.stringify(e).split('"').join("&quot;");
}, getScriptTagContent = (n) => n.spec?.content ? typeof n.spec?.content == "function" ? JSON.stringify(n.spec?.content()) : JSON.stringify(n.spec?.content) : "", DEFAULT_CONFIGURATION = {
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
`, apiReference = (n) => {
  const e = {
    ...DEFAULT_CONFIGURATION,
    ...n
  };
  return async (t) => t.html(
    /* html */
    `${getHtmlDocument(e, customTheme)}`
  );
}, scalarReference = apiReference({
  pageTitle: "NexGen API Reference",
  favicon: logo,
  theme: "purple",
  layout: "modern",
  spec: {
    url: "/openapi.json"
  }
}), COOKIE_NAME = "hono_admin_session", DEFAULT_PASSWORD = "admin123", DEFAULT_SECRET = "hono-edge-admin-secret-2026";
async function generateSessionToken(n) {
  const e = `admin_${Date.now()}`, t = new TextEncoder(), r = await crypto.subtle.importKey(
    "raw",
    t.encode(n),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), a = await crypto.subtle.sign("HMAC", r, t.encode(e)), i = Array.from(new Uint8Array(a)).map((s) => s.toString(16).padStart(2, "0")).join("");
  return `${e}.${i}`;
}
async function verifySessionToken(n, e) {
  if (!n || !n.includes(".")) return !1;
  const [t, r] = n.split(".");
  if (!t || !r) return !1;
  const a = new TextEncoder(), i = await crypto.subtle.importKey(
    "raw",
    a.encode(e),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), s = await crypto.subtle.sign("HMAC", i, a.encode(t)), o = Array.from(new Uint8Array(s)).map((c) => c.toString(16).padStart(2, "0")).join("");
  return r === o;
}
function getAdminPassword(n) {
  return n.env?.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}
function getSessionSecret(n) {
  return n.env?.SESSION_SECRET || DEFAULT_SECRET;
}
async function isAuthenticated(n) {
  const e = getSessionSecret(n), t = n.req.header("Authorization");
  if (t?.startsWith("Bearer ")) {
    const i = t.substring(7);
    if (i === getAdminPassword(n) || await verifySessionToken(i, e)) return !0;
  }
  const r = n.req.header("x-admin-key");
  if (r && r === getAdminPassword(n))
    return !0;
  const a = getCookie(n, COOKIE_NAME);
  return !!(a && await verifySessionToken(a, e));
}
async function loginAdmin(n) {
  const e = getSessionSecret(n), t = await generateSessionToken(e);
  return setCookie(n, COOKIE_NAME, t, {
    path: "/",
    httpOnly: !0,
    secure: !1,
    // will be upgraded in production
    sameSite: "Lax",
    maxAge: 3600 * 24 * 7
    // 7 days
  }), t;
}
function logoutAdmin(n) {
  deleteCookie(n, COOKIE_NAME, { path: "/" });
}
const adminAuthMiddleware = async (n, e) => {
  const t = n.req.path;
  return t === "/admin/login" || t === "/api/admin/login" || await isAuthenticated(n) ? e() : t.startsWith("/api/admin") ? n.json({ error: "Unauthorized: Admin authentication required" }, 401) : n.redirect(`/admin/login?redirect=${encodeURIComponent(t)}`);
}, LoginView = ({ error: n, redirect: e = "/admin" }) => /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
  /* @__PURE__ */ jsxDEV("head", { children: [
    /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
    /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
    /* @__PURE__ */ jsxDEV("title", { children: "Admin Login | NexGen Docs" }),
    /* @__PURE__ */ jsxDEV("link", { rel: "icon", type: "image/png", href: logo }),
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
      /* @__PURE__ */ jsxDEV("img", { src: logo, alt: "", width: "22", height: "22" }),
      /* @__PURE__ */ jsxDEV("span", { children: "NexGen Docs Admin" })
    ] }),
    n && /* @__PURE__ */ jsxDEV("div", { class: "error-banner", children: n }),
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
  children: n,
  title: e = "Admin Dashboard",
  activePath: t = "/admin"
}) => /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
  /* @__PURE__ */ jsxDEV("head", { children: [
    /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
    /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
    /* @__PURE__ */ jsxDEV("title", { children: [
      e,
      " | NexGen Docs Admin"
    ] }),
    /* @__PURE__ */ jsxDEV("link", { rel: "icon", type: "image/png", href: logo }),
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

          /* Mermaid Diagram Container */
          .mermaid-block {
            margin: 1.25rem 0;
            background: var(--admin-input-bg);
            border: 1px solid var(--admin-border);
            border-radius: 0.5rem;
            padding: 1.25rem;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow-x: auto;
          }

          .mermaid-block .mermaid {
            width: 100%;
            display: flex;
            justify-content: center;
            background: transparent;
            font-family: var(--admin-font);
          }

          .mermaid-block .mermaid svg {
            max-width: 100%;
            height: auto;
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
        /* @__PURE__ */ jsxDEV("img", { src: logo, alt: "", width: "26", height: "26" }),
        /* @__PURE__ */ jsxDEV("span", { children: "NexGen Docs" })
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
      /* @__PURE__ */ jsxDEV("div", { class: "admin-content", children: n })
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
function formatDate$2(n) {
  if (!n) return "Recently";
  try {
    const e = new Date(n);
    return isNaN(e.getTime()) ? n : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return n;
  }
}
const DashboardView = ({ docs: n, specs: e }) => {
  const t = n.filter((i) => i.isDynamic).length, r = n.filter((i) => !i.isDynamic).length, a = new Set(n.map((i) => i.category)).size;
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Dashboard Overview", activePath: "/admin", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "Total Articles" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;", children: n.length }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: [
          /* @__PURE__ */ jsxDEV("span", { children: [
            r,
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
        /* @__PURE__ */ jsxDEV("tbody", { children: n.slice(0, 6).map((i) => /* @__PURE__ */ jsxDEV("tr", { children: [
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
function formatDate$1(n) {
  if (!n) return "Recently";
  try {
    const e = new Date(n);
    return isNaN(e.getTime()) ? n : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return n;
  }
}
const DocsListView = ({ docs: n }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Documentation Management", activePath: "/admin/docs", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: [
        "All Documentation Pages (",
        n.length,
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
      /* @__PURE__ */ jsxDEV("tbody", { children: n.map((e) => /* @__PURE__ */ jsxDEV("tr", { "data-search": `${e.title.toLowerCase()} ${e.category.toLowerCase()} ${e.slug.toLowerCase()} ${(e.author || "").toLowerCase()}`, children: [
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
function formatDate(n) {
  if (!n) return "Not yet published";
  try {
    const e = new Date(n);
    return isNaN(e.getTime()) ? n : e.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return n;
  }
}
const DocEditorView = ({ doc: n, isNew: e = !1 }) => {
  const t = e ? "Create New Document" : `Edit: ${n?.title || "Document"}`, r = e ? `Write your markdown content here...

> [!NOTE]
> This is a callout note.

## Features

- Feature 1
- Feature 2

\`\`\`typescript
const example = "Hono on Cloudflare";
console.log(example);
\`\`\`
` : n?.rawContent || "";
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: t, activePath: e ? "/admin/docs/new" : "/admin/docs", children: [
    /* @__PURE__ */ jsxDEV("form", { id: "doc-editor-form", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 0.75rem;", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs", class: "btn btn-outline", children: "← Back to Docs" }),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: t }),
            !e && n?.updatedAt && /* @__PURE__ */ jsxDEV("span", { style: "font-size: 0.75rem; color: var(--admin-muted);", children: [
              "Last edited: ",
              formatDate(n.updatedAt),
              " by ",
              /* @__PURE__ */ jsxDEV("strong", { children: n.author || "Docs Team" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.75rem;", children: [
          !e && n?.slug && /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${n.slug}`,
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
                value: n?.title || "",
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
                value: n?.category || "Guides",
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
                value: n?.author || "Docs Team"
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
                value: n?.slug || "",
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
                value: n?.order !== void 0 ? String(n.order) : "10"
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
              value: n?.description || ""
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
            /* @__PURE__ */ jsxDEV("button", { type: "button", class: "btn btn-outline", style: "padding: 0.2rem 0.5rem; font-size: 0.75rem;", onclick: "insertText('```mermaid\\ngraph TD\\n    A[Client] -->|Request| B[API Gateway]\\n    B --> C[Service]\\n```\\n')", children: "📊 Mermaid" }),
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
              children: r
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
    /* @__PURE__ */ jsxDEV("script", { src: "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" }),
    /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: `
        const contentTextarea = document.getElementById('doc-content');
        const previewContainer = document.getElementById('live-preview-container');
        const titleInput = document.getElementById('doc-title');
        const slugInput = document.getElementById('doc-slug');
        const isNewDoc = ${e ? "true" : "false"};
        let mermaidTimer = null;

        // Custom marked renderer for Mermaid in preview
        function escapePreviewHtml(html) {
          return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        const previewRenderer = new marked.Renderer();
        const origCodeRenderer = previewRenderer.code.bind(previewRenderer);
        previewRenderer.code = function({ text, lang }) {
          const language = (lang || '').trim().toLowerCase();
          if (language === 'mermaid') {
            return '<div class="mermaid-block"><pre class="mermaid">' + escapePreviewHtml(text) + '</pre></div>';
          }
          return origCodeRenderer({ text, lang });
        };

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
            previewContainer.innerHTML = marked.parse(md, { renderer: previewRenderer });

            // Render Mermaid diagrams in preview
            if (typeof mermaid !== 'undefined') {
              clearTimeout(mermaidTimer);
              mermaidTimer = setTimeout(() => {
                const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
                mermaid.initialize({
                  startOnLoad: false,
                  theme: isDark ? 'dark' : 'default',
                  securityLevel: 'loose'
                });
                const mermaidNodes = previewContainer.querySelectorAll('.mermaid');
                if (mermaidNodes.length > 0) {
                  mermaid.run({ nodes: Array.from(mermaidNodes) }).catch(() => {});
                }
              }, 150);
            }
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
}, OpenAPIEditorView = ({ spec: n, allSpecs: e }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "OpenAPI Document Management", activePath: "/admin/openapi", children: [
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
            value: n.id,
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
            value: n.title,
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
            value: n.version,
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
          value: n.description
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
        children: n.specJson
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
adminViews.get("/admin/login", (n) => {
  const e = n.req.query("redirect") || "/admin";
  return n.html(/* @__PURE__ */ jsxDEV(LoginView, { redirect: e }));
});
adminViews.post("/admin/login", async (n) => {
  const e = await n.req.parseBody(), t = String(e.password || ""), r = String(e.redirect || "/admin"), a = getAdminPassword(n);
  return t !== a ? n.html(/* @__PURE__ */ jsxDEV(LoginView, { error: "Invalid admin password. Please try again.", redirect: r }), 401) : (await loginAdmin(n), n.redirect(r));
});
adminViews.get("/admin/logout", (n) => (logoutAdmin(n), n.redirect("/admin/login")));
adminViews.get("/admin", async (n) => {
  const e = getStorage(n.env), t = await e.getDocs(), r = await e.getAllOpenAPISpecs();
  return n.html(/* @__PURE__ */ jsxDEV(DashboardView, { docs: t, specs: r }));
});
adminViews.get("/admin/docs", async (n) => {
  const t = await getStorage(n.env).getDocs();
  return n.html(/* @__PURE__ */ jsxDEV(DocsListView, { docs: t }));
});
adminViews.get("/admin/docs/new", (n) => n.html(/* @__PURE__ */ jsxDEV(DocEditorView, { isNew: !0 })));
adminViews.get("/admin/docs/edit/:slug{.+}", async (n) => {
  const e = decodeURIComponent(n.req.param("slug")), r = await getStorage(n.env).getDoc(e);
  return r ? n.html(/* @__PURE__ */ jsxDEV(DocEditorView, { doc: r, isNew: !1 })) : n.redirect("/admin/docs");
});
adminViews.get("/admin/openapi", async (n) => {
  const e = getStorage(n.env), t = await e.getAllOpenAPISpecs();
  let r = await e.getOpenAPISpec("main");
  return r || (r = {
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
  }, await e.saveOpenAPISpec(r)), n.html(/* @__PURE__ */ jsxDEV(OpenAPIEditorView, { spec: r, allSpecs: t }));
});
const adminApi = new Hono();
adminApi.post("/api/admin/login", async (n) => {
  const t = (await n.req.json().catch(() => ({}))).password || "", r = getAdminPassword(n);
  if (t !== r)
    return n.json({ error: "Invalid admin password" }, 401);
  const a = await loginAdmin(n);
  return n.json({ success: !0, token: a });
});
adminApi.post("/api/admin/logout", (n) => (logoutAdmin(n), n.json({ success: !0 })));
adminApi.get("/api/admin/docs", async (n) => {
  const t = await getStorage(n.env).getDocs();
  return n.json(t);
});
adminApi.post("/api/admin/docs", async (n) => {
  const e = await n.req.json().catch(() => ({})), { title: t, category: r, slug: a, order: i = 10, description: s = "", content: o = "", author: c = "Docs Admin", owner: d } = e;
  if (!t || !a || !o)
    return n.json({ error: "Title, slug, and content are required" }, 400);
  const u = a.replace(/^\//, "").toLowerCase().trim(), { html: m, headings: h } = parseMarkdown(o), g = r || "Guides", v = g.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), A = {
    slug: u,
    category: g,
    categorySlug: v,
    categoryOrder: 50,
    title: t,
    description: s,
    order: Number(i) || 10,
    rawContent: o,
    htmlContent: m,
    headings: h,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(n.env).saveDoc(A), n.json(A, 201);
});
adminApi.put("/api/admin/docs/:slug{.+}", async (n) => {
  const e = n.req.param("slug"), t = await n.req.json().catch(() => ({})), { title: r, category: a, order: i = 10, description: s = "", content: o = "", author: c = "Docs Admin", owner: d } = t;
  if (!r || !o)
    return n.json({ error: "Title and content are required" }, 400);
  const { html: u, headings: m } = parseMarkdown(o), h = a || "Guides", g = h.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), v = {
    slug: e,
    category: h,
    categorySlug: g,
    categoryOrder: 50,
    title: r,
    description: s,
    order: Number(i) || 10,
    rawContent: o,
    htmlContent: u,
    headings: m,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(n.env).saveDoc(v), n.json(v);
});
adminApi.delete("/api/admin/docs/:slug{.+}", async (n) => {
  const e = n.req.param("slug"), r = await getStorage(n.env).deleteDoc(e);
  return n.json({ success: r, slug: e });
});
adminApi.get("/api/admin/openapi", async (n) => {
  const t = await getStorage(n.env).getAllOpenAPISpecs();
  return n.json(t);
});
adminApi.put("/api/admin/openapi/:id", async (n) => {
  const e = n.req.param("id"), t = await n.req.json().catch(() => ({})), { title: r, version: a, description: i = "", specJson: s } = t;
  if (!r || !a || !s)
    return n.json({ error: "Title, version, and specJson are required" }, 400);
  try {
    JSON.parse(s);
  } catch (d) {
    return n.json({ error: `Invalid JSON syntax: ${d.message}` }, 400);
  }
  const o = {
    id: e,
    title: r,
    version: a,
    description: i,
    specJson: s,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(n.env).saveOpenAPISpec(o), n.json(o);
});
const openapi = "3.1.0", info = { title: "NexGen API Reference", description: `## Welcome to the NexGen API

You can use our API to interact with NexGen's endpoints for generating bills and processing payments.

Our API follows RESTful principles, and all responses will be returned in JSON format, including error messages. The API supports both \`application/x-www-form-urlencoded\` and \`application/json\` content types.

## Important Notice for NexGen API Users

Please be advised that NexGen assumes no liability for any financial losses resulting from improper use of the API. Ensure that you follow the proper procedures when integrating the API into your systems.

## API Process Flow for NexGen

You will primarily interact with two core elements: **Collection** and **Bill**.

1. A **Collection** is a group of bills. The relationship is that a **Collection** can contain many **Bills**. You can create a collection either through the API or within your NexGen dashboard.
    
2. Examples of collections might include **Membership Fees**, **Utility Payments**, **Service Charges**, and more.
    
3. A **Bill** is essentially an invoice for your customer and must belong to a **Collection**.
    

## Steps to Start Using the API for Collection

1. Start by creating a **Collection**.
    
2. Follow the payment flow as outlined below:
    

### Payment Flow (Step by Step)

1. The customer visits your website.
    
2. The customer selects the option to make a payment.
    
3. Your website creates a **Bill** via an API call.
    
4. NexGen API responds with the **Bill URL**.
    
5. Your website redirects the customer to the bill's payment URL.
    
6. The customer completes the payment using their preferred payment method.
    
7. NexGen API sends a server-side notification to update your site about the payment status (success or failure).
    
8. If a **redirect_url** is provided, NexGen redirects the customer back to your site after payment completion.
    
9. Your backend (callback) should capture the transaction update to reflect it instantly to the customer on the page.
    

### **Payment Flow (S**equence **Diagram)**

<img src="https://content.pstmn.io/5ac9e33b-7621-4a90-91b9-2210873648f9/aW50cm8tbmV4Z2VuLnBuZw==">`, version: "1.0.0" }, paths = /* @__PURE__ */ JSON.parse('{"/api/v1/collection/create":{"post":{"summary":"Create Collection","responses":{"201":{"description":"Success: Store Collection","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:54:02 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"code":"RLVCQOIA0001","name":"test 1","description":"test 1","status":"active"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:51:35 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldName":"The field name field is required.","fieldDescription":"The field description field is required.","fieldStatus":"The field status field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:50:37 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:52:16 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"Unable to create the data. Please try again.","error":"SQLSTATE[HY000]: General error: 1364 Field \'code\' doesn\'t have a default value (Connection: mysql, SQL: insert into `payment_distribution_collections` (`name`, `description`, `status`, `team_id`, `id`, `updated_at`, `created_at`) values (proses bayaran rumah, mestilah dalam RM, active, 9ce8057c-1a81-4154-8bfa-629d0b1f128e, 9cf90326-a432-44d8-b1e6-f4d5100b14a0, 2024-09-10 09:52:16, 2024-09-10 09:52:16))"}}}}},"description":"The **Create Collection** API endpoint allows you to create a new collection for organizing your bills. A **Collection** is used to group bills under a specific category, such as **Membership Fees**, **Service Payments**, or **Rental Payments**, making it easier to manage and track related transactions.\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Create_Collection","tags":["Collection Payment/Collection"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"}],"requestBody":{"content":{"multipart/form-data":{"schema":{"type":"object","properties":{"fieldName":{"type":"string","example":"test 1"},"fieldDescription":{"type":"string","example":"test 1"},"fieldStatus":{"type":"string","example":"active"}}}}}}}},"/api/v1/collection/get/list":{"get":{"summary":"Get Collection List","responses":{"200":{"description":"Success: Retrieve List","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:55:42 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":[{"code":"RLVCQOIA0001","name":"test 1","description":"test 1","status":"active"},{"code":"RLVCWSEA0002","name":"test 2","description":"test 2","status":"inactive"}]}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:55:13 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:00:40 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"Call to undefined method Modules\\\\MerchantBridge\\\\Models\\\\MerchantBridgeTeam::refPaymentDistributionCollectionss()"}}}}},"description":"The **Get Collection List** API endpoint allows you to retrieve a list (array) of all the collections associated with your account. Each collection represents a group of bills, such as **Subscription Fees**, **Rental Payments**, or **Utility Bills**, enabling you to manage and categorize multiple transactions effectively.\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Get_Collection_List","tags":["Collection Payment/Collection"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"}]}},"/api/v1/collection/get/data/{collection_code}":{"get":{"summary":"Get Collection Data","responses":{"200":{"description":"Success: Retrieve Data","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:58:16 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVC2TEA0001","name":"test 1","description":"test 1","status":"active"}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:57:16 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:57:45 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 01:59:34 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'codex\' in \'where clause\' (Connection: mysql, SQL: select * from `payment_distribution_collections` where `payment_distribution_collections`.`team_id` = 9ce8057c-1a81-4154-8bfa-629d0b1f128e and `payment_distribution_collections`.`team_id` is not null and `codex` = C5ZHJMT00018 and `payment_distribution_collections`.`deleted_at` is null limit 1)"}}}}},"description":"The **Get Collection Data** API endpoint allows you to retrieve detailed information for a specific collection. A **Collection** is a group of bills organized under a single category, such as **Service Fees**. This endpoint provides all relevant data for a specific collection by using its unique identifier.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **COLLECTION_CODE** | The unique code for the collection, which is returned in the response of the Create Collection API. This code is used to identify the specific collection in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Get_Collection_Data","tags":["Collection Payment/Collection"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"collection_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVCQOIA0001"}]}},"/api/v1/collection/get/data/{collection_code}/billing":{"get":{"summary":"Get Collection Data Billing","responses":{"200":{"description":"Success: Retrieve Data Billing Collection","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 11:35:50 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVC2TEA0002","name":"test 2","description":"test 2","status":"active","bill_list":[{"code":"RLVB2UE241003AWLB4","status":"expired","amount":"10.00","payment_description":"test 1","due_date":"02-10-2024 18:49:00","payer_name":"test","payer_email":"test@gmail.com","payer_phone":"60123456789","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"external_reference_label_3":null,"external_reference_value_3":null,"external_reference_label_4":null,"external_reference_value_4":null,"redirect_url":null,"callback_url":"https://example.com/callback","payment_url":"https://nexgen.example.com/p/b/RLVB2UE241003AWLB4/1"},{"code":"RLVBTXN241003AWIB5","status":"unpaid","amount":"10.00","payment_description":"test 1","due_date":"04-10-2024 18:50:00","payer_name":"test","payer_email":"test@gmail.com","payer_phone":"60123456789","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"external_reference_label_3":null,"external_reference_value_3":null,"external_reference_label_4":null,"external_reference_value_4":null,"redirect_url":null,"callback_url":"https://example.com/callback","payment_url":"https://nexgen.example.com/p/b/RLVBTXN241003AWIB5/1"},{"code":"RLVBXZ9241003AYX06","status":"paid","amount":"10.00","payment_description":"test 1","due_date":"04-10-2024 18:53:00","payer_name":"test","payer_email":"test@gmail.com","payer_phone":"60123456789","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"external_reference_label_3":null,"external_reference_value_3":null,"external_reference_label_4":null,"external_reference_value_4":null,"redirect_url":null,"callback_url":"https://example.com/callback","payment_url":"https://nexgen.example.com/p/b/RLVBXZ9241003AYX06/1"}]}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:01:20 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:11:20 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:02:09 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'codex\' in \'where clause\' (Connection: mysql, SQL: select * from `payment_distribution_collections` where `payment_distribution_collections`.`team_id` = 9ce8057c-1a81-4154-8bfa-629d0b1f128e and `payment_distribution_collections`.`team_id` is not null and `codex` = C5ZHJMT00018 and `payment_distribution_collections`.`deleted_at` is null limit 1)"}}}}},"description":"The **Get Collection Data with Billing List** API endpoint allows you to retrieve detailed information for a specific collection along with a list of all bills associated with that collection. A **Collection** groups related bills, such as **Service Fees** or **Subscription Payments**, making it easier to manage multiple transactions.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **COLLECTION_CODE** | The unique code for the collection, which is returned in the response of the Create Collection API. This code is used to identify the specific collection in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |\\n| **bill_list** | A list of bills (array) associated with the collection. Each bill contains the following details: |\\n| **bill_list.code** | The unique code for the bill. |\\n| **bill_list.status** | The current status of the bill (e.g., unpaid, paid, expired). |\\n| **bill_list.amount** | The total amount of the bill. |\\n| **bill_list.payment_description** | A description of the payment for the bill. |\\n| **bill_list.due_date** | The due date for the bill. |\\n| **bill_list.payer_name** | The name of the payer associated with the bill. |\\n| **bill_list.payer_email** | The email of the payer associated with the bill. |\\n| **bill_list.payer_phone** | The phone number of the payer associated with the bill. |\\n| **bill_list.external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **bill_list.external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **bill_list.external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **bill_list.external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **bill_list.external_reference_label_3** | The label for the third external reference (if applicable). |\\n| **bill_list.external_reference_value_3** | The value for the third external reference (if applicable). |\\n| **bill_list.external_reference_label_4** | The label for the fourth external reference (if applicable). |\\n| **bill_list.external_reference_value_4** | The value for the fourth external reference (if applicable). |\\n| **bill_list.redirect_url** | The URL to which the customer is redirected after payment (if applicable). |\\n| **bill_list.callback_url** | The callback URL used to update the payment status on the server side. |\\n| **bill_list.payment_url** | The URL where the customer can make the payment. |","operationId":"Get_Collection_Data_Billing","tags":["Collection Payment/Collection"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"collection_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVCQOIA0001"}]}},"/api/v1/collection/switch/status/data/{collection_code}":{"put":{"summary":"Swith Status Collection Data","responses":{"200":{"description":"Success: Update Status","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:04:18 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVC2TEA0001","name":"test 1","description":"test 1","status":"active"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:03:29 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldStatus":"The field status field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:03:10 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:12:56 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:03:55 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'codex\' in \'where clause\' (Connection: mysql, SQL: select * from `payment_distribution_collections` where `payment_distribution_collections`.`team_id` = 9ce8057c-1a81-4154-8bfa-629d0b1f128e and `payment_distribution_collections`.`team_id` is not null and `codex` = C5ZHJMT00018 and `payment_distribution_collections`.`deleted_at` is null limit 1)"}}}}},"description":"The **Switch Status for Collection Data** API endpoint allows you to change the status of a specific collection. The status could be updated from \\"active\\" to \\"inactive\\" or vice versa, depending on your needs. This operation helps in managing collections by activating or deactivating them.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **COLLECTION_CODE** | The unique code for the collection, which is returned in the response of the Create Collection API. This code is used to identify the specific collection in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Swith_Status_Collection_Data","tags":["Collection Payment/Collection"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"fieldStatus","in":"query","schema":{"type":"string"},"example":"active","description":"Be required (it cannot be empty).\\nMust be one of the predefined status values: (active/inactive)."},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"collection_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVCQOIA0001"}]}},"/api/v1/billing/create/{collection_code}":{"post":{"summary":"Create Billing","responses":{"201":{"description":"Success: Store Billing","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 11:44:17 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"code":"RLVBEVN241004A9YU1","status":"unpaid","amount":"10.00","payment_description":"test 1","due_date":"05-10-2024 08:49:00","payer_name":"test","payer_email":"test@gmail.com","payer_phone":"60123456789","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"external_reference_label_3":null,"external_reference_value_3":null,"external_reference_label_4":null,"external_reference_value_4":null,"redirect_url":null,"callback_url":"https://example.com/callback","payment_url":"https://nexgen.example.com/p/b/RLVBEVN241004A9YU5/1"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:05:40 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldName":"The field name field is required.","fieldEmail":"The field email field is required.","fieldPhone":"The field phone field is required.","fieldAmount":"The field amount field is required.","fieldDescription":"The field description field is required.","fieldCallbackUrl":"The field callback url field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:05:09 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:06:56 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"Unable to create the data. Please try again.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'codex\' in \'where clause\' (Connection: mysql, SQL: select * from `payment_distribution_collections` where `payment_distribution_collections`.`team_id` = 9ce8057c-1a81-4154-8bfa-629d0b1f128e and `payment_distribution_collections`.`team_id` is not null and `codex` = C5ZHJMT00018 and `payment_distribution_collections`.`deleted_at` is null limit 1)"}}}}},"description":"The **Create Billing** API endpoint allows you to generate a new bill under a specific collection. This endpoint is used to create an invoice for a customer, and the bill will be associated with the designated collection. The bill can include information such as the amount, description, due date, and payer details.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **COLLECTION_CODE** | The unique code for the collection, which is returned in the response of the Create Collection API. This code is used to identify the specific collection in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., unpaid, pending, paid). |\\n| **amount** | The total amount of the bill. |\\n| **payment_description** | A brief description of the payment associated with the bill. |\\n| **due_date** | The due date for the payment. |\\n| **payer_name** | The name of the payer. |\\n| **payer_email** | The email address of the payer. |\\n| **payer_phone** | The phone number of the payer. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **external_reference_label_3** | The label for the third external reference (if applicable). |\\n| **external_reference_value_3** | The value for the third external reference (if applicable). |\\n| **external_reference_label_4** | The label for the fourth external reference (if applicable). |\\n| **external_reference_value_4** | The value for the fourth external reference (if applicable). |\\n| **redirect_url** | The URL to which the customer is redirected after the payment (if applicable). |\\n| **callback_url** | The URL used to receive server-side payment status updates. |\\n| **payment_url** | The URL where the customer can complete the payment. |","operationId":"Create_Billing","tags":["Collection Payment/Billing"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"collection_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVCQOIA0001"}],"requestBody":{"content":{"multipart/form-data":{"schema":{"type":"object","properties":{"fieldName":{"type":"string","example":"test"},"fieldEmail":{"type":"string","example":"test@gmail.com"},"fieldPhone":{"type":"string","example":"60123456789"},"fieldAmount":{"type":"string","example":"10.00"},"fieldPaymentDescription":{"type":"string","example":"test 1"},"fieldDueDate":{"type":"string","example":""},"fieldRedirectUrl":{"type":"string","example":""},"fieldCallbackUrl":{"type":"string","example":"https://example.com/callback"},"fieldExternalReferenceLabel1":{"type":"string","example":""},"fieldExternalReferenceValue1":{"type":"string","example":""}}}}}}}},"/api/v1/billing/get/data/{collection_code}/{bill_code}":{"get":{"summary":"Get Billing Data","responses":{"200":{"description":"Success: Retrieve Billing","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 11:47:48 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVB1EI241006AWWA3","status":"unpaid","amount":"10.00","payment_description":"test 1","due_date":"07-10-2024 21:39:00","payer_name":"test","payer_email":"test@gmail.com","payer_phone":"60123456789","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"external_reference_label_3":null,"external_reference_value_3":null,"external_reference_label_4":null,"external_reference_value_4":null,"redirect_url":null,"callback_url":"https://example.com/callback","payment_url":"https://nexgen.example.com/p/b/RLVB1EI241006AWWA3/1"}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:09:04 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found Collection","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Tue, 10 Sep 2024 02:19:38 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested collection could not be found.","error":"No query results for requested collection."}}}}},"description":"The **Get Billing Data** API endpoint allows you to retrieve detailed information about a specific bill using its unique **BILL_CODE**. This endpoint returns all the details related to the bill, including the amount, payment status, payer information, and more.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **COLLECTION_CODE** | The unique code for the collection, which is returned in the response of the Create Collection API. This code is used to identify the specific collection in subsequent API calls. |\\n| **BILL_CODE** | The unique code identifying the specific bill. This code is generated when a bill is created and is used to track and manage the bill within the system. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., unpaid, pending, paid). |\\n| **amount** | The total amount of the bill. |\\n| **payment_description** | A brief description of the payment associated with the bill. |\\n| **due_date** | The due date for the payment. |\\n| **payer_name** | The name of the payer. |\\n| **payer_email** | The email address of the payer. |\\n| **payer_phone** | The phone number of the payer. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **external_reference_label_3** | The label for the third external reference (if applicable). |\\n| **external_reference_value_3** | The value for the third external reference (if applicable). |\\n| **external_reference_label_4** | The label for the fourth external reference (if applicable). |\\n| **external_reference_value_4** | The value for the fourth external reference (if applicable). |\\n| **redirect_url** | The URL to which the customer is redirected after the payment (if applicable). |\\n| **callback_url** | The URL used to receive server-side payment status updates. |\\n| **payment_url** | The URL where the customer can complete the payment. |","operationId":"Get_Billing_Data","tags":["Collection Payment/Billing"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"collection_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVCQOIA0001"},{"name":"bill_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVBEVN241004A9YU1"}]}},"/":{"post":{"summary":"Callback Parameter After Payment","responses":{"200":{"description":"Successful response"}},"description":"When a payment is completed (successfully or unsuccessfully), the **Callback URL** is invoked by the payment system to notify your server of the transaction result. This callback follows a **RESTful API** approach and returns the payment information in **JSON** format.\\n\\n### Callback Workflow (RESTful API):\\n\\n1. **Payment Processing**: Once a payment is made, the system generates a request to the predefined **Callback URL** with the payment data in **JSON** format.\\n    \\n2. **POST Request**: The payment system sends a `POST` request to your server with the JSON data in the body.\\n    \\n3. **Server Processing**: Your server should handle the callback request, process the data (e.g., mark a bill as paid, update the payment status), and send an appropriate response.\\n    \\n4. **Response**: After processing, your server can return a success or failure response (e.g., `200 OK` for success).\\n    \\n5. **In Case of Failure**: If the callback processing fails or is not yet completed, the user will remain in a **processing queue**, and the redirect will not occur until the server confirms the payment status.\\n    \\n\\n### Server-Side Handling:\\n\\n1. Please note that Callback URL **cannot** be received in localhost.\\n    \\n2. Your server should listen for incoming `POST` requests at the **Callback URL**.\\n    \\n3. Once a callback is received, you can validate the data and update the system with the new payment status.\\n    \\n4. You can also respond to the request with a success (`200 OK`) or failure (`400 Bad Request`), based on the processing outcome.\\n    \\n\\n## Key Features of a RESTful Callback:\\n\\n1. **Stateless**: The callback request is independent, containing all the necessary information in a JSON payload.\\n    \\n2. **JSON Format**: The callback response is formatted in JSON, which is widely used for data interchange in APIs.\\n    \\n3. **HTTP Methods**: Typically, a `POST` request is sent to the callback URL with the JSON payload.\\n    \\n\\nBelow are the typical parameters sent to the **Callback URL** after payment:\\n\\n``` json\\n{\\n    \\"code\\": \\"RLVBXMU241004AXQP6\\",\\n    \\"status\\": \\"expired\\",\\n    \\"amount\\": \\"10.00\\",\\n    \\"payment_description\\": \\"test 1\\",\\n    \\"due_date\\": \\"05-10-2024 08:56:00\\",\\n    \\"payer_name\\": \\"test\\",\\n    \\"payer_email\\": \\"test@gmail.com\\",\\n    \\"payer_phone\\": \\"60123456789\\",\\n    \\"external_reference_label_1\\": null,\\n    \\"external_reference_value_1\\": null,\\n    \\"external_reference_label_2\\": null,\\n    \\"external_reference_value_2\\": null,\\n    \\"external_reference_label_3\\": null,\\n    \\"external_reference_value_3\\": null,\\n    \\"external_reference_label_4\\": null,\\n    \\"external_reference_value_4\\": null,\\n    \\"redirect_url\\": null,\\n    \\"callback_url\\": \\"https://example.com/callback\\",\\n    \\"payment_url\\": \\"https://nexgen.example.com/p/b/RLVBXMU241004AXQP6/1\\"\\n}\\n\\n ```\\n\\nBelow is the sequence diagram illustrating the process sent to the **Callback URL** after payment:\\n\\n<img src=\\"https://content.pstmn.io/eca7f494-1a17-40e5-989e-b9c596b66080/Y2FsbGJhY2stbmV4Z2VuLnBuZw==\\">\\n\\n## CALLBACK DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., unpaid, pending, paid). |\\n| **amount** | The total amount of the bill. |\\n| **payment_description** | A brief description of the payment associated with the bill. |\\n| **due_date** | The due date for the payment. |\\n| **payer_name** | The name of the payer. |\\n| **payer_email** | The email address of the payer. |\\n| **payer_phone** | The phone number of the payer. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **external_reference_label_3** | The label for the third external reference (if applicable). |\\n| **external_reference_value_3** | The value for the third external reference (if applicable). |\\n| **external_reference_label_4** | The label for the fourth external reference (if applicable). |\\n| **external_reference_value_4** | The value for the fourth external reference (if applicable). |\\n| **redirect_url** | The URL to which the customer is redirected after the payment (if applicable). |\\n| **callback_url** | The URL used to receive server-side payment status updates. |\\n| **payment_url** | The URL where the customer can complete the payment. |","operationId":"Callback_Parameter_After_Payment","tags":["Collection Payment/Billing"],"parameters":[]},"get":{"summary":"Redirect Parameters After Payment","responses":{"200":{"description":"Successful response"}},"description":"When a payment is completed (successfully or unsuccessfully), the **Redirect URL** is used to send the user to the appropriate page, usually after the callback has been processed successfully. The payment system sends these details as part of the redirect request to inform the user and update the payment information on the client side. This follows a **GET** request approach with the parameters passed in the URL, allowing the client to display the result of the payment to the user.\\n\\n### Redirect Workflow (GET Parameters):\\n\\n1. **Payment Completion**: Once the payment is completed, the server processes the callback and updates the payment status.\\n    \\n2. **Redirect URL Triggered**: After successful processing, the system triggers a redirect to the specified **Redirect URL** with the payment details attached as parameters.\\n    \\n3. **Client Processing**: Your frontend (client) will receive the payment details from the URL and can update the user interface accordingly.\\n    \\n4. **In Case of Failure**: If the callback processing fails or is not yet completed, the user remains in the **processing queue**, and the redirect will not occur until the payment status is confirmed.\\n    \\n\\n### Server-Side Handling:\\n\\n1. **Redirect URL Setup**: Define a **Redirect URL** to handle GET requests that will receive payment status updates.\\n    \\n2. **Handle Redirect Parameters**: Extract the payment details from the URL parameters and update the frontend UI or perform additional actions (e.g., show a success/failure message).\\n    \\n3. **Display Payment Status**: Based on the `status` parameter, the frontend can display the appropriate message to the user, such as \\"Payment Successful\\" or \\"Payment Failed.\\"\\n    \\n\\n## Key Features of a Redirect Parameters:\\n\\n1. After successful callback processing, the user is redirected to the URL with all the necessary parameters embedded in the GET request.\\n    \\n\\n``` html\\nGET /redirect?code=RLVBXMU241004AXQP6&status=expired&amount=10.00&payment_description=test+1&due_date=2024-10-05T08:56:00&payer_name=test&payer_email=test@gmail.com&payer_phone=60123456789\\n\\n ```\\n\\nBelow is the sequence diagram illustrating the process sent to the **Redirect URL** after payment:\\n\\n<img src=\\"https://content.pstmn.io/649067c5-9b7e-4330-ac55-f74d8712af30/cmVkaXJlY3QtbmV4Z2VuLnBuZw==\\">\\n\\n## REDIRECT DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., unpaid, pending, paid). |\\n| **amount** | The total amount of the bill. |\\n| **payment_description** | A brief description of the payment associated with the bill. |\\n| **due_date** | The due date for the payment. |\\n| **payer_name** | The name of the payer. |\\n| **payer_email** | The email address of the payer. |\\n| **payer_phone** | The phone number of the payer. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **external_reference_label_3** | The label for the third external reference (if applicable). |\\n| **external_reference_value_3** | The value for the third external reference (if applicable). |\\n| **external_reference_label_4** | The label for the fourth external reference (if applicable). |\\n| **external_reference_value_4** | The value for the fourth external reference (if applicable). |\\n| **redirect_url** | The URL to which the customer is redirected after the payment (if applicable). |\\n| **callback_url** | The URL used to receive server-side payment status updates. |\\n| **payment_url** | The URL where the customer can complete the payment. |","operationId":"Redirect_Parameters_After_Payment","tags":["Collection Payment/Billing"],"parameters":[]}},"/api/v1/terminal/create":{"post":{"summary":"Create Terminal","responses":{"201":{"description":"Success: Store Terminal","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:17:51 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"code":"RLVTBAQA0003","name":"terminal T1","description":"terminal T1","status":"active"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:16:40 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldName":"The field name field is required.","fieldDescription":"The field description field is required.","fieldStatus":"The field status field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:10:30 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:17:35 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"Unable to create the data. Please try again.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'team_idx\' in \'where clause\' (Connection: mysql, SQL: select count(*) as aggregate from `payment_distribution_terminals` where `team_idx` = 9cfcd76f-128e-473d-81d2-74b4fa322647 and `payment_distribution_terminals`.`deleted_at` is null)"}}}}},"description":"The **Create Terminal** API endpoint allows businesses to register or create a new terminal device, such as a physical POS (Point of Sale) terminal or a virtual terminal. This terminal can then be used for processing payments in an in-store environment, mobile setup, or self-service kiosk. This API is essential for setting up terminal devices in your payment infrastructure, ensuring seamless transactions between the business and customers.\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Create_Terminal","tags":["QR Payment/Terminal"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"}],"requestBody":{"content":{"multipart/form-data":{"schema":{"type":"object","properties":{"fieldName":{"type":"string","example":"terminal T1"},"fieldDescription":{"type":"string","example":"terminal T1"},"fieldStatus":{"type":"string","example":"active"}}}}}}}},"/api/v1/terminal/get/list":{"get":{"summary":"Get Terminal List","responses":{"200":{"description":"Success: Retrieve List","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:21:28 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":[{"code":"RLVTZCPA0001","name":"terminal T1","description":"terminal T1","status":"active"},{"code":"RLVTGCFA0002","name":"terminal T1","description":"terminal T1","status":"active"},{"code":"RLVTBAQA0003","name":"terminal T1","description":"terminal T1","status":"active"}]}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:19:37 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:20:30 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"Call to undefined method Modules\\\\MerchantBridge\\\\Models\\\\MerchantBridgeTeam::refPaymentDistributionTerminalss()"}}}}},"description":"The **Get Terminal List** API endpoint allows you to retrieve a list of all (array) the terminals that have been created and registered under your account. This endpoint is useful for managing, tracking, and organizing all the terminal devices in your payment infrastructure, whether they are physical POS terminals or virtual terminals.\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Get_Terminal_List","tags":["QR Payment/Terminal"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"}]}},"/api/v1/terminal/get/data/{terminal_code}":{"get":{"summary":"Get Terminal Data","responses":{"200":{"description":"Success: Retrieve Data","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:25:33 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVTZCPA0001","name":"terminal T1","description":"terminal T1","status":"active"}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:23:13 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:23:22 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:23:39 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'codex\' in \'where clause\' (Connection: mysql, SQL: select * from `payment_distribution_terminals` where `payment_distribution_terminals`.`team_id` = 9cfcd76f-128e-473d-81d2-74b4fa322647 and `payment_distribution_terminals`.`team_id` is not null and `codex` = C5ZHJMT00018 and `payment_distribution_terminals`.`deleted_at` is null limit 1)"}}}}},"description":"The **Get Terminal Data** API endpoint allows you to retrieve detailed information about a specific terminal. This includes key details such as the terminal’s status, location, type, and other relevant information necessary for managing and tracking terminal devices.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **TERMINAL_CODE** | The unique code for the terminal, which is assigned when a terminal is created. This code is used to identify the specific terminal in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Get_Terminal_Data","tags":["QR Payment/Terminal"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"terminal_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVTBAQA0003"}]}},"/api/v1/terminal/get/data/{terminal_code}/billing":{"get":{"summary":"Get Terminal Data Billing","responses":{"200":{"description":"Success: Retrieve Data Billing","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 12:10:20 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVTZCPA0001","name":"terminal T1","description":"terminal T1","status":"active","bill_list":[{"code":"RLVQGYG241003AS7K1","status":"expired","amount":"1.00","payment_description":"test terminal 1","due_date":"03-10-2024 19:17:00","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"soundbox_response":null}]}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:27:36 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:27:48 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:29:24 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S02]: Base table or view not found: 1146 Table \'sysnexgen_interface.payment_distribution_terminal_bills\' doesn\'t exist (Connection: mysql, SQL: select * from `payment_distribution_terminal_bills` where `payment_distribution_terminal_bills`.`terminal_id` = 9cfce9f9-62a5-40fd-9890-39193be579cb and `payment_distribution_terminal_bills`.`terminal_id` is not null and `payment_distribution_terminal_bills`.`deleted_at` is null)"}}}}},"description":"The **Get Terminal Data Billing** API endpoint allows you to retrieve detailed billing information associated with a specific terminal. This includes all bills processed by the terminal, enabling businesses to track payments and manage financial data efficiently.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **TERMINAL_CODE** | The unique code for the terminal, which is assigned when a terminal is created. This code is used to identify the specific terminal in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the terminal. |\\n| **name** | The name of the terminal. |\\n| **description** | A brief description of the terminal. |\\n| **status** | The current status of the terminal (e.g., active, inactive). |\\n| **bill_list** | A list of bills associated with the terminal, containing details for each bill. |\\n| **bill_list.code** | The unique code for the bill. |\\n| **bill_list.status** | The current payment status of the bill (e.g., expired, unpaid, paid). |\\n| **bill_list.amount** | The amount billed. |\\n| **bill_list.payment_description** | A brief description of the payment. |\\n| **bill_list.due_date** | The due date for the bill. |\\n| **bill_list.external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **bill_list.external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **bill_list.external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **bill_list.external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **bill_list.soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |","operationId":"Get_Terminal_Data_Billing","tags":["QR Payment/Terminal"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"terminal_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVTBAQA0003"}]}},"/api/v1/terminal/switch/status/data/{terminal_code}":{"put":{"summary":"Swith Status Terminal Data","responses":{"200":{"description":"Success: Update Status","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:38:12 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVTZCPA0001","name":"terminal T1","description":"terminal T1","status":"active"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:34:50 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldStatus":"The field status field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:33:00 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:36:17 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested data could not be found.","error":"No query results for requested data."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:37:08 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"An error occurred while processing your request.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'api_keyx\' in \'where clause\' (Connection: mysql, SQL: select * from `merchant_bridge_teams` where (`api_keyx` = fe08dd20-7122-4ca1-afcb-d629677fbffc and `api_secret` = LT6bBzdhcd4M1CJf9tV1DoeaYzP8EUuJ) and `merchant_bridge_teams`.`deleted_at` is null limit 1)"}}}}},"description":"The **Switch Status for Terminal Data** API endpoint allows you to change the status of a specific terminal. This can be used to activate or deactivate a terminal, helping businesses manage terminal availability based on operational needs.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **TERMINAL_CODE** | The unique code for the terminal, which is assigned when a terminal is created. This code is used to identify the specific terminal in subsequent API calls. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the collection. |\\n| **name** | The name of the collection. |\\n| **description** | A brief description of the collection. |\\n| **status** | The current status of the collection (e.g., active, inactive). |","operationId":"Swith_Status_Terminal_Data","tags":["QR Payment/Terminal"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"fieldStatus","in":"query","schema":{"type":"string"},"example":"active","description":"Be required (it cannot be empty).\\nMust be one of the predefined status values: (active/inactive)."},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"terminal_code","in":"path","required":true,"schema":{"type":"string"},"example":"RLVTBAQA0003"}]}},"/api/v1/qr/create/{terminal_collection}":{"post":{"summary":"Create QR","responses":{"201":{"description":"Success: Store Billing","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 12:22:31 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"code":"RLVQSD4241006AZ2O5","status":"unpaid","amount":"1.00","payment_description":"test terminal 1","due_date":"06-10-2024 21:20:00","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"callback_url":"https://example.com/callback","qr_code":"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"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:51:19 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldName":"The field name field is required.","fieldEmail":"The field email field is required.","fieldPhone":"The field phone field is required.","fieldAmount":"The field amount field is required.","fieldDescription":"The field description field is required.","fieldCallbackUrl":"The field callback url field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:48:51 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:53:31 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested collection could not be found.","error":"No query results for requested collection."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:57:45 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"Unable to create the data. Please try again.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'collect_id\' in \'where clause\' (Connection: mysql, SQL: select count(*) as aggregate from `payment_distribution_terminal_billings` where `collect_id` = 9cfce9f9-62a5-40fd-9890-39193be579cb and `payment_distribution_terminal_billings`.`deleted_at` is null)"}}}}},"description":"The **Create QR** API endpoint allows you to generate a QR code for a payment request. Customers can scan the QR code with their mobile devices to quickly and conveniently complete payments. This API simplifies the payment process, making it ideal for in-store, mobile, or online use cases.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **TERMINAL_CODE** | The unique code for the terminal, which is assigned when a terminal is created. This code is used to identify the specific terminal in subsequent API calls. |\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| TERMINAL_CODE | The unique code assigned to a terminal when it is created. This code is used to identify the terminal in API calls, such as when retrieving or updating terminal details or processing payments via the terminal. |\\n| QR_CODE | The unique code associated with a specific QR payment. This code is used to retrieve the details of the QR payment or to display the QR code for the customer to scan and complete the payment. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., expired, unpaid, paid). |\\n| **amount** | The amount billed. |\\n| **payment_description** | A brief description of the payment. |\\n| **due_date** | The due date for the bill. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |","operationId":"Create_QR","tags":["QR Payment/Dynamic QR"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"terminal_collection","in":"path","required":true,"schema":{"type":"string"},"example":"RLVTBAQA0003"}],"requestBody":{"content":{"multipart/form-data":{"schema":{"type":"object","properties":{"fieldAmount":{"type":"string","example":"1.00"},"fieldPaymentDescription":{"type":"string","example":"Test 12"},"fieldCallbackUrl":{"type":"string","example":"https://example.com/callback"},"fieldExternalReferenceLabel1":{"type":"string","example":"terminal_id"},"fieldExternalReferenceValue1":{"type":"string","example":"MPMCCAEA0002"},"fieldExternalReferenceLabel2":{"type":"string","example":"txn_id, Idno, Odno, Omid, Runno"},"fieldExternalReferenceValue2":{"type":"string","example":"1764057288-0008, 0008, 316, 295, 001"}}}}}}}},"/api/v1/qr/maybank/create/STGTTBLA0001":{"post":{"summary":"Create QR Maybank","responses":{"201":{"description":"Success: Create QR Maybank","headers":{"cache-control":{"schema":{"type":"string"},"example":"private, must-revalidate"},"expires":{"schema":{"type":"string"},"example":"-1"},"pragma":{"schema":{"type":"string"},"example":"no-cache"}},"content":{"application/json":{"example":{"code":"STGQMZH5260505A0002","status":"unpaid","amount":"1","payment_description":"Test 12","due_date":"05-05-2026 13:04:00","external_reference_label_1":"terminal_id","external_reference_value_1":"MPMCCAEA0002","external_reference_label_2":"txn_id, Idno, Odno, Omid, Runno","external_reference_value_2":"1764057288-0008, 0008, 316, 295, 001","callback_url":"https://example.com/callback","transaction_ref_id":"MBUAT111111115627039","qr_code":"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"}}}},"400":{"description":"Error: Validation","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:51:19 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"There was a validation error. Please review the input and try again.","error":{"fieldName":"The field name field is required.","fieldEmail":"The field email field is required.","fieldPhone":"The field phone field is required.","fieldAmount":"The field amount field is required.","fieldDescription":"The field description field is required.","fieldCallbackUrl":"The field callback url field is required."}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:48:51 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:53:31 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested collection could not be found.","error":"No query results for requested collection."}}}},"500":{"description":"Error: Miscellaneous","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 00:57:45 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"Unable to create the data. Please try again.","error":"SQLSTATE[42S22]: Column not found: 1054 Unknown column \'collect_id\' in \'where clause\' (Connection: mysql, SQL: select count(*) as aggregate from `payment_distribution_terminal_billings` where `collect_id` = 9cfce9f9-62a5-40fd-9890-39193be579cb and `payment_distribution_terminal_billings`.`deleted_at` is null)"}}}}},"description":"The **Create QR** API endpoint allows you to generate a QR code for a payment request. Customers can scan the QR code with their mobile devices to quickly and conveniently complete payments. This API simplifies the payment process, making it ideal for in-store, mobile, or online use cases.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **TERMINAL_CODE** | The unique code for the terminal, which is assigned when a terminal is created. This code is used to identify the specific terminal in subsequent API calls. |\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| TERMINAL_CODE | The unique code assigned to a terminal when it is created. This code is used to identify the terminal in API calls, such as when retrieving or updating terminal details or processing payments via the terminal. |\\n| QR_CODE | The unique code associated with a specific QR payment. This code is used to retrieve the details of the QR payment or to display the QR code for the customer to scan and complete the payment. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., expired, unpaid, paid). |\\n| **amount** | The amount billed. |\\n| **payment_description** | A brief description of the payment. |\\n| **due_date** | The due date for the bill. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |","operationId":"Create_QR_Maybank","tags":["QR Payment/Dynamic QR"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"ClientTerminalId","in":"header","schema":{"type":"string"},"example":"MBUAT1351514CASHRGB1","description":"Get from Maybank"}],"requestBody":{"content":{"multipart/form-data":{"schema":{"type":"object","properties":{"fieldAmount":{"type":"string","example":"1"},"fieldPaymentDescription":{"type":"string","example":"Test 12"},"fieldCallbackUrl":{"type":"string","example":"https://example.com/callback"},"fieldExternalReferenceLabel1":{"type":"string","example":"terminal_id"},"fieldExternalReferenceValue1":{"type":"string","example":"MPMCCAEA0002"},"fieldExternalReferenceLabel2":{"type":"string","example":"txn_id, Idno, Odno, Omid, Runno"},"fieldExternalReferenceValue2":{"type":"string","example":"1764057288-0008, 0008, 316, 295, 001"}}}}}}}},"/api/v1/qr/get/data/{terminal_collection}/STGQM4IV260513A0001":{"get":{"summary":"Get QR Data","responses":{"200":{"description":"Success: Retrieve QR","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Sat, 14 Sep 2024 12:53:26 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"code":"RLVQSD4241006AZ2O5","amount":"1.00","status":"expired","payment_description":"test terminal 1","due_date":"06-10-2024 21:20:00","external_reference_label_1":null,"external_reference_value_1":null,"external_reference_label_2":null,"external_reference_value_2":null,"callback_url":"https://example.com/callback","soundbox_response":null}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 01:20:58 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found Terminal","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 01:26:03 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested terminal could not be found.","error":"No query results for requested terminal."}}}}},"description":"The **Get QR Data** API endpoint allows you to retrieve detailed information about a QR code generated for payment. This endpoint provides all relevant details associated with the QR code, such as the payment status, amount, and the URL where the QR code can be accessed for the customer to complete the payment.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| TERMINAL_CODE | The unique code assigned to a terminal when it is created. This code is used to identify the terminal in API calls, such as when retrieving or updating terminal details or processing payments via the terminal. |\\n| QR_CODE | The unique code associated with a specific QR payment. This code is used to retrieve the details of the QR payment or to display the QR code for the customer to scan and complete the payment. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., expired, unpaid, paid). |\\n| **amount** | The amount billed. |\\n| **payment_description** | A brief description of the payment. |\\n| **due_date** | The due date for the bill. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |","operationId":"Get_QR_Data","tags":["QR Payment/Dynamic QR"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"},{"name":"terminal_collection","in":"path","required":true,"schema":{"type":"string"},"example":"RLVTBAQA0003"}]}},"/api/v1/qr/maybank/status/MBUAT111111115627269":{"get":{"summary":"Get QR Maybank Data","responses":{"200":{"description":"Status: Success","headers":{"cache-control":{"schema":{"type":"string"},"example":"private, must-revalidate"},"expires":{"schema":{"type":"string"},"example":"-1"},"pragma":{"schema":{"type":"string"},"example":"no-cache"}},"content":{"application/json":{"example":{"status":"OK","transaction_status":"Success","data":{"transaction_ref_id":"MBUAT111111115627269","client_ref_id":"STGQMX19260507A0001","startdate":"2026-05-07T11:07:37.330Z","enddate":"2026-05-07T11:08:45.670Z","sale_amount":"1.00","final_amount":"1.00","discount_amount":null,"promo_code":null,"client_terminal_id":"MBUAT1351514CASHRGB1"}}}}},"401":{"description":"Error: Authentication","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 01:20:58 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"}},"content":{"application/json":{"example":{"status":"error","message":"You are not authorized to perform this action."}}}},"404":{"description":"Error: Not Found Terminal","headers":{"Server":{"schema":{"type":"string"},"example":"nginx/1.25.5"},"Transfer-Encoding":{"schema":{"type":"string"},"example":"chunked"},"Connection":{"schema":{"type":"string"},"example":"keep-alive"},"Vary":{"schema":{"type":"string"},"example":"Accept-Encoding"},"X-Powered-By":{"schema":{"type":"string"},"example":"PHP/8.3.9"},"Cache-Control":{"schema":{"type":"string"},"example":"no-cache, private"},"Date":{"schema":{"type":"string"},"example":"Thu, 12 Sep 2024 01:26:03 GMT"},"Access-Control-Allow-Origin":{"schema":{"type":"string"},"example":"*"},"Content-Encoding":{"schema":{"type":"string"},"example":"gzip"}},"content":{"application/json":{"example":{"status":"error","message":"The requested terminal could not be found.","error":"No query results for requested terminal."}}}},"500":{"description":"Error: Invalid","headers":{"cache-control":{"schema":{"type":"string"},"example":"private, must-revalidate"},"expires":{"schema":{"type":"string"},"example":"-1"},"pragma":{"schema":{"type":"string"},"example":"no-cache"}},"content":{"application/json":{"example":{"status":"error","message":"Failed to retrieve QR status.","error":"[Maybank QRPay] Status check failed: [QR115] Invalid Transaction"}}}}},"description":"The **Get QR Data** API endpoint allows you to retrieve detailed information about a QR code generated for payment. This endpoint provides all relevant details associated with the QR code, such as the payment status, amount, and the URL where the QR code can be accessed for the customer to complete the payment.\\n\\n## URL PARAMETER\\n\\n| Parameter | Description |\\n| --- | --- |\\n| TERMINAL_CODE | The unique code assigned to a terminal when it is created. This code is used to identify the terminal in API calls, such as when retrieving or updating terminal details or processing payments via the terminal. |\\n| QR_CODE | The unique code associated with a specific QR payment. This code is used to retrieve the details of the QR payment or to display the QR code for the customer to scan and complete the payment. |\\n\\n## RESPONSE DESCRIPTION\\n\\n| Parameter | Description |\\n| --- | --- |\\n| **code** | The unique code for the bill. |\\n| **status** | The current payment status of the bill (e.g., expired, unpaid, paid). |\\n| **amount** | The amount billed. |\\n| **payment_description** | A brief description of the payment. |\\n| **due_date** | The due date for the bill. |\\n| **external_reference_label_1** | The label for the first external reference (if applicable). |\\n| **external_reference_value_1** | The value for the first external reference (if applicable). |\\n| **external_reference_label_2** | The label for the second external reference (if applicable). |\\n| **external_reference_value_2** | The value for the second external reference (if applicable). |\\n| **soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |","operationId":"Get_QR_Maybank_Data","tags":["QR Payment/Dynamic QR"],"parameters":[{"name":"ApiSecret","in":"query","schema":{"type":"string"},"example":"YOUR_API_SECRET","description":"Get from dashboard"},{"name":"ApiKey","in":"header","schema":{"type":"string"},"example":"YOUR_API_KEY","description":"Get from dashboard"}]}}}'), servers = [{ url: "https://nexgen.example.com", description: "Replace with the NexGen host provided with your credentials" }], tags = [{ name: "Collection Payment", description: `A **Collection Payment** refers to a method of organizing and grouping multiple bills under a single category, allowing for streamlined management and tracking of payments. Each collection represents a specific purpose or type of payment, such as **monthly fees**, **service payments**, or **project contributions**. When a bill is generated, it is associated with a particular collection, making it easier to manage and report on multiple related transactions.

By grouping **bills** into **collections**, businesses or organizations can better organize their invoicing process, ensuring that all payments for a particular service or event are handled in an efficient and structured manner. This approach also enables easier **reporting** and **payment tracking**, **offering transparency** to both the payer and the collector.

To use the api, you will need your **API Key & SECRET Key**. This key is required to authenticate API requests. Please log in to the NexGen API dashboard to retrieve your keys.` }, { name: "Collection Payment/Collection", description: "A **Collection** is a group of related bills that helps in organizing and managing different types of payments. For instance, you can create a **'Service'** Collection for bills related to service charges payments. Each bill must be associated with a Collection, enabling better organization and easier tracking of payments under specific categories." }, { name: "Collection Payment/Billing", description: "The **Billing** allows businesses to create and manage bills for their customers through an API, making it easy to automate invoicing and payment collection. This API is designed to generate bills with detailed information such as amounts, due dates, and customer details. The **Billing API** is a versatile solution for handling payments for services, subscriptions, product purchases, and more." }, { name: "QR Payment", description: `The **QR Payment** API endpoint allows you to generate a QR code for payment, enabling customers to scan and pay directly using their mobile devices. This method streamlines the payment process by eliminating the need for manual entry of payment details, providing a fast and seamless experience for both businesses and customers.

This API is highly versatile and can be integrated into a variety of platforms, including:

1. **Point of Sale (POS) Systems**: The QR Payment API can be used in retail environments to facilitate quick and efficient in-person payments. At checkout, the POS system can generate a unique QR code for each transaction, which the customer can scan with their mobile device to complete the payment instantly. This reduces the need for physical cash handling and accelerates the transaction process.
    
2. **Mobile and Web Applications**: The API can be integrated into mobile apps and web platforms to allow users to pay for services or products directly by scanning a QR code. Whether it’s an e-commerce platform, subscription service, or digital wallet, the QR Payment feature offers a convenient, secure, and fast way to handle payments.
    
3. **Self-service Kiosks**: In industries such as food service, transportation, or entertainment, self-service kiosks can utilize QR Payment to enable customers to pay quickly and independently. After placing an order or selecting a service, the kiosk displays a QR code that the customer scans to complete the transaction.` }, { name: "QR Payment/Terminal", description: "The **Terminal** allows businesses to process payments using a terminal device, such as a card reader or a Point of Sale (POS) system. This API enables integration between your payment system and a terminal, allowing customers to make payments using various payment methods, such as cards, digital wallets, or other contactless methods. The **Terminal API** facilitates seamless in-store or in-person transactions, providing flexibility and convenience for both businesses and customers." }, { name: "QR Payment/Dynamic QR", description: "The **Dynamic QR** API endpoint allows businesses to generate a unique, transaction-specific QR code for payments. This method enables customers to scan the QR code with their mobile devices to complete the payment. Dynamic QR codes are typically used for one-time payments, where the amount and details are fixed for a specific transaction, ensuring security and accuracy." }], nexgenSpec = {
  openapi,
  info,
  paths,
  servers,
  tags,
  "x-hoppscotch-folder-tags": "slash",
  "x-hoppscotch-dropped-requests": [{ tagPath: "QR Payment/Dynamic QR", request: { v: "17", id: "req_mueyornf_ad5aa552-c3ad-459a-9031-dbddd258e846", name: "Callback Parameter After Payment", method: "POST", endpoint: "", params: [], headers: [], preRequestScript: "", testScript: "", auth: { authType: "inherit", authActive: !0 }, body: { contentType: null, body: null }, requestVariables: [], responses: {}, description: `When a payment is completed (successfully), the **Callback URL** is invoked by the payment system to notify your server of the transaction result. This callback follows a **RESTful API** approach and returns the payment information in **JSON** format.

### Callback Workflow (RESTful API):

1. **Payment Processing**: Once a payment is made, the system generates a request to the predefined **Callback URL** with the payment data in **JSON** format.
    
2. **POST Request**: The payment system sends a \`POST\` request to your server with the JSON data in the body.
    
3. **Server Processing**: Your server should handle the callback request, process the data (e.g., mark a bill as paid, update the payment status), and send an appropriate response.
    
4. **Response**: After processing, your server can return a success or failure response (e.g., \`200 OK\` for success)
    

### Server-Side Handling:

1. Please note that Callback URL **cannot** be received in localhost.
    
2. Your server should listen for incoming \`POST\` requests at the **Callback URL**.
    
3. Once a callback is received, you can validate the data and update the system with the new payment status.
    
4. You can also respond to the request with a success (\`200 OK\`) or failure (\`400 Bad Request\`), based on the processing outcome.
    

## Key Features of a RESTful Callback:

1. **Stateless**: The callback request is independent, containing all the necessary information in a JSON payload.
    
2. **JSON Format**: The callback response is formatted in JSON, which is widely used for data interchange in APIs.
    
3. **HTTP Methods**: Typically, a \`POST\` request is sent to the callback URL with the JSON payload.
    

Below are the typical parameters sent to the **Callback URL** after payment:

\`\`\` json
{
    "code": "RLVQSD4241006AZ2O5",
    "amount": "1.00",
    "status": "expired",
    "payment_description": "test terminal 1",
    "due_date": "06-10-2024 21:20:00",
    "external_reference_label_1": null,
    "external_reference_value_1": null,
    "external_reference_label_2": null,
    "external_reference_value_2": null,
    "callback_url": "https://example.com/callback",
    "soundbox_response": null
}

 \`\`\`

Below is the sequence diagram illustrating the process sent to the **Callback URL** after payment:

<img src="https://content.pstmn.io/b895a2ef-49d8-4b23-9bbf-584f23f881e9/cXItdGVybWluYWwtbmV4Z2VuLnBuZw==">

## CALLBACK DESCRIPTION

| Parameter | Description |
| --- | --- |
| **code** | The unique code for the bill. |
| **status** | The current payment status of the bill (e.g., expired, unpaid, paid). |
| **amount** | The amount billed. |
| **payment_description** | A brief description of the payment. |
| **due_date** | The due date for the bill. |
| **external_reference_label_1** | The label for the first external reference (if applicable). |
| **external_reference_value_1** | The value for the first external reference (if applicable). |
| **external_reference_label_2** | The label for the second external reference (if applicable). |
| **external_reference_value_2** | The value for the second external reference (if applicable). |
| **soundbox_response** | The response from the soundbox, if applicable (e.g., audio confirmation for payment completion). |` } }]
}, app = new OpenAPIHono();
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
app.get("/openapi.json", async (n) => {
  const t = await getStorage(n.env).getOpenAPISpec("main");
  if (t && t.specJson)
    try {
      const r = JSON.parse(t.specJson);
      if (r.paths && Object.keys(r.paths).length > 0)
        return n.json(r);
    } catch {
    }
  return n.json(nexgenSpec);
});
app.get("/reference", scalarReference);
app.get("/reference/*", scalarReference);
app.get("/scalar", (n) => n.redirect("/reference"));
app.get("/docs/api/reference", (n) => n.redirect("/reference"));
app.use("/admin/*", adminAuthMiddleware);
app.use("/api/admin/*", adminAuthMiddleware);
app.route("/", adminViews);
app.route("/", adminApi);
app.get("/", (n) => n.html(/* @__PURE__ */ jsxDEV(HomePage, {})));
app.route("/", docsApp);
app.notFound((n) => n.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}), 404));
export {
  app as default
};
