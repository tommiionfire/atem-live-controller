
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function detach_between(before, after) {
        while (before.nextSibling && before.nextSibling !== after) {
            before.parentNode.removeChild(before.nextSibling);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            remaining: 0,
            callbacks: []
        };
    }
    function check_outros() {
        if (!outros.remaining) {
            run_all(outros.callbacks);
        }
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.callbacks.push(() => {
                outroing.delete(block);
                if (callback) {
                    block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_render.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /*
        This class is very similar to node-applest-atem ATEM class
        but this communicates via websocket to node server
        These two ATEM classes could be joined in two ways:
        - constructor decides if it communicates via udp socket to atem or websocket to node
        - server could relay BMC protocol commands to websocket messages
    */

    class ATEM {
        constructor() {
            this.state = {
                "topology": {
                    "numberOfMEs": 1,
                    "numberOfSources": 18,
                    "numberOfColorGenerators": 2,
                    "numberOfAUXs": 0,
                    "numberOfDownstreamKeys": 0,
                    "numberOfStingers": 2,
                    "numberOfDVEs": 0,
                    "numberOfSuperSources": 4
                },
                "tallys": [2, 0, 0, 0, 0, 0],
                "channels": {
                    "0": {
                        "name": "Black",
                        "label": "Blk",
                        "id": "0",
                        "device": 0,
                        "input": "0"
                    },
                    "1": {
                        "name": "Cam 1",
                        "label": "CAM1",
                        "id": "1",
                        "device": 0,
                        "input": "1"
                    },
                    "2": {
                        "name": "Cam 2",
                        "label": "CAM2",
                        "id": "2",
                        "device": 0,
                        "input": "2"
                    },
                    "3": {
                        "name": "Cam 3",
                        "label": "CAM3",
                        "id": "3",
                        "device": 0,
                        "input": "3"
                    },
                    "4": {
                        "name": "Cam 4",
                        "label": "CAM4",
                        "id": "4",
                        "device": 0,
                        "input": "4"
                    },
                    "5": {
                        "name": "Cam 5",
                        "label": "CAM5",
                        "id": "5",
                        "device": 0,
                        "input": "5"
                    },
                    "6": {
                        "name": "Cam 6",
                        "label": "CAM6",
                        "id": "6",
                        "device": 0,
                        "input": "6"
                    },
                    "1000": {
                        "name": "Color Bars",
                        "label": "Bars",
                        "id": "1000",
                        "device": 0,
                        "input": "1000"
                    },
                    "2001": {
                        "name": "Color 1",
                        "label": "Col1",
                        "id": "2001",
                        "device": 0,
                        "input": "2001"
                    },
                    "2002": {
                        "name": "Color 2",
                        "label": "Col2",
                        "id": "2002",
                        "device": 0,
                        "input": "2002"
                    },
                    "3010": {
                        "name": "Media Player 1",
                        "label": "MP1",
                        "id": "3010",
                        "device": 0,
                        "input": "3010"
                    },
                    "3011": {
                        "name": "Media 1 Key",
                        "label": "MP1K",
                        "id": "3011",
                        "device": 0,
                        "input": "3011"
                    },
                    "3020": {
                        "name": "Media Player 2",
                        "label": "MP2",
                        "id": "3020",
                        "device": 0,
                        "input": "3020"
                    },
                    "3021": {
                        "name": "Media Player 2 Key",
                        "label": "MP2K",
                        "id": "3021",
                        "device": 0,
                        "input": "3021"
                    },
                    "7001": {
                        "name": "Clean Feed 1",
                        "label": "Cfd1",
                        "id": "7001",
                        "device": 0,
                        "input": "7001"
                    },
                    "7002": {
                        "name": "Clean Feed 2",
                        "label": "Cfd2",
                        "id": "7002",
                        "device": 0,
                        "input": "7002"
                    },
                    "10010": {
                        "name": "Program",
                        "label": "Pgm",
                        "id": "10010",
                        "device": 0,
                        "input": "10010"
                    },
                    "10011": {
                        "name": "Preview",
                        "label": "Pvw",
                        "id": "10011",
                        "device": 0,
                        "input": "10011"
                    }
                },
                "video": {
                    "ME": [
                        {
                            "upstreamKeyState": [false],
                            "upstreamKeyNextState": [false],
                            "numberOfKeyers": 1,
                            "programInput": 3010,
                            "previewInput": 1,
                            "transitionStyle": 0,
                            "upstreamKeyNextBackground": true,
                            "transitionPreview": false,
                            "transitionPosition": 0,
                            "transitionFrameCount": 25,
                            "fadeToBlack": false
                        }
                    ],
                    "downstreamKeyOn": [false, false],
                    "downstreamKeyTie": [false, false],
                    "auxs": {},
                    "modes": {
                        0: '525i59.94 NTSC',
                        1: '625i 50 PAL',
                        2: '525i59.94 NTSC 16:9',
                        3: '625i 50 PAL 16:9',
                        4: '720p50',
                        5: '720p59.94',
                        6: '1080i50',
                        7: '1080i59.94',
                        8: '1080p23.98',
                        9: '1080p24',
                        10: '1080p25',
                        11: '1080p29.97',
                        12: '1080p50',
                        13: '1080p59.94',
                        14: '2160p23.98',
                        15: '2160p24',
                        16: '2160p25',
                        17: '2160p29.97',
                    }
                },
                "audio": {
                    "hasMonitor": false,
                    "numberOfChannels": 0,
                    "channels": {
                        "1": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "2": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "3": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "4": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "5": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "6": {
                            "on": false,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        },
                        "1101": {
                            "on": true,
                            "afv": false,
                            "gain": 0.5011853596610636,
                            "rawGain": 32768,
                            "rawPan": 0
                        }
                    },
                    "master": {
                        "afv": false,
                        "gain": 0.5011853596610636,
                        "rawGain": 32768
                    }
                },
                "device": 0,
                "_ver0": 2,
                "_ver1": 27,
                "_pin": "ATEM info not recieved",
                "model": 1
            };
        }

        setWebsocket(websocket) {
            this.websocket = websocket;
        }

        sendMessage(data) {
            if (this.websocket.readyState == WebSocket.OPEN) {
                const message = JSON.stringify(data);
                // console.log('sendMessage', message);
                this.websocket.send(message);
            } else {
                console.warn('Websocket is closed. Cannot send message.');
            }
        }

        get visibleChannels() {
            let visibleChannels = [];
            // update channels
            for (let id in this.state.channels) {
                const channel = this.state.channels[id];
                channel.id = id;
                channel.device = this.state.device;
                channel.input = id;
            }
            // standard inputs
            for (let id = 1; id < 10; id++) {
                if (this.state.channels[id]) {
                    visibleChannels.push(this.state.channels[id]);
                } else {
                    break;
                }
            }
            // Black
            if (this.state.channels[0]) {
                visibleChannels.push(this.state.channels[0]);
            }
            // Colors
            for (let id = 2001; id < 3000; id++) {
                if (this.state.channels[id]) {
                    visibleChannels.push(this.state.channels[id]);
                } else {
                    break;
                }
            }
            // Color Bars
            if (this.state.channels[1000]) {
                visibleChannels.push(this.state.channels[1000]);
            }
            // Media Players
            for (let id = 3010; id < 4000; id += 10) {
                if (this.state.channels[id]) {
                    visibleChannels.push(this.state.channels[id]);
                } else {
                    break;
                }
            }
            return visibleChannels;
        }

        isProgramChannel(channel) {
            return this.state.video.ME[0].programInput === parseInt(channel.input);
        }

        isPreviewChannel(channel) {
            return this.state.video.ME[0].previewInput === parseInt(channel.input);
        }

        changeProgramInput(input) {
            this.sendMessage({ method: 'changeProgramInput', params: { device: this.state.device, input } });
        }

        changePreviewInput(input) {
            this.sendMessage({ method: 'changePreviewInput', params: { device: this.state.device, input } });
        }

        changeProgram(channel) {
            return this.changeProgramInput(this.state.device, channel.input);
        }

        changePreview(channel) {
            return this.changePreviewInput(channel.input);
        };

        autoTransition() {
            this.sendMessage({ method: 'autoTransition', params: { device: this.state.device } });
        }

        cutTransition() {
            this.sendMessage({ method: 'cutTransition', params: { device: this.state.device } });
        }

        changeTransitionPreview() {
            const status = !this.state.video.ME[0].transitionPreview;
            this.sendMessage({ method: 'changeTransitionPreview', params: { device: this.state.device, status } });
        }

        changeTransitionPosition(percent) {
            console.assert(percent);
            this.sendMessage({ method: 'changeTransitionPosition', params: { device: this.state.device, position: parseFloat(percent) * 10000 } });
        }

        changeTransitionType(type) {
            this.sendMessage({ method: 'changeTransitionType', params: { type } });
        }

        toggleUpstreamKeyNextBackground() {
            const status = !this.state.video.ME[0].upstreamKeyNextBackground;
            this.sendMessage({ method: 'changeUpstreamKeyNextBackground', params: { device: this.state.device, status } });
        };

        toggleUpstreamKeyNextState(number) {
            const status = !this.state.video.ME[0].upstreamKeyNextState[number];
            this.sendMessage({ method: 'changeUpstreamKeyNextBackground', params: { device: this.state.device, number, status } });
        };

        toggleUpstreamKeyState(number) {
            const state = !this.state.video.ME[0].upstreamKeyState[number];
            this.sendMessage({ method: 'changeUpstreamKeyState', params: { device: this.state.device, number, state } });
        };

        toggleDownstreamKeyTie(number) {
            const state = !this.state.video.downstreamKeyTie[number];
            this.sendMessage({ method: 'changeDownstreamKeyTie', params: { device: this.state.device, number, state } });
        };

        toggleDownstreamKeyOn(number) {
            const state = !this.state.video.downstreamKeyOn[number];
            this.sendMessage({ method: 'changeDownstreamKeyOn', params: { device: this.state.device, number, state } });
        };

        autoDownstreamKey(number) {
            this.sendMessage({ method: 'autoDownstreamKey', params: { device: this.state.device, number } });
        }
        fadeToBlack() {
            this.sendMessage({ method: 'fadeToBlack', params: { device: this.state.device } });
        }

        uploadMediaFile(file, number) {
            let img, reader;
            let atem = this;
            if (file.type.match(/image.*/)) {
              img = document.querySelectorAll('.media-thumb img')[number];
              reader = new FileReader();
              reader.onload = function(e) {
                img.onload = function() {
                    let canvas, ctx;
                    canvas = document.createElement("canvas");
                    canvas.width = 1280;
                    canvas.height = 720;
                    ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 1280, 720);
                    // upload to server
                    atem.sendMessage({
                        method: "uploadMedia",
                        params: {
                            device: atem.state.device,
                            number: number || 0,
                            media: canvas.toDataURL("image/png")
                        }
                    });
                };
                img.src = e.target.result;
              };
              reader.readAsDataURL(file);
            } else {
              alert('This file is not an image.');
            }
          }
    }

    var atem = { ATEM };
    var atem_1 = atem.ATEM;

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var feather = createCommonjsModule(function (module, exports) {
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(typeof self !== 'undefined' ? self : commonjsGlobal, function() {
    return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};
    /******/
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
    /******/ 			return installedModules[moduleId].exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
    /******/ 			i: moduleId,
    /******/ 			l: false,
    /******/ 			exports: {}
    /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/
    /******/
    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;
    /******/
    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;
    /******/
    /******/ 	// define getter function for harmony exports
    /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
    /******/ 			Object.defineProperty(exports, name, {
    /******/ 				configurable: false,
    /******/ 				enumerable: true,
    /******/ 				get: getter
    /******/ 			});
    /******/ 		}
    /******/ 	};
    /******/
    /******/ 	// define __esModule on exports
    /******/ 	__webpack_require__.r = function(exports) {
    /******/ 		Object.defineProperty(exports, '__esModule', { value: true });
    /******/ 	};
    /******/
    /******/ 	// getDefaultExport function for compatibility with non-harmony modules
    /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
    /******/ 			function getDefault() { return module['default']; } :
    /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
    /******/
    /******/ 	// Object.prototype.hasOwnProperty.call
    /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
    /******/
    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";
    /******/
    /******/
    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(__webpack_require__.s = 0);
    /******/ })
    /************************************************************************/
    /******/ ({

    /***/ "./dist/icons.json":
    /*!*************************!*\
      !*** ./dist/icons.json ***!
      \*************************/
    /*! exports provided: activity, airplay, alert-circle, alert-octagon, alert-triangle, align-center, align-justify, align-left, align-right, anchor, aperture, archive, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, award, bar-chart-2, bar-chart, battery-charging, battery, bell-off, bell, bluetooth, bold, book-open, book, bookmark, box, briefcase, calendar, camera-off, camera, cast, check-circle, check-square, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, chrome, circle, clipboard, clock, cloud-drizzle, cloud-lightning, cloud-off, cloud-rain, cloud-snow, cloud, code, codepen, codesandbox, coffee, columns, command, compass, copy, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, cpu, credit-card, crop, crosshair, database, delete, disc, dollar-sign, download-cloud, download, droplet, edit-2, edit-3, edit, external-link, eye-off, eye, facebook, fast-forward, feather, figma, file-minus, file-plus, file-text, file, film, filter, flag, folder-minus, folder-plus, folder, framer, frown, gift, git-branch, git-commit, git-merge, git-pull-request, github, gitlab, globe, grid, hard-drive, hash, headphones, heart, help-circle, hexagon, home, image, inbox, info, instagram, italic, key, layers, layout, life-buoy, link-2, link, linkedin, list, loader, lock, log-in, log-out, mail, map-pin, map, maximize-2, maximize, meh, menu, message-circle, message-square, mic-off, mic, minimize-2, minimize, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, mouse-pointer, move, music, navigation-2, navigation, octagon, package, paperclip, pause-circle, pause, pen-tool, percent, phone-call, phone-forwarded, phone-incoming, phone-missed, phone-off, phone-outgoing, phone, pie-chart, play-circle, play, plus-circle, plus-square, plus, pocket, power, printer, radio, refresh-ccw, refresh-cw, repeat, rewind, rotate-ccw, rotate-cw, rss, save, scissors, search, send, server, settings, share-2, share, shield-off, shield, shopping-bag, shopping-cart, shuffle, sidebar, skip-back, skip-forward, slack, slash, sliders, smartphone, smile, speaker, square, star, stop-circle, sun, sunrise, sunset, tablet, tag, target, terminal, thermometer, thumbs-down, thumbs-up, toggle-left, toggle-right, trash-2, trash, trello, trending-down, trending-up, triangle, truck, tv, twitter, type, umbrella, underline, unlock, upload-cloud, upload, user-check, user-minus, user-plus, user-x, user, users, video-off, video, voicemail, volume-1, volume-2, volume-x, volume, watch, wifi-off, wifi, wind, x-circle, x-octagon, x-square, x, youtube, zap-off, zap, zoom-in, zoom-out, default */
    /***/ (function(module) {

    module.exports = {"activity":"<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"></polyline>","airplay":"<path d=\"M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1\"></path><polygon points=\"12 15 17 21 7 21 12 15\"></polygon>","alert-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"></line><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"16\"></line>","alert-octagon":"<polygon points=\"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2\"></polygon><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"></line><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"16\"></line>","alert-triangle":"<path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"></path><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"></line><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"17\"></line>","align-center":"<line x1=\"18\" y1=\"10\" x2=\"6\" y2=\"10\"></line><line x1=\"21\" y1=\"6\" x2=\"3\" y2=\"6\"></line><line x1=\"21\" y1=\"14\" x2=\"3\" y2=\"14\"></line><line x1=\"18\" y1=\"18\" x2=\"6\" y2=\"18\"></line>","align-justify":"<line x1=\"21\" y1=\"10\" x2=\"3\" y2=\"10\"></line><line x1=\"21\" y1=\"6\" x2=\"3\" y2=\"6\"></line><line x1=\"21\" y1=\"14\" x2=\"3\" y2=\"14\"></line><line x1=\"21\" y1=\"18\" x2=\"3\" y2=\"18\"></line>","align-left":"<line x1=\"17\" y1=\"10\" x2=\"3\" y2=\"10\"></line><line x1=\"21\" y1=\"6\" x2=\"3\" y2=\"6\"></line><line x1=\"21\" y1=\"14\" x2=\"3\" y2=\"14\"></line><line x1=\"17\" y1=\"18\" x2=\"3\" y2=\"18\"></line>","align-right":"<line x1=\"21\" y1=\"10\" x2=\"7\" y2=\"10\"></line><line x1=\"21\" y1=\"6\" x2=\"3\" y2=\"6\"></line><line x1=\"21\" y1=\"14\" x2=\"3\" y2=\"14\"></line><line x1=\"21\" y1=\"18\" x2=\"7\" y2=\"18\"></line>","anchor":"<circle cx=\"12\" cy=\"5\" r=\"3\"></circle><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"8\"></line><path d=\"M5 12H2a10 10 0 0 0 20 0h-3\"></path>","aperture":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"14.31\" y1=\"8\" x2=\"20.05\" y2=\"17.94\"></line><line x1=\"9.69\" y1=\"8\" x2=\"21.17\" y2=\"8\"></line><line x1=\"7.38\" y1=\"12\" x2=\"13.12\" y2=\"2.06\"></line><line x1=\"9.69\" y1=\"16\" x2=\"3.95\" y2=\"6.06\"></line><line x1=\"14.31\" y1=\"16\" x2=\"2.83\" y2=\"16\"></line><line x1=\"16.62\" y1=\"12\" x2=\"10.88\" y2=\"21.94\"></line>","archive":"<polyline points=\"21 8 21 21 3 21 3 8\"></polyline><rect x=\"1\" y=\"3\" width=\"22\" height=\"5\"></rect><line x1=\"10\" y1=\"12\" x2=\"14\" y2=\"12\"></line>","arrow-down-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"8 12 12 16 16 12\"></polyline><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"></line>","arrow-down-left":"<line x1=\"17\" y1=\"7\" x2=\"7\" y2=\"17\"></line><polyline points=\"17 17 7 17 7 7\"></polyline>","arrow-down-right":"<line x1=\"7\" y1=\"7\" x2=\"17\" y2=\"17\"></line><polyline points=\"17 7 17 17 7 17\"></polyline>","arrow-down":"<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line><polyline points=\"19 12 12 19 5 12\"></polyline>","arrow-left-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 8 8 12 12 16\"></polyline><line x1=\"16\" y1=\"12\" x2=\"8\" y2=\"12\"></line>","arrow-left":"<line x1=\"19\" y1=\"12\" x2=\"5\" y2=\"12\"></line><polyline points=\"12 19 5 12 12 5\"></polyline>","arrow-right-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 16 16 12 12 8\"></polyline><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","arrow-right":"<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line><polyline points=\"12 5 19 12 12 19\"></polyline>","arrow-up-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"16 12 12 8 8 12\"></polyline><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"8\"></line>","arrow-up-left":"<line x1=\"17\" y1=\"17\" x2=\"7\" y2=\"7\"></line><polyline points=\"7 17 7 7 17 7\"></polyline>","arrow-up-right":"<line x1=\"7\" y1=\"17\" x2=\"17\" y2=\"7\"></line><polyline points=\"7 7 17 7 17 17\"></polyline>","arrow-up":"<line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"5\"></line><polyline points=\"5 12 12 5 19 12\"></polyline>","at-sign":"<circle cx=\"12\" cy=\"12\" r=\"4\"></circle><path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94\"></path>","award":"<circle cx=\"12\" cy=\"8\" r=\"7\"></circle><polyline points=\"8.21 13.89 7 23 12 20 17 23 15.79 13.88\"></polyline>","bar-chart-2":"<line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"></line><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"></line><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"></line>","bar-chart":"<line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"10\"></line><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"4\"></line><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"16\"></line>","battery-charging":"<path d=\"M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19\"></path><line x1=\"23\" y1=\"13\" x2=\"23\" y2=\"11\"></line><polyline points=\"11 6 7 12 13 12 9 18\"></polyline>","battery":"<rect x=\"1\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\" ry=\"2\"></rect><line x1=\"23\" y1=\"13\" x2=\"23\" y2=\"11\"></line>","bell-off":"<path d=\"M13.73 21a2 2 0 0 1-3.46 0\"></path><path d=\"M18.63 13A17.89 17.89 0 0 1 18 8\"></path><path d=\"M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14\"></path><path d=\"M18 8a6 6 0 0 0-9.33-5\"></path><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","bell":"<path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"></path><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"></path>","bluetooth":"<polyline points=\"6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5\"></polyline>","bold":"<path d=\"M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z\"></path><path d=\"M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z\"></path>","book-open":"<path d=\"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z\"></path><path d=\"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z\"></path>","book":"<path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"></path><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"></path>","bookmark":"<path d=\"M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z\"></path>","box":"<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"></path><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"></polyline><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"></line>","briefcase":"<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"></rect><path d=\"M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"></path>","calendar":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"></line><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"></line><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"></line>","camera-off":"<line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line><path d=\"M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56\"></path>","camera":"<path d=\"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z\"></path><circle cx=\"12\" cy=\"13\" r=\"4\"></circle>","cast":"<path d=\"M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6\"></path><line x1=\"2\" y1=\"20\" x2=\"2\" y2=\"20\"></line>","check-circle":"<path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"></path><polyline points=\"22 4 12 14.01 9 11.01\"></polyline>","check-square":"<polyline points=\"9 11 12 14 22 4\"></polyline><path d=\"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11\"></path>","check":"<polyline points=\"20 6 9 17 4 12\"></polyline>","chevron-down":"<polyline points=\"6 9 12 15 18 9\"></polyline>","chevron-left":"<polyline points=\"15 18 9 12 15 6\"></polyline>","chevron-right":"<polyline points=\"9 18 15 12 9 6\"></polyline>","chevron-up":"<polyline points=\"18 15 12 9 6 15\"></polyline>","chevrons-down":"<polyline points=\"7 13 12 18 17 13\"></polyline><polyline points=\"7 6 12 11 17 6\"></polyline>","chevrons-left":"<polyline points=\"11 17 6 12 11 7\"></polyline><polyline points=\"18 17 13 12 18 7\"></polyline>","chevrons-right":"<polyline points=\"13 17 18 12 13 7\"></polyline><polyline points=\"6 17 11 12 6 7\"></polyline>","chevrons-up":"<polyline points=\"17 11 12 6 7 11\"></polyline><polyline points=\"17 18 12 13 7 18\"></polyline>","chrome":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"4\"></circle><line x1=\"21.17\" y1=\"8\" x2=\"12\" y2=\"8\"></line><line x1=\"3.95\" y1=\"6.06\" x2=\"8.54\" y2=\"14\"></line><line x1=\"10.88\" y1=\"21.94\" x2=\"15.46\" y2=\"14\"></line>","circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle>","clipboard":"<path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"></path><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\" ry=\"1\"></rect>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline>","cloud-drizzle":"<line x1=\"8\" y1=\"19\" x2=\"8\" y2=\"21\"></line><line x1=\"8\" y1=\"13\" x2=\"8\" y2=\"15\"></line><line x1=\"16\" y1=\"19\" x2=\"16\" y2=\"21\"></line><line x1=\"16\" y1=\"13\" x2=\"16\" y2=\"15\"></line><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"></line><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"17\"></line><path d=\"M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25\"></path>","cloud-lightning":"<path d=\"M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9\"></path><polyline points=\"13 11 9 17 15 17 11 23\"></polyline>","cloud-off":"<path d=\"M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3\"></path><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","cloud-rain":"<line x1=\"16\" y1=\"13\" x2=\"16\" y2=\"21\"></line><line x1=\"8\" y1=\"13\" x2=\"8\" y2=\"21\"></line><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"23\"></line><path d=\"M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25\"></path>","cloud-snow":"<path d=\"M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25\"></path><line x1=\"8\" y1=\"16\" x2=\"8\" y2=\"16\"></line><line x1=\"8\" y1=\"20\" x2=\"8\" y2=\"20\"></line><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"18\"></line><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"22\"></line><line x1=\"16\" y1=\"16\" x2=\"16\" y2=\"16\"></line><line x1=\"16\" y1=\"20\" x2=\"16\" y2=\"20\"></line>","cloud":"<path d=\"M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z\"></path>","code":"<polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline>","codepen":"<polygon points=\"12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2\"></polygon><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"15.5\"></line><polyline points=\"22 8.5 12 15.5 2 8.5\"></polyline><polyline points=\"2 15.5 12 8.5 22 15.5\"></polyline><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"8.5\"></line>","codesandbox":"<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"></path><polyline points=\"7.5 4.21 12 6.81 16.5 4.21\"></polyline><polyline points=\"7.5 19.79 7.5 14.6 3 12\"></polyline><polyline points=\"21 12 16.5 14.6 16.5 19.79\"></polyline><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"></polyline><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"></line>","coffee":"<path d=\"M18 8h1a4 4 0 0 1 0 8h-1\"></path><path d=\"M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z\"></path><line x1=\"6\" y1=\"1\" x2=\"6\" y2=\"4\"></line><line x1=\"10\" y1=\"1\" x2=\"10\" y2=\"4\"></line><line x1=\"14\" y1=\"1\" x2=\"14\" y2=\"4\"></line>","columns":"<path d=\"M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18\"></path>","command":"<path d=\"M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z\"></path>","compass":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"></polygon>","copy":"<rect x=\"9\" y=\"9\" width=\"13\" height=\"13\" rx=\"2\" ry=\"2\"></rect><path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"></path>","corner-down-left":"<polyline points=\"9 10 4 15 9 20\"></polyline><path d=\"M20 4v7a4 4 0 0 1-4 4H4\"></path>","corner-down-right":"<polyline points=\"15 10 20 15 15 20\"></polyline><path d=\"M4 4v7a4 4 0 0 0 4 4h12\"></path>","corner-left-down":"<polyline points=\"14 15 9 20 4 15\"></polyline><path d=\"M20 4h-7a4 4 0 0 0-4 4v12\"></path>","corner-left-up":"<polyline points=\"14 9 9 4 4 9\"></polyline><path d=\"M20 20h-7a4 4 0 0 1-4-4V4\"></path>","corner-right-down":"<polyline points=\"10 15 15 20 20 15\"></polyline><path d=\"M4 4h7a4 4 0 0 1 4 4v12\"></path>","corner-right-up":"<polyline points=\"10 9 15 4 20 9\"></polyline><path d=\"M4 20h7a4 4 0 0 0 4-4V4\"></path>","corner-up-left":"<polyline points=\"9 14 4 9 9 4\"></polyline><path d=\"M20 20v-7a4 4 0 0 0-4-4H4\"></path>","corner-up-right":"<polyline points=\"15 14 20 9 15 4\"></polyline><path d=\"M4 20v-7a4 4 0 0 1 4-4h12\"></path>","cpu":"<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" ry=\"2\"></rect><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\"></rect><line x1=\"9\" y1=\"1\" x2=\"9\" y2=\"4\"></line><line x1=\"15\" y1=\"1\" x2=\"15\" y2=\"4\"></line><line x1=\"9\" y1=\"20\" x2=\"9\" y2=\"23\"></line><line x1=\"15\" y1=\"20\" x2=\"15\" y2=\"23\"></line><line x1=\"20\" y1=\"9\" x2=\"23\" y2=\"9\"></line><line x1=\"20\" y1=\"14\" x2=\"23\" y2=\"14\"></line><line x1=\"1\" y1=\"9\" x2=\"4\" y2=\"9\"></line><line x1=\"1\" y1=\"14\" x2=\"4\" y2=\"14\"></line>","credit-card":"<rect x=\"1\" y=\"4\" width=\"22\" height=\"16\" rx=\"2\" ry=\"2\"></rect><line x1=\"1\" y1=\"10\" x2=\"23\" y2=\"10\"></line>","crop":"<path d=\"M6.13 1L6 16a2 2 0 0 0 2 2h15\"></path><path d=\"M1 6.13L16 6a2 2 0 0 1 2 2v15\"></path>","crosshair":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"22\" y1=\"12\" x2=\"18\" y2=\"12\"></line><line x1=\"6\" y1=\"12\" x2=\"2\" y2=\"12\"></line><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"2\"></line><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"18\"></line>","database":"<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"></ellipse><path d=\"M21 12c0 1.66-4 3-9 3s-9-1.34-9-3\"></path><path d=\"M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5\"></path>","delete":"<path d=\"M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z\"></path><line x1=\"18\" y1=\"9\" x2=\"12\" y2=\"15\"></line><line x1=\"12\" y1=\"9\" x2=\"18\" y2=\"15\"></line>","disc":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"3\"></circle>","dollar-sign":"<line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"23\"></line><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"></path>","download-cloud":"<polyline points=\"8 17 12 21 16 17\"></polyline><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"21\"></line><path d=\"M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29\"></path>","download":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"7 10 12 15 17 10\"></polyline><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"></line>","droplet":"<path d=\"M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z\"></path>","edit-2":"<path d=\"M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z\"></path>","edit-3":"<path d=\"M12 20h9\"></path><path d=\"M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z\"></path>","edit":"<path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path>","external-link":"<path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"></path><polyline points=\"15 3 21 3 21 9\"></polyline><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"></line>","eye-off":"<path d=\"M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24\"></path><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","eye":"<path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle>","facebook":"<path d=\"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z\"></path>","fast-forward":"<polygon points=\"13 19 22 12 13 5 13 19\"></polygon><polygon points=\"2 19 11 12 2 5 2 19\"></polygon>","feather":"<path d=\"M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z\"></path><line x1=\"16\" y1=\"8\" x2=\"2\" y2=\"22\"></line><line x1=\"17.5\" y1=\"15\" x2=\"9\" y2=\"15\"></line>","figma":"<path d=\"M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z\"></path><path d=\"M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z\"></path><path d=\"M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z\"></path><path d=\"M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z\"></path><path d=\"M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z\"></path>","file-minus":"<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"9\" y1=\"15\" x2=\"15\" y2=\"15\"></line>","file-plus":"<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"12\"></line><line x1=\"9\" y1=\"15\" x2=\"15\" y2=\"15\"></line>","file-text":"<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"></line><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"></line><polyline points=\"10 9 9 9 8 9\"></polyline>","file":"<path d=\"M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"></path><polyline points=\"13 2 13 9 20 9\"></polyline>","film":"<rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"2.18\" ry=\"2.18\"></rect><line x1=\"7\" y1=\"2\" x2=\"7\" y2=\"22\"></line><line x1=\"17\" y1=\"2\" x2=\"17\" y2=\"22\"></line><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line><line x1=\"2\" y1=\"7\" x2=\"7\" y2=\"7\"></line><line x1=\"2\" y1=\"17\" x2=\"7\" y2=\"17\"></line><line x1=\"17\" y1=\"17\" x2=\"22\" y2=\"17\"></line><line x1=\"17\" y1=\"7\" x2=\"22\" y2=\"7\"></line>","filter":"<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"></polygon>","flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"></path><line x1=\"4\" y1=\"22\" x2=\"4\" y2=\"15\"></line>","folder-minus":"<path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"></path><line x1=\"9\" y1=\"14\" x2=\"15\" y2=\"14\"></line>","folder-plus":"<path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"></path><line x1=\"12\" y1=\"11\" x2=\"12\" y2=\"17\"></line><line x1=\"9\" y1=\"14\" x2=\"15\" y2=\"14\"></line>","folder":"<path d=\"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z\"></path>","framer":"<path d=\"M5 16V9h14V2H5l14 14h-7m-7 0l7 7v-7m-7 0h7\"></path>","frown":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M16 16s-1.5-2-4-2-4 2-4 2\"></path><line x1=\"9\" y1=\"9\" x2=\"9.01\" y2=\"9\"></line><line x1=\"15\" y1=\"9\" x2=\"15.01\" y2=\"9\"></line>","gift":"<polyline points=\"20 12 20 22 4 22 4 12\"></polyline><rect x=\"2\" y=\"7\" width=\"20\" height=\"5\"></rect><line x1=\"12\" y1=\"22\" x2=\"12\" y2=\"7\"></line><path d=\"M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z\"></path><path d=\"M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z\"></path>","git-branch":"<line x1=\"6\" y1=\"3\" x2=\"6\" y2=\"15\"></line><circle cx=\"18\" cy=\"6\" r=\"3\"></circle><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><path d=\"M18 9a9 9 0 0 1-9 9\"></path>","git-commit":"<circle cx=\"12\" cy=\"12\" r=\"4\"></circle><line x1=\"1.05\" y1=\"12\" x2=\"7\" y2=\"12\"></line><line x1=\"17.01\" y1=\"12\" x2=\"22.96\" y2=\"12\"></line>","git-merge":"<circle cx=\"18\" cy=\"18\" r=\"3\"></circle><circle cx=\"6\" cy=\"6\" r=\"3\"></circle><path d=\"M6 21V9a9 9 0 0 0 9 9\"></path>","git-pull-request":"<circle cx=\"18\" cy=\"18\" r=\"3\"></circle><circle cx=\"6\" cy=\"6\" r=\"3\"></circle><path d=\"M13 6h3a2 2 0 0 1 2 2v7\"></path><line x1=\"6\" y1=\"9\" x2=\"6\" y2=\"21\"></line>","github":"<path d=\"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22\"></path>","gitlab":"<path d=\"M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z\"></path>","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"></path>","grid":"<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"></rect>","hard-drive":"<line x1=\"22\" y1=\"12\" x2=\"2\" y2=\"12\"></line><path d=\"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"></path><line x1=\"6\" y1=\"16\" x2=\"6\" y2=\"16\"></line><line x1=\"10\" y1=\"16\" x2=\"10\" y2=\"16\"></line>","hash":"<line x1=\"4\" y1=\"9\" x2=\"20\" y2=\"9\"></line><line x1=\"4\" y1=\"15\" x2=\"20\" y2=\"15\"></line><line x1=\"10\" y1=\"3\" x2=\"8\" y2=\"21\"></line><line x1=\"16\" y1=\"3\" x2=\"14\" y2=\"21\"></line>","headphones":"<path d=\"M3 18v-6a9 9 0 0 1 18 0v6\"></path><path d=\"M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z\"></path>","heart":"<path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z\"></path>","help-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"></path><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"17\"></line>","hexagon":"<path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"></path>","home":"<path d=\"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"></path><polyline points=\"9 22 9 12 15 12 15 22\"></polyline>","image":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"></circle><polyline points=\"21 15 16 10 5 21\"></polyline>","inbox":"<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"></polyline><path d=\"M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"></path>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"12\"></line><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"8\"></line>","instagram":"<rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"5\" ry=\"5\"></rect><path d=\"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z\"></path><line x1=\"17.5\" y1=\"6.5\" x2=\"17.5\" y2=\"6.5\"></line>","italic":"<line x1=\"19\" y1=\"4\" x2=\"10\" y2=\"4\"></line><line x1=\"14\" y1=\"20\" x2=\"5\" y2=\"20\"></line><line x1=\"15\" y1=\"4\" x2=\"9\" y2=\"20\"></line>","key":"<path d=\"M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4\"></path>","layers":"<polygon points=\"12 2 2 7 12 12 22 7 12 2\"></polygon><polyline points=\"2 17 12 22 22 17\"></polyline><polyline points=\"2 12 12 17 22 12\"></polyline>","layout":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"></line><line x1=\"9\" y1=\"21\" x2=\"9\" y2=\"9\"></line>","life-buoy":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"4\"></circle><line x1=\"4.93\" y1=\"4.93\" x2=\"9.17\" y2=\"9.17\"></line><line x1=\"14.83\" y1=\"14.83\" x2=\"19.07\" y2=\"19.07\"></line><line x1=\"14.83\" y1=\"9.17\" x2=\"19.07\" y2=\"4.93\"></line><line x1=\"14.83\" y1=\"9.17\" x2=\"18.36\" y2=\"5.64\"></line><line x1=\"4.93\" y1=\"19.07\" x2=\"9.17\" y2=\"14.83\"></line>","link-2":"<path d=\"M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3\"></path><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","link":"<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"></path><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"></path>","linkedin":"<path d=\"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z\"></path><rect x=\"2\" y=\"9\" width=\"4\" height=\"12\"></rect><circle cx=\"4\" cy=\"4\" r=\"2\"></circle>","list":"<line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"></line><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"></line><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"></line><line x1=\"3\" y1=\"6\" x2=\"3\" y2=\"6\"></line><line x1=\"3\" y1=\"12\" x2=\"3\" y2=\"12\"></line><line x1=\"3\" y1=\"18\" x2=\"3\" y2=\"18\"></line>","loader":"<line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"6\"></line><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"22\"></line><line x1=\"4.93\" y1=\"4.93\" x2=\"7.76\" y2=\"7.76\"></line><line x1=\"16.24\" y1=\"16.24\" x2=\"19.07\" y2=\"19.07\"></line><line x1=\"2\" y1=\"12\" x2=\"6\" y2=\"12\"></line><line x1=\"18\" y1=\"12\" x2=\"22\" y2=\"12\"></line><line x1=\"4.93\" y1=\"19.07\" x2=\"7.76\" y2=\"16.24\"></line><line x1=\"16.24\" y1=\"7.76\" x2=\"19.07\" y2=\"4.93\"></line>","lock":"<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"></path>","log-in":"<path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\"></path><polyline points=\"10 17 15 12 10 7\"></polyline><line x1=\"15\" y1=\"12\" x2=\"3\" y2=\"12\"></line>","log-out":"<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"></path><polyline points=\"16 17 21 12 16 7\"></polyline><line x1=\"21\" y1=\"12\" x2=\"9\" y2=\"12\"></line>","mail":"<path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"></path><polyline points=\"22,6 12,13 2,6\"></polyline>","map-pin":"<path d=\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z\"></path><circle cx=\"12\" cy=\"10\" r=\"3\"></circle>","map":"<polygon points=\"1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6\"></polygon><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"18\"></line><line x1=\"16\" y1=\"6\" x2=\"16\" y2=\"22\"></line>","maximize-2":"<polyline points=\"15 3 21 3 21 9\"></polyline><polyline points=\"9 21 3 21 3 15\"></polyline><line x1=\"21\" y1=\"3\" x2=\"14\" y2=\"10\"></line><line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"></line>","maximize":"<path d=\"M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3\"></path>","meh":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"8\" y1=\"15\" x2=\"16\" y2=\"15\"></line><line x1=\"9\" y1=\"9\" x2=\"9.01\" y2=\"9\"></line><line x1=\"15\" y1=\"9\" x2=\"15.01\" y2=\"9\"></line>","menu":"<line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"></line><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"></line><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"></line>","message-circle":"<path d=\"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z\"></path>","message-square":"<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"></path>","mic-off":"<line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line><path d=\"M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6\"></path><path d=\"M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23\"></path><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"23\"></line><line x1=\"8\" y1=\"23\" x2=\"16\" y2=\"23\"></line>","mic":"<path d=\"M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z\"></path><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"></path><line x1=\"12\" y1=\"19\" x2=\"12\" y2=\"23\"></line><line x1=\"8\" y1=\"23\" x2=\"16\" y2=\"23\"></line>","minimize-2":"<polyline points=\"4 14 10 14 10 20\"></polyline><polyline points=\"20 10 14 10 14 4\"></polyline><line x1=\"14\" y1=\"10\" x2=\"21\" y2=\"3\"></line><line x1=\"3\" y1=\"21\" x2=\"10\" y2=\"14\"></line>","minimize":"<path d=\"M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3\"></path>","minus-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","minus-square":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","minus":"<line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line>","monitor":"<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"2\" ry=\"2\"></rect><line x1=\"8\" y1=\"21\" x2=\"16\" y2=\"21\"></line><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"21\"></line>","moon":"<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"></path>","more-horizontal":"<circle cx=\"12\" cy=\"12\" r=\"1\"></circle><circle cx=\"19\" cy=\"12\" r=\"1\"></circle><circle cx=\"5\" cy=\"12\" r=\"1\"></circle>","more-vertical":"<circle cx=\"12\" cy=\"12\" r=\"1\"></circle><circle cx=\"12\" cy=\"5\" r=\"1\"></circle><circle cx=\"12\" cy=\"19\" r=\"1\"></circle>","mouse-pointer":"<path d=\"M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z\"></path><path d=\"M13 13l6 6\"></path>","move":"<polyline points=\"5 9 2 12 5 15\"></polyline><polyline points=\"9 5 12 2 15 5\"></polyline><polyline points=\"15 19 12 22 9 19\"></polyline><polyline points=\"19 9 22 12 19 15\"></polyline><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"22\"></line>","music":"<path d=\"M9 18V5l12-2v13\"></path><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><circle cx=\"18\" cy=\"16\" r=\"3\"></circle>","navigation-2":"<polygon points=\"12 2 19 21 12 17 5 21 12 2\"></polygon>","navigation":"<polygon points=\"3 11 22 2 13 21 11 13 3 11\"></polygon>","octagon":"<polygon points=\"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2\"></polygon>","package":"<line x1=\"16.5\" y1=\"9.4\" x2=\"7.5\" y2=\"4.21\"></line><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"></path><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"></polyline><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"></line>","paperclip":"<path d=\"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48\"></path>","pause-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"10\" y1=\"15\" x2=\"10\" y2=\"9\"></line><line x1=\"14\" y1=\"15\" x2=\"14\" y2=\"9\"></line>","pause":"<rect x=\"6\" y=\"4\" width=\"4\" height=\"16\"></rect><rect x=\"14\" y=\"4\" width=\"4\" height=\"16\"></rect>","pen-tool":"<path d=\"M12 19l7-7 3 3-7 7-3-3z\"></path><path d=\"M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z\"></path><path d=\"M2 2l7.586 7.586\"></path><circle cx=\"11\" cy=\"11\" r=\"2\"></circle>","percent":"<line x1=\"19\" y1=\"5\" x2=\"5\" y2=\"19\"></line><circle cx=\"6.5\" cy=\"6.5\" r=\"2.5\"></circle><circle cx=\"17.5\" cy=\"17.5\" r=\"2.5\"></circle>","phone-call":"<path d=\"M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","phone-forwarded":"<polyline points=\"19 1 23 5 19 9\"></polyline><line x1=\"15\" y1=\"5\" x2=\"23\" y2=\"5\"></line><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","phone-incoming":"<polyline points=\"16 2 16 8 22 8\"></polyline><line x1=\"23\" y1=\"1\" x2=\"16\" y2=\"8\"></line><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","phone-missed":"<line x1=\"23\" y1=\"1\" x2=\"17\" y2=\"7\"></line><line x1=\"17\" y1=\"1\" x2=\"23\" y2=\"7\"></line><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","phone-off":"<path d=\"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91\"></path><line x1=\"23\" y1=\"1\" x2=\"1\" y2=\"23\"></line>","phone-outgoing":"<polyline points=\"23 7 23 1 17 1\"></polyline><line x1=\"16\" y1=\"8\" x2=\"23\" y2=\"1\"></line><path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"></path>","pie-chart":"<path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"></path><path d=\"M22 12A10 10 0 0 0 12 2v10z\"></path>","play-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polygon points=\"10 8 16 12 10 16 10 8\"></polygon>","play":"<polygon points=\"5 3 19 12 5 21 5 3\"></polygon>","plus-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"></line><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","plus-square":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"></line><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"></line>","plus":"<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"></line>","pocket":"<path d=\"M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z\"></path><polyline points=\"8 10 12 14 16 10\"></polyline>","power":"<path d=\"M18.36 6.64a9 9 0 1 1-12.73 0\"></path><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"12\"></line>","printer":"<polyline points=\"6 9 6 2 18 2 18 9\"></polyline><path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"></path><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\"></rect>","radio":"<circle cx=\"12\" cy=\"12\" r=\"2\"></circle><path d=\"M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14\"></path>","refresh-ccw":"<polyline points=\"1 4 1 10 7 10\"></polyline><polyline points=\"23 20 23 14 17 14\"></polyline><path d=\"M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15\"></path>","refresh-cw":"<polyline points=\"23 4 23 10 17 10\"></polyline><polyline points=\"1 20 1 14 7 14\"></polyline><path d=\"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15\"></path>","repeat":"<polyline points=\"17 1 21 5 17 9\"></polyline><path d=\"M3 11V9a4 4 0 0 1 4-4h14\"></path><polyline points=\"7 23 3 19 7 15\"></polyline><path d=\"M21 13v2a4 4 0 0 1-4 4H3\"></path>","rewind":"<polygon points=\"11 19 2 12 11 5 11 19\"></polygon><polygon points=\"22 19 13 12 22 5 22 19\"></polygon>","rotate-ccw":"<polyline points=\"1 4 1 10 7 10\"></polyline><path d=\"M3.51 15a9 9 0 1 0 2.13-9.36L1 10\"></path>","rotate-cw":"<polyline points=\"23 4 23 10 17 10\"></polyline><path d=\"M20.49 15a9 9 0 1 1-2.12-9.36L23 10\"></path>","rss":"<path d=\"M4 11a9 9 0 0 1 9 9\"></path><path d=\"M4 4a16 16 0 0 1 16 16\"></path><circle cx=\"5\" cy=\"19\" r=\"1\"></circle>","save":"<path d=\"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z\"></path><polyline points=\"17 21 17 13 7 13 7 21\"></polyline><polyline points=\"7 3 7 8 15 8\"></polyline>","scissors":"<circle cx=\"6\" cy=\"6\" r=\"3\"></circle><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><line x1=\"20\" y1=\"4\" x2=\"8.12\" y2=\"15.88\"></line><line x1=\"14.47\" y1=\"14.48\" x2=\"20\" y2=\"20\"></line><line x1=\"8.12\" y1=\"8.12\" x2=\"12\" y2=\"12\"></line>","search":"<circle cx=\"11\" cy=\"11\" r=\"8\"></circle><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line>","send":"<line x1=\"22\" y1=\"2\" x2=\"11\" y2=\"13\"></line><polygon points=\"22 2 15 22 11 13 2 9 22 2\"></polygon>","server":"<rect x=\"2\" y=\"2\" width=\"20\" height=\"8\" rx=\"2\" ry=\"2\"></rect><rect x=\"2\" y=\"14\" width=\"20\" height=\"8\" rx=\"2\" ry=\"2\"></rect><line x1=\"6\" y1=\"6\" x2=\"6\" y2=\"6\"></line><line x1=\"6\" y1=\"18\" x2=\"6\" y2=\"18\"></line>","settings":"<circle cx=\"12\" cy=\"12\" r=\"3\"></circle><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z\"></path>","share-2":"<circle cx=\"18\" cy=\"5\" r=\"3\"></circle><circle cx=\"6\" cy=\"12\" r=\"3\"></circle><circle cx=\"18\" cy=\"19\" r=\"3\"></circle><line x1=\"8.59\" y1=\"13.51\" x2=\"15.42\" y2=\"17.49\"></line><line x1=\"15.41\" y1=\"6.51\" x2=\"8.59\" y2=\"10.49\"></line>","share":"<path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"></path><polyline points=\"16 6 12 2 8 6\"></polyline><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"15\"></line>","shield-off":"<path d=\"M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18\"></path><path d=\"M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38\"></path><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","shield":"<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path>","shopping-bag":"<path d=\"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\"></path><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"></line><path d=\"M16 10a4 4 0 0 1-8 0\"></path>","shopping-cart":"<circle cx=\"9\" cy=\"21\" r=\"1\"></circle><circle cx=\"20\" cy=\"21\" r=\"1\"></circle><path d=\"M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6\"></path>","shuffle":"<polyline points=\"16 3 21 3 21 8\"></polyline><line x1=\"4\" y1=\"20\" x2=\"21\" y2=\"3\"></line><polyline points=\"21 16 21 21 16 21\"></polyline><line x1=\"15\" y1=\"15\" x2=\"21\" y2=\"21\"></line><line x1=\"4\" y1=\"4\" x2=\"9\" y2=\"9\"></line>","sidebar":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"9\" y1=\"3\" x2=\"9\" y2=\"21\"></line>","skip-back":"<polygon points=\"19 20 9 12 19 4 19 20\"></polygon><line x1=\"5\" y1=\"19\" x2=\"5\" y2=\"5\"></line>","skip-forward":"<polygon points=\"5 4 15 12 5 20 5 4\"></polygon><line x1=\"19\" y1=\"5\" x2=\"19\" y2=\"19\"></line>","slack":"<path d=\"M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z\"></path><path d=\"M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z\"></path><path d=\"M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z\"></path><path d=\"M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z\"></path><path d=\"M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z\"></path><path d=\"M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z\"></path><path d=\"M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z\"></path><path d=\"M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z\"></path>","slash":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"4.93\" y1=\"4.93\" x2=\"19.07\" y2=\"19.07\"></line>","sliders":"<line x1=\"4\" y1=\"21\" x2=\"4\" y2=\"14\"></line><line x1=\"4\" y1=\"10\" x2=\"4\" y2=\"3\"></line><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"12\"></line><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"3\"></line><line x1=\"20\" y1=\"21\" x2=\"20\" y2=\"16\"></line><line x1=\"20\" y1=\"12\" x2=\"20\" y2=\"3\"></line><line x1=\"1\" y1=\"14\" x2=\"7\" y2=\"14\"></line><line x1=\"9\" y1=\"8\" x2=\"15\" y2=\"8\"></line><line x1=\"17\" y1=\"16\" x2=\"23\" y2=\"16\"></line>","smartphone":"<rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"2\" ry=\"2\"></rect><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"18\"></line>","smile":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M8 14s1.5 2 4 2 4-2 4-2\"></path><line x1=\"9\" y1=\"9\" x2=\"9.01\" y2=\"9\"></line><line x1=\"15\" y1=\"9\" x2=\"15.01\" y2=\"9\"></line>","speaker":"<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\" ry=\"2\"></rect><circle cx=\"12\" cy=\"14\" r=\"4\"></circle><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"6\"></line>","square":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect>","star":"<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"></polygon>","stop-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\"></rect>","sun":"<circle cx=\"12\" cy=\"12\" r=\"5\"></circle><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"></line><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"></line><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"></line><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"></line><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"></line><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"></line><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"></line><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"></line>","sunrise":"<path d=\"M17 18a5 5 0 0 0-10 0\"></path><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"9\"></line><line x1=\"4.22\" y1=\"10.22\" x2=\"5.64\" y2=\"11.64\"></line><line x1=\"1\" y1=\"18\" x2=\"3\" y2=\"18\"></line><line x1=\"21\" y1=\"18\" x2=\"23\" y2=\"18\"></line><line x1=\"18.36\" y1=\"11.64\" x2=\"19.78\" y2=\"10.22\"></line><line x1=\"23\" y1=\"22\" x2=\"1\" y2=\"22\"></line><polyline points=\"8 6 12 2 16 6\"></polyline>","sunset":"<path d=\"M17 18a5 5 0 0 0-10 0\"></path><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"2\"></line><line x1=\"4.22\" y1=\"10.22\" x2=\"5.64\" y2=\"11.64\"></line><line x1=\"1\" y1=\"18\" x2=\"3\" y2=\"18\"></line><line x1=\"21\" y1=\"18\" x2=\"23\" y2=\"18\"></line><line x1=\"18.36\" y1=\"11.64\" x2=\"19.78\" y2=\"10.22\"></line><line x1=\"23\" y1=\"22\" x2=\"1\" y2=\"22\"></line><polyline points=\"16 5 12 9 8 5\"></polyline>","tablet":"<rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\" ry=\"2\" transform=\"rotate(180 12 12)\"></rect><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"18\"></line>","tag":"<path d=\"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z\"></path><line x1=\"7\" y1=\"7\" x2=\"7\" y2=\"7\"></line>","target":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><circle cx=\"12\" cy=\"12\" r=\"6\"></circle><circle cx=\"12\" cy=\"12\" r=\"2\"></circle>","terminal":"<polyline points=\"4 17 10 11 4 5\"></polyline><line x1=\"12\" y1=\"19\" x2=\"20\" y2=\"19\"></line>","thermometer":"<path d=\"M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z\"></path>","thumbs-down":"<path d=\"M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17\"></path>","thumbs-up":"<path d=\"M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3\"></path>","toggle-left":"<rect x=\"1\" y=\"5\" width=\"22\" height=\"14\" rx=\"7\" ry=\"7\"></rect><circle cx=\"8\" cy=\"12\" r=\"3\"></circle>","toggle-right":"<rect x=\"1\" y=\"5\" width=\"22\" height=\"14\" rx=\"7\" ry=\"7\"></rect><circle cx=\"16\" cy=\"12\" r=\"3\"></circle>","trash-2":"<polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"></line><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"></line>","trash":"<polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path>","trello":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><rect x=\"7\" y=\"7\" width=\"3\" height=\"9\"></rect><rect x=\"14\" y=\"7\" width=\"3\" height=\"5\"></rect>","trending-down":"<polyline points=\"23 18 13.5 8.5 8.5 13.5 1 6\"></polyline><polyline points=\"17 18 23 18 23 12\"></polyline>","trending-up":"<polyline points=\"23 6 13.5 15.5 8.5 10.5 1 18\"></polyline><polyline points=\"17 6 23 6 23 12\"></polyline>","triangle":"<path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"></path>","truck":"<rect x=\"1\" y=\"3\" width=\"15\" height=\"13\"></rect><polygon points=\"16 8 20 8 23 11 23 16 16 16 16 8\"></polygon><circle cx=\"5.5\" cy=\"18.5\" r=\"2.5\"></circle><circle cx=\"18.5\" cy=\"18.5\" r=\"2.5\"></circle>","tv":"<rect x=\"2\" y=\"7\" width=\"20\" height=\"15\" rx=\"2\" ry=\"2\"></rect><polyline points=\"17 2 12 7 7 2\"></polyline>","twitter":"<path d=\"M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z\"></path>","type":"<polyline points=\"4 7 4 4 20 4 20 7\"></polyline><line x1=\"9\" y1=\"20\" x2=\"15\" y2=\"20\"></line><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"20\"></line>","umbrella":"<path d=\"M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7\"></path>","underline":"<path d=\"M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3\"></path><line x1=\"4\" y1=\"21\" x2=\"20\" y2=\"21\"></line>","unlock":"<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"></rect><path d=\"M7 11V7a5 5 0 0 1 9.9-1\"></path>","upload-cloud":"<polyline points=\"16 16 12 12 8 16\"></polyline><line x1=\"12\" y1=\"12\" x2=\"12\" y2=\"21\"></line><path d=\"M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3\"></path><polyline points=\"16 16 12 12 8 16\"></polyline>","upload":"<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"17 8 12 3 7 8\"></polyline><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"15\"></line>","user-check":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"8.5\" cy=\"7\" r=\"4\"></circle><polyline points=\"17 11 19 13 23 9\"></polyline>","user-minus":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"8.5\" cy=\"7\" r=\"4\"></circle><line x1=\"23\" y1=\"11\" x2=\"17\" y2=\"11\"></line>","user-plus":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"8.5\" cy=\"7\" r=\"4\"></circle><line x1=\"20\" y1=\"8\" x2=\"20\" y2=\"14\"></line><line x1=\"23\" y1=\"11\" x2=\"17\" y2=\"11\"></line>","user-x":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"8.5\" cy=\"7\" r=\"4\"></circle><line x1=\"18\" y1=\"8\" x2=\"23\" y2=\"13\"></line><line x1=\"23\" y1=\"8\" x2=\"18\" y2=\"13\"></line>","user":"<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"></path><circle cx=\"12\" cy=\"7\" r=\"4\"></circle>","users":"<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"></path><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"></path>","video-off":"<path d=\"M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10\"></path><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","video":"<polygon points=\"23 7 16 12 23 17 23 7\"></polygon><rect x=\"1\" y=\"5\" width=\"15\" height=\"14\" rx=\"2\" ry=\"2\"></rect>","voicemail":"<circle cx=\"5.5\" cy=\"11.5\" r=\"4.5\"></circle><circle cx=\"18.5\" cy=\"11.5\" r=\"4.5\"></circle><line x1=\"5.5\" y1=\"16\" x2=\"18.5\" y2=\"16\"></line>","volume-1":"<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M15.54 8.46a5 5 0 0 1 0 7.07\"></path>","volume-2":"<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><path d=\"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07\"></path>","volume-x":"<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon><line x1=\"23\" y1=\"9\" x2=\"17\" y2=\"15\"></line><line x1=\"17\" y1=\"9\" x2=\"23\" y2=\"15\"></line>","volume":"<polygon points=\"11 5 6 9 2 9 2 15 6 15 11 19 11 5\"></polygon>","watch":"<circle cx=\"12\" cy=\"12\" r=\"7\"></circle><polyline points=\"12 9 12 12 13.5 13.5\"></polyline><path d=\"M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83\"></path>","wifi-off":"<line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line><path d=\"M16.72 11.06A10.94 10.94 0 0 1 19 12.55\"></path><path d=\"M5 12.55a10.94 10.94 0 0 1 5.17-2.39\"></path><path d=\"M10.71 5.05A16 16 0 0 1 22.58 9\"></path><path d=\"M1.42 9a15.91 15.91 0 0 1 4.7-2.88\"></path><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"></path><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"20\"></line>","wifi":"<path d=\"M5 12.55a11 11 0 0 1 14.08 0\"></path><path d=\"M1.42 9a16 16 0 0 1 21.16 0\"></path><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"></path><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"20\"></line>","wind":"<path d=\"M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2\"></path>","x-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"></line><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"></line>","x-octagon":"<polygon points=\"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2\"></polygon><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"></line><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"></line>","x-square":"<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"></rect><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"></line><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"></line>","x":"<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"></line><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"></line>","youtube":"<path d=\"M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z\"></path><polygon points=\"9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02\"></polygon>","zap-off":"<polyline points=\"12.41 6.75 13 2 10.57 4.92\"></polyline><polyline points=\"18.57 12.91 21 10 15.66 10\"></polyline><polyline points=\"8 8 3 14 12 14 11 22 16 16\"></polyline><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line>","zap":"<polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"></polygon>","zoom-in":"<circle cx=\"11\" cy=\"11\" r=\"8\"></circle><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line><line x1=\"11\" y1=\"8\" x2=\"11\" y2=\"14\"></line><line x1=\"8\" y1=\"11\" x2=\"14\" y2=\"11\"></line>","zoom-out":"<circle cx=\"11\" cy=\"11\" r=\"8\"></circle><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"></line><line x1=\"8\" y1=\"11\" x2=\"14\" y2=\"11\"></line>"};

    /***/ }),

    /***/ "./node_modules/classnames/dedupe.js":
    /*!*******************************************!*\
      !*** ./node_modules/classnames/dedupe.js ***!
      \*******************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
      Copyright (c) 2016 Jed Watson.
      Licensed under the MIT License (MIT), see
      http://jedwatson.github.io/classnames
    */
    /* global define */

    (function () {

    	var classNames = (function () {
    		// don't inherit from Object so we can skip hasOwnProperty check later
    		// http://stackoverflow.com/questions/15518328/creating-js-object-with-object-createnull#answer-21079232
    		function StorageObject() {}
    		StorageObject.prototype = Object.create(null);

    		function _parseArray (resultSet, array) {
    			var length = array.length;

    			for (var i = 0; i < length; ++i) {
    				_parse(resultSet, array[i]);
    			}
    		}

    		var hasOwn = {}.hasOwnProperty;

    		function _parseNumber (resultSet, num) {
    			resultSet[num] = true;
    		}

    		function _parseObject (resultSet, object) {
    			for (var k in object) {
    				if (hasOwn.call(object, k)) {
    					// set value to false instead of deleting it to avoid changing object structure
    					// https://www.smashingmagazine.com/2012/11/writing-fast-memory-efficient-javascript/#de-referencing-misconceptions
    					resultSet[k] = !!object[k];
    				}
    			}
    		}

    		var SPACE = /\s+/;
    		function _parseString (resultSet, str) {
    			var array = str.split(SPACE);
    			var length = array.length;

    			for (var i = 0; i < length; ++i) {
    				resultSet[array[i]] = true;
    			}
    		}

    		function _parse (resultSet, arg) {
    			if (!arg) return;
    			var argType = typeof arg;

    			// 'foo bar'
    			if (argType === 'string') {
    				_parseString(resultSet, arg);

    			// ['foo', 'bar', ...]
    			} else if (Array.isArray(arg)) {
    				_parseArray(resultSet, arg);

    			// { 'foo': true, ... }
    			} else if (argType === 'object') {
    				_parseObject(resultSet, arg);

    			// '130'
    			} else if (argType === 'number') {
    				_parseNumber(resultSet, arg);
    			}
    		}

    		function _classNames () {
    			// don't leak arguments
    			// https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
    			var len = arguments.length;
    			var args = Array(len);
    			for (var i = 0; i < len; i++) {
    				args[i] = arguments[i];
    			}

    			var classSet = new StorageObject();
    			_parseArray(classSet, args);

    			var list = [];

    			for (var k in classSet) {
    				if (classSet[k]) {
    					list.push(k);
    				}
    			}

    			return list.join(' ');
    		}

    		return _classNames;
    	})();

    	if (typeof module !== 'undefined' && module.exports) {
    		module.exports = classNames;
    	} else {
    		// register as 'classnames', consistent with npm package name
    		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function () {
    			return classNames;
    		}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
    				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    	}
    }());


    /***/ }),

    /***/ "./node_modules/core-js/es/array/from.js":
    /*!***********************************************!*\
      !*** ./node_modules/core-js/es/array/from.js ***!
      \***********************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    __webpack_require__(/*! ../../modules/es.string.iterator */ "./node_modules/core-js/modules/es.string.iterator.js");
    __webpack_require__(/*! ../../modules/es.array.from */ "./node_modules/core-js/modules/es.array.from.js");
    var path = __webpack_require__(/*! ../../internals/path */ "./node_modules/core-js/internals/path.js");

    module.exports = path.Array.from;


    /***/ }),

    /***/ "./node_modules/core-js/internals/a-function.js":
    /*!******************************************************!*\
      !*** ./node_modules/core-js/internals/a-function.js ***!
      \******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = function (it) {
      if (typeof it != 'function') {
        throw TypeError(String(it) + ' is not a function');
      } return it;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/an-object.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/an-object.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var isObject = __webpack_require__(/*! ../internals/is-object */ "./node_modules/core-js/internals/is-object.js");

    module.exports = function (it) {
      if (!isObject(it)) {
        throw TypeError(String(it) + ' is not an object');
      } return it;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/array-from.js":
    /*!******************************************************!*\
      !*** ./node_modules/core-js/internals/array-from.js ***!
      \******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var bind = __webpack_require__(/*! ../internals/bind-context */ "./node_modules/core-js/internals/bind-context.js");
    var toObject = __webpack_require__(/*! ../internals/to-object */ "./node_modules/core-js/internals/to-object.js");
    var callWithSafeIterationClosing = __webpack_require__(/*! ../internals/call-with-safe-iteration-closing */ "./node_modules/core-js/internals/call-with-safe-iteration-closing.js");
    var isArrayIteratorMethod = __webpack_require__(/*! ../internals/is-array-iterator-method */ "./node_modules/core-js/internals/is-array-iterator-method.js");
    var toLength = __webpack_require__(/*! ../internals/to-length */ "./node_modules/core-js/internals/to-length.js");
    var createProperty = __webpack_require__(/*! ../internals/create-property */ "./node_modules/core-js/internals/create-property.js");
    var getIteratorMethod = __webpack_require__(/*! ../internals/get-iterator-method */ "./node_modules/core-js/internals/get-iterator-method.js");

    // `Array.from` method
    // https://tc39.github.io/ecma262/#sec-array.from
    module.exports = function from(arrayLike /* , mapfn = undefined, thisArg = undefined */) {
      var O = toObject(arrayLike);
      var C = typeof this == 'function' ? this : Array;
      var argumentsLength = arguments.length;
      var mapfn = argumentsLength > 1 ? arguments[1] : undefined;
      var mapping = mapfn !== undefined;
      var index = 0;
      var iteratorMethod = getIteratorMethod(O);
      var length, result, step, iterator;
      if (mapping) mapfn = bind(mapfn, argumentsLength > 2 ? arguments[2] : undefined, 2);
      // if the target is not iterable or it's an array with the default iterator - use a simple case
      if (iteratorMethod != undefined && !(C == Array && isArrayIteratorMethod(iteratorMethod))) {
        iterator = iteratorMethod.call(O);
        result = new C();
        for (;!(step = iterator.next()).done; index++) {
          createProperty(result, index, mapping
            ? callWithSafeIterationClosing(iterator, mapfn, [step.value, index], true)
            : step.value
          );
        }
      } else {
        length = toLength(O.length);
        result = new C(length);
        for (;length > index; index++) {
          createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
        }
      }
      result.length = index;
      return result;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/array-includes.js":
    /*!**********************************************************!*\
      !*** ./node_modules/core-js/internals/array-includes.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var toIndexedObject = __webpack_require__(/*! ../internals/to-indexed-object */ "./node_modules/core-js/internals/to-indexed-object.js");
    var toLength = __webpack_require__(/*! ../internals/to-length */ "./node_modules/core-js/internals/to-length.js");
    var toAbsoluteIndex = __webpack_require__(/*! ../internals/to-absolute-index */ "./node_modules/core-js/internals/to-absolute-index.js");

    // `Array.prototype.{ indexOf, includes }` methods implementation
    // false -> Array#indexOf
    // https://tc39.github.io/ecma262/#sec-array.prototype.indexof
    // true  -> Array#includes
    // https://tc39.github.io/ecma262/#sec-array.prototype.includes
    module.exports = function (IS_INCLUDES) {
      return function ($this, el, fromIndex) {
        var O = toIndexedObject($this);
        var length = toLength(O.length);
        var index = toAbsoluteIndex(fromIndex, length);
        var value;
        // Array#includes uses SameValueZero equality algorithm
        // eslint-disable-next-line no-self-compare
        if (IS_INCLUDES && el != el) while (length > index) {
          value = O[index++];
          // eslint-disable-next-line no-self-compare
          if (value != value) return true;
        // Array#indexOf ignores holes, Array#includes - not
        } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
          if (O[index] === el) return IS_INCLUDES || index || 0;
        } return !IS_INCLUDES && -1;
      };
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/bind-context.js":
    /*!********************************************************!*\
      !*** ./node_modules/core-js/internals/bind-context.js ***!
      \********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var aFunction = __webpack_require__(/*! ../internals/a-function */ "./node_modules/core-js/internals/a-function.js");

    // optional / simple context binding
    module.exports = function (fn, that, length) {
      aFunction(fn);
      if (that === undefined) return fn;
      switch (length) {
        case 0: return function () {
          return fn.call(that);
        };
        case 1: return function (a) {
          return fn.call(that, a);
        };
        case 2: return function (a, b) {
          return fn.call(that, a, b);
        };
        case 3: return function (a, b, c) {
          return fn.call(that, a, b, c);
        };
      }
      return function (/* ...args */) {
        return fn.apply(that, arguments);
      };
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/call-with-safe-iteration-closing.js":
    /*!****************************************************************************!*\
      !*** ./node_modules/core-js/internals/call-with-safe-iteration-closing.js ***!
      \****************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");

    // call something on iterator step with safe closing on error
    module.exports = function (iterator, fn, value, ENTRIES) {
      try {
        return ENTRIES ? fn(anObject(value)[0], value[1]) : fn(value);
      // 7.4.6 IteratorClose(iterator, completion)
      } catch (error) {
        var returnMethod = iterator['return'];
        if (returnMethod !== undefined) anObject(returnMethod.call(iterator));
        throw error;
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/check-correctness-of-iteration.js":
    /*!**************************************************************************!*\
      !*** ./node_modules/core-js/internals/check-correctness-of-iteration.js ***!
      \**************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");

    var ITERATOR = wellKnownSymbol('iterator');
    var SAFE_CLOSING = false;

    try {
      var called = 0;
      var iteratorWithReturn = {
        next: function () {
          return { done: !!called++ };
        },
        'return': function () {
          SAFE_CLOSING = true;
        }
      };
      iteratorWithReturn[ITERATOR] = function () {
        return this;
      };
      // eslint-disable-next-line no-throw-literal
      Array.from(iteratorWithReturn, function () { throw 2; });
    } catch (error) { /* empty */ }

    module.exports = function (exec, SKIP_CLOSING) {
      if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
      var ITERATION_SUPPORT = false;
      try {
        var object = {};
        object[ITERATOR] = function () {
          return {
            next: function () {
              return { done: ITERATION_SUPPORT = true };
            }
          };
        };
        exec(object);
      } catch (error) { /* empty */ }
      return ITERATION_SUPPORT;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/classof-raw.js":
    /*!*******************************************************!*\
      !*** ./node_modules/core-js/internals/classof-raw.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var toString = {}.toString;

    module.exports = function (it) {
      return toString.call(it).slice(8, -1);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/classof.js":
    /*!***************************************************!*\
      !*** ./node_modules/core-js/internals/classof.js ***!
      \***************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var classofRaw = __webpack_require__(/*! ../internals/classof-raw */ "./node_modules/core-js/internals/classof-raw.js");
    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");

    var TO_STRING_TAG = wellKnownSymbol('toStringTag');
    // ES3 wrong here
    var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

    // fallback for IE11 Script Access Denied error
    var tryGet = function (it, key) {
      try {
        return it[key];
      } catch (error) { /* empty */ }
    };

    // getting tag from ES6+ `Object.prototype.toString`
    module.exports = function (it) {
      var O, tag, result;
      return it === undefined ? 'Undefined' : it === null ? 'Null'
        // @@toStringTag case
        : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG)) == 'string' ? tag
        // builtinTag case
        : CORRECT_ARGUMENTS ? classofRaw(O)
        // ES3 arguments fallback
        : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/copy-constructor-properties.js":
    /*!***********************************************************************!*\
      !*** ./node_modules/core-js/internals/copy-constructor-properties.js ***!
      \***********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var ownKeys = __webpack_require__(/*! ../internals/own-keys */ "./node_modules/core-js/internals/own-keys.js");
    var getOwnPropertyDescriptorModule = __webpack_require__(/*! ../internals/object-get-own-property-descriptor */ "./node_modules/core-js/internals/object-get-own-property-descriptor.js");
    var definePropertyModule = __webpack_require__(/*! ../internals/object-define-property */ "./node_modules/core-js/internals/object-define-property.js");

    module.exports = function (target, source) {
      var keys = ownKeys(source);
      var defineProperty = definePropertyModule.f;
      var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/correct-prototype-getter.js":
    /*!********************************************************************!*\
      !*** ./node_modules/core-js/internals/correct-prototype-getter.js ***!
      \********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");

    module.exports = !fails(function () {
      function F() { /* empty */ }
      F.prototype.constructor = null;
      return Object.getPrototypeOf(new F()) !== F.prototype;
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/create-iterator-constructor.js":
    /*!***********************************************************************!*\
      !*** ./node_modules/core-js/internals/create-iterator-constructor.js ***!
      \***********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var IteratorPrototype = __webpack_require__(/*! ../internals/iterators-core */ "./node_modules/core-js/internals/iterators-core.js").IteratorPrototype;
    var create = __webpack_require__(/*! ../internals/object-create */ "./node_modules/core-js/internals/object-create.js");
    var createPropertyDescriptor = __webpack_require__(/*! ../internals/create-property-descriptor */ "./node_modules/core-js/internals/create-property-descriptor.js");
    var setToStringTag = __webpack_require__(/*! ../internals/set-to-string-tag */ "./node_modules/core-js/internals/set-to-string-tag.js");
    var Iterators = __webpack_require__(/*! ../internals/iterators */ "./node_modules/core-js/internals/iterators.js");

    var returnThis = function () { return this; };

    module.exports = function (IteratorConstructor, NAME, next) {
      var TO_STRING_TAG = NAME + ' Iterator';
      IteratorConstructor.prototype = create(IteratorPrototype, { next: createPropertyDescriptor(1, next) });
      setToStringTag(IteratorConstructor, TO_STRING_TAG, false, true);
      Iterators[TO_STRING_TAG] = returnThis;
      return IteratorConstructor;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/create-property-descriptor.js":
    /*!**********************************************************************!*\
      !*** ./node_modules/core-js/internals/create-property-descriptor.js ***!
      \**********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = function (bitmap, value) {
      return {
        enumerable: !(bitmap & 1),
        configurable: !(bitmap & 2),
        writable: !(bitmap & 4),
        value: value
      };
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/create-property.js":
    /*!***********************************************************!*\
      !*** ./node_modules/core-js/internals/create-property.js ***!
      \***********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var toPrimitive = __webpack_require__(/*! ../internals/to-primitive */ "./node_modules/core-js/internals/to-primitive.js");
    var definePropertyModule = __webpack_require__(/*! ../internals/object-define-property */ "./node_modules/core-js/internals/object-define-property.js");
    var createPropertyDescriptor = __webpack_require__(/*! ../internals/create-property-descriptor */ "./node_modules/core-js/internals/create-property-descriptor.js");

    module.exports = function (object, key, value) {
      var propertyKey = toPrimitive(key);
      if (propertyKey in object) definePropertyModule.f(object, propertyKey, createPropertyDescriptor(0, value));
      else object[propertyKey] = value;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/define-iterator.js":
    /*!***********************************************************!*\
      !*** ./node_modules/core-js/internals/define-iterator.js ***!
      \***********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var $ = __webpack_require__(/*! ../internals/export */ "./node_modules/core-js/internals/export.js");
    var createIteratorConstructor = __webpack_require__(/*! ../internals/create-iterator-constructor */ "./node_modules/core-js/internals/create-iterator-constructor.js");
    var getPrototypeOf = __webpack_require__(/*! ../internals/object-get-prototype-of */ "./node_modules/core-js/internals/object-get-prototype-of.js");
    var setPrototypeOf = __webpack_require__(/*! ../internals/object-set-prototype-of */ "./node_modules/core-js/internals/object-set-prototype-of.js");
    var setToStringTag = __webpack_require__(/*! ../internals/set-to-string-tag */ "./node_modules/core-js/internals/set-to-string-tag.js");
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");
    var redefine = __webpack_require__(/*! ../internals/redefine */ "./node_modules/core-js/internals/redefine.js");
    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");
    var IS_PURE = __webpack_require__(/*! ../internals/is-pure */ "./node_modules/core-js/internals/is-pure.js");
    var Iterators = __webpack_require__(/*! ../internals/iterators */ "./node_modules/core-js/internals/iterators.js");
    var IteratorsCore = __webpack_require__(/*! ../internals/iterators-core */ "./node_modules/core-js/internals/iterators-core.js");

    var IteratorPrototype = IteratorsCore.IteratorPrototype;
    var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
    var ITERATOR = wellKnownSymbol('iterator');
    var KEYS = 'keys';
    var VALUES = 'values';
    var ENTRIES = 'entries';

    var returnThis = function () { return this; };

    module.exports = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
      createIteratorConstructor(IteratorConstructor, NAME, next);

      var getIterationMethod = function (KIND) {
        if (KIND === DEFAULT && defaultIterator) return defaultIterator;
        if (!BUGGY_SAFARI_ITERATORS && KIND in IterablePrototype) return IterablePrototype[KIND];
        switch (KIND) {
          case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
          case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
          case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
        } return function () { return new IteratorConstructor(this); };
      };

      var TO_STRING_TAG = NAME + ' Iterator';
      var INCORRECT_VALUES_NAME = false;
      var IterablePrototype = Iterable.prototype;
      var nativeIterator = IterablePrototype[ITERATOR]
        || IterablePrototype['@@iterator']
        || DEFAULT && IterablePrototype[DEFAULT];
      var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
      var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
      var CurrentIteratorPrototype, methods, KEY;

      // fix native
      if (anyNativeIterator) {
        CurrentIteratorPrototype = getPrototypeOf(anyNativeIterator.call(new Iterable()));
        if (IteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
          if (!IS_PURE && getPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
            if (setPrototypeOf) {
              setPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
            } else if (typeof CurrentIteratorPrototype[ITERATOR] != 'function') {
              hide(CurrentIteratorPrototype, ITERATOR, returnThis);
            }
          }
          // Set @@toStringTag to native iterators
          setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true, true);
          if (IS_PURE) Iterators[TO_STRING_TAG] = returnThis;
        }
      }

      // fix Array#{values, @@iterator}.name in V8 / FF
      if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
        INCORRECT_VALUES_NAME = true;
        defaultIterator = function values() { return nativeIterator.call(this); };
      }

      // define iterator
      if ((!IS_PURE || FORCED) && IterablePrototype[ITERATOR] !== defaultIterator) {
        hide(IterablePrototype, ITERATOR, defaultIterator);
      }
      Iterators[NAME] = defaultIterator;

      // export additional methods
      if (DEFAULT) {
        methods = {
          values: getIterationMethod(VALUES),
          keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
          entries: getIterationMethod(ENTRIES)
        };
        if (FORCED) for (KEY in methods) {
          if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
            redefine(IterablePrototype, KEY, methods[KEY]);
          }
        } else $({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
      }

      return methods;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/descriptors.js":
    /*!*******************************************************!*\
      !*** ./node_modules/core-js/internals/descriptors.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");

    // Thank's IE8 for his funny defineProperty
    module.exports = !fails(function () {
      return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/document-create-element.js":
    /*!*******************************************************************!*\
      !*** ./node_modules/core-js/internals/document-create-element.js ***!
      \*******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var isObject = __webpack_require__(/*! ../internals/is-object */ "./node_modules/core-js/internals/is-object.js");

    var document = global.document;
    // typeof document.createElement is 'object' in old IE
    var exist = isObject(document) && isObject(document.createElement);

    module.exports = function (it) {
      return exist ? document.createElement(it) : {};
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/enum-bug-keys.js":
    /*!*********************************************************!*\
      !*** ./node_modules/core-js/internals/enum-bug-keys.js ***!
      \*********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    // IE8- don't enum bug keys
    module.exports = [
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf'
    ];


    /***/ }),

    /***/ "./node_modules/core-js/internals/export.js":
    /*!**************************************************!*\
      !*** ./node_modules/core-js/internals/export.js ***!
      \**************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var getOwnPropertyDescriptor = __webpack_require__(/*! ../internals/object-get-own-property-descriptor */ "./node_modules/core-js/internals/object-get-own-property-descriptor.js").f;
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");
    var redefine = __webpack_require__(/*! ../internals/redefine */ "./node_modules/core-js/internals/redefine.js");
    var setGlobal = __webpack_require__(/*! ../internals/set-global */ "./node_modules/core-js/internals/set-global.js");
    var copyConstructorProperties = __webpack_require__(/*! ../internals/copy-constructor-properties */ "./node_modules/core-js/internals/copy-constructor-properties.js");
    var isForced = __webpack_require__(/*! ../internals/is-forced */ "./node_modules/core-js/internals/is-forced.js");

    /*
      options.target      - name of the target object
      options.global      - target is the global object
      options.stat        - export as static methods of target
      options.proto       - export as prototype methods of target
      options.real        - real prototype method for the `pure` version
      options.forced      - export even if the native feature is available
      options.bind        - bind methods to the target, required for the `pure` version
      options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
      options.unsafe      - use the simple assignment of property instead of delete + defineProperty
      options.sham        - add a flag to not completely full polyfills
      options.enumerable  - export as enumerable property
      options.noTargetGet - prevent calling a getter on target
    */
    module.exports = function (options, source) {
      var TARGET = options.target;
      var GLOBAL = options.global;
      var STATIC = options.stat;
      var FORCED, target, key, targetProperty, sourceProperty, descriptor;
      if (GLOBAL) {
        target = global;
      } else if (STATIC) {
        target = global[TARGET] || setGlobal(TARGET, {});
      } else {
        target = (global[TARGET] || {}).prototype;
      }
      if (target) for (key in source) {
        sourceProperty = source[key];
        if (options.noTargetGet) {
          descriptor = getOwnPropertyDescriptor(target, key);
          targetProperty = descriptor && descriptor.value;
        } else targetProperty = target[key];
        FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
        // contained in target
        if (!FORCED && targetProperty !== undefined) {
          if (typeof sourceProperty === typeof targetProperty) continue;
          copyConstructorProperties(sourceProperty, targetProperty);
        }
        // add a flag to not completely full polyfills
        if (options.sham || (targetProperty && targetProperty.sham)) {
          hide(sourceProperty, 'sham', true);
        }
        // extend global
        redefine(target, key, sourceProperty, options);
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/fails.js":
    /*!*************************************************!*\
      !*** ./node_modules/core-js/internals/fails.js ***!
      \*************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = function (exec) {
      try {
        return !!exec();
      } catch (error) {
        return true;
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/function-to-string.js":
    /*!**************************************************************!*\
      !*** ./node_modules/core-js/internals/function-to-string.js ***!
      \**************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var shared = __webpack_require__(/*! ../internals/shared */ "./node_modules/core-js/internals/shared.js");

    module.exports = shared('native-function-to-string', Function.toString);


    /***/ }),

    /***/ "./node_modules/core-js/internals/get-iterator-method.js":
    /*!***************************************************************!*\
      !*** ./node_modules/core-js/internals/get-iterator-method.js ***!
      \***************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var classof = __webpack_require__(/*! ../internals/classof */ "./node_modules/core-js/internals/classof.js");
    var Iterators = __webpack_require__(/*! ../internals/iterators */ "./node_modules/core-js/internals/iterators.js");
    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");

    var ITERATOR = wellKnownSymbol('iterator');

    module.exports = function (it) {
      if (it != undefined) return it[ITERATOR]
        || it['@@iterator']
        || Iterators[classof(it)];
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/global.js":
    /*!**************************************************!*\
      !*** ./node_modules/core-js/internals/global.js ***!
      \**************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    /* WEBPACK VAR INJECTION */(function(global) {var O = 'object';
    var check = function (it) {
      return it && it.Math == Math && it;
    };

    // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
    module.exports =
      // eslint-disable-next-line no-undef
      check(typeof globalThis == O && globalThis) ||
      check(typeof window == O && window) ||
      check(typeof self == O && self) ||
      check(typeof global == O && global) ||
      // eslint-disable-next-line no-new-func
      Function('return this')();

    /* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")));

    /***/ }),

    /***/ "./node_modules/core-js/internals/has.js":
    /*!***********************************************!*\
      !*** ./node_modules/core-js/internals/has.js ***!
      \***********************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var hasOwnProperty = {}.hasOwnProperty;

    module.exports = function (it, key) {
      return hasOwnProperty.call(it, key);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/hidden-keys.js":
    /*!*******************************************************!*\
      !*** ./node_modules/core-js/internals/hidden-keys.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = {};


    /***/ }),

    /***/ "./node_modules/core-js/internals/hide.js":
    /*!************************************************!*\
      !*** ./node_modules/core-js/internals/hide.js ***!
      \************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var DESCRIPTORS = __webpack_require__(/*! ../internals/descriptors */ "./node_modules/core-js/internals/descriptors.js");
    var definePropertyModule = __webpack_require__(/*! ../internals/object-define-property */ "./node_modules/core-js/internals/object-define-property.js");
    var createPropertyDescriptor = __webpack_require__(/*! ../internals/create-property-descriptor */ "./node_modules/core-js/internals/create-property-descriptor.js");

    module.exports = DESCRIPTORS ? function (object, key, value) {
      return definePropertyModule.f(object, key, createPropertyDescriptor(1, value));
    } : function (object, key, value) {
      object[key] = value;
      return object;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/html.js":
    /*!************************************************!*\
      !*** ./node_modules/core-js/internals/html.js ***!
      \************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");

    var document = global.document;

    module.exports = document && document.documentElement;


    /***/ }),

    /***/ "./node_modules/core-js/internals/ie8-dom-define.js":
    /*!**********************************************************!*\
      !*** ./node_modules/core-js/internals/ie8-dom-define.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var DESCRIPTORS = __webpack_require__(/*! ../internals/descriptors */ "./node_modules/core-js/internals/descriptors.js");
    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");
    var createElement = __webpack_require__(/*! ../internals/document-create-element */ "./node_modules/core-js/internals/document-create-element.js");

    // Thank's IE8 for his funny defineProperty
    module.exports = !DESCRIPTORS && !fails(function () {
      return Object.defineProperty(createElement('div'), 'a', {
        get: function () { return 7; }
      }).a != 7;
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/indexed-object.js":
    /*!**********************************************************!*\
      !*** ./node_modules/core-js/internals/indexed-object.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    // fallback for non-array-like ES3 and non-enumerable old V8 strings
    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");
    var classof = __webpack_require__(/*! ../internals/classof-raw */ "./node_modules/core-js/internals/classof-raw.js");

    var split = ''.split;

    module.exports = fails(function () {
      // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
      // eslint-disable-next-line no-prototype-builtins
      return !Object('z').propertyIsEnumerable(0);
    }) ? function (it) {
      return classof(it) == 'String' ? split.call(it, '') : Object(it);
    } : Object;


    /***/ }),

    /***/ "./node_modules/core-js/internals/internal-state.js":
    /*!**********************************************************!*\
      !*** ./node_modules/core-js/internals/internal-state.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var NATIVE_WEAK_MAP = __webpack_require__(/*! ../internals/native-weak-map */ "./node_modules/core-js/internals/native-weak-map.js");
    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var isObject = __webpack_require__(/*! ../internals/is-object */ "./node_modules/core-js/internals/is-object.js");
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");
    var objectHas = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var sharedKey = __webpack_require__(/*! ../internals/shared-key */ "./node_modules/core-js/internals/shared-key.js");
    var hiddenKeys = __webpack_require__(/*! ../internals/hidden-keys */ "./node_modules/core-js/internals/hidden-keys.js");

    var WeakMap = global.WeakMap;
    var set, get, has;

    var enforce = function (it) {
      return has(it) ? get(it) : set(it, {});
    };

    var getterFor = function (TYPE) {
      return function (it) {
        var state;
        if (!isObject(it) || (state = get(it)).type !== TYPE) {
          throw TypeError('Incompatible receiver, ' + TYPE + ' required');
        } return state;
      };
    };

    if (NATIVE_WEAK_MAP) {
      var store = new WeakMap();
      var wmget = store.get;
      var wmhas = store.has;
      var wmset = store.set;
      set = function (it, metadata) {
        wmset.call(store, it, metadata);
        return metadata;
      };
      get = function (it) {
        return wmget.call(store, it) || {};
      };
      has = function (it) {
        return wmhas.call(store, it);
      };
    } else {
      var STATE = sharedKey('state');
      hiddenKeys[STATE] = true;
      set = function (it, metadata) {
        hide(it, STATE, metadata);
        return metadata;
      };
      get = function (it) {
        return objectHas(it, STATE) ? it[STATE] : {};
      };
      has = function (it) {
        return objectHas(it, STATE);
      };
    }

    module.exports = {
      set: set,
      get: get,
      has: has,
      enforce: enforce,
      getterFor: getterFor
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/is-array-iterator-method.js":
    /*!********************************************************************!*\
      !*** ./node_modules/core-js/internals/is-array-iterator-method.js ***!
      \********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");
    var Iterators = __webpack_require__(/*! ../internals/iterators */ "./node_modules/core-js/internals/iterators.js");

    var ITERATOR = wellKnownSymbol('iterator');
    var ArrayPrototype = Array.prototype;

    // check on default Array iterator
    module.exports = function (it) {
      return it !== undefined && (Iterators.Array === it || ArrayPrototype[ITERATOR] === it);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/is-forced.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/is-forced.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");

    var replacement = /#|\.prototype\./;

    var isForced = function (feature, detection) {
      var value = data[normalize(feature)];
      return value == POLYFILL ? true
        : value == NATIVE ? false
        : typeof detection == 'function' ? fails(detection)
        : !!detection;
    };

    var normalize = isForced.normalize = function (string) {
      return String(string).replace(replacement, '.').toLowerCase();
    };

    var data = isForced.data = {};
    var NATIVE = isForced.NATIVE = 'N';
    var POLYFILL = isForced.POLYFILL = 'P';

    module.exports = isForced;


    /***/ }),

    /***/ "./node_modules/core-js/internals/is-object.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/is-object.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = function (it) {
      return typeof it === 'object' ? it !== null : typeof it === 'function';
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/is-pure.js":
    /*!***************************************************!*\
      !*** ./node_modules/core-js/internals/is-pure.js ***!
      \***************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = false;


    /***/ }),

    /***/ "./node_modules/core-js/internals/iterators-core.js":
    /*!**********************************************************!*\
      !*** ./node_modules/core-js/internals/iterators-core.js ***!
      \**********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var getPrototypeOf = __webpack_require__(/*! ../internals/object-get-prototype-of */ "./node_modules/core-js/internals/object-get-prototype-of.js");
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");
    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");
    var IS_PURE = __webpack_require__(/*! ../internals/is-pure */ "./node_modules/core-js/internals/is-pure.js");

    var ITERATOR = wellKnownSymbol('iterator');
    var BUGGY_SAFARI_ITERATORS = false;

    var returnThis = function () { return this; };

    // `%IteratorPrototype%` object
    // https://tc39.github.io/ecma262/#sec-%iteratorprototype%-object
    var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

    if ([].keys) {
      arrayIterator = [].keys();
      // Safari 8 has buggy iterators w/o `next`
      if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
      else {
        PrototypeOfArrayIteratorPrototype = getPrototypeOf(getPrototypeOf(arrayIterator));
        if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
      }
    }

    if (IteratorPrototype == undefined) IteratorPrototype = {};

    // 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
    if (!IS_PURE && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);

    module.exports = {
      IteratorPrototype: IteratorPrototype,
      BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/iterators.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/iterators.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    module.exports = {};


    /***/ }),

    /***/ "./node_modules/core-js/internals/native-symbol.js":
    /*!*********************************************************!*\
      !*** ./node_modules/core-js/internals/native-symbol.js ***!
      \*********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var fails = __webpack_require__(/*! ../internals/fails */ "./node_modules/core-js/internals/fails.js");

    module.exports = !!Object.getOwnPropertySymbols && !fails(function () {
      // Chrome 38 Symbol has incorrect toString conversion
      // eslint-disable-next-line no-undef
      return !String(Symbol());
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/native-weak-map.js":
    /*!***********************************************************!*\
      !*** ./node_modules/core-js/internals/native-weak-map.js ***!
      \***********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var nativeFunctionToString = __webpack_require__(/*! ../internals/function-to-string */ "./node_modules/core-js/internals/function-to-string.js");

    var WeakMap = global.WeakMap;

    module.exports = typeof WeakMap === 'function' && /native code/.test(nativeFunctionToString.call(WeakMap));


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-create.js":
    /*!*********************************************************!*\
      !*** ./node_modules/core-js/internals/object-create.js ***!
      \*********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");
    var defineProperties = __webpack_require__(/*! ../internals/object-define-properties */ "./node_modules/core-js/internals/object-define-properties.js");
    var enumBugKeys = __webpack_require__(/*! ../internals/enum-bug-keys */ "./node_modules/core-js/internals/enum-bug-keys.js");
    var hiddenKeys = __webpack_require__(/*! ../internals/hidden-keys */ "./node_modules/core-js/internals/hidden-keys.js");
    var html = __webpack_require__(/*! ../internals/html */ "./node_modules/core-js/internals/html.js");
    var documentCreateElement = __webpack_require__(/*! ../internals/document-create-element */ "./node_modules/core-js/internals/document-create-element.js");
    var sharedKey = __webpack_require__(/*! ../internals/shared-key */ "./node_modules/core-js/internals/shared-key.js");
    var IE_PROTO = sharedKey('IE_PROTO');

    var PROTOTYPE = 'prototype';
    var Empty = function () { /* empty */ };

    // Create object with fake `null` prototype: use iframe Object with cleared prototype
    var createDict = function () {
      // Thrash, waste and sodomy: IE GC bug
      var iframe = documentCreateElement('iframe');
      var length = enumBugKeys.length;
      var lt = '<';
      var script = 'script';
      var gt = '>';
      var js = 'java' + script + ':';
      var iframeDocument;
      iframe.style.display = 'none';
      html.appendChild(iframe);
      iframe.src = String(js);
      iframeDocument = iframe.contentWindow.document;
      iframeDocument.open();
      iframeDocument.write(lt + script + gt + 'document.F=Object' + lt + '/' + script + gt);
      iframeDocument.close();
      createDict = iframeDocument.F;
      while (length--) delete createDict[PROTOTYPE][enumBugKeys[length]];
      return createDict();
    };

    // 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
    module.exports = Object.create || function create(O, Properties) {
      var result;
      if (O !== null) {
        Empty[PROTOTYPE] = anObject(O);
        result = new Empty();
        Empty[PROTOTYPE] = null;
        // add "__proto__" for Object.getPrototypeOf polyfill
        result[IE_PROTO] = O;
      } else result = createDict();
      return Properties === undefined ? result : defineProperties(result, Properties);
    };

    hiddenKeys[IE_PROTO] = true;


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-define-properties.js":
    /*!********************************************************************!*\
      !*** ./node_modules/core-js/internals/object-define-properties.js ***!
      \********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var DESCRIPTORS = __webpack_require__(/*! ../internals/descriptors */ "./node_modules/core-js/internals/descriptors.js");
    var definePropertyModule = __webpack_require__(/*! ../internals/object-define-property */ "./node_modules/core-js/internals/object-define-property.js");
    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");
    var objectKeys = __webpack_require__(/*! ../internals/object-keys */ "./node_modules/core-js/internals/object-keys.js");

    module.exports = DESCRIPTORS ? Object.defineProperties : function defineProperties(O, Properties) {
      anObject(O);
      var keys = objectKeys(Properties);
      var length = keys.length;
      var i = 0;
      var key;
      while (length > i) definePropertyModule.f(O, key = keys[i++], Properties[key]);
      return O;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-define-property.js":
    /*!******************************************************************!*\
      !*** ./node_modules/core-js/internals/object-define-property.js ***!
      \******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var DESCRIPTORS = __webpack_require__(/*! ../internals/descriptors */ "./node_modules/core-js/internals/descriptors.js");
    var IE8_DOM_DEFINE = __webpack_require__(/*! ../internals/ie8-dom-define */ "./node_modules/core-js/internals/ie8-dom-define.js");
    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");
    var toPrimitive = __webpack_require__(/*! ../internals/to-primitive */ "./node_modules/core-js/internals/to-primitive.js");

    var nativeDefineProperty = Object.defineProperty;

    exports.f = DESCRIPTORS ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
      anObject(O);
      P = toPrimitive(P, true);
      anObject(Attributes);
      if (IE8_DOM_DEFINE) try {
        return nativeDefineProperty(O, P, Attributes);
      } catch (error) { /* empty */ }
      if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
      if ('value' in Attributes) O[P] = Attributes.value;
      return O;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-get-own-property-descriptor.js":
    /*!******************************************************************************!*\
      !*** ./node_modules/core-js/internals/object-get-own-property-descriptor.js ***!
      \******************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var DESCRIPTORS = __webpack_require__(/*! ../internals/descriptors */ "./node_modules/core-js/internals/descriptors.js");
    var propertyIsEnumerableModule = __webpack_require__(/*! ../internals/object-property-is-enumerable */ "./node_modules/core-js/internals/object-property-is-enumerable.js");
    var createPropertyDescriptor = __webpack_require__(/*! ../internals/create-property-descriptor */ "./node_modules/core-js/internals/create-property-descriptor.js");
    var toIndexedObject = __webpack_require__(/*! ../internals/to-indexed-object */ "./node_modules/core-js/internals/to-indexed-object.js");
    var toPrimitive = __webpack_require__(/*! ../internals/to-primitive */ "./node_modules/core-js/internals/to-primitive.js");
    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var IE8_DOM_DEFINE = __webpack_require__(/*! ../internals/ie8-dom-define */ "./node_modules/core-js/internals/ie8-dom-define.js");

    var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    exports.f = DESCRIPTORS ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
      O = toIndexedObject(O);
      P = toPrimitive(P, true);
      if (IE8_DOM_DEFINE) try {
        return nativeGetOwnPropertyDescriptor(O, P);
      } catch (error) { /* empty */ }
      if (has(O, P)) return createPropertyDescriptor(!propertyIsEnumerableModule.f.call(O, P), O[P]);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-get-own-property-names.js":
    /*!*************************************************************************!*\
      !*** ./node_modules/core-js/internals/object-get-own-property-names.js ***!
      \*************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    // 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
    var internalObjectKeys = __webpack_require__(/*! ../internals/object-keys-internal */ "./node_modules/core-js/internals/object-keys-internal.js");
    var enumBugKeys = __webpack_require__(/*! ../internals/enum-bug-keys */ "./node_modules/core-js/internals/enum-bug-keys.js");

    var hiddenKeys = enumBugKeys.concat('length', 'prototype');

    exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
      return internalObjectKeys(O, hiddenKeys);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-get-own-property-symbols.js":
    /*!***************************************************************************!*\
      !*** ./node_modules/core-js/internals/object-get-own-property-symbols.js ***!
      \***************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    exports.f = Object.getOwnPropertySymbols;


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-get-prototype-of.js":
    /*!*******************************************************************!*\
      !*** ./node_modules/core-js/internals/object-get-prototype-of.js ***!
      \*******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var toObject = __webpack_require__(/*! ../internals/to-object */ "./node_modules/core-js/internals/to-object.js");
    var sharedKey = __webpack_require__(/*! ../internals/shared-key */ "./node_modules/core-js/internals/shared-key.js");
    var CORRECT_PROTOTYPE_GETTER = __webpack_require__(/*! ../internals/correct-prototype-getter */ "./node_modules/core-js/internals/correct-prototype-getter.js");

    var IE_PROTO = sharedKey('IE_PROTO');
    var ObjectPrototype = Object.prototype;

    // 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
    module.exports = CORRECT_PROTOTYPE_GETTER ? Object.getPrototypeOf : function (O) {
      O = toObject(O);
      if (has(O, IE_PROTO)) return O[IE_PROTO];
      if (typeof O.constructor == 'function' && O instanceof O.constructor) {
        return O.constructor.prototype;
      } return O instanceof Object ? ObjectPrototype : null;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-keys-internal.js":
    /*!****************************************************************!*\
      !*** ./node_modules/core-js/internals/object-keys-internal.js ***!
      \****************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var toIndexedObject = __webpack_require__(/*! ../internals/to-indexed-object */ "./node_modules/core-js/internals/to-indexed-object.js");
    var arrayIncludes = __webpack_require__(/*! ../internals/array-includes */ "./node_modules/core-js/internals/array-includes.js");
    var hiddenKeys = __webpack_require__(/*! ../internals/hidden-keys */ "./node_modules/core-js/internals/hidden-keys.js");

    var arrayIndexOf = arrayIncludes(false);

    module.exports = function (object, names) {
      var O = toIndexedObject(object);
      var i = 0;
      var result = [];
      var key;
      for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
      // Don't enum bug & hidden keys
      while (names.length > i) if (has(O, key = names[i++])) {
        ~arrayIndexOf(result, key) || result.push(key);
      }
      return result;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-keys.js":
    /*!*******************************************************!*\
      !*** ./node_modules/core-js/internals/object-keys.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var internalObjectKeys = __webpack_require__(/*! ../internals/object-keys-internal */ "./node_modules/core-js/internals/object-keys-internal.js");
    var enumBugKeys = __webpack_require__(/*! ../internals/enum-bug-keys */ "./node_modules/core-js/internals/enum-bug-keys.js");

    // 19.1.2.14 / 15.2.3.14 Object.keys(O)
    module.exports = Object.keys || function keys(O) {
      return internalObjectKeys(O, enumBugKeys);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-property-is-enumerable.js":
    /*!*************************************************************************!*\
      !*** ./node_modules/core-js/internals/object-property-is-enumerable.js ***!
      \*************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

    // Nashorn ~ JDK8 bug
    var NASHORN_BUG = getOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

    exports.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
      var descriptor = getOwnPropertyDescriptor(this, V);
      return !!descriptor && descriptor.enumerable;
    } : nativePropertyIsEnumerable;


    /***/ }),

    /***/ "./node_modules/core-js/internals/object-set-prototype-of.js":
    /*!*******************************************************************!*\
      !*** ./node_modules/core-js/internals/object-set-prototype-of.js ***!
      \*******************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var validateSetPrototypeOfArguments = __webpack_require__(/*! ../internals/validate-set-prototype-of-arguments */ "./node_modules/core-js/internals/validate-set-prototype-of-arguments.js");

    // Works with __proto__ only. Old v8 can't work with null proto objects.
    /* eslint-disable no-proto */
    module.exports = Object.setPrototypeOf || ('__proto__' in {} ? function () {
      var correctSetter = false;
      var test = {};
      var setter;
      try {
        setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
        setter.call(test, []);
        correctSetter = test instanceof Array;
      } catch (error) { /* empty */ }
      return function setPrototypeOf(O, proto) {
        validateSetPrototypeOfArguments(O, proto);
        if (correctSetter) setter.call(O, proto);
        else O.__proto__ = proto;
        return O;
      };
    }() : undefined);


    /***/ }),

    /***/ "./node_modules/core-js/internals/own-keys.js":
    /*!****************************************************!*\
      !*** ./node_modules/core-js/internals/own-keys.js ***!
      \****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var getOwnPropertyNamesModule = __webpack_require__(/*! ../internals/object-get-own-property-names */ "./node_modules/core-js/internals/object-get-own-property-names.js");
    var getOwnPropertySymbolsModule = __webpack_require__(/*! ../internals/object-get-own-property-symbols */ "./node_modules/core-js/internals/object-get-own-property-symbols.js");
    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");

    var Reflect = global.Reflect;

    // all object keys, includes non-enumerable and symbols
    module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
      var keys = getOwnPropertyNamesModule.f(anObject(it));
      var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
      return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/path.js":
    /*!************************************************!*\
      !*** ./node_modules/core-js/internals/path.js ***!
      \************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    module.exports = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");


    /***/ }),

    /***/ "./node_modules/core-js/internals/redefine.js":
    /*!****************************************************!*\
      !*** ./node_modules/core-js/internals/redefine.js ***!
      \****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var shared = __webpack_require__(/*! ../internals/shared */ "./node_modules/core-js/internals/shared.js");
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");
    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var setGlobal = __webpack_require__(/*! ../internals/set-global */ "./node_modules/core-js/internals/set-global.js");
    var nativeFunctionToString = __webpack_require__(/*! ../internals/function-to-string */ "./node_modules/core-js/internals/function-to-string.js");
    var InternalStateModule = __webpack_require__(/*! ../internals/internal-state */ "./node_modules/core-js/internals/internal-state.js");

    var getInternalState = InternalStateModule.get;
    var enforceInternalState = InternalStateModule.enforce;
    var TEMPLATE = String(nativeFunctionToString).split('toString');

    shared('inspectSource', function (it) {
      return nativeFunctionToString.call(it);
    });

    (module.exports = function (O, key, value, options) {
      var unsafe = options ? !!options.unsafe : false;
      var simple = options ? !!options.enumerable : false;
      var noTargetGet = options ? !!options.noTargetGet : false;
      if (typeof value == 'function') {
        if (typeof key == 'string' && !has(value, 'name')) hide(value, 'name', key);
        enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
      }
      if (O === global) {
        if (simple) O[key] = value;
        else setGlobal(key, value);
        return;
      } else if (!unsafe) {
        delete O[key];
      } else if (!noTargetGet && O[key]) {
        simple = true;
      }
      if (simple) O[key] = value;
      else hide(O, key, value);
    // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
    })(Function.prototype, 'toString', function toString() {
      return typeof this == 'function' && getInternalState(this).source || nativeFunctionToString.call(this);
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/require-object-coercible.js":
    /*!********************************************************************!*\
      !*** ./node_modules/core-js/internals/require-object-coercible.js ***!
      \********************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    // `RequireObjectCoercible` abstract operation
    // https://tc39.github.io/ecma262/#sec-requireobjectcoercible
    module.exports = function (it) {
      if (it == undefined) throw TypeError("Can't call method on " + it);
      return it;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/set-global.js":
    /*!******************************************************!*\
      !*** ./node_modules/core-js/internals/set-global.js ***!
      \******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var hide = __webpack_require__(/*! ../internals/hide */ "./node_modules/core-js/internals/hide.js");

    module.exports = function (key, value) {
      try {
        hide(global, key, value);
      } catch (error) {
        global[key] = value;
      } return value;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/set-to-string-tag.js":
    /*!*************************************************************!*\
      !*** ./node_modules/core-js/internals/set-to-string-tag.js ***!
      \*************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var defineProperty = __webpack_require__(/*! ../internals/object-define-property */ "./node_modules/core-js/internals/object-define-property.js").f;
    var has = __webpack_require__(/*! ../internals/has */ "./node_modules/core-js/internals/has.js");
    var wellKnownSymbol = __webpack_require__(/*! ../internals/well-known-symbol */ "./node_modules/core-js/internals/well-known-symbol.js");

    var TO_STRING_TAG = wellKnownSymbol('toStringTag');

    module.exports = function (it, TAG, STATIC) {
      if (it && !has(it = STATIC ? it : it.prototype, TO_STRING_TAG)) {
        defineProperty(it, TO_STRING_TAG, { configurable: true, value: TAG });
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/shared-key.js":
    /*!******************************************************!*\
      !*** ./node_modules/core-js/internals/shared-key.js ***!
      \******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var shared = __webpack_require__(/*! ../internals/shared */ "./node_modules/core-js/internals/shared.js");
    var uid = __webpack_require__(/*! ../internals/uid */ "./node_modules/core-js/internals/uid.js");

    var keys = shared('keys');

    module.exports = function (key) {
      return keys[key] || (keys[key] = uid(key));
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/shared.js":
    /*!**************************************************!*\
      !*** ./node_modules/core-js/internals/shared.js ***!
      \**************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var setGlobal = __webpack_require__(/*! ../internals/set-global */ "./node_modules/core-js/internals/set-global.js");
    var IS_PURE = __webpack_require__(/*! ../internals/is-pure */ "./node_modules/core-js/internals/is-pure.js");

    var SHARED = '__core-js_shared__';
    var store = global[SHARED] || setGlobal(SHARED, {});

    (module.exports = function (key, value) {
      return store[key] || (store[key] = value !== undefined ? value : {});
    })('versions', []).push({
      version: '3.1.3',
      mode: IS_PURE ? 'pure' : 'global',
      copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
    });


    /***/ }),

    /***/ "./node_modules/core-js/internals/string-at.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/string-at.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var toInteger = __webpack_require__(/*! ../internals/to-integer */ "./node_modules/core-js/internals/to-integer.js");
    var requireObjectCoercible = __webpack_require__(/*! ../internals/require-object-coercible */ "./node_modules/core-js/internals/require-object-coercible.js");

    // CONVERT_TO_STRING: true  -> String#at
    // CONVERT_TO_STRING: false -> String#codePointAt
    module.exports = function (that, pos, CONVERT_TO_STRING) {
      var S = String(requireObjectCoercible(that));
      var position = toInteger(pos);
      var size = S.length;
      var first, second;
      if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
      first = S.charCodeAt(position);
      return first < 0xD800 || first > 0xDBFF || position + 1 === size
        || (second = S.charCodeAt(position + 1)) < 0xDC00 || second > 0xDFFF
          ? CONVERT_TO_STRING ? S.charAt(position) : first
          : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-absolute-index.js":
    /*!*************************************************************!*\
      !*** ./node_modules/core-js/internals/to-absolute-index.js ***!
      \*************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var toInteger = __webpack_require__(/*! ../internals/to-integer */ "./node_modules/core-js/internals/to-integer.js");

    var max = Math.max;
    var min = Math.min;

    // Helper for a popular repeating case of the spec:
    // Let integer be ? ToInteger(index).
    // If integer < 0, let result be max((length + integer), 0); else let result be min(length, length).
    module.exports = function (index, length) {
      var integer = toInteger(index);
      return integer < 0 ? max(integer + length, 0) : min(integer, length);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-indexed-object.js":
    /*!*************************************************************!*\
      !*** ./node_modules/core-js/internals/to-indexed-object.js ***!
      \*************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    // toObject with fallback for non-array-like ES3 strings
    var IndexedObject = __webpack_require__(/*! ../internals/indexed-object */ "./node_modules/core-js/internals/indexed-object.js");
    var requireObjectCoercible = __webpack_require__(/*! ../internals/require-object-coercible */ "./node_modules/core-js/internals/require-object-coercible.js");

    module.exports = function (it) {
      return IndexedObject(requireObjectCoercible(it));
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-integer.js":
    /*!******************************************************!*\
      !*** ./node_modules/core-js/internals/to-integer.js ***!
      \******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var ceil = Math.ceil;
    var floor = Math.floor;

    // `ToInteger` abstract operation
    // https://tc39.github.io/ecma262/#sec-tointeger
    module.exports = function (argument) {
      return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-length.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/to-length.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var toInteger = __webpack_require__(/*! ../internals/to-integer */ "./node_modules/core-js/internals/to-integer.js");

    var min = Math.min;

    // `ToLength` abstract operation
    // https://tc39.github.io/ecma262/#sec-tolength
    module.exports = function (argument) {
      return argument > 0 ? min(toInteger(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-object.js":
    /*!*****************************************************!*\
      !*** ./node_modules/core-js/internals/to-object.js ***!
      \*****************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var requireObjectCoercible = __webpack_require__(/*! ../internals/require-object-coercible */ "./node_modules/core-js/internals/require-object-coercible.js");

    // `ToObject` abstract operation
    // https://tc39.github.io/ecma262/#sec-toobject
    module.exports = function (argument) {
      return Object(requireObjectCoercible(argument));
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/to-primitive.js":
    /*!********************************************************!*\
      !*** ./node_modules/core-js/internals/to-primitive.js ***!
      \********************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var isObject = __webpack_require__(/*! ../internals/is-object */ "./node_modules/core-js/internals/is-object.js");

    // 7.1.1 ToPrimitive(input [, PreferredType])
    // instead of the ES6 spec version, we didn't implement @@toPrimitive case
    // and the second argument - flag - preferred type is a string
    module.exports = function (it, S) {
      if (!isObject(it)) return it;
      var fn, val;
      if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
      if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
      if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
      throw TypeError("Can't convert object to primitive value");
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/uid.js":
    /*!***********************************************!*\
      !*** ./node_modules/core-js/internals/uid.js ***!
      \***********************************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var id = 0;
    var postfix = Math.random();

    module.exports = function (key) {
      return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + postfix).toString(36));
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/validate-set-prototype-of-arguments.js":
    /*!*******************************************************************************!*\
      !*** ./node_modules/core-js/internals/validate-set-prototype-of-arguments.js ***!
      \*******************************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var isObject = __webpack_require__(/*! ../internals/is-object */ "./node_modules/core-js/internals/is-object.js");
    var anObject = __webpack_require__(/*! ../internals/an-object */ "./node_modules/core-js/internals/an-object.js");

    module.exports = function (O, proto) {
      anObject(O);
      if (!isObject(proto) && proto !== null) {
        throw TypeError("Can't set " + String(proto) + ' as a prototype');
      }
    };


    /***/ }),

    /***/ "./node_modules/core-js/internals/well-known-symbol.js":
    /*!*************************************************************!*\
      !*** ./node_modules/core-js/internals/well-known-symbol.js ***!
      \*************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var global = __webpack_require__(/*! ../internals/global */ "./node_modules/core-js/internals/global.js");
    var shared = __webpack_require__(/*! ../internals/shared */ "./node_modules/core-js/internals/shared.js");
    var uid = __webpack_require__(/*! ../internals/uid */ "./node_modules/core-js/internals/uid.js");
    var NATIVE_SYMBOL = __webpack_require__(/*! ../internals/native-symbol */ "./node_modules/core-js/internals/native-symbol.js");

    var Symbol = global.Symbol;
    var store = shared('wks');

    module.exports = function (name) {
      return store[name] || (store[name] = NATIVE_SYMBOL && Symbol[name]
        || (NATIVE_SYMBOL ? Symbol : uid)('Symbol.' + name));
    };


    /***/ }),

    /***/ "./node_modules/core-js/modules/es.array.from.js":
    /*!*******************************************************!*\
      !*** ./node_modules/core-js/modules/es.array.from.js ***!
      \*******************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var $ = __webpack_require__(/*! ../internals/export */ "./node_modules/core-js/internals/export.js");
    var from = __webpack_require__(/*! ../internals/array-from */ "./node_modules/core-js/internals/array-from.js");
    var checkCorrectnessOfIteration = __webpack_require__(/*! ../internals/check-correctness-of-iteration */ "./node_modules/core-js/internals/check-correctness-of-iteration.js");

    var INCORRECT_ITERATION = !checkCorrectnessOfIteration(function (iterable) {
    });

    // `Array.from` method
    // https://tc39.github.io/ecma262/#sec-array.from
    $({ target: 'Array', stat: true, forced: INCORRECT_ITERATION }, {
      from: from
    });


    /***/ }),

    /***/ "./node_modules/core-js/modules/es.string.iterator.js":
    /*!************************************************************!*\
      !*** ./node_modules/core-js/modules/es.string.iterator.js ***!
      \************************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    var codePointAt = __webpack_require__(/*! ../internals/string-at */ "./node_modules/core-js/internals/string-at.js");
    var InternalStateModule = __webpack_require__(/*! ../internals/internal-state */ "./node_modules/core-js/internals/internal-state.js");
    var defineIterator = __webpack_require__(/*! ../internals/define-iterator */ "./node_modules/core-js/internals/define-iterator.js");

    var STRING_ITERATOR = 'String Iterator';
    var setInternalState = InternalStateModule.set;
    var getInternalState = InternalStateModule.getterFor(STRING_ITERATOR);

    // `String.prototype[@@iterator]` method
    // https://tc39.github.io/ecma262/#sec-string.prototype-@@iterator
    defineIterator(String, 'String', function (iterated) {
      setInternalState(this, {
        type: STRING_ITERATOR,
        string: String(iterated),
        index: 0
      });
    // `%StringIteratorPrototype%.next` method
    // https://tc39.github.io/ecma262/#sec-%stringiteratorprototype%.next
    }, function next() {
      var state = getInternalState(this);
      var string = state.string;
      var index = state.index;
      var point;
      if (index >= string.length) return { value: undefined, done: true };
      point = codePointAt(string, index, true);
      state.index += point.length;
      return { value: point, done: false };
    });


    /***/ }),

    /***/ "./node_modules/webpack/buildin/global.js":
    /*!***********************************!*\
      !*** (webpack)/buildin/global.js ***!
      \***********************************/
    /*! no static exports found */
    /***/ (function(module, exports) {

    var g;

    // This works in non-strict mode
    g = (function() {
    	return this;
    })();

    try {
    	// This works if eval is allowed (see CSP)
    	g = g || Function("return this")() || (1, eval)("this");
    } catch (e) {
    	// This works if the window reference is available
    	if (typeof window === "object") g = window;
    }

    // g can still be undefined, but nothing to do about it...
    // We return undefined, instead of nothing here, so it's
    // easier to handle this case. if(!global) { ...}

    module.exports = g;


    /***/ }),

    /***/ "./src/default-attrs.json":
    /*!********************************!*\
      !*** ./src/default-attrs.json ***!
      \********************************/
    /*! exports provided: xmlns, width, height, viewBox, fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, default */
    /***/ (function(module) {

    module.exports = {"xmlns":"http://www.w3.org/2000/svg","width":24,"height":24,"viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};

    /***/ }),

    /***/ "./src/icon.js":
    /*!*********************!*\
      !*** ./src/icon.js ***!
      \*********************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _dedupe = __webpack_require__(/*! classnames/dedupe */ "./node_modules/classnames/dedupe.js");

    var _dedupe2 = _interopRequireDefault(_dedupe);

    var _defaultAttrs = __webpack_require__(/*! ./default-attrs.json */ "./src/default-attrs.json");

    var _defaultAttrs2 = _interopRequireDefault(_defaultAttrs);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Icon = function () {
      function Icon(name, contents) {
        var tags = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

        _classCallCheck(this, Icon);

        this.name = name;
        this.contents = contents;
        this.tags = tags;
        this.attrs = _extends({}, _defaultAttrs2.default, { class: 'feather feather-' + name });
      }

      /**
       * Create an SVG string.
       * @param {Object} attrs
       * @returns {string}
       */


      _createClass(Icon, [{
        key: 'toSvg',
        value: function toSvg() {
          var attrs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var combinedAttrs = _extends({}, this.attrs, attrs, { class: (0, _dedupe2.default)(this.attrs.class, attrs.class) });

          return '<svg ' + attrsToString(combinedAttrs) + '>' + this.contents + '</svg>';
        }

        /**
         * Return string representation of an `Icon`.
         *
         * Added for backward compatibility. If old code expects `feather.icons.<name>`
         * to be a string, `toString()` will get implicitly called.
         *
         * @returns {string}
         */

      }, {
        key: 'toString',
        value: function toString() {
          return this.contents;
        }
      }]);

      return Icon;
    }();

    /**
     * Convert attributes object to string of HTML attributes.
     * @param {Object} attrs
     * @returns {string}
     */


    function attrsToString(attrs) {
      return Object.keys(attrs).map(function (key) {
        return key + '="' + attrs[key] + '"';
      }).join(' ');
    }

    exports.default = Icon;

    /***/ }),

    /***/ "./src/icons.js":
    /*!**********************!*\
      !*** ./src/icons.js ***!
      \**********************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _icon = __webpack_require__(/*! ./icon */ "./src/icon.js");

    var _icon2 = _interopRequireDefault(_icon);

    var _icons = __webpack_require__(/*! ../dist/icons.json */ "./dist/icons.json");

    var _icons2 = _interopRequireDefault(_icons);

    var _tags = __webpack_require__(/*! ./tags.json */ "./src/tags.json");

    var _tags2 = _interopRequireDefault(_tags);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    exports.default = Object.keys(_icons2.default).map(function (key) {
      return new _icon2.default(key, _icons2.default[key], _tags2.default[key]);
    }).reduce(function (object, icon) {
      object[icon.name] = icon;
      return object;
    }, {});

    /***/ }),

    /***/ "./src/index.js":
    /*!**********************!*\
      !*** ./src/index.js ***!
      \**********************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    var _icons = __webpack_require__(/*! ./icons */ "./src/icons.js");

    var _icons2 = _interopRequireDefault(_icons);

    var _toSvg = __webpack_require__(/*! ./to-svg */ "./src/to-svg.js");

    var _toSvg2 = _interopRequireDefault(_toSvg);

    var _replace = __webpack_require__(/*! ./replace */ "./src/replace.js");

    var _replace2 = _interopRequireDefault(_replace);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    module.exports = { icons: _icons2.default, toSvg: _toSvg2.default, replace: _replace2.default };

    /***/ }),

    /***/ "./src/replace.js":
    /*!************************!*\
      !*** ./src/replace.js ***!
      \************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /* eslint-env browser */


    var _dedupe = __webpack_require__(/*! classnames/dedupe */ "./node_modules/classnames/dedupe.js");

    var _dedupe2 = _interopRequireDefault(_dedupe);

    var _icons = __webpack_require__(/*! ./icons */ "./src/icons.js");

    var _icons2 = _interopRequireDefault(_icons);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Replace all HTML elements that have a `data-feather` attribute with SVG markup
     * corresponding to the element's `data-feather` attribute value.
     * @param {Object} attrs
     */
    function replace() {
      var attrs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (typeof document === 'undefined') {
        throw new Error('`feather.replace()` only works in a browser environment.');
      }

      var elementsToReplace = document.querySelectorAll('[data-feather]');

      Array.from(elementsToReplace).forEach(function (element) {
        return replaceElement(element, attrs);
      });
    }

    /**
     * Replace a single HTML element with SVG markup
     * corresponding to the element's `data-feather` attribute value.
     * @param {HTMLElement} element
     * @param {Object} attrs
     */
    function replaceElement(element) {
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var elementAttrs = getAttrs(element);
      var name = elementAttrs['data-feather'];
      delete elementAttrs['data-feather'];

      var svgString = _icons2.default[name].toSvg(_extends({}, attrs, elementAttrs, { class: (0, _dedupe2.default)(attrs.class, elementAttrs.class) }));
      var svgDocument = new DOMParser().parseFromString(svgString, 'image/svg+xml');
      var svgElement = svgDocument.querySelector('svg');

      element.parentNode.replaceChild(svgElement, element);
    }

    /**
     * Get the attributes of an HTML element.
     * @param {HTMLElement} element
     * @returns {Object}
     */
    function getAttrs(element) {
      return Array.from(element.attributes).reduce(function (attrs, attr) {
        attrs[attr.name] = attr.value;
        return attrs;
      }, {});
    }

    exports.default = replace;

    /***/ }),

    /***/ "./src/tags.json":
    /*!***********************!*\
      !*** ./src/tags.json ***!
      \***********************/
    /*! exports provided: activity, airplay, alert-circle, alert-octagon, alert-triangle, at-sign, award, aperture, bell, bell-off, bluetooth, book-open, book, bookmark, briefcase, clipboard, clock, cloud-drizzle, cloud-lightning, cloud-rain, cloud-snow, cloud, codepen, codesandbox, coffee, command, compass, copy, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, credit-card, crop, crosshair, database, delete, disc, dollar-sign, droplet, edit, edit-2, edit-3, eye, eye-off, external-link, facebook, fast-forward, figma, film, folder-minus, folder-plus, folder, framer, frown, gift, git-branch, git-commit, git-merge, git-pull-request, github, gitlab, global, hard-drive, hash, headphones, heart, help-circle, hexagon, home, image, inbox, instagram, key, life-bouy, linkedin, lock, log-in, log-out, mail, map-pin, map, maximize, maximize-2, meh, menu, message-circle, message-square, mic-off, mic, minimize, minimize-2, monitor, moon, more-horizontal, more-vertical, mouse-pointer, move, navigation, navigation-2, octagon, package, paperclip, pause, pause-circle, pen-tool, play, play-circle, plus, plus-circle, plus-square, pocket, power, radio, rewind, rss, save, search, send, settings, shield, shield-off, shopping-bag, shopping-cart, shuffle, skip-back, skip-forward, slash, sliders, smile, speaker, star, sun, sunrise, sunset, tag, target, terminal, thumbs-down, thumbs-up, toggle-left, toggle-right, trash, trash-2, triangle, truck, twitter, umbrella, video-off, video, voicemail, volume, volume-1, volume-2, volume-x, watch, wind, x-circle, x-octagon, x-square, x, youtube, zap-off, zap, default */
    /***/ (function(module) {

    module.exports = {"activity":["pulse","health","action","motion"],"airplay":["stream","cast","mirroring"],"alert-circle":["warning"],"alert-octagon":["warning"],"alert-triangle":["warning"],"at-sign":["mention"],"award":["achievement","badge"],"aperture":["camera","photo"],"bell":["alarm","notification"],"bell-off":["alarm","notification","silent"],"bluetooth":["wireless"],"book-open":["read"],"book":["read","dictionary","booklet","magazine"],"bookmark":["read","clip","marker","tag"],"briefcase":["work","bag","baggage","folder"],"clipboard":["copy"],"clock":["time","watch","alarm"],"cloud-drizzle":["weather","shower"],"cloud-lightning":["weather","bolt"],"cloud-rain":["weather"],"cloud-snow":["weather","blizzard"],"cloud":["weather"],"codepen":["logo"],"codesandbox":["logo"],"coffee":["drink","cup","mug","tea","cafe","hot","beverage"],"command":["keyboard","cmd"],"compass":["navigation","safari","travel"],"copy":["clone","duplicate"],"corner-down-left":["arrow"],"corner-down-right":["arrow"],"corner-left-down":["arrow"],"corner-left-up":["arrow"],"corner-right-down":["arrow"],"corner-right-up":["arrow"],"corner-up-left":["arrow"],"corner-up-right":["arrow"],"credit-card":["purchase","payment","cc"],"crop":["photo","image"],"crosshair":["aim","target"],"database":["storage"],"delete":["remove"],"disc":["album","cd","dvd","music"],"dollar-sign":["currency","money","payment"],"droplet":["water"],"edit":["pencil","change"],"edit-2":["pencil","change"],"edit-3":["pencil","change"],"eye":["view","watch"],"eye-off":["view","watch"],"external-link":["outbound"],"facebook":["logo"],"fast-forward":["music"],"figma":["logo","design","tool"],"film":["movie","video"],"folder-minus":["directory"],"folder-plus":["directory"],"folder":["directory"],"framer":["logo","design","tool"],"frown":["emoji","face","bad","sad","emotion"],"gift":["present","box","birthday","party"],"git-branch":["code","version control"],"git-commit":["code","version control"],"git-merge":["code","version control"],"git-pull-request":["code","version control"],"github":["logo","version control"],"gitlab":["logo","version control"],"global":["world","browser","language","translate"],"hard-drive":["computer","server"],"hash":["hashtag","number","pound"],"headphones":["music","audio"],"heart":["like","love"],"help-circle":["question mark"],"hexagon":["shape","node.js","logo"],"home":["house"],"image":["picture"],"inbox":["email"],"instagram":["logo","camera"],"key":["password","login","authentication"],"life-bouy":["help","life ring","support"],"linkedin":["logo"],"lock":["security","password"],"log-in":["sign in","arrow"],"log-out":["sign out","arrow"],"mail":["email"],"map-pin":["location","navigation","travel","marker"],"map":["location","navigation","travel"],"maximize":["fullscreen"],"maximize-2":["fullscreen","arrows"],"meh":["emoji","face","neutral","emotion"],"menu":["bars","navigation","hamburger"],"message-circle":["comment","chat"],"message-square":["comment","chat"],"mic-off":["record"],"mic":["record"],"minimize":["exit fullscreen"],"minimize-2":["exit fullscreen","arrows"],"monitor":["tv"],"moon":["dark","night"],"more-horizontal":["ellipsis"],"more-vertical":["ellipsis"],"mouse-pointer":["arrow","cursor"],"move":["arrows"],"navigation":["location","travel"],"navigation-2":["location","travel"],"octagon":["stop"],"package":["box"],"paperclip":["attachment"],"pause":["music","stop"],"pause-circle":["music","stop"],"pen-tool":["vector","drawing"],"play":["music","start"],"play-circle":["music","start"],"plus":["add","new"],"plus-circle":["add","new"],"plus-square":["add","new"],"pocket":["logo","save"],"power":["on","off"],"radio":["signal"],"rewind":["music"],"rss":["feed","subscribe"],"save":["floppy disk"],"search":["find","magnifier","magnifying glass"],"send":["message","mail","paper airplane"],"settings":["cog","edit","gear","preferences"],"shield":["security"],"shield-off":["security"],"shopping-bag":["ecommerce","cart","purchase","store"],"shopping-cart":["ecommerce","cart","purchase","store"],"shuffle":["music"],"skip-back":["music"],"skip-forward":["music"],"slash":["ban","no"],"sliders":["settings","controls"],"smile":["emoji","face","happy","good","emotion"],"speaker":["music"],"star":["bookmark","favorite","like"],"sun":["brightness","weather","light"],"sunrise":["weather"],"sunset":["weather"],"tag":["label"],"target":["bullseye"],"terminal":["code","command line"],"thumbs-down":["dislike","bad"],"thumbs-up":["like","good"],"toggle-left":["on","off","switch"],"toggle-right":["on","off","switch"],"trash":["garbage","delete","remove"],"trash-2":["garbage","delete","remove"],"triangle":["delta"],"truck":["delivery","van","shipping"],"twitter":["logo"],"umbrella":["rain","weather"],"video-off":["camera","movie","film"],"video":["camera","movie","film"],"voicemail":["phone"],"volume":["music","sound","mute"],"volume-1":["music","sound"],"volume-2":["music","sound"],"volume-x":["music","sound","mute"],"watch":["clock","time"],"wind":["weather","air"],"x-circle":["cancel","close","delete","remove","times"],"x-octagon":["delete","stop","alert","warning","times"],"x-square":["cancel","close","delete","remove","times"],"x":["cancel","close","delete","remove","times"],"youtube":["logo","video","play"],"zap-off":["flash","camera","lightning"],"zap":["flash","camera","lightning"]};

    /***/ }),

    /***/ "./src/to-svg.js":
    /*!***********************!*\
      !*** ./src/to-svg.js ***!
      \***********************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _icons = __webpack_require__(/*! ./icons */ "./src/icons.js");

    var _icons2 = _interopRequireDefault(_icons);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Create an SVG string.
     * @deprecated
     * @param {string} name
     * @param {Object} attrs
     * @returns {string}
     */
    function toSvg(name) {
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      console.warn('feather.toSvg() is deprecated. Please use feather.icons[name].toSvg() instead.');

      if (!name) {
        throw new Error('The required `key` (icon name) parameter is missing.');
      }

      if (!_icons2.default[name]) {
        throw new Error('No icon matching \'' + name + '\'. See the complete list of icons at https://feathericons.com');
      }

      return _icons2.default[name].toSvg(attrs);
    }

    exports.default = toSvg;

    /***/ }),

    /***/ 0:
    /*!**************************************************!*\
      !*** multi core-js/es/array/from ./src/index.js ***!
      \**************************************************/
    /*! no static exports found */
    /***/ (function(module, exports, __webpack_require__) {

    __webpack_require__(/*! core-js/es/array/from */"./node_modules/core-js/es/array/from.js");
    module.exports = __webpack_require__(/*! /home/travis/build/feathericons/feather/src/index.js */"./src/index.js");


    /***/ })

    /******/ });
    });

    });

    var feather$1 = unwrapExports(feather);

    /* src/Feather.svelte generated by Svelte v3.6.1 */

    function create_fragment(ctx) {
    	var raw_value = feather$1.icons[ctx.icon].toSvg(), raw_before, raw_after;

    	return {
    		c: function create() {
    			raw_before = element('noscript');
    			raw_after = element('noscript');
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, raw_before, anchor);
    			raw_before.insertAdjacentHTML("afterend", raw_value);
    			insert(target, raw_after, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.icon) && raw_value !== (raw_value = feather$1.icons[ctx.icon].toSvg())) {
    				detach_between(raw_before, raw_after);
    				raw_before.insertAdjacentHTML("afterend", raw_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_between(raw_before, raw_after);
    				detach(raw_before);
    				detach(raw_after);
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { icon = "feather" } = $$props;

    	const writable_props = ['icon'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Feather> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
    	};

    	return { icon };
    }

    class Feather extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["icon"]);
    	}

    	get icon() {
    		throw new Error("<Feather>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<Feather>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.6.1 */

    const file = "src/App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.channel = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.atem = list[i];
    	child_ctx.each_value = list;
    	child_ctx.atem_index = i;
    	return child_ctx;
    }

    // (87:50) {:else}
    function create_else_block_1(ctx) {
    	var current;

    	var feather = new Feather({
    		props: { icon: "alert-triangle" },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			feather.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(feather, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(feather.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(feather.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(feather, detaching);
    		}
    	};
    }

    // (87:4) {#if ws.readyState === 1}
    function create_if_block_3(ctx) {
    	var current;

    	var feather = new Feather({ props: { icon: "zap" }, $$inline: true });

    	return {
    		c: function create() {
    			feather.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(feather, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(feather.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(feather.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(feather, detaching);
    		}
    	};
    }

    // (92:45) {:else}
    function create_else_block(ctx) {
    	var current;

    	var feather = new Feather({
    		props: { icon: "alert-triangle" },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			feather.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(feather, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(feather.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(feather.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(feather, detaching);
    		}
    	};
    }

    // (92:4) {#if atem.connected}
    function create_if_block_2(ctx) {
    	var current;

    	var feather = new Feather({ props: { icon: "zap" }, $$inline: true });

    	return {
    		c: function create() {
    			feather.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(feather, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(feather.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(feather.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(feather, detaching);
    		}
    	};
    }

    // (101:6) {#each atem.visibleChannels as channel}
    function create_each_block_1(ctx) {
    	var div, p, t0_value = ctx.channel.label, t0, t1, dispose;

    	function click_handler(...args) {
    		return ctx.click_handler(ctx, ...args);
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(p, file, 106, 10, 3272);
    			attr(div, "class", "button");
    			toggle_class(div, "red", ctx.atem.isProgramChannel(ctx.channel));
    			toggle_class(div, "green", ctx.atem.isPreviewChannel(ctx.channel));
    			add_location(div, file, 101, 8, 3069);
    			dispose = listen(div, "click", click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);
    			append(p, t0);
    			append(div, t1);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.switchers) && t0_value !== (t0_value = ctx.channel.label)) {
    				set_data(t0, t0_value);
    			}

    			if (changed.switchers) {
    				toggle_class(div, "red", ctx.atem.isProgramChannel(ctx.channel));
    				toggle_class(div, "green", ctx.atem.isPreviewChannel(ctx.channel));
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (178:6) {#if atem.state.topology.numberOfStingers > 0}
    function create_if_block_1(ctx) {
    	var div, p, dispose;

    	function click_handler_9(...args) {
    		return ctx.click_handler_9(ctx, ...args);
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "STING";
    			add_location(p, file, 182, 10, 5563);
    			attr(div, "class", "button");
    			toggle_class(div, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 3);
    			add_location(div, file, 178, 8, 5398);
    			dispose = listen(div, "click", click_handler_9);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.switchers) {
    				toggle_class(div, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 3);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (186:6) {#if atem.state.topology.numberOfDVEs > 0}
    function create_if_block(ctx) {
    	var div, p, dispose;

    	function click_handler_10(...args) {
    		return ctx.click_handler_10(ctx, ...args);
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "DVE";
    			add_location(p, file, 190, 10, 5825);
    			attr(div, "class", "button");
    			toggle_class(div, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 4);
    			add_location(div, file, 186, 8, 5660);
    			dispose = listen(div, "click", click_handler_10);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.switchers) {
    				toggle_class(div, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 4);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (80:0) {#each switchers as atem}
    function create_each_block(ctx) {
    	var header, h1, t0_value = ctx.atem.state._pin, t0, t1, a0, t2, t3, a1, t4, t5, span0, current_block_type_index, if_block0, t6, t7, span1, current_block_type_index_1, if_block1, t8, t9, div23, section0, h30, t11, div0, t12, section1, h31, t14, div3, div1, p0, t16, div2, p1, t18, input0, t19, section2, h32, t21, div7, div4, p2, t23, div5, p3, t24, br0, t25, t26, div6, p4, t28, section3, h33, t30, div12, div8, p5, t32, div9, p6, t34, div10, p7, t36, t37, t38, div11, p8, t39, br1, t40, t41, section4, h34, t43, div16, div13, p9, t45, div14, p10, t46, br2, t47, t48, div15, p11, t50, section5, h35, t52, div20, div17, p12, t54, div18, p13, t55, br3, t56, t57, div19, p14, t59, section6, h36, t61, div22, div21, p15, t63, div26, h2, t65, div24, img0, t66, input1, t67, div25, img1, t68, input2, t69, current, dispose;

    	var feather0 = new Feather({ props: { icon: "grid" }, $$inline: true });

    	var feather1 = new Feather({ props: { icon: "film" }, $$inline: true });

    	var if_block_creators = [
    		create_if_block_3,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.ws.readyState === 1) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var if_block_creators_1 = [
    		create_if_block_2,
    		create_else_block
    	];

    	var if_blocks_1 = [];

    	function select_block_type_1(ctx) {
    		if (ctx.atem.connected) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(ctx);
    	if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	var each_value_1 = ctx.atem.visibleChannels;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function click_handler_1(...args) {
    		return ctx.click_handler_1(ctx, ...args);
    	}

    	function click_handler_2(...args) {
    		return ctx.click_handler_2(ctx, ...args);
    	}

    	function input0_change_input_handler() {
    		ctx.input0_change_input_handler.call(input0, ctx);
    	}

    	function input_handler(...args) {
    		return ctx.input_handler(ctx, ...args);
    	}

    	function click_handler_3(...args) {
    		return ctx.click_handler_3(ctx, ...args);
    	}

    	function click_handler_4(...args) {
    		return ctx.click_handler_4(ctx, ...args);
    	}

    	function click_handler_5(...args) {
    		return ctx.click_handler_5(ctx, ...args);
    	}

    	function click_handler_6(...args) {
    		return ctx.click_handler_6(ctx, ...args);
    	}

    	function click_handler_7(...args) {
    		return ctx.click_handler_7(ctx, ...args);
    	}

    	function click_handler_8(...args) {
    		return ctx.click_handler_8(ctx, ...args);
    	}

    	var if_block2 = (ctx.atem.state.topology.numberOfStingers > 0) && create_if_block_1(ctx);

    	var if_block3 = (ctx.atem.state.topology.numberOfDVEs > 0) && create_if_block(ctx);

    	function click_handler_11(...args) {
    		return ctx.click_handler_11(ctx, ...args);
    	}

    	function click_handler_12(...args) {
    		return ctx.click_handler_12(ctx, ...args);
    	}

    	function click_handler_13(...args) {
    		return ctx.click_handler_13(ctx, ...args);
    	}

    	function click_handler_14(...args) {
    		return ctx.click_handler_14(ctx, ...args);
    	}

    	function click_handler_15(...args) {
    		return ctx.click_handler_15(ctx, ...args);
    	}

    	function click_handler_16(...args) {
    		return ctx.click_handler_16(ctx, ...args);
    	}

    	function click_handler_17(...args) {
    		return ctx.click_handler_17(ctx, ...args);
    	}

    	function change_handler(...args) {
    		return ctx.change_handler(ctx, ...args);
    	}

    	function drop_handler(...args) {
    		return ctx.drop_handler(ctx, ...args);
    	}

    	function change_handler_1(...args) {
    		return ctx.change_handler_1(ctx, ...args);
    	}

    	function drop_handler_1(...args) {
    		return ctx.drop_handler_1(ctx, ...args);
    	}

    	return {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			a0 = element("a");
    			feather0.$$.fragment.c();
    			t2 = text("Switcher");
    			t3 = space();
    			a1 = element("a");
    			feather1.$$.fragment.c();
    			t4 = text("Media");
    			t5 = space();
    			span0 = element("span");
    			if_block0.c();
    			t6 = text("\n    Server");
    			t7 = space();
    			span1 = element("span");
    			if_block1.c();
    			t8 = text("\n    ATEM");
    			t9 = space();
    			div23 = element("div");
    			section0 = element("section");
    			h30 = element("h3");
    			h30.textContent = "Program & Preview";
    			t11 = space();
    			div0 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			section1 = element("section");
    			h31 = element("h3");
    			h31.textContent = "Transition";
    			t14 = space();
    			div3 = element("div");
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "CUT";
    			t16 = space();
    			div2 = element("div");
    			p1 = element("p");
    			p1.textContent = "AUTO";
    			t18 = space();
    			input0 = element("input");
    			t19 = space();
    			section2 = element("section");
    			h32 = element("h3");
    			h32.textContent = "Next Transition";
    			t21 = space();
    			div7 = element("div");
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "BKGD";
    			t23 = space();
    			div5 = element("div");
    			p3 = element("p");
    			t24 = text("ON");
    			br0 = element("br");
    			t25 = text("AIR");
    			t26 = space();
    			div6 = element("div");
    			p4 = element("p");
    			p4.textContent = "Key 1";
    			t28 = space();
    			section3 = element("section");
    			h33 = element("h3");
    			h33.textContent = "Transition style";
    			t30 = space();
    			div12 = element("div");
    			div8 = element("div");
    			p5 = element("p");
    			p5.textContent = "MIX";
    			t32 = space();
    			div9 = element("div");
    			p6 = element("p");
    			p6.textContent = "DIP";
    			t34 = space();
    			div10 = element("div");
    			p7 = element("p");
    			p7.textContent = "WIPE";
    			t36 = space();
    			if (if_block2) if_block2.c();
    			t37 = space();
    			if (if_block3) if_block3.c();
    			t38 = space();
    			div11 = element("div");
    			p8 = element("p");
    			t39 = text("PREV");
    			br1 = element("br");
    			t40 = text("TRAN");
    			t41 = space();
    			section4 = element("section");
    			h34 = element("h3");
    			h34.textContent = "Downstream Key 1";
    			t43 = space();
    			div16 = element("div");
    			div13 = element("div");
    			p9 = element("p");
    			p9.textContent = "TIE";
    			t45 = space();
    			div14 = element("div");
    			p10 = element("p");
    			t46 = text("ON");
    			br2 = element("br");
    			t47 = text("AIR");
    			t48 = space();
    			div15 = element("div");
    			p11 = element("p");
    			p11.textContent = "AUTO";
    			t50 = space();
    			section5 = element("section");
    			h35 = element("h3");
    			h35.textContent = "Downstream Key 2";
    			t52 = space();
    			div20 = element("div");
    			div17 = element("div");
    			p12 = element("p");
    			p12.textContent = "TIE";
    			t54 = space();
    			div18 = element("div");
    			p13 = element("p");
    			t55 = text("ON");
    			br3 = element("br");
    			t56 = text("AIR");
    			t57 = space();
    			div19 = element("div");
    			p14 = element("p");
    			p14.textContent = "AUTO";
    			t59 = space();
    			section6 = element("section");
    			h36 = element("h3");
    			h36.textContent = "Fade to Black";
    			t61 = space();
    			div22 = element("div");
    			div21 = element("div");
    			p15 = element("p");
    			p15.textContent = "FTB";
    			t63 = space();
    			div26 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Media";
    			t65 = space();
    			div24 = element("div");
    			img0 = element("img");
    			t66 = space();
    			input1 = element("input");
    			t67 = space();
    			div25 = element("div");
    			img1 = element("img");
    			t68 = space();
    			input2 = element("input");
    			t69 = space();
    			add_location(h1, file, 81, 2, 2215);
    			attr(a0, "href", "#switcher");
    			attr(a0, "class", "tab");
    			add_location(a0, file, 82, 2, 2244);
    			attr(a1, "href", "#media");
    			attr(a1, "class", "tab");
    			add_location(a1, file, 83, 2, 2313);
    			attr(span0, "class", "tab connection-status");
    			attr(span0, "title", "Connection status: green=connected, red=disconnected");
    			toggle_class(span0, "connected", ctx.ws.readyState === 1);
    			add_location(span0, file, 84, 2, 2376);
    			attr(span1, "class", "tab connection-status");
    			attr(span1, "title", "Connection status: green=connected, red=disconnected");
    			toggle_class(span1, "connected", ctx.atem.connected);
    			add_location(span1, file, 89, 2, 2638);
    			add_location(header, file, 80, 0, 2204);
    			add_location(h30, file, 98, 4, 2965);
    			attr(div0, "class", "well");
    			add_location(div0, file, 99, 4, 2996);
    			attr(section0, "class", "channels");
    			add_location(section0, file, 97, 2, 2934);
    			add_location(h31, file, 113, 4, 3384);
    			add_location(p0, file, 116, 8, 3497);
    			attr(div1, "class", "button");
    			add_location(div1, file, 115, 6, 3433);
    			add_location(p1, file, 122, 8, 3674);
    			attr(div2, "class", "button");
    			toggle_class(div2, "red", ctx.atem.state.video.ME[0].transitionPosition > 0);
    			add_location(div2, file, 118, 6, 3527);
    			attr(input0, "class", "slider");
    			attr(input0, "type", "range");
    			attr(input0, "min", "0");
    			attr(input0, "max", "1");
    			attr(input0, "step", "0.001");
    			add_location(input0, file, 124, 6, 3705);
    			attr(div3, "class", "well");
    			add_location(div3, file, 114, 4, 3408);
    			attr(section1, "class", "transition");
    			add_location(section1, file, 112, 2, 3351);
    			add_location(h32, file, 133, 4, 4013);
    			add_location(p2, file, 139, 8, 4244);
    			attr(div4, "class", "button");
    			toggle_class(div4, "yellow", ctx.atem.state.video.ME[0].upstreamKeyNextBackgroundState);
    			add_location(div4, file, 135, 6, 4067);
    			add_location(br0, file, 145, 13, 4435);
    			add_location(p3, file, 145, 8, 4430);
    			attr(div5, "class", "button");
    			toggle_class(div5, "red", ctx.atem.state.video.ME[0].upstreamKeyState[0]);
    			add_location(div5, file, 141, 6, 4275);
    			add_location(p4, file, 151, 8, 4634);
    			attr(div6, "class", "button");
    			toggle_class(div6, "yellow", ctx.atem.state.video.ME[0].upstreamKeyNextState[0]);
    			add_location(div6, file, 147, 6, 4468);
    			attr(div7, "class", "well");
    			add_location(div7, file, 134, 4, 4042);
    			attr(section2, "class", "next-transition");
    			add_location(section2, file, 132, 2, 3975);
    			add_location(h33, file, 157, 4, 4726);
    			add_location(p5, file, 163, 8, 4938);
    			attr(div8, "class", "button");
    			toggle_class(div8, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 0);
    			add_location(div8, file, 159, 6, 4781);
    			add_location(p6, file, 169, 8, 5125);
    			attr(div9, "class", "button");
    			toggle_class(div9, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 1);
    			add_location(div9, file, 165, 6, 4968);
    			add_location(p7, file, 175, 8, 5312);
    			attr(div10, "class", "button");
    			toggle_class(div10, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 2);
    			add_location(div10, file, 171, 6, 5155);
    			add_location(br1, file, 194, 15, 5945);
    			add_location(p8, file, 194, 8, 5938);
    			attr(div11, "class", "button");
    			add_location(div11, file, 193, 6, 5869);
    			attr(div12, "class", "well");
    			add_location(div12, file, 158, 4, 4756);
    			attr(section3, "class", "transition-style");
    			add_location(section3, file, 156, 2, 4687);
    			add_location(h34, file, 200, 4, 6037);
    			add_location(p9, file, 206, 8, 6244);
    			attr(div13, "class", "button");
    			toggle_class(div13, "yellow", ctx.atem.state.video.downstreamKeyTie[0]);
    			add_location(div13, file, 202, 6, 6092);
    			add_location(br2, file, 212, 13, 6426);
    			add_location(p10, file, 212, 8, 6421);
    			attr(div14, "class", "button");
    			toggle_class(div14, "red", ctx.atem.state.video.downstreamKeyOn[0]);
    			add_location(div14, file, 208, 6, 6274);
    			add_location(p11, file, 218, 8, 6572);
    			attr(div15, "class", "button");
    			toggle_class(div15, "red", false);
    			add_location(div15, file, 214, 6, 6459);
    			attr(div16, "class", "well");
    			add_location(div16, file, 201, 4, 6067);
    			attr(section4, "class", "downstream-key");
    			add_location(section4, file, 199, 2, 6000);
    			add_location(h35, file, 223, 4, 6660);
    			add_location(p12, file, 229, 8, 6867);
    			attr(div17, "class", "button");
    			toggle_class(div17, "yellow", ctx.atem.state.video.downstreamKeyTie[1]);
    			add_location(div17, file, 225, 6, 6715);
    			add_location(br3, file, 235, 13, 7049);
    			add_location(p13, file, 235, 8, 7044);
    			attr(div18, "class", "button");
    			toggle_class(div18, "red", ctx.atem.state.video.downstreamKeyOn[1]);
    			add_location(div18, file, 231, 6, 6897);
    			add_location(p14, file, 241, 8, 7195);
    			attr(div19, "class", "button");
    			toggle_class(div19, "red", false);
    			add_location(div19, file, 237, 6, 7082);
    			attr(div20, "class", "well");
    			add_location(div20, file, 224, 4, 6690);
    			attr(section5, "class", "downstream-key");
    			add_location(section5, file, 222, 2, 6623);
    			add_location(h36, file, 247, 4, 7283);
    			add_location(p15, file, 253, 8, 7468);
    			attr(div21, "class", "button");
    			toggle_class(div21, "red", ctx.atem.state.video.ME[0].fadeToBlack);
    			add_location(div21, file, 249, 6, 7335);
    			attr(div22, "class", "well");
    			add_location(div22, file, 248, 4, 7310);
    			attr(section6, "class", "fade-to-black");
    			add_location(section6, file, 246, 2, 7247);
    			attr(div23, "id", "switcher");
    			attr(div23, "class", "screen");
    			add_location(div23, file, 96, 0, 2897);
    			add_location(h2, file, 260, 2, 7581);
    			attr(img0, "alt", "Upload Media 1");
    			add_location(img0, file, 264, 4, 7759);
    			attr(input1, "type", "file");
    			attr(input1, "name", "media");
    			add_location(input1, file, 265, 4, 7792);
    			attr(div24, "class", "media-thumb well");
    			add_location(div24, file, 261, 2, 7598);
    			attr(img1, "alt", "Upload Media 2");
    			add_location(img1, file, 270, 4, 8056);
    			attr(input2, "type", "file");
    			attr(input2, "name", "media");
    			add_location(input2, file, 271, 4, 8089);
    			attr(div25, "class", "media-thumb well");
    			add_location(div25, file, 267, 2, 7895);
    			attr(div26, "id", "media");
    			attr(div26, "class", "screen");
    			add_location(div26, file, 259, 0, 7547);

    			dispose = [
    				listen(div1, "click", click_handler_1),
    				listen(div2, "click", click_handler_2),
    				listen(input0, "change", input0_change_input_handler),
    				listen(input0, "input", input0_change_input_handler),
    				listen(input0, "input", input_handler),
    				listen(div4, "click", click_handler_3),
    				listen(div5, "click", click_handler_4),
    				listen(div6, "click", click_handler_5),
    				listen(div8, "click", click_handler_6),
    				listen(div9, "click", click_handler_7),
    				listen(div10, "click", click_handler_8),
    				listen(div11, "click", ctx.atem.changeTransitionPreview),
    				listen(div13, "click", click_handler_11),
    				listen(div14, "click", click_handler_12),
    				listen(div15, "click", click_handler_13),
    				listen(div17, "click", click_handler_14),
    				listen(div18, "click", click_handler_15),
    				listen(div19, "click", click_handler_16),
    				listen(div21, "click", click_handler_17),
    				listen(input1, "change", change_handler),
    				listen(div24, "drop", drop_handler),
    				listen(div24, "click", click_handler_18),
    				listen(input2, "change", change_handler_1),
    				listen(div25, "drop", drop_handler_1),
    				listen(div25, "click", click_handler_19)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, header, anchor);
    			append(header, h1);
    			append(h1, t0);
    			append(header, t1);
    			append(header, a0);
    			mount_component(feather0, a0, null);
    			append(a0, t2);
    			append(header, t3);
    			append(header, a1);
    			mount_component(feather1, a1, null);
    			append(a1, t4);
    			append(header, t5);
    			append(header, span0);
    			if_blocks[current_block_type_index].m(span0, null);
    			append(span0, t6);
    			append(header, t7);
    			append(header, span1);
    			if_blocks_1[current_block_type_index_1].m(span1, null);
    			append(span1, t8);
    			insert(target, t9, anchor);
    			insert(target, div23, anchor);
    			append(div23, section0);
    			append(section0, h30);
    			append(section0, t11);
    			append(section0, div0);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div23, t12);
    			append(div23, section1);
    			append(section1, h31);
    			append(section1, t14);
    			append(section1, div3);
    			append(div3, div1);
    			append(div1, p0);
    			append(div3, t16);
    			append(div3, div2);
    			append(div2, p1);
    			append(div3, t18);
    			append(div3, input0);

    			input0.value = ctx.atem.state.video.ME[0].transitionPosition;

    			append(div23, t19);
    			append(div23, section2);
    			append(section2, h32);
    			append(section2, t21);
    			append(section2, div7);
    			append(div7, div4);
    			append(div4, p2);
    			append(div7, t23);
    			append(div7, div5);
    			append(div5, p3);
    			append(p3, t24);
    			append(p3, br0);
    			append(p3, t25);
    			append(div7, t26);
    			append(div7, div6);
    			append(div6, p4);
    			append(div23, t28);
    			append(div23, section3);
    			append(section3, h33);
    			append(section3, t30);
    			append(section3, div12);
    			append(div12, div8);
    			append(div8, p5);
    			append(div12, t32);
    			append(div12, div9);
    			append(div9, p6);
    			append(div12, t34);
    			append(div12, div10);
    			append(div10, p7);
    			append(div12, t36);
    			if (if_block2) if_block2.m(div12, null);
    			append(div12, t37);
    			if (if_block3) if_block3.m(div12, null);
    			append(div12, t38);
    			append(div12, div11);
    			append(div11, p8);
    			append(p8, t39);
    			append(p8, br1);
    			append(p8, t40);
    			append(div23, t41);
    			append(div23, section4);
    			append(section4, h34);
    			append(section4, t43);
    			append(section4, div16);
    			append(div16, div13);
    			append(div13, p9);
    			append(div16, t45);
    			append(div16, div14);
    			append(div14, p10);
    			append(p10, t46);
    			append(p10, br2);
    			append(p10, t47);
    			append(div16, t48);
    			append(div16, div15);
    			append(div15, p11);
    			append(div23, t50);
    			append(div23, section5);
    			append(section5, h35);
    			append(section5, t52);
    			append(section5, div20);
    			append(div20, div17);
    			append(div17, p12);
    			append(div20, t54);
    			append(div20, div18);
    			append(div18, p13);
    			append(p13, t55);
    			append(p13, br3);
    			append(p13, t56);
    			append(div20, t57);
    			append(div20, div19);
    			append(div19, p14);
    			append(div23, t59);
    			append(div23, section6);
    			append(section6, h36);
    			append(section6, t61);
    			append(section6, div22);
    			append(div22, div21);
    			append(div21, p15);
    			insert(target, t63, anchor);
    			insert(target, div26, anchor);
    			append(div26, h2);
    			append(div26, t65);
    			append(div26, div24);
    			append(div24, img0);
    			append(div24, t66);
    			append(div24, input1);
    			append(div26, t67);
    			append(div26, div25);
    			append(div25, img1);
    			append(div25, t68);
    			append(div25, input2);
    			append(div26, t69);
    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((!current || changed.switchers) && t0_value !== (t0_value = ctx.atem.state._pin)) {
    				set_data(t0, t0_value);
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index !== previous_block_index) {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block0 = if_blocks[current_block_type_index];
    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}
    				transition_in(if_block0, 1);
    				if_block0.m(span0, t6);
    			}

    			if (changed.ws) {
    				toggle_class(span0, "connected", ctx.ws.readyState === 1);
    			}

    			var previous_block_index_1 = current_block_type_index_1;
    			current_block_type_index_1 = select_block_type_1(ctx);
    			if (current_block_type_index_1 !== previous_block_index_1) {
    				group_outros();
    				transition_out(if_blocks_1[previous_block_index_1], 1, () => {
    					if_blocks_1[previous_block_index_1] = null;
    				});
    				check_outros();

    				if_block1 = if_blocks_1[current_block_type_index_1];
    				if (!if_block1) {
    					if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    					if_block1.c();
    				}
    				transition_in(if_block1, 1);
    				if_block1.m(span1, t8);
    			}

    			if (changed.switchers) {
    				toggle_class(span1, "connected", ctx.atem.connected);
    			}

    			if (changed.switchers) {
    				each_value_1 = ctx.atem.visibleChannels;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}

    			if (changed.switchers) {
    				toggle_class(div2, "red", ctx.atem.state.video.ME[0].transitionPosition > 0);
    			}

    			if (changed.switchers) input0.value = ctx.atem.state.video.ME[0].transitionPosition;

    			if (changed.switchers) {
    				toggle_class(div4, "yellow", ctx.atem.state.video.ME[0].upstreamKeyNextBackgroundState);
    				toggle_class(div5, "red", ctx.atem.state.video.ME[0].upstreamKeyState[0]);
    				toggle_class(div6, "yellow", ctx.atem.state.video.ME[0].upstreamKeyNextState[0]);
    				toggle_class(div8, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 0);
    				toggle_class(div9, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 1);
    				toggle_class(div10, "yellow", ctx.atem.state.video.ME[0].transitionStyle == 2);
    			}

    			if (ctx.atem.state.topology.numberOfStingers > 0) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div12, t37);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (ctx.atem.state.topology.numberOfDVEs > 0) {
    				if (if_block3) {
    					if_block3.p(changed, ctx);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(div12, t38);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (changed.switchers) {
    				toggle_class(div13, "yellow", ctx.atem.state.video.downstreamKeyTie[0]);
    				toggle_class(div14, "red", ctx.atem.state.video.downstreamKeyOn[0]);
    				toggle_class(div17, "yellow", ctx.atem.state.video.downstreamKeyTie[1]);
    				toggle_class(div18, "red", ctx.atem.state.video.downstreamKeyOn[1]);
    				toggle_class(div21, "red", ctx.atem.state.video.ME[0].fadeToBlack);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(feather0.$$.fragment, local);

    			transition_in(feather1.$$.fragment, local);

    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(feather0.$$.fragment, local);
    			transition_out(feather1.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(header);
    			}

    			destroy_component(feather0, );

    			destroy_component(feather1, );

    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();

    			if (detaching) {
    				detach(t9);
    				detach(div23);
    			}

    			destroy_each(each_blocks, detaching);

    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();

    			if (detaching) {
    				detach(t63);
    				detach(div26);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var each_1_anchor, current;

    	var each_value = ctx.switchers;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.switchers || changed.ws) {
    				each_value = ctx.switchers;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    function click_handler_18(e) {
    	return this.querySelector('input').click();
    }

    function click_handler_19(e) {
    	return this.querySelector('input').click();
    }

    function instance$1($$self, $$props, $$invalidate) {
    	

      let switchers = [];

      let ws;
      let intervalID = 0;

      function doConnect() {
        console.debug("Opening websocket...");
        $$invalidate('ws', ws = new WebSocket(((window.location.protocol === "https:") ? "wss://" : "ws://") + window.location.host + "/ws"));
        ws.addEventListener("open", function(event) {
          console.log("Websocket opened");
          intervalID = clearTimeout(intervalID);
          switchers[0] = new atem_1(); $$invalidate('switchers', switchers);
          switchers[0].setWebsocket(ws);
          // update svelte
          $$invalidate('ws', ws);
        });
        ws.addEventListener("message", function(event) {
          let data = JSON.parse(event.data);
          let device = data.device || 0;
          console.log(data);
          switch (data.method) {
            case 'connect':
              switchers[device].connected = true; $$invalidate('switchers', switchers);
            break;
            case 'disconnect':
              switchers[device].connected = false; $$invalidate('switchers', switchers);
            break;
            default:
              switchers[device].connected = true; $$invalidate('switchers', switchers);
              switchers[device].state = data; $$invalidate('switchers', switchers);
          }
          return data;
        });
        ws.addEventListener("error", function() {
          console.log("Websocket error");
          intervalID = setTimeout(doConnect, 1000);
        });
        ws.addEventListener("close", function() {
          console.log("Websocket closed");
          intervalID = setTimeout(doConnect, 1000);
        });
      }

      function onKeyUp(event) {
        var key = event.key || event.keyCode;
        if (key === " " || key === 32) {
          event.preventDefault();
          switchers[0].cutTransition();
        } else if (key === "Enter" || key === 13) {
          switchers[0].autoTransition();
        } else if (key >= "0" && key <= "9") {
          if (event.getModifierState("Control")) {
            switchers[0].changeProgramInput(key);
          } else {
            switchers[0].changePreviewInput(key);
          }
        }
      }

      onMount(() => {
        doConnect();
        document.addEventListener("keyup", onKeyUp);
      });

    	function click_handler({ atem, channel }, e) {
    		return atem.changePreview(channel);
    	}

    	function click_handler_1({ atem }, e) {
    		return atem.cutTransition();
    	}

    	function click_handler_2({ atem }, e) {
    		return atem.autoTransition();
    	}

    	function input0_change_input_handler({ atem, each_value, atem_index }) {
    		each_value[atem_index].state.video.ME[0].transitionPosition = to_number(this.value);
    		$$invalidate('switchers', switchers);
    	}

    	function input_handler({ atem }, e) {
    		return atem.changeTransitionPosition(atem.state.video.ME[0].transitionPosition);
    	}

    	function click_handler_3({ atem }, e) {
    		return atem.toggleUpstreamKeyNextBackground();
    	}

    	function click_handler_4({ atem }, e) {
    		return atem.toggleUpstreamKeyState(0);
    	}

    	function click_handler_5({ atem }, e) {
    		return atem.toggleUpstreamKeyNextState(0);
    	}

    	function click_handler_6({ atem }, e) {
    		return atem.changeTransitionType(0);
    	}

    	function click_handler_7({ atem }, e) {
    		return atem.changeTransitionType(1);
    	}

    	function click_handler_8({ atem }, e) {
    		return atem.changeTransitionType(2);
    	}

    	function click_handler_9({ atem }, e) {
    		return atem.changeTransitionType(3);
    	}

    	function click_handler_10({ atem }, e) {
    		return atem.changeTransitionType(4);
    	}

    	function click_handler_11({ atem }, e) {
    		return atem.toggleDownstreamKeyTie(0);
    	}

    	function click_handler_12({ atem }, e) {
    		return atem.toggleDownstreamKeyOn(0);
    	}

    	function click_handler_13({ atem }, e) {
    		return atem.autoDownstreamKey(0);
    	}

    	function click_handler_14({ atem }, e) {
    		return atem.toggleDownstreamKeyTie(1);
    	}

    	function click_handler_15({ atem }, e) {
    		return atem.toggleDownstreamKeyOn(1);
    	}

    	function click_handler_16({ atem }, e) {
    		return atem.autoDownstreamKey(1);
    	}

    	function click_handler_17({ atem }, e) {
    		return atem.fadeToBlack();
    	}

    	function change_handler({ atem }, e) {
    		return atem.uploadMediaFile(e.target.files[0], 0);
    	}

    	function drop_handler({ atem }, e) {
    		return atem.uploadMediaFile(e.dataTransfer.files[0], 1);
    	}

    	function change_handler_1({ atem }, e) {
    		return atem.uploadMediaFile(e.target.files[0], 1);
    	}

    	function drop_handler_1({ atem }, e) {
    		return atem.uploadMediaFile(e.dataTransfer.files[0], 2);
    	}

    	return {
    		switchers,
    		ws,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_change_input_handler,
    		input_handler,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15,
    		click_handler_16,
    		click_handler_17,
    		change_handler,
    		drop_handler,
    		change_handler_1,
    		drop_handler_1
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
