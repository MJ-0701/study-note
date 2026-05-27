# sprint-W22-be-sync/B-3 — Prometheus container with study-note scrape config baked in.
# ACA Container App "study-note-prometheus" 가 본 image 로 동작.

FROM prom/prometheus:v3.0.0

# Use the bundled scrape config. retention 7d (storage tier 작게).
COPY prometheus.yml /etc/prometheus/prometheus.yml

CMD [ \
  "--config.file=/etc/prometheus/prometheus.yml", \
  "--storage.tsdb.path=/prometheus", \
  "--storage.tsdb.retention.time=7d", \
  "--web.console.libraries=/usr/share/prometheus/console_libraries", \
  "--web.console.templates=/usr/share/prometheus/consoles", \
  "--web.listen-address=0.0.0.0:9090" \
]
