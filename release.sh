#!/bin/bash
set -e

if [[ $(git status --porcelain) ]]; then

  echo "Error: git working tree is not clean. Commit or stash changes first.";

  exit 1;

fi;

read -p "Enter the new version (e.g., 1.0.2): " VERSION

VERSION=${VERSION#v};

echo "Releasing v$VERSION...";

echo "Running type checks and tests";
npm run check;
npm test;

npm version "$VERSION" -m "chore: release v%s";

echo "Pushing commit and tags to GitHub";
git push github main;
git push github "v$VERSION";

echo "Release [v$VERSION] triggered successfully";
