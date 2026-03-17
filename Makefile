.PHONY: all install build clean serve test test-integration test-security

all: install build

install: node_modules public/uPlot.iife.min.js public/uPlot.min.css

node_modules: package.json package-lock.json
	npm install --ignore-scripts
	@touch node_modules

public/uPlot.iife.min.js public/uPlot.min.css: node_modules
	cp node_modules/uplot/dist/uPlot.iife.min.js public/uPlot.iife.min.js
	cp node_modules/uplot/dist/uPlot.min.css public/uPlot.min.css

build: install public/bundle.js

public/bundle.js: node_modules $(wildcard src/*.js src/**/*.js)
	npx browserify src/index.js -o public/bundle.js

serve: build
	npx serve public

clean:
	rm -rf node_modules public/bundle.js public/uPlot.iife.min.js public/uPlot.min.css

test: install
	node --test test/api/*.test.js test/model/*.test.js test/chart/*.test.js test/security/*.test.js

test-integration: install
	INTEGRATION=1 node --test test/integration/*.test.js

test-security: install
	node --test test/security/*.test.js
