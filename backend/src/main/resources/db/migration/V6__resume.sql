CREATE TABLE IF NOT EXISTS resumes (
    id                BIGSERIAL PRIMARY KEY,
    user_id           VARCHAR(255) NOT NULL REFERENCES users(id),
    import_id         BIGINT REFERENCES import_history(id) ON DELETE SET NULL,
    original_filename VARCHAR(512),
    candidate_name    VARCHAR(255),
    email             VARCHAR(255),
    phone             VARCHAR(50),
    location          VARCHAR(255),
    summary           TEXT,
    parsed_json       TEXT NOT NULL,
    skills_snapshot   TEXT,
    llm_parsed        BOOLEAN NOT NULL DEFAULT FALSE,
    parsed_at         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
