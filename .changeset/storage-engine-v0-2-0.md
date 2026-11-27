---
"@useairfoil/api": minor
"@useairfoil/testing": patch
---

Support Storage Engine v0.2.0: add `CatalogManager.updateCatalog` (`PATCH /catalogs/{id}`) and `CatalogManager.getTableStatus` (`GET /catalogs/{id}/by-uuid/{table_uuid}/status`), and update `TestEngine.container` to use `storage-engine:0.2.0` with a catalog URI reachable from both host and container.
