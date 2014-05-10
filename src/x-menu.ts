///<reference path='declarations/xtag.d.ts'/>

/** @const */ enum MENU_MODE {
  GLOBAL,
  LOCAL
}

(function() {
  'use strict';

  function init(xMenu) {
    if (xMenu.xtag.mode === null) {
      return;
    }

    if (!xMenu.hasChildNodes()) {
      // If there is nothing inside the <x-menu>tag, we create a simple navigation menu.
      if (xMenu.xtag.mode === MENU_MODE.GLOBAL) {
        xMenu.xtag.parent.playlist.forEach(function(video, index) {
          var btn = document.createElement('input');
          btn.type = 'button';
          btn.dataset.id = index;
          btn.className = 'btn';
          btn.value = video.label ?
            video.label : 'Video ' + (index + 1);

          xMenu.appendChild(btn);
        });
      } else if (xMenu.xtag.mode === MENU_MODE.LOCAL) {
        xMenu.xtag.videoSrcElement.chapterCues.forEach(function(chapter, index) {
          var btn = document.createElement('input');
          btn.type = 'button';
          btn.dataset.id = index;
          btn.className = 'btn';
          btn.value = chapter.text ?
            chapter.text : 'Chapter ' + (index + 1);

          xMenu.appendChild(btn);
        });
      }
    }

    // Dismiss the menu when pressing the `Esc` key.
    xtag.addEvent(document, 'keyup:keypass(27)', function(event) {
      xMenu.hide();
    });

    xMenu.xtag.initialized = true;
  }

  xtag.register('x-menu', {
    lifecycle: {
      created: function() {
        var xMenu = this;

        xMenu.xtag.mode = null;
        xMenu.xtag.parent = xMenu.parentNode;
        xMenu.xtag.videoSrcElement = null;

        // @todo Emit an `init` event in x-video and listen it here.
        setTimeout(function() {
          if (!xMenu.hasAttribute('for')) {
            xMenu.xtag.mode = MENU_MODE.GLOBAL;
          } else {
            xMenu.xtag.mode = MENU_MODE.LOCAL;

            // Get a reference to parent playlist or chapterCues.
            var targetId = xMenu.getAttribute('for');
            var targetIndex: number = null;
            xMenu.xtag.parent.playlist.some(function(video, index) {
              if (video.id === targetId) {
                targetIndex = index;
                return true;
              }
              return false;
            });

            if (targetIndex !== null) {
              xMenu.xtag.videoSrcElement = xMenu.xtag.parent.playlist[targetIndex];
            }
          }
        }, 16);
      },
      inserted: function() {
      },
      removed: function() {
      },
      attributeChanged: function(attribute, oldValue, newValue) {
      }
    },
    events: {
      'click:delegate(input[type="button"])': function(event) {
        var menuBtn = event.target;
        var xMenu = menuBtn.parentNode;
        if (!xMenu.xtag.parent) {
          return;
        }

        var index = parseInt(menuBtn.dataset.id, 10);

        if (xMenu.xtag.mode === MENU_MODE.GLOBAL) {
          xMenu.xtag.parent.playByIndex(index);
        } else if (xMenu.xtag.mode === MENU_MODE.LOCAL) {
          xMenu.xtag.parent.playChapter(index);
        }

        xMenu.hide();
      }
    },
    accessors: {
    },
    methods: {
      show: function() {
        var xMenu = this;
        if (!xMenu.xtag.parent) {
          return;
        }

        if (!xMenu.xtag.initialized) {
          init(xMenu);
        }

        xMenu.style.display = 'flex';
      },
      hide: function() {
        var xMenu = this;
        xMenu.style.display = 'none';
      }
    }
  });
})();
