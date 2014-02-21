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

## Extra features

### Chapter navigation

If you add a chapter track to a video, buttons to navigate to the next/previous chapters are added:
```html
<x-video src="video.webm">
  <track kind="chapters" src="vtt/chapters.vtt" srclang="en">
</x-video>
```

At least one `<track>` tag must have a `kind='chapters'` attribute and a `src` pointing to a valid
`vtt` file.

When one of these 2 buttons are clicked, the element fires a `chapterchange` event.

Note: the web server must support the `Range` HTTP header to use this feature.
