///<reference path='declarations/xtag.d.ts'/>

(function() {
  'use strict';

  function init(xMenu) {
    xMenu.xtag.xVideo.playlist.forEach(function(video, index) {
      var btn = document.createElement('input');
      btn.type = 'button';
      btn.dataset.id = index;
      btn.className = 'btn';
      btn.value = video.label ?
        video.label : 'Video ' + (index + 1);

      xMenu.appendChild(btn);
    });

    xMenu.xtag.initialized = true;
  }

  xtag.register('x-menu', {
    lifecycle: {
      created: function() {
        var xMenu = this;

        xMenu.xtag.xVideo = null;
        xMenu.xtag.initialized = false;
      },
      inserted: function() {
        var xMenu = this;

        if (xMenu.parentNode.tagName === 'X-VIDEO') {
          xMenu.xtag.xVideo = xMenu.parentNode;
        }
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
        if (!xMenu.xtag.xVideo) {
          return;
        }

        var videoIndex = parseInt(menuBtn.dataset.id, 10);

        xMenu.style.display = 'none';
        xMenu.xtag.xVideo.playByIndex(videoIndex);
      }
    },
    accessors: {
    },
    methods: {
      show: function() {
        var xMenu = this;
        if (!xMenu.xtag.xVideo) {
          return;
        }

        if (!xMenu.xtag.initialized) {
          init(xMenu);
        }

        xMenu.style.display = 'flex';
      }
    }
  });
})();
