#!/usr/bin/fish

set this_directory /home/andrew/Code/selkouutiset-archive/
pushd $this_directory

# Pull the latest HEAD from selkouutiset-scrape.
git submodule update --remote content/
cd content/
git pull origin HEAD
cd $this_directory

git add -A
set timestamp (date -u)
git commit -m "Latest data: $timestamp" || exit 0
git push

popd
