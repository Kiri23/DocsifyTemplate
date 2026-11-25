# El sitio (https://doctemplate.kiri231.com): un servidor de archivos estáticos con los docs de
# packages/docs-site/docs/ y su runtime (site.js, as/, components/, plugins/, theme/ y
# pr/summarize-pr/shown-lines.mjs) en /.
# No hay paso de build: docs-site se sirve tal cual. El contexto es la raíz del repo y
# deploy/Dockerfile.dockerignore deja pasar solo esos archivos y el Caddyfile:
#
#   docker build -f deploy/Dockerfile --build-arg COMMIT="$(git rev-parse HEAD)" -t ghcr.io/kiri23/docsify-template-docs:ci .
#   node deploy/smoke-image.mjs ghcr.io/kiri23/docsify-template-docs:ci "$(git rev-parse HEAD)"
#
# La imagen base va fijada por digest: un tag se puede mover, un digest no.
FROM caddy:2.11-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9

LABEL org.opencontainers.image.source="https://github.com/Kiri23/DocsifyTemplate" \
      org.opencontainers.image.description="The docs-site showcase and documentation for DocsifyTemplate" \
      org.opencontainers.image.licenses="ISC"

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY packages/docs-site/docs /srv
COPY packages/docs-site/site.js /srv/site.js
COPY packages/docs-site/as /srv/as
COPY packages/docs-site/components /srv/components
COPY packages/docs-site/plugins /srv/plugins
COPY packages/docs-site/theme /srv/theme
# The diffs of a PR summary count their lines with summarize-pr's own code (components/pr/code-lines.js).
COPY packages/docs-site/pr/summarize-pr/shown-lines.mjs /srv/pr/summarize-pr/shown-lines.mjs

# El commit del que salió la imagen, servido en /version.txt: el deploy lo lee para saber que lo que
# contesta es este commit y no el anterior. Sin el build-arg dice "unknown".
ARG COMMIT=unknown
RUN printf '%s\n' "$COMMIT" > /srv/version.txt

# Usuario sin privilegios en un puerto alto. /data y /config son de Caddy: pasan a ser suyos para que
# no falle al arrancar.
RUN addgroup -S -g 10001 docs \
    && adduser -S -D -H -u 10001 -G docs docs \
    && chown -R docs:docs /data /config
USER docs

EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
