var HtmlEscapedCallbackPhase = {
  Stringify: 1
}, raw = (t, e) => {
  const r = new String(t);
  return r.isEscaped = !0, r.callbacks = e, r;
}, escapeRe = /[&<>'"]/, stringBufferToString = async (t, e) => {
  let r = "";
  e ||= [];
  const n = await Promise.all(t);
  for (let a = n.length - 1; r += n[a], a--, !(a < 0); a--) {
    let i = n[a];
    typeof i == "object" && e.push(...i.callbacks || []);
    const s = i.isEscaped;
    if (i = await (typeof i == "object" ? i.toString() : i), typeof i == "object" && e.push(...i.callbacks || []), i.isEscaped ?? s)
      r += i;
    else {
      const l = [r];
      escapeToBuffer(i, l), r = l[0];
    }
  }
  return raw(r, e);
}, escapeToBuffer = (t, e) => {
  const r = t.search(escapeRe);
  if (r === -1) {
    e[0] += t;
    return;
  }
  let n, a, i = 0;
  for (a = r; a < t.length; a++) {
    switch (t.charCodeAt(a)) {
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
    e[0] += t.substring(i, a) + n, i = a + 1;
  }
  e[0] += t.substring(i, a);
}, resolveCallbackSync = (t) => {
  const e = t.callbacks;
  if (!e?.length)
    return t;
  const r = [t], n = {};
  return e.forEach((a) => a({ phase: HtmlEscapedCallbackPhase.Stringify, buffer: r, context: n })), r[0];
}, resolveCallback = async (t, e, r, n, a) => {
  typeof t == "object" && !(t instanceof String) && (t instanceof Promise || (t = t.toString()), t instanceof Promise && (t = await t));
  const i = t.callbacks;
  return i?.length ? (a ? a[0] += t : a = [t], Promise.all(i.map((l) => l({ phase: e, buffer: a, context: n }))).then(
    (l) => Promise.all(
      l.filter(Boolean).map((c) => resolveCallback(c, e, !1, n, a))
    ).then(() => a[0])
  )) : Promise.resolve(t);
}, html$1 = (t, ...e) => {
  const r = [""];
  for (let n = 0, a = t.length - 1; n < a; n++) {
    r[0] += t[n];
    const i = Array.isArray(e[n]) ? e[n].flat(1 / 0) : [e[n]];
    for (let s = 0, l = i.length; s < l; s++) {
      const c = i[s];
      if (typeof c == "string")
        escapeToBuffer(c, r);
      else if (typeof c == "number")
        r[0] += c;
      else {
        if (typeof c == "boolean" || c === null || c === void 0)
          continue;
        if (typeof c == "object" && c.isEscaped)
          if (c.callbacks)
            r.unshift("", c);
          else {
            const d = c.toString();
            d instanceof Promise ? r.unshift("", d) : r[0] += d;
          }
        else c instanceof Promise ? r.unshift("", c) : escapeToBuffer(c.toString(), r);
      }
    }
  }
  return r[0] += t.at(-1), r.length === 1 ? "callbacks" in r ? raw(resolveCallbackSync(raw(r[0], r.callbacks))) : raw(r[0]) : stringBufferToString(r, r.callbacks);
}, DOM_RENDERER = /* @__PURE__ */ Symbol("RENDERER"), DOM_ERROR_HANDLER = /* @__PURE__ */ Symbol("ERROR_HANDLER"), DOM_INTERNAL_TAG = /* @__PURE__ */ Symbol("INTERNAL"), PERMALINK = /* @__PURE__ */ Symbol("PERMALINK"), setInternalTagFlag = (t) => (t[DOM_INTERNAL_TAG] = !0, t), createContextProviderFunction = (t) => ({ value: e, children: r }) => {
  if (!r)
    return;
  const n = {
    children: [
      {
        tag: setInternalTagFlag(() => {
          t.push(e);
        }),
        props: {}
      }
    ]
  };
  Array.isArray(r) ? n.children.push(...r.flat()) : n.children.push(r), n.children.push({
    tag: setInternalTagFlag(() => {
      t.pop();
    }),
    props: {}
  });
  const a = { tag: "", props: n, type: "" };
  return a[DOM_ERROR_HANDLER] = (i) => {
    throw t.pop(), i;
  }, a;
}, globalContexts = [], alsProbed = !1, asyncLocalStorage, fallbackStore, fallbackRendersInFlight = 0, warnedFallbackDefault = !1, loadAsyncLocalStorage = () => {
  if (alsProbed)
    return asyncLocalStorage;
  alsProbed = !0;
  const t = globalThis;
  let e;
  for (const r of [
    // Node.js >= 20.16, Deno, Bun, Cloudflare Workers (nodejs_compat). Property
    // access only, so bundlers don't statically resolve `node:async_hooks`.
    () => t.process?.getBuiltinModule?.("node:async_hooks")?.AsyncLocalStorage,
    // Node.js < 20.16 has no `process.getBuiltinModule`, but a CJS entrypoint
    // exposes the main module's `require` here.
    () => t.process?.mainModule?.require?.("node:async_hooks")?.AsyncLocalStorage
  ]) {
    try {
      e = r();
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
}, getContextValuesIn = (t, e) => {
  if (!t)
    return warnIfStorelessAccess(), e.values;
  let r = t.get(e);
  return r || (r = [e.values[0]], t.set(e, r)), r;
}, readContextValueIn = (t, e) => {
  if (!t)
    return warnIfStorelessAccess(), e.values.at(-1);
  const r = t.get(e);
  return r?.length ? r.at(-1) : e.values[0];
}, captureContextValues = (t) => (t ? globalContexts.filter((e) => t.has(e)) : globalContexts).map((e) => [
  e,
  readContextValueIn(t, e)
]), resumeWithContextValues = (t, e, r) => runWithRenderContext(() => {
  const n = getCurrentStore(), a = r.map(([s, l]) => {
    const c = getContextValuesIn(n, s);
    return c.push(l), c;
  }), i = () => {
    a.forEach((s) => {
      s.pop();
    });
  };
  try {
    const s = t();
    return s instanceof Promise ? s.finally(i) : (i(), s);
  } catch (s) {
    throw i(), s;
  }
}, e), runWithRenderContext = (t, e) => {
  if (getCurrentStore())
    return t();
  const r = e ?? /* @__PURE__ */ new WeakMap(), n = loadAsyncLocalStorage();
  if (n)
    return n.run(r, t);
  fallbackStore = r;
  let a;
  try {
    a = t();
  } finally {
    fallbackStore = void 0;
  }
  return !warnedFallbackDefault && a instanceof Promise && (fallbackRendersInFlight++, a = a.finally(() => {
    fallbackRendersInFlight--;
  })), a;
}, captureRenderContext = () => {
  const t = getCurrentStore(), e = captureContextValues(t);
  return (r) => resumeWithContextValues(r, t, e);
}, createContext = (t) => {
  const e = [t], r = ((n) => {
    const a = getContextValuesIn(getCurrentStore(), r);
    a.push(n.value);
    let i;
    try {
      i = n.children ? (Array.isArray(n.children) ? new JSXFragmentNode("", {}, n.children) : n.children).toString() : "";
    } catch (s) {
      throw a.pop(), s;
    }
    return i instanceof Promise ? i.finally(() => a.pop()).then((s) => raw(s, s.callbacks)) : (a.pop(), raw(i));
  });
  return r.values = e, r.Provider = r, r[DOM_RENDERER] = createContextProviderFunction(e), globalContexts.push(r), r;
}, useContext = (t) => readContextValueIn(getCurrentStore(), t), deDupeKeyMap = {
  title: [],
  script: ["src"],
  style: ["data-href"],
  link: ["href"],
  meta: ["name", "httpEquiv", "charset", "itemProp"]
}, domRenderers = {}, dataPrecedenceAttr = "data-precedence", isStylesheetLinkWithPrecedence = (t) => t.rel === "stylesheet" && "precedence" in t, shouldDeDupeByKey = (t, e) => t === "link" ? e : deDupeKeyMap[t].length > 0, toArray = (t) => Array.isArray(t) ? t : [t], metaTagMap = /* @__PURE__ */ new WeakMap(), insertIntoHead = (t, e, r, n) => ({ buffer: a, context: i }) => {
  if (!a)
    return;
  const s = metaTagMap.get(i) || {};
  metaTagMap.set(i, s);
  const l = s[t] ||= [];
  let c = !1;
  const d = deDupeKeyMap[t], u = shouldDeDupeByKey(t, n !== void 0);
  if (u) {
    e: for (const [, m] of l)
      if (!(t === "link" && !(m.rel === "stylesheet" && m[dataPrecedenceAttr] !== void 0))) {
        for (const h of d)
          if ((m?.[h] ?? null) === r?.[h]) {
            c = !0;
            break e;
          }
      }
  }
  if (c ? a[0] = a[0].replaceAll(e, "") : u || t === "link" ? l.push([e, r, n]) : l.unshift([e, r, n]), a[0].indexOf("</head>") !== -1) {
    let m;
    if (t === "link" || n !== void 0) {
      const h = [];
      m = l.map(([y, , v], T) => {
        if (v === void 0)
          return [y, Number.MAX_SAFE_INTEGER, T];
        let I = h.indexOf(v);
        return I === -1 && (h.push(v), I = h.length - 1), [y, I, T];
      }).sort((y, v) => y[1] - v[1] || y[2] - v[2]).map(([y]) => y);
    } else
      m = l.map(([h]) => h);
    m.forEach((h) => {
      a[0] = a[0].replaceAll(h, "");
    }), a[0] = a[0].replace(/(?=<\/head>)/, m.join(""));
  }
}, returnWithoutSpecialBehavior = (t, e, r) => raw(new JSXNode(t, r, toArray(e ?? [])).toString()), documentMetadataTag = (t, e, r, n) => {
  if ("itemProp" in r)
    return returnWithoutSpecialBehavior(t, e, r);
  let { precedence: a, blocking: i, ...s } = r;
  a = n ? a ?? "" : void 0, n && (s[dataPrecedenceAttr] = a);
  const l = new JSXNode(t, s, toArray(e || [])).toString();
  return l instanceof Promise ? l.then(
    (c) => raw(c, [
      ...c.callbacks || [],
      insertIntoHead(t, c, s, a)
    ])
  ) : raw(l, [insertIntoHead(t, l, s, a)]);
}, title = ({ children: t, ...e }) => {
  const r = getNameSpaceContext();
  if (r) {
    const n = useContext(r);
    if (n === "svg" || n === "head")
      return new JSXNode(
        "title",
        e,
        toArray(t ?? [])
      );
  }
  return documentMetadataTag("title", t, e, !1);
}, script$1 = ({
  children: t,
  ...e
}) => {
  const r = getNameSpaceContext();
  return ["src", "async"].some((n) => !e[n]) || r && useContext(r) === "head" ? returnWithoutSpecialBehavior("script", t, e) : documentMetadataTag("script", t, e, !1);
}, style = ({
  children: t,
  ...e
}) => ["href", "precedence"].every((r) => r in e) ? (e["data-href"] = e.href, delete e.href, documentMetadataTag("style", t, e, !0)) : returnWithoutSpecialBehavior("style", t, e), link$1 = ({ children: t, ...e }) => ["onLoad", "onError"].some((r) => r in e) || e.rel === "stylesheet" && (!("precedence" in e) || "disabled" in e) ? returnWithoutSpecialBehavior("link", t, e) : documentMetadataTag("link", t, e, isStylesheetLinkWithPrecedence(e)), meta = ({ children: t, ...e }) => {
  const r = getNameSpaceContext();
  return r && useContext(r) === "head" ? returnWithoutSpecialBehavior("meta", t, e) : documentMetadataTag("meta", t, e, !1);
}, newJSXNode = (t, { children: e, ...r }) => (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new JSXNode(t, r, toArray(e ?? []))
), form = (t) => (typeof t.action == "function" && (t.action = PERMALINK in t.action ? t.action[PERMALINK] : void 0), newJSXNode("form", t)), formActionableElement = (t, e) => (typeof e.formAction == "function" && (e.formAction = PERMALINK in e.formAction ? e.formAction[PERMALINK] : void 0), newJSXNode(t, e)), input = (t) => formActionableElement("input", t), button = (t) => formActionableElement("button", t);
const intrinsicElementTags = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  button,
  form,
  input,
  link: link$1,
  meta,
  script: script$1,
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
]), normalizeIntrinsicElementKey = (t) => normalizeElementKeyMap.get(t) || t, invalidAttributeNameCharRe = /[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validAttributeNameCache = /* @__PURE__ */ new Set(), validAttributeNameCacheMax = 1024, invalidTagNameCharRe = /^[!?]|[\s"'<>/=`\\\x00-\x1f\x7f-\x9f]/, validTagNameCache = /* @__PURE__ */ new Set(), validTagNameCacheMax = 256, cacheValidName = (t, e, r) => {
  t.size >= e && t.clear(), t.add(r);
}, isValidTagName = (t) => validTagNameCache.has(t) ? !0 : typeof t != "string" ? !1 : t.length === 0 ? !0 : invalidTagNameCharRe.test(t) ? !1 : (cacheValidName(validTagNameCache, validTagNameCacheMax, t), !0), isValidAttributeName = (t) => {
  if (validAttributeNameCache.has(t))
    return !0;
  const e = t.length;
  if (e === 0)
    return !1;
  for (let r = 0; r < e; r++) {
    const n = t.charCodeAt(r);
    if (!(n >= 97 && n <= 122 || // a-z
    n >= 65 && n <= 90 || // A-Z
    n >= 48 && n <= 57 || // 0-9
    n === 45 || // -
    n === 95 || // _
    n === 46 || // .
    n === 58))
      return invalidAttributeNameCharRe.test(t) ? !1 : (cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, t), !0);
  }
  return cacheValidName(validAttributeNameCache, validAttributeNameCacheMax, t), !0;
}, invalidStylePropertyNameCharRe = /[\s"'():;\\/\[\]{}\x00-\x1f\x7f-\x9f]/, validStylePropertyNameCache = /* @__PURE__ */ new Set(), validStylePropertyNameCacheMax = 1024, isValidStylePropertyName = (t) => {
  if (validStylePropertyNameCache.has(t))
    return !0;
  const e = t.length;
  if (e === 0)
    return !1;
  for (let r = 0; r < e; r++) {
    const n = t.charCodeAt(r);
    if (!(n >= 97 && n <= 122 || // a-z
    n >= 65 && n <= 90 || // A-Z
    n >= 48 && n <= 57 || // 0-9
    n === 45 || // -
    n === 95))
      return invalidStylePropertyNameCharRe.test(t) ? !1 : (cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, t), !0);
  }
  return cacheValidName(validStylePropertyNameCache, validStylePropertyNameCacheMax, t), !0;
}, unsafeStyleValueCharRe = /[;"'\\/\[\](){}]/, hasUnsafeStyleValue = (t) => {
  if (!unsafeStyleValueCharRe.test(t))
    return !1;
  let e = 0;
  const r = [];
  for (let n = 0, a = t.length; n < a; n++) {
    const i = t.charCodeAt(n);
    if (i === 92) {
      if (n === a - 1)
        return !0;
      n++;
    } else if (e !== 0) {
      if (i === 10 || i === 12 || i === 13)
        return !0;
      i === e && (e = 0);
    } else if (i === 47 && t.charCodeAt(n + 1) === 42) {
      const s = t.indexOf("*/", n + 2);
      if (s === -1)
        return !0;
      n = s + 1;
    } else if (i === 34 || i === 39)
      e = i;
    else if (i === 40)
      r.push(41);
    else if (i === 91)
      r.push(93);
    else {
      if (i === 123 || i === 125)
        return !0;
      if (i === 41 || i === 93) {
        if (r[r.length - 1] !== i)
          return !0;
        r.pop();
      } else if (i === 59 && r.length === 0)
        return !0;
    }
  }
  return e !== 0 || r.length !== 0;
}, styleObjectForEach = (t, e) => {
  for (const [r, n] of Object.entries(t)) {
    const a = r[0] === "-" || !/[A-Z]/.test(r) ? r : r.replace(/[A-Z]/g, (s) => `-${s.toLowerCase()}`);
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
}, nameSpaceContext = void 0, getNameSpaceContext = () => nameSpaceContext, toSVGAttributeName = (t) => /[A-Z]/.test(t) && // Presentation attributes are findable in style object. "clip-path", "font-size", "stroke-width", etc.
// Or other un-deprecated kebab-case attributes. "overline-position", "paint-order", "strikethrough-position", etc.
t.match(
  /^(?:al|basel|clip(?:Path|Rule)$|co|do|fill|fl|fo|gl|let|lig|i|marker[EMS]|o|pai|pointe|sh|st[or]|text[^L]|tr|u|ve|w)/
) ? t.replace(/([A-Z])/g, "-$1").toLowerCase() : t, emptyTags = [
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
], resolveFunctionComponentResult = (t, e) => t.then((r) => {
  if (!Array.isArray(r) && !(r instanceof JSXNode))
    return r;
  const n = Array.isArray(r) ? r : [r], a = () => {
    const i = [""];
    return childrenToStringToBuffer(n, i), i.length === 1 ? raw(i[0], i.callbacks) : stringBufferToString(i, i.callbacks);
  };
  return e ? e(a) : runWithRenderContext(a);
}), childrenToStringToBuffer = (t, e) => {
  for (let r = 0, n = t.length; r < n; r++) {
    const a = t[r];
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
  constructor(t, e, r) {
    if (typeof t != "function" && !isValidTagName(t))
      throw new Error(`Invalid JSX tag name: ${t}`);
    this.tag = t, this.props = e, this.children = r;
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
  toStringToBuffer(t) {
    const e = this.tag, r = this.props;
    let { children: n } = this;
    t[0] += `<${e}`;
    const a = e === "svg" || nameSpaceContext && useContext(nameSpaceContext) === "svg" ? (i) => toSVGAttributeName(normalizeIntrinsicElementKey(i)) : (i) => normalizeIntrinsicElementKey(i);
    for (let [i, s] of Object.entries(r))
      if (i = a(i), !!isValidAttributeName(i) && i !== "children") {
        if (i === "style" && typeof s == "object") {
          let l = "";
          styleObjectForEach(s, (c, d) => {
            d != null && (l += `${l ? ";" : ""}${c}:${d}`);
          }), t[0] += ' style="', escapeToBuffer(l, t), t[0] += '"';
        } else if (typeof s == "string")
          t[0] += ` ${i}="`, escapeToBuffer(s, t), t[0] += '"';
        else if (s != null) if (typeof s == "number" || s.isEscaped)
          t[0] += ` ${i}="${s}"`;
        else if (typeof s == "boolean" && booleanAttributes.includes(i))
          s && (t[0] += ` ${i}=""`);
        else if (i === "dangerouslySetInnerHTML") {
          if (n.length > 0)
            throw new Error("Can only set one of `children` or `props.dangerouslySetInnerHTML`.");
          n = [raw(s.__html)];
        } else if (s instanceof Promise)
          t[0] += ` ${i}="`, t.unshift('"', s);
        else if (typeof s == "function") {
          if (!i.startsWith("on") && i !== "ref")
            throw new Error(`Invalid prop '${i}' of type 'function' supplied to '${e}'.`);
        } else
          t[0] += ` ${i}="`, escapeToBuffer(s.toString(), t), t[0] += '"';
      }
    if (emptyTags.includes(e) && n.length === 0) {
      t[0] += "/>";
      return;
    }
    t[0] += ">", childrenToStringToBuffer(n, t), t[0] += `</${e}>`;
  }
}, JSXFunctionNode = class extends JSXNode {
  toStringToBuffer(t) {
    const { children: e } = this, r = { ...this.props };
    e.length && (r.children = e.length === 1 ? e[0] : e);
    const n = this.tag.call(null, r);
    typeof n == "boolean" || n == null || (n instanceof Promise ? globalContexts.length === 0 ? t.unshift("", resolveFunctionComponentResult(n)) : t.unshift("", resolveFunctionComponentResult(n, captureRenderContext())) : n instanceof JSXNode ? n.toStringToBuffer(t) : Array.isArray(n) ? childrenToStringToBuffer(n, t) : typeof n == "number" || n.isEscaped ? (t[0] += n, n.callbacks && (t.callbacks ||= [], t.callbacks.push(...n.callbacks))) : escapeToBuffer(n, t));
  }
}, JSXFragmentNode = class extends JSXNode {
  toStringToBuffer(t) {
    childrenToStringToBuffer(this.children, t);
  }
}, initDomRenderer = !1, jsxFn = (t, e, r) => {
  if (!initDomRenderer) {
    for (const n in domRenderers)
      intrinsicElementTags[n][DOM_RENDERER] = domRenderers[n];
    initDomRenderer = !0;
  }
  return typeof t == "function" ? new JSXFunctionNode(t, e, r) : intrinsicElementTags[t] ? new JSXFunctionNode(
    intrinsicElementTags[t],
    e,
    r
  ) : t === "svg" || t === "head" ? (nameSpaceContext ||= createContext(""), new JSXNode(t, e, [
    new JSXFunctionNode(
      nameSpaceContext,
      {
        value: t
      },
      r
    )
  ])) : new JSXNode(t, e, r);
};
function jsxDEV(t, e, r) {
  let n;
  if (!e || !("children" in e))
    n = jsxFn(t, e, []);
  else {
    const a = e.children;
    n = Array.isArray(a) ? jsxFn(t, e, a) : jsxFn(t, e, [a]);
  }
  return n.key = r, n;
}
function __rest(t, e) {
  var r = {};
  for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e.indexOf(n) < 0 && (r[n] = t[n]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, n = Object.getOwnPropertySymbols(t); a < n.length; a++)
      e.indexOf(n[a]) < 0 && Object.prototype.propertyIsEnumerable.call(t, n[a]) && (r[n[a]] = t[n[a]]);
  return r;
}
typeof SuppressedError == "function" && SuppressedError;
function isZodType(t, e) {
  var r;
  return ((r = t?._def) === null || r === void 0 ? void 0 : r.typeName) === e;
}
function isAnyZodType(t) {
  return "_def" in t;
}
function preserveMetadataFromModifier(t, e) {
  const r = t.ZodType.prototype[e];
  t.ZodType.prototype[e] = function(...n) {
    const a = r.apply(this, n);
    return a._def.openapi = this._def.openapi, a;
  };
}
function extendZodWithOpenApi(t) {
  if (typeof t.ZodType.prototype.openapi < "u")
    return;
  t.ZodType.prototype.openapi = function(a, i) {
    var s, l, c, d, u, m;
    const h = typeof a == "string" ? i : a, y = h ?? {}, { param: v } = y, T = __rest(y, ["param"]), I = Object.assign(Object.assign({}, (s = this._def.openapi) === null || s === void 0 ? void 0 : s._internal), typeof a == "string" ? { refId: a } : void 0), N = Object.assign(Object.assign(Object.assign({}, (l = this._def.openapi) === null || l === void 0 ? void 0 : l.metadata), T), !((d = (c = this._def.openapi) === null || c === void 0 ? void 0 : c.metadata) === null || d === void 0) && d.param || v ? {
      param: Object.assign(Object.assign({}, (m = (u = this._def.openapi) === null || u === void 0 ? void 0 : u.metadata) === null || m === void 0 ? void 0 : m.param), v)
    } : void 0), b = new this.constructor(Object.assign(Object.assign({}, this._def), { openapi: Object.assign(Object.assign({}, Object.keys(I).length > 0 ? { _internal: I } : void 0), Object.keys(N).length > 0 ? { metadata: N } : void 0) }));
    if (isZodType(this, "ZodObject")) {
      const g = this.extend;
      b.extend = function(...C) {
        var _, D, L, M, F, U, W;
        const Y = g.apply(this, C);
        return Y._def.openapi = {
          _internal: {
            extendedFrom: !((D = (_ = this._def.openapi) === null || _ === void 0 ? void 0 : _._internal) === null || D === void 0) && D.refId ? { refId: (M = (L = this._def.openapi) === null || L === void 0 ? void 0 : L._internal) === null || M === void 0 ? void 0 : M.refId, schema: this } : (U = (F = this._def.openapi) === null || F === void 0 ? void 0 : F._internal) === null || U === void 0 ? void 0 : U.extendedFrom
          },
          metadata: (W = Y._def.openapi) === null || W === void 0 ? void 0 : W.metadata
        }, Y;
      };
    }
    return b;
  }, preserveMetadataFromModifier(t, "optional"), preserveMetadataFromModifier(t, "nullable"), preserveMetadataFromModifier(t, "default"), preserveMetadataFromModifier(t, "transform"), preserveMetadataFromModifier(t, "refine");
  const e = t.ZodObject.prototype.deepPartial;
  t.ZodObject.prototype.deepPartial = function() {
    const a = this._def.shape(), i = e.apply(this), s = i._def.shape();
    return Object.entries(s).forEach(([l, c]) => {
      var d, u;
      c._def.openapi = (u = (d = a[l]) === null || d === void 0 ? void 0 : d._def) === null || u === void 0 ? void 0 : u.openapi;
    }), i._def.openapi = void 0, i;
  };
  const r = t.ZodObject.prototype.pick;
  t.ZodObject.prototype.pick = function(...a) {
    const i = r.apply(this, a);
    return i._def.openapi = void 0, i;
  };
  const n = t.ZodObject.prototype.omit;
  t.ZodObject.prototype.omit = function(...a) {
    const i = n.apply(this, a);
    return i._def.openapi = void 0, i;
  };
}
function isEqual(t, e) {
  if (t == null || e === null || e === void 0)
    return t === e;
  if (t === e || t.valueOf() === e.valueOf())
    return !0;
  if (Array.isArray(t) && (!Array.isArray(e) || t.length !== e.length) || !(t instanceof Object) || !(e instanceof Object))
    return !1;
  const r = Object.keys(t);
  return Object.keys(e).every((n) => r.indexOf(n) !== -1) && r.every((n) => isEqual(t[n], e[n]));
}
class ObjectSet {
  constructor() {
    this.buckets = /* @__PURE__ */ new Map();
  }
  put(e) {
    const r = this.hashCodeOf(e), n = this.buckets.get(r);
    if (!n) {
      this.buckets.set(r, [e]);
      return;
    }
    n.some((i) => isEqual(i, e)) || n.push(e);
  }
  contains(e) {
    const r = this.hashCodeOf(e), n = this.buckets.get(r);
    return n ? n.some((a) => isEqual(a, e)) : !1;
  }
  values() {
    return [...this.buckets.values()].flat();
  }
  stats() {
    let e = 0, r = 0, n = 0;
    for (const i of this.buckets.values())
      e += 1, r += i.length, i.length > 1 && (n += 1);
    const a = e / r;
    return { totalBuckets: e, collisions: n, totalValues: r, hashEffectiveness: a };
  }
  hashCodeOf(e) {
    let r = 0;
    if (Array.isArray(e)) {
      for (let n = 0; n < e.length; n++)
        r ^= this.hashCodeOf(e[n]) * n;
      return r;
    }
    if (typeof e == "string") {
      for (let n = 0; n < e.length; n++)
        r ^= e.charCodeAt(n) * n;
      return r;
    }
    if (typeof e == "number")
      return e;
    if (typeof e == "object")
      for (const [n, a] of Object.entries(e))
        r ^= this.hashCodeOf(n) + this.hashCodeOf(a ?? "");
    return r;
  }
}
function isUndefined(t) {
  return t === void 0;
}
function mapValues(t, e) {
  const r = {};
  return Object.entries(t).forEach(([n, a]) => {
    r[n] = e(a);
  }), r;
}
function omit(t, e) {
  const r = {};
  return Object.entries(t).forEach(([n, a]) => {
    e.some((i) => i === n) || (r[n] = a);
  }), r;
}
function omitBy(t, e) {
  const r = {};
  return Object.entries(t).forEach(([n, a]) => {
    e(a, n) || (r[n] = a);
  }), r;
}
function compact(t) {
  return t.filter((e) => !isUndefined(e));
}
const objectEquals = isEqual;
function uniq(t) {
  const e = new ObjectSet();
  return t.forEach((r) => e.put(r)), [...e.values()];
}
function isString(t) {
  return typeof t == "string";
}
class OpenAPIRegistry {
  constructor(e) {
    this.parents = e, this._definitions = [];
  }
  get definitions() {
    var e, r;
    return [...(r = (e = this.parents) === null || e === void 0 ? void 0 : e.flatMap((a) => a.definitions)) !== null && r !== void 0 ? r : [], ...this._definitions];
  }
  /**
   * Registers a new component schema under /components/schemas/${name}
   */
  register(e, r) {
    const n = this.schemaWithRefId(e, r);
    return this._definitions.push({ type: "schema", schema: n }), n;
  }
  /**
   * Registers a new parameter schema under /components/parameters/${name}
   */
  registerParameter(e, r) {
    var n, a, i;
    const s = this.schemaWithRefId(e, r), l = (n = s._def.openapi) === null || n === void 0 ? void 0 : n.metadata, c = s.openapi(Object.assign(Object.assign({}, l), { param: Object.assign(Object.assign({}, l?.param), { name: (i = (a = l?.param) === null || a === void 0 ? void 0 : a.name) !== null && i !== void 0 ? i : e }) }));
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
  registerComponent(e, r, n) {
    return this._definitions.push({
      type: "component",
      componentType: e,
      name: r,
      component: n
    }), {
      name: r,
      ref: { $ref: `#/components/${e}/${r}` }
    };
  }
  schemaWithRefId(e, r) {
    return r.openapi(e);
  }
}
class ZodToOpenAPIError {
  constructor(e) {
    this.message = e;
  }
}
class ConflictError extends ZodToOpenAPIError {
  constructor(e, r) {
    super(e), this.data = r;
  }
}
class MissingParameterDataError extends ZodToOpenAPIError {
  constructor(e) {
    super(`Missing parameter data, please specify \`${e.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`ZodSchema.openapi\``), this.data = e;
  }
}
function enhanceMissingParametersError(t, e) {
  try {
    return t();
  } catch (r) {
    throw r instanceof MissingParameterDataError ? new MissingParameterDataError(Object.assign(Object.assign({}, r.data), e)) : r;
  }
}
class UnknownZodTypeError extends ZodToOpenAPIError {
  constructor(e) {
    super("Unknown zod object type, please specify `type` and other OpenAPI props using `ZodSchema.openapi`."), this.data = e;
  }
}
class Metadata {
  static getMetadata(e) {
    var r;
    const n = this.unwrapChained(e), a = e._def.openapi ? e._def.openapi : n._def.openapi, i = (r = e.description) !== null && r !== void 0 ? r : n.description;
    return {
      _internal: a?._internal,
      metadata: Object.assign({ description: i }, a?.metadata)
    };
  }
  static getInternalMetadata(e) {
    const r = this.unwrapChained(e), n = e._def.openapi ? e._def.openapi : r._def.openapi;
    return n?._internal;
  }
  static getParamMetadata(e) {
    var r, n;
    const a = this.unwrapChained(e), i = e._def.openapi ? e._def.openapi : a._def.openapi, s = (r = e.description) !== null && r !== void 0 ? r : a.description;
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
  static applySchemaMetadata(e, r) {
    return omitBy(Object.assign(Object.assign({}, e), this.buildSchemaMetadata(r)), isUndefined);
  }
  static getRefId(e) {
    var r;
    return (r = this.getInternalMetadata(e)) === null || r === void 0 ? void 0 : r.refId;
  }
  static unwrapChained(e) {
    return this.unwrapUntil(e);
  }
  static getDefaultValue(e) {
    const r = this.unwrapUntil(e, "ZodDefault");
    return r?._def.defaultValue();
  }
  static unwrapUntil(e, r) {
    return r && isZodType(e, r) ? e : isZodType(e, "ZodOptional") || isZodType(e, "ZodNullable") || isZodType(e, "ZodBranded") ? this.unwrapUntil(e.unwrap(), r) : isZodType(e, "ZodDefault") || isZodType(e, "ZodReadonly") ? this.unwrapUntil(e._def.innerType, r) : isZodType(e, "ZodEffects") ? this.unwrapUntil(e._def.schema, r) : isZodType(e, "ZodPipeline") ? this.unwrapUntil(e._def.in, r) : r ? void 0 : e;
  }
  static isOptionalSchema(e) {
    return e.isOptional();
  }
}
class ArrayTransformer {
  transform(e, r, n) {
    var a, i;
    const s = e._def.type;
    return Object.assign(Object.assign({}, r("array")), { items: n(s), minItems: (a = e._def.minLength) === null || a === void 0 ? void 0 : a.value, maxItems: (i = e._def.maxLength) === null || i === void 0 ? void 0 : i.value });
  }
}
class BigIntTransformer {
  transform(e) {
    return Object.assign(Object.assign({}, e("string")), { pattern: "^d+$" });
  }
}
class DiscriminatedUnionTransformer {
  transform(e, r, n, a, i) {
    const s = [...e.options.values()], l = s.map(a);
    return r ? {
      oneOf: n(l, r)
    } : {
      oneOf: l,
      discriminator: this.mapDiscriminator(s, e.discriminator, i)
    };
  }
  mapDiscriminator(e, r, n) {
    if (e.some((i) => Metadata.getRefId(i) === void 0))
      return;
    const a = {};
    return e.forEach((i) => {
      var s;
      const l = Metadata.getRefId(i), c = (s = i.shape) === null || s === void 0 ? void 0 : s[r];
      if (isZodType(c, "ZodEnum") || isZodType(c, "ZodNativeEnum")) {
        Object.values(c.enum).filter(isString).forEach((m) => {
          a[m] = n(l);
        });
        return;
      }
      const d = c?._def.value;
      if (typeof d != "string")
        throw new Error(`Discriminator ${r} could not be found in one of the values of a discriminated union`);
      a[d] = n(l);
    }), {
      propertyName: r,
      mapping: a
    };
  }
}
class EnumTransformer {
  transform(e, r) {
    return Object.assign(Object.assign({}, r("string")), { enum: e._def.values });
  }
}
class IntersectionTransformer {
  transform(e, r, n, a) {
    const s = {
      allOf: this.flattenIntersectionTypes(e).map(a)
    };
    return r ? {
      anyOf: n([s], r)
    } : s;
  }
  flattenIntersectionTypes(e) {
    if (!isZodType(e, "ZodIntersection"))
      return [e];
    const r = this.flattenIntersectionTypes(e._def.left), n = this.flattenIntersectionTypes(e._def.right);
    return [...r, ...n];
  }
}
class LiteralTransformer {
  transform(e, r) {
    return Object.assign(Object.assign({}, r(typeof e._def.value)), { enum: [e._def.value] });
  }
}
function enumInfo(t) {
  const r = Object.keys(t).filter((i) => typeof t[t[i]] != "number").map((i) => t[i]), n = r.filter((i) => typeof i == "number").length, a = n === 0 ? "string" : n === r.length ? "numeric" : "mixed";
  return { values: r, type: a };
}
class NativeEnumTransformer {
  transform(e, r) {
    const { type: n, values: a } = enumInfo(e._def.values);
    if (n === "mixed")
      throw new ZodToOpenAPIError("Enum has mixed string and number values, please specify the OpenAPI type manually");
    return Object.assign(Object.assign({}, r(n === "numeric" ? "integer" : "string")), { enum: a });
  }
}
class NumberTransformer {
  transform(e, r, n) {
    return Object.assign(Object.assign({}, r(e.isInt ? "integer" : "number")), n(e._def.checks));
  }
}
class ObjectTransformer {
  transform(e, r, n, a) {
    var i;
    const s = (i = Metadata.getInternalMetadata(e)) === null || i === void 0 ? void 0 : i.extendedFrom, l = this.requiredKeysOf(e), c = mapValues(e._def.shape(), a);
    if (!s)
      return Object.assign(Object.assign(Object.assign(Object.assign({}, n("object")), { properties: c, default: r }), l.length > 0 ? { required: l } : {}), this.generateAdditionalProperties(e, a));
    const d = s.schema;
    a(d);
    const u = this.requiredKeysOf(d), m = mapValues(d?._def.shape(), a), h = Object.fromEntries(Object.entries(c).filter(([T, I]) => !objectEquals(m[T], I))), y = l.filter((T) => !u.includes(T)), v = Object.assign(Object.assign(Object.assign(Object.assign({}, n("object")), { default: r, properties: h }), y.length > 0 ? { required: y } : {}), this.generateAdditionalProperties(e, a));
    return {
      allOf: [
        { $ref: `#/components/schemas/${s.refId}` },
        v
      ]
    };
  }
  generateAdditionalProperties(e, r) {
    const n = e._def.unknownKeys, a = e._def.catchall;
    return isZodType(a, "ZodNever") ? n === "strict" ? { additionalProperties: !1 } : {} : { additionalProperties: r(a) };
  }
  requiredKeysOf(e) {
    return Object.entries(e._def.shape()).filter(([r, n]) => !Metadata.isOptionalSchema(n)).map(([r, n]) => r);
  }
}
class RecordTransformer {
  transform(e, r, n) {
    const a = e._def.valueType, i = e._def.keyType, s = n(a);
    if (isZodType(i, "ZodEnum") || isZodType(i, "ZodNativeEnum")) {
      const c = Object.values(i.enum).filter(isString).reduce((d, u) => Object.assign(Object.assign({}, d), { [u]: s }), {});
      return Object.assign(Object.assign({}, r("object")), { properties: c });
    }
    return Object.assign(Object.assign({}, r("object")), { additionalProperties: s });
  }
}
class StringTransformer {
  transform(e, r) {
    var n, a, i;
    const s = this.getZodStringCheck(e, "regex"), l = (n = this.getZodStringCheck(e, "length")) === null || n === void 0 ? void 0 : n.value, c = Number.isFinite(e.minLength) && (a = e.minLength) !== null && a !== void 0 ? a : void 0, d = Number.isFinite(e.maxLength) && (i = e.maxLength) !== null && i !== void 0 ? i : void 0;
    return Object.assign(Object.assign({}, r("string")), {
      // FIXME: https://github.com/colinhacks/zod/commit/d78047e9f44596a96d637abb0ce209cd2732d88c
      minLength: l ?? c,
      maxLength: l ?? d,
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
  getZodStringCheck(e, r) {
    return e._def.checks.find((n) => n.kind === r);
  }
}
class TupleTransformer {
  constructor(e) {
    this.versionSpecifics = e;
  }
  transform(e, r, n) {
    const { items: a } = e._def, i = a.map(n);
    return Object.assign(Object.assign({}, r("array")), this.versionSpecifics.mapTupleItems(i));
  }
}
class UnionTransformer {
  transform(e, r, n) {
    const i = this.flattenUnionTypes(e).map((s) => {
      const l = this.unwrapNullable(s);
      return n(l);
    });
    return {
      anyOf: r(i)
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
  transform(e, r, n, a, i) {
    if (isZodType(e, "ZodNull"))
      return this.versionSpecifics.nullType;
    if (isZodType(e, "ZodUnknown") || isZodType(e, "ZodAny"))
      return this.versionSpecifics.mapNullableType(void 0, r);
    if (isZodType(e, "ZodObject"))
      return this.objectTransformer.transform(
        e,
        i,
        // verified on TS level from input
        // verified on TS level from input
        (l) => this.versionSpecifics.mapNullableType(l, r),
        n
      );
    const s = this.transformSchemaWithoutDefault(e, r, n, a);
    return Object.assign(Object.assign({}, s), { default: i });
  }
  transformSchemaWithoutDefault(e, r, n, a) {
    if (isZodType(e, "ZodUnknown") || isZodType(e, "ZodAny"))
      return this.versionSpecifics.mapNullableType(void 0, r);
    if (isZodType(e, "ZodString"))
      return this.stringTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r));
    if (isZodType(e, "ZodNumber"))
      return this.numberTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r), (s) => this.versionSpecifics.getNumberChecks(s));
    if (isZodType(e, "ZodBigInt"))
      return this.bigIntTransformer.transform((s) => this.versionSpecifics.mapNullableType(s, r));
    if (isZodType(e, "ZodBoolean"))
      return this.versionSpecifics.mapNullableType("boolean", r);
    if (isZodType(e, "ZodLiteral"))
      return this.literalTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r));
    if (isZodType(e, "ZodEnum"))
      return this.enumTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r));
    if (isZodType(e, "ZodNativeEnum"))
      return this.nativeEnumTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r));
    if (isZodType(e, "ZodArray"))
      return this.arrayTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r), n);
    if (isZodType(e, "ZodTuple"))
      return this.tupleTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r), n);
    if (isZodType(e, "ZodUnion"))
      return this.unionTransformer.transform(e, (s) => this.versionSpecifics.mapNullableOfArray(s, r), n);
    if (isZodType(e, "ZodDiscriminatedUnion"))
      return this.discriminatedUnionTransformer.transform(e, r, (s) => this.versionSpecifics.mapNullableOfArray(s, r), n, a);
    if (isZodType(e, "ZodIntersection"))
      return this.intersectionTransformer.transform(e, r, (s) => this.versionSpecifics.mapNullableOfArray(s, r), n);
    if (isZodType(e, "ZodRecord"))
      return this.recordTransformer.transform(e, (s) => this.versionSpecifics.mapNullableType(s, r), n);
    if (isZodType(e, "ZodDate"))
      return this.versionSpecifics.mapNullableType("string", r);
    const i = Metadata.getRefId(e);
    throw new UnknownZodTypeError({
      currentSchema: e._def,
      schemaName: i
    });
  }
}
class OpenAPIGenerator {
  constructor(e, r) {
    this.definitions = e, this.versionSpecifics = r, this.schemaRefs = {}, this.paramRefs = {}, this.pathRefs = {}, this.rawComponents = [], this.openApiTransformer = new OpenApiTransformer(r), this.sortDefinitions();
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
    var e, r;
    const n = {};
    return this.rawComponents.forEach(({ componentType: a, name: i, component: s }) => {
      var l;
      (l = n[a]) !== null && l !== void 0 || (n[a] = {}), n[a][i] = s;
    }), Object.assign(Object.assign({}, n), { schemas: Object.assign(Object.assign({}, (e = n.schemas) !== null && e !== void 0 ? e : {}), this.schemaRefs), parameters: Object.assign(Object.assign({}, (r = n.parameters) !== null && r !== void 0 ? r : {}), this.paramRefs) });
  }
  sortDefinitions() {
    const e = [
      "schema",
      "parameter",
      "component",
      "route"
    ];
    this.definitions.sort((r, n) => {
      if (!("type" in r))
        return "type" in n ? -1 : 0;
      if (!("type" in n))
        return 1;
      const a = e.findIndex((s) => s === r.type), i = e.findIndex((s) => s === n.type);
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
    const r = Metadata.getRefId(e), n = this.generateParameter(e);
    return r && (this.paramRefs[r] = n), n;
  }
  getParameterRef(e, r) {
    var n, a, i, s, l;
    const c = (n = e?.metadata) === null || n === void 0 ? void 0 : n.param, d = !((a = e?._internal) === null || a === void 0) && a.refId ? this.paramRefs[(i = e._internal) === null || i === void 0 ? void 0 : i.refId] : void 0;
    if (!(!(!((s = e?._internal) === null || s === void 0) && s.refId) || !d)) {
      if (c && d.in !== c.in || r?.in && d.in !== r.in)
        throw new ConflictError(`Conflicting location for parameter ${d.name}`, {
          key: "in",
          values: compact([
            d.in,
            r?.in,
            c?.in
          ])
        });
      if (c && d.name !== c.name || r?.name && d.name !== r?.name)
        throw new ConflictError("Conflicting names for parameter", {
          key: "name",
          values: compact([
            d.name,
            r?.name,
            c?.name
          ])
        });
      return {
        $ref: `#/components/parameters/${(l = e._internal) === null || l === void 0 ? void 0 : l.refId}`
      };
    }
  }
  generateInlineParameters(e, r) {
    var n;
    const a = Metadata.getMetadata(e), i = (n = a?.metadata) === null || n === void 0 ? void 0 : n.param, s = this.getParameterRef(a, { in: r });
    if (s)
      return [s];
    if (isZodType(e, "ZodObject")) {
      const l = e._def.shape();
      return Object.entries(l).map(([d, u]) => {
        var m, h;
        const y = Metadata.getMetadata(u), v = this.getParameterRef(y, {
          in: r,
          name: d
        });
        if (v)
          return v;
        const T = (m = y?.metadata) === null || m === void 0 ? void 0 : m.param;
        if (T?.name && T.name !== d)
          throw new ConflictError("Conflicting names for parameter", {
            key: "name",
            values: [d, T.name]
          });
        if (T?.in && T.in !== r)
          throw new ConflictError(`Conflicting location for parameter ${(h = T.name) !== null && h !== void 0 ? h : d}`, {
            key: "in",
            values: [r, T.in]
          });
        return this.generateParameter(u.openapi({ param: { name: d, in: r } }));
      });
    }
    if (i?.in && i.in !== r)
      throw new ConflictError(`Conflicting location for parameter ${i.name}`, {
        key: "in",
        values: [r, i.in]
      });
    return [
      this.generateParameter(e.openapi({ param: { in: r } }))
    ];
  }
  generateSimpleParameter(e) {
    var r;
    const n = Metadata.getParamMetadata(e), a = (r = n?.metadata) === null || r === void 0 ? void 0 : r.param, i = !Metadata.isOptionalSchema(e) && !e.isNullable(), s = this.generateSchemaWithRef(e);
    return Object.assign({
      schema: s,
      required: i
    }, a ? Metadata.buildParameterMetadata(a) : {});
  }
  generateParameter(e) {
    var r;
    const n = Metadata.getMetadata(e), a = (r = n?.metadata) === null || r === void 0 ? void 0 : r.param, i = a?.name, s = a?.in;
    if (!i)
      throw new MissingParameterDataError({ missingField: "name" });
    if (!s)
      throw new MissingParameterDataError({
        missingField: "in",
        paramName: i
      });
    const l = this.generateSimpleParameter(e);
    return Object.assign(Object.assign({}, l), { in: s, name: i });
  }
  generateSchemaWithMetadata(e) {
    var r;
    const n = Metadata.unwrapChained(e), a = Metadata.getMetadata(e), i = Metadata.getDefaultValue(e), s = !((r = a?.metadata) === null || r === void 0) && r.type ? { type: a?.metadata.type } : this.toOpenAPISchema(n, e.isNullable(), i);
    return a?.metadata ? Metadata.applySchemaMetadata(s, a.metadata) : omitBy(s, isUndefined);
  }
  /**
   * Same as above but applies nullable
   */
  constructReferencedOpenAPISchema(e) {
    var r;
    const n = Metadata.getMetadata(e), a = Metadata.unwrapChained(e), i = Metadata.getDefaultValue(e), s = e.isNullable();
    return !((r = n?.metadata) === null || r === void 0) && r.type ? this.versionSpecifics.mapNullableType(n.metadata.type, s) : this.toOpenAPISchema(a, s, i);
  }
  /**
   * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
   */
  generateSimpleSchema(e) {
    var r;
    const n = Metadata.getMetadata(e), a = Metadata.getRefId(e);
    if (!a || !this.schemaRefs[a])
      return this.generateSchemaWithMetadata(e);
    const i = this.schemaRefs[a], s = {
      $ref: this.generateSchemaRef(a)
    }, l = omitBy(Metadata.buildSchemaMetadata((r = n?.metadata) !== null && r !== void 0 ? r : {}), (u, m) => u === void 0 || objectEquals(u, i[m]));
    if (l.type)
      return {
        allOf: [s, l]
      };
    const c = omitBy(this.constructReferencedOpenAPISchema(e), (u, m) => u === void 0 || objectEquals(u, i[m])), d = Metadata.applySchemaMetadata(c, l);
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
    const r = Metadata.getRefId(e), n = this.generateSimpleSchema(e);
    return r && this.schemaRefs[r] === void 0 ? (this.schemaRefs[r] = n, { $ref: this.generateSchemaRef(r) }) : n;
  }
  generateSchemaRef(e) {
    return `#/components/schemas/${e}`;
  }
  getRequestBody(e) {
    if (!e)
      return;
    const { content: r } = e, n = __rest(e, ["content"]), a = this.getBodyContent(r);
    return Object.assign(Object.assign({}, n), { content: a });
  }
  getParameters(e) {
    if (!e)
      return [];
    const { headers: r } = e, n = this.cleanParameter(e.query), a = this.cleanParameter(e.params), i = this.cleanParameter(e.cookies), s = enhanceMissingParametersError(() => n ? this.generateInlineParameters(n, "query") : [], { location: "query" }), l = enhanceMissingParametersError(() => a ? this.generateInlineParameters(a, "path") : [], { location: "path" }), c = enhanceMissingParametersError(() => i ? this.generateInlineParameters(i, "cookie") : [], { location: "cookie" }), d = enhanceMissingParametersError(() => {
      if (Array.isArray(r))
        return r.flatMap((m) => this.generateInlineParameters(m, "header"));
      const u = this.cleanParameter(r);
      return u ? this.generateInlineParameters(u, "header") : [];
    }, { location: "header" });
    return [
      ...l,
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
    const { method: r, path: n, request: a, responses: i } = e, s = __rest(e, ["method", "path", "request", "responses"]), l = mapValues(i, (m) => this.getResponse(m)), c = enhanceMissingParametersError(() => this.getParameters(a), { route: `${r} ${n}` }), d = this.getRequestBody(a?.body);
    return {
      [r]: Object.assign(Object.assign(Object.assign(Object.assign({}, s), c.length > 0 ? {
        parameters: [...s.parameters || [], ...c]
      } : {}), d ? { requestBody: d } : {}), { responses: l })
    };
  }
  generateSingleRoute(e) {
    const r = this.generatePath(e);
    return this.pathRefs[e.path] = Object.assign(Object.assign({}, this.pathRefs[e.path]), r), r;
  }
  getResponse(e) {
    if (this.isReferenceObject(e))
      return e;
    const { content: r, headers: n } = e, a = __rest(e, ["content", "headers"]), i = r ? { content: this.getBodyContent(r) } : {};
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
    const r = e._def.shape();
    return mapValues(r, (a) => this.generateSimpleParameter(a));
  }
  getBodyContent(e) {
    return mapValues(e, (r) => {
      if (!r || !isAnyZodType(r.schema))
        return r;
      const { schema: n } = r, a = __rest(r, ["schema"]), i = this.generateSchemaWithRef(n);
      return Object.assign({ schema: i }, a);
    });
  }
  toOpenAPISchema(e, r, n) {
    return this.openApiTransformer.transform(e, r, (a) => this.generateSchemaWithRef(a), (a) => this.generateSchemaRef(a), n);
  }
}
class OpenApiGeneratorV30Specifics {
  get nullType() {
    return { nullable: !0 };
  }
  mapNullableOfArray(e, r) {
    return r ? [...e, this.nullType] : e;
  }
  mapNullableType(e, r) {
    return Object.assign(Object.assign({}, e ? { type: e } : void 0), r ? this.nullType : void 0);
  }
  mapTupleItems(e) {
    const r = uniq(e);
    return {
      items: r.length === 1 ? r[0] : { anyOf: r },
      minItems: e.length,
      maxItems: e.length
    };
  }
  getNumberChecks(e) {
    return Object.assign({}, ...e.map((r) => {
      switch (r.kind) {
        case "min":
          return r.inclusive ? { minimum: Number(r.value) } : { minimum: Number(r.value), exclusiveMinimum: !0 };
        case "max":
          return r.inclusive ? { maximum: Number(r.value) } : { maximum: Number(r.value), exclusiveMaximum: !0 };
        default:
          return {};
      }
    }));
  }
}
class OpenApiGeneratorV3 {
  constructor(e) {
    const r = new OpenApiGeneratorV30Specifics();
    this.generator = new OpenAPIGenerator(e, r);
  }
  generateDocument(e) {
    const r = this.generator.generateDocumentData();
    return Object.assign(Object.assign({}, e), r);
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
}
class OpenApiGeneratorV31Specifics {
  get nullType() {
    return { type: "null" };
  }
  mapNullableOfArray(e, r) {
    return r ? [...e, this.nullType] : e;
  }
  mapNullableType(e, r) {
    return e ? r ? {
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
    return Object.assign({}, ...e.map((r) => {
      switch (r.kind) {
        case "min":
          return r.inclusive ? { minimum: Number(r.value) } : { exclusiveMinimum: Number(r.value) };
        case "max":
          return r.inclusive ? { maximum: Number(r.value) } : { exclusiveMaximum: Number(r.value) };
        default:
          return {};
      }
    }));
  }
}
function isWebhookDefinition(t) {
  return "type" in t && t.type === "webhook";
}
class OpenApiGeneratorV31 {
  constructor(e) {
    this.definitions = e, this.webhookRefs = {};
    const r = new OpenApiGeneratorV31Specifics();
    this.generator = new OpenAPIGenerator(this.definitions, r);
  }
  generateDocument(e) {
    const r = this.generator.generateDocumentData();
    return this.definitions.filter(isWebhookDefinition).forEach((n) => this.generateSingleWebhook(n.webhook)), Object.assign(Object.assign(Object.assign({}, e), r), { webhooks: this.webhookRefs });
  }
  generateComponents() {
    return this.generator.generateComponents();
  }
  generateSingleWebhook(e) {
    const r = this.generator.generatePath(e);
    return this.webhookRefs[e.path] = Object.assign(Object.assign({}, this.webhookRefs[e.path]), r), r;
  }
}
var splitPath = (t) => {
  const e = t.split("/");
  return e[0] === "" && e.shift(), e;
}, splitRoutingPath = (t) => {
  const { groups: e, path: r } = extractGroupsFromPath(t), n = splitPath(r);
  return replaceGroupMarks(n, e);
}, extractGroupsFromPath = (t) => {
  const e = [];
  return t = t.replace(/\{[^}]+\}/g, (r, n) => {
    const a = `@${n}`;
    return e.push([a, r]), a;
  }), { groups: e, path: t };
}, replaceGroupMarks = (t, e) => {
  for (let r = e.length - 1; r >= 0; r--) {
    const [n] = e[r];
    for (let a = t.length - 1; a >= 0; a--)
      if (t[a].includes(n)) {
        t[a] = t[a].replace(n, e[r][1]);
        break;
      }
  }
  return t;
}, patternCache = {}, getPattern = (t, e) => {
  if (t === "*")
    return "*";
  const r = t.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (r) {
    const n = `${t}#${e}`;
    return patternCache[n] || (r[2] ? patternCache[n] = e && e[0] !== ":" && e[0] !== "*" ? [n, r[1], new RegExp(`^${r[2]}(?=/${e})`)] : [t, r[1], new RegExp(`^${r[2]}$`)] : patternCache[n] = [t, r[1], !0]), patternCache[n];
  }
  return null;
}, tryDecode = (t, e) => {
  try {
    return e(t);
  } catch {
    return t.replace(/(?:%[0-9A-Fa-f]{2})+/g, (r) => {
      try {
        return e(r);
      } catch {
        return r;
      }
    });
  }
}, tryDecodeURI = (t) => tryDecode(t, decodeURI), getPath = (t) => {
  const e = t.url, r = e.indexOf("/", e.indexOf(":") + 4);
  let n = r;
  for (; n < e.length; n++) {
    const a = e.charCodeAt(n);
    if (a === 37) {
      const i = e.indexOf("?", n), s = e.indexOf("#", n), l = i === -1 ? s === -1 ? void 0 : s : s === -1 ? i : Math.min(i, s), c = e.slice(r, l);
      return tryDecodeURI(c.includes("%25") ? c.replace(/%25/g, "%2525") : c);
    } else if (a === 63 || a === 35)
      break;
  }
  return e.slice(r, n);
}, getPathNoStrict = (t) => {
  const e = getPath(t);
  return e.length > 1 && e.at(-1) === "/" ? e.slice(0, -1) : e;
}, mergePath = (t, e, ...r) => (r.length && (e = mergePath(e, ...r)), `${t?.[0] === "/" ? "" : "/"}${t}${e === "/" ? "" : `${t?.at(-1) === "/" ? "" : "/"}${e?.[0] === "/" ? e.slice(1) : e}`}`), checkOptionalParameter = (t) => {
  if (t.charCodeAt(t.length - 1) !== 63 || !t.includes(":"))
    return null;
  const e = t.split("/"), r = [];
  let n = "";
  return e.forEach((a) => {
    if (a !== "" && !/\:/.test(a))
      n += "/" + a;
    else if (/\:/.test(a))
      if (a.charCodeAt(a.length - 1) === 63) {
        r.length === 0 && n === "" ? r.push("/") : r.push(n);
        const i = a.slice(0, -1);
        n += "/" + i, r.push(n);
      } else
        n += "/" + a;
  }), r.filter((a, i, s) => s.indexOf(a) === i);
}, tryDecodeURIComponent = (t) => t.indexOf("%") !== -1 ? tryDecode(t, decodeURIComponent_) : t, _decodeURI = (t) => (t.indexOf("+") !== -1 && (t = t.replace(/\+/g, " ")), tryDecodeURIComponent(t)), _getQueryParam = (t, e, r) => {
  let n;
  if (!r && e && e.indexOf("%") === -1 && e.indexOf("+") === -1) {
    let s = t.indexOf("?", 8);
    if (s === -1)
      return;
    for (t.startsWith(e, s + 1) || (s = t.indexOf(`&${e}`, s + 1)); s !== -1; ) {
      const l = t.charCodeAt(s + e.length + 1);
      if (l === 61) {
        const c = s + e.length + 2, d = t.indexOf("&", c);
        return _decodeURI(t.slice(c, d === -1 ? void 0 : d));
      } else if (l == 38 || isNaN(l))
        return "";
      s = t.indexOf(`&${e}`, s + 1);
    }
    if (n = /[%+]/.test(t), !n)
      return;
  }
  const a = /* @__PURE__ */ Object.create(null);
  n ??= /[%+]/.test(t);
  let i = t.indexOf("?", 8);
  for (; i !== -1; ) {
    const s = t.indexOf("&", i + 1);
    let l = t.indexOf("=", i);
    l > s && s !== -1 && (l = -1);
    let c = t.slice(
      i + 1,
      l === -1 ? s === -1 ? void 0 : s : l
    );
    if (n && (c = _decodeURI(c)), i = s, c === "")
      continue;
    let d;
    l === -1 ? d = "" : (d = t.slice(l + 1, s === -1 ? void 0 : s), n && (d = _decodeURI(d))), r ? (a[c] && Array.isArray(a[c]) || (a[c] = []), a[c].push(d)) : a[c] ??= d;
  }
  return e ? a[e] : a;
}, getQueryParam = _getQueryParam, getQueryParams = (t, e) => _getQueryParam(t, e, !0), decodeURIComponent_ = decodeURIComponent, validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/, relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/, validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/, trimCookieWhitespace = (t) => {
  let e = 0, r = t.length;
  for (; e < r; ) {
    const n = t.charCodeAt(e);
    if (n !== 32 && n !== 9)
      break;
    e++;
  }
  for (; r > e; ) {
    const n = t.charCodeAt(r - 1);
    if (n !== 32 && n !== 9)
      break;
    r--;
  }
  return e === 0 && r === t.length ? t : t.slice(e, r);
}, parse$1 = (t, e) => {
  if (e && t.indexOf(e) === -1)
    return {};
  const r = t.split(";"), n = /* @__PURE__ */ Object.create(null);
  for (const a of r) {
    const i = a.indexOf("=");
    if (i === -1)
      continue;
    const s = trimCookieWhitespace(a.substring(0, i));
    if (e && e !== s || !relaxedCookieNameRegEx.test(s) || s in n)
      continue;
    let l = trimCookieWhitespace(a.substring(i + 1));
    if (l.startsWith('"') && l.endsWith('"') && (l = l.slice(1, -1)), validCookieValueRegEx.test(l) && (n[s] = tryDecodeURIComponent(l), e))
      break;
  }
  return n;
}, _serialize = (t, e, r = {}) => {
  if (!validCookieNameRegEx.test(t))
    throw new Error("Invalid cookie name");
  let n = `${t}=${e}`;
  if (t.startsWith("__Secure-") && !r.secure)
    throw new Error("__Secure- Cookie must have Secure attributes");
  if (t.startsWith("__Host-")) {
    if (!r.secure)
      throw new Error("__Host- Cookie must have Secure attributes");
    if (r.path !== "/")
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    if (r.domain)
      throw new Error("__Host- Cookie must not have Domain attributes");
  }
  for (const a of ["domain", "path", "sameSite", "priority"])
    if (r[a] && /[;\r\n]/.test(r[a]))
      throw new Error(`${a} must not contain ";", "\\r", or "\\n"`);
  if (r && typeof r.maxAge == "number" && r.maxAge >= 0) {
    if (r.maxAge > 3456e4)
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    n += `; Max-Age=${r.maxAge | 0}`;
  }
  if (r.domain && r.prefix !== "host" && (n += `; Domain=${r.domain}`), r.path && (n += `; Path=${r.path}`), r.expires) {
    if (r.expires.getTime() - Date.now() > 3456e7)
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    n += `; Expires=${r.expires.toUTCString()}`;
  }
  if (r.httpOnly && (n += "; HttpOnly"), r.secure && (n += "; Secure"), r.sameSite && (n += `; SameSite=${r.sameSite.charAt(0).toUpperCase() + r.sameSite.slice(1)}`), r.priority && (n += `; Priority=${r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}`), r.partitioned) {
    if (!r.secure)
      throw new Error("Partitioned Cookie must have Secure attributes");
    n += "; Partitioned";
  }
  return n;
}, serialize = (t, e, r) => (e = encodeURIComponent(e), _serialize(t, e, r)), getCookie = (t, e, r) => {
  const n = t.req.raw.headers.get("Cookie");
  if (typeof e == "string") {
    if (!n)
      return;
    let i = e;
    return r === "secure" ? i = "__Secure-" + e : r === "host" && (i = "__Host-" + e), parse$1(n, i)[i];
  }
  return n ? parse$1(n) : {};
}, generateCookie = (t, e, r) => {
  let n;
  return r?.prefix === "secure" ? n = serialize("__Secure-" + t, e, { path: "/", ...r, secure: !0 }) : r?.prefix === "host" ? n = serialize("__Host-" + t, e, {
    ...r,
    path: "/",
    secure: !0,
    domain: void 0
  }) : n = serialize(t, e, { path: "/", ...r }), n;
}, setCookie = (t, e, r, n) => {
  const a = generateCookie(e, r, n);
  t.header("Set-Cookie", a, { append: !0 });
}, deleteCookie = (t, e, r) => {
  const n = getCookie(t, e, r?.prefix);
  return setCookie(t, e, "", { ...r, maxAge: 0 }), n;
}, HTTPException = class extends Error {
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(t = 500, e) {
    super(e?.message, { cause: e?.cause }), this.res = e?.res, this.status = t;
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
}, bufferToFormData = (t, e) => new Response(t, {
  headers: {
    // Normalize the media type (case-insensitive) while keeping parameters like the boundary
    "Content-Type": e.replace(/^[^;]+/, (n) => n.toLowerCase())
  }
}).formData(), jsonRegex = /^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, multipartRegex = /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/i, urlencodedRegex = /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/i, validator = (t, e) => async (r, n) => {
  let a = {};
  const i = r.req.header("Content-Type");
  switch (t) {
    case "json":
      if (!i || !jsonRegex.test(i))
        break;
      try {
        a = await r.req.json();
      } catch {
        const l = "Malformed JSON in request body";
        throw new HTTPException(400, { message: l });
      }
      break;
    case "form": {
      if (!i || !(multipartRegex.test(i) || urlencodedRegex.test(i)))
        break;
      let l;
      if (r.req.bodyCache.formData)
        l = await r.req.bodyCache.formData;
      else
        try {
          const d = await r.req.arrayBuffer();
          l = await bufferToFormData(d, i), r.req.bodyCache.formData = l;
        } catch (d) {
          let u = "Malformed FormData request.";
          throw u += d instanceof Error ? ` ${d.message}` : ` ${String(d)}`, new HTTPException(400, { message: u });
        }
      const c = /* @__PURE__ */ Object.create(null);
      l.forEach((d, u) => {
        u.endsWith("[]") ? (c[u] ??= []).push(d) : Array.isArray(c[u]) ? c[u].push(d) : Object.hasOwn(c, u) ? c[u] = [c[u], d] : c[u] = d;
      }), a = c;
      break;
    }
    case "query":
      a = Object.fromEntries(
        Object.entries(r.req.queries()).map(([l, c]) => c.length === 1 ? [l, c[0]] : [l, c])
      );
      break;
    case "param":
      a = r.req.param();
      break;
    case "header":
      a = r.req.header();
      break;
    case "cookie":
      a = getCookie(r);
      break;
  }
  const s = await e(a, r);
  return s instanceof Response ? s : (r.req.addValidatedData(t, s), await n());
}, util;
(function(t) {
  t.assertEqual = (a) => {
  };
  function e(a) {
  }
  t.assertIs = e;
  function r(a) {
    throw new Error();
  }
  t.assertNever = r, t.arrayToEnum = (a) => {
    const i = {};
    for (const s of a)
      i[s] = s;
    return i;
  }, t.getValidEnumValues = (a) => {
    const i = t.objectKeys(a).filter((l) => typeof a[a[l]] != "number"), s = {};
    for (const l of i)
      s[l] = a[l];
    return t.objectValues(s);
  }, t.objectValues = (a) => t.objectKeys(a).map(function(i) {
    return a[i];
  }), t.objectKeys = typeof Object.keys == "function" ? (a) => Object.keys(a) : (a) => {
    const i = [];
    for (const s in a)
      Object.prototype.hasOwnProperty.call(a, s) && i.push(s);
    return i;
  }, t.find = (a, i) => {
    for (const s of a)
      if (i(s))
        return s;
  }, t.isInteger = typeof Number.isInteger == "function" ? (a) => Number.isInteger(a) : (a) => typeof a == "number" && Number.isFinite(a) && Math.floor(a) === a;
  function n(a, i = " | ") {
    return a.map((s) => typeof s == "string" ? `'${s}'` : s).join(i);
  }
  t.joinValues = n, t.jsonStringifyReplacer = (a, i) => typeof i == "bigint" ? i.toString() : i;
})(util || (util = {}));
var objectUtil;
(function(t) {
  t.mergeShapes = (e, r) => ({
    ...e,
    ...r
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
]), getParsedType = (t) => {
  switch (typeof t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(t) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      return Array.isArray(t) ? ZodParsedType.array : t === null ? ZodParsedType.null : t.then && typeof t.then == "function" && t.catch && typeof t.catch == "function" ? ZodParsedType.promise : typeof Map < "u" && t instanceof Map ? ZodParsedType.map : typeof Set < "u" && t instanceof Set ? ZodParsedType.set : typeof Date < "u" && t instanceof Date ? ZodParsedType.date : ZodParsedType.object;
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
    const r = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, r) : this.__proto__ = r, this.name = "ZodError", this.issues = e;
  }
  format(e) {
    const r = e || function(i) {
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
          n._errors.push(r(s));
        else {
          let l = n, c = 0;
          for (; c < s.path.length; ) {
            const d = s.path[c];
            c === s.path.length - 1 ? (l[d] = l[d] || { _errors: [] }, l[d]._errors.push(r(s))) : l[d] = l[d] || { _errors: [] }, l = l[d], c++;
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
  flatten(e = (r) => r.message) {
    const r = {}, n = [];
    for (const a of this.issues)
      if (a.path.length > 0) {
        const i = a.path[0];
        r[i] = r[i] || [], r[i].push(e(a));
      } else
        n.push(e(a));
    return { formErrors: n, fieldErrors: r };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (t) => new ZodError(t);
const errorMap = (t, e) => {
  let r;
  switch (t.code) {
    case ZodIssueCode.invalid_type:
      t.received === ZodParsedType.undefined ? r = "Required" : r = `Expected ${t.expected}, received ${t.received}`;
      break;
    case ZodIssueCode.invalid_literal:
      r = `Invalid literal value, expected ${JSON.stringify(t.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      r = `Unrecognized key(s) in object: ${util.joinValues(t.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      r = "Invalid input";
      break;
    case ZodIssueCode.invalid_union_discriminator:
      r = `Invalid discriminator value. Expected ${util.joinValues(t.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      r = `Invalid enum value. Expected ${util.joinValues(t.options)}, received '${t.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      r = "Invalid function arguments";
      break;
    case ZodIssueCode.invalid_return_type:
      r = "Invalid function return type";
      break;
    case ZodIssueCode.invalid_date:
      r = "Invalid date";
      break;
    case ZodIssueCode.invalid_string:
      typeof t.validation == "object" ? "includes" in t.validation ? (r = `Invalid input: must include "${t.validation.includes}"`, typeof t.validation.position == "number" && (r = `${r} at one or more positions greater than or equal to ${t.validation.position}`)) : "startsWith" in t.validation ? r = `Invalid input: must start with "${t.validation.startsWith}"` : "endsWith" in t.validation ? r = `Invalid input: must end with "${t.validation.endsWith}"` : util.assertNever(t.validation) : t.validation !== "regex" ? r = `Invalid ${t.validation}` : r = "Invalid";
      break;
    case ZodIssueCode.too_small:
      t.type === "array" ? r = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "more than"} ${t.minimum} element(s)` : t.type === "string" ? r = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "over"} ${t.minimum} character(s)` : t.type === "number" ? r = `Number must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${t.minimum}` : t.type === "bigint" ? r = `Number must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${t.minimum}` : t.type === "date" ? r = `Date must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(t.minimum))}` : r = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      t.type === "array" ? r = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "less than"} ${t.maximum} element(s)` : t.type === "string" ? r = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "under"} ${t.maximum} character(s)` : t.type === "number" ? r = `Number must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` : t.type === "bigint" ? r = `BigInt must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` : t.type === "date" ? r = `Date must be ${t.exact ? "exactly" : t.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(t.maximum))}` : r = "Invalid input";
      break;
    case ZodIssueCode.custom:
      r = "Invalid input";
      break;
    case ZodIssueCode.invalid_intersection_types:
      r = "Intersection results could not be merged";
      break;
    case ZodIssueCode.not_multiple_of:
      r = `Number must be a multiple of ${t.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      r = "Number must be finite";
      break;
    default:
      r = e.defaultError, util.assertNever(t);
  }
  return { message: r };
};
let overrideErrorMap = errorMap;
function getErrorMap() {
  return overrideErrorMap;
}
const makeIssue = (t) => {
  const { data: e, path: r, errorMaps: n, issueData: a } = t, i = [...r, ...a.path || []], s = {
    ...a,
    path: i
  };
  if (a.message !== void 0)
    return {
      ...a,
      path: i,
      message: a.message
    };
  let l = "";
  const c = n.filter((d) => !!d).slice().reverse();
  for (const d of c)
    l = d(s, { data: e, defaultError: l }).message;
  return {
    ...a,
    path: i,
    message: l
  };
};
function addIssueToContext(t, e) {
  const r = getErrorMap(), n = makeIssue({
    issueData: e,
    data: t.data,
    path: t.path,
    errorMaps: [
      t.common.contextualErrorMap,
      // contextual error map is first priority
      t.schemaErrorMap,
      // then schema-bound map if available
      r,
      // then global override map
      r === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((a) => !!a)
  });
  t.common.issues.push(n);
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
  static mergeArray(e, r) {
    const n = [];
    for (const a of r) {
      if (a.status === "aborted")
        return INVALID;
      a.status === "dirty" && e.dirty(), n.push(a.value);
    }
    return { status: e.value, value: n };
  }
  static async mergeObjectAsync(e, r) {
    const n = [];
    for (const a of r) {
      const i = await a.key, s = await a.value;
      n.push({
        key: i,
        value: s
      });
    }
    return ParseStatus.mergeObjectSync(e, n);
  }
  static mergeObjectSync(e, r) {
    const n = {};
    for (const a of r) {
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
}), DIRTY = (t) => ({ status: "dirty", value: t }), OK = (t) => ({ status: "valid", value: t }), isAborted = (t) => t.status === "aborted", isDirty = (t) => t.status === "dirty", isValid = (t) => t.status === "valid", isAsync = (t) => typeof Promise < "u" && t instanceof Promise;
var errorUtil;
(function(t) {
  t.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, t.toString = (e) => typeof e == "string" ? e : e?.message;
})(errorUtil || (errorUtil = {}));
class ParseInputLazyPath {
  constructor(e, r, n, a) {
    this._cachedPath = [], this.parent = e, this.data = r, this._path = n, this._key = a;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const handleResult = (t, e) => {
  if (isValid(e))
    return { success: !0, data: e.value };
  if (!t.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const r = new ZodError(t.common.issues);
      return this._error = r, this._error;
    }
  };
};
function processCreateParams(t) {
  if (!t)
    return {};
  const { errorMap: e, invalid_type_error: r, required_error: n, description: a } = t;
  if (e && (r || n))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return e ? { errorMap: e, description: a } : { errorMap: (s, l) => {
    const { message: c } = t;
    return s.code === "invalid_enum_value" ? { message: c ?? l.defaultError } : typeof l.data > "u" ? { message: c ?? n ?? l.defaultError } : s.code !== "invalid_type" ? { message: l.defaultError } : { message: c ?? r ?? l.defaultError };
  }, description: a };
}
class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(e) {
    return getParsedType(e.data);
  }
  _getOrReturnCtx(e, r) {
    return r || {
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
    const r = this._parse(e);
    if (isAsync(r))
      throw new Error("Synchronous parse encountered promise.");
    return r;
  }
  _parseAsync(e) {
    const r = this._parse(e);
    return Promise.resolve(r);
  }
  parse(e, r) {
    const n = this.safeParse(e, r);
    if (n.success)
      return n.data;
    throw n.error;
  }
  safeParse(e, r) {
    const n = {
      common: {
        issues: [],
        async: r?.async ?? !1,
        contextualErrorMap: r?.errorMap
      },
      path: r?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: getParsedType(e)
    }, a = this._parseSync({ data: e, path: n.path, parent: n });
    return handleResult(n, a);
  }
  "~validate"(e) {
    const r = {
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
        const n = this._parseSync({ data: e, path: [], parent: r });
        return isValid(n) ? {
          value: n.value
        } : {
          issues: r.common.issues
        };
      } catch (n) {
        n?.message?.toLowerCase()?.includes("encountered") && (this["~standard"].async = !0), r.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: e, path: [], parent: r }).then((n) => isValid(n) ? {
      value: n.value
    } : {
      issues: r.common.issues
    });
  }
  async parseAsync(e, r) {
    const n = await this.safeParseAsync(e, r);
    if (n.success)
      return n.data;
    throw n.error;
  }
  async safeParseAsync(e, r) {
    const n = {
      common: {
        issues: [],
        contextualErrorMap: r?.errorMap,
        async: !0
      },
      path: r?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: getParsedType(e)
    }, a = this._parse({ data: e, path: n.path, parent: n }), i = await (isAsync(a) ? a : Promise.resolve(a));
    return handleResult(n, i);
  }
  refine(e, r) {
    const n = (a) => typeof r == "string" || typeof r > "u" ? { message: r } : typeof r == "function" ? r(a) : r;
    return this._refinement((a, i) => {
      const s = e(a), l = () => i.addIssue({
        code: ZodIssueCode.custom,
        ...n(a)
      });
      return typeof Promise < "u" && s instanceof Promise ? s.then((c) => c ? !0 : (l(), !1)) : s ? !0 : (l(), !1);
    });
  }
  refinement(e, r) {
    return this._refinement((n, a) => e(n) ? !0 : (a.addIssue(typeof r == "function" ? r(n, a) : r), !1));
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
      validate: (r) => this["~validate"](r)
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
    const r = typeof e == "function" ? e : () => e;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: r,
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
    const r = typeof e == "function" ? e : () => e;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: r,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(e) {
    const r = this.constructor;
    return new r({
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
function timeRegexSource(t) {
  let e = "[0-5]\\d";
  t.precision ? e = `${e}\\.\\d{${t.precision}}` : t.precision == null && (e = `${e}(\\.\\d+)?`);
  const r = t.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${e})${r}`;
}
function timeRegex(t) {
  return new RegExp(`^${timeRegexSource(t)}$`);
}
function datetimeRegex(t) {
  let e = `${dateRegexSource}T${timeRegexSource(t)}`;
  const r = [];
  return r.push(t.local ? "Z?" : "Z"), t.offset && r.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${r.join("|")})`, new RegExp(`^${e}$`);
}
function isValidIP(t, e) {
  return !!((e === "v4" || !e) && ipv4Regex.test(t) || (e === "v6" || !e) && ipv6Regex.test(t));
}
function isValidJWT(t, e) {
  if (!jwtRegex.test(t))
    return !1;
  try {
    const [r] = t.split(".");
    if (!r)
      return !1;
    const n = r.replace(/-/g, "+").replace(/_/g, "/").padEnd(r.length + (4 - r.length % 4) % 4, "="), a = JSON.parse(atob(n));
    return !(typeof a != "object" || a === null || "typ" in a && a?.typ !== "JWT" || !a.alg || e && a.alg !== e);
  } catch {
    return !1;
  }
}
function isValidCidr(t, e) {
  return !!((e === "v4" || !e) && ipv4CidrRegex.test(t) || (e === "v6" || !e) && ipv6CidrRegex.test(t));
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
        const s = e.data.length > i.value, l = e.data.length < i.value;
        (s || l) && (a = this._getOrReturnCtx(e, a), s ? addIssueToContext(a, {
          code: ZodIssueCode.too_big,
          maximum: i.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: i.message
        }) : l && addIssueToContext(a, {
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
  _regex(e, r, n) {
    return this.refinement((a) => e.test(a), {
      validation: r,
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
  regex(e, r) {
    return this._addCheck({
      kind: "regex",
      regex: e,
      ...errorUtil.errToObj(r)
    });
  }
  includes(e, r) {
    return this._addCheck({
      kind: "includes",
      value: e,
      position: r?.position,
      ...errorUtil.errToObj(r?.message)
    });
  }
  startsWith(e, r) {
    return this._addCheck({
      kind: "startsWith",
      value: e,
      ...errorUtil.errToObj(r)
    });
  }
  endsWith(e, r) {
    return this._addCheck({
      kind: "endsWith",
      value: e,
      ...errorUtil.errToObj(r)
    });
  }
  min(e, r) {
    return this._addCheck({
      kind: "min",
      value: e,
      ...errorUtil.errToObj(r)
    });
  }
  max(e, r) {
    return this._addCheck({
      kind: "max",
      value: e,
      ...errorUtil.errToObj(r)
    });
  }
  length(e, r) {
    return this._addCheck({
      kind: "length",
      value: e,
      ...errorUtil.errToObj(r)
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
    for (const r of this._def.checks)
      r.kind === "min" && (e === null || r.value > e) && (e = r.value);
    return e;
  }
  get maxLength() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    return e;
  }
}
ZodString.create = (t) => new ZodString({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodString,
  coerce: t?.coerce ?? !1,
  ...processCreateParams(t)
});
function floatSafeRemainder(t, e) {
  const r = (t.toString().split(".")[1] || "").length, n = (e.toString().split(".")[1] || "").length, a = r > n ? r : n, i = Number.parseInt(t.toFixed(a).replace(".", "")), s = Number.parseInt(e.toFixed(a).replace(".", ""));
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
  gte(e, r) {
    return this.setLimit("min", e, !0, errorUtil.toString(r));
  }
  gt(e, r) {
    return this.setLimit("min", e, !1, errorUtil.toString(r));
  }
  lte(e, r) {
    return this.setLimit("max", e, !0, errorUtil.toString(r));
  }
  lt(e, r) {
    return this.setLimit("max", e, !1, errorUtil.toString(r));
  }
  setLimit(e, r, n, a) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: r,
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
  multipleOf(e, r) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: errorUtil.toString(r)
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
    for (const r of this._def.checks)
      r.kind === "min" && (e === null || r.value > e) && (e = r.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    return e;
  }
  get isInt() {
    return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && util.isInteger(e.value));
  }
  get isFinite() {
    let e = null, r = null;
    for (const n of this._def.checks) {
      if (n.kind === "finite" || n.kind === "int" || n.kind === "multipleOf")
        return !0;
      n.kind === "min" ? (r === null || n.value > r) && (r = n.value) : n.kind === "max" && (e === null || n.value < e) && (e = n.value);
    }
    return Number.isFinite(r) && Number.isFinite(e);
  }
}
ZodNumber.create = (t) => new ZodNumber({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodNumber,
  coerce: t?.coerce || !1,
  ...processCreateParams(t)
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
    const r = this._getOrReturnCtx(e);
    return addIssueToContext(r, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: r.parsedType
    }), INVALID;
  }
  gte(e, r) {
    return this.setLimit("min", e, !0, errorUtil.toString(r));
  }
  gt(e, r) {
    return this.setLimit("min", e, !1, errorUtil.toString(r));
  }
  lte(e, r) {
    return this.setLimit("max", e, !0, errorUtil.toString(r));
  }
  lt(e, r) {
    return this.setLimit("max", e, !1, errorUtil.toString(r));
  }
  setLimit(e, r, n, a) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: r,
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
  multipleOf(e, r) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: errorUtil.toString(r)
    });
  }
  get minValue() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "min" && (e === null || r.value > e) && (e = r.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    return e;
  }
}
ZodBigInt.create = (t) => new ZodBigInt({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodBigInt,
  coerce: t?.coerce ?? !1,
  ...processCreateParams(t)
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
ZodBoolean.create = (t) => new ZodBoolean({
  typeName: ZodFirstPartyTypeKind.ZodBoolean,
  coerce: t?.coerce || !1,
  ...processCreateParams(t)
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
  min(e, r) {
    return this._addCheck({
      kind: "min",
      value: e.getTime(),
      message: errorUtil.toString(r)
    });
  }
  max(e, r) {
    return this._addCheck({
      kind: "max",
      value: e.getTime(),
      message: errorUtil.toString(r)
    });
  }
  get minDate() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "min" && (e === null || r.value > e) && (e = r.value);
    return e != null ? new Date(e) : null;
  }
  get maxDate() {
    let e = null;
    for (const r of this._def.checks)
      r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    return e != null ? new Date(e) : null;
  }
}
ZodDate.create = (t) => new ZodDate({
  checks: [],
  coerce: t?.coerce || !1,
  typeName: ZodFirstPartyTypeKind.ZodDate,
  ...processCreateParams(t)
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
ZodSymbol.create = (t) => new ZodSymbol({
  typeName: ZodFirstPartyTypeKind.ZodSymbol,
  ...processCreateParams(t)
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
ZodUndefined.create = (t) => new ZodUndefined({
  typeName: ZodFirstPartyTypeKind.ZodUndefined,
  ...processCreateParams(t)
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
ZodNull.create = (t) => new ZodNull({
  typeName: ZodFirstPartyTypeKind.ZodNull,
  ...processCreateParams(t)
});
class ZodAny extends ZodType {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodAny.create = (t) => new ZodAny({
  typeName: ZodFirstPartyTypeKind.ZodAny,
  ...processCreateParams(t)
});
class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(e) {
    return OK(e.data);
  }
}
ZodUnknown.create = (t) => new ZodUnknown({
  typeName: ZodFirstPartyTypeKind.ZodUnknown,
  ...processCreateParams(t)
});
class ZodNever extends ZodType {
  _parse(e) {
    const r = this._getOrReturnCtx(e);
    return addIssueToContext(r, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: r.parsedType
    }), INVALID;
  }
}
ZodNever.create = (t) => new ZodNever({
  typeName: ZodFirstPartyTypeKind.ZodNever,
  ...processCreateParams(t)
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
ZodVoid.create = (t) => new ZodVoid({
  typeName: ZodFirstPartyTypeKind.ZodVoid,
  ...processCreateParams(t)
});
class ZodArray extends ZodType {
  _parse(e) {
    const { ctx: r, status: n } = this._processInputParams(e), a = this._def;
    if (r.parsedType !== ZodParsedType.array)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: r.parsedType
      }), INVALID;
    if (a.exactLength !== null) {
      const s = r.data.length > a.exactLength.value, l = r.data.length < a.exactLength.value;
      (s || l) && (addIssueToContext(r, {
        code: s ? ZodIssueCode.too_big : ZodIssueCode.too_small,
        minimum: l ? a.exactLength.value : void 0,
        maximum: s ? a.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: a.exactLength.message
      }), n.dirty());
    }
    if (a.minLength !== null && r.data.length < a.minLength.value && (addIssueToContext(r, {
      code: ZodIssueCode.too_small,
      minimum: a.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.minLength.message
    }), n.dirty()), a.maxLength !== null && r.data.length > a.maxLength.value && (addIssueToContext(r, {
      code: ZodIssueCode.too_big,
      maximum: a.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: a.maxLength.message
    }), n.dirty()), r.common.async)
      return Promise.all([...r.data].map((s, l) => a.type._parseAsync(new ParseInputLazyPath(r, s, r.path, l)))).then((s) => ParseStatus.mergeArray(n, s));
    const i = [...r.data].map((s, l) => a.type._parseSync(new ParseInputLazyPath(r, s, r.path, l)));
    return ParseStatus.mergeArray(n, i);
  }
  get element() {
    return this._def.type;
  }
  min(e, r) {
    return new ZodArray({
      ...this._def,
      minLength: { value: e, message: errorUtil.toString(r) }
    });
  }
  max(e, r) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: e, message: errorUtil.toString(r) }
    });
  }
  length(e, r) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: e, message: errorUtil.toString(r) }
    });
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
ZodArray.create = (t, e) => new ZodArray({
  type: t,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: ZodFirstPartyTypeKind.ZodArray,
  ...processCreateParams(e)
});
function deepPartialify(t) {
  if (t instanceof ZodObject) {
    const e = {};
    for (const r in t.shape) {
      const n = t.shape[r];
      e[r] = ZodOptional.create(deepPartialify(n));
    }
    return new ZodObject({
      ...t._def,
      shape: () => e
    });
  } else return t instanceof ZodArray ? new ZodArray({
    ...t._def,
    type: deepPartialify(t.element)
  }) : t instanceof ZodOptional ? ZodOptional.create(deepPartialify(t.unwrap())) : t instanceof ZodNullable ? ZodNullable.create(deepPartialify(t.unwrap())) : t instanceof ZodTuple ? ZodTuple.create(t.items.map((e) => deepPartialify(e))) : t;
}
class ZodObject extends ZodType {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const e = this._def.shape(), r = util.objectKeys(e);
    return this._cached = { shape: e, keys: r }, this._cached;
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
    const { status: n, ctx: a } = this._processInputParams(e), { shape: i, keys: s } = this._getCached(), l = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip"))
      for (const d in a.data)
        s.includes(d) || l.push(d);
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
        for (const u of l)
          c.push({
            key: { status: "valid", value: u },
            value: { status: "valid", value: a.data[u] }
          });
      else if (d === "strict")
        l.length > 0 && (addIssueToContext(a, {
          code: ZodIssueCode.unrecognized_keys,
          keys: l
        }), n.dirty());
      else if (d !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const d = this._def.catchall;
      for (const u of l) {
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
        errorMap: (r, n) => {
          const a = this._def.errorMap?.(r, n).message ?? n.defaultError;
          return r.code === "unrecognized_keys" ? {
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
  setKey(e, r) {
    return this.augment({ [e]: r });
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
    const r = {};
    for (const n of util.objectKeys(e))
      e[n] && this.shape[n] && (r[n] = this.shape[n]);
    return new ZodObject({
      ...this._def,
      shape: () => r
    });
  }
  omit(e) {
    const r = {};
    for (const n of util.objectKeys(this.shape))
      e[n] || (r[n] = this.shape[n]);
    return new ZodObject({
      ...this._def,
      shape: () => r
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(e) {
    const r = {};
    for (const n of util.objectKeys(this.shape)) {
      const a = this.shape[n];
      e && !e[n] ? r[n] = a : r[n] = a.optional();
    }
    return new ZodObject({
      ...this._def,
      shape: () => r
    });
  }
  required(e) {
    const r = {};
    for (const n of util.objectKeys(this.shape))
      if (e && !e[n])
        r[n] = this.shape[n];
      else {
        let i = this.shape[n];
        for (; i instanceof ZodOptional; )
          i = i._def.innerType;
        r[n] = i;
      }
    return new ZodObject({
      ...this._def,
      shape: () => r
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (t, e) => new ZodObject({
  shape: () => t,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.strictCreate = (t, e) => new ZodObject({
  shape: () => t,
  unknownKeys: "strict",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
ZodObject.lazycreate = (t, e) => new ZodObject({
  shape: t,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(e)
});
class ZodUnion extends ZodType {
  _parse(e) {
    const { ctx: r } = this._processInputParams(e), n = this._def.options;
    function a(i) {
      for (const l of i)
        if (l.result.status === "valid")
          return l.result;
      for (const l of i)
        if (l.result.status === "dirty")
          return r.common.issues.push(...l.ctx.common.issues), l.result;
      const s = i.map((l) => new ZodError(l.ctx.common.issues));
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_union,
        unionErrors: s
      }), INVALID;
    }
    if (r.common.async)
      return Promise.all(n.map(async (i) => {
        const s = {
          ...r,
          common: {
            ...r.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await i._parseAsync({
            data: r.data,
            path: r.path,
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
          ...r,
          common: {
            ...r.common,
            issues: []
          },
          parent: null
        }, u = c._parseSync({
          data: r.data,
          path: r.path,
          parent: d
        });
        if (u.status === "valid")
          return u;
        u.status === "dirty" && !i && (i = { result: u, ctx: d }), d.common.issues.length && s.push(d.common.issues);
      }
      if (i)
        return r.common.issues.push(...i.ctx.common.issues), i.result;
      const l = s.map((c) => new ZodError(c));
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_union,
        unionErrors: l
      }), INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (t, e) => new ZodUnion({
  options: t,
  typeName: ZodFirstPartyTypeKind.ZodUnion,
  ...processCreateParams(e)
});
function mergeValues(t, e) {
  const r = getParsedType(t), n = getParsedType(e);
  if (t === e)
    return { valid: !0, data: t };
  if (r === ZodParsedType.object && n === ZodParsedType.object) {
    const a = util.objectKeys(e), i = util.objectKeys(t).filter((l) => a.indexOf(l) !== -1), s = { ...t, ...e };
    for (const l of i) {
      const c = mergeValues(t[l], e[l]);
      if (!c.valid)
        return { valid: !1 };
      s[l] = c.data;
    }
    return { valid: !0, data: s };
  } else if (r === ZodParsedType.array && n === ZodParsedType.array) {
    if (t.length !== e.length)
      return { valid: !1 };
    const a = [];
    for (let i = 0; i < t.length; i++) {
      const s = t[i], l = e[i], c = mergeValues(s, l);
      if (!c.valid)
        return { valid: !1 };
      a.push(c.data);
    }
    return { valid: !0, data: a };
  } else return r === ZodParsedType.date && n === ZodParsedType.date && +t == +e ? { valid: !0, data: t } : { valid: !1 };
}
class ZodIntersection extends ZodType {
  _parse(e) {
    const { status: r, ctx: n } = this._processInputParams(e), a = (i, s) => {
      if (isAborted(i) || isAborted(s))
        return INVALID;
      const l = mergeValues(i.value, s.value);
      return l.valid ? ((isDirty(i) || isDirty(s)) && r.dirty(), { status: r.value, value: l.data }) : (addIssueToContext(n, {
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
ZodIntersection.create = (t, e, r) => new ZodIntersection({
  left: t,
  right: e,
  typeName: ZodFirstPartyTypeKind.ZodIntersection,
  ...processCreateParams(r)
});
class ZodTuple extends ZodType {
  _parse(e) {
    const { status: r, ctx: n } = this._processInputParams(e);
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
    }), r.dirty());
    const i = [...n.data].map((s, l) => {
      const c = this._def.items[l] || this._def.rest;
      return c ? c._parse(new ParseInputLazyPath(n, s, n.path, l)) : null;
    }).filter((s) => !!s);
    return n.common.async ? Promise.all(i).then((s) => ParseStatus.mergeArray(r, s)) : ParseStatus.mergeArray(r, i);
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
ZodTuple.create = (t, e) => {
  if (!Array.isArray(t))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new ZodTuple({
    items: t,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(e)
  });
};
class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    const { status: r, ctx: n } = this._processInputParams(e);
    if (n.parsedType !== ZodParsedType.map)
      return addIssueToContext(n, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: n.parsedType
      }), INVALID;
    const a = this._def.keyType, i = this._def.valueType, s = [...n.data.entries()].map(([l, c], d) => ({
      key: a._parse(new ParseInputLazyPath(n, l, n.path, [d, "key"])),
      value: i._parse(new ParseInputLazyPath(n, c, n.path, [d, "value"]))
    }));
    if (n.common.async) {
      const l = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const c of s) {
          const d = await c.key, u = await c.value;
          if (d.status === "aborted" || u.status === "aborted")
            return INVALID;
          (d.status === "dirty" || u.status === "dirty") && r.dirty(), l.set(d.value, u.value);
        }
        return { status: r.value, value: l };
      });
    } else {
      const l = /* @__PURE__ */ new Map();
      for (const c of s) {
        const d = c.key, u = c.value;
        if (d.status === "aborted" || u.status === "aborted")
          return INVALID;
        (d.status === "dirty" || u.status === "dirty") && r.dirty(), l.set(d.value, u.value);
      }
      return { status: r.value, value: l };
    }
  }
}
ZodMap.create = (t, e, r) => new ZodMap({
  valueType: e,
  keyType: t,
  typeName: ZodFirstPartyTypeKind.ZodMap,
  ...processCreateParams(r)
});
class ZodSet extends ZodType {
  _parse(e) {
    const { status: r, ctx: n } = this._processInputParams(e);
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
    }), r.dirty()), a.maxSize !== null && n.data.size > a.maxSize.value && (addIssueToContext(n, {
      code: ZodIssueCode.too_big,
      maximum: a.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: a.maxSize.message
    }), r.dirty());
    const i = this._def.valueType;
    function s(c) {
      const d = /* @__PURE__ */ new Set();
      for (const u of c) {
        if (u.status === "aborted")
          return INVALID;
        u.status === "dirty" && r.dirty(), d.add(u.value);
      }
      return { status: r.value, value: d };
    }
    const l = [...n.data.values()].map((c, d) => i._parse(new ParseInputLazyPath(n, c, n.path, d)));
    return n.common.async ? Promise.all(l).then((c) => s(c)) : s(l);
  }
  min(e, r) {
    return new ZodSet({
      ...this._def,
      minSize: { value: e, message: errorUtil.toString(r) }
    });
  }
  max(e, r) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: e, message: errorUtil.toString(r) }
    });
  }
  size(e, r) {
    return this.min(e, r).max(e, r);
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
ZodSet.create = (t, e) => new ZodSet({
  valueType: t,
  minSize: null,
  maxSize: null,
  typeName: ZodFirstPartyTypeKind.ZodSet,
  ...processCreateParams(e)
});
class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(e) {
    const { ctx: r } = this._processInputParams(e);
    return this._def.getter()._parse({ data: r.data, path: r.path, parent: r });
  }
}
ZodLazy.create = (t, e) => new ZodLazy({
  getter: t,
  typeName: ZodFirstPartyTypeKind.ZodLazy,
  ...processCreateParams(e)
});
class ZodLiteral extends ZodType {
  _parse(e) {
    if (e.data !== this._def.value) {
      const r = this._getOrReturnCtx(e);
      return addIssueToContext(r, {
        received: r.data,
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
ZodLiteral.create = (t, e) => new ZodLiteral({
  value: t,
  typeName: ZodFirstPartyTypeKind.ZodLiteral,
  ...processCreateParams(e)
});
function createZodEnum(t, e) {
  return new ZodEnum({
    values: t,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(e)
  });
}
class ZodEnum extends ZodType {
  _parse(e) {
    if (typeof e.data != "string") {
      const r = this._getOrReturnCtx(e), n = this._def.values;
      return addIssueToContext(r, {
        expected: util.joinValues(n),
        received: r.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(e.data)) {
      const r = this._getOrReturnCtx(e), n = this._def.values;
      return addIssueToContext(r, {
        received: r.data,
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
    for (const r of this._def.values)
      e[r] = r;
    return e;
  }
  get Values() {
    const e = {};
    for (const r of this._def.values)
      e[r] = r;
    return e;
  }
  get Enum() {
    const e = {};
    for (const r of this._def.values)
      e[r] = r;
    return e;
  }
  extract(e, r = this._def) {
    return ZodEnum.create(e, {
      ...this._def,
      ...r
    });
  }
  exclude(e, r = this._def) {
    return ZodEnum.create(this.options.filter((n) => !e.includes(n)), {
      ...this._def,
      ...r
    });
  }
}
ZodEnum.create = createZodEnum;
class ZodNativeEnum extends ZodType {
  _parse(e) {
    const r = util.getValidEnumValues(this._def.values), n = this._getOrReturnCtx(e);
    if (n.parsedType !== ZodParsedType.string && n.parsedType !== ZodParsedType.number) {
      const a = util.objectValues(r);
      return addIssueToContext(n, {
        expected: util.joinValues(a),
        received: n.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(util.getValidEnumValues(this._def.values))), !this._cache.has(e.data)) {
      const a = util.objectValues(r);
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
ZodNativeEnum.create = (t, e) => new ZodNativeEnum({
  values: t,
  typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
  ...processCreateParams(e)
});
class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(e) {
    const { ctx: r } = this._processInputParams(e);
    if (r.parsedType !== ZodParsedType.promise && r.common.async === !1)
      return addIssueToContext(r, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: r.parsedType
      }), INVALID;
    const n = r.parsedType === ZodParsedType.promise ? r.data : Promise.resolve(r.data);
    return OK(n.then((a) => this._def.type.parseAsync(a, {
      path: r.path,
      errorMap: r.common.contextualErrorMap
    })));
  }
}
ZodPromise.create = (t, e) => new ZodPromise({
  type: t,
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
    const { status: r, ctx: n } = this._processInputParams(e), a = this._def.effect || null, i = {
      addIssue: (s) => {
        addIssueToContext(n, s), s.fatal ? r.abort() : r.dirty();
      },
      get path() {
        return n.path;
      }
    };
    if (i.addIssue = i.addIssue.bind(i), a.type === "preprocess") {
      const s = a.transform(n.data, i);
      if (n.common.async)
        return Promise.resolve(s).then(async (l) => {
          if (r.value === "aborted")
            return INVALID;
          const c = await this._def.schema._parseAsync({
            data: l,
            path: n.path,
            parent: n
          });
          return c.status === "aborted" ? INVALID : c.status === "dirty" || r.value === "dirty" ? DIRTY(c.value) : c;
        });
      {
        if (r.value === "aborted")
          return INVALID;
        const l = this._def.schema._parseSync({
          data: s,
          path: n.path,
          parent: n
        });
        return l.status === "aborted" ? INVALID : l.status === "dirty" || r.value === "dirty" ? DIRTY(l.value) : l;
      }
    }
    if (a.type === "refinement") {
      const s = (l) => {
        const c = a.refinement(l, i);
        if (n.common.async)
          return Promise.resolve(c);
        if (c instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return l;
      };
      if (n.common.async === !1) {
        const l = this._def.schema._parseSync({
          data: n.data,
          path: n.path,
          parent: n
        });
        return l.status === "aborted" ? INVALID : (l.status === "dirty" && r.dirty(), s(l.value), { status: r.value, value: l.value });
      } else
        return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((l) => l.status === "aborted" ? INVALID : (l.status === "dirty" && r.dirty(), s(l.value).then(() => ({ status: r.value, value: l.value }))));
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
        const l = a.transform(s.value, i);
        if (l instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: r.value, value: l };
      } else
        return this._def.schema._parseAsync({ data: n.data, path: n.path, parent: n }).then((s) => isValid(s) ? Promise.resolve(a.transform(s.value, i)).then((l) => ({
          status: r.value,
          value: l
        })) : INVALID);
    util.assertNever(a);
  }
}
ZodEffects.create = (t, e, r) => new ZodEffects({
  schema: t,
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  effect: e,
  ...processCreateParams(r)
});
ZodEffects.createWithPreprocess = (t, e, r) => new ZodEffects({
  schema: e,
  effect: { type: "preprocess", transform: t },
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  ...processCreateParams(r)
});
class ZodOptional extends ZodType {
  _parse(e) {
    return this._getType(e) === ZodParsedType.undefined ? OK(void 0) : this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (t, e) => new ZodOptional({
  innerType: t,
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
ZodNullable.create = (t, e) => new ZodNullable({
  innerType: t,
  typeName: ZodFirstPartyTypeKind.ZodNullable,
  ...processCreateParams(e)
});
class ZodDefault extends ZodType {
  _parse(e) {
    const { ctx: r } = this._processInputParams(e);
    let n = r.data;
    return r.parsedType === ZodParsedType.undefined && (n = this._def.defaultValue()), this._def.innerType._parse({
      data: n,
      path: r.path,
      parent: r
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (t, e) => new ZodDefault({
  innerType: t,
  typeName: ZodFirstPartyTypeKind.ZodDefault,
  defaultValue: typeof e.default == "function" ? e.default : () => e.default,
  ...processCreateParams(e)
});
class ZodCatch extends ZodType {
  _parse(e) {
    const { ctx: r } = this._processInputParams(e), n = {
      ...r,
      common: {
        ...r.common,
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
ZodCatch.create = (t, e) => new ZodCatch({
  innerType: t,
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
ZodNaN.create = (t) => new ZodNaN({
  typeName: ZodFirstPartyTypeKind.ZodNaN,
  ...processCreateParams(t)
});
class ZodBranded extends ZodType {
  _parse(e) {
    const { ctx: r } = this._processInputParams(e), n = r.data;
    return this._def.type._parse({
      data: n,
      path: r.path,
      parent: r
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class ZodPipeline extends ZodType {
  _parse(e) {
    const { status: r, ctx: n } = this._processInputParams(e);
    if (n.common.async)
      return (async () => {
        const i = await this._def.in._parseAsync({
          data: n.data,
          path: n.path,
          parent: n
        });
        return i.status === "aborted" ? INVALID : i.status === "dirty" ? (r.dirty(), DIRTY(i.value)) : this._def.out._parseAsync({
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
      return a.status === "aborted" ? INVALID : a.status === "dirty" ? (r.dirty(), {
        status: "dirty",
        value: a.value
      }) : this._def.out._parseSync({
        data: a.value,
        path: n.path,
        parent: n
      });
    }
  }
  static create(e, r) {
    return new ZodPipeline({
      in: e,
      out: r,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}
class ZodReadonly extends ZodType {
  _parse(e) {
    const r = this._def.innerType._parse(e), n = (a) => (isValid(a) && (a.value = Object.freeze(a.value)), a);
    return isAsync(r) ? r.then((a) => n(a)) : n(r);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (t, e) => new ZodReadonly({
  innerType: t,
  typeName: ZodFirstPartyTypeKind.ZodReadonly,
  ...processCreateParams(e)
});
var ZodFirstPartyTypeKind;
(function(t) {
  t.ZodString = "ZodString", t.ZodNumber = "ZodNumber", t.ZodNaN = "ZodNaN", t.ZodBigInt = "ZodBigInt", t.ZodBoolean = "ZodBoolean", t.ZodDate = "ZodDate", t.ZodSymbol = "ZodSymbol", t.ZodUndefined = "ZodUndefined", t.ZodNull = "ZodNull", t.ZodAny = "ZodAny", t.ZodUnknown = "ZodUnknown", t.ZodNever = "ZodNever", t.ZodVoid = "ZodVoid", t.ZodArray = "ZodArray", t.ZodObject = "ZodObject", t.ZodUnion = "ZodUnion", t.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", t.ZodIntersection = "ZodIntersection", t.ZodTuple = "ZodTuple", t.ZodRecord = "ZodRecord", t.ZodMap = "ZodMap", t.ZodSet = "ZodSet", t.ZodFunction = "ZodFunction", t.ZodLazy = "ZodLazy", t.ZodLiteral = "ZodLiteral", t.ZodEnum = "ZodEnum", t.ZodEffects = "ZodEffects", t.ZodNativeEnum = "ZodNativeEnum", t.ZodOptional = "ZodOptional", t.ZodNullable = "ZodNullable", t.ZodDefault = "ZodDefault", t.ZodCatch = "ZodCatch", t.ZodPromise = "ZodPromise", t.ZodBranded = "ZodBranded", t.ZodPipeline = "ZodPipeline", t.ZodReadonly = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
const stringType = ZodString.create, numberType = ZodNumber.create;
ZodNever.create;
const arrayType = ZodArray.create, objectType = ZodObject.create;
ZodUnion.create;
ZodIntersection.create;
ZodTuple.create;
const enumType = ZodEnum.create;
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
  array: arrayType,
  datetimeRegex,
  defaultErrorMap: errorMap,
  enum: enumType,
  getErrorMap,
  getParsedType,
  isAborted,
  isAsync,
  isDirty,
  isValid,
  makeIssue,
  number: numberType,
  object: objectType,
  get objectUtil() {
    return objectUtil;
  },
  string: stringType,
  get util() {
    return util;
  }
}, Symbol.toStringTag, { value: "Module" }));
var zValidator = (t, e, r) => (
  // @ts-expect-error not typed well
  validator(t, async (n, a) => {
    let i = n;
    if (t === "header" && e instanceof ZodObject) {
      const l = Object.keys(e.shape), c = Object.fromEntries(
        l.map((d) => [d.toLowerCase(), d])
      );
      i = Object.fromEntries(
        Object.entries(n).map(([d, u]) => [c[d] || d, u])
      );
    }
    const s = await e.safeParseAsync(i);
    if (r) {
      const l = await r({ data: i, ...s, target: t }, a);
      if (l) {
        if (l instanceof Response)
          return l;
        if ("response" in l)
          return l.response;
      }
    }
    return s.success ? s.data : a.json(s, 400);
  })
), compose = (t, e, r) => (n, a) => {
  let i = -1;
  return s(0);
  async function s(l) {
    if (l <= i)
      throw new Error("next() called multiple times");
    i = l;
    let c, d = !1, u;
    if (t[l] ? (u = t[l][0][0], n.req.routeIndex = l) : u = l === t.length && a || void 0, u)
      try {
        c = await u(n, () => s(l + 1));
      } catch (m) {
        if (m instanceof Error && e)
          n.error = m, c = await e(m, n), d = !0;
        else
          throw m;
      }
    else
      n.finalized === !1 && r && (c = await r(n));
    return c && (n.finalized === !1 || d) && (n.res = c), n;
  }
}, GET_MATCH_RESULT = /* @__PURE__ */ Symbol(), isRawRequest = (t) => "headers" in t, parseBody = async (t, e = /* @__PURE__ */ Object.create(null)) => {
  const { all: r = !1, dot: n = !1 } = e, s = (isRawRequest(t) ? t.headers : t.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  return s === "multipart/form-data" || s === "application/x-www-form-urlencoded" ? parseFormData(t, { all: r, dot: n }) : {};
};
async function parseFormData(t, e) {
  if (!isRawRequest(t) && t.bodyCache.formData)
    return convertFormDataToBodyData(
      await t.bodyCache.formData,
      e
    );
  const r = isRawRequest(t) ? t.headers : t.raw.headers, n = await t.arrayBuffer(), a = bufferToFormData(n, r.get("Content-Type") || "");
  isRawRequest(t) || (t.bodyCache.formData = a);
  const i = await a;
  return i ? convertFormDataToBodyData(i, e) : {};
}
function convertFormDataToBodyData(t, e) {
  const r = /* @__PURE__ */ Object.create(null);
  return t.forEach((n, a) => {
    e.all || a.endsWith("[]") ? handleParsingAllValues(r, a, n) : r[a] = n;
  }), e.dot && Object.entries(r).forEach(([n, a]) => {
    n.includes(".") && (handleParsingNestedValues(r, n, a), delete r[n]);
  }), r;
}
var handleParsingAllValues = (t, e, r) => {
  t[e] !== void 0 ? Array.isArray(t[e]) ? t[e].push(r) : t[e] = [t[e], r] : e.endsWith("[]") ? t[e] = [r] : t[e] = r;
}, handleParsingNestedValues = (t, e, r) => {
  if (/(?:^|\.)__proto__\./.test(e))
    return;
  let n = t;
  const a = e.split(".");
  a.forEach((i, s) => {
    s === a.length - 1 ? n[i] = r : ((!n[i] || typeof n[i] != "object" || Array.isArray(n[i]) || n[i] instanceof File) && (n[i] = /* @__PURE__ */ Object.create(null)), n = n[i]);
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
  constructor(t, e = "/", r = [[]]) {
    this.raw = t, this.path = e, this.#e = r;
  }
  param(t) {
    return t ? this.#r(t) : this.#i();
  }
  #r(t) {
    const e = this.#e[0][this.routeIndex][1][t], r = this.#n(e);
    return r && tryDecodeURIComponent(r);
  }
  #i() {
    const t = {}, e = Object.keys(this.#e[0][this.routeIndex][1]);
    for (const r of e) {
      const n = this.#n(this.#e[0][this.routeIndex][1][r]);
      n !== void 0 && (t[r] = tryDecodeURIComponent(n));
    }
    return t;
  }
  #n(t) {
    return this.#e[1] ? this.#e[1][t] : t;
  }
  query(t) {
    return getQueryParam(this.url, t);
  }
  queries(t) {
    return getQueryParams(this.url, t);
  }
  header(t) {
    if (t)
      return this.raw.headers.get(t) ?? void 0;
    const e = /* @__PURE__ */ Object.create(null);
    return this.raw.headers.forEach((r, n) => {
      e[n] = r;
    }), e;
  }
  async parseBody(t) {
    return parseBody(this, t);
  }
  #a = (t) => {
    const { bodyCache: e, raw: r } = this, n = e[t];
    if (n)
      return n;
    for (const a in e)
      return e[a].then((i) => (a === "json" && (i = JSON.stringify(i)), new Response(i)[t]()));
    return e[t] = r[t]();
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
    return this.#a("text").then((t) => JSON.parse(t));
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
    return this.#a("arrayBuffer").then((t) => new Uint8Array(t));
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
  addValidatedData(t, e) {
    (this.#t ??= {})[t] = e;
  }
  valid(t) {
    return this.#t?.[t];
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
    return this.#e[0].map(([[, t]]) => t);
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
    return this.#e[0].map(([[, t]]) => t)[this.routeIndex].path;
  }
}, TEXT_PLAIN = "text/plain; charset=UTF-8", setDefaultContentType = (t, e) => ({
  "Content-Type": t,
  ...e
}), createResponseInstance = (t, e) => new Response(t, e), Context = class {
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
  constructor(t, e) {
    this.#t = t, e && (this.#n = e.executionCtx, this.env = e.env, this.#c = e.notFoundHandler, this.#p = e.path, this.#u = e.matchResult);
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
  set res(t) {
    if (this.#a && t) {
      t = createResponseInstance(t.body, t);
      for (const [e, r] of this.#a.headers.entries())
        if (e !== "content-type")
          if (e === "set-cookie") {
            const n = this.#a.headers.getSetCookie();
            t.headers.delete("set-cookie");
            for (const a of n)
              t.headers.append("set-cookie", a);
          } else
            t.headers.set(e, r);
    }
    this.#a = t, this.finalized = !0;
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
  render = (...t) => (this.#l ??= (e) => this.html(e), this.#l(...t));
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (t) => this.#d = t;
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
  setRenderer = (t) => {
    this.#l = t;
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
  header = (t, e, r) => {
    this.finalized && (this.#a = createResponseInstance(this.#a.body, this.#a));
    const n = this.#a ? this.#a.headers : this.#o ??= new Headers();
    e === void 0 ? n.delete(t) : r?.append ? n.append(t, e) : n.set(t, e);
  };
  status = (t) => {
    this.#i = t;
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
  set = (t, e) => {
    this.#r ??= /* @__PURE__ */ new Map(), this.#r.set(t, e);
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
  get = (t) => this.#r ? this.#r.get(t) : void 0;
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
  #s(t, e, r) {
    let n = this.#a ? new Headers(this.#a.headers) : this.#o;
    if (typeof e == "object" && e.headers) {
      n ??= new Headers();
      for (const [i, s] of new Headers(e.headers))
        i === "set-cookie" ? n.append(i, s) : n.set(i, s);
    }
    if (r) {
      if (!n) {
        let i = 0;
        for (const s in r)
          if (++i > 1 || typeof r[s] != "string") {
            n = new Headers();
            break;
          }
      }
      if (n)
        for (const i in r) {
          const s = r[i];
          if (typeof s == "string")
            n.set(i, s);
          else {
            n.delete(i);
            for (const l of s)
              n.append(i, l);
          }
        }
    }
    const a = typeof e == "number" ? e : e?.status ?? this.#i;
    return createResponseInstance(t, {
      status: a,
      headers: n ?? r
    });
  }
  newResponse = (...t) => this.#s(...t);
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
  body = (t, e, r) => this.#s(t, e, r);
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
  text = (t, e, r) => !this.#o && !this.#i && !e && !r && !this.finalized ? new Response(t) : this.#s(
    t,
    e,
    setDefaultContentType(TEXT_PLAIN, r)
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
  json = (t, e, r) => this.#s(
    JSON.stringify(t),
    e,
    setDefaultContentType("application/json", r)
  );
  html = (t, e, r) => {
    const n = (a) => this.#s(a, e, setDefaultContentType("text/html; charset=UTF-8", r));
    return typeof t == "object" ? resolveCallback(t, HtmlEscapedCallbackPhase.Stringify, !1, {}).then(n) : n(t);
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
  redirect = (t, e) => {
    const r = String(t);
    return this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      /[^\x00-\xFF]/.test(r) ? encodeURI(r) : r
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
}, COMPOSED_HANDLER = "__COMPOSED_HANDLER", notFoundHandler = (t) => t.text("404 Not Found", 404), errorHandler = (t, e) => {
  if ("getResponse" in t) {
    const r = t.getResponse();
    return e.newResponse(r.body, r);
  }
  return console.error(t), e.text("Internal Server Error", 500);
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
      this[i] = (s, ...l) => (typeof s == "string" ? this.#t = s : this.#i(i, this.#t, s), l.forEach((c) => {
        this.#i(i, this.#t, c);
      }), this);
    }), this.on = (i, s, ...l) => {
      for (const c of [s].flat()) {
        this.#t = c;
        for (const d of [i].flat())
          l.map((u) => {
            this.#i(d.toUpperCase(), this.#t, u);
          });
      }
      return this;
    }, this.use = (i, ...s) => (typeof i == "string" ? this.#t = i : (this.#t = "*", s.unshift(i)), s.forEach((l) => {
      this.#i(METHOD_NAME_ALL, this.#t, l);
    }), this);
    const { strict: n, ...a } = e;
    Object.assign(this, a), this.getPath = n ?? !0 ? e.getPath ?? getPath : getPathNoStrict;
  }
  #e() {
    const e = new De({
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
  route(e, r) {
    const n = this.basePath(e);
    return r.routes.map((a) => {
      let i;
      r.errorHandler === errorHandler ? i = a.handler : (i = async (s, l) => (await compose([], r.errorHandler)(s, () => a.handler(s, l))).res, i[COMPOSED_HANDLER] = a.handler), n.#i(a.method, a.path, i, a.basePath);
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
    const r = this.#e();
    return r._basePath = mergePath(this._basePath, e), r;
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
  mount(e, r, n) {
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
        const m = new URL(u.url);
        return m.pathname = this.getPath(u).slice(d) || "/", new Request(m, u);
      };
    })();
    const l = async (c, d) => {
      const u = await r(a(c.req.raw), ...s(c));
      if (u)
        return u;
      await d();
    };
    return this.#i(METHOD_NAME_ALL, mergePath(e, "*"), l), this;
  }
  #i(e, r, n, a) {
    e = e.toUpperCase(), r = mergePath(this._basePath, r);
    const i = {
      basePath: a !== void 0 ? mergePath(this._basePath, a) : this._basePath,
      path: r,
      method: e,
      handler: n
    };
    this.router.add(e, r, [n, i]), this.routes.push(i);
  }
  #n(e, r) {
    if (e instanceof Error)
      return this.errorHandler(e, r);
    throw e;
  }
  #a(e, r, n, a) {
    if (a === "HEAD")
      return (async () => new Response(null, await this.#a(e, r, n, "GET")))();
    const i = this.getPath(e, { env: n }), s = this.router.match(a, i), l = new Context(e, {
      path: i,
      matchResult: s,
      env: n,
      executionCtx: r,
      notFoundHandler: this.#r
    });
    if (s[0].length === 1) {
      let d;
      try {
        d = s[0][0][0][0](l, async () => {
          l.res = await this.#r(l);
        });
      } catch (u) {
        return this.#n(u, l);
      }
      return d instanceof Promise ? d.then(
        (u) => u || (l.finalized ? l.res : this.#r(l))
      ).catch((u) => this.#n(u, l)) : d ?? this.#r(l);
    }
    const c = compose(s[0], this.errorHandler, this.#r);
    return (async () => {
      try {
        const d = await c(l);
        if (!d.finalized)
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        return d.res;
      } catch (d) {
        return this.#n(d, l);
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
  fetch = (e, ...r) => this.#a(e, r[1], r[0], e.method);
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
  request = (e, r, n, a) => e instanceof Request ? this.fetch(r ? new Request(e, r) : e, n, a) : (e = e.toString(), this.fetch(
    new Request(
      /^https?:\/\//.test(e) ? e : `http://localhost${mergePath("/", e)}`,
      r
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
function match(t, e) {
  const r = this.buildAllMatchers(), n = ((a, i) => {
    const s = r[a] || r[METHOD_NAME_ALL], l = s[2][i];
    if (l)
      return l;
    const c = i.match(s[0]);
    if (!c)
      return [[], emptyParam];
    const d = c.indexOf("", 1);
    return [s[1][d], c];
  });
  return this.match = n, n(t, e);
}
var LABEL_REG_EXP_STR = "[^/]+", ONLY_WILDCARD_REG_EXP_STR = ".*", TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)", PATH_ERROR = /* @__PURE__ */ Symbol(), regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(t, e) {
  return t.length === 1 ? e.length === 1 ? t < e ? -1 : 1 : -1 : e.length === 1 ? 1 : t === ONLY_WILDCARD_REG_EXP_STR || t === TAIL_WILDCARD_REG_EXP_STR ? e === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1 : e === ONLY_WILDCARD_REG_EXP_STR || e === TAIL_WILDCARD_REG_EXP_STR ? -1 : t === LABEL_REG_EXP_STR ? 1 : e === LABEL_REG_EXP_STR ? -1 : t.length === e.length ? t < e ? -1 : 1 : e.length - t.length;
}
var Node$1 = class Ee {
  // handler index of a dynamic path, or -1 for a static path terminal
  #t;
  #e;
  #r = /* @__PURE__ */ Object.create(null);
  insert(e, r, n, a, i) {
    let s = this;
    for (let l = 0, c = e.length; l < c; l++) {
      const d = e[l], u = d.length === 1 ? d === "*" ? l === c - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : d === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : d.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let m;
      if (u) {
        const h = u[1];
        let y = u[2] || LABEL_REG_EXP_STR;
        if (h && u[2] && (y === ".*" || (y = y.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(y)) || y.length === 1 && regExpMetaChars.has(y)))
          throw PATH_ERROR;
        if (m = s.#r[y], !m) {
          if (y !== ONLY_WILDCARD_REG_EXP_STR && y !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const v in s.#r)
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (y.length > 1 || v.length > 1) && v !== ONLY_WILDCARD_REG_EXP_STR && v !== TAIL_WILDCARD_REG_EXP_STR
              )
                throw PATH_ERROR;
          }
          m = s.#r[y] = new Ee();
        }
        h !== "" && (m.#e ??= a.varIndex++, n.push([h, m.#e]));
      } else if (m = s.#r[d], !m) {
        for (const h in s.#r)
          if (h.length > 1 && h !== ONLY_WILDCARD_REG_EXP_STR && h !== TAIL_WILDCARD_REG_EXP_STR)
            throw PATH_ERROR;
        m = s.#r[d] = new Ee();
      }
      s = m;
    }
    if (s.#t !== void 0)
      throw PATH_ERROR;
    s.#t = i ? -1 : r;
  }
  buildRegExpStr() {
    const r = Object.keys(this.#r).sort(compareKey).map((n) => {
      const a = this.#r[n], i = a.buildRegExpStr();
      return i === "" ? "" : (typeof a.#e == "number" ? `(${n})@${a.#e}` : regExpMetaChars.has(n) ? `\\${n}` : n) + i;
    }).filter(Boolean);
    return typeof this.#t == "number" && this.#t !== -1 && r.unshift(`#${this.#t}`), r.length === 0 ? "" : r.length === 1 ? r[0] : "(?:" + r.join("|") + ")";
  }
}, Trie = class {
  #t = { varIndex: 0 };
  #e = new Node$1();
  #r = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = /* @__PURE__ */ Object.create(null);
  insert(t, e) {
    if (e) {
      this.#e.insert(t.split(""), 0, [], this.#t, !0);
      return;
    }
    const r = [], n = [];
    let a = t;
    for (let s = 0; ; ) {
      let l = !1;
      if (a = a.replace(/\{[^}]+\}/g, (c) => {
        const d = `@\\${s}`;
        return n[s] = [d, c], s++, l = !0, d;
      }), !l)
        break;
    }
    const i = a.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let s = n.length - 1; s >= 0; s--) {
      const [l] = n[s];
      for (let c = i.length - 1; c >= 0; c--)
        if (i[c].indexOf(l) !== -1) {
          i[c] = i[c].replace(l, n[s][1]);
          break;
        }
    }
    this.#e.insert(i, this.#r, r, this.#t, !1), this.paths[t] = [this.#r++, r];
  }
  buildRegExp() {
    let t = this.#e.buildRegExpStr();
    if (t === "")
      return [/^$/, [], []];
    let e = 0;
    const r = [], n = [];
    return t = t.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, i, s) => i !== void 0 ? (r[++e] = Number(i), "$()") : (s !== void 0 && (n[Number(s)] = ++e), "")), [new RegExp(`^${t}`), r, n];
  }
}, wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(t) {
  return wildcardRegExpCache[t] ??= new RegExp(
    t === "*" ? "" : `^${t.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (e, r) => r ? `\\${r}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function findMiddleware(t, e) {
  if (t) {
    for (const r of Object.keys(t).sort((n, a) => a.length - n.length))
      if (buildWildcardRegExp(r).test(e))
        return [...t[r]];
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
  #i(t, e) {
    try {
      this.#r[t].insert(e, !/\*|\/:/.test(e));
    } catch (r) {
      throw r === PATH_ERROR ? new UnsupportedPathError(e) : r;
    }
  }
  add(t, e, r) {
    const n = this.#t, a = this.#e;
    if (!n || !a)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    n[t] || (this.#r[t] = new Trie(), [n, a].forEach((l) => {
      l[t] = /* @__PURE__ */ Object.create(null), Object.keys(l[METHOD_NAME_ALL]).forEach((c) => {
        l[t][c] = [...l[METHOD_NAME_ALL][c]], this.#i(t, c);
      });
    })), e === "/*" && (e = "*");
    const i = (e.match(/\/:/g) || []).length;
    if (/\*$/.test(e)) {
      const l = buildWildcardRegExp(e);
      Object.keys(n).forEach((c) => {
        (t === METHOD_NAME_ALL || t === c) && !n[c][e] && (this.#i(c, e), n[c][e] = findMiddleware(n[c], e) || findMiddleware(n[METHOD_NAME_ALL], e) || []);
      }), Object.keys(n).forEach((c) => {
        (t === METHOD_NAME_ALL || t === c) && Object.keys(n[c]).forEach((d) => {
          l.test(d) && n[c][d].push([r, i]);
        });
      }), Object.keys(a).forEach((c) => {
        (t === METHOD_NAME_ALL || t === c) && Object.keys(a[c]).forEach(
          (d) => l.test(d) && a[c][d].push([r, i])
        );
      });
      return;
    }
    const s = checkOptionalParameter(e) || [e];
    for (let l = 0, c = s.length; l < c; l++) {
      const d = s[l];
      Object.keys(a).forEach((u) => {
        (t === METHOD_NAME_ALL || t === u) && (a[u][d] || (this.#i(u, d), a[u][d] = [
          ...findMiddleware(n[u], d) || findMiddleware(n[METHOD_NAME_ALL], d) || []
        ]), a[u][d].push([r, i - c + l + 1]));
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const t = /* @__PURE__ */ Object.create(null);
    return Object.keys(this.#e).concat(Object.keys(this.#t)).forEach((e) => {
      t[e] ||= this.#n(e);
    }), this.#t = this.#e = this.#r = void 0, clearWildcardRegExpCache(), t;
  }
  #n(t) {
    const e = this.#t[t], r = this.#e[t], n = this.#r[t], a = /* @__PURE__ */ Object.create(null), i = [];
    [e, r].forEach((u) => {
      for (const m in u) {
        const h = u[m], y = n.paths[m];
        if (!y) {
          a[m] = [h.map(([T]) => [T, /* @__PURE__ */ Object.create(null)]), emptyParam];
          continue;
        }
        const v = y[1];
        i[y[0]] = h.map(([T, I]) => {
          const N = /* @__PURE__ */ Object.create(null);
          for (I -= 1; I >= 0; I--) {
            const [b, g] = v[I];
            N[b] = g;
          }
          return [T, N];
        });
      }
    });
    const [s, l, c] = n.buildRegExp();
    for (let u = 0, m = i.length; u < m; u++)
      for (let h = 0, y = i[u].length; h < y; h++) {
        const v = i[u][h]?.[1];
        if (!v)
          continue;
        const T = Object.keys(v);
        for (let I = 0, N = T.length; I < N; I++)
          v[T[I]] = c[v[T[I]]];
      }
    const d = [];
    for (const u in l)
      d[u] = i[l[u]];
    return [s, d, a];
  }
}, SmartRouter = class {
  name = "SmartRouter";
  #t = [];
  #e = [];
  constructor(t) {
    this.#t = t.routers;
  }
  add(t, e, r) {
    if (!this.#e)
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#e.push([t, e, r]);
  }
  match(t, e) {
    if (!this.#e)
      throw new Error("Fatal error");
    const r = this.#t, n = this.#e, a = r.length;
    let i = 0, s;
    for (; i < a; i++) {
      const l = r[i];
      try {
        for (let c = 0, d = n.length; c < d; c++)
          l.add(...n[c]);
        s = l.match(t, e);
      } catch (c) {
        if (c instanceof UnsupportedPathError)
          continue;
        throw c;
      }
      this.match = l.match.bind(l), this.#t = [l], this.#e = void 0;
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
  insert(e, r, n) {
    let a = this;
    const i = splitRoutingPath(r), s = /* @__PURE__ */ new Set();
    let l = 0;
    for (const c of i) {
      const d = i[++l], u = getPattern(c, d) || (d === void 0 && c && c.indexOf("*") === c.length - 1 ? c : null), m = Array.isArray(u), h = m ? u[0] : u || c, y = a.#e[h] ||= new Re();
      u && !y.#i && (y.#i = u, a.#r.push(y)), a = y, m && s.add(u[1]);
    }
    a.#t.push({
      [e]: {
        handler: n,
        possibleKeys: [...s],
        score: ++order
      }
    });
  }
  #a(e, r, n, a, i) {
    for (let s = 0, l = r.#t.length; s < l; s++) {
      const c = r.#t[s], d = c[n] || c[METHOD_NAME_ALL];
      if (d) {
        d.params = /* @__PURE__ */ Object.create(null), e.push(d);
        for (let u = 0, m = d.possibleKeys.length; u < m; u++) {
          const h = d.possibleKeys[u];
          d.params[h] = i?.[h] && !u ? i[h] : a[h] ?? i?.[h];
        }
      }
    }
  }
  search(e, r) {
    const n = [];
    this.#n = emptyParams;
    let i = [this];
    const s = splitPath(r), l = [], c = s.length;
    let d = null;
    for (let u = 0; u < c; u++) {
      const m = s[u], h = u === c - 1, y = [];
      for (let T = 0, I = i.length; T < I; T++) {
        const N = i[T], b = N.#e[m];
        b && (b.#n = N.#n, h ? (b.#e["*"] && this.#a(n, b.#e["*"], e, N.#n), this.#a(n, b, e, N.#n)) : y.push(b));
        for (const g of N.#r) {
          const C = g.#i, _ = N.#n === emptyParams ? {} : { ...N.#n };
          if (typeof C == "string") {
            (C === "*" || m.startsWith(C.slice(0, -1))) && (this.#a(n, g, e, N.#n), C === "*" && (g.#n = _, y.push(g)));
            continue;
          }
          const [, D, L] = C;
          if (!(!m && L === !0)) {
            if (L !== !0) {
              if (!d) {
                d = [];
                let U = r[0] === "/" ? 1 : 0;
                for (let W = 0; W < c; W++)
                  d[W] = U, U += s[W].length + 1;
              }
              const M = r.slice(d[u]), F = L.exec(M);
              if (F) {
                _[D] = F[0], this.#a(n, g, e, N.#n, _), F[0].length === M.length && g.#e["*"] && this.#a(
                  n,
                  g.#e["*"],
                  e,
                  N.#n,
                  _
                );
                for (const U in g.#e) {
                  g.#n = _;
                  const W = F[0].match(/\//g)?.length ?? 0;
                  (l[W] ||= []).push(g);
                  break;
                }
                continue;
              }
            }
            (L === !0 || L.test(m)) && (_[D] = m, h ? (this.#a(n, g, e, _, N.#n), g.#e["*"] && this.#a(
              n,
              g.#e["*"],
              e,
              _,
              N.#n
            )) : (g.#n = _, y.push(g)));
          }
        }
      }
      const v = l.shift();
      i = v ? y.concat(v) : y;
    }
    return n[1] && n.sort((u, m) => u.score - m.score), [n.map(({ handler: u, params: m }) => [u, m])];
  }
}, TrieRouter = class {
  name = "TrieRouter";
  #t = new Node();
  add(t, e, r) {
    for (const n of checkOptionalParameter(e) || [e])
      this.#t.insert(t, n, r);
  }
  match(t, e) {
    return this.#t.search(t, e);
  }
}, Hono = class extends Hono$1 {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(t = {}) {
    super(t), this.router = t.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, OpenAPIHono = class Ce extends Hono {
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
  openapi = ({ middleware: e, ...r }, n, a = this.defaultHook) => {
    this.openAPIRegistry.registerPath(r);
    const i = [];
    if (r.request?.query) {
      const c = zValidator("query", r.request.query, a);
      i.push(c);
    }
    if (r.request?.params) {
      const c = zValidator("param", r.request.params, a);
      i.push(c);
    }
    if (r.request?.headers) {
      const c = zValidator("header", r.request.headers, a);
      i.push(c);
    }
    if (r.request?.cookies) {
      const c = zValidator("cookie", r.request.cookies, a);
      i.push(c);
    }
    const s = r.request?.body?.content;
    if (s)
      for (const c of Object.keys(s)) {
        if (!s[c])
          continue;
        const d = s[c].schema;
        if (d instanceof ZodType) {
          if (isJSONContentType(c)) {
            const u = zValidator("json", d, a);
            if (r.request?.body?.required)
              i.push(u);
            else {
              const m = async (h, y) => {
                if (h.req.header("content-type") && isJSONContentType(h.req.header("content-type")))
                  return await u(h, y);
                h.req.addValidatedData("json", {}), await y();
              };
              i.push(m);
            }
          }
          if (isFormContentType(c)) {
            const u = zValidator("form", d, a);
            if (r.request?.body?.required)
              i.push(u);
            else {
              const m = async (h, y) => {
                if (h.req.header("content-type") && isFormContentType(h.req.header("content-type")))
                  return await u(h, y);
                h.req.addValidatedData("form", {}), await y();
              };
              i.push(m);
            }
          }
        }
      }
    const l = e ? Array.isArray(e) ? e : [e] : [];
    return this.on(
      [r.method],
      r.path.replaceAll(/\/{(.+?)}/g, "/:$1"),
      ...l,
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
  doc = (e, r) => this.get(e, (n) => {
    const a = typeof r == "function" ? r(n) : r;
    try {
      const i = this.getOpenAPIDocument(a);
      return n.json(i);
    } catch (i) {
      return n.json(i, 500);
    }
  });
  doc31 = (e, r) => this.get(e, (n) => {
    const a = typeof r == "function" ? r(n) : r;
    try {
      const i = this.getOpenAPI31Document(a);
      return n.json(i);
    } catch (i) {
      return n.json(i, 500);
    }
  });
  route(e, r) {
    const n = e.replaceAll(/:([^\/]+)/g, "{$1}");
    return super.route(e, r), r instanceof Ce ? (r.openAPIRegistry.definitions.forEach((a) => {
      switch (a.type) {
        case "component":
          return this.openAPIRegistry.registerComponent(a.componentType, a.name, a.component);
        case "route":
          return this.openAPIRegistry.registerPath({
            ...a.route,
            path: mergePath(
              n,
              // @ts-expect-error _basePath is private
              r._basePath,
              a.route.path
            )
          });
        case "webhook":
          return this.openAPIRegistry.registerWebhook({
            ...a.webhook,
            path: mergePath(
              n,
              // @ts-expect-error _basePath is private
              r._basePath,
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
    return new Ce({ ...super.basePath(e), defaultHook: this.defaultHook });
  }
}, createRoute = (t) => {
  const e = {
    ...t,
    getRoutingPath() {
      return t.path.replaceAll(/\/{(.+?)}/g, "/:$1");
    }
  };
  return Object.defineProperty(e, "getRoutingPath", { enumerable: !1 });
};
extendZodWithOpenApi(z);
function addBasePathToDocument(t, e) {
  const r = {};
  return Object.keys(t.paths).forEach((n) => {
    r[mergePath(e, n)] = t.paths[n];
  }), {
    ...t,
    paths: r
  };
}
function isJSONContentType(t) {
  return /^application\/([a-z-\.]+\+)?json/.test(t);
}
function isFormContentType(t) {
  return t.startsWith("multipart/form-data") || t.startsWith("application/x-www-form-urlencoded");
}
const logo = "data:image/png;base64,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", Layout = ({
  children: t,
  title: e = "NexGen Docs",
  description: r = "Guides and API reference for NexGen Collection Payment and QR Payment.",
  activePath: n = "/"
}) => {
  const a = e === "NexGen Docs" ? e : `${e} | NexGen Docs`;
  return /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDEV("head", { children: [
      /* @__PURE__ */ jsxDEV("meta", { charset: "utf-8" }),
      /* @__PURE__ */ jsxDEV("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
      /* @__PURE__ */ jsxDEV("title", { children: a }),
      /* @__PURE__ */ jsxDEV("meta", { name: "description", content: r }),
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
      /* @__PURE__ */ jsxDEV("div", { class: "main-wrapper", children: t }),
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
], icon = (t, e = "lp-icon") => raw(`<svg class="${e}" viewBox="0 0 24 24" aria-hidden="true">${t}</svg>`), icons = {
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>'
}, products = [
  { icon: icons.receipt, title: "Collection Payment", body: "Group bills into collections and send customers to a hosted payment page.", href: "/docs/api/collection-payment" },
  { icon: icons.qr, title: "QR Payment", body: "Register terminals and generate a unique QR code for every transaction, including Maybank QR.", href: "/docs/api/qr-payment" },
  { icon: icons.webhook, title: "Callbacks & Redirects", body: "Receive payment results on your server and bring customers back to your site.", href: "/docs/api/callbacks-and-redirects" }
], samples = [
  {
    id: "bill",
    label: "Create a bill",
    request: `<span class="k">curl</span> -X POST <span class="s">"https://nexgen.example.com/api/v1/billing/create/RLVCQOIA0001?ApiSecret=$SECRET"</span> \\
  -H <span class="s">"ApiKey: $API_KEY"</span> \\
  -F fieldName=<span class="s">"Aisyah Rahman"</span> \\
  -F fieldEmail=<span class="s">"aisyah@example.com"</span> \\
  -F fieldPhone=<span class="n">60123456789</span> \\
  -F fieldAmount=<span class="n">10.00</span> \\
  -F fieldPaymentDescription=<span class="s">"Membership 2026"</span> \\
  -F fieldCallbackUrl=<span class="s">"https://example.com/callback"</span>`,
    response: `<span class="c">// 201 Created</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVBEVN241004A9YU1"</span>,
  <span class="k">"status"</span>: <span class="s">"unpaid"</span>,
  <span class="k">"amount"</span>: <span class="s">"10.00"</span>,
  <span class="k">"payment_url"</span>: <span class="s">"https://nexgen.example.com/p/b/RLVBEVN241004A9YU1/1"</span>
}`
  },
  {
    id: "qr",
    label: "Create a QR",
    request: `<span class="k">curl</span> -X POST <span class="s">"https://nexgen.example.com/api/v1/qr/create/RLVTBAQA0003?ApiSecret=$SECRET"</span> \\
  -H <span class="s">"ApiKey: $API_KEY"</span> \\
  -F fieldAmount=<span class="n">1.00</span> \\
  -F fieldPaymentDescription=<span class="s">"Order #1042"</span> \\
  -F fieldCallbackUrl=<span class="s">"https://example.com/callback"</span>`,
    response: `<span class="c">// 201 Created</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVQSD4241006AZ2O5"</span>,
  <span class="k">"status"</span>: <span class="s">"unpaid"</span>,
  <span class="k">"amount"</span>: <span class="s">"1.00"</span>,
  <span class="k">"qr_code"</span>: <span class="s">"iVBORw0KGgoAAAANSUhEUgAA…"</span> <span class="c">// base64 PNG</span>
}`
  },
  {
    id: "callback",
    label: "Handle the callback",
    request: `<span class="c">// Your server: NexGen POSTs the result here</span>
app.<span class="k">post</span>(<span class="s">'/callback'</span>, <span class="k">async</span> (c) => {
  <span class="k">const</span> payment = <span class="k">await</span> c.req.json()
  <span class="k">if</span> (payment.status === <span class="s">'paid'</span>) {
    <span class="k">await</span> markOrderPaid(payment.code)
  }
  <span class="k">return</span> c.text(<span class="s">'OK'</span>)
})`,
    response: `<span class="c">// Payload</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVBEVN241004A9YU1"</span>,
  <span class="k">"status"</span>: <span class="s">"paid"</span>,
  <span class="k">"amount"</span>: <span class="s">"10.00"</span>,
  <span class="k">"payment_description"</span>: <span class="s">"Membership 2026"</span>
}`
  }
], styles = `
  :root {
    --lp-cta-bg: var(--accent-text); --lp-cta-fg: #ffffff;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  }
  [data-theme="dark"] { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  }

  .lp { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
  .lp section { padding: 5rem 0; border-top: 1px solid var(--border-color); }
  .lp section.lp-hero { border-top: 0; padding: 5rem 0; }
  .lp h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.025em; line-height: 1.2; color: var(--text-primary); margin-bottom: 0.625rem; }
  .lp-lead { color: var(--text-secondary); font-size: 1.0625rem; max-width: 60ch; margin-bottom: 2.5rem; }
  .lp-lead code { font-family: var(--font-mono); font-size: 0.875em; background: var(--bg-tertiary); padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
  .lp-icon { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .lp a:focus-visible, .lp button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 0.5rem; }

  /* One-time entrance: seen once per visit, so it can afford a little delight */
  @keyframes lp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .lp-reveal { animation: lp-rise 500ms var(--ease-out) both; }
  .lp-reveal:nth-child(2) { animation-delay: 60ms; }
  .lp-reveal:nth-child(3) { animation-delay: 120ms; }
  .lp-reveal:nth-child(4) { animation-delay: 180ms; }
  .lp-reveal:nth-child(5) { animation-delay: 240ms; }
  .lp-code.lp-reveal { animation-delay: 200ms; }

  /* Hero */
  .lp-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; align-items: center; }
  @media (min-width: 1024px) { .lp-hero { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 4rem; } }
  .lp-eyebrow { display: inline-flex; gap: 0.5rem; align-items: center; font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 0.25rem 0.75rem 0.25rem 0.5rem; border-radius: 9999px; margin-bottom: 1.5rem; }
  .lp-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }
  .lp-hero h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.08; letter-spacing: -0.04em; color: var(--text-primary); margin-bottom: 1.25rem; text-wrap: balance; }
  .lp-hero h1 span { color: var(--accent-text); }
  .lp-hero p { font-size: 1.125rem; color: var(--text-secondary); max-width: 34rem; margin-bottom: 2rem; text-wrap: pretty; }
  .lp-search { display: flex; align-items: center; gap: 0.75rem; width: 100%; max-width: 30rem; min-height: 48px; padding: 0 0.75rem 0 1rem; margin-bottom: 1rem; font: inherit; font-size: 1rem; color: var(--text-muted); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 0.625rem; cursor: pointer; text-align: left; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); transition: border-color 150ms ease, box-shadow 150ms ease, transform 160ms var(--ease-out); }
  .lp-search kbd { margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; padding: 0.125rem 0.5rem; border: 1px solid var(--border-color); border-radius: 0.375rem; background: var(--bg-tertiary); color: var(--text-secondary); }
  .lp-ctas { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .lp-btn { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; padding: 0 1.25rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9375rem; transition: transform 160ms var(--ease-out), background-color 150ms ease, border-color 150ms ease; }
  .lp-btn .lp-icon { width: 16px; height: 16px; transition: transform 200ms var(--ease-out); }
  .lp-btn-primary { background: var(--lp-cta-bg); color: var(--lp-cta-fg); }
  .lp-btn-primary:hover { color: var(--lp-cta-fg); }
  .lp-btn-secondary { color: var(--text-primary); border: 1px solid var(--border-color); background: var(--bg-primary); }
  .lp-btn-secondary:hover { color: var(--text-primary); }
  .lp-btn:active, .lp-search:active, .lp-tab:active, .lp-copy:active { transform: scale(0.97); }

  /* Code window */
  .lp-code { background: var(--code-bg); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 0.875rem; overflow: hidden; min-width: 0; box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(15, 23, 42, 0.5); }
  .lp-code-bar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.5rem 0 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.14); }
  .lp-tabs { position: relative; display: flex; gap: 0.25rem; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .lp-tab { position: relative; min-height: 40px; padding: 0 0.75rem; font: inherit; font-size: 0.8125rem; font-weight: 500; color: #94a3b8; background: none; border: 0; cursor: pointer; white-space: nowrap; transition: color 150ms ease, transform 160ms var(--ease-out); }
  .lp-tab[aria-selected="true"] { color: #f8fafc; }
  /* 1px bar scaled to the active tab's width: transform-only, so it never triggers layout */
  .lp-tab-indicator { position: absolute; left: 0; bottom: 0; width: 1px; height: 2px; background: var(--accent); transform-origin: left; transition: transform 280ms var(--ease-in-out); }
  .lp-copy { display: inline-flex; align-items: center; justify-content: center; position: relative; width: 36px; height: 36px; margin-bottom: 0.25rem; border: 0; border-radius: 0.5rem; color: #94a3b8; background: none; cursor: pointer; transition: color 150ms ease, background-color 150ms ease, transform 160ms var(--ease-out); }
  .lp-copy .lp-icon { position: absolute; width: 16px; height: 16px; transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), filter 200ms var(--ease-out); }
  .lp-copy .lp-icon-check { color: #86efac; opacity: 0; transform: scale(0.5); filter: blur(4px); }
  .lp-copy[data-copied] .lp-icon-copy { opacity: 0; transform: scale(0.5); filter: blur(4px); }
  .lp-copy[data-copied] .lp-icon-check { opacity: 1; transform: scale(1); filter: blur(0); }

  /* All panels share one grid cell, so the window keeps the tallest panel's height and never jumps */
  .lp-panels { display: grid; }
  .lp-panel { grid-area: 1 / 1; min-width: 0; transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), filter 200ms var(--ease-out), visibility 0s; }
  .lp-panel[hidden] { display: block; visibility: hidden; opacity: 0; transform: translateY(4px); filter: blur(2px); transition: opacity 120ms ease, transform 120ms ease, filter 120ms ease, visibility 0s 120ms; }
  .lp-panel pre { margin: 0; padding: 1.125rem 1.25rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.75; color: var(--code-text); tab-size: 2; }
  .lp-panel pre + pre { border-top: 1px dashed rgba(148, 163, 184, 0.16); }
  .lp-panel .c { color: #7c8aa0; } .lp-panel .s { color: #86efac; } .lp-panel .k { color: #fdba74; } .lp-panel .n { color: #93c5fd; }

  /* Products */
  .lp-grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
  @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
  .lp-card { position: relative; display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 0.875rem; background: var(--bg-secondary); color: var(--text-secondary); transition: border-color 200ms ease, transform 200ms var(--ease-out), box-shadow 200ms ease; }
  .lp-card:active { transform: scale(0.99); }
  .lp-card-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 0.625rem; background: var(--accent-light); color: var(--accent-text); }
  .lp-card h3 { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
  .lp-card p { font-size: 0.9375rem; flex: 1; }
  .lp-more { display: inline-flex; align-items: center; gap: 0.375rem; font-weight: 600; font-size: 0.875rem; color: var(--accent-text); }
  .lp-more .lp-icon { width: 16px; height: 16px; transition: transform 200ms var(--ease-out); }

  /* Hover only where a real pointer exists; taps shouldn't leave cards stuck "lifted" */
  @media (hover: hover) and (pointer: fine) {
    .lp-search:hover { border-color: var(--text-muted); }
    .lp-btn-primary:hover { background: color-mix(in srgb, var(--lp-cta-bg) 88%, var(--lp-cta-fg)); }
    .lp-btn-secondary:hover { border-color: var(--text-muted); }
    .lp-btn:hover .lp-icon, .lp-card:hover .lp-more .lp-icon, .lp-more:hover .lp-icon { transform: translateX(3px); }
    .lp-tab:hover { color: #e2e8f0; }
    .lp-copy:hover { color: #f8fafc; background: rgba(148, 163, 184, 0.12); }
    .lp-card:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color)); transform: translateY(-2px); box-shadow: 0 12px 24px -16px rgba(15, 23, 42, 0.25); color: var(--text-secondary); }
  }

  /* Steps: numbered timeline */
  .lp-steps { list-style: none; display: grid; gap: 2rem; grid-template-columns: 1fr; counter-reset: step; }
  @media (min-width: 768px) { .lp-steps { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; } }
  .lp-steps li { counter-increment: step; position: relative; padding-left: 3rem; }
  @media (min-width: 768px) { .lp-steps li { padding-left: 0; padding-top: 3.25rem; } }
  .lp-steps li::before { content: counter(step); position: absolute; left: 0; top: 0; display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 600; color: var(--accent-text); background: var(--bg-primary); border: 1px solid var(--border-color); z-index: 1; }
  .lp-steps li:not(:last-child)::after { content: ""; position: absolute; left: 1rem; top: 2rem; bottom: -2rem; width: 1px; background: var(--border-color); }
  @media (min-width: 768px) { .lp-steps li:not(:last-child)::after { left: 2rem; right: -1.5rem; top: 1rem; bottom: auto; width: auto; height: 1px; } }
  .lp-steps h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.375rem; }
  .lp-steps p { font-size: 0.9375rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .lp-steps code { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }

  /* Endpoints */
  .lp-endpoints { display: grid; gap: 2rem; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 1024px) { .lp-endpoints { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .lp-endpoints h3 { display: flex; justify-content: space-between; align-items: baseline; font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
  .lp-endpoints ul { list-style: none; border: 1px solid var(--border-color); border-radius: 0.875rem; overflow: hidden; }
  .lp-endpoints li { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border-top: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-primary); }
  .lp-endpoints li:first-child { border-top: 0; }
  .lp-endpoints li span:last-child { min-width: 0; overflow-wrap: anywhere; }
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

  /* Reduced motion: keep fades that aid comprehension, drop movement */
  @media (prefers-reduced-motion: reduce) {
    @keyframes lp-rise { from { opacity: 0; } to { opacity: 1; } }
    .lp *:not(.lp-tab-indicator), .lp *::before, .lp *::after { transform: none !important; filter: none !important; }
    .lp-tab-indicator { transition: none; }
  }
`, script = `
(() => {
  const tabs = [...document.querySelectorAll('.lp-tab')];
  const indicator = document.querySelector('.lp-tab-indicator');
  const copyBtn = document.querySelector('.lp-copy');
  if (!tabs.length) return;

  function moveIndicator(tab) {
    indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px) scaleX(' + tab.offsetWidth + ')';
  }

  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    moveIndicator(tab);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
        : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
      if (next) { e.preventDefault(); next.focus(); select(next); }
    });
  });

  // Place the indicator without animating on first paint
  indicator.style.transition = 'none';
  moveIndicator(tabs[0]);
  requestAnimationFrame(() => requestAnimationFrame(() => indicator.style.transition = ''));
  window.addEventListener('resize', () => moveIndicator(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));

  let resetTimer;
  copyBtn.addEventListener('click', async () => {
    const panel = document.querySelector('.lp-panel:not([hidden]) pre');
    try { await navigator.clipboard.writeText(panel.innerText); } catch { return; }
    copyBtn.setAttribute('data-copied', '');
    copyBtn.setAttribute('aria-label', 'Copied');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copyBtn.removeAttribute('data-copied');
      copyBtn.setAttribute('aria-label', 'Copy code');
    }, 1600);
  });
})();
`, HomePage = () => /* @__PURE__ */ jsxDEV(Layout, { activePath: "/", children: [
  /* @__PURE__ */ jsxDEV("style", { dangerouslySetInnerHTML: { __html: styles } }),
  /* @__PURE__ */ jsxDEV("main", { class: "lp", children: [
    /* @__PURE__ */ jsxDEV("section", { class: "lp-hero", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("div", { class: "lp-eyebrow lp-reveal", children: [
          /* @__PURE__ */ jsxDEV("span", { class: "lp-dot", "aria-hidden": "true" }),
          "NexGen API · v1"
        ] }),
        /* @__PURE__ */ jsxDEV("h1", { class: "lp-reveal", children: [
          "Collect payments with ",
          /* @__PURE__ */ jsxDEV("span", { children: "bills and QR codes" })
        ] }),
        /* @__PURE__ */ jsxDEV("p", { class: "lp-reveal", children: "Create a bill, send your customer to a hosted payment page and get the result on your server. Or generate a QR code for every transaction at the counter." }),
        /* @__PURE__ */ jsxDEV("button", { type: "button", class: "lp-search lp-reveal", onclick: "openSearch()", "aria-label": "Search the documentation", children: [
          icon(icons.search),
          /* @__PURE__ */ jsxDEV("span", { children: "Search the docs…" }),
          /* @__PURE__ */ jsxDEV("kbd", { children: "⌘K" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "lp-ctas lp-reveal", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/docs/api/overview", class: "lp-btn lp-btn-primary", children: [
            "Read the overview ",
            icon(icons.arrow)
          ] }),
          /* @__PURE__ */ jsxDEV("a", { href: "/reference", class: "lp-btn lp-btn-secondary", children: "API reference" })
        ] })
      ] }),
      /* @__PURE__ */ jsxDEV("div", { class: "lp-code lp-reveal", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "lp-code-bar", children: [
          /* @__PURE__ */ jsxDEV("div", { class: "lp-tabs", role: "tablist", "aria-label": "Code examples", children: [
            samples.map((t, e) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                role: "tab",
                class: "lp-tab",
                id: `lp-tab-${t.id}`,
                "aria-controls": `lp-panel-${t.id}`,
                "aria-selected": e === 0 ? "true" : "false",
                tabindex: e === 0 ? 0 : -1,
                children: t.label
              }
            )),
            /* @__PURE__ */ jsxDEV("span", { class: "lp-tab-indicator", "aria-hidden": "true" })
          ] }),
          /* @__PURE__ */ jsxDEV("button", { type: "button", class: "lp-copy", "aria-label": "Copy code", children: [
            icon(icons.copy, "lp-icon lp-icon-copy"),
            icon(icons.check, "lp-icon lp-icon-check")
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "lp-panels", children: samples.map((t, e) => /* @__PURE__ */ jsxDEV(
          "div",
          {
            class: "lp-panel",
            role: "tabpanel",
            id: `lp-panel-${t.id}`,
            "aria-labelledby": `lp-tab-${t.id}`,
            hidden: e !== 0,
            children: [
              /* @__PURE__ */ jsxDEV("pre", { children: raw(t.request) }),
              /* @__PURE__ */ jsxDEV("pre", { children: raw(t.response) })
            ]
          }
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxDEV("section", { "aria-labelledby": "products-heading", children: [
      /* @__PURE__ */ jsxDEV("h2", { id: "products-heading", children: "Choose how you get paid" }),
      /* @__PURE__ */ jsxDEV("p", { class: "lp-lead", children: "Both products use the same credentials, request format and callback flow." }),
      /* @__PURE__ */ jsxDEV("div", { class: "lp-grid", children: products.map((t) => /* @__PURE__ */ jsxDEV("a", { href: t.href, class: "lp-card", children: [
        /* @__PURE__ */ jsxDEV("span", { class: "lp-card-icon", children: icon(t.icon) }),
        /* @__PURE__ */ jsxDEV("h3", { children: t.title }),
        /* @__PURE__ */ jsxDEV("p", { children: t.body }),
        /* @__PURE__ */ jsxDEV("span", { class: "lp-more", children: [
          "Read the guide ",
          icon(icons.arrow)
        ] })
      ] })) })
    ] }),
    /* @__PURE__ */ jsxDEV("section", { "aria-labelledby": "flow-heading", children: [
      /* @__PURE__ */ jsxDEV("h2", { id: "flow-heading", children: "How a bill payment works" }),
      /* @__PURE__ */ jsxDEV("p", { class: "lp-lead", children: "Four steps from checkout to a confirmed payment." }),
      /* @__PURE__ */ jsxDEV("ol", { class: "lp-steps", children: steps.map((t) => /* @__PURE__ */ jsxDEV("li", { children: [
        /* @__PURE__ */ jsxDEV("h3", { children: t.title }),
        /* @__PURE__ */ jsxDEV("p", { children: t.body }),
        /* @__PURE__ */ jsxDEV("code", { children: t.code })
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
      /* @__PURE__ */ jsxDEV("div", { class: "lp-endpoints", children: endpointGroups.map((t) => /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("h3", { children: [
          t.title,
          /* @__PURE__ */ jsxDEV("a", { href: t.href, class: "lp-more", children: [
            "Guide ",
            icon(icons.arrow)
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("ul", { children: t.endpoints.map(([e, r]) => /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { class: `lp-method lp-method-${e}`, children: e }),
          /* @__PURE__ */ jsxDEV("span", { children: r })
        ] })) })
      ] })) }),
      /* @__PURE__ */ jsxDEV("p", { class: "lp-base", children: "All paths are relative to https://nexgen.example.com/api/v1" })
    ] })
  ] }),
  /* @__PURE__ */ jsxDEV("script", { dangerouslySetInnerHTML: { __html: script } })
] }), NotFoundPage = () => /* @__PURE__ */ jsxDEV(Layout, { title: "404 - Page Not Found", activePath: "/404", children: /* @__PURE__ */ jsxDEV("div", { style: "max-width: 600px; margin: 6rem auto; text-align: center; padding: 0 1.5rem;", children: [
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
`, __vite_glob_0_1 = '---\ntitle: Collection Payment\ndescription: Create collections and bills, then send customers to a hosted payment page.\ncategory: API Reference\norder: 2\n---\n\n# Collection Payment\n\nA **Collection** groups related bills, such as *Membership Fees*, *Utility Payments* or *Service Charges*. A **Bill** is an invoice for one customer and always belongs to one collection.\n\n## Payment flow\n\n1. Create a collection once, through the API or the NexGen dashboard.\n2. When a customer pays, your server creates a bill in that collection.\n3. NexGen returns a `payment_url`. Redirect the customer to it.\n4. The customer pays with their preferred method.\n5. NexGen `POST`s the result to your `callback_url`.\n6. If you set a `redirect_url`, NexGen sends the customer back to your site.\n\n```mermaid\nsequenceDiagram\n    participant C as Customer\n    participant S as Your server\n    participant N as NexGen\n    C->>S: Choose to pay\n    S->>N: POST /billing/create/{collection_code}\n    N-->>S: Bill with payment_url\n    S-->>C: Redirect to payment_url\n    C->>N: Pay\n    N->>S: POST callback_url (payment result)\n    N-->>C: Redirect to redirect_url (optional)\n```\n\nSee [Callbacks & Redirects](/docs/api/callbacks-and-redirects) for the payloads NexGen sends.\n\n## Collections\n\n### Create a collection\n\n`POST /api/v1/collection/create`\n\n| Field | Required | Description |\n| :--- | :--- | :--- |\n| `fieldName` | Yes | Collection name |\n| `fieldDescription` | Yes | Short description |\n| `fieldStatus` | Yes | `active` or `inactive` |\n\n```bash\ncurl -X POST "https://nexgen.example.com/api/v1/collection/create?ApiSecret=$NEXGEN_API_SECRET" \\\n  -H "ApiKey: $NEXGEN_API_KEY" \\\n  -F fieldName="Membership Fees" \\\n  -F fieldDescription="Annual membership" \\\n  -F fieldStatus=active\n```\n\nResponse `201`:\n\n```json\n{\n  "code": "RLVCQOIA0001",\n  "name": "Membership Fees",\n  "description": "Annual membership",\n  "status": "active"\n}\n```\n\nKeep the `code`. The other collection and billing endpoints need it as `{collection_code}`.\n\n### Other collection endpoints\n\n| Method | Path | Returns |\n| :--- | :--- | :--- |\n| `GET` | `/api/v1/collection/get/list` | Array of all your collections |\n| `GET` | `/api/v1/collection/get/data/{collection_code}` | One collection |\n| `GET` | `/api/v1/collection/get/data/{collection_code}/billing` | One collection, with every bill in `bill_list` |\n| `PUT` | `/api/v1/collection/switch/status/data/{collection_code}?fieldStatus=inactive` | The updated collection |\n\n`fieldStatus` on the switch-status endpoint is a **query** parameter and must be `active` or `inactive`.\n\n## Bills\n\n### Create a bill\n\n`POST /api/v1/billing/create/{collection_code}`\n\n| Field | Required | Description |\n| :--- | :--- | :--- |\n| `fieldName` | Yes | Payer name |\n| `fieldEmail` | Yes | Payer email |\n| `fieldPhone` | Yes | Payer phone, with country code (e.g. `60123456789`) |\n| `fieldAmount` | Yes | Amount as a decimal string (e.g. `10.00`) |\n| `fieldPaymentDescription` | Yes | What the payment is for |\n| `fieldCallbackUrl` | Yes | Your server endpoint that receives the payment result |\n| `fieldRedirectUrl` | No | Where to send the customer after paying |\n| `fieldDueDate` | No | When the bill expires |\n| `fieldExternalReferenceLabel1` / `fieldExternalReferenceValue1` | No | Your own reference, such as an order ID |\n\n```bash\ncurl -X POST "https://nexgen.example.com/api/v1/billing/create/RLVCQOIA0001?ApiSecret=$NEXGEN_API_SECRET" \\\n  -H "ApiKey: $NEXGEN_API_KEY" \\\n  -F fieldName="Aisyah Rahman" \\\n  -F fieldEmail="aisyah@example.com" \\\n  -F fieldPhone=60123456789 \\\n  -F fieldAmount=10.00 \\\n  -F fieldPaymentDescription="Membership 2026" \\\n  -F fieldCallbackUrl="https://example.com/nexgen/callback" \\\n  -F fieldRedirectUrl="https://example.com/payment/done"\n```\n\nResponse `201`:\n\n```json\n{\n  "code": "RLVBEVN241004A9YU1",\n  "status": "unpaid",\n  "amount": "10.00",\n  "payment_description": "Membership 2026",\n  "due_date": "05-10-2024 08:49:00",\n  "payer_name": "Aisyah Rahman",\n  "payer_email": "aisyah@example.com",\n  "payer_phone": "60123456789",\n  "external_reference_label_1": null,\n  "external_reference_value_1": null,\n  "redirect_url": "https://example.com/payment/done",\n  "callback_url": "https://example.com/nexgen/callback",\n  "payment_url": "https://nexgen.example.com/p/b/RLVBEVN241004A9YU1/1"\n}\n```\n\nRedirect the customer to `payment_url`.\n\n> [!NOTE]\n> A missing payment description is reported under the key `fieldDescription` in the `400` error, even though the request field is `fieldPaymentDescription`.\n\n### Get a bill\n\n`GET /api/v1/billing/get/data/{collection_code}/{bill_code}`\n\nThis returns the same object as Create Bill. Use it to check a bill\'s `status` from your server.\n\n## Bill fields\n\n| Field | Description |\n| :--- | :--- |\n| `code` | Unique bill code |\n| `status` | `unpaid`, `pending`, `paid` or `expired` |\n| `amount` | Bill amount |\n| `payment_description` | What the payment is for |\n| `due_date` | Due date, formatted `DD-MM-YYYY HH:mm:ss` |\n| `payer_name`, `payer_email`, `payer_phone` | Payer details |\n| `external_reference_label_1`…`_4`, `external_reference_value_1`…`_4` | Your own references, `null` when unused |\n| `redirect_url` | Where the customer returns after paying, or `null` |\n| `callback_url` | Where NexGen sends the payment result |\n| `payment_url` | Hosted payment page for the customer |\n', __vite_glob_0_2 = `---
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
`, __vite_glob_0_3 = `---
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
`;
var commonjsGlobal = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function getDefaultExportFromCjs(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function getAugmentedNamespace(t) {
  if (Object.prototype.hasOwnProperty.call(t, "__esModule")) return t;
  var e = t.default;
  if (typeof e == "function") {
    var r = function n() {
      return this instanceof n ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    r.prototype = e.prototype;
  } else r = {};
  return Object.defineProperty(r, "__esModule", { value: !0 }), Object.keys(t).forEach(function(n) {
    var a = Object.getOwnPropertyDescriptor(t, n);
    Object.defineProperty(r, n, a.get ? a : {
      enumerable: !0,
      get: function() {
        return t[n];
      }
    });
  }), r;
}
const __viteBrowserExternal = {}, __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" })), require$$0 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
var kindOf, hasRequiredKindOf;
function requireKindOf() {
  if (hasRequiredKindOf) return kindOf;
  hasRequiredKindOf = 1;
  var t = Object.prototype.toString;
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
    if (r(m)) return "array";
    if (d(m)) return "buffer";
    if (c(m)) return "arguments";
    if (a(m)) return "date";
    if (n(m)) return "error";
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
    if (l(m))
      return "generator";
    switch (h = t.call(m), h) {
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
  function r(u) {
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
  function s(u, m) {
    return e(u) === "GeneratorFunction";
  }
  function l(u) {
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
  var t = requireIsExtendable();
  extendShallow = function(a) {
    t(a) || (a = {});
    for (var i = arguments.length, s = 1; s < i; s++) {
      var l = arguments[s];
      t(l) && e(a, l);
    }
    return a;
  };
  function e(n, a) {
    for (var i in a)
      r(a, i) && (n[i] = a[i]);
  }
  function r(n, a) {
    return Object.prototype.hasOwnProperty.call(n, a);
  }
  return extendShallow;
}
var sectionMatter, hasRequiredSectionMatter;
function requireSectionMatter() {
  if (hasRequiredSectionMatter) return sectionMatter;
  hasRequiredSectionMatter = 1;
  var t = requireKindOf(), e = requireExtendShallow();
  sectionMatter = function(c, d) {
    typeof d == "function" && (d = { parse: d });
    var u = n(c), m = { section_delimiter: "---", parse: s }, h = e({}, m, d), y = h.section_delimiter, v = u.content.split(/\r?\n/), T = null, I = i(), N = [], b = [];
    function g(F) {
      u.content = F, T = [], N = [];
    }
    function C(F) {
      b.length && (I.key = a(b[0], y), I.content = F, h.parse(I, T), T.push(I), I = i(), N = [], b = []);
    }
    for (var _ = 0; _ < v.length; _++) {
      var D = v[_], L = b.length, M = D.trim();
      if (r(M, y)) {
        if (M.length === 3 && _ !== 0) {
          if (L === 0 || L === 2) {
            N.push(D);
            continue;
          }
          b.push(M), I.data = N.join(`
`), N = [];
          continue;
        }
        T === null && g(N.join(`
`)), L === 2 && C(N.join(`
`)), b.push(M);
        continue;
      }
      N.push(D);
    }
    return T === null ? g(N.join(`
`)) : C(N.join(`
`)), u.sections = T, u;
  };
  function r(c, d) {
    return !(c.slice(0, d.length) !== d || c.charAt(d.length + 1) === d.slice(-1));
  }
  function n(c) {
    if (t(c) !== "object" && (c = { content: c }), typeof c.content != "string" && !l(c.content))
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
  function l(c) {
    return c && c.constructor && typeof c.constructor.isBuffer == "function" ? c.constructor.isBuffer(c) : !1;
  }
  return sectionMatter;
}
var engines = { exports: {} }, jsYaml$1 = {}, loader = {}, common = {}, hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function t(s) {
    return typeof s > "u" || s === null;
  }
  function e(s) {
    return typeof s == "object" && s !== null;
  }
  function r(s) {
    return Array.isArray(s) ? s : t(s) ? [] : [s];
  }
  function n(s, l) {
    var c, d, u, m;
    if (l)
      for (m = Object.keys(l), c = 0, d = m.length; c < d; c += 1)
        u = m[c], s[u] = l[u];
    return s;
  }
  function a(s, l) {
    var c = "", d;
    for (d = 0; d < l; d += 1)
      c += s;
    return c;
  }
  function i(s) {
    return s === 0 && Number.NEGATIVE_INFINITY === 1 / s;
  }
  return common.isNothing = t, common.isObject = e, common.toArray = r, common.repeat = a, common.isNegativeZero = i, common.extend = n, common;
}
var exception, hasRequiredException;
function requireException() {
  if (hasRequiredException) return exception;
  hasRequiredException = 1;
  function t(e, r) {
    Error.call(this), this.name = "YAMLException", this.reason = e, this.mark = r, this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : ""), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack || "";
  }
  return t.prototype = Object.create(Error.prototype), t.prototype.constructor = t, t.prototype.toString = function(r) {
    var n = this.name + ": ";
    return n += this.reason || "(unknown reason)", !r && this.mark && (n += " " + this.mark.toString()), n;
  }, exception = t, exception;
}
var mark, hasRequiredMark;
function requireMark() {
  if (hasRequiredMark) return mark;
  hasRequiredMark = 1;
  var t = requireCommon();
  function e(r, n, a, i, s) {
    this.name = r, this.buffer = n, this.position = a, this.line = i, this.column = s;
  }
  return e.prototype.getSnippet = function(n, a) {
    var i, s, l, c, d;
    if (!this.buffer) return null;
    for (n = n || 4, a = a || 75, i = "", s = this.position; s > 0 && `\0\r
\u2028\u2029`.indexOf(this.buffer.charAt(s - 1)) === -1; )
      if (s -= 1, this.position - s > a / 2 - 1) {
        i = " ... ", s += 5;
        break;
      }
    for (l = "", c = this.position; c < this.buffer.length && `\0\r
\u2028\u2029`.indexOf(this.buffer.charAt(c)) === -1; )
      if (c += 1, c - this.position > a / 2 - 1) {
        l = " ... ", c -= 5;
        break;
      }
    return d = this.buffer.slice(s, c), t.repeat(" ", n) + i + d + l + `
` + t.repeat(" ", n + this.position - s + i.length) + "^";
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
  var t = requireException(), e = [
    "kind",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "defaultStyle",
    "styleAliases"
  ], r = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function n(i) {
    var s = {};
    return i !== null && Object.keys(i).forEach(function(l) {
      i[l].forEach(function(c) {
        s[String(c)] = l;
      });
    }), s;
  }
  function a(i, s) {
    if (s = s || {}, Object.keys(s).forEach(function(l) {
      if (e.indexOf(l) === -1)
        throw new t('Unknown option "' + l + '" is met in definition of "' + i + '" YAML type.');
    }), this.tag = i, this.kind = s.kind || null, this.resolve = s.resolve || function() {
      return !0;
    }, this.construct = s.construct || function(l) {
      return l;
    }, this.instanceOf = s.instanceOf || null, this.predicate = s.predicate || null, this.represent = s.represent || null, this.defaultStyle = s.defaultStyle || null, this.styleAliases = n(s.styleAliases || null), r.indexOf(this.kind) === -1)
      throw new t('Unknown kind "' + this.kind + '" is specified for "' + i + '" YAML type.');
  }
  return type = a, type;
}
var schema, hasRequiredSchema;
function requireSchema() {
  if (hasRequiredSchema) return schema;
  hasRequiredSchema = 1;
  var t = requireCommon(), e = requireException(), r = requireType();
  function n(s, l, c) {
    var d = [];
    return s.include.forEach(function(u) {
      c = n(u, l, c);
    }), s[l].forEach(function(u) {
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
    }, l, c;
    function d(u) {
      s[u.kind][u.tag] = s.fallback[u.tag] = u;
    }
    for (l = 0, c = arguments.length; l < c; l += 1)
      arguments[l].forEach(d);
    return s;
  }
  function i(s) {
    this.include = s.include || [], this.implicit = s.implicit || [], this.explicit = s.explicit || [], this.implicit.forEach(function(l) {
      if (l.loadKind && l.loadKind !== "scalar")
        throw new e("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }), this.compiledImplicit = n(this, "implicit", []), this.compiledExplicit = n(this, "explicit", []), this.compiledTypeMap = a(this.compiledImplicit, this.compiledExplicit);
  }
  return i.DEFAULT = null, i.create = function() {
    var l, c;
    switch (arguments.length) {
      case 1:
        l = i.DEFAULT, c = arguments[0];
        break;
      case 2:
        l = arguments[0], c = arguments[1];
        break;
      default:
        throw new e("Wrong number of arguments for Schema.create function");
    }
    if (l = t.toArray(l), c = t.toArray(c), !l.every(function(d) {
      return d instanceof i;
    }))
      throw new e("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
    if (!c.every(function(d) {
      return d instanceof r;
    }))
      throw new e("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    return new i({
      include: l,
      explicit: c
    });
  }, schema = i, schema;
}
var str, hasRequiredStr;
function requireStr() {
  if (hasRequiredStr) return str;
  hasRequiredStr = 1;
  var t = requireType();
  return str = new t("tag:yaml.org,2002:str", {
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
  var t = requireType();
  return seq = new t("tag:yaml.org,2002:seq", {
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
  var t = requireType();
  return map = new t("tag:yaml.org,2002:map", {
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
  var t = requireSchema();
  return failsafe = new t({
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
  var t = requireType();
  function e(a) {
    if (a === null) return !0;
    var i = a.length;
    return i === 1 && a === "~" || i === 4 && (a === "null" || a === "Null" || a === "NULL");
  }
  function r() {
    return null;
  }
  function n(a) {
    return a === null;
  }
  return _null = new t("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: e,
    construct: r,
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
  var t = requireType();
  function e(a) {
    if (a === null) return !1;
    var i = a.length;
    return i === 4 && (a === "true" || a === "True" || a === "TRUE") || i === 5 && (a === "false" || a === "False" || a === "FALSE");
  }
  function r(a) {
    return a === "true" || a === "True" || a === "TRUE";
  }
  function n(a) {
    return Object.prototype.toString.call(a) === "[object Boolean]";
  }
  return bool = new t("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: e,
    construct: r,
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
  var t = requireCommon(), e = requireType();
  function r(c) {
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
            if (!r(c.charCodeAt(u))) return !1;
            m = !0;
          }
        return m && h !== "_";
      }
      for (; u < d; u++)
        if (h = c[u], h !== "_") {
          if (!n(c.charCodeAt(u))) return !1;
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
    var d = c, u = 1, m, h, y = [];
    return d.indexOf("_") !== -1 && (d = d.replace(/_/g, "")), m = d[0], (m === "-" || m === "+") && (m === "-" && (u = -1), d = d.slice(1), m = d[0]), d === "0" ? 0 : m === "0" ? d[1] === "b" ? u * parseInt(d.slice(2), 2) : d[1] === "x" ? u * parseInt(d, 16) : u * parseInt(d, 8) : d.indexOf(":") !== -1 ? (d.split(":").forEach(function(v) {
      y.unshift(parseInt(v, 10));
    }), d = 0, h = 1, y.forEach(function(v) {
      d += v * h, h *= 60;
    }), u * d) : u * parseInt(d, 10);
  }
  function l(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && c % 1 === 0 && !t.isNegativeZero(c);
  }
  return int = new e("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: i,
    construct: s,
    predicate: l,
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
  var t = requireCommon(), e = requireType(), r = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function n(c) {
    return !(c === null || !r.test(c) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    c[c.length - 1] === "_");
  }
  function a(c) {
    var d, u, m, h;
    return d = c.replace(/_/g, "").toLowerCase(), u = d[0] === "-" ? -1 : 1, h = [], "+-".indexOf(d[0]) >= 0 && (d = d.slice(1)), d === ".inf" ? u === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : d === ".nan" ? NaN : d.indexOf(":") >= 0 ? (d.split(":").forEach(function(y) {
      h.unshift(parseFloat(y, 10));
    }), d = 0, m = 1, h.forEach(function(y) {
      d += y * m, m *= 60;
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
    else if (t.isNegativeZero(c))
      return "-0.0";
    return u = c.toString(10), i.test(u) ? u.replace("e", ".e") : u;
  }
  function l(c) {
    return Object.prototype.toString.call(c) === "[object Number]" && (c % 1 !== 0 || t.isNegativeZero(c));
  }
  return float = new e("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: n,
    construct: a,
    predicate: l,
    represent: s,
    defaultStyle: "lowercase"
  }), float;
}
var json, hasRequiredJson;
function requireJson() {
  if (hasRequiredJson) return json;
  hasRequiredJson = 1;
  var t = requireSchema();
  return json = new t({
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
  var t = requireSchema();
  return core = new t({
    include: [
      requireJson()
    ]
  }), core;
}
var timestamp, hasRequiredTimestamp;
function requireTimestamp() {
  if (hasRequiredTimestamp) return timestamp;
  hasRequiredTimestamp = 1;
  var t = requireType(), e = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  ), r = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function n(s) {
    return s === null ? !1 : e.exec(s) !== null || r.exec(s) !== null;
  }
  function a(s) {
    var l, c, d, u, m, h, y, v = 0, T = null, I, N, b;
    if (l = e.exec(s), l === null && (l = r.exec(s)), l === null) throw new Error("Date resolve error");
    if (c = +l[1], d = +l[2] - 1, u = +l[3], !l[4])
      return new Date(Date.UTC(c, d, u));
    if (m = +l[4], h = +l[5], y = +l[6], l[7]) {
      for (v = l[7].slice(0, 3); v.length < 3; )
        v += "0";
      v = +v;
    }
    return l[9] && (I = +l[10], N = +(l[11] || 0), T = (I * 60 + N) * 6e4, l[9] === "-" && (T = -T)), b = new Date(Date.UTC(c, d, u, m, h, y, v)), T && b.setTime(b.getTime() - T), b;
  }
  function i(s) {
    return s.toISOString();
  }
  return timestamp = new t("tag:yaml.org,2002:timestamp", {
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
  var t = requireType();
  function e(r) {
    return r === "<<" || r === null;
  }
  return merge = new t("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: e
  }), merge;
}
function commonjsRequire(t) {
  throw new Error('Could not dynamically require "' + t + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var binary, hasRequiredBinary;
function requireBinary() {
  if (hasRequiredBinary) return binary;
  hasRequiredBinary = 1;
  var t;
  try {
    var e = commonjsRequire;
    t = e("buffer").Buffer;
  } catch {
  }
  var r = requireType(), n = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function a(c) {
    if (c === null) return !1;
    var d, u, m = 0, h = c.length, y = n;
    for (u = 0; u < h; u++)
      if (d = y.indexOf(c.charAt(u)), !(d > 64)) {
        if (d < 0) return !1;
        m += 6;
      }
    return m % 8 === 0;
  }
  function i(c) {
    var d, u, m = c.replace(/[\r\n=]/g, ""), h = m.length, y = n, v = 0, T = [];
    for (d = 0; d < h; d++)
      d % 4 === 0 && d && (T.push(v >> 16 & 255), T.push(v >> 8 & 255), T.push(v & 255)), v = v << 6 | y.indexOf(m.charAt(d));
    return u = h % 4 * 6, u === 0 ? (T.push(v >> 16 & 255), T.push(v >> 8 & 255), T.push(v & 255)) : u === 18 ? (T.push(v >> 10 & 255), T.push(v >> 2 & 255)) : u === 12 && T.push(v >> 4 & 255), t ? t.from ? t.from(T) : new t(T) : T;
  }
  function s(c) {
    var d = "", u = 0, m, h, y = c.length, v = n;
    for (m = 0; m < y; m++)
      m % 3 === 0 && m && (d += v[u >> 18 & 63], d += v[u >> 12 & 63], d += v[u >> 6 & 63], d += v[u & 63]), u = (u << 8) + c[m];
    return h = y % 3, h === 0 ? (d += v[u >> 18 & 63], d += v[u >> 12 & 63], d += v[u >> 6 & 63], d += v[u & 63]) : h === 2 ? (d += v[u >> 10 & 63], d += v[u >> 4 & 63], d += v[u << 2 & 63], d += v[64]) : h === 1 && (d += v[u >> 2 & 63], d += v[u << 4 & 63], d += v[64], d += v[64]), d;
  }
  function l(c) {
    return t && t.isBuffer(c);
  }
  return binary = new r("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: a,
    construct: i,
    predicate: l,
    represent: s
  }), binary;
}
var omap, hasRequiredOmap;
function requireOmap() {
  if (hasRequiredOmap) return omap;
  hasRequiredOmap = 1;
  var t = requireType(), e = Object.prototype.hasOwnProperty, r = Object.prototype.toString;
  function n(i) {
    if (i === null) return !0;
    var s = {}, l, c, d, u, m, h = i;
    for (l = 0, c = h.length; l < c; l += 1) {
      if (d = h[l], m = !1, r.call(d) !== "[object Object]") return !1;
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
  return omap = new t("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: n,
    construct: a
  }), omap;
}
var pairs, hasRequiredPairs;
function requirePairs() {
  if (hasRequiredPairs) return pairs;
  hasRequiredPairs = 1;
  var t = requireType(), e = Object.prototype.toString;
  function r(a) {
    if (a === null) return !0;
    var i, s, l, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1) {
      if (l = u[i], e.call(l) !== "[object Object]" || (c = Object.keys(l), c.length !== 1)) return !1;
      d[i] = [c[0], l[c[0]]];
    }
    return !0;
  }
  function n(a) {
    if (a === null) return [];
    var i, s, l, c, d, u = a;
    for (d = new Array(u.length), i = 0, s = u.length; i < s; i += 1)
      l = u[i], c = Object.keys(l), d[i] = [c[0], l[c[0]]];
    return d;
  }
  return pairs = new t("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: r,
    construct: n
  }), pairs;
}
var set, hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set;
  hasRequiredSet = 1;
  var t = requireType(), e = Object.prototype.hasOwnProperty;
  function r(a) {
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
  return set = new t("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: r,
    construct: n
  }), set;
}
var default_safe, hasRequiredDefault_safe;
function requireDefault_safe() {
  if (hasRequiredDefault_safe) return default_safe;
  hasRequiredDefault_safe = 1;
  var t = requireSchema();
  return default_safe = new t({
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
  var t = requireType();
  function e() {
    return !0;
  }
  function r() {
  }
  function n() {
    return "";
  }
  function a(i) {
    return typeof i > "u";
  }
  return _undefined = new t("tag:yaml.org,2002:js/undefined", {
    kind: "scalar",
    resolve: e,
    construct: r,
    predicate: a,
    represent: n
  }), _undefined;
}
var regexp, hasRequiredRegexp;
function requireRegexp() {
  if (hasRequiredRegexp) return regexp;
  hasRequiredRegexp = 1;
  var t = requireType();
  function e(i) {
    if (i === null || i.length === 0) return !1;
    var s = i, l = /\/([gim]*)$/.exec(i), c = "";
    return !(s[0] === "/" && (l && (c = l[1]), c.length > 3 || s[s.length - c.length - 1] !== "/"));
  }
  function r(i) {
    var s = i, l = /\/([gim]*)$/.exec(i), c = "";
    return s[0] === "/" && (l && (c = l[1]), s = s.slice(1, s.length - c.length - 1)), new RegExp(s, c);
  }
  function n(i) {
    var s = "/" + i.source + "/";
    return i.global && (s += "g"), i.multiline && (s += "m"), i.ignoreCase && (s += "i"), s;
  }
  function a(i) {
    return Object.prototype.toString.call(i) === "[object RegExp]";
  }
  return regexp = new t("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve: e,
    construct: r,
    predicate: a,
    represent: n
  }), regexp;
}
var _function, hasRequired_function;
function require_function() {
  if (hasRequired_function) return _function;
  hasRequired_function = 1;
  var t;
  try {
    var e = commonjsRequire;
    t = e("esprima");
  } catch {
    typeof window < "u" && (t = window.esprima);
  }
  var r = requireType();
  function n(l) {
    if (l === null) return !1;
    try {
      var c = "(" + l + ")", d = t.parse(c, { range: !0 });
      return !(d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression");
    } catch {
      return !1;
    }
  }
  function a(l) {
    var c = "(" + l + ")", d = t.parse(c, { range: !0 }), u = [], m;
    if (d.type !== "Program" || d.body.length !== 1 || d.body[0].type !== "ExpressionStatement" || d.body[0].expression.type !== "ArrowFunctionExpression" && d.body[0].expression.type !== "FunctionExpression")
      throw new Error("Failed to resolve function");
    return d.body[0].expression.params.forEach(function(h) {
      u.push(h.name);
    }), m = d.body[0].expression.body.range, d.body[0].expression.body.type === "BlockStatement" ? new Function(u, c.slice(m[0] + 1, m[1] - 1)) : new Function(u, "return " + c.slice(m[0], m[1]));
  }
  function i(l) {
    return l.toString();
  }
  function s(l) {
    return Object.prototype.toString.call(l) === "[object Function]";
  }
  return _function = new r("tag:yaml.org,2002:js/function", {
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
  var t = requireSchema();
  return default_full = t.DEFAULT = new t({
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
  var t = requireCommon(), e = requireException(), r = requireMark(), n = requireDefault_safe(), a = requireDefault_full(), i = Object.prototype.hasOwnProperty, s = 1, l = 2, c = 3, d = 4, u = 1, m = 2, h = 3, y = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, v = /[\x85\u2028\u2029]/, T = /[,\[\]\{\}]/, I = /^(?:!|!!|![a-z\-]+!)$/i, N = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function b(o) {
    return Object.prototype.toString.call(o);
  }
  function g(o) {
    return o === 10 || o === 13;
  }
  function C(o) {
    return o === 9 || o === 32;
  }
  function _(o) {
    return o === 9 || o === 32 || o === 10 || o === 13;
  }
  function D(o) {
    return o === 44 || o === 91 || o === 93 || o === 123 || o === 125;
  }
  function L(o) {
    var x;
    return 48 <= o && o <= 57 ? o - 48 : (x = o | 32, 97 <= x && x <= 102 ? x - 97 + 10 : -1);
  }
  function M(o) {
    return o === 120 ? 2 : o === 117 ? 4 : o === 85 ? 8 : 0;
  }
  function F(o) {
    return 48 <= o && o <= 57 ? o - 48 : -1;
  }
  function U(o) {
    return o === 48 ? "\0" : o === 97 ? "\x07" : o === 98 ? "\b" : o === 116 || o === 9 ? "	" : o === 110 ? `
` : o === 118 ? "\v" : o === 102 ? "\f" : o === 114 ? "\r" : o === 101 ? "\x1B" : o === 32 ? " " : o === 34 ? '"' : o === 47 ? "/" : o === 92 ? "\\" : o === 78 ? "" : o === 95 ? " " : o === 76 ? "\u2028" : o === 80 ? "\u2029" : "";
  }
  function W(o) {
    return o <= 65535 ? String.fromCharCode(o) : String.fromCharCode(
      (o - 65536 >> 10) + 55296,
      (o - 65536 & 1023) + 56320
    );
  }
  function Y(o, x, k) {
    x === "__proto__" ? Object.defineProperty(o, x, {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: k
    }) : o[x] = k;
  }
  for (var le = new Array(256), G = new Array(256), ie = 0; ie < 256; ie++)
    le[ie] = U(ie) ? 1 : 0, G[ie] = U(ie);
  function fe(o, x) {
    this.input = o, this.filename = x.filename || null, this.schema = x.schema || a, this.onWarning = x.onWarning || null, this.legacy = x.legacy || !1, this.json = x.json || !1, this.listener = x.listener || null, this.maxTotalMergeKeys = typeof x.maxTotalMergeKeys == "number" ? x.maxTotalMergeKeys : 1e4, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = o.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.totalMergeKeys = 0, this.documents = [];
  }
  function ce(o, x) {
    return new e(
      x,
      new r(o.filename, o.input, o.position, o.line, o.position - o.lineStart)
    );
  }
  function q(o, x) {
    throw ce(o, x);
  }
  function X(o, x) {
    o.onWarning && o.onWarning.call(null, ce(o, x));
  }
  var re = {
    YAML: function(x, k, j) {
      var S, p, f;
      x.version !== null && q(x, "duplication of %YAML directive"), j.length !== 1 && q(x, "YAML directive accepts exactly one argument"), S = /^([0-9]+)\.([0-9]+)$/.exec(j[0]), S === null && q(x, "ill-formed argument of the YAML directive"), p = parseInt(S[1], 10), f = parseInt(S[2], 10), p !== 1 && q(x, "unacceptable YAML version of the document"), x.version = j[0], x.checkLineBreaks = f < 2, f !== 1 && f !== 2 && X(x, "unsupported YAML version of the document");
    },
    TAG: function(x, k, j) {
      var S, p;
      j.length !== 2 && q(x, "TAG directive accepts exactly two arguments"), S = j[0], p = j[1], I.test(S) || q(x, "ill-formed tag handle (first argument) of the TAG directive"), i.call(x.tagMap, S) && q(x, 'there is a previously declared suffix for "' + S + '" tag handle'), N.test(p) || q(x, "ill-formed tag prefix (second argument) of the TAG directive"), x.tagMap[S] = p;
    }
  };
  function $(o, x, k, j) {
    var S, p, f, w;
    if (x < k) {
      if (w = o.input.slice(x, k), j)
        for (S = 0, p = w.length; S < p; S += 1)
          f = w.charCodeAt(S), f === 9 || 32 <= f && f <= 1114111 || q(o, "expected valid JSON character");
      else y.test(w) && q(o, "the stream contains non-printable characters");
      o.result += w;
    }
  }
  function Q(o, x, k, j) {
    var S, p, f, w;
    for (t.isObject(k) || q(o, "cannot merge mappings; the provided source object is unacceptable"), S = Object.keys(k), f = 0, w = S.length; f < w; f += 1)
      p = S[f], o.maxTotalMergeKeys !== -1 && ++o.totalMergeKeys > o.maxTotalMergeKeys && q(o, "merge keys exceeded maxTotalMergeKeys (" + o.maxTotalMergeKeys + ")"), i.call(x, p) || (Y(x, p, k[p]), j[p] = !0);
  }
  function ee(o, x, k, j, S, p, f, w) {
    var A, P;
    if (Array.isArray(S))
      for (S = Array.prototype.slice.call(S), A = 0, P = S.length; A < P; A += 1)
        Array.isArray(S[A]) && q(o, "nested arrays are not supported inside keys"), typeof S == "object" && b(S[A]) === "[object Object]" && (S[A] = "[object Object]");
    if (typeof S == "object" && b(S) === "[object Object]" && (S = "[object Object]"), S = String(S), x === null && (x = {}), j === "tag:yaml.org,2002:merge")
      if (Array.isArray(p))
        for (A = 0, P = p.length; A < P; A += 1)
          Q(o, x, p[A], k);
      else
        Q(o, x, p, k);
    else
      !o.json && !i.call(k, S) && i.call(x, S) && (o.line = f || o.line, o.position = w || o.position, q(o, "duplicated mapping key")), Y(x, S, p), delete k[S];
    return x;
  }
  function te(o) {
    var x;
    x = o.input.charCodeAt(o.position), x === 10 ? o.position++ : x === 13 ? (o.position++, o.input.charCodeAt(o.position) === 10 && o.position++) : q(o, "a line break is expected"), o.line += 1, o.lineStart = o.position;
  }
  function J(o, x, k) {
    for (var j = 0, S = o.input.charCodeAt(o.position); S !== 0; ) {
      for (; C(S); )
        S = o.input.charCodeAt(++o.position);
      if (x && S === 35)
        do
          S = o.input.charCodeAt(++o.position);
        while (S !== 10 && S !== 13 && S !== 0);
      if (g(S))
        for (te(o), S = o.input.charCodeAt(o.position), j++, o.lineIndent = 0; S === 32; )
          o.lineIndent++, S = o.input.charCodeAt(++o.position);
      else
        break;
    }
    return k !== -1 && j !== 0 && o.lineIndent < k && X(o, "deficient indentation"), j;
  }
  function ne(o) {
    var x = o.position, k;
    return k = o.input.charCodeAt(x), !!((k === 45 || k === 46) && k === o.input.charCodeAt(x + 1) && k === o.input.charCodeAt(x + 2) && (x += 3, k = o.input.charCodeAt(x), k === 0 || _(k)));
  }
  function ae(o, x) {
    x === 1 ? o.result += " " : x > 1 && (o.result += t.repeat(`
`, x - 1));
  }
  function de(o, x, k) {
    var j, S, p, f, w, A, P, R, E = o.kind, Z = o.result, O;
    if (O = o.input.charCodeAt(o.position), _(O) || D(O) || O === 35 || O === 38 || O === 42 || O === 33 || O === 124 || O === 62 || O === 39 || O === 34 || O === 37 || O === 64 || O === 96 || (O === 63 || O === 45) && (S = o.input.charCodeAt(o.position + 1), _(S) || k && D(S)))
      return !1;
    for (o.kind = "scalar", o.result = "", p = f = o.position, w = !1; O !== 0; ) {
      if (O === 58) {
        if (S = o.input.charCodeAt(o.position + 1), _(S) || k && D(S))
          break;
      } else if (O === 35) {
        if (j = o.input.charCodeAt(o.position - 1), _(j))
          break;
      } else {
        if (o.position === o.lineStart && ne(o) || k && D(O))
          break;
        if (g(O))
          if (A = o.line, P = o.lineStart, R = o.lineIndent, J(o, !1, -1), o.lineIndent >= x) {
            w = !0, O = o.input.charCodeAt(o.position);
            continue;
          } else {
            o.position = f, o.line = A, o.lineStart = P, o.lineIndent = R;
            break;
          }
      }
      w && ($(o, p, f, !1), ae(o, o.line - A), p = f = o.position, w = !1), C(O) || (f = o.position + 1), O = o.input.charCodeAt(++o.position);
    }
    return $(o, p, f, !1), o.result ? !0 : (o.kind = E, o.result = Z, !1);
  }
  function he(o, x) {
    var k, j, S;
    if (k = o.input.charCodeAt(o.position), k !== 39)
      return !1;
    for (o.kind = "scalar", o.result = "", o.position++, j = S = o.position; (k = o.input.charCodeAt(o.position)) !== 0; )
      if (k === 39)
        if ($(o, j, o.position, !0), k = o.input.charCodeAt(++o.position), k === 39)
          j = o.position, o.position++, S = o.position;
        else
          return !0;
      else g(k) ? ($(o, j, S, !0), ae(o, J(o, !1, x)), j = S = o.position) : o.position === o.lineStart && ne(o) ? q(o, "unexpected end of the document within a single quoted scalar") : (o.position++, S = o.position);
    q(o, "unexpected end of the stream within a single quoted scalar");
  }
  function ue(o, x) {
    var k, j, S, p, f, w;
    if (w = o.input.charCodeAt(o.position), w !== 34)
      return !1;
    for (o.kind = "scalar", o.result = "", o.position++, k = j = o.position; (w = o.input.charCodeAt(o.position)) !== 0; ) {
      if (w === 34)
        return $(o, k, o.position, !0), o.position++, !0;
      if (w === 92) {
        if ($(o, k, o.position, !0), w = o.input.charCodeAt(++o.position), g(w))
          J(o, !1, x);
        else if (w < 256 && le[w])
          o.result += G[w], o.position++;
        else if ((f = M(w)) > 0) {
          for (S = f, p = 0; S > 0; S--)
            w = o.input.charCodeAt(++o.position), (f = L(w)) >= 0 ? p = (p << 4) + f : q(o, "expected hexadecimal character");
          o.result += W(p), o.position++;
        } else
          q(o, "unknown escape sequence");
        k = j = o.position;
      } else g(w) ? ($(o, k, j, !0), ae(o, J(o, !1, x)), k = j = o.position) : o.position === o.lineStart && ne(o) ? q(o, "unexpected end of the document within a double quoted scalar") : (o.position++, j = o.position);
    }
    q(o, "unexpected end of the stream within a double quoted scalar");
  }
  function se(o, x) {
    var k = !0, j, S = o.tag, p, f = o.anchor, w, A, P, R, E, Z = {}, O, V, H, B;
    if (B = o.input.charCodeAt(o.position), B === 91)
      A = 93, E = !1, p = [];
    else if (B === 123)
      A = 125, E = !0, p = {};
    else
      return !1;
    for (o.anchor !== null && (o.anchorMap[o.anchor] = p), B = o.input.charCodeAt(++o.position); B !== 0; ) {
      if (J(o, !0, x), B = o.input.charCodeAt(o.position), B === A)
        return o.position++, o.tag = S, o.anchor = f, o.kind = E ? "mapping" : "sequence", o.result = p, !0;
      k || q(o, "missed comma between flow collection entries"), V = O = H = null, P = R = !1, B === 63 && (w = o.input.charCodeAt(o.position + 1), _(w) && (P = R = !0, o.position++, J(o, !0, x))), j = o.line, oe(o, x, s, !1, !0), V = o.tag, O = o.result, J(o, !0, x), B = o.input.charCodeAt(o.position), (R || o.line === j) && B === 58 && (P = !0, B = o.input.charCodeAt(++o.position), J(o, !0, x), oe(o, x, s, !1, !0), H = o.result), E ? ee(o, p, Z, V, O, H) : P ? p.push(ee(o, null, Z, V, O, H)) : p.push(O), J(o, !0, x), B = o.input.charCodeAt(o.position), B === 44 ? (k = !0, B = o.input.charCodeAt(++o.position)) : k = !1;
    }
    q(o, "unexpected end of the stream within a flow collection");
  }
  function pe(o, x) {
    var k, j, S = u, p = !1, f = !1, w = x, A = 0, P = !1, R, E;
    if (E = o.input.charCodeAt(o.position), E === 124)
      j = !1;
    else if (E === 62)
      j = !0;
    else
      return !1;
    for (o.kind = "scalar", o.result = ""; E !== 0; )
      if (E = o.input.charCodeAt(++o.position), E === 43 || E === 45)
        u === S ? S = E === 43 ? h : m : q(o, "repeat of a chomping mode identifier");
      else if ((R = F(E)) >= 0)
        R === 0 ? q(o, "bad explicit indentation width of a block scalar; it cannot be less than one") : f ? q(o, "repeat of an indentation width identifier") : (w = x + R - 1, f = !0);
      else
        break;
    if (C(E)) {
      do
        E = o.input.charCodeAt(++o.position);
      while (C(E));
      if (E === 35)
        do
          E = o.input.charCodeAt(++o.position);
        while (!g(E) && E !== 0);
    }
    for (; E !== 0; ) {
      for (te(o), o.lineIndent = 0, E = o.input.charCodeAt(o.position); (!f || o.lineIndent < w) && E === 32; )
        o.lineIndent++, E = o.input.charCodeAt(++o.position);
      if (!f && o.lineIndent > w && (w = o.lineIndent), g(E)) {
        A++;
        continue;
      }
      if (o.lineIndent < w) {
        S === h ? o.result += t.repeat(`
`, p ? 1 + A : A) : S === u && p && (o.result += `
`);
        break;
      }
      for (j ? C(E) ? (P = !0, o.result += t.repeat(`
`, p ? 1 + A : A)) : P ? (P = !1, o.result += t.repeat(`
`, A + 1)) : A === 0 ? p && (o.result += " ") : o.result += t.repeat(`
`, A) : o.result += t.repeat(`
`, p ? 1 + A : A), p = !0, f = !0, A = 0, k = o.position; !g(E) && E !== 0; )
        E = o.input.charCodeAt(++o.position);
      $(o, k, o.position, !1);
    }
    return !0;
  }
  function me(o, x) {
    var k, j = o.tag, S = o.anchor, p = [], f, w = !1, A;
    for (o.anchor !== null && (o.anchorMap[o.anchor] = p), A = o.input.charCodeAt(o.position); A !== 0 && !(A !== 45 || (f = o.input.charCodeAt(o.position + 1), !_(f))); ) {
      if (w = !0, o.position++, J(o, !0, -1) && o.lineIndent <= x) {
        p.push(null), A = o.input.charCodeAt(o.position);
        continue;
      }
      if (k = o.line, oe(o, x, c, !1, !0), p.push(o.result), J(o, !0, -1), A = o.input.charCodeAt(o.position), (o.line === k || o.lineIndent > x) && A !== 0)
        q(o, "bad indentation of a sequence entry");
      else if (o.lineIndent < x)
        break;
    }
    return w ? (o.tag = j, o.anchor = S, o.kind = "sequence", o.result = p, !0) : !1;
  }
  function Ae(o, x, k) {
    var j, S, p, f, w = o.tag, A = o.anchor, P = {}, R = {}, E = null, Z = null, O = null, V = !1, H = !1, B;
    for (o.anchor !== null && (o.anchorMap[o.anchor] = P), B = o.input.charCodeAt(o.position); B !== 0; ) {
      if (j = o.input.charCodeAt(o.position + 1), p = o.line, f = o.position, (B === 63 || B === 58) && _(j))
        B === 63 ? (V && (ee(o, P, R, E, Z, null), E = Z = O = null), H = !0, V = !0, S = !0) : V ? (V = !1, S = !0) : q(o, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), o.position += 1, B = j;
      else if (oe(o, k, l, !1, !0))
        if (o.line === p) {
          for (B = o.input.charCodeAt(o.position); C(B); )
            B = o.input.charCodeAt(++o.position);
          if (B === 58)
            B = o.input.charCodeAt(++o.position), _(B) || q(o, "a whitespace character is expected after the key-value separator within a block mapping"), V && (ee(o, P, R, E, Z, null), E = Z = O = null), H = !0, V = !1, S = !1, E = o.tag, Z = o.result;
          else if (H)
            q(o, "can not read an implicit mapping pair; a colon is missed");
          else
            return o.tag = w, o.anchor = A, !0;
        } else if (H)
          q(o, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else
          return o.tag = w, o.anchor = A, !0;
      else
        break;
      if ((o.line === p || o.lineIndent > x) && (oe(o, x, d, !0, S) && (V ? Z = o.result : O = o.result), V || (ee(o, P, R, E, Z, O, p, f), E = Z = O = null), J(o, !0, -1), B = o.input.charCodeAt(o.position)), o.lineIndent > x && B !== 0)
        q(o, "bad indentation of a mapping entry");
      else if (o.lineIndent < x)
        break;
    }
    return V && ee(o, P, R, E, Z, null), H && (o.tag = w, o.anchor = A, o.kind = "mapping", o.result = P), H;
  }
  function ge(o) {
    var x, k = !1, j = !1, S, p, f;
    if (f = o.input.charCodeAt(o.position), f !== 33) return !1;
    if (o.tag !== null && q(o, "duplication of a tag property"), f = o.input.charCodeAt(++o.position), f === 60 ? (k = !0, f = o.input.charCodeAt(++o.position)) : f === 33 ? (j = !0, S = "!!", f = o.input.charCodeAt(++o.position)) : S = "!", x = o.position, k) {
      do
        f = o.input.charCodeAt(++o.position);
      while (f !== 0 && f !== 62);
      o.position < o.length ? (p = o.input.slice(x, o.position), f = o.input.charCodeAt(++o.position)) : q(o, "unexpected end of the stream within a verbatim tag");
    } else {
      for (; f !== 0 && !_(f); )
        f === 33 && (j ? q(o, "tag suffix cannot contain exclamation marks") : (S = o.input.slice(x - 1, o.position + 1), I.test(S) || q(o, "named tag handle cannot contain such characters"), j = !0, x = o.position + 1)), f = o.input.charCodeAt(++o.position);
      p = o.input.slice(x, o.position), T.test(p) && q(o, "tag suffix cannot contain flow indicator characters");
    }
    return p && !N.test(p) && q(o, "tag name cannot contain such characters: " + p), k ? o.tag = p : i.call(o.tagMap, S) ? o.tag = o.tagMap[S] + p : S === "!" ? o.tag = "!" + p : S === "!!" ? o.tag = "tag:yaml.org,2002:" + p : q(o, 'undeclared tag handle "' + S + '"'), !0;
  }
  function ye(o) {
    var x, k;
    if (k = o.input.charCodeAt(o.position), k !== 38) return !1;
    for (o.anchor !== null && q(o, "duplication of an anchor property"), k = o.input.charCodeAt(++o.position), x = o.position; k !== 0 && !_(k) && !D(k); )
      k = o.input.charCodeAt(++o.position);
    return o.position === x && q(o, "name of an anchor node must contain at least one character"), o.anchor = o.input.slice(x, o.position), !0;
  }
  function Te(o) {
    var x, k, j;
    if (j = o.input.charCodeAt(o.position), j !== 42) return !1;
    for (j = o.input.charCodeAt(++o.position), x = o.position; j !== 0 && !_(j) && !D(j); )
      j = o.input.charCodeAt(++o.position);
    return o.position === x && q(o, "name of an alias node must contain at least one character"), k = o.input.slice(x, o.position), i.call(o.anchorMap, k) || q(o, 'unidentified alias "' + k + '"'), o.result = o.anchorMap[k], J(o, !0, -1), !0;
  }
  function oe(o, x, k, j, S) {
    var p, f, w, A = 1, P = !1, R = !1, E, Z, O, V, H;
    if (o.listener !== null && o.listener("open", o), o.tag = null, o.anchor = null, o.kind = null, o.result = null, p = f = w = d === k || c === k, j && J(o, !0, -1) && (P = !0, o.lineIndent > x ? A = 1 : o.lineIndent === x ? A = 0 : o.lineIndent < x && (A = -1)), A === 1)
      for (; ge(o) || ye(o); )
        J(o, !0, -1) ? (P = !0, w = p, o.lineIndent > x ? A = 1 : o.lineIndent === x ? A = 0 : o.lineIndent < x && (A = -1)) : w = !1;
    if (w && (w = P || S), (A === 1 || d === k) && (s === k || l === k ? V = x : V = x + 1, H = o.position - o.lineStart, A === 1 ? w && (me(o, H) || Ae(o, H, V)) || se(o, V) ? R = !0 : (f && pe(o, V) || he(o, V) || ue(o, V) ? R = !0 : Te(o) ? (R = !0, (o.tag !== null || o.anchor !== null) && q(o, "alias node should not have any properties")) : de(o, V, s === k) && (R = !0, o.tag === null && (o.tag = "?")), o.anchor !== null && (o.anchorMap[o.anchor] = o.result)) : A === 0 && (R = w && me(o, H))), o.tag !== null && o.tag !== "!")
      if (o.tag === "?") {
        for (o.result !== null && o.kind !== "scalar" && q(o, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + o.kind + '"'), E = 0, Z = o.implicitTypes.length; E < Z; E += 1)
          if (O = o.implicitTypes[E], O.resolve(o.result)) {
            o.result = O.construct(o.result), o.tag = O.tag, o.anchor !== null && (o.anchorMap[o.anchor] = o.result);
            break;
          }
      } else i.call(o.typeMap[o.kind || "fallback"], o.tag) ? (O = o.typeMap[o.kind || "fallback"][o.tag], o.result !== null && O.kind !== o.kind && q(o, "unacceptable node kind for !<" + o.tag + '> tag; it should be "' + O.kind + '", not "' + o.kind + '"'), O.resolve(o.result) ? (o.result = O.construct(o.result), o.anchor !== null && (o.anchorMap[o.anchor] = o.result)) : q(o, "cannot resolve a node with !<" + o.tag + "> explicit tag")) : q(o, "unknown tag !<" + o.tag + ">");
    return o.listener !== null && o.listener("close", o), o.tag !== null || o.anchor !== null || R;
  }
  function ke(o) {
    var x = o.position, k, j, S, p = !1, f;
    for (o.version = null, o.checkLineBreaks = o.legacy, o.tagMap = {}, o.anchorMap = {}; (f = o.input.charCodeAt(o.position)) !== 0 && (J(o, !0, -1), f = o.input.charCodeAt(o.position), !(o.lineIndent > 0 || f !== 37)); ) {
      for (p = !0, f = o.input.charCodeAt(++o.position), k = o.position; f !== 0 && !_(f); )
        f = o.input.charCodeAt(++o.position);
      for (j = o.input.slice(k, o.position), S = [], j.length < 1 && q(o, "directive name must not be less than one character in length"); f !== 0; ) {
        for (; C(f); )
          f = o.input.charCodeAt(++o.position);
        if (f === 35) {
          do
            f = o.input.charCodeAt(++o.position);
          while (f !== 0 && !g(f));
          break;
        }
        if (g(f)) break;
        for (k = o.position; f !== 0 && !_(f); )
          f = o.input.charCodeAt(++o.position);
        S.push(o.input.slice(k, o.position));
      }
      f !== 0 && te(o), i.call(re, j) ? re[j](o, j, S) : X(o, 'unknown document directive "' + j + '"');
    }
    if (J(o, !0, -1), o.lineIndent === 0 && o.input.charCodeAt(o.position) === 45 && o.input.charCodeAt(o.position + 1) === 45 && o.input.charCodeAt(o.position + 2) === 45 ? (o.position += 3, J(o, !0, -1)) : p && q(o, "directives end mark is expected"), oe(o, o.lineIndent - 1, d, !1, !0), J(o, !0, -1), o.checkLineBreaks && v.test(o.input.slice(x, o.position)) && X(o, "non-ASCII line breaks are interpreted as content"), o.documents.push(o.result), o.position === o.lineStart && ne(o)) {
      o.input.charCodeAt(o.position) === 46 && (o.position += 3, J(o, !0, -1));
      return;
    }
    if (o.position < o.length - 1)
      q(o, "end of the stream or a document separator is expected");
    else
      return;
  }
  function be(o, x) {
    o = String(o), x = x || {}, o.length !== 0 && (o.charCodeAt(o.length - 1) !== 10 && o.charCodeAt(o.length - 1) !== 13 && (o += `
`), o.charCodeAt(0) === 65279 && (o = o.slice(1)));
    var k = new fe(o, x), j = o.indexOf("\0");
    for (j !== -1 && (k.position = j, q(k, "null byte is not allowed in input")), k.input += "\0"; k.input.charCodeAt(k.position) === 32; )
      k.lineIndent += 1, k.position += 1;
    for (; k.position < k.length - 1; )
      ke(k);
    return k.documents;
  }
  function xe(o, x, k) {
    x !== null && typeof x == "object" && typeof k > "u" && (k = x, x = null);
    var j = be(o, k);
    if (typeof x != "function")
      return j;
    for (var S = 0, p = j.length; S < p; S += 1)
      x(j[S]);
  }
  function ve(o, x) {
    var k = be(o, x);
    if (k.length !== 0) {
      if (k.length === 1)
        return k[0];
      throw new e("expected a single document in the stream, but found more");
    }
  }
  function _e(o, x, k) {
    return typeof x == "object" && x !== null && typeof k > "u" && (k = x, x = null), xe(o, x, t.extend({ schema: n }, k));
  }
  function we(o, x) {
    return ve(o, t.extend({ schema: n }, x));
  }
  return loader.loadAll = xe, loader.load = ve, loader.safeLoadAll = _e, loader.safeLoad = we, loader;
}
var dumper = {}, hasRequiredDumper;
function requireDumper() {
  if (hasRequiredDumper) return dumper;
  hasRequiredDumper = 1;
  var t = requireCommon(), e = requireException(), r = requireDefault_full(), n = requireDefault_safe(), a = Object.prototype.toString, i = Object.prototype.hasOwnProperty, s = 9, l = 10, c = 13, d = 32, u = 33, m = 34, h = 35, y = 37, v = 38, T = 39, I = 42, N = 44, b = 45, g = 58, C = 61, _ = 62, D = 63, L = 64, M = 91, F = 93, U = 96, W = 123, Y = 124, le = 125, G = {};
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
  function fe(p, f) {
    var w, A, P, R, E, Z, O;
    if (f === null) return {};
    for (w = {}, A = Object.keys(f), P = 0, R = A.length; P < R; P += 1)
      E = A[P], Z = String(f[E]), E.slice(0, 2) === "!!" && (E = "tag:yaml.org,2002:" + E.slice(2)), O = p.compiledTypeMap.fallback[E], O && i.call(O.styleAliases, Z) && (Z = O.styleAliases[Z]), w[E] = Z;
    return w;
  }
  function ce(p) {
    var f, w, A;
    if (f = p.toString(16).toUpperCase(), p <= 255)
      w = "x", A = 2;
    else if (p <= 65535)
      w = "u", A = 4;
    else if (p <= 4294967295)
      w = "U", A = 8;
    else
      throw new e("code point within a string may not be greater than 0xFFFFFFFF");
    return "\\" + w + t.repeat("0", A - f.length) + f;
  }
  function q(p) {
    this.schema = p.schema || r, this.indent = Math.max(1, p.indent || 2), this.noArrayIndent = p.noArrayIndent || !1, this.skipInvalid = p.skipInvalid || !1, this.flowLevel = t.isNothing(p.flowLevel) ? -1 : p.flowLevel, this.styleMap = fe(this.schema, p.styles || null), this.sortKeys = p.sortKeys || !1, this.lineWidth = p.lineWidth || 80, this.noRefs = p.noRefs || !1, this.noCompatMode = p.noCompatMode || !1, this.condenseFlow = p.condenseFlow || !1, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
  }
  function X(p, f) {
    for (var w = t.repeat(" ", f), A = 0, P = -1, R = "", E, Z = p.length; A < Z; )
      P = p.indexOf(`
`, A), P === -1 ? (E = p.slice(A), A = Z) : (E = p.slice(A, P + 1), A = P + 1), E.length && E !== `
` && (R += w), R += E;
    return R;
  }
  function re(p, f) {
    return `
` + t.repeat(" ", p.indent * f);
  }
  function $(p, f) {
    var w, A, P;
    for (w = 0, A = p.implicitTypes.length; w < A; w += 1)
      if (P = p.implicitTypes[w], P.resolve(f))
        return !0;
    return !1;
  }
  function Q(p) {
    return p === d || p === s;
  }
  function ee(p) {
    return 32 <= p && p <= 126 || 161 <= p && p <= 55295 && p !== 8232 && p !== 8233 || 57344 <= p && p <= 65533 && p !== 65279 || 65536 <= p && p <= 1114111;
  }
  function te(p) {
    return ee(p) && !Q(p) && p !== 65279 && p !== c && p !== l;
  }
  function J(p, f) {
    return ee(p) && p !== 65279 && p !== N && p !== M && p !== F && p !== W && p !== le && p !== g && (p !== h || f && te(f));
  }
  function ne(p) {
    return ee(p) && p !== 65279 && !Q(p) && p !== b && p !== D && p !== g && p !== N && p !== M && p !== F && p !== W && p !== le && p !== h && p !== v && p !== I && p !== u && p !== Y && p !== C && p !== _ && p !== T && p !== m && p !== y && p !== L && p !== U;
  }
  function ae(p) {
    var f = /^\n* /;
    return f.test(p);
  }
  var de = 1, he = 2, ue = 3, se = 4, pe = 5;
  function me(p, f, w, A, P) {
    var R, E, Z, O = !1, V = !1, H = A !== -1, B = -1, K = ne(p.charCodeAt(0)) && !Q(p.charCodeAt(p.length - 1));
    if (f)
      for (R = 0; R < p.length; R++) {
        if (E = p.charCodeAt(R), !ee(E))
          return pe;
        Z = R > 0 ? p.charCodeAt(R - 1) : null, K = K && J(E, Z);
      }
    else {
      for (R = 0; R < p.length; R++) {
        if (E = p.charCodeAt(R), E === l)
          O = !0, H && (V = V || // Foldable line = too long, and not more-indented.
          R - B - 1 > A && p[B + 1] !== " ", B = R);
        else if (!ee(E))
          return pe;
        Z = R > 0 ? p.charCodeAt(R - 1) : null, K = K && J(E, Z);
      }
      V = V || H && R - B - 1 > A && p[B + 1] !== " ";
    }
    return !O && !V ? K && !P(p) ? de : he : w > 9 && ae(p) ? pe : V ? se : ue;
  }
  function Ae(p, f, w, A) {
    p.dump = (function() {
      if (f.length === 0)
        return "''";
      if (!p.noCompatMode && ie.indexOf(f) !== -1)
        return "'" + f + "'";
      var P = p.indent * Math.max(1, w), R = p.lineWidth === -1 ? -1 : Math.max(Math.min(p.lineWidth, 40), p.lineWidth - P), E = A || p.flowLevel > -1 && w >= p.flowLevel;
      function Z(O) {
        return $(p, O);
      }
      switch (me(f, E, p.indent, R, Z)) {
        case de:
          return f;
        case he:
          return "'" + f.replace(/'/g, "''") + "'";
        case ue:
          return "|" + ge(f, p.indent) + ye(X(f, P));
        case se:
          return ">" + ge(f, p.indent) + ye(X(Te(f, R), P));
        case pe:
          return '"' + ke(f) + '"';
        default:
          throw new e("impossible error: invalid scalar style");
      }
    })();
  }
  function ge(p, f) {
    var w = ae(p) ? String(f) : "", A = p[p.length - 1] === `
`, P = A && (p[p.length - 2] === `
` || p === `
`), R = P ? "+" : A ? "" : "-";
    return w + R + `
`;
  }
  function ye(p) {
    return p[p.length - 1] === `
` ? p.slice(0, -1) : p;
  }
  function Te(p, f) {
    for (var w = /(\n+)([^\n]*)/g, A = (function() {
      var V = p.indexOf(`
`);
      return V = V !== -1 ? V : p.length, w.lastIndex = V, oe(p.slice(0, V), f);
    })(), P = p[0] === `
` || p[0] === " ", R, E; E = w.exec(p); ) {
      var Z = E[1], O = E[2];
      R = O[0] === " ", A += Z + (!P && !R && O !== "" ? `
` : "") + oe(O, f), P = R;
    }
    return A;
  }
  function oe(p, f) {
    if (p === "" || p[0] === " ") return p;
    for (var w = / [^ ]/g, A, P = 0, R, E = 0, Z = 0, O = ""; A = w.exec(p); )
      Z = A.index, Z - P > f && (R = E > P ? E : Z, O += `
` + p.slice(P, R), P = R + 1), E = Z;
    return O += `
`, p.length - P > f && E > P ? O += p.slice(P, E) + `
` + p.slice(E + 1) : O += p.slice(P), O.slice(1);
  }
  function ke(p) {
    for (var f = "", w, A, P, R = 0; R < p.length; R++) {
      if (w = p.charCodeAt(R), w >= 55296 && w <= 56319 && (A = p.charCodeAt(R + 1), A >= 56320 && A <= 57343)) {
        f += ce((w - 55296) * 1024 + A - 56320 + 65536), R++;
        continue;
      }
      P = G[w], f += !P && ee(w) ? p[R] : P || ce(w);
    }
    return f;
  }
  function be(p, f, w) {
    var A = "", P = p.tag, R, E;
    for (R = 0, E = w.length; R < E; R += 1)
      o(p, f, w[R], !1, !1) && (R !== 0 && (A += "," + (p.condenseFlow ? "" : " ")), A += p.dump);
    p.tag = P, p.dump = "[" + A + "]";
  }
  function xe(p, f, w, A) {
    var P = "", R = p.tag, E, Z;
    for (E = 0, Z = w.length; E < Z; E += 1)
      o(p, f + 1, w[E], !0, !0) && ((!A || E !== 0) && (P += re(p, f)), p.dump && l === p.dump.charCodeAt(0) ? P += "-" : P += "- ", P += p.dump);
    p.tag = R, p.dump = P || "[]";
  }
  function ve(p, f, w) {
    var A = "", P = p.tag, R = Object.keys(w), E, Z, O, V, H;
    for (E = 0, Z = R.length; E < Z; E += 1)
      H = "", E !== 0 && (H += ", "), p.condenseFlow && (H += '"'), O = R[E], V = w[O], o(p, f, O, !1, !1) && (p.dump.length > 1024 && (H += "? "), H += p.dump + (p.condenseFlow ? '"' : "") + ":" + (p.condenseFlow ? "" : " "), o(p, f, V, !1, !1) && (H += p.dump, A += H));
    p.tag = P, p.dump = "{" + A + "}";
  }
  function _e(p, f, w, A) {
    var P = "", R = p.tag, E = Object.keys(w), Z, O, V, H, B, K;
    if (p.sortKeys === !0)
      E.sort();
    else if (typeof p.sortKeys == "function")
      E.sort(p.sortKeys);
    else if (p.sortKeys)
      throw new e("sortKeys must be a boolean or a function");
    for (Z = 0, O = E.length; Z < O; Z += 1)
      K = "", (!A || Z !== 0) && (K += re(p, f)), V = E[Z], H = w[V], o(p, f + 1, V, !0, !0, !0) && (B = p.tag !== null && p.tag !== "?" || p.dump && p.dump.length > 1024, B && (p.dump && l === p.dump.charCodeAt(0) ? K += "?" : K += "? "), K += p.dump, B && (K += re(p, f)), o(p, f + 1, H, !0, B) && (p.dump && l === p.dump.charCodeAt(0) ? K += ":" : K += ": ", K += p.dump, P += K));
    p.tag = R, p.dump = P || "{}";
  }
  function we(p, f, w) {
    var A, P, R, E, Z, O;
    for (P = w ? p.explicitTypes : p.implicitTypes, R = 0, E = P.length; R < E; R += 1)
      if (Z = P[R], (Z.instanceOf || Z.predicate) && (!Z.instanceOf || typeof f == "object" && f instanceof Z.instanceOf) && (!Z.predicate || Z.predicate(f))) {
        if (p.tag = w ? Z.tag : "?", Z.represent) {
          if (O = p.styleMap[Z.tag] || Z.defaultStyle, a.call(Z.represent) === "[object Function]")
            A = Z.represent(f, O);
          else if (i.call(Z.represent, O))
            A = Z.represent[O](f, O);
          else
            throw new e("!<" + Z.tag + '> tag resolver accepts not "' + O + '" style');
          p.dump = A;
        }
        return !0;
      }
    return !1;
  }
  function o(p, f, w, A, P, R) {
    p.tag = null, p.dump = w, we(p, w, !1) || we(p, w, !0);
    var E = a.call(p.dump);
    A && (A = p.flowLevel < 0 || p.flowLevel > f);
    var Z = E === "[object Object]" || E === "[object Array]", O, V;
    if (Z && (O = p.duplicates.indexOf(w), V = O !== -1), (p.tag !== null && p.tag !== "?" || V || p.indent !== 2 && f > 0) && (P = !1), V && p.usedDuplicates[O])
      p.dump = "*ref_" + O;
    else {
      if (Z && V && !p.usedDuplicates[O] && (p.usedDuplicates[O] = !0), E === "[object Object]")
        A && Object.keys(p.dump).length !== 0 ? (_e(p, f, p.dump, P), V && (p.dump = "&ref_" + O + p.dump)) : (ve(p, f, p.dump), V && (p.dump = "&ref_" + O + " " + p.dump));
      else if (E === "[object Array]") {
        var H = p.noArrayIndent && f > 0 ? f - 1 : f;
        A && p.dump.length !== 0 ? (xe(p, H, p.dump, P), V && (p.dump = "&ref_" + O + p.dump)) : (be(p, H, p.dump), V && (p.dump = "&ref_" + O + " " + p.dump));
      } else if (E === "[object String]")
        p.tag !== "?" && Ae(p, p.dump, f, R);
      else {
        if (p.skipInvalid) return !1;
        throw new e("unacceptable kind of an object to dump " + E);
      }
      p.tag !== null && p.tag !== "?" && (p.dump = "!<" + p.tag + "> " + p.dump);
    }
    return !0;
  }
  function x(p, f) {
    var w = [], A = [], P, R;
    for (k(p, w, A), P = 0, R = A.length; P < R; P += 1)
      f.duplicates.push(w[A[P]]);
    f.usedDuplicates = new Array(R);
  }
  function k(p, f, w) {
    var A, P, R;
    if (p !== null && typeof p == "object")
      if (P = f.indexOf(p), P !== -1)
        w.indexOf(P) === -1 && w.push(P);
      else if (f.push(p), Array.isArray(p))
        for (P = 0, R = p.length; P < R; P += 1)
          k(p[P], f, w);
      else
        for (A = Object.keys(p), P = 0, R = A.length; P < R; P += 1)
          k(p[A[P]], f, w);
  }
  function j(p, f) {
    f = f || {};
    var w = new q(f);
    return w.noRefs || x(p, w), o(w, 0, p, !0, !0) ? w.dump + `
` : "";
  }
  function S(p, f) {
    return j(p, t.extend({ schema: n }, f));
  }
  return dumper.dump = j, dumper.safeDump = S, dumper;
}
var hasRequiredJsYaml$1;
function requireJsYaml$1() {
  if (hasRequiredJsYaml$1) return jsYaml$1;
  hasRequiredJsYaml$1 = 1;
  var t = requireLoader(), e = requireDumper();
  function r(n) {
    return function() {
      throw new Error("Function " + n + " is deprecated and cannot be used.");
    };
  }
  return jsYaml$1.Type = requireType(), jsYaml$1.Schema = requireSchema(), jsYaml$1.FAILSAFE_SCHEMA = requireFailsafe(), jsYaml$1.JSON_SCHEMA = requireJson(), jsYaml$1.CORE_SCHEMA = requireCore(), jsYaml$1.DEFAULT_SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_FULL_SCHEMA = requireDefault_full(), jsYaml$1.load = t.load, jsYaml$1.loadAll = t.loadAll, jsYaml$1.safeLoad = t.safeLoad, jsYaml$1.safeLoadAll = t.safeLoadAll, jsYaml$1.dump = e.dump, jsYaml$1.safeDump = e.safeDump, jsYaml$1.YAMLException = requireException(), jsYaml$1.MINIMAL_SCHEMA = requireFailsafe(), jsYaml$1.SAFE_SCHEMA = requireDefault_safe(), jsYaml$1.DEFAULT_SCHEMA = requireDefault_full(), jsYaml$1.scan = r("scan"), jsYaml$1.parse = r("parse"), jsYaml$1.compose = r("compose"), jsYaml$1.addConstructor = r("addConstructor"), jsYaml$1;
}
var jsYaml, hasRequiredJsYaml;
function requireJsYaml() {
  if (hasRequiredJsYaml) return jsYaml;
  hasRequiredJsYaml = 1;
  var t = requireJsYaml$1();
  return jsYaml = t, jsYaml;
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
      stringify: function(t, e) {
        const r = Object.assign({ replacer: null, space: 2 }, e);
        return JSON.stringify(t, r.replacer, r.space);
      }
    }, engines.javascript = {
      parse: function parse(str, options, wrap) {
        try {
          return wrap !== !1 && (str = `(function() {
return ` + str.trim() + `;
}());`), eval(str) || {};
        } catch (t) {
          if (wrap !== !1 && /(unexpected|identifier)/i.test(t.message))
            return parse(str, options, !1);
          throw new SyntaxError(t);
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
  return hasRequiredStripBomString || (hasRequiredStripBomString = 1, stripBomString = function(t) {
    return typeof t == "string" && t.charAt(0) === "\uFEFF" ? t.slice(1) : t;
  }), stripBomString;
}
var hasRequiredUtils;
function requireUtils() {
  return hasRequiredUtils || (hasRequiredUtils = 1, (function(t) {
    const e = requireStripBomString(), r = requireKindOf();
    t.define = function(n, a, i) {
      Reflect.defineProperty(n, a, {
        enumerable: !1,
        configurable: !0,
        writable: !0,
        value: i
      });
    }, t.isBuffer = function(n) {
      return r(n) === "buffer";
    }, t.isObject = function(n) {
      return r(n) === "object";
    }, t.toBuffer = function(n) {
      return typeof n == "string" ? Buffer.from(n) : n;
    }, t.toString = function(n) {
      if (t.isBuffer(n)) return e(String(n));
      if (typeof n != "string")
        throw new TypeError("expected input to be a string or buffer");
      return e(n);
    }, t.arrayify = function(n) {
      return n ? Array.isArray(n) ? n : [n] : [];
    }, t.startsWith = function(n, a, i) {
      return typeof i != "number" && (i = a.length), n.slice(0, i) === a;
    };
  })(utils)), utils;
}
var defaults, hasRequiredDefaults;
function requireDefaults() {
  if (hasRequiredDefaults) return defaults;
  hasRequiredDefaults = 1;
  const t = requireEngines(), e = requireUtils();
  return defaults = function(r) {
    const n = Object.assign({}, r);
    return n.delimiters = e.arrayify(n.delims || n.delimiters || "---"), n.delimiters.length === 1 && n.delimiters.push(n.delimiters[0]), n.language = (n.language || n.lang || "yaml").toLowerCase(), n.engines = Object.assign({}, t, n.parsers, n.engines), n;
  }, defaults;
}
var engine, hasRequiredEngine;
function requireEngine() {
  if (hasRequiredEngine) return engine;
  hasRequiredEngine = 1, engine = function(e, r) {
    let n = r.engines[e] || r.engines[t(e)];
    if (typeof n > "u")
      throw new Error('gray-matter engine "' + e + '" is not registered');
    return typeof n == "function" && (n = { parse: n }), n;
  };
  function t(e) {
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
  const t = requireKindOf(), e = requireEngine(), r = requireDefaults();
  stringify = function(a, i, s) {
    if (i == null && s == null)
      switch (t(a)) {
        case "object":
          i = a.data, s = {};
          break;
        case "string":
          return a;
        default:
          throw new TypeError("expected file to be a string or object");
      }
    const l = a.content, c = r(s);
    if (i == null) {
      if (!c.data) return a;
      i = c.data;
    }
    const d = a.language || c.language, u = e(d, c);
    if (typeof u.stringify != "function")
      throw new TypeError('expected "' + d + '.stringify" to be a function');
    i = Object.assign({}, a.data, i);
    const m = c.delimiters[0], h = c.delimiters[1], y = u.stringify(i, s).trim();
    let v = "";
    return y !== "{}" && (v = n(m) + n(y) + n(h)), typeof a.excerpt == "string" && a.excerpt !== "" && l.indexOf(a.excerpt.trim()) === -1 && (v += n(a.excerpt) + n(h)), v + n(l);
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
  const t = requireDefaults();
  return excerpt = function(e, r) {
    const n = t(r);
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
  const t = requireKindOf(), e = requireStringify(), r = requireUtils();
  return toFile = function(n) {
    return t(n) !== "object" && (n = { content: n }), t(n.data) !== "object" && (n.data = {}), n.contents && n.content == null && (n.content = n.contents), r.define(n, "orig", r.toBuffer(n.content)), r.define(n, "language", n.language || ""), r.define(n, "matter", n.matter || ""), r.define(n, "stringify", function(a, i) {
      return i && i.language && (n.language = i.language), e(n, a, i);
    }), n.content = r.toString(n.content), n.isEmpty = !1, n.excerpt = "", n;
  }, toFile;
}
var parse, hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse;
  hasRequiredParse = 1;
  const t = requireEngine(), e = requireDefaults();
  return parse = function(r, n, a) {
    const i = e(a), s = t(r, i);
    if (typeof s.parse != "function")
      throw new TypeError('expected "' + r + '.parse" to be a function');
    return s.parse(n, i);
  }, parse;
}
var grayMatter, hasRequiredGrayMatter;
function requireGrayMatter() {
  if (hasRequiredGrayMatter) return grayMatter;
  hasRequiredGrayMatter = 1;
  const t = require$$0, e = requireSectionMatter(), r = requireDefaults(), n = requireStringify(), a = requireExcerpt(), i = requireEngines(), s = requireToFile(), l = requireParse(), c = requireUtils();
  function d(m, h) {
    if (m === "")
      return { data: {}, content: m, excerpt: "", orig: m };
    let y = s(m);
    const v = d.cache[y.content];
    if (!h) {
      if (v)
        return y = Object.assign({}, v), y.orig = v.orig, y;
      d.cache[y.content] = y;
    }
    return u(y, h);
  }
  function u(m, h) {
    const y = r(h), v = y.delimiters[0], T = `
` + y.delimiters[1];
    let I = m.content;
    y.language && (m.language = y.language);
    const N = v.length;
    if (!c.startsWith(I, v, N))
      return a(m, y), m;
    if (I.charAt(N) === v.slice(-1))
      return m;
    I = I.slice(N);
    const b = I.length, g = d.language(I, y);
    g.name && (m.language = g.name, I = I.slice(g.raw.length));
    let C = I.indexOf(T);
    return C === -1 && (C = b), m.matter = I.slice(0, C), m.matter.replace(/^\s*#[^\n]+/gm, "").trim() === "" ? (m.isEmpty = !0, m.empty = m.content, m.data = {}) : m.data = l(m.language, m.matter, y), C === b ? m.content = "" : (m.content = I.slice(C + T.length), m.content[0] === "\r" && (m.content = m.content.slice(1)), m.content[0] === `
` && (m.content = m.content.slice(1))), a(m, y), (y.sections === !0 || typeof y.section == "function") && e(m, y.section), m;
  }
  return d.engines = i, d.stringify = function(m, h, y) {
    return typeof m == "string" && (m = d(m, y)), n(m, h, y);
  }, d.read = function(m, h) {
    const y = t.readFileSync(m, "utf8"), v = d(y, h);
    return v.path = m, v;
  }, d.test = function(m, h) {
    return c.startsWith(m, r(h).delimiters[0]);
  }, d.language = function(m, h) {
    const v = r(h).delimiters[0];
    d.test(m) && (m = m.slice(v.length));
    const T = m.slice(0, m.search(/\r?\n/));
    return {
      raw: T,
      name: T ? T.trim() : ""
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
function changeDefaults(t) {
  _defaults = t;
}
var noopTest = { exec: () => null };
function edit(t, e = "") {
  let r = typeof t == "string" ? t : t.source;
  const n = {
    replace: (a, i) => {
      let s = typeof i == "string" ? i : i.source;
      return s = s.replace(other.caret, "$1"), r = r.replace(a, s), n;
    },
    getRegex: () => new RegExp(r, e)
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
  listItemRegex: (t) => new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`),
  nextBulletRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
  hrRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
  fencesBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}(?:\`\`\`|~~~)`),
  headingBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}#`),
  htmlBeginRegex: (t) => new RegExp(`^ {0,${Math.min(3, t - 1)}}<(?:[a-z].*>|!--)`, "i")
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
}, getEscapeReplacement = (t) => escapeReplacements[t];
function escape2(t, e) {
  if (e) {
    if (other.escapeTest.test(t))
      return t.replace(other.escapeReplace, getEscapeReplacement);
  } else if (other.escapeTestNoEncode.test(t))
    return t.replace(other.escapeReplaceNoEncode, getEscapeReplacement);
  return t;
}
function cleanUrl(t) {
  try {
    t = encodeURI(t).replace(other.percentDecode, "%");
  } catch {
    return null;
  }
  return t;
}
function splitCells(t, e) {
  const r = t.replace(other.findPipe, (i, s, l) => {
    let c = !1, d = s;
    for (; --d >= 0 && l[d] === "\\"; ) c = !c;
    return c ? "|" : " |";
  }), n = r.split(other.splitPipe);
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
function rtrim(t, e, r) {
  const n = t.length;
  if (n === 0)
    return "";
  let a = 0;
  for (; a < n && t.charAt(n - a - 1) === e; )
    a++;
  return t.slice(0, n - a);
}
function findClosingBracket(t, e) {
  if (t.indexOf(e[1]) === -1)
    return -1;
  let r = 0;
  for (let n = 0; n < t.length; n++)
    if (t[n] === "\\")
      n++;
    else if (t[n] === e[0])
      r++;
    else if (t[n] === e[1] && (r--, r < 0))
      return n;
  return r > 0 ? -2 : -1;
}
function outputLink(t, e, r, n, a) {
  const i = e.href, s = e.title || null, l = t[1].replace(a.other.outputLinkReplace, "$1");
  n.state.inLink = !0;
  const c = {
    type: t[0].charAt(0) === "!" ? "image" : "link",
    raw: r,
    href: i,
    title: s,
    text: l,
    tokens: n.inlineTokens(l)
  };
  return n.state.inLink = !1, c;
}
function indentCodeCompensation(t, e, r) {
  const n = t.match(r.other.indentCodeCompensation);
  if (n === null)
    return e;
  const a = n[1];
  return e.split(`
`).map((i) => {
    const s = i.match(r.other.beginningSpace);
    if (s === null)
      return i;
    const [l] = s;
    return l.length >= a.length ? i.slice(a.length) : i;
  }).join(`
`);
}
var _Tokenizer = class {
  options;
  rules;
  // set by the lexer
  lexer;
  // set by the lexer
  constructor(t) {
    this.options = t || _defaults;
  }
  space(t) {
    const e = this.rules.block.newline.exec(t);
    if (e && e[0].length > 0)
      return {
        type: "space",
        raw: e[0]
      };
  }
  code(t) {
    const e = this.rules.block.code.exec(t);
    if (e) {
      const r = e[0].replace(this.rules.other.codeRemoveIndent, "");
      return {
        type: "code",
        raw: e[0],
        codeBlockStyle: "indented",
        text: this.options.pedantic ? r : rtrim(r, `
`)
      };
    }
  }
  fences(t) {
    const e = this.rules.block.fences.exec(t);
    if (e) {
      const r = e[0], n = indentCodeCompensation(r, e[3] || "", this.rules);
      return {
        type: "code",
        raw: r,
        lang: e[2] ? e[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : e[2],
        text: n
      };
    }
  }
  heading(t) {
    const e = this.rules.block.heading.exec(t);
    if (e) {
      let r = e[2].trim();
      if (this.rules.other.endingHash.test(r)) {
        const n = rtrim(r, "#");
        (this.options.pedantic || !n || this.rules.other.endingSpaceChar.test(n)) && (r = n.trim());
      }
      return {
        type: "heading",
        raw: e[0],
        depth: e[1].length,
        text: r,
        tokens: this.lexer.inline(r)
      };
    }
  }
  hr(t) {
    const e = this.rules.block.hr.exec(t);
    if (e)
      return {
        type: "hr",
        raw: rtrim(e[0], `
`)
      };
  }
  blockquote(t) {
    const e = this.rules.block.blockquote.exec(t);
    if (e) {
      let r = rtrim(e[0], `
`).split(`
`), n = "", a = "";
      const i = [];
      for (; r.length > 0; ) {
        let s = !1;
        const l = [];
        let c;
        for (c = 0; c < r.length; c++)
          if (this.rules.other.blockquoteStart.test(r[c]))
            l.push(r[c]), s = !0;
          else if (!s)
            l.push(r[c]);
          else
            break;
        r = r.slice(c);
        const d = l.join(`
`), u = d.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        n = n ? `${n}
${d}` : d, a = a ? `${a}
${u}` : u;
        const m = this.lexer.state.top;
        if (this.lexer.state.top = !0, this.lexer.blockTokens(u, i, !0), this.lexer.state.top = m, r.length === 0)
          break;
        const h = i.at(-1);
        if (h?.type === "code")
          break;
        if (h?.type === "blockquote") {
          const y = h, v = y.raw + `
` + r.join(`
`), T = this.blockquote(v);
          i[i.length - 1] = T, n = n.substring(0, n.length - y.raw.length) + T.raw, a = a.substring(0, a.length - y.text.length) + T.text;
          break;
        } else if (h?.type === "list") {
          const y = h, v = y.raw + `
` + r.join(`
`), T = this.list(v);
          i[i.length - 1] = T, n = n.substring(0, n.length - h.raw.length) + T.raw, a = a.substring(0, a.length - y.raw.length) + T.raw, r = v.substring(i.at(-1).raw.length).split(`
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
  list(t) {
    let e = this.rules.block.list.exec(t);
    if (e) {
      let r = e[1].trim();
      const n = r.length > 1, a = {
        type: "list",
        raw: "",
        ordered: n,
        start: n ? +r.slice(0, -1) : "",
        loose: !1,
        items: []
      };
      r = n ? `\\d{1,9}\\${r.slice(-1)}` : `\\${r}`, this.options.pedantic && (r = n ? r : "[*+-]");
      const i = this.rules.other.listItemRegex(r);
      let s = !1;
      for (; t; ) {
        let c = !1, d = "", u = "";
        if (!(e = i.exec(t)) || this.rules.block.hr.test(t))
          break;
        d = e[0], t = t.substring(d.length);
        let m = e[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (N) => " ".repeat(3 * N.length)), h = t.split(`
`, 1)[0], y = !m.trim(), v = 0;
        if (this.options.pedantic ? (v = 2, u = m.trimStart()) : y ? v = e[1].length + 1 : (v = e[2].search(this.rules.other.nonSpaceChar), v = v > 4 ? 1 : v, u = m.slice(v), v += e[1].length), y && this.rules.other.blankLine.test(h) && (d += h + `
`, t = t.substring(h.length + 1), c = !0), !c) {
          const N = this.rules.other.nextBulletRegex(v), b = this.rules.other.hrRegex(v), g = this.rules.other.fencesBeginRegex(v), C = this.rules.other.headingBeginRegex(v), _ = this.rules.other.htmlBeginRegex(v);
          for (; t; ) {
            const D = t.split(`
`, 1)[0];
            let L;
            if (h = D, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), L = h) : L = h.replace(this.rules.other.tabCharGlobal, "    "), g.test(h) || C.test(h) || _.test(h) || N.test(h) || b.test(h))
              break;
            if (L.search(this.rules.other.nonSpaceChar) >= v || !h.trim())
              u += `
` + L.slice(v);
            else {
              if (y || m.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || g.test(m) || C.test(m) || b.test(m))
                break;
              u += `
` + h;
            }
            !y && !h.trim() && (y = !0), d += D + `
`, t = t.substring(D.length + 1), m = L.slice(v);
          }
        }
        a.loose || (s ? a.loose = !0 : this.rules.other.doubleBlankLine.test(d) && (s = !0));
        let T = null, I;
        this.options.gfm && (T = this.rules.other.listIsTask.exec(u), T && (I = T[0] !== "[ ] ", u = u.replace(this.rules.other.listReplaceTask, ""))), a.items.push({
          type: "list_item",
          raw: d,
          task: !!T,
          checked: I,
          loose: !1,
          text: u,
          tokens: []
        }), a.raw += d;
      }
      const l = a.items.at(-1);
      if (l)
        l.raw = l.raw.trimEnd(), l.text = l.text.trimEnd();
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
  html(t) {
    const e = this.rules.block.html.exec(t);
    if (e)
      return {
        type: "html",
        block: !0,
        raw: e[0],
        pre: e[1] === "pre" || e[1] === "script" || e[1] === "style",
        text: e[0]
      };
  }
  def(t) {
    const e = this.rules.block.def.exec(t);
    if (e) {
      const r = e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), n = e[2] ? e[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", a = e[3] ? e[3].substring(1, e[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : e[3];
      return {
        type: "def",
        tag: r,
        raw: e[0],
        href: n,
        title: a
      };
    }
  }
  table(t) {
    const e = this.rules.block.table.exec(t);
    if (!e || !this.rules.other.tableDelimiter.test(e[2]))
      return;
    const r = splitCells(e[1]), n = e[2].replace(this.rules.other.tableAlignChars, "").split("|"), a = e[3]?.trim() ? e[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], i = {
      type: "table",
      raw: e[0],
      header: [],
      align: [],
      rows: []
    };
    if (r.length === n.length) {
      for (const s of n)
        this.rules.other.tableAlignRight.test(s) ? i.align.push("right") : this.rules.other.tableAlignCenter.test(s) ? i.align.push("center") : this.rules.other.tableAlignLeft.test(s) ? i.align.push("left") : i.align.push(null);
      for (let s = 0; s < r.length; s++)
        i.header.push({
          text: r[s],
          tokens: this.lexer.inline(r[s]),
          header: !0,
          align: i.align[s]
        });
      for (const s of a)
        i.rows.push(splitCells(s, i.header.length).map((l, c) => ({
          text: l,
          tokens: this.lexer.inline(l),
          header: !1,
          align: i.align[c]
        })));
      return i;
    }
  }
  lheading(t) {
    const e = this.rules.block.lheading.exec(t);
    if (e)
      return {
        type: "heading",
        raw: e[0],
        depth: e[2].charAt(0) === "=" ? 1 : 2,
        text: e[1],
        tokens: this.lexer.inline(e[1])
      };
  }
  paragraph(t) {
    const e = this.rules.block.paragraph.exec(t);
    if (e) {
      const r = e[1].charAt(e[1].length - 1) === `
` ? e[1].slice(0, -1) : e[1];
      return {
        type: "paragraph",
        raw: e[0],
        text: r,
        tokens: this.lexer.inline(r)
      };
    }
  }
  text(t) {
    const e = this.rules.block.text.exec(t);
    if (e)
      return {
        type: "text",
        raw: e[0],
        text: e[0],
        tokens: this.lexer.inline(e[0])
      };
  }
  escape(t) {
    const e = this.rules.inline.escape.exec(t);
    if (e)
      return {
        type: "escape",
        raw: e[0],
        text: e[1]
      };
  }
  tag(t) {
    const e = this.rules.inline.tag.exec(t);
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
  link(t) {
    const e = this.rules.inline.link.exec(t);
    if (e) {
      const r = e[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(r)) {
        if (!this.rules.other.endAngleBracket.test(r))
          return;
        const i = rtrim(r.slice(0, -1), "\\");
        if ((r.length - i.length) % 2 === 0)
          return;
      } else {
        const i = findClosingBracket(e[2], "()");
        if (i === -2)
          return;
        if (i > -1) {
          const l = (e[0].indexOf("!") === 0 ? 5 : 4) + e[1].length + i;
          e[2] = e[2].substring(0, i), e[0] = e[0].substring(0, l).trim(), e[3] = "";
        }
      }
      let n = e[2], a = "";
      if (this.options.pedantic) {
        const i = this.rules.other.pedanticHrefTitle.exec(n);
        i && (n = i[1], a = i[3]);
      } else
        a = e[3] ? e[3].slice(1, -1) : "";
      return n = n.trim(), this.rules.other.startAngleBracket.test(n) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(r) ? n = n.slice(1) : n = n.slice(1, -1)), outputLink(e, {
        href: n && n.replace(this.rules.inline.anyPunctuation, "$1"),
        title: a && a.replace(this.rules.inline.anyPunctuation, "$1")
      }, e[0], this.lexer, this.rules);
    }
  }
  reflink(t, e) {
    let r;
    if ((r = this.rules.inline.reflink.exec(t)) || (r = this.rules.inline.nolink.exec(t))) {
      const n = (r[2] || r[1]).replace(this.rules.other.multipleSpaceGlobal, " "), a = e[n.toLowerCase()];
      if (!a) {
        const i = r[0].charAt(0);
        return {
          type: "text",
          raw: i,
          text: i
        };
      }
      return outputLink(r, a, r[0], this.lexer, this.rules);
    }
  }
  emStrong(t, e, r = "") {
    let n = this.rules.inline.emStrongLDelim.exec(t);
    if (!n || n[3] && r.match(this.rules.other.unicodeAlphaNumeric)) return;
    if (!(n[1] || n[2] || "") || !r || this.rules.inline.punctuation.exec(r)) {
      const i = [...n[0]].length - 1;
      let s, l, c = i, d = 0;
      const u = n[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (u.lastIndex = 0, e = e.slice(-1 * t.length + i); (n = u.exec(e)) != null; ) {
        if (s = n[1] || n[2] || n[3] || n[4] || n[5] || n[6], !s) continue;
        if (l = [...s].length, n[3] || n[4]) {
          c += l;
          continue;
        } else if ((n[5] || n[6]) && i % 3 && !((i + l) % 3)) {
          d += l;
          continue;
        }
        if (c -= l, c > 0) continue;
        l = Math.min(l, l + c + d);
        const m = [...n[0]][0].length, h = t.slice(0, i + n.index + m + l);
        if (Math.min(i, l) % 2) {
          const v = h.slice(1, -1);
          return {
            type: "em",
            raw: h,
            text: v,
            tokens: this.lexer.inlineTokens(v)
          };
        }
        const y = h.slice(2, -2);
        return {
          type: "strong",
          raw: h,
          text: y,
          tokens: this.lexer.inlineTokens(y)
        };
      }
    }
  }
  codespan(t) {
    const e = this.rules.inline.code.exec(t);
    if (e) {
      let r = e[2].replace(this.rules.other.newLineCharGlobal, " ");
      const n = this.rules.other.nonSpaceChar.test(r), a = this.rules.other.startingSpaceChar.test(r) && this.rules.other.endingSpaceChar.test(r);
      return n && a && (r = r.substring(1, r.length - 1)), {
        type: "codespan",
        raw: e[0],
        text: r
      };
    }
  }
  br(t) {
    const e = this.rules.inline.br.exec(t);
    if (e)
      return {
        type: "br",
        raw: e[0]
      };
  }
  del(t) {
    const e = this.rules.inline.del.exec(t);
    if (e)
      return {
        type: "del",
        raw: e[0],
        text: e[2],
        tokens: this.lexer.inlineTokens(e[2])
      };
  }
  autolink(t) {
    const e = this.rules.inline.autolink.exec(t);
    if (e) {
      let r, n;
      return e[2] === "@" ? (r = e[1], n = "mailto:" + r) : (r = e[1], n = r), {
        type: "link",
        raw: e[0],
        text: r,
        href: n,
        tokens: [
          {
            type: "text",
            raw: r,
            text: r
          }
        ]
      };
    }
  }
  url(t) {
    let e;
    if (e = this.rules.inline.url.exec(t)) {
      let r, n;
      if (e[2] === "@")
        r = e[0], n = "mailto:" + r;
      else {
        let a;
        do
          a = e[0], e[0] = this.rules.inline._backpedal.exec(e[0])?.[0] ?? "";
        while (a !== e[0]);
        r = e[0], e[1] === "www." ? n = "http://" + e[0] : n = e[0];
      }
      return {
        type: "link",
        raw: e[0],
        text: r,
        href: n,
        tokens: [
          {
            type: "text",
            raw: r,
            text: r
          }
        ]
      };
    }
  }
  inlineText(t) {
    const e = this.rules.inline.text.exec(t);
    if (e) {
      const r = this.lexer.state.inRawBlock;
      return {
        type: "text",
        raw: e[0],
        text: e[0],
        escaped: r
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
    const r = {
      other,
      block: block.normal,
      inline: inline.normal
    };
    this.options.pedantic ? (r.block = block.pedantic, r.inline = inline.pedantic) : this.options.gfm && (r.block = block.gfm, this.options.breaks ? r.inline = inline.breaks : r.inline = inline.gfm), this.tokenizer.rules = r;
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
  static lex(e, r) {
    return new Se(r).lex(e);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(e, r) {
    return new Se(r).inlineTokens(e);
  }
  /**
   * Preprocessing
   */
  lex(e) {
    e = e.replace(other.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let r = 0; r < this.inlineQueue.length; r++) {
      const n = this.inlineQueue[r];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, r = [], n = !1) {
    for (this.options.pedantic && (e = e.replace(other.tabCharGlobal, "    ").replace(other.spaceLine, "")); e; ) {
      let a;
      if (this.options.extensions?.block?.some((s) => (a = s.call({ lexer: this }, e, r)) ? (e = e.substring(a.raw.length), r.push(a), !0) : !1))
        continue;
      if (a = this.tokenizer.space(e)) {
        e = e.substring(a.raw.length);
        const s = r.at(-1);
        a.raw.length === 1 && s !== void 0 ? s.raw += `
` : r.push(a);
        continue;
      }
      if (a = this.tokenizer.code(e)) {
        e = e.substring(a.raw.length);
        const s = r.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.at(-1).src = s.text) : r.push(a);
        continue;
      }
      if (a = this.tokenizer.fences(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.heading(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.hr(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.blockquote(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.list(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.html(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.def(e)) {
        e = e.substring(a.raw.length);
        const s = r.at(-1);
        s?.type === "paragraph" || s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[a.tag] || (this.tokens.links[a.tag] = {
          href: a.href,
          title: a.title
        });
        continue;
      }
      if (a = this.tokenizer.table(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      if (a = this.tokenizer.lheading(e)) {
        e = e.substring(a.raw.length), r.push(a);
        continue;
      }
      let i = e;
      if (this.options.extensions?.startBlock) {
        let s = 1 / 0;
        const l = e.slice(1);
        let c;
        this.options.extensions.startBlock.forEach((d) => {
          c = d.call({ lexer: this }, l), typeof c == "number" && c >= 0 && (s = Math.min(s, c));
        }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
      }
      if (this.state.top && (a = this.tokenizer.paragraph(i))) {
        const s = r.at(-1);
        n && s?.type === "paragraph" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : r.push(a), n = i.length !== e.length, e = e.substring(a.raw.length);
        continue;
      }
      if (a = this.tokenizer.text(e)) {
        e = e.substring(a.raw.length);
        const s = r.at(-1);
        s?.type === "text" ? (s.raw += `
` + a.raw, s.text += `
` + a.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : r.push(a);
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
    return this.state.top = !0, r;
  }
  inline(e, r = []) {
    return this.inlineQueue.push({ src: e, tokens: r }), r;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(e, r = []) {
    let n = e, a = null;
    if (this.tokens.links) {
      const l = Object.keys(this.tokens.links);
      if (l.length > 0)
        for (; (a = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
          l.includes(a[0].slice(a[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
    }
    for (; (a = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
      n = n.slice(0, a.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
    for (; (a = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
      n = n.slice(0, a.index) + "[" + "a".repeat(a[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    let i = !1, s = "";
    for (; e; ) {
      i || (s = ""), i = !1;
      let l;
      if (this.options.extensions?.inline?.some((d) => (l = d.call({ lexer: this }, e, r)) ? (e = e.substring(l.raw.length), r.push(l), !0) : !1))
        continue;
      if (l = this.tokenizer.escape(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.tag(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.link(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(l.raw.length);
        const d = r.at(-1);
        l.type === "text" && d?.type === "text" ? (d.raw += l.raw, d.text += l.text) : r.push(l);
        continue;
      }
      if (l = this.tokenizer.emStrong(e, n, s)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.codespan(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.br(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.del(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (l = this.tokenizer.autolink(e)) {
        e = e.substring(l.raw.length), r.push(l);
        continue;
      }
      if (!this.state.inLink && (l = this.tokenizer.url(e))) {
        e = e.substring(l.raw.length), r.push(l);
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
      if (l = this.tokenizer.inlineText(c)) {
        e = e.substring(l.raw.length), l.raw.slice(-1) !== "_" && (s = l.raw.slice(-1)), i = !0;
        const d = r.at(-1);
        d?.type === "text" ? (d.raw += l.raw, d.text += l.text) : r.push(l);
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
    return r;
  }
}, _Renderer = class {
  options;
  parser;
  // set by the parser
  constructor(t) {
    this.options = t || _defaults;
  }
  space(t) {
    return "";
  }
  code({ text: t, lang: e, escaped: r }) {
    const n = (e || "").match(other.notSpaceStart)?.[0], a = t.replace(other.endingNewline, "") + `
`;
    return n ? '<pre><code class="language-' + escape2(n) + '">' + (r ? a : escape2(a, !0)) + `</code></pre>
` : "<pre><code>" + (r ? a : escape2(a, !0)) + `</code></pre>
`;
  }
  blockquote({ tokens: t }) {
    return `<blockquote>
${this.parser.parse(t)}</blockquote>
`;
  }
  html({ text: t }) {
    return t;
  }
  heading({ tokens: t, depth: e }) {
    return `<h${e}>${this.parser.parseInline(t)}</h${e}>
`;
  }
  hr(t) {
    return `<hr>
`;
  }
  list(t) {
    const e = t.ordered, r = t.start;
    let n = "";
    for (let s = 0; s < t.items.length; s++) {
      const l = t.items[s];
      n += this.listitem(l);
    }
    const a = e ? "ol" : "ul", i = e && r !== 1 ? ' start="' + r + '"' : "";
    return "<" + a + i + `>
` + n + "</" + a + `>
`;
  }
  listitem(t) {
    let e = "";
    if (t.task) {
      const r = this.checkbox({ checked: !!t.checked });
      t.loose ? t.tokens[0]?.type === "paragraph" ? (t.tokens[0].text = r + " " + t.tokens[0].text, t.tokens[0].tokens && t.tokens[0].tokens.length > 0 && t.tokens[0].tokens[0].type === "text" && (t.tokens[0].tokens[0].text = r + " " + escape2(t.tokens[0].tokens[0].text), t.tokens[0].tokens[0].escaped = !0)) : t.tokens.unshift({
        type: "text",
        raw: r + " ",
        text: r + " ",
        escaped: !0
      }) : e += r + " ";
    }
    return e += this.parser.parse(t.tokens, !!t.loose), `<li>${e}</li>
`;
  }
  checkbox({ checked: t }) {
    return "<input " + (t ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
  }
  paragraph({ tokens: t }) {
    return `<p>${this.parser.parseInline(t)}</p>
`;
  }
  table(t) {
    let e = "", r = "";
    for (let a = 0; a < t.header.length; a++)
      r += this.tablecell(t.header[a]);
    e += this.tablerow({ text: r });
    let n = "";
    for (let a = 0; a < t.rows.length; a++) {
      const i = t.rows[a];
      r = "";
      for (let s = 0; s < i.length; s++)
        r += this.tablecell(i[s]);
      n += this.tablerow({ text: r });
    }
    return n && (n = `<tbody>${n}</tbody>`), `<table>
<thead>
` + e + `</thead>
` + n + `</table>
`;
  }
  tablerow({ text: t }) {
    return `<tr>
${t}</tr>
`;
  }
  tablecell(t) {
    const e = this.parser.parseInline(t.tokens), r = t.header ? "th" : "td";
    return (t.align ? `<${r} align="${t.align}">` : `<${r}>`) + e + `</${r}>
`;
  }
  /**
   * span level renderer
   */
  strong({ tokens: t }) {
    return `<strong>${this.parser.parseInline(t)}</strong>`;
  }
  em({ tokens: t }) {
    return `<em>${this.parser.parseInline(t)}</em>`;
  }
  codespan({ text: t }) {
    return `<code>${escape2(t, !0)}</code>`;
  }
  br(t) {
    return "<br>";
  }
  del({ tokens: t }) {
    return `<del>${this.parser.parseInline(t)}</del>`;
  }
  link({ href: t, title: e, tokens: r }) {
    const n = this.parser.parseInline(r), a = cleanUrl(t);
    if (a === null)
      return n;
    t = a;
    let i = '<a href="' + t + '"';
    return e && (i += ' title="' + escape2(e) + '"'), i += ">" + n + "</a>", i;
  }
  image({ href: t, title: e, text: r, tokens: n }) {
    n && (r = this.parser.parseInline(n, this.parser.textRenderer));
    const a = cleanUrl(t);
    if (a === null)
      return escape2(r);
    t = a;
    let i = `<img src="${t}" alt="${r}"`;
    return e && (i += ` title="${escape2(e)}"`), i += ">", i;
  }
  text(t) {
    return "tokens" in t && t.tokens ? this.parser.parseInline(t.tokens) : "escaped" in t && t.escaped ? t.text : escape2(t.text);
  }
}, _TextRenderer = class {
  // no need for block level renderers
  strong({ text: t }) {
    return t;
  }
  em({ text: t }) {
    return t;
  }
  codespan({ text: t }) {
    return t;
  }
  del({ text: t }) {
    return t;
  }
  html({ text: t }) {
    return t;
  }
  text({ text: t }) {
    return t;
  }
  link({ text: t }) {
    return "" + t;
  }
  image({ text: t }) {
    return "" + t;
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
  static parse(e, r) {
    return new Pe(r).parse(e);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(e, r) {
    return new Pe(r).parseInline(e);
  }
  /**
   * Parse Loop
   */
  parse(e, r = !0) {
    let n = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const l = i, c = this.options.extensions.renderers[l.type].call({ parser: this }, l);
        if (c !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(l.type)) {
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
          let l = s, c = this.renderer.text(l);
          for (; a + 1 < e.length && e[a + 1].type === "text"; )
            l = e[++a], c += `
` + this.renderer.text(l);
          r ? n += this.renderer.paragraph({
            type: "paragraph",
            raw: c,
            text: c,
            tokens: [{ type: "text", raw: c, text: c, escaped: !0 }]
          }) : n += c;
          continue;
        }
        default: {
          const l = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(l), "";
          throw new Error(l);
        }
      }
    }
    return n;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(e, r = this.renderer) {
    let n = "";
    for (let a = 0; a < e.length; a++) {
      const i = e[a];
      if (this.options.extensions?.renderers?.[i.type]) {
        const l = this.options.extensions.renderers[i.type].call({ parser: this }, i);
        if (l !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
          n += l || "";
          continue;
        }
      }
      const s = i;
      switch (s.type) {
        case "escape": {
          n += r.text(s);
          break;
        }
        case "html": {
          n += r.html(s);
          break;
        }
        case "link": {
          n += r.link(s);
          break;
        }
        case "image": {
          n += r.image(s);
          break;
        }
        case "strong": {
          n += r.strong(s);
          break;
        }
        case "em": {
          n += r.em(s);
          break;
        }
        case "codespan": {
          n += r.codespan(s);
          break;
        }
        case "br": {
          n += r.br(s);
          break;
        }
        case "del": {
          n += r.del(s);
          break;
        }
        case "text": {
          n += r.text(s);
          break;
        }
        default: {
          const l = 'Token with "' + s.type + '" type was not found.';
          if (this.options.silent)
            return console.error(l), "";
          throw new Error(l);
        }
      }
    }
    return n;
  }
}, _Hooks = class {
  options;
  block;
  constructor(t) {
    this.options = t || _defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess",
    "processAllTokens"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(t) {
    return t;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(t) {
    return t;
  }
  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(t) {
    return t;
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
  constructor(...t) {
    this.use(...t);
  }
  /**
   * Run callback for every token
   */
  walkTokens(t, e) {
    let r = [];
    for (const n of t)
      switch (r = r.concat(e.call(this, n)), n.type) {
        case "table": {
          const a = n;
          for (const i of a.header)
            r = r.concat(this.walkTokens(i.tokens, e));
          for (const i of a.rows)
            for (const s of i)
              r = r.concat(this.walkTokens(s.tokens, e));
          break;
        }
        case "list": {
          const a = n;
          r = r.concat(this.walkTokens(a.items, e));
          break;
        }
        default: {
          const a = n;
          this.defaults.extensions?.childTokens?.[a.type] ? this.defaults.extensions.childTokens[a.type].forEach((i) => {
            const s = a[i].flat(1 / 0);
            r = r.concat(this.walkTokens(s, e));
          }) : a.tokens && (r = r.concat(this.walkTokens(a.tokens, e)));
        }
      }
    return r;
  }
  use(...t) {
    const e = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return t.forEach((r) => {
      const n = { ...r };
      if (n.async = this.defaults.async || n.async || !1, r.extensions && (r.extensions.forEach((a) => {
        if (!a.name)
          throw new Error("extension name required");
        if ("renderer" in a) {
          const i = e.renderers[a.name];
          i ? e.renderers[a.name] = function(...s) {
            let l = a.renderer.apply(this, s);
            return l === !1 && (l = i.apply(this, s)), l;
          } : e.renderers[a.name] = a.renderer;
        }
        if ("tokenizer" in a) {
          if (!a.level || a.level !== "block" && a.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          const i = e[a.level];
          i ? i.unshift(a.tokenizer) : e[a.level] = [a.tokenizer], a.start && (a.level === "block" ? e.startBlock ? e.startBlock.push(a.start) : e.startBlock = [a.start] : a.level === "inline" && (e.startInline ? e.startInline.push(a.start) : e.startInline = [a.start]));
        }
        "childTokens" in a && a.childTokens && (e.childTokens[a.name] = a.childTokens);
      }), n.extensions = e), r.renderer) {
        const a = this.defaults.renderer || new _Renderer(this.defaults);
        for (const i in r.renderer) {
          if (!(i in a))
            throw new Error(`renderer '${i}' does not exist`);
          if (["options", "parser"].includes(i))
            continue;
          const s = i, l = r.renderer[s], c = a[s];
          a[s] = (...d) => {
            let u = l.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u || "";
          };
        }
        n.renderer = a;
      }
      if (r.tokenizer) {
        const a = this.defaults.tokenizer || new _Tokenizer(this.defaults);
        for (const i in r.tokenizer) {
          if (!(i in a))
            throw new Error(`tokenizer '${i}' does not exist`);
          if (["options", "rules", "lexer"].includes(i))
            continue;
          const s = i, l = r.tokenizer[s], c = a[s];
          a[s] = (...d) => {
            let u = l.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u;
          };
        }
        n.tokenizer = a;
      }
      if (r.hooks) {
        const a = this.defaults.hooks || new _Hooks();
        for (const i in r.hooks) {
          if (!(i in a))
            throw new Error(`hook '${i}' does not exist`);
          if (["options", "block"].includes(i))
            continue;
          const s = i, l = r.hooks[s], c = a[s];
          _Hooks.passThroughHooks.has(i) ? a[s] = (d) => {
            if (this.defaults.async)
              return Promise.resolve(l.call(a, d)).then((m) => c.call(a, m));
            const u = l.call(a, d);
            return c.call(a, u);
          } : a[s] = (...d) => {
            let u = l.apply(a, d);
            return u === !1 && (u = c.apply(a, d)), u;
          };
        }
        n.hooks = a;
      }
      if (r.walkTokens) {
        const a = this.defaults.walkTokens, i = r.walkTokens;
        n.walkTokens = function(s) {
          let l = [];
          return l.push(i.call(this, s)), a && (l = l.concat(a.call(this, s))), l;
        };
      }
      this.defaults = { ...this.defaults, ...n };
    }), this;
  }
  setOptions(t) {
    return this.defaults = { ...this.defaults, ...t }, this;
  }
  lexer(t, e) {
    return _Lexer.lex(t, e ?? this.defaults);
  }
  parser(t, e) {
    return _Parser.parse(t, e ?? this.defaults);
  }
  parseMarkdown(t) {
    return (r, n) => {
      const a = { ...n }, i = { ...this.defaults, ...a }, s = this.onError(!!i.silent, !!i.async);
      if (this.defaults.async === !0 && a.async === !1)
        return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof r > "u" || r === null)
        return s(new Error("marked(): input parameter is undefined or null"));
      if (typeof r != "string")
        return s(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(r) + ", string expected"));
      i.hooks && (i.hooks.options = i, i.hooks.block = t);
      const l = i.hooks ? i.hooks.provideLexer() : t ? _Lexer.lex : _Lexer.lexInline, c = i.hooks ? i.hooks.provideParser() : t ? _Parser.parse : _Parser.parseInline;
      if (i.async)
        return Promise.resolve(i.hooks ? i.hooks.preprocess(r) : r).then((d) => l(d, i)).then((d) => i.hooks ? i.hooks.processAllTokens(d) : d).then((d) => i.walkTokens ? Promise.all(this.walkTokens(d, i.walkTokens)).then(() => d) : d).then((d) => c(d, i)).then((d) => i.hooks ? i.hooks.postprocess(d) : d).catch(s);
      try {
        i.hooks && (r = i.hooks.preprocess(r));
        let d = l(r, i);
        i.hooks && (d = i.hooks.processAllTokens(d)), i.walkTokens && this.walkTokens(d, i.walkTokens);
        let u = c(d, i);
        return i.hooks && (u = i.hooks.postprocess(u)), u;
      } catch (d) {
        return s(d);
      }
    };
  }
  onError(t, e) {
    return (r) => {
      if (r.message += `
Please report this to https://github.com/markedjs/marked.`, t) {
        const n = "<p>An error occurred:</p><pre>" + escape2(r.message + "", !0) + "</pre>";
        return e ? Promise.resolve(n) : n;
      }
      if (e)
        return Promise.reject(r);
      throw r;
    };
  }
}, markedInstance = new Marked();
function marked(t, e) {
  return markedInstance.parse(t, e);
}
marked.options = marked.setOptions = function(t) {
  return markedInstance.setOptions(t), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.getDefaults = _getDefaults;
marked.defaults = _defaults;
marked.use = function(...t) {
  return markedInstance.use(...t), marked.defaults = markedInstance.defaults, changeDefaults(marked.defaults), marked;
};
marked.walkTokens = function(t, e) {
  return markedInstance.walkTokens(t, e);
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
  return hasRequiredPrism || (hasRequiredPrism = 1, (function(t) {
    var e = typeof window < "u" ? window : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? self : {};
    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     *
     * @license MIT <https://opensource.org/licenses/MIT>
     * @author Lea Verou <https://lea.verou.me>
     * @namespace
     * @public
     */
    var r = (function(n) {
      var a = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i, i = 0, s = {}, l = {
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
          encode: function b(g) {
            return g instanceof c ? new c(g.type, b(g.content), g.alias) : Array.isArray(g) ? g.map(b) : g.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
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
          clone: function b(g, C) {
            C = C || {};
            var _, D;
            switch (l.util.type(g)) {
              case "Object":
                if (D = l.util.objId(g), C[D])
                  return C[D];
                _ = /** @type {Record<string, any>} */
                {}, C[D] = _;
                for (var L in g)
                  g.hasOwnProperty(L) && (_[L] = b(g[L], C));
                return (
                  /** @type {any} */
                  _
                );
              case "Array":
                return D = l.util.objId(g), C[D] ? C[D] : (_ = [], C[D] = _, /** @type {Array} */
                /** @type {any} */
                g.forEach(function(M, F) {
                  _[F] = b(M, C);
                }), /** @type {any} */
                _);
              default:
                return g;
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
              var g = a.exec(b.className);
              if (g)
                return g[1].toLowerCase();
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
          setLanguage: function(b, g) {
            b.className = b.className.replace(RegExp(a, "gi"), ""), b.classList.add("language-" + g);
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
                var g = document.getElementsByTagName("script");
                for (var C in g)
                  if (g[C].src == b)
                    return g[C];
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
          isActive: function(b, g, C) {
            for (var _ = "no-" + g; b; ) {
              var D = b.classList;
              if (D.contains(g))
                return !0;
              if (D.contains(_))
                return !1;
              b = b.parentElement;
            }
            return !!C;
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
          extend: function(b, g) {
            var C = l.util.clone(l.languages[b]);
            for (var _ in g)
              C[_] = g[_];
            return C;
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
          insertBefore: function(b, g, C, _) {
            _ = _ || /** @type {any} */
            l.languages;
            var D = _[b], L = {};
            for (var M in D)
              if (D.hasOwnProperty(M)) {
                if (M == g)
                  for (var F in C)
                    C.hasOwnProperty(F) && (L[F] = C[F]);
                C.hasOwnProperty(M) || (L[M] = D[M]);
              }
            var U = _[b];
            return _[b] = L, l.languages.DFS(l.languages, function(W, Y) {
              Y === U && W != b && (this[W] = L);
            }), L;
          },
          // Traverse a language definition with Depth First Search
          DFS: function b(g, C, _, D) {
            D = D || {};
            var L = l.util.objId;
            for (var M in g)
              if (g.hasOwnProperty(M)) {
                C.call(g, M, g[M], _ || M);
                var F = g[M], U = l.util.type(F);
                U === "Object" && !D[L(F)] ? (D[L(F)] = !0, b(F, C, null, D)) : U === "Array" && !D[L(F)] && (D[L(F)] = !0, b(F, C, M, D));
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
        highlightAll: function(b, g) {
          l.highlightAllUnder(document, b, g);
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
        highlightAllUnder: function(b, g, C) {
          var _ = {
            callback: C,
            container: b,
            selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
          };
          l.hooks.run("before-highlightall", _), _.elements = Array.prototype.slice.apply(_.container.querySelectorAll(_.selector)), l.hooks.run("before-all-elements-highlight", _);
          for (var D = 0, L; L = _.elements[D++]; )
            l.highlightElement(L, g === !0, _.callback);
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
        highlightElement: function(b, g, C) {
          var _ = l.util.getLanguage(b), D = l.languages[_];
          l.util.setLanguage(b, _);
          var L = b.parentElement;
          L && L.nodeName.toLowerCase() === "pre" && l.util.setLanguage(L, _);
          var M = b.textContent, F = {
            element: b,
            language: _,
            grammar: D,
            code: M
          };
          function U(Y) {
            F.highlightedCode = Y, l.hooks.run("before-insert", F), F.element.innerHTML = F.highlightedCode, l.hooks.run("after-highlight", F), l.hooks.run("complete", F), C && C.call(F.element);
          }
          if (l.hooks.run("before-sanity-check", F), L = F.element.parentElement, L && L.nodeName.toLowerCase() === "pre" && !L.hasAttribute("tabindex") && L.setAttribute("tabindex", "0"), !F.code) {
            l.hooks.run("complete", F), C && C.call(F.element);
            return;
          }
          if (l.hooks.run("before-highlight", F), !F.grammar) {
            U(l.util.encode(F.code));
            return;
          }
          if (g && n.Worker) {
            var W = new Worker(l.filename);
            W.onmessage = function(Y) {
              U(Y.data);
            }, W.postMessage(JSON.stringify({
              language: F.language,
              code: F.code,
              immediateClose: !0
            }));
          } else
            U(l.highlight(F.code, F.grammar, F.language));
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
        highlight: function(b, g, C) {
          var _ = {
            code: b,
            grammar: g,
            language: C
          };
          if (l.hooks.run("before-tokenize", _), !_.grammar)
            throw new Error('The language "' + _.language + '" has no grammar.');
          return _.tokens = l.tokenize(_.code, _.grammar), l.hooks.run("after-tokenize", _), c.stringify(l.util.encode(_.tokens), _.language);
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
        tokenize: function(b, g) {
          var C = g.rest;
          if (C) {
            for (var _ in C)
              g[_] = C[_];
            delete g.rest;
          }
          var D = new m();
          return h(D, D.head, b), u(b, D, g, D.head, 0), v(D);
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
          add: function(b, g) {
            var C = l.hooks.all;
            C[b] = C[b] || [], C[b].push(g);
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
          run: function(b, g) {
            var C = l.hooks.all[b];
            if (!(!C || !C.length))
              for (var _ = 0, D; D = C[_++]; )
                D(g);
          }
        },
        Token: c
      };
      n.Prism = l;
      function c(b, g, C, _) {
        this.type = b, this.content = g, this.alias = C, this.length = (_ || "").length | 0;
      }
      c.stringify = function b(g, C) {
        if (typeof g == "string")
          return g;
        if (Array.isArray(g)) {
          var _ = "";
          return g.forEach(function(U) {
            _ += b(U, C);
          }), _;
        }
        var D = {
          type: g.type,
          content: b(g.content, C),
          tag: "span",
          classes: ["token", g.type],
          attributes: {},
          language: C
        }, L = g.alias;
        L && (Array.isArray(L) ? Array.prototype.push.apply(D.classes, L) : D.classes.push(L)), l.hooks.run("wrap", D);
        var M = "";
        for (var F in D.attributes)
          M += " " + F + '="' + (D.attributes[F] || "").replace(/"/g, "&quot;") + '"';
        return "<" + D.tag + ' class="' + D.classes.join(" ") + '"' + M + ">" + D.content + "</" + D.tag + ">";
      };
      function d(b, g, C, _) {
        b.lastIndex = g;
        var D = b.exec(C);
        if (D && _ && D[1]) {
          var L = D[1].length;
          D.index += L, D[0] = D[0].slice(L);
        }
        return D;
      }
      function u(b, g, C, _, D, L) {
        for (var M in C)
          if (!(!C.hasOwnProperty(M) || !C[M])) {
            var F = C[M];
            F = Array.isArray(F) ? F : [F];
            for (var U = 0; U < F.length; ++U) {
              if (L && L.cause == M + "," + U)
                return;
              var W = F[U], Y = W.inside, le = !!W.lookbehind, G = !!W.greedy, ie = W.alias;
              if (G && !W.pattern.global) {
                var fe = W.pattern.toString().match(/[imsuy]*$/)[0];
                W.pattern = RegExp(W.pattern.source, fe + "g");
              }
              for (var ce = W.pattern || W, q = _.next, X = D; q !== g.tail && !(L && X >= L.reach); X += q.value.length, q = q.next) {
                var re = q.value;
                if (g.length > b.length)
                  return;
                if (!(re instanceof c)) {
                  var $ = 1, Q;
                  if (G) {
                    if (Q = d(ce, X, b, le), !Q || Q.index >= b.length)
                      break;
                    var ne = Q.index, ee = Q.index + Q[0].length, te = X;
                    for (te += q.value.length; ne >= te; )
                      q = q.next, te += q.value.length;
                    if (te -= q.value.length, X = te, q.value instanceof c)
                      continue;
                    for (var J = q; J !== g.tail && (te < ee || typeof J.value == "string"); J = J.next)
                      $++, te += J.value.length;
                    $--, re = b.slice(X, te), Q.index -= X;
                  } else if (Q = d(ce, 0, re, le), !Q)
                    continue;
                  var ne = Q.index, ae = Q[0], de = re.slice(0, ne), he = re.slice(ne + ae.length), ue = X + re.length;
                  L && ue > L.reach && (L.reach = ue);
                  var se = q.prev;
                  de && (se = h(g, se, de), X += de.length), y(g, se, $);
                  var pe = new c(M, Y ? l.tokenize(ae, Y) : ae, ie, ae);
                  if (q = h(g, se, pe), he && h(g, q, he), $ > 1) {
                    var me = {
                      cause: M + "," + U,
                      reach: ue
                    };
                    u(b, g, C, q.prev, X, me), L && me.reach > L.reach && (L.reach = me.reach);
                  }
                }
              }
            }
          }
      }
      function m() {
        var b = { value: null, prev: null, next: null }, g = { value: null, prev: b, next: null };
        b.next = g, this.head = b, this.tail = g, this.length = 0;
      }
      function h(b, g, C) {
        var _ = g.next, D = { value: C, prev: g, next: _ };
        return g.next = D, _.prev = D, b.length++, D;
      }
      function y(b, g, C) {
        for (var _ = g.next, D = 0; D < C && _ !== b.tail; D++)
          _ = _.next;
        g.next = _, _.prev = g, b.length -= D;
      }
      function v(b) {
        for (var g = [], C = b.head.next; C !== b.tail; )
          g.push(C.value), C = C.next;
        return g;
      }
      if (!n.document)
        return n.addEventListener && (l.disableWorkerMessageHandler || n.addEventListener("message", function(b) {
          var g = JSON.parse(b.data), C = g.language, _ = g.code, D = g.immediateClose;
          n.postMessage(l.highlight(_, l.languages[C], C)), D && n.close();
        }, !1)), l;
      var T = l.util.currentScript();
      T && (l.filename = T.src, T.hasAttribute("data-manual") && (l.manual = !0));
      function I() {
        l.manual || l.highlightAll();
      }
      if (!l.manual) {
        var N = document.readyState;
        N === "loading" || N === "interactive" && T && T.defer ? document.addEventListener("DOMContentLoaded", I) : window.requestAnimationFrame ? window.requestAnimationFrame(I) : window.setTimeout(I, 16);
      }
      return l;
    })(e);
    t.exports && (t.exports = r), typeof commonjsGlobal < "u" && (commonjsGlobal.Prism = r), r.languages.markup = {
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
    }, r.languages.markup.tag.inside["attr-value"].inside.entity = r.languages.markup.entity, r.languages.markup.doctype.inside["internal-subset"].inside = r.languages.markup, r.hooks.add("wrap", function(n) {
      n.type === "entity" && (n.attributes.title = n.content.replace(/&amp;/, "&"));
    }), Object.defineProperty(r.languages.markup.tag, "addInlined", {
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
          inside: r.languages[i]
        }, s.cdata = /^<!\[CDATA\[|\]\]>$/i;
        var l = {
          "included-cdata": {
            pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
            inside: s
          }
        };
        l["language-" + i] = {
          pattern: /[\s\S]+/,
          inside: r.languages[i]
        };
        var c = {};
        c[a] = {
          pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function() {
            return a;
          }), "i"),
          lookbehind: !0,
          greedy: !0,
          inside: l
        }, r.languages.insertBefore("markup", "cdata", c);
      }
    }), Object.defineProperty(r.languages.markup.tag, "addAttribute", {
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
        r.languages.markup.tag.inside["special-attr"].push({
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
                  inside: r.languages[a]
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
    }), r.languages.html = r.languages.markup, r.languages.mathml = r.languages.markup, r.languages.svg = r.languages.markup, r.languages.xml = r.languages.extend("markup", {}), r.languages.ssml = r.languages.xml, r.languages.atom = r.languages.xml, r.languages.rss = r.languages.xml, (function(n) {
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
    })(r), r.languages.clike = {
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
    }, r.languages.javascript = r.languages.extend("clike", {
      "class-name": [
        r.languages.clike["class-name"],
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
    }), r.languages.javascript["class-name"][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/, r.languages.insertBefore("javascript", "keyword", {
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
            inside: r.languages.regex
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
          inside: r.languages.javascript
        },
        {
          pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
          lookbehind: !0,
          inside: r.languages.javascript
        },
        {
          pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
          lookbehind: !0,
          inside: r.languages.javascript
        },
        {
          pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
          lookbehind: !0,
          inside: r.languages.javascript
        }
      ],
      constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    }), r.languages.insertBefore("javascript", "string", {
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
              rest: r.languages.javascript
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
    }), r.languages.insertBefore("javascript", "operator", {
      "literal-property": {
        pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
        lookbehind: !0,
        alias: "property"
      }
    }), r.languages.markup && (r.languages.markup.tag.addInlined("script", "javascript"), r.languages.markup.tag.addAttribute(
      /on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
      "javascript"
    )), r.languages.js = r.languages.javascript, (function() {
      if (typeof r > "u" || typeof document > "u")
        return;
      Element.prototype.matches || (Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
      var n = "Loading…", a = function(T, I) {
        return "✖ Error " + T + " while fetching file: " + I;
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
      }, l = "data-src-status", c = "loading", d = "loaded", u = "failed", m = "pre[data-src]:not([" + l + '="' + d + '"]):not([' + l + '="' + c + '"])';
      function h(T, I, N) {
        var b = new XMLHttpRequest();
        b.open("GET", T, !0), b.onreadystatechange = function() {
          b.readyState == 4 && (b.status < 400 && b.responseText ? I(b.responseText) : b.status >= 400 ? N(a(b.status, b.statusText)) : N(i));
        }, b.send(null);
      }
      function y(T) {
        var I = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(T || "");
        if (I) {
          var N = Number(I[1]), b = I[2], g = I[3];
          return b ? g ? [N, Number(g)] : [N, void 0] : [N, N];
        }
      }
      r.hooks.add("before-highlightall", function(T) {
        T.selector += ", " + m;
      }), r.hooks.add("before-sanity-check", function(T) {
        var I = (
          /** @type {HTMLPreElement} */
          T.element
        );
        if (I.matches(m)) {
          T.code = "", I.setAttribute(l, c);
          var N = I.appendChild(document.createElement("CODE"));
          N.textContent = n;
          var b = I.getAttribute("data-src"), g = T.language;
          if (g === "none") {
            var C = (/\.(\w+)$/.exec(b) || [, "none"])[1];
            g = s[C] || C;
          }
          r.util.setLanguage(N, g), r.util.setLanguage(I, g);
          var _ = r.plugins.autoloader;
          _ && _.loadLanguages(g), h(
            b,
            function(D) {
              I.setAttribute(l, d);
              var L = y(I.getAttribute("data-range"));
              if (L) {
                var M = D.split(/\r\n?|\n/g), F = L[0], U = L[1] == null ? M.length : L[1];
                F < 0 && (F += M.length), F = Math.max(0, Math.min(F - 1, M.length)), U < 0 && (U += M.length), U = Math.max(0, Math.min(U, M.length)), D = M.slice(F, U).join(`
`), I.hasAttribute("data-start") || I.setAttribute("data-start", String(F + 1));
              }
              N.textContent = D, r.highlightElement(N);
            },
            function(D) {
              I.setAttribute(l, u), N.textContent = D;
            }
          );
        }
      }), r.plugins.fileHighlight = {
        /**
         * Executes the File Highlight plugin for all matching `pre` elements under the given container.
         *
         * Note: Elements which are already loaded or currently loading will not be touched by this method.
         *
         * @param {ParentNode} [container=document]
         */
        highlight: function(I) {
          for (var N = (I || document).querySelectorAll(m), b = 0, g; g = N[b++]; )
            r.highlightElement(g);
        }
      };
      var v = !1;
      r.fileHighlight = function() {
        v || (console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."), v = !0), r.plugins.fileHighlight.highlight.apply(this, arguments);
      };
    })();
  })(prism)), prism.exports;
}
var prismExports = requirePrism();
const Prism$1 = /* @__PURE__ */ getDefaultExportFromCjs(prismExports);
(function(t) {
  var e = "\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b", r = {
    pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
    lookbehind: !0,
    alias: "punctuation",
    // this looks reasonably well in all themes
    inside: null
    // see below
  }, n = {
    bash: r,
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
  t.languages.bash = {
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
          bash: r
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
  }, r.inside = t.languages.bash;
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
    i[a[s]] = t.languages.bash[a[s]];
  t.languages.sh = t.languages.bash, t.languages.shell = t.languages.bash;
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
  return hasRequiredPrismTypescript || (hasRequiredPrismTypescript = 1, (function(t) {
    t.languages.typescript = t.languages.extend("javascript", {
      "class-name": {
        pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
        lookbehind: !0,
        greedy: !0,
        inside: null
        // see below
      },
      builtin: /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/
    }), t.languages.typescript.keyword.push(
      /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
      // keywords that have to be followed by an identifier
      /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
      // This is for `import type *, {}`
      /\btype\b(?=\s*(?:[\{*]|$))/
    ), delete t.languages.typescript.parameter, delete t.languages.typescript["literal-property"];
    var e = t.languages.extend("typescript", {});
    delete e["class-name"], t.languages.typescript["class-name"].inside = e, t.languages.insertBefore("typescript", "function", {
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
    }), t.languages.ts = t.languages.typescript;
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
(function(t) {
  var e = /[*&][^\s[\]{},]+/, r = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/, n = "(?:" + r.source + "(?:[ 	]+" + e.source + ")?|" + e.source + "(?:[ 	]+" + r.source + ")?)", a = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source.replace(/<PLAIN>/g, function() {
    return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source;
  }), i = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
  function s(l, c) {
    c = (c || "").replace(/m/g, "") + "m";
    var d = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source.replace(/<<prop>>/g, function() {
      return n;
    }).replace(/<<value>>/g, function() {
      return l;
    });
    return RegExp(d, c);
  }
  t.languages.yaml = {
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
    tag: r,
    important: e,
    punctuation: /---|[:[\]{}\-,|>?]|\.\.\./
  }, t.languages.yml = t.languages.yaml;
})(Prism);
(function(t) {
  var e = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;
  function r(u) {
    return u = u.replace(/<inner>/g, function() {
      return e;
    }), RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + "(?:" + u + ")");
  }
  var n = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source, a = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function() {
    return n;
  }), i = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;
  t.languages.markdown = t.languages.extend("markup", {}), t.languages.insertBefore("markdown", "prolog", {
    "front-matter-block": {
      pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
      lookbehind: !0,
      greedy: !0,
      inside: {
        punctuation: /^---|---$/,
        "front-matter": {
          pattern: /\S+(?:\s+\S+)*/,
          alias: ["yaml", "language-yaml"],
          inside: t.languages.yaml
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
              inside: t.languages.markdown
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
              inside: t.languages.markdown
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
      pattern: r(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),
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
      pattern: r(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),
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
      pattern: r(/(~~?)(?:(?!~)<inner>)+\2/.source),
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
      pattern: r(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),
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
      u !== m && (t.languages.markdown[u].inside.content.inside[m] = t.languages.markdown[m]);
    });
  }), t.hooks.add("after-tokenize", function(u) {
    if (u.language !== "markdown" && u.language !== "md")
      return;
    function m(h) {
      if (!(!h || typeof h == "string"))
        for (var y = 0, v = h.length; y < v; y++) {
          var T = h[y];
          if (T.type !== "code") {
            m(T.content);
            continue;
          }
          var I = T.content[1], N = T.content[3];
          if (I && N && I.type === "code-language" && N.type === "code-block" && typeof I.content == "string") {
            var b = I.content.replace(/\b#/g, "sharp").replace(/\b\+\+/g, "pp");
            b = (/[a-z][\w-]*/i.exec(b) || [""])[0].toLowerCase();
            var g = "language-" + b;
            N.alias ? typeof N.alias == "string" ? N.alias = [N.alias, g] : N.alias.push(g) : N.alias = [g];
          }
        }
    }
    m(u.tokens);
  }), t.hooks.add("wrap", function(u) {
    if (u.type === "code-block") {
      for (var m = "", h = 0, y = u.classes.length; h < y; h++) {
        var v = u.classes[h], T = /language-(.+)/.exec(v);
        if (T) {
          m = T[1];
          break;
        }
      }
      var I = t.languages[m];
      if (I)
        u.content = t.highlight(d(u.content), I, m);
      else if (m && m !== "none" && t.plugins.autoloader) {
        var N = "md-" + (/* @__PURE__ */ new Date()).valueOf() + "-" + Math.floor(Math.random() * 1e16);
        u.attributes.id = N, t.plugins.autoloader.loadLanguages(m, function() {
          var b = document.getElementById(N);
          b && (b.innerHTML = t.highlight(b.textContent, t.languages[m], m));
        });
      }
    }
  });
  var s = RegExp(t.languages.markup.tag.pattern.source, "gi"), l = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"'
  }, c = String.fromCodePoint || String.fromCharCode;
  function d(u) {
    var m = u.replace(s, "");
    return m = m.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function(h, y) {
      if (y = y.toLowerCase(), y[0] === "#") {
        var v;
        return y[1] === "x" ? v = parseInt(y.slice(2), 16) : v = Number(y.slice(1)), c(v);
      } else {
        var T = l[y];
        return T || h;
      }
    }), m;
  }
  t.languages.md = t.languages.markdown;
})(Prism);
(function(t) {
  var e = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;
  t.languages.css = {
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
  }, t.languages.css.atrule.inside.rest = t.languages.css;
  var r = t.languages.markup;
  r && (r.tag.addInlined("style", "css"), r.tag.addAttribute("style", "css"));
})(Prism);
(function(t) {
  var e = t.util.clone(t.languages.javascript), r = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source, n = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source, a = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;
  function i(c, d) {
    return c = c.replace(/<S>/g, function() {
      return r;
    }).replace(/<BRACES>/g, function() {
      return n;
    }).replace(/<SPREAD>/g, function() {
      return a;
    }), RegExp(c, d);
  }
  a = i(a).source, t.languages.jsx = t.languages.extend("markup", e), t.languages.jsx.tag.pattern = i(
    /<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
  ), t.languages.jsx.tag.inside.tag.pattern = /^<\/?[^\s>\/]*/, t.languages.jsx.tag.inside["attr-value"].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/, t.languages.jsx.tag.inside.tag.inside["class-name"] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/, t.languages.jsx.tag.inside.comment = e.comment, t.languages.insertBefore("inside", "attr-name", {
    spread: {
      pattern: i(/<SPREAD>/.source),
      inside: t.languages.jsx
    }
  }, t.languages.jsx.tag), t.languages.insertBefore("inside", "special-attr", {
    script: {
      // Allow for two levels of nesting
      pattern: i(/=<BRACES>/.source),
      alias: "language-javascript",
      inside: {
        "script-punctuation": {
          pattern: /^=(?=\{)/,
          alias: "punctuation"
        },
        rest: t.languages.jsx
      }
    }
  }, t.languages.jsx.tag);
  var s = function(c) {
    return c ? typeof c == "string" ? c : typeof c.content == "string" ? c.content : c.content.map(s).join("") : "";
  }, l = function(c) {
    for (var d = [], u = 0; u < c.length; u++) {
      var m = c[u], h = !1;
      if (typeof m != "string" && (m.type === "tag" && m.content[0] && m.content[0].type === "tag" ? m.content[0].content[0].content === "</" ? d.length > 0 && d[d.length - 1].tagName === s(m.content[0].content[1]) && d.pop() : m.content[m.content.length - 1].content === "/>" || d.push({
        tagName: s(m.content[0].content[1]),
        openedBraces: 0
      }) : d.length > 0 && m.type === "punctuation" && m.content === "{" ? d[d.length - 1].openedBraces++ : d.length > 0 && d[d.length - 1].openedBraces > 0 && m.type === "punctuation" && m.content === "}" ? d[d.length - 1].openedBraces-- : h = !0), (h || typeof m == "string") && d.length > 0 && d[d.length - 1].openedBraces === 0) {
        var y = s(m);
        u < c.length - 1 && (typeof c[u + 1] == "string" || c[u + 1].type === "plain-text") && (y += s(c[u + 1]), c.splice(u + 1, 1)), u > 0 && (typeof c[u - 1] == "string" || c[u - 1].type === "plain-text") && (y = s(c[u - 1]) + y, c.splice(u - 1, 1), u--), c[u] = new t.Token("plain-text", y, null, y);
      }
      m.content && typeof m.content != "string" && l(m.content);
    }
  };
  t.hooks.add("after-tokenize", function(c) {
    c.language !== "jsx" && c.language !== "tsx" || l(c.tokens);
  });
})(Prism);
(function(t) {
  var e = t.util.clone(t.languages.typescript);
  t.languages.tsx = t.languages.extend("jsx", e), delete t.languages.tsx.parameter, delete t.languages.tsx["literal-property"];
  var r = t.languages.tsx.tag;
  r.pattern = RegExp(/(^|[^\w$]|(?=<\/))/.source + "(?:" + r.pattern.source + ")", r.pattern.flags), r.lookbehind = !0;
})(Prism);
function slugify(t) {
  return t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function escapeHtml(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function parseMarkdown(t) {
  const e = [], r = /* @__PURE__ */ new Map(), n = new marked.Renderer();
  n.heading = ({ tokens: l, depth: c, text: d }) => {
    let u = slugify(d);
    u || (u = `heading-${c}`);
    let m = u;
    const h = r.get(u) || 0;
    h > 0 && (m = `${u}-${h}`), r.set(u, h + 1), c >= 2 && c <= 4 && e.push({
      id: m,
      text: d.replace(/<[^>]*>/g, ""),
      level: c
    });
    const y = `<a href="#${m}" class="heading-anchor" aria-label="Link to ${escapeHtml(d)}">#</a>`;
    return `<h${c} id="${m}" class="doc-heading doc-h${c}"><span>${d}</span>${y}</h${c}>
`;
  }, n.code = ({ text: l, lang: c }) => {
    const d = (c || "").trim().toLowerCase();
    if (d === "mermaid")
      return `<div class="mermaid-block">
      <pre class="mermaid">${escapeHtml(l)}</pre>
    </div>
`;
    let u = escapeHtml(l);
    if (d && Prism$1.languages[d])
      try {
        u = Prism$1.highlight(l, Prism$1.languages[d], d);
      } catch {
        u = escapeHtml(l);
      }
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        ${d ? `<span class="code-lang">${d}</span>` : ""}
        <button class="copy-code-btn" type="button" title="Copy code" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>
      </div>
      <pre class="language-${d || "plaintext"}"><code class="language-${d || "plaintext"}">${u}</code></pre>
    </div>
`;
  }, n.table = ({ header: l, rows: c }) => {
    const d = l.map((m) => `<th>${marked.parseInline(m.text)}</th>`).join(""), u = c.map((m) => `<tr>${m.map((h) => `<td>${marked.parseInline(h.text)}</td>`).join("")}</tr>`).join("");
    return `<div class="table-container"><table><thead><tr>${d}</tr></thead><tbody>${u}</tbody></table></div>
`;
  };
  const a = /> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)+)/gi, i = t.replace(a, (l, c, d) => {
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
function formatCategoryName(t) {
  return t.replace(/^\d+-/, "").split("-").map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function parseOrderPrefix(t, e) {
  const r = t.match(/^(\d+)-/);
  return r ? parseInt(r[1], 10) : e;
}
function cleanSlugPart(t) {
  return t.replace(/^\d+-/, "").replace(/\.md$/, "").toLowerCase();
}
const markdownFiles = /* @__PURE__ */ Object.assign({
  "../../content/docs/03-api/01-overview.md": __vite_glob_0_0,
  "../../content/docs/03-api/02-collection-payment.md": __vite_glob_0_1,
  "../../content/docs/03-api/03-qr-payment.md": __vite_glob_0_2,
  "../../content/docs/03-api/04-callbacks-and-redirects.md": __vite_glob_0_3
});
let cachedStaticDocs = null;
function initializeStaticDocs() {
  if (cachedStaticDocs) return cachedStaticDocs;
  const t = [];
  for (const [r, n] of Object.entries(markdownFiles)) {
    const i = r.replace(/\\/g, "/").split("/content/docs/")[1]?.split("/");
    if (!i || i.length === 0) continue;
    let s = "", l = "";
    i.length === 1 ? (s = "00-general", l = i[0]) : (s = i[0], l = i.slice(1).join("/"));
    const c = parseOrderPrefix(s, 99), d = parseOrderPrefix(l.split("/").pop() || "", 99);
    t.push({
      categoryFolder: s,
      fileSlug: l,
      categoryOrder: c,
      fileOrder: d,
      content: n
    });
  }
  const e = [];
  for (const r of t) {
    const n = matter(r.content), a = n.data || {}, { html: i, headings: s } = parseMarkdown(n.content), l = cleanSlugPart(r.categoryFolder), c = cleanSlugPart(r.fileSlug), u = a.slug?.replace(/^\//, "") || `${l}/${c}`, m = a.category || formatCategoryName(r.categoryFolder), h = a.title || s[0]?.text || c, y = typeof a.order == "number" ? a.order : r.fileOrder, v = a.author || a.owner || "Docs Team", T = a.updatedAt || a.lastUpdated || "2026-08-19";
    e.push({
      slug: u,
      category: m,
      categorySlug: l,
      categoryOrder: r.categoryOrder,
      title: h,
      description: a.description || "",
      order: y,
      rawContent: n.content,
      htmlContent: i,
      headings: s,
      author: v,
      updatedAt: T
    });
  }
  return cachedStaticDocs = e, e;
}
function getAllStaticDocs() {
  return initializeStaticDocs();
}
async function getMergedDocs(t) {
  const e = await t.getDocs(), r = /* @__PURE__ */ new Map();
  for (const i of e) {
    const s = i.categorySlug || cleanSlugPart(i.category);
    r.has(s) || r.set(s, {
      title: i.category,
      slug: s,
      order: i.categoryOrder || 99,
      items: []
    }), r.get(s).items.push(i);
  }
  const n = Array.from(r.values()).sort((i, s) => i.order - s.order), a = [];
  for (const i of n)
    i.items.sort((s, l) => s.order - l.order), a.push(...i.items);
  for (let i = 0; i < a.length; i++) {
    const s = a[i];
    if (i > 0) {
      const l = a[i - 1];
      s.prevDoc = { slug: l.slug, title: l.title };
    } else
      s.prevDoc = void 0;
    if (i < a.length - 1) {
      const l = a[i + 1];
      s.nextDoc = { slug: l.slug, title: l.title };
    } else
      s.nextDoc = void 0;
  }
  return a;
}
async function getMergedDocBySlug(t, e) {
  return (await getMergedDocs(t)).find((n) => n.slug === e || n.slug.endsWith(`/${e}`));
}
async function getMergedNavigation(t) {
  const e = await getMergedDocs(t), r = /* @__PURE__ */ new Map();
  for (const n of e) {
    const a = n.categorySlug || cleanSlugPart(n.category);
    r.has(a) || r.set(a, {
      title: n.category,
      slug: a,
      order: n.categoryOrder || 99,
      items: []
    }), r.get(a).items.push({
      title: n.title,
      slug: n.slug,
      description: n.description,
      order: n.order
    });
  }
  return Array.from(r.values()).sort((n, a) => n.order - a.order);
}
async function getMergedSearchIndex(t) {
  return (await getMergedDocs(t)).map((r) => {
    const n = r.rawContent.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[#*_-]/g, " ").replace(/\s+/g, " ").trim();
    return {
      slug: r.slug,
      title: r.title,
      category: r.category,
      description: r.description,
      contentSnippet: n.slice(0, 200),
      author: r.author,
      updatedAt: r.updatedAt
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
    for (const r of e)
      this.docsMap.set(r.slug, {
        ...r,
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
    const e = await this.kv.list({ prefix: this.DOC_PREFIX }), r = getAllStaticDocs(), n = /* @__PURE__ */ new Map();
    for (const a of r)
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
    const r = await this.kv.get(`${this.DOC_PREFIX}${e}`);
    if (r)
      try {
        return JSON.parse(r);
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
    const r = await this.kv.get(`${this.SPEC_PREFIX}${e}`);
    if (r)
      try {
        return JSON.parse(r);
      } catch {
        return;
      }
  }
  async getAllOpenAPISpecs() {
    const e = await this.kv.list({ prefix: this.SPEC_PREFIX }), r = [];
    for (const n of e.keys) {
      const a = await this.kv.get(n.name);
      if (a)
        try {
          r.push(JSON.parse(a));
        } catch {
        }
    }
    return r;
  }
  async saveOpenAPISpec(e) {
    await this.kv.put(`${this.SPEC_PREFIX}${e.id}`, JSON.stringify(e));
  }
  async deleteOpenAPISpec(e) {
    return await this.kv.delete(`${this.SPEC_PREFIX}${e}`), !0;
  }
}
const defaultMemoryStorage = new MemoryStorageProvider();
function getStorage(t) {
  return t && t.DOCS_KV ? new KVStorageProvider(t.DOCS_KV) : defaultMemoryStorage;
}
function formatDate$3(t) {
  if (!t) return "Recently";
  try {
    const e = new Date(t);
    return isNaN(e.getTime()) ? t : e.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return t;
  }
}
const DocPage = ({ doc: t, navigation: e }) => /* @__PURE__ */ jsxDEV(
  Layout,
  {
    title: t.title,
    description: t.description || `Read ${t.title} on the documentation site.`,
    activePath: `/docs/${t.slug}`,
    children: /* @__PURE__ */ jsxDEV("div", { class: "docs-container", children: [
      /* @__PURE__ */ jsxDEV("aside", { class: "sidebar", children: e.map((r) => /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "sidebar-group-title", children: r.title }),
        /* @__PURE__ */ jsxDEV("ul", { class: "sidebar-menu", children: r.items.map((n) => {
          const a = n.slug === t.slug;
          return /* @__PURE__ */ jsxDEV("li", { class: "sidebar-item", children: /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${n.slug}`,
              class: `sidebar-link ${a ? "active" : ""}`,
              children: n.title
            }
          ) }, n.slug);
        }) })
      ] }, r.slug)) }),
      /* @__PURE__ */ jsxDEV("main", { class: "content-area", children: [
        /* @__PURE__ */ jsxDEV("nav", { class: "breadcrumbs", "aria-label": "Breadcrumb", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/docs", children: "Docs" }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { children: t.category }),
          /* @__PURE__ */ jsxDEV("span", { class: "breadcrumb-separator", children: "/" }),
          /* @__PURE__ */ jsxDEV("span", { style: "color: var(--text-primary); font-weight: 500;", children: t.title })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 1.5rem; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap;", children: [
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "👤" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Owner: ",
              /* @__PURE__ */ jsxDEV("strong", { style: "color: var(--text-primary);", children: t.author || "Docs Team" })
            ] })
          ] }),
          /* @__PURE__ */ jsxDEV("div", { style: "display: inline-flex; align-items: center; gap: 0.35rem;", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "🕒" }),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "Last updated: ",
              /* @__PURE__ */ jsxDEV("time", { datetime: t.updatedAt || "", style: "color: var(--text-primary); font-weight: 500;", children: formatDate$3(t.updatedAt) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("article", { class: "doc-prose", children: /* @__PURE__ */ jsxDEV("div", { dangerouslySetInnerHTML: { __html: t.htmlContent } }) }),
        (t.prevDoc || t.nextDoc) && /* @__PURE__ */ jsxDEV("div", { class: "docs-pagination", children: [
          t.prevDoc ? /* @__PURE__ */ jsxDEV("a", { href: `/docs/${t.prevDoc.slug}`, class: "pagination-card prev", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "← Previous" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: t.prevDoc.title })
          ] }) : /* @__PURE__ */ jsxDEV("div", {}),
          t.nextDoc && /* @__PURE__ */ jsxDEV("a", { href: `/docs/${t.nextDoc.slug}`, class: "pagination-card next", children: [
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-label", children: "Next →" }),
            /* @__PURE__ */ jsxDEV("span", { class: "pagination-title", children: t.nextDoc.title })
          ] })
        ] })
      ] }),
      t.headings && t.headings.length > 0 ? /* @__PURE__ */ jsxDEV("aside", { class: "toc-area", children: [
        /* @__PURE__ */ jsxDEV("div", { class: "toc-title", children: "On this page" }),
        /* @__PURE__ */ jsxDEV("ul", { class: "toc-list", children: t.headings.map((r) => /* @__PURE__ */ jsxDEV("li", { class: `toc-item level-${r.level}`, children: /* @__PURE__ */ jsxDEV("a", { href: `#${r.id}`, class: "toc-link", children: r.text }) }, r.id)) })
      ] }) : /* @__PURE__ */ jsxDEV("div", { style: "width: var(--toc-width); flex-shrink: 0;" })
    ] })
  }
), docsApp = new Hono();
docsApp.get("/api/search", async (t) => {
  const e = getStorage(t.env), r = await getMergedSearchIndex(e);
  return t.json(r);
});
docsApp.get("/docs", async (t) => {
  const e = getStorage(t.env), r = await getMergedDocs(e);
  return r.length > 0 ? t.redirect(`/docs/${r[0].slug}`) : t.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}));
});
docsApp.get("/docs/:slug", async (t) => {
  const e = t.req.param("slug"), r = getStorage(t.env), n = await getMergedDocBySlug(r, e), a = await getMergedNavigation(r);
  if (!n) {
    const s = (await getMergedDocs(r)).find((l) => l.categorySlug === e);
    return s ? t.redirect(`/docs/${s.slug}`) : (t.status(404), t.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
  }
  return t.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: n, navigation: a }));
});
docsApp.get("/docs/:category/:slug", async (t) => {
  const e = t.req.param("category"), r = t.req.param("slug"), n = `${e}/${r}`, a = getStorage(t.env), i = await getMergedDocBySlug(a, n) || await getMergedDocBySlug(a, r), s = await getMergedNavigation(a);
  return i ? t.html(/* @__PURE__ */ jsxDEV(DocPage, { doc: i, navigation: s })) : (t.status(404), t.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {})));
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
apiRouter.openapi(getHealthRoute, (t) => t.json({
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
apiRouter.openapi(getUsersRoute, (t) => t.json(usersDb, 200));
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
apiRouter.openapi(createUserRoute, (t) => {
  const e = t.req.valid("json"), r = {
    id: `usr_${Date.now()}`,
    name: e.name,
    email: e.email,
    role: e.role,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return usersDb.push(r), t.json(r, 201);
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
apiRouter.openapi(getUserByIdRoute, (t) => {
  const { id: e } = t.req.valid("param"), r = usersDb.find((n) => n.id === e);
  return r ? t.json(r, 200) : t.json({ code: "NOT_FOUND", message: `User with ID '${e}' not found.` }, 404);
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
apiRouter.openapi(getProjectsRoute, (t) => t.json([
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
var __freeze = Object.freeze, __defProp = Object.defineProperty, __template = (t, e) => __freeze(__defProp(t, "raw", { value: __freeze(t.slice()) })), _a;
const SCALAR_CDN = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.71.0", config = {
  spec: { url: "/openapi.json" },
  theme: "purple",
  layout: "modern",
  favicon: logo,
  showDeveloperTools: "never",
  mcp: { disabled: !0 },
  // "Generate MCP" / "Connect MCP"
  agent: { disabled: !0 },
  // "Ask AI"
  // ponytail: no config flag exists for the sidebar footer credit, so hide it with CSS
  customCss: 'a[href="https://www.scalar.com"] { display: none !important; }'
}, scalarReference = (t) => t.html(html$1(_a || (_a = __template([`<!doctype html>
<html lang="en">
  <head>
    <title>NexGen API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="`, `" />
  </head>
  <body>
    <script id="api-reference" type="application/json" data-configuration="`, `"><\/script>
    <script src="`, `"><\/script>
  </body>
</html>`])), logo, JSON.stringify(config), SCALAR_CDN)), COOKIE_NAME = "hono_admin_session", DEFAULT_PASSWORD = "admin123", DEFAULT_SECRET = "hono-edge-admin-secret-2026";
async function generateSessionToken(t) {
  const e = `admin_${Date.now()}`, r = new TextEncoder(), n = await crypto.subtle.importKey(
    "raw",
    r.encode(t),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), a = await crypto.subtle.sign("HMAC", n, r.encode(e)), i = Array.from(new Uint8Array(a)).map((s) => s.toString(16).padStart(2, "0")).join("");
  return `${e}.${i}`;
}
async function verifySessionToken(t, e) {
  if (!t || !t.includes(".")) return !1;
  const [r, n] = t.split(".");
  if (!r || !n) return !1;
  const a = new TextEncoder(), i = await crypto.subtle.importKey(
    "raw",
    a.encode(e),
    { name: "HMAC", hash: "SHA-256" },
    !1,
    ["sign"]
  ), s = await crypto.subtle.sign("HMAC", i, a.encode(r)), l = Array.from(new Uint8Array(s)).map((c) => c.toString(16).padStart(2, "0")).join("");
  return n === l;
}
function getAdminPassword(t) {
  return t.env?.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}
function getSessionSecret(t) {
  return t.env?.SESSION_SECRET || DEFAULT_SECRET;
}
async function isAuthenticated(t) {
  const e = getSessionSecret(t), r = t.req.header("Authorization");
  if (r?.startsWith("Bearer ")) {
    const i = r.substring(7);
    if (i === getAdminPassword(t) || await verifySessionToken(i, e)) return !0;
  }
  const n = t.req.header("x-admin-key");
  if (n && n === getAdminPassword(t))
    return !0;
  const a = getCookie(t, COOKIE_NAME);
  return !!(a && await verifySessionToken(a, e));
}
async function loginAdmin(t) {
  const e = getSessionSecret(t), r = await generateSessionToken(e);
  return setCookie(t, COOKIE_NAME, r, {
    path: "/",
    httpOnly: !0,
    secure: !1,
    // will be upgraded in production
    sameSite: "Lax",
    maxAge: 3600 * 24 * 7
    // 7 days
  }), r;
}
function logoutAdmin(t) {
  deleteCookie(t, COOKIE_NAME, { path: "/" });
}
const adminAuthMiddleware = async (t, e) => {
  const r = t.req.path;
  return r === "/admin/login" || r === "/api/admin/login" || await isAuthenticated(t) ? e() : r.startsWith("/api/admin") ? t.json({ error: "Unauthorized: Admin authentication required" }, 401) : t.redirect(`/admin/login?redirect=${encodeURIComponent(r)}`);
}, LoginView = ({ error: t, redirect: e = "/admin" }) => /* @__PURE__ */ jsxDEV("html", { lang: "en", children: [
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
    t && /* @__PURE__ */ jsxDEV("div", { class: "error-banner", children: t }),
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
  children: t,
  title: e = "Admin Dashboard",
  activePath: r = "/admin"
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
        /* @__PURE__ */ jsxDEV("a", { href: "/admin", class: `admin-nav-item ${r === "/admin" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "📊" }),
          /* @__PURE__ */ jsxDEV("span", { children: "Dashboard" })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { class: "nav-section-title", style: "margin-top: 1rem;", children: "Content Management" }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs", class: `admin-nav-item ${r.startsWith("/admin/docs") && r !== "/admin/docs/new" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "📝" }),
          /* @__PURE__ */ jsxDEV("span", { children: "All Documents" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs/new", class: `admin-nav-item ${r === "/admin/docs/new" ? "active" : ""}`, children: [
          /* @__PURE__ */ jsxDEV("span", { children: "➕" }),
          /* @__PURE__ */ jsxDEV("span", { children: "New Document" })
        ] }),
        /* @__PURE__ */ jsxDEV("a", { href: "/admin/openapi", class: `admin-nav-item ${r.startsWith("/admin/openapi") ? "active" : ""}`, children: [
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
      /* @__PURE__ */ jsxDEV("div", { class: "admin-content", children: t })
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
function formatDate$2(t) {
  if (!t) return "Recently";
  try {
    const e = new Date(t);
    return isNaN(e.getTime()) ? t : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return t;
  }
}
const DashboardView = ({ docs: t, specs: e }) => {
  const r = t.filter((i) => i.isDynamic).length, n = t.filter((i) => !i.isDynamic).length, a = new Set(t.map((i) => i.category)).size;
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Dashboard Overview", activePath: "/admin", children: [
    /* @__PURE__ */ jsxDEV("div", { style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;", children: [
      /* @__PURE__ */ jsxDEV("div", { class: "card", style: "margin-bottom: 0;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.8125rem; color: var(--admin-muted); text-transform: uppercase; font-weight: 700;", children: "Total Articles" }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 2.25rem; font-weight: 800; color: var(--admin-text); margin-top: 0.25rem;", children: t.length }),
        /* @__PURE__ */ jsxDEV("div", { style: "font-size: 0.75rem; color: var(--admin-muted); margin-top: 0.25rem;", children: [
          /* @__PURE__ */ jsxDEV("span", { children: [
            n,
            " static"
          ] }),
          " • ",
          /* @__PURE__ */ jsxDEV("span", { style: "color: var(--admin-accent); font-weight: 600;", children: [
            r,
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
        /* @__PURE__ */ jsxDEV("tbody", { children: t.slice(0, 6).map((i) => /* @__PURE__ */ jsxDEV("tr", { children: [
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
function formatDate$1(t) {
  if (!t) return "Recently";
  try {
    const e = new Date(t);
    return isNaN(e.getTime()) ? t : e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return t;
  }
}
const DocsListView = ({ docs: t }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "Documentation Management", activePath: "/admin/docs", children: [
  /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: [
        "All Documentation Pages (",
        t.length,
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
      /* @__PURE__ */ jsxDEV("tbody", { children: t.map((e) => /* @__PURE__ */ jsxDEV("tr", { "data-search": `${e.title.toLowerCase()} ${e.category.toLowerCase()} ${e.slug.toLowerCase()} ${(e.author || "").toLowerCase()}`, children: [
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
function formatDate(t) {
  if (!t) return "Not yet published";
  try {
    const e = new Date(t);
    return isNaN(e.getTime()) ? t : e.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return t;
  }
}
const DocEditorView = ({ doc: t, isNew: e = !1 }) => {
  const r = e ? "Create New Document" : `Edit: ${t?.title || "Document"}`, n = e ? `Write your markdown content here...

> [!NOTE]
> This is a callout note.

## Features

- Feature 1
- Feature 2

\`\`\`typescript
const example = "Hono on Cloudflare";
console.log(example);
\`\`\`
` : t?.rawContent || "";
  return /* @__PURE__ */ jsxDEV(AdminLayout, { title: r, activePath: e ? "/admin/docs/new" : "/admin/docs", children: [
    /* @__PURE__ */ jsxDEV("form", { id: "doc-editor-form", children: [
      /* @__PURE__ */ jsxDEV("div", { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;", children: [
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; align-items: center; gap: 0.75rem;", children: [
          /* @__PURE__ */ jsxDEV("a", { href: "/admin/docs", class: "btn btn-outline", children: "← Back to Docs" }),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h2", { style: "font-size: 1.25rem; font-weight: 700;", children: r }),
            !e && t?.updatedAt && /* @__PURE__ */ jsxDEV("span", { style: "font-size: 0.75rem; color: var(--admin-muted);", children: [
              "Last edited: ",
              formatDate(t.updatedAt),
              " by ",
              /* @__PURE__ */ jsxDEV("strong", { children: t.author || "Docs Team" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxDEV("div", { style: "display: flex; gap: 0.75rem;", children: [
          !e && t?.slug && /* @__PURE__ */ jsxDEV(
            "a",
            {
              href: `/docs/${t.slug}`,
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
                value: t?.title || "",
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
                value: t?.category || "Guides",
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
                value: t?.author || "Docs Team"
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
                value: t?.slug || "",
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
                value: t?.order !== void 0 ? String(t.order) : "10"
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
              value: t?.description || ""
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
}, OpenAPIEditorView = ({ spec: t, allSpecs: e }) => /* @__PURE__ */ jsxDEV(AdminLayout, { title: "OpenAPI Document Management", activePath: "/admin/openapi", children: [
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
            value: t.id,
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
            value: t.title,
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
            value: t.version,
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
          value: t.description
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
        children: t.specJson
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
adminViews.get("/admin/login", (t) => {
  const e = t.req.query("redirect") || "/admin";
  return t.html(/* @__PURE__ */ jsxDEV(LoginView, { redirect: e }));
});
adminViews.post("/admin/login", async (t) => {
  const e = await t.req.parseBody(), r = String(e.password || ""), n = String(e.redirect || "/admin"), a = getAdminPassword(t);
  return r !== a ? t.html(/* @__PURE__ */ jsxDEV(LoginView, { error: "Invalid admin password. Please try again.", redirect: n }), 401) : (await loginAdmin(t), t.redirect(n));
});
adminViews.get("/admin/logout", (t) => (logoutAdmin(t), t.redirect("/admin/login")));
adminViews.get("/admin", async (t) => {
  const e = getStorage(t.env), r = await e.getDocs(), n = await e.getAllOpenAPISpecs();
  return t.html(/* @__PURE__ */ jsxDEV(DashboardView, { docs: r, specs: n }));
});
adminViews.get("/admin/docs", async (t) => {
  const r = await getStorage(t.env).getDocs();
  return t.html(/* @__PURE__ */ jsxDEV(DocsListView, { docs: r }));
});
adminViews.get("/admin/docs/new", (t) => t.html(/* @__PURE__ */ jsxDEV(DocEditorView, { isNew: !0 })));
adminViews.get("/admin/docs/edit/:slug{.+}", async (t) => {
  const e = decodeURIComponent(t.req.param("slug")), n = await getStorage(t.env).getDoc(e);
  return n ? t.html(/* @__PURE__ */ jsxDEV(DocEditorView, { doc: n, isNew: !1 })) : t.redirect("/admin/docs");
});
adminViews.get("/admin/openapi", async (t) => {
  const e = getStorage(t.env), r = await e.getAllOpenAPISpecs();
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
  }, await e.saveOpenAPISpec(n)), t.html(/* @__PURE__ */ jsxDEV(OpenAPIEditorView, { spec: n, allSpecs: r }));
});
const adminApi = new Hono();
adminApi.post("/api/admin/login", async (t) => {
  const r = (await t.req.json().catch(() => ({}))).password || "", n = getAdminPassword(t);
  if (r !== n)
    return t.json({ error: "Invalid admin password" }, 401);
  const a = await loginAdmin(t);
  return t.json({ success: !0, token: a });
});
adminApi.post("/api/admin/logout", (t) => (logoutAdmin(t), t.json({ success: !0 })));
adminApi.get("/api/admin/docs", async (t) => {
  const r = await getStorage(t.env).getDocs();
  return t.json(r);
});
adminApi.post("/api/admin/docs", async (t) => {
  const e = await t.req.json().catch(() => ({})), { title: r, category: n, slug: a, order: i = 10, description: s = "", content: l = "", author: c = "Docs Admin", owner: d } = e;
  if (!r || !a || !l)
    return t.json({ error: "Title, slug, and content are required" }, 400);
  const u = a.replace(/^\//, "").toLowerCase().trim(), { html: m, headings: h } = parseMarkdown(l), y = n || "Guides", v = y.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), T = {
    slug: u,
    category: y,
    categorySlug: v,
    categoryOrder: 50,
    title: r,
    description: s,
    order: Number(i) || 10,
    rawContent: l,
    htmlContent: m,
    headings: h,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(t.env).saveDoc(T), t.json(T, 201);
});
adminApi.put("/api/admin/docs/:slug{.+}", async (t) => {
  const e = t.req.param("slug"), r = await t.req.json().catch(() => ({})), { title: n, category: a, order: i = 10, description: s = "", content: l = "", author: c = "Docs Admin", owner: d } = r;
  if (!n || !l)
    return t.json({ error: "Title and content are required" }, 400);
  const { html: u, headings: m } = parseMarkdown(l), h = a || "Guides", y = h.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-"), v = {
    slug: e,
    category: h,
    categorySlug: y,
    categoryOrder: 50,
    title: n,
    description: s,
    order: Number(i) || 10,
    rawContent: l,
    htmlContent: u,
    headings: m,
    author: c || d || "Docs Admin",
    isDynamic: !0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(t.env).saveDoc(v), t.json(v);
});
adminApi.delete("/api/admin/docs/:slug{.+}", async (t) => {
  const e = t.req.param("slug"), n = await getStorage(t.env).deleteDoc(e);
  return t.json({ success: n, slug: e });
});
adminApi.get("/api/admin/openapi", async (t) => {
  const r = await getStorage(t.env).getAllOpenAPISpecs();
  return t.json(r);
});
adminApi.put("/api/admin/openapi/:id", async (t) => {
  const e = t.req.param("id"), r = await t.req.json().catch(() => ({})), { title: n, version: a, description: i = "", specJson: s } = r;
  if (!n || !a || !s)
    return t.json({ error: "Title, version, and specJson are required" }, 400);
  try {
    JSON.parse(s);
  } catch (d) {
    return t.json({ error: `Invalid JSON syntax: ${d.message}` }, 400);
  }
  const l = {
    id: e,
    title: n,
    version: a,
    description: i,
    specJson: s,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return await getStorage(t.env).saveOpenAPISpec(l), t.json(l);
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
app.get("/openapi.json", async (t) => {
  const r = await getStorage(t.env).getOpenAPISpec("main");
  if (r && r.specJson)
    try {
      const n = JSON.parse(r.specJson);
      if (n.paths && Object.keys(n.paths).length > 0)
        return t.json(n);
    } catch {
    }
  return t.json(nexgenSpec);
});
app.get("/reference", scalarReference);
app.get("/reference/*", scalarReference);
app.get("/scalar", (t) => t.redirect("/reference"));
app.get("/docs/api/reference", (t) => t.redirect("/reference"));
app.use("/admin/*", adminAuthMiddleware);
app.use("/api/admin/*", adminAuthMiddleware);
app.route("/", adminViews);
app.route("/", adminApi);
app.get("/", (t) => t.html(/* @__PURE__ */ jsxDEV(HomePage, {})));
app.route("/", docsApp);
app.notFound((t) => t.html(/* @__PURE__ */ jsxDEV(NotFoundPage, {}), 404));
export {
  app as default
};
