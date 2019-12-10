docker run -it --rm -v $(pwd):/app -v $(pwd)/docker_node_modules:/app/node_modules circleci/node:current-stretch-browsers-legacy bash -lc 'cd /app;npm install; CAPTURE=1 npm run test'
