// branded.typ — Pandoc Typst template for DocsifyTemplate
//
// ARCHITECTURE (Open/Closed):
// The Lua filter (typst-components.lua) emits function calls with pure data.
// This template defines HOW those functions render.
// To change appearance: edit functions HERE. The filter never changes.

// ── Brand Colors (from theme.css :root) ──
// Change these to rebrand the entire document.
#let accent = rgb("#0891b2")
#let accent-light = rgb("#ecfeff")
#let accent-text = rgb("#0e7490")
#let surface-raised = rgb("#f5f5f4")
#let border-subtle = rgb("#e7e5e4")
#let text-primary = rgb("#1c1917")
#let text-secondary = rgb("#44403c")
#let text-muted = rgb("#a8a29e")
#let tech-accent = rgb("#6366f1")
#let method-get = rgb("#3b82f6")
#let method-post = rgb("#22c55e")
#let method-put = rgb("#f59e0b")
#let method-patch = rgb("#f97316")
#let method-delete = rgb("#ef4444")

// ── Page Setup ──
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 9pt, fill: text-muted)
      $if(title)$$title$$else$Documentation$endif$
      #h(1fr)
      #text(fill: accent, weight: "bold")[DocsifyTemplate]
      #v(-4pt)
      #line(length: 100%, stroke: 0.4pt + border-subtle)
    ]
  },
  footer: context {
    set text(size: 9pt, fill: text-muted)
    h(1fr)
    counter(page).display()
    h(1fr)
  },
)

// ── Typography ──
#set text(font: "New Computer Modern", size: 11pt, fill: text-primary)
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1.1")

#show heading.where(level: 1): it => {
  set text(size: 20pt, weight: "bold", fill: text-primary)
  v(0.5em)
  it
  v(0.3em)
}

#show heading.where(level: 2): it => {
  set text(size: 15pt, weight: "bold", fill: text-primary)
  v(0.8em)
  it
  v(0.2em)
}

#show heading.where(level: 3): it => {
  set text(size: 12pt, weight: "bold", fill: text-secondary)
  v(0.5em)
  it
  v(0.2em)
}

// ── Links ──
#show link: it => text(fill: accent-text, it)

// ── Code blocks ──
#show raw.where(block: true): it => block(
  fill: surface-raised,
  inset: 10pt,
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + border-subtle,
  it,
)

// ════════════════════════════════════════════════════════════════
// COMPONENT FUNCTIONS — Edit these to change how components render.
// ════════════════════════════════════════════════════════════════

// ── Utility ──
#let required-badge = text(size: 8pt, weight: "bold", fill: method-delete)[required]
#let type-badge(t) = box(
  fill: surface-raised, inset: (x: 4pt, y: 2pt), radius: 3pt,
  text(size: 8pt, font: "New Computer Modern Mono", t)
)
#let method-color(m) = {
  if m == "GET" { method-get }
  else if m == "POST" { method-post }
  else if m == "PUT" { method-put }
  else if m == "PATCH" { method-patch }
  else if m == "DELETE" { method-delete }
  else { text-muted }
}

// ── Card Grid ──
#let cardgridbegin() = []
#let card(icon, title, desc) = block(
  fill: surface-raised, radius: 4pt, inset: 12pt, width: 100%,
  stroke: 0.5pt + border-subtle,
  [*#icon #title* \ #text(fill: text-secondary, size: 10pt)[#desc]]
)
#let cardgridend() = v(8pt)

// ── Entity Schema ──
#let entitybegin(name, parent) = {
  block(
    stroke: 1pt + accent, radius: 4pt, width: 100%, clip: true,
    block(fill: accent, width: 100%, inset: 10pt)[
      #text(fill: white, weight: "bold", size: 13pt)[#name]
      #if parent != "" [ #text(fill: white.darken(20%), size: 10pt, style: "italic")[ extends #parent]]
    ]
  )
}
#let entityfield(name, typ, req, desc, values) = {
  block(inset: (x: 12pt, y: 4pt), width: 100%)[
    #text(font: "New Computer Modern Mono", fill: accent-text)[#name]
    #h(6pt)
    #type-badge(typ)
    #if req == "true" [#h(4pt) #required-badge]
    #h(6pt)
    #text(size: 10pt, fill: text-secondary)[#desc]
    #if values != "" [
      #text(size: 9pt)[ Values: #text(font: "New Computer Modern Mono")[#values]]
    ]
  ]
}
#let entityend() = v(8pt)

