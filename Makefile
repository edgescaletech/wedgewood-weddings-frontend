.PHONY: run

## run: start the frontend server on http://localhost:3000
run:
	@echo "Starting frontend at http://localhost:3000 ..."
	python3 -m http.server 3000
