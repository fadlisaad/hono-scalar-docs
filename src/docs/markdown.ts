import { marked } from 'marked'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-javascript.js'
import 'prismjs/components/prism-typescript.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-yaml.js'
import 'prismjs/components/prism-markdown.js'
import 'prismjs/components/prism-css.js'
import 'prismjs/components/prism-jsx.js'
import 'prismjs/components/prism-tsx.js'
import { HeadingItem } from './types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function parseMarkdown(rawMarkdown: string): {
  html: string
  headings: HeadingItem[]
} {
  const headings: HeadingItem[] = []
  const usedSlugs = new Map<string, number>()

  // Custom renderer for marked
  const renderer = new marked.Renderer()

  renderer.heading = ({ tokens, depth, text }) => {
    let baseSlug = slugify(text)
    if (!baseSlug) baseSlug = `heading-${depth}`

    let slug = baseSlug
    const count = usedSlugs.get(baseSlug) || 0
    if (count > 0) {
      slug = `${baseSlug}-${count}`
    }
    usedSlugs.set(baseSlug, count + 1)

    if (depth >= 2 && depth <= 4) {
      headings.push({
        id: slug,
        text: text.replace(/<[^>]*>/g, ''),
        level: depth
      })
    }

    const anchor = `<a href="#${slug}" class="heading-anchor" aria-label="Link to ${escapeHtml(text)}">#</a>`
    return `<h${depth} id="${slug}" class="doc-heading doc-h${depth}"><span>${text}</span>${anchor}</h${depth}>\n`
  }

  renderer.code = ({ text, lang }) => {
    const language = (lang || '').trim().toLowerCase()

    if (language === 'mermaid') {
      return `<div class="mermaid-block">
      <pre class="mermaid">${escapeHtml(text)}</pre>
    </div>\n`
    }

    let highlighted = escapeHtml(text)

    if (language && Prism.languages[language]) {
      try {
        highlighted = Prism.highlight(text, Prism.languages[language], language)
      } catch {
        highlighted = escapeHtml(text)
      }
    }

    const langBadge = language ? `<span class="code-lang">${language}</span>` : ''
    const copyButton = `<button class="copy-code-btn" type="button" title="Copy code" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').innerText);this.innerText='Copied!';setTimeout(()=>this.innerText='Copy',2000)">Copy</button>`

    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        ${langBadge}
        ${copyButton}
      </div>
      <pre class="language-${language || 'plaintext'}"><code class="language-${language || 'plaintext'}">${highlighted}</code></pre>
    </div>\n`
  }

  renderer.table = ({ header, rows }) => {
    const headerHtml = header.map(cell => `<th>${marked.parseInline(cell.text) as string}</th>`).join('')
    const bodyHtml = rows.map(row => `<tr>${row.map(cell => `<td>${marked.parseInline(cell.text) as string}</td>`).join('')}</tr>`).join('')
    return `<div class="table-container"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>\n`
  }

  // Pre-process markdown for GitHub-style alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
  const alertRegex = /> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n((?:> .*\n?)+)/gi
  const processedMarkdown = rawMarkdown.replace(alertRegex, (_match, type, content) => {
    const cleanContent = content
      .split('\n')
      .map((line: string) => line.replace(/^>\s?/, ''))
      .join('\n')
    const lowerType = type.toLowerCase()
    return `<div class="callout callout-${lowerType}">
<div class="callout-title"><span class="callout-icon"></span>${type.toUpperCase()}</div>
<div class="callout-body">

${cleanContent}

</div>
</div>\n\n`
  })

  const html = marked.parse(processedMarkdown, {
    renderer,
    gfm: true,
    breaks: false
  }) as string

  return { html, headings }
}
