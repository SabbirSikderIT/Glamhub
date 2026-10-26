# GlamHub database

PostgreSQL 16 in Docker, host port **5440** (chosen to avoid clashing with other local Postgres containers).

    docker compose up -d        # start (data lives in the named volume glamhub_pgdata)
    docker compose down         # stop, keep data
    docker compose down -v      # stop and DELETE all data

Tables are created/updated automatically by the backend (Hibernate `ddl-auto: update`).
`schema.sql` is a reference snapshot of the schema (`pg_dump --schema-only`); you do not need to run it.
Connection: `jdbc:postgresql://localhost:5440/glamhub`, user `postgres`, password `postgres`.
