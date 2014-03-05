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

    var template = xtag.createFragment('<div class="media-controls">' + '<div class="media-controls-enclosure">' + '<div class="media-controls-panel" style="transition:opacity 0.3s; -webkit-transition:opacity 0.3s; opacity:1;">' + '<input type="button" class="media-controls-rewind-button" style="display:none;">' + '<input type="button" class="media-controls-play-button">' + '<input type="button" class="media-controls-forward-button" style="display:none;">' + '<input type="range" value="0" step="any" max="0" class="media-controls-timeline">' + '<div class="media-controls-current-time-display">0:00</div>' + '<div class="media-controls-time-remaining-display" style="display:none;">0:00</div>' + '<input type="button" class="media-controls-mute-button">' + '<input type="range" value="1" step="any" max="1" class="media-controls-volume-slider">' + '<input type="button" class="media-controls-toggle-closed-captions-button" style="display:none;">' + '<input type="button" class="media-controls-fullscreen-button" style="display:none;">' + '</div>' + '</div>' + '</div>');

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
        if (data.substring(0, 6) != 'WEBVTT') {
            console.error('Missing WEBVTT header: Not a WebVTT file - trying SRT.');
            srt = data;
        } else {
            // Remove WEBVTT identifier line.
            srt = data.split('\n').slice(1).join('\n');
        }

        // clean up string a bit
        srt = srt.replace(/\r+/g, ''); // remove dos newlines
        srt = srt.replace(/^\s+|\s+$/g, ''); // trim white space start and end

        //srt = srt.replace(/<[a-zA-Z\/][^>]*>/g, ''); // remove all html tags for security reasons
        // parse cues
        var cues = [];
        var cuelist = srt.split('\n\n');
        for (var i = 0; i < cuelist.length; i++) {
            var cue = cuelist[i];
            var content = '';
            var start = 0;
            var end = 0;
            var id = '';
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
                start = (parseInt(m[1], 10) * 60 * 60) + (parseInt(m[2], 10) * 60) + (parseInt(m[3], 10)) + (parseInt(m[4], 10) / 1000);
                end = (parseInt(m[5], 10) * 60 * 60) + (parseInt(m[6], 10) * 60) + (parseInt(m[7], 10)) + (parseInt(m[8], 10) / 1000);
            } else {
                continue;
            }

            // concatenate text lines to html text
            content = s.slice(t + 1).join('<br>');

            // add parsed cue
            cues.push({ id: id, start: start, end: end, content: content });
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
            currentChapter = chapter;
            return cue.start <= currentTime && currentTime <= cue.end;
        });

        return currentChapter;
    }

    xtag.register('x-video', {
        prototype: Object.create(HTMLVideoElement.prototype),
        lifecycle: {
            created: function () {
                var xVideo = this;
                var children = xtag.toArray(xVideo.children);
                var currentVideo = 0;

                // We hide the native player in Chrome because JavaScript is enabled, so we don't need it.
                var styleTag = document.createElement('style');
                styleTag.textContent = 'x-video video::-webkit-media-controls{display:none}';
                xVideo.appendChild(styleTag);

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

                // Are there many video elements?
                var playlist = children.filter(function (child) {
                    return child.tagName === 'VIDEO';
                }).map(function (child, index) {
                    var src = child.getAttribute('src');
                    if (index > 0) {
                        // We remove all the video, except the first one, but keep a reference to the src.
                        xVideo.removeChild(child);
                    }
                    return src;
                });

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

                // At the end of the video, update the src to the next in the playlist, if any.
                if (playlist.length > 1) {
                    this.xtag.video.addEventListener('ended', function (event) {
                        if (currentVideo < playlist.length) {
                            currentVideo++;
                            xVideo.xtag.video.src = playlist[currentVideo];
                        }
                        xtag.fireEvent(xVideo, 'videochange');
                    }, false);
                }

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

                // Attaching event listener to controls.
                this.xtag.playButton.addEventListener('click', function (event) {
                    if (xVideo.xtag.video.paused) {
                        xVideo.xtag.video.play();
                    } else {
                        xVideo.xtag.video.pause();
                    }
                }, false);

                this.xtag.video.addEventListener('play', function (event) {
                    xtag.addClass(xVideo.xtag.playButton, 'paused');
                }, false);

                this.xtag.video.addEventListener('pause', function (event) {
                    xtag.removeClass(xVideo.xtag.playButton, 'paused');
                }, false);

                this.xtag.video.addEventListener('durationchange', function (event) {
                    xVideo.xtag.timeline.setAttribute('max', xVideo.xtag.video.duration);
                }, false);

                xVideo.xtag.timeline.value = 0;
                xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(0);

                // Update the timeline as the video is being played.
                this.xtag.video.addEventListener('timeupdate', function (event) {
                    xVideo.xtag.timeline.value = this.currentTime;
                    xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(this.currentTime);
                }, false);

                /**
                * @todo Changing the timeline should work better:
                * 1. Mousedown on element = save the initial paused value.
                * 2. Pause the video.
                * 3. Update the currentTime as the slider is moved.
                * 4. When the mouse is released, set the initial paused value back.
                */
                // Update the playing position when the timeline changes.
                this.xtag.timeline.addEventListener('change', function (event) {
                    //var initialPaused = xVideo.xtag.video.paused;
                    xVideo.xtag.video.paused = true;
                    xVideo.xtag.video.currentTime = xVideo.xtag.timeline.value;
                    xVideo.xtag.currentTimeDisplay.textContent = formatTimeDisplay(xVideo.xtag.timeline.value);
                }, false);

                // Update the muted state HTML attribute is present.
                this.muted = this.hasAttribute('muted');

                // Replicate the muted state and volume of the video on xVideo element.
                this.xtag.video.addEventListener('volumechange', function (event) {
                    if (xVideo.xtag.video.muted) {
                        xtag.addClass(xVideo.xtag.muteButton, 'muted');
                    } else {
                        xtag.removeClass(xVideo.xtag.muteButton, 'muted');
                    }
                    xVideo.xtag.volumeSlider.value = xVideo.xtag.video.volume;
                }, false);

                this.xtag.muteButton.addEventListener('click', function (event) {
                    xVideo.xtag.video.muted = !xVideo.xtag.video.muted;
                    if (xVideo.xtag.video.muted) {
                        xtag.removeClass(xVideo.xtag.muteButton, 'muted');
                    } else {
                        xtag.addClass(xVideo.xtag.muteButton, 'muted');
                    }
                }, false);

                xVideo.xtag.volumeSlider.value = 1;

                function onVolumeChange(event) {
                    xVideo.xtag.video.volume = xVideo.xtag.volumeSlider.value;
                }

                this.xtag.volumeSlider.addEventListener('input', onVolumeChange, false);
                this.xtag.volumeSlider.addEventListener('change', onVolumeChange, false);

                // Look for chapter track.
                var chapterTrack = children.filter(function (child) {
                    return child.tagName === 'TRACK' && child.kind === 'chapters' && child.src !== '';
                });

                if (chapterTrack.length) {
                    // We're only considering the first one for now.
                    loadWebVTTFile(chapterTrack[0].src, function (cues) {
                        if (!cues.length) {
                            // We expect at least one element.
                            return;
                        }

                        xVideo.xtag.rewindButton.removeAttribute('style');
                        xVideo.xtag.forwardButton.removeAttribute('style');

                        // Listen to click on rewind button.
                        xVideo.xtag.rewindButton.addEventListener('click', function (event) {
                            var currentTime = xVideo.xtag.video.currentTime;
                            var currentChapter = null;

                            if (!xVideo.xtag.video.paused) {
                                // If the video is playing, we substract 1 second to be able to jump to previous
                                // chapter. Otherwise, it would jump at the beginning of the current one.
                                currentTime = Math.max(0, currentTime - 1.000);
                            }

                            currentChapter = getCurrentChapter(cues, currentTime);

                            if (currentChapter === null) {
                                return;
                            }

                            // Update the video currentTime.
                            xVideo.xtag.video.currentTime = cues[currentChapter].start;
                            xVideo.xtag.video.play();

                            // Emit a chapterchange event.
                            xtag.fireEvent(xVideo, 'chapterchange', {
                                detail: { chapter: currentChapter }
                            });
                        }, false);

                        // Listen to click on forwardButton button.
                        xVideo.xtag.forwardButton.addEventListener('click', function (event) {
                            var currentTime = xVideo.xtag.video.currentTime;
                            var currentChapter = null;
                            var targetTime = xVideo.xtag.video.duration;
                            var targetChapter = 0;

                            currentChapter = getCurrentChapter(cues, currentTime);

                            if (currentChapter === null) {
                                return;
                            }

                            targetChapter = currentChapter + 1;

                            if (cues[targetChapter]) {
                                // Emit a chapterchange event.
                                xtag.fireEvent(xVideo, 'chapterchange', {
                                    detail: { chapter: targetChapter }
                                });

                                targetTime = Math.min(targetTime, cues[targetChapter].start);
                            }

                            // Update the video currentTime.
                            xVideo.xtag.video.currentTime = targetTime;

                            if (targetTime !== xVideo.xtag.video.duration) {
                                // We resume playback if the cursor is not at the end of the video.
                                xVideo.xtag.video.play();
                            }
                        }, false);
                    });
                }

                // Full screen button.
                // @todo Dismiss controls on full screen mode.
                if (document.fullScreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled) {
                    this.xtag.fullscreenButton.removeAttribute('style');

                    this.xtag.fullscreenButton.addEventListener('click', function (event) {
                        if (xVideo.xtag.mediaControls.requestFullscreen) {
                            xVideo.xtag.mediaControls.requestFullscreen();
                        } else if (xVideo.xtag.mediaControls.msRequestFullscreen) {
                            xVideo.xtag.mediaControls.msRequestFullscreen();
                        } else if (xVideo.xtag.mediaControls.mozRequestFullScreen) {
                            xVideo.xtag.mediaControls.mozRequestFullScreen();
                        } else if (xVideo.xtag.mediaControls.webkitRequestFullscreen) {
                            xVideo.xtag.mediaControls.webkitRequestFullscreen();
                        }
                    }, false);
                }
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