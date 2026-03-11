// Directive Table Component — searchable, categorized reference table for DSL directives
// Registers window.DirectiveTable

window.DirectiveTable = function DirectiveTable(data) {
  var title = data.title || 'Directives';
  var searchable = data.searchable !== false;
  var categories = data.categories || [];

  var id = 'dt-' + Math.random().toString(36).substr(2, 6);

  // Count total directives
  var totalCount = 0;
  categories.forEach(function(cat) {
    totalCount += (cat.directives || []).length;
  });

  // Search input
  var searchHtml = '';
  if (searchable) {
    searchHtml = '<div class="px-4 py-3 border-b border-gray-700">' +
      '<div class="relative">' +
        '<input type="text" id="' + id + '-search" placeholder="Search directives..." ' +
          'class="w-full bg-gray-800 text-gray-200 text-sm px-3 py-2 pl-8 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none" ' +
          'oninput="window._dtSearch(\'' + id + '\')">' +
        '<span class="absolute left-2.5 top-2.5 text-gray-500 text-sm">&#128269;</span>' +
      '</div>' +
      '<div class="flex items-center justify-between mt-2">' +
        '<span id="' + id + '-counter" class="text-gray-500 text-xs">' + totalCount + ' of ' + totalCount + ' directives</span>' +
        '<button class="text-gray-500 text-xs hover:text-gray-300 transition-colors" ' +
          'onclick="window._dtToggleAll(\'' + id + '\')">Expand All</button>' +
      '</div>' +
    '</div>';
  }

  // Category sections
  var categoriesHtml = categories.map(function(cat, catIdx) {
    var catId = id + '-cat-' + catIdx;
    var directives = cat.directives || [];

    var directiveRows = directives.map(function(dir, dirIdx) {
      var dirId = catId + '-dir-' + dirIdx;
      var typeBadge = dir.type
        ? '<span class="inline-block bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">' + dir.type + '</span>'
        : '';
      var defaultBadge = dir.default !== undefined
        ? ' <span class="inline-block bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">default: ' + dir.default + '</span>'
        : '';

      var hasDetail = dir.example || dir.details;
      var detailHtml = '';
      if (hasDetail) {
        var detailParts = [];
        if (dir.details) {
          detailParts.push('<p class="text-gray-400 text-sm mb-2">' + dir.details + '</p>');
        }
        if (dir.example) {
          detailParts.push(
            '<pre class="!mt-0 !mb-0 rounded bg-gray-950 border border-gray-700"><code class="language-json text-xs">' +
            dir.example.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</code></pre>'
          );
        }
        detailHtml = '<div id="' + dirId + '" class="hidden px-4 py-3 bg-gray-800/50 border-t border-gray-700">' +
          detailParts.join('') + '</div>';
      }

      var clickAttr = hasDetail
        ? ' onclick="var el=document.getElementById(\'' + dirId + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.dt-chevron\').classList.toggle(\'rotate-90\')" style="cursor:pointer"'
        : '';

      var chevron = hasDetail
        ? '<span class="dt-chevron text-gray-500 text-xs transition-transform duration-200 mr-2">&#9654;</span>'
        : '<span class="mr-2 w-2 inline-block"></span>';

      return '<div class="dt-directive border-b border-gray-700 last:border-b-0" data-dt-name="' + (dir.name || '').toLowerCase() + '" data-dt-desc="' + (dir.description || '').toLowerCase() + '">' +
        '<div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 transition-colors"' + clickAttr + '>' +
          chevron +
          '<span class="font-mono text-cyan-400 text-sm whitespace-nowrap">' + (dir.name || '') + '</span>' +
          '<span class="text-gray-400 text-sm flex-1 truncate">' + (dir.description || '') + '</span>' +
          '<span class="ml-auto flex items-center gap-2 flex-shrink-0">' + typeBadge + defaultBadge + '</span>' +
        '</div>' +
        detailHtml +
      '</div>';
    }).join('');

    return '<div class="dt-category" id="' + catId + '">' +
      '<div class="bg-gray-800/80 px-4 py-2.5 border-b border-gray-700 flex items-center gap-2 cursor-pointer" ' +
        'onclick="var body=document.getElementById(\'' + catId + '-body\');body.classList.toggle(\'hidden\');this.querySelector(\'.dt-cat-chevron\').classList.toggle(\'rotate-90\')">' +
        '<span class="dt-cat-chevron text-gray-400 text-xs transition-transform duration-200 rotate-90">&#9654;</span>' +
        '<span class="font-semibold text-gray-200 text-sm">' + (cat.name || 'Uncategorized') + '</span>' +
        '<span class="text-gray-500 text-xs ml-auto">' + directives.length + '</span>' +
      '</div>' +
      '<div id="' + catId + '-body">' + directiveRows + '</div>' +
    '</div>';
  }).join('');

  return '<div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 my-4 shadow-lg" id="' + id + '" data-dt-total="' + totalCount + '">' +
    '<div class="bg-gray-800 px-4 py-3 border-b border-gray-700">' +
      '<span class="font-bold text-white text-base">' + title + '</span>' +
    '</div>' +
    searchHtml +
    '<div class="max-h-[600px] overflow-y-auto">' + categoriesHtml + '</div>' +
  '</div>';
};

// Search handler
window._dtSearch = function(tableId) {
  var input = document.getElementById(tableId + '-search');
  if (!input) return;
  var query = input.value.toLowerCase().trim();
  var container = document.getElementById(tableId);
  var total = parseInt(container.getAttribute('data-dt-total'));
  var visible = 0;

  var directives = container.querySelectorAll('.dt-directive');
  directives.forEach(function(el) {
    var name = el.getAttribute('data-dt-name') || '';
    var desc = el.getAttribute('data-dt-desc') || '';
    var match = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
    el.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  // Hide empty categories
  var cats = container.querySelectorAll('.dt-category');
  cats.forEach(function(cat) {
    var visibleInCat = cat.querySelectorAll('.dt-directive:not([style*="display: none"])').length;
    cat.style.display = visibleInCat > 0 ? '' : 'none';
  });

  var counter = document.getElementById(tableId + '-counter');
  if (counter) {
    counter.textContent = visible + ' of ' + total + ' directives';
  }
};

// Toggle all categories
window._dtToggleAll = function(tableId) {
  var container = document.getElementById(tableId);
  var bodies = container.querySelectorAll('[id$="-body"]');
  var chevrons = container.querySelectorAll('.dt-cat-chevron');

  // Check if any are hidden
  var anyHidden = false;
  bodies.forEach(function(b) {
    if (b.classList.contains('hidden')) anyHidden = true;
  });

  bodies.forEach(function(b) {
    if (anyHidden) {
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });

  chevrons.forEach(function(c) {
    if (anyHidden) {
      c.classList.add('rotate-90');
    } else {
      c.classList.remove('rotate-90');
    }
  });
};
