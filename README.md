<h1 align="center">
	<br>
	<img src="static/images/icon.png" alt="Dawdle Block"></a>
	<br>
	Dawdle Block
	<br>
</h1>

<h4 align="center">A browser extension for controlling time spent on unproductive sites.</h4>

<p align="center">
	<a href="https://github.com/birusq/dawdle-block/actions/workflows/ci.yml">
		<img src="https://github.com/birusq/dawdle-block/actions/workflows/ci.yml/badge.svg?branch=master">
	</a>
	<a href="https://codecov.io/gh/birusq/dawdle-block">
		<img src="https://codecov.io/gh/birusq/dawdle-block/branch/master/graph/badge.svg?token=WHeyrENiCN"/>
	</a>
</p>

## Rewrite Underway!

This project is currently being rewritten to be more extendable, maintainable, and reliable. The old project is contained in this repository in the folder "legacy". That is the version currently being distributed in the web stores. It was written in [jQuery](https://jquery.com/) using singular mega-files, while the rewrite uses proper [Webpack](https://webpack.js.org/) packaging with bells and whistles like [TypeScript](https://www.typescriptlang.org/), [Preact](https://preactjs.com/), and [Material-UI](https://mui.com/).

## Download

Official web store links to different browsers below (legacy versions) (will be updated when the rewrite is done).

[ <img src="readme_data/firefox_logo.png" height="64" margin=10> ](https://addons.mozilla.org/en-US/firefox/addon/dawdle_block/)&emsp;&emsp;
[ <img src="readme_data/chrome_logo.png" height="64"> ](https://chrome.google.com/webstore/detail/dawdle-block/eabokghknmioahcpppkglnlkedldgfhb?hl=en)

## Motivation

I wanted to control my web usage and there was no other extension with the ability to block and allow specific YouTube channels. Dawdle Block is the remedy for that. Also, it permits _multiple_ _independent_ blocking lists and timers (e.g. allowing different rules for each day) when most extensions restrain you into only using one.

## Local Environment Set-Up

If you want to clone, build and try this out yourself, ensure that you have installed [Git](https://git-scm.com), [Node.js](https://nodejs.org/en/download/), and [Yarn](https://yarnpkg.com/getting-started/install/). Keep in mind that this is not an alternative for a web store install, because it is a hassle. E.g. Firefox will unload the extension every time the browser is restarted.

Console commands for building:

```bash
# Clone this repository
$ git clone https://github.com/birusq/dawdle-block.git

# Go into the repository
$ cd dawdle-block

# Start a process that rebuilds a development version
# of the extension every time a file changes.
# Ctrl + C stops the process.
# Type "dev:firefox" instead for Firefox.
$ yarn dev:chromium
```

Next you need to figure out how to load unpacked extensions for your browser.

- In Chrome, go to [chrome://extensions](chrome://extensions) and tick "Developer mode" on and click "Load unpacked". Choose the folder "dist/chromium".
- In Firefox, go to [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox) and click "Load Temporary Add-on". Choose the file "dist/firefox/manifest.json"
- Other browsers have their own ways of achieving this.

A non-development version without debugging information can be built with the command `yarn build`. It works fine on Chrome, but on Firefox settings won't load because when the distribution manifest is incompatible with local unpacked loading.

## License

[MIT](https://choosealicense.com/licenses/mit/)
