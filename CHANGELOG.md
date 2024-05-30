# Changelog

All notable changes to [diagram-js-minimap](https://github.com/bpmn-io/diagram-js-minimap) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `FEAT`: support multiple diagram-js-instances on the same page
* `FIX`: do not copy elements with IDs
* `CHORE`: prefix svg graphic IDs

### 5.0.0

* `CHORE`: drop hammerjs dependency ([#73](https://github.com/bpmn-io/diagram-js-minimap/issues/73))

### Breaking Change

* Following [`diagram-js@14`](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#1400) this release drops hammerjs and broken touch support.

## 4.1.0

* `CHORE`: bump dependencies
* `CHORE`: bump rollup
* `CHORE`: use diagram-js facilities for CSS escaping

## 4.0.1

* `DEPS`: make `hammerjs` regular dependency

## 4.0.0

* `FEAT`: minimap works with touch ([#54](https://github.com/bpmn-io/diagram-js-minimap/pull/54))
* `DEPS`: add `hammerjs` peer dependency

## 3.0.0

* `DEPS`: update to diagram-js@9

## 2.1.1

* `FIX`: ensure backwards compatibility with `diagram-js@7`

## 2.1.0

* `FEAT`: support multi-plane diagrams ([#46](https://github.com/bpmn-io/diagram-js-minimap/pull/46)),
* `DEPS`: bump `diagram-js` to 8.1.1

## 2.0.4

* `FIX`: translate toggle button content ([#43](https://github.com/bpmn-io/diagram-js-minimap/issues/43))

## 2.0.3

Re-released `v2.0.2`.

## 2.0.2

* `FIX`: do not log graphics not found ([#38](https://github.com/bpmn-io/diagram-js-minimap/issues/38))

## 2.0.1

* `FIX`: prevent minimap from crashing on mouse move ([#36](https://github.com/bpmn-io/diagram-js-minimap/issues/36))

## 2.0.0

* `CHORE`: provide pre-packaged distribution
* `CHORE`: bump to `diagram-js@4`
* `FIX`: only update viewbox on valid bounds

## 1.3.0

* `CHORE`: bump to `diagram-js@3`

## 1.2.2

__Republish with updated changelog.__

## 1.2.0

* `FEAT`: zoom on CTRL key only ([`a1848cf8`](https://github.com/bpmn-io/diagram-js-minimap/commit/a1848cf880478a74fb799422780df10f7e6d7d8f))
* `FEAT`: center & drag on SVG mouse down ([`5585f871`](https://github.com/bpmn-io/diagram-js-minimap/commit/5585f871933f6ec39d964907d6ab1a33d176cf8f))
* `FIX`: change title attribute depending on open/closed ([`5bc0e04a`](https://github.com/bpmn-io/diagram-js-minimap/commit/5bc0e04aedefb46f867b734aa9a303db3ea6c0b7))

## 1.1.2

* `FIX`: use `svgClasses` for IE 11 compatibility ([#25](https://github.com/bpmn-io/diagram-js-minimap/issues/25))

## 1.1.1

* `FIX`: export `Minimap` as ES module

## 1.1.0

* `FEAT`: align minimap to canvas (0, 0) if possible ([#17](https://github.com/bpmn-io/diagram-js-minimap/issues/17))
* `FIX`: make close handle always clickable ([#18](https://github.com/bpmn-io/diagram-js-minimap/issues/18))
* `FIX`: correct stepping when zooming out ([#19](https://github.com/bpmn-io/diagram-js-minimap/issues/19))
* `FIX`: use same zoom directions like diagram-js `ZoomScroll`

## 1.0.0

### Breaking Changes

* `CHORE`: migrate to ES modules

### Other Improvements

* `FEAT`: improved minimap UX ([#4](https://github.com/bpmn-io/diagram-js-minimap/issues/4))
* `FEAT`: add more intuitive open / close controls ([#5](https://github.com/bpmn-io/diagram-js-minimap/issues/5))
* `FIX`: disallow minimap zoom outside of minimap ([`153093be`](https://github.com/bpmn-io/diagram-js-minimap/commit/153093be7f9b3999d2b2653613db427aecb83687))
* `FIX`: ignore canvas.resized events if not present in DOM ([`24614f86`](https://github.com/bpmn-io/diagram-js-minimap/commit/24614f86856a7e1b75950ffbb1a96d2d11541b5c))
* `FIX`: correct wheel / click interaction ([#12](https://github.com/bpmn-io/diagram-js-minimap/issues/12))
* `FIX`: properly cleanup global event listeners ([#16](https://github.com/bpmn-io/diagram-js-minimap/issues/16))

## ...

Check `git log` for earlier history.