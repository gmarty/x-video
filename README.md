# x-video

> An enhanced video player for modern browsers with a consistent UI and extra features!

## Introduction

`<x-video>` works as a drop-in replacement for the `<video>` tag. Before:
```html
<video src="video.webm" autoplay loop></video>
```

After:
```html
<x-video src="video.webm" autoplay loop></x-video>
```

Everything works like the original video element:

* `<video>` tag attributes (`controls`, `autoplay`...).
* The video element attributes (`videoWidth`, `muted`...).
* The video element methods (`canPlayType()`, `pause()`...).
* The video element events (`play`, `pause`...).

## Working in a no JavaScript environment

If you want to make sure the player will work on browsers with no JavaScript support, just add a
`<video>` tag with the needed attributes inside your `<x-video>`:
```html
<x-video>
  <video src="video.webm" autoplay loop></video>
</x-video>
```

`x-video` will run normally, but will fallback to the native player if JavaScript is not available.

## Extra features

### Chapter navigation

If you add a chapter track to a video, buttons to navigate to the next/previous chapters are added:
```html
<x-video src="video.webm">
  <track kind="chapters" src="vtt/chapters.vtt" srclang="en" default>
</x-video>
```

At least one `<track>` tag must have a `kind="chapters"` attribute and a `src` pointing to a valid
`vtt` file. In case of several `<track>` elements, the one with a `default` attribute will be picked
up first, otherwise the first in the list will be used.

When one of these 2 buttons are clicked, the element fires a `chapterchange` event.

Note: the web server must support the `Range` HTTP header to use this feature.

### Playlist

To play several videos successively, add multiple `<video>` tags inside a `<x-video>` container:
```html
<x-video controls autoplay>
  <video src="video-1.webm"></video>
  <video src="video-2.webm"></video>
  <video src="video-3.webm"></video>
</x-video>
```

The videos will be played one after another. Only the attributes of the first one will be preserved,
the attributes from the subsequent elements will be ignored.

A `videochange` event is fired when a new element from the playlist is loaded. By default, the new
video is only loaded, but not played. To play it, add a `autoplay` attribute to `<x-video>` or
listen to the `videochange` event to trigger the playback in JavaScript:
```javascript
xVideo.addEventListener('videochange', function() {
  this.play();
});
```
