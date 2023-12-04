#!/usr/bin/fish

set this_directory /home/andrew/Code/selkouutiset-archive/
pushd $this_directory

git pull
git submodule update --remote

git add -A
set timestamp (date --iso-8601=seconds)
git commit -m "Latest data: $timestamp" || exit 0

echo "Pushing..."
git push

popd
