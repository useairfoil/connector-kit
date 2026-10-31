# Airfoil CLI

This is the Airfoil CLI to manage catalogs, namespaces, and tables.

## Install

```bash
pnpm add -g airfoil
```

## Usage

```bash
airfoil --help
airfoil catalog get analytics
airfoil namespace list --catalog analytics
```

## Configuration

| Value                            | Required                         | Default                 |
| -------------------------------- | -------------------------------- | ----------------------- |
| `--uri`                          | no                               | `http://localhost:7777` |
| `--catalog` or `AIRFOIL_CATALOG` | for namespace and table commands | none                    |
| `--output`                       | no                               | `default`               |
