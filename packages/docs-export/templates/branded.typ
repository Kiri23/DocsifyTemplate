// branded.typ — Pandoc Typst template for DocsifyTemplate.
// Defines the page layout, typography, title page, and component macros.
// Every colour literal lives in the palette block below so rebranding stays in one place.

// ── Palette (defaults tuned for light paper; override via Pandoc template variables) ──
#let accent = rgb("$if(color-accent)$$color-accent$$else$#0891b2$endif$")
#let accent-text = rgb("$if(color-accent-text)$$color-accent-text$$else$#0e7490$endif$")
#let surface-raised = rgb("$if(color-surface)$$color-surface$$else$#f5f5f4$endif$")
#let border-subtle = rgb("$if(color-border)$$color-border$$else$#e7e5e4$endif$")
#let text-primary = rgb("$if(color-text)$$color-text$$else$#1c1917$endif$")
#let text-secondary = rgb("$if(color-text-secondary)$$color-text-secondary$$else$#44403c$endif$")
#let text-muted = rgb("$if(color-text-muted)$$color-text-muted$$else$#78716c$endif$")
#let terminal-surface = rgb("$if(color-terminal-bg)$$color-terminal-bg$$else$#fafaf9$endif$")
#let terminal-bar = rgb("$if(color-terminal-bar)$$color-terminal-bar$$else$#f0efed$endif$")
#let terminal-accent = rgb("$if(color-terminal-accent)$$color-terminal-accent$$else$#b45309$endif$")
#let status-ok = rgb("$if(color-status-ok)$$color-status-ok$$else$#15803d$endif$")
#let status-fail = rgb("$if(color-status-fail)$$color-status-fail$$else$#b91c1c$endif$")

// ── Pandoc Helpers ──
// Pandoc emits #horizontalrule for Markdown thematic breaks (---).
#let horizontalrule = line(length: 100%, stroke: 0.5pt + border-subtle)

// ── Page Setup ──
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 9pt, fill: text-muted)
      $if(title)$$title$$else$Documentation$endif$
      #h(1fr)
      #text(fill: accent, weight: "bold")[$if(brand)$$brand$$else$DocsifyTemplate$endif$]
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

// ── Code Blocks ──
#show raw.where(block: true): it => block(
  fill: surface-raised,
  inset: 10pt,
  radius: 4pt,
  width: 100%,
  stroke: 0.5pt + border-subtle,
  it,
)

// ── Component Macros ──
// Renders a terminal window emitted by packages/docs-site/components/terminal.js.
#let terminal-badge(label, tone) = box(
  stroke: 0.5pt + tone,
  inset: (x: 5pt, y: 2pt),
  radius: 3pt,
  text(size: 8pt, weight: "bold", fill: tone, label),
)

#let terminal-window(
  command: none,
  label: "terminal",
  exit: none,
  estado: none,
  nota: none,
  lines: (),
) = {
  let heading-bar = if command != none {
    [#text(fill: terminal-accent, weight: "bold")[\$$ ]#raw(command)]
  } else {
    text(fill: text-secondary, weight: "bold", label)
  }

  block(width: 100%, breakable: false, spacing: 0.9em)[
    #block(
      width: 100%,
      radius: 4pt,
      stroke: 0.6pt + border-subtle,
      clip: true,
      fill: terminal-surface,
    )[
      #block(
        width: 100%,
        fill: terminal-bar,
        inset: (x: 10pt, y: 6pt),
        stroke: (bottom: 0.5pt + border-subtle),
      )[
        #set text(size: 9pt)
        #heading-bar
        #h(1fr)
        #if estado != none {
          terminal-badge(estado, terminal-accent)
          h(4pt)
        }
        #if exit != none {
          let exit-tone = if exit == 0 { status-ok } else { status-fail }
          terminal-badge("exit " + str(exit), exit-tone)
        }
      ]
      #block(width: 100%, inset: 10pt)[
        #show raw.where(block: true): it => it
        #show regex("█+"): it => text(fill: terminal-accent, it)
        #set text(font: ("DejaVu Sans Mono", "New Computer Modern Mono"), size: 9pt, fill: text-primary)
        #set par(justify: false, leading: 0.45em)
        #raw(lines.join("\n"), block: true)
      ]
    ]
    #if nota != none [
      #v(3pt)
      #text(size: 9pt, style: "italic", fill: text-muted, nota)
    ]
  ]
}

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
