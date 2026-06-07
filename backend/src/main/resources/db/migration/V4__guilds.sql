CREATE TABLE IF NOT EXISTS guild_memberships (
    user_id  VARCHAR(36)  NOT NULL,
    guild_id VARCHAR(10)  NOT NULL,
    joined_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, guild_id)
);
