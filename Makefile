.PHONY: test htmltest jstest doctest

test: htmltest jstest doctest

htmltest:
	html5validator --root . --show-warnings

jstest:
	jshint --extract auto *.html
	jshint jquery.jsparc.js jsparc.js event-display/code.js scripts/regression.js leaflet.hisparc.js

doctest:
	sphinx-build -anW doc doc/_build/html
