package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guilds")
public class GuildController {

    private final JdbcTemplate jdbc;
    private final AuthUtil authUtil;

    public GuildController(JdbcTemplate jdbc, AuthUtil authUtil) {
        this.jdbc     = jdbc;
        this.authUtil = authUtil;
    }

    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> myGuild() {
        String userId = authUtil.getUserId();
        List<String> guilds = jdbc.queryForList(
                "SELECT guild_id FROM guild_memberships WHERE user_id = ?",
                String.class, userId);
        String guildId = guilds.isEmpty() ? null : guilds.get(0);
        return ResponseEntity.ok(Map.of("guildId", guildId != null ? guildId : ""));
    }

    @PostMapping("/{guildId}/join")
    public ResponseEntity<Map<String, Object>> join(@PathVariable String guildId) {
        String userId = authUtil.getUserId();
        // Leave any existing guild first
        jdbc.update("DELETE FROM guild_memberships WHERE user_id = ?", userId);
        jdbc.update(
                "INSERT INTO guild_memberships (user_id, guild_id) VALUES (?, ?)",
                userId, guildId);
        return ResponseEntity.ok(Map.of("joined", true, "guildId", guildId));
    }

    @DeleteMapping("/leave")
    public ResponseEntity<Map<String, Object>> leave() {
        String userId = authUtil.getUserId();
        jdbc.update("DELETE FROM guild_memberships WHERE user_id = ?", userId);
        return ResponseEntity.ok(Map.of("left", true));
    }
}
