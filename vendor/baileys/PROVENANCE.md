# Procedencia de vendor/baileys

## Qué es

Copia **sin modificar** de la librería baileys que el proyecto ya usaba.
No es `yo-soy-yo-baileys` — es el baileys original del fork `muleff/b`.

| Campo | Valor |
|---|---|
| Repositorio fuente | https://github.com/muleff/b |
| Commit vendoreado | `f1b4ac1578fffa255973a3778a61b28ddc61c123` (rama `master`) |
| Nombre del paquete | `baileys` (sin renombrar) |
| Versión | `7.0.0-rc14` |
| Entrada | `lib/index.js` (ESM, `"type": "module"`) |
| Tamaño | 103 archivos, 8.7 MB |

## Verificación de que es idéntico a la fuente

Ejecutado al vendorizar, contra un clon limpio de `muleff/b`:

```
diff -rq  lib                       -> sin diferencias
cmp       WAProto/index.js          -> idéntico
cmp       package.json              -> idéntico
cmp       LICENSE                   -> idéntico
```

Checksums de referencia:

```
4c87622745372ba17f942656...  vendor/baileys/WAProto/index.js
ae8f926f878243d04ec989c0...  vendor/baileys/lib/index.js
```

## Qué se excluyó

Solo `WAProto/index.backup.js` (7.2 MB): es un backup muerto, no está referenciado
por el código ni figura en el campo `files` del `package.json` del paquete.
Se conservaron `WAProto/index.js`, `WAProto/fix-imports.js` y `WAProto/.proto-version.json`.

Tampoco se incluyó `AGENTS.md`, `update-proto.mjs` ni `update-version.js` (son del
mantenimiento del fork, no se necesitan en runtime).

## Por qué se vendorizó

El fork `muleff/b` tiene **auto-actualización de proto**: en el momento de vendorizar,
su HEAD ya había avanzado de `f1b4ac1` a `d117256` ("auto update proto"). Con la
dependencia como `github:muleff/b`, cada `npm install` podía traer un baileys distinto
según el día. Vendoreado, la versión queda fijada y el build es reproducible.

## Cómo actualizar el vendor

```bash
git clone --depth 1 https://github.com/muleff/b.git /tmp/b
rm -rf vendor/baileys/lib vendor/baileys/WAProto/index.js
cp -r /tmp/b/lib vendor/baileys/
cp /tmp/b/WAProto/index.js /tmp/b/WAProto/fix-imports.js /tmp/b/WAProto/.proto-version.json vendor/baileys/WAProto/
cp /tmp/b/package.json /tmp/b/LICENSE vendor/baileys/
rm -rf vendor/baileys/node_modules   # por si el clon lo trajera
```

Después: `rm -rf node_modules package-lock.json && npm install`.

## Estado conocido

Con baileys `7.0.0-rc14` el plugin `plugins/subbots/subs-listbots.js` **no carga**:

```
The requested module '@whiskeysockets/baileys' does not provide an export named 'getAdditionalNode'
```

Ese export no existe en este baileys. Es un problema **preexistente** del repo (ya ocurría
con `github:muleff/b`), no lo introduce la vendorización. Cargan 268 de 269 plugins.
