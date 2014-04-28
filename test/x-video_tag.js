'use strict';

var assert = chai.assert;

suite('x-video tag', function() {
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
  });

  teardown(function() {
    xVideo = null;
    video = null;
  });

  test('should have the same default attributes than a video tag', function() {
    VIDEO_ATTRIBUTES.forEach(function(attr) {
      assert.equal(xVideo.getAttribute(attr), xVideo.getAttribute(attr));
    });
  });

  test('should have boolean attributes working on par with video tag\'s ones', function() {
    BOOLEAN_ATTRIBUTES.forEach(function(attr) {
      xVideo.setAttribute(attr, 'true');
      video.setAttribute(attr, 'true');

      assert.isTrue(xVideo.hasAttribute(attr));
      assert.isTrue(video.hasAttribute(attr));

      assert.equal(xVideo.getAttribute(attr), 'true');
      assert.equal(video.getAttribute(attr), 'true');
      assert.equal(xVideo.getAttribute(attr), video.getAttribute(attr));

      xVideo.removeAttribute(attr);
      video.removeAttribute(attr);

      assert.isFalse(xVideo.hasAttribute(attr));
      assert.isFalse(video.hasAttribute(attr));

      assert.isNull(xVideo.getAttribute(attr));
      assert.isNull(video.getAttribute(attr));
      assert.equal(xVideo.getAttribute(attr), video.getAttribute(attr));
    });
  });

  test('should have a src attribute', function() {
    xVideo.setAttribute('src', '../demo/media/big-buck-bunny.webm');
    video.setAttribute('src', '../demo/media/big-buck-bunny.webm');

    assert.equal(xVideo.getAttribute('src'), video.getAttribute('src'));
    assert.equal(xVideo.getAttribute('src'), '../demo/media/big-buck-bunny.webm');
    assert.equal(video.getAttribute('src'), '../demo/media/big-buck-bunny.webm');
  });

  test('should have a poster attribute', function() {
    xVideo.setAttribute('poster', '../demo/media/poster.png');
    video.setAttribute('poster', '../demo/media/poster.png');

    assert.equal(xVideo.getAttribute('poster'), video.getAttribute('poster'));
    assert.equal(xVideo.getAttribute('poster'), '../demo/media/poster.png');
    assert.equal(video.getAttribute('poster'), '../demo/media/poster.png');
  });

  test('should have a mediagroup attribute', function() {
    xVideo.setAttribute('mediagroup', 'dummy-mediagroup');
    video.setAttribute('mediagroup', 'dummy-mediagroup');

    assert.equal(xVideo.getAttribute('mediagroup'), video.getAttribute('mediagroup'));
    assert.equal(xVideo.getAttribute('mediagroup'), 'dummy-mediagroup');
    assert.equal(video.getAttribute('mediagroup'), 'dummy-mediagroup');
  });

  test('should have numeric attributes working on par with video tag\'s ones', function() {
    NUMBER_ATTRIBUTES.forEach(function(attr) {
      [0, 480, 1280].forEach(function(val) {
        xVideo.setAttribute(attr, val);
        video.setAttribute(attr, val);

        assert.equal(xVideo.getAttribute(attr), val);
        assert.equal(video.getAttribute(attr), val);
        assert.equal(xVideo.getAttribute(attr), video.getAttribute(attr));
      });
    });
  });
});
