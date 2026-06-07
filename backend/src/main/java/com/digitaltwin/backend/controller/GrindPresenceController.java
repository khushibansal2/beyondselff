package com.digitaltwin.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/grind")
public class GrindPresenceController {

    private static final Logger log = LoggerFactory.getLogger(GrindPresenceController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Random RAND = new Random();

    // Base active-user counts per room (matches GRIND_ROOMS in frontend)
    private static final Map<String, Integer> BASE_COUNTS = Map.of(
            "r1", 47,
            "r2", 138,
            "r3", 23,
            "r4", 89,
            "r5", 31
    );

    // Track how many SSE clients are watching each room (adds to displayed count)
    private final Map<String, AtomicInteger> activeClients = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(4, r -> {
                Thread t = new Thread(r, "grind-presence");
                t.setDaemon(true);
                return t;
            });

    @GetMapping(value = "/presence/{roomId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter roomPresence(@PathVariable String roomId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5-minute max

        // Track this client as "in the room"
        activeClients.computeIfAbsent(roomId, k -> new AtomicInteger(0)).incrementAndGet();

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            try {
                int base    = BASE_COUNTS.getOrDefault(roomId, 30);
                int clients = activeClients.getOrDefault(roomId, new AtomicInteger(0)).get();
                // Small random walk ±5 around base, plus real connected clients
                int noise   = RAND.nextInt(11) - 5;
                int count   = Math.max(1, base + noise + clients);

                emitter.send(SseEmitter.event()
                        .name("presence")
                        .data(MAPPER.writeValueAsString(Map.of(
                                "roomId", roomId,
                                "count", count,
                                "liveClients", clients
                        ))));
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }, 0, 8, TimeUnit.SECONDS);

        Runnable cleanup = () -> {
            future.cancel(true);
            AtomicInteger c = activeClients.get(roomId);
            if (c != null) c.decrementAndGet();
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        log.debug("SSE client connected for room {}", roomId);
        return emitter;
    }

    @PostMapping("/session")
    public ResponseEntity<Map<String, Object>> recordSession(@RequestBody Map<String, Object> req) {
        String roomId = String.valueOf(req.getOrDefault("roomId", "unknown"));
        int    xp     = (int) req.getOrDefault("xp", 100);
        int    mins   = (int) req.getOrDefault("minutes", 0);
        log.info("Grind session recorded: room={} xp={} minutes={}", roomId, xp, mins);
        return ResponseEntity.ok(Map.of("recorded", true, "xp", xp, "roomId", roomId));
    }
}
