# sprint-W22-be-sync/B-4 — Grafana container with provisioning + dashboard baked in.
# ACA Container App "study-note-grafana" 가 본 image 로 동작.

FROM grafana/grafana:11.4.0

# Provisioning files — data source + dashboard provider.
COPY provisioning/datasources/prometheus.yml /etc/grafana/provisioning/datasources/prometheus.yml
COPY provisioning/dashboards/study-note.yml /etc/grafana/provisioning/dashboards/study-note.yml

# Dashboard JSON — provisioning provider 가 자동 import.
COPY dashboards/study-note-ops.json /etc/grafana/dashboards/study-note-ops.json

# Anonymous viewer 활성 — 면접관 시연용 (read-only).
ENV GF_AUTH_ANONYMOUS_ENABLED=true \
    GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
    GF_AUTH_ANONYMOUS_ORG_NAME="Main Org." \
    GF_AUTH_DISABLE_LOGIN_FORM=false \
    GF_SECURITY_ADMIN_USER=admin \
    GF_USERS_DEFAULT_THEME=light \
    GF_NEWS_NEWS_FEED_ENABLED=false \
    GF_ANALYTICS_REPORTING_ENABLED=false \
    GF_ANALYTICS_CHECK_FOR_UPDATES=false

# admin 비밀번호는 ACA secret 으로 주입 (GF_SECURITY_ADMIN_PASSWORD).

EXPOSE 3000
