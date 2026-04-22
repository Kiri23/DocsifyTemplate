/* docs-engine v0.1.8 | https://github.com/Kiri23/DocsifyTemplate */
var Z=/^---\s*\n([\s\S]*?)\n---/;function ee(e){return Z.test(e)}function te(e){let t=e.match(Z);if(!t)return null;let o={};return t[1].split(`
`).forEach(r=>{let n=r.indexOf(":");if(n===-1)return;let a=r.substring(0,n).trim(),i=r.substring(n+1).trim();i.startsWith("[")&&i.endsWith("]")&&(i=i.slice(1,-1).split(",").map(l=>l.trim())),o[a]=i}),o}function re(e){return e.replace(/^---\s*\n[\s\S]*?\n---\s*\n/,"")}function O(e){return e.split("-").map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join("")}import{unified as oe}from"unified";import ne from"remark-parse";import{visit as U}from"unist-util-visit";function Oe(e={}){let{parseYaml:t,transforms:o={}}=e;return function(n){let a=[];U(n,"code",(i,l,s)=>{if(!(!i.lang||!o[i.lang]||!s))try{let c=t(i.value),p=o[i.lang](c,i);p!=null&&a.push({index:l,parent:s,result:p,position:i.position})}catch(c){console.error("[yaml-components] Error processing fence:",i.lang,c)}});for(let{index:i,parent:l,result:s,position:c}of a.reverse())l.children.splice(i,1,{type:"html",value:s,position:c})}}function ae(e,{parseYaml:t,renderComponent:o,transforms:r,mermaid:n,image:a,hr:i}){let l=r||Me(o,t);if(n||a||i)return Pe(e,{parseYaml:t,resolvedTransforms:l,mermaid:n,image:a,hr:i});let s=oe().use(ne).use(Oe,{parseYaml:t,transforms:l}),c=s.parse(e);return s.runSync(c),_e(c,e)}function Me(e){return e?new Proxy({},{get(t,o){return r=>e(O(o),r,o)},has(){return!0}}):{}}function _e(e,t){let o=[];if(U(e,"html",n=>{n.position&&o.push({start:n.position.start.offset,end:n.position.end.offset,value:n.value})}),!o.length)return t;o.sort((n,a)=>a.start-n.start);let r=t;for(let n of o)r=r.slice(0,n.start)+n.value+r.slice(n.end);return r}function Pe(e,{parseYaml:t,resolvedTransforms:o,mermaid:r,image:n,hr:a}){let l=oe().use(ne).parse(e),s=[],c=0,p=0;U(l,d=>{if(d.position){if(d.type==="code"&&d.lang&&o[d.lang])try{let m=t(d.value),v=o[d.lang](m,d);v!=null&&s.push({start:d.position.start.offset,end:d.position.end.offset,replacement:v})}catch(m){console.error("[yaml-components] Error processing fence:",d.lang,m)}if(d.type==="code"&&d.lang==="mermaid"&&r){let m=r(c++);m!=null&&s.push({start:d.position.start.offset,end:d.position.end.offset,replacement:m})}if(d.type==="image"&&n){let m=n(d.url||"",d.alt||"",p++);m!=null&&s.push({start:d.position.start.offset,end:d.position.end.offset,replacement:m})}if(d.type==="thematicBreak"&&a){let m=a();m!=null&&s.push({start:d.position.start.offset,end:d.position.end.offset,replacement:m})}}}),s.sort((d,m)=>m.start-d.start);let u=e;for(let d of s)u=u.slice(0,d.start)+d.replacement+u.slice(d.end);return u}var Fe={codeBlock:"pre > code",mermaidCode:"pre code.lang-mermaid, pre code.language-mermaid",mermaidDiv:".mermaid",preactPlaceholder:"[data-preact-component]"};function P(e,t){for(let[o,r]of Object.entries(t)){if(!r)continue;let n=Fe[o];n&&e.querySelectorAll(n).forEach(r)}}function se(e,t){for(let o of Object.values(t))o&&o(e)}function ie(e,t){let o=[];for(let r of Object.values(t))if(r){let n=r(e);typeof n=="function"&&o.push(n)}return()=>o.forEach(r=>r())}var F={};typeof window<"u"&&(window.PreactComponents=F);function Re(e,t){let o=O(e);F[o]&&console.warn(`[registry] Overwriting component: ${o} (fence: ${e})`),F[o]=t}function ce(e){Object.entries(e).forEach(([t,o])=>Re(t,o))}function le(e){return F[O(e)]}var He={title:"DocsifyTemplate",description:"",tagline:"",theme:{primary:"#0891b2",primaryLight:"#ecfeff",primaryText:"#0e7490",brand:"#95c22f",surface:"#faf9f7",surfaceRaised:"#f5f5f4",surfaceSunken:"#efedeb",border:"#e7e5e4",borderStrong:"#d6d3d1",textPrimary:"#1c1917",textSecondary:"#44403c",textTertiary:"#78716c",textMuted:"#a8a29e",techSurface:"#f8fafc",techAccent:"#6366f1",techHeading:"#1e293b",techSubheading:"#334155",techText:"#475569",codeBg:"#1e1e2e",codeText:"#cdd6f4",success:"#34d399"},docsify:{loadSidebar:!0,subMaxLevel:3,auto2top:!0,search:{placeholder:"Search...",noData:"No results.",depth:6}},features:{chat:{enabled:!0,model:{id:"onnx-community/gemma-4-E2B-it-ONNX",label:"Gemma 4 E2B",architecture:"gemma4",dtype:"q4f16",nativeToolCalling:!0,maxNewTokens:1024},tools:{export:!0,navigate:!0,switchTab:!0,search:!0,generateComponent:!0,scrollToSection:!0}},export:{enabled:!0,formats:["pdf","latex-branded","markdown"],defaultFormat:"pdf",exportAll:!0},tabs:{enabled:!0,labels:{"quick-start":"Quick Start",technical:"Technical Reference"},triggerType:"guide"},copyButton:{enabled:!0},tutorialHeader:{enabled:!0},mermaid:{enabled:!0,theme:"default",startOnLoad:!1},devTools:{enabled:!1}},components:{},sidebar:{items:null},prism:{languages:["javascript","json","yaml","bash","csharp","markdown"]},head:[]};function Ge(e){let t=[];if(e.title&&typeof e.title!="string"&&t.push("config.title must be a string"),e.theme)for(let[r,n]of Object.entries(e.theme))typeof n=="string"&&!n.match(/^#[0-9a-fA-F]{3,8}$/)&&t.push(`config.theme.${r}: "${n}" is not a valid hex color`);e.features?.chat?.enabled&&e.features?.chat?.model&&(e.features.chat.model.id||t.push("config.features.chat.model.id is required when chat is enabled"));let o=["pdf","latex-branded","markdown"];if(e.features?.export?.formats)for(let r of e.features.export.formats)o.includes(r)||t.push(`config.features.export.formats: "${r}" is not valid. Use: ${o.join(", ")}`);return t.length>0&&(console.error("[DocsifyTemplate] Configuration errors:"),t.forEach(r=>console.error("  -",r))),t}function de(e,t){let o={...e};for(let r of Object.keys(t))t[r]!==void 0&&(t[r]!==null&&typeof t[r]=="object"&&!Array.isArray(t[r])&&typeof e[r]=="object"&&e[r]!==null&&!Array.isArray(e[r])?o[r]=de(e[r],t[r]):o[r]=t[r]);return o}var R=null;function pe(e={}){let t=de(He,e);return Ge(t),R=Object.freeze(t),R}function M(){if(!R)throw new Error("[config] Call initConfig() before getConfig()");return R}function B(e){let t=M(),o=e.split("."),r=t.features;for(let n of o){if(r==null)return!1;r=r[n]}return typeof r=="object"&&r!==null?r.enabled!==!1:!!r}import Ie from"preact-custom-element";import{h as ze}from"preact";function Ue(e){return function({"data-props":o,...r}){let n=o?JSON.parse(o):{};return ze(e,{data:n,...r})}}function ue(e){for(let[t,o]of Object.entries(e))t.includes("-")&&(customElements.get(t)||Ie(Ue(o),t,["data-props"],{shadow:!1}))}function me(e,t){let o=JSON.stringify(t||{}).replace(/&/g,"&amp;").replace(/"/g,"&quot;");return`<${e} data-props="${o}"></${e}>`}function W(e,t){t=t||"tab-content";var o={quickStart:"var(--color-primary)",technical:"var(--color-tech-accent)",inactive:"var(--color-text-tertiary)",inactiveHover:"var(--color-text-secondary)",hoverBg:"var(--color-surface-sunken)"};return'<div class="tab-bar mb-0 border-b-2 border-border" style="background: var(--color-surface-raised); margin: -2.5rem -3rem 0 -3rem; padding: 0 3rem;"><nav class="flex gap-0" role="tablist">'+e.map(function(r){var n=r.active,a=r.href&&r.href.indexOf("technical")!==-1,i=a?o.technical:o.quickStart,l=n?"border-bottom: 3px solid "+i+"; color: "+i+"; background: white; font-weight: bold;":"color: "+o.inactive+"; font-weight: 500;",s=r.href?'hx-get="'+r.href+'" hx-target="#'+t+'" hx-swap="innerHTML"':"",c=a?'<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>':'<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';return'<button class="tab-btn relative px-6 py-3.5 text-sm tracking-wide transition-all duration-200" style="'+l+'" data-tab-type="'+(a?"technical":"quick-start")+'" data-accent="'+i+'" '+s+` onclick="var zone=this.getAttribute('data-tab-type');var content=document.getElementById('`+t+"');if(content){content.className='tab-zone-'+zone;}var accent=this.getAttribute('data-accent');document.querySelectorAll('.tab-btn').forEach(function(b){b.style.borderBottom='none';b.style.color='"+o.inactive+`';b.style.background='transparent';b.style.fontWeight='500';b.setAttribute('aria-selected','false');});this.style.borderBottom='3px solid '+accent;this.style.color=accent;this.style.background='white';this.style.fontWeight='bold';this.setAttribute('aria-selected','true');" role="tab" aria-selected="`+(n?"true":"false")+'" type="button">'+c+r.label+"</button>"}).join("")+"</nav></div>"}function Q(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}function fe(e,t){var o=t?t.toLowerCase().replace(/[^a-z0-9]+/g,"-"):"",r=Math.random().toString(36).substr(2,6);return e+"-"+(o?o+"-":"")+r}function A(){var e=document.querySelectorAll(".markdown-section [data-region]");e.forEach(function(t){var o=t.getAttribute("data-region");if(o){var r=o.split(",").map(function(f){var g=f.indexOf("=");return g===-1?null:{key:f.substring(0,g).trim().toLowerCase(),label:f.substring(g+1).trim()}}).filter(Boolean);if(r.length!==0){for(var n=null,a=t.nextElementSibling;a;){var i=a.tagName&&a.tagName.match(/^H(\d)$/);if(i){n=parseInt(i[1]);break}a=a.nextElementSibling}if(n){var l=[],s=null,c=[];for(a=t.nextElementSibling;a;){var i=a.tagName&&a.tagName.match(/^H(\d)$/);if(i){var p=parseInt(i[1]);if(p===n){s&&l.push(s),s={heading:a.textContent.trim(),elements:[a]},c.push(a),a=a.nextElementSibling;continue}if(p<n)break}s&&(s.elements.push(a),c.push(a)),a=a.nextElementSibling}if(s&&l.push(s),l.length!==0){var u=r.map(function(f){var g=null;return l.forEach(function(x){(x.heading.toLowerCase().indexOf(f.label.toLowerCase())!==-1||f.label.toLowerCase().indexOf(x.heading.toLowerCase())!==-1)&&(g=x)}),{region:f,group:g}}),d=fe("rt"),m=document.createElement("div");m.className="region-toggle rounded-lg border border-border bg-surface my-4 overflow-hidden";var v=document.createElement("div");v.className="flex border-b border-border bg-surface-raised",r.forEach(function(f,g){var x=document.createElement("button");x.textContent=f.label,x.className=g===0?"rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors":"rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors",x.setAttribute("data-rt-group",d),x.setAttribute("data-rt-index",g),x.onclick=function(){v.querySelectorAll(".rt-btn").forEach(function(j){j.className="rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"}),x.className="rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors",m.querySelectorAll(".rt-panel").forEach(function(j,z){j.style.display=z===g?"block":"none"})},v.appendChild(x)}),m.appendChild(v),u.forEach(function(f,g){var x=document.createElement("div");x.className="rt-panel p-4",x.style.display=g===0?"block":"none",f.group?f.group.elements.forEach(function(j,z){z!==0&&x.appendChild(j.cloneNode(!0))}):x.innerHTML='<p class="text-text-muted">No content for '+Q(f.region.label)+"</p>",m.appendChild(x)}),c.forEach(function(f){f.parentNode&&f.parentNode.removeChild(f)}),t.parentNode.replaceChild(m,t)}}}}})}typeof window<"u"&&(window.processRegionDirectives=A);import{html as N}from"htm/preact";import"preact/hooks";var b=({children:e,className:t})=>N`
  <div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md ${t||""}">
    ${e}
  </div>
`,w=({title:e,children:t})=>N`
  <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
    <span class="font-bold text-gray-100 text-base">${e}</span>
    ${t}
  </div>
`,C=({type:e})=>e?N`
    <span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">
      ${e}
    </span>
  `:null,D=()=>N`
  <span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">
    required
  </span>
`,h=({open:e,className:t})=>N`
  <span class="text-gray-500 text-xs transition-transform duration-200 inline-block ${e?"rotate-90":""} ${t||""}">
    ▶
  </span>
`,S=({text:e})=>N`
  <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">
    ${e}
  </span>
`;import{html as $}from"htm/preact";import{useState as We}from"preact/hooks";var Qe=({field:e})=>{let[t,o]=We(!1),r=e.description||e.values&&e.values.length>0;return $`
    <div class="border-b border-gray-700/50 last:border-b-0">
      <div
        class="flex items-center gap-2 px-4 py-2.5 ${r?"cursor-pointer hover:bg-gray-800/40":""}"
        onClick=${()=>r&&o(!t)}
      >
        ${r?$`<${h} open=${t} />`:$`<span class="w-2 inline-block" />`}
        <span class="text-gray-200 font-mono text-sm">${e.name}</span>
        <${C} type=${e.type} />
        ${e.required&&$`<${D} />`}
      </div>
      ${t&&r&&$`
        <div class="px-4 pb-3 pl-8 text-gray-400 text-sm space-y-1">
          ${e.description&&$`<p class="m-0">${e.description}</p>`}
          ${e.values&&e.values.length>0&&$`
            <div class="flex flex-wrap gap-1">
              ${e.values.map((n,a)=>$`
                <span key=${a} class="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                  ${String(n)}
                </span>
              `)}
            </div>
          `}
        </div>
      `}
    </div>
  `},xe=({data:e})=>{let t=e.name||"Entity",o=e.fields||[];return $`
    <${b}>
      <${w} title=${t}>
        ${e.parent&&$`
          <span class="text-gray-400 text-xs font-mono">extends ${e.parent}</span>
        `}
      <//>
      <div>
        ${o.map((r,n)=>$`
          <${Qe} key=${r.name||n} field=${r} />
        `)}
      </div>
    <//>
  `};import{html as J}from"htm/preact";var ge=({data:e})=>{let t=Array.isArray(e)?e:e.items||e.cards||[];return!t||t.length===0?J`<p class="text-text-muted text-center">No cards available</p>`:J`
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-2">
      ${t.map((o,r)=>J`
        <a
          key=${r}
          href=${o.href||"#"}
          class="block bg-surface rounded-xl p-5 md:p-6 min-h-[120px] border border-border hover:border-primary/40 hover:shadow-[0_2px_12px_rgba(8,145,178,0.08)] hover:-translate-y-0.5 transition-all duration-200 group no-underline"
          style="text-decoration: none"
        >
          <div class="text-2xl md:text-3xl mb-2 md:mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 origin-left font-mono text-primary">
            ${o.icon}
          </div>
          <h3
            class="text-base md:text-lg font-bold text-text-primary mb-1 md:mb-1.5 group-hover:text-primary transition-colors"
            style="border: none; margin-top: 0; padding: 0;"
          >
            ${o.title||"Untitled"}
          </h3>
          <p class="text-sm text-text-muted leading-relaxed" style="margin: 0;">
            ${o.description||""}
          </p>
        </a>
      `)}
    </div>
  `};import{html as T}from"htm/preact";import{useState as Je}from"preact/hooks";var Xe={GET:"bg-blue-500/90",POST:"bg-emerald-500/90",PUT:"bg-amber-500/90 text-black",PATCH:"bg-orange-500/90",DELETE:"bg-rose-500/90"},be=({data:e})=>{let[t,o]=Je(!1),r=(e.method||"GET").toUpperCase(),n=e.path||"/",a=e.description||"",i=e.params||[],l=e.response||"",s=i.length>0||l;return T`
    <${b}>
      <div class="flex items-center px-4 py-3 hover:bg-gray-800/40 transition-colors ${s?"cursor-pointer":""}"
           onClick=${()=>s&&o(!t)}>
        <span class="inline-block ${Xe[r]||"bg-gray-500"} text-white text-xs font-bold px-2.5 py-1 rounded-md mr-3 font-mono tracking-wide">
          ${r}
        </span>
        <span class="font-mono text-gray-100 text-sm">${n}</span>
        ${a&&T`<span class="text-gray-400 text-sm ml-3">${a}</span>`}
        ${s&&T`<span class="ml-auto"><${h} open=${t} /></span>`}
      </div>
      ${t&&s&&T`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/60">
          ${i.length>0&&T`
            <div class="mb-3">
              <div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>
              <table class="text-left" style="background: white; border-radius: 0.5rem; overflow: hidden; border: 1px solid var(--color-border); width: auto !important; display: table">
                <thead>
                  <tr style="border-bottom: 1px solid var(--color-border-strong); background: var(--color-surface-raised)">
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Name</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Type</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Required</th>
                  </tr>
                </thead>
                <tbody>
                  ${i.map(c=>T`
                    <tr style="border-bottom: 1px solid var(--color-border); background: white">
                      <td class="px-3 py-2 font-mono text-sm" style="color: var(--color-primary-text)">${c.name}</td>
                      <td class="px-3 py-2 text-sm font-mono" style="color: var(--color-text-secondary)">${c.type||"any"}</td>
                      <td class="px-3 py-2">
                        ${c.required?T`<span class="text-rose-300 text-xs font-medium">required</span>`:T`<span class="text-gray-500 text-xs">optional</span>`}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
          ${l&&T`
            <div>
              <div class="text-gray-300 text-sm font-semibold mb-2">Response</div>
              <pre class="rounded-lg p-3 pt-10 text-sm overflow-x-auto"
                   style="background: var(--color-code-bg) !important; color: var(--color-code-text) !important; border: 1px solid rgba(255,255,255,0.1) !important; position: relative">
                <code style="background: transparent !important; color: inherit !important">${l}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `};import{html as k}from"htm/preact";import{useState as Ve}from"preact/hooks";var ye=[{bg:"bg-blue-500/15",border:"border-blue-500/50",text:"text-blue-400",activeBg:"bg-blue-500",activeText:"text-white"},{bg:"bg-amber-500/15",border:"border-amber-500/50",text:"text-amber-400",activeBg:"bg-amber-500",activeText:"text-black"},{bg:"bg-emerald-500/15",border:"border-emerald-500/50",text:"text-emerald-400",activeBg:"bg-emerald-500",activeText:"text-white"},{bg:"bg-rose-500/15",border:"border-rose-500/50",text:"text-rose-400",activeBg:"bg-rose-500",activeText:"text-white"},{bg:"bg-purple-500/15",border:"border-purple-500/50",text:"text-purple-400",activeBg:"bg-purple-500",activeText:"text-white"},{bg:"bg-cyan-500/15",border:"border-cyan-500/50",text:"text-cyan-400",activeBg:"bg-cyan-500",activeText:"text-white"}],ve=({data:e})=>{let[t,o]=Ve(null),r=e.states||[];return r.length===0?k`<p class="text-text-muted">No states defined</p>`:k`
    <${b}>
      <div class="flex flex-wrap items-center gap-2 mb-1 p-4">
        ${r.map((n,a)=>{let i=ye[a%ye.length],l=t===a,s=l?`sf-btn ${i.activeBg} border ${i.border} ${i.activeText}`:`sf-btn ${i.bg} border ${i.border} ${i.text}`;return k`
            <button class="${s} text-sm font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80 whitespace-nowrap"
                    onClick=${()=>o(l?null:a)}>
              ${n.label||n.id}
            </button>
            ${a<r.length-1&&k`<span class="text-gray-600 mx-1.5 flex-shrink-0">→</span>`}
          `})}
      </div>
      ${t!==null&&k`
        <div class="mt-3 px-4 py-3 bg-gray-800/40 rounded-lg border border-gray-700/50 mx-4 mb-4">
          ${r[t].trigger&&k`
            <div class="mb-2"><${S} text="Trigger:" /> <span class="text-gray-300 text-sm">${r[t].trigger}</span></div>
          `}
          ${r[t].next&&r[t].next.length>0&&k`
            <div class="mb-2"><${S} text="Next states:" />${" "}
              <span class="text-sm">${r[t].next.map(n=>k`<${C} type=${n} />`)}</span>
            </div>
          `}
          ${r[t].effects&&r[t].effects.length>0&&k`
            <div><${S} text="Side effects:" />${" "}
              <span class="text-sm">${r[t].effects.map(n=>k`
                <span class="inline-block bg-cyan-900/25 text-cyan-300 text-xs px-2 py-0.5 rounded-md mr-1">${n}</span>
              `)}</span>
            </div>
          `}
        </div>
      `}
    <//>
  `};import{html as _}from"htm/preact";import{useState as Ke}from"preact/hooks";var he=({data:e})=>{let[t,o]=Ke(null),r=e.title||"",n=e.code||"",a=e.annotations||[],i=n.split(`
`),l={};return a.forEach((s,c)=>{l[s.line]={index:c+1,text:s.text}}),_`
    <${b}>
      ${r&&_`
        <${w} title=${r}>
          <span class="text-gray-500 text-xs">${a.length} annotation${a.length!==1?"s":""}</span>
        <//>
      `}
      <div class="py-3 font-mono text-sm leading-relaxed overflow-x-auto">
        ${i.map((s,c)=>{let p=c+1,u=l[p];return _`
            <div class="ce-line relative pr-8 ${u?"bg-cyan-500/5":""}">
              <span class="text-gray-600 select-none inline-block w-8 text-right mr-3 text-xs">${p}</span>
              <span>${s}</span>
              ${u&&_`
                <span class="ce-marker absolute -right-1 top-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold cursor-pointer hover:bg-cyan-400 transition-colors"
                      onClick=${d=>{d.stopPropagation(),o(t===u.index?null:u.index)}}
                      title="Click for annotation">
                  ${u.index}
                </span>
              `}
            </div>
          `})}
      </div>
      ${a.map((s,c)=>{let p=c+1;return t!==p?null:_`
          <div class="px-4 py-3 bg-gray-800/60 border-l-2 border-cyan-500 mx-4 my-2 rounded-r-lg">
            <div class="flex items-start gap-2">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">${p}</span>
              <span class="text-gray-300 text-sm leading-relaxed">${s.text}</span>
            </div>
          </div>
        `})}
    <//>
  `};import{html as y}from"htm/preact";import{useState as X}from"preact/hooks";var Ye=({dir:e})=>{let[t,o]=X(!1),r=e.example||e.details;return y`
    <div class="dt-directive border-b border-gray-700/50 last:border-b-0">
      <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors ${r?"cursor-pointer":""}"
           onClick=${()=>r&&o(!t)}>
        <span class="mr-2">
          ${r?y`<${h} open=${t} />`:y`<span class="w-2 inline-block" />`}
        </span>
        <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${e.name||""}</span>
        <span class="text-gray-400 text-sm flex-1 truncate">${e.description||""}</span>
        <span class="ml-auto flex items-center gap-2 flex-shrink-0">
          <${C} type=${e.type} />
          ${e.default!==void 0&&y`
            <span class="inline-block bg-gray-700/60 text-gray-400 text-xs px-2 py-0.5 rounded-md">default: ${e.default}</span>
          `}
        </span>
      </div>
      ${t&&r&&y`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/50">
          ${e.details&&y`<p class="text-gray-400 text-sm mb-2 leading-relaxed">${e.details}</p>`}
          ${e.example&&y`
            <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
              <code class="language-json text-xs">${e.example}</code>
            </pre>
          `}
        </div>
      `}
    </div>
  `},Ze=({cat:e})=>{let[t,o]=X(!0),r=e.directives||[];return y`
    <div class="dt-category">
      <div class="bg-gray-800/60 px-4 py-2.5 border-b border-gray-700/60 flex items-center gap-2 cursor-pointer"
           onClick=${()=>o(!t)}>
        <${h} open=${t} />
        <span class="font-semibold text-gray-200 text-sm">${e.name||"Uncategorized"}</span>
        <span class="text-gray-500 text-xs ml-auto">${r.length}</span>
      </div>
      ${t&&y`
        <div>${r.map(n=>y`<${Ye} dir=${n} />`)}</div>
      `}
    </div>
  `},$e=({data:e})=>{let[t,o]=X(""),r=e.title||"Directives",n=e.searchable!==!1,a=e.categories||[],i=a.reduce((c,p)=>c+(p.directives||[]).length,0),l=a.map(c=>({...c,directives:(c.directives||[]).filter(p=>{if(!t)return!0;let u=t.toLowerCase();return(p.name||"").toLowerCase().includes(u)||(p.description||"").toLowerCase().includes(u)})})).filter(c=>c.directives.length>0),s=l.reduce((c,p)=>c+p.directives.length,0);return y`
    <${b}>
      <${w} title=${r} />
      ${n&&y`
        <div class="px-4 py-3 border-b border-gray-700/60">
          <div class="relative">
            <input type="text" placeholder="Search directives..."
                   class="w-full bg-gray-800/60 text-gray-200 text-sm px-3 py-2 pl-8 rounded-lg border border-gray-600/60 focus:border-cyan-500 focus:outline-none transition-colors"
                   value=${t}
                   onInput=${c=>o(c.target.value)} />
            <span class="absolute left-2.5 top-2.5 text-gray-500 text-sm">🔍</span>
          </div>
          <div class="mt-2">
            <span class="text-gray-500 text-xs">${s} of ${i} directives</span>
          </div>
        </div>
      `}
      <div class="max-h-[600px] overflow-y-auto">
        ${l.map(c=>y`<${Ze} cat=${c} />`)}
      </div>
    <//>
  `};import{html as L}from"htm/preact";import{useState as et}from"preact/hooks";var we=({data:e})=>{let[t,o]=et(!1),r=e.name||"Step",n=e.category||"sync",a=e.description||"",i=e.properties||[],l=e.example||"";return L`
    <${b}>
      <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">
        <span class="font-bold text-gray-100 text-base">${r}</span>
        <span class="inline-block text-xs px-2.5 py-0.5 rounded-md font-medium ${n==="async"?"bg-blue-500/20 text-blue-300 border border-blue-500/30":"bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}">
          ${n==="async"?"async":"sync"}
        </span>
      </div>
      ${a&&L`<div class="px-4 py-3 text-gray-300 text-sm leading-relaxed">${a}</div>`}
      ${i.length>0&&L`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40"><${S} text="Properties" /></div>
          ${i.map(c=>L`
            <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700/50 last:border-b-0">
              <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${c.name||""}</span>
              <span class="text-gray-400 text-sm flex-1">${c.description||""}</span>
              <span class="ml-auto flex items-center gap-2 flex-shrink-0">
                <${C} type=${c.type} />
                ${c.required&&L`<${D} />`}
              </span>
            </div>
          `)}
        </div>
      `}
      ${l&&L`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40 cursor-pointer flex items-center gap-2"
               onClick=${()=>o(!t)}>
            <${h} open=${t} />
            <${S} text="Config Example" />
          </div>
          ${t&&L`
            <div class="px-4 py-3 bg-gray-950/40">
              <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
                <code class="language-json text-xs">${l}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `};import{html as q}from"htm/preact";function Ce({panel:e}){let t=e.title||"",o=e.content||"",r=e.language||"",n=e.component||"",a=e.data!=null?e.data:null,i;if(n&&a!=null){let l=le(n);l?i=q`<div class="overflow-auto"><${l} data=${a} /></div>`:i=q`<div class="text-red-500 text-sm">Component not found: ${n}</div>`}else r?i=q`<pre class="!m-0 !rounded-md !bg-gray-900"><code class="language-${r}">${o}</code></pre>`:i=q`<div class="text-sm text-text-secondary whitespace-pre-wrap break-words">${o}</div>`;return q`
    <div class="flex-1 min-w-0">
      <div class="bg-surface border border-border rounded-lg p-4 h-full">
        ${t&&q`
          <div class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 pb-2 border-b border-border">${t}</div>
        `}
        ${i}
      </div>
    </div>
  `}var ke=({data:e})=>q`
    <div class="flex flex-col md:flex-row gap-4 my-4">
      <${Ce} panel=${e.left||{}} />
      <${Ce} panel=${e.right||{}} />
    </div>
  `;import{html as E}from"htm/preact";function Se({node:e,prefix:t}){let o=e.name||"",r=e.description||"";return E`
    <div>
      <div class="flex items-baseline leading-relaxed">
        <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${t}</span>
        <span class="font-mono text-cyan-300 text-sm">${o}</span>
        ${r&&E`
          <span class="text-gray-500 mx-1.5">—</span>
          <span class="text-gray-400 text-sm">${r}</span>
        `}
      </div>
      ${e.children&&e.children.map((n,a)=>{let i=a===e.children.length-1,l=i?"\u2514\u2500\u2500 ":"\u251C\u2500\u2500 ",s=t+(i?"    ":"\u2502   ");return E`<${Se} node=${{...n,_connector:l}} prefix=${s} />`})}
    </div>
  `}var Te=({data:e})=>{let t=e.title||"",o=e.root||"",r=e.items||[];return E`
    <${b}>
      ${t&&E`<${w} title=${t} />`}
      <div class="px-4 py-3 font-mono text-sm overflow-x-auto">
        ${o&&E`<div class="text-gray-300 font-semibold text-sm mb-1">${o}</div>`}
        ${r.map((n,a)=>{let i=a===r.length-1,l=i?"\u2514\u2500\u2500 ":"\u251C\u2500\u2500 ",s=i?"    ":"\u2502   ";return E`
            <div class="flex items-baseline leading-relaxed">
              <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${l}</span>
              <span class="font-mono text-cyan-300 text-sm">${n.name||""}</span>
              ${n.description&&E`
                <span class="text-gray-500 mx-1.5">—</span>
                <span class="text-gray-400 text-sm">${n.description}</span>
              `}
            </div>
            ${n.children&&n.children.map((c,p)=>{let u=p===n.children.length-1,d=u?"\u2514\u2500\u2500 ":"\u251C\u2500\u2500 ",m=s+(u?"    ":"\u2502   ");return E`<${Se} node=${c} prefix=${s+d} />`})}
          `})}
      </div>
    <//>
  `};import{html as Be}from"htm/preact";import{signal as tt,computed as rt}from"@preact/signals";var V=[{id:"n1",title:"Engineering DNA",type:"general",importance:.9,summary:"Separate engine from transport = keeping the DAG clean."},{id:"n2",title:"DAG + credit assignment",type:"general",importance:.85,summary:"Forward DAG + reverse traversal. Backprop, build systems, workflows."},{id:"n3",title:"Fractal DAG",type:"general",importance:.85,summary:"Same DAG pattern at every zoom level, from one line to full SaaS."},{id:"n4",title:"Structure-first",type:"general",importance:.9,summary:"Graphs as the product, apps as views over the same structure."},{id:"n5",title:"DocsifyTemplate drift detection",type:"task",importance:.9,summary:"Backprop pattern for detecting stale docs via reverse traversal."}],H=tt(null),Ee=rt(()=>V.find(e=>e.id===H.value)??null);var Le=()=>Be`
  <div class="bg-surface-raised rounded-xl p-4 border border-border">
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
      <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
        Fence 1 — Node list
      </h4>
    </div>
    <ul class="flex flex-col gap-1 m-0 p-0" style="list-style: none;">
      ${V.map(e=>{let t=H.value===e.id;return Be`
          <li key=${e.id} style="margin: 0;">
            <button
              type="button"
              onClick=${()=>H.value=e.id}
              class=${`w-full text-left px-3 py-2 rounded-md transition-colors border ${t?"bg-primary-light text-primary-text font-semibold border-primary/30":"bg-surface hover:bg-surface-sunken text-text-primary border-transparent"}`}
              style="cursor: pointer;"
            >
              <span class="text-xs text-text-tertiary font-mono mr-2">${e.id}</span>
              ${e.title}
            </button>
          </li>
        `})}
    </ul>
  </div>
`;import{html as qe}from"htm/preact";var Ae=()=>{let e=Ee.value;return e?qe`
    <div class="bg-surface-raised rounded-xl p-4 border border-primary/40">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
        <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
          Fence 2 — Node panel
        </h4>
      </div>
      <h3 class="text-lg font-bold text-text-primary mb-2" style="border: none; margin-top: 0;">
        ${e.title}
      </h3>
      <p class="text-sm text-text-secondary mb-3" style="margin-top: 0;">
        ${e.summary}
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
        <dt class="text-text-tertiary">ID</dt>
        <dd class="font-mono text-text-primary m-0">${e.id}</dd>
        <dt class="text-text-tertiary">Type</dt>
        <dd class="text-text-primary m-0">${e.type}</dd>
        <dt class="text-text-tertiary">Importance</dt>
        <dd class="text-text-primary m-0">${e.importance}</dd>
      </dl>
    </div>
  `:qe`
      <div class="bg-surface-raised rounded-xl p-6 border border-dashed border-border-strong text-center">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="inline-flex w-2 h-2 rounded-full bg-text-muted"></span>
          <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
            Fence 2 — Node panel
          </h4>
        </div>
        <p class="text-sm text-text-tertiary m-0">
          Select a node in fence 1 to populate this panel.
        </p>
      </div>
    `};window.copyToClipboard=function(e){var t=e.getAttribute("data-code").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'");navigator.clipboard.writeText(t).then(function(){var o=e.textContent;e.textContent="Copied!",setTimeout(function(){e.textContent=o},2e3)}).catch(function(o){console.error("Failed to copy:",o)})};var K={"entity-schema":xe,"card-grid":ge,"api-endpoint":be,"status-flow":ve,"config-example":he,"directive-table":$e,"step-type":we,"side-by-side":ke,"file-tree":Te,"dark-container":b,"header-bar":w,"type-badge":C,"required-badge":D,chevron:h,"section-label":S,"node-list":Le,"node-panel":Ae};function Y(e){var t=e.closest("pre");if(!(!t||t.querySelector(".code-copy-btn"))&&!(e.classList.contains("lang-mermaid")||e.classList.contains("language-mermaid"))){t.style.position="relative";var o=document.createElement("button");o.className="code-copy-btn",o.textContent="Copy",o.addEventListener("click",function(){var r=e.textContent;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(r).then(function(){o.textContent="\u2713 Copied",o.classList.add("copied"),setTimeout(function(){o.textContent="Copy",o.classList.remove("copied")},2e3)},function(){o.textContent="Failed",setTimeout(function(){o.textContent="Copy"},1500)});else{var n=document.createElement("textarea");n.value=r,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select();try{document.execCommand("copy"),o.textContent="\u2713 Copied",o.classList.add("copied"),setTimeout(function(){o.textContent="Copy",o.classList.remove("copied")},2e3)}catch{o.textContent="Failed",setTimeout(function(){o.textContent="Copy"},1500)}document.body.removeChild(n)}}),t.appendChild(o)}}function Ne(e){var t=new MutationObserver(function(o){var r=!1;o.forEach(function(n){n.addedNodes.forEach(function(a){a.nodeType===1&&(a.tagName==="PRE"||a.querySelector&&a.querySelector("pre"))&&(r=!0)})}),r&&e.querySelectorAll("pre > code").forEach(Y)});return t.observe(e,{childList:!0,subtree:!0}),function(){t.disconnect()}}function ot(e){let t=e.querySelector(":scope > p");if(t)return t;for(let o of e.childNodes)if(o.nodeType===Node.TEXT_NODE&&o.textContent.trim()){let r=document.createElement("span");return r.className="sidebar-group-title",r.textContent=o.textContent.trim(),e.replaceChild(r,o),r}return null}function nt(e,t){let o=0,r=e.parentElement;for(;r&&r!==t;)r.tagName==="UL"&&o++,r=r.parentElement;return o-1}function at(){for(let e of document.querySelectorAll(".sidebar .collapse"))e.classList.remove("collapse")}function De(){let e=document.querySelector(".sidebar-nav");if(e)for(let t of e.querySelectorAll("li")){if(t.classList.contains("sidebar-group")||t.querySelector(":scope > a")||!t.querySelector(":scope > ul"))continue;let o=ot(t);o&&(t.classList.add("sidebar-group"),t.setAttribute("data-depth",nt(t,e)),t.querySelector("li.active, a.active")||t.classList.add("collapsed"),o.addEventListener("click",r=>{r.preventDefault(),r.stopPropagation(),t.classList.toggle("collapsed")}))}}function je(){function e(t){t.target.closest?.(".sidebar")&&setTimeout(at,0)}return document.addEventListener("click",e),function(){document.removeEventListener("click",e)}}function G(e){let t=e.parentElement,o=document.createElement("div");o.className="mermaid",o.textContent=e.textContent,t.parentElement.replaceChild(o,t)}function I(e){if(!window.mermaid)return;let t=e.querySelectorAll(".mermaid");t.length!==0&&(typeof mermaid.run=="function"?mermaid.run({nodes:t}):mermaid.init(void 0,t))}(function(){document.addEventListener("htmx:configRequest",function(e){var t=e.detail.path;if(!(!t||!t.startsWith("/api/switch/"))){e.preventDefault();var o=t.replace("/api/switch/","");if(!window.__pageSections||!window.__pageSections[o]){console.warn("[htmx-virtual] No section found for:",o);return}var r=document.getElementById("tab-content");r&&(r.className="",r.innerHTML=window.__pageSections[o],r.offsetHeight,r.className="tab-zone-"+o,P(r,{mermaidCode:G,codeBlock:function(n){window.Prism&&Prism.highlightElement(n)}}),I(r),A())}})})();(function(){function e(o){var r=o.route.path||"",n=r.replace(/^\//,"").replace(/\.md$/,"").split("/");if(n=n.filter(function(i){return i.length>0}),n.length<=1)return"";var a=n.slice(0,-1).map(function(i){var l=i.charAt(0).toUpperCase()+i.slice(1);return'<span class="tutorial-breadcrumb-segment">'+l+"</span>"});return'<nav class="tutorial-breadcrumb" aria-label="Breadcrumb">'+a.join('<span class="tutorial-breadcrumb-sep" aria-hidden="true">/</span>')+"</nav>"}function t(o,r){var n=[];n.push(e(r));var a=[];if(a.push('<span class="tutorial-badge">Tutorial</span>'),o.time&&a.push('<span class="tutorial-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+o.time+"</span>"),o.difficulty){var i=o.difficulty;a.push('<span class="tutorial-meta-item tutorial-difficulty-'+i+'">'+i+"</span>")}return n.push('<div class="tutorial-meta-bar">'+a.join("")+"</div>"),o.outcome&&n.push(`<p class="tutorial-outcome"><strong>What you'll build:</strong> `+o.outcome+"</p>"),'<div class="tutorial-header">'+n.join("")+"</div>"}window.$docsify=window.$docsify||{},window.$docsify.plugins=(window.$docsify.plugins||[]).concat([function(r,n){r.afterEach(function(a,i){var l=window.__pageMetadata;if(!l||l.type!=="tutorial"){i(a);return}var s=t(l,n),c=a.indexOf("</h1>");if(c!==-1){var p=c+5;a=a.slice(0,p)+s+a.slice(p)}else a=s+a;i(a)})}])})();pe(window.__docsifyTemplateConfig||{});function st(e={}){let t={...K,...e.components||{}};ce(t),ue(t);function o(i,l,s){return s&&s in t?me(s,l):null}function r(i,l){let c=M().features.tabs,p=c.triggerType||"guide",u=c.labels||{"quick-start":"Quick Start",technical:"Technical Reference"};if(!l||l.type!==p)return i;let d=u.technical||"Technical Reference",m=new RegExp("<h2[^>]*>.*?"+d.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+".*?<\\/h2>","i"),v=i.split(m),f,g;return v.length>=2?(f=v[0],g="<h2>"+d+"</h2>"+v.slice(1).join("")):(f=i,g=i),window.__pageSections={"quick-start":f,technical:g},W([{label:u["quick-start"]||"Quick Start",href:"/api/switch/quick-start",active:!0},{label:d,href:"/api/switch/technical",active:!1}],"tab-content")+'<div id="tab-content" class="tab-zone-quick-start" role="tabpanel">'+f+"</div>"}let n=M();window.$docsify=window.$docsify||{},Object.assign(window.$docsify,{name:n.title,...n.docsify});let a=null;window.$docsify.plugins=(window.$docsify.plugins||[]).concat([function(l){l.init(function(){for(let s of n.prism?.languages||[]){let c=document.createElement("script");c.src=`https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-${s}.min.js`,c.defer=!0,document.body.appendChild(c)}if(B("mermaid")){let s=n.features.mermaid,c=document.createElement("script");c.src="https://cdn.jsdelivr.net/npm/mermaid@10.9/dist/mermaid.min.js",c.onload=()=>mermaid.initialize({startOnLoad:s.startOnLoad??!1,theme:s.theme||"default"}),document.body.appendChild(c)}if(B("devTools")){let s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/eruda",s.onload=()=>eruda.init(),document.body.appendChild(s)}}),l.beforeEach(function(s){return window.__rawMarkdown=s,window.__pageMetadata=null,window.__pageSections=null,ee(s)&&(window.__pageMetadata=te(s),s=re(s)),s=ae(s,{parseYaml:window.jsyaml.load,renderComponent:o}),s}),l.afterEach(function(s,c){if(!B("tabs")){c(s);return}let p=M().features.tabs.triggerType||"guide";if(!window.__pageMetadata||window.__pageMetadata.type!==p){c(s);return}c(r(s,window.__pageMetadata))}),l.doneEach(function(){let s=document.querySelector(".markdown-section");if(!s)return;a&&(a(),a=null);let c=B("copyButton");P(s,{mermaidCode:B("mermaid")?G:null,codeBlock:function(u){window.Prism&&Prism.highlightElement(u),c&&Y(u)}}),A(),B("mermaid")&&I(s),window.htmx&&htmx.process(s),se(s,{});let p={};c&&(p.copyButtons=Ne),a=ie(s,p),setTimeout(De,0)}),je()}])}st({components:K});export{st as createPlugin};
