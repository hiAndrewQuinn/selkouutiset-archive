# Andrew's Selkouutiset Archive

## Quickstart

Get your website up to date and locally running:

```bash
rm -rf selkouutiset-archive/ && git clone https://github.com/hiAndrewQuinn/selkouutiset-archive.git
pushd selkouutiset-archive/

git submodule update --init --remote
hugo server
popd
