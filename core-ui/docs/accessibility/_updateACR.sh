#!/bin/zsh
version=$(git describe --abbrev=0)
date=$(date +"%Y-%m-%d")
last_modified_date=$(date +"%Y-%m-%d")

npx yaml-cli set acr.yaml report_date "$date" \
    | npx yaml-cli set - last_modified_date "$last_modified_date" \
    | npx yaml-cli set - product.version "$version" > acr-out.yaml
yarn
yarn run openacr
echo "---\ntitle: Accessibility Conformance Report\n---" | cat - acr.md > tmp && mv tmp acr.md
rm -rf acr-out.yaml