// ── API Endpoint ──
#let apibegin(method, path) = {
  let mc = method-color(method)
  block(
    stroke: 0.5pt + border-subtle, radius: 4pt, inset: 12pt, width: 100%,
    [
      #box(fill: mc.lighten(85%), inset: (x: 6pt, y: 3pt), radius: 3pt)[
        #text(fill: mc, weight: "bold", size: 10pt)[#method]
      ]
      #h(8pt)
      #text(font: "New Computer Modern Mono", weight: "bold")[#path]
    ]
  )
}
#let apidesc(txt) = block(inset: (left: 12pt))[#txt]
#let apiparam(name, typ, req) = block(inset: (left: 12pt, y: 2pt))[
  #text(font: "New Computer Modern Mono")[#name]
  #h(4pt) #type-badge(typ)
  #if req == "true" [#h(4pt) #required-badge]
]
#let apiresponse(code) = block(inset: (left: 12pt))[
  *Response:*
  #block(fill: surface-raised, inset: 8pt, radius: 4pt, width: 100%,
    stroke: 0.5pt + border-subtle,
    raw(code))
]
#let apiend() = v(8pt)

// ── Status Flow ──
#let flowbegin() = []
#let flowstate(label, trigger, next, effects, islast) = {
  box(stroke: 1pt + accent, fill: accent-light, inset: (x: 8pt, y: 4pt), radius: 4pt)[
    *#label*
  ]
  if islast != "true" {
    h(4pt)
    sym.arrow.r
    h(4pt)
  }
}
#let flowend() = v(8pt)

// ── Directive Table ──
#let directivebegin(title) = heading(level: 3, title)
#let directivecategory(name) = block(inset: (top: 8pt))[
  #text(fill: accent, weight: "bold")[#name]
]
#let directive(name, typ, default, desc) = block(inset: (left: 8pt, y: 2pt))[
  #text(font: "New Computer Modern Mono", size: 10pt)[#name]
  #h(6pt) #type-badge(typ)
  #if default != "" [#h(4pt) #text(size: 9pt, fill: text-muted)[(default: #raw(default))]]
  #h(6pt) #text(size: 10pt)[#desc]
]
#let directiveend() = v(8pt)

// ── Step Type ──
#let stepbegin(name, category) = {
  let badge-color = if category == "async" { tech-accent } else { accent }
  block(
    stroke: 0.5pt + accent.lighten(50%), radius: 4pt, width: 100%, clip: true,
    block(fill: accent-light, width: 100%, inset: 10pt)[
      #text(weight: "bold", size: 12pt)[#name]
      #h(6pt)
      #text(size: 8pt, weight: "bold", fill: badge-color)[#category]
    ]
  )
}
#let stepdesc(txt) = block(inset: (x: 12pt, y: 4pt))[#txt]
#let stepprop(name, typ, req, desc) = block(inset: (x: 12pt, y: 2pt))[
  #text(font: "New Computer Modern Mono")[#name]
  #h(4pt) #type-badge(typ)
  #if req == "true" [#h(4pt) #required-badge]
  #h(4pt) --- #text(size: 10pt)[#desc]
]
#let stepexample(code) = block(inset: (x: 12pt, bottom: 8pt))[
  *Example:*
  #block(fill: surface-raised, inset: 8pt, radius: 4pt, width: 100%,
    stroke: 0.5pt + border-subtle,
    raw(code))
]
#let stepend() = v(8pt)

// ── Config Example ──
#let configbegin(title, lang) = {
  if title != "" [*#title* #v(4pt)]
}
#let configcode(code) = block(
  fill: surface-raised, inset: 10pt, radius: 4pt, width: 100%,
  stroke: 0.5pt + border-subtle,
  raw(code)
)
#let configannotation(line, txt) = block(inset: (left: 8pt, y: 2pt))[
  #box(fill: accent, inset: 3pt, radius: 8pt)[
    #text(fill: white, size: 7pt, weight: "bold")[#str(line)]
  ]
  #h(4pt)
  #text(size: 10pt)[#txt]
]
#let configend() = v(8pt)

// ── Side by Side ──
#let sidebegin() = []
#let sidepanel(title, content, lang) = block(width: 48%)[
  #if title != "" [*#title* \ ]
  #if lang != "" [
    #raw(content)
  ] else [
    #content
  ]
]
#let sideend() = v(8pt)

// ════════════════════════════════════════════════════════════════

// ── Title Page ──
$if(title)$
#v(3cm)
#line(length: 100%, stroke: 2pt + accent)
#v(1em)
#text(size: 28pt, weight: "bold", fill: text-primary)[$title$]
$if(subtitle)$
#v(0.5em)
#text(size: 16pt, fill: text-secondary)[$subtitle$]
$endif$
#v(1em)
#line(length: 100%, stroke: 2pt + accent)
#v(1em)
$if(author)$#text(size: 12pt)[$author$]$endif$
#h(1fr)
#text(size: 12pt, fill: text-muted)[$if(date)$$date$$else$#datetime.today().display()$endif$]
#pagebreak()
$endif$

$if(toc)$
#outline(indent: auto)
#pagebreak()
$endif$

// ── Body ──
$body$
