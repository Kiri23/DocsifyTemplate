// Region Toggle Component — DOM-level directive processor for data-region
import { escapeHtml, generateId } from './utils.js';

// Also on window for non-module consumers (htmx-virtual.js)
export function processRegionDirectives() {
  var directives = document.querySelectorAll('.markdown-section [data-region]');

  directives.forEach(function(div) {
    var raw = div.getAttribute('data-region');
    if (!raw) return;

    var regions = raw.split(',').map(function(part) {
      var eqIndex = part.indexOf('=');
      if (eqIndex === -1) return null;
      return {
        key: part.substring(0, eqIndex).trim().toLowerCase(),
        label: part.substring(eqIndex + 1).trim()
      };
    }).filter(Boolean);

    if (regions.length === 0) return;

    var headingLevel = null;
    var sibling = div.nextElementSibling;
    while (sibling) {
      var tagMatch = sibling.tagName && sibling.tagName.match(/^H(\d)$/);
      if (tagMatch) { headingLevel = parseInt(tagMatch[1]); break; }
      sibling = sibling.nextElementSibling;
    }
    if (!headingLevel) return;

    var groups = [];
    var currentGroup = null;
    var collected = [];
    sibling = div.nextElementSibling;

    while (sibling) {
      var tagMatch = sibling.tagName && sibling.tagName.match(/^H(\d)$/);
      if (tagMatch) {
        var level = parseInt(tagMatch[1]);
        if (level === headingLevel) {
          if (currentGroup) groups.push(currentGroup);
          currentGroup = { heading: sibling.textContent.trim(), elements: [sibling] };
          collected.push(sibling);
          sibling = sibling.nextElementSibling;
          continue;
        }
        if (level < headingLevel) break;
      }
      if (currentGroup) {
        currentGroup.elements.push(sibling);
        collected.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }
    if (currentGroup) groups.push(currentGroup);
    if (groups.length === 0) return;

    var regionGroups = regions.map(function(region) {
      var match = null;
      groups.forEach(function(g) {
        if (g.heading.toLowerCase().indexOf(region.label.toLowerCase()) !== -1 ||
            region.label.toLowerCase().indexOf(g.heading.toLowerCase()) !== -1) {
          match = g;
        }
      });
      return { region: region, group: match };
    });

    var toggleId = generateId('rt');
    var toggleContainer = document.createElement('div');
    toggleContainer.className = 'region-toggle rounded-lg border border-border bg-surface my-4 overflow-hidden';

    var buttonBar = document.createElement('div');
    buttonBar.className = 'flex border-b border-border bg-surface-raised';

    regions.forEach(function(region, i) {
      var btn = document.createElement('button');
      btn.textContent = region.label;
      btn.className = i === 0
        ? 'rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors'
        : 'rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors';
      btn.setAttribute('data-rt-group', toggleId);
      btn.setAttribute('data-rt-index', i);
      btn.onclick = function() {
        buttonBar.querySelectorAll('.rt-btn').forEach(function(b) {
          b.className = 'rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors';
        });
        btn.className = 'rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors';
        toggleContainer.querySelectorAll('.rt-panel').forEach(function(p, pi) {
          p.style.display = pi === i ? 'block' : 'none';
        });
      };
      buttonBar.appendChild(btn);
    });
    toggleContainer.appendChild(buttonBar);

    regionGroups.forEach(function(rg, i) {
      var panel = document.createElement('div');
      panel.className = 'rt-panel p-4';
      panel.style.display = i === 0 ? 'block' : 'none';
      if (rg.group) {
        rg.group.elements.forEach(function(el, elIdx) {
          if (elIdx === 0) return;
          panel.appendChild(el.cloneNode(true));
        });
      } else {
        panel.innerHTML = '<p class="text-text-muted">No content for ' + escapeHtml(rg.region.label) + '</p>';
      }
      toggleContainer.appendChild(panel);
    });

    collected.forEach(function(el) { if (el.parentNode) el.parentNode.removeChild(el); });
    div.parentNode.replaceChild(toggleContainer, div);
  });
}

// Backwards compat for non-module consumers (htmx-virtual.js)
if (typeof window !== 'undefined') window.processRegionDirectives = processRegionDirectives;
