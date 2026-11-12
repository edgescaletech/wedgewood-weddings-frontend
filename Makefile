.PHONY: run build preview clean

## run: start the React frontend on http://localhost:3000
run:
	npm run dev -- --port 3000

## build: create static assets in dist/
build:
	npm run build

## preview: serve the production build on http://localhost:4173
preview:
	npm run preview

clean:
	rm -rf dist
