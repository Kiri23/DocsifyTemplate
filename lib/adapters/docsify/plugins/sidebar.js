// Prevent Docsify's built-in sidebar collapse behavior.
//
// Problem: When you click an already-active sidebar link a second time, Docsify
// toggles a 'collapse' class on the li.active element, which hides its children.
// The menu item disappears after the second click — confusing for users.
//
// Fix: Strip the 'collapse' class immediately after any sidebar click so items
// always stay visible. A CSS override in theme.css prevents the visual flicker.
(function() {
  document.addEventListener('click', function(e) {
    if (!e.target.closest || !e.target.closest('.sidebar')) return;
    setTimeout(function() {
      var items = document.querySelectorAll('.sidebar li.collapse');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('collapse');
      }
    }, 0);
  }, false);
})();
