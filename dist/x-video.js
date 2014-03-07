///<reference path='declarations/xtag.d.ts'/>
(function () {
    'use strict';

    // As per the spec.
    /** @const */ var defaultWidth = 300;
    /** @const */ var defaultHeight = 150;

    // The list of attributes of the <video> tag to populate to the inner video element of x-video.
    // From http://www.w3.org/TR/html5/embedded-content-0.html#the-video-element
    var videoAttributes = [
        'src',
        'crossorigin',
        'poster',
        'preload',
        'autoplay',
        'mediagroup',
        'loop',
        'muted',
        'width',
        'height'
    ];

    // From https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
    var videoEventTypes = [
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
        'audioAvailable',
        'MozAudioAvailable',
        'WebkitAudioAvailable',
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

    var fullscreenEnabledPrefixes = [
        'fullscreenEnabled',
        'mozFullScreenEnabled',
        'webkitFullscreenEnabled',
        'msFullscreenEnabled',
        'fullScreenEnabled'
    ];

    var requestFullscreenPrefixes = [
        'requestFullscreen',
        'msRequestFullscreen',
        'mozRequestFullScreen',
        'webkitRequestFullscreen',
        'requestFullScreen'
    ];

    var template = xtag.createFragment('<div class="media-controls">' + '<div class="media-controls-enclosure">' + '<div class="media-controls-panel" style="transition:opacity 0.3s;-webkit-transition:opacity 0.3s;opacity:1;">' + '<input type="button" class="media-controls-rewind-button" style="display:none;">' + '<input type="button" class="media-controls-play-button">' + '<input type="button" class="media-controls-forward-button" style="display:none;">' + '<input type="range" value="0" step="any" max="0" class="media-controls-timeline">' + '<div class="media-controls-current-time-display">0:00</div>' + '<div class="media-controls-time-remaining-display" style="display:none;">0:00</div>' + '<input type="button" class="media-controls-mute-button">' + '<input type="range" value="1" step="any" max="1" class="media-controls-volume-slider">' + '<input type="button" class="media-controls-toggle-closed-captions-button" style="display:none;">' + '<input type="button" class="media-controls-fullscreen-button" style="display:none;">' + '</div>' + '</div>' + '</div>');

    /**
    * Transform a time in second to a human readable format.
    * Hours are only displayed if > 0:
    *  * 0:15   (minutes + seconds)
    *  * 0:0:15 (hours + minutes + seconds)
    * Seconds are padded with leading 0.
    *
    * @param {number} time
    * @returns {string}
    */
    function formatTimeDisplay(time) {
        var hours = Math.floor(time / 60 / 60);
        var minutes = Math.floor((time - (hours * 60 * 60)) / 60);
        var seconds = Math.floor(time - (hours * 60 * 60) - (minutes * 60));

        if (hours > 0 && minutes > 0) {
            return hours + ':' + minutes + ':' + padWithZero(seconds);
        }
        return minutes + ':' + padWithZero(seconds);

        /**
        * @param {number} num
        * @returns {string}
        */
        function padWithZero(num) {
            return ('00' + num).slice(-2);
        }
    }

    /**
    * Load a *.vtt file and parse it.
    * Shamelessly stolen from http://www.html5videoguide.net/demos/google_io/3_navigation/
    *
    * @param {string} url
    * @param callback
    */
    function loadWebVTTFile(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Content-Type', 'text/vtt; charset=utf-8');
        xhr.overrideMimeType && xhr.overrideMimeType('text/vtt');
        xhr.addEventListener('load', function (event) {
            var status = event.target.status;
            if (status === 200) {
                callback(parseWebVTT(event.target.response));
            } else {
                console.error('Error retrieving the URL %s.', url);
            }
        }, false);
        xhr.send();
    }

    /**
    * Parse a *.vtt file.
    *
    * @param {string} data
    * @returns {Array.<Object>}
    */
    function parseWebVTT(data) {
        var srt = '';

        // Check WEBVTT identifier.
        if (data.substring(0, 6) !== 'WEBVTT') {
            console.error('Missing WEBVTT header: Not a WebVTT file - trying SRT.');
            srt = data;
        } else {
            // Remove WEBVTT identifier line.
            srt = data.split('\n').slice(1).join('\n');
        }

        // clean up string a bit
        srt = srt.replace(/\r+/g, ''); // remove DOS newlines
        srt = srt.trim();

        //srt = srt.replace(/<[a-zA-Z\/][^>]*>/g, ''); // remove all html tags for security reasons
        // parse cues
        var cues = [];
        var cuelist = srt.split('\n\n');
        for (var i = 0; i < cuelist.length; i++) {
            var cue = cuelist[i];
            var id = '';
            var startTime = 0;
            var endTime = 0;
            var text = '';
            var s = cue.split(/\n/);
            var t = 0;

            // is there a cue identifier present?
            if (!s[t].match(/(\d+):(\d+):(\d+)/)) {
                // cue identifier present
                id = s[0];
                t = 1;
            }

            // is the next line the time string
            if (!s[t].match(/(\d+):(\d+):(\d+)/)) {
                continue;
            }

            // parse time string
            var m = s[t].match(/(\d+):(\d+):(\d+)(?:.(\d+))?\s*-->\s*(\d+):(\d+):(\d+)(?:.(\d+))?/);
            if (m) {
                startTime = (parseInt(m[1], 10) * 60 * 60) + (parseInt(m[2], 10) * 60) + (parseInt(m[3], 10)) + (parseInt(m[4], 10) / 1000);
                endTime = (parseInt(m[5], 10) * 60 * 60) + (parseInt(m[6], 10) * 60) + (parseInt(m[7], 10)) + (parseInt(m[8], 10) / 1000);
            } else {
                continue;
            }

            // concatenate text lines to html text
            text = s.slice(t + 1).join('<br>');

            cues.push({ id: id, startTime: startTime, endTime: endTime, text: text });
        }

        return cues;
    }

    /**
    * Return the current chapter id from a list of cues and a time.
    *
    * @param {Array.<Object>} cues
    * @param {number} currentTime
    * @returns {number}
    */
    function getCurrentChapter(cues, currentTime) {
        var currentChapter = null;

        cues.some(function (cue, chapter) {
            if (cue.startTime <= currentTime && currentTime <= cue.endTime) {
                currentChapter = chapter;
                return true;
            }
            return false;
        });

        return currentChapter;
    }

    xtag.register('x-video', {
        prototype: Object.create(HTMLVideoElement.prototype),
        lifecycle: {
            created: function () {
                var xVideo = this;

                // The initial list of DOM element children of <x-video> element.
                var children = xtag.toArray(xVideo.children);

                // First of all, we hide the native player in Chrome, not needed as JavaScript is enabled.
                var styleTag = document.createElement('style');
                styleTag.textContent = 'x-video video::-webkit-media-controls{display:none}';
                xVideo.appendChild(styleTag);

                // Setting some object's properties.
                xVideo.currentVideo = 0; // The index of the current video in the playlist.
                xVideo.preTimelinePausedStatus = false; // The paused state of the video before using timeline.
                xVideo.playlist = children.filter(function (child) {
                    return child.tagName === 'VIDEO';
                }).map(function (child, index) {
                    var src = child.getAttribute('src');
                    if (index > 0) {
                        // We remove all the video, except the first one, but keep a reference to the src.
                        xVideo.removeChild(child);
                    }
                    return src;
                }).filter(function (src, index) {
                    // We remove empty src.
                    return typeof src === 'string';
                });
                if (xVideo.hasAttribute('src')) {
                    xVideo.playlist = [xVideo.getAttribute('src')].concat(xVideo.playlist);
                }

                // Appending the internal elements.
                this.appendChild(template.cloneNode(true));

                // Set HTML elements.
                this.xtag.mediaControls = this.querySelector('.media-controls'); // Target for fullscreen.
                this.xtag.mediaControlsEnclosure = this.querySelector('.media-controls-enclosure');
                this.xtag.mediaControlsPanel = this.querySelector('.media-controls-panel');
                this.xtag.rewindButton = this.querySelector('.media-controls-rewind-button');
                this.xtag.playButton = this.querySelector('.media-controls-play-button');
                this.xtag.forwardButton = this.querySelector('.media-controls-forward-button');
                this.xtag.timeline = this.querySelector('.media-controls-timeline');
                this.xtag.currentTimeDisplay = this.querySelector('.media-controls-current-time-display');
                this.xtag.timeRemainingDisplay = this.querySelector('.media-controls-time-remaining-display');
                this.xtag.muteButton = this.querySelector('.media-controls-mute-button');
                this.xtag.volumeSlider = this.querySelector('.media-controls-volume-slider');
                this.xtag.closedCaptionsButton = this.querySelector('.media-controls-closed-captions-button');
                this.xtag.fullscreenButton = this.querySelector('.media-controls-fullscreen-button');

                // Is there already an inner video element?
                var tmpVideo = null;
                children.some(function (child) {
                    if (child.tagName === 'VIDEO') {
                        tmpVideo = child;
                        return true;
                    }
                    return false;
                });

                if (tmpVideo) {
                    // There is already an inner <video> tag.
                    this.xtag.video = tmpVideo;

                    // Copy HTML attributes of inner <video> tag on <x-video> tag.
                    videoAttributes.forEach(function (attribute) {
                        if (xVideo.xtag.video.hasAttribute(attribute)) {
                            xVideo.setAttribute(attribute, xVideo.xtag.video.getAttribute(attribute));
                        }
                    });
                    if (xVideo.xtag.video.hasAttribute('controls')) {
                        xVideo.setAttribute('controls', xVideo.xtag.video.getAttribute('controls'));
                        xVideo.xtag.video.removeAttribute('controls');
                    }
                } else {
                    // No <video> tag in HTML, we create it.
                    this.xtag.video = document.createElement('video');
                }

                // Copy HTML attributes of <x-video> tag on inner <video> tag.
                videoAttributes.forEach(function (attribute) {
                    if (xVideo.hasAttribute(attribute)) {
                        xVideo.xtag.video.setAttribute(attribute, xVideo.getAttribute(attribute));
                    }
                });

                this.xtag.mediaControls.insertBefore(this.xtag.video, this.xtag.mediaControlsEnclosure);

                // Move x-video children elements to the inner video element.
                children.forEach(function (child) {
                    if (child === xVideo.xtag.video || (child.tagName !== 'TRACK' && child.tagName !== 'SOURCE')) {
                        return;
                    }
                    xVideo.xtag.video.appendChild(child);
                });

                // From there, we need to update `children` to be sure to refer to the inner video children.
                children = xtag.toArray(this.xtag.video.children);

                // Propagate HTML events of inner video element to x-video element.
                videoEventTypes.forEach(function (eventType) {
                    xVideo.xtag.video.addEventListener(eventType, function (event) {
                        xtag.fireEvent(xVideo, eventType);
                    }, false);
                });

                // Listen to the inner video events to maintain the interface in sync with the video state.
                xtag.addEvents(this.xtag.video, {
                    'play': function (event) {
                        xtag.addClass(xVideo.xtag.playButton, 'paused');
                    },
                    'pause': function (event) {
                        xtag.removeClass(xVideo.xtag.playButton, 'paused');
                    },
                    'durationchange': function (event) {
                        xVideo.xtag.timeline.setAttribute('max', xVideo.xtag.video.duration);
                    },
                    'timeupdate': function (event) {
                        xVideo.xtag.timeline.value = this.currentTime;
                        xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(this.currentTime);
                    },
                    'volumechange': function (event) {
                        if (xVideo.xtag.video.muted) {
                            xtag.addClass(xVideo.xtag.muteButton, 'muted');
                        } else {
                            xtag.removeClass(xVideo.xtag.muteButton, 'muted');
                        }
                        xVideo.xtag.volumeSlider.value = xVideo.xtag.video.volume;
                    },
                    'ended': function (event) {
                        // At the end of the video, update the src to the next in the playlist, if any.
                        if (xVideo.playlist.length > 1 && xVideo.currentVideo < xVideo.playlist.length) {
                            xVideo.currentVideo++;
                            xVideo.xtag.video.src = xVideo.playlist[xVideo.currentVideo];
                        }
                        xtag.fireEvent(xVideo, 'videochange');
                    }
                });

                // Show the media controls bar if the controls attribute is present.
                this.controls = this.hasAttribute('controls');

                // Check if the inner video controls attribute changes.
                var observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        switch (mutation.attributeName) {
                            case 'controls':
                                if (xVideo.hasAttribute('controls')) {
                                    setTimeout(function () {
                                        xVideo.removeAttribute('controls');
                                    }, 10);
                                } else {
                                    setTimeout(function () {
                                        xVideo.setAttribute('controls', 'true');
                                    }, 10);
                                }
                                xVideo.xtag.video.removeAttribute('controls');
                                break;
                        }
                    });
                });
                observer.observe(xVideo.xtag.video, { attributes: true, attributeFilter: ['controls'] });

                // Reset the visual state of the timeline.
                xVideo.xtag.timeline.value = 0;
                xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(0);

                // Update the muted state HTML attribute is present.
                this.muted = this.hasAttribute('muted');

                xVideo.xtag.volumeSlider.value = 1;

                // We show prev/next buttons on playlists.
                if (xVideo.playlist.length > 1) {
                    xVideo.xtag.rewindButton.removeAttribute('style');
                    xVideo.xtag.forwardButton.removeAttribute('style');
                }

                // *** Track elements & chapters management. ***
                xVideo.cues = null;

                // Build a list of all valid track elements.
                var chapterTracks = children.filter(function (child) {
                    return child.tagName === 'TRACK' && child.kind === 'chapters' && child.hasAttribute('src') && child.getAttribute('src') !== '';
                });

                // Then, select the track element with a default attribute...
                var activeChapterTrack = null;
                chapterTracks.some(function (chapterTrack) {
                    if (chapterTrack.hasAttribute('default')) {
                        activeChapterTrack = chapterTrack;
                        return true;
                    }
                    return false;
                });

                // ... or just pick up the first one in the list.
                if (activeChapterTrack === null && chapterTracks.length > 0) {
                    activeChapterTrack = chapterTracks[0];
                }

                if (activeChapterTrack) {
                    // We defer processing the WebVTT file in case the browser will do it.
                    xVideo.xtag.video.addEventListener('durationchange', waitForCues, false);
                }

                /**
                * Check if the active chapter track element already has cues loaded and parsed by the
                * browser. If not, we do it ourselves.
                */
                function waitForCues() {
                    if (activeChapterTrack.track.cues && activeChapterTrack.track.cues.length > 0) {
                        // Let the browser do the hard work for us.
                        xVideo.cues = xtag.toArray(activeChapterTrack.track.cues);
                        processCues(xVideo.cues);
                    } else {
                        loadWebVTTFile(activeChapterTrack.src, function (cues) {
                            xVideo.cues = cues;
                            processCues(xVideo.cues);
                        });
                    }

                    // Once executed, we remove the event listener.
                    xVideo.xtag.video.removeEventListener('durationchange', waitForCues, false);
                }

                /**
                * Now that we have cues, we use them and show the chapter navigation buttons.
                *
                * @param {Array.<Object>} cues
                */
                function processCues(cues) {
                    if (!cues.length) {
                        // We expect at least one element.
                        return;
                    }

                    xVideo.xtag.rewindButton.removeAttribute('style');
                    xVideo.xtag.forwardButton.removeAttribute('style');
                }

                // Show the full screen button if the API is available.
                fullscreenEnabledPrefixes.some(function (prefixedFullscreenEnabled) {
                    if (document[prefixedFullscreenEnabled]) {
                        xVideo.xtag.fullscreenButton.removeAttribute('style');
                        return true;
                    }
                    return false;
                });
            },
            inserted: function () {
            },
            removed: function () {
                // @todo Abort the XHR from parseWebVTT() if there is any.
            },
            attributeChanged: function (attribute, oldValue, newValue) {
                if (attribute === 'controls') {
                    this.controls = this.hasAttribute('controls');
                    return;
                }

                if (videoAttributes.indexOf(attribute) > -1) {
                    if (this.hasAttribute(attribute)) {
                        this.xtag.video.setAttribute(attribute, newValue);
                    } else {
                        this.xtag.video.removeAttribute(attribute);
                    }
                }
            }
        },
        events: {
            'click:delegate(.media-controls-play-button)': function (event) {
                if (xVideo.xtag.video.paused) {
                    xVideo.xtag.video.play();
                } else {
                    xVideo.xtag.video.pause();
                }
            },
            'click:delegate(input.media-controls-rewind-button)': function (event) {
                var currentTime = xVideo.xtag.video.currentTime;
                var currentChapter = null;

                if (!xVideo.xtag.video.paused) {
                    // If the video is playing, we substract 1 second to be able to jump to previous
                    // chapter. Otherwise, it would jump at the beginning of the current one.
                    currentTime = Math.max(0, currentTime - 1.000);
                }

                if (currentTime === 0 && xVideo.playlist.length > 1 && xVideo.currentVideo > 0) {
                    // We play the previous video in the playlist.
                    xVideo.currentVideo--;
                    xVideo.xtag.video.src = xVideo.playlist[xVideo.currentVideo];
                    xVideo.xtag.video.play();

                    xtag.fireEvent(xVideo, 'videochange');
                    return;
                }

                if (!xVideo.cues || !xVideo.cues.length) {
                    // No chapters? We go at the beginning of the video.
                    xVideo.xtag.video.currentTime = 0;
                    return;
                }

                currentChapter = getCurrentChapter(xVideo.cues, currentTime);

                if (currentChapter !== null) {
                    // Jump to the previous chapter.
                    xVideo.xtag.video.currentTime = xVideo.cues[currentChapter].startTime;
                    xVideo.xtag.video.play();

                    // Emit a chapterchange event.
                    xtag.fireEvent(xVideo, 'chapterchange', {
                        detail: { chapter: currentChapter }
                    });
                }
            },
            'click:delegate(input.media-controls-forward-button)': function (event) {
                var currentTime = xVideo.xtag.video.currentTime;
                var currentChapter = null;
                var targetTime = xVideo.xtag.video.duration;
                var targetChapter = 0;

                if (!xVideo.cues || !xVideo.cues.length) {
                    // No chapters? We go straight to the end of the video.
                    xVideo.xtag.video.currentTime = targetTime;
                    return;
                }

                currentChapter = getCurrentChapter(xVideo.cues, currentTime);

                if (currentChapter === null) {
                    return;
                }

                targetChapter = currentChapter + 1;

                if (xVideo.cues[targetChapter]) {
                    // Emit a chapterchange event.
                    xtag.fireEvent(xVideo, 'chapterchange', {
                        detail: { chapter: targetChapter }
                    });

                    targetTime = Math.min(targetTime, xVideo.cues[targetChapter].startTime);
                }

                // Update the video currentTime.
                xVideo.xtag.video.currentTime = targetTime;

                if (targetTime !== xVideo.xtag.video.duration) {
                    // We resume playback if the cursor is not at the end of the video.
                    xVideo.xtag.video.play();
                }
            },
            /**
            * How is the timeline working?
            * 1. Mousedown on element = save the initial paused value and pause the video.
            * 2. Update the currentTime as the slider is moved.
            * 3. When the mouse is released, set the initial paused value back.
            * @todo Test on touch devices and fix accordingly.
            */
            'mousedown:delegate(input.media-controls-timeline)': function (event) {
                xVideo.preTimelinePausedStatus = xVideo.xtag.video.paused;
                xVideo.xtag.video.pause();
                xVideo.timelineMoving = true;
            },
            'mousemove:delegate(input.media-controls-timeline)': function (event) {
                if (!xVideo.timelineMoving) {
                    return;
                }
                xVideo.xtag.video.paused = true;
                xVideo.xtag.video.currentTime = xVideo.xtag.timeline.value;
                //xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(xVideo.xtag.timeline.value);
            },
            'mouseup:delegate(input.media-controls-timeline)': function (event) {
                xVideo.timelineMoving = false;
                if (!xVideo.preTimelinePausedStatus) {
                    xVideo.xtag.video.play();
                }
            },
            'click:delegate(input.media-controls-mute-button)': function (event) {
                xVideo.xtag.video.muted = !xVideo.xtag.video.muted;
            },
            'input:delegate(.media-controls-volume-slider)': function (event) {
                xVideo.xtag.video.volume = xVideo.xtag.volumeSlider.value;
            },
            'click:delegate(.media-controls-fullscreen-button)': function (event) {
                // @todo If already on fullscreen mode, click on the button should exit fullscreen.
                // @todo Dismiss controls on full screen mode.
                // @todo Cache the prefixed version and reuse it.
                requestFullscreenPrefixes.some(function (prefixedRequestFullscreen) {
                    if (xVideo.xtag.mediaControls[prefixedRequestFullscreen]) {
                        xVideo.xtag.mediaControls[prefixedRequestFullscreen]();
                        return true;
                    }
                    return false;
                });
            }
        },
        // @todo Refactor to be less verbose and more DRY.
        accessors: {
            // Read only attributes.
            videoWidth: {
                get: function () {
                    return this.xtag.video.videoWidth;
                }
            },
            videoHeight: {
                get: function () {
                    return this.xtag.video.videoHeight;
                }
            },
            buffered: {
                get: function () {
                    return this.xtag.video.buffered;
                }
            },
            currentSrc: {
                get: function () {
                    return this.xtag.video.currentSrc;
                }
            },
            duration: {
                get: function () {
                    return this.xtag.video.duration;
                }
            },
            ended: {
                get: function () {
                    return this.xtag.video.ended;
                }
            },
            error: {
                get: function () {
                    return this.xtag.video.error;
                }
            },
            initialTime: {
                get: function () {
                    return this.xtag.video.initialTime;
                }
            },
            paused: {
                get: function () {
                    return this.xtag.video.paused;
                }
            },
            played: {
                get: function () {
                    return this.xtag.video.played;
                }
            },
            readyState: {
                get: function () {
                    return this.xtag.video.readyState;
                }
            },
            seekable: {
                get: function () {
                    return this.xtag.video.seekable;
                }
            },
            seeking: {
                get: function () {
                    return this.xtag.video.seeking;
                }
            },
            // @todo Check support for this attribute before adding to accessors.
            mozChannels: {
                get: function () {
                    return this.xtag.video.mozChannels;
                }
            },
            mozSampleRate: {
                get: function () {
                    return this.xtag.video.mozSampleRate;
                }
            },
            // Get/Set attributes.
            width: {
                get: function () {
                    return this.xtag.video.width;
                },
                set: function (value) {
                    this.xtag.video.width = value;
                }
            },
            height: {
                get: function () {
                    return this.xtag.video.height;
                },
                set: function (value) {
                    this.xtag.video.height = value;
                }
            },
            poster: {
                get: function () {
                    return this.xtag.video.poster;
                },
                set: function (value) {
                    this.xtag.video.poster = value;
                }
            },
            audioTracks: {
                get: function () {
                    return this.xtag.video.audioTracks;
                },
                set: function (value) {
                    this.xtag.video.audioTracks = value;
                }
            },
            autoplay: {
                get: function () {
                    return this.xtag.video.autoplay;
                },
                set: function (value) {
                    this.xtag.video.autoplay = value;
                }
            },
            controller: {
                get: function () {
                    return this.xtag.video.controller;
                },
                set: function (value) {
                    this.xtag.video.controller = value;
                }
            },
            controls: {
                // Here, we get/set directly from/to the x-video element, not from the inner video element.
                get: function () {
                    return this.xtag.controls;
                },
                set: function (value) {
                    if (value) {
                        this.xtag.mediaControlsPanel.style.removeProperty('display');
                        this.xtag.mediaControlsPanel.style.opacity = 1;
                    } else {
                        this.xtag.mediaControlsPanel.style.display = 'none';
                        this.xtag.mediaControlsPanel.style.opacity = 0;
                    }
                }
            },
            crossOrigin: {
                get: function () {
                    return this.xtag.video.crossOrigin;
                },
                set: function (value) {
                    this.xtag.video.crossOrigin = value;
                }
            },
            currentTime: {
                get: function () {
                    return this.xtag.video.currentTime;
                },
                set: function (value) {
                    this.xtag.video.currentTime = value;
                }
            },
            defaultMuted: {
                get: function () {
                    return this.xtag.video.defaultMuted;
                },
                set: function (value) {
                    this.xtag.video.defaultMuted = value;
                }
            },
            defaultPlaybackRate: {
                get: function () {
                    return this.xtag.video.defaultPlaybackRate;
                },
                set: function (value) {
                    this.xtag.video.defaultPlaybackRate = value;
                }
            },
            loop: {
                get: function () {
                    return this.xtag.video.loop;
                },
                set: function (value) {
                    this.xtag.video.loop = value;
                }
            },
            mediaGroup: {
                get: function () {
                    return this.xtag.video.mediaGroup;
                },
                set: function (value) {
                    this.xtag.video.mediaGroup = value;
                }
            },
            muted: {
                get: function () {
                    return this.xtag.video.muted;
                },
                set: function (value) {
                    this.xtag.video.muted = value;
                }
            },
            networkState: {
                get: function () {
                    return this.xtag.video.networkState;
                },
                set: function (value) {
                    this.xtag.video.networkState = value;
                }
            },
            playbackRate: {
                get: function () {
                    return this.xtag.video.playbackRate;
                },
                set: function (value) {
                    this.xtag.video.playbackRate = value;
                }
            },
            preload: {
                get: function () {
                    return this.xtag.video.preload;
                },
                set: function (value) {
                    this.xtag.video.preload = value;
                }
            },
            src: {
                get: function () {
                    return this.xtag.video.src;
                },
                set: function (value) {
                    this.xtag.video.src = value;
                }
            },
            textTracks: {
                get: function () {
                    return this.xtag.video.textTracks;
                },
                set: function (value) {
                    this.xtag.video.textTracks = value;
                }
            },
            videoTracks: {
                get: function () {
                    return this.xtag.video.videoTracks;
                },
                set: function (value) {
                    this.xtag.video.videoTracks = value;
                }
            },
            volume: {
                get: function () {
                    return this.xtag.video.volume;
                },
                set: function (value) {
                    this.xtag.video.volume = value;
                }
            },
            // Extra feature methods
            onchapterchange: {
                get: function () {
                    return this.xtag.onchapterchangeListener;
                },
                set: function (event) {
                    // @todo Remove event listener for this.xtag.onchapterchangeListener if previously set.
                    this.xtag.onchapterchangeListener = event;
                    this.addEventListener('chapterchange', event, false);
                }
            },
            // @todo Check support for this attribute before adding to accessors.
            mozFrameBufferLength: {
                get: function () {
                    return this.xtag.video.mozFrameBufferLength;
                },
                set: function (value) {
                    this.xtag.video.mozFrameBufferLength = value;
                }
            },
            // @todo Check support for this attribute before adding to accessors.
            mozSrcObject: {
                get: function () {
                    return this.xtag.video.mozSrcObject;
                },
                set: function (value) {
                    this.xtag.video.mozSrcObject = value;
                }
            }
        },
        methods: {
            canPlayType: function (type) {
                return this.xtag.video.canPlayType(type);
            },
            /*fastSeek: function(time) {
            return this.xtag.video.fastSeek(time);
            },*/
            load: function () {
                return this.xtag.video.load();
            },
            pause: function () {
                return this.xtag.video.pause();
            },
            play: function () {
                return this.xtag.video.play();
            },
            getVideoPlaybackQuality: function () {
                return this.xtag.video.getVideoPlaybackQuality();
            },
            // @todo Check support for this attribute before adding to methods.
            mozGetMetadata: function () {
                return this.xtag.video.mozGetMetadata();
            }
        }
    });
})();
