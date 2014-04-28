'use strict';

var assert = chai.assert;

suite('x-video events', function() {
  suite('', function() {
    var xVideo;
    var video;
    var xVideoEvents = [];
    var videoEvents = [];

    var VIDEO_EVENT_TYPES = [
      'abort',
      'canplay',
      'canplaythrough',
      'canshowcurrentframe',
      'dataunavailable',
      'durationchange',
      'emptied',
      'empty',
      'ended',
      'error',
      'loadeddata',
      'loadedmetadata',
      'loadstart',
      'pause',
      'play',
      'playing',
      'progress',
      'ratechange',
      'seeked',
      'seeking',
      'suspend',
      'timeupdate',
      'volumechange',
      'waiting'
    ];

    setup(function() {
      xVideoEvents = [];
      videoEvents = [];

      xVideo = document.createElement('x-video');
      xVideo.setAttribute('src', '../demo/media/big-buck-bunny.webm');
      document.body.appendChild(xVideo);
      video = document.createElement('video');
      video.setAttribute('src', '../demo/media/big-buck-bunny.webm');
      document.body.appendChild(video);

      VIDEO_EVENT_TYPES.forEach(function(evt) {
        function xVideoEvtFn() {
          xVideoEvents.push(evt);
          if (evt === 'timeupdate') {
            xVideo.removeEventListener(evt, xVideoEvtFn);
          }
        }

        xVideo.addEventListener(evt, xVideoEvtFn);

        function videoEvtFn() {
          videoEvents.push(evt);
          if (evt === 'timeupdate') {
            video.removeEventListener(evt, videoEvtFn);
          }
        }

        video.addEventListener(evt, videoEvtFn);
      });

      video.play();
      xVideo.play();
    });

    teardown(function() {
      document.body.removeChild(xVideo);
      document.body.removeChild(video);
    });

    test('should be fired in the same order than a video object', function(done) {
      xVideo.addEventListener('timeupdate', function() {
        video.addEventListener('timeupdate', function() {
          setTimeout(function() {
            assert.deepEqual(xVideoEvents, videoEvents);
            done();
          }, 0);
        });
      });
    });
  });
});
