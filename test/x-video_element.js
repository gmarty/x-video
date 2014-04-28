'use strict';

var assert = chai.assert;

suite('x-video element', function() {
  suite('', function() {
    var xVideo;

    setup(function() {
      xVideo = document.createElement('x-video');
    });

    teardown(function() {
      xVideo = null;
    });

    test('should inherit from HTMLVideoElement', function() {
      assert.instanceOf(xVideo, HTMLVideoElement);
    });
  });

  suite('', function() {
    var xVideo;
    var video;

    var VIDEO_ATTRIBUTES = [
      'src',
      'crossorigin',
      'poster',
      'preload',
      'autoplay',
      'mediagroup',
      'loop',
      'muted',
      //'controls', // We don't want to populate the controls attribute.
      'width',
      'height'
    ];

    var BOOLEAN_ATTRIBUTES = [
      'autoplay',
      'loop',
      'muted',
      //'controls'
    ];

    var NUMBER_ATTRIBUTES = [
      'width',
      'height'
    ];

    setup(function() {
      xVideo = document.createElement('x-video');
      video = document.createElement('video');

      window.xVideo = xVideo;
      window.video = video;
    });

    teardown(function() {
      xVideo = null;
      video = null;
    });

    test('should have the same default properties than a video element', function() {
      VIDEO_ATTRIBUTES.forEach(function(attr) {
        assert.equal(xVideo[attr], video[attr]);
      });
    });

    test('should have boolean properties working on par with video element\'s ones', function() {
      BOOLEAN_ATTRIBUTES.forEach(function(attr) {
        xVideo[attr] = true;
        video[attr] = true;

        assert.equal(xVideo[attr], true);
        assert.equal(video[attr], true);
        assert.equal(xVideo[attr], video[attr]);

        xVideo[attr] = false;
        video[attr] = false;

        assert.equal(xVideo[attr], false);
        assert.equal(video[attr], false);
        assert.equal(xVideo[attr], video[attr]);
      });
    });

    test('should have a src property', function() {
      xVideo.src = '../demo/media/big-buck-bunny.webm';
      video.src = '../demo/media/big-buck-bunny.webm';

      assert.equal(xVideo.src, video.src);
      //assert.equal(xVideo.src, '../demo/media/big-buck-bunny.webm');
      //assert.equal(video.src, '../demo/media/big-buck-bunny.webm');
    });

    test('should have a poster property', function() {
      xVideo.poster = '../demo/media/poster.png';
      video.poster = '../demo/media/poster.png';

      assert.equal(xVideo.poster, video.poster);
      //assert.equal(xVideo.poster, '../demo/media/poster.png');
      //assert.equal(video.poster, '../demo/media/poster.png');
    });

    test('should have a mediagroup property', function() {
      xVideo.mediagroup = 'dummy-medigroup';
      video.mediagroup = 'dummy-medigroup';

      assert.equal(xVideo.mediagroup, video.mediagroup);
      assert.equal(xVideo.mediagroup, 'dummy-medigroup');
      assert.equal(video.mediagroup, 'dummy-medigroup');
    });

    test('should have numeric properties working on par with video element\'s ones', function() {
      NUMBER_ATTRIBUTES.forEach(function(attr) {
        [0, 480, 1280].forEach(function(val) {
          xVideo[attr] = val;
          video[attr] = val;

          assert.equal(xVideo[attr], val);
          assert.equal(video[attr], val);
          assert.equal(xVideo[attr], video[attr]);
        });
      });
    });
  });
});
